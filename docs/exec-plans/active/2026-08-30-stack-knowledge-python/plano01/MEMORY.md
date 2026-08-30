# Memoria: Plano 01 — Infra + Validador + Piloto + Tracer Bullet

**Feature:** Stack Knowledge Python
**Iniciado:** 2026-08-30
**Status:** em andamento

---

## Decisoes de Implementacao

- **DI-1 (fase-00):** os artefatos de planejamento estavam **untracked** no repo. Foram commitados
  num commit proprio (`7490ea5`) ANTES do commit do audit-report (`b68ca5f`).
  - Por que: o criterio de aceite da fase-00 exige `git show --stat HEAD` com exatamente 1 arquivo.
    Juntar tudo num commit so violaria o criterio; deixar o plano fora do git deixaria a branch sem
    o contrato que ela executa.
  - Impacto: nenhum no conteudo do plano. Nao viola G1 (nenhum dos dois commits toca `knowledge/`,
    logo `[knowledge-presence]` nao e exercitado).

- **DI-2 (fase-00):** gates desta feature usam **`bun run test`**, nao `bun test`. Ver GT-2.

---

## Bugs Descobertos

Nenhum bug de produto nesta fase (fase de auditoria, sem codigo de producao tocado).

---

## Gotchas

- **GT-1 — o hook destructive-guard do proprio repo bloqueia heredoc de documentacao.**
  - Descoberto em: fase-00, ao escrever o audit-report via `cat <<EOF`.
  - Sintoma: `hooks/pre-tool-use-destructive-guard.cjs` casa padroes destrutivos contra o **texto
    inteiro do comando Bash**, sem distinguir comando de conteudo. Citar o nome de um caso de teste
    que contem um padrao destrutivo dentro de um heredoc e suficiente para bloquear a escrita.
  - Impacto: escrever arquivos que **documentam** comandos destrutivos exige a ferramenta de escrita
    direta (Write), nao heredoc. Nao usar `AVC_ALLOW_DESTRUCTIVE=1` para contornar — o guard esta
    correto em ser conservador; o custo e trivial.
  - Vale para Planos 02-04: os atomos de seguranca/deployment/debugging vao citar comandos perigosos
    como exemplo. **Escrever atomo sempre via Write, nunca via heredoc.**

- **GT-2 — `bun test` (builtin) diverge de `bun run test` (suite canonica).**
  - Descoberto em: fase-00, baseline.
  - `bun run test` -> `scripts/run-tests.ts`, que enumera explicitamente
    `tests|skills|scripts/**/*.test.{ts,tsx}` e faz batching pelo limite de linha de comando do
    Windows. Verde: 1787 pass / 0 fail / 265 arquivos.
  - `bun test` (builtin) glob-a `*.test.*`, arrastando `tests/hooks/*.test.cjs` que o wrapper
    deliberadamente exclui — e sai 1 por causa de `pre-tool-use-destructive-guard.test.cjs`
    (16/17). Esse `.cjs` passa 17/17 quando rodado isolado (3x verificado); a falha e artefato de
    ser carregado pelo runner do bun. Pre-existente (ultimo commit no arquivo: `c0f3eb0`,
    2026-05-13), **fora do escopo desta feature**.
  - Impacto: qualquer fase que reportar "bun test vermelho" precisa antes checar QUAL comando rodou.

- **GT-3 — `harness:validate` nao faz crawl de `docs/exec-plans/`.**
  - Descoberto em: fase-00 (a contagem de markdown ficou em 374 antes e depois de adicionar o
    audit-report).
  - Causa: `SKIP_DIRS` em `scripts/harness-validate.ts:79` inclui `'exec-plans'` (razao documentada
    na linha 74: links relativos geram falsos positivos inevitaveis).
  - Impacto: link quebrado dentro de um doc de fase **nao e pego** pelo gate. Revisao e humana.
    O check de `docs/exec-plans/active` que existe (linha 327) e outro: "parece completo mas ainda
    esta em active/" — relevante so no closeout (Plano 04 fase-07).

---

## Desvios do Plano

- **DEV-1 (fase-00):** o corpo da fase antecipava typecheck "limpo exceto GT-01 pre-existente
  (`lazy-import.test.ts` + `subagent-contract.ts`)". Esses erros **nao existem mais** — `tsc
  --noEmit` retorna zero erros.
  - Motivo: corrigidos entre o planejamento e a execucao (o plano herdou a nota do MEMORY global,
    que ficou obsoleta).
  - Impacto: **positivo** — baseline mais forte. Qualquer erro de typecheck daqui pra frente e
    atribuivel a esta feature, sem ruido herdado. Nenhuma acao necessaria.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 1 (fase-00) |
| Fases com desvio | 1 (fase-00 — DEV-1, desvio favoravel) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Preenchimento final ao concluir o Plano 01. Ja consolidado da fase-00:

- **Premissa 1 do PRD confirmada por leitura:** `'python'` ja esta em `MATRIX_FOLDER_VALUES`
  (`stack-id-map.ts:17-24`) e `STACK_ID_TO_MATRIX_FOLDER['python'] = 'python'` (linha 55).
  `probePython` ativo em `detect-stack.ts:147` e registrado em `PROBES` (linha 164).
  O `AbortError` esta exatamente em `copy-knowledge.ts:81`. **Zero mudanca de detector confirmada.**
- **Unico afetado por knowledge/python/ existir:** `scripts/harness-validate.ts`
  (`checkKnowledgePresence`, L670-723) — unico ponto do repo que varre a arvore inteira de
  `knowledge/`. Mitigacao = bundle da fase-03. Nenhum outro teste ou golden precisa ser tocado.
- **Contagem atual por matrix:** nodejs-typescript 14, rails 14, nextjs 15. Todos os `toBe(14)`
  do repo sao escopados a uma matrix especifica — Python e puramente aditivo.
- **Regressao CA-03 da fase-02 mora em** `skills/init/lib/atoms-frontmatter-schema.test.ts`
  (14 atomos Node reais + 2 dummies Rails). E o arquivo a nao quebrar ao estender o validador.
- **Fontes conferidas e presentes** em `Infos/knowledge/Python/` (gitignored via `.gitignore:59`):
  os 10 compass artifacts com os IDs citados no plano (incl. `63884763`, fonte do piloto),
  6 `deep-research-report*.md` e 5 skill packages.
- Ver GT-1 (escrever atomo via Write, nunca heredoc) e GT-2 (`bun run test`, nao `bun test`).

---

<!-- Atualizado automaticamente durante execucao -->
