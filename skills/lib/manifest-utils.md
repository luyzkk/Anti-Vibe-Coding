# Manifest Utils — Utilitários de Versionamento

Funções reutilizáveis para gerenciamento de versões e checksums do plugin.

## Funções Disponíveis

### calculateChecksum(content)

Calcula SHA-256 checksum de um conteúdo string.

```javascript
const crypto = require('crypto');

function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Uso:**
```javascript
const fileContent = readFileSync('CLAUDE.md', 'utf8');
const checksum = calculateChecksum(fileContent);
```

---

### readPluginManifest()

Lê o `plugin-manifest.json` do plugin.

**Retorna:**
```javascript
{
  version: "4.0.0",
  generatedAt: "2026-03-23T...",
  description: "...",
  files: {
    "CLAUDE.md": {
      version: "4.0.0",
      checksum: "ff1b3e...",
      lastModified: "2026-03-22",
      updateStrategy: "merge"
    },
    // ...
  }
}
```

**Uso:**
```javascript
const pluginManifest = readPluginManifest();
const claudeMdInfo = pluginManifest.files['CLAUDE.md'];
```

**Path:** `${CLAUDE_PLUGIN_ROOT}/plugin-manifest.json`

---

### readLocalManifest(projectRoot)

Lê o `.claude/.anti-vibe-manifest.json` do projeto do usuário.

**Retorna:**
```javascript
{
  pluginVersion: "4.0.0",
  installedAt: "2026-03-22T10:30:00Z",
  files: {
    "CLAUDE.md": {
      sourceVersion: "4.0.0",
      installedChecksum: "ff1b3e...",
      lastUpdated: "2026-03-22",
      userModified: false
    },
    // ...
  }
}
```

**Retorna `null`** se o arquivo não existir (primeira instalação).

**Uso:**
```javascript
const localManifest = readLocalManifest('/path/to/project');
if (!localManifest) {
  // Primeira instalação
}
```

**Path:** `${projectRoot}/.claude/.anti-vibe-manifest.json`

---

### createLocalManifest(projectRoot, installedFiles)

Cria `.claude/.anti-vibe-manifest.json` no projeto após instalação/atualização.

**Parâmetros:**
- `projectRoot`: path absoluto do projeto
- `installedFiles`: objeto com arquivos instalados e seus checksums

**Exemplo de `installedFiles`:**
```javascript
{
  "CLAUDE.md": {
    sourceVersion: "4.0.0",
    installedChecksum: "ff1b3e...",
    lastUpdated: "2026-03-22",
    userModified: false
  }
}
```

**Uso:**
```javascript
const installed = {
  'CLAUDE.md': {
    sourceVersion: pluginManifest.files['CLAUDE.md'].version,
    installedChecksum: pluginManifest.files['CLAUDE.md'].checksum,
    lastUpdated: new Date().toISOString().split('T')[0],
    userModified: false
  }
};

createLocalManifest('/path/to/project', installed);
```

---

### detectUpdates(projectRoot)

Detecta diferenças entre plugin e projeto.

**Retorna:**
```javascript
{
  pluginVersion: "4.0.0",
  localVersion: "3.5.0",
  updates: [
    {
      file: "CLAUDE.md",
      status: "outdated",           // "outdated" | "new" | "modified" | "up-to-date"
      currentVersion: "3.5.0",
      availableVersion: "4.0.0",
      userModified: true,
      updateStrategy: "merge",
      preview: "Adicionou seção 'Conhecimento Sênior'"
    },
    {
      file: "senior-principles.md",
      status: "new",
      availableVersion: "4.0.0",
      updateStrategy: "replace",
      preview: "Novo arquivo com 60+ princípios técnicos"
    },
    {
      file: "rules/security-patterns.md",
      status: "outdated",
      currentVersion: "3.5.0",
      availableVersion: "4.0.0",
      userModified: false,
      updateStrategy: "merge",
      preview: "Adicionou validação HMAC para webhooks"
    }
  ]
}
```

**Status:**
- `"outdated"`: Arquivo existe localmente mas está em versão antiga
- `"new"`: Arquivo não existe localmente (novo no plugin)
- `"modified"`: Usuário modificou o arquivo (checksum diferente)
- `"up-to-date"`: Arquivo está atualizado

**Uso:**
```javascript
const updates = detectUpdates('/path/to/project');

if (updates.updates.length === 0) {
  console.log('Tudo atualizado!');
} else {
  console.log(`${updates.updates.length} atualizações disponíveis`);
}
```

---

### compareVersions(v1, v2)

Compara duas versões semver.

**Retorna:**
- `1` se v1 > v2
- `0` se v1 === v2
- `-1` se v1 < v2

**Uso:**
```javascript
compareVersions("4.0.0", "3.5.0") // retorna 1
compareVersions("3.5.0", "4.0.0") // retorna -1
compareVersions("4.0.0", "4.0.0") // retorna 0
```

---

### generatePreview(file, pluginContent, localContent)

Gera preview das mudanças entre versão local e versão do plugin.

**Retorna:** String com resumo das principais mudanças.

**Exemplo:**
```javascript
const preview = generatePreview(
  'CLAUDE.md',
  pluginClaudeContent,
  localClaudeContent
);
// "Adicionou seção 'Conhecimento Sênior' e tabela de skills"
```

**Lógica:**
- Para arquivos novos: descreve o propósito do arquivo
- Para arquivos existentes: lista seções adicionadas/modificadas
- Limite de ~80 caracteres

---

## Exemplo Completo de Uso

```javascript
// 1. Detectar atualizações
const updates = detectUpdates('/path/to/project');

if (updates.updates.length === 0) {
  console.log('Plugin Anti-Vibe Coding está atualizado!');
  return;
}

// 2. Apresentar ao usuário
console.log(`\n## Atualizações Disponíveis\n`);
console.log(`Plugin: v${updates.localVersion} → v${updates.pluginVersion}\n`);

updates.updates.forEach(update => {
  const icon = update.userModified ? '⚠️' : '✓';
  console.log(`${icon} ${update.file} (${update.status})`);
  console.log(`   Preview: ${update.preview}`);
  console.log(`   Estratégia: ${update.updateStrategy}`);
  if (update.userModified) {
    console.log(`   ⚠️ Modificado pelo usuário — merge cuidadoso`);
  }
});

// 3. Obter confirmação
const choice = askUser('Escolha: [1] Atualizar tudo [2] Escolher [3] Cancelar');

// 4. Aplicar atualizações
if (choice === '1') {
  const installed = {};

  updates.updates.forEach(update => {
    applyUpdate(update);
    installed[update.file] = {
      sourceVersion: update.availableVersion,
      installedChecksum: calculateChecksum(updatedContent),
      lastUpdated: new Date().toISOString().split('T')[0],
      userModified: false
    };
  });

  // 5. Atualizar manifest local
  createLocalManifest('/path/to/project', installed);
}
```

---

## Regras Importantes

1. **SEMPRE** calcular checksum APÓS modificar arquivo
2. **SEMPRE** atualizar `.anti-vibe-manifest.json` após aplicar updates
3. **NUNCA** sobrescrever `userModified: true` sem confirmação
4. Se `updateStrategy === "never"`, ignorar completamente o arquivo
5. Se `updateStrategy === "merge"` e `userModified === true`, fazer merge inteligente
6. Se `updateStrategy === "replace"` e `userModified === true`, avisar antes de substituir
