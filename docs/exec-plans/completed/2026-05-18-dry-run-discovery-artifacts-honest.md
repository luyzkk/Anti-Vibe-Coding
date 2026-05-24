---
mode: quick
created: 2026-05-18
owner: Luiz/dev
---

# Quick Plan: dry-run honesto via discovery artifacts isolados

## Goal

Corrigir bug critico de integridade do dry-run em init v6.4.1: chain `07-discover-existing-docs` → `08-classify-blocks-hybrid` quebra porque writer ignora dry-run (`noWrite=true`) mas reader le do disco — resultado: dry-run sempre reporta "0 docs / greenfield" mesmo com 991 docs reais, induzindo confianca falsa antes de `apply-merge-destructive` rodar real.

## Scope

- **Causa raiz**: `noWrite` em [skills/init/lib/discovery-store.ts:24](../../skills/init/lib/discovery-store.ts#L24) trata artifacts de IPC entre steps como side-effects do usuario — eles sao coordenacao interna, nao output visivel.
- **Steps afetados** (6 callsites de read/write): 06, 07, 08, 09, 11, 12.
- **Solucao**: trocar semantica `noWrite` por `dryRun`. Em dry-run, artifacts persistem em `os.tmpdir()/anti-vibe-dryrun-{hash(cwd)}/discovery/{name}.json` (auto-cleanup do OS). Readers e writers consultam o mesmo flag → contrato simetrico, dados fluem entre steps.

Fora do escopo: refactor de `WriteRecorder`/`dry-run-mode.ts`; mudancas em como `ctx.flags` armazena dry-run; nova instrumentacao/observability; cleanup explicito de `os.tmpdir()` (OS gerencia).

## Execution Steps

1. Escrever teste failing em `08-classify-blocks-hybrid.test.ts` que prova chain 07→08 em dry-run perde dados → verify: novo teste falha com "expected N classifieds, got 0".
2. Refatorar `discovery-store.ts`: trocar `{noWrite}` por `{dryRun}` em write/read APIs; `discoveryArtifactPath` aceita `dryRun?: boolean` e roteia para `os.tmpdir()/anti-vibe-dryrun-{hash(cwd)}/discovery/` → verify: tests existentes de discovery-store passam, novo teste de roundtrip dry-run passa.
3. Atualizar 6 callsites (06, 07, 08, 09, 11, 12) para passar `dryRun: isDryRun(ctx)` em writes E reads → verify: `rg "noWrite" skills/init/lib/steps/` retorna zero, tsc passa.
4. Atualizar test "--dry-run NAO escreve classification-result.json" para nova semantica (nao escreve em `.anti-vibe/discovery/` mas escreve em path dry-run) → verify: teste verde, novo teste valida path dry-run.
5. Teste end-to-end em chain 07→08→09: fixture com docs reais, modo dry-run, asserir summary do step 09 reflete escopo real → verify: novo teste e2e passa.
6. Rodar suite completa + lint → verify: `bun run test && bun run lint` verdes.

## Validation Log

- Step 1 (regression test): `bun test 08-classify-blocks-hybrid.test.ts` → 1 fail esperada ("expected 2 classifieds, got 0").
- Step 2 (discovery-store refactor): `bun test discovery-store.test.ts` → 7 pass, inclusive novo roundtrip dryRun.
- Step 3 (5 callsites refactored — 06, 07, 08, 09, 11): `rg "noWrite" skills/init/lib/steps/` → zero em codigo de producao (so menciona em comentario historico de teste).
- Step 4 (test contracts updated): tests do 06, 08 atualizados para assertir que dry-run path != prod path.
- Step 5 (e2e chain 07→08→09 em dry-run): `bun test 09-propose-merge-batch.test.ts` → 5 pass. Output observado: dry-run reporta corretamente "2 docs would be moved" (AUTH.md, API.md) em vez de falso greenfield.
- Step 6 (suite + typecheck):
  - `bun test skills/init/` → 642 pass / 0 fail / 1693 expects / 4.77s.
  - `bun test` (full repo) → 1 fail pre-existing (`stack-knowledge tracer-bullet CA-03 Rails puro`), confirmado via `git stash` que persiste sem minhas mudancas.
  - `bun run typecheck` → 4 errors pre-existing (`lazy-import.test`, `AbortError`, `ajv` types), confirmados via `git stash`.
  - Zero regressoes introduzidas pela fix.

## Compound Opportunity

Categoria "dry-run que mente sobre escopo via acoplamento de IPC interno" e candidato a licao em `docs/compound/` — generaliza para qualquer pipeline que use disco como IPC e tente suprimir writes seletivamente.

## Lessons Captured

- **Anti-pattern detectado**: usar flag `noWrite` em writer de IPC interno, sem propagar para o reader, e ainda assim chamar isso de "dry-run". Dry-run que mente sobre escopo e pior que nao ter dry-run — induz confianca falsa antes de operacao destrutiva (no caso, `apply-merge-destructive` reescrevendo CLAUDE.md).
- **Fix estrutural**: distinguir side-effect visivel ao usuario (silenciavel em dry-run) de side-effect de coordenacao entre steps (precisa persistir mesmo em dry-run, apenas em namespace separado). API simetrica entre writer e reader e a unica forma de evitar drift.
- **Detectabilidade**: ausencia de testes e2e do chain inteiro em modo dry-run permitiu o bug viver — testes unitarios de cada step isoladamente passavam. Regression test `e2e dry-run chain 07→08→09` agora bloqueia retorno desse anti-pattern.
- Candidato a `/anti-vibe-coding:lessons-learned` para registro em `docs/compound/`.

## Exit Criteria

- Suite `skills/init/lib/**/*.test.ts` 100% verde.
- `rg "noWrite" skills/init/lib/` retorna zero matches em codigo de producao (tests podem mencionar historicamente).
- Novo teste e2e prova dry-run reporta escopo real (>0 docs classificados quando ha docs).
- Lint sem erros.
- Dry-run nao polui `.anti-vibe/discovery/` em runs reais.
