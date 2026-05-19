# Memoria: Plano 04 — Reentrada + Validator allowlist + Audit Step 12

**Feature:** init-llm-driven-harness-population
**Iniciado:** 2026-05-19
**Status:** concluido (5/5 fases)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano04-fase01-pluginVersion-runtime:** `AntiVibeManifest.pluginVersion` e typed como `string` (required) em `manifest-writer.ts`, mas manifests legados omitem o campo. O step usa `(manifest as Record<string, unknown>)['pluginVersion']` para inspecao safe em runtime (G2: campo ausente -> re-populate).
  - Por que: TS nao reporta o problema em compile-time porque o tipo afirma que existe.
  - Impacto: padrao recomendado para qualquer outro consumidor de manifest legado (fase-02, fase-05).

- **DI-Plano04-fase01-red-state:** Para RED real (assertion failure), criar stubs minimos do step antes de implementar GREEN. Sem stub, RED falha por "Cannot find module" (import error), nao por assertion.
  - Por que: TDD exige falha por assertion, nao por compilation.
  - Impacto: padrao para proximas fases. fase-02/03 ja recebem essa nota.

- **DI-Plano04-fase03-step90-rewrite:** Step 90 (`final-validation`) foi REESCRITO completamente nesta fase. `import { AbortError }` removido. Step ja retorna `{ mutated: false, summary }` em todos os branches (dry-run, 0 warnings, N warnings). 4 testes novos em `90-final-validation.test.ts`.
  - Por que: PRD MH-08 modo warning; CA-06 (179 falsos positivos -> warning groups <= 5).
  - Impacto: fase-04 acrescenta apenas try/catch defensivo + 2 testes extras + E2E. Pipeline E2E ja nao aborta por warnings — Step 91 PLAN.md persistido (CA-07).

- **DI-Plano04-fase02-fscp-subdir:** `fs.cp(src, dst, { recursive, filter })` em Node 18+/Bun REJEITA quando `dst` esta dentro de `src` com erro "cannot copy to a subdirectory of self". O check ocorre ANTES de o filter ser aplicado, entao excluir `_legacy` via filter NAO resolve. Solucao adotada: copiar `src` para tmpdir fora do cwd (filter exclui `_legacy` normalmente la), depois `fs.rename` para destino final dentro de `docs/_legacy/pre-6.5.0/` (com fallback `fs.cp + rm` cross-filesystem).
  - Por que: spec assumia que filter resolvia, mas implementacao real do Node nao permite — descoberto durante RED -> GREEN.
  - Impacto: padrao reusavel para qualquer outro step que precise backup INTERNO ao diretorio fonte. Documentar se Plano 05 fase-01 precisar logica similar.

- **DI-Plano04-fase05:** Remocao (CAMINHO A) de Step 12 (`detect-drift-incremental`) + lib `drift-detector`.
  - Output do grep de callers (skills/tests/scripts `*.ts`): 15 linhas totais, todas internas:
    - `skills/init/lib/discovery-store.ts:8` — union type `'drift-report'` (tipo, nao caller)
    - `skills/init/lib/drift-detector.test.ts:6` — self (test)
    - `skills/init/lib/drift-detector.ts:19` — self
    - `skills/init/lib/registry.ts:9,61` — import + array (unico caller externo real, removido)
    - `skills/init/lib/steps/12-detect-drift-incremental.test.ts:2,10,12,18,24,29` — self (test)
    - `skills/init/lib/steps/12-detect-drift-incremental.ts:4,17,36,40` — self
    - `skills/init/lib/init-subagent-ids.ts:18` — entrada `detectDrift` (string constant orfada, nao quebra)
    - `skills/init/lib/init-subagent-ids.test.ts:13,37` — asserting entry value (nao quebra, fora de escopo)
  - Output do grep de docs: todas referencias em `docs/exec-plans/` (planos historicos) e `docs/design-docs/init-rationale.md` — apenas documentacao, nenhum caller operacional.
  - Decisao: CAMINHO A (REMOCAO). Justificativa: zero callers externos; gate de reentrada destrutiva coberto por Step `00_2-reentry-guard` (fase-01 semver) + Step `00_3-backup-pre-6_5_0` (fase-02); detalhe de sha-by-file nao e mais acionavel pos-reescrita.
  - Arquivos deletados: `skills/init/lib/steps/12-detect-drift-incremental.ts`, `skills/init/lib/steps/12-detect-drift-incremental.test.ts`, `skills/init/lib/drift-detector.ts`, `skills/init/lib/drift-detector.test.ts`.
  - Arquivos modificados: `skills/init/lib/registry.ts` (import + array entry removidos), `skills/init/lib/registry.test.ts` (nova assertion `not.toContain('12-detect-drift-incremental')`), `skills/init/lib/discovery-store.ts` (union `'drift-report'` removida — sem caller pos-delete).
  - Nota: `init-subagent-ids.ts` entrada `detectDrift` ficou orfada (fora de escopo desta fase); candidata a limpeza em plano futuro.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Artefatos novos disponiveis (input para Plano 05):**
- `skills/init/lib/semver-compare.ts` — `compareSemver(a, b): -1 | 0 | 1` (numeric split, nao lexicografico).
- `skills/init/lib/steps/00_2-reentry-guard.ts` — `reentryGuardStep` ja registrado. Le `.claude/.anti-vibe-manifest.json` e seta `ctx.flags['__reentryMode']` em `'greenfield' | 're-populate'`. Aborta com codigo 0 quando manifest >= 6.5.0 (recomenda `/sync` / `/update`).
- `skills/init/lib/steps/00_3-backup-pre-6_5_0.ts` — `backupPre650Step` ja registrado. So copia quando `__reentryMode === 're-populate'`. Backup em `docs/_legacy/pre-6.5.0/<source-name>[-<ISO>]/`. Idempotente via suffix de timestamp.
- `skills/init/lib/validator-allowlist.ts` — exports: `buildAllowlistFromTemplateManifest()`, `isAllowed(relPath, allowlist)`, `groupWarnings(unallowed)`, `RUNTIME_GLOB_PREFIXES`. Use para qualquer validacao adicional pos-scaffold.
- `skills/init/lib/steps/90-final-validation.ts` — REESCRITO. Modo warning (nunca aborta), try/catch defensivo externo. Step 91 ja roda ANTES (CA-07 convergencia comprovada).

**Removido (verificar grep antes de assumir presenca):**
- Step 12 `detect-drift-incremental` + `drift-detector.ts/.test.ts` DELETADOS. Discovery union perdeu `'drift-report'` artifact.
- Plano 05 fase-04 ao regenerar golden `init-greenfield.stdout.txt`: NAO incluir linha `[12-detect-drift-incremental]`.

**Pendencias herdadas (candidatas a Plano 05 ou plano futuro):**
- `skills/init/lib/init-subagent-ids.ts:18` — entrada `detectDrift` ficou orfa apos remocao do Step 12. String constant, nao quebra build. Sugerido limpar junto da reescrita do init-subagent-ids ou em plano de housekeeping.
- `tests/e2e/greenfield-populate-plan.test.ts:65` (pre-existente, herdado de Plano 03) — regex `populateDirs` ainda espera formato ISO timestamp. Plano 05 fase-04 reescreve.

**Gotchas registrados (releitura obrigatoria para Plano 05):**
- `fs.cp(src, dst, { recursive, filter })` REJEITA quando `dst` esta dentro de `src` ANTES do filter ser avaliado. Padrao adotado: copiar para tmpdir externo (filter funciona la), depois `fs.rename` para destino interno (com fallback `fs.cp + rm` cross-filesystem). Ver DI-Plano04-fase02-fscp-subdir.
- TDD RED real exige stubs minimos do alvo antes de implementar GREEN, senao o teste falha por "Cannot find module" (compilation), nao por assertion. Ver DI-Plano04-fase01-red-state.
- `AntiVibeManifest.pluginVersion` typed como `string` (required) mas legacy manifests omitem. Para inspecao runtime safe: `(manifest as Record<string, unknown>)['pluginVersion']`. Ver DI-Plano04-fase01-pluginVersion-runtime.

---

<!-- Atualizado automaticamente durante execucao -->
