// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-04 (CA-06 + CA-13 do PRD v6.3.1)
import { describe, expect, test } from 'bun:test'
import { computeParityGaps } from '../skills/parity-audit/lib/parity-gaps-writer'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SCHEMA_V2_PATH = path.join(
  import.meta.dir, '..',
  'discovery', '_schemas', 'parity-gaps-v2.schema.json',
)
const SCHEMA_V1_PATH = path.join(
  import.meta.dir, '..',
  'discovery', '_schemas', 'parity-gaps-v1.schema.json',
)
const V1_FIXTURE = path.join(
  import.meta.dir, 'fixtures', 'parity-gaps-v1-legacy.json',
)

// 2026-05-15 (Luiz/dev): assert estrutural sem ajv — match shapes top-level + tipos campo a campo.
// PRD aceita "match estrutural via parse + assert" como suficiente (CA-05 nota explícita).
function assertMatchesV2(output: unknown, schema: { properties: Record<string, unknown>, required: string[] }): void {
  expect(typeof output).toBe('object')
  const obj = output as Record<string, unknown>
  for (const req of schema.required) {
    expect(Object.prototype.hasOwnProperty.call(obj, req)).toBe(true)
  }
  expect(obj['schema_version']).toBe('2.0')
  const snap = obj['tool_registry_snapshot'] as Record<string, unknown>
  expect(Array.isArray(snap['mcps'])).toBe(true)
  for (const m of snap['mcps'] as unknown[]) {
    const mcp = m as Record<string, unknown>
    expect(typeof mcp['name']).toBe('string')
    expect(Array.isArray(mcp['tools'])).toBe(true)
  }
  expect(Array.isArray(snap['subagents'])).toBe(true)
  for (const s of snap['subagents'] as unknown[]) {
    const sub = s as Record<string, unknown>
    expect(typeof sub['name']).toBe('string')
    expect(typeof sub['description']).toBe('string')
    expect(Array.isArray(sub['allowed_tools'])).toBe(true)
  }
}

describe('parity-gaps schema v2', () => {
  test('writer output matches v2 schema (CA-06)', async () => {
    const schema = JSON.parse(await readFile(SCHEMA_V2_PATH, 'utf-8'))
    const output = await computeParityGaps(
      {
        mcps: [{ name: 'playwright', tools: ['browser_navigate'] }],
        builtin_tools: [{ name: 'Bash' }],
        subagents: [{ name: 'security-auditor', description: 'Auditor', allowed_tools: ['Read', 'Grep'] }],
        generated_at: new Date().toISOString(),
        source: 'manifest',
      },
      null,
    )
    assertMatchesV2(output, schema)
  })

  test('v1 fixture remains valid against v1 schema (CA-13 regression)', async () => {
    const schemaV1 = JSON.parse(await readFile(SCHEMA_V1_PATH, 'utf-8'))
    const fixture = JSON.parse(await readFile(V1_FIXTURE, 'utf-8'))
    // 2026-05-15 (Luiz/dev): v1 deprecated mas não-breaking — fixture antigo permanece
    // estruturalmente válido contra v1 schema (D5 do PRD v6.3.1). v1 sai em v6.4.
    expect(fixture.schema_version).toBe('1.0')
    expect(schemaV1.title).toContain('DEPRECATED') // header atualizado no Passo 2
    expect(Array.isArray(fixture.tool_registry_snapshot.mcps)).toBe(true)
    expect(typeof fixture.tool_registry_snapshot.mcps[0]).toBe('string')
  })
})
