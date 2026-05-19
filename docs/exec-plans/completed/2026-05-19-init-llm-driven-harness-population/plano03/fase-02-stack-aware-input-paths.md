# Fase 02: Stack-Aware Input Paths

**Plano:** 03 — Gerador LLM-driven do PLAN populate
**Sizing:** 1.5h
**Depende de:** Nenhuma (paralelizavel com fase-01)
**Visual:** false

---

## O que esta fase entrega

Helper `stackAwareInputPaths()` que deriva paths candidatos de codigo (Inputs codigo dos
docs canonicos) por stack detectado, com validacao `fs.access` em cada path — paths inexistentes
sao filtrados antes de virar input do PLAN.md (mitiga risco LLM-hallucination do PRD).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/stack-aware-input-paths.ts` | Create | Mapa estatico stack -> doc canonico -> paths candidatos + validacao `fs.access` |
| `skills/init/lib/stack-aware-input-paths.test.ts` | Create | Testes parametrizados por stack + teste de filtragem de paths inexistentes |
| `tests/fixtures/stack-aware/nextjs-supabase/` | Create | Fixture realista (so estrutura de pastas + arquivos vazios) para Next.js + Supabase |
| `tests/fixtures/stack-aware/rails/` | Create | Fixture Rails minimo |
| `tests/fixtures/stack-aware/empty/` | Create | Fixture sem nenhum arquivo de codigo (todos paths candidatos devem ser filtrados) |

---

## Implementacao

### Passo 1: Definir tipos publicos

Doc canonicos derivam de `TEMPLATE_MANIFEST` filtrado por `isPopulatable`. Para tipagem
estrita, usar `string` literal das `dst` paths conhecidos. Em v1, mapa estatico cobre os
~12 docs canonicos populaveis.

```typescript
// skills/init/lib/stack-aware-input-paths.ts

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { StackId } from './detect-stack'

/**
 * Doc canonico do harness — identifier amigavel para o helper.
 * Subset de `TEMPLATE_MANIFEST.dst` filtrado por populaveis.
 * Em v1, lista estatica; futuro: gerar deste `TEMPLATE_MANIFEST.filter(isPopulatable).map(e => e.dst)`.
 */
export type CanonicalDoc =
  | 'AGENTS.md'
  | 'ARCHITECTURE.md'
  | 'CLAUDE.md'
  | 'docs/DESIGN.md'
  | 'docs/FRONTEND.md'
  | 'docs/SECURITY.md'
  | 'docs/RELIABILITY.md'
  | 'docs/PLANS.md'
  | 'docs/QUALITY_SCORE.md'
  | 'docs/CODE_STYLE.md'
  | 'docs/STATE.md'
  | 'docs/design-docs/core-beliefs.md'

/**
 * Mapa: para cada doc canonico, lista de paths de codigo (validados) que devem alimentar
 * a sintese da LLM no momento do /execute-plan.
 *
 * `notes` carrega anotacoes uteis para o subagente (ex: "candidato nao encontrado — pular
 * ou pedir input ao usuario").
 */
export type StackAwareInputPaths = ReadonlyMap<CanonicalDoc, ReadonlyArray<{
  readonly path: string
  readonly exists: boolean
  readonly note?: string
}>>
```

### Passo 2: Tabelas estaticas de candidatos por stack

Mapa stack -> doc -> paths candidatos. Validacao `fs.access` aplicada depois.

```typescript
// 2026-05-19 (Luiz/dev): mitigacao do risco PRD "LLM gera PLAN.md com inputs inexistentes"
// (secao Riscos do PRD). Todos os paths emitidos sao validados com fs.access antes de
// entrar no markdown. Stack desconhecido cai no mapa generico.

type StackCandidates = Partial<Record<CanonicalDoc, ReadonlyArray<string>>>

const NEXTJS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'src/app/layout.tsx',
    'src/middleware.ts',
    'src/app/page.tsx',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ],
  'docs/FRONTEND.md': [
    'src/app/layout.tsx',
    'tailwind.config.ts',
    'tailwind.config.js',
    'src/components/',
    'src/app/globals.css',
  ],
  'docs/SECURITY.md': [
    'src/middleware.ts',
    'src/lib/auth/',
    '.env.example',
  ],
  'docs/RELIABILITY.md': [
    'src/app/error.tsx',
    'src/app/not-found.tsx',
    'next.config.js',
  ],
  'docs/DESIGN.md': [
    'tailwind.config.ts',
    'src/app/globals.css',
    'src/components/ui/',
  ],
  'docs/CODE_STYLE.md': [
    '.eslintrc.json',
    'eslint.config.js',
    '.prettierrc',
    'tsconfig.json',
  ],
}

// 2026-05-19 (Luiz/dev): Next.js + Supabase merge — Supabase tem paths proprios sobre Next.js base.
// CA-02 do PRD exige >= 3 paths reais por fase ARCHITECTURE/FRONTEND/SECURITY em Next.js+Supabase.
const NEXTJS_SUPABASE_EXTRA: StackCandidates = {
  'ARCHITECTURE.md': [
    'supabase/migrations/',
    'supabase/functions/',
    'supabase/config.toml',
    'src/lib/supabase/server.ts',
    'src/lib/supabase/client.ts',
  ],
  'docs/SECURITY.md': [
    'supabase/migrations/',
    'src/lib/supabase/server.ts',
    'supabase/config.toml',
  ],
  'docs/RELIABILITY.md': [
    'supabase/functions/',
    'supabase/migrations/',
  ],
}

const RAILS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'config/routes.rb',
    'app/controllers/',
    'app/models/',
    'config/application.rb',
  ],
  'docs/SECURITY.md': [
    'config/initializers/cors.rb',
    'config/credentials.yml.enc',
    'app/controllers/application_controller.rb',
  ],
  'docs/RELIABILITY.md': [
    'config/database.yml',
    'config/sidekiq.yml',
    'app/jobs/',
  ],
  'docs/CODE_STYLE.md': [
    '.rubocop.yml',
    'Gemfile',
  ],
}

const NODE_TS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'src/index.ts',
    'src/main.ts',
    'package.json',
    'tsconfig.json',
  ],
  'docs/CODE_STYLE.md': [
    'tsconfig.json',
    '.eslintrc.json',
    'eslint.config.js',
    '.prettierrc',
  ],
}

// Generico — usado quando primary === null
const GENERIC_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'README.md',
    'package.json',
    'Gemfile',
    'composer.json',
    'pyproject.toml',
  ],
}
```

### Passo 3: Detectar Supabase (sinal complementar a Next.js)

Next.js + Supabase nao e um `StackId` separado em `detect-stack.ts` (D22 multi-stack so
captura primary + secondary entre os 5 stacks principais). Detectar Supabase como sinal
complementar via presenca de `supabase/` ou `@supabase/*` em deps.

```typescript
async function hasSupabaseSignal(cwd: string): Promise<boolean> {
  // Sinal 1: pasta supabase/ no projeto
  try {
    const stat = await fs.stat(path.join(cwd, 'supabase'))
    if (stat.isDirectory()) return true
  } catch {
    // ignora
  }
  // Sinal 2: dep @supabase/* no package.json
  try {
    const pkgRaw = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8')
    const pkg: unknown = JSON.parse(pkgRaw)
    if (pkg !== null && typeof pkg === 'object') {
      const obj = pkg as Record<string, unknown>
      const deps = {
        ...((obj.dependencies as Record<string, unknown> | undefined) ?? {}),
        ...((obj.devDependencies as Record<string, unknown> | undefined) ?? {}),
      }
      return Object.keys(deps).some(k => k.startsWith('@supabase/'))
    }
  } catch {
    // ignora
  }
  return false
}
```

### Passo 4: Resolver candidatos por stack + validar `fs.access`

```typescript
function mergeCandidates(...maps: StackCandidates[]): StackCandidates {
  const merged: Record<string, string[]> = {}
  for (const map of maps) {
    for (const key of Object.keys(map) as CanonicalDoc[]) {
      const paths = map[key] ?? []
      const existing = merged[key] ?? []
      merged[key] = [...new Set([...existing, ...paths])]
    }
  }
  return merged as StackCandidates
}

function pickStaticMap(primary: StackId | null): StackCandidates {
  switch (primary) {
    case 'nextjs': return NEXTJS_CANDIDATES
    case 'rails': return RAILS_CANDIDATES
    case 'node-ts': return NODE_TS_CANDIDATES
    case 'laravel':
    case 'python':
    case 'unknown':
    case null:
    default:
      return GENERIC_CANDIDATES
  }
}

/**
 * Recebe stack primario detectado + cwd. Retorna mapa de paths candidatos por doc canonico,
 * com cada path validado via `fs.access`. Paths inexistentes sao incluidos com `exists: false`
 * e nota — o renderer (fase-03) decide se inclui no markdown como `// candidato nao encontrado`
 * ou se filtra.
 *
 * Em v1, sempre INCLUI todos (com flag exists), para o renderer decidir. Politica de filtro
 * concentrada em um lugar — facilita ajuste futuro.
 */
export async function stackAwareInputPaths(
  cwd: string,
  primary: StackId | null,
): Promise<StackAwareInputPaths> {
  const base = pickStaticMap(primary)
  const withSupabase = primary === 'nextjs' && (await hasSupabaseSignal(cwd))
    ? mergeCandidates(base, NEXTJS_SUPABASE_EXTRA)
    : base

  const result = new Map<CanonicalDoc, Array<{ path: string; exists: boolean; note?: string }>>()

  for (const key of Object.keys(withSupabase) as CanonicalDoc[]) {
    const candidates = withSupabase[key] ?? []
    const validated: Array<{ path: string; exists: boolean; note?: string }> = []
    for (const candidate of candidates) {
      const abs = path.join(cwd, candidate)
      let exists = false
      try {
        await fs.access(abs)
        exists = true
      } catch {
        exists = false
      }
      validated.push(
        exists
          ? { path: candidate, exists: true }
          : { path: candidate, exists: false, note: 'candidato nao encontrado — verificar antes de usar' },
      )
    }
    result.set(key, validated)
  }
  return result
}
```

### Passo 5: Testes parametrizados por stack

```typescript
// skills/init/lib/stack-aware-input-paths.test.ts
import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { stackAwareInputPaths } from './stack-aware-input-paths'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'stack-aware')

describe('stackAwareInputPaths', () => {
  it('returns Next.js + Supabase paths with >= 3 reais em ARCHITECTURE (CA-02)', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const real = arch.filter(p => p.exists)
    expect(real.length).toBeGreaterThanOrEqual(3)
  })

  it('flags inexistent paths with exists: false + note', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'nextjs')
    for (const entries of result.values()) {
      for (const entry of entries) {
        if (!entry.exists) {
          expect(entry.note).toBeDefined()
          expect(entry.note).toContain('candidato nao encontrado')
        }
      }
    }
  })

  it('returns Rails-specific paths when primary is rails', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'rails'), 'rails')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const paths = arch.map(p => p.path)
    expect(paths).toContain('config/routes.rb')
  })

  it('returns generic paths when primary is null', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), null)
    expect(result.has('ARCHITECTURE.md')).toBe(true)
  })

  it('does NOT include Supabase paths when primary is nextjs but no supabase signal', async () => {
    // fixture nextjs-supabase tem `supabase/` pasta — testar com fixture so com next
    // (assumir que tests/fixtures/stack-aware/nextjs-only/ existe para isso)
    // Em v1: usar empty fixture + stack nextjs — supabase signal vai falhar
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'nextjs')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const paths = arch.map(p => p.path)
    expect(paths).not.toContain('supabase/migrations/')
  })
})
```

### Passo 6: Criar fixtures realistas

```bash
# Next.js + Supabase
mkdir -p tests/fixtures/stack-aware/nextjs-supabase/src/app
mkdir -p tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase
mkdir -p tests/fixtures/stack-aware/nextjs-supabase/supabase/migrations
mkdir -p tests/fixtures/stack-aware/nextjs-supabase/supabase/functions
# arquivos vazios (`fs.access` so verifica presenca)
touch tests/fixtures/stack-aware/nextjs-supabase/src/app/layout.tsx
touch tests/fixtures/stack-aware/nextjs-supabase/src/middleware.ts
touch tests/fixtures/stack-aware/nextjs-supabase/supabase/config.toml
touch tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase/server.ts
# package.json com @supabase/supabase-js para acionar hasSupabaseSignal
cat > tests/fixtures/stack-aware/nextjs-supabase/package.json <<'EOF'
{
  "name": "fixture-nextjs-supabase",
  "dependencies": { "next": "14.0.0", "@supabase/supabase-js": "2.0.0" }
}
EOF

# Rails minimo
mkdir -p tests/fixtures/stack-aware/rails/config
mkdir -p tests/fixtures/stack-aware/rails/app/controllers
touch tests/fixtures/stack-aware/rails/config/routes.rb
touch tests/fixtures/stack-aware/rails/Gemfile

# Vazio (testa filtro de paths inexistentes)
mkdir -p tests/fixtures/stack-aware/empty
touch tests/fixtures/stack-aware/empty/.gitkeep
```

---

## Gotchas

- **G2 do plano (LLM-hallucination):** TODO path emitido em PLAN.md tem que passar por
  `fs.access` ANTES de aparecer como `Inputs (codigo)` real. Esta fase faz a validacao;
  fase-03 (renderer) le `exists: true/false` e decide. Politica recomendada: incluir todos
  no markdown, mas marcar com nota — humano revisa via PR.
- **Local — Next.js+Supabase nao e StackId:** detect-stack so devolve 5 stacks principais.
  Supabase e detectado via sinal complementar (`supabase/` dir OR `@supabase/*` em deps).
  Decisao: nao introduzir `StackId = 'nextjs-supabase'` (poluiria contrato D22 multi-stack);
  apenas helper interno `hasSupabaseSignal()` que mescla candidatos.
- **Local — `fs.access` no Windows case-insensitive:** paths com case errado passam em
  Windows mas falham em Linux. Mitigacao: emitir paths com case EXATO do template
  (ex: `src/app/layout.tsx`, nao `src/App/Layout.tsx`). Fixtures usam case correto.
- **Local — secondary stacks ignorados em v1:** `DetectedStack.secondary[]` nao alimenta
  paths. Em monorepo Next+Rails, so primary (Next) entra. Suficiente para CA-02; secondary
  pode ser feature futura.
- **Local — pasta candidato:** alguns paths sao pastas (`supabase/migrations/`,
  `src/components/`). `fs.access` aceita pasta. LLM no `/execute-plan` decide se faz `ls`
  dentro ou se enumera arquivos.

---

## Verificacao

### TDD

- [ ] **RED:** Teste falha por modulo ausente
  - Comando: `bun test skills/init/lib/stack-aware-input-paths.test.ts`
  - Resultado esperado: `Cannot find module './stack-aware-input-paths'`

- [ ] **GREEN:** Implementacao minima (mapas + `fs.access`), testes passam
  - Comando: `bun test skills/init/lib/stack-aware-input-paths.test.ts`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] Fixtures criadas (`nextjs-supabase/`, `rails/`, `empty/`)
- [ ] Fixture `nextjs-supabase/` tem >= 3 paths reais em ARCHITECTURE (`src/app/layout.tsx`, `src/middleware.ts`, `supabase/config.toml`, `src/lib/supabase/server.ts`)
- [ ] Helper `hasSupabaseSignal` detecta `@supabase/*` em deps E pasta `supabase/`
- [ ] Paths emitidos sempre em forward-slash (posix), tambem em Windows
- [ ] Sem `any` no codigo
- [ ] Testes passam: `bun test skills/init/lib/stack-aware-input-paths.test.ts`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/stack-aware-input-paths.test.ts` retorna `5 passed, 0 failed`
- `(await stackAwareInputPaths(nextjsSupabaseFixture, 'nextjs')).get('ARCHITECTURE.md').filter(p => p.exists).length >= 3` (cobre CA-02)
- `(await stackAwareInputPaths(emptyFixture, 'nextjs')).get('ARCHITECTURE.md').every(p => !p.exists)` (todos filtrados)
- Sem path com `\` no resultado (posix everywhere)

**Por humano:**
- Mapas estaticos `NEXTJS_CANDIDATES`, `RAILS_CANDIDATES` etc lidos sem confusao — paths
  reais e familiares para devs da stack

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
