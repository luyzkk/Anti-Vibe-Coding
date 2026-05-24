# Fase 01 — Portar `incremental-implementation`

## Objetivo

Criar `skills/incremental-implementation/SKILL.md` a partir da origem em `Infos/agent-skills-main/`.

## Arquivos Afetados

- `skills/incremental-implementation/SKILL.md` — criar (não existe)
- `.claude-plugin/plugin.json` — adicionar entry para a skill

## Processo

### Passo 1 — Ler a origem

```
Infos/agent-skills-main/skills/incremental-implementation/SKILL.md
```

Conteúdo known (~246 linhas):
- Common Rationalizations (tabela)
- Red Flags
- Verification checklist
- The Increment Cycle (diagrama ASCII)
- 5 Rules
- Slicing Strategies

Ler completamente antes de criar o destino.

### Passo 2 — Criar o SKILL.md destino

Estrutura obrigatória:

```
---
name: incremental-implementation
description: "Guia de implementação incremental: divide features em incrementos verificáveis, evitando big-bang delivery e integração tardia."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
argument-hint: "[feature ou módulo a implementar incrementalmente]"
---
```

Seguido dos blocos de telemetria (copiar padrão de `skills/security/SKILL.md` linhas 10-33):

```typescript
import { writeTelemetryStart } from "../../lib/telemetry-utils";
writeTelemetryStart("incremental-implementation");
```

```typescript
import { writeTelemetryEnd } from "../../lib/telemetry-utils";
writeTelemetryEnd("incremental-implementation");
```

Depois: corpo integral copiado da origem (manter EN — consistente com o plugin).

### Passo 3 — Atualizar `.claude-plugin/plugin.json`

Adicionar entry na seção `skills`:

```json
{
  "name": "incremental-implementation",
  "path": "skills/incremental-implementation/SKILL.md"
}
```

Nota: checksums serão regenerados na fase-03 — não calcular manualmente.

### Passo 4 — Validação parcial

```bash
bun run harness:validate
```

Se falhar com erro de manifest desatualizado: esperado. Registrar no MEMORY.md e prosseguir para fase-02. Corrigir na fase-03.

Se falhar por outro motivo: investigar antes de prosseguir.

## Sizing

~1h

## Gotchas

- Não criar o diretório `skills/incremental-implementation/` via mkdir — a criação do arquivo já cria o dir
- Não traduzir o conteúdo do corpo — manter EN
- Verificar que os 6 campos do frontmatter estão todos presentes

## Checklist de Conclusão

- [ ] `skills/incremental-implementation/SKILL.md` existe
- [ ] Frontmatter tem todos os 6 campos: `name`, `description`, `user-invocable`, `disable-model-invocation`, `allowed-tools`, `argument-hint`
- [ ] Bloco `writeTelemetryStart` presente com import correto
- [ ] Bloco `writeTelemetryEnd` presente com import correto
- [ ] Conteúdo inclui `## Common Rationalizations` (verificar com grep)
- [ ] Conteúdo inclui `## Red Flags` (verificar com grep)
- [ ] Conteúdo inclui `## Verification` checklist (verificar com grep)
- [ ] `.claude-plugin/plugin.json` contém entry para `incremental-implementation`
