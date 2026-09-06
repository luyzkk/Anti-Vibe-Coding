---
title: "A defesa so esta provada pela mutacao — nem teste verde nem numero do checklist provam"
category: processo
tags: [tdd, red-check, mutation, plan-executor, checklist, verification, subagent]
created: 2026-09-06
---

## Problem

Executando 3 fases com subagente, dois modos de falha apareceram — os dois deixam o suite **verde** e a
verificacao **assinada**:

**1. Teste que nasce verde.** O documento da fase mandava escrever o teste de `verdictFor` num passo
separado, com RED de compilacao. O executor o acrescentou **depois** de o passo anterior ja compilar: a
funcao ja existia, o teste passou de primeira. Nunca foi visto falhando. Um teste assim pode estar
afirmando `true === true` e ninguem percebe — e a "defesa" que ele documenta pode nunca ter sido escrita.

**2. Numero previsto no checklist tratado como verificacao.** As fases previam a saida exata de cada RED
(`Expected length: 3, Received length: 0`). Em **tres ocasioes** o real divergiu do previsto:

| Previsto no doc | Real |
|---|---|
| falha em `calls.get('middleware.ts')` | falha antes, em `summary.g2.sources` |
| `Received length: 5` | `Received length: 6` |
| `Expected: "resolved", Received: "unavailable"` | `Expected length: 0, Received length: 6` (outra assertion) |

Em todos, a defesa era real — o planejador e que chutou a ordem das assertions e a aritmetica. Mas o
incentivo criado e pessimo: quem espera uma mensagem e recebe outra tende a **reportar a esperada**.

## Solution

**A prova e a mutacao, feita por quem verifica, nao por quem implementa.** Depois do GREEN: remover a
defesa nomeada, rodar o teste, ver a falha, restaurar, provar que a restauracao e identica
(`git diff` vazio, zero residuo). Se o teste continua verde com a defesa removida, ele nao testa a defesa.

No Plano 03 foram **13 mutacoes** (5 + 6 no checklist, +2 acrescentadas pelo verificador para os testes
que nasceram verdes). Duas valem como exemplo do que a mutacao pega e a leitura nao:

- `lostCoverage` → `[]` derruba CA-09 com `Expected length: 3, Received length: 0` — o silencio exato que
  a feature existe para quebrar.
- `absent` → `unavailable` no adaptador produz **6 findings de ruido**, provando que o caso "nada a
  perder" e mesmo diferente de "nao consegui ler".

E o checklist deve nomear **qual defesa mutar**, nao a mensagem que vai sair.

## Prevention

**Regra: teste que nasce verde exige mutacao no mesmo passo.** Se o codigo ja existia quando o teste foi
escrito, o autor prova ali mesmo — muta, captura a falha, restaura. Nao deixa para o revisor descobrir.

**Regra: numero/mensagem previstos em documento de fase sao chute do planejador.** O que vale e *qual
assertion quebra*. Divergencia de texto se **reporta**, nunca se maquia — e nunca se "conserta" o codigo
para o numero do doc bater.

**Sinal de alerta no relatorio de um subagente:** saida de RED que reproduz o documento palavra por
palavra. Ou o planejador acertou tudo, ou alguem copiou. Pedir a saida literal do comando resolve.

**Corolario:** o checklist tambem pode estar errado. Ver
[2026-09-06-grep-de-remocao-nao-conta-bullet-markdown.md](./2026-09-06-grep-de-remocao-nao-conta-bullet-markdown.md)
— um check do proprio checklist que falhava aberto.

## Affected files

- `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano03/MEMORY.md`
  (DEV-fase01-1; DI-fase01-2, DI-fase02-1, DI-fase03-1) — PR #76
- Padrao aplicavel a toda fase gerada por `/anti-vibe-coding:plan-feature` com secao "RED-check do orquestrador"
- Nota irma: [2026-09-06-import-novo-em-teste-existente-derruba-o-modulo.md](./2026-09-06-import-novo-em-teste-existente-derruba-o-modulo.md)
