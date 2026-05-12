#!/usr/bin/env node

/**
 * Gera plugin-manifest.json com checksums de todos os arquivos gerenciados
 * Roda automaticamente antes de publicar nova versão do plugin
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.join(__dirname, '..');
const VERSION = process.env.PLUGIN_VERSION || '6.0.0';

// Paths/prefixes que NAO entram no manifest (dog-food interno, nao distribuidos)
const IGNORED_PREFIXES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'docs/',
  '.github/',
  'tests/',
  '.release-backup/',
  '.planning',
  'node_modules/',
  'bun.lock',
  '.gitignore',
];

function isIgnored(relPath) {
  return IGNORED_PREFIXES.some(p => relPath === p || relPath.startsWith(p));
}

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
 * Escana diretorio recursivamente e coleta arquivos com extensoes aceitas.
 * Exclui arquivos .test.ts, .test.cjs e diretorios __tests__, __fixtures__.
 */
function scanDir(absDir, relBase, extensions, files) {
  if (!fs.existsSync(absDir)) return;
  fs.readdirSync(absDir, { withFileTypes: true }).forEach(entry => {
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__fixtures__' || entry.name === 'node_modules') return;
      scanDir(path.join(absDir, entry.name), `${relBase}/${entry.name}`, extensions, files);
    } else if (entry.isFile()) {
      const name = entry.name;
      if (name.includes('.test.') || name.includes('.spec.')) return;
      if (!extensions.some(ext => name.endsWith(ext))) return;
      const absPath = path.join(absDir, name);
      const relPath = `${relBase}/${name}`;
      if (isIgnored(relPath)) return;
      files[relPath] = {
        version: VERSION,
        checksum: calculateChecksum(absPath),
        lastModified: getLastModified(absPath),
        updateStrategy: getUpdateStrategy(relPath)
      };
    }
  });
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
  scanDir(path.join(PLUGIN_ROOT, 'rules'), 'rules', ['.md'], files);

  // Hooks: .cjs (exceto .test.cjs) e hooks.json
  const hooksDir = path.join(PLUGIN_ROOT, 'hooks');
  if (fs.existsSync(hooksDir)) {
    fs.readdirSync(hooksDir)
      .filter(f => (f.endsWith('.cjs') && !f.includes('.test.')) || f === 'hooks.json')
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
  scanDir(path.join(PLUGIN_ROOT, 'agents'), 'agents', ['.md'], files);

  // Config
  scanDir(path.join(PLUGIN_ROOT, 'config'), 'config', ['.json'], files);

  // Scripts: apenas .ts e .js distribuidos (nao shell, nao tests)
  const scriptsDir = path.join(PLUGIN_ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    fs.readdirSync(scriptsDir)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('.test.') && !f.includes('.spec.'))
      .forEach(file => {
        const filePath = path.join(scriptsDir, file);
        const relPath = `scripts/${file}`;
        files[relPath] = {
          version: VERSION,
          checksum: calculateChecksum(filePath),
          lastModified: getLastModified(filePath),
          updateStrategy: getUpdateStrategy(relPath)
        };
      });
  }

  // Skills: SKILL.md (case-insensitive: tenta SKILL.md e skill.md) + referencias + lib
  const skillsDir = path.join(PLUGIN_ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    fs.readdirSync(skillsDir).forEach(skillName => {
      const skillBase = path.join(skillsDir, skillName);
      if (!fs.statSync(skillBase).isDirectory()) return;

      // SKILL.md principal (case-insensitive)
      const skillFileUpper = path.join(skillBase, 'SKILL.md');
      const skillFileLower = path.join(skillBase, 'skill.md');
      const skillFile = fs.existsSync(skillFileUpper) ? skillFileUpper
        : fs.existsSync(skillFileLower) ? skillFileLower : null;

      if (skillFile) {
        const relPath = `skills/${skillName}/${path.basename(skillFile)}`;
        files[relPath] = {
          version: VERSION,
          checksum: calculateChecksum(skillFile),
          lastModified: getLastModified(skillFile),
          updateStrategy: getUpdateStrategy(relPath)
        };
      }

      // references/*.md
      scanDir(path.join(skillBase, 'references'), `skills/${skillName}/references`, ['.md'], files);
      // templates/*.md
      scanDir(path.join(skillBase, 'templates'), `skills/${skillName}/templates`, ['.md'], files);
      // lib/*.ts e lib/*.md (exceto tests)
      scanDir(path.join(skillBase, 'lib'), `skills/${skillName}/lib`, ['.ts', '.md'], files);
      // assets/ recursivo (templates de init, snippets, etc)
      scanDir(path.join(skillBase, 'assets'), `skills/${skillName}/assets`, ['.md', '.ts', '.json', '.cjs', '.tpl'], files);
    });

    // skills/lib/ (lib compartilhada no nivel skills/)
    scanDir(path.join(skillsDir, 'lib'), 'skills/lib', ['.ts', '.md'], files);
  }

  // Templates raiz (STATE.md, SUMMARY.md)
  scanDir(path.join(PLUGIN_ROOT, 'templates'), 'templates', ['.md'], files);

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
