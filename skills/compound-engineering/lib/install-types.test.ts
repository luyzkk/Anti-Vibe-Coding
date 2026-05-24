// 2026-05-24 (Luiz/dev): verifica exportabilidade dos tipos — PRD CA-04/05/06
// Tipos puros sem logica; este teste garante que o shape do contrato permanece estavel.

import { describe, it, expect } from 'bun:test'
import type { InstallOpts, InstallResult } from './install-types'

describe('install-types contract', () => {
  it('InstallOpts aceita force:boolean e dryRun:boolean opcional', () => {
    const opts: InstallOpts = { force: false }
    expect(opts.force).toBe(false)

    const optsWithDry: InstallOpts = { force: true, dryRun: true }
    expect(optsWithDry.dryRun).toBe(true)
  })

  it('InstallResult tem arrays created, skipped, overwritten, notes', () => {
    const result: InstallResult = {
      created: ['docs/foo.md'],
      skipped: [],
      overwritten: [],
      notes: ['No package.json detected'],
    }
    expect(result.created).toHaveLength(1)
    expect(result.notes[0]).toContain('No package.json')
  })
})
