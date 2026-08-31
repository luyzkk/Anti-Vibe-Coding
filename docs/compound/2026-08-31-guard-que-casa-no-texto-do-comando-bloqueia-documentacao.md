---
title: "Guard que casa padrão no texto do comando bloqueia a documentação sobre o padrão — e o conteúdo acaba moldado pela ferramenta"
category: armadilha
tags: [hooks, destructive-guard, link-checker, falso-positivo, autoria, tooling, conteudo]
created: 2026-08-31
---

## Problem

Dois guards deste repo casam padrões contra o **texto** de uma operação, sem distinguir comando de
conteúdo. Nos dois, escrever *sobre* o padrão dispara a proteção contra o padrão.

**1. `hooks/pre-tool-use-destructive-guard.cjs`** casa a regex contra a linha inteira do comando
Bash. Um heredoc que *cite* um comando destrutivo é bloqueado como se fosse executá-lo. Ocorreu
duas vezes na mesma sessão:

- ao escrever um relatório de auditoria que citava o nome de um caso de teste (`rm -rf /tmp/x`)
- ao escrever um script que **testa o próprio guard**, cujo corpo lista os comandos que ele deve
  bloquear

O segundo é o caso mais claro: o guard impede escrever a sonda que o audita.

**2. O link checker do `harness-validate.ts`** varre markdown cru procurando o padrão de link
inline (colchetes seguidos de parênteses) e não pula spans de código — nem inline, nem em fence.
Um átomo Python que mostre generics PEP 695 (`def first[T](xs: list[T])`) vira
`[broken-link] ... broken relative link: xs: list[T]`, mesmo dentro de crases.

O `hasH1OutsideCodeFences` existe no mesmo arquivo e resolve exatamente esse problema — mas é
usado **só** pela regra de H1, não pelo link checker.

O custo real não é a fricção; é o **conteúdo sendo moldado por bug de ferramenta**, em silêncio:

- um exemplo de código no átomo de idioms foi reescrito para evitar o padrão do link checker
- o átomo de GraphQL trocou blocos de código por prosa, porque tipos GraphQL (`[Node!]!`) colidem
- a própria descrição do bug no `TODO.md` precisou de **três** reescritas — cada tentativa de
  documentar o padrão reproduzia o padrão

## Solution

**Não contornar em silêncio, e nunca desligar o guard.** As duas coisas que funcionaram:

1. **Trocar a ferramenta, não a proteção.** A ferramenta de escrita direta não passa pelo hook de
   Bash. Contornar por `AVC_ALLOW_DESTRUCTIVE=1` seria desligar uma proteção para escrever um
   documento — troca ruim, e o guard está certo em ser conservador.

2. **Registrar quando o conteúdo foi alterado por causa da ferramenta.** Cada reescrita de exemplo
   foi anotada como débito, com o motivo. Sem isso, daqui a seis meses o exemplo esquisito parece
   escolha editorial e ninguém sabe que existe um bug atrás dele.

Para o link checker, o fix é conhecido e barato: pular spans de código antes de casar links —
mesma classe do `hasH1OutsideCodeFences` que já existe no arquivo. Registrado no `TODO.md`; vai
reincidir em qualquer átomo Python com generics.

Aviso preventivo nos prompts dos extratores das waves seguintes ("evite colchetes colados a
parênteses") eliminou o falso-positivo — **zero** ocorrências em 12 átomos, contra 3 iteracões
gastas antes. É mitigação, não correção: o conteúdo continua sendo moldado, só que de propósito.

## Prevention

1. **Guard que casa texto tem falso-positivo em documentação, por construção.** Isso é aceitável
   num guard destrutivo — conservador é o comportamento certo quando o custo do falso-negativo é
   perda de dados. Não é aceitável num validador de links, onde o custo do falso-positivo é o
   autor mudar o conteúdo.

2. **Distinga pelo custo do erro de cada lado.** Guard destrutivo: falso-positivo custa fricção,
   falso-negativo custa dados → deixe conservador. Validador de conteúdo: falso-positivo custa
   qualidade do conteúdo, falso-negativo custa um link quebrado → ensine-o a pular código.

3. **Se você já resolveu isso uma vez no mesmo arquivo, reutilize.** `hasH1OutsideCodeFences`
   estava a 130 linhas do link checker. Regra que pula fence é infra, não detalhe de uma regra.

4. **Conteúdo alterado por causa de ferramenta vira débito, sempre.** A alternativa é um exemplo
   estranho sem explicação. E se a contagem de reescritas crescer, é sinal de que o débito
   deixou de ser barato.

5. **Ao escrever a descrição de um bug de padrão, você vai reproduzir o padrão.** Documentar
   `[texto](url)` num repo cujo checker casa `[texto](url)` é auto-referência garantida. Descreva
   em prosa ("colchetes seguidos de parênteses") em vez de exibir o literal.

## Affected files

- `hooks/pre-tool-use-destructive-guard.cjs` — casa contra a linha inteira do comando
- `scripts/harness-validate.ts` — link checker (~L546) não pula spans de código; `hasH1OutsideCodeFences` (~L387) resolve o mesmo problema para H1
- `knowledge/python/atoms/python-idioms-and-antipatterns.md` — exemplo PEP 695 reescrito por causa do falso-positivo
- `knowledge/python/atoms/graphql-grpc-contracts.md` — blocos de código trocados por prosa pelo mesmo motivo
- `TODO.md` — débito do link checker registrado
