---
title: "Declaracao que o parser ve e nao resolve tem que virar `unresolved` — sumir em silencio e pior que `indeterminada`"
category: armadilha
tags: [security, auditor, parser, adaptador, fail-open, route-auth-matrix, rf-04]
created: 2026-09-08
---

## Problem

O adaptador Express enumerava rotas de arquivos com `express.Router()`. Um arquivo com **dois**
routers no mesmo modulo:

```js
const a = express.Router()
const b = express.Router()
a.get('/alpha', h)
b.get('/beta', h)
```

devolvia **so** `GET /alpha`. A rota `/beta` **desaparecia por completo**: nao virava `Route`, nao
virava `unresolved`, e nenhuma nota a mencionava. Causa: o codigo tratava `routers[0]` como "o router
do arquivo" e ignorava os seguintes.

Os 14 testes da fase passavam. O bug so apareceu porque o executor **reportou** que uma mutacao do
RED-check nao derrubava nada, em vez de marcar a linha do checklist como confirmada.

**Por que isso e grave e nao cosmetico:** o proposito declarado deste auditor e achar **ausencia** — a
rota que ninguem lembrou de proteger. Uma rota que existe no codigo-fonte e que o relatorio **nunca
menciona** e exatamente o endpoint invisivel que a ferramenta existe para achar. E pior que uma rota
marcada `indeterminada`: `indeterminada` custa ruido e aparece; sumico nao custa nada e nao aparece.

O mesmo modo de falha tem uma segunda face, que apareceu na entrega em partes do adaptador Python:
entre a Parte A (FastAPI) e a Parte B (Flask/Django), os ramos nao implementados **poderiam** ter
devolvido `routes: []` calado. Devolveram `[]` **com nota** (`dialeto flask ainda nao implementado
nesta fase`) — um projeto Flask auditado naquele estado enumerava zero rotas mas **dizia por que**.

## Solution

Toda declaracao que o parser **enxerga** e **nao consegue resolver** vira `Route` com
`unresolved: '<motivo>'` + nota. Nunca desaparece.

```ts
// router secundario do mesmo modulo: nao da para saber onde foi montado
routes.push({ ...cleanRoute(decl),
  unresolved: `segundo Router() no mesmo modulo — nao da para saber onde \`${decl.owner}\` foi montado` })
```

O motor entao curto-circuita `unresolved` para `indeterminada` **antes** da allowlist e do matcher, e o
veredito emite finding `medium`. Visivel, com motivo, e nunca `coberta`.

Para ramo ainda nao implementado (entrega em partes), a regra e a mesma um nivel acima: `[]` **com
nota**, nunca `[]` calado.

## Prevention

**Regra: em ferramenta de auditoria, o que o parser viu e nao resolveu e output, nao lixo.** A pergunta
ao escrever qualquer enumerador nao e "consigo resolver isso?" e sim "se eu nao conseguir, o usuario
fica sabendo?".

**Sinal de alerta:** qualquer `[0]`, `.find(...)`, `if (!x) continue` ou `?? []` num caminho de
enumeracao. Cada um deles e um ponto onde algo que existe pode virar nada. Se o `continue` for
legitimo, ele precisa empurrar uma nota antes.

**Teste que trava isso:** um caso com a construcao que o parser NAO suporta, afirmando que ela aparece
como `unresolved` — nao apenas que o parser "nao quebra". Um teste que so verifica ausencia de excecao
passa com a rota sumida.

**Como isso foi achado (e nao pela suite):** mutacao. Remover a defesa e ver o teste continuar verde e
o unico jeito de descobrir que a defesa nunca foi testada. Ver
[2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md](./2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md).

## Affected files

- `skills/security/lib/route-auth-express.ts` (`secondaryRouters`; fix no commit `4dc7ae2`)
- `skills/security/lib/route-auth-python.ts` (nota por dialeto nao implementado, estado intermediario)
- Descoberto em: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md`
  (BUG-fase02-1 e GT-fase03-2) — PR #77
- Fecha o RF-04/RF-09 do PRD: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/SUMMARY.md`
