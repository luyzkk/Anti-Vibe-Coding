---
title: "Fase de plano se estima por linhas de codigo a escrever, nao por horas — o executor estoura `max_output_tokens`"
category: processo
tags: [execute-plan, plan-feature, subagente, max-output-tokens, sizing, orcamento-de-saida]
created: 2026-09-08
---

## Problem

A fase-03 do Plano 04 (adaptador Python) foi dimensionada em **2h**, igual as fases anteriores. Ela
pedia: fixture + 3 dialetos (FastAPI, Flask, Django) + 16 testes, mais um relatorio com as saidas
literais de cada RED.

O executor morreu com:

```
API Error: Claude's response exceeded the 64000 output token maximum. (max_output_tokens)
```

Nada foi escrito no disco — working tree limpa, retry sem estado parcial. Mas ~40 minutos de execucao
foram perdidos.

**O que o sizing por horas nao captura:** o codigo escrito conta no orcamento de SAIDA junto com o
relatorio. As fases anteriores do mesmo plano produziram 655 linhas (Rails) e 523 (Express) — a de
Python precisava de 740+, mais fixture, mais 16 testes, mais dumps literais de teste no relatorio.
"2h" nao distingue uma fase que le muito e escreve pouco de outra que escreve um arquivo grande.

## Solution

Duas mitigacoes, nesta ordem de importancia:

1. **Dividir na costura que o proprio doc ja usa.** O doc da fase tratava FastAPI como primeira classe
   e dizia "Flask/Django por testes inline" — a divisao ja estava escrita, so nao tinha sido usada como
   fronteira de execucao. Virou Parte A (fixture + FastAPI) e Parte B (Flask + Django), **um commit
   cada, uma fase so no plano**. O que foi dividido e a execucao, nao a estrutura do plano.
2. **Evidencia longa vai para arquivo, nao para a resposta.** O executor grava saida de teste em
   `scratchpad/<fase>-<nome>.txt` e o relatorio **cita o caminho**. E o principio "sistema de arquivos
   como estado" do proprio `CLAUDE.md`, aplicado ao relatorio do subagente. Somado a um teto explicito
   de linhas ("relatorio final: no maximo ~50 linhas"), resolveu — as fases 04 e 05 couberam folgadas.

## Prevention

**Regra: ao dimensionar uma fase, estimar as LINHAS DE CODIGO que ela precisa escrever.** Fase que cria
lib nova grande + fixture + suite de teste nasce dividida, ou nasce com instrucao de evidencia em
arquivo. Comparar com as fases irmas ja executadas do mesmo plano da a escala real.

**Sinal de alerta no doc da fase:** "Arquivos Afetados" com um `.ts` novo de dominio inteiro + fixture
multi-arquivo + mais de ~12 testes. Se as fases anteriores do plano produziram 500-700 linhas cada,
uma que precisa de mais nao cabe.

**Instrucao que vale sempre no prompt do executor:** *"se perceber que a fase e grande demais, pare,
commite o que esta verde e reporte"* — em vez de tentar terminar e estourar. Falha limpa e barata;
falha no meio da escrita, nao.

**Nota sobre o custo real:** aqui nao houve perda de trabalho porque o agente morreu antes de escrever.
Isso foi sorte, nao desenho — um estouro depois de metade dos arquivos escritos deixaria a arvore num
estado que alguem precisa reconciliar.

## Affected files

- `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano04/fase-03-adaptador-python.md`
  (a fase que estourou; executada em duas partes: commits `1c5d244` e `28b16a8`)
- Registrado em: `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md`
  (GT-fase03-1) — PR #77
- Aplicavel a toda fase gerada por `/anti-vibe-coding:plan-feature` e executada por
  `/anti-vibe-coding:execute-plan`
