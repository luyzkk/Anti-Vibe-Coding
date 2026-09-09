'use strict';

/**
 * pre-commit-suite.cjs — roda a suite antes de um `git commit`, menos na fase RED.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. Substitui o `node -e` inline do hooks.json, que lia
 * `process.env.CLAUDE_TOOL_INPUT` (nunca preenchida — o payload chega por stdin) e chamava
 * `bun run lint` (script inexistente neste repo). Estava morto nas duas pontas.
 *
 * A decisao mora em `lib/precommit-decision.cjs`; aqui fica so o I/O.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { decide } = require('./lib/precommit-decision.cjs');
const { readTddPhase } = require('./lib/tdd-phase.cjs');
const { reportAndAllow } = require('./lib/fail-open.cjs');

function allow() { process.exit(0); }
function block(reason) {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

// A suite passa a ser `bun run test`. `bun run lint` saiu: nao existe neste repo, e um script
// ausente aqui bloquearia todo commit no dia em que o hook voltasse a funcionar.
function runSuite(cwd) {
  try {
    execFileSync('bun', ['run', 'test'], { cwd, timeout: 60000, stdio: 'pipe', encoding: 'utf8', shell: true });
    return { ok: true };
  } catch (err) {
    const out = (String(err.stdout || '') + String(err.stderr || '')).trim();
    // Nao conseguiu RODAR (script ausente, bun fora do PATH, timeout sob carga) e diferente de
    // "rodou e reprovou". Lancar leva ao ramo fail-open da decisao.
    if (err.code === 'ENOENT' || err.killed || err.signal || /Script not found/i.test(out)) {
      throw new Error(out.split('\n')[0] || String(err.message || err));
    }
    // A cauda da saida costuma ser o resumo do ULTIMO lote, que pode estar verde enquanto o
    // primeiro reprovou — mensagem que nao diz o que quebrou nao serve para nada. As linhas
    // `(fail)` sao o que o dev precisa ler.
    const failures = out.split('\n').filter(l => l.trimStart().startsWith('(fail)')).slice(0, 5);
    const detail = failures.length > 0
      ? failures.map(l => l.trim()).join(' | ')
      : out.split('\n').slice(-4).join(' ');
    return { ok: false, error: detail };
  }
}

const safetyTimer = setTimeout(() => allow(), 85000);
let rawInput = '';
let handled = false;

function processInput() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);
  try {
    const input = JSON.parse(rawInput || '{}');
    const toolInput = input.tool_input || input;
    const command = toolInput.command || '';
    const cwd = process.cwd();
    const anchor = readTddPhase(cwd);

    const decision = decide({
      command,
      phase: anchor && anchor.phase ? anchor.phase : null,
      runSuite: () => runSuite(cwd),
    });

    if (decision.action === 'block') {
      return block(`[PRE-COMMIT] ${decision.reason}\nCorrija antes de commitar, ou rode a suite para ver o detalhe.`);
    }
    // Permitir sem rodar a suite e uma decisao, nao um acidente: anunciar qual foi.
    if (decision.reason && decision.reason !== 'nao e um commit' && decision.reason !== 'suite verde') {
      try { process.stderr.write(`[PRE-COMMIT] ${decision.reason}\n`); } catch { /* stderr fechado */ }
    }
    allow();
  } catch (err) {
    reportAndAllow('pre-commit-suite', err);
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', processInput);
process.stdin.on('error', () => allow());
