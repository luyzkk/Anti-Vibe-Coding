# Fatia 3 — A porta de entrada

Detalhe da fatia 3 do [PRD da 8.0](./PRD.md), escrito quando ela começou (D3). As decisões abaixo
saíram da entrevista de 2026-10-14, uma pergunta por vez.

## Decisões

| # | Decisão |
|---|---|
| F3-1 | Três níveis de risco: experimento, produto e dinheiro, saúde ou dados. O Claude propõe o nível pelo que a feature toca e o usuário confirma. |
| F3-2 | A página de cada feature cabe numa folha: nível de risco, apetite, problema, solução, MoSCoW em português (precisa ter, deveria ter, poderia ter, não terá), premissa mais arriscada, cenários, fatias e como saber que ficou pronto. |
| F3-3 | O documento de desenho entra quando o sistema pede: dado novo no banco, partes que conversam entre si (fila, webhook, tarefa agendada) ou dinheiro mudando de estado. No nível dinheiro, saúde ou dados ele é obrigatório e guarda o mapa de ameaças. Fora desse nível o usuário pode recusar. |
| F3-4 | O plano vem em fatias. A página lista as fatias, uma linha cada; o plan-feature detalha só a que vai começar; ao fechar uma, o Claude oferece detalhar a próxima. |
| F3-5 | No fim de cada entrega feita pela página, o Claude explica em até 8 linhas simples o que mudou, por quê, como conferir com os próprios olhos e o que pode dar errado. No nível dinheiro, saúde ou dados, o usuário conta com as próprias palavras o que foi feito e o Claude corrige o que ficou torto. |
| F3-6 | A fatia é feita fase a fase, até 5 arquivos por fase, com aprovação do usuário no fim de cada uma. |

## O que cada nível muda

| | Experimento | Produto | Dinheiro, saúde ou dados |
|---|---|---|---|
| Quando | protótipo, teste de ideia, ninguém real depende | pessoas reais usam, mas um erro não custa dinheiro, saúde nem expõe dado pessoal | um erro cobra errado, libera acesso indevido, expõe dado pessoal ou orienta errado sobre saúde |
| Página | problema, solução e como saber que ficou pronto | inteira | inteira |
| Cenários | os do essencial | escritos pelo Claude, revistos junto com a página | aprovados pelo usuário antes do código, com os casos de abuso |
| Desenho | não | quando o sistema pede | obrigatório, com o mapa de ameaças |
| Prova | o teste de cada cenário | o teste de cada cenário | o teste de cada cenário, e a máquina quebra a defesa de propósito para ver o teste cair |
| Explicação no fim | curta | curta | curta, e o usuário explica de volta |

Se o usuário baixar o nível de uma feature que toca dinheiro ou dado pessoal, o Claude diz em uma
linha o que deixa de ser conferido. A escolha continua sendo do usuário.

## O que a D2 troca

Hoje, nas fases de risco, o Claude para antes de cada GREEN para o usuário aprovar o teste. Com a D2,
essa aprovação acontece uma vez, nos cenários da página, e a prova vem da máquina: a etapa que quebra a
defesa de propósito e exige que o teste caia (`RED-check`) já existe e continua. Ficam como estão a
parada do primeiro teste da feature (tracer bullet) e o nível Guiado, que para em toda fase por escolha
de quem quer aprender a escrever testes.

## Fases

1. **A página.** Modelo da página, modelo do documento de desenho, write-prd e os testes que travam os
   dois modelos.
2. **Cenários e mapa de ameaças.** execute-plan, tdd-workflow e o agente executor leem os casos de abuso
   da página e o mapa de ameaças do desenho; a parada por fase de risco sai (D2).
3. **Plano em fatias.** plan-feature lê a página nova e detalha só a próxima fatia; execute-plan oferece
   detalhar a seguinte ao fechar uma.
4. **Explicação no fim.** As 8 linhas no fim da entrega e a explicação de volta no nível de risco;
   documentação do pipeline.

## Fora desta fatia

- O bloqueio de código sem teste continua valendo para todo o projeto. Ajustar esse bloqueio por nível
  depende do nível declarado no projeto, que é a fatia do init (D11).
- O `detect-architecture` e o trecho de estrutura que ele injeta saem na fatia dos guias.
