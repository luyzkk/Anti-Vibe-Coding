<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 02: Átomo `operations-and-deploy.md`

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 3 full `docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` (~130-150 linhas), condensando o ângulo Node+TS de operação e deploy sênior: PM2 vs systemd vs Docker como process supervisor; Cluster module decisão e quando vale a pena; graceful shutdown (SIGTERM, drain de connections HTTP/WS, flush de Pino, fechamento de pool Postgres); zero-downtime deploy (blue-green, rolling, canary); health checks (k8s liveness/readiness probes específicos para Node); 12-factor compliance específico para Node; env vars vs schema-config (zod-config, env-var). `/infrastructure` cobre DNS/SSL/CDN cross-stack; este átomo cobre o que é Node-específico no runtime de produção.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~130-150 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
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
```

Origens (de `_catalog.md`):
- `21a08436` — Operational Architecture (1644 linhas, build, CI/CD, env vars, Docker, deploy, migrations, rollback)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Operations & Deploy — Node.js + TypeScript` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 2-5 armadilhas com correção
5. `## Critérios de decisão` — tabela ou bullets "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (RF11 audit-trail aqui)

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

**Quando consultar (3-5 bullets):**
- Decisão de process supervisor para deploy em VPS, container ou serverless
- Implementar graceful shutdown que não derruba requests in-flight
- Configurar health checks no k8s/ECS que refletem estado real do app (não só "porta abriu")
- Migração de config baseada em `process.env` para schema-validated config (zod-config / env-var)
- Adoção de zero-downtime deploy (blue-green ou canary) em pipeline existente

**Padrões sênior (5-7 patterns — recomendação):**

- **Pattern: Process supervisor — PM2 vs systemd vs Docker** — Problema: app cai e não levanta; logs perdidos; restart loop infinito sem backoff. Padrão de decisão: PM2 para VPS single-host com hot-reload + monitoring inline; systemd para Linux server "infra padrão" (sem deps Node novas); Docker para qualquer pipeline com containers (PaaS/k8s). Quando usar PM2: dev/staging single-VM. Quando NÃO: em container — PM2 dentro de Docker é antipattern (Docker já é o supervisor).
- **Pattern: Cluster module — quando vale a pena** — Problema: Node single-threaded não aproveita N cores; CPU-bound work no master mata throughput. Padrão: `cluster` (built-in) para multi-process I/O work; cada worker é processo Node independente compartilhando socket via IPC. Quando usar: I/O work + multi-core machine + sem load balancer externo. Quando NÃO usar: já existe load balancer (ALB/Nginx) na frente — cluster vira redundante; CPU-bound work — preferir worker_threads ou external queue (ver `performance-and-internals.md`).
- **Pattern: Graceful shutdown (SIGTERM handling)** — Problema: SIGTERM derruba processo no meio de request; connections HTTP/WS perdidas; log buffer não-flushed; pool Postgres com sessões abertas. Padrão: handler de SIGTERM que (1) para de aceitar novos requests (`server.close()`), (2) drena pending requests com timeout (~30s default em k8s `terminationGracePeriodSeconds`), (3) flush Pino (`pino-final` ou `logger.flush()`), (4) fecha pool de DB (`pool.end()`), (5) `process.exit(0)`. Quando usar: sempre em produção. Quando NÃO: dev local (overhead sem ganho).
- **Pattern: Health checks — liveness vs readiness probes (Kubernetes)** — Problema: probe genérica `GET /health` retorna 200 sempre — app crashado responde 200 se porta está aberta. Padrão: `/livez` (app ainda vivo? sem deps, retorna 200 se event loop responsivo); `/readyz` (app pronto para tráfego? checa DB, Redis, deps críticas com timeout curto). Liveness fail → k8s reinicia pod. Readiness fail → k8s remove do balanceador sem matar. Quando NÃO: app em VPS sem k8s — uma única `/health` basta.
- **Pattern: Zero-downtime deploy — blue-green vs rolling vs canary** — Problema: deploy derruba tráfego ou expõe bug a 100% imediato. Padrão de decisão: blue-green (2x infra, switch atômico — bom para DB migrations sem schema breaking); rolling (substitui pods 1 a 1 — default k8s, exige backwards-compat); canary (% de tráfego para versão nova — exige feature flag ou load balancer com weighted routing). Quando usar blue-green: deploys raros + alto risco. Rolling: deploys frequentes + features pequenas. Canary: features de alto risco com métrica observável (LGTM stack).
- **Pattern: 12-factor compliance específico para Node** — Problema: config hardcoded em código; logs escritos em arquivo dentro do container; processo stateful que assume disco local. Padrão: config via env vars (zod-config valida no boot); logs sempre em stdout/stderr (PM2/Docker captura); processo stateless (state em Redis/DB, não em memória local). Quando NÃO: scripts CLI one-shot — 12-factor é overkill.
- **Pattern: Env vars vs schema-config (zod-config, env-var, dotenv)** — Problema: `process.env.X` sem validação explode em runtime quando var falta ou tem typo. Padrão: parse + validate no boot com `zod-config` (ou `env-var`); módulo central `config.ts` exporta objeto tipado; runtime usa `config.foo` em vez de `process.env.FOO`. Quando usar: app com >5 env vars. Quando NÃO: script com 1-2 env vars — overhead não compensa.

**Anti-padrões (2-5 itens):**

- **PM2 dentro de Docker** — duplica supervisor; Docker já reinicia container. Correção: rodar Node direto como PID 1 (com `dumb-init` ou `tini` para sinalizar SIGTERM corretamente).
- **Health check `GET /` retornando 200 hardcoded** — app crashado mas servidor HTTP ainda responde; k8s nunca reinicia. Correção: `/livez` checa event loop responsivo (`setImmediate` em <100ms) e `/readyz` checa deps externas com timeout.
- **`process.env.X || 'default'` espalhado pelo código** — defaults inconsistentes, falha em produção quando default difere de prod-esperado. Correção: schema central `config.ts` com defaults únicos e validação no boot.
- **Logs em arquivo local dentro de container** — disco efêmero, logs perdidos no restart. Correção: stdout/stderr + agregador (Pino → Loki/Datadog/CloudWatch).
- **Migrations rodando no boot do app** — N pods rodando = N migrations concorrentes = lock contention. Correção: job Kubernetes separado pre-deploy ou release phase do Heroku/Render.

**Critérios de decisão (tabela):**

| Situação | Escolha |
|---|---|
| Single VPS, app pequeno | PM2 + stdout para journald |
| Container em PaaS (Render/Fly/Railway) | Node direto + dumb-init/tini + stdout |
| Kubernetes/ECS | Container Node direto + liveness/readiness separados + graceful shutdown completo |
| Serverless (Lambda/Cloud Functions) | Sem supervisor (runtime gerencia); cold start matters — ver `performance-and-internals.md` |
| Deploy frequente (>1/dia) | Rolling default; canary se feature crítica |
| Deploy raro (>1 semana) | Blue-green se DB schema muda |
| Migration zero-downtime | Expand-contract (backwards-compat) + job separado, nunca no boot |

**Referências externas (RF11 audit-trail aqui):**

- Skill `/infrastructure` para DNS/SSL/CDN/PaaS cross-stack
- Skill `/system-design` para load balancing, scaling, blue-green em geral
- Research: `claude-code/knowledge/Nodejs/wf-21a08436.md` (Operational Architecture, 1644 linhas)

---

## Gotchas

- **G1 do plano (formato copiado do piloto, zero drift):** frontmatter com 8 campos na ordem `topic, stack, layer, sources, tier, triggers, related_skills, updated`. 5 seções do corpo na ordem do piloto.
- **G2 do plano (cap de 200 linhas):** tier 3 deste átomo é focado em ops Node-específico — cap natural é ~130-150 linhas. Se passar de 150, provavelmente está absorvendo conteúdo cross-stack que pertence a `/infrastructure` (ex: DNS, SSL, CDN genéricos). Parar e linkar.
- **G3 do plano (frontmatter `sources:` é compass-id, audit-trail vai em corpo):** apenas `- research: 21a08436` no frontmatter; path absoluto vai em "Referências externas".
- **G6 do plano (overlap com /infrastructure):** átomo cobre o ângulo Node+TS-específico (PM2/systemd com Node, Cluster module, graceful shutdown de pool Postgres + Pino flush, env-var/zod-config). `/infrastructure` cobre DNS/SSL/CDN/PaaS cross-stack. Sempre que um pattern parecer cross-stack, parar e linkar.
- **Local — Cluster module é controverso:** muitos seniores recomendam load balancer externo (Nginx/ALB) em vez de cluster. Cobrir os dois lados da decisão (Quando usar + Quando NÃO usar) sem advogar exclusivamente um caminho. Fonte `21a08436` deve ter a discussão.
- **Local — graceful shutdown depende do framework:** Express, Fastify e raw `http` têm APIs ligeiramente diferentes (`server.close()` existe em todos, mas drain de keep-alive connections varia). Mencionar o pattern como `server.close()` + drain + timeout, sem assumir framework — `api-design-stack-specific.md` cobre framework choice.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é escrita de átomo, não código.

### Checklist

- [ ] Arquivo criado em `docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md`
- [ ] Frontmatter com **8 campos** na ordem do piloto
- [ ] `stack: nodejs-typescript` (nunca `node-ts`)
- [ ] `layer: backend` (operations são server-side)
- [ ] `tier: 3`
- [ ] 5 seções do corpo na ordem certa
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] `wc -l docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` retorna entre 110 e 180 (faixa saudável 130-150)
- [ ] Links para `/infrastructure` e `/system-design` em "Referências externas"
- [ ] Audit-trail-path absoluto da fonte `wf-21a08436.md` em "Referências externas" (RF11 pré-cumprido)
- [ ] `bun run harness:validate` verde com o novo átomo

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md | awk '{print $1}'` retorna valor entre 110 e 180
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` retorna 0
- `grep -E '^topic: operations-and-deploy$' docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` retorna 1 match
- `grep -E '^tier: 3$' docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` retorna 1 match
- `grep -E '^stack: nodejs-typescript$' docs/knowledge/nodejs-typescript/atoms/operations-and-deploy.md` retorna 1 match
- `bun run harness:validate` exit 0

**Por humano (verificável em fase-06 do plano, auditoria CA-08 — opcional este átomo):**
- Patterns lem como senior Node+TS de produção, não copy de tutorial
- Cada pattern tem Problema + Padrão + Quando usar/NÃO — não só título
- Nenhuma claim duplica conceito cross-stack que `/infrastructure` cobre (DNS/SSL/CDN genéricos, PaaS comparison)
- Cada claim sobre PM2/systemd/cluster/graceful shutdown é rastreável para passagem específica de `wf-21a08436.md` (≥80% per CA-08)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
