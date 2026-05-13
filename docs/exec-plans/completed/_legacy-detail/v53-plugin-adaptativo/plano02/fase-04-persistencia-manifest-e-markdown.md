# Fase 04: Persistencia — Manifest JSON + Markdown Legivel

**Plano:** 02 — Architecture Detector
**Sizing:** 1h
**Depende de:** fase-03 (consome `DetectionResult`); Plano 01 fase-01 (schema do manifest); Plano 01 fase-04 (gerador de markdown)
**Visual:** false

---

## O que esta fase entrega

Helper `writeArchitectureProfile(result, manifestPath)` que persiste o `DetectionResult` em duas saidas conforme D3 (storage hibrido JSON + MD): atualiza o campo `architectureProfile` do `.claude/.anti-vibe-manifest.json` (consumindo o schema da Plano 01 fase-01) e gera/atualiza `.claude/architecture-profile.md` (chamando o gerador da Plano 01 fase-04). Idempotente — rodar 2x produz arquivos equivalentes (so `detectedAt` muda).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/architecture-detector/write-architecture-profile.md` | Create | Helper de persistencia (JSON + MD) |
| `anti-vibe-coding/skills/lib/architecture-detector/write-architecture-profile.test.ts` | Create | Testes com `tmp/` dir e leitura de volta |
| `anti-vibe-coding/skills/detect-architecture/SKILL.md` | Modify | Conectar persistencia ao final do flow |

---

## Implementacao

### Passo 1: Helper de persistencia

Le manifest existente, faz merge com `architectureProfile`, escreve de volta. Nunca sobrescreve outros campos. Conforme G4 do README (idempotencia).

```typescript
// write-architecture-profile.md

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DetectionResult } from './types'
// Plano 01 fase-04 expoe esse helper:
import { renderArchitectureProfileMarkdown } from '../architecture-profile-md/render'

const SCHEMA_VERSION = 1  // versionamento do architectureProfile (RF2 + OQ5)

type ManifestArchProfile = {
  profile: string
  confidence: number
  detectedAt: string
  signals: Array<{ kind: 'folder' | 'import'; pattern: string; matched?: boolean; matchedProfile?: string | null; filePath?: string }>
  schemaVersion: number
}

export function writeArchitectureProfile(result: DetectionResult, cwd: string): void {
  const claudeDir = join(cwd, '.claude')
  const manifestPath = join(claudeDir, '.anti-vibe-manifest.json')
  const mdPath = join(claudeDir, 'architecture-profile.md')

  // Garantir .claude/ existe (em projetos virgens pode nao ter)
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true })
  }

  // 1. Atualiza manifest (merge)
  const manifest = readManifest(manifestPath)
  manifest.architectureProfile = toManifestShape(result)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

  // 2. Gera markdown (delegado ao Plano 01 fase-04)
  const md = renderArchitectureProfileMarkdown(result)
  writeFileSync(mdPath, md, 'utf-8')
}

function readManifest(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    // CA-10 (Plano 01): manifest pre-v5.3 mal-formado nao deve quebrar — retorna vazio
    return {}
  }
}

function toManifestShape(result: DetectionResult): ManifestArchProfile {
  return {
    profile: result.profile,
    confidence: result.confidence,
    detectedAt: result.detectedAt,
    signals: [
      ...result.signals.folderSignals.map(s => ({ kind: 'folder' as const, pattern: s.pattern, matched: s.matched })),
      ...result.signals.importSignals.map(s => ({ kind: 'import' as const, pattern: s.pattern, matchedProfile: s.matchedProfile, filePath: s.filePath })),
    ],
    schemaVersion: SCHEMA_VERSION,
  }
}
```

### Passo 2: Conectar na SKILL.md (final do flow)

```typescript
// Adicao ao SKILL.md, apos a decisao por confidence
import { writeArchitectureProfile } from '../lib/architecture-detector/write-architecture-profile'

// finalResult vem do flow de fase-03 (com override do user se houve)
writeArchitectureProfile(finalResult, cwd)

console.log(`Manifest atualizado: .claude/.anti-vibe-manifest.json`)
console.log(`Markdown gerado:     .claude/architecture-profile.md`)
```

### Passo 3: Testes

Usar `tmp/` directory unico por teste para garantir isolamento.

```typescript
// write-architecture-profile.test.ts

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeArchitectureProfile } from './write-architecture-profile'
import type { DetectionResult } from './types'

let tmp: string

beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'arch-detector-')) })
afterEach(() => { rmSync(tmp, { recursive: true, force: true }) })

const sampleResult: DetectionResult = {
  profile: 'vertical-slice',
  confidence: 92,
  detectedAt: '2026-05-04T10:00:00.000Z',
  signals: {
    folderSignals: [{ pattern: 'features/<nome>', matched: true, weight: 50 }],
    importSignals: [{ filePath: 'src/features/billing/api.ts', pattern: 'imports de shared/', matchedProfile: 'vertical-slice' }],
  },
  alternativeProfiles: [{ profile: 'unknown-mixed', score: 30 }],
}

describe('writeArchitectureProfile', () => {
  test('creates .claude/.anti-vibe-manifest.json with architectureProfile field', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('vertical-slice')
    expect(manifest.architectureProfile.confidence).toBe(92)
    expect(manifest.architectureProfile.schemaVersion).toBe(1)
  })

  test('creates .claude/architecture-profile.md', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const md = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    expect(md).toContain('vertical-slice')
    expect(md).toContain('92')
  })

  test('preserves other fields when manifest already exists (merge, not overwrite)', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true })
    writeFileSync(
      join(tmp, '.claude/.anti-vibe-manifest.json'),
      JSON.stringify({ pluginVersion: '5.3.0', architectureDetectorEnabled: true }, null, 2),
    )
    writeArchitectureProfile(sampleResult, tmp)
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.pluginVersion).toBe('5.3.0')
    expect(manifest.architectureDetectorEnabled).toBe(true)
    expect(manifest.architectureProfile).toBeDefined()
  })

  test('is idempotent — running twice with same result produces identical output (modulo detectedAt) (G4)', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const first = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    writeArchitectureProfile(sampleResult, tmp)
    const second = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    expect(first).toBe(second)  // mesmo detectedAt no fixture
  })

  test('creates .claude/ if missing', () => {
    writeArchitectureProfile(sampleResult, tmp)
    expect(() => readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'))).not.toThrow()
  })

  test('survives malformed pre-existing manifest (CA-10 from Plano 01)', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true })
    writeFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), '{ invalid json')
    expect(() => writeArchitectureProfile(sampleResult, tmp)).not.toThrow()
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('vertical-slice')
  })
})
```

---

## Gotchas

- **G4 do README — idempotencia:** rodar duas vezes com mesmo `DetectionResult` deve gerar arquivos byte-identicos (incluindo `detectedAt`, ja que o helper nao seta — quem seta e a fase-03). Teste explicito.
- **G7 do README — markdown executavel:** `write-architecture-profile.md` e um helper. Codigo TS em blocos.
- **Local — `mkdirSync` recursive:** projetos virgens podem nao ter `.claude/`. Sempre criar com `recursive: true`. Sem isso, falha em `ENOENT`.
- **Local — JSON.parse defensivo:** manifest pre-v5.3 ou corrompido nao deve derrubar a skill. Try-catch retorna `{}` e continua. Cobre CA-10 do Plano 01 herdado.
- **Local — `schemaVersion: 1` hardcoded por enquanto:** OQ5 do PRD documenta evolucao. Quando schema mudar, incrementar e tratar migracao. Por ora 1, MEMORY.md registra evolucao.
- **Local — separar `detectedAt`:** o helper persiste o que recebe. NAO gera novo timestamp internamente, senao quebra idempotencia em testes.

---

## Verificacao

### TDD

- [ ] **RED:** Testes falham antes de implementar `write-architecture-profile.md`.
  - Comando: `bun run test --grep 'writeArchitectureProfile'`
  - Resultado esperado: 6 falhas

- [ ] **GREEN:** Implementacao faz todos os 6 testes passarem.
  - Comando: `bun run test --grep 'writeArchitectureProfile'`
  - Resultado esperado: `6 passed, 0 failed`

### Checklist

- [ ] `.claude/.anti-vibe-manifest.json` ganha campo `architectureProfile` sem perder outros campos
- [ ] `.claude/architecture-profile.md` gerado e contem nome do perfil + confidence
- [ ] `schemaVersion: 1` presente no manifest (RF2)
- [ ] Idempotencia validada (G4) — 2 execucoes consecutivas produzem MD identico
- [ ] Manifest corrompido nao derruba a skill (CA-10)
- [ ] `.claude/` criado se ausente (`mkdir -p` semantico)
- [ ] SKILL.md conecta `writeArchitectureProfile` ao final do flow
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'writeArchitectureProfile'` retorna `6 passed, 0 failed`
- Apos rodar a skill em fixture canonica: `cat .claude/.anti-vibe-manifest.json | jq -r '.architectureProfile.profile'` retorna o perfil esperado
- Apos rodar 2x: `diff <(grep -v detectedAt .claude/architecture-profile.md) <(grep -v detectedAt .claude/architecture-profile.md)` retorna vazio

**Por humano:**
- Markdown `.claude/architecture-profile.md` legivel — usuario consegue ler e identificar o perfil em < 10 segundos

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
