---
slug: knowledge-path-cutover
date: 2026-05-19
status: completed
completedAt: 2026-05-20
target_version: 6.6.0
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD). Exemplo: `// 2026-05-19 (Luiz/dev): D6 do PRD knowledge-path-cutover — bump 6.6.0`
-->

# PRD: Knowledge Path Cutover (docs/knowledge → knowledge/)

**Status:** Draft
**Author:** Luiz/dev + AI
**Date:** 2026-05-19
**Context:** ./CONTEXT.md
**Target Version:** 6.6.0 (minor bump)

---

## Problema

`scripts/sync-to-global.sh` propositalmente NÃO copia `docs/` para o cache global (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/{version}/`). Linha 80 documenta a razão: _"docs/ do plugin eh dog-food (D20), NAO eh distribuivel - NAO copiado (decisao 09-A3)"_.

Porém `docs/knowledge/{stack}/` é **runtime asset** consumido por `skills/init/lib/copy-knowledge.ts` (linha 58: `path.resolve(pluginRoot, 'docs', 'knowledge')`) durante `/anti-vibe-coding:init`. Resultado observado em produção (carreirarte): `/init` emite warning `"Stack detected: X. Knowledge não foi copiado"` porque o diretório `knowledge/` está ausente no cache global.

**Causa raiz:** mistura semântica em `docs/` — metadocumentação do plugin (dog-food, não distribuível) coabita com asset consumido pela skill `/init` no projeto alvo (runtime, deve ser distribuível).

**Impacto:** skills downstream (`/anti-vibe-coding:react-patterns`, `:security`, etc.) consultam `.claude/knowledge/{stack}/atoms/*.md` para guidance. Quando essa pasta está vazia, recomendações ficam genéricas em vez de stack-aware. Bug silencioso: o `/init` completa com warning não-bloqueante e o usuário só percebe quando uma skill seguinte falha em retornar conteúdo esperado.

---

## Solução

### Outcomes (declarativo — o QUE)

- O cache global do plugin (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/`) contém `knowledge/{stack}/{INDEX.md, atoms/}` após `sync-to-global.sh`.
- `/init` em greenfield copia `knowledge/{stack-detectada}/` para `.claude/knowledge/{stack}/` no projeto alvo — sem warning.
- `/init` em re-run (`__reentryMode='re-populate'`) com `.claude/knowledge/` pré-existente força refresh dos atoms (evita drift entre cache e projeto).
- `/init` em projeto v5 legacy migra `docs/knowledge/legacy-claude-knowledge/` (se existir) → `docs/_legacy/knowledge/` no projeto alvo, preservando histórico.
- `sync-to-global.sh` falha com exit 1 se a cópia da matrix ficou incompleta (post-sync sanity check).
- `copy-knowledge.ts` retorna `AbortError` em vez de warning quando a stack é detectada mas a matrix está ausente no plugin.
- Validador pós-init bloqueia se `.claude/knowledge/{stack}/INDEX.md` ausente quando stack foi detectada; e emite warning não-bloqueante se `docs/knowledge/` órfão remanescer no projeto alvo (sunset previsto v7.0.0).
- `git log --follow knowledge/{stack}/INDEX.md` mostra histórico completo desde `docs/knowledge/{stack}/INDEX.md`.

### Mecanismo (algorítmico — o COMO)

**1. Cutover no repo do plugin (D2.A — git mv puro)**

```bash
git mv docs/knowledge knowledge
git commit -m "refactor: move docs/knowledge → knowledge/ (runtime asset cutover) [PRD knowledge-path-cutover]"
```

Teste de proteção (`tests/repo-structure/knowledge-path.test.ts`) com 2 asserts:
- `fs.existsSync('knowledge/INDEX.md' OR 'knowledge/nodejs-typescript/INDEX.md')` → true
- `fs.existsSync('docs/knowledge')` → false

**2. Atualização de paths em código (D1.A + D9.A)**

[copy-knowledge.ts:58](skills/init/lib/copy-knowledge.ts#L58): `path.resolve(pluginRoot, 'docs', 'knowledge')` → `path.resolve(pluginRoot, 'knowledge')`. Mensagens de erro em [copy-knowledge.ts:53,76](skills/init/lib/copy-knowledge.ts#L53) trocam `docs/knowledge/` → `knowledge/`. Guards (`VALID_PRIMARY` regex + defense-in-depth `path.resolve` check) preservados 1:1.

**3. Distribuição no sync (D4 — bloqueante)**

[scripts/sync-to-global.sh](scripts/sync-to-global.sh): adicionar `copy_dir_if_exists "$PLUGIN_DEV/knowledge" "$PLUGIN_GLOBAL/knowledge" "knowledge/"` (irmão das outras chamadas em 72-77). Pós-sync, validar:

```bash
# Após todos os copy_dir_if_exists:
KNOWLEDGE_VALIDATION_STACK="nodejs-typescript"  # stack canônica garantida
if [ ! -f "$PLUGIN_GLOBAL/knowledge/$KNOWLEDGE_VALIDATION_STACK/INDEX.md" ]; then
  echo "ERRO: Sync incompleto — knowledge/$KNOWLEDGE_VALIDATION_STACK/INDEX.md ausente no cache global."
  exit 1
fi
```

**4. AbortError no copy-knowledge quando stack detectada mas matrix ausente (D4 — bloqueante)**

[copy-knowledge.ts:71-79](skills/init/lib/copy-knowledge.ts#L71-L79): branch `sourceExists === false` com `primary !== null` deixa de retornar `status: 'no-source'` e passa a lançar `AbortError`. O caller (`03_1-persist-stack-and-knowledge.ts`) propaga o abort. Mantém retorno de status para o caso `primary === null` (stack não detectada — não é erro).

**5. Refresh forçado em re-populate (D5.B.2)**

[copy-knowledge.ts:83-91](skills/init/lib/copy-knowledge.ts#L83-L91): quando `destExists === true` E o caller passa `refresh: true` deriva do `ctx.flags['__reentryMode'] === 're-populate'`. Greenfields seguem comportamento atual (não há `destExists`).

Caller [skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts](skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts): adicionar `const refresh = ctx.flags['__reentryMode'] === 're-populate'` e passar `refresh` para `copyKnowledge()`. Não afeta `--refresh-knowledge` flag (continua funcional como explicit opt-in).

**6. Bump 6.5.1 → 6.6.0 (D6)**

Arquivos: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin-manifest.json` (todos `"version": "6.5.1"` → `"6.6.0"` — fallback `return '6.5.1'` em `run-init.ts:32` → `'6.6.0'`), `scripts/sync-to-global.sh:18` (default).

`skills/init/lib/steps/00_2-reentry-guard.ts:41`: `compareSemver(manifestVersion, '6.5.0')` → constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` (ou módulo de constantes — verificar se já existe). Comparison `cmp >= 0` permanece. Mensagem de abort não muda. Re-populate dispara para qualquer manifest < 6.6.0.

**7. Step novo `migrate-knowledge-path` (D7.A.1)**

`skills/init/lib/steps/13_1-migrate-knowledge-path.ts`:
- Roda apenas quando `ctx.flags['__reentryMode'] === 're-populate'` E `docs/knowledge/legacy-claude-knowledge/` existe no target.
- Move (rename atomic) `docs/knowledge/legacy-claude-knowledge/` → `docs/_legacy/knowledge/`.
- Guard de colisão: se `docs/_legacy/knowledge/` já existe → `AbortError` com mensagem "Destino já existe. Migração manual necessária ou remova `docs/_legacy/knowledge/`."
- Posicionado após `migrate4DecisionsStep` na ordem do registry, antes de `scaffoldFullTreeStep`.

**8. Validator pós-init (D8.C — 2 checks separados)**

Localizar validator atual (`skills/init/lib/steps/90-final-validation.ts`). Adicionar 2 checks:

- **Check primário (bloqueante)**: se `STATE.md` ou manifest tem stack detectada → verificar `.claude/knowledge/{stack}/INDEX.md`. Ausente → erro bloqueante.
- **Check secundário (warning sunset v7.0.0)**: se `docs/knowledge/` existe no projeto alvo → log `WARN: docs/knowledge/ órfão detectado. Re-rode /anti-vibe-coding:init para migrar para .claude/knowledge/. Aviso será removido em v7.0.0.` Sem bloqueio.

Comentário inline marcando sunset: `// 2026-05-19 (Luiz/dev): D8.C — sunset previsto v7.0.0. Remover este check no bump major.`

---

## Requisitos Funcionais

### Must Have (5 itens — 38% do total)

- [ ] MH-01: `git mv docs/knowledge knowledge` executado; teste de proteção verifica novo path existe E antigo ausente.
- [ ] MH-02: `copy-knowledge.ts` aponta para `knowledge/` (não `docs/knowledge/`); `VALID_PRIMARY` regex e defense-in-depth path check preservados 1:1.
- [ ] MH-03: `sync-to-global.sh` copia `knowledge/` para cache global E falha com exit 1 se `knowledge/nodejs-typescript/INDEX.md` **E** `knowledge/rails/INDEX.md` ausentes pós-sync (CH-02 promovido — check ambas stacks canônicas).
- [ ] MH-04: Bump 6.6.0 propagado em 7 arquivos (package.json, plugin.json, marketplace.json, plugin-manifest.json, run-init.ts fallback, sync-to-global.sh default, reentry-guard threshold via constante `KNOWLEDGE_PATH_CUTOVER_VERSION` inline em [00_2-reentry-guard.ts](skills/init/lib/steps/00_2-reentry-guard.ts) — sem `constants.ts` central, segue padrão de `ABORT_MESSAGE` lá).
- [ ] MH-05: `scripts/harness-validate.ts:checkKnowledgePresence` ([linha 659](scripts/harness-validate.ts#L659)) aponta para `knowledge/` em vez de `docs/knowledge/`; `tests/harness-validate-knowledge.test.ts` fixtures atualizadas para `knowledge/nodejs-typescript/`.

### Should Have (4 itens)

- [ ] SH-01: `copy-knowledge.ts` lança `AbortError` quando `primary !== null` E `sourceDir` ausente (promoção de warning a erro bloqueante).
- [ ] SH-02: Refresh forçado quando `ctx.flags['__reentryMode'] === 're-populate'` E `.claude/knowledge/` existe.
- [ ] SH-03: Step novo `migrate-knowledge-path` move `docs/knowledge/legacy-claude-knowledge/` → `docs/_legacy/knowledge/` com guard de colisão.
- [ ] SH-04: Validator pós-init implementa 2 checks (primário bloqueante para stack detectada sem matrix; secundário warning para `docs/knowledge/` órfão).

### Could Have

- [ ] CH-01: Comentário em `ARCHITECTURE.md` documentando a convenção "docs/ = dog-food, paths runtime DEVEM viver fora de docs/" (registra a lição como decisão arquitetural).
- [ ] CH-03: `knowledge/.matrix-manifest.json` listando stacks canônicas — sync valida contra esse manifest em vez de hardcode.

<!-- CH-02 promovido para MH-03 — check de ambas stacks é cheap, vale incluir no MVP -->


### Won't Have (desta versão)

- Allowlist explícita de stacks no `VALID_PRIMARY` (decidido D9.A — fica em PR futuro se necessário).
- Renomear `knowledge/` para outra coisa (`atoms/`, `matrices/`, etc.) — só path move, sem rename semântico.
- Remover suporte ao flag `--refresh-knowledge` (continua funcional como opt-in explícito, ortogonal ao refresh automático em re-populate).
- Sunset do check secundário do validator (sai apenas em v7.0.0).
- Mudança no modelo de path traversal (D9.A — guards preservados 1:1).

---

## Requisitos Não-Funcionais

- **Performance:** `sync-to-global.sh` adiciona ~50KB (atual size de `docs/knowledge/`) à cópia — impacto desprezível. Validação pós-sync: 1 `[ -f ]` check. `/init` greenfield ganha 1 path resolve (não há custo mensurável).
- **Segurança:** Path traversal guard mantido (D9.A). Defense-in-depth check `sourceDir !== knowledgeBase && !sourceDir.startsWith(knowledgeBase + path.sep)` preservado. Symlink detection em `copyTree()` (CWE-61) intocado.
- **Observabilidade:** Validator pós-init com 2 níveis (bloqueante vs warning) já discrimina criticidade. `sync-to-global.sh` ecoa `+/-/!` por arquivo (padrão existente). Mensagens de erro mantêm contexto (path absoluto sanitizado via `<plugin-root>` quando aplicável — preservar lógica de `safeMessage` em [copy-knowledge.ts:112](skills/init/lib/copy-knowledge.ts#L112)).
- **Compatibilidade:** Cutover é breaking apenas para usuários que ainda estão em manifest <6.6.0 — o re-populate path os cobre. Manifest >=6.6.0 nunca rodaram com `docs/knowledge/` então não há nada a migrar.
- **Documentação:** CHANGELOG entry 6.6.0 explicando cutover + path antigo + nova convenção. Comentário inline no step novo aponta para o PRD.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| D1 | Caminho novo dentro do plugin | `knowledge/` na raiz | `assets/knowledge/`, `runtime/knowledge/` | Simetria com `skills/`, `hooks/`, `agents/`. Não cria nova hierarquia para 1 caso. |
| D2 | Estratégia de migração no repo | Cutover puro via `git mv` + teste | Dual-path com deprecation warning (mantém `docs/knowledge/` por N versões) | Plugin é SSOT, sem produção a manter. `git log --follow` preserva linhagem. Teste evita drift. |
| D3 | Destino da migração v5 no alvo | `docs/_legacy/knowledge/` | `.claude/knowledge.v5.backup/` | Agrupa com `docs/_legacy/pre-6.5.0/` existente. Convenção única. |
| D4 | Validação no sync + warning→erro | Pós-sync check + `AbortError` em copy-knowledge | Manter como warning não-bloqueante | Atoms incompletos feed skills downstream com info errada. Fail-fast é regra do projeto. |
| D5 | Refresh forçado em re-runs | Refresh quando `__reentryMode='re-populate'` E destExists | Sempre refresh / nunca refresh / dependente de flag | Reentrada é exatamente o upgrade path — usuário pediu atualização, então atualizar. Greenfield não dispara. |
| D6 | Versão do bump | 6.6.0 (minor) | 6.5.2 (patch) / 7.0.0 (major) | Cutover é mudança estrutural visível. Major reservado para sunset do validator (D8). |
| D7 | Local da migração v5→v6.6 | Step dedicado `migrate-knowledge-path` | Lógica inline em step existente | SRP — step novo é descobrível via registry. |
| D8 | Validator pós-init | 2 checks: primário bloqueante + secundário warning sunset v7.0.0 | Único check bloqueante / único warning | Separa "blocker" de "hint". Sunset evita validator carregar baggage indefinidamente. |
| D9 | Path traversal guard | Move 1:1 (só troca base string) | Allowlist explícita / regex+allowlist | Refactor é PATH cutover, não modelo de segurança. Allowlist cria friction para novas matrices. |

---

## Critérios de Aceite

- [ ] **CA-01 (cutover):** Dado o repo do plugin pós-merge, quando executo `ls knowledge/ && ls docs/knowledge/`, então o primeiro retorna `nodejs-typescript rails` e o segundo retorna `No such file or directory`.
- [ ] **CA-02 (linhagem):** Dado o cutover commitado, quando executo `git log --follow knowledge/nodejs-typescript/INDEX.md`, então o histórico inclui commits anteriores quando o arquivo estava em `docs/knowledge/nodejs-typescript/INDEX.md`.
- [ ] **CA-03 (sync distribuiu):** Dado `scripts/sync-to-global.sh` executado contra cache global, quando inspeciono o cache, então `~/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/nodejs-typescript/INDEX.md` existe.
- [ ] **CA-04 (sync valida):** Dado um cache global onde `knowledge/` ficou incompleto (simular removendo `nodejs-typescript/INDEX.md` antes do check final), quando rodo `sync-to-global.sh`, então o script falha com `exit 1` e mensagem `ERRO: Sync incompleto`.
- [ ] **CA-05 (init greenfield):** Dado projeto greenfield com stack nodejs-typescript detectada (via `package.json` com TypeScript), quando rodo `/anti-vibe-coding:init`, então `.claude/knowledge/nodejs-typescript/INDEX.md` existe E não há warning "Knowledge não foi copiado".
- [ ] **CA-06 (refresh em re-populate):** Dado projeto com manifest pluginVersion=6.5.0 E `.claude/knowledge/nodejs-typescript/INDEX.md` com conteúdo desatualizado, quando rodo `/init`, então o reentry-guard seta `__reentryMode='re-populate'` E o INDEX.md é reescrito com conteúdo da matrix atual.
- [ ] **CA-07 (greenfield NÃO faz refresh):** Dado projeto greenfield sem manifest, quando rodo `/init`, então `copy-knowledge` executa branch `!destExists` (cópia inicial) sem entrar no path de refresh (auditável via summary do step).
- [ ] **CA-08 (migração v5):** Dado projeto alvo com `docs/knowledge/legacy-claude-knowledge/` (artefato init v5), quando rodo `/init` em modo re-populate, então o conteúdo é movido para `docs/_legacy/knowledge/` E `docs/knowledge/legacy-claude-knowledge/` deixa de existir.
- [ ] **CA-09 (guard de colisão):** Dado projeto alvo com `docs/knowledge/legacy-claude-knowledge/` E `docs/_legacy/knowledge/` ambos pré-existentes, quando rodo `/init`, então o step `migrate-knowledge-path` aborta com mensagem `Destino já existe. Migração manual necessária`.
- [ ] **CA-10 (AbortError quando matrix ausente):** Dado plugin cache com `knowledge/` mas sem subpasta `rails/`, e projeto alvo com stack Rails detectada, quando rodo `/init`, então o `/init` aborta (não emite warning não-bloqueante) com mensagem clara.
- [ ] **CA-11 (validator primário bloqueia):** Dado projeto pós-init com stack detectada mas `.claude/knowledge/{stack}/INDEX.md` ausente, quando rodo o validator final, então o validator emite erro bloqueante.
- [ ] **CA-12 (validator secundário só avisa):** Dado projeto pós-init com `docs/knowledge/` órfão remanescente, quando rodo o validator final, então é emitido warning não-bloqueante mencionando sunset v7.0.0, sem afetar exit code.
- [ ] **CA-13 (path traversal guard intacto):** Dado primary inválido (ex: `'../etc'` ou `'foo/bar'`), quando chamo `copyKnowledge`, então o retorno é `status: 'no-source'` com mensagem mencionando a regex (comportamento idêntico ao pré-cutover).
- [ ] **CA-14 (bump propagado):** Dado o commit de bump, quando executo `grep -r '"version": "6.6.0"' package.json .claude-plugin/`, então todos os arquivos retornam match E nenhum arquivo lista 6.5.1 ou 6.5.0 (exceto histórico em CHANGELOG.md e comentários referentes às versões antigas).
- [ ] **CA-15 (harness-validate atualizado):** Dado o plugin repo pós-cutover, quando executo `bun run harness:validate` na raiz do plugin, então o validator inspeciona `knowledge/{nodejs-typescript,rails}/` (não `docs/knowledge/`) E passa quando `INDEX.md` + ≥1 atom existem em cada stack.
- [ ] **CA-16 (sync valida ambas stacks):** Dado um cache global onde apenas `knowledge/nodejs-typescript/INDEX.md` existe (rails ausente), quando rodo `sync-to-global.sh`, então o script falha com exit 1 mencionando `rails` explicitamente.

---

## Out of Scope

- Reorganização de outros assets dentro de `docs/` (decisions/, compound/, exec-plans/) — fora do escopo deste cutover.
- Mudança no formato dos atoms (`.md` continua sendo a unidade) — só path move.
- Adicionar novas stacks na matrix (nodejs-typescript e rails são as duas atuais; novas matrices ficam para PRDs próprios).
- Remover ou consolidar `--refresh-knowledge` flag CLI — flag continua existindo como opt-in explícito ortogonal ao refresh em re-populate.
- Mudança na semântica de path traversal guard (D9.A explicitamente preserva 1:1).

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Sistema arquivos plugin repo | `docs/knowledge/{nodejs-typescript,rails}/` existe com INDEX.md + atoms/ | Confirmado (ls + Read) |
| Sistema arquivos plugin repo | `git mv` suportado (preservar linhagem) | Disponível (git nativo) |
| Build / runtime | `compareSemver` lib em `skills/init/lib/semver-compare.ts` | Existente, usado em [00_2-reentry-guard.ts:41](skills/init/lib/steps/00_2-reentry-guard.ts#L41) |
| Build / runtime | `AbortError` class em `skills/init/lib/steps/abort-error.ts` | Existente |
| Build / runtime | Registry pattern em `skills/init/lib/registry.ts` | Existente — novo step encaixa após `migrate4DecisionsStep` |
| Tooling | Cache global `~/.claude/plugins/cache/local-plugins/anti-vibe-coding/{version}/` | Confirmado (installed_plugins.json pinned 6.5.1; bump 6.6.0 propaga) |
| Tooling | Pin auto em `installed_plugins.json` via Python no sync (já implementado em 6.5.1) | Existente desde 6.5.1 |
| Teste | E2E goldens `tests/e2e/__golden__/init-greenfield.stdout.txt` | Existente — pode precisar regenerar (verificar no plan-feature) |
| Teste | Fixtures referenciando `docs/knowledge/{stack}/` em 9 arquivos `.ts` (production: harness-validate.ts; tests: copy-knowledge.test.ts, atoms-frontmatter-schema.test.ts, atoms-rf11-audit.test.ts, run-stack-knowledge-init.test.ts, harness-validate-knowledge.test.ts, stack-knowledge-full-e2e.test.ts, stack-knowledge-rails-full.test.ts, migrate-claude-artifacts.test.ts) | A atualizar (substituição mecânica `docs/knowledge` → `knowledge` exceto onde representa path NO TARGET — caso de migrate-claude-artifacts que mantém `docs/knowledge/legacy-claude-knowledge/`) |
| Teste | Comentário em `state-md-init.ts:21` mencionando `docs/knowledge/` | Atualizar para `knowledge/` |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Callers de `docs/knowledge/` perdidos no grep (ex: documentação interna, scripts auxiliares) | Baixa | Médio | Grep exaustivo já feito (`Grep "docs.knowledge\|docs/knowledge"` retornou 13 arquivos `.ts`). Production: 3 (`harness-validate.ts`, `copy-knowledge.ts`, `state-md-init.ts` comentário). Migrate-claude-artifacts.ts:45 mantém `docs/knowledge/legacy-claude-knowledge/` propositalmente (target-side path, não plugin-side). Substituições mapeadas em Dependências. |
| Falsa substituição de `docs/knowledge/legacy-claude-knowledge/` (target-side, intencional) durante refactor mecânico | Média | Alto | `migrate-claude-artifacts.ts:45` é o ÚNICO uso de `docs/knowledge/` que NÃO deve ser alterado (representa destino no projeto alvo, não no plugin). Plan-feature lista explicitamente "preservar" em vez de "substituir". |
| E2E goldens (`init-greenfield.stdout.txt`) referenciam path antigo e quebram | Alta | Médio | Plan-feature inclui fase de regenerar goldens. Estado conhecido — já há test.skip em outros goldens (MEMORY.md). |
| Teste de proteção do cutover (CA-01) false-pass por cache do `fs.existsSync` | Baixa | Baixo | Usar `path.resolve` + `fs.access` async (não `existsSync`). Rodar teste em CI fresh. |
| Step novo `migrate-knowledge-path` colide com `docs/_legacy/pre-6.5.0/knowledge/` (subdir do backup pre-650) | Baixa | Médio | Guard de colisão D8 já cobre — abortar se destino existe. Plan-feature deve documentar caminho do backup pre-6.5.0 para evitar overlap. |
| Refresh em re-populate (CA-06) sobrescreve atoms customizados pelo usuário no projeto alvo | Média | Médio | Documentar em CHANGELOG: "re-populate sobrescreve `.claude/knowledge/`. Customizações devem viver em `.claude/knowledge/_overrides/` (fora do escopo deste PRD — convenção a estabelecer)". Não bloquear o PR. |
| Validator secundário (warning sunset v7.0.0) é esquecido na release major | Média | Baixo | Comentário inline `// SUNSET v7.0.0` + entry no `tech-debt-tracker.md` + grep semestral. |
| `compareSemver(version, '6.6.0')` em reentry-guard quebra projetos com manifest 6.5.x em transição | Baixa | Alto | Manifest 6.5.x → cmp = -1 → `__reentryMode='re-populate'` (comportamento correto). Testar explicitamente em fixture com manifest 6.5.0 e 6.5.1. |
| Cache global tem 6.5.0 e 6.5.1 e 6.6.0 simultaneamente; Claude Code carrega versão errada | Média | Médio | Pin via `installed_plugins.json` já implementado no sync (6.5.1). Documentar em CHANGELOG que sync 6.6.0 atualiza pin automaticamente. Arquivar 6.5.x para `_trash/` manualmente após cutover. |

---

## Decisões Resolvidas (originalmente AS — confirmadas via investigação 2026-05-19)

- **AR-01 (ex AS-01):** `backupPre650Step` ([00_3-backup-pre-6_5_0.ts:36-39](skills/init/lib/steps/00_3-backup-pre-6_5_0.ts#L36)) copia TODO `docs/` (excluindo apenas `docs/_legacy/`) para `docs/_legacy/pre-6.5.0/`. Em re-populate de prior init, isso inclui `docs/knowledge/legacy-claude-knowledge/` — comportamento esperado e desejável (preserva histórico). **Sem colisão** pois o backup é idempotente (timestamped: linha 43 cria `docs/_legacy/pre-6.5.0-{ts}/` em segunda execução). O novo step `migrate-knowledge-path` roda APÓS `migrate4DecisionsStep` (que via `migrate-claude-artifacts.ts:45` popula `docs/knowledge/legacy-claude-knowledge/`), então a sequência é: (1) backupPre650 copia tudo defensivamente, (2) migrate-* popula legacy-claude-knowledge, (3) migrate-knowledge-path move para `docs/_legacy/knowledge/`.

- **AR-02 (ex AS-02):** Stack canônica = AMBAS `nodejs-typescript` E `rails` (CH-02 promovido para MH-03). Cost é trivial (1 linha extra de check pós-sync), benefício é detectar drift assimétrico. Tests em [stack-knowledge-rails-full.test.ts](tests/e2e/stack-knowledge-rails-full.test.ts) e [stack-knowledge-full-e2e.test.ts](tests/e2e/stack-knowledge-full-e2e.test.ts) já exercitam ambas.

- **AR-03 (ex AS-03):** Numbering `13_1-migrate-knowledge-path` confirmado. Padrão `NN_M-` já em uso: `00_1-reuse-discovery`, `00_2-reentry-guard`, `00_3-backup-pre-6_5_0`, `03_1-persist-stack-and-knowledge`, `09_1-migrate-all-orchestrate`. Posição no registry: entre `migrate4DecisionsStep` (id `13-migrate-4-decisions`) e `scaffoldFullTreeStep`.

- **AR-04 (ex AS-04):** Não existe `skills/init/lib/constants.ts`. Constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` fica inline no topo de `00_2-reentry-guard.ts`, seguindo o padrão de `ABORT_MESSAGE` que já mora lá ([linha 8](skills/init/lib/steps/00_2-reentry-guard.ts#L8)). Não vale criar módulo de constantes para 1 valor.

- **AR-05 (ex AS-05):** **Existem DOIS validadores tocando paths de knowledge** — descoberta importante:
  1. **`Step 90 final-validation.ts`** (runtime, durante `/init`): walks `docs/` do target, sem checks específicos para knowledge hoje. Recebe os checks D8.C (primário + secundário) deste PRD → SH-04.
  2. **`scripts/harness-validate.ts:checkKnowledgePresence`** ([linha 654-706](scripts/harness-validate.ts#L654-L706)): standalone, invocado via `bun run harness:validate`. Checa `docs/knowledge/{stack}/INDEX.md` e `atoms/`. Roda principalmente como auto-check do próprio plugin (`bun scripts/harness-validate.ts .` — root é o plugin). **Pós-cutover, o path em harness-validate.ts:659 muda de `docs/knowledge/` para `knowledge/`** → MH-05.
  - Test fixture afetado: [tests/harness-validate-knowledge.test.ts](tests/harness-validate-knowledge.test.ts) — referencia `docs/knowledge/nodejs-typescript/{INDEX.md,atoms/}` em 7 lugares.

---

## Distribuição MoSCoW

- **Must Have:** 5 (38%) ✓ dentro do limite de 40%
- **Should Have:** 4
- **Could Have:** 2 (CH-02 promovido para MH-03)
- **Won't Have:** 5

Total: 11 requisitos funcionais + 5 won't-have. Must Have minimalista — sem os 5 itens MH, a feature não cumpre nenhum outcome do PRD.

---

## Próximos Passos

1. **Aprovar PRD** — confirmar AS-01 a AS-05 ou ajustar.
2. **`/anti-vibe-coding:plan-feature`** — quebrar em planos e fases (estimativa: 5-7 fases com vertical slices).
3. **`/anti-vibe-coding:execute-plan`** — execução wave-based.
4. **Pós-merge:** rodar `/anti-vibe-coding:lessons-learned` registrando a lição "docs/ = dog-food; runtime asset deve viver fora".
