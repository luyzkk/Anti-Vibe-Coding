---
name: writing-for-agents
description: "Writing documents an agent reads. Use when creating or editing a skill, when modifying AGENTS.md or CLAUDE.md, or when reviewing a doc an agent consumes — a PRD, a ticket, a subagent prompt."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
argument-hint: "[documento a revisar]"
---

# Writing for Agents

Referencia para escrever qualquer documento que um agente consome — uma skill, um `AGENTS.md` /
`CLAUDE.md`, um doc alcancado por ponteiro. O empacotamento muda; a escrita nao: as mesmas alavancas
tornam cada um previsivel — o agente tomando o mesmo *processo* a cada run, nao produzindo o mesmo
output.

Quando o documento e uma skill, leia [`SKILL-MECHANICS.md`](./SKILL-MECHANICS.md): frontmatter,
escolha de invocacao e router skills.

## Context pointers

Um **context pointer** e uma referencia que vive no contexto do agente, nomeia material fora do
contexto e codifica a condicao para alcanca-lo. A description de uma skill e um; uma linha no
`AGENTS.md` nomeando um doc e o mesmo objeto. E a *redacao* do ponteiro, nao o alvo, que decide
quando o agente alcanca o material — e com que confiabilidade. Alvo indispensavel atras de ponteiro
mal-redigido e um bug de variancia: afie a redacao primeiro, e inline o material so se afiar falhar.

Um ponteiro faz dois trabalhos — dizer o que o material e, e listar os **branches** que devem
disparar o alcance (um branch e um caso distinto que o documento trata, e por isso runs diferentes
percorrem caminhos diferentes). Cada palavra de um ponteiro sempre carregado custa em todo turno,
entao ele merece poda mais dura que o corpo:

- **Front-load a leading word** — o ponteiro e onde ela faz o trabalho de disparo.
- **Um trigger por branch.** Sinonimos que renomeiam um unico branch sao um branch escrito duas
  vezes; colapse e mantenha so os genuinamente distintos.
- **Corte identidade que o corpo ja carrega.**

## As duas cargas

Todo documento e todo ponteiro que voce adiciona gasta um de dois orcamentos:

- **Context load** — o custo do material sempre carregado na janela do agente: uma linha do
  `AGENTS.md`, a description de uma skill, qualquer coisa em contexto a cada turno, gastando tokens
  e atencao dispare ou nao.
- **Cognitive load** — o custo sobre o humano: quais documentos existem e quando alcancar cada um.
  O humano e o indice. Nao e para minimizar — e o preco da agencia humana; gaste onde o julgamento
  humano importa, remova onde nao importa.

Material alcancado so por ponteiro escapa do context load ao preco da linha do proprio ponteiro;
material sem ponteiro nenhum viaja inteiro no cognitive load.

## Hierarquia da informacao

Um documento e feito de dois tipos de conteudo — **steps** (as acoes ordenadas que o agente executa)
e **reference** (definicoes, regras, fatos consultados sob demanda) — que se misturam livremente: so
steps (uma receita), so reference (as regras de um review, esta skill), ou ambos. A decisao central e
onde cada peca fica na **hierarquia da informacao**, uma escada ordenada por quao imediatamente o
agente precisa do material:

1. **Step in-file** — o degrau primario: o que o agente faz, em ordem.
2. **Reference in-file** — consultada sob demanda. Muitas vezes um conjunto legitimamente plano de
   pares (toda regra de um review num degrau so) — arranjo valido, nao smell.
3. **Reference disclosed** — empurrada para arquivo separado, alcancada por context pointer,
   carregada so quando o ponteiro dispara. Vai de um arquivo irmao na mesma pasta ate reference
   externa que mora em qualquer lugar e que qualquer documento pode apontar.

Empurre pouco demais e o topo incha; empurre demais e voce esconde material que o agente precisa.
Essa tensao e a decisao inteira.

**Progressive disclosure** e o movimento escada abaixo — para fora do arquivo principal e atras de um
ponteiro — para o topo seguir legivel. Nao e primariamente otimizacao de token: e como a hierarquia e
protegida. Branching e o teste mais limpo: inline o que todo branch precisa, empurre atras de
ponteiro o que so alguns alcancam. Num documento com steps, reference in-file que deveria estar
disclosed soterra os steps e transforma prestar atencao neles num cara-ou-coroa — alavanca de
variancia, nao so de legibilidade.

**Co-location** e a companheira intra-arquivo: onde a escada decide *quao fundo* uma peca fica,
co-location decide *o que fica ao lado dela* uma vez la. Mantenha definicao, regras e ressalvas de um
conceito sob um mesmo heading em vez de espalhadas, para que ler uma parte traga as vizinhas junto. O
teste: o documento deve ler como documentacao escrita para o agente — material agrupado le assim,
material espalhado nao. (Distinto de duplicacao: aquela repete um significado em dois lugares;
espalhamento fragmenta um significado por muitos.)

**Sprawl** e o modo de falha daqui: um documento simplesmente longo demais, mesmo com toda linha viva
e unica. A atencao se dilui no excesso, e cada linha extra e mais uma para manter relevante. A cura e
a escada: disclose reference atras de ponteiros, e divida por branch ou sequencia para cada caminho
carregar so o que precisa.

## Steps e criterios de completude

Todo step termina num **criterio de completude** — a condicao que diz ao agente que o trabalho
acabou. Duas propriedades o tornam alavanca:

- **Clareza** — o agente distingue pronto de nao-pronto? Um bound vago ("entendimento alcancado")
  convida **premature completion**: encerrar o step antes de estar genuinamente pronto, com a atencao
  escorregando para *estar pronto*. Os steps visiveis mais adiante — os **post-completion steps** —
  fornecem o puxao; a clareza do criterio e a resistencia. Defenda nesta ordem: **afie o bound
  primeiro** (local e barato); so se ele for irredutivelmente difuso *e* voce observar a pressa,
  esconda os steps seguintes dividindo a sequencia — e esconder so funciona atravessando uma
  fronteira de contexto real (um hand-off ou um despacho de subagente; uma chamada inline deixa os
  steps seguintes em contexto e nao limpa nada).
- **Demanda** — quanto o criterio exige. "Todo model modificado contabilizado" forca trabalho
  minucioso onde "produza uma lista de mudancas" nao forca. Demanda dirige **legwork** — a escavacao
  que o agente faz dentro do trabalho, latente na redacao em vez de escrita como step proprio — e nao
  esta presa a steps: "toda regra aplicada" prende um corpo de reference plana tao bem quanto "todo
  step feito" prende uma sequencia, e e assim que um documento so-reference ainda carrega uma barra
  de exaustividade.

Os criterios mais fortes sao ao mesmo tempo checaveis e exaustivos.

## Quando dividir

Dividir um documento em dois gasta uma das duas cargas, entao divida so quando o corte se paga:

- **Por sequencia** — divida uma corrida de steps onde os post-completion steps tentam o agente a
  apressar o step da frente. Mante-los fora de vista gera mais legwork na tarefa atual. Cuidado com o
  inverso: fundir sequencias expoe os steps seguintes de cada step ao que vem depois, convidando
  premature completion.
- **Por invocacao** — especifico de skill: ver [`SKILL-MECHANICS.md`](./SKILL-MECHANICS.md).

## Leading words

Uma **leading word** e um conceito compacto que ja vive no pre-treino do modelo e com o qual o agente
pensa enquanto roda o documento (*lesson*, *fog of war*, *tracer bullets*). Repetida como token,
nunca como frase, ela acumula uma definicao distribuida e ancora uma regiao inteira de comportamento
no menor numero de tokens, recrutando priors que o modelo ja tem. Cunhar a sua propria funciona se
voce definir com clareza, mas palavra inventada nao recruta prior nenhum — voce paga em tokens de
definicao o que uma palavra pre-treinada da de graca; procure primeiro uma que ja exista.

Ela ancora duas vezes. No corpo, *execucao*: o agente busca o mesmo comportamento toda vez que a
palavra aparece, e dentro de reference plana ela foca a atencao numa classe de coisa a procurar. Num
ponteiro, *invocacao*: quando a mesma palavra vive nos seus prompts, nos seus docs e no seu codebase,
o agente liga essa linguagem compartilhada ao material e o alcanca com mais confiabilidade.

Cace oportunidades de refatorar com leading words. Uma triade soletrada em tres lugares, um ponteiro
gastando uma frase para gesticular sobre uma ideia — cada uma e uma passagem implorando para colapsar
num token so:

- "rapido, deterministico, de baixo overhead" -> *tight* (um loop *tight*).
- "um loop em que voce confia" -> *red* — um gate difuso vira estado binario observavel (o loop fica
  *red* no bug, ou nao fica).

Voce ganha duas vezes: menos tokens, e um gancho mais afiado para o agente pendurar o raciocinio.
Assuma que todo documento carrega reafirmacoes que leading words aposentam — va procura-las.

**Negacao** e o modo de falha ao lado desta alavanca: dirigir por proibicao arrasta o comportamento
proibido para o contexto e o torna *mais* disponivel, nao menos. *Nao pense num elefante*, e o
elefante e tudo que existe; a negacao e um modificador fraco que o conceito fortemente ativado
atropela, entao a proibicao meio-le como instrucao para fazer a coisa. Prompt o **positivo** —
enuncie o comportamento-alvo ("escreva comentarios de uma linha") para que o proibido nunca seja
dito. Uma proibicao so se paga como guardrail duro que voce nao consegue enunciar no positivo; e
mesmo ai, emparelhe com o alvo positivo para a atencao aterrissar no que fazer.

## Poda

- Mantenha cada significado numa **single source of truth**: um lugar autoritativo, para que mudar o
  comportamento seja uma edicao num lugar so. **Duplicacao** — o mesmo significado em mais de um
  lugar — custa manutencao e tokens, e infla a proeminencia daquele significado na escada acima do
  seu rank real. (O inverso acidental de uma leading word, que repete um token de proposito, nunca o
  significado.)
- O **environment** tambem e fonte de verdade — scripts do `package.json`, arquivos de config, o
  layout de diretorios, output de `--help` — e um documento que o reafirma e um **cache**: uma copia
  de um lookup, que so se paga quando o lookup e caro. Cacheie o que o agente nao acha olhando: a
  convencao nao-escrita, a razao por tras de uma escolha, o gotcha que nenhum config confessa. Deixe
  os lookups de um arquivo, um comando para o environment, onde nao envelhecem.
- Cheque **relevancia** em toda linha: ela ainda incide sobre o que o documento faz? Uma linha perde
  relevancia por nunca incidir na tarefa (mera exposicao, ou um branch que deveria estar disclosed)
  ou por envelhecer conforme muda o comportamento ou o mundo que descreve. Documentos mais curtos sao
  mais faceis de manter relevantes. Sem disciplina de poda o destino default e **sediment**: camadas
  velhas que se depositam porque adicionar parece seguro e remover parece arriscado, ate voce ter que
  perfurar por elas para achar o que ainda esta vivo.
- Cace **no-ops** frase a frase: uma instrucao que o modelo ja obedece por default paga carga para
  nao dizer nada. O teste — isso muda o comportamento em relacao ao default? — e relativo ao modelo,
  nao ao leitor: duas pessoas discordando sobre um no-op discordam sobre o default, e resolvem
  rodando o documento, nao debatendo. Quando uma frase falha, delete a frase inteira em vez de aparar
  palavras. O teste tambem avalia leading words: uma palavra fraca demais para bater o default (*seja
  minucioso*, quando o agente ja e meio-minucioso) e um no-op, e a correcao e uma palavra mais forte
  (*implacavel*), nao outra tecnica.

## Armadilhas deste harness

O que o agente nao descobre olhando o ambiente. Scripts, layout e config o environment ja responde —
estas quatro nao estao em config nenhum.

| Armadilha | Regra | Fonte |
|---|---|---|
| Fence aninhado em `SKILL.md` | Bloco de codigo que contem triple backticks precisa de um fence externo de **quatro** backticks, senao o parser quebra no meio da skill | [compound 2026-04-21](../../docs/compound/2026-04-21-blocos-codigo-aninhados-skill-md.md) |
| Bloco de codigo nao executa | `SKILL.md` e prompt lido pelo agente. Efeito colateral (escrever arquivo, emitir metrica) exige gatilho externo em `hooks/hooks.json` — sem hook registrado, a instrumentacao nao existe | [compound 2026-05-12](../../docs/compound/2026-05-12-skill-md-code-blocks-do-not-execute.md) |
| CRLF em markdown | Grave LF. `.gitattributes` nao cobre `*.md`, entao no Windows o working tree fica CRLF por `core.autocrlf`. `harness-validate` hoje aceita `\r?\n`, mas o regex original nao aceitava e o erro e invisivel no editor | [compound 2026-05-19](../../docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md) |
| Path-em-doc envelhece calado | Path escrito numa skill e contrato com o agente, nunca executado por teste. Quando o layout migra, o agente segue a instrucao velha e grava no lugar errado sem erro nenhum. Confira o path antes de referenciar | [compound 2026-05-14](../../docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md) |

## `docs/` vs runtime asset

Material que precisa chegar ao projeto-alvo via `/init` nao pode viver em `docs/`: `sync-to-global.sh`
propositalmente nao copia `docs/` para o cache global. Escrever a referencia no lugar errado a
prende neste repo.

Detalhe da convencao: [ARCHITECTURE.md](../../ARCHITECTURE.md), secao Conventions.

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Preciso explicar o contexto antes" | Contexto que nao muda o comportamento e no-op. O agente tem o repo; cacheie so o que ele nao acha olhando. |
| "Melhor deixar detalhado por seguranca" | Detalhe que nenhum branch alcanca e sprawl. Cada linha extra dilui a atencao das linhas que decidem. |
| "Essa secao pode ser util algum dia" | Utilidade futura e context load hoje. Enquanto nenhum branch a alcanca, ela nao existe para o agente — e vira sediment. |
| "Melhor repetir para garantir" | Duplicacao cria dois lugares para editar e infla o rank do significado na escada. Repita o token, nunca o significado. |
| "Preciso proibir esse comportamento" | Proibir arrasta o comportamento para o contexto e o torna mais disponivel. Enuncie o alvo positivo. |
| "Traduzo os termos para ficar mais claro" | Leading word traduzida perde o prior pre-treinado que era a unica razao de usa-la. O termo em ingles e o mecanismo. |

## Red Flags

- Description listando sinonimos que renomeiam o mesmo branch.
- Documento reafirmando `package.json`, layout de pastas ou output de `--help` sem que o lookup seja caro.
- Criterio de completude com bound vago — "entendimento alcancado", "cobertura suficiente", "95%".
- Secao que nenhum branch alcanca, nem inline nem por ponteiro.
- Proibicao sem o alvo positivo ao lado.
- Frase que o modelo ja obedeceria por default.
- Ponteiro cujo alvo mudou de lugar — path-em-doc nao quebra teste.
