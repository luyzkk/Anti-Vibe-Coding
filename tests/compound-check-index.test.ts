// 2026-10-18 (Luiz/dev): 8.0 fatia 5 (F5-1, F5-2) — o indice das licoes, gerado por script e conferido.
// docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-5.md
//
// O Claude le o indice (uma linha por licao) e abre a licao inteira so quando uma linha bate com o trabalho.
// Indice escrito a mao se desencontra das licoes sem ninguem perceber; por isso ele e gerado a partir dos
// proprios arquivos (`--write-index`) e o check falha quando diverge. As duas copias do script recebem o
// mesmo contrato: a deste repositorio e a que o init distribui para os projetos.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = path.join(import.meta.dir, '..')

const SCRIPTS = [
  { label: 'repositorio', src: path.join(ROOT, 'scripts/compound-check.ts') },
  { label: 'modelo do init', src: path.join(ROOT, 'skills/init/assets/templates/scripts/compound-check.ts.tpl') },
]

const note = (title: string, tags: string) => `---
title: ${title}
category: pattern
tags: [${tags}]
created: 2026-10-18
---

# ${title}

## Problem
p

## Solution
s

## Prevention
v
`

describe.each(SCRIPTS)('compound-check — indice das licoes ($label)', ({ label, src }) => {
  const FIXTURE = path.join(import.meta.dir, '__fixtures__', `compound-index-${label.replace(/\W+/g, '-')}`)
  const INDEX = path.join(FIXTURE, 'docs/compound/INDEX.md')

  async function run(args: string[] = []): Promise<{ code: number; stderr: string; stdout: string }> {
    return new Promise((resolve) => {
      const proc = spawn('bun', ['run', path.join(FIXTURE, 'scripts/compound-check.ts'), ...args], { cwd: FIXTURE })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d) => { stdout += d.toString() })
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
    })
  }

  const write = (name: string, body: string) => fs.writeFile(path.join(FIXTURE, 'docs/compound', name), body, 'utf8')

  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
    await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
    await fs.copyFile(src, path.join(FIXTURE, 'scripts', 'compound-check.ts'))
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('sem licoes, passa sem indice', async () => {
    expect((await run()).code).toBe(0)
  })

  it('com licoes e sem indice, falha e diz o comando que gera o indice', async () => {
    await write('2026-10-18-a.md', note('Licao A', 'webhook'))
    const r = await run()
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('INDEX.md')
    expect(r.stderr).toContain('compound:index')
  })

  it('--write-index gera uma linha por licao, a mais nova primeiro, com titulo, etiquetas e caminho', async () => {
    await write('2026-10-17-antiga.md', note('Licao antiga', 'testes'))
    await write('2026-10-18-nova.md', note('Licao nova', 'webhook, pagamento'))
    expect((await run(['--write-index'])).code).toBe(0)
    const linhas = (await fs.readFile(INDEX, 'utf8')).split('\n').filter((l) => l.startsWith('- '))
    expect(linhas).toEqual([
      '- [Licao nova](2026-10-18-nova.md) — webhook, pagamento',
      '- [Licao antiga](2026-10-17-antiga.md) — testes',
    ])
  })

  it('com o indice em dia, passa, e o proprio INDEX.md nao e validado como licao', async () => {
    await write('2026-10-18-a.md', note('Licao A', 'webhook'))
    await run(['--write-index'])
    const r = await run()
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('1 compound notes validated')
  })

  it('uma licao nova sem atualizar o indice faz o check falhar', async () => {
    await write('2026-10-18-a.md', note('Licao A', 'webhook'))
    await run(['--write-index'])
    await write('2026-10-19-b.md', note('Licao B', 'deploy'))
    expect((await run()).code).toBe(1)
  })

  it('titulo editado sem atualizar o indice faz o check falhar', async () => {
    await write('2026-10-18-a.md', note('Licao A', 'webhook'))
    await run(['--write-index'])
    await write('2026-10-18-a.md', note('Licao A, revista', 'webhook'))
    expect((await run()).code).toBe(1)
  })

  it('licao arquivada nao entra no indice', async () => {
    await write('2026-10-18-a.md', note('Licao A', 'webhook'))
    await fs.mkdir(path.join(FIXTURE, 'docs/compound/_archived'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/_archived/2026-01-01-velha.md'), note('Velha', 'x'), 'utf8')
    await run(['--write-index'])
    expect(await fs.readFile(INDEX, 'utf8')).not.toContain('Velha')
  })
})
