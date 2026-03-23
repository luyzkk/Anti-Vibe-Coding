# Hooks Merge Utilities

Utilitários para merge inteligente de hooks.json do plugin com hooks customizados do projeto.

## Contexto

- **Hooks do plugin** ficam em `$CLAUDE_PLUGIN_ROOT/hooks/*.cjs` e são executados via `require(process.env.CLAUDE_PLUGIN_ROOT + '/hooks/nome.cjs')`
- **Hooks do projeto** ficam em `.claude/hooks/*.cjs` e são executados via `node .claude/hooks/nome.cjs`
- **hooks.json** combina AMBOS: referencia hooks do plugin (via CLAUDE_PLUGIN_ROOT) E hooks do projeto (via path relativo)

## Algoritmo de Merge

```javascript
/**
 * Merge hooks.json do plugin com hooks.json do projeto
 * @param {Object} pluginHooks - hooks.json do plugin
 * @param {Object} projectHooks - hooks.json do projeto (pode ser vazio)
 * @returns {Object} - hooks.json mesclado
 */
function mergeHooks(pluginHooks, projectHooks) {
  const merged = { hooks: {} };

  // 1. Obter todos os eventos únicos (SessionStart, UserPromptSubmit, etc.)
  const allEvents = new Set([
    ...Object.keys(pluginHooks.hooks || {}),
    ...Object.keys(projectHooks.hooks || {})
  ]);

  for (const eventName of allEvents) {
    const pluginEventHooks = pluginHooks.hooks?.[eventName] || [];
    const projectEventHooks = projectHooks.hooks?.[eventName] || [];

    // 2. Extrair os hooks internos de cada evento
    const pluginInnerHooks = pluginEventHooks.flatMap(group => group.hooks || []);
    const projectInnerHooks = projectEventHooks.flatMap(group => group.hooks || []);

    // 3. Combinar: projeto PRIMEIRO, depois plugin
    const combinedHooks = [
      ...projectInnerHooks,
      ...pluginInnerHooks
    ];

    // 4. Wrapping: hooks.json espera estrutura { hooks: [...] }
    if (combinedHooks.length > 0) {
      merged.hooks[eventName] = [
        {
          hooks: combinedHooks
        }
      ];
    }
  }

  return merged;
}
```

## Exemplo Prático

### Entrada: Plugin hooks.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/version-check.cjs')\"",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Analyze conversation...",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### Entrada: Project hooks.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-cleanup.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/doc-enforcement.cjs",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Saída: Merged hooks.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-cleanup.cjs",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/version-check.cjs')\"",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/doc-enforcement.cjs",
            "timeout": 10
          },
          {
            "type": "prompt",
            "prompt": "Analyze conversation...",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

## Regras Importantes

1. **NUNCA copiar arquivos `.cjs` do plugin para o projeto**
   - Hooks do plugin ficam em cache: `$CLAUDE_PLUGIN_ROOT/hooks/*.cjs`
   - Apenas hooks customizados do projeto ficam em `.claude/hooks/*.cjs`

2. **Ordem de execução**
   - Hooks do projeto executam PRIMEIRO
   - Hooks do plugin executam DEPOIS
   - Exceção: version-check pode vir primeiro se necessário

3. **Detecção de duplicatas**
   - Comparar `command` ou `prompt` exato
   - Se houver duplicata, manter apenas a versão do projeto (prioridade do usuário)

4. **Backup antes de merge**
   - Sempre criar backup de hooks.json existente
   - Caminho: `.claude/backups/YYYY-MM-DD/hooks_hooks.json`

5. **Preservar matchers**
   - PreToolUse pode ter `matcher: "Write|Edit"` ou `matcher: "Bash"`
   - Agrupar por matcher antes de combinar hooks

## Exemplo com Matchers

### Plugin hooks.json (PreToolUse)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/tdd-gate.cjs')\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Project hooks.json (PreToolUse)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/format-check.cjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Merged (agrupar por matcher)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/format-check.cjs",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/tdd-gate.cjs')\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Implementação Prática no Init

No skill init, ao detectar hooks.json existente:

1. Ler plugin hooks.json de `$CLAUDE_PLUGIN_ROOT/hooks/hooks.json`
2. Ler project hooks.json de `.claude/hooks/hooks.json`
3. Aplicar `mergeHooks(pluginHooks, projectHooks)`
4. Criar backup do original
5. Salvar merged em `.claude/hooks/hooks.json`
6. Atualizar manifest com checksum do merged

## Debugging

Se hooks não estão executando após merge:

1. Verificar que paths estão corretos (CLAUDE_PLUGIN_ROOT vs path relativo)
2. Verificar que estrutura tem wrapper `{ hooks: [...] }`
3. Verificar que matchers estão agrupados corretamente
4. Verificar que arquivos .cjs tem permissão de execução
5. Testar hook individual com `node .claude/hooks/nome.cjs`
