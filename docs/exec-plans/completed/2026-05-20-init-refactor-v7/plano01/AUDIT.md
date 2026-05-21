# AUDIT — Coverage dos 18 Steps a Deletar (Plano 01 fase-01)

**Plano:** 01 — Foundation + Tracer + Cleanup
**Fase de origem:** fase-01-coverage-audit.md
**Decisao raiz:** DR-4 do PLAN.md (auditoria de cobertura ANTES do delete em fase-05)
**Risco mitigado:** R4 (testes reescritos perdem cobertura de behaviors validos)
**Status:** COMPLETO (preenchido em fase-01, 2026-05-21)

---

## Como ler esta tabela

Cada linha representa um step que sera deletado em fase-05. As colunas documentam:

- **Step:** id atual do step + path do arquivo
- **Test file:** path do teste unitario do step (se existir)
- **Behaviors validos:** assertions do teste que descrevem comportamento que CONTINUA valido
  no init v7 e portanto precisa ser recriado em algum lugar
- **Onde recriar:** plano + fase onde a cobertura sera reestabelecida (ou "obsoleto — D3/D4/D5" se
  o behavior foi removido por decisao explicita de escopo)

Behaviors classificados como "obsoleto" NAO precisam de novo teste — sao parte do que estamos
deletando intencionalmente (cache reuse, dry-run, capabilities discovery, backup, etc).

---

## Tabela de Coverage

| # | Step | Test file | Behaviors validos | Onde recriar |
|---|------|-----------|-------------------|--------------|
| 1 | `00-detect-legacy` | `00-detect-legacy.test.ts` | - "greenfield: returns summary, no abort" → **obsoleto**: v7 Step 2 nao detecta legacy separado; deteccao integrada em `02-detect-legacy-and-stack` que NAO aborta — o comportamento de abort do step atual nao existe mais<br>- "legacy: throws AbortError code 1" → **obsoleto** (D3 — abort-on-legacy removido; v7 Step 2 mapeia e continua)<br>- "partial migration: throws AbortError code 2" → **obsoleto** (D3 — abort-on-partial removido)<br>- "v6.x manifest present without v5 artifacts: returns cross-upgrade summary" → **obsoleto** (D3 — cross-upgrade logic removida; v7 usa legacy-manifest.json para sinalizar re-entrada via Step 1)<br>- "claude-legacy (.claude/ only, no root v5 files): aborts with code 1" → **obsoleto** (D3 — abort removido) | obsoleto — D3 (abort-on-legacy removido; deteccao integrada no novo Step 2 sem abort) |
| 2 | `00_1-reuse-discovery` | `00_1-reuse-discovery.test.ts` | - "no flag: returns empty no-op" → **obsoleto** (D3 — cache/reuse removido)<br>- "--reuse-discovery with no cache: emits stale message and falls through" → **obsoleto** (D3)<br>- "--refresh is alias of --reuse-discovery" → **obsoleto** (D3 — flag --refresh nao existe em v7)<br>- "--reuse-discovery with FRESH cache: sets skipRemaining true" → **obsoleto** (D3 — skipRemaining via cache removido) | obsoleto — D3 (cache reuse inteiro removido) |
| 3 | `00_2-reentry-guard` | `00_2-reentry-guard.test.ts` | - "sets greenfield when manifest absent" → **valido** (comportamento base do gate: sem manifest = greenfield = deixa passar)<br>- "aborts when manifest pluginVersion >= 6.6.0" → **parcialmente valido**: mecanismo muda (v7 detecta `legacy-manifest.json`, nao `.anti-vibe-manifest.json`), mas behavior "abortar quando ja inicializado" e valido<br>- "signals re-populate when manifest pluginVersion < 6.6.0" → **obsoleto** (D3 — modo re-populate removido; v7 simplesmente aborta com AbortError code=10 em qualquer re-entrada)<br>- "signals re-populate when pluginVersion field is absent in manifest" → **obsoleto** (D3 — mesmo motivo)<br>- "CA-09: two greenfield runs — second aborts as v6.6.0+ reentry" → **valido** como cenario: "segundo run aborta" e o comportamento esperado em v7 (DR-1) | recriado em Plano 01 fase-03 como `01-reentry-gate.ts`. Behaviors validos portados: (a) "manifest ausente → pass silencioso / greenfield"; (b) "legacy-manifest.json existente → AbortError code=10 com mensagem instrutiva apontando /init:refresh". Mecanismo muda: v7 detecta `.claude/legacy-manifest.json`, nao `.anti-vibe-manifest.json`. |
| 4 | `00_3-backup-pre-6_5_0` | `00_3-backup-pre-6_5_0.test.ts` | - "skips when reentry mode is greenfield" → **obsoleto** (D3 — backup phase removida)<br>- "copies docs/ to docs/_legacy/pre-6.5.0/ when reentry mode is re-populate" → **obsoleto** (D3)<br>- "suffixes destination with timestamp when previous backup exists" → **obsoleto** (D3)<br>- "dry-run lists paths without writing" → **obsoleto** (D3 + D4)<br>- "does not recurse into its own destination" → **obsoleto** (D3) | obsoleto — D3 (backup phase inteira removida) |
| 5 | `06-secrets-scan` | `06-secrets-scan.test.ts` | - "id contratual estavel" → **valido** (novo id sera `secrets-scan` ou similar — contrato de ID estavel e comportamento de qualidade)<br>- "scan vazio (sem .md/.mdx) retorna scannedCount=0 sem blocked" → **valido** (comportamento core do scanner)<br>- "match em arquivo X eh registrado em blockedFiles; outros arquivos limpos passam" → **valido** (deteccao de segredos com Stripe pattern)<br>- "blacklist node_modules eh ignorada" → **valido** (ignorar node_modules e comportamento correto)<br>- "registry: secretsScanStep apos reuseDiscoveryStep, antes de migrate0ParseDryRunStep" → **obsoleto** (posicao no registry muda completamente em v7 — novo registry ordena diferente)<br>- "flag --dry-run leva noWrite (arquivo nao eh criado)" → **obsoleto** (D4 — dry-run removido) | DV-1: logica portada para novo `03-secrets-scan.ts`. Plano 02 implementa a logica real. Behaviors validos (scan vazio, match registrado, node_modules ignorada, sem throw) devem ser portados para `03-secrets-scan.test.ts` no Plano 02. |
| 6 | `09-migrate-0-parse-dry-run` | `09-migrate-0-parse-dry-run.test.ts` | - "no migrate mode: no-op" → **obsoleto** (D4 — step inteiro eh sobre dry-run; sem migrate mode step nao existe em v7)<br>- "migrate mode without --dry-run: no-op silencioso" → **obsoleto** (D4)<br>- "migrate mode with --dry-run: emite log byte-identico" → **obsoleto** (D4 — dry-run removido) | obsoleto — D4 (dry-run inteiro removido) |
| 7 | `09_1-migrate-all-orchestrate` | `09_1-migrate-all-orchestrate.test.ts` | - "no migrate mode: no-op" → **obsoleto** (v7 nao tem "migrate mode" via args[0])<br>- "migrate mode without --dry-run: NO-OP (DI-5-1 desta fase)" → **obsoleto**<br>- "migrate mode + --dry-run: skipRemaining=true, summary contem report + Re-run..." → **obsoleto** (D4 — dry-run removido)<br>- "migrate mode + --dry-run em greenfield (sem .planning/): orchestrator nao quebra" → **obsoleto** (D4) | obsoleto — D3/D4 (step era orchestrator do migrate mode com dry-run; ambos removidos. Step 2 v7 eh unico e nao usa migrate mode) |
| 8 | `10-backup-pre-mutation` | `10-backup-pre-mutation.test.ts` | - "copies CLAUDE.md to docs/_legacy/CLAUDE.md.bak when CLAUDE.md exists" → **obsoleto** (D3 — backup de CLAUDE.md removido; v7 PRESERVA CLAUDE.md mas nao faz backup)<br>- "skips silently when CLAUDE.md is absent (greenfield)" → **obsoleto** (D3)<br>- "respects --dry-run (no copy)" → **obsoleto** (D3 + D4) | obsoleto — D3 (backup pre-mutation removido) |
| 9 | `10-migrate-1-backup` | `10-migrate-1-backup.test.ts` | - "no-args (no migrate mode): no-op silencioso, mutated=false" → **obsoleto** (v7 nao tem migrate mode via args[0])<br>- "migrate mode + legacy v5: cria backup, summary byte-identico" → **obsoleto** (D3 — backup `.planning.v5-backup` removido; v7 Step 2 move diretamente sem backup)<br>- "migrate mode + backup ja existe: idempotente, summary byte-identico" → **obsoleto** (D3)<br>- "migrate mode + lock orfao: lanca AbortError com code=1" → **obsoleto** (D3 — lock mechanism removido junto com backup)<br>- "migrate mode + --dry-run: status dry-run, mutated=false, summary vazio" → **obsoleto** (D3 + D4) | obsoleto — D3 (backup de .planning antes de migrar removido; v7 Step 2 move diretamente) |
| 10 | `11-migrate-2-planning` | `11-migrate-2-planning.test.ts` | - "no migrate mode: no-op" → **parcialmente valido**: v7 Step 2 tambem e no-op quando `.claude/planning/` ausente, mas criterio e diferente (ausencia do diretorio, nao ausencia de "migrate" em args)<br>- "migrate mode, no conflicts: 4 linhas de summary, mutated true" → **valido** (comportamento core: mover `.claude/planning/` → `docs/specs/` com summary de resultado)<br>- "migrate mode, conflicts presentes: lanca AbortError com reason de 6 linhas" → **valido** (conflito de destino deve abortar com mensagem clara — DR-1 analogia)<br>- "migrate mode, --dry-run: status dry-run, mutated false" → **obsoleto** (D4 — dry-run removido) | Plano 02 (Step 2 faz o move `.claude/planning/` → `docs/specs/`). Behaviors validos: (a) "sem planning/ → no-op"; (b) "planning/ presente → move com summary de entries/written/skipped"; (c) "conflito de destino → AbortError com mensagem clara". Mecanismo muda: nao usa mais `.planning.v5-backup/`, move diretamente. |
| 11 | `12-migrate-3-lessons` | `12-migrate-3-lessons.test.ts` | - "no migrate mode: no-op" → **obsoleto** (v7 nao tem migrate mode via args[0])<br>- "migrate mode, source missing: 2 linhas, segunda eh 'nothing to migrate'" → **obsoleto** (D8 — lessons migration delegada ao execute-plan via manifest; init apenas registra o path no manifest)<br>- "migrate mode, source present: 1 linha, wrote >= 1" → **obsoleto** (D8 — init nao migra lessons mais; execute-plan le manifest e faz o trabalho) | obsoleto — D8 (lessons migration delegada ao execute-plan via manifest. Init apenas registra `type: "lessons"` em `.claude/legacy-manifest.json`; sem escrita em docs/compound/) |
| 12 | `13-import-progress-txt` | `13-import-progress-txt.test.ts` | - "soft-fails when .claude/progress.txt is absent (greenfield)" → **valido** (behavior de graceful degradation quando progress.txt ausente — Step 2 v7 tambem deve ser no-op neste caso)<br>- "imports N entries when progress.txt exists" → **parcialmente valido**: v7 NAO importa entries para docs/compound/ diretamente — apenas registra no manifest como `type: "compound"`. O test atual escreve arquivos em disco. O behavior *valido* e: "detectar presenca de progress.txt e registrar no manifest"<br>- "parses 0 entries from non-empty file -> no mutation, summary marks empty parse" → **obsoleto** (v7 nao parseia entries do progress.txt — apenas registra o path no manifest) | Plano 02 (Step 2 registra `.claude/progress.txt` como entry `type: compound` em legacy-manifest.json). Behavior valido restante: "detectar presenca do arquivo e registrar no manifest" — nao ha teste especifico para isso atualmente, seria nova cobertura no Plano 02. |
| 13 | `13-migrate-4-decisions` | `13-migrate-4-decisions.test.ts` | - "no migrate mode: no-op" → **obsoleto** (v7 nao tem migrate mode via args[0])<br>- "migrate mode, decisions sem senior-principles: 1 linha" → **obsoleto** (D8 — decisions migration delegada ao execute-plan via manifest)<br>- "migrate mode, decisions + senior-principles: 2 linhas (core-beliefs created)" → **obsoleto** (D8 — core-beliefs nao e criado pelo init em v7; execute-plan cuida disso via manifest) | obsoleto — D8 (decisions migration delegada ao execute-plan via manifest. Init apenas registra `type: "decisions"` em `.claude/legacy-manifest.json`; sem escrita em disco pelo init) |
| 14 | `13_1-migrate-knowledge-path` | `13_1-migrate-knowledge-path.test.ts` | - "moves docs/knowledge/legacy-claude-knowledge to docs/_legacy/knowledge in re-populate mode" → **obsoleto** (D3 — re-populate mode removido; v7 nao tem esse modo de operacao)<br>- "aborts with AbortError when destination docs/_legacy/knowledge already exists" → **obsoleto** (D3 — step inteiro removido com re-populate mode)<br>- "is a no-op when NOT in re-populate mode" → **obsoleto** (D3)<br>- "is a no-op when docs/knowledge/legacy-claude-knowledge does not exist" → **obsoleto** (D3) | obsoleto — D3 (re-populate mode removido; knowledge path migration nao existe em v7. Step 2 registra `.claude/knowledge/` como entry no manifest se existir; execute-plan trata) |
| 15 | `03-detect-stack-and-register` | `03-detect-stack-and-register.test.ts` | - "nextjs: summary mentions nextjs id and signalSource" → **valido** (deteccao de stack e comportamento core do novo Step 2 — stack nextjs deve ser detectada corretamente)<br>- "node-ts: summary mentions node-ts" → **valido** (idem para Node.js/TypeScript)<br>- "unknown: summary mentions unknown id" → **valido** (graceful degradation quando stack desconhecida — Step 2 preenche `ctx.stack` mesmo sem primary)<br>- (comportamento implicito) "STATE.md written to disk" — **obsoleto**: linha 2 do summary "STATE.md created/updated" nao existe em v7 (STATE.md vira plano individual no Plano 04, D11) | Plano 01 fase-02 como `02-detect-legacy-and-stack.ts`. Behaviors validos: (a) "detecta stack nextjs via package.json"; (b) "detecta stack node-ts via package.json"; (c) "unknown quando sem signal — ctx.stack.primary = null". Sem STATE.md escrito — apenas `ctx.stack` populado. |
| 16 | `03_1-persist-stack-and-knowledge` | `03_1-persist-stack-and-knowledge.test.ts` | - "passes joined args to runner" → **valido** (mecanismo de injecao de dependencia StackKnowledgeRunner e pattern reutilizavel em Step 9)<br>- "summary is empty (orchestrator emits its own logs)" → **valido** (pattern correto — step nao gera proprio log quando orchestrator cuida)<br>- "dry-run guard: skips orchestrator and reports mutated=false" → **obsoleto** (D4 — dry-run removido)<br>- "passes refresh=true to runner when __reentryMode is re-populate" → **obsoleto** (D3 — re-populate mode removido)<br>- "passes refresh=false to runner when __reentryMode is NOT re-populate (greenfield)" → **obsoleto** (D3 — __reentryMode removido)<br>- "passes refresh=false when __reentryMode is greenfield (explicit)" → **obsoleto** (D3) | Plano 05 (Step 9 `copy-knowledge`). Behaviors validos portados: (a) "copy-knowledge runner recebe cwd e args corretos"; (b) "summary vazia quando orchestrator emite seus proprios logs, mutated=true". Sem refresh/dry-run logic. |
| 17 | `04-customize-architecture` | `04-customize-architecture.test.ts` | - "nextjs fixture: summary byte-identical to SKILL.md line 349 with written=true" → **parcialmente valido**: o *conceito* de customizacao stack-aware de ARCHITECTURE.md e valido, mas o mecanismo muda completamente (v7 gera um PLAN.md individual para ARCHITECTURE.md via Step 5 — D11 — em vez de editar inline o arquivo)<br>- "without ARCHITECTURE.md: step propagates throw from helper" → **obsoleto**: em v7 o step nao lê ARCHITECTURE.md — cria um populate-plan para ele | Plano 04 (Step 5 gera o populate-plan para ARCHITECTURE.md incluindo instrucoes stack-aware nas Waves — D11). Behavior valido abstraido: "quando stack eh nextjs/node-ts, instrucoes do plano individual de ARCHITECTURE.md devem referenciar paths correspondentes". Nao ha teste direto para isso atualmente — e covered pelo CA-04 do PRD (Rails → app/views) verificado em CA da suite e2e do Plano 05. |
| 18 | `15-capabilities-discovery` | `15-capabilities-discovery.test.ts` | - "no profile: log de skip ou soft-fail, mutated=false, NAO lanca" → **obsoleto** (D5 — capabilities removido)<br>- "helper throws: soft-fail logged, mutated=false, NAO lanca exception" → **obsoleto** (D5)<br>- "profile + write OK (smoke): audit gravado se profile disponivel" → **obsoleto** (D5) | obsoleto — D5 (capabilities discovery inteiro removido) |

> **Nota:** A lista tem 18 entradas (17 preliminares + `00-detect-legacy` adicionado nesta fase-01 conforme instrucao).
> Total esperado de deletes em fase-05: 18 steps + seus arquivos `.test.ts` correspondentes.

---

## Convencoes de "Onde recriar"

- **Plano NN fase-MM:** behavior sera reimplementado naquela fase, novo teste cobre.
- **obsoleto — D{N}:** removido por decisao explicita do CONTEXT/PRD. NAO precisa novo teste.
- **delegado ao execute-plan:** behavior nao roda mais no init — manifest carrega o dado e o LLM
  faz o trabalho via plano populate. NAO precisa teste unitario no init.
- **NOVA cobertura recomendada:** behavior valido sem destino claro nos planos atuais —
  alertar dev na fase-01 e ajustar Plano 02-05.

---

## Resumo de Contagem (fase-01)

| Classificacao | Contagem |
|---------------|----------|
| Behaviors **validos** com destino mapeado | 14 |
| Behaviors **obsoletos** (D3/D4/D5/D8) | 38 |
| Behaviors **parcialmente validos** (mecanismo muda, conceito preservado) | 7 |
| Steps com todos os behaviors obsoletos | 9 |
| Steps com pelo menos 1 behavior valido ou parcial | 9 |

**Steps 100% obsoletos:** `00_1-reuse-discovery`, `00_3-backup-pre-6_5_0`, `09-migrate-0-parse-dry-run`, `09_1-migrate-all-orchestrate`, `10-backup-pre-mutation`, `10-migrate-1-backup`, `12-migrate-3-lessons`, `13-migrate-4-decisions`, `13_1-migrate-knowledge-path`, `15-capabilities-discovery`

**Steps com behaviors a portar (validos ou parciais):**
- `00-detect-legacy` → obsoleto (D3), mas deteccao integrada no novo Step 2
- `00_2-reentry-guard` → 2 behaviors validos → Plano 01 fase-03
- `06-secrets-scan` → 3 behaviors validos → Plano 02 (DV-1)
- `11-migrate-2-planning` → 2 behaviors validos → Plano 02 Step 2
- `13-import-progress-txt` → 1 behavior parcial → Plano 02 (manifest entry, nao import direto)
- `03-detect-stack-and-register` → 3 behaviors validos → Plano 01 fase-02
- `03_1-persist-stack-and-knowledge` → 2 behaviors validos → Plano 05 Step 9
- `04-customize-architecture` → 1 behavior conceitual → Plano 04 Step 5 (CA-04 e2e)

---

## Gaps e Observacoes

### GAP-01: `13-import-progress-txt` — sem teste para o novo comportamento

**Behavior atual:** parseia e importa entries diretamente para `docs/compound/_imported/`
**Behavior v7:** detecta presenca do arquivo e registra como entry `type: compound` no manifest
**Observacao:** NAO existe teste para este novo comportamento no AUDIT atual. Plano 02 precisa criar cobertura para "detectar `.claude/progress.txt` e incluir entrada `type: compound` no manifest".
**Severidade:** baixa (comportamento novo, nao perda de cobertura existente)

### GAP-02: `04-customize-architecture` — cobertura stack-aware apenas em e2e

**Behavior v7:** PLAN.md individual para ARCHITECTURE.md contem paths stack-aware (CA-04: Rails → `app/views`)
**Observacao:** Nao ha teste unitario para esse comportamento em nenhum plano listado. Apenas CA-04 do PRD cobre isso como criterio de aceite do Plano 05 e2e.
**Severidade:** baixa (coberto por CA-04 no final do projeto)

### OBSERVACAO: `00-detect-legacy` comportamento de abort

O step atual aborta quando detecta legacy. Em v7, Step 2 (`02-detect-legacy-and-stack`) NAO aborta — apenas popula `ctx.legacy`. O comportamento de "abortar em projeto ja migrado" ficou para o Step 1 (reentry-gate via `legacy-manifest.json`). Sem perda de cobertura — mecanismo muda, comportamento preservado via outro step.

---

## Procedimento da fase-01

1. Para cada step da tabela, abrir o `.test.ts` correspondente. ✓
2. Listar cada `test(...)` ou `it(...)` block. ✓
3. Para cada assertion: decidir entre `valido` ou `obsoleto`. ✓
4. Se `valido`: encontrar (ou recomendar) onde recriar nos Planos 02-05. ✓
5. Preencher a celula "Behaviors validos" com `assertion → status` (1 linha por assertion). ✓
6. Preencher "Onde recriar" com referencia precisa (Plano + fase). ✓
7. Se algum `valido` ficar sem destino: PARAR a fase-01, comunicar ao dev humano, propor ajuste. ✓ (nenhum gap critico encontrado — GAP-01 e GAP-02 sao gaps de cobertura nova, nao perda)

---

## Criterio de saida da fase-01

- [x] Todas as 18 linhas tem `Behaviors validos` preenchido (zero placeholders restantes)
- [x] Todas as linhas tem `Onde recriar` preenchido
- [x] Zero behaviors `valido` sem destino atribuido
- [x] Commit de AUDIT.md preenchido feito antes de iniciar fase-02

---

<!-- Preenchido durante fase-01-coverage-audit em 2026-05-21 -->
