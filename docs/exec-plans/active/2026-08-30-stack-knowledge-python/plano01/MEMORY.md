# Memoria: Plano 01 — Infra + Validador + Piloto + Tracer Bullet

**Feature:** Stack Knowledge Python
**Iniciado:** 2026-08-30
**Status:** concluido

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

- **DI-3 (fase-02):** o exemplo dentro da mensagem de erro de item invalido e **parametrizado por
  campo**, nao fixo. `OPTIONAL_VERSION_FIELDS` virou `ReadonlyArray<{ field, example }>` com
  `rails_versions -> '>=7.1'` e `python_versions -> '>=3.11'`.
  - Por que: o snippet do Passo 2 da fase-02 hardcodeava `(e.g. >=3.11)` para os dois campos, o
    que mudaria a mensagem de `rails_versions` — contradizendo a exigencia, na MESMA fase, de
    preservar as mensagens de Rails byte a byte. Nenhum teste assertava essa substring, entao o
    erro teria passado silencioso ate alguem depender da mensagem.
  - Impacto: doc da fase-02 CORRIGIDO em disco (snippet + nota na secao Gotchas). Planos 02-04
    herdam a versao corrigida.
  - Verificado: `rails_versions item "..." does not match semver range format (e.g. >=7.1)` e
    `python_versions item "..." ... (e.g. >=3.11)`.

---

## Bugs Descobertos

Nenhum bug de produto ate aqui. O defeito encontrado na fase-02 era do PLANO, nao do codigo —
ver DI-3.

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
    como exemplo. **Escrever atomo sempre via Write, nunca via heredoc.** Instrucao ja incluida no
    prompt do extrator da fase-03 — manter nos prompts dos proximos batches.
  - 2026-08-30: o guard foi endurecido em `1401233` (cobre `update-ref`, formas longas de `-D` e
    poda de reflog). Mais um motivo para nao tentar contornar por Bash.

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

## Calibracao do protocolo extrator+verifier (piloto — herdado pelos Planos 02-04)

O piloto existe para calibrar o gate ANTES dos 17 atomos restantes. Numeros reais:

| Medida | Valor | Leitura |
|---|---|---|
| Verifier v1 | **5/5 (100%)** | Gate e >=4/5. Passou de primeira, sem ciclo de polish |
| Corpo do atomo | **182 / 200 linhas** | Fonte de 506 linhas -> 182. Taxa de compressao ~2.8:1 |
| Arquivo total | 195 / 220 linhas | |
| Patterns | 13 | todos com Regra-fonte identificada |
| Anti-padroes | 6 | |
| Ciclos de rework | 0 | |
| `python_versions` | `['>=3.11']` | confirmado (piso: `asyncio.TaskGroup` e 3.11+) |

**O prompt do extrator funcionou de primeira** — a clausula anti-drift verbatim fez o subagente
DESCARTAR 4 claims por conta propria (lock distribuido tipo Redlock, ferramentas de deteccao de
race, numeros de throughput hipoteticos, e um "quando NAO usar" de idempotencia), todas
plausiveis e todas ausentes da fonte. E exatamente o modo de falha que a compound lesson de
2026-05-16 descreve. **Reusar o prompt como esta nos Planos 02-04.**

**Achado que vale herdar no prompt do verifier:** alem de rastreabilidade, o verifier pegou uma
**amplificacao de tom** — o atomo escrevia "nunca `wait_for`" enquanto a fonte (Regra 2.2) diz
"em vez de", preferencia idiomatica marcada como Consenso simples. O "Nunca" da fonte pertence a
outra clausula (nunca engula `CancelledError`). Substancia rastreavel, certeza inflada.
Corrigido cirurgicamente para "preferivel a `wait_for`". Isso e um eixo DISTINTO do gate X/5 e
distinto de "contestado virou regra dura" — vale manter a checagem explicita nos proximos batches.

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | **6/6** (fase-00 a fase-05) |
| Fases com desvio | 2 (fase-00 DEV-1 favoravel; fase-02 DI-3 correcao de plano) |
| Bugs encontrados | 0 no codigo; 1 no plano (DI-3) |
| Retries necessarios | 0 (verifier passou 5/5 na v1; nenhum RED precisou de 2a tentativa) |
| Commits | 6 (`b68ca5f` audit, `00f4d07` bundle 01+02+03, `678089e` tracer, `6486811` warning, + 2 de bookkeeping) |
| Suite ao fechar | 1809 pass / 0 fail (baseline da fase-00 era 1787) |

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
- **Commit bundle 01+02+03 fechado em `00f4d07`.** `harness:validate` subiu de 374 para 376 md
  (INDEX + atomo entraram no crawl de `knowledge/`, que — diferente de `docs/exec-plans/` — nao
  esta em SKIP_DIRS). G1 fechado: nunca houve commit intermediario com `atoms/` vazia.
- **Backlog do cap registrado no TODO.md** (2026-08-30): Regras 2.3, 4.2-parcial, 5.1, 8.2 e 9.2
  da fonte ficaram de fora do piloto. Candidatos naturais ja mapeados —
  `background-jobs-and-queues` (Plano 04 fase-01) absorve 4.2/5.1;
  `deployment-and-production` (Plano 03 fase-08) absorve 9.2.
- **Formato do atomo que passou no gate:** H1, `## Quando consultar` (4-6 bullets),
  `## Padroes senior` com `### Pattern: {nome}` + 4 bullets em negrito
  (Problema/Padrao/Quando usar/Quando NAO usar), `## Anti-padroes` com Sintoma/Correcao,
  `## Criterios de decisao` com tabela `| Cenario | Escolha |`, `## Referencias externas`.
  Espelha `knowledge/rails/atoms/active-record-fundamentals.md`.

### PREMISSA 1 PROVADA — go para os Planos 02-04

`tests/e2e/stack-knowledge-python-tracer.test.ts` passa 4/4. `runStackKnowledgeInit` resolve
**sem throw** num projeto Python, devolve `stackPrimary='python'`, `copyResult.status='copied'`,
e grava INDEX + piloto em `.claude/knowledge/`. **A infra funciona com `primary='python'` sem
uma linha de mudanca no core** — `copyKnowledge`, `detect-stack`, `stack-aware-preface` e
`emitStackKnowledgeEvents` seguem intocados. O AbortError de `copy-knowledge.ts:81` morreu por
existencia da pasta, exatamente como o PRD previu.

### O que os Planos 02-04 herdam sem re-decidir

- **Prompt do extrator:** reusar como esta (clausula anti-drift verbatim + liberdade de nao
  cobrir tudo + restricoes de "contestado"/versao/PT-BR + instrucao de escrever via Write).
  Calibrado: 5/5 na v1, com o subagente descartando 4 claims por conta propria.
- **Prompt do verifier:** protocolo de escopo verbatim (3 secoes tecnicas apenas) + as
  checagens extras (cap de linhas, 4 secoes, placeholders, "contestado" virou regra dura,
  conhecimento injetado). **Adicionar a checagem de amplificacao de tom** — foi o unico achado
  real do piloto e nao estava no protocolo original.
- **`atomCount` sempre dinamico** nos testes (`>= 1`), nunca literal. O tracer da fase-04 e o
  teste de telemetria da fase-05 ja seguem isso e nao devem precisar de edicao quando os 17
  atomos restantes entrarem.
- **`MANIFEST_MAX_BYTES`** (ex-`GEMFILE_MAX_BYTES`) e a constante de cap de leitura de manifest
  em `run-stack-knowledge-init.ts` — se algum plano futuro ler outro manifest, reusar.
- **Warning legado ja fechado** — nao reimplementar. `>=3.9`/`>=3.10` avisam; `>=3.11`/`>=3.12`
  nao; `^3.10`, ausente e TOML torto nao avisam por design (R7).

---

<!-- Atualizado automaticamente durante execucao -->
