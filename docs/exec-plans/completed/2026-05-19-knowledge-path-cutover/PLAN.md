# Plan: Knowledge Path Cutover (docs/knowledge → knowledge/)

**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md
**Planos:** 2 planos, 10 fases total
**Created:** 2026-05-19
**Target version:** 6.6.0

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Cutover Foundation + Distribuicao | 6 | ~6h | — |
| 02 | Reentrada, Migracao V5 e Validator Pos-Init | 4 | ~4.5h | Plano 01 |

---

## Grafo de Dependencias

```
Plano 01 (Cutover Foundation + Distribuicao)
    |
    | git mv + paths + sync + AbortError + goldens
    v
Plano 02 (Reentrada + Validator)
    |
    | refresh-on-reentry + migrate-knowledge-path + validator pos-init
    v
[Pos-merge]
    |
    +-> /anti-vibe-coding:lessons-learned
        ("docs/ = dog-food; runtime asset deve viver fora")
```

**Paralelismo possivel:** Nenhum. Plano 02 depende do path novo estar estabelecido (fase-01 do Plano 01) e do sync distribuir corretamente (fase-04 do Plano 01) — re-populate so faz sentido se o cache global ja entrega `knowledge/`.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-protection-test-and-git-mv
**Descricao:** O slice mais fino que prova o cutover end-to-end: teste de protecao falhando (RED, verifica que `knowledge/INDEX.md` ou subpasta `knowledge/{stack}/INDEX.md` existe E que `docs/knowledge/` nao existe) → `git mv docs/knowledge knowledge` → update minimo de `copy-knowledge.ts:58` para apontar para o novo path → teste passa (GREEN). Prova que a arquitetura nova funciona localmente antes de tocar sync, AbortError, refresh ou migracao.

---

## Resumo por Plano

### Plano 01: Cutover Foundation + Distribuicao
> Estabelece o path novo (`knowledge/` na raiz do plugin), propaga em todo o codigo de runtime, distribui via `sync-to-global.sh` com fail-fast, e regenera goldens. Promove warning para AbortError no caminho critico. Ao fim: `/init` greenfield com cache global ja sincronizado funciona sem warning de "Knowledge nao foi copiado".

Fases:
- fase-01-protection-test-and-git-mv: Tracer Bullet — protection test (`tests/repo-structure/knowledge-path.test.ts`) + `git mv docs/knowledge knowledge` + update minimo de path em `copy-knowledge.ts:58` (`docs/knowledge` → `knowledge`). [~1.5h, MH-01, MH-02 parcial, CA-01, CA-02]
- fase-02-version-bump-6.6.0: Propagar 6.5.1 → 6.6.0 em 7 arquivos (package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, plugin-manifest.json, scripts/sync-to-global.sh:18 default, skills/init/lib/run-init.ts:32 fallback, constante `KNOWLEDGE_PATH_CUTOVER_VERSION` inline em `00_2-reentry-guard.ts:41`). [~1h, MH-04, CA-14]
- fase-03-copy-knowledge-paths-and-messages: Atualizar mensagens de erro em `copy-knowledge.ts:53,76` (`docs/knowledge/` → `knowledge/`), preservar guards `VALID_PRIMARY` e defense-in-depth `path.resolve` check 1:1. Atualizar comentario `state-md-init.ts:21`. Tests em `copy-knowledge.test.ts` atualizados. [~45min, MH-02 final, CA-13]
- fase-04-sync-distribution-and-validation: Adicionar `copy_dir_if_exists "$PLUGIN_DEV/knowledge" "$PLUGIN_GLOBAL/knowledge" "knowledge/"` em `sync-to-global.sh` (irmao das chamadas 72-77). Adicionar pos-sync sanity check bloqueante para AMBAS stacks canonicas (`nodejs-typescript` E `rails`) — exit 1 se INDEX.md ausente em qualquer uma com mensagem explicita. [~1h, MH-03, CA-03, CA-04, CA-16]
- fase-05-abort-error-promotion: Em `copy-knowledge.ts:71-79`, branch `sourceExists === false` com `primary !== null` deixa de retornar `status: 'no-source'` e passa a lancar `AbortError`. Caller `03_1-persist-stack-and-knowledge.ts` propaga. Manter status `'no-source'` apenas para `VALID_PRIMARY` falhar (path traversal — CA-13 preservado). [~1h, SH-01, CA-10, CA-13]
- fase-06-fixtures-and-goldens-regen: Atualizar 9 arquivos de teste e fixtures que referenciam `docs/knowledge/{stack}/` (production: `harness-validate.ts:659`; tests: copy-knowledge.test.ts, atoms-frontmatter-schema.test.ts, atoms-rf11-audit.test.ts, run-stack-knowledge-init.test.ts, harness-validate-knowledge.test.ts, stack-knowledge-full-e2e.test.ts, stack-knowledge-rails-full.test.ts; PRESERVAR migrate-claude-artifacts.test.ts onde `docs/knowledge/legacy-claude-knowledge/` representa target-side). Regenerar `tests/e2e/__golden__/init-greenfield.stdout.txt`. Rodar `bun run harness:validate` na raiz: deve passar. [~1.5h, MH-05, CA-15]

### Plano 02: Reentrada, Migracao V5 e Validator Pos-Init
> Cobre o caminho de upgrade (re-populate forca refresh dos atoms), migracao do artefato init-v5 (`docs/knowledge/legacy-claude-knowledge/` → `docs/_legacy/knowledge/`), e validacao pos-init com 2 niveis (bloqueante + warning sunset v7.0.0). Polish: CHANGELOG e nota arquitetural opcional.

Fases:
- fase-01-refresh-on-reentry: Em `copy-knowledge.ts:83-91`, quando `destExists === true` E caller passa `refresh: true` derivado de `ctx.flags['__reentryMode'] === 're-populate'`, executar branch de refresh. Caller `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts`: adicionar `const refresh = ctx.flags['__reentryMode'] === 're-populate'` e passar para `copyKnowledge()`. Greenfield permanece intocado (CA-07). Flag CLI `--refresh-knowledge` continua ortogonal. [~1.5h, SH-02, CA-06, CA-07]
- fase-02-migrate-knowledge-path-step: Criar `skills/init/lib/steps/13_1-migrate-knowledge-path.ts`. Roda apenas em `__reentryMode === 're-populate'` E quando `docs/knowledge/legacy-claude-knowledge/` existe no target. Move (rename atomico) → `docs/_legacy/knowledge/`. Guard de colisao: `AbortError` se destino ja existe. Registrar no `registry.ts` entre `migrate4DecisionsStep` e `scaffoldFullTreeStep`. Testes unitarios + E2E. [~1.5h, SH-03, CA-08, CA-09]
- fase-03-validator-post-init-checks: Em `skills/init/lib/steps/90-final-validation.ts`, adicionar 2 checks: (a) **primario bloqueante** — se STATE.md/manifest tem stack detectada, verificar `.claude/knowledge/{stack}/INDEX.md`; ausente → erro bloqueante; (b) **secundario warning** — se `docs/knowledge/` orfao no target → `WARN: docs/knowledge/ orfao detectado. Re-rode /anti-vibe-coding:init para migrar para .claude/knowledge/. Aviso sera removido em v7.0.0.` Sem bloqueio. Comentario inline `// 2026-05-19 (Luiz/dev): D8.C — sunset previsto v7.0.0.` [~1.5h, SH-04, CA-11, CA-12]
- fase-04-changelog-and-arch-note: Entry 6.6.0 no `CHANGELOG.md` documentando cutover + path antigo + nova convencao + nota sobre re-populate sobrescrever `.claude/knowledge/`. (Opcional CH-01) Nota em `ARCHITECTURE.md`: "`docs/` = dog-food humano (nao distribuivel); runtime assets DEVEM viver fora de `docs/`." Manual checklist final + lessons-learned hand-off. [~45min, CH-01, fecho do PRD]

---

## Risks

- **Substituicao falsa em `migrate-claude-artifacts.ts:45`**: o path `docs/knowledge/legacy-claude-knowledge/` representa target-side (projeto alvo) e NAO deve ser alterado. Plan-feature explicita "PRESERVAR" em fase-06 do Plano 01. Mitigacao: grep com contexto antes de substituir, revisar diff antes do commit, teste `migrate-claude-artifacts.test.ts` deve continuar verde.
- **E2E goldens (init-greenfield.stdout.txt) quebram com path antigo**: fase-06 do Plano 01 regenera explicitamente. Estado conhecido — outros goldens ja tem test.skip (MEMORY.md raiz).
- **Cache global multi-versao (6.5.0, 6.5.1, 6.6.0) coexistindo**: pin via `installed_plugins.json` ja implementado no sync (6.5.1). CHANGELOG 6.6.0 documenta que sync atualiza pin automaticamente. Mitigacao adicional: arquivar `_trash/6.5.x` manualmente pos-cutover (fora do escopo do plano).
- **`compareSemver(version, '6.6.0')` em reentry-guard quebra projeto em transicao com manifest 6.5.x**: Plano 02 fase-01 testa explicitamente fixture com manifest 6.5.0 e 6.5.1 (comportamento esperado: cmp = -1 → `__reentryMode='re-populate'`).
- **Refresh sobrescreve atoms customizados pelo usuario no target**: documentar em CHANGELOG (Plano 02 fase-04). Convencao `.claude/knowledge/_overrides/` fica para PRD futuro.
- **Validator secundario (warning sunset v7.0.0) e esquecido na release major**: comentario inline + entry em tech-debt-tracker (fora do escopo do plano — sugerir no closing checklist).
- **Step novo `migrate-knowledge-path` colide com `docs/_legacy/pre-6.5.0/knowledge/`**: `backupPre650Step` ja e idempotente (cria `pre-6.5.0-{ts}/` em 2a execucao — AR-01 resolvido). Step novo aborta em colisao direta com `docs/_legacy/knowledge/`. Sem overlap real.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (path `knowledge/` na raiz) | Plano 01, fase-01 |
| D2 (cutover puro via git mv + protection test) | Plano 01, fase-01 |
| D3 (destino v5 = `docs/_legacy/knowledge/`) | Plano 02, fase-02 |
| D4 (sync valida bloqueante + AbortError em copy-knowledge) | Plano 01, fase-04 (sync), fase-05 (AbortError) |
| D5 (refresh em re-populate + destExists) | Plano 02, fase-01 |
| D6 (bump minor 6.5.1 → 6.6.0) | Plano 01, fase-02 |
| D7 (step dedicado migrate-knowledge-path) | Plano 02, fase-02 |
| D8 (validator: primario bloqueante + secundario warning sunset) | Plano 02, fase-03 |
| D9 (path traversal guard 1:1) | Plano 01, fase-03 (mensagens) e fase-05 (CA-13 preservado) |
| AR-01 (backupPre650 idempotente, sem colisao) | Plano 02, fase-02 (documentado no MEMORY.md do plano) |
| AR-02 (sync valida AMBAS stacks: nodejs-typescript E rails) | Plano 01, fase-04 |
| AR-03 (numbering 13_1-migrate-knowledge-path) | Plano 02, fase-02 |
| AR-04 (constante inline em reentry-guard, sem constants.ts) | Plano 01, fase-02 |
| AR-05 (DOIS validadores: Step 90 final-validation E harness-validate.ts) | Plano 01, fase-06 (harness-validate) + Plano 02, fase-03 (Step 90) |

---

## Criterios de Aceite Mapeados

| CA | Fase responsavel |
|----|------------------|
| CA-01 (protection test cutover) | Plano 01, fase-01 |
| CA-02 (git log --follow) | Plano 01, fase-01 (validar pos-commit) |
| CA-03 (sync distribuiu) | Plano 01, fase-04 |
| CA-04 (sync valida bloqueante) | Plano 01, fase-04 |
| CA-05 (init greenfield sem warning) | Plano 01, fase-06 (E2E goldens regen + verify) |
| CA-06 (refresh em re-populate) | Plano 02, fase-01 |
| CA-07 (greenfield NAO faz refresh) | Plano 02, fase-01 |
| CA-08 (migracao v5) | Plano 02, fase-02 |
| CA-09 (guard de colisao) | Plano 02, fase-02 |
| CA-10 (AbortError quando matrix ausente) | Plano 01, fase-05 |
| CA-11 (validator primario bloqueia) | Plano 02, fase-03 |
| CA-12 (validator secundario so avisa) | Plano 02, fase-03 |
| CA-13 (path traversal guard intacto) | Plano 01, fase-03 + fase-05 |
| CA-14 (bump propagado) | Plano 01, fase-02 |
| CA-15 (harness-validate atualizado) | Plano 01, fase-06 |
| CA-16 (sync valida ambas stacks) | Plano 01, fase-04 |

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
