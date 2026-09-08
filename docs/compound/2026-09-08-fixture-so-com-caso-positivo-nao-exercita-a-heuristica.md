---
title: "Fixture so com caso positivo nao exercita a heuristica — mutar o classificador nao quebrava nada"
category: armadilha
tags: [fixture, teste, heuristica, mutation-testing, falso-verde, route-auth-matrix]
created: 2026-09-08
---

## Problem

O adaptador Express classifica middleware como "auth" por **nome** (`isAuthName`: `requireAuth`,
`authenticate`, `login_required`...). E heuristica declarada, e a rede que impede um middleware
qualquer de virar prova de autenticacao.

A fixture `express-minimal` tinha `requireAuth` e `requireAdmin`. Os 14 testes passavam.

No RED-check, mutar `isAuthName` para devolver `true` **sempre** — ou seja, tratar QUALQUER middleware
como auth — **nao quebrou nenhum dos 14 testes**.

O motivo e simples e facil de nao enxergar: **todos os nomes da fixture ja eram auth**. Com o
classificador dizendo `true` para tudo, a saida nao muda — porque nao havia nada para classificar
errado. A fixture parecia completa (tinha rota coberta, rota descoberta, rota indeterminada) e mesmo
assim a defesa central do adaptador estava sem teste.

A classificacao tinha rede em `route-auth-heuristics.test.ts` (testes unitarios do `isAuthName`), mas
**nao no adaptador** — ninguem provava que o adaptador *usa* a heuristica para decidir cobertura.

## Solution

A fixture ganhou um middleware com nome **nao-auth** ao lado de um auth, e um teste que afirma as duas
metades:

```
requestLogger  (nao-auth) → NAO produz cobertura, aparece em "ignorados por nome"
requireAuth    (auth)     → produz handler-chain
```

Depois disso, `isAuthName → true` **quebra**:
`Expected to contain: "requireAuth" / Received: "middleware de rota requestLogger"`.

A licao virou requisito das fixtures seguintes: a do Python nasceu com `get_locale` (nao-auth) numa
rota real, ao lado de `get_current_user`.

## Prevention

**Regra: fixture que exercita um classificador precisa de pelo menos um caso NEGATIVO.** So casos
positivos tornam o classificador indistinguivel de `() => true`. Vale para heuristica de nome, para
deteccao de stack, para filtro de severidade — qualquer lugar onde a funcao decide "isto conta ou nao".

**Sinal de alerta:** olhar a fixture e ver que todos os itens de uma categoria pertencem ao mesmo lado
da decisao. Se todo middleware e auth, todo arquivo e da stack X, toda rota e mutante — a fixture
cobre o caminho, nao a decisao.

**Como se descobre:** mutacao. Trocar o classificador por uma constante e ver o que quebra. Se nao
quebra nada, o classificador nao esta sob teste naquele nivel — mesmo que tenha teste unitario proprio
em outro arquivo. Ver
[2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md](./2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md)
e [2026-08-12-grep-negativo-exige-controle-positivo.md](./2026-08-12-grep-negativo-exige-controle-positivo.md)
(o mesmo raciocinio, na direcao inversa).

## Affected files

- `tests/fixtures/route-auth-matrix/express-minimal/` e `python-fastapi-minimal/app/deps.py`
- `skills/security/lib/route-auth-express.test.ts` (teste do caso misto; commit `4dc7ae2`)
- Descoberto em: `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md`
  (GT-fase02-1) — PR #77
