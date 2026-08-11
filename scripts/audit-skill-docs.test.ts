// 2026-08-11 (Luiz/dev): plano01 fase-02 RED — metricas objetivas de context load das skills.
// Fixtures em tmpdir, nunca contra skills/ real (G1 da fase): o repo muda, o teste nao pode.

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { auditSkillDocs } from './audit-skill-docs'

const DESC_WITH_TRIGGERS = "Alpha reference. Use when the user asks about 'one', 'two', or 'three'."
const DESC_NO_TRIGGERS = 'Beta reference. Use when editing a document an agent reads.'

let root: string

function writeSkill(name: string, content: string, eol: '\n' | '\r\n' = '\n'): void {
  mkdirSync(join(root, name), { recursive: true })
  writeFileSync(join(root, name, 'SKILL.md'), content.split('\n').join(eol), 'utf8')
}

function frontmatter(name: string, description: string, extra?: string): string {
  return [
    '---',
    `name: ${name}`,
    `description: "${description}"`,
    'user-invocable: true',
    'disable-model-invocation: false',
    'allowed-tools: Read, Grep, Glob',
    ...(extra ? [extra] : []),
    '---',
    '',
    `# ${name}`,
    '',
  ].join('\n')
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'audit-skill-docs-'))

  writeSkill('alpha', frontmatter('alpha', DESC_WITH_TRIGGERS) + 'Corpo em uma linha.\n')

  writeSkill('beta', frontmatter('beta', DESC_NO_TRIGGERS) + 'Corpo.\n')

  writeSkill(
    'negador',
    frontmatter('negador', DESC_NO_TRIGGERS) +
      ['Primeira linha positiva.', 'Nunca faca isso.', 'Voce nao deve tocar no arquivo.', 'Never ship it.', 'Nevertheless, ship.'].join('\n') +
      '\n',
  )

  // disable-model-invocation ausente == mesmo default (model-invoked). Ver DI-Plano01-fase01.
  writeSkill(
    'sem-campo',
    ['---', 'name: sem-campo', `description: "${DESC_NO_TRIGGERS}"`, 'user-invocable: true', '---', '', '# sem-campo', '', 'Corpo.', ''].join('\n'),
  )

  writeSkill(
    'user-only',
    [
      '---',
      'name: user-only',
      `description: "${DESC_NO_TRIGGERS}"`,
      'user-invocable: true',
      'disable-model-invocation: true',
      '---',
      '',
      '# user-only',
      '',
      'Corpo.',
      '',
    ].join('\n'),
  )

  writeSkill('sem-frontmatter', '# sem-frontmatter\n\nArquivo sem frontmatter nenhum.\n')

  writeSkill('crlf', frontmatter('crlf', DESC_WITH_TRIGGERS) + 'Nunca use CRLF.\n', '\r\n')

  // Comentario HTML antes do frontmatter — padrao real de anti-vibe-review/SKILL.md.
  writeSkill(
    'comentada',
    '<!-- 2026-01-01 (dev): nota de contexto -->\n' + frontmatter('comentada', DESC_WITH_TRIGGERS) + 'Corpo.\n',
  )

  mkdirSync(join(root, 'com-satelite', 'references'), { recursive: true })
  writeFileSync(
    join(root, 'com-satelite', 'SKILL.md'),
    frontmatter('com-satelite', DESC_NO_TRIGGERS) +
      'Ver [MECHANICS](./MECHANICS.md).\n\nDetalhe em `references/fundo.md`.\n',
    'utf8',
  )
  writeFileSync(join(root, 'com-satelite', 'MECHANICS.md'), '# Mechanics\n', 'utf8')
  writeFileSync(join(root, 'com-satelite', 'ORFAO.md'), '# Orfao\n', 'utf8')
  writeFileSync(join(root, 'com-satelite', 'references', 'fundo.md'), '# Fundo\n', 'utf8')
  writeFileSync(join(root, 'com-satelite', 'references', 'esquecido.md'), '# Esquecido\n', 'utf8')
  writeFileSync(join(root, 'com-satelite', 'helper.ts'), 'export const x = 1\n', 'utf8')
  mkdirSync(join(root, 'com-satelite', '__fixtures__'), { recursive: true })
  writeFileSync(join(root, 'com-satelite', '__fixtures__', 'caso.md'), '# Caso\n', 'utf8')
  mkdirSync(join(root, 'com-satelite', 'templates'), { recursive: true })
  writeFileSync(join(root, 'com-satelite', 'templates', 'saida.md'), '# Saida\n', 'utf8')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('auditSkillDocs', () => {
  test('conta chars da description e da linha bruta separadamente', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'alpha')!

    expect(rec.descriptionChars).toBe(DESC_WITH_TRIGGERS.length)
    // linha bruta = 'description: ' + aspas + valor + aspas
    expect(rec.descriptionLineChars).toBe(`description: "${DESC_WITH_TRIGGERS}"`.length)
  })

  test('conta um trigger por item entre aspas simples', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'alpha')!
    expect(rec.triggerCount).toBe(3)
  })

  test('retorna zero triggers para description sem lista de gatilhos', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'beta')!
    expect(rec.triggerCount).toBe(0)
  })

  test('detecta negacoes com o numero da linha', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'negador')!

    expect(rec.negations).toHaveLength(3)
    expect(rec.negations.map((n) => n.term)).toEqual(['Nunca', 'nao', 'Never'])
    expect(rec.negations.every((n) => n.line > 0)).toBe(true)
  })

  test('ignora negacao dentro de palavra maior', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'negador')!
    expect(rec.negations.some((n) => n.text.includes('Nevertheless'))).toBe(false)
  })

  test('trata frontmatter com CRLF sem falso negativo', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'crlf')!

    expect(rec.descriptionChars).toBe(DESC_WITH_TRIGGERS.length)
    expect(rec.triggerCount).toBe(3)
    expect(rec.negations).toHaveLength(1)
  })

  test('trata comentario HTML antes do frontmatter', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'comentada')!
    expect(rec.descriptionChars).toBe(DESC_WITH_TRIGGERS.length)
  })

  test('ignora arquivo sem frontmatter em vez de estourar', () => {
    const report = auditSkillDocs(root)

    expect(report.skills.some((s) => s.skill === 'sem-frontmatter')).toBe(false)
    expect(report.skipped).toContain('sem-frontmatter')
  })

  test('trata disable-model-invocation ausente como model-invoked', () => {
    const skills = auditSkillDocs(root).skills

    expect(skills.find((s) => s.skill === 'sem-campo')!.modelInvoked).toBe(true)
    expect(skills.find((s) => s.skill === 'user-only')!.modelInvoked).toBe(false)
  })

  test('detecta description duplicada no payload do hook', () => {
    const payload = `- /anti-vibe-coding:alpha - ${DESC_WITH_TRIGGERS}`
    const skills = auditSkillDocs(root, payload).skills

    const alpha = skills.find((s) => s.skill === 'alpha')!
    expect(alpha.hookListed).toBe(true)
    expect(alpha.hookExactDuplicate).toBe(true)

    expect(skills.find((s) => s.skill === 'beta')!.hookListed).toBe(false)
  })

  test('mede chars gastos pelo hook mesmo quando a descricao e parafraseada', () => {
    const line = '- /anti-vibe-coding:beta - Beta: outra redacao, mesmo sentido'
    const rec = auditSkillDocs(root, line).skills.find((s) => s.skill === 'beta')!

    expect(rec.hookListed).toBe(true)
    expect(rec.hookExactDuplicate).toBe(false)
    expect(rec.hookDescriptionChars).toBe(line.length)
  })

  test('separa satelite alcancado por ponteiro de satelite orfao', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'com-satelite')!

    // recursivo em references/; .ts, fixture e template de saida nao sao doc de referencia
    expect(rec.satelliteFiles).toEqual([
      'MECHANICS.md',
      'ORFAO.md',
      'references/esquecido.md',
      'references/fundo.md',
    ])
    // link markdown e ponteiro em backtick contam; orfao nao
    expect(rec.satellitesLinked).toEqual(['MECHANICS.md', 'references/fundo.md'])
  })

  test('agrega totais somando os registros', () => {
    const report = auditSkillDocs(root)
    const soma = report.skills.reduce((a, s) => a + s.descriptionChars, 0)

    expect(report.totals.skillCount).toBe(report.skills.length)
    expect(report.totals.descriptionChars).toBe(soma)
    expect(report.totals.modelInvoked).toBe(report.skills.filter((s) => s.modelInvoked).length)
  })

  test('conta linhas de corpo sem contar o frontmatter', () => {
    const rec = auditSkillDocs(root).skills.find((s) => s.skill === 'beta')!
    // corpo util = '# beta' e 'Corpo.'; brancos das pontas nao contam
    expect(rec.bodyLines).toBe(2)
  })
})
