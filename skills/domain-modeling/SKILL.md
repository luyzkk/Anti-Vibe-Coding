---
name: domain-modeling
description: "Build and sharpen the project's ubiquitous language. Use when a term clashes with the glossary, when wording is vague or overloaded, when the domain model is under discussion, or when another skill maintains it. Changing the model, not consuming it."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "[termo ou area do dominio a afiar]"
---

# Domain Modeling

Construir e afiar a **ubiquitous language** do projeto — o vocabulario em que negocio e codigo usam
a mesma palavra para a mesma coisa. Ela vive em `docs/GLOSSARY.md`, e esta skill e a disciplina
**ativa** de forma-la: desafiar termos, sondar bordas com cenarios, e gravar a distincao no instante
em que ela endurece.

Ler o glossario para nomear uma variavel nao e esta skill — e uma linha de habito que qualquer skill
faz. Esta skill roda quando o modelo esta sendo **mudado**.

Onde `docs/GLOSSARY.md` ainda nao existir, crie no primeiro termo resolvido e siga.

## Durante a sessao

### Desafiar contra o glossario

Termo do usuario que conflita com a definicao gravada: apontar na hora.

*"seu glossario define 'cancelamento' como X, mas voce parece querer dizer Y — qual e?"*

### Afiar linguagem difusa

Termo vago ou sobrecarregado: propor o termo canonico preciso.

*"voce diz 'conta' — e Customer ou User? Sao coisas diferentes."*

### Sondar com cenarios concretos

Relacao de dominio em discussao: inventar cenarios que batem na borda e forcam precisao na fronteira
entre dois conceitos. O cenario e o instrumento — pergunta abstrata recebe resposta abstrata.

### Cruzar com o codigo

O usuario afirma como algo funciona: conferir se o codigo concorda, e trazer a contradicao a tona.

*"seu codigo cancela Orders inteiras, mas voce disse que cancelamento parcial existe — qual esta certo?"*

### Gravar no momento

Termo resolvido entra no `docs/GLOSSARY.md` naquele turno, no formato de
[`GLOSSARY-FORMAT.md`](./references/GLOSSARY-FORMAT.md). Termo guardado para gravar no fim da sessao
e termo perdido: o valor esta em capturar enquanto a distincao ainda esta fresca.

## O que entra no glossario

**Um termo e o que ele e.** Cada entrada define uma coisa do dominio em uma ou duas frases. Detalhe
de implementacao vive no codigo, decisao tecnica vive no ADR, rascunho vive no PRD — o glossario
continua consultavel exatamente porque nao acumula nenhum dos tres.

**So o termo que so faz sentido neste negocio.** O teste antes de adicionar: *quem chega neste repo
ja sabe o que esta palavra significa aqui?* Timeout, retry, DTO e feature flag ficam de fora por
mais que o projeto os use — quem le ja sabe. Palavra comum que carrega sentido local divergente e o
caso de maior valor, e nao o duvidoso: e onde o leitor assume o sentido errado com confianca.

## Fronteira com o `decision-registry`

**Termo** vai para o glossario; **decisao** vai para ADR, via
`/anti-vibe-coding:decision-registry`. Uma mesma conversa costuma produzir os dois — grave nos dois
lugares, cada um no seu.

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Anoto o porque junto do termo, para nao perder" | Porque e decisao, e decisao vai para ADR. Glossario que guarda justificativa vira spec, e ninguem abre uma spec para escolher uma palavra |
| "'Timeout' entra porque o projeto usa muito" | Frequencia nao e especificidade. Quem le ja sabe o que timeout e; nao sabe o que voces chamam de "ciclo" |
| "Junto os termos e gravo tudo no fim" | A distincao esfria. O que se grava no fim e a versao lembrada, nao a resolvida |
| "Os dois nomes servem, deixo os dois" | Glossario que aceita dois nomes so moveu a ambiguidade para dentro do arquivo |

## Red Flags

- Entrada de glossario citando nome de classe, tabela ou endpoint.
- Termo que qualquer projeto de qualquer dominio teria.
- Definicao que diz o que a coisa faz em vez do que ela e.
- Entrada sem `_Evitar_` quando havia sinonimo em disputa — a palavra rejeitada e o conteudo.
- Glossario crescendo numa sessao que so consumiu o modelo, sem muda-lo.
