---
title: "PLAN.md overview defasa do sizing dos planoNN quando os planos são detalhados sob demanda"
category: processo
tags: [plan-feature, plan-overview, sizing, drift, source-of-truth]
created: 2026-05-29
---

## Problem

O `/plan-feature` escreve o overview (`PLAN.md`) no Step 8 com sizing e contagem de fases
**estimados**, e só depois detalha cada `planoNN/` sob demanda (Step 9) em subagente isolado. O
subagente grava o sizing **real** no `planoNN/README.md` (e o `STATE.md` registra no log), mas
**nunca volta** para re-sincronizar o `PLAN.md`. O overview vira write-once e diverge.

Concreto (feature `workflow-awareness`, 2026-05-29): o `PLAN.md` dizia Plano 02 = "**~6 fases / ~5h**"
e total "**~13.5h**"; o `plano02/README.md` detalhado + o log do `STATE.md` diziam "**6 fases / ~6.5h**"
(as 6 fases somam 1.5+1.5+1+0.5+1+1 = 6.5h) → total real **~15h**. O overview ficou errado por ~1.5h e
mantinha contagens aproximadas (`~6`/`~3`) mesmo com os 3 planos 100% detalhados.

Custo individual baixo, mas o overview é o **primeiro** doc que qualquer pessoa lê para dimensionar a
feature — número errado corrói a confiança no plano e subestima esforço.

## Solution

Ao detalhar cada `planoNN` (Step 9), re-sincronizar o `PLAN.md`:

1. Atualizar a linha do plano na tabela **Execution Steps** (fases exatas + sizing real do README).
2. Recomputar o **total** no header (`X planos, N fases total, ~Yh`).
3. Atualizar o subtítulo `#### Plano NN (~Xh)` no **Resumo por Plano**.

O `STATE.md` já costuma carregar o valor certo no log (ele é escrito por último) — usar como fonte
cruzada para detectar a divergência.

## Prevention

- O `/plan-feature` Step 9 deveria ter um passo de **reconciliação** pós-subagente: ler o sizing do
  `planoNN/README.md` recém-criado e propagar para o `PLAN.md`. Hoje não faz — o overview é write-once.
- Regra geral: **quando um doc-overview resume N docs-detalhe gerados depois dele, o overview precisa
  ser re-tocado ao fim de cada detalhamento** — senão drift é garantido. Mesma classe de
  `2026-05-20-validation-gate-path-drift.md` e `2026-05-14-state-md-vs-git-log.md` (overview/memória de
  sessão ≠ fonte detalhada/disco).
- Auditoria barata: somar o sizing das fases de cada `planoNN/README.md` e conferir contra a tabela do
  `PLAN.md`; divergência de número de fases ou de horas = drift a corrigir.

## See Also

- Correção A1 registrada em `docs/exec-plans/active/2026-05-28-workflow-awareness/STATE.md` (log 2026-05-29)
- `docs/compound/2026-05-20-validation-gate-path-drift.md`
- `docs/compound/2026-05-14-state-md-vs-git-log.md`
