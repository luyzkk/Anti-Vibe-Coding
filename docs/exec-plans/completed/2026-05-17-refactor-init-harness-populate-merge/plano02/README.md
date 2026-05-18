# Plano 02: Tracer Bullet — Populate Plan Generator

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~2.5h (0.5h + 1h + 0.5h + 0.5h)
**Depende de:** Plano 01 (helpers de backup canonicos + flag `--rollback` reconhecida + auditoria GO do execute-plan)
**Desbloqueia:** Plano 07 (Aceitacao E2E + Release v6.4.0)

---

## O que este plano entrega

Tracer bullet end-to-end do feature: o `/anti-vibe-coding:init`, apos rodar todos os 17 steps atuais + `finalValidationStep`, emite em disco um plano de populacao `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com pelo menos uma task paralelizavel por arquivo do harness (excluindo filosoficos). Conecta dispatcher → registry → novo Step 91 → `populate-plan-generator` → escrita determinista. Sem ramos complexos (merge invertido, classificacao, drift detection) — esta validacao prova que a arquitetura aditiva ao registry funciona.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato `Step { id, run }` + `StepReport` | `skills/init/lib/steps/types.ts` | pronto |
| Dispatcher `runInit` iterando registry | `skills/init/lib/run-init.ts` | pronto |
| `finalValidationStep` como ultimo step atual | `skills/init/lib/steps/90-final-validation.ts` | pronto |
| Manifest de templates do harness (lista canonica de arquivos) | `skills/init/lib/template-manifest.ts` | pronto |
| `EXECUTE_PLAN_AUDIT.md` com veredito GO ou decisao "glossario opcional v1" | Plano 01 fase-01 | pendente (gate) |
| Helpers de backup canonicos (NAO consumidos aqui, mas plano so segue se 01 entregou) | Plano 01 fase-02 | pendente (contrato) |
| Flag `--rollback` parseada + early-return no dispatcher | Plano 01 fase-03 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/init/assets/snippets/populate-plan-template.md` (template canonico do PLAN.md de populacao) | Plano 04 fase-03 (apply-merge-destructive pode injetar blocos extraidos como referencia para tasks), Plano 05 fase-03 (drift detector usa a mesma estrutura para PLAN.md incremental) |
| `skills/init/lib/populate-plan-generator.ts` (`generatePopulatePlan`, `PopulatePlanInput`, `PopulatePlanOutput`) | Plano 05 fase-03 (drift detector chama o gerador com lista filtrada PLACEHOLDER), Plano 06 fase-01 (audit log injeta `subagent_id: init-populate-plan-gen`) |
| Step 91 (`generate-populate-plan`) registrado APOS `finalValidationStep` | Plano 03/04/05/06 reusam a posicao "91" como contrato; nenhum step adicional cabe depois sem revisao do registry |
| Fixture greenfield + teste E2E baseline | Plano 07 fase-01 (greenfield fixture v6.4) + fase-03 (CA-12 E2E) reusam o fixture como base |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-snippets-populate-plan-template.md` | `assets/snippets/populate-plan-template.md` (template MD do PLAN.md de populacao com placeholders + wave-based marker + ultima task `harness:validate`) | 0.5h | — |
| 02 | `fase-02-populate-plan-generator-lib.md` | `lib/populate-plan-generator.ts` + testes (renderiza template, 1 task por arquivo do harness, `sharedGlossary` opcional, excludes filosoficos) | 1h | fase-01 |
| 03 | `fase-03-step-91-generate-populate-plan.md` | `lib/steps/91-generate-populate-plan.ts` implementando contrato `Step { id, run }` + entry no `registry.ts` apos `finalValidationStep` + testes pareados | 0.5h | fase-02 |
| 04 | `fase-04-greenfield-e2e-populate-plan.md` | Fixture greenfield minimo + teste E2E que roda `runInit` e asserta presenca do `PLAN.md` de populacao em disco com >=1 task por arquivo harness (CA-01) | 0.5h | fase-03 |

---

## Grafo de Fases

```
fase-01 (snippets-populate-plan-template)
    |
    v
fase-02 (populate-plan-generator-lib)
    |
    v
fase-03 (step-91-generate-populate-plan)
    |
    v
fase-04 (greenfield-e2e-populate-plan)   <-- TRACER BULLET feature-wide
```

**Paralelismo possivel:** Nenhum dentro deste plano — sequencial estrito. A fase-02 importa o caminho do snippet criado na fase-01 para validar conteudo; fase-03 importa o gerador da fase-02; fase-04 integra o registry da fase-03.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** `fase-04-greenfield-e2e-populate-plan` — e o tracer bullet **feature-wide**, nao apenas do plano. Prova que dispatcher → registry → Step 91 → populate-plan-generator → escrita em disco funciona end-to-end no cenario mais simples (greenfield, sem merge, sem drift, sem secrets). Falha em qualquer ponto desta cadeia bloqueia todos os planos seguintes — se o tracer passa, a arquitetura aditiva ao registry esta validada e Planos 03-06 apenas adicionam ramos especificos.

- **fase-01:** content authoring (template Markdown). Sem TDD codigo — checklist de qualidade de conteudo + grep validations contra o snippet.
- **fase-02:** RED-GREEN-REFACTOR rigoroso. Cada funcao publica tem 1+ teste em `populate-plan-generator.test.ts`.
- **fase-03:** RED-GREEN-REFACTOR. Testes pareados de step + integracao com registry (asserta posicao + execucao sem AbortError).
- **fase-04:** teste E2E em `tests/e2e/greenfield-populate-plan.test.ts` consumindo fixture isolado via `mkdtemp`. RED = teste rodando `runInit` falha por ausencia de PLAN.md; GREEN = fase-03 entregou step funcional → teste verde.

---

## Gotchas Conhecidos

- **G1 (D1+D3 — Init NAO executa o plano):** Step 91 emite arquivo em disco e retorna `mutated: true` + `summary` sugerindo `/anti-vibe-coding:execute-plan`. NUNCA invocar a skill `/execute-plan` programaticamente. Violar isso quebra `feedback_suggest_dont_execute.md`. Mensagem final em PT-BR (RNF-05).
- **G2 (D14 — Filosoficos nao entram no PLAN.md):** `docs/COMPOUND_ENGINEERING.md` e `docs/PRODUCT_SENSE.md` sao postura canonica do plugin. O gerador deve excluir explicitamente esses dois `dst` paths do `TEMPLATE_MANIFEST`. Test #3 da fase-02 assertara exclusao via grep negativo no PLAN.md.
- **G3 (D13 — Wave-based + tasks paralelizaveis):** Template inclui marcador `<!-- wave: 1 -->` antes do bloco de tasks que podem rodar em paralelo (todas dos arquivos harness). Ultima task (`harness:validate`) fica em sua propria wave para garantir ordem: paralelo → barreira → validate. Plano 05 fase-03 (drift) reusa esse marcador.
- **G4 (D15+SH-06 — Ultima task = harness:validate):** O gerador SEMPRE apenda ao final do PLAN.md uma task com comando exato `bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts`. Falha dessa task trava o plano em status `awaiting-fix` (semantica documentada no template, executada pelo `/execute-plan`). NAO usar caminhos absolutos — sempre relativos ao cwd do projeto-alvo.
- **G5 (R-04 / DI-06 / G5 do plano01 — Windows path safety):** Path joins via `path.join`. Data path-safe no nome da pasta: `toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z')`. Caminho final: `docs/exec-plans/active/{YYYY-MM-DDTHH-MM-SSZ}-populate-harness/PLAN.md`. Tem que bater com o regex usado por `getLatestBackupDir` do Plano 01 (consistencia terminologica).
- **G6 (CH-03 opcional v1 — Glossario compartilhado):** O gerador aceita `sharedGlossary?: string`. Quando `undefined` (caso greenfield deste tracer bullet, Plano 03 ainda nao rodou para extrair terminologia), o template omite inteiramente a secao `## Glossario Compartilhado`. Quando definido (Planos 03+ futuros), injeta antes da lista de tasks. Test #5 da fase-02 cobre ambos os caminhos.
- **G7 (MH-01 — Step 91 vai APOS finalValidationStep):** Posicao no registry e `[...todos os atuais, finalValidationStep, generatePopulatePlanStep]`. NUNCA antes do finalValidationStep — gerar plano de populacao com harness invalido seria gerar lixo. Test de integracao da fase-03 asserta `registry.at(-1)?.id === '91-generate-populate-plan'`.
- **G8 (SH-07 — Audit log subagent_id canonico):** Plano 06 fase-01 padroniza emissao em todos os novos steps, mas a fase-03 deste plano ja deve usar `subagent_id: 'init-populate-plan-gen'` no summary/log interno (string literal pre-definida) para evitar churn quando o audit log virar mandatorio.
- **G9 (CA-01 — Aceite por contrato):** "Apos `/init` em greenfield, existe `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com >=1 task por arquivo do harness." Test E2E (fase-04) le o `TEMPLATE_MANIFEST`, exclui filosoficos (G2), conta `### Task` no PLAN.md final e asserta `>= manifestSize - 2`.

---

## Criterios de Exit (plano completo quando)

- [ ] `skills/init/assets/snippets/populate-plan-template.md` existe e contem todos os placeholders esperados (`{{DATE}}`, `{{TASKS_BLOCK}}`, `{{VALIDATE_TASK}}`, `{{SHARED_GLOSSARY_BLOCK}}`) verificaveis via grep.
- [ ] `skills/init/lib/populate-plan-generator.ts` exporta exatamente: `generatePopulatePlan`, `PopulatePlanInput`, `PopulatePlanOutput`, `PopulatePlanTask` (4 simbolos publicos).
- [ ] `skills/init/lib/steps/91-generate-populate-plan.ts` exporta `generatePopulatePlanStep: Step` com `id === '91-generate-populate-plan'`.
- [ ] `skills/init/lib/registry.ts` tem `generatePopulatePlanStep` como ultima entrada, apos `finalValidationStep`.
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts skills/init/lib/steps/91-generate-populate-plan.test.ts skills/init/lib/registry.test.ts tests/e2e/greenfield-populate-plan.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean nos arquivos criados/modificados.
- [ ] Fixture greenfield existe em `tests/fixtures/greenfield-populate-plan-tracer/` (minimo: `.gitignore` vazio + nada mais — repos verdadeiramente greenfield).
- [ ] Teste E2E da fase-04 prova: PLAN.md emitido contem `>= TEMPLATE_MANIFEST.length - 2` tasks (`-2` = exclusao de COMPOUND_ENGINEERING + PRODUCT_SENSE), inclui task final `harness:validate`, e a mensagem retornada por `runInit` sugere `/anti-vibe-coding:execute-plan` em PT-BR.
- [ ] `MEMORY.md` deste plano lista a API publica final do `populate-plan-generator.ts` + qualquer DI/BUG/GT descoberto durante execucao + nota sobre `sharedGlossary` ficar undefined neste tracer bullet (Plano 03 futuro habilita).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
