# Formato do `GLOSSARY.md`

Como gravar uma entrada em `docs/GLOSSARY.md`. A disciplina que produz as entradas — desafiar, afiar,
sondar, cruzar com o codigo — vive em [`SKILL.md`](../SKILL.md).

## Estrutura

Os rotulos — `## Language`, `_Avoid_` — sao fixos em ingles, como em todo doc que o `/init` instala.
O que voce escreve dentro deles segue a lingua do projeto.

```md
# Glossary

One or two sentences on what this domain is.

## Language

**Order**:
A purchase confirmed by a Customer, with items and a fulfillment state.
_Avoid_: Purchase, transaction

**Invoice**:
A charge sent to the Customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places Orders.
_Avoid_: Client, buyer, account
```

## Regras

- **Ser opinativo.** Quando varias palavras existem para o mesmo conceito, escolher a melhor e listar
  as outras em `_Avoid_`. A palavra rejeitada e conteudo: e ela que impede o termo de voltar pela
  porta dos fundos na proxima sessao.
- **Definicao curta.** Uma ou duas frases, definindo o que a coisa **e**. "Um pedido confirmado por
  um Customer" define; "valida o estoque e emite um evento" descreve comportamento, que muda sem que
  o conceito mude.
- **Agrupar sob subtitulo** quando clusters naturais surgirem. Lista plana serve enquanto o conjunto
  for coeso.
