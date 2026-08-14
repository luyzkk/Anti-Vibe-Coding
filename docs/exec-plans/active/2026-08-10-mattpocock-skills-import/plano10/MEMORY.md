# Memory: Plano 10 — `wayfinder`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-01 concluida (2026-08-14) — fases 02 e 03 pendentes
**Depende de:** plano01 fase-01 (a lente)
**Branch:** `feat/wayfinder`

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Formato + modo chart | **done** | 3/3 |
| 02 | Script de fronteira | planned | 0/3 |
| 03 | Modo work + pipeline | planned | 0/4 |

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

**Para a fase-03** — para nao duplicar o que ja esta escrito:

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
