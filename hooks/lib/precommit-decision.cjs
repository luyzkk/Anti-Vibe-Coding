'use strict';

/**
 * precommit-decision.cjs — decidir se um `git commit` roda a suite antes.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. O pre-commit anterior lia `process.env.CLAUDE_TOOL_INPUT`, que o
 * Claude Code nunca preenche, entao saia com 0 sempre. Falhava ABRINDO, e por isso ninguem notou.
 *
 * A decisao vive aqui, separada do I/O, por dois motivos concretos:
 *
 *   1. O contrato do ciclo TDD EXIGE commitar com teste vermelho (o commit do RED). Um pre-commit
 *      que roda a suite e bloqueia no vermelho torna o proprio ciclo impossivel. O ramo da fase RED
 *      precisa ser testavel sem rodar 2200 testes dentro de um teste.
 *   2. "A suite reprovou" e "a suite nao pode rodar" NAO sao o mesmo caso. O hook antigo chamava
 *      `bun run lint`, script que nao existe neste repo; se ele tivesse funcionado, o erro do script
 *      ausente teria virado "testes falharam" e TODO commit estaria bloqueado.
 *
 * O portao de verdade continua sendo a CI. Este hook e conveniencia, e quem forja a fase pula a
 * suite — trade-off aceito e registrado no ADR.
 */

/**
 * @param {object} input
 * @param {string} input.command comando Bash sendo executado
 * @param {string|null} input.phase fase corrente da ancora (`red`, `green`, ou null)
 * @param {() => {ok: boolean, error?: string}} input.runSuite roda a suite; LANCA se nao conseguir rodar
 * @returns {{action: 'allow'|'block', reason: string}}
 */
function decide(input) {
  const { command, phase, runSuite } = input || {};

  if (!command || !String(command).includes('git commit')) {
    return { action: 'allow', reason: 'nao e um commit' };
  }

  if (phase === 'red') {
    return { action: 'allow', reason: 'fase RED: o contrato do ciclo exige commitar com o teste vermelho' };
  }

  let result;
  try {
    result = runSuite();
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    return { action: 'allow', reason: `suite nao pode ser executada, permitindo o commit. Motivo: ${detail}` };
  }

  if (result && result.ok) return { action: 'allow', reason: 'suite verde' };

  return { action: 'block', reason: `suite reprovou: ${(result && result.error) || 'sem detalhe na saida'}` };
}

module.exports = { decide };
