'use strict';

/**
 * gate-config.cjs — `config/tdd-gate.json` lido num lugar so.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. Tres hooks leem este config: o TDD Gate (Write|Edit), o caminho
 * Bash e o pre-commit. Antes eram duas copias de `readConfig` com defaults diferentes — a do caminho
 * Bash devolvia `{}` quando o arquivo faltava, a do Write|Edit devolvia defaults completos. Um
 * terceiro leitor tornaria a divergencia regra em vez de acidente.
 *
 * REGRA DESTE ARQUIVO: toda chave aqui precisa ter leitor real em algum hook. Chave que existe so
 * neste objeto e config morta — documenta comportamento que nao existe e falha ABRINDO, entao
 * ninguem descobre pelo uso. Foi assim que cinco chaves sobreviveram meses.
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  // lido por tdd-gate.cjs e tdd-gate-bash.cjs
  mode: 'regex',
  // lido por tdd-gate-bash.cjs
  bash_path: 'on',
  // lido por pre-commit-suite.cjs
  precommit: 'on',
  // lidos por tdd-gate.cjs (isImmutableTest)
  immutable_test_patterns: ['*.test.*', '*.spec.*', '*.e2e.*'],
  block_test_modification_in_green: true,
};

function readGateConfig() {
  try {
    const configPath = path.join(__dirname, '..', '..', 'config', 'tdd-gate.json');
    if (!fs.existsSync(configPath)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

module.exports = { readGateConfig, DEFAULTS };
