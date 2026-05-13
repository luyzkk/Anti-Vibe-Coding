<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 30s — alinhado com OQ2 do CONTEXT v6.0.0`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Detector de estrutura v5.x legada

**Plano:** 03 — Migration v5→v6
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano; consome só `lib/scaffold-full-tree.ts` indiretamente para evitar colidir com paths v6)
**Visual:** false

---

## O que esta fase entrega

Helper `detectV5Legacy(targetDir): Promise<LegacyState>` que inspeciona o diretório-alvo e retorna um objeto descrevendo **quais artefatos v5.x estão presentes**, **se a migração é necessária**, e **se já foi feita** (idempotência). É o gate de entrada do `/init`: se `state.isLegacy === false`, `/init` segue fluxo de projeto novo; se `true`, pergunta ao usuário se deseja migrar. Atende **D9 + D15** (detecção via `/init`, sem skill separada).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/detect-v5-legacy.ts` | Create | Heurística + tipo `LegacyState` exportado |
| `anti-vibe-coding/skills/init/lib/detect-v5-legacy.test.ts` | Create | Testes paramétricos: detect, no-detect, partial, already-migrated |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 0.5 — `detectV5Legacy` antes de Step 1 (scaffold ou migrate) |

---

## Implementacao

### Passo 1: Tipo + heurística `lib/detect-v5-legacy.ts`

```typescript
// 2026-05-11 (Luiz/dev): detector v5.x — D9 (/init absorve), D15 (sem /migrate dedicada).
// Retorna LegacyState para que /init decida fluxo: novo / migrar / ja-v6.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type LegacyArtifact =
  | 'planning-dir'           // .planning/ existe e tem conteudo
  | 'lessons-learned'        // lessons-learned.md na raiz
  | 'decisions'              // decisions.md na raiz
  | 'senior-principles'      // senior-principles.md na raiz (raro fora do plugin)

export type LegacyState = {
  /** True se ao menos UM artefato v5.x foi detectado. */
  isLegacy: boolean
  /** True se docs/ ja existe com sinal de v6 (evita duplo-migrar). */
  alreadyMigrated: boolean
  /** Lista de artefatos encontrados (ordem documentada). */
  artifacts: LegacyArtifact[]
  /** Paths absolutos detectados — para o caller passar adiante sem re-stat. */
  paths: Partial<Record<LegacyArtifact, string>>
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Heuristica de v5.x: .planning/ ou um dos 3 .md legados.
 * Heuristica de "ja em v6": docs/exec-plans/ existe (foi gerado por scaffold v6).
 * Caller decide: se isLegacy && !alreadyMigrated → oferecer migracao.
 */
export async function detectV5Legacy(targetDir: string): Promise<LegacyState> {
  const probes: Array<[LegacyArtifact, string]> = [
    ['planning-dir', path.join(targetDir, '.planning')],
    ['lessons-learned', path.join(targetDir, 'lessons-learned.md')],
    ['decisions', path.join(targetDir, 'decisions.md')],
    ['senior-principles', path.join(targetDir, 'senior-principles.md')],
  ]

  const artifacts: LegacyArtifact[] = []
  const paths: LegacyState['paths'] = {}

  for (const [id, p] of probes) {
    if (await exists(p)) {
      // Para .planning/ exigimos conteudo > 0 (diretorio vazio nao conta).
      if (id === 'planning-dir') {
        const entries = await fs.readdir(p).catch(() => [])
        if (entries.length === 0) continue
      }
      artifacts.push(id)
      paths[id] = p
    }
  }

  const v6Marker = path.join(targetDir, 'docs', 'exec-plans')
  const alreadyMigrated = await exists(v6Marker)

  return {
    isLegacy: artifacts.length > 0,
    alreadyMigrated,
    artifacts,
    paths,
  }
}
```

Notas:
- Probes são funções puras (só leem disco). Erros de I/O são engolidos em `exists` — não devem quebrar `/init`.
- `.planning/` vazia (`length === 0`) **não conta como legado** — pode ser pasta criada manualmente sem intenção.
- `alreadyMigrated` é heurística leve: presença de `docs/exec-plans/`. NÃO valida se a migração foi completa — caller deve combinar com `harness:validate` se quiser certeza.
- **Sem `any`, sem `as`** — uso `Partial<Record<...>>` para mapping opcional, `for...of` em tuplas tipadas.

### Passo 2: Testes paramétricos `detect-v5-legacy.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-01 + matriz de detection.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'detect-v5')

async function reset(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
}

describe('detectV5Legacy', () => {
  beforeEach(reset)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('returns isLegacy=false for empty directory', async () => {
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(false)
    expect(state.artifacts).toEqual([])
  })

  it('detects .planning/ with content', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), '# Foo\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.artifacts).toContain('planning-dir')
  })

  it('does NOT count empty .planning/ as legacy', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(false)
  })

  it('detects lessons-learned.md alone', async () => {
    await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '# Lessons\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.artifacts).toEqual(['lessons-learned'])
  })

  it('detects all 4 artifacts when present', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'x.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'decisions.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'senior-principles.md'), 'x', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.artifacts).toHaveLength(4)
    expect(state.isLegacy).toBe(true)
  })

  it('flags alreadyMigrated when docs/exec-plans/ exists', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'x.md'), 'x', 'utf8')
    await fs.mkdir(path.join(FIXTURE, 'docs', 'exec-plans'), { recursive: true })
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.alreadyMigrated).toBe(true)
  })

  it('returns absolute paths in state.paths', async () => {
    await fs.writeFile(path.join(FIXTURE, 'decisions.md'), 'x', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.paths['decisions']).toContain('decisions.md')
    expect(path.isAbsolute(state.paths['decisions'] ?? '')).toBe(true)
  })
})
```

### Passo 3: Integração em `SKILL.md` do `/init`

Inserir Step 0.5 (antes de scaffold ou Step 1 atual):

```markdown
## Step 0.5: Detect legacy v5.x layout (Plano 03 — D9, D15)

\`\`\`bash
bun run -e "
import { detectV5Legacy } from './lib/detect-v5-legacy.ts'

const state = await detectV5Legacy(process.cwd())
if (state.alreadyMigrated && state.isLegacy) {
  console.log('Project has both v5 artifacts AND docs/exec-plans/ — partial migration?')
  console.log('Run \`/init migrate --resume\` or remove residuals manually.')
  process.exit(2)
}
if (state.isLegacy) {
  console.log('Detected v5.x artifacts:', state.artifacts.join(', '))
  console.log('Run \`/init migrate\` (or \`--dry-run\` to preview).')
  process.exit(1)  // signal: needs migration
}
console.log('Greenfield project — proceeding with scaffold.')
"
\`\`\`

If exit code 1 → prompt user with three options: **Migrate / Dry-run / Skip (treat as new)**.
```

---

## Gotchas

- **G1 do plano (R2 — backup é fonte de verdade):** Esta fase **não** muta nada. Só lê. Importante: documentar em SKILL.md que `detectV5Legacy` é **read-only** — qualquer mutação fica para fase-02.
- **G3 do plano (cross-platform):** `path.join` sempre. `.planning` é hidden no POSIX mas comum no Windows. `fs.readdir` ignora `.git/`-tipo entradas? **Não** — readdir lista tudo. Comprovado por teste (`length === 0` exige varredura completa).
- **Local — `senior-principles.md` raríssimo fora do plugin:** A heurística inclui mas espera no projeto-alvo do usuário valor zero. Plano 08 (dog-food) é o único caso real onde existe. Documentar em README do plano (G-A3).
- **Local — heurística de `alreadyMigrated`:** Apenas checa `docs/exec-plans/` existir. **Não** valida que a migração foi correta. Caller pode chamar `harness:validate` para certeza. Decisão deliberada: detector é cheap; validator é caro.
- **G9 do plano (provenance):** Header de provenance no topo de `detect-v5-legacy.ts`. Templates de output (.md) gerados por outras fases não têm.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `detects .planning/ with content` falha porque módulo não existe.
  - Comando: `bun run test skills/init/lib/detect-v5-legacy.test.ts`
  - Resultado esperado: `Cannot find module` ou `≥1 fail` (assertion após stub vazio).

- [ ] **GREEN:** Heurística implementada — 7 testes passam.
  - Comando: `bun run test skills/init/lib/detect-v5-legacy.test.ts`
  - Resultado esperado: `7 passed, 0 failed`

### Checklist

- [ ] `detectV5Legacy` retorna `isLegacy: false` para dir vazio
- [ ] `detectV5Legacy` detecta `.planning/` com conteúdo
- [ ] `detectV5Legacy` ignora `.planning/` vazia
- [ ] `detectV5Legacy` detecta cada um dos 4 artefatos isoladamente
- [ ] `alreadyMigrated: true` quando `docs/exec-plans/` existe
- [ ] Paths retornados são absolutos (`path.isAbsolute` verdadeiro)
- [ ] Helper é **read-only** (rodar em fixture, conferir mtime de `.planning/` inalterado)
- [ ] Lint limpo: `bun run lint skills/init/lib/detect-v5-legacy.ts`
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`, sem `as` indiscriminado)

---

## Criterio de Aceite

**Por máquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/detect-v5-legacy.test.ts
# Esperado: 7 passed, 0 failed em <1s

# Em fixture com .planning/ + lessons-learned.md, helper retorna 2 artefatos:
bun run -e "
import { detectV5Legacy } from './skills/init/lib/detect-v5-legacy.ts'
const s = await detectV5Legacy('tests/fixtures/legacy-v5')
console.log(s.artifacts.length)  # esperado: ≥2
console.log(s.isLegacy)           # esperado: true
"
```

**Por humano:**

- Rodar `/init` em um projeto v5.x real (ex: `/Projetos/Carreirarte` que tem `.planning/`). Skill deve **parar** antes de qualquer scaffold e perguntar "Migrar?". Sem migração ainda — só detecção.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
