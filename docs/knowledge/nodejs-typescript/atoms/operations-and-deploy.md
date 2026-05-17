---
topic: operations-and-deploy
stack: nodejs-typescript
layer: backend
sources:
  - research: 21a08436
tier: 3
triggers: [pm2, systemd, docker, cluster, graceful shutdown, sigterm, zero downtime, blue green, canary, rolling deploy, health check, liveness, readiness, 12-factor, env vars, dotenv, zod-config]
related_skills: [/infrastructure, /system-design]
updated: 2026-05-16
---

# Operations & Deploy — Node.js + TypeScript

## Quando consultar

- Decisão de process supervisor para deploy em VPS, container ou serverless.
- Implementar graceful shutdown que não derruba requests in-flight nem perde jobs de fila.
- Configurar health checks no k8s/ECS que refletem estado real do app (não só "porta abriu").
- Migrar config baseada em `process.env` espalhado para schema validado centralmente.
- Adotar zero-downtime deploy (blue-green, rolling ou canary) em pipeline existente.

## Padrões sênior

### Pattern: Process supervisor — PM2 vs systemd vs container

- **Problema:** app cai e não levanta; logs perdidos; restart loop infinito sem backoff; PM2 rodando dentro de Docker cria supervisor redundante.
- **Padrão:** HTTP API → um processo Node por container; deixar o orquestrador (k8s, ECS, Fly, Render) replicar. `cluster.fork()` dentro de containers é antipatern — o orquestrador já escala horizontalmente. PM2 faz sentido em VPS bare-metal/PaaS sem autoscale por processo. Systemd é a escolha "infra padrão" em Linux server sem deps Node extras.
- **Quando usar:** PM2 em VPS single-host com hot-reload e monitoring inline; systemd em servidor Linux sem runtime Node gerenciado; Node direto (exec form `CMD ["node", "dist/index.js"]`) em container.
- **Quando NÃO usar:** `cluster.fork()` dentro de pod Kubernetes ou Fly machine — cluster vira redundante e esconde crashes. `pm2-runtime` dentro de Docker sem necessidade real — o orquestrador já supervisiona.

---

### Pattern: Graceful shutdown (SIGTERM handling)

- **Problema:** SIGTERM derruba processo no meio de request; conexões HTTP/WS perdidas; DB pool com sessões abertas; `CMD npm start` não encaminha sinal para Node — processo recebe SIGKILL.
- **Padrão:** (1) `CMD ["node", "dist/index.js"]` exec form (PID 1 recebe sinal direto). (2) Registrar `process.on('SIGTERM', shutdown)`. (3) Na shutdown: flip `isShuttingDown = true` + readiness retorna 503 imediatamente. (4) Aguardar 5–10 s para LB depropagate (k8s) ou 2–3 s em PaaS. (5) `server.close()` (Express/Fastify/raw http). (6) Fechar DB pools (`prisma.$disconnect()`, `pool.end()`), Redis (`redis.quit()`), workers de fila (`worker.close()`). (7) Timeout forçado `< terminationGracePeriodSeconds` (padrão k8s: 30 s; usar 25 s). (8) `process.exit(0)`.
- **Quando usar:** sempre em produção — qualquer HTTP server ou worker de fila.
- **Quando NÃO usar:** scripts CLI one-shot e dev local (overhead sem ganho real).

---

### Pattern: Health checks — liveness vs readiness (Kubernetes/ECS)

- **Problema:** probe genérica `GET /health → 200` hardcoded — app com DB down ou em shutdown responde 200; k8s nunca remove do balanceador nem reinicia.
- **Padrão:** separar em duas rotas distintas:
  - `/livez` — processo vivo (sem checagem de deps externas); retorna 200 a não ser que o event loop esteja travado. Liveness failure → k8s reinicia o pod.
  - `/readyz` — pronto para tráfego (checa DB com `SELECT 1`, Redis ping, deps críticas com timeout curto; retorna 503 quando `isShuttingDown === true`). Readiness failure → k8s remove do balanceador sem matar.
  - `/startupz` (startup probe) — dá tempo de boot antes da readiness probe entrar em ação.
  - Adicionar `preStop: sleep 10` no manifest k8s — endpoints de Service depropagate mais devagar que o container para.
- **Quando usar:** qualquer app containerizado com orquestrador.
- **Quando NÃO usar:** app em VPS sem k8s/ECS — uma única `/healthz` que checa DB basta.

---

### Pattern: Zero-downtime deploy — rolling vs blue-green vs canary

- **Problema:** deploy derruba tráfego ou expõe bug a 100% do tráfego imediatamente sem possibilidade de rollback rápido.
- **Padrão de decisão:**
  - **Rolling** (default k8s): substitui pods 1 a 1 com `maxUnavailable: 0, maxSurge: 1`. Exige backwards-compat entre versão antiga e nova. Rollback = redeploy da image tag anterior.
  - **Blue-green**: deploy do stack verde completo, smoke test, flip de LB/DNS, blue fica warm para rollback atômico. Bom quando há mudança de wire protocol ou schema breaking. Custo: 2× infra temporariamente.
  - **Canary**: % do tráfego vai para versão nova (k8s com dois Deployments + weighted routing, ou Flagger com SLO gate). Para features de alto risco com métrica observável (error rate, latência p95).
  - **PaaS (Vercel, Railway, Render, Fly)**: provider faz rolling — respeitar build, readiness probe e graceful shutdown.
- **Quando usar rolling:** deploys frequentes + features pequenas + backwards-compat garantida.
- **Quando usar blue-green:** deploys raros + mudança de protocolo/schema + necessidade de rollback < 60 s.
- **Quando usar canary:** feature crítica com risco de regressão + infraestrutura para coletar métricas por versão.

---

### Pattern: 12-factor compliance específico para Node

- **Problema:** config hardcoded; `process.env.X || 'default'` espalhado em 30 arquivos com defaults inconsistentes; logs em arquivo dentro de container (disco efêmero); processo stateful assumindo disco local.
- **Padrão:** (1) Validar env vars no boot com Zod, envalid ou `@t3-oss/env-core`; `process.exit(1)` imediato se chave obrigatória falta — "ten minutes into production traffic the DB URL is undefined" é o failure mode a eliminar. (2) Módulo central `src/env.ts` exporta objeto tipado; todo runtime usa `env.X`, nunca `process.env.FOO` direto. (3) Logs sempre em stdout/stderr (PM2/Docker/systemd captura e rotaciona). (4) Processo stateless — state em Redis/DB, não em variáveis de módulo.
- **Quando usar:** toda app com >5 env vars ou que rode em mais de um ambiente.
- **Quando NÃO usar:** script CLI com 1–2 env vars — overhead não compensa. Next.js `NEXT_PUBLIC_*` é baked no bundle client em build-time — não é "runtime config" para o client.

---

### Pattern: Migrations como job separado (nunca no boot do app)

- **Problema:** N réplicas subindo ao mesmo tempo → N migrations concorrentes → lock contention no Postgres; migration longa segura `ACCESS EXCLUSIVE lock` durante peak hours.
- **Padrão:** rodar `prisma migrate deploy` (ou equivalente do ORM) como Job Kubernetes ou release phase de PaaS, antes da nova versão do app receber tráfego. Para mudanças de schema breaking: usar expand–contract em 3 deploys (expand: coluna nullable nova; backfill: job separado; contract: drop coluna antiga). Para índices Postgres em tabelas grandes: `CREATE INDEX CONCURRENTLY`.
- **Quando usar:** sempre — tanto em k8s quanto em PaaS (Fly, Render, Railway têm release commands).
- **Quando NÃO usar:** nunca rodar `prisma migrate dev` ou `db push` em produção — esses comandos são destrutivos e não possuem aprovação de review.

---

## Anti-padrões

- **`CMD npm start` no Dockerfile:** npm/yarn não encaminham sinais Unix para o processo Node filho — container recebe SIGKILL ao invés de SIGTERM; requests in-flight derrubadas. Correção: `CMD ["node", "dist/index.js"]` exec form.

- **`cluster.fork()` dentro de container k8s/Fly:** Docker/k8s já escalam horizontalmente; cluster dentro do pod duplica supervisor, desperdiça memória e esconde crashes individuais de worker. Correção: remover cluster; deixar o orquestrador replicar o pod.

- **`process.env.X || 'default'` espalhado pelo código:** defaults inconsistentes entre arquivos; app sobe sem avisar que variável crítica está faltando. Correção: schema central `src/env.ts` com Zod e `process.exit(1)` no boot se inválido.

- **Migrations rodando no boot do app:** N réplicas = N execuções concorrentes = lock contention. Correção: job/release-phase separado pré-deploy.

- **Liveness e readiness na mesma rota:** liveness failure reinicia o pod; readiness failure apenas remove do LB. Usar a mesma rota para as duas faz com que uma indisponibilidade de DB reinicie pods saudáveis. Correção: `/livez` sem deps externas; `/readyz` com checagem de deps.

## Critérios de decisão

| Situação | Escolha |
|---|---|
| Single VPS, app pequeno | PM2 + stdout para journald |
| Container em PaaS (Render/Fly/Railway) | Node direto + exec form CMD + graceful shutdown |
| Kubernetes/ECS | Node direto + liveness/readiness separados + preStop sleep |
| Serverless (Lambda/Cloud Run) | Sem supervisor (runtime gerencia); cold start — sem top-level await em SDKs pesados |
| Deploy frequente (>1/dia), backwards-compat | Rolling (`maxUnavailable: 0, maxSurge: 1`) |
| Deploy raro, mudança de protocolo/schema | Blue-green com smoke test antes do flip |
| Feature crítica de alto risco | Canary com gate de error rate/latência |
| Migration breaking em produção | Expand-contract em 3 deploys + job separado |
| >5 env vars no projeto | Schema Zod central em `src/env.ts` com boot fail-fast |

---

## Referências externas

- Skill: `/infrastructure` — DNS, SSL, CDN, PaaS comparison cross-stack
- Skill: `/system-design` — load balancing, scaling, blue-green como princípios gerais
- Research: `21a08436` — `claude-code/knowledge/Nodejs/compass_artifact_wf-21a08436-5963-44dc-8d97-5fe396c05500_text_markdown.md`
