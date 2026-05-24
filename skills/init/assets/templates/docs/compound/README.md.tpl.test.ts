// 2026-05-24 (plan-executor): RED test para MH-01 — schema canonico no compound/README.md.tpl
// PRD CA-01: bloco yaml de exemplo deve ter title/category/tags/created (NAO date/author/decision)

import { readFileSync } from 'node:fs'
import path from 'node:path'

const TPL_PATH = path.resolve(import.meta.dir, 'README.md.tpl')

const content = readFileSync(TPL_PATH, 'utf8')

describe('compound/README.md.tpl schema canonico (MH-01)', () => {
  it('contem title: no bloco yaml de exemplo', () => {
    expect(content).toMatch(/^title:/m)
  })

  it('contem category: no bloco yaml de exemplo', () => {
    expect(content).toMatch(/^category:/m)
  })

  it('contem created: no bloco yaml de exemplo', () => {
    expect(content).toMatch(/^created:/m)
  })

  it('NAO contem date: no bloco yaml de exemplo', () => {
    expect(content).not.toMatch(/^date:/m)
  })

  it('NAO contem author: no bloco yaml de exemplo', () => {
    expect(content).not.toMatch(/^author:/m)
  })

  it('NAO contem decision: no bloco yaml de exemplo', () => {
    expect(content).not.toMatch(/^decision:/m)
  })
})
