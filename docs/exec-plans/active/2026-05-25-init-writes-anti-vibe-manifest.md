---
mode: quick
created: 2026-05-25
skill: quick-plan
---

# Fix: init v7 grava `.anti-vibe-manifest.json` com pluginVersion atualizado

## Goal

Pipeline v7 do `/init` deve escrever `.claude/.anti-vibe-manifest.json` com `pluginVersion` atual ao final de cada execução. Hoje o arquivo nunca é escrito/atualizado, o que faz `/sync` reportar projeto como "desatualizado" para sempre (mesmo após `/init`).

## Scope

**Arquivos NOVOS**:
- `skills/init/lib/read-plugin-version.ts` — extração de `readPluginVersion` (hoje privada em `run-init.ts`).
- `skills/init/lib/read-plugin-version.test.ts` — unit tests da extração.
- `skills/init/lib/steps/11-write-anti-vibe-manifest.ts` — novo step.
- `skills/init/lib/steps/11-write-anti-vibe-manifest.test.ts` — RED first.

**Arquivos MODIFICADOS**:
- `skills/init/lib/run-init.ts` — passa a importar `readPluginVersion` da nova lib.
- `skills/init/lib/registry.ts` — adiciona `writeAntiVibeManifestStep` como 11º step.

**FORA do escopo**:
- Não tocar em `manifest-writer.ts` (reusar `writeManifest` existente).
- Não tocar em `migration-mode-detector.ts`, `reentry-gate`, `cross-upgrade-detector` — comportamento desses preservado.
- Não bump de versão do plugin (continua v7.3.0).

## Execution Steps

1. **REFACTOR-PREP**: extrair `readPluginVersion` de `run-init.ts:13-36` para `skills/init/lib/read-plugin-version.ts`. Atualizar import em `run-init.ts`. → verify: `bun test skills/init/lib/run-init` permanece verde; novo `read-plugin-version.test.ts` (1 teste: lê 7.3.0 do plugin.json) passa.

2. **RED**: criar `11-write-anti-vibe-manifest.test.ts` com 3 testes em tmpdir: (a) grava `.claude/.anti-vibe-manifest.json` com `pluginVersion === '7.3.0'`, `initMode === 'fresh'`, `installedAt` ISO válido, `files === {}`; (b) se manifest antigo com `pluginVersion: '5.x'` existir, gera backup em `.anti-vibe-manifest.json.backup-v5.<ISO>` antes de sobrescrever; (c) re-run sem manifest antigo é idempotente (sobrescreve sem backup, sem erro). → verify: `bun test 11-write-anti-vibe-manifest` falha com "module not found" ou similar.

3. **GREEN**: criar `11-write-anti-vibe-manifest.ts` exportando `writeAntiVibeManifestStep: Step` com `id: 'write-anti-vibe-manifest'`. Lógica: (a) `readPluginVersion()`, (b) `readManifest(cwd)` — se existe e `pluginVersion.startsWith('5.')`, copiar para `.backup-v5.<ISO>`, (c) `writeManifest(cwd, { pluginVersion, initMode: 'fresh', installedAt: new Date().toISOString(), files: {} })`. → verify: `bun test 11-write-anti-vibe-manifest` verde.

4. **WIRE**: importar `writeAntiVibeManifestStep` em `skills/init/lib/registry.ts` e adicionar como último item do array (após `finalValidationStep`). → verify: `bun test skills/init/lib/registry` verde; contagem de steps no test loop ajustada se necessário (registry.test.ts atualmente espera 10 — passa a esperar 11).

5. **VALIDATE**: rodar `bun run test && bun run lint`. → verify: suite completa verde, zero warnings de lint.

6. **COMMIT + PUSH**: conventional commit `fix(init): grava .anti-vibe-manifest.json com pluginVersion atualizado`, push para `origin/main`. → verify: `git log -1 --oneline` mostra commit; `git status` limpo; push exit 0.

7. **SYNC CACHE**: rodar `bash scripts/sync-to-global.sh`. → verify: script termina com "Sincronizacao completa"; `.claude/plugins/cache/local-plugins/anti-vibe-coding/7.3.0/skills/init/lib/steps/11-write-anti-vibe-manifest.ts` existe no cache.

## Validation Log

A preencher durante execução.

## Compound Opportunity

Lição candidata para `docs/compound/`: "Função órfã ≠ função usada." `buildAndWritePhase4Manifest` existia em `manifest-writer.ts` desde v6.x mas perdeu seu único caller no refactor v7 (Plano 01 deletou os steps 7-11 antigos que a chamavam). Nenhum teste detectou porque o contrato de saída do `/init` não tinha asserção sobre presença/conteúdo do `.anti-vibe-manifest.json` — só sobre arquivos scaffolded. Padrão a capturar: **adicionar smoke test E2E que checa "init grava manifest com pluginVersion === plugin.json"**.

## Lessons Captured

(a preencher após execução — usar `/anti-vibe-coding:lessons-learned` se a categoria acima se confirmar útil)

## Exit Criteria

- `bun run test && bun run lint` verde no monorepo.
- `git status` limpo após commit + push.
- Cache em `C:/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/7.3.0/` contém o novo step.
- Manual smoke (opcional, não bloqueante para fechar este plan): `cd /c/Users/luizf/Videos/Carreirarte\ -\ v5/ && cat .claude/.anti-vibe-manifest.json` mostra `pluginVersion: "7.3.0"` após próximo `/init`.
