'use strict';

/**
 * fail-open.cjs — a politica de falha dos gates de disciplina, num lugar so.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. Permitir quando o proprio hook quebra e deliberado: um gate de
 * DISCIPLINA que falha fechando trava o trabalho inteiro por um bug proprio, o que e pior que a
 * regra que ele guarda. O que estava errado era o silencio — `catch { allow() }` fazia a quebra
 * ser invisivel, e gate quebrado calado vira gate que ninguem sabe que parou de existir.
 *
 * Nao confundir com controle de seguranca: la a direcao correta e fechar.
 */

function reportAndAllow(hookName, err) {
  try {
    const detail = err && err.message ? err.message : String(err);
    process.stderr.write(`${hookName}: falha inesperada no proprio hook, permitindo a acao. Motivo: ${detail}\n`);
  } catch { /* stderr fechado: nao ha onde reportar, o allow abaixo ainda vale */ }
  process.exit(0);
}

module.exports = { reportAndAllow };
