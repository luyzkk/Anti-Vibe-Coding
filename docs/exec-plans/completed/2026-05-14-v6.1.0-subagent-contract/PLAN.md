# Plan: Contrato de Subagentes v1 (v6.1.0) — Eixo 1 Agent-Native

**PRD:** ./PRD.md
**Planos:** 5 planos, ~21 fases total
**Created:** 2026-05-14

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fundação do Contrato (ADR + schema + validator + tracer bullet) | 5 | ~4h | — |
| 02 | Migração Piloto (3 padrões: enum-domínio, JSON parcial, schema rígido) | 4 | ~5h | Plano 01 |
| 03 | Migração em Escala (10 auditores restantes + mutation stub) | 5 | ~6h | Plano 02 |
| 04 | Orquestradores (4 skills via handler genérico, blast radius crescente) | 4 | ~7h | Plano 03 |
| 05 | Validação Final + Harness + Unlock `/init` | 5 | ~4h | Plano 04 |

**Total estimado:** ~26h focadas → alinhado com PRD §Escopo "2-3 dias focados".

---

## Grafo de Dependencias

```
Plano 01 (Fundação + Tracer Bullet)
    |
    v
Plano 02 (3 pilotos validam contrato)
    |
    v
Plano 03 (10 restantes — aplicação mecânica)
    |
    v
Plano 04 (4 orquestradores — handler genérico)
    |
    v
Plano 05 (validação final + unlock /init + merge to main)
```

**Paralelismo possivel:**
- **Entre planos:** nenhum. Cadeia sequencial (cada onda depende da anterior validada — ver PRD §Decisões #6).
- **Dentro de planos:** sim. Plano 03 pode rodar batches de auditores em paralelo via subagentes (ex: 4 auditores read-only por fase). Plano 04 NÃO paraleliza orquestradores entre si (ordem por blast radius é deliberada).

**Branch isolado:** Mantido durante Planos 01-04. Merge to main só depois do Plano 05 verde (PRD §DoD).

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-05-tracer-bullet-e2e
**Descricao:** `security-auditor` migrado emite JSON contrato v1 → fixture mínima valida → handler genérico em `skills/lib/subagent-contract.ts` parsa via `kind` → 1 consumer real (`execute-plan` ou stub de teste) lê output sem regex específico. Slice fino prova: schema válido + validator + parser genérico + 1 produtor real + 1 consumer real funcionam end-to-end ANTES de migrar os outros 12 auditores e 4 orquestradores.

---

## Resumo por Plano

### Plano 01: Fundação do Contrato
> Define o contrato canônico (ADR + doc + JSON schema), entrega o helper TS de parser/validator, migra `security-auditor` como prova end-to-end. Sem refactor em massa ainda. Output: contrato versionado em git + 1 auditor + 1 consumer + 1 fixture funcionando.

Fases:
- fase-01-adr-contrato: ADR-NNNN documenta decisões 1-10 do PRD com alternativas rejeitadas
- fase-02-doc-canonico: `docs/design-docs/subagent-contract-v1.md` (shape + migration guide + exemplos por `kind`)
- fase-03-schema-json: `agents/_contract/v1.schema.json` (oneOf por kind conforme PRD §Decisões #5)
- fase-04-validator-lib: `skills/lib/subagent-contract.ts` (parser tolerante, validator, retry mecânico em parse failure, rejeição de secrets/lifecycle inválido/reasoning <20 chars)
- fase-05-tracer-bullet-e2e: migrar `security-auditor` + fixture + handler genérico stub valida E2E

### Plano 02: Migração Piloto
> Migra os 3 padrões distintos do INVENTORY que NÃO são security: `plan-verifier` (JSON parcial → normalizar nomes), `design-explorer` (markdown rígido 8 seções → `kind: proposal` com `human_readable`). Valida contrato contra os 3 padrões reais. Gera migration guide atualizado com lições.

Fases:
- fase-01-plan-verifier-migracao: normalizar `pass→complete`, adicionar `reasoning`, JSON wrapper completo
- fase-02-design-explorer-migracao: `kind: proposal`, 8 seções viram `human_readable`, payload estruturado
- fase-03-validar-3-padroes: 2 fixtures novas (verifier + explorer) + revalidar security; rodam contra validator
- fase-04-migration-guide-final: documento canônico atualizado com lições dos 3 pilotos para Plano 03 escalar mecanicamente

### Plano 03: Migração em Escala
> 10 auditores restantes seguem o template do Plano 02. Maioria é mecânica (read-only audit, mesmo padrão markdown+enum). Trata `documentation-writer` separadamente — recebe envelope cosmético com `payload.mutation` stub (PRD §Won't Have).

Fases:
- fase-01-batch-audit-1: react-auditor, solid-auditor, code-smell-detector, tdd-verifier (4 audit em paralelo via subagente)
- fase-02-batch-audit-2: api-auditor, database-analyzer, infrastructure-auditor (3 audit em paralelo)
- fase-03-lesson-plan-executor: lesson-evaluator + plan-executor (kind=verification para executor)
- fase-04-documentation-writer-mutation-stub: kind=mutation cosmético; payload.mutation aceita qualquer shape; TODO.md entry pra v6.2
- fase-05-fixtures-10-auditores: 10 fixtures commitadas; `bun test agents:contract` verde nos 13

### Plano 04: Orquestradores (handler genérico)
> Substitui parsing custom por handler `by-kind` em 4 skills. Ordem é por blast radius crescente — PRD §Riscos explicitamente: execute-plan → design-twice → verify-work → anti-vibe-review.

Fases:
- fase-01-execute-plan-handler: consumidor único de plan-verifier/executor; menor blast radius; substitui regex por `parseContract()` + dispatch por kind
- fase-02-design-twice-handler: 3 invocações paralelas de design-explorer; consolida `payload.proposal` + `human_readable`
- fase-03-verify-work-handler: até 8 auditores paralelos; handler genérico read `kind: audit` → consolida `payload.issues[]` + `reasoning[]` numa seção do relatório
- fase-04-anti-vibe-review-handler: maior superfície; replica padrão do verify-work; remove código por-agente

### Plano 05: Validação Final + Unlock
> Fecha o ciclo: harness valida prompts de subagente, pre-commit hook ativa, PRD do `/init` atualiza `requires:`, fixtures verdes em CI, CHANGELOG entry, compound note se padrão durável emergiu, merge to main.

Fases:
- fase-01-harness-validate-extension: `scripts/harness-validate.ts` checa que `agents/*.md` instrui contrato v1 (CA-10)
- fase-02-pre-commit-hook: validador como hook em `agents/*.md` (RF-SH-05)
- fase-03-init-prd-update: atualizar `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` com `requires: [v6.1.0-subagent-contract]` (CA-08)
- fase-04-fixtures-regression-ci: 13 fixtures verdes em CI; snapshot JSON commitado por subagente (CA-07)
- fase-05-changelog-compound-merge: CHANGELOG v6.1.0 + compound note se "reasoning forçou agentes a notar coisas fora do schema" se confirmar como padrão; merge to main

---

## Risks

- **LLM emite JSON malformado (não-determinismo).** Probabilidade alta, impacto médio.
  - Mitigação: parser tolerante (whitespace/trailing-comma) + retry mecânico em `JSON.parse` failure (separado de `needs_retry` semântico). Implementado no Plano 01 fase-04.
- **Big-bang quebra orquestradores durante janela.** Probabilidade média, impacto alto.
  - Mitigação: branch isolado até Plano 05 verde; Plano 04 ordem por blast radius com fixture-gate por fase.
- **Distinção `status` lifecycle vs `payload.domain_status` confunde autores.** Probabilidade média.
  - Mitigação: migration guide com exemplos contrastantes (Plano 02 fase-04); validador rejeita uso errado com mensagem sugerindo correção.
- **Campo `reasoning` vira dump desorganizado.** Probabilidade média.
  - Mitigação: fixture inclui exemplo bom; validador warn em `reasoning` <50 chars (sinal de prompt subóptimo); compound note futuro se padrão ruim emergir.
- **Subagente expõe secrets em `payload`/`reasoning`.** Probabilidade baixa, impacto alto.
  - Mitigação: validator rejeita patterns conhecidos (`API_KEY=`, `SECRET=`, `PASSWORD=`); Plano 01 fase-04.

---

## Decisoes do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D1: JSON estruturado + `human_readable` opcional | Plano 01 fase-03 (schema), Plano 02 fase-02 (design-explorer 8 seções viram `human_readable`) |
| D2: Lifecycle padronizado + `payload.domain_status` separado | Plano 01 fase-03, fase-04 (validator rejeita enum domínio em `status` top-level) |
| D3: `reasoning` obrigatório, prosa livre | Plano 01 fase-04 (validator), Plano 02 fase-04 (migration guide exemplifica uso bom) |
| D4: `kind` enum (audit/mutation/proposal/verification) | Plano 01 fase-03 (schema oneOf); Plano 03 fase-04 (mutation stub) |
| D5: Shape de `payload` declarado em schema (oneOf por kind) | Plano 01 fase-03 |
| D6: Big-bang em 5 ondas, branch isolado até verde | Estrutura inteira dos 5 planos; Plano 05 fase-05 (merge) |
| D7: `contract_version: "1.0"` fixo | Plano 01 fase-03, fase-04 |
| D8: Schema em `agents/_contract/`, doc em `docs/design-docs/` | Plano 01 fases 02, 03 |
| D9: 1 retry default em `needs_retry` | Plano 04 fase-01 (helper inicial em execute-plan, depois extraído pros outros) |
| D10: Validator rejeita `reasoning` <20 chars; warn <50 chars | Plano 01 fase-04 |

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
