// 2026-05-25 (Luiz/dev): unit test do readPluginVersion extraido.
// Garante que le 7.3.0 do plugin.json real do repo de dev.

import { describe, it, expect } from 'bun:test'
import { readPluginVersion } from './read-plugin-version'

describe('readPluginVersion', () => {
  it('reads version from .claude-plugin/plugin.json', async () => {
    const version = await readPluginVersion()
    // Atualizar este match se plugin.json bumpar major/minor.
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(version).not.toBe('6.7.0') // garante que NAO caiu no fallback
  })
})
