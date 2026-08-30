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

// 2026-08-30 (Luiz/dev): python_versions opcional — mesmo contrato de rails_versions
// (array de ranges semver-style, nao-vazio). Generalizado em helper para nao duplicar
// a regra por stack — D9/RF3 + CA-03 do PRD stack-knowledge-python.
// O exemplo na mensagem de erro e por campo de proposito: a mensagem de rails_versions e
// contrato de teste desde 2026-05-18 e precisa continuar byte a byte igual.
const OPTIONAL_VERSION_FIELDS: ReadonlyArray<{ field: string; example: string }> = [
  { field: 'rails_versions', example: '>=7.1' },
  { field: 'python_versions', example: '>=3.11' },
]

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

/**
 * Valida um campo opcional de versoes (array de ranges semver-style, nao-vazio).
 * Ausencia do campo e valida — o campo e opcional por design: atomos sem sensibilidade
 * de versao nao o declaram.
 *
 * @example validateVersionsField({ python_versions: ['>=3.11'] }, 'python_versions', '>=3.11', [])
 */
function validateVersionsField(
  data: Record<string, unknown>,
  field: string,
  example: string,
  errors: string[],
): void {
  if (!(field in data)) return
  const value = data[field]

  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array, not a string`)
    return
  }
  if (value.length === 0) {
    errors.push(`${field} array must not be empty`)
    return
  }
  for (const item of value) {
    if (typeof item !== 'string' || !SEMVER_RANGE.test(item)) {
      errors.push(
        `${field} item "${String(item)}" does not match semver range format (e.g. ${example})`,
      )
    }
  }
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

  for (const { field, example } of OPTIONAL_VERSION_FIELDS) {
    validateVersionsField(data, field, example, errors)
  }

  return { valid: errors.length === 0, errors }
}
