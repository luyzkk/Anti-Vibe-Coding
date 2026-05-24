---
slug: knowledge-path-cutover
created: 2026-05-19
target_version: 6.6.0
status: ready-for-prd
interview: grill-me
decisions_count: 9
---

# CONTEXT — Knowledge Path Cutover (docs/knowledge → knowledge/)

## Problema

`sync-to-global.sh` propositalmente **NAO copia** `docs/` para o cache global do plugin (linha 80: "docs/ do plugin eh dog-food, NAO eh distribuivel"). Porém `docs/knowledge/` é **runtime data** consumido por `skills/init/lib/copy-knowledge.ts` durante `/anti-vibe-coding:init` — copia matrix por stack detectado para `.claude/knowledge/{stack}/` no projeto alvo.

Resultado observado: warning "Knowledge matrix nao copiado" em projetos que rodam `/init` contra o cache global. Bug confirmado em carreirarte.

Causa raiz: misturar metadocumentação do plugin (não-distribuível) com asset de runtime (distribuível) no mesmo diretório `docs/`.

## Solução escolhida (B — refactor)

**Mover `docs/knowledge/` → `knowledge/`** na raiz do plugin, separando claramente runtime asset de documentação interna. Distinção fica auto-evidente: `docs/` = dog-food humano; `knowledge/` = consumido pela skill `/init`.

Alternativa A (whitelist `docs/knowledge/` no sync) foi rejeitada — mantém o smell de mistura semântica em `docs/`.

## Decisões registradas (grill-me)

### D1 — Caminho novo dentro do plugin: **A**
**Decisão**: `knowledge/` na raiz do plugin (irmão de `skills/`, `hooks/`, `agents/`).
**Por quê**: simetria com outros runtime dirs já distribuídos. Não cria nova hierarquia (`assets/`, `runtime/`) só para esse caso.

### D2 — Estratégia de migração no repo do plugin: **A**
**Decisão**: cutover puro via `git mv docs/knowledge knowledge` + teste de proteção que verifica existência do novo path **E** ausência do antigo.
**Por quê**: linhagem git preservada (`git log --follow`), não há produção a manter dual-path, plugin é single-source-of-truth. Teste evita drift acidental.

### D3 — Destino da migração de v5 no projeto alvo: **B**
**Decisão**: `docs/_legacy/knowledge/` (não `.claude/knowledge.v5.backup/`).
**Por quê**: agrupa com `docs/_legacy/pre-6.5.0/` existente. Convenção única para artefatos legacy do alvo.

### D4 — Validação no sync-to-global.sh: **B + bloqueante**
**Decisão**: pós-`cp -r knowledge/ ...`, verificar `knowledge/{stack}/INDEX.md` em pelo menos uma stack canônica. Se ausente → `exit 1`. Adicionalmente, promover o warning "Knowledge matrix nao copiado" em `copy-knowledge.ts` para **AbortError bloqueante**.
**Por quê**: fail-fast no sync evita propagar cache incompleto. Erro bloqueante no `/init` força usuário a re-sincronizar em vez de prosseguir com .claude/knowledge incompleto que feed downstream skills com info errada.

### D5 — Refresh forçado em re-runs: **B.2**
**Decisão**: forçar refresh APENAS quando `ctx.flags['__reentryMode'] === 're-populate'` E `.claude/knowledge/` já existe no alvo. Greenfields não disparam (já copiam por default).
**Por quê**: atoms desatualizados feed skills downstream com info errada (preocupação levantada pelo usuário em D5). Re-populate é exatamente o caminho do upgrade — usuário pediu para atualizar, então atualizar.

### D6 — Versão do bump: **B (minor)**
**Decisão**: 6.5.1 → **6.6.0**. Adicionar constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` em `reentryGuardStep` (ou módulo de constantes).
**Por quê**: cutover de path é mudança estrutural visível para usuários migrando da 6.5.x. Patch (6.5.2) subestimaria. Major (7.0.0) reservado para sunset do validator-warning (D8) e remoção de migração v5.

### D7 — Local da migração v5→v6.6: **A.1 (step dedicado novo)**
**Decisão**: criar `migrate-knowledge-path-step.ts` posicionado **após** `migrate-claude-artifacts-step`. Move `docs/knowledge/legacy-claude-knowledge/` (se existir no alvo via init v5) → `docs/_legacy/knowledge/`. Guard: abortar se destino já existe (não sobrescrever).
**Por quê**: SRP — cada step com uma responsabilidade. Migração de path é semanticamente distinta de migrate-claude-artifacts (que move CLAUDE.md/AGENTS.md). Step novo é descobrível via registry.

### D8 — Validator pós-init: **C (dois checks separados)**
**Decisão**:
- **Check primário (bloqueante)**: se stack detectada, verificar `.claude/knowledge/{stack}/INDEX.md`. Ausente → erro.
- **Check secundário (warning não-bloqueante)**: detectar `docs/knowledge/` órfão no projeto alvo e sugerir re-run de `/init`. Sunset previsto em v7.0.0.
**Por quê**: separa "blocker" de "hint". Sunset planejado evita validator carregar baggage indefinidamente.

### D9 — Path traversal guard em copy-knowledge.ts: **A**
**Decisão**: mover guards 1:1 (`VALID_PRIMARY` regex + `path.resolve` defense-in-depth). Apenas trocar a string base de `'docs/knowledge'` para `'knowledge'`.
**Por quê**: refactor é cutover de PATH, não mudança de modelo de segurança. Allowlist explícita (opção B) cria friction para adicionar novas matrices. Sai em PR separado se necessário.

## Arquivos afetados (preview, não exaustivo)

**Move (git mv)**:
- `docs/knowledge/` → `knowledge/`

**Edit**:
- `skills/init/lib/copy-knowledge.ts` — troca base path; ajusta guard (D9.A); adiciona refresh-on-reentry (D5.B.2); promove warning para AbortError (D4)
- `scripts/sync-to-global.sh` — adiciona `copy_dir_if_exists` para `knowledge/`; adiciona validação pós-sync (D4)
- `skills/init/lib/steps/00_2-reentry-guard.ts` — atualiza threshold para `6.6.0` (constante `KNOWLEDGE_PATH_CUTOVER_VERSION`)
- `skills/init/lib/registry.ts` — registra novo step (D7.A.1)
- `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin-manifest.json`, `skills/init/lib/run-init.ts`, `scripts/sync-to-global.sh` — bump 6.5.1 → 6.6.0
- `CHANGELOG.md` — entry 6.6.0

**Create**:
- `skills/init/lib/steps/migrate-knowledge-path.ts` (+ test) — D7.A.1
- Teste de proteção do cutover (D2.A): assert que `docs/knowledge/` não existe E `knowledge/INDEX.md` existe
- Validator checks D8.C — local depende de onde está o validator hoje (verificar `bun run harness:validate` ou similar)

**Verify**:
- Todos os callers de `docs/knowledge/` no codebase (grep não exaustivo necessário no plano)

## Próximos passos sugeridos

1. `/anti-vibe-coding:write-prd` — formalizar PRD com escopo, NFRs, golden tests, cutover plan
2. `/anti-vibe-coding:plan-feature` — gerar PLAN.md com vertical slices
3. `/anti-vibe-coding:execute-plan` — execução wave-based

## Lessons já evidentes (registrar pós-merge)

- Diretório `docs/` é dog-food (não distribuído) — qualquer asset de runtime DEVE ficar fora de `docs/`. Convenção a documentar em ARCHITECTURE.md.
- Validação pós-sync no `sync-to-global.sh` previne cache incompleto silencioso.
