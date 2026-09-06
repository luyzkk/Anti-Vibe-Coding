---
title: "`needs_human` faz o consolidador do verify-work descartar todas as issues do agente"
category: armadilha
tags: [verify-work, subagent-contract, needs_human, audit-consolidator, escalation, fail-open]
created: 2026-09-06
---

## Problem

A decisao de planejamento original dizia: quando o diff altera a allowlist de rotas publicas
(`anti-vibe.public-routes.json`), o `security-auditor` devolve `status: "needs_human"` — afinal, mudanca
em configuracao de seguranca **exige** olho humano.

Parecia obvio. Estava errado.

`skills/verify-work/lib/audit-consolidator.ts:91-95` trata `blocked` e `needs_human` como **lifecycle
incompleto**: joga o agente em `incomplete[]` e **descarta o `payload` inteiro**, incluindo
`payload.issues[]`. Ou seja: no exato PR em que a allowlist muda — o PR que o caso de abuso AB-4 existe
para vigiar — o relatorio perderia os `ROUTE-*`, os `ALLOW-*` e **todos os findings das secoes 1-10** do
auditor. Escalar para o humano apagaria justamente a evidencia que o humano precisa ler.

E um fail-open com cara de fail-safe: quanto mais grave o agente considera o achado, menos o relatorio
mostra.

## Solution

Sinalizar humano **por veredito**, nao por lifecycle:

```
status: "complete"              // o agente TERMINOU — o payload sobrevive
verdict: "request_changes"      // no minimo; o PR nao passa sozinho
reasoning: "### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF\n..."   // bloco no INICIO
```

O consolidador preserva `reasoning` por agente, entao o bloco destacado chega ao relatorio junto com as
issues. A intencao do PRD ("mudanca na allowlist exige diff apresentado ao humano") e atendida sem
sacrificar o conteudo.

`needs_human` continua correto para o que ele significa de verdade: **o agente nao conseguiu terminar** e
precisa de uma decisao para prosseguir. Nao para "terminei e o resultado e grave".

## Prevention

**Regra: `status` e sobre o agente ter terminado; `verdict`/`severity` e sobre o que ele achou.** Antes de
usar um status de lifecycle para chamar atencao, ler o consolidador e confirmar o que ele faz com o
`payload` naquele status. Gravidade nunca deve viajar por um canal que descarta dados.

**Sinal de alerta:** qualquer proposta do tipo "quando for grave, devolve `blocked`/`needs_human`". Isso
acopla severidade a lifecycle, e o caminho de lifecycle quase sempre tem tratamento de excecao que
descarta ou trunca — exatamente onde voce menos quer perder informacao.

**Como verificar antes de decidir:** abrir o consolidador e olhar o ramo do status pretendido. Neste repo
foi `audit-consolidator.ts:91-95`; um `grep -n "needs_human\|blocked" skills/verify-work/lib/` resolve em
segundos e evita reprojetar depois.

## Affected files

- `skills/verify-work/lib/audit-consolidator.ts:91-95` (o ramo que descarta — nao alterado, apenas evitado)
- `agents/security-auditor.md` (secao 11: bloco destacado em `reasoning` + `request_changes`)
- Decidido em: `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano02/MEMORY.md`
  (DEV-plan-3, refinamento da DP-12; G19 do README) — PR #75
- Contexto do contrato: [2026-05-14-subagent-contract-v1-migration.md](./2026-05-14-subagent-contract-v1-migration.md)
