// 2026-09-05 (Luiz/dev): trava a sincronia entre `lib/registry.ts` e a tabela "Fluxo de Steps" da
// SKILL.md.
//
// Motivo: a tabela sobreviveu ao refactor init-v7 sem ser atualizada e passou ~4 meses descrevendo
// o pipeline v6 — ~14 das 17 linhas nomeavam steps deletados ou fundidos, e CINCO steps reais nao
// apareciam uma unica vez. O arquivo ja trazia o aviso "se divergirem, o registry vence", e o aviso
// nao impediu nada: divergencia silenciosa nao e resolvida por disclaimer, e resolvida por gate.
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { registry } from './registry'

const SKILL_MD = path.join(import.meta.dir, '..', 'SKILL.md')

function stepTableIds(): string[] {
  const body = readFileSync(SKILL_MD, 'utf8')
  const start = body.indexOf('## Fluxo de Steps')
  expect(start).toBeGreaterThan(-1)
  // A tabela termina na primeira linha que nao comeca com `|` depois do cabecalho.
  const rows = body.slice(start).split('\n').filter((l) => l.startsWith('|'))
  const ids: string[] = []
  for (const row of rows) {
    const idCell = row.split('|')[2]
    if (idCell === undefined) continue
    const match = idCell.match(/`([^`]+)`/)
    if (match?.[1] !== undefined) ids.push(match[1])
  }
  return ids
}

describe('SKILL.md descreve o pipeline que o registry realmente roda', () => {
  it('documents every step that the registry executes', () => {
    const documented = new Set(stepTableIds())
    const missing = registry.map((s) => s.id).filter((id) => !documented.has(id))
    expect(missing).toEqual([])
  })

  it('does not document a step that the registry does not execute', () => {
    const real = new Set(registry.map((s) => s.id))
    const phantom = stepTableIds().filter((id) => !real.has(id))
    expect(phantom).toEqual([])
  })

  it('lists the steps in the same order the registry runs them', () => {
    expect(stepTableIds()).toEqual(registry.map((s) => s.id))
  })

  // Controle positivo: sem ele, os testes acima passariam se o parser devolvesse lista vazia
  // dos dois lados — verdes por nao terem lido nada.
  it('actually parsed a non-empty table and a non-empty registry', () => {
    expect(stepTableIds().length).toBeGreaterThan(5)
    expect(registry.length).toBeGreaterThan(5)
  })
})
