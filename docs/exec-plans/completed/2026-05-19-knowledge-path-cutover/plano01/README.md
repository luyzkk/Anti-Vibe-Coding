# Plano 01: Cutover Foundation + Distribuicao

**Feature:** Knowledge Path Cutover (docs/knowledge → knowledge/) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~6h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Reentrada + Migracao V5 + Validator Pos-Init)

---

## O que este plano entrega

Ao concluir este plano, o path `docs/knowledge/` deixa de existir no plugin, `knowledge/` na raiz
passa a ser o runtime asset distribuido pelo sync, e `/init` em projeto greenfield copia
`knowledge/{stack}/` para `.claude/knowledge/{stack}/` sem emitir warning. O cache global fica
bloqueante (exit 1) se a copia ficar incompleta.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `docs/knowledge/nodejs-typescript/` + `docs/knowledge/rails/` com INDEX.md + atoms/ | Repo atual (confirmado) | Pronto |
| `git mv` disponivel (preserva linhagem) | Git nativo | Disponivel |
| `AbortError` class em `skills/init/lib/steps/abort-error.ts` | Codebase atual | Pronto |
| `compareSemver` em `skills/init/lib/semver-compare.ts` | Codebase atual (usado em 00_2-reentry-guard.ts) | Pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `knowledge/` na raiz do plugin (path estabelecido) | Plano 02 — re-populate path so faz sentido com cache global entregando `knowledge/` |
| `copy-knowledge.ts` apontando para `knowledge/` | Plano 02 fase-01 (refresh-on-reentry usa mesmo path) |
| `AbortError` lancado quando matrix ausente (fase-05) | Plano 02 — caller `03_1-persist-stack-and-knowledge.ts` propagara |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-protection-test-and-git-mv.md | Teste de protecao + `git mv` + path minimo em copy-knowledge.ts | ~1.5h | — |
| 02 | fase-02-version-bump-6.6.0.md | Bump 6.5.1 → 6.6.0 em 7 arquivos | ~1h | fase-01 (path novo deve existir) |
| 03 | fase-03-copy-knowledge-paths-and-messages.md | Mensagens de erro + defense-in-depth guard atualizados | ~45min | fase-01 |
| 04 | fase-04-sync-distribution-and-validation.md | `sync-to-global.sh` copia + valida AMBAS stacks | ~1h | fase-01 |
| 05 | fase-05-abort-error-promotion.md | `AbortError` quando matrix detectada mas ausente | ~1h | fase-03 (paths corretos) |
| 06 | fase-06-fixtures-and-goldens-regen.md | 9 fixtures + harness-validate + goldens regenerados | ~1.5h | fase-01, 02, 03, 05 |

---

## Grafo de Fases

```
fase-01 (protection-test-and-git-mv)
    |
    +-------------------------------+
    |                               |
    v                               v
fase-02 (version-bump-6.6.0)   fase-03 (copy-knowledge-paths-and-messages)
    |                               |
    |                    +----------+
    |                    |
    |                    v
    |               fase-04 (sync-distribution-and-validation)
    |                    |
    |               fase-05 (abort-error-promotion)
    |                    |
    +--------------------+
                         |
                         v
               fase-06 (fixtures-and-goldens-regen)
```

**Paralelismo possivel:** fase-02 e fase-03 podem rodar em paralelo apos fase-01 ser concluida
(ambas dependem do path novo existir, mas nao se bloqueiam mutuamente). fase-04 depende de
fase-03 (nenhuma dependencia de fase-02). fase-05 depende de fase-03 (guards corretos). fase-06
depende de tudo: path final (fase-01), mensagens certas (fase-03), guards certos (fase-05) e
bump certo (fase-02).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-01 — o slice mais fino que prova o cutover end-to-end: teste
de protecao RED (verifica que `knowledge/INDEX.md` existe E que `docs/knowledge/` nao existe) →
`git mv docs/knowledge knowledge` → update minimo de `copy-knowledge.ts:58` → teste GREEN.

---

## Gotchas Conhecidos

- **G1 (falsa substituicao):** `migrate-claude-artifacts.ts:45` usa `docs/knowledge/legacy-claude-knowledge/` que representa um path NO PROJETO ALVO (target-side), nao no plugin. Esta string NAO deve ser alterada em nenhuma fase deste plano. Ver fase-06 para instrucao explicita "PRESERVAR". Ver PRD Riscos.

- **G2 (defense-in-depth references `knowledgeBase`):** As strings de erro em `copy-knowledge.ts:53,76` e o check de defense-in-depth (linha 62) referenciam `docs/knowledge/`. Na fase-03, ao atualizar as mensagens, a variavel `knowledgeBase` tambem muda de `path.resolve(pluginRoot, 'docs', 'knowledge')` para `path.resolve(pluginRoot, 'knowledge')`. Atualizar AMBOS: a variavel E as strings interpoladas que ainda citam `docs/knowledge/`.

- **G3 (fs.access async para protection test):** O teste de protecao (fase-01) deve usar `fs.access` async ou `fs.promises.access`, NAO `fs.existsSync` — `existsSync` pode retornar falso-positivo por cache do SO durante a mesma sessao do processo. Ver PRD Riscos.

- **G4 (git mv preserva linhagem):** Usar exclusivamente `git mv docs/knowledge knowledge` — nunca `cp` + `rm`. O CA-02 verifica que `git log --follow knowledge/nodejs-typescript/INDEX.md` mostra historico do path antigo. Se for feito como rm+add, o historico sera perdido.

- **G5 (7 arquivos no bump, nao 6):** Os 7 locais do bump 6.5.1 → 6.6.0 sao: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin-manifest.json`, `scripts/sync-to-global.sh:18` (default `PLUGIN_VERSION`), `skills/init/lib/run-init.ts:32` (fallback hardcoded), e a constante `KNOWLEDGE_PATH_CUTOVER_VERSION` inline em `00_2-reentry-guard.ts` (nao editar o compareSemver call diretamente — adicionar constante). Ver AR-04 e fase-02.

- **G6 (reentry-guard threshold muda semantica):** A constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` substitui o literal `'6.5.0'` na chamada `compareSemver(manifestVersion, '6.5.0')`. Apos a mudanca, projetos com manifest 6.5.0 ou 6.5.1 entram em `re-populate` (comportamento correto — precisam refresh do novo path). Projetos com manifest 6.6.0+ sao abortados (ja estao na versao atual). Verificar com fixture 6.5.0 e 6.5.1 antes de commitar.

- **G7 (sync check valida AMBAS stacks):** Diferente do snipppet original do PRD secao "Mecanismo 3" que validava apenas `nodejs-typescript`, MH-03 promoveu o check para AMBAS stacks canonicas. Ver fase-04 para snippet correto com loop ou dois `[ -f ]` checks.

- **G8 (harness-validate eh segundo validador):** AR-05 confirma que existem DOIS validadores: `scripts/harness-validate.ts:checkKnowledgePresence` (standalone, `bun run harness:validate`) E `skills/init/lib/steps/90-final-validation.ts` (runtime). A fase-06 so toca o harness-validate (MH-05). O `90-final-validation.ts` e escopo de Plano 02 fase-03.

- **G9 (AbortError e CA-13 sao ortogonais):** Na fase-05, o `AbortError` e lancado quando `primary !== null` (stack detectada) E `sourceExists === false` (matrix ausente no plugin). O retorno `status: 'no-source'` para path traversal (VALID_PRIMARY falha) PERMANECE como retorno, nao como AbortError — esses sao dois casos distintos. CA-13 testa o path traversal; CA-10 testa o AbortError.

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
