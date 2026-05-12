// 2026-05-12 (Luiz/dev): heuristica D26 — verbos + paths + negative-list. Isolada para testavel
'use strict'

// 2026-05-12 (Luiz/dev): listas mantidas como const em modulo — facil ajustar via PR sem reescrever hook
const SUBSTANTIAL_VERBS = [
  'implementar', 'implement',
  'construir', 'build',
  'criar', 'create',
  'adicionar feature', 'add feature',
  'desenvolver', 'develop',
  'migrar', 'migrate',
  'refatorar', 'refactor',
  'reescrever', 'rewrite',
]

const CODE_PATH_HINTS = [
  /\bsrc\//i,
  /\blib\//i,
  /\bcomponents\//i,
  /\bapi\//i,
  /\bservices\//i,
  /\.tsx?\b/i,
  /\.pyc?\b/i,
  /\.rb\b/i,
]

// 2026-05-12 (Luiz/dev): negative-list (D26) — evita falso-positivo em prompts educacionais ou de leitura
const NEGATIVE_PREFIXES = [
  /^\s*explique?\b/i,
  /^\s*como funciona\b/i,
  /^\s*o que (é|e)\b/i,
  /^\s*ensin[ae]\b/i,
  /^\s*me ajude a entender\b/i,
  /^\s*document[ae]\b/i,
  /^\s*revise?\b/i,
  /^\s*analise?\b/i,
  /^\s*pesquise?\b/i,
  /^\s*explain\b/i,
  /^\s*how does\b/i,
  /^\s*what is\b/i,
  /^\s*review\b/i,
]

/**
 * Decide se prompt eh "trabalho substancial" que merece sugestao de plano.
 * Retorna { suggest: boolean, why: string[] } — `why` lista signals para telemetria.
 *
 * @param {string} prompt
 * @returns {{ suggest: boolean, why: string[] }}
 */
function shouldSuggestPlan(prompt) {
  if (typeof prompt !== 'string' || prompt.length < 8) {
    return { suggest: false, why: ['too-short'] }
  }

  // 2026-05-12 (Luiz/dev): negative-list checada PRIMEIRO — short-circuit (D26)
  for (const re of NEGATIVE_PREFIXES) {
    if (re.test(prompt)) {
      return { suggest: false, why: ['negative-list-match'] }
    }
  }

  const why = []
  const hasVerb = SUBSTANTIAL_VERBS.some((v) => prompt.toLowerCase().includes(v))
  if (hasVerb) why.push('verb-match')

  const hasPath = CODE_PATH_HINTS.some((re) => re.test(prompt))
  if (hasPath) why.push('path-match')

  // 2026-05-12 (Luiz/dev): logica D26 — (verb OR path) AND NOT negative
  return { suggest: hasVerb || hasPath, why }
}

module.exports = { shouldSuggestPlan, SUBSTANTIAL_VERBS, NEGATIVE_PREFIXES, CODE_PATH_HINTS }
