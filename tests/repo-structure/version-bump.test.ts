// Garante que os 4 arquivos JSON canonicos estao sincronizados na mesma versao.
//
// Por que existe: em 2026-06-05 o `marketplace.json` foi encontrado em 7.0.0 enquanto
// `package.json`, `plugin.json` e `plugin-manifest.json` ja tinham seguido para 7.3.0 — drift
// silencioso de tres releases, porque nada comparava os quatro entre si.
//
// 2026-08-11 (Luiz/dev): a versao esperada agora e DERIVADA de `package.json` em vez de fixada
// numa constante. A constante fixa exigia editar este arquivo a cada release e envelhecia sozinha:
// o release 7.5.0 (commit 786678d) subiu os 4 JSON e deixou o teste em 7.4.0, quebrando 4 testes na
// main. O teste passa a checar o que o cabecalho sempre disse que ele checava — que os quatro
// concordam entre si — e nao precisa mais ser tocado num bump.
// Historico de bumps anteriores: `git log --oneline -- tests/repo-structure/version-bump.test.ts`.
//
// Rodar: bun test tests/repo-structure/version-bump.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')

/** `package.json` e a fonte da versao; os outros tres seguem. */
const SOURCE_FILE = 'package.json'
const FOLLOWER_FILES = ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'plugin-manifest.json']

const SEMVER = /^\d+\.\d+\.\d+$/

async function readVersion(relPath: string): Promise<unknown> {
  const content = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8')
  const parsed = JSON.parse(content) as Record<string, unknown>
  return parsed['version']
}

describe('version sync entre os 4 JSON canonicos', () => {
  // Sem este check, um `version` ausente ou vazio faria os 4 arquivos "concordarem" em undefined.
  it('package.json carrega uma versao semver valida', async () => {
    const version = await readVersion(SOURCE_FILE)

    expect(typeof version).toBe('string')
    expect(version as string).toMatch(SEMVER)
  })

  it.each(FOLLOWER_FILES)('%s casa com a versao do package.json', async (relPath) => {
    const [expected, actual] = await Promise.all([readVersion(SOURCE_FILE), readVersion(relPath)])

    expect(actual).toBe(expected)
  })
})
