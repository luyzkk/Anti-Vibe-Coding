<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 02: Átomo `error-handling-observability.md`

**Plano:** 04 — Atom Batch A
**Sizing:** 2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 1 `docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md` (~140 linhas), condensando o ângulo Node+TS-específico de error handling e observabilidade: operacional vs programmer error, `Result<T,E>` em handlers HTTP, Pino com correlation-id via `AsyncLocalStorage`, OpenTelemetry trace propagation, métricas RED/USE e redaction LGPD. Cobre integração Pino + OTel + AsyncLocalStorage que `/design-patterns` (Result em geral) e `/system-design` (telemetry em geral) não cobrem.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |

---

## Implementacao

### Passo 1: Frontmatter (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: error-handling-observability
stack: nodejs-typescript
layer: both
sources:
  - research: e4ce81c8
tier: 1
triggers: [error, exception, Result, Pino, telemetry, log, correlation, OTel, LGPD]
related_skills: [/design-patterns, /system-design]
updated: 2026-05-16
---
```

Origem (de `_catalog.md`):
- `e4ce81c8` — Error Handling + Observabilidade (1783 linhas, Pino, OpenTelemetry, RED/USE, correlation IDs, LGPD)

### Passo 2: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem (verbatim com piloto):

1. `# Error Handling e Observabilidade — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns (sub-seções com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills `/design-patterns` + `/system-design` + path da fonte

### Passo 3: Patterns recomendados (guia editorial — executor expande)

Mínimo 5, máximo 7 — extrair de `e4ce81c8`:

- **Pattern: Erro operacional vs programmer error (crash-on-bug)** — operacional (`UserNotFound`, `RateLimited`) é recuperável e vai em `Result`/log estruturado; programmer error (`undefined.foo`, contract violation) deve **crashar o processo** + restart via PM2/Docker — não capturar.
- **Pattern: `Result<T, E>` em handlers HTTP** — domínio retorna `Result`; thin adapter HTTP traduz `Err` em status code apropriado (4xx para esperados, 5xx só para inesperados).
- **Pattern: Pino logger structured com correlation-id via `AsyncLocalStorage`** — middleware injeta `correlationId` no store; logger child herda automaticamente; toda linha de log tem o id sem propagação manual.
- **Pattern: OpenTelemetry trace propagation** — instrumentation auto para HTTP/DB; trace_id/span_id integrados ao Pino (`pino-opentelemetry-transport`).
- **Pattern: Métricas RED (Rate, Errors, Duration) por endpoint + USE (Utilization, Saturation, Errors) para recursos** — instrumentar via `@opentelemetry/api` ou `prom-client`; alertas baseados em SLO, não em valor absoluto.
- **Pattern: Redaction LGPD via Pino `redact:` paths** — never log PII bruta; configurar `redact: ['req.headers.authorization', 'user.email', '*.password']` no setup do Pino.
- **Pattern: Error boundary no top do request lifecycle** — `unhandledRejection` + `uncaughtException` handlers registram + flush logs/traces + `process.exit(1)`; orquestrador (PM2/Kubernetes) reinicia.

### Passo 4: Anti-padrões (3-5 armadilhas)

- **`try/catch` silencioso** — captura sem log nem propagação; bug some. Correção: log estruturado com causa + re-throw ou retornar `Err`.
- **`console.log` em produção** — sem nível, sem correlation, sem JSON parseável. Correção: Pino com `level: info`.
- **Logar payload completo com PII** — viola LGPD. Correção: `redact:` paths e/ou whitelist explícita de campos seguros.
- **Stack trace gigantesco sem causa raiz** — perde sinal. Correção: `cause:` chain do Error (Node 16+) + `Error.captureStackTrace` quando custom error.
- **Recriar correlation-id em cada serviço** — quebra trace distribuído. Correção: propagar via header `traceparent` (W3C Trace Context) + OTel injection.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Erro de domínio recuperável (usuário sem permissão, recurso não encontrado) | `Result<T, DomainError>` |
| Erro inesperado (programmer bug, contract violation) | `throw` + deixar crashar |
| Erro operacional externo (upstream timeout, DB down) | `Result<T, InfraError>` + retry policy/circuit breaker |
| Logging em desenvolvimento local | Pino com `pino-pretty` transport |
| Logging em produção | Pino JSON + transport para destino (Loki/Datadog/CloudWatch) |
| Trace de request cross-service | OTel auto-instrumentation + `traceparent` header |
| Métricas de health do serviço | RED (por endpoint HTTP) |
| Métricas de health de recursos | USE (CPU/memória/conexão DB) |
| Audit de payload sensível | Pino `redact:` paths configurados no setup |

### Passo 6: Referências externas

- Skill: `/design-patterns` para Result Pattern, error handling em geral (cross-stack)
- Skill: `/system-design` para observability stack (Prometheus, Grafana, alerting SLO)
- Source: `claude-code/knowledge/Nodejs/wf-e4ce81c8.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md
```

Resultado esperado: entre 100 e 200 linhas. Alvo: ~140.

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto. Drift = CA-01 falha.
- **G2 do plano:** cap de 200 linhas. `e4ce81c8` tem 1783 linhas — alta tentação de copiar. Resistir, condensar para ~16× compressão.
- **G5 do plano:** overlap duplo — `/design-patterns` cobre Result em geral, `/system-design` cobre telemetry em geral. Este átomo cobre **integração Node-specific**: Pino + OTel + AsyncLocalStorage + Node `cause:` chain + redaction LGPD path syntax do Pino. Quando tentar explicar Result, parar e linkar `/design-patterns`.
- **G6 do plano:** `sources: [{research: e4ce81c8}]` — uma única fonte; sem path no frontmatter.
- **Local — exemplos de redact paths LGPD:** dar exemplos concretos brasileiros (`cpf`, `cnpj`, `*.password`, `*.email`) — esse é o diferencial nacional/regulatório.
- **Local — crash-on-bug é counter-intuitivo:** muitos devs tentam capturar tudo. Justificar no atomo: "deixe crashar e use orquestrador para restart limpo; estado parcial é pior que restart".

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md`
- [ ] Frontmatter contém os 8 campos na ordem correta
- [ ] `topic: error-handling-observability` (literal)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: both`
- [ ] `tier: 1`
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem
- [ ] Pelo menos 5 patterns em "Padrões sênior"
- [ ] Pelo menos 3 anti-padrões com correção (silent catch, console.log, PII leak)
- [ ] `wc -l` retorna entre 100 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' atoms/error-handling-observability.md` retorna 0
- [ ] Triggers contém pelo menos: `error`, `exception`, `Result`, `Pino`, `telemetry`, `log`, `correlation`, `OTel`, `LGPD`
- [ ] Citações de `/design-patterns` e `/system-design` em "Referências externas"
- [ ] Critério LGPD aparece (Pino redact paths) — diferencial regional

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md` exit 0
- `wc -l` retorna entre 100 e 200
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos idêntica ao piloto

**Por humano:**
- Distinção operacional vs programmer error está clara e operável (dev sabe o que crashar e o que retornar como Err)
- Integração Pino + AsyncLocalStorage + OTel está descrita em código mínimo executável (não pseudo-código)
- LGPD aparece com paths concretos (`redact:`) — sinal de adaptação regional
- Nenhum pattern duplica `/design-patterns` ou `/system-design` no nível conceitual

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
