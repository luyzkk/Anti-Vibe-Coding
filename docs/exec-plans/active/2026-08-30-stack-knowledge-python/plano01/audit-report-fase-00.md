# Audit Report — Fase 00 (pré-RED, RF11/R1)

**Data:** 2026-08-30  |  **Branch:** feat/stack-knowledge-python-plano01

Auditoria dos testes/goldens/scripts que enumeram `knowledge/`, `MATRIX_FOLDER_VALUES` ou o
comportamento python-sem-matrix, executada ANTES de qualquer mudança de produção. Nenhum arquivo
fora de `docs/exec-plans/` foi tocado nesta fase.

---

## Baseline (antes de qualquer mudança)

| Gate | Comando | Resultado |
|---|---|---|
| Testes | `bun run test` | **1787 pass / 0 fail / 0 skip** em 265 arquivos (lote 1: 1228 pass em 175 arq., 13.44s; lote 2: 559 pass em 90 arq., 2.70s) — exit 0 |
| TypeCheck | `bun run typecheck` (`tsc --noEmit`) | **limpo, exit 0, zero erros** |
| Harness | `bun run harness:validate` | **passed** (28 required files, 374 markdown files checked) |
| Compound | `bun run compound:check` | **passed** (55 compound notes validated) |

### F1 — GT-01 não reproduz mais (baseline melhor que o planejado)

O corpo desta fase antecipava `bun run typecheck` "limpo exceto GT-01 pré-existente
(`lazy-import.test.ts` + `subagent-contract.ts`)". **Esses erros não existem mais** — o typecheck
retorna zero erros. Consequência prática: o baseline é mais forte do que o plano assumia, e
**qualquer erro de typecheck a partir daqui é atribuível a esta feature**, sem ruído herdado.
Nenhuma ação necessária; a menção a GT-01 nos docs do plano está obsoleta.

### F2 — `bun test` (builtin) ≠ `bun run test` (suíte canônica)

Distinção que precisa ficar registrada, porque os dois comandos divergem no veredito:

- `bun run test` → `bun run scripts/run-tests.ts`, wrapper que enumera explicitamente
  `tests|skills|scripts/**/*.test.{ts,tsx}` e faz batching por limite de linha de comando do
  Windows. **É a suíte canônica: verde, exit 0.**
- `bun test` (builtin) glob-a `*.test.*` e portanto arrasta `tests/hooks/*.test.cjs`, que o
  wrapper deliberadamente não inclui. Nessa via,
  `pre-tool-use-destructive-guard.test.cjs` reporta `16/17 passed` (o caso de remoção recursiva
  de `/tmp/x` retorna `code: null, stderr: ""`) e o processo sai 1.

Diagnóstico: **pré-existente e não relacionado a esta feature.** O `.cjs` é um smoke script
auto-executável (não usa `bun:test`); rodado direto, passa 17/17 — verificado 3x, exit 0 nas 3.
A falha só aparece quando o runner do bun carrega o arquivo, cenário em que o spawn do hook
retorna `code: null`. Último commit no arquivo: `c0f3eb0` (2026-05-13), muito anterior a esta
feature. **Não corrigido aqui** (fora de escopo, conforme Passo 4 da fase). Os gates desta feature
usam `bun run test`.

### F3 — contagem real de átomos por matrix (hoje)

`knowledge/nodejs-typescript/` = 14 · `knowledge/rails/` = 14 · `knowledge/nextjs/` = **15**.
Relevante porque vários testes fixam `toBe(14)`: nenhum deles é global — todos são escopados a uma
matrix específica (ver tabela de não-afetados). `knowledge/python/` ainda não existe.

---

## Afetados catalogados

| # | Arquivo | O que enumera | Quebra quando `knowledge/python/` aparecer? | Fase que corrige |
|---|---------|---------------|---------------------------------------------|------------------|
| 1 | `scripts/harness-validate.ts` (`checkKnowledgePresence`, L670-723) | `fs.readdir(knowledge/)` — itera **toda** subpasta e exige `INDEX.md` + ≥1 `.md` em `atoms/` | **SIM.** É o único ponto do repo que varre a árvore inteira. `knowledge/python/` com `atoms/` vazia gera 2 failures `[knowledge-presence]` | fase-03 (commit bundle 01+02+03) |

**Só há um afetado.** Isso é a prova mecânica do **G1**: não existe estado intermediário
commitável entre "criar a pasta" e "ter o primeiro átomo". Por isso as fases 01+02+03 entram num
único commit e nada é commitado entre elas.

---

## Não-afetados verificados

Cada arquivo abaixo foi **aberto e lido** (não apenas grepado). Todos caem em um de dois padrões:
escopados a uma matrix específica, ou operando sobre fixture sintética em `tmpdir` — nunca sobre a
árvore `knowledge/` real como conjunto.

### Já suportam Python hoje (confirmam a premissa "zero trabalho de detector")

| Arquivo | Evidência |
|---|---|
| `skills/init/lib/stack-id-map.ts:17-24, 45-57` | `'python'` **já está** em `MATRIX_FOLDER_VALUES` e `STACK_ID_TO_MATRIX_FOLDER['python'] = 'python'`. Nenhuma mudança necessária |
| `skills/init/lib/stack-id-map.test.ts:10` | `isMatrixFolder('python')` → `true`; passa hoje e continua passando |
| `skills/init/lib/detect-stack.ts:147, 164` | `probePython` existe e está registrado em `PROBES` |
| `skills/init/lib/detect-stack.test.ts:51-54` | `detects python from pyproject.toml` já verde — detector independe da pasta da matrix |
| `skills/init/lib/write-stack-json.test.ts:206` | já exercita `primary: 'python'` com anchor `pyproject.toml` |
| `skills/init/lib/stack-aware-input-paths.test.ts:126-180` | 3 testes Python já verdes (mapa estático, sem I/O em `knowledge/`) |
| `skills/init/lib/copy-knowledge.ts:81` | `throw new AbortError` confirmado **exatamente na linha 81** — o bug que a feature corrige |

### Escopados a uma matrix específica (Python é aditivo)

| Arquivo | Escopo real |
|---|---|
| `tests/e2e/stack-knowledge-full-e2e.test.ts:19-20,36,132` | `ATOMS_DIR = knowledge/nodejs-typescript/atoms` |
| `tests/e2e/stack-knowledge-rails-full.test.ts:18,47,70,188` | `RAILS_MATRIX = knowledge/rails` |
| `tests/e2e/stack-knowledge-rails-tracer.test.ts` | rails |
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts:94` | node; `atomCount >= 1` (não fixa total) |
| `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts:135-202` | só `react`/`nextjs` no `STACK_ID_TO_MATRIX_FOLDER` |
| `skills/init/lib/atoms-frontmatter-schema.test.ts:124` | `knowledge/nodejs-typescript` (14) + fixture `rails-atoms-dummy` (2). **É a suíte de regressão CA-03 da fase-02** |
| `skills/init/lib/atoms-rf11-audit.test.ts:10` | `knowledge/nodejs-typescript` |
| `skills/init/lib/run-stack-knowledge-init.test.ts:35` | `PLUGIN_ROOT` real, mas alvo Node-TS → conta só `nodejs-typescript` |

### Operam sobre fixture sintética (nunca leem `knowledge/` do repo)

| Arquivo | Evidência |
|---|---|
| `tests/harness-validate-knowledge.test.ts` | monta `tests/__fixtures__/harness-knowledge/` e passa `FIXTURE` como `base` para `checkKnowledgePresence` |
| `skills/init/lib/copy-knowledge.test.ts` | `pluginRoot` em `mkdtempSync`; o teste de `AbortError` usa `primary: 'rails'` contra fixture que só tem `nodejs-typescript` |
| `tests/e2e/stack-aware-preface-all-skills.test.ts` | itera os **7 nomes de skill**, não matrizes; `.claude/knowledge/INDEX.md` em `tmpdir` |

### Sem relação com enumeração de matrix

| Arquivo | Por quê |
|---|---|
| `tests/repo-structure/knowledge-path.test.ts` | exige `knowledge/` + (`nodejs-typescript` **OU** `rails`) `INDEX.md` — condição OR, aditiva |
| `tests/e2e/__golden__/init-greenfield.tree.json:8-25` | árvore do **projeto alvo** greenfield (Node-TS): `.claude/knowledge/` com 14 átomos + INDEX + `.gitkeep`. Python não aparece |
| `tests/e2e/__golden__/init-greenfield.stdout.txt:20-23` | `primary = nodejs-typescript ... 16 atoms`. Não lista stacks disponíveis |
| `skills/init/lib/detect-multi-stack.test.ts:82-93` | `recognized_no_matrix` usa `go` (sem matrix), não python |
| `skills/init/lib/steps/10-final-validation(.test).ts` | valida `.claude/knowledge/INDEX.md` no alvo |
| `skills/security/lib/stack-aware-preface(.test).ts` | constante de path `.claude/knowledge/INDEX.md` |
| `skills/lib/telemetry-{types,utils}(.test).ts`, `emit-stack-knowledge-events.test.ts` | `atom_count` é campo numérico com mock literal `14` |
| `skills/init/lib/{state-md-init,detect-v5-legacy,registry}.*`, `steps/04-migrate-planning-and-manifest.ts` | paths de string, sem asserção sobre matrizes |

### Falsos-alarmes do grep

- `scripts/sync-to-global.sh:197-227` — "python" é o **interpretador** usado para editar JSON, nada a ver com a stack.
- `tests/fixtures/inverted-merge-v6.4/CLAUDE.md` — blocos de código com info-string `python` em fixture de conteúdo.
- `toBe(3)` em `parity-gaps-writer`, `todo-utils-pick`, `architecture-detector/types`, `migrate`, `migration-planner`, `template-manifest` — números de domínios não relacionados (ruído do grep 4).
- Hits em `docs/exec-plans/completed/**` — histórico dos planos Rails/Node/Next, não são afetados.

---

## Verificações de pré-requisito (para as fases seguintes)

- **Compound lessons presentes** (entram VERBATIM nos prompts a partir da fase-03, G8):
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (47 linhas) e
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` (48 linhas). Também
  presente `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md` (67 linhas), regressão a
  preservar no TDD da fase-02 (G4).
- **Fonte congelada e gitignored (G2):** `Infos/knowledge/Python/` contém os 10 compass artifacts
  com os IDs citados no plano (incl. `63884763` = fonte do piloto), 6 `deep-research-report*.md`
  e os 5 skill packages. `git check-ignore` confirma `.gitignore:59 → Infos/` — os paths em
  `sources:` são audit trail local por design (RF13).

---

## Nota operacional descoberta na execução

O hook `hooks/pre-tool-use-destructive-guard.cjs` do próprio repo **bloqueia comandos Bash cujo
texto contenha padrões destrutivos — inclusive quando o padrão aparece apenas como conteúdo de
documentação** (foi o que ocorreu ao escrever este report via heredoc citando o nome do caso de
teste do F2). Escrever arquivos que documentam comandos destrutivos deve usar a ferramenta de
escrita direta, não `cat <<EOF`. Não usar `AVC_ALLOW_DESTRUCTIVE=1` para contornar.

---

## Conclusão

Suite verde nos 4 gates. **Um único afetado** (`harness-validate.ts`), com mitigação já prevista
no plano (bundle da fase-03). Nenhum teste precisa ser reescrito nas fases 01-05, e nenhum golden
precisa ser regenerado por causa desta feature. Nenhum item "a investigar" pendente.
