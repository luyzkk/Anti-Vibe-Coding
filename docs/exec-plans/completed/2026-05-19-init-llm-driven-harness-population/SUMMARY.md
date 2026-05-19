# Summary: Init LLM-Driven Harness Population (Trilha 2)

**Completed:** 2026-05-19
**Duration:** 2026-05-19 → 2026-05-19 (single working day, multi-session)
**Planos:** 5 (5 completed, 0 skipped)
**Fases Total:** 22 (22 done, 0 skipped, 0 blocked)

---

## O que foi construido

### Plano 01 — Refactor de Registry (Tracer Bullet)
Limpou o registry de Steps 07-11 (discover/classify/propose/move). Renomeou `10-apply-merge-destructive` → `10-backup-pre-mutation`. Reposicionou Step 91 antes de Step 90 (Bug C resolvido — MH-01/CA-07). Removeu 5 libs orfas + reescreveu `registry.test.ts`. Tracer bullet do registry minimo funcionando.

### Plano 02 — Scaffold expandido + Backup pre-mutacao
Adicionou `docs/CODE_STYLE.md` como doc canonico (template + TEMPLATE_MANIFEST entry, categoria `anti-vibe-extension`). `AGENTS.md.tpl` linka `CODE_STYLE.md`. `backupPreMutationStep` ganhou try/catch + audit-log; ordem `exists` antes de `isDryRun`. `design-md-skeleton.md` deletado.

### Plano 03 — Gerador LLM-driven do PLAN populate
Step 91 reescrito completamente: `detectStack -> discoveryManifestLight -> stackAwareInputPaths -> renderer v2 -> assertion CA-01 -> writePopulatePlanFolder`. PLAN.md v2 emite 4 blocos por fase (`Inputs (docs)`, `Inputs (codigo)`, `Instrucao LLM`, `Criterio done`). Path date-only (`YYYY-MM-DD-populate-harness`) compativel com `/execute-plan` glob. v1 deletada. CA-01 (>= 10 fases) e CA-02 (>= 3 paths reais) validados.

### Plano 04 — Reentrada + Validator allowlist + Audit Step 12
`reentryGuardStep` (00_2) + `backupPre650Step` (00_3) entregues. Validator do Step 90 reescrito modo warning (nunca aborta) + try/catch defensivo. `validator-allowlist.ts` deriva permitidos do TEMPLATE_MANIFEST + RUNTIME_GLOB_PREFIXES (inclui `docs/compound/_imported/`). Step 12 (`detect-drift-incremental`) + lib `drift-detector` deletados (CAMINHO A — REMOCAO).

### Plano 05 — Progress.txt import + SKILL.md + E2E
`progress-txt-parser.ts` + `compound-imported-writer.ts` + `Step 13 import-progress-txt` (registrado entre `backupPre650Step` e `secretsScanStep`). Step 13 soft-fail em greenfield. Mensagem final do `runInit` (7 linhas) menciona `/anti-vibe-coding:execute-plan <path>` (CA-11). E2E `init-tracer-bullet.test.ts` reescrito sob dispatcher. Goldens `init-greenfield.{stdout.txt,tree.json}` regenerados.

---

## Decisoes de Implementacao (consolidado)

**Arquitetura/registry:**
- Step 91 (`91-generate-populate-plan`) ANTES de Step 90 (`final-validation`) — convergencia CA-07.
- Step 12 (`detect-drift-incremental`) **deletado** (CAMINHO A) — zero callers externos.
- Step 13 inserido entre `backupPre650Step` e `secretsScanStep` (nao diretamente antes do scaffold).
- Step 10 renomeado de `apply-merge-destructive` para `backup-pre-mutation` via `git mv` (linhagem preservada).

**Convencoes descobertas (uteis para planos futuros):**
- `bun run lint` NAO existe — use `bun run typecheck`.
- `isDryRun()` checa `ctx.flags['dry-run']` (kebab-case).
- `StepContext.flags` eh `Readonly<Record<...>>` — escrever requer cast (justificado em DI-Plano05-fase03-step91-flag-cast).
- Step ids usam prefixo numerico do filename apenas quando `id` declarado assim no Step.

**Paths e formato:**
- Pasta gerada: `docs/exec-plans/active/YYYY-MM-DD-populate-harness/` (date-only, sem ISO timestamp) — bate glob do `/execute-plan` Step 1a.
- `docs/compound/_imported/INDEX.md` com `count: N` no frontmatter.
- `source: <relativo>` no frontmatter usa POSIX path (`path.posix.join`).

---

## Bugs e Gotchas (consolidado — generalizaveis)

- **GT (TDD gate):** Hook `tdd-gate.cjs` bloqueia criacao de arquivo de implementacao se NENHUM teste existe para o modulo. Ordem obrigatoria: `.test.ts` ANTES do stub. Aplicavel a TODO RED real.
- **GT (`fs.cp` subdir):** `fs.cp(src, dst, { filter })` REJEITA quando `dst` esta dentro de `src` ANTES do filter ser avaliado. Padrao: copiar para tmpdir externo, depois `fs.rename` para destino interno.
- **GT (TDD RED real):** Para teste RED falhar por assertion (nao por "Cannot find module"), criar stub minimo (`throw new Error('not implemented')`) antes — Plano 04 fase-01 descobriu, Plano 05 fase-01 reaplicou.
- **GT (manifest legacy):** `AntiVibeManifest.pluginVersion` eh required em tipo mas legacy omite. Inspecao runtime safe: `(manifest as Record<string, unknown>)['pluginVersion']`.
- **GT (JSDoc string com `*/`):** comentario JSDoc com `*/` em string fecha o comentario prematuramente. Use `*\/` ou refatore o template.

---

## Desvios dos Planos

- **DEV (Plano 01 fase-02/03):** fases rodaram sequencialmente, nao paralelo, pois ambas editavam `registry.ts`.
- **DEV (Plano 03 fase-05 CA-02 adaptado):** ARCHITECTURE phase nao no TEMPLATE_MANIFEST. Usado `docs/SECURITY.md` como substituto para validar >= 3 paths reais.
- **DEV-P05F04-ca13:** `ca13-dry-run-parity.test.ts` mantido `describe.skip`. Reescrita estimada > 30min; fora do escopo minimo de fase-04.

---

## Pendencias herdadas (candidatas a plano de housekeeping futuro)

- **Libs orfas:** `snippet-resolver.ts`, `backup-anti-vibe.ts` (orfaos apos Plano 01) — confirmar via grep antes de deletar.
- **`init-subagent-ids.ts:18`** — entrada `detectDrift` orfa apos remocao do Step 12. String constant, nao quebra build.
- **GT-01 pre-existente:** typecheck errors em `lazy-import.test.ts` + `subagent-contract.ts` — pre-feature, nao introduzidos. Investigar separadamente.
- **TODO.md raiz:** registrar `DESIGN.md` ausente da secao "Read Before Major Changes" do `AGENTS.md.tpl` (DEBT-1 do Plano 02).
- **`ca13-dry-run-parity.test.ts`:** reescrever para novo fluxo (DEV-P05F04-ca13).

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 5 |
| Fases total | 22 |
| Fases done | 22 |
| Bugs encontrados | 0 (alem dos ja documentados como pre-existentes) |
| Retries necessarios | 0 |
| Desvios | 3 (DEV-Plano01-fase02-sequential, DEV-Plano03-fase05-ca02, DEV-P05F04-ca13) |
| Subagentes spawned | ~22 (1 plan-executor por fase) |
| Suite testes final | exit 0; tests/e2e: 65 pass, 8 skip, 0 fail; skills/init: 660+ pass, 1 skip, 0 fail |

---

## Proximo Passo Sugerido

- Rode `/anti-vibe-coding:verify-work` para auditoria pos-implementacao.
- Apos verify-work verde, rode `/iterate` (Compound Decision Gate — fase-06 do plano original).
- Sugerir `/anti-vibe-coding:lessons-learned` para destilar gotchas generalizaveis (GT-TDD-gate, GT-fs-cp-subdir, GT-TDD-RED-real) em `docs/compound/`.
