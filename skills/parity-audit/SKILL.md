---
name: parity-audit
description: Audita capabilities do agente (MCPs, tools, subagentes) e produz parity-gaps.json com gaps ranqueados por severity. Use quando quiser revisar se o agente tem ferramentas para o task_type que você vai pedir.
kind: audit
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
argument-hint: "[task_type opcional, ex: payment-debug, browser-test]"
---

<!-- 2026-05-14 (Luiz/dev): kind:"audit" — contrato v6.1.0 (RF-MH-03). Frontmatter NUNCA alterado em runtime. -->

# /parity-audit — Audita capabilities do agente

## Passo 1 — Resolver task_type

Se o usuário passou argumento, use como `task_type`. Caso contrário, pergunte via `AskUserQuestion`:

> "Qual task_type você quer auditar? (deixe vazio para auditar TODAS as regras conhecidas)"

Aceite resposta vazia → `task_type = null` (audita ruleset completo).

## Passo 2 — Snapshot via tool-registry-inspector

Importe `inspectToolRegistry` de `skills/lib/tool-registry-inspector.ts` e chame com `process.cwd()` como `projectRoot`.

Se `snapshot.source === 'partial'`, emita warning ANTES de prosseguir:
> "Tool registry incompleto (manifest ou agents/ ausente). Resultado será best-effort."

## Passo 3 — Cruzar com gap-rules

Importe `computeParityGaps` de `skills/parity-audit/lib/parity-gaps-writer.ts` e chame:
`const output = computeParityGaps(snapshot, taskType)`.

## Passo 4 — Escrever discovery/parity-gaps.json

Chame `writeParityGaps(output, process.cwd())`. O arquivo é gitignored por default (PRD Decisão #8) — confirme que `.gitignore` cobre `discovery/*.json` (Plano 01 fase-02).

## Passo 5 — Apresentar resumo ao dev

Mostre top 3 gaps por severity (critical primeiro):

```
Parity Audit — N gap(s) encontrado(s)

CRITICAL (X):
  - gap_id: ... | missing: ... | suggestion: ...

IMPORTANT (Y):
  - ...

NICE (Z):
  - ...

Output completo: discovery/parity-gaps.json
```

Se 0 gaps: "Nenhum gap detectado para task_type=`<taskType>`. O agente tem todas as capabilities mapeadas no ruleset atual."
