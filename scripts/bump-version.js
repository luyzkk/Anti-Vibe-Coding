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
 *
 * 2026-09-10 (Luiz/dev): o corpo do CLI passou para `main()`, chamado só quando o arquivo é
 * EXECUTADO. Antes tudo rodava no topo do módulo, então importar o arquivo para testar
 * `bumpDescription` dispararia um bump de verdade — e foi por isso que o teste que existia
 * reimplementava a função em vez de importá-la. Cópia em teste não testa o original: ela envelhece
 * junto com a suposição de quem a escreveu, e concorda com ela para sempre.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// 2026-09-10 (Luiz/dev): extraída de dentro do `main` porque o teste tinha uma CÓPIA do regex —
// mesmo problema de `bumpDescription`. Regra duplicada em teste concorda com a cópia, não com o código.
function isValidSemver(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

/**
 * A `description` do plugin é um HISTÓRICO ACUMULADO de releases: uma frase de apresentação seguida
 * de entradas `vX.Y.Z — Nome: corpo`, da mais nova para a mais antiga. Um bump ACRESCENTA uma
 * entrada; ele nunca reescreve o que já está lá.
 *
 * 2026-09-10 (Luiz/dev): a versão anterior fazia as duas coisas erradas, e as duas apagavam história.
 *
 *   1. `desc.replace(/v7.8.0/g, 'v7.9.0')` trocava TODA menção da versão antiga, inclusive as
 *      históricas. O parágrafo que descrevia a release anterior passava a citar a versão nova.
 *   2. Com codename, `replace(/v[\d.]+ — [^:.]+/, ...)` substituía o PRIMEIRO headline encontrado,
 *      que é o da release ANTERIOR. O nome dela era apagado e o corpo dela ficava atribuído à nova.
 *
 * Medido no bump de 7.8.0 para 7.9.0: "v7.8.0 — Contrato do Ciclo TDD" virava
 * "v7.9.0 — Honestidade de Config", com o corpo da 7.8.0 colado atrás. A description em produção
 * ainda carrega um trecho órfão, sem marcador de versão, de uma release que perdeu o headline assim.
 *
 * `oldVersion` continua na assinatura só porque os dois call sites a passam posicionalmente; a
 * função não precisa mais dela, justamente porque não reescreve nada do que já existe.
 */
const ENTRADA_DE_RELEASE = /v\d+\.\d+\.\d+\s*—\s*/;

function bumpDescription(desc, oldVersion, newVersion, codename) {
  const texto = desc || '';

  // Sem codename não há entrada nova a acrescentar. A versão corrente vive no campo `version` do
  // JSON; a description guarda história, e história não se reescreve por causa de um bump.
  if (!codename) return texto;

  const entrada = `v${newVersion} — ${codename}`;

  // Idempotente: rodar o bump duas vezes para a mesma versão não duplica a entrada.
  if (texto.includes(`v${newVersion} — `)) return texto;

  // O corpo da entrada nova precisa fechar antes do headline seguinte, senão os dois colam.
  const separador = /[.!?]\s*$/.test(codename) ? ' ' : '. ';

  const primeira = texto.match(ENTRADA_DE_RELEASE);
  if (!primeira) {
    return texto.trim() ? `${texto.trimEnd()} ${entrada}` : entrada;
  }

  // Antes da primeira entrada existente, e DEPOIS da frase de apresentação.
  return texto.slice(0, primeira.index) + entrada + separador + texto.slice(primeira.index);
}

function main(argv) {
  const args = argv.slice(2);
  if (!args[0] || args[0].startsWith('-')) {
    console.error('Uso: bun scripts/bump-version.js <version> [--codename "Nome do Release"]');
    console.error('Ex:  bun scripts/bump-version.js 6.2.0 --codename "Circuit Breaker Patterns"');
    process.exit(1);
  }

  const newVersion = args[0];
  if (!isValidSemver(newVersion)) {
    console.error(`Versão inválida: "${newVersion}". Use formato semver (ex: 6.2.0)`);
    process.exit(1);
  }

  const codenameIdx = args.indexOf('--codename');
  const newCodename = codenameIdx !== -1 ? args[codenameIdx + 1] : null;

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
  // 2026-08-31 (Luiz/dev): o `version` de TOPO do marketplace tambem acompanha a versao do
  // plugin. Antes so a entrada aninhada era atualizada, e o topo ficava para tras ate alguem
  // notar e corrigir a mao num commit de release (ex.: cbe59b3 "align everything to 7.4.0").
  // Drift observado em 7.3.0, 7.4.0 e 7.7.0 — sempre o mesmo defeito.
  mkt.version = newVersion;

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
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { bumpDescription, isValidSemver };
