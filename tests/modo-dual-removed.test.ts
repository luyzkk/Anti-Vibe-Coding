// 2026-10-18 (Luiz/dev): 8.0 fatia 4 (F4-3) — o Modo Dual saiu.
// docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-4.md
//
// Ele nunca ligou num projeto real: o detector gravava o perfil em `.claude/.anti-vibe-manifest.json`,
// o leitor procurava `.anti-vibe-manifest.json` na raiz e ainda exigia uma chave de ativacao que nada
// no plugin ligava. Os blocos que liam o perfil rodavam sempre no caminho "sem perfil". Este teste
// impede que o codigo morto volte em silencio pelas skills do pipeline.
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8')

describe('o pipeline nao le mais o perfil de arquitetura (F4-3)', () => {
  test.each(['write-prd', 'plan-feature', 'execute-plan', 'verify-work'])('%s nao carrega o bloco de perfil', (skill) => {
    const body = read(`skills/${skill}/SKILL.md`)
    expect(body).not.toContain('read-architecture-profile')
    expect(body).not.toMatch(/fase-policy|adherence-checks|structure-snippet/)
  })

  test('os modelos nao tem mais os marcadores que o perfil preenchia', () => {
    expect(read('skills/write-prd/templates/design-template.md')).not.toContain('structure-snippet')
    expect(read('skills/plan-feature/templates/plan-readme-template.md')).not.toContain('fase-policy-block')
  })
})
