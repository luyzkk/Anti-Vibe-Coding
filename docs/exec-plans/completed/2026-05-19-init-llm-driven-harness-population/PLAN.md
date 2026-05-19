# Plan: Init LLM-Driven Harness Population (Trilha 2)

**PRD:** ./PRD.md
**Planos:** 5 planos, ~22 fases total
**Created:** 2026-05-19

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Refactor de Registry (Tracer Bullet) | 5 | ~6h | — |
| 02 | Scaffold expandido + Backup pre-mutacao | 3 | ~3h | Plano 01 |
| 03 | Gerador LLM-driven do PLAN populate | 5 | ~8h | Plano 02 |
| 04 | Reentrada + Validator allowlist + Audit Step 12 | 5 | ~6h | Plano 03 |
| 05 | Progress.txt import + SKILL.md + E2E | 4 | ~4h | Plano 03, 04 |

---

## Grafo de Dependencias

```
Plano 01 (refactor registry — Tracer Bullet)
     |
     v
Plano 02 (scaffold + CODE_STYLE.md + backup leve)
     |
     v
Plano 03 (gerador LLM-driven + 4 blocos por fase)
     |
     +-----> Plano 04 (reentrada + validator allowlist)
     |
     +-----> Plano 05 (progress.txt import + SKILL.md + E2E)
                  ^
                  |
                  +---- depende tambem do Plano 04 (E2E precisa reentry funcionando)
```

**Paralelismo possivel:** Plano 04 e Plano 05 podem ser desenvolvidos em paralelo apos Plano 03; convergem no E2E final.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-reorder-step91-before-90
**Descricao:** Reordenar `generatePopulatePlanStep` para antes de `finalValidationStep` em `skills/init/lib/registry.ts` + smoke test verificando que `PLAN.md` e gerado mesmo quando Step 90 emite warning. Resolve Bug C na fatia mais fina (swap minimo + 1 teste).

---

## Resumo por Plano

### Plano 01: Refactor de Registry (Tracer Bullet)
> Reordenar Step 91 antes do Step 90, remover Steps heuristicos (07/08/09-propose-merge/11), renomear Step 10 para `10-backup-pre-mutation` (preserva linhagem git via D3 do CONTEXT). Tracer Bullet na fase-01.

Fases:
- fase-01-reorder-step91-before-90: swap minimo + smoke test (Bug C, MH-01)
- fase-02-remove-step-07-discover-docs: deletar Step 07 antigo do registry + arquivos
- fase-03-remove-steps-08-09-11: deletar classify-blocks, propose-merge-batch, move-docs-with-stub
- fase-04-rename-step-10-backup-pre-mutation: renomear via git mv + reduzir escopo (D3, MH-05)
- fase-05-update-registry-tests: ajustar testes do registry + e2e tracer-bullet basico

### Plano 02: Scaffold expandido + Backup pre-mutacao
> Adicionar `docs/CODE_STYLE.md` como doc canonico, atualizar AGENTS.md.tpl, implementar logica do `10-backup-pre-mutation` leve.

Fases:
- fase-01-code-style-template-e-manifest: criar `assets/templates/docs/CODE_STYLE.md.tpl` + entry em TEMPLATE_MANIFEST (MH-03, MH-06)
- fase-02-agents-md-link-code-style: atualizar `AGENTS.md.tpl` para listar CODE_STYLE.md (CA-08)
- fase-03-backup-pre-mutation-impl: logica do Step 10 leve — copia CLAUDE.md raiz para `docs/_legacy/CLAUDE.md.bak` (MH-05)

### Plano 03: Gerador LLM-driven do PLAN populate
> Discovery-manifest leve (so listar paths + 100 primeiras linhas, sem regex). Reescrever `populate-plan-generator` para emitir 1 fase por doc canonico com 4 blocos (Inputs docs / Inputs codigo / Instrucao LLM / Criterio done). Pasta `plano-populate-harness/` + PLAN.md indice + 1 arquivo por fase (D4 do CONTEXT).

Fases:
- fase-01-discovery-manifest-light: lib que produz `discovery-manifest.json` apenas com path + size + 100 primeiras linhas (sem classificacao)
- fase-02-stack-aware-input-paths: helper que deriva paths candidatos `Inputs (codigo)` por stack detectado (Next.js + Supabase, etc) com validacao `fs.access` (mitiga LLM-hallucination)
- fase-03-populate-plan-renderer-v2: reescrever `populate-plan-generator.ts` para emitir markdown com 4 blocos por fase + glossario de instrucoes LLM
- fase-04-folder-structure-plano-populate-harness: emitir pasta `plano-populate-harness/` com PLAN.md indice + `fase-{NN}-{doc}.md` por doc canonico (D4)
- fase-05-step91-wires-everything: Step 91 chama discovery-manifest + stack-aware + renderer; gera ≥10 fases (1 por doc canonico incluindo CODE_STYLE.md); CA-01 + CA-02

### Plano 04: Reentrada + Validator allowlist + Audit Step 12
> Novo step gate de reentrada (lê manifest, aborta ≥ 6.5.0, dispara backup completo + re-populate se < 6.5.0). Validator Step 90 troca denylist por allowlist derivada de TEMPLATE_MANIFEST + modo warning. Audita Step 12 (`detect-drift-incremental`) sob nova arquitetura — provavelmente obsoleto pois validator allowlist cobre o mesmo terreno (R3 da revisao de riscos).

Fases:
- fase-01-reentry-guard-step: novo step antes do scaffold (le `.claude/.anti-vibe-manifest.json`, decide abort vs re-popula) (MH-07, CA-04)
- fase-02-pre-6_5_0-backup-completo: copia `docs/` -> `docs/_legacy/pre-6.5.0/` quando manifest registra v < 6.5.0 (MH-07, CA-03)
- fase-03-validator-allowlist-de-template-manifest: Step 90 deriva allowlist dinamicamente de TEMPLATE_MANIFEST + emite warnings agrupados por doc canonico (MH-08, CA-06)
- fase-04-final-validation-warning-mode: Step 90 nao aborta init (warning mode) — garante CA-07 (PLAN.md persistido mesmo apos warning)
- fase-05-audit-step-12-detect-drift: auditar Step 12 (`detect-drift-incremental`) sob nova arquitetura. Se sobreposto com allowlist do Step 90 (esperado), remover do registry + deletar arquivos + libs orfas (R3 da revisao). Se ortogonal, documentar coexistencia.

### Plano 05: Progress.txt import + SKILL.md + E2E
> Parser de `.claude/progress.txt` legado → 1 entrada compound por gotcha em `docs/compound/_imported/`. Mensagem final atualizada na SKILL.md. Reescrever E2E tracer-bullet para novo fluxo.

Fases:
- fase-01-progress-txt-parser: lib que parseia `.claude/progress.txt` em entradas compound com proveniência (MH-10, CA-05)
- fase-02-compound-imported-writer: escreve `docs/compound/_imported/{nnnn}-{slug}.md` no formato existente + INDEX.md
- fase-03-skill-md-final-message: atualizar `skills/init/SKILL.md` "Apos init concluir" para mencionar PLAN.md gerado + comando exato (MH-09, CA-11)
- fase-04-e2e-tracer-bullet-novo-fluxo: reescrever testes E2E para validar scaffold → PLAN.md gerado → fase-a-fase manual + regenerar golden file `tests/e2e/__golden__/init-greenfield.stdout.txt` (CA-10, R5 da revisao)

---

## Risks

- **Quebra dos testes E2E `tracer-bullet` atuais** ao remover Steps 07-11
  - Mitigacao: Plano 05 fase-04 reescreve E2E explicitamente; Plano 01 fase-05 ja atualiza testes do registry
- **LLM hallucinando paths inexistentes no PLAN.md gerado**
  - Mitigacao: Plano 03 fase-02 valida cada path candidato com `fs.access` antes de incluir
- **Allowlist do validator desatualizada quando templates mudam**
  - Mitigacao: Plano 04 fase-03 deriva allowlist dinamicamente de `TEMPLATE_MANIFEST` (nao hardcoded)
- **Re-init v < 6.5.0 destrutivo apaga edicoes humanas em docs canonicos**
  - Mitigacao: Plano 04 fase-02 faz backup completo `docs/_legacy/pre-6.5.0/` ANTES de qualquer write
- **`progress.txt` produz 140 arquivos poluindo `compound/`**
  - Mitigacao: Plano 05 fase-02 isola em subdir `_imported/` + INDEX.md

---

## Decisoes do PRD/CONTEXT Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (nome `docs/CODE_STYLE.md`) | Plano 02 fase-01, fase-02 |
| D2 (abort ≥ 6.5.0, re-popula < 6.5.0) | Plano 04 fase-01, fase-02 |
| D3 (renomear Step 10 preservando linhagem git) | Plano 01 fase-04 |
| D4 (pasta `plano-populate-harness/` + 1 arquivo por fase + PLAN.md indice) | Plano 03 fase-04 |
| D5 (MH-10 Must Have) | Plano 05 fase-01, fase-02 |
| D6 (CA-09 cortado — ja aplicado no PRD) | n/a |
| D7 (so mensagem clara, sem warning persistente) | Plano 05 fase-03 |
| DQ1 (1 fase por doc canonico, ~10 fases) | Plano 03 fase-04, fase-05 |
| DQ2 (LLM sugere consolidacao + humano confirma orfaos) | Plano 03 fase-03 (instrucao LLM) |
| DQ3 (humano valida via PR review; validator warning) | Plano 04 fase-04 |
| DQ4 (reentrada por pluginVersion) | Plano 04 fase-01, fase-02 |
| DQ5 (progress.txt -> compound/_imported/) | Plano 05 fase-01, fase-02 |

---

## Criterios de Aceite -> Mapeamento

| CA do PRD | Plano que cobre |
|-----------|-----------------|
| CA-01 (greenfield gera ≥10 fases) | Plano 03 fase-05 |
| CA-02 (Next.js+Supabase: ≥3 paths reais por fase) | Plano 03 fase-02, fase-05 |
| CA-03 (v < 6.5.0 backup + re-popula) | Plano 04 fase-01, fase-02 |
| CA-04 (≥ 6.5.0 aborta) | Plano 04 fase-01 |
| CA-05 (progress.txt N gotchas -> N arquivos) | Plano 05 fase-01, fase-02 |
| CA-06 (Carreirarte ≤ 5 warnings) | Plano 04 fase-03 |
| CA-07 (Step 91 ja rodou antes do 90) | Plano 01 fase-01 (Tracer Bullet) |
| CA-08 (Akita em CODE_STYLE.md, nao DESIGN.md) | Plano 02 fase-01, fase-02 |
| CA-09 (duas execucoes consecutivas em greenfield) | Plano 04 fase-01 |
| CA-10 (steps 07-11 removidos; testes passam) | Plano 01 fase-05, Plano 05 fase-04 |
| CA-11 (SKILL.md mensagem final clara) | Plano 05 fase-03 |

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
