'use strict';

/**
 * tdd-phase.cjs — leitura da ancora de fase, num lugar so.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. Dois consumidores leem `.claude/.tdd-phase.json`: o TDD Gate, que
 * congela o teste durante o GREEN, e o pre-commit, que libera o commit do RED. Formato lido em dois
 * lugares com regras proprias e como o repo ganha uma terceira definicao do mesmo ciclo — foi o que
 * o PRD tdd-cycle-contract matou uma vez.
 *
 * Quem ESCREVE a ancora e o orquestrador do execute-plan (Step 4c, passos 1 e 4). Nenhum hook a
 * escreve, de proposito: quem esta sob a ancora nunca e quem a controla.
 */

const fs = require('fs');
const path = require('path');

const ANCHOR_RELATIVE = path.join('.claude', '.tdd-phase.json');

/**
 * @param {string} cwd raiz do projeto onde a ancora vive
 * @returns {object|null} conteudo da ancora, ou null se ausente/ilegivel
 */
function readTddPhase(cwd) {
  try {
    const anchorPath = path.join(cwd, ANCHOR_RELATIVE);
    if (!fs.existsSync(anchorPath)) return null;
    return JSON.parse(fs.readFileSync(anchorPath, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = { readTddPhase, ANCHOR_RELATIVE };
