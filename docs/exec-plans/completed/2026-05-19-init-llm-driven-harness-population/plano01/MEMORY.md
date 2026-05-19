# Memoria: Plano 01 — Refactor de Registry (Tracer Bullet)

**Feature:** init-llm-driven-harness-population
**Iniciado:** 2026-05-19
**Status:** completed (2026-05-19)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-01 (fase-01):** Rename staged pre-existente (`docs/exec-plans/active/2026-05-18-init-detect-claude-and-pt-br.md` → `completed/`) foi DESTAGUEADO antes do commit da fase para manter atomicidade. Impacto: o rename permanece como mudanca pendente no working tree e deve entrar em commit separado quando o dev quiser.
- **DI-02 (fase-01):** `bun run lint` nao existe em `package.json`. Substituido pelo `bun run typecheck` como gate de qualidade do plano. Para fases futuras, criterios de aceite que mencionam `lint` devem ser interpretados como "nao aplicavel" salvo se o script for adicionado.
- **DI-Plano01-fase02-lib-discover:** Lib `discover-existing-docs.ts` (raiz, NAO em steps/) mantida em fase-02 porque `blocks-classifier.ts` importava `DiscoveredDoc` dela. Fase-03 deletou ambos juntos.
- **DI-Plano01-fase02-DiscoveredDocWithFlags:** O tipo `DiscoveredDocWithFlags` era exportado pelo Step 07 (nao pela lib). Apos delete em fase-02, gerou erros TS esperados em Step 08 (deletado na fase-03).
- **DI-Plano01-fase03-libs-deletadas:** Libs deletadas apos auditoria de orfandade (0 callers externos confirmado via grep): `blocks-classifier.{ts,test.ts}`, `doc-mover-stub.{ts,test.ts}`, `merge-proposal-types.{ts,test.ts}`, `preview-renderer.{ts,test.ts}`, `discover-existing-docs.{ts,test.ts}`. Libs PRESERVADAS: `discovery-store.ts` (Step 06 secrets-scan + Step 12 detect-drift usam via `writeDiscoveryArtifact`/`readDiscoveryArtifact`).
- **DI-Plano01-fase03-test-skips:** test.skip em `02-link-claude-agents.test.ts` linha 33 (teste lia Step 11 por path direto). Provenance aponta Plano 05 fase-04 para limpeza.
- **DI-Plano01-fase04-reposition:** `backupPreMutationStep` reposicionado no array de logo-antes-de-linkClaudeAgents para logo-apos-secretsScanStep. Justificativa D23 antiga (Step 10 transformava CLAUDE.md antes do link) nao mais se aplica — agora apenas copia. Backup deve rodar ANTES de qualquer scaffold mutativo.
- **DI-Plano01-fase04-orphan-libs:** Libs `snippet-resolver.ts` e `backup-anti-vibe.ts` identificadas como candidatas a delete (eram usadas apenas pelo antigo Step 10 apply-merge-destructive). NAO deletadas nesta fase (escopo mantido) — TODO para plano futuro.
- **DI-Plano01-fase04-test-fix:** `isDryRun()` verifica `ctx.flags['dry-run']` (kebab-case), nao `ctx.flags.dryRun` (camelCase). `StepContext` exige campo `args`. Templates de teste do plano usavam camelCase + sem `args` — corrigido nos novos testes do Step 10. Atencao para futuros mocks.
- **DI-Plano01-fase05-scaffold-id:** Step id do scaffold e `'scaffold-full-tree'` (sem prefixo `'01-'`). Spec da fase-05 estava errado — corrigido no teste `'10-backup-pre-mutation comes before scaffold-full-tree'` antes de escrever.
- **DI-Plano01-fase05-e2e-skip-extra:** Alem dos E2E capturados pelo grep de symbols, `init-cutover-greenfield.test.ts` tem 2 testes que comparam contra golden file obsoleto (sem importar symbols deletados — dependencia via leitura de arquivo). Receberam test.skip adicional.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preencher durante execucao das fases -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-01 (fase-01):** Estado da branch tem 4 erros pre-existentes de typecheck nao relacionados a esta feature: `lazy-import.test.ts`, `steps/09-propose-merge-batch.ts`, `subagent-contract.ts`. Os erros em `09-propose-merge-batch.ts` desaparecem na fase-03 (deleta o arquivo). Os demais ficam para resolucao fora desta feature.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-01:** README do plano sugere fase-02 e fase-03 em paralelo, mas ambas editam `skills/init/lib/registry.ts`. Execucao serializada (fase-02 → fase-03) para evitar conflito de edit no mesmo arquivo. Impacto temporal: ~30min a mais (ainda dentro do sizing total do plano).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 1 (DEV-01: fase-02/03 serializadas) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits | 7 (01cc19e, 75010fd, 1ad0317, 691a15c, 9abd98b, bb3ab86 + cleanup) |
| Testes (registry.test.ts) | 9 passed |
| Testes (registry.smoke.test.ts) | 2 passed |
| E2E global | 62 passed, 10 skip, 0 failed |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 02 — Scaffold expandido + Backup pre-mutacao) PRECISA
saber antes de comecar. O subagente do Plano 02 le este campo.

### Estado final do registry (`skills/init/lib/registry.ts`)

- **Steps removidos:** `07-discover-existing-docs`, `08-classify-blocks-hybrid`, `09-propose-merge-batch`, `11-move-docs-with-stub`.
- **Step renomeado:** `10-apply-merge-destructive` → `10-backup-pre-mutation` (via `git mv` em commit isolado 691a15c; conteudo reescrito em 9abd98b). Reposicionado de "antes de linkClaudeAgents" para "logo apos secretsScanStep".
- **Ordem critica:** `91-generate-populate-plan` agora vem ANTES de `final-validation` (Bug C resolvido — MH-01/CA-07).
- **`backupPreMutationStep` (Step 10) tem ESQUELETO MINIMO:** apenas copia `CLAUDE.md` raiz para `docs/_legacy/CLAUDE.md.bak`. Plano 02 fase-03 precisa EXPANDIR para iterar outros docs raiz + emitir manifest do backup. Os 3 testes minimos atuais (copy/skip/dry-run) devem ser preservados como base.

### Libs deletadas (referencia para Plano 02+)

- `blocks-classifier.{ts,test.ts}`
- `doc-mover-stub.{ts,test.ts}`
- `merge-proposal-types.{ts,test.ts}`
- `preview-renderer.{ts,test.ts}`
- `discover-existing-docs.{ts,test.ts}` (raiz, NAO em steps/)

### Libs preservadas (NAO redeletar)

- `discovery-store.ts` — Step 06 (secrets-scan) + Step 12 (detect-drift-incremental) usam via `writeDiscoveryArtifact`/`readDiscoveryArtifact`. Plano 02 fase-03 PODE reusar para escrever artefato do backup.

### Libs candidatas a delete em plano futuro (NAO escopo do Plano 02)

- `snippet-resolver.ts` e `backup-anti-vibe.ts` — eram dependencias do antigo `10-apply-merge-destructive.ts`. Apos rename + reescrita do Step 10, ficaram orfas. Confirmar via grep antes de deletar.

### Tests E2E skipados (input para Plano 05 fase-04 reescrever)

- `tests/e2e/ca13-dry-run-parity.test.ts` — `describe.skip` (suite inteira). Motivo: depende de Step 09 propose-merge-batch.
- `tests/e2e/init-cutover-greenfield.test.ts` — 2 `test.skip`. Motivo: comparam contra golden file obsoleto (`tests/e2e/__golden__/init-greenfield.stdout.txt`).
- `skills/init/lib/steps/02-link-claude-agents.test.ts` linha 33 — 1 `test.skip` herdado da fase-03. Motivo: assumia Step 11 com branching em flag additive-merge.

### Golden snapshot pendente (Plano 05 fase-04)

- `tests/e2e/__golden__/init-greenfield.stdout.txt` contem 5 linhas com nomes dos steps removidos (linhas 4-7 e 19). Tambem `init-greenfield.tree.json` precisa regen. NAO regerar nesta etapa — escopo Plano 05 fase-04.

### Convencoes descobertas

- `bun run lint` NAO existe — use `bun run typecheck`.
- `isDryRun()` checa `ctx.flags['dry-run']` (kebab-case).
- `StepContext` exige campo `args`. Mocks de teste devem incluir.
- Step id do scaffold e `'scaffold-full-tree'` (sem prefixo `'01-'`).

### Typecheck residual (pre-existente — NAO desta feature)

- `lazy-import.test.ts` e `subagent-contract.ts` quebram typecheck. Investigar separadamente, fora desta feature.

---

<!-- Atualizado automaticamente durante execucao -->
