---
name: sync
description: "This skill should be used when the user wants to 'sync plugin', 'force reload', 'invalidate cache', 'refresh plugin', or when encountering cache-related issues with the Anti-Vibe Coding plugin. Forces cache invalidation and shows current version status."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Bash
---

# Sync — Invalidar Cache e Sincronizar Plugin

Força invalidação de cache do plugin e sincroniza com a versão global.

## Quando Usar

- Plugin foi atualizado globalmente mas projeto usa versão antiga
- Skills retornam erros de "file not found"
- Comportamento inconsistente após atualização
- Forçar recarregamento do plugin

## Fluxo de Execução

### Passo 1 — Ler Versões

```javascript
const fs = require('fs');
const path = require('path');

// Plugin global
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
const pluginManifestPath = path.join(pluginRoot, 'plugin-manifest.json');
const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
const pluginVersion = pluginManifest.version;

// Projeto local
const localManifestPath = path.join(process.cwd(), '.claude', '.anti-vibe-manifest.json');
let localVersion = 'não instalado';

if (fs.existsSync(localManifestPath)) {
  const localManifest = JSON.parse(fs.readFileSync(localManifestPath, 'utf8'));
  localVersion = localManifest.pluginVersion;
}
```

### Passo 2 — Mostrar Status

Apresentar informações de versão para **forçar recarregamento do cache**:

```
## Anti-Vibe Coding — Status de Sincronização

### Versão do Plugin Global
Path: {pluginRoot}
Versão: v{pluginVersion}
Manifest: {pluginManifest.generatedAt}

### Versão Instalada no Projeto
Path: {projectRoot}/.claude/.anti-vibe-manifest.json
Versão: v{localVersion}
{localVersion === 'não instalado' ? 'Status: Não inicializado' : ''}

### Comparação
{pluginVersion === localVersion ? '✅ Sincronizado' : '⚠️ Desatualizado'}
{pluginVersion !== localVersion && localVersion !== 'não instalado' ? `
Atualização disponível: v${localVersion} → v${pluginVersion}
` : ''}
```

### Passo 3 — Ação Recomendada

Baseado na comparação, recomendar ação:

#### Se sincronizado (versões iguais):
```
✅ Plugin está sincronizado!

Nenhuma ação necessária. Se ainda assim está enfrentando problemas:
1. Reinicie a sessão do Claude Code
2. Verifique se arquivos foram modificados: /anti-vibe-coding:update
```

#### Se desatualizado (versões diferentes):
```
⚠️ Plugin desatualizado!

Para sincronizar, execute:
```
/anti-vibe-coding:init
```

Isso irá:
1. Detectar automaticamente a atualização
2. Mostrar lista de mudanças
3. Aplicar merge inteligente
4. Atualizar manifest local para v{pluginVersion}
```

#### Se não instalado:
```
⚠️ Plugin não inicializado neste projeto

Para instalar, execute:
```
/anti-vibe-coding:init
```

Isso irá:
1. Fazer merge do CLAUDE.md (preserva suas configurações)
2. Instalar rules e skills
3. Criar manifest de versionamento
```

### Passo 4 — Invalidação de Cache (Automática)

**Apenas por mostrar as versões**, o Claude Code já invalida o cache interno.

Não é necessária nenhuma ação adicional.

---

## Troubleshooting

### Problema: Skill retorna "file not found"

**Sintoma:** Invocar skills técnicas (security, architecture, etc.) retorna erro de arquivo não encontrado.

**Causa:** References não foram copiadas ou cache está usando versão antiga.

**Solução:**
1. Rodar `/anti-vibe-coding:sync` (esta skill)
2. Rodar `/anti-vibe-coding:init`
3. Reiniciar sessão do Claude Code

---

### Problema: Versões estão iguais mas comportamento é antigo

**Causa:** Cache persistente do Claude Code.

**Solução:**
```bash
# Reiniciar sessão do Claude Code
# Ou forçar atualização do manifest
rm .claude/.anti-vibe-manifest.json
/anti-vibe-coding:init
```

---

### Problema: Plugin global não encontrado

**Sintoma:** Erro ao ler plugin-manifest.json

**Causa:** Variável `CLAUDE_PLUGIN_ROOT` não definida ou plugin não instalado globalmente.

**Solução:**
Verificar instalação do plugin:
```bash
echo $CLAUDE_PLUGIN_ROOT
ls $CLAUDE_PLUGIN_ROOT/plugin-manifest.json
```

Se não existir, o plugin não está instalado globalmente.

---

## Regras Importantes

- **SEMPRE** mostrar versões para forçar invalidação de cache
- **NUNCA** modificar arquivos automaticamente (apenas informar)
- Se versões diferentes, **recomendar /init** mas não executar automaticamente
- Skill é read-only (apenas diagnóstico)

---

## Exemplo de Saída

```
## Anti-Vibe Coding — Status de Sincronização

### Versão do Plugin Global
Path: /Users/nome/.claude/plugins/anti-vibe-coding
Versão: v4.1.0
Manifest: 2026-03-23T19:24:10.369Z

### Versão Instalada no Projeto
Path: /projeto/.claude/.anti-vibe-manifest.json
Versão: v4.0.0

### Comparação
⚠️ Desatualizado

Atualização disponível: v4.0.0 → v4.1.0

---

Para sincronizar, execute:
```
/anti-vibe-coding:init
```

Isso irá:
1. Detectar automaticamente a atualização
2. Mostrar lista de mudanças
3. Aplicar merge inteligente
4. Atualizar manifest local para v4.1.0
```
