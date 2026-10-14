---
slug: {feature-kebab}
date: {YYYY-MM-DD}
status: draft
# `requires:` lista PRDs que precisam estar completos antes deste: string (`auth`) ou lista
# (`[auth, billing]`), com slug curto ou pasta completa (`2026-04-20-auth`). Vazio: nada a verificar.
requires: []
---

<!-- Comment Provenance (princípio universal #5): todo comentário em código gerado a partir desta
     página diz quem decidiu, quando e por quê.
     Ex.: `// 2026-05-04 (Luiz/dev): timeout 30s — igual ao upstream X` -->

# {Nome da feature}

**Nível de risco:** {experimento | produto | dinheiro, saúde ou dados} — {o que a feature toca e decide o nível}
**Apetite:** {quanto tempo vale gastar, ex.: 3 dias. Estourou: corta escopo, não estica o prazo}
**Desenho:** {./DESIGN.md | não precisa — motivo em uma linha}

<!-- Uma folha. O que não cabe aqui (partes do sistema, dados, como funciona, decisões técnicas, mapa
     de ameaças) vai para o DESIGN.md. Experimento preenche só Problema, Solução e Como saber que
     ficou pronto. -->

## Problema

{O que dói hoje e para quem, em 3 a 5 linhas. O problema, não a solução.}

## Solução

{O resultado para quem usa, em palavras simples: "a aluna consegue X", "o sistema garante Y".
O como fica no desenho.}

## Precisa ter

<!-- Sem isso a feature não tem valor. No máximo 40% dos itens. Teste: se este item fosse para
     "Deveria ter", a feature ainda resolveria o problema? Se sim, ele não era "Precisa ter". -->

- [ ] {item}

## Deveria ter

- [ ] {importante, mas não bloqueia a primeira entrega}

## Poderia ter

- [ ] {só se sobrar apetite}

## Não terá

- {o que fica fora desta versão, e por quê}

## Premissa mais arriscada

{A aposta que derruba a ideia se estiver errada, e o teste mais barato para saber antes de construir.}

## Cenários

<!-- Em linguagem de negócio, sem jargão. Cada um vira teste. Mínimo 3, ao menos 1 de erro.
     Casos de abuso (AB-*): o que alguém mal-intencionado tentaria. No nível dinheiro, saúde ou
     dados eles são obrigatórios, e a linha de aprovação abaixo vem antes de qualquer código. -->

Aprovados por {nome} em {YYYY-MM-DD}.

- CA-01: Dado {situação}, quando {ação}, então {resultado que dá para conferir}
- CA-02 (erro): Dado {situação de erro}, quando {ação}, então {o que acontece}
- AB-1: Dado {alguém que tenta ver o pedido de outra pessoa}, então {recebe "não encontrado"}

## Fatias

<!-- Uma linha por fatia, na ordem. Cada fatia deixa algo funcionando de ponta a ponta.
     O /plan-feature detalha só a próxima, quando ela for começar. -->

1. {fatia} — {o que fica funcionando ao fim dela}

## Como saber que ficou pronto

{Os cenários passam, e mais o que for preciso para dizer "pronto" — ex.: uma venda real de teste.}
