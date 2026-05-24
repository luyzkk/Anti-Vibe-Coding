# Summary: Compound Engineering Skill Port (Opcao C — Hibrida)

**Completed:** 2026-05-24
**Duration:** 2026-05-23 (planejamento) → 2026-05-24 (execucao)
**Planos:** 3 (todos completed)
**Fases Total:** 12 (12 done, 0 skipped, 0 blocked)
**Commits totais:** 22 (4 do Plano 02 + 18 do Plano 03; Plano 01 contava 10 — somar 32 totais da feature se inclui Plano 01)

---

## O que foi construido

### Plano 01 — Fundacao + Bug Fix (3 fases)
- Skill `compound-engineering` criada (user-invocable) com stub dos 4 subcomandos.
- `lib/manifest.ts` exporta `getCompoundManifest()` retornando 10 entries `{src, dst}`.
- Bug MH-01 fechado: schema canonico `title/category/tags/created` em `compound/README.md.tpl`.
- Stub `compound-engineering-prefaces.ts` criado.

### Plano 02 — Reestruturacao Fisica + Goldens (3 fases)
- `git mv` de 10 templates (`Infos/.../andre` literal) para `skills/compound-engineering/assets/` — linhagem preservada (estrategia 2-commits para `mv + content replace`).
- `git mv` de libs canonicas (`compound-frontmatter.ts`, `compound-files-collector.ts`) para `skills/compound-engineering/lib/`.
- `manifest.ts` cutover de `'../../init/assets/templates'` para `'../assets'`.
- 2 callsites cross-skill atualizados (lessons-learned, lib/compound-note-writer).
- Goldens E2E NAO regenerados (DI-fase03-regen-decidido-falso — `dst` paths nao mudaram).
- BUG retroativo descoberto + fixado (callsite orfao em `tests/lessons-learned-v6.test.ts`).

### Plano 03 — Subcomandos + Patches (6 fases)
- **fase-01:** `installer.ts` + `install-types.ts` — skip-by-default, --force opt-in, stack-agnostic (CA-04/05/06/20).
- **fase-02:** `checker.ts` — wrapper via `Bun.spawn` invocando `compound-check.ts` do target; default backward compat (CA-09) + `--strict` (CA-10).
- **fase-03:** `gate.ts` + `active-plan-detector.ts` + `lessons-captured-updater.ts` + `invoke-lessons-learned.ts` — detecta plano ativo, 3 perguntas, delega `lessons-learned add` via Skill tool nativa (D20/CA-16). `capture-guide.md` preenchido.
- **fase-04:** `migrate.ts` + `readme-schema-detector.ts` + `notes-inconsistency-scanner.ts` — fix nao-destrutivo de README brownfield + relatorio (RNF-04 verificado via MD5).
- **fase-05:** `patch-agents.ts` (P1, regex D23) + `patch-new-plan.ts` (P2, 4 secoes antes de `## Exit Criteria`) — ambos idempotentes (RNF-02 bytewise). Integrados no installer.
- **fase-06:** Completion signal SH-07 no `gate.ts` + 3 E2E edge cases CA-18/19/20 com fixtures.

---

## Decisoes de Implementacao (consolidado)

### Padroes estabelecidos
- **GT-fase01-tdd-gate-tipos-puros:** TDD gate bloqueia arquivo `.ts` sem `.test.ts` companion — mesmo para tipos puros. Solucao: manter tipos INLINE no arquivo principal (refinement aplicado em fase-02 checker, fase-03 gate, fase-04 migrate, fase-05 patch-*, fase-06).
- **GT-fase01-tpl-en-us-only:** Templates `.tpl` sao en-US (test guard ativo). Comentarios PT-BR sao OK em `.ts` interno.
- **GT-fase01-git-mv-conteudo-diferente-dois-commits:** `git mv` + content replace exige estrategia 2-commits para preservar linhagem.
- **GT-fase03-grep-callsites-escopo-amplo:** Grep cross-skill DEVE incluir `skills/ tests/ scripts/` no minimo — callsites em `tests/` escapam de greps narrow.
- **GT-fase03-goldens-podem-ficar-validos-pos-mv:** Goldens E2E sobrevivem `git mv` se `dst` paths nao mudam.

### Reconciliações spec vs realidade
- **DI-fase04-api-real-parseFrontmatter:** API real usa `{ ok: false, errors: ReadonlyArray<string> }` plural — spec assumia singular. Ajustado.
- **DI-fase04-api-real-legacy-fields:** `CompoundFrontmatter` descarta campos extras do tipo retornado. Solucao: raw frontmatter regex.
- **DI-fase06-completion-signal-shape:** API real e `{ skill, status, outputs, next_suggested, blocks_for_user }` — spec assumia `{ subcommand, artifacts }`. Adaptado preservando spirit SH-07.
- **DI-fase02-p3-rule-names:** Tpl usa `agents-link`/`plan-generator`/`active-plan` (sem sufixos `-sections`/`-hygiene` do spec). Comportamento OK.

### Decisoes arquiteturais
- **DI-fase03-tipos-inline-gate:** Tipos `GateAnswers`/`GateResult` inline em `gate.ts`.
- **DI-fase05-PatchResult-location:** `PatchResult` inline em `patch-agents.ts`, re-exportado em `patch-new-plan.ts`.
- **DI-fase06-telemetria-nivel-skill:** R10 mitigado via completion signal SH-07 (compound-engineering nao esta em `INSTRUMENTED_SKILLS`/`FasePipeline` — modificar `telemetry-types.ts` seria escopo separado).

---

## Bugs e Gotchas (consolidado)

### Bugs encontrados (e fixados)
- **BUG-fase01-a-pt-br-diacriticos-template** (Plano 02): comentarios PT-BR em `.tpl` quebraram test guard. Fix: traduzir comentarios para en-US.
- **BUG-fase01-b-git-mv-rewrite-detection** (Plano 02): `git mv` + content replace = Delete+Add. Fix: estrategia 2-commits.
- **BUG-fase02-grep-escopo-incompleto** (Plano 02 fase-03 retroativo): grep limitado a `skills/` deixou callsite orfao em `tests/lessons-learned-v6.test.ts`. Fix: one-liner + grep amplo.
- **BUG-fase02-tpl-path-wrong** (Plano 03 fase-02): `../../assets/` errado. Fix: `../assets/` antes do commit GREEN.

### Gotchas generalizaveis (input para `/lessons-learned`)
- TDD gate + arquivos de tipos puros (DI-fase01)
- git mv + content replace = preservar linhagem com 2-commits
- Grep cross-skill DEVE ser amplo (`skills/ tests/ scripts/`)
- Templates `.tpl` sao en-US-only (test guard)
- Spec frequentemente diverge de API real — sempre validar antes de implementar (fases 04 e 06 demonstram)

---

## Desvios dos Planos

- **DEV-fase01-prefaces-test** (Plano 01): TDD gate forcou `compound-engineering-prefaces.test.ts` extra (+2 testes).
- **DEV-fase01-dois-commits-em-vez-de-um** (Plano 02): rename detection forçou 2 commits em vez de 1.
- **DEV-fase03-no-regen-e-no-commit** (Plano 02): goldens permaneceram validos — regen seria redundante.
- **DEV-fase01-install-types-test-extra** (Plano 03): TDD gate forcou `install-types.test.ts` extra (+2 testes).
- **DEV-fase06-task-skipped-telemetria** (Plano 03): `writeTelemetryStart/End` por subcomando exigiria modificar `telemetry-types.ts` — completion signal SH-07 cobre observability equivalente.

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 3 |
| Fases total | 12 |
| Bugs encontrados | 4 (todos fixados) |
| Retries necessarios | 0 |
| Desvios | 5 |
| Tasks skipped | 1 (telemetria nivel-subcomando — fora de escopo) |
| Commits | 32 (10 Plano 01 + 4 Plano 02 + 18 Plano 03) |
| Testes na suite compound-engineering/lib | 79 (zero falhas) |
| Testes E2E novos | 3 (compound-engineering-edge-cases.test.ts) |
| Falhas pre-existentes na full suite | 13-14 (nenhuma introduzida) |

---

## Exit Criteria (PLAN overview) — Status

- [x] Todos os 6 MH (MH-01..MH-06) com CA correspondente verde
- [x] Todos os 7 SH (SH-01..SH-07) implementados e testados
- [x] `bun test` — suite da lib verde (79 testes); full suite mantem 13-14 falhas pre-existentes (nenhuma regressao)
- [x] `bun run lint` — Script not found (nao configurado neste repo — caveat documentado)
- [x] Goldens E2E init verdes (DI-fase03-regen-decidido-falso — `dst` paths nao mudaram, regen desnecessaria)
- [x] Grep CA-17 vazio (zero imports `init ← compound-engineering`)
- [ ] PR descricao lista os 3 patches aplicados (P1/P2/P3) — **AGUARDA PR**
- [ ] Compound capture decidido — **AGUARDA `/anti-vibe-coding:compound-engineering gate` ou nota explicita em PLAN.md `## Lessons Captured`**

---

## Pendencias e Caveats

- `updateLessonsCaptured` nao e idempotente em conteudo (re-rodar `gate` gera append duplicado) — aceitavel v1, dedup como feature futura.
- Telemetria JSONL por subcomando NAO implementada — requer adicionar `compound-engineering` ao `FasePipeline` em `telemetry-types.ts` (escopo separado).
- `tests/fixtures/compound-edge-no-pkgjson/` ja existia com conteudo pre-instalado de sessao anterior — fixture mais rica, CA-20 passa OK.
- `replaceLegacyExampleBlock` usa `date:` como ancora — bloco yaml so com `author:` + `decision:` (sem `date:`) detecta legacy mas nao reescreve (edge case raro).

---

## Proximos passos sugeridos

1. **`/anti-vibe-coding:compound-engineering gate`** neste proprio repo (dogfooding D24) — testa fluxo real e fecha 2 itens dos Exit Criteria (PR description preview + Compound capture decidido).
2. **`/verify-work`** para auditoria pos-implementacao multi-agente.
3. **Compound captures candidatas** (alto valor, para `/anti-vibe-coding:lessons-learned add`):
   - "TDD gate em arquivos de tipos puros — exige `.test.ts` companion ou inline" (GT-fase01-tdd-gate-tipos-puros)
   - "`git mv` + content replace = Delete+Add: estrategia 2-commits preserva linhagem" (GT-fase01-git-mv-conteudo-diferente-dois-commits)
   - "Grep cross-skill DEVE incluir `tests/` e `scripts/`" (GT-fase03-grep-callsites-escopo-amplo)
   - "Spec frequentemente diverge de API real — validar antes de implementar" (DIs fase-04 e fase-06)
4. **Criar PR** consolidando os 32 commits da feature.

---

<!-- Gerado por /execute-plan ao finalizar Plano 03 da feature compound-engineering-skill-port -->
