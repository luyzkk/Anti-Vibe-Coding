# Formato do `GLOSSARY.md`

Como gravar uma entrada em `docs/GLOSSARY.md`. A disciplina que produz as entradas — desafiar, afiar,
sondar, cruzar com o codigo — vive em [`SKILL.md`](../SKILL.md).

## Estrutura

```md
# Glossario

Uma ou duas frases sobre o que este dominio e.

## Language

**Order**:
Um pedido de compra confirmado por um Customer, com itens e um estado de fulfillment.
_Evitar_: Purchase, transaction

**Invoice**:
Uma cobranca enviada ao Customer depois da entrega.
_Evitar_: Bill, payment request

**Customer**:
Pessoa ou organizacao que faz Orders.
_Evitar_: Client, buyer, account
```

## Regras

- **Ser opinativo.** Quando varias palavras existem para o mesmo conceito, escolher a melhor e listar
  as outras em `_Evitar_`. A palavra rejeitada e conteudo: e ela que impede o termo de voltar pela
  porta dos fundos na proxima sessao.
- **Definicao curta.** Uma ou duas frases, definindo o que a coisa **e**. "Um pedido confirmado por
  um Customer" define; "valida o estoque e emite um evento" descreve comportamento, que muda sem que
  o conceito mude.
- **Agrupar sob subtitulo** quando clusters naturais surgirem. Lista plana serve enquanto o conjunto
  for coeso.
