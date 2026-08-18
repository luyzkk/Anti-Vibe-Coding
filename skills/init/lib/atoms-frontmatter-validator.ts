// 2026-05-18 (Luiz/dev): helper de validacao de frontmatter de atomos. Suporta campo opcional rails_versions (array de ranges semver-style). RF4 + CA-10.

// 2026-08-18 (Luiz/dev): TODO.md #3 — parser hand-rolled (regex por campo + split manual de array
// inline) trocado por js-yaml/CORE_SCHEMA. Mesmo caminho que scripts/compound-check.ts tomou em
// 2026-05-13 pelo mesmo motivo. Fecha tambem o item de ReDoS: a extracao virou indexOf, sem regex
// nenhuma — "bounded" era o pedido, remover e mais forte.
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

export interface FrontmatterValidationResult {
  valid: boolean
  errors: string[]
}

const REQUIRED_FIELDS = ['topic', 'stack', 'layer', 'sources', 'tier', 'triggers', 'related_skills', 'updated']

const SEMVER_RANGE = /^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/

const FRONTMATTER_OPEN = '---\n'
const FRONTMATTER_CLOSE = '\n---'

/**
 * Recorta o bloco de frontmatter por indice, sem regex.
 *
 * A versao anterior usava `/^---\r?\n([\s\S]*?)\r?\n---/`, cujo quantificador lazy tem pior caso
 * quadratico num arquivo grande que abre `---` e nunca fecha (TODO.md #3 chamava de ReDoS; a
 * medicao ao passar pelo arquivo mostrou blowup O(n²), nao exponencial). `indexOf` e linear e
 * nao tem backtracking — o pedido do item era "regex bounded", e remover a regex e mais forte.
 *
 * Normaliza CRLF->LF aqui dentro de proposito: assim a funcao nao depende de disciplina do caller.
 * Ref: docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md
 */
function extractFrontmatter(raw: string): string | null {
  const content = raw.replace(/\r\n/g, '\n')
  if (!content.startsWith(FRONTMATTER_OPEN)) return null
  const close = content.indexOf(FRONTMATTER_CLOSE, FRONTMATTER_OPEN.length)
  if (close === -1) return null
  return content.slice(FRONTMATTER_OPEN.length, close)
}

export function validateAtomFrontmatter(filePath: string): FrontmatterValidationResult {
  const errors: string[] = []

  const frontmatter = extractFrontmatter(readFileSync(filePath, 'utf-8'))
  if (frontmatter === null) {
    return { valid: false, errors: ['missing frontmatter block'] }
  }

  // CORE_SCHEMA: strings/numbers/bools/nulls/arrays/maps — sem tags JS-specific.
  // Mesmo schema do scripts/compound-check.ts (fecha a superficie de bypass).
  let parsed: unknown
  try {
    parsed = yaml.load(frontmatter, { schema: yaml.CORE_SCHEMA })
  } catch (err) {
    // YAML malformado vira erro de validacao, nao excecao — o caller e um validador em loop
    // sobre N atomos e nao deve morrer no primeiro arquivo torto.
    const detail = err instanceof Error ? err.message.split('\n')[0] : String(err)
    return { valid: false, errors: [`frontmatter YAML malformado: ${detail}`] }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errors: ['frontmatter YAML nao e um mapa de campos'] }
  }
  const data = parsed as Record<string, unknown>

  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      errors.push(`missing required field: ${field}`)
    }
  }

  // Validate rails_versions if present
  if ('rails_versions' in data) {
    const value = data['rails_versions']

    if (!Array.isArray(value)) {
      errors.push('rails_versions must be an array, not a string')
    } else if (value.length === 0) {
      errors.push('rails_versions array must not be empty')
    } else {
      for (const item of value) {
        if (typeof item !== 'string' || !SEMVER_RANGE.test(item)) {
          errors.push(
            `rails_versions item "${String(item)}" does not match semver range format (e.g. >=7.1)`,
          )
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
