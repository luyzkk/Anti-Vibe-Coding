/**
 * Version Check Hook
 *
 * Detecta quando o plugin global foi atualizado e avisa o usuário
 * Executa ao iniciar sessão (SessionStart)
 */

const fs = require('fs');
const path = require('path');

module.exports = async function versionCheckHook(context) {
  const { workingDirectory } = context;

  try {
    // 1. Ler versão do plugin global
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    if (!pluginRoot) {
      return null; // Plugin não instalado ou variável não definida
    }

    const pluginManifestPath = path.join(pluginRoot, 'plugin-manifest.json');
    if (!fs.existsSync(pluginManifestPath)) {
      return null; // Manifest não existe (versão antiga do plugin)
    }

    const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
    const pluginVersion = pluginManifest.version;

    // 2. Ler versão instalada no projeto
    const localManifestPath = path.join(workingDirectory, '.claude', '.anti-vibe-manifest.json');

    if (!fs.existsSync(localManifestPath)) {
      // Projeto não tem manifest = não foi inicializado ou versão antiga
      // Não avisar no SessionStart para não poluir
      return null;
    }

    const localManifest = JSON.parse(fs.readFileSync(localManifestPath, 'utf8'));
    const localVersion = localManifest.pluginVersion;

    // 3. Comparar versões
    if (pluginVersion !== localVersion) {
      const isNewer = compareVersions(pluginVersion, localVersion) > 0;

      if (isNewer) {
        return {
          action: 'notify',
          message: `⚠️ Plugin Anti-Vibe Coding atualizado!\n\nVersão instalada: v${localVersion}\nVersão disponível: v${pluginVersion}\n\n✨ Para atualizar, execute:\n\`\`\`\n/anti-vibe-coding:init\n\`\`\`\n\nO sistema detectará automaticamente as mudanças e oferecerá atualização incremental.`
        };
      } else {
        // Versão local é mais nova que o plugin global (dev mode?)
        return {
          action: 'notify',
          message: `⚠️ Versão local (v${localVersion}) é mais nova que o plugin global (v${pluginVersion}).\n\nIsso pode indicar desenvolvimento local ou cache inconsistente.`
        };
      }
    }

    // Versões iguais = tudo ok
    return null;

  } catch (error) {
    // Falha silenciosa - não queremos quebrar a sessão por causa do check
    console.error('[version-check hook] Error:', error.message);
    return null;
  }
};

/**
 * Compara duas versões semver
 * @returns {number} 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
 */
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}
