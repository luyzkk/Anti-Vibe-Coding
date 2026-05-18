# Memoria: Plano 03 — Gates de abortagem + steps interativos

**Feature:** refactor-init-skill-rails
**Iniciado:** 2026-05-17
**Status:** completed (6/6 fases)
**Concluido:** 2026-05-17

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-P03F02-1 (fase-02):** `isMigrateMode` interno via `args[0] === 'migrate'` (Opcao B do plano).
  Por que: consistente com `reuseDiscoveryStep` (Plano 02 fase-06) e mantem o contrato `Step` minimo
  — sem campo `shouldRun` adicional. Impacto: todos os steps de migrate.* deste plano usaram
  o mesmo guard interno (decisao replicada em fases 03/04/05).
- **DI-P03F05-1 (fase-05) — DI-5-1 do plano:** migrate-all SOMENTE faz trabalho em `--dry-run`.
  Por que: SKILL.md linhas 57-79 lidas como "migrate.all + --dry-run roda orchestrateMigration
  + render report + sair (exit 0)". Em real mode, migrate.all eh NO-OP. Impacto: o step
  retorna `skipRemaining: true` em dry-run (pra interromper o loop) e `{ mutated: false, summary: '' }`
  em real. Steps migrate.1..4 sao os que efetivamente mutam disco em real mode. Plano 04 fase-04
  (E2E) deve confirmar este shape contra goldens fim-a-fim.
- **DI-P03F06-1 (fase-06):** Anti-loop guard no dispatcher para `needsUser`. Apos a primeira
  pausa e re-invoke do step, se o step retornar `needsUser` de novo, dispatcher LANCA Error
  generico (NAO AbortError — porque eh bug, nao gate de fluxo). Por que: evitar loop infinito
  se step tem bug e nunca aceita a resposta. Impacto: testes do dispatcher cobrem esse cenario.
- **DI-P03F06-2 (fase-06):** `askUser` injetado no ctx via guard condicional (nao via spread)
  para satisfazer `exactOptionalPropertyTypes: true` do tsconfig. Por que: spread com `undefined`
  em propriedade opcional eh rejeitado nessa flag. Impacto: nenhum runtime — apenas typecheck.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.

<!-- Preencher durante execucao -->

---

## Gotchas

Gotchas DESCOBERTOS durante implementacao (alem dos ja listados no README).
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-P03F01-1** (fase-01): `__golden__/` nao existia antes. Plano 01/02 usaram `__fixtures__/`
  para fixtures de entrada, mas nenhuma fase anterior precisou de goldens text-snapshot. Diretorio
  criado na fase-01. Convencao: goldens de stdout/log vivem em `skills/init/lib/__golden__/` e
  arquivos `*.txt` (1 cenario por arquivo).
- **GT-P03F01-2** (fase-01): `bun run typecheck` ja tem 3 erros pre-existentes nao relacionados
  a este plano (lazy-import.test.ts usa modulo bad por design como fixture; subagent-contract.ts
  tem AJV version mismatch). Nenhum erro novo introduzido. NAO sao regressoes — confirmar baseline
  antes de cada commit para nao confundir com erro genuino.
- **GT-P03F02-1** (fase-02): `backupPlanning` JOGA Error generica em lock present (linhas 51-55
  do helper) — NAO retorna status com `kind: 'error'`. Step deve try/catch e re-throw como
  AbortError. Reuso para migrate.2/3/4 — checar comportamento de cada helper de migrate.
- **GT-P03F02-2** (fase-02): `detectV5Legacy` exige `.planning/` com `entries.length > 0` para
  marcar legacy. Fixture com pasta vazia retorna false. Usar arquivo dummy `plan.md` nao-vazio
  para forcar deteccao.
- **GT-P03F05-1** (fase-05) — **IMPORTANTE para Plano 04 fase-04:** O step `migrate-all` em
  dry-run concatena `'\n\nRe-run without --dry-run to apply.'` ao summary, MAS `renderDryRunReport`
  ja inclui essa frase como ultima linha do report. Resultado: a frase aparece DUAS vezes no
  output total. Funcionalmente OK (testes endsWith ainda passam), mas pode ser drift do SKILL.md
  atual (que talvez emita so 1x). Plano 04 fase-04 (byte-idempotence) deve diff o stdout completo
  contra SKILL.md atual e decidir se o step deve REMOVER o concat duplicado.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-P03F03-1 (fase-03):** Fixture do plano sugeria conflict com `exec-plans/foo.md` (sem
  prefixo de data). Investigando o helper `parsePlanningEntry`, esse path eh classificado como
  `kind='unknown'` (primeiro segmento sem prefixo `YYYY-MM-DD`) e SKIPPED — nunca geraria conflict.
  Corrigido para `2026-05-12-foo/PLAN.md` que mapeia para `kind='plan-folder-plan'` → destino
  `docs/exec-plans/active/2026-05-12-foo-plan.md`. Por que: helpers sao preservados (G2),
  ajustar fixture eh a saida correta.
- **DEV-P03F04-1 (fase-04):** Fase descrevia fixtures em `.planning.v5-backup/.planning/lessons-learned.md`,
  mas o helper `migrateLessons` usa `path.join(targetDir, BACKUP_DIR, 'lessons-learned.md')`
  (sem `.planning/` no meio). Fixtures e paths nos testes ajustados para o caminho real do
  helper. Por que: G2 (helpers preservados), spec da fase escrita por suposicao.
- **DEV-P03F04-2 (fase-04) — IMPORTANTE para Plano 04:** SKILL.md atual linha 174 contem
  `s.reason.includes('source-missing')`, mas o helper `migrateLessons` retorna
  `reason: 'no lessons-learned.md in backup'` quando o source esta ausente — NAO contem a
  substring `'source-missing'`. O step usa `report.status === 'skipped'` como predicado
  funcionalmente equivalente (mais robusto, nao depende do wording do reason). **Consequencia
  para Plano 04 fase-03 (cutover):** o trecho do SKILL.md que checa `reason.includes('source-missing')`
  esta morto/quebrado no codigo atual — provavelmente never matched. Plano 04 deve OU
  (a) alinhar SKILL.md com o predicado real (`status === 'skipped'`), OU (b) ajustar o helper
  para retornar reason com `'source-missing'`. Opcao (a) recomendada (helpers preservados).
  Atualmente o STEP eh consistente com o helper, nao com o SKILL.md — isso e uma divergencia
  de comportamento RESOLVIDA pelo step.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 2 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Para Plano 04 (cutover + rationale):**

- **Contrato `StepReport` estendido (fase-06):**
  - `mutated: boolean`
  - `summary: string`
  - `skipRemaining?: boolean` (Plano 02 fase-06)
  - `needsUser?: { prompt: string; options: readonly string[] }` (Plano 03 fase-06)
  - Dispatcher prioriza `needsUser` (pausa o loop, pergunta via `ctx.askUser`, re-invoca
    o step com a resposta no `ctx.flags['__deliveryLoopAnswer']`), depois `skipRemaining`.
- **Contrato `StepContext` estendido (fase-06):**
  - `askUser?: (prompt: string, options: readonly string[]) => Promise<string>` (injetado
    pelo dispatcher; em testes recebe stub). Steps que nao precisam ignoram. Steps interativos
    NAO chamam `askUser` diretamente — eles RETORNAM `needsUser` no report.
- **Mapeamento AbortError code → wording (fase-01/02/03):**
  - `code: 1`, reason multi-linha contendo `'Detected v5.x artifacts: ...'` + `'Run `/init migrate` ...'`
    — origem Step 0.5 (SKILL.md linha 31-32). Tracer ja portou em Plano 01 fase-03.
  - `code: 1`, reason de migrate.2 conflict — 5 linhas: `'Migration: <status>'`, `'  entries: N'`,
    `'  written: N'`, `'  skipped: N'`, `'  CONFLICTS: ...'`, `'  Resolve manually ...'`. Origem
    SKILL.md linhas 143-150.
  - `code: 2`, reason `'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?'`
    + `'Run `/init migrate --resume` or remove residuals manually.'` — origem Step 0.5 (SKILL.md
    linha 27-28). Ja portado em Plano 01 fase-03 (tracer).
  - `code: N` generico — backup lock thrown por `backupPlanning` (mensagem da Error original
    preservada — `'Backup lock present at ... — another /init may be running.'`). Origem
    `skills/init/lib/backup-planning.ts` linhas 51-55.
  - `code: N` propagado — `harness-validate.ts` exit code != 0 — Plano 02 fase-06 ja portou
    em `90-final-validation.ts`.
- **Step 7 soft-fail (fase-06b) eh invariante (G7 do plano):** Plano 04 fase-04 (E2E
  byte-idempotence) DEVE incluir uma fixture onde `discoverCapabilities` joga (ex: profile
  invalido, FS read-only) e validar que o /init AINDA termina com exit 0 + a linha
  `'[capabilities-discovery] step failed, skipping: ...'` aparece no stdout. Sem esse teste,
  G7 nao esta provado fim-a-fim. Recomendacao: criar fixture
  `__fixtures__/capabilities-discovery-throws/.anti-vibe-manifest.json` com profile que faz
  o helper falhar (ou mockar `discoverCapabilities` para joga). Manter byte-identicality
  com SKILL.md linha 458 (`'[capabilities-discovery] step failed, skipping: '` + `err.message`).
- **Ordem final do registry apos Plano 03 (G4 do plano):** 17 entradas. Plano 04 fase-03
  (rewrite SKILL.md) deve refletir essa ordem na tabela de manifest. Ver G4 do README.md
  deste plano para a lista completa.
- **Patch do dispatcher (`run-init.ts`) acumulou 3 mudancas:** (1) Plano 01 fase-02 — catch
  AbortError; (2) Plano 02 fase-06 — checagem de `skipRemaining`; (3) Plano 03 fase-06 —
  loop de `needsUser` (pause+ask+resume). Plano 04 fase-04 valida que o dispatcher final
  passa em TODOS os goldens (Plano 01/02/03).

- **2026-05-17 — cutover concluido pelo Plano 04:** os steps deste plano agora executam pelo dispatcher `skills/init/lib/run-init.ts`. `SKILL.md` reescrito como manifest (86 linhas). Rationale extraido para `docs/design-docs/init-rationale.md`. Snippets Akita em `skills/init/assets/snippets/akita-*.md`. E2E goldens em `tests/e2e/__golden__/init-{greenfield,legacy-v5}.{stdout.txt,tree.json}`.

---

<!-- Atualizado automaticamente durante execucao -->
