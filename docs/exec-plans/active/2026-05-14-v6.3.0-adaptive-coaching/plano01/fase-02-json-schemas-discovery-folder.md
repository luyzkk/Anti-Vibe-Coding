<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 02: JSON Schemas + discovery/ Folder

**Plano:** 01 — Fundação Adaptativa
**Sizing:** ~1h
**Depende de:** Nenhuma (pode rodar em paralelo com fase-01)
**Visual:** false

---

## O que esta fase entrega

Schemas JSON Schema draft-07 versionados para `capabilities.json` (Plano 02) e `parity-gaps.json` (Plano 03). Cria a pasta `discovery/` no root do projeto com `.gitkeep` e configura `.gitignore` para ignorar apenas `discovery/*.json` (não os schemas nem o gitkeep).

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `discovery/_schemas/capabilities-v1.schema.json` | CRIAR | JSON Schema draft-07 para capabilities.json |
| `discovery/_schemas/parity-gaps-v1.schema.json` | CRIAR | JSON Schema draft-07 para parity-gaps.json |
| `discovery/.gitkeep` | CRIAR | Mantém a pasta `discovery/` versionada no git |
| `.gitignore` | MODIFICAR | Adicionar `discovery/*.json` (sem remover entradas existentes) |

---

## Implementação

### Passo 1: Verificar .gitignore atual

Entradas existentes relevantes no `.gitignore`:
```
# Dependencies
node_modules/

# Plugin runtime state
.claude/.context-monitor-state.json
.claude/cache/
.claude/tasks/
...
```

Nenhuma entrada existente conflita com `discovery/`. Seguro adicionar.

### Passo 2: Criar estrutura discovery/

Criar em sequência:
1. Pasta `discovery/` (via `.gitkeep` — git não versiona pastas vazias)
2. Subpasta `discovery/_schemas/`
3. Arquivo `discovery/.gitkeep` (vazio)

### Passo 3: Criar capabilities-v1.schema.json

Criar `discovery/_schemas/capabilities-v1.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "capabilities-v1",
  "title": "Capabilities",
  "description": "Inventário de capabilities do projeto gerado por /init (v6.3.0+). Campos source:ast têm confidence alta; source:llm têm confidence < 1.0 e requerem revisão humana.",
  "type": "object",
  "required": ["capabilities", "generated_at", "profile_at_generation", "schema_version"],
  "properties": {
    "capabilities": {
      "type": "array",
      "description": "Lista de capabilities detectadas (rotas, mutations, jobs, CLIs).",
      "items": {
        "type": "object",
        "required": ["kind", "path", "handler", "confidence", "source"],
        "properties": {
          "kind": {
            "type": "string",
            "enum": ["route", "mutation", "job", "cli"],
            "description": "Categoria da capability."
          },
          "method": {
            "type": "string",
            "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
            "description": "Método HTTP. Obrigatório quando kind=route."
          },
          "path": {
            "type": "string",
            "description": "Caminho da rota (ex: /api/users/:id) ou identificador do job/CLI."
          },
          "handler": {
            "type": "string",
            "description": "Caminho relativo ao projeto do arquivo handler (ex: app/api/users/[id]/route.ts)."
          },
          "owner_path": {
            "type": "string",
            "description": "Caminho do módulo de domínio responsável, se detectável (ex: src/modules/users/)."
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Score 0..1 de confiança na detecção. AST-first tende a 1.0; LLM-fallback entre 0.6 e 0.9."
          },
          "source": {
            "type": "string",
            "enum": ["ast", "llm"],
            "description": "Método de detecção. 'ast' = AST parser determinístico; 'llm' = LLM inference (requer revisão)."
          }
        },
        "additionalProperties": false
      }
    },
    "coverage_gaps": {
      "type": "array",
      "description": "Caminhos ou padrões onde a detecção foi parcial ou impossível (ex: páginas do pages/ router em projeto híbrido).",
      "items": { "type": "string" }
    },
    "generated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp de quando o arquivo foi gerado."
    },
    "profile_at_generation": {
      "type": "string",
      "description": "Profile de arquitetura ativo no momento da geração (ex: nextjs-app-router). Usado pelo stale detector."
    },
    "schema_version": {
      "type": "string",
      "const": "1.0",
      "description": "Versão do schema. Incrementar em breaking changes."
    }
  },
  "additionalProperties": false
}
```

### Passo 4: Criar parity-gaps-v1.schema.json

Criar `discovery/_schemas/parity-gaps-v1.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "parity-gaps-v1",
  "title": "ParityGaps",
  "description": "Gaps entre capabilities do projeto e tools disponíveis ao agente. Gerado por /parity-audit (v6.3.0+).",
  "type": "object",
  "required": ["gaps", "tool_registry_snapshot", "generated_at", "schema_version"],
  "properties": {
    "gaps": {
      "type": "array",
      "description": "Lista de gaps ranqueados por severity (critical > important > nice).",
      "items": {
        "type": "object",
        "required": ["gap_id", "task_type", "missing_capability", "severity", "suggestion"],
        "properties": {
          "gap_id": {
            "type": "string",
            "description": "Identificador único do gap (ex: GAP-001). Estável entre execuções para rastreabilidade."
          },
          "task_type": {
            "type": "string",
            "description": "Tipo de tarefa que expõe o gap (ex: 'database-migration', 'e2e-test', 'deploy')."
          },
          "missing_capability": {
            "type": "string",
            "description": "Descrição da capability ausente no tool registry do agente."
          },
          "severity": {
            "type": "string",
            "enum": ["critical", "important", "nice"],
            "description": "Impacto do gap. critical = bloqueia tarefa comum; important = degrada qualidade; nice = melhoria opcional."
          },
          "suggestion": {
            "type": "string",
            "description": "Ação sugerida para fechar o gap (ex: 'adicionar MCP X', 'instalar tool Y')."
          }
        },
        "additionalProperties": false
      }
    },
    "tool_registry_snapshot": {
      "type": "object",
      "description": "Snapshot das tools disponíveis ao agente no momento da auditoria.",
      "properties": {
        "mcps": {
          "type": "array",
          "items": { "type": "string" },
          "description": "MCPs conectados (ex: ['playwright', 'cloudflare'])."
        },
        "builtin_tools": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Tools nativas do agente (ex: ['Bash', 'Read', 'Write', 'Glob'])."
        },
        "subagents": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Skills/subagentes disponíveis (ex: ['anti-vibe-coding:qa-visual'])."
        }
      },
      "additionalProperties": false
    },
    "generated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp de quando o arquivo foi gerado."
    },
    "schema_version": {
      "type": "string",
      "const": "1.0",
      "description": "Versão do schema. Incrementar em breaking changes."
    }
  },
  "additionalProperties": false
}
```

### Passo 5: Atualizar .gitignore

Adicionar ao final do `.gitignore` existente:

```
# Adaptive Coaching v6.3.0 — discovery outputs (runtime, não versionados)
# Apenas os JSONs gerados; _schemas/ e .gitkeep são comitados
discovery/*.json
```

---

## Gotchas

- `discovery/_schemas/` e `discovery/.gitkeep` NÃO devem estar no gitignore — são artefatos de configuração comitados.
- O padrão `discovery/*.json` ignora apenas arquivos `.json` diretamente em `discovery/` — não afeta `discovery/_schemas/*.json` (que está em subpasta). Verificar isso antes de commitar.
- Não usar `discovery/` (sem `*.json`) no gitignore — isso ignoraria toda a pasta incluindo `_schemas/`.
- `schema_version: "1.0"` é string, não número (decisão de design: compatibilidade com semver futuro).
- `additionalProperties: false` em ambos os schemas — campos desconhecidos causam falha de validação intencional para detectar drift entre schema e gerador.
- Campo `method` em capabilities-v1 é opcional (não está em `required`) — jobs e CLIs não têm método HTTP.

---

## Verificação

### Checklist

- [ ] `discovery/` existe no sistema de arquivos
- [ ] `discovery/.gitkeep` criado (arquivo vazio)
- [ ] `discovery/_schemas/capabilities-v1.schema.json` válido como JSON (`bun -e "JSON.parse(require('fs').readFileSync('discovery/_schemas/capabilities-v1.schema.json','utf8'))"`)
- [ ] `discovery/_schemas/parity-gaps-v1.schema.json` válido como JSON (mesmo comando)
- [ ] `.gitignore` contém `discovery/*.json` mas NÃO contém `discovery/` (sem pattern)
- [ ] `git status` mostra `discovery/.gitkeep` e `discovery/_schemas/` como novos arquivos tracked
- [ ] `git status` não mostra `discovery/*.json` (seria ignorado — confirmar com `touch discovery/test.json && git status && rm discovery/test.json`)
- [ ] Lint limpo: `bun run lint` (schemas são JSON, não TypeScript — lint pode não cobrir, ok)

---

## Critério de Aceite

**Por máquina:**
- `bun -e "JSON.parse(require('fs').readFileSync('discovery/_schemas/capabilities-v1.schema.json','utf8')); console.log('ok')"` imprime `ok`
- `bun -e "JSON.parse(require('fs').readFileSync('discovery/_schemas/parity-gaps-v1.schema.json','utf8')); console.log('ok')"` imprime `ok`
- `echo "" > discovery/test-runtime.json && git status | grep test-runtime` retorna vazio (arquivo ignorado)

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
