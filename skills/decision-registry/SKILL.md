---
name: decision-registry
description: "Registro de decisoes arquiteturais do projeto. Use para registrar, consultar ou listar decisoes. Armazena em .claude/decisions.md com historico completo de alternativas e justificativas."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|list|query [decision or search term]"
---

# Registro de Decisoes Arquiteturais — Anti-Vibe Coding

Gerencie o registro de decisoes do projeto, mantendo consistencia entre sessoes.

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
1. Leia `.claude/decisions.md` (crie se nao existir)
2. Verifique se a decisao ja foi registrada
3. Adicione no formato correto com data de hoje
4. Informe o desenvolvedor que a decisao foi registrada

### Ao listar (`list`):
1. Leia `.claude/decisions.md`
2. Liste todas as decisoes em formato de tabela resumida:
   | Data | Decisao | Escolha | Reversivel? |

### Ao consultar (`query`):
1. Busque no `.claude/decisions.md` por termo
2. Mostre a decisao completa com justificativa

## Acao solicitada

$ARGUMENTS
