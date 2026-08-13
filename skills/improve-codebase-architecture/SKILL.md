---
name: improve-codebase-architecture
description: "Periodic architecture sweep. Run it every few days to surface deepening opportunities — shallow modules, leaky seams, code that is hard to test through its current interface — scoped to the repo's git hot spots and ranked by strength."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Agent, Write
argument-hint: "[modulo, subsistema ou ponto de dor a varrer — opcional]"
---

# Improve Codebase Architecture

Varredura **periodica** atras de *deepening opportunities*: os lugares onde um modulo **shallow**
poderia virar **deep**. Rode a cada poucos dias, sem que nada tenha acontecido — e a unica skill do
plugin que nao reage a uma mudanca recem-feita.

**Levantamento, nao resgate.** Num codebase velho ela acha candidatos reais, e para ai: quem
desemaranha a lama e voce, com o `/anti-vibe-coding:design-twice` desenhando a interface. Um
levantamento honesto vale mais que um resgate prometido.

O vocabulario inteiro — **deep** e **shallow**, **seam**, **adapter**, **leverage**, **locality**, o
**deletion test**, as 4 categorias de dependencia — vive em
[deep-modules.md](../tdd-workflow/references/deep-modules.md). Leia antes de varrer e use os termos
como eles estao la: sao o que torna um card legivel em vez de generico.

Onde `docs/GLOSSARY.md` existir, ele nomeia o dominio — *"o modulo de entrada de Order"*, nunca *"o
OrderHandler"*. Onde nao existir, os nomes que o codigo ja usa servem.

## Passo 1: escopar antes de varrer

Aprofundar um modulo se paga tornando as mudancas **futuras** nele mais faceis. Codigo que ninguem
toca ha um ano nao devolve nada — **YAGNI**. Por isso o escopo vem antes da varredura, nesta ordem:

1. **O usuario deu direcao** — um modulo, um subsistema, um ponto de dor. Use, e pule a inferencia.
2. **Senao**, caminhe `git log --oneline` num trecho generoso e ache os **hot spots**: os arquivos e
   areas que reaparecem. Deixe esses caminhos puxarem a atencao primeiro.
3. **Mudancas espalhadas sem hot spot claro** — abra a rede.

Confira `git rev-list --count HEAD` antes de confiar no ranking: clone raso (`--depth 1`) devolve
historico truncado, e o hot spot que ele mostra e artefato do corte.

Leia os ADRs da area escolhida agora — eles decidem o Passo 4.

**Pronto quando** os caminhos que recebem atencao primeiro estao nomeados, e voce sabe dizer por que
cada um entrou.

## Passo 2: varrer por atrito

Spawne um subagente para caminhar os caminhos do Passo 1. A instrucao e explorar **organicamente** e
anotar onde se sente atrito — heuristica rigida acha o que a heuristica descreve, e o resto passa:

- entender um conceito exige pular entre muitos modulos pequenos?
- a interface e quase tao complexa quanto a implementacao — o modulo e **shallow**?
- funcao pura extraida so por testabilidade, enquanto o bug real mora em como ela e chamada (sem
  **locality**)?
- modulos acoplados vazando pelo **seam**?
- o que esta sem teste, ou dificil de testar pela interface atual?

O brief precisa carregar tres coisas: os caminhos escopados, o vocabulario de
[deep-modules.md](../tdd-workflow/references/deep-modules.md), e o filtro abaixo.

**Catalogo consultavel nao e atrito.** Referencia lida sob demanda — tabela de regras, lista de
padroes, glossario de conceitos, arquivo de dados — e legitimamente plana e legitimamente longa.
Tamanho nao e sinal. O sinal e o que o **caller** precisa aprender para usar: um arquivo longo onde
ninguem le mais que a entrada que veio buscar tem a interface de **uma** entrada. Sem esta linha no
brief, a varredura devolve conteudo valido como problema arquitetural, e o maior arquivo do repo
lidera a lista toda vez.

**Pronto quando** cada ponto de atrito tem os arquivos envolvidos e uma frase dizendo onde a friccao
aparece.

## Passo 3: o deletion test decide quem entra

Todo suspeito de **shallow** passa pelo **deletion test** antes de virar candidato: imagine deletar o
modulo e inline seu conteudo nos callers.

| O que acontece | Leitura | Destino |
|---|---|---|
| Nao ha caller nenhum fora dos testes | Ja esta deletado na pratica | Fora da lista — reporte como codigo morto |
| A complexidade **some** | Era **pass-through** | Fora da lista |
| Reaparece **espalhada em N callers** | O modulo estava se pagando | Candidato |
| Reaparece **concentrando num lugar** | Ha um modulo deep escondido ali | Candidato forte |

Conte os callers antes de imaginar a delecao — grep negativo vira achado so depois de um controle
positivo no mesmo comando, e um wrapper de **1 caller** da locality sem leverage, que e a forma mais
comum de shallow parecer util.

Este e o filtro que separa um levantamento de uma lista de 30 refactors genericos. Escreva o veredito
junto do candidato: e o que deixa o card verificavel por quem le.

**Pronto quando** todo candidato da lista tem o veredito do deletion test escrito.

## Passo 4: conferir contra os ADRs

Candidato que contradiz um ADR existente so vem a tona quando o atrito e **real o bastante para
justificar reabrir a decisao**. ADR existe para nao re-litigar; uma varredura que ignora isso devolve
todo ano a mesma discussao ja fechada.

Quando vier, marque no card com o numero e a razao: *"contradiz ADR-0007 — mas vale reabrir porque o
atrito custou 3 bugs no ultimo mes"*. O que vale a marca e a evidencia nova, nao a discordancia.

O mesmo vale para o que auditorias anteriores ja recusaram por razao load-bearing: motivo registrado
segue valendo ate o motivo mudar.

**Pronto quando** todo candidato foi conferido contra os ADRs da sua area.

## Passo 5: entregar e perguntar

Um candidato por card:

- **Arquivos** — os modulos envolvidos
- **Problema** — onde a arquitetura atual causa friccao hoje
- **Solucao** — em portugues claro, o que mudaria
- **Beneficios** — em termos de **leverage** (o que o caller ganha) e **locality** (o que o
  mantenedor ganha), e como os testes melhoram
- **Deletion test** — o veredito do Passo 3
- **Forca** — `Strong`, `Worth exploring` ou `Speculative`

Feche com a **recomendacao principal**: qual voce atacaria primeiro, e por que. Levantamento que
trata 12 candidatos como equivalentes empurra a escolha inteira de volta para o humano.

Entao pergunte: **"Qual destes voce quer explorar?"**

A varredura entrega candidatos e para ai. Desenhar a interface do modulo aprofundado e trabalho do
`/anti-vibe-coding:design-twice`, Dominio 5 — la saem tres propostas divergentes onde aqui sairia
uma, e a primeira interface que aparece e a que fecha a exploracao.

**Pronto quando** a pergunta foi feita.

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Varro o repo inteiro para nao perder nada" | Sinal uniforme e ruido. O hot spot existe porque aprofundar o que ninguem toca nao devolve nada |
| "Ja vi a interface certa, adianto no card" | A primeira interface fecha a exploracao. Tres divergentes existem para uma delas te surpreender |
| "Esse arquivo tem 600 linhas, e candidato" | Volume nao e profundidade. Meca pelo que o caller precisa aprender — catalogo consultavel e plano por design |
| "O ADR proibe, mas o refactor e melhor" | ADR existe para nao re-litigar. Reabrir precisa de evidencia nova, nao de preferencia |
| "Deletion test e obvio aqui, pulo" | O veredito nao escrito e o candidato que ninguem consegue conferir. Escrever leva uma linha |

## Red Flags

- Card cujo diagnostico nao usa nenhum termo de
  [deep-modules.md](../tdd-workflow/references/deep-modules.md) — friccao descrita em linguagem
  generica ainda nao foi identificada.
- Candidato sem veredito de deletion test.
- Lista longa com tudo em `Worth exploring` — selo que nao separa nada nao e selo.
- O maior arquivo do repo no topo da lista, com o tamanho como argumento.
- Varredura uniforme, sem escopo do Passo 1.
- Interface proposta dentro do card.
- Candidato que contradiz ADR sem a marca — ou marca em todo candidato.
