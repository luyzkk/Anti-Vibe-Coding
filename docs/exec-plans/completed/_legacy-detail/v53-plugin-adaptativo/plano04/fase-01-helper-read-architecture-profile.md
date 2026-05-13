# Fase 01: Promover `readArchitectureProfile` a API Estável

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-06 (helper experimental do tracer bullet), Plano 02 fase-04 (`writeArchitectureProfile` populando o manifest em projeto piloto)
**Visual:** false

---

## O que esta fase entrega

Helper `readArchitectureProfile(cwd?)` promovido de "tracer bullet experimental" a API estável e documentada, consumida pelas fases 02-05; helper auxiliar genérico `getRecommendationForProfile<T>` para uso em todas as lookup tables; convenção "leitura UMA vez + lookup table" documentada como padrão do plugin.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/read-architecture-profile.ts` | Modify | Reescrever JSDoc completo, exportar tipos auxiliares, garantir guard order, adicionar `getRecommendationForProfile` |
| `anti-vibe-coding/skills/lib/__tests__/read-architecture-profile.test.ts` | Modify | Ampliar testes: 1 caso por perfil + 3 casos de fallback (flag off, manifest ausente, profile inválido) + teste do helper auxiliar |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/clean-architecture-ritual.json` | Create | Fixture de manifest com profile válido `clean-architecture-ritual` |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/mvc-flat.json` | Create | Fixture profile `mvc-flat` |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/vertical-slice.json` | Create | Fixture profile `vertical-slice` |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/nextjs-app-router.json` | Create | Fixture profile `nextjs-app-router` |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/unknown-mixed.json` | Create | Fixture profile `unknown-mixed` |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/no-profile.json` | Create | Fixture sem campo `architectureProfile` (CA-10) |
| `anti-vibe-coding/skills/lib/__fixtures__/manifests/flag-disabled.json` | Create | Fixture com `architectureDetectorEnabled: false` (CA-04) |
| `anti-vibe-coding/docs/dual-mode-convention.md` | Create | Documenta a convenção "lê profile UMA vez + lookup table" para futuras skills |

---

## Implementacao

### Passo 1: Refatorar `read-architecture-profile.ts` com guards ordenados

A função recebe `cwd?: string` para permitir testes com diretório temporário. Ordem dos guards é deliberada: flag check primeiro (early return barato), depois IO, depois validação.

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ArchitectureProfile, ArchitectureProfileName } from './manifest-types'
import { isFeatureEnabled } from './manifest-utils'
import { parseManifest, isValidArchitectureProfile } from './manifest-schema'

/**
 * Reads the detected architecture profile from `.claude/.anti-vibe-manifest.json`.
 *
 * Returns `null` (silently, no throw) when ANY of the following is true:
 * - The feature flag `architectureDetectorEnabled` is disabled (CA-04 — preserves v5.2 behavior)
 * - The manifest file does not exist or cannot be parsed (graceful degradation)
 * - The `architectureProfile` field is absent (CA-10 — pre-v5.3 manifest)
 * - The `architectureProfile` field fails schema validation
 *
 * Callers MUST treat `null` as "no adaptation; fall back to v5.2 behavior" and
 * MAY surface a single-line hint suggesting `/anti-vibe-coding:detect-architecture`.
 *
 * @param cwd - Optional working directory (defaults to `process.cwd()`). Used for tests.
 * @returns The validated profile object, or `null` if any guard fails.
 *
 * @example
 * const profile = readArchitectureProfile()
 * const recommendation = getRecommendationForProfile(
 *   profile?.profile ?? null,
 *   RECOMMENDATIONS,
 *   DEFAULT_RECOMMENDATION,
 * )
 */
export function readArchitectureProfile(cwd: string = process.cwd()): ArchitectureProfile | null {
  // Guard 1: feature flag (cheapest check, runs first)
  if (!isFeatureEnabled('architectureDetectorEnabled', cwd)) {
    return null
  }

  // Guard 2: manifest IO (graceful — file may not exist yet)
  let raw: string
  try {
    raw = readFileSync(join(cwd, '.claude', '.anti-vibe-manifest.json'), 'utf8')
  } catch {
    return null
  }

  // Guard 3: parse + schema validation
  const manifest = parseManifest(raw)
  if (!manifest || !isValidArchitectureProfile(manifest.architectureProfile)) {
    return null
  }

  return manifest.architectureProfile
}

/**
 * Generic helper that resolves a recommendation `T` for a given profile name,
 * falling back to a default when the profile is `null` (flag disabled, missing,
 * or invalid). This is THE convention for adapting skill output in v5.3:
 * skills read profile ONCE at the top, then use this helper to look up output.
 *
 * Lookup table MUST have exactly 5 keys (one per profile). Compile-time enforced
 * via `Record<ArchitectureProfileName, T>`.
 *
 * @example
 * const ADVICE: Record<ArchitectureProfileName, string> = {
 *   'clean-architecture-ritual': 'organize por camada',
 *   'mvc-flat': 'pastas curtas, controllers magros',
 *   'vertical-slice': 'organize por feature',
 *   'nextjs-app-router': 'siga convenção do app/',
 *   'unknown-mixed': 'rode /detect-architecture',
 * }
 * const advice = getRecommendationForProfile(profile?.profile ?? null, ADVICE, DEFAULT_ADVICE)
 */
export function getRecommendationForProfile<T>(
  profile: ArchitectureProfileName | null,
  lookup: Record<ArchitectureProfileName, T>,
  fallback: T,
): T {
  if (profile === null) return fallback
  return lookup[profile]
}
```

### Passo 2: Fixtures de manifest (8 arquivos JSON)

Cada fixture é um manifest mínimo válido. Exemplo de `vertical-slice.json`:

```json
{
  "schemaVersion": 1,
  "architectureDetectorEnabled": true,
  "architectureProfile": {
    "profile": "vertical-slice",
    "confidence": 88,
    "detectedAt": "2026-05-04T12:00:00.000Z",
    "signals": ["src/features/ tem 4 subpastas com pattern <name>/", "imports cruzando features = 0%"],
    "schemaVersion": 1
  }
}
```

Os 4 demais fixtures de perfil seguem o mesmo formato trocando `profile` e `signals[]`. `no-profile.json` é manifest com flag = `true` mas SEM o campo `architectureProfile`. `flag-disabled.json` tem `architectureDetectorEnabled: false` e PODE ter `architectureProfile` populado (a flag é a primeira coisa checada).

### Passo 3: Testes ampliados (8 casos)

```typescript
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readArchitectureProfile, getRecommendationForProfile } from '../read-architecture-profile'

function setupFixture(fixtureName: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'arch-profile-'))
  mkdirSync(join(dir, '.claude'), { recursive: true })
  copyFileSync(
    join(__dirname, '../__fixtures__/manifests/', `${fixtureName}.json`),
    join(dir, '.claude', '.anti-vibe-manifest.json'),
  )
  return dir
}

describe('readArchitectureProfile', () => {
  test('returns profile object when manifest is valid (clean-architecture-ritual)', () => {
    const cwd = setupFixture('clean-architecture-ritual')
    const profile = readArchitectureProfile(cwd)
    expect(profile?.profile).toBe('clean-architecture-ritual')
    expect(profile?.confidence).toBeGreaterThanOrEqual(0)
  })

  test('returns profile object for mvc-flat', () => {
    const profile = readArchitectureProfile(setupFixture('mvc-flat'))
    expect(profile?.profile).toBe('mvc-flat')
  })

  test('returns profile object for vertical-slice', () => {
    const profile = readArchitectureProfile(setupFixture('vertical-slice'))
    expect(profile?.profile).toBe('vertical-slice')
  })

  test('returns profile object for nextjs-app-router', () => {
    const profile = readArchitectureProfile(setupFixture('nextjs-app-router'))
    expect(profile?.profile).toBe('nextjs-app-router')
  })

  test('returns profile object for unknown-mixed', () => {
    const profile = readArchitectureProfile(setupFixture('unknown-mixed'))
    expect(profile?.profile).toBe('unknown-mixed')
  })

  test('returns null when flag is disabled (CA-04 regression)', () => {
    expect(readArchitectureProfile(setupFixture('flag-disabled'))).toBeNull()
  })

  test('returns null when architectureProfile field is missing (CA-10)', () => {
    expect(readArchitectureProfile(setupFixture('no-profile'))).toBeNull()
  })

  test('returns null when manifest file does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'arch-profile-'))
    expect(readArchitectureProfile(dir)).toBeNull()
  })
})

describe('getRecommendationForProfile', () => {
  const lookup: Record<import('../manifest-types').ArchitectureProfileName, string> = {
    'clean-architecture-ritual': 'A',
    'mvc-flat': 'B',
    'vertical-slice': 'C',
    'nextjs-app-router': 'D',
    'unknown-mixed': 'E',
  }

  test('returns lookup value for valid profile', () => {
    expect(getRecommendationForProfile('vertical-slice', lookup, 'FALLBACK')).toBe('C')
  })

  test('returns fallback when profile is null', () => {
    expect(getRecommendationForProfile(null, lookup, 'FALLBACK')).toBe('FALLBACK')
  })

  test('lookup table must have exactly 5 keys (G6 enforcement)', () => {
    expect(Object.keys(lookup).length).toBe(5)
  })
})
```

### Passo 4: Documentar a convenção em `docs/dual-mode-convention.md`

Markdown explicando o padrão para futuras skills que aderirem ao modo dual:

```markdown
# Convenção: Modo Dual em Skills (v5.3+)

Skills estruturantes que adaptam saída ao perfil arquitetural detectado seguem
ESTA convenção. Ela existe para evitar branching profundo e manter as skills
manuteníveis (RNF Manutenibilidade do PRD v5.3).

## Regra única

> Leia o profile UMA vez no topo da skill. Adapte a saída via UMA lookup table.

## Forma canônica

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import type { ArchitectureProfileName } from '../lib/manifest-types'

// 1. Lookup table — Record com EXATAMENTE 5 chaves
const RECOMMENDATIONS: Record<ArchitectureProfileName, string> = {
  'clean-architecture-ritual': '...',
  'mvc-flat': '...',
  'vertical-slice': '...',
  'nextjs-app-router': '...',
  'unknown-mixed': '...',
}

// 2. Fallback (comportamento v5.2)
const DEFAULT_RECOMMENDATION = '...'

// 3. UMA leitura, UMA resolução
const profile = readArchitectureProfile()
const recommendation = getRecommendationForProfile(
  profile?.profile ?? null,
  RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION,
)
```

## Anti-padrões

- `if (profile === 'A') {...} else if (profile === 'B') {...}` espalhado pela skill
- Múltiplas chamadas a `readArchitectureProfile()` na mesma execução
- Lookup table com menos de 5 chaves (5 perfis exatos — D4 do PRD)
- Throw quando profile é `null` — silencioso é a regra (CA-04, CA-10)
```

### Passo 5: Confirmar Plano 01 fase-06 não é quebrado

A skill `architecture` já consumia o helper experimental. Após a refatoração, verificar que:
- Assinatura externa permanece `readArchitectureProfile(cwd?): ArchitectureProfile | null`
- Skill `architecture` continua compilando e seu teste E2E do tracer bullet (mock de `vertical-slice`) continua passando

---

## Gotchas

- **G8 do plano:** "Fase-01 não é redundante com Plano 01 fase-06." Esta fase PROMOVE o helper experimental a estável (JSDoc, testes ampliados, helper auxiliar). Mantém retrocompatibilidade total da assinatura externa.
- **G2 do plano (CA-04):** ordem dos guards é deliberada — flag check primeiro. Inverter ordem (parse antes de flag) seria correto funcionalmente mas perderia a primitiva "early return barato" que protege contra IO desnecessário.
- **G3 do plano (CA-10):** `null` é o protocolo único de fallback. Sem throw, sem warning obrigatório.
- **Local:** `cwd` opcional permite testes hermeticos com `mkdtempSync`. Sem isso, todos os testes mexeriam em `process.cwd()` real.

---

## Verificacao

### TDD

- [ ] **RED:** Testes ampliados (8 casos) escritos ANTES de tocar `read-architecture-profile.ts`. Pelo menos 3 testes falham por `Cannot find name 'getRecommendationForProfile'` (assertion failure após import error fix) ou por shape de fixture ausente.
  - Comando: `bun run test -- --grep 'readArchitectureProfile'`
  - Resultado esperado: `8+ failed` (3 helpers novos + 5 perfis com fixtures ausentes).

- [ ] **GREEN:** Função reescrita com guards ordenados, helper auxiliar exportado, 8 fixtures criadas. Todos os 11 testes passam.
  - Comando: `bun run test -- --grep 'readArchitectureProfile|getRecommendationForProfile'`
  - Resultado esperado: `11 passed, 0 failed`.

### Checklist

- [ ] `readArchitectureProfile` exporta JSDoc completo (verificável: `grep '@param' anti-vibe-coding/skills/lib/read-architecture-profile.ts | wc -l` retorna ≥ 1)
- [ ] `getRecommendationForProfile` é exportado e tem JSDoc com `@example`
- [ ] 8 fixtures JSON existem em `anti-vibe-coding/skills/lib/__fixtures__/manifests/`
- [ ] `docs/dual-mode-convention.md` existe e referencia o helper auxiliar
- [ ] Assinatura externa de `readArchitectureProfile` inalterada (Plano 01 fase-06 não quebra)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'readArchitectureProfile|getRecommendationForProfile'` retorna `11 passed, 0 failed`
- `bun run typecheck` retorna 0 errors
- `ls anti-vibe-coding/skills/lib/__fixtures__/manifests/*.json | wc -l` retorna `8`
- `grep -c '@example' anti-vibe-coding/skills/lib/read-architecture-profile.ts` retorna `≥ 2` (1 em `readArchitectureProfile`, 1 em `getRecommendationForProfile`)

**Por humano:**
- `docs/dual-mode-convention.md` legível em 30 segundos por dev novo no projeto

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
