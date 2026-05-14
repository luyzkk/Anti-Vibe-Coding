# Plano 03: Migracao em Escala (10 auditores restantes + mutation stub)

**Feature:** v6.1.0 — Contrato de Subagentes v1 ([PLAN overview](../PLAN.md), [PRD](../PRD.md))
**Fases:** 5
**Sizing total:** ~6h
**Depende de:** Plano 02 (3 pilotos migrados + migration guide v2 destilado + regra mapping dominio→lifecycle publicada)
**Desbloqueia:** Plano 04 (handler generico consome envelope v1 de 13 agentes); Plano 05 fase-04 (suite CI 13/13)

---

## O que este plano entrega

Os 10 subagentes restantes emitindo contrato v1 — 7 audit-only (`react-auditor`, `solid-auditor`, `code-smell-detector`, `tdd-verifier`, `api-auditor`, `database-analyzer`, `infrastructure-auditor`) seguindo template do Plano 02; 1 audit + 1 verification (`lesson-evaluator`, `plan-executor`); 1 mutation cosmetica (`documentation-writer` com `payload.mutation` stub explicito, sem spec real — fica pra v6.2 registrado em `TODO.md`). Saida: 13/13 agentes contrato-compliant, 10 fixtures novas (somadas as 3 do Plano 02 = 13 totais), `bun test agents:contract` verde — handler generico do Plano 04 pode assumir envelope uniforme.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Migration guide v2 destilado em `docs/design-docs/subagent-contract-v1.md` (regra mapping, exemplos por kind, 2 paginas) | Plano 02 fase-04 | bloqueador — autor de cada fase aqui le como referencia |
| 3 fixtures pilotos verdes (security, plan-verifier, design-explorer) | Plano 02 fase-03 | bloqueador — template de fixture replicado nas 10 novas |
| Validator `parseAndDispatch` + secret-pattern + threshold reasoning | Plano 01 fase-04 | bloqueador |
| Regra explicita de mapeamento dominio→lifecycle (3-tier: clean/issues/critical + needs_retry/blocked) | Plano 02 fase-04 (destilada do fase-01 do Plano 02) | bloqueador |
| Schema JSON `agents/_contract/v1.schema.json` (oneOf por kind) | Plano 01 fase-03 | bloqueador |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 10 prompts `agents/*.md` migrados (envelope v1 uniforme) | Plano 04 fase-03 (verify-work), fase-04 (anti-vibe-review) — handler `kind: audit` consome direto |
| `plan-executor.md` com lifecycle normalizado (`done|partial|blocked` → `complete|complete+domain_status:partial|blocked`) | Plano 04 fase-01 (execute-plan) — handler `kind: verification` reusa logica do plan-verifier |
| `documentation-writer.md` com envelope cosmetico `kind: "mutation"` + `payload.mutation` stub | Plano 04 (nenhum orquestrador consome ainda em v6.1.0); Plano 05 fase-05 (CHANGELOG menciona reservation v6.2) |
| 10 fixtures novas em `agents/__fixtures__/{nome}/` (input.json + expected-output.json) | Plano 05 fase-04 (CI completo 13/13); Plano 04 (handler genérico roda contra fixtures para regression) |
| Entrada nova em `TODO.md` raiz: `{feature:plugin} v6.2 — definir spec real do mutation payload (dry-run, diff preview, conflict resolution)` | Plano 05 fase-05 (CHANGELOG cita reservation) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-batch-audit-1.md | 4 auditores read-only migrados (`react`, `solid`, `code-smell`, `tdd`) via 4 subagentes paralelos editando 4 arquivos distintos | 1.5h | Plano 02 fase-04 (guide) |
| 02 | fase-02-batch-audit-2.md | 3 auditores read-only migrados (`api`, `database`, `infrastructure`) via 3 subagentes paralelos | 1h | Plano 02 fase-04 (guide) |
| 03 | fase-03-lesson-plan-executor.md | `lesson-evaluator` (kind=audit) + `plan-executor` (kind=verification, lifecycle normalizado) | 1.5h | Plano 02 fase-04 |
| 04 | fase-04-documentation-writer-mutation-stub.md | `documentation-writer.md` ganha envelope cosmetico `kind: "mutation"` com `payload.mutation` stub + entrada `TODO.md` v6.2 | 1h | Plano 02 fase-04 |
| 05 | fase-05-fixtures-10-auditores.md | 10 fixtures novas commitadas; `bun test agents:contract` verde nos 13 totais | 1h | fase-01, 02, 03, 04 |

**Sizing total:** 1.5 + 1 + 1.5 + 1 + 1 = **6h** — alinhado com overview.

---

## Grafo de Fases

```
fase-01 (batch audit 1: react/solid/code-smell/tdd)
     \
      \         fase-02 (batch audit 2: api/database/infra)
       \             /
        \           /
         +---+ +---+
             | |
       fase-03 (lesson + plan-executor)
             | |         fase-04 (writer mutation stub + TODO)
             | |              /
             | |             /
             +-+--- + -------+
                    |
                    v
              fase-05 (10 fixtures + bun test agents:contract verde 13/13)
```

**Paralelismo possivel:**
- **fase-01 e fase-02 sao paralelizaveis entre si** — auditores read-only, arquivos distintos (`agents/react-auditor.md` etc), sem acoplamento de logica. Podem rodar concorrentes via subagentes do `/execute-plan`.
- **fase-03 e fase-04 sao paralelizaveis entre si** — lesson/executor vs writer tocam arquivos distintos. fase-03 e mais densa (2 agentes, 1 com lifecycle parcial); fase-04 e enxuta (1 agente, stub explicito).
- **fase-05 sintetiza** — depende das 4 anteriores. Nao paraleliza.

---

## TDD Strategy

```
Ciclo por fase de migracao (fases 01-04):
1. RED: simular output do prompt antigo contra parseAndDispatch — esperar INVALID_LIFECYCLE_STATUS / MISSING_REASONING / MISSING_CONTRACT_VERSION
2. GREEN: editar prompt para emitir envelope v1; rodar output exemplo contra parseAndDispatch — { ok: true, kind: "<...>" }
3. REFACTOR: ajustar payload structure, reasoning examples, human_readable shape se aplicavel
4. VERIFY: bun run lint no diff

Ciclo da fase-05 (fixtures):
1. RED: bun test agents:contract falha (10 fixtures ausentes + as 3 do Plano 02 ja verdes)
2. GREEN: criar 10 pares (input.json + expected-output.json); rodar test => 13 passed, 0 failed
3. VERIFY: validar manualmente que expected-output.json de cada fixture e realista (nao copy-paste do security)
```

**Tracer Bullet deste plano:** N/A — tracer foi no Plano 01 fase-05. Aqui replicamos o template validado no Plano 02 em escala, com 1 caso especial (mutation stub) e 1 lifecycle parcial (plan-executor).

---

## Gotchas Conhecidos

Herdados dos Planos 01 e 02 (G1-G8 + G-P02-01..05) onde relevantes. Sem gotchas novos especificos — este plano e aplicacao mecanica do template validado no Plano 02.

### Herdados do Plano 01

- **G1 (LLM emite JSON malformado):** Aplica-se a todas as fases 01-04. Instruir explicitamente "sem code fences" no template de output em cada prompt editado.
- **G2 (lifecycle vs domain_status):** Critico. Os 7 auditores audit-only tem enum dominio (`OPTIMIZED/ISSUES_FOUND/CRITICAL` ou equivalente) que vai pra `payload.domain_status`, NUNCA pra `status` top-level.
- **G3 (reasoning 20/50 threshold):** Exemplos no prompt devem mostrar reasoning bom (>50 chars com observacao concreta, nao repetindo `issues[]`).
- **G5 (`contract_version: "1.0"` literal fixo):** Aplica-se aos 10 prompts editados.
- **G8 (Comment Provenance):** Snippets de exemplo dentro dos prompts/fixtures devem ter linhagem inline quando contiverem decisoes.

### Herdados do Plano 02

- **G-P02-01 (Mapeamento dominio→lifecycle nao e 1:1):** Regra publicada no migration guide v2. Para auditores audit-only deste plano:
  - Variante "tudo limpo" (`OPTIMIZED`, `CLEAN`, `COMPLIANT`, `SECURE`) → `status: "complete"`, `payload.domain_status: "clean"`
  - Variante "achou coisas" (`ISSUES_FOUND`, `SMELLS_FOUND`, `VULNERABILITIES_FOUND`, `NON_COMPLIANT`, `PARTIALLY_COMPLIANT`) → `status: "complete"`, `payload.domain_status: "issues_found"`
  - Variante "critico" (`CRITICAL`, `CRITICAL_ISSUES`, `CRITICAL_PERFORMANCE`, `REFACTORING_NEEDED`) → `status: "complete"`, `payload.domain_status: "critical"` — o consumidor decide se aborta; **NAO** mapeia mecanicamente para `blocked`. Blocked e so para erro irrecuperavel.
  - Erro mecanico (arquivo nao parseou, timeout) → `status: "needs_retry"`
  - Irrecuperavel (arquivo nao existe, permissao) → `status: "blocked"`
  - Para `plan-executor` (kind=verification): `done` → `complete`; `partial` → `complete` com `payload.domain_status: "partial"`; `blocked` real → `status: "blocked"` (ja e lifecycle correto).
- **G-P02-02 (markdown rico vale como human_readable):** Auditores que ja produzem markdown estruturado (tabela de issues, severidade) podem preservar em `human_readable` enquanto `payload.issues[]` carrega forma estruturada. Nao obrigatorio — auditores curtos podem omitir human_readable.
- **G-P02-03 (reasoning vs human_readable):** `reasoning` = meta-observacao do agente ("achei algo fora do schema"); `human_readable` = mesma info do payload mas para humano ler. Nao confundir.
- **G-P02-05 (destilar nao concatenar):** Aplica-se aos prompts editados — nao copy-paste do plan-verifier inteiro. Cada auditor tem dominio proprio; reescrever blocos de Status Mapping e Reasoning guideline com vocabulario do dominio do auditor.

### Especificos da fase-04 (documentation-writer)

- O `payload.mutation` e **stub** explicito — aceita qualquer shape em v6.1.0. Documentar no prompt do agente que shape real vira em v6.2. Sem isso, autor futuro pode achar que stub e contrato e cristalizar shape ruim.

---

## Criterio de Aceite (encadeado aos CAs do PRD)

| CA do PRD | Como fase deste plano cobre |
|-----------|----------------------------|
| **CA-01** (envelope v1 completo por agente) | fases 01-04 produzem 10 prompts emitindo envelope v1; fase-05 valida via fixture |
| **CA-02** (reasoning min 20, warn em 50) | prompts incluem exemplo de reasoning >50 com vocabulario do dominio de cada auditor |
| **CA-03** (rejeicao de enum dominio em `status` top-level) | fases 01-03 explicitamente movem enum dominio (`OPTIMIZED`/`COMPLIANT`/etc) para `payload.domain_status` — bloco Status Mapping em cada prompt |
| **CA-04** (parcial — handler generico assume 13 agentes uniformes) | Pre-condicao satisfeita: 13 emitem envelope v1; consumacao real e Plano 04 |
| **CA-07** (13 fixtures verdes em CI) | fase-05 entrega 10 novas (somadas as 3 do Plano 02 = 13 totais); `bun test agents:contract` verde |
| **CA-09** (migration guide com exemplos por kind) | fase-04 adiciona exemplo `kind: mutation` ao guide (stub explicito) — completa cobertura dos 4 kinds |

CAs nao cobertos aqui (vao para Planos 04-05): CA-04 completo (handler generico ativo), CA-05 (retry policy), CA-06 (auditor novo entra sem mudanca), CA-08 (init PRD requires), CA-10 (harness-validate).

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
