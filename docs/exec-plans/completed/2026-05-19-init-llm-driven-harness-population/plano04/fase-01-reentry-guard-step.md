<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Reentry Guard Step

**Plano:** 04 — Reentrada + Validator allowlist + Audit Step 12
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Novo step `00_2-reentry-guard` que le `.claude/.anti-vibe-manifest.json`, aborta init quando `pluginVersion >= 6.5.0` e sinaliza re-populate quando `< 6.5.0` (ou campo ausente).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/00_2-reentry-guard.ts` | Create | Step que le manifest e decide abort vs re-popula vs greenfield |
| `skills/init/lib/steps/00_2-reentry-guard.test.ts` | Create | Suite unitaria cobrindo greenfield, < 6.5.0, >= 6.5.0, CA-09 (duas execucoes greenfield) |
| `skills/init/lib/semver-compare.ts` | Create | Helper minimo de comparacao semver numerica (split por `.` -> Number[]) |
| `skills/init/lib/semver-compare.test.ts` | Create | Suite cobrindo `6.4.10` > `6.4.9`, `6.5.0` >= `6.5.0`, ausencia de patch |
| `skills/init/lib/registry.ts` | Modify | Inserir `reentryGuardStep` ANTES de `scaffoldFullTreeStep` (e dos steps de migration que mutam disco) |
| `package.json` | Read | Fonte da `pluginVersion` atual (campo `version`) |

---

## Implementacao

### Passo 1: helper de comparacao semver

Cria `skills/init/lib/semver-compare.ts`. Comparacao numerica para evitar `'6.4.10' < '6.4.9'` (G3 do README).

```typescript
/**
 * Compara duas versoes semver no formato MAJOR.MINOR.PATCH (sufixo pre-release ignorado).
 * Retorna -1 se a < b, 0 se iguais, 1 se a > b.
 * @remarks Patch ausente trata como 0. Componentes nao numericos lancam.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): [number, number, number] => {
    const core = v.split('-')[0] ?? v
    const parts = core.split('.').map((p) => Number(p))
    if (parts.some((n) => Number.isNaN(n))) {
      throw new Error(`invalid semver: ${v}`)
    }
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
  }
  const [a0, a1, a2] = parse(a)
  const [b0, b1, b2] = parse(b)
  if (a0 !== b0) return a0 < b0 ? -1 : 1
  if (a1 !== b1) return a1 < b1 ? -1 : 1
  if (a2 !== b2) return a2 < b2 ? -1 : 1
  return 0
}
```

### Passo 2: criar o step `00_2-reentry-guard`

```typescript
// skills/init/lib/steps/00_2-reentry-guard.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { AbortError } from './abort-error'
import { readManifest } from '../manifest-writer'
import { compareSemver } from '../semver-compare'
import type { Step } from './types'

export type ReentryMode = 'greenfield' | 're-populate' | 'abort'

const ABORT_MESSAGE =
  'Projeto ja inicializado na versao atual. Use /sync para atualizar templates ou /update se houve bump de versao do plugin.'

async function readPluginVersion(cwd: string): Promise<string> {
  const pkgPath = path.join(cwd, 'package.json')
  const raw = await fs.readFile(pkgPath, 'utf-8')
  const pkg = JSON.parse(raw) as { version?: string }
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error('package.json sem campo "version" — runtime do plugin nao pode validar reentrada')
  }
  return pkg.version
}

/**
 * Step gate de reentrada (PRD MH-07, CA-04, CA-09, DQ4).
 * - Sem manifest -> greenfield (prossegue).
 * - Manifest com pluginVersion >= 6.5.0 -> AbortError com mensagem do PRD.
 * - Manifest com pluginVersion < 6.5.0 (ou ausente) -> sinaliza ctx.flags.__reentryMode='re-populate'.
 */
export const reentryGuardStep: Step = {
  id: '00_2-reentry-guard',
  async run(ctx) {
    const manifest = await readManifest(ctx.cwd)
    const flags = ctx.flags as Record<string, string | boolean>

    if (manifest === null) {
      flags['__reentryMode'] = 'greenfield'
      return { mutated: false, summary: 'greenfield: no manifest at .claude/.anti-vibe-manifest.json' }
    }

    const manifestVersion =
      typeof manifest.pluginVersion === 'string' && manifest.pluginVersion.length > 0
        ? manifest.pluginVersion
        : null

    if (manifestVersion === null) {
      flags['__reentryMode'] = 're-populate'
      return {
        mutated: false,
        summary: 're-populate: manifest sem pluginVersion -> tratar como < 6.5.0',
      }
    }

    const currentVersion = await readPluginVersion(ctx.cwd)
    const cmp = compareSemver(manifestVersion, '6.5.0')

    if (cmp >= 0) {
      throw new AbortError({ code: 0, reason: ABORT_MESSAGE })
    }

    flags['__reentryMode'] = 're-populate'
    return {
      mutated: false,
      summary: `re-populate: manifest=${manifestVersion} < 6.5.0 (current=${currentVersion})`,
    }
  },
}
```

### Passo 3: testes RED -> GREEN

```typescript
// skills/init/lib/steps/00_2-reentry-guard.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { reentryGuardStep } from './00_2-reentry-guard'
import { AbortError } from './abort-error'

async function makeTmp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reentry-guard-'))
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ version: '6.5.0' }))
  return dir
}

async function writeManifest(cwd: string, pluginVersion: string | null): Promise<void> {
  const dir = path.join(cwd, '.claude')
  await fs.mkdir(dir, { recursive: true })
  const body = pluginVersion === null
    ? { initMode: 'fresh', installedAt: '2026-01-01T00:00:00Z', files: {} }
    : { pluginVersion, initMode: 'fresh', installedAt: '2026-01-01T00:00:00Z', files: {} }
  await fs.writeFile(path.join(dir, '.anti-vibe-manifest.json'), JSON.stringify(body))
}

describe('reentryGuardStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await makeTmp()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('sets greenfield when manifest absent', async () => {
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('greenfield')
    expect(report.summary).toContain('greenfield')
  })

  it('aborts when manifest pluginVersion >= 6.5.0', async () => {
    await writeManifest(cwd, '6.5.0')
    const flags: Record<string, string | boolean> = {}
    let caught: unknown
    try {
      await reentryGuardStep.run({ cwd, args: [], flags })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).reason).toContain('/sync')
  })

  it('signals re-populate when manifest pluginVersion < 6.5.0', async () => {
    await writeManifest(cwd, '6.4.1')
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('re-populate')
    expect(report.summary).toContain('6.4.1')
  })

  it('signals re-populate when pluginVersion field is absent in manifest', async () => {
    await writeManifest(cwd, null)
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('re-populate')
  })

  it('CA-09: two greenfield runs — second aborts as v6.5.0+ reentry', async () => {
    const flagsFirst: Record<string, string | boolean> = {}
    await reentryGuardStep.run({ cwd, args: [], flags: flagsFirst })
    expect(flagsFirst['__reentryMode']).toBe('greenfield')

    await writeManifest(cwd, '6.5.0')
    const flagsSecond: Record<string, string | boolean> = {}
    let caught: unknown
    try {
      await reentryGuardStep.run({ cwd, args: [], flags: flagsSecond })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
  })
})
```

### Passo 4: registrar no `registry.ts`

Inserir `reentryGuardStep` apos `reuseDiscoveryStep` e ANTES de qualquer step que mute disco (scaffold/migrate). Posicao exata: depois de `reuseDiscoveryStep` (linha 44 do registry atual), antes de `secretsScanStep`.

```typescript
import { reentryGuardStep } from './steps/00_2-reentry-guard'
// ...
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  reentryGuardStep,        // 2026-05-19 (Luiz/dev): Plano 04 fase-01 — gate de reentrada (MH-07, CA-04, CA-09).
  secretsScanStep,
  // ...resto inalterado
]
```

---

## Gotchas

- **G1 do plano:** `readManifest(targetDir)` ja resolve `.claude/.anti-vibe-manifest.json` — nao reabrir. Usar a funcao exportada de `manifest-writer.ts`.
- **G2 do plano:** `pluginVersion` ausente -> trata como < 6.5.0 (re-popular), nao greenfield. Greenfield e apenas manifest **inexistente**.
- **G3 do plano:** Comparacao semver lexicografica explode em `6.4.10 < 6.4.9`. Usar `compareSemver` (split numeric).
- **G4 do plano:** `readManifest` retornar `null` e caminho feliz; nao logar como erro.
- **Local:** O step nao deve depender de `Bun.spawn` nem rede — testes rodam em CI sem acesso. So `fs` + `JSON.parse`.
- **Local:** `AbortError.code = 0` aqui (nao e falha; e fluxo de controle). Mensagem precisa conter `/sync` para CA-04 reconhecer.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/init/lib/steps/00_2-reentry-guard.test.ts`
  - Resultado esperado: 5 testes FAIL (step nao existe / `__reentryMode` nunca setado)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/init/lib/steps/00_2-reentry-guard.test.ts`
  - Resultado esperado: `5 pass, 0 fail`

### Checklist

- [ ] `compareSemver('6.4.10', '6.4.9') === 1` (e nao -1)
- [ ] `compareSemver('6.5.0', '6.5.0') === 0`
- [ ] Step nao aborta quando manifest e ausente (greenfield)
- [ ] Step seta `ctx.flags['__reentryMode']` para `greenfield | re-populate` ou lanca AbortError
- [ ] `registry.test.ts` continua verde (step novo registrado na ordem certa)
- [ ] Testes passam: `bun test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/00_2-reentry-guard.test.ts` retorna `5 pass, 0 fail`
- `bun test skills/init/lib/semver-compare.test.ts` retorna `>=3 pass, 0 fail`
- Em fixture com manifest `pluginVersion: "6.5.0"`, rodar pipeline `runInit` aborta com `code: 0` e reason contendo `/sync`
- Em fixture greenfield, `runInit` chega ate o scaffold sem disparar AbortError no step `00_2-reentry-guard`

**Por humano (se aplicavel):**
- Rodar `/init` manualmente num projeto v6.5.0 reproduz a mensagem do PRD literalmente

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
