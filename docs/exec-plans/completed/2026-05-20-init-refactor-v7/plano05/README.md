# Plano 05: Steps 8-10 + harness-validate + E2E final

**Feature:** init-refactor-v7 ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~5h
**Depende de:**
- **Plano 01** — registry com 10 nomes (stubs nas posicoes 8, 9, 10); `StepContext.legacy?` / `stack?` opcionais (DV-4); `AbortError` em `steps/abort-error.ts`; reentry-gate (DR-1) ja ativo no Step 1.
- **Plano 03** — Steps 5-6 reais no disco. Garante que `AGENTS.md` raiz existe (Step 8 `delivery-loop` injeta nele), `.claude/CLAUDE.md` preservado (CA-02), e os 36 placeholders ja foram escritos antes do Step 10 (`final-validation` walk).
- **Plano 04** — Step 7 real no disco. Garante que os 16 PLAN.md em `docs/exec-plans/active/{date}-populate-*/` existem antes de Step 10 rodar o walk. NAO ha dependencia direta de runtime entre Step 7 e Steps 8-10 — sao steps separados, mas a sequencia importa para o e2e final desta fase-05 cobrir tudo ponta-a-ponta.

**Desbloqueia:** Ninguem. Este e o plano FINAL — apos merge, init v7 vira "pronto para shipping". PRD `status: approved` → `status: shipped` (Exit Criteria do PLAN.md).

---

## O que este plano entrega

Substitui os 3 stubs finais do Plano 01 por logica real:

- **Step 8 (`delivery-loop`)** — interativo, pergunta "Do you use Linear?" via contrato `needsUser` (PRD D3, CH-01). Se 'y', injeta secao no `AGENTS.md` via `injectOptionalSection` + marker `<!-- INIT:DELIVERY_LOOP_SLOT -->`. Sem dry-run guard (D4).
- **Step 9 (`copy-knowledge`)** — invoca `runStackKnowledgeInit` que detecta stack, escreve `.claude/stack.json` e copia knowledge atoms da matrix para `.claude/knowledge/`. Stack=null skip gracioso (RF-11 — diferente do Step 7 que aborta, DR-2). Sem dry-run guard.
- **Step 10 (`final-validation`)** — walk `docs/`, agrupa warnings de paths fora da allowlist via `buildAllowlistFromTemplateManifest`. **MODO WARNING** — nao aborta. UNICA excecao: stack detectada sem `.claude/knowledge/INDEX.md` → `AbortError code=1` (D8.C do PRD `knowledge-path-cutover`, preserva comportamento existente). Sem dry-run guard.

Adicionalmente:

- **`scripts/harness-validate.ts`** — REQUIRED_FILES atualizado para incluir `docs/CODE_STYLE.md` e `.claude/CLAUDE.md` (RF-12 do PRD: 4 docs extras AVC). Os outros 2 (`docs/MERGE_GATES.md`, `docs/STATE.md`) ja estao presentes.

- **Suite e2e final** — consolida CA-01 a CA-09 do PRD em 1 arquivo (`tests/e2e/init-v7-final-acceptance.test.ts`) + 1 grep-gate (CA-09 sem refs a steps deletados). Reusa fixtures dos Planos 02-04 (greenfield Node, Rails, com-CLAUDE.md preexistente, sem-stack) e adiciona 1 nova: `v7-with-claude-md/` (CA-02 byte-identico ponta-a-ponta).

Apos este plano: `bun run test && bun run lint && bun run harness:validate` verde em fixture Node greenfield, init completo em <30s, zero refs a steps deletados.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com 10 nomes (Steps 8-10 stubs) | Plano 01 fase-04 (`registry.ts`) | pendente (Plano 01) |
| Stubs `deliveryLoopStep`, `copyKnowledgeStep`, `finalValidationStep` em `steps/08-delivery-loop.ts`, `steps/09-copy-knowledge.ts`, `steps/10-final-validation.ts` (id-only) | Plano 01 fase-04 | pendente (Plano 01) |
| `Step 5` real escreveu `AGENTS.md` raiz com marker `<!-- INIT:DELIVERY_LOOP_SLOT -->` | Plano 03 fase-01 | pendente (Plano 03) |
| `Step 5` real escreveu 36 placeholders (incluindo os 4 docs extras AVC) | Plano 03 fase-01 | pendente (Plano 03) |
| `Step 7` real escreveu 16 PLAN.md em `docs/exec-plans/active/` | Plano 04 fase-04 | pendente (Plano 04) |
| Lib `inject-optional-section.ts` (idempotente: `injected/already-present/marker-missing`) | `skills/init/lib/inject-optional-section.ts` (existente) | pronto |
| Snippet `skills/init/assets/snippets/delivery-loop.md` (wording byte-identico SKILL.md) | existente (Plano 02 fase-05 anterior) | pronto |
| Lib `run-stack-knowledge-init.ts` (orquestrador detectMultiStack + writeStackJson + copyKnowledge + warnings Rails) | `skills/init/lib/run-stack-knowledge-init.ts` (existente) | pronto |
| Lib `copy-knowledge.ts` (status `ok/no-source/no-matrix`) | `skills/init/lib/copy-knowledge.ts` (existente) | pronto |
| Lib `validator-allowlist.ts` (`buildAllowlistFromTemplateManifest`, `isAllowed`, `groupWarnings`) | `skills/init/lib/validator-allowlist.ts` (existente) | pronto |
| Lib `runFinalValidationChecks` (logica D8.C do `90-final-validation.ts` atual) | `skills/init/lib/steps/90-final-validation.ts` (existente) | pronto (vai ser PORTADO, nao reusado) |
| `AbortError` em `steps/abort-error.ts` | `skills/init/lib/steps/abort-error.ts` (existente) | pronto |
| Tracer e2e verde (10 steps reais, exit 0) | Plano 01 fase-06 + Planos 02-04 wired | pendente (cadeia) |

### Produz para (outros planos que dependem deste)

Nenhum. Plano FINAL.

Para `/iterate` pos-merge:
- E2E `tests/e2e/init-v7-final-acceptance.test.ts` cobre CA-01..CA-09 como contrato vivo do PRD — qualquer mudanca futura no init que quebra um CA falha aqui.
- Grep-gate `bun run test:grep-deleted-steps` (script novo em `package.json`) bloqueia regressao se alguem re-introduzir nomes de steps v6.7 deletados.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-step-08-delivery-loop-real.md` | `08-delivery-loop.ts` REAL portando logica de `14-delivery-loop.ts` (sem dry-run guard D4). Testes unit: 1a invocacao retorna `needsUser`, 2a com 'y' injeta secao, 'N' default no-op. CA-06 attestation (pergunta ANTES de modificar). | 1h | — |
| 02 | `fase-02-step-09-copy-knowledge-real.md` | `09-copy-knowledge.ts` REAL portando logica de `03_1-persist-stack-and-knowledge.ts` (sem dry-run guard D4). Reusa `runStackKnowledgeInit`. Testes unit: stack=node copia atoms; stack=null skip gracioso (RF-11); summary inclui `stackPrimary` + `copyResult.status`. | 1h | — (independente de fase-01) |
| 03 | `fase-03-step-10-final-validation-real.md` | `10-final-validation.ts` REAL portando logica de `90-final-validation.ts` (sem dry-run guard D4). Manter `runFinalValidationChecks` exportada (D8.C — AbortError code=1 se stack sem INDEX.md). Testes unit: warning fora da allowlist; abort stack sem index; 0 warnings em scaffold canonico. | 1.5h | — (independente de fase-01/02) |
| 04 | `fase-04-harness-validate-update.md` | `scripts/harness-validate.ts` REQUIRED_FILES + `docs/CODE_STYLE.md` + `.claude/CLAUDE.md` (RF-12). Teste RED: fixture sem esses arquivos → harness falha com mensagens claras. GREEN: scaffold com TEMPLATE_MANIFEST cria ambos → passa. | 0.5h | — |
| 05 | `fase-05-registry-wire-and-e2e-final.md` | `registry.ts` com 3 imports trocados (stubs → reais). E2E final em 5 fixtures (Node greenfield, Rails greenfield, com-legacy v6.7, com-CLAUDE.md preexistente, sem-stack) cobrindo CA-01..CA-09. Grep-gate `bun run test:grep-deleted-steps`. Lint + test verde. | 1.5h | fase-01, fase-02, fase-03, fase-04 |

**Total estimado:** 5.5h (com 0.5h de buffer). Fases 1-4 podem rodar em paralelo (4 worktrees), fase-05 espera todas.

---

## Grafo de Fases

```
fase-01 (step-08-delivery-loop)    fase-02 (step-09-copy-knowledge)    fase-03 (step-10-final-validation)    fase-04 (harness-validate)
        \                                     \                                       /                              /
         \                                     \                                     /                              /
          +------------------------------------+------+----------------------------+----------------------------+
                                                      |
                                                      v
                                          fase-05 (registry-wire + e2e final CA-01..CA-09)
```

**Paralelismo possivel:** fase-01, fase-02, fase-03 e fase-04 sao 100% independentes — cada uma toca arquivos distintos e nao compartilha tipos. Recomendado 4 worktrees em paralelo se houver capacidade. fase-05 e o merge — wire dos 3 imports no `registry.ts` + e2e cobrindo TODOS os criterios de aceite.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — Plano 01 fase-06 e o tracer global. O e2e da fase-05 deste plano EXPANDE o tracer com Steps 8-10 reais + harness-validate atualizado. Cobre CA-01..CA-09 em vez de apenas "exit 0 com 10 stubs".

**Estrategia TDD por fase:**

- **fase-01 (delivery-loop):** RED escreve teste `step-08.test.ts` com ctx sem `__interactiveAnswer` → espera `report.needsUser.prompt === 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]'` (DOUBLE SPACE preservado). RED falha porque step e stub. GREEN porta logica.
- **fase-02 (copy-knowledge):** RED escreve teste com `runner` mockado que retorna `{stackPrimary: 'nodejs-typescript', copyResult: {status: 'ok', ...}}` → espera summary contendo `'nodejs-typescript'` e `'ok'`. RED falha. GREEN porta logica usando runner injetavel (mesma DI-2 do `03_1-persist-stack-and-knowledge.ts`).
- **fase-03 (final-validation):** RED escreve teste com docs/ tendo arquivo fora da allowlist → espera summary contendo `'X warnings'`. Outro teste: stack.json com `primary: 'rails'` + sem INDEX.md → espera AbortError code=1. RED falha. GREEN porta logica.
- **fase-04 (harness-validate):** RED roda harness em tmp sem `docs/CODE_STYLE.md` → espera exit !== 0 e mensagem `'Missing required file: docs/CODE_STYLE.md'`. GREEN adiciona 2 entries em REQUIRED_FILES.
- **fase-05 (e2e final):** RED roda e2e Node greenfield esperando 16 PLAN.md + AGENTS.md sem secao Delivery Loop (default N) + `.claude/CLAUDE.md` existe + zero warnings final-validation. Falha porque registry ainda tem stubs nas posicoes 8-10. GREEN: trocar 3 imports.

---

## Gotchas Conhecidos

- **G1 (D4 — sem dry-run em NENHUM dos 3 steps novos):** Os 3 steps reais (`08`, `09`, `10`) NAO importam `isDryRun` de `../dry-run-mode`. Confirmar via `grep -c "isDryRun\|dry-run-mode" skills/init/lib/steps/0{8,9}-*.ts skills/init/lib/steps/10-*.ts` retornando `0`. Diferenca direta dos steps antigos: `14-delivery-loop.ts:36-39` (dry-run early-return), `03_1-persist-stack-and-knowledge.ts:38-43` (dry-run guard), `90-final-validation.ts:117-119` (dry-run skip). Steps antigos NAO sao deletados aqui (Plano 01 fase-05 ja deletou) — sao apenas a referencia de porting.

- **G2 (CA-06 — delivery-loop pergunta ANTES de mutar):** Contrato `needsUser` do PRD D3/CH-01 garante isso semanticamente: a 1a invocacao retorna `{ mutated: false, needsUser: {...} }` sem tocar disco. O dispatcher pausa, chama `ctx.askUser`, popula `ctx.flags['__interactiveAnswer']`, re-invoca. A 2a invocacao SO ENTAO chama `injectOptionalSection`. **Teste explicito** em fase-01: rodar 1a vez, verificar que `AGENTS.md` esta inalterado (snapshot pre/pos), depois rodar 2a vez com 'y' e verificar injecao. Atestar CA-06 via assertion ordenada.

- **G3 (wording byte-identico do prompt — DOUBLE SPACE):** Prompt e `'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]'` — **DOIS espacos** antes de `[y/N]`. Linha 372 do `skills/init/SKILL.md` (antes da refatoracao v7). Validar via assertion literal — qualquer normalizacao de espaco quebra o contrato. O step antigo `14-delivery-loop.ts:21` ja documenta isso ("ATENCAO: DOUBLE SPACE antes de '[y/N]'").

- **G4 (RF-11 — copy-knowledge skip gracioso, NAO aborta):** Diferente de Step 7 (DR-2 = abort se stack=null), Step 9 SEGUE quando stack nao detectada. O `copyKnowledge` lib atual ja faz isso via status `'no-source'`/`'no-matrix'` + patch transactional em `run-stack-knowledge-init.ts:79-87` (seta `primary: null` em `.claude/stack.json` se copy falhar). Step 9 apenas propaga: summary inclui `'no-source'`/`'no-matrix'`, **sem throw**. Verificar via teste com fixture sem `package.json`/`Gemfile` → ctx.stack.primary=null → step retorna `mutated: false, summary: 'copy-knowledge: skipped (no stack)'` (ou similar — wording final na DI da fase-02).

- **G5 (D8.C — final-validation EXCECAO ao "nao aborta"):** Step 10 e modo WARNING em geral. EXCECAO: se `.claude/stack.json` tem `primary !== null` E `.claude/knowledge/INDEX.md` NAO existe → `AbortError code=1` (NAO 20 — code=20 e DR-2 Step 7). Mensagem literal: `"Stack detectada ({primary}) mas .claude/knowledge/INDEX.md ausente. Re-rode /anti-vibe-coding:init ou verifique a matrix no plugin."`. Esta excecao e PRESERVADA do `90-final-validation.ts` existente — fase-03 deve manter wording byte-identico (teste literal). Justificativa: Step 9 (copy-knowledge) deveria ter criado INDEX.md. Se nao criou apos detectar stack, ha bug upstream — bloquear init e correto.

- **G6 (orphan check secundario — warning nao-bloqueante):** Final-validation tambem checa `docs/knowledge/` orfao (path legacy pre-D1/MH-05 do PRD `knowledge-path-cutover`). Se existe, emite `console.warn` mencionando sunset v7.0.0. **NAO aborta**, apenas warn. fase-03 preserva esse check (logica D8.C completa).

- **G7 (RF-12 — `.claude/CLAUDE.md` em REQUIRED_FILES, NAO em `AGENTS.md` link):** `scripts/harness-validate.ts` tem 2 conjuntos distintos: `REQUIRED_FILES` (paths que devem existir como arquivo no disco — linhas 12-39) e `AGENTS_REQUIRED_LINKS` (strings que devem aparecer dentro do AGENTS.md — linhas 47-56). Para RF-12, **apenas REQUIRED_FILES** ganha 2 entries (`docs/CODE_STYLE.md` e `.claude/CLAUDE.md`). O `AGENTS_REQUIRED_LINKS` ja tem `[docs/MERGE_GATES.md]` e nao precisa do `.claude/CLAUDE.md` (mirror raiz e CLAUDE.md, nao `.claude/CLAUDE.md`).

- **G8 (CA-08 idempotencia — re-run bloqueado pelo gate, nao pelos steps):** PRD CA-08 diz "re-run idempotente". Plano 01 fase-03 ja criou `reentry-gate.ts` que aborta re-run completo via DR-1 (`.claude/legacy-manifest.json` existe). Steps 8-10 individualmente sao idempotentes (delivery-loop usa `injected/already-present`, copy-knowledge tem `refresh: false` default, final-validation e read-only), **mas isso so importa se o gate for desabilitado** (testes/`--force` futuro). E2E final da fase-05 valida: 1) re-run completo aborta com code do gate (delegado ao Plano 01); 2) Step 8 isoladamente, segunda invocacao com 'y', e idempotente (`already-present`, sem re-mutar).

- **G9 (DV-4 — manter opcionais `StepContext.legacy?`/`stack?`):** Decisao deste plano: **NAO endurecer**. Steps 8, 9, 10 nao precisam de `ctx.stack` (Step 9 detecta internamente via `runStackKnowledgeInit` que chama `detectMultiStack`; Step 10 le `.claude/stack.json` em disco). Step 8 nao usa `ctx.legacy`. Manter opcionais simplifica testes (mocks nao precisam preencher) e evita refactor em cascata. Se um plano FUTURO endurecer, sera mudanca explicita. **DI candidata pre-registrada** no MEMORY.

- **G10 (e2e final reuso de fixtures dos Planos 02-04):** Plano 02 ja criou `v7-with-legacy/`, Plano 03 ja criou `v7-with-claude-md-preexisting/` (provavelmente), Plano 04 ja criou `v7-populate-node/`, `v7-populate-rails/`, `v7-populate-no-stack/`. **Reusar via import do helper** `tests/e2e/__fixtures__/v7-populate-helpers.ts` (criado em Plano 04 fase-05). Nao duplicar fixtures. UNICA nova: `v7-with-claude-md-content/` para CA-02 byte-identico (Plano 03 fase-03 ja pode ter criado — verificar antes de criar; se sim, reusar).

- **G11 (CA-09 grep-gate — gate de regressao):** Verificar que `bun run grep-deleted-steps` retorna vazio. Comando: `grep -rE "scaffoldFullTreeStep|secretsScan2Old|linkClaudeAgentsStep|installGhFilesStep|generatePopulatePlansStep_OLD|persistStackKnowledgeStep|deliveryLoopStep_v6|...todos os ids removidos no Plano 01 fase-05" skills/init/lib/`. Se vazio, OK. Se algum retorno, sinal de regressao. Adicionar como script em `package.json`: `"grep-deleted-steps": "grep -rE '<padrao>' skills/init/lib/ && exit 1 || exit 0"`. fase-05 cria esse script. Lista exata dos ids deletados vem do AUDIT.md do Plano 01 fase-01.

- **G12 (e2e tempo < 30s — NFR performance):** PRD NFR linha "Init completo em <30s". E2E final mede via `performance.now()` antes/depois de `runInit([])`. Falha se > 30000ms. NAO confundir com o gate de Step 7 (< 2s, Plano 04 G11) — Step 7 e parte do init total. Em CI, e2e roda em ambiente limpo (sem `node_modules` warm cache) — pode ficar perto do limite. Se acontecer, raise para 45s e abrir issue de perf (NAO ajustar PRD).

- **G13 (libs orfas candidatas a delete — NAO deletar aqui):** Plano 01 fase-04 listou `snippet-resolver.ts` e `backup-anti-vibe.ts` como orfas candidatas. Plano 05 NAO toca nelas — fora do escopo. Documentar no MEMORY que continuam orfas pos-merge. Issue futura limpa.

- **G14 (Steps antigos `14-delivery-loop.ts`, `03_1-persist-stack-and-knowledge.ts`, `90-final-validation.ts` continuam no disco):** Plano 01 fase-05 NAO deletou esses 3 arquivos (foram a fonte do porting). Decisao deste plano: **deletar** apos fase-05 verde, em commit separado de cleanup. fase-05 inclui esse delete + verificar que nao quebra import. **Verificar via grep**: `grep -r "from.*14-delivery-loop\|from.*03_1-persist-stack-and-knowledge\|from.*90-final-validation" skills/init/lib/` retorna vazio (somente o registry.ts antigo referenciava — ja substituido na fase-05).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
