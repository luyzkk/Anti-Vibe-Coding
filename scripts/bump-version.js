#!/usr/bin/env node
'use strict';

/**
 * Atualiza a versão do plugin em todos os lugares de uma vez.
 *
 * Uso:
 *   bun scripts/bump-version.js <version>
 *   bun scripts/bump-version.js <version> --codename "Nome do Release"
 *
 * Atualiza: package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json
 * Regenera: plugin-manifest.json via generate-manifest.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('-')) {
  console.error('Uso: bun scripts/bump-version.js <version> [--codename "Nome do Release"]');
  console.error('Ex:  bun scripts/bump-version.js 6.2.0 --codename "Circuit Breaker Patterns"');
  process.exit(1);
}

const newVersion = args[0];
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error(`Versão inválida: "${newVersion}". Use formato semver (ex: 6.2.0)`);
  process.exit(1);
}

const codenameIdx = args.indexOf('--codename');
const newCodename = codenameIdx !== -1 ? args[codenameIdx + 1] : null;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Substitui a versão no texto de descrição, mantendo o restante intacto.
// Se --codename for passado, substitui também o codename após o em dash.
function bumpDescription(desc, oldVersion, newVersion, codename) {
  const escapedOld = oldVersion.replace(/\./g, '\\.');
  let updated = desc.replace(new RegExp(`v${escapedOld}`, 'g'), `v${newVersion}`);
  if (codename) {
    updated = updated.replace(/v[\d.]+\s*—\s*[^:.]+/, `v${newVersion} — ${codename}`);
  }
  return updated;
}

const pkgPath    = path.join(ROOT, 'package.json');
const pluginPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
const mktPath    = path.join(ROOT, '.claude-plugin', 'marketplace.json');

const pkg    = readJson(pkgPath);
const plugin = readJson(pluginPath);
const mkt    = readJson(mktPath);

const oldVersion = pkg.version;

if (oldVersion === newVersion) {
  console.error(`Já está na versão ${newVersion}.`);
  process.exit(1);
}

console.log(`\nBumping ${oldVersion} → ${newVersion}\n`);

// 1. package.json
pkg.version = newVersion;
writeJson(pkgPath, pkg);
console.log('✓ package.json');

// 2. .claude-plugin/plugin.json
plugin.version = newVersion;
if (plugin.description) {
  plugin.description = bumpDescription(plugin.description, oldVersion, newVersion, newCodename);
}
writeJson(pluginPath, plugin);
console.log('✓ .claude-plugin/plugin.json');

// 3. .claude-plugin/marketplace.json
const entry = mkt.plugins?.find(p => p.name === 'anti-vibe-coding');
if (entry) {
  entry.version = newVersion;
  if (entry.description) {
    entry.description = bumpDescription(entry.description, oldVersion, newVersion, newCodename);
  }
}
writeJson(mktPath, mkt);
console.log('✓ .claude-plugin/marketplace.json');

// 4. Regenera plugin-manifest.json
console.log('\nRegenerando plugin-manifest.json...');
execSync('bun scripts/generate-manifest.js', {
  cwd: ROOT,
  env: { ...process.env, PLUGIN_VERSION: newVersion },
  stdio: 'inherit',
});

console.log(`\n✓ Versão bumped para ${newVersion}`);
if (newCodename) {
  console.log(`✓ Codename: ${newCodename}`);
} else {
  console.log(`  (Codename mantido. Passe --codename "Nome" para alterar.)`);
}
console.log(`\nPróximo:`);
console.log(`  git add -A && git commit -m "chore: bump version ${oldVersion} → ${newVersion}"`);
console.log(`  claude plugin tag --push`);
