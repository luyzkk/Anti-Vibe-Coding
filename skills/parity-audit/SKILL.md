---
name: parity-audit
description: Audita capabilities do agente (MCPs, tools, subagentes) e produz parity-gaps.json com gaps ranqueados por severity. Use quando quiser revisar se o agente tem ferramentas para o task_type que você vai pedir.
kind: audit
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Glob, Grep, Write, AskUserQuestion
argument-hint: "[task_type opcional, ex: payment-debug, browser-test]"
---

<!-- 2026-05-14 (Luiz/dev): kind:"audit" — contrato v6.1.0 (RF-MH-03). Frontmatter NUNCA alterado em runtime. -->

# /parity-audit — Audita capabilities do agente

## Passo 1 — Resolver task_type

Se o usuário passou argumento, use como `task_type`. Caso contrário, pergunte via `AskUserQuestion`:

> "Qual task_type você quer auditar? (deixe vazio para auditar TODAS as regras conhecidas)"

Aceite resposta vazia → `task_type = null` (audita ruleset completo).

## Passo 2 — Executar script parity-audit

Rode o script via Bash. O script faz: snapshot via `inspectToolRegistry` → compute gaps → escrita em `discovery/parity-gaps.json` → resumo top-3 ao stdout.

Se `task_type` foi resolvido no Passo 1, passe como argumento; se vazio, omita (audita ruleset completo):

```bash
bun run parity:audit "$task_type"
```

Ou (sem argumento, ruleset completo):

```bash
bun run parity:audit
```

Saída esperada (exemplo):

```
Parity Audit — 2 gap(s) encontrado(s)

CRITICAL (1):
  - gap_id: GAP-001 | missing: MCP playwright | suggestion: instalar @playwright/mcp

IMPORTANT (1):
  - gap_id: GAP-007 | missing: Bash tool | suggestion: adicionar Bash em allowed-tools

Output completo: /path/to/project/discovery/parity-gaps.json
```

Se stderr contém `Tool registry incompleto`, sinalize ao usuário ANTES do resumo final:
> "Tool registry incompleto (manifest ou agents/ ausente). Resultado é best-effort — considere rodar `/init --refresh` antes de re-auditar."

## Passo 3 — Apresentar resumo ao dev

O script já imprime o resumo; reforce a interpretação ao dev se houver gaps `critical`.

Se 0 gaps: "Nenhum gap detectado para task_type=`<taskType>`. O agente tem todas as capabilities mapeadas no ruleset atual."
