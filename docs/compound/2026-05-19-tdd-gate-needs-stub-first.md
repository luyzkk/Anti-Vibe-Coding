---
title: "TDD gate hook bloqueia criação de arquivo de implementação sem teste — RED real exige stub mínimo primeiro"
category: tooling
tags: [tdd, hooks, red-green, stub, ordering, plan-executor]
created: 2026-05-19
referenced-by: [docs/references/tdd-cycle-checklist.md]
---

## Problem

Duas armadilhas relacionadas ao ciclo RED → GREEN no plugin:

**Armadilha 1 — gate bloqueia impl sem teste:**
O hook `tdd-gate.cjs` (PreToolUse) bloqueia `Write`/`Edit` em arquivo de implementação (ex: `parser.ts`) se NENHUM teste existe para aquele módulo. Tentativa de criar primeiro a impl falha com "TDD gate: no test found for module X".

**Armadilha 2 — RED falha por motivo errado:**
Mesmo com teste criado antes, se o arquivo de implementação ainda não existir, o teste falha com `Cannot find module './parser'` — não com assertion. Isso não é um RED real: o ciclo TDD exige que o teste falhe **pela ausência de comportamento**, não pela ausência de módulo. PR review do RED commit fica ruim ("isto é só falta de arquivo, não TDD"), e o GREEN commit subsequente esconde o que foi de fato implementado.

Plano 04 fase-01 descobriu; Plano 05 fase-01 reaplicou; documentado em SUMMARY.md como `GT-TDD-RED-real` + `GT-TDD-gate`.

## Solution

Ordem obrigatória em toda fase com RED real:

1. Criar `parser.test.ts` com assertions reais (não `expect(true).toBe(true)`)
2. Criar `parser.ts` como STUB mínimo: `throw new Error('not implemented')` em cada export que o teste importa
3. Commitar como RED: teste falha por assertion (`Error: not implemented`), não por module-not-found
4. Implementar de verdade
5. Commitar como GREEN

```typescript
// parser.ts (stub RED)
export function parseProgressTxt(_content: string): never {
  throw new Error('not implemented')
}

// parser.test.ts
import { parseProgressTxt } from './parser'
it('parses heading with category', () => {
  expect(parseProgressTxt('### [bug] x')).toHaveLength(1)
})
// RED: Error: not implemented (assertion-driven, não module-not-found)
```

## Prevention

**Regra:** em RED commit, garantir que o teste falhe POR ASSERTION, não por importação. Stub mínimo de 1 linha (`throw new Error('not implemented')`) é o custo correto para um RED honesto.

**Checklist ao iniciar fase TDD:**
1. Criar arquivo de teste com assertions reais
2. Criar arquivo de produção como stub que `throw`
3. Rodar `bun test <arquivo>` — confirmar erro = `Error: not implemented`, NÃO `Cannot find module`
4. Commit RED com mensagem `test(...): RED — ...`
5. Implementar GREEN

**Sinal de alerta:** se `bun test` em RED commit mostra `Cannot find module` ou `Cannot resolve import`, abortar — falta o stub. Não é um RED válido.

**Aplicável a:** toda fase do `/plan-executor` ou `/execute-plan` com instrução "TDD: RED commit antes do GREEN commit". O hook reforça em runtime, mas a expectativa começa no plano.
