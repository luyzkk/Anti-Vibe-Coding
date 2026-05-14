# Plano 02: Migracao Piloto (3 padroes)

**Feature:** v6.1.0 — Contrato de Subagentes v1 ([PLAN overview](../PLAN.md), [PRD](../PRD.md))
**Fases:** 4
**Sizing total:** ~5h
**Depende de:** Plano 01 (Fundacao — ADR + doc + schema + validator + tracer bullet com `security-auditor`)
**Desbloqueia:** Plano 03 (Migracao em Escala — 10 auditores restantes + `documentation-writer` stub)

---

## O que este plano entrega

Contrato v1 validado contra **os 3 padroes reais distintos** do INVENTORY que NAO sao security-auditor: `plan-verifier` (ja emite JSON parcial — normalizar nomes), `design-explorer` (markdown rigido com 8 secoes — virar `kind: proposal` com `human_readable`). Saida: 3 fixtures verdes contra `skills/lib/subagent-contract.ts`, migration guide canonico atualizado com licoes destiladas dos 3 pilotos — pronto para Plano 03 escalar mecanicamente nos 10 restantes.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| ADR-0002 + doc canonico `subagent-contract-v1.md` | Plano 01 fase-01/02 | bloqueador — precisa estar commitado |
| JSON schema `agents/_contract/v1.schema.json` (oneOf por kind) | Plano 01 fase-03 | bloqueador |
| Validator `skills/lib/subagent-contract.ts` (parser + `parseAndDispatch` + secret-pattern + threshold reasoning) | Plano 01 fase-04 | bloqueador |
| `security-auditor.md` migrado + fixture verde | Plano 01 fase-05 | bloqueador — template de migracao real |
| Fixture template `agents/__fixtures__/security-auditor/{input.json,expected-output.json}` | Plano 01 fase-05 | bloqueador — sera revalidado em fase-03 |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `plan-verifier.md` migrado (template do mapeamento dominio→lifecycle) | Plano 03 fase-03 (lesson-evaluator + plan-executor) — replica padrao de status mapping |
| `design-explorer.md` migrado (template de `kind: proposal` + `human_readable`) | Plano 04 fase-02 (design-twice handler consome `payload.proposal`) |
| 3 fixtures verdes (security + verifier + explorer) | Plano 03 fase-05 (template para 10 fixtures novas), Plano 05 fase-04 (suite CI completa) |
| Migration guide v2 destilado (`subagent-contract-v1.md` atualizado) | Plano 03 fases 01-04 (autores aplicam guide); Plano 05 fase-05 (CHANGELOG cita guide) |
| Regra explicita de mapeamento `pass/warn/fail → complete/needs_retry/blocked` | Plano 03 fase-01/02 (4+3 audit batches replicam regra) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-plan-verifier-migracao.md | `agents/plan-verifier.md` emitindo envelope v1 completo; mapeamento `pass/warn/fail → complete/needs_retry/blocked` documentado; `payload.checks[]` preservado; `payload.domain_status` opcional | 1.5h | Plano 01 fase-05 |
| 02 | fase-02-design-explorer-migracao.md | `agents/design-explorer.md` emitindo `kind: proposal`; 8 secoes preservadas em `human_readable`; `payload.proposal` estruturado | 1.5h | Plano 01 fase-05 |
| 03 | fase-03-validar-3-padroes.md | 2 fixtures novas (`__fixtures__/plan-verifier/`, `__fixtures__/design-explorer/`) + revalidacao da fixture security; `bun test agents:contract` verde nos 3 | 1h | fase-01, fase-02 |
| 04 | fase-04-migration-guide-final.md | `docs/design-docs/subagent-contract-v1.md` atualizado com licoes dos 3 pilotos (mapping rule, human_readable rationale, reasoning bom/fraco, checklist <30min) | 1h | fase-03 |

**Sizing total:** 1.5 + 1.5 + 1 + 1 = **5h** — alinhado com overview.

---

## Grafo de Fases

```
fase-01 (plan-verifier)     fase-02 (design-explorer)
        \                          /
         \                        /
          v                      v
            fase-03 (validar 3 padroes)
                      |
                      v
            fase-04 (migration guide final)
```

**Paralelismo possivel:** fase-01 e fase-02 sao independentes — podem rodar em paralelo (tocam arquivos distintos: `agents/plan-verifier.md` vs `agents/design-explorer.md`). fase-03 sintetiza ambas; fase-04 destila.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: rodar validator contra prompt atualizado (esperar falha — fixture nao existe ou prompt nao emite v1)
2. GREEN: editar prompt do agente / criar fixture minima que valida
3. REFACTOR: ajustar payload structure, reasoning examples, human_readable shape
4. VERIFY: bun run test -- agents:contract && bun run lint
```

**Tracer Bullet deste plano:** N/A — tracer foi no Plano 01 fase-05. Aqui validamos **largura** do contrato (3 padroes diferentes funcionam), nao profundidade.

Para fases de edicao de prompt (fase-01, fase-02), o "teste" e: simular output esperado em JSON, rodar `parseAndDispatch()` do validator, conferir que retorna sucesso + `kind` correto. Fixture concreta entra na fase-03.

---

## Gotchas Conhecidos

Herdados do Plano 01 (G1-G8) onde relevantes + novos especificos do escopo deste plano.

### Herdados do Plano 01 (aplicam aqui)

- **G1 (LLM emite JSON malformado):** Critico em fase-01 — `plan-verifier` ja emite JSON, mas pode ter trailing comma / code fence. Parser do Plano 01 fase-04 ja e tolerante. Aplica-se a fase-01, fase-02 (design-explorer agora emite JSON inedito).
- **G2 (lifecycle vs domain_status):** Critico em fase-01 — `pass/warn/fail` do plan-verifier sao **dominio** (resultado da verificacao), nao lifecycle. Tem que ir para `payload.domain_status`, NAO para `status` top-level. Aplica-se a fase-01.
- **G3 (reasoning 20/50 threshold):** Aplica-se a fase-01, fase-02. Exemplos no prompt devem mostrar reasoning bom (>50 chars com observacao concreta).
- **G5 (`contract_version: "1.0"` literal fixo):** Aplica-se aos 2 prompts editados.
- **G7 (migration guide <30min):** Critico em fase-04 — destilado de 3 pilotos, nao copy de specs. Numero maximo de paginas: 2.
- **G8 (Comment Provenance):** Em snippets de exemplo dentro do migration guide, comentarios precisam de quem/quando/por que.

### Novos deste plano

- **G-P02-01 (Mapeamento dominio → lifecycle nao e 1:1):** `pass/warn/fail` do plan-verifier nao mapeia mecanicamente para `complete/needs_retry/blocked`. Regra proposta:
  - `pass` → `status: "complete"`, `payload.domain_status: "pass"`
  - `warn` → `status: "complete"`, `payload.domain_status: "warn"` (orquestrador prossegue mas anota; nao retry)
  - `fail` com severidade media → `status: "complete"`, `payload.domain_status: "fail"` (consumidor decide se aborta — informacao, nao acao)
  - `fail` com severidade critica (ex: schema invalido, arquivo nao parseou) → `status: "needs_retry"` (problema mecanico — vale 1 retry)
  - Erro irrecuperavel (ex: arquivo nao existe) → `status: "blocked"` (orquestrador escala para humano)
  - **Decisao:** lifecycle e sobre **o que o orquestrador faz agora**, dominio e sobre **o que o auditor encontrou**. Documentado em fase-04. Aplica-se a fase-01.

- **G-P02-02 (Markdown rico do design-explorer e apresentacao valiosa):** As 8 secoes do `design-explorer` (Context, Constraints, Alternatives, Tradeoffs, Recommendation, etc) sao bem alinhadas com o ritual do `/design-twice`. NAO jogar fora. Mover **integral** para `human_readable` enquanto `payload.proposal` carrega campos chave estruturados (`title`, `summary`, `constraints[]`, `tradeoffs[]`, `recommendation`) para handler generico de `design-twice` consolidar. Aplica-se a fase-02.

- **G-P02-03 (reasoning vs human_readable nao sao a mesma coisa):** Em `design-explorer`:
  - `reasoning` = meta-observacao do agente ("notei que constraint X conflita com Y, fora do que voce pediu")
  - `human_readable` = a proposta em si, formatada para humano ler
  - Confundir os dois = perder o escape hatch (Every: "agent can say things you didn't schema"). Aplica-se a fase-02, fase-04.

- **G-P02-04 (design-explorer nunca e `needs_retry`):** Proposta nao e auditoria — se o LLM falhou em emitir JSON, e erro mecanico (capturado pelo retry do parser, nao pelo `needs_retry` semantico). Status padrao: `complete`. `needs_human` so se constraint do input for impossivel/contraditoria. Aplica-se a fase-02.

- **G-P02-05 (migration guide tem que destilar, nao concatenar):** Em fase-04, resistir tentacao de "incluir tudo o que aprendi". Foco: **regra mapping**, **regra human_readable**, **2 exemplos reasoning (bom + fraco)**, **checklist 5 passos**. Se passar de 2 paginas, falhou RF-SH-04. Aplica-se a fase-04.

---

## Criterio de Aceite (encadeado aos CAs do PRD)

| CA do PRD | Como fase deste plano cobre |
|-----------|----------------------------|
| **CA-01** (estendido para 3 agentes) | fase-01 + fase-02 produzem prompts que emitem envelope v1 completo; fase-03 valida via fixture |
| **CA-02** (reasoning min 20, warn em 50) | fase-01 e fase-02 prompts incluem exemplo de reasoning >50; fixtures testam threshold |
| **CA-03** (rejeicao de enum dominio em `status` top-level) | fase-01 explicitamente move `pass/warn/fail` para `payload.domain_status` — documentado |
| **CA-07** (parcial — 3 de 13 fixtures verdes) | fase-03 entrega exatamente isso |
| **CA-09** (migration guide com exemplos por kind) | fase-04 entrega: exemplo `kind: audit` (security), `kind: verification` (plan-verifier), `kind: proposal` (design-explorer) |

CAs nao cobertos aqui (vao para Planos 03-05): CA-04, CA-05, CA-06, CA-08, CA-10, CA-07 completo (13 fixtures).

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
