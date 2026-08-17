# Memory: Plano 02 — Vocabulario de Seam

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **concluido** — 3 de 3 fases executadas em 2026-08-12
**Depende de:** plano01 fase-01 (a `writing-for-agents` e a lente contra a qual este material e
escrito) — **satisfeita**, plano01 mergeado em 2026-08-12

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Expandir a referencia | **done** | 1/1 (+ `plugin-manifest.json` regerado) |
| 02 | Ponteiros de descoberta | **done** | 3/3 (+ `plugin-manifest.json` regerado) |
| 03 | 5o dominio no design-twice | **done** | 1/1 (+ `plugin-manifest.json` regerado) |

## Decisoes de implementacao (DI)

Formato: `DI-Plano02-faseNN-<slug>: <o que mudou e por que>`.

- **DI-Plano02-fase01-nao-citar-a-metrica-verbatim**: o Passo 1 pede o motivo da remocao escrito no
  proprio doc, e a primeira redacao citava a metrica antiga verbatim — o que derrubaria o criterio de
  maquina `grep -c "linhas que a implementacao" == 0`. Reescrito para descrever o mecanismo
  ("ratio bruto de tamanho entre interface e implementacao") sem reproduzir a frase. Mesmo padrao ja
  registrado em `DI-Plano03-fase01-meta-test-D4-sem-comentario`: descrever uma ausencia mencionando o
  token banido reprova o gate. Bonus alinhado a lente: proibicao verbatim arrasta o comportamento
  proibido para o contexto.
- **DI-Plano02-fase01-quarto-ponteiro**: o `MEMORY.md` listava 3 ponteiros; sao **4**.
  `skills/tdd-workflow/references/ia-tdd-workflow.md:39` referencia `references/deep-modules.md`
  (path relativo, por isso escapou do grep ancorado no path completo). Os 4 resolvem apos a mudanca.
- **DI-Plano02-fase01-linhas-dos-ponteiros-mudaram**: os numeros de linha do `README.md`/`MEMORY.md`
  (`tdd-workflow:119`, `verify-work:170`) sao pre-plano01-fase-04, que podou os corpos. Hoje sao
  `tdd-workflow:121`, `anti-vibe-review:95`, `verify-work:145`. INV-02 fala de **path**, nao de
  linha — nao houve violacao. Corrigir na fase-02, que e quem toca os ponteiros.
- **DI-Plano02-fase01-teto-por-poda-nao-por-ponteiro**: primeira versao fechou em **211 linhas**,
  acima do teto de 200 (G4). G4 sugere empurrar material para tras de ponteiro, mas DI-07 rejeita
  satelite para este material e INV-02 proibe mover o arquivo. Resolvido por poda: 5 separadores
  `---` dentro do cluster novo (Interface/Seam/Adapter/Leverage/Testes/Categorias — uma regiao
  conceitual so, entao remove-los melhora co-location) e um eco entre o mapa do topo e a abertura de
  `## Seam`. Fechou em **198**, sem perda de conteudo.
- **DI-Plano02-fase01-manifest-carregava-drift-alheio**: `bun run generate:manifest` atualizou dois
  checksums — o de `deep-modules.md` (meu) e o de `scripts/run-tests.ts` (**nao meu**: drift do PR
  #13, que alterou o runner sem regerar o manifest). O manifest e artefato gerado unico, entao nao da
  para separar. Incluido no commit; deixar checksum stale seria pior.

### fase-02

- **DI-Plano02-fase02-markdown-link-em-vez-de-backtick**: os 4 ponteiros que ja existiam usam path
  em backtick a partir da raiz (`` `skills/tdd-workflow/references/deep-modules.md` ``). Os 3 novos
  usam **markdown link relativo**. Motivo: `harness-validate.ts` tem link-checker ativo em `skills/`
  — confirmado por controle positivo (quebrei um link de proposito e o validate reprovou com
  `[broken-link] skills\architecture\SKILL.md ... deep-modules-QUEBRADO.md`, depois restaurei e
  passou). Path em backtick nao e verificado por nada, que e exatamente a divida do compound
  `2026-05-14-skill-paths-tech-debt-after-v6`. Divergencia de estilo aceita de proposito: troca
  apodrecimento silencioso por falha alta. Nao converti os 4 antigos — fora do escopo desta fase.
- **DI-Plano02-fase02-ancoragem-em-tensao-existente**: cada ponteiro foi colado no ponto onde a
  skill **ja trava numa decisao** que o vocabulario resolve, em vez de numa secao de "referencias".
  `architecture` → logo apos `### Anti-Patterns` do DI, porque a linha "DI para tudo" ja diz *"se so
  existe UMA implementacao possivel, funcao direta"* e depende de julgar "possivel"; a regra de
  contar adapters converte isso em contagem. `code-simplification` → logo apos a tabela
  **Redundancy**, cuja linha `Unnecessary abstractions | Wrapper that adds no value` depende de
  julgar "value"; o deletion test e o teste que faltava. `design-twice` → logo apos a tabela do
  Dominio 1, que e o caminho de leitura de quem monta o prompt dos subagentes no Step 3.
- **DI-Plano02-fase02-idioma-segue-o-hospedeiro**: `code-simplification/SKILL.md` e escrito em
  ingles; o ponteiro dele foi escrito em ingles. Os outros dois, em pt-BR. Os termos-ancora ficam em
  ingles nos tres (INV-01), entao o vocabulario casa mesmo com os corpos em idiomas diferentes.
- **DI-Plano02-fase02-mais-2-linhas-nao-1**: o criterio "cada arquivo ganhou ≤ 1 linha" e satisfeito
  em **conteudo** (1 linha cada), mas o `git diff --numstat` mostra `2 0` por arquivo — markdown
  exige a linha em branco separando paragrafo. Sem contorcao para chegar a `1 0`; enfiar o ponteiro
  como linha de tabela distorceria tabelas que catalogam *patterns*, nao testes.

### Passo 4 — cenario de disparo conferido, por ponteiro

Ponteiro que nao dispara e context load puro. O teste aplicado nao foi "o texto e bonito?" mas
**"o agente esta lendo esta regiao no momento em que a duvida aparece?"**.

| Skill | Cenario real | Por que dispara |
|---|---|---|
| `architecture` | "Devo criar uma interface `PaymentGateway` agora que so temos Stripe?" | A skill desce para `## 7. Dependency Injection` → `### Anti-Patterns`, onde "DI para tudo" e a linha que responde. O ponteiro esta na linha seguinte, no caminho de leitura, e substitui um julgamento por uma contagem (1 adapter = hipotetico) |
| `design-twice` | `/design-twice` sobre "como estruturar o modulo de importacao de CSV" → Dominio 1 selecionado | O ponteiro fica logo apos a tabela do Dominio 1, que e lida para montar as restricoes dos 3 subagentes no Step 3. Dispara antes do spawn, que e o unico momento util |
| `code-simplification` | Varredura do Step 2 chega em `Unnecessary abstractions \| Wrapper that adds no value` | O ponteiro esta imediatamente apos essa tabela. "Adds no value" e onde a varredura trava; o deletion test destrava |

### fase-03

- **DI-Plano02-fase03-contrato-reusa-axis-e-human_readable** (decisao do usuario, 2026-08-12): o
  Passo 2 pedia "2 campos alem do contrato v1". O contrato e validado por JSON Schema em
  `agents/_contract/v1.schema.json`, e a leitura dele mostrou duas coisas que o plano nao sabia:
  (a) `tradeoffs[].axis` ja existe e e **exatamente** o mecanismo que o Passo 3 pede — os eixos
  depth/locality/seam entram como `axis`, sem campo novo; (b) `human_readable` e o campo desenhado
  para markdown livre, e o Step 4 ja manda inclui-lo COMPLETO apos a tabela. Entao o Dominio 5 exige
  **duas secoes nomeadas dentro de `human_readable`** (*Interface completa*, *Atras do seam*) em vez
  de campos novos. Passos 2 e 3 saem juntos, com zero risco de contrato.
  **Verificado, nao assumido:** o schema **nao** tem `additionalProperties` em lugar nenhum
  (`grep -c` = 0), entao campo extra teria passado na validacao — a opcao literal era viavel. Foi
  recusada porque os campos ficariam invisiveis ao tipo `ProposalPayload`
  (`skills/lib/subagent-contract.ts:113-121`), e o Step 4 deriva a tabela dos 6 campos canonicos.
- **DI-Plano02-fase03-flexibility-fora**: "maximize flexibility" (restricao B do Dominio 1) **nao**
  entra no Dominio 5 — em interface de modulo ela converge com "ports & adapters" e violaria a regra
  1 do proprio `design-twice` ("as 3 restricoes DEVEM ser genuinamente diferentes"). O motivo esta
  escrito no corpo, porque e a pergunta obvia de quem compara os dois dominios lado a lado.
- **DI-Plano02-fase03-fronteira-explicita-no-quando-usar**: G1 avisa que sem a distincao escrita a
  heuristica manda tudo para o Dominio 1. Resolvido dentro do proprio "Quando usar" — *"Dominio 1
  decide como as pecas se organizam; este decide o que uma delas mostra"* — e nao numa nota separada,
  que ficaria longe do momento da escolha.

### Teste de divergencia (Verificacao da fase-03)

Modulo usado: **`skills/lib/todo-utils.ts`**, o mesmo do pre-check de CF-01 — ja auditado, entao a
comparacao e contra um veredito conhecido. As 3 restricoes produzem interfaces **estruturalmente**
diferentes, nao a mesma com nomes trocados:

| Restricao | Interface que produz | Onde o seam cai |
|---|---|---|
| A (deep radical) | 1 ponto de entrada — `openTodoFile(path)` devolve handle com `pending()` / `complete(item)` / `skip(item)`; `item` e token opaco, `lineIndex` some da interface | Na fronteira do arquivo; parsing e mutacao ficam ambos atras |
| B (caller-first) | `pickNextTodo(path)` devolve o item ja escolhido com closures `done()` / `skip()` / `remove()` ligadas a ele — o caso do `/todo-pick` vira 1 chamada; edicao em lote fica verbosa | Na fronteira da **tarefa**, nao do arquivo |
| C (ports & adapters) | Port `TodoStore` com `read()` / `write()`; nucleo de parsing vira puro e testa sem disco. Adapter fs em producao, em memoria em teste | Na fronteira de **I/O**; parsing fica na frente do seam, nao atras |

Divergem em ponto de entrada, em o que e opaco e em posicionamento do seam — e cada uma resolve um
defeito diferente do modulo atual (A mata o vazamento de `lineIndex`; B mata a coordenacao que o
caller faz hoje; C mata o acoplamento a `fs` no nucleo). Regra 2 do `design-twice` satisfeita.

## Delta medido (fase-01)

Em LF contra o blob (`git show HEAD:<path> | wc -c`), nunca no working tree — regra de
`docs/compound/2026-08-12-delta-de-corpo-so-vale-medido-em-lf.md`.

| | Antes | Depois | Delta |
|---|---|---|---|
| `deep-modules.md` | 4.386 chars / 118 linhas | 8.894 chars / 198 linhas | **+4.508 / +80** |

Custo de context load: **zero**. E arquivo de referencia sem frontmatter (INV-04), alcancado so por
ponteiro — nao entra na janela a nao ser quando um dos 4 ponteiros dispara.

## Estado do alvo antes da mudanca

`skills/tdd-workflow/references/deep-modules.md` — 118 linhas.

Ponteiros que resolvem hoje (nao mover o arquivo, INV-02):
- `skills/tdd-workflow/SKILL.md:119`
- `skills/anti-vibe-review/SKILL.md:95`
- `skills/verify-work/SKILL.md:170`

Ocorrencias de `seam` no plugin inteiro: **0**. As 2 de `costura` em
`skills/system-design/references/messaging-reliability.md` sao a palavra em portugues com sentido
comum, nao o conceito de Feathers.

## CF-01 — registro obrigatorio

A fase-01 remove o sinal *"Interface tem mais linhas que a implementacao"*, que premia inchar a
implementacao. A referencia alimenta o pre-check de deep modules do `verify-work` e do
`anti-vibe-review`.

**Executado em 2026-08-12. O veredito MUDOU.**

Modulo escolhido: **`skills/lib/todo-utils.ts`** (226 linhas, 15 exports — a segunda interface mais
larga de `skills/lib/`, atras so de `subagent-contract.ts`). Escolhido porque e o caso que expoe a
direcao do vies: o sinal de ratio **nao dispara** nele (~30 linhas de interface contra ~130 de corpo),
entao a metrica antiga o poupava justamente por volume de implementacao.

| | Veredito |
|---|---|
| **Antes** | 2 de 5 sinais de shallow: pass-through parcial (`listPending:186`, `filterByStatus:195` sao `.filter`; `pickNext:204` e `.find` e descarta o proprio parametro em `void strategy:206`) e information leakage (`lineIndex` exposto em `TodoItem`/`ParsedLine`). Sinal de ratio **silencioso**. Saida: "warning de encapsulamento", sem direcao de conserto |
| **Depois** | 3 de 5 — o sinal novo de leverage dispara: 15 exports para aprender, e o caller ainda coordena (pega `lineIndex` de `parse`/`parseLine` e devolve a `markDone`/`skip`/`remove`). Deletion test **discrimina**: `CHECKBOX_RE:13`, `PARSED_LINE_RE:130` e `parseClassifier:133` reapareceriam em qualquer caller — esse nucleo se paga; os 3 wrappers de colecao somem em `.filter()`/`.find()`. Leitura acionavel: **nucleo deep, borda shallow** |

**Por que a nova leitura e a correta.** A antiga chegava ao veredito pesando volume de implementacao
como evidencia de profundidade — o vies exato do CF-01. Os ~130 linhas de corpo calavam o sinal 3,
quando parte desse corpo e precisamente o que nao se paga (3 wrappers de uma linha). A pergunta nova
— quanto o caller exerce por unidade de interface aprendida — separa o que fica do que sai, e o
deletion test **nomeia quais exports**.

Tres achados que o conjunto antigo nao tinha como produzir. O caller de producao e
`skills/todo-pick/SKILL.md`, que importa a lib dentro de blocos ` ```typescript ` (papel 2 da
taxonomia de `docs/compound/2026-08-11-skill-md-code-block-can-be-load-bearing.md` — spec que o
agente simula):

- **Leverage baixo, confirmado no caller** (§Leverage e Locality): `todo-pick:29-30` chama `parse` e
  entao escreve `all.filter(item => item.state === 'open')` **a mao** — reimplementando `listPending`,
  que existe na lib (`:186`). Nao e descuido: `listPending` aceita `ParsedLine[]` e `parse` devolve
  `TodoItem[]`. Os **dois parsers paralelos** para as mesmas linhas cobram do unico caller que
  existe. Wrapper que o proprio caller nao consegue usar e a definicao de nao se pagar.
- **Interface nao-declarada** (§Interface e mais que assinatura): `remove:87` faz
  `lines.splice(lineIndex, 1)`, invalidando todo `lineIndex` ja obtido. `todo-pick:80` resolve
  `lineIndex = pending[n-1].lineIndex` de um `parse` anterior. Restricao de ordem que nao esta em
  assinatura nenhuma nem no `SKILL.md` — e interface, e nao esta escrita.
- **Um adapter so** (§Seam): a fronteira e atravessada por exatamente **um** adapter (`/todo-pick`);
  os outros 3 importadores sao testes. Pela regra "1 adapter = seam hipotetico, 2 = seam real", isso
  e indirecao, nao seam — o que explica por que a interface pode ser reformada sem negociar com
  ninguem.

Nenhum vira patch nesta fase — a referencia produz veredito, nao edicao (DI-04). Ficam registrados
como candidatos para quem tocar `todo-utils.ts`.

**Correcao de metodo, registrada porque quase virou achado falso.** A primeira redacao deste bloco
dizia "zero callers de producao", a partir de
`grep -rn "todo-utils" --include=*.ts skills/ scripts/ tests/`, que devolveu so os 3 testes. O grep
estava correto e o controle positivo passou — o **escopo** e que estava errado: neste repo o
consumidor de uma lib pode ser um `SKILL.md`. Complementa
`docs/compound/2026-08-12-grep-negativo-exige-controle-positivo.md` por um angulo novo: la o grep
mentia por sintaxe; aqui ele respondeu com exatidao a pergunta errada, e o controle positivo nao
pega isso. Para achado de "nao tem caller", o `--include` precisa cobrir `*.md`.

## Gates entre fases

- **fase-01 -> fase-02 e fase-03:** o vocabulario precisa existir antes de ser apontado ou consumido.
  Fases 02 e 03 sao independentes entre si.
- **fase-02 -> fase-03:** ambas tocam `design-twice`. A fase-03 rele o arquivo antes de editar.
