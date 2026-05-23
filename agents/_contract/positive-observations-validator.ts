// 2026-05-23 (Luiz/dev): validator de positive_observations — PRD DC-5 / Wave 2 Plano 01 fase-04
// Enforce dos 4 testes anti-generico:
// 1. Cita arquivo especifico (regex de path com extensao + opcional :linha)
// 2. Nao e tautologia (regex blacklist)
// 3. Verificavel por terceiro (cita arquivo OU simbolo identificavel)
// 4. Nao-banal (length minima + nao reduzivel a tautologia)

export type ValidationResult =
  | { valid: true; reason?: never }
  | { valid: false; reason: string }

export const TAUTOLOGY_BLACKLIST: RegExp[] = [
  /\bno issues?\s*(found|present|detected)?\b/i,
  /\blooks\s+(fine|good|ok)\b/i,
  /\beverything\s+(is\s+)?(fine|ok|good)\b/i,
  /\btudo\s+(certo|ok|bem)\b/i,
  /\bcodigo\s+(limpo|ok|bom)\b/i,
  /\bsem\s+(problemas?|issues?)\b/i,
  /^\s*ok\.?\s*$/i,
  /\b(parece|seems?)\s+(bem|ok|fine|good|seguro|safe)\b/i,
]

// Detecta citacao de arquivo com extensao comum (ex: src/foo/bar.ts:42)
export const FILE_PATH_REGEX = /\.(ts|tsx|js|jsx|py|go|rs|java|sql|rb|php|cs|kt|swift|c|cpp|h|hpp)/

// Detecta citacao de simbolo: backticks, Class PascalCase, funcao camelCase com contexto
export const SYMBOL_REGEX = /(`[a-zA-Z_$][\w$]*`|[Cc]lass\s+`?[A-Z]\w+`?|[Ff]unction\s+`?[a-zA-Z_$][\w$]*`?|middleware\s+`[\w$]+`|\b[a-z][a-zA-Z0-9]+[A-Z]\w{2,}\b)/

// Observacoes uteis tem pelo menos 15 chars
export const MIN_LENGTH = 15

export function validatePositiveObservation(text: string): ValidationResult {
  if (typeof text !== 'string') {
    return { valid: false, reason: 'positive_observation deve ser string' }
  }
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { valid: false, reason: 'positive_observation vazia' }
  }
  if (trimmed.length < MIN_LENGTH) {
    return {
      valid: false,
      reason: `positive_observation curta demais (<${MIN_LENGTH} chars) — provavelmente generica`,
    }
  }

  for (const pattern of TAUTOLOGY_BLACKLIST) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `tautologia detectada (regex: ${pattern.toString()})` }
    }
  }

  const hasFileRef = FILE_PATH_REGEX.test(trimmed)
  const hasSymbolRef = SYMBOL_REGEX.test(trimmed)
  if (!hasFileRef && !hasSymbolRef) {
    return {
      valid: false,
      reason:
        'positive_observation generica — sem citacao de arquivo (com extensao) nem simbolo identificavel',
    }
  }

  return { valid: true }
}

export function validatePositiveObservations(items: unknown): ValidationResult {
  if (!Array.isArray(items)) {
    return { valid: false, reason: 'positive_observations deve ser array' }
  }
  if (items.length < 1) {
    return { valid: false, reason: 'positive_observations deve ter length >= 1 (DT-7 do PRD)' }
  }
  for (let i = 0; i < items.length; i++) {
    const result = validatePositiveObservation(items[i] as string)
    if (!result.valid) {
      return { valid: false, reason: `positive_observations[${i}] invalido: ${result.reason}` }
    }
  }
  return { valid: true }
}
