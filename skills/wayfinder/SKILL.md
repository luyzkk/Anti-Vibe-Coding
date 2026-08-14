---
name: wayfinder
description: "Chart a large effort as a map of decision tickets, then work them one at a time. Run it when an idea is too big for one agent session and the way to the destination is still fogged — you can see where you want to land, but cannot yet name the questions in between."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, Agent, AskUserQuestion
argument-hint: "[a ideia solta, ou o caminho do mapa]"
---

# Wayfinder

Chegou uma ideia solta — grande demais para uma sessao, e embrulhada em **fog of war**: o caminho
daqui ate o **destino** ainda nao aparece. Wayfinding e achar esse caminho, nao avancar direto no
destino.

Esta skill carta o caminho como um **mapa** de **decision tickets** — perguntas cuja resolucao e uma
decisao, nunca fatias de um build a executar — e depois trabalha um ticket por vez ate a rota estar
clara.

O destino muda a cada esforco, e nomea-lo e o primeiro ato de cartografar, porque ele fixa o escopo e
molda todo ticket. Pode ser uma spec para entregar adiante, uma decisao a travar antes do
planejamento comecar, ou uma mudanca feita no lugar. O mapa e agnostico de dominio.

O formato do mapa e do ticket vive em [`FORMATS.md`](./references/FORMATS.md).

## Quando o mapa nao se paga

A maioria das features **cabe** numa sessao, e para essas o mapa e burocracia. O passo 2 do modo
chart e o filtro: se grelhar breadth-first nao revelar fog of war, o caminho ja esta claro — parar e
dizer isso.

Entrada para `/write-prd` quando voce **consegue nomear** a feature. Entrada aqui quando voce ainda
esta descobrindo **quais sao as perguntas**.

## O mapa e indice, nao deposito

O mapa lista as decisoes tomadas e aponta para os tickets que guardam o detalhe. Uma decisao vive em
**exatamente um lugar** — seu ticket. O mapa a resume numa linha e linka.

Os tickets abertos sao arquivos em `tickets/`, achados pelo script `wayfinder:frontier` — o mapa
carrega o esforco inteiro em baixa resolucao, lido uma vez por sessao.

## Referir por nome

Todo mapa e todo ticket tem um **titulo**. Em tudo que o humano le — narracao, *Decisions so far*,
saida de script — referir por esse titulo. Uma parede de `001, 002, 003` e ilegivel; nomes leem de
relance. O numero nao some: ele ordena o arquivo e resolve bloqueio, e viaja **dentro** do nome, como
o link que o nome carrega.

## Fronteira

Cada ticket declara `blocked-by`. Um ticket esta **desbloqueado** quando todo ticket que o bloqueia
esta fechado; a **fronteira** e o conjunto dos abertos, desbloqueados e nao reivindicados — a borda
do conhecido, o que da para pegar agora.

E a mesma fronteira do [`grill-me`](../grill-me/SKILL.md), numa escala maior: la sao decisoes do
design tree cujos pre-requisitos ja foram respondidos, dentro de uma entrevista; aqui sao tickets
cujos bloqueadores ja fecharam, ao longo de muitas sessoes. Mesmo grafo, mesma pergunta — *o que da
para decidir agora sem chutar resposta que ainda nao se ouviu?* — e a mesma condicao de fim: quando a
fronteira esvazia, acabou.

O `grill-me` ja aponta para ca: quando um round dele produz mais fronteira do que resolve duas vezes
seguidas, ele para e diz que o pedido precisa de um mapa. Este e o mapa.

## Fog of war

O mapa e **deliberadamente incompleto**: carte o que da para ver. Alem dos tickets vivos fica o **fog
of war** — a visao turva de decisoes que voce percebe vindo mas ainda nao consegue fixar, porque
dependem de perguntas ainda abertas. Resolver um ticket clareia o fog a frente dele, **graduando**
para ticket o que ficou especificavel.

A secao *Not yet specified* do mapa e onde essa visao turva fica escrita. Vale tambem como placa para
quem le por onde o esforco esta indo.

**Fog ou ticket?** O teste e se voce consegue **enunciar a pergunta com precisao agora** — nao
responde-la.

- **Ticket** quando a pergunta ja esta nitida, mesmo bloqueada e sem poder agir nela ainda
- **Not yet specified** quando ainda nao da para formular assim

Escreva o fog na granularidade grossa em que ele aparece — ele e mais grosso que um ticket, e um
trecho pode graduar em varios tickets, ou em nenhum, quando a fronteira chegar la.

*Not yet specified* cobre so o que ainda nao esta decidido, nao e ticket vivo, e esta dentro do
escopo.

## Out of scope

Fog so se acumula **em direcao ao destino**. O destino fixa o escopo, entao trabalho alem dele e
**out of scope** — e escopo, nao nitidez, que decide isso. Ganha secao propria no mapa.

Quando um ticket que ja existe se revela alem do destino — mal-escopado na cartografia, ou exposto
por uma resolucao — **fecha-lo** (ticket fechado esta inequivocamente fora da fronteira) e deixar uma
linha na secao *Out of scope*: o resumo, o motivo, e o link para o ticket fechado. Fica fora de
*Decisions so far*, que registra a rota efetivamente andada — uma fronteira de escopo nao e um passo
dela.

Out of scope **nunca gradua**: a fronteira para no destino. So volta se o destino for redesenhado, e
ai como esforco novo.

## Tipos de ticket

Todo ticket e **HITL** — trabalhado junto de um humano, que fala por si — ou **AFK**, dirigido pelo
agente sozinho. Ticket HITL resolve pela troca ao vivo: o lado humano e do humano.

| Tipo | Modo | O que e | Resolve com |
|---|---|---|---|
| `research` | AFK | Ler documentacao, API de terceiro ou base de conhecimento para revelar um fato de que uma decisao depende. Use quando o conhecimento esta fora do diretorio de trabalho | Subagente, gravando na convencao de [`source-driven-development`](../source-driven-development/SKILL.md) |
| `prototype` | HITL | Subir a fidelidade da conversa com um artefato concreto, barato e tosco para reagir. Use quando *"como isso deveria parecer"* ou *"como deveria se comportar"* e a pergunta central | [`/prototype`](../prototype/SKILL.md); o prototipo entra no ticket como link |
| `grilling` | HITL | Conversa. O caso default | [`/grill-me`](../grill-me/SKILL.md) e [`/domain-modeling`](../domain-modeling/SKILL.md) |
| `task` | HITL ou AFK | Trabalho manual que precisa acontecer antes de uma **decisao** poder ser tomada | O agente sozinho onde da; senao, entrega ao humano um checklist preciso |

`task` e o unico tipo que **faz** em vez de decidir, e se justifica por desbloquear uma decisao,
nunca por entregar o destino: assinar um servico para poder julgar a API, provisionar acesso, mover
dados para ver o formato. A resposta registra o que foi feito e os fatos resultantes — onde ficaram
as credenciais, as URLs novas, a contagem de linhas — de que tickets posteriores dependem.

## Modo chart — cartografar

Usuario invoca com uma ideia solta.

1. **Nomear o destino.** Rodar uma sessao de `/grill-me` e `/domain-modeling` para fixar o que este
   mapa esta procurando — a spec, a decisao, a mudanca. O destino fixa o escopo, entao vem primeiro
2. **Mapear a fronteira.** Grelhar de novo, agora **breadth-first**: abrir em leque pelo espaco
   inteiro em vez de fundo numa linha so, revelando as decisoes abertas e os primeiros passos
   possiveis agora. **Se isso nao revelar fog of war** — o caminho ja esta claro, a jornada inteira
   cabe numa sessao — **parar e perguntar ao usuario como ele quer prosseguir**
3. **Criar o `MAP.md`**: destino e notas preenchidos, *Decisions so far* vazio, o fog esbocado em
   *Not yet specified*
4. **Criar os tickets que dao para especificar agora.** Depois, numa **segunda passada**, ligar as
   arestas de `blocked-by` — ids precisam existir antes de serem referenciados. A ligacao e o que
   separa a fronteira do bloqueado; o que nao deu para especificar continua no fog
5. **Disparar os subagentes de research** dos tickets `research` criados, em paralelo, cada um
   gravando numa branch descartavel com um ponteiro a partir do ticket
6. **Parar.** Cartografar e o trabalho de uma sessao inteira, e nao resolve ticket nenhum

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Ja que estou aqui, resolvo esse ticket tambem" | Cartografar e resolver sao sessoes diferentes. O passo 6 existe porque o mapa recem-feito e a hora em que o contexto esta mais cheio e o julgamento mais raso |
| "Deixo a decisao resumida no mapa para nao ter que abrir o ticket" | Duas versoes da mesma decisao divergem, e a do mapa e a que envelhece. O mapa gista e linka |
| "Ja consigo prever essas 5 perguntas, entao viro tickets agora" | Se voce consegue enuncia-las com precisao, sao tickets. Se esta prevendo, e fog — e fog pre-fatiado gradua errado |
| "Isso esta fora do destino, mas registro em *Not yet specified* por seguranca" | *Not yet specified* e o que ainda vai virar ticket. Escopo descartado que fica la volta a ser trabalhado |
| "Esse ticket de grilling eu consigo responder sozinho" | Um agente de grilling que responde as proprias perguntas quebrou a unica coisa que separa descoberta de teatro |
| "O caminho ja esta claro, mas o mapa documenta bem" | Mapa para trabalho que cabia numa sessao e burocracia. O passo 2 tem saida explicita |

## Red Flags

- Ticket que entrega um pedaco do destino em vez de resolver uma decisao.
- Linha de *Decisions so far* que reafirma o conteudo do ticket em vez de resumi-lo.
- `## Not yet specified` fatiado em itens do tamanho de ticket.
- Item que saiu para *Out of scope* reaparecendo como ticket sem o destino ter sido redesenhado.
- Ticket criado e `blocked-by` preenchido na mesma passada — o id referenciado pode nao existir.
- Mapa cartografado para um esforco que a grelhagem breadth-first mostrou caber numa sessao.
