---
name: prototype
description: "Build throwaway code that answers one design question. Use when sanity-checking whether a state model or a piece of logic feels right, or when exploring what a screen should look like before committing to it."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Bash
argument-hint: "[a pergunta que o prototipo precisa responder]"
---

# Prototype

Um prototipo e **codigo descartavel que responde uma pergunta**. A pergunta decide a forma.

Discutir no abstrato parece mais barato na hora e sai mais caro depois: o modelo que fecha no papel
so revela o buraco quando alguem clica nele. Construir para descobrir e o movimento que ninguem
lembra de fazer.

## Escolher o ramo

Identificar **qual pergunta** esta sendo respondida — pelo pedido do usuario, pelo codigo em volta,
ou perguntando, se ele estiver por perto. Este e o passo que mais decide o resultado: **errar o ramo
desperdica o prototipo inteiro.**

| A pergunta | O ramo | O que sai |
|---|---|---|
| *"essa logica / esse modelo de estado parece certo?"* | [LOGIC.md](./references/LOGIC.md) | Um HTML unico e compartilhavel, com botoes de *free-play* e *walkthroughs* em abas, que empurra o modelo pelos casos dificeis de raciocinar no papel — e que um nao-desenvolvedor dirige |
| *"como isso deveria parecer?"* | [UI.md](./references/UI.md) | Varias variantes radicalmente diferentes na mesma rota, trocaveis por search param e por uma barra flutuante — de preferencia embutidas numa pagina que ja existe, porque toda variante parece boa no vacuo |

Pergunta genuinamente ambigua e usuario fora de alcance: escolher pelo codigo em volta — modulo de
backend puxa **logic**, pagina ou componente puxa **UI** — e **declarar a suposicao no topo do
prototipo**. Suposicao escrita e verificavel; suposicao silenciosa vira o prototipo errado descoberto
tarde.

## Regras dos dois ramos

1. **Descartavel desde o dia um, e marcado como tal.** Fica perto de onde vai ser usado, para o
   contexto ser obvio, com nome que denuncia que e prototipo para quem passar os olhos. Rota
   descartavel obedece a convencao de roteamento que o projeto ja usa.
2. **Trivial de rodar.** Um comando do task runner do projeto, ou um HTML que abre com dois cliques.
   Zero pensamento para comecar.
3. **Estado em memoria.** Persistencia e o que o prototipo **checa**, nao aquilo de que ele depende.
   Quando a pergunta e sobre banco, usar scratch DB com nome que se entrega — `PROTOTIPO — apagar`.
4. **Sem polimento.** O tratamento de erro vai ate onde o prototipo roda, e para ai. O ponto e
   aprender rapido.
5. **Expor o estado.** Depois de cada acao (logic) ou troca de variante (UI), mostrar o estado
   relevante inteiro, para a mudanca ficar visivel.
6. **Capturar quando acabar.** A `main` fica so com a decisao validada. O prototipo e a resposta que
   ele produziu tem cada um o seu destino — secao **Capturar**, abaixo.

## Capturar

Um prototipo respondido produz **tres coisas**, e cada uma tem destino proprio:

| O que | Onde vai |
|---|---|
| **A decisao validada** | O codigo real — o reducer sobe para o modulo; a variante vencedora e **reescrita direito** na pagina, nao promovida como esta |
| **O prototipo inteiro** | Branch descartavel, como fonte primaria. Nome no formato `<prefixo>/prototype-<slug>`, com o prefixo que o projeto ja usa — a convencao esta em [`git-workflow-and-versioning`](../git-workflow-and-versioning/SKILL.md). **Nao mergear** |
| **A resposta** | O plano ou o PRD da feature que o prototipo serviu, em `docs/exec-plans/` — o veredito **e** a pergunta que ele fechou |

O terceiro e o que mais se perde, e o que mais custa. Prototipo guardado sem a conclusao vira
artefato mudo: quem abre a branch seis meses depois ve **o que foi construido**, nunca **o que aquilo
decidiu**. A branch e a fonte primaria; o ponteiro para ela mora junto da resposta.

A `main` nao recebe nada disso — nem a casca HTML, nem as variantes perdedoras, nem a barra de troca.

## Linguagem de dominio

Rotulos, botoes e estado leem como o negocio, nao como o reducer — e por isso que um domain expert
consegue dirigir. Onde o projeto tiver `docs/GLOSSARY.md`, o vocabulario vem de la; onde nao tiver,
valem os termos que o usuario usa falando. **Degradar, nao quebrar.**

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Ja discutimos bastante, da para decidir sem construir" | O modelo que fecha no papel e exatamente o que o prototipo derruba em tres cliques. Se ninguem clicou, ninguem sabe |
| "Escrevo um teste para provar que o modelo fecha" | Prototipo que precisa de teste deixou de ser prototipo. O teste prova o que voce ja imaginou; o clique revela o que voce nao imaginou |
| "Aproveito e ja deixo pronto para produção" | Codigo escrito sob restricao de prototipo (sem teste, sem tratamento de erro) chega em producao como divida. Quando a variante vencer, **reescrever direito** |
| "Ligo no banco real, e mais fiel" | Fidelidade que voce paga em setup e a que impede o prototipo de ser jogado fora. Memoria, salvo se a pergunta for sobre persistencia |
| "Uso o framework do projeto, ja esta configurado" | O prototipo LOGIC vale por abrir com dois cliques na maquina de quem nao programa. Bundler mata isso |

## Red Flags

- Prototipo sem a pergunta escrita **visivel na pagina** — comentario nao conta.
- Modulo de logica alcancando `document` ou handler de botao: deixou de ser liftavel.
- Cenario de walkthrough que so percorre o caminho feliz.
- Prototipo commitado na `main`, ou barra de troca de variante alcancavel em producao.
- Segunda pergunta entrando no mesmo prototipo.
- Prototipo respondido e nunca capturado — a resposta mora na cabeca de quem clicou.
