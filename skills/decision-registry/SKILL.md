---
name: decision-registry
description: "This skill should be used when the user asks to 'register a decision', 'log an architectural choice', 'add ADR', 'list decisions', 'query past decisions', or wants to track Architecture Decision Records (ADRs) for the project. Manages the project's decision history with alternatives and justifications."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|list|query [decision or search term]"
---

# Registro de Decisoes Arquiteturais — Anti-Vibe Coding

Gerenciar o registro de decisoes do projeto, mantendo consistencia entre sessoes.

## Comandos

### `add` — Registrar nova decisao
Registrar uma decisao arquitetural com alternativas e justificativa.

### `list` — Listar todas as decisoes
Mostrar todas as decisoes registradas com data e status.

### `query` — Consultar decisao especifica
Buscar decisao por nome ou area.

## Formato de Registro

```markdown
### [Nome da Decisao]: [Opcao Escolhida]
**Data:** YYYY-MM-DD
**Alternativas consideradas:** [opcao A, opcao B, opcao C]
**Justificativa:** [Por que essa opcao foi escolhida para este projeto]
**Risco conhecido:** [Riscos aceitos com essa decisao]
**Reversibilidade:** Reversivel / Irreversivel
```

## Arquivo de Armazenamento

As decisoes sao armazenadas em `.claude/decisions.md` na raiz do projeto.

## Fluxo de Trabalho

### Ao adicionar (`add`):
1. Ler `.claude/decisions.md` (criar se nao existir)
2. Verificar se a decisao ja foi registrada
3. Adicionar no formato correto com data de hoje
4. Informar o desenvolvedor que a decisao foi registrada

### Ao listar (`list`):
1. Ler `.claude/decisions.md`
2. Listar todas as decisoes em formato de tabela resumida:
   | Data | Decisao | Escolha | Reversivel? |

### Ao consultar (`query`):
1. Buscar no `.claude/decisions.md` por termo
2. Mostrar a decisao completa com justificativa

## Acao solicitada

$ARGUMENTS
