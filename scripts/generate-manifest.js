#!/usr/bin/env node

/**
 * Gera plugin-manifest.json com checksums de todos os arquivos gerenciados
 * Roda automaticamente antes de publicar nova versão do plugin
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.join(__dirname, '..');
const VERSION = '4.0.0';

/**
 * Calcula SHA-256 checksum de um arquivo
 */
function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Obtém data de modificação de um arquivo
 */
function getLastModified(filePath) {
  const stats = fs.statSync(filePath);
  return stats.mtime.toISOString().split('T')[0];
}

/**
 * Determina estratégia de atualização baseada no tipo de arquivo
 */
function getUpdateStrategy(filePath) {
  if (filePath === 'CLAUDE.md') return 'merge';
  if (filePath === 'senior-principles.md') return 'replace';
  if (filePath === 'decisions.md') return 'never';
  if (filePath === 'settings.json') return 'never';
  if (filePath.startsWith('rules/')) return 'merge';
  if (filePath.startsWith('hooks/')) return 'replace';
  if (filePath.startsWith('agents/')) return 'replace';
  if (filePath.startsWith('skills/')) return 'replace';

  return 'replace';
}

/**
 * Coleta todos os arquivos gerenciados pelo plugin
 */
function collectManagedFiles() {
  const files = {};

  // Arquivos na raiz
  const rootFiles = ['CLAUDE.md', 'senior-principles.md'];
  rootFiles.forEach(file => {
    const filePath = path.join(PLUGIN_ROOT, file);
    if (fs.existsSync(filePath)) {
      files[file] = {
        version: VERSION,
        checksum: calculateChecksum(filePath),
        lastModified: getLastModified(filePath),
        updateStrategy: getUpdateStrategy(file)
      };
    }
  });

  // Rules
  const rulesDir = path.join(PLUGIN_ROOT, 'rules');
  if (fs.existsSync(rulesDir)) {
    fs.readdirSync(rulesDir)
      .filter(f => f.endsWith('.md'))
      .forEach(file => {
        const filePath = path.join(rulesDir, file);
        const relPath = `rules/${file}`;
        files[relPath] = {
          version: VERSION,
          checksum: calculateChecksum(filePath),
          lastModified: getLastModified(filePath),
          updateStrategy: getUpdateStrategy(relPath)
        };
      });
  }

  // Hooks
  const hooksDir = path.join(PLUGIN_ROOT, 'hooks');
  if (fs.existsSync(hooksDir)) {
    fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.cjs') || f === 'hooks.json')
      .forEach(file => {
        const filePath = path.join(hooksDir, file);
        const relPath = `hooks/${file}`;
        files[relPath] = {
          version: VERSION,
          checksum: calculateChecksum(filePath),
          lastModified: getLastModified(filePath),
          updateStrategy: getUpdateStrategy(relPath)
        };
      });
  }

  // Agents
  const agentsDir = path.join(PLUGIN_ROOT, 'agents');
  if (fs.existsSync(agentsDir)) {
    fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .forEach(file => {
        const filePath = path.join(agentsDir, file);
        const relPath = `agents/${file}`;
        files[relPath] = {
          version: VERSION,
          checksum: calculateChecksum(filePath),
          lastModified: getLastModified(filePath),
          updateStrategy: getUpdateStrategy(relPath)
        };
      });
  }

  // Skills (apenas os skill.md de cada skill)
  const skillsDir = path.join(PLUGIN_ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    fs.readdirSync(skillsDir)
      .forEach(skillName => {
        const skillFile = path.join(skillsDir, skillName, 'skill.md');
        if (fs.existsSync(skillFile)) {
          const relPath = `skills/${skillName}/skill.md`;
          files[relPath] = {
            version: VERSION,
            checksum: calculateChecksum(skillFile),
            lastModified: getLastModified(skillFile),
            updateStrategy: getUpdateStrategy(relPath)
          };
        }
      });
  }

  return files;
}

/**
 * Gera o manifest
 */
function generateManifest() {
  const files = collectManagedFiles();

  const manifest = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    description: 'Manifest de arquivos gerenciados pelo plugin Anti-Vibe Coding',
    files
  };

  const manifestPath = path.join(PLUGIN_ROOT, 'plugin-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`✓ plugin-manifest.json gerado com sucesso`);
  console.log(`✓ Versão: ${VERSION}`);
  console.log(`✓ Total de arquivos: ${Object.keys(files).length}`);

  // Estatísticas
  const stats = {
    merge: 0,
    replace: 0,
    never: 0
  };

  Object.values(files).forEach(file => {
    stats[file.updateStrategy]++;
  });

  console.log(`\nEstratégias de atualização:`);
  console.log(`  - Merge: ${stats.merge} arquivos`);
  console.log(`  - Replace: ${stats.replace} arquivos`);
  console.log(`  - Never: ${stats.never} arquivos`);
}

// Executar
generateManifest();
