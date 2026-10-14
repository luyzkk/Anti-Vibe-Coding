// 2026-05-12 (Luiz/dev): CA-31 prereq — testa o modelo de TODO.md que o init distribui.
// 2026-10-13 (Luiz/dev): 8.0 fatia 2 — a skill todo-pick e o helper scaffold-todo-md (codigo morto, so
// testes o chamavam) sairam. Fica o contrato do modelo que o scaffold copia para o projeto.

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const INIT_TEMPLATES_ROOT = path.join(
  import.meta.dir,
  '..',
  'skills/init/assets/templates',
)

describe('TODO.md.tpl in init templates', () => {
  it('exists', async () => {
    const tplPath = path.join(INIT_TEMPLATES_ROOT, 'TODO.md.tpl')
    const stat = await fs.stat(tplPath)
    expect(stat.isFile()).toBe(true)
  })

  it('starts with # TODO', async () => {
    const tplPath = path.join(INIT_TEMPLATES_ROOT, 'TODO.md.tpl')
    const content = await fs.readFile(tplPath, 'utf8')
    expect(content.startsWith('# TODO')).toBe(true)
  })

  it('no longer points to the archived todo-pick skill', async () => {
    const tplPath = path.join(INIT_TEMPLATES_ROOT, 'TODO.md.tpl')
    const content = await fs.readFile(tplPath, 'utf8')
    expect(content).not.toContain('todo-pick')
  })
})
