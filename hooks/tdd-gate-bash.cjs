'use strict';

/**
 * tdd-gate-bash.cjs — o TDD Gate no caminho Bash.
 *
 * 2026-09-05 (Luiz/dev): o gate so casava `Write|Edit`, entao escrever por shell o contornava.
 * Nao era hipotese: durante o Plano 01 do route-auth-matrix um executor criou um arquivo por
 * heredoc depois de o gate bloquear o Write. O falso positivo daquele caso ja caiu (fixtures
 * entraram no SKIP_PATTERN), mas o buraco continuava aberto.
 *
 * POR QUE BLOQUEIA, E NAO SO AVISA: o caminho Write/Edit bloqueia. Se aqui apenas avisasse,
 * trocar de ferramenta ficaria ESTRITAMENTE mais barato que cumprir a regra — o gate viraria um
 * incentivo a burlar.
 *
 * LIMITE HONESTO: so as formas inequivocas de escrita sao vistas (redirect, tee, sed -i, cp/mv,
 * touch). Script que escreve — `python gen.py`, `bun run build` — passa. Isto e atrito contra o
 * contorno casual, nao enforcement completo, e nao ha regex que mude isso.
 *
 * Desligar: `config/tdd-gate.json` -> `"bash_path": "off"` (ou `"mode": "off"`, que desliga os dois).
 */

const fs = require('fs');
const path = require('path');
const { needsTest, basenameFor } = require('./lib/tdd-decision.cjs');
const { extractWriteTargets } = require('./lib/bash-write-targets.cjs');

function allow() { process.exit(0); }
function block(reason) {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

function readConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'tdd-gate.json');
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

// Mesmo safety timeout do tdd-gate.cjs: stdin que nao fecha no Windows nao pode travar o terminal.
const safetyTimer = setTimeout(() => allow(), 5000);

let rawInput = '';
let handled = false;

function processInput() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);
  try {
    const config = readConfig();
    if (config.mode === 'off') return allow();
    if (config.bash_path === 'off') return allow();

    const input = JSON.parse(rawInput || '{}');
    const toolInput = input.tool_input || input;
    const command = toolInput.command || '';
    if (!command) return allow();

    // Pre-filtro barato: o hook roda em TODO comando Bash. Sem caminho de producao no texto,
    // nao ha o que decidir — sai antes de qualquer I/O.
    if (!/\.(ts|tsx|js|jsx)\b/.test(command)) return allow();

    const cwd = process.cwd();
    const blocked = extractWriteTargets(command).filter(target => needsTest(target, cwd));
    if (blocked.length === 0) return allow();

    const names = blocked.map(t => `"${basenameFor(t)}"`).join(', ');
    block(
      `TDD GATE (bash): o comando escreve codigo de producao sem teste correspondente: ${names}. ` +
      `Crie o arquivo de teste primeiro (Red phase). ` +
      `Escrever por shell nao e caminho alternativo para o gate — se ele bloqueou o Write, ` +
      `a resposta e escrever o teste ou reportar, nao trocar de ferramenta. ` +
      `Anti-Vibe Coding: Red -> Green -> Refactor.`
    );
  } catch {
    allow(); // fail-open: hook quebrado nunca pode travar o terminal
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', processInput);
process.stdin.on('error', () => allow());
