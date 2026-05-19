<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 02: Átomo `deployment-with-kamal.md` (T2 — Batch C)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto como template); Plano 02 fase-09 (verifier refined + audit humano aprovados)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 2 `docs/knowledge/rails/atoms/deployment-with-kamal.md` (~140 linhas), condensando o pipeline de deploy default do Rails 8: Kamal 2 (Docker-based, single-host ou multi-host), `bin/kamal deploy`, asset compilation no build step, `kamal secrets` para variáveis sensíveis, healthcheck e zero-downtime via traefik proxy embutido. Inclui nota sobre Capistrano (D16 — não átomo dedicado, mas registrar que existe como alternativa para quem não migra para Docker). Cobre o que `/infrastructure` trata como princípio cross-stack mas com APIs específicas do ecossistema Rails 8.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/deployment-with-kamal.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-stack-conventions` (fontes do átomo) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global da feature e extrair a decisão aprovada para os pares duplicados. Para este átomo, importam:

- `rails-stack-conventions` vs `rails-stack-conventions v2` (deployment patterns, infrastructure conventions)
- compass artifacts sobre Rails 8 deployment (Kamal 2 docs estão majoritariamente em compass dado que é tópico recente)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado para esses 2 itens, **BLOQUEAR a fase** e escalar.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: deployment-with-kamal
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-2026-rails8-deployment_text_markdown.md
tier: 2
triggers: [deployment, kamal, docker, rails 8, asset compilation, secrets, traefik, zero downtime, capistrano]
related_skills: [/infrastructure, /system-design]
updated: 2026-05-18
rails_versions: ['>=8.0']
---
```

**Notas sobre o frontmatter:**

- `rails_versions: ['>=8.0']` — Kamal 2 é o default oficial a partir do Rails 8 (generator `bin/rails new` já scaffolda `config/deploy.yml` Kamal). Padrões Rails 7.1 com Kamal funcionam mas não são default — átomo foca no caso default.
- `triggers` inclui `capistrano` para que projetos legados ainda encontrem o átomo via INDEX (átomo direciona para nota sobre alternativa).
- `related_skills:` lista 2 skills cross-stack (não 3) — deployment é mais focado que outros tópicos. NÃO inflar a lista.
- Compass artifact UUID acima é placeholder — extrator confirma nome real do arquivo via `ls claude-code/knowledge/Rails/compass_artifact_*` antes de escrever.

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem (verbatim com piloto `rails-conventions-and-magic`):

1. `# Deployment com Kamal 2` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário
3. `## Padrões sênior` — 5-7 patterns
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (audit trail RF14)

**NÃO incluir** seção API-only mode.

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 6 — extrair do source canônico. Lista Rails-8-native:

- **Pattern: Setup inicial de Kamal 2** — Problema: Rails 8 generator scaffolda mas dev não sabe onde editar; Padrão: editar `config/deploy.yml` com `service`, `image`, `servers`, `registry` (DockerHub ou ECR), `env` (envs públicas + `secret` para senhas), `accessories` (Postgres, Redis); inicial `bin/kamal setup` (instala Docker + traefik no host) → subsequentes `bin/kamal deploy`; Quando usar: Rails 8 default, single-host ou multi-host modestos (até ~5 servers); Quando NÃO usar: orquestração complexa (>10 nodes, autoscaling) — preferir Kubernetes com Helm chart do Rails.
- **Pattern: Asset compilation no build step (Dockerfile)** — Problema: compilação em produção atrasa boot e exige Node/yarn no servidor; Padrão: `Dockerfile` (gerado por `bin/rails new` em Rails 8) tem stage de build que roda `bundle exec rails assets:precompile` com `SECRET_KEY_BASE_DUMMY=1` durante build — assets ficam no `/rails/public/assets`; runtime image é Ruby slim sem Node; Quando usar: 100% dos deploys com Kamal; Quando NÃO usar: app sem assets (API-only sem JSON:API templates).
- **Pattern: `kamal secrets` para variáveis sensíveis** — Problema: senhas em `deploy.yml` no Git; Padrão: usar `.kamal/secrets` (file-based, gitignored) ou `kamal secrets fetch` (integra com 1Password/Bitwarden CLI); referenciar no `deploy.yml` via `env: secret: [DATABASE_PASSWORD]`; Quando usar: qualquer variável sensível; Quando NÃO usar: variáveis públicas (URLs de assets, feature flags) — vão em `env: clear:` no `deploy.yml`.
- **Pattern: Healthcheck + zero-downtime via traefik proxy embutido** — Problema: deploy interrompe requests in-flight; Padrão: Kamal expõe `kamal-proxy` (traefik configurado) que faz health-check em `/up` (endpoint nativo Rails 8) antes de rotear tráfego para o novo container; old container drena requests in-flight (timeout default 30s); Quando usar: 100% dos deploys; Quando NÃO usar: deploy emergencial com tempo curto — `bin/kamal deploy --skip-push` reduz tempo mas mantém drain.
- **Pattern: Accessories para Postgres/Redis** — Problema: serviços auxiliares mal configurados no host; Padrão: declarar em `accessories:` no `deploy.yml` com `image`, `host`, `port`, `volumes` (named volume para persistência); `bin/kamal accessory boot` inicia; gerenciamento de upgrades segue lifecycle separado (`bin/kamal accessory reboot postgres`); Quando usar: ambientes onde DB roda no mesmo host (staging, dev-like); Quando NÃO usar: produção com DB managed (RDS, Supabase, Crunchy) — accessory só para Redis se rodar local.
- **Pattern: Multi-host com tags e roles** — Problema: split web vs job servers; Padrão: `servers: web: [host1, host2], job: [host3]` em `deploy.yml`; cada role pode ter `cmd:` diferente (`web: bin/rails server`, `job: bin/jobs`); Quando usar: app cresceu o suficiente para separar workloads; Quando NÃO usar: app pequeno — `servers: [host1]` resolve, sem complexidade.

Extrator escolhe 5 desses 6 (cap apertado).

### Passo 5: Anti-padrões (3-5 armadilhas com correção)

- **Anti-pattern: editar `deploy.yml` sem testar `kamal config`** — Sintoma: deploy falha silenciosamente por typo em YAML; Correção: `bin/kamal config` valida e exibe config resolvido antes de `deploy` — sempre rodar pré-deploy crítico.
- **Anti-pattern: senhas em texto plano no `deploy.yml`** — Sintoma: secret commitado no Git, security alert; Correção: mover para `.kamal/secrets` (gitignored) + referenciar como `env: secret:`. Auditar histórico Git e rotar credentials se já commitado.
- **Anti-pattern: rodar `kamal accessory` em produção como DB de longo prazo** — Sintoma: backups manuais via `pg_dump` cron, sem PITR, perda de dados em failure de host; Correção: para produção, usar DB managed (RDS, Supabase, Crunchy) — Kamal accessories são para staging ou setups de baixa criticidade.
- **Anti-pattern: ignorar timeout de drain** — Sintoma: requests in-flight cortados durante deploy, P99 errors picam; Correção: ajustar `boot_timeout` e `drain_timeout` no `deploy.yml` (default 30s) para apps com long-running requests (uploads, exports).
- **Anti-pattern: build da imagem Docker no servidor de produção** — Sintoma: deploy roda `docker build` no host de produção, RAM esgota; Correção: build no CI ou máquina local + `kamal deploy` push pre-built image para registry; `bin/kamal build` localmente já é o default.

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| Rails 8 novo projeto, single ou multi-host modesto | Kamal 2 (default) |
| Projeto Rails 7.x sem Docker | Capistrano (nota — não átomo dedicado, D16) |
| App de baixa criticidade com DB inline | `kamal accessory postgres` |
| Produção com DB managed | `accessories:` só para Redis (se aplicável) |
| Split web vs job server | `servers: { web: [...], job: [...] }` |
| Variável sensível | `env: secret:` + `.kamal/secrets` |
| Variável pública (URL, flag) | `env: clear:` no `deploy.yml` |
| App com long-running requests (>30s) | Ajustar `drain_timeout` no `deploy.yml` |

### Passo 7: Referências externas

- Skill: `/infrastructure` para princípios cross-stack de Docker, registry mgmt, secrets, zero-downtime
- Skill: `/system-design` para healthcheck design, drain semantics, capacity planning
- Nota sobre Capistrano: D16 — não átomo dedicado. Projetos Rails legados (7.x sem Docker) ainda usam Capistrano com `cap production deploy`; padrões mais antigos cobertos por `rails-stack-conventions` (fonte legada). Para Rails 8 moderno, Kamal 2 é o caminho.
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com prompt incluindo anti-drift LITERAL (compound lesson colada verbatim). Substituir nomes de pasta canônica pelos decididos no STATE.md antes de spawnar. Compass artifact UUID extrato via `ls claude-code/knowledge/Rails/compass_artifact_*` para confirmar nome real. Output: arquivo markdown completo em `docs/knowledge/rails/atoms/deployment-with-kamal.md`.

---

## Gotchas

- **G1 do plano (cap 200 ln):** Deployment é tópico moderado em volume. Alvo 135-150. Cuidado para não inflar a seção sobre Capistrano (D16 diz que é NOTA, não dedicação) — máximo 3 linhas.
- **G2 do plano (anti-drift literal):** prompt do extrator inclui texto da compound lesson verbatim. Kamal 2 docs estão majoritariamente em compass dado o recency — risco de drift maior para padrões mais antigos. Pegar somente o que está no source.
- **G4 do plano (`rails_versions`):** `['>=8.0']` — Kamal 2 é default só a partir do Rails 8. Sem ambiguidade.
- **G10 do plano (fonte canônica via STATE.md):** Read STATE.md ANTES de chamar extrator.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro. Checklist de validação:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/deployment-with-kamal.md`
- [ ] Frontmatter contém todos os 8 campos base na ordem correta
- [ ] Campo opcional `rails_versions: ['>=8.0']` presente
- [ ] `topic: deployment-with-kamal` (literal, kebab-case)
- [ ] `stack: rails`, `layer: backend`, `tier: 2`, `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo existente em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem correta
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] Nota sobre Capistrano presente (D16) — máximo 3 linhas no `## Referências externas`
- [ ] `wc -l docs/knowledge/rails/atoms/deployment-with-kamal.md` retorna entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/deployment-with-kamal.md` retorna 0
- [ ] Triggers contém pelo menos: `deployment`, `kamal`, `docker`, `rails 8`, `secrets`
- [ ] `bun run harness:validate` passa sobre o novo átomo

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/deployment-with-kamal.md` exit 0
- `wc -l docs/knowledge/rails/atoms/deployment-with-kamal.md` retorna número entre 120 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/deployment-with-kamal.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos base idêntica ao piloto
- `rails_versions: ['>=8.0']` literal
- `bun run harness:validate` passa

**Por humano:**

- Subagente verifier refined (fase-07) reporta ≥80% das 5 claims auditadas como rastreáveis.
- Leitor sênior Rails reconhece os patterns como decisões de produção em Rails 8 (Kamal 2 + traefik + accessories), não tutorial superficial.
- Nota sobre Capistrano é clara como alternativa para legado, sem inflar o átomo.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
