# Memory: Plano 10 — `wayfinder`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **plano10 concluido** (2026-08-14) — as 3 fases fechadas
**Depende de:** plano01 fase-01 (a lente)
**Branch:** `feat/wayfinder`

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Formato + modo chart | **done** | 3/3 |
| 02 | Script de fronteira | **done** | 3/3 (+4 da distribuicao) |
| 03 | Modo work + pipeline | **done** | 7/4 — ver `DI-Plano10-fase03-sete-arquivos` |

Linear: o script precisa do formato; o modo work precisa da fronteira.

## Decisoes de implementacao (DI)

Formato: `DI-Plano10-faseNN-<slug>: <o que mudou e por que>`.

- `DI-Plano10-fase01-claim` (a obrigatoria): `claimed` carrega **timestamp ISO-8601 + identificador**
  (`claimed: 2026-08-14T15:30 feat/wayfinder`), vazio = nao reivindicado, e **vence em 24h** num
  ticket ainda aberto — volta para a fronteira, sinalizado. Flag booleana foi recusada: so sai a mao,
  e a sessao que morre no meio deixa o ticket travado para sempre, sem assignee que denuncie. "Nada"
  foi recusado porque sessoes paralelas sao reais aqui. O timestamp e o que faz o campo valer mais
  que a flag — staleness sem nenhuma maquinaria de limpeza.
  **Insumo para a fase-02:** e um 12o caso de teste alem dos 11 listados — *claim vencido (>24h) em
  ticket aberto → volta para a fronteira*.

- `DI-Plano10-fase01-fronteira`: **`fronteira` fica**, deliberadamente, e a continuidade com o
  `grill-me` virou secao propria em vez de acidente. Medido: `grill-me` usa `fronteira` em 15 linhas;
  `frontier` em ingles = **0** em `skills/` (controle positivo no mesmo comando). O MEMORY dizia
  "`fronteira` (10) nao aparece em nenhum `SKILL.md` no sentido relevante" — medido em 2026-08-10,
  **antes do plano04**, e hoje esta caduco.
  Mas nao sao dois conceitos: sao **o mesmo conceito em duas escalas**. `grill-me` = decisoes do
  design tree cujos pre-requisitos foram respondidos, numa entrevista. Wayfinder = tickets cujos
  bloqueadores fecharam, ao longo de sessoes. Mesmo grafo, mesma pergunta, mesma condicao de fim
  (fronteira vazia). A unica diferenca real e o filtro `claimed`, que so existe porque wayfinder
  atravessa sessoes concorrentes.
  **O que decidiu:** `grill-me:257-261` ja manda para ca — *"o pedido precisa de um mapa, nao de mais
  perguntas"* quando um round produz mais fronteira do que resolve duas vezes seguidas. Renomear
  cortaria a costura que o proprio `grill-me` ja escreveu. E e o que a `writing-for-agents` pede de
  leading word: repetir o token de proposito, nunca o significado.
  `fog of war` fica **em ingles** (a `writing-for-agents:124` o cita como exemplo canonico de leading
  word); `destino` e `mapa` em pt-BR, que nao perdem prior nenhum.

- `DI-Plano10-fase01-formats-em-references`: a fase-01 especificava `skills/wayfinder/FORMATS.md` na
  raiz da skill. Foi para **`references/FORMATS.md`**. `generate-manifest.js:195-201` indexa so
  `references/`, `templates/`, `lib/` e `assets/` — `.md` solto na raiz nao entra no manifest, chega
  ao cache global sem checksum e fora da estrategia de update. Verificado nos dois sentidos:
  `skills/prototype/references/LOGIC.md` **esta** no manifest; `skills/wizard/template.sh` **nao
  esta**. Depois do porte, `skills/wayfinder/references/FORMATS.md` aparece no manifest.

- `DI-Plano10-fase01-supersede`: **o teste em papel achou um furo e o formato foi corrigido.**
  `Decisions so far` era append-only; este esforco reverteu tres decisoes ja fechadas (TR-01, TR-02,
  TR-03), cada uma por re-verificacao contra o codigo. O formato da fonte assume resolucao
  **monotonica**. Sob ele, uma TR ou sobrescreveria a linha antiga (perdendo *por que* a decisao
  parecia certa — que virou a licao mais cara do esforco) ou viraria ticket novo lendo como decisao
  inedita. Adicionado `### Decisao revista` ao `FORMATS.md`: a linha nova nomeia a que corrige, a
  antiga permanece. Uma frase de custo; um mapa que se autocorrige.

- `DI-Plano10-fase01-chart-6-passos`: o modo chart ficou com **6 passos**, nao 7 — a saida ("se isso
  nao revelar fog of war, parar") vive **dentro** do passo 2, como na fonte. Razao: e criterio de
  completude do passo 2, nao acao propria, e assim o passo 2 ganha desfecho binario em vez de bound
  vago ("mapear a fronteira"). Os proprios docs de planejamento ja divergiam no numero —
  `README.md:113` diz "passo 2", `MEMORY.md` dizia "passo 3" — entao o numero nunca foi o requisito.
  A saida aparece em **tres lugares** (secao `Quando o mapa nao se paga` antes dos passos, negrito no
  passo 2, e um Red Flag), o que protege G5 melhor que uma linha numerada sozinha.

- `DI-Plano10-fase01-di34-caducou`: **DI-34 nasceu fechada.** `prototype` e `grilling` nao degradam
  para conversa — `skills/prototype/`, `skills/grill-me/`, `skills/domain-modeling/` e
  `skills/source-driven-development/` existem, e as quatro tem `disable-model-invocation: false`
  (verificado no frontmatter), entao uma skill user-invoked como wayfinder alcanca todas. A tabela de
  tipos foi escrita com os ponteiros reais de saida, sem nenhuma degradacao e sem nenhum TODO.

- `DI-Plano10-fase01-link-check-em-code-fence`: o G6 da fase-01 estava errado nos dois sentidos.
  (a) `harness-validate.ts:79` tem `exec-plans` em `SKIP_DIRS`, entao links de `MAP.md` → `tickets/`
  **nunca sao validados** — precisam resolver para o humano e para o script da fase-02, mas o
  validate nao os pega. (b) O que o validate **pega** e o inverso, e custou uma rodada vermelha: o
  regex de link (`harness-validate.ts:533`) roda no conteudo cru e **nao pula fenced code blocks** —
  os placeholders `[titulo](tickets/001-slug.md)` dentro do skeleton do `FORMATS.md` viraram 3
  `broken-link`. Correcao: dentro de fence, o alvo do link vira placeholder em prosa
  (`<titulo do ticket fechado, como link para tickets/NNN-slug.md>`), com uma frase fora do fence
  dizendo que a linha e link markdown. Sem precedente no repo — `GLOSSARY-FORMAT.md` e `LOGIC.md` so
  usam links reais.

- `DI-Plano10-fase02-ids-yaml-int`: **o `js-yaml` com `CORE_SCHEMA` le `003` como o inteiro `3`** —
  os zeros a esquerda somem antes de o codigo ver o valor. Sem tratamento, `blocked-by: [003]` nunca
  casaria com o ticket de `id: 003`, e **todo bloqueio viraria referencia fantasma** — o script
  reportaria erro em cima de um mapa correto. `normalizeId` re-padda para 3 digitos na leitura, e ha
  teste dedicado. Nao estava previsto em nenhum dos 11 casos da fase.
  **Dissolvido na distribuicao** (`DI-Plano10-fase02-sem-deps`): sem `js-yaml`, todo valor sai string
  e os zeros nunca se perdem. `normalizeId` ficou como rede — aceita `id: 7` alem de `id: 007`.

- `DI-Plano10-fase02-ciclo-nao-trava`: o **G3 partia de premissa errada**. Ciclo nao vira loop
  infinito aqui, porque "desbloqueado" olha so os bloqueadores **diretos**
  (`blocked-by.every(fechado)`) — e O(1) por ticket, sem recursao. O risco so existiria com bloqueio
  transitivo, que o formato nao tem. Mas ciclo continua sendo bug real: e **deadlock**, nenhum dos
  tickets pode ser desbloqueado nunca. Entao a deteccao entrou explicita (DFS com cores), reportada
  como erro pelo que ela e — bug de autoria da ligacao em segunda passada (G4 da fase-01) — e nao
  como defesa contra travamento. Verificado no CLI com `timeout 30`: retorna na hora.

- `DI-Plano10-fase02-g6-tpl-nao-repo`: o G6 mandava conferir `tests/package-json-scripts.test.ts`.
  **Ele nao assevera os scripts deste repo** — assevera
  `skills/init/assets/templates/package.json.tpl`, o template dos projetos-alvo. Adicionar
  `wayfinder:frontier` ao `package.json` da raiz nao o toca, e nenhuma atualizacao foi necessaria.

- `DI-Plano10-fase02-erro-vs-aviso`: id fantasma e ciclo sao **erro** (exit 1); divergencia
  mapa-tickets e **aviso** (exit 0), como a fase pediu. Mas o relatorio **imprime tudo antes de sair**
  — sair cedo esconderia a fronteira justamente quando o mapa tem um defeito e voce mais precisa ver
  o estado.

- `DI-Plano10-fase02-status-coercao`: `status` diferente de `closed` e tratado como `open`, sem
  validar. Deliberado: os 11 casos da fase mais o 12o sao o contrato, e adicionar classes de erro
  nao pedidas significaria ramo sem teste. **Candidato a follow-up** — um `status: opne` hoje passa
  silencioso como aberto.

- `DI-Plano10-fase02-merge-main`: antes da fase-02, a `main` foi trazida para a branch (ela ganhou o
  fix de manifest do PR #30). Conflito unico em `plugin-manifest.json`, resolvido por **regeneracao**,
  nunca a mao — e artefato gerado, e o generator novo rodando sobre a working tree produz a uniao por
  construcao. Verificado que os dois lados sobreviveram: as 10 entradas de raiz da `main` e as 2 do
  wayfinder.

### Distribuicao para projeto-alvo (decisao do humano, 2026-08-14)

O gap sinalizado ao fim da fase-02 foi resolvido: **distribuir junto**. Isso mudou tres coisas no
artefato ja commitado, e cada uma foi medida antes de mexer.

- `DI-Plano10-fase02-sem-deps`: **o `js-yaml` saiu.** Os `.tpl` distribuidos importam **somente
  `node:fs` e `node:path`** — medido em `compound-check.ts.tpl` e `harness-validate.ts.tpl`, e por
  isso o `compound-check.ts.tpl` parseia frontmatter a mao mesmo com a versao do repo usando
  `js-yaml`. O projeto-alvo nao tem dependencia instalada.
  **Como apareceu:** o script scaffoldado morreu ao rodar —
  `SyntaxError: Missing 'default' export in module js-yaml@5.3.0`, resolvido de um cache qualquer do
  bun. **A suite inteira estava verde**; so rodar dentro de um projeto scaffoldado revelou. E o
  compound `2026-08-13-suite-verde-nao-exercita-validador-distribuido` se pagando de novo.
  Substituido por `parseFlatYaml` (~20 linhas, mesma forma do `parseYamlInline` do
  `compound-check.ts.tpl`): `chave: valor` mais array inline, que e tudo que o formato do ticket usa.

- `DI-Plano10-fase02-saida-en`: **a saida ao usuario virou EN.** Medido script a script: os tres
  distribuidos (`harness-validate`, `compound-check`, `new-plan`) imprimem EN; so o repo-only
  (`audit-skill-docs`) imprime pt-BR. A regra e **distribuido → EN**, e distribuir moveu o
  wayfinder-frontier para essa categoria. Comentarios seguem pt-BR, como no `harness-validate.ts.tpl`.
  `"o caminho esta claro"` da fase-02 virou `"the way is clear"` — o criterio de aceite pede que a
  fronteira vazia **comunique** o fim do mapa, nao uma string literal. Ha teste guardando o chrome da
  saida contra palavras pt-BR, com controle positivo no mesmo assert.

- `DI-Plano10-fase02-tpl-copia-literal`: o `.tpl` e **copia byte a byte** do script do repo. Difere
  do `harness-validate.ts.tpl`, que e variante adaptada — aqui, sem dependencia e com saida EN, nao
  sobra nada a adaptar. O que mantem honesto e um teste de drift, com **RED validado**: perturbei o
  `.tpl`, o teste ficou vermelho, restaurei.

- `DI-Plano10-fase02-goldens-intocados`: `init-greenfield.tree.json` e `.stdout.txt` **nao foram
  atualizados**. Os testes que os consomem estao `test.skip` desde 2026-05-21 e **nao podem ser
  regenerados** — greenfield aborta com code=20 sem `/detect-architecture` pre-rodado, e a decisao
  "golden v7 vs delecao" segue aberta. Editar um golden a mao inventaria dado: ele vale por ter sido
  **produzido** pelo sistema. Para quem fechar aquela decisao: **o scaffold passou de 38 para 39
  arquivos**, e `scripts/wayfinder-frontier.ts` e o novo.
  Nota: o MEMORY global dizia "5 testes ativos e verdes (todos sem `test.skip`)" — **caduco**, 4 dos
  5 estao skipados. Nenhum teste **ativo** quebrou: todas as assercoes de contagem sao relativas a
  `TEMPLATE_MANIFEST.length`, nao numeros fixos. As duas fixas que existiam foram atualizadas —
  `anti-vibe-extension` de 14 para 15.

**Verificado ponta a ponta, nao pela suite:** `scaffoldFullTree` num tmpdir escreveu 39 arquivos com
o script incluso, e `bun run wayfinder:frontier` rodou **dentro do projeto-alvo**, sem deps
instaladas, achando o esforco por auto-discovery e imprimindo fronteira e bloqueado corretos.

- `DI-Plano10-fase03-sete-arquivos`: a fase previa **4 arquivos**; sairam **7**. Os tres extras vem
  do proprio G5, que mandava conferir consistencia do pipeline: `AGENTS.md` e `CLAUDE.md` (mirror
  canonico dele) carregam a linha do pipeline na tabela *When to Read What*, e o
  `THIRD-PARTY-NOTICES.md` precisava da obrigacao de atribuicao do `Work through the map`. O G5
  nomeava `AGENTS.md` e `README.md`; medido, o `README.md` **nao cita** o pipeline e o `CLAUDE.md`
  cita. Padrao repetido da serie: o plano nomeia N sites e existem outros.

- `DI-Plano10-fase03-duas-entradas`: o diagrama do `PIPELINE.md` **nao** e
  `wayfinder → grill-me → write-prd`. Escrevi assim primeiro e estava errado: sugeria que o grill-me
  consome a saida do wayfinder. Sao **duas entradas alternativas que convergem no `write-prd`** —
  foggy entra por wayfinder, descritivel entra por grill-me, e mapa fechado alimenta o `write-prd`
  direto (o grilling ja aconteceu dentro dos tickets). Diagrama refeito com as duas linhas, e a linha
  do `AGENTS.md`/`CLAUDE.md` usa `wayfinder / grill-me` — a barra le como "ou", que e o fato.

- `DI-Plano10-fase03-product-sense-intocado`: `docs/PRODUCT_SENSE.md:11` tambem cita o pipeline
  (*"Plan before code (grill-me → write-prd → plan-feature)"*), e **nao foi alterado de proposito**.
  Aquela linha e a proposta de valor do plugin — o default disciplinado. Wayfinder e **condicional**;
  inclui-lo ali diria "toda feature comeca no wayfinder", que e exatamente o G3 da fase.

- `DI-Plano10-fase03-hitl-sem-duplicar`: a frase-modo-de-falha da fonte (*um agente de grilling que
  responde as proprias perguntas*) ja vivia na tabela `Common Rationalizations` desde a fase-01. O
  modo work enuncia a **regra** ("humano indisponivel significa ticket que continua aberto; o agente
  nao fala pelo lado humano") sem repetir a frase. Trabalhos diferentes: a linha da tabela responde a
  tentacao, o passo da o comando.

## Verificacao do gap (2026-08-10)

Nao e "planejar coisa grande" — isso ja temos:

| Ja temos | Onde |
|---|---|
| Decomposicao hierarquica | `plan-feature` — PRD → planos → fases |
| DAG entre fases | `plan-feature:696` — *"Depende de: fase-01" ou "Independente"* |
| Dependencia entre requisitos Must Have | `plan-feature:476` |
| Estado multi-sessao | `STATE.md` + `MEMORY.md` por plano |

Termos ausentes, verificados: `fog` (1 hit, sentido diferente) · `frontier` (0) · `decision ticket`
(0) · `multi-session` (0). `fronteira` (10) e `blocking` (9) nao aparecem em nenhum `SKILL.md` no
sentido relevante.

> **Caduco em 2026-08-14 (fase-01):** a linha do `fronteira` foi medida **antes do plano04**. Hoje o
> `grill-me` usa `fronteira` em 15 linhas e **exatamente no sentido relevante**. `frontier` em ingles
> continua 0. Resolvido em `DI-Plano10-fase01-fronteira` — nao era colisao, era o mesmo conceito em
> duas escalas.

**O gap e o estagio de descoberta** — quando o destino e visivel mas o caminho nao, e voce ainda nao
sabe quais sao as perguntas.

## As tres adaptacoes

| DI | Adaptacao | O que se perde, e como recupera |
|---|---|---|
| DI-32 | mapa e tickets em markdown local, na pasta datada do esforco | perde a UI do tracker; a fonte preve esse fallback |
| DI-33 | `scripts/wayfinder-frontier.ts` computa a fronteira | recupera o que a query do tracker dava — **e e testavel, o que a query nao era** |
| DI-34 | 4 tipos de ticket com degradacao | `prototype` e `grilling` degradam para conversa ate plano08 e plano04 |

## Pendencia explicita: religar os tipos degradados — **FECHADA sem nunca abrir**

Os planos 04, 05 e 08 fecharam **antes** da fase-01 rodar, entao nenhum tipo chegou a degradar. A
tabela de tipos da `SKILL.md` saiu com os ponteiros reais:

| Tipo | Ponteiro de saida | Verificado |
|---|---|---|
| `research` | subagente + `source-driven-development` | `disable-model-invocation: false` |
| `prototype` | `/prototype` (plano08) | `disable-model-invocation: false` |
| `grilling` | `/grill-me` (plano04) + `/domain-modeling` (plano05) | ambas `disable-model-invocation: false` |
| `task` | trabalho manual que desbloqueia uma decisao | — |

Wayfinder e user-invoked (`disable-model-invocation: true`), e a regra estrutural do repo-fonte diz
que user-invoked alcanca model-invoked mas nunca outra user-invoked. As quatro alcancadas sao
model-invocable, entao os quatro ponteiros funcionam. Ver `DI-Plano10-fase01-di34-caducou`.

## Layout dos artefatos (DI-32)

```
docs/exec-plans/active/{data}-{slug}/
├── MAP.md
└── tickets/
    ├── 001-{slug}.md
    └── 002-{slug}.md
```

Convive com `CONTEXT.md`, `PRD.md`, `PLAN.md`, `STATE.md` e `planoNN/` — sao estagios diferentes da
mesma pasta, e wayfinder vem antes deles.

## Teste em papel (fase-01) — **RODADO, e achou um furo**

**Este proprio esforco de import** — 11 planos, 9 fechados, decidido ao longo de varias sessoes, com
colisoes descobertas no meio e escopo se revelando aos poucos — foi um caso de wayfinder feito a mao.

Se o formato nao der conta de representa-lo retroativamente, **o formato esta errado.**

Rodado em 2026-08-14 contra o material real (`CONTEXT.md`: 37 DIs, 3 TRs, 2 CFs, 3 COs + os 11
planos). Artefato de verificacao no scratchpad da sessao, nao commitado.

**O que o formato absorveu sem esforco** — e a evidencia mais forte de que o gap era real:

| Elemento do formato | O que ja existia no esforco |
|---|---|
| `## Not yet specified` | A secao "Pendente de decisao" do `CONTEXT.md`, **literalmente** — inclusive a recusa de pre-fatiar: *"escreve-los agora seria fixar um escopo que ainda esta em aberto"* (INV-05, descoberta sozinha) |
| `## Out of scope` | A secao "Fora de escopo", **literalmente**. Nunca graduou em 9 planos (INV-06) |
| `## Decisions so far` | A tabela de 37 DIs — uma linha, o motivo, o link. Ja era o formato |
| `blocked-by` | plano10 depende de plano01 fase-01 · plano11 de plano04+05 · `wait-what` de `domain-modeling` |
| Os 4 tipos | `research` = triar 35 skills lendo o repo-fonte · `grilling` = CO-02 · `prototype` = o dogfood do plano08 (`feat/prototype-adr-lifecycle`, guardada como fonte primaria) · `task` = clonar o repo-fonte, que nao decide nada mas bloqueava a triagem |

**O furo:** `Decisions so far` e append-only, e este esforco reverteu tres decisoes fechadas. Ver
`DI-Plano10-fase01-supersede` — o formato foi corrigido, que e a saida que o criterio de aceite
previa.

**Veredito:** passa, com a correcao aplicada.

## O modo de falha mais provavel

Virar burocracia para trabalho que cabia numa sessao.

A defesa esta no passo 3 do modo chart: **se a grelhagem breadth-first nao revelar nevoa, o caminho
ja esta claro — parar e dizer que nao precisa de mapa.** Se essa saida nao estiver afiada, a skill
vai gerar mapa para tudo.

## Gates entre fases

- **fase-01 -> fase-02:** o formato do ticket e o input do script.
- **fase-02 -> fase-03:** o modo work comeca rodando a fronteira.

## O que a fase-03 entregou

`skills/wayfinder/SKILL.md` (modo work + `Plan, don't do`) · `docs/PIPELINE.md` (estagio novo, duas
entradas, condicao de entrada) · `skills/write-prd/SKILL.md` e `skills/plan-feature/SKILL.md`
(ponteiros) · `AGENTS.md` + `CLAUDE.md` (linha do pipeline) · `THIRD-PARTY-NOTICES.md`.

**Teste de fluxo: executado, nao percorrido no papel.** Com o script da fase-02 pronto, deu para
rodar o ciclo inteiro num esforco fixture em vez de imaginar:

| Momento | Fronteira | O que provou |
|---|---|---|
| T0 — mapa recem-cartografado | `{001, 003}`, bloqueado `{002}` | o grafo de bloqueio resolve |
| T1 — fecha 001, **de proposito sem indexar** | `{002, 003}` + aviso | INV-01 e guardado mecanicamente: *"closed ticket missing from the map's Decisions so far"* |
| T2 — indexa, gradua o fog, cria o 004 | `{002, 003, 004}`, zero avisos | graduacao **com limpeza** (G2) — *Not yet specified* ficou com 0 linhas de conteudo |

O mapa mudou de forma coerente nos tres momentos. O segundo teste de fluxo (a saida do passo 2 do
chart, para ideia que cabia numa sessao) e comportamental — verificado por leitura, com a saida
presente em tres lugares (`Quando o mapa nao se paga`, negrito no passo 2, e um Red Flag).

## Estado final do plano10

Pipeline: **`wayfinder` / `grill-me` → `write-prd` → `plan-feature` → `execute-plan` → `verify-work`
→ `iterate`**.

A skill e user-invoked (`disable-model-invocation: true`), distribuida ao projeto-alvo junto com
`scripts/wayfinder-frontier.ts`, e o comando `wayfinder:frontier` existe nos dois `package.json` —
o do repo e o do template.

**Debito conhecido, herdado e nao criado aqui:** `status: opne` num ticket passa silencioso como
`open` (`DI-Plano10-fase02-status-coercao`), e os goldens do `/init` seguem desatualizados por
decisao alheia (`DI-Plano10-fase02-goldens-intocados`) — o scaffold foi de 38 para 39 arquivos.

## O que a fase-01 entregou, e o que as seguintes herdam

Arquivos: `skills/wayfinder/SKILL.md` (155 linhas) · `skills/wayfinder/references/FORMATS.md` (126) ·
`THIRD-PARTY-NOTICES.md` (secao do wayfinder) · `plugin-manifest.json` regenerado (429 arquivos, 46
skills).

**Para a fase-02** — o contrato que o script vai ler:

- Frontmatter do ticket: `id` (3 digitos) · `title` · `type` · `status` (`open`/`closed`) ·
  `blocked-by` (lista de ids, `[]` quando vazio) · `claimed` · `out-of-scope` (bool).
- **12o caso de teste**, alem dos 11 do doc da fase: claim com mais de 24h em ticket aberto → volta
  para a fronteira, sinalizado como vencido (`DI-Plano10-fase01-claim`).
- A checagem de divergencia do passo 4 precisa aceitar linha **superseded** em *Decisions so far*
  como valida — a linha antiga permanece apontando para um ticket fechado, e nao e orfa
  (`DI-Plano10-fase01-supersede`).
- A `SKILL.md` cita o script como `wayfinder:frontier` **entre crases, nunca como link** — o alvo so
  existe na fase-02, e o `harness:validate` reprova link quebrado.

## O que a fase-02 entregou

Arquivos: `scripts/wayfinder-frontier.ts` (~300 linhas) · `scripts/wayfinder-frontier.test.ts`
(21 testes) · `package.json` (entry `wayfinder:frontier`) · `plugin-manifest.json` regenerado.

API exportada, que a fase-03 vai alcancar pelo CLI: `analyseEffort(effortDir, now?)` →
`FrontierReport { frontier, blocked, claimed, errors, warnings }` · `renderReport(report, effortDir)`
· `STALE_CLAIM_MS`.

**Exercitado no CLI, nao so na suite** (compound `2026-08-13-suite-verde-nao-exercita-validador-distribuido`):
esforco fixture com 4 tickets imprimiu fronteira/reivindicado/bloqueado corretos · id fantasma e
ciclo sairam com exit 1 sem travar · mapa fechado disse *"o caminho esta claro"* · sem argumento,
mensagem clara em vez de crash.

**Para a fase-03** — para nao duplicar o que ja esta escrito:

- O passo 2 do modo work manda rodar `bun run wayfinder:frontier`. **O script aceita o caminho do
  esforco como argumento** — usar, e nao depender do auto-discovery, que so resolve quando ha
  exatamente um esforco ativo com `MAP.md`.
- **Gap de distribuicao — RESOLVIDO.** O humano decidiu distribuir junto (2026-08-14). O script vai
  para o projeto-alvo pelo `TEMPLATE_MANIFEST`, e `wayfinder:frontier` esta no `package.json.tpl`.
  A fase-03 pode escrever `bun run wayfinder:frontier` no modo work sem ponteiro morto. Ver o bloco
  *Distribuicao para projeto-alvo* acima — em especial `DI-Plano10-fase02-saida-en`, porque a saida
  do script agora e **EN** e a `SKILL.md` da fase-03 nao deve prometer texto em pt-BR.
- HITL/AFK ja esta **definido** na tabela de tipos da `SKILL.md` ("ticket HITL resolve pela troca ao
  vivo: o lado humano e do humano"). O passo 3 da fase-03 deve **expandir** com o modo de falha
  nomeado (*um agente de grilling que responde as proprias perguntas*), nao reafirmar a definicao.
- "Plan, don't do" **nao** foi escrito na fase-01 — e escopo do passo 4 da fase-03, e nao ha nada a
  deduplicar.
- `THIRD-PARTY-NOTICES.md` ja tem a secao do wayfinder cobrindo o que a fase-01 portou. A fase-03
  precisa **estender** a lista `Derived` com o `Work through the map`.
- O G6 da fase-03 pergunta se e o terceiro toque em `plan-feature`: os numeros de linha do
  `README.md` do plano estao velhos. Medido em 2026-08-14 — DAG entre fases e **`plan-feature:696`**
  (o README diz 721), dependencia entre requisitos Must Have e **`:476`** (o README diz 501). O
  arquivo tem 928 linhas.
