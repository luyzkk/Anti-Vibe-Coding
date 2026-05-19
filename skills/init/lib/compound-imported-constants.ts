// 2026-05-19 (Luiz/dev): hardening fase-02 — constantes e helpers compartilhados
// entre progress-txt-parser e compound-imported-writer. Resolve findings
// medium do verify-work: YAML injection, secrets leak, magic numbers, DRY.

export const MAX_SLUG_LENGTH = 60
export const OUTPUT_DIR_SUBPATH = 'docs/compound/_imported'

export function formatEntryIndex(index: number): string {
  return String(index).padStart(4, '0')
}

export function quoteYamlString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

// Patterns de secrets cobrem os formatos mais comuns que podem ser colados
// em progress.txt como "lição aprendida". Não pretende ser exaustivo —
// `06-secrets-scan` cobre o repo. Aqui evitamos copiar tokens VERBATIM para
// docs/compound/_imported/ (que vai pro git).
const SECRET_PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9]{20,}/g,
  /gho_[A-Za-z0-9]{20,}/g,
  /ghs_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bBearer\s+[A-Za-z0-9._-]{20,}/g,
]

export function redactSecrets(body: string): string {
  let out = body
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, '[REDACTED]')
  }
  return out
}
