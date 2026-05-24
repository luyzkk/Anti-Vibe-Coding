# Fase 02 — Portar `code-simplification`

## Objetivo

Criar `skills/code-simplification/SKILL.md` a partir da origem em `Infos/agent-skills-main/`.

## Arquivos Afetados

- `skills/code-simplification/SKILL.md` — criar (não existe)
- `.claude-plugin/plugin.json` — adicionar entry para a skill

## Processo

### Passo 1 — Ler a origem

```
Infos/agent-skills-main/skills/code-simplification/SKILL.md
```

Conteúdo known (~332 linhas):
- Common Rationalizations (tabela)
- Red Flags
- Verification checklist
- Tabelas de simplification patterns por linguagem: TS/JS, Python, React/JSX

Ler completamente antes de criar o destino.

### Passo 2 — Criar o SKILL.md destino

Estrutura obrigatória:

```
---
name: code-simplification
description: "Guia de simplificação de código: identifica over-engineering, duplicação e complexidade desnecessária, aplicando padrões de simplificação por linguagem."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
argument-hint: "[arquivo ou módulo a simplificar]"
---
```

Seguido dos blocos de telemetria (mesmo padrão da fase-01, com slug `code-simplification`):

```typescript
import { writeTelemetryStart } from "../../lib/telemetry-utils";
writeTelemetryStart("code-simplification");
```

```typescript
import { writeTelemetryEnd } from "../../lib/telemetry-utils";
writeTelemetryEnd("code-simplification");
```

Depois: corpo integral copiado da origem (manter EN).

### Passo 3 — Atualizar `.claude-plugin/plugin.json`

Adicionar entry na seção `skills`:

```json
{
  "name": "code-simplification",
  "path": "skills/code-simplification/SKILL.md"
}
```

Nota: checksums serão regenerados na fase-03.

### Passo 4 — Validação parcial

```bash
bun run harness:validate
```

Se falhar com erro de manifest desatualizado: esperado — fase-03 corrige. Registrar no MEMORY.md.
Se falhar por outro motivo: investigar antes de prosseguir.

## Sizing

~1h

## Gotchas

- `argument-hint` definido como `"[arquivo ou módulo a simplificar]"` — não há hint óbvio no domínio, este é o mais informativo
- Não traduzir o corpo — manter EN
- A skill tem ~332 linhas na origem — reler o arquivo criado para confirmar integridade

## Checklist de Conclusão

- [ ] `skills/code-simplification/SKILL.md` existe
- [ ] Frontmatter tem todos os 6 campos: `name`, `description`, `user-invocable`, `disable-model-invocation`, `allowed-tools`, `argument-hint`
- [ ] Bloco `writeTelemetryStart` presente com import correto
- [ ] Bloco `writeTelemetryEnd` presente com import correto
- [ ] Conteúdo inclui `## Common Rationalizations` (grep para confirmar)
- [ ] Conteúdo inclui `## Red Flags` (grep para confirmar)
- [ ] Tabelas de simplification patterns presentes (TS/JS, Python, React/JSX)
- [ ] `.claude-plugin/plugin.json` contém entry para `code-simplification`
