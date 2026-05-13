<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 06: Stack detection (heuristica package.json/Gemfile/composer.json/pyproject)

**Plano:** 02 — Full Scaffold
**Sizing:** 1.5h
**Depende de:** fase-02 (estrutura `docs/` precisa existir para gravar `STATE.md`)
**Visual:** false

---

## O que esta fase entrega

Helper `detectStack(targetDir)` que aplica heuristica simples sobre arquivos de manifest do projeto-alvo (`package.json`, `Gemfile`, `composer.json`, `pyproject.toml`, `requirements.txt`) e retorna `DetectedStack { id, signalSource }`. Apos deteccao, registra o resultado em `docs/STATE.md` (secao `## Resources`, chave `detected_stack: <id>`) e fornece o objeto para fase-03 customizar `ARCHITECTURE.md`. Atende **D7 (heuristica + confirmacao)**, **M3**, **CA-07, CA-08, CA-19, CA-20, CA-21**. **Nao copia knowledge pack** (G7 — fora de escopo D37 / v6.0.0).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/detect-stack.ts` | Create | Heuristica + tipo `DetectedStack` exportado |
| `anti-vibe-coding/skills/init/lib/detect-stack.test.ts` | Create | Testes parametricos: nextjs, node-ts, rails, laravel-deferido, python-deferido, unknown, monorepo (multipla deteccao — primeiro match) |
| `anti-vibe-coding/skills/init/lib/state-md-init.ts` | Create | Helper que cria/atualiza `docs/STATE.md` inicial com `Resources.detected_stack` |
| `anti-vibe-coding/skills/init/lib/state-md-init.test.ts` | Create | Testes: STATE.md criado se ausente, atualizado idempotentemente se ja existe |
| `anti-vibe-coding/skills/init/assets/templates/docs/STATE.md.tpl` | Create | Template inicial — Resources/Recent Activity/Pending vazias com placeholder `{{DETECTED_STACK}}` |
| `anti-vibe-coding/skills/init/lib/template-manifest.ts` | Modify | Adicionar entry `docs/STATE.md.tpl → docs/STATE.md` (manifest passa de 25 para 26 entries) |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 3 v6.0.0 — chamar `detectStack` + `writeStackToStateMd` antes de Step 4 (customize-architecture) |

---

## Implementacao

### Passo 1: Tipo + heuristica `lib/detect-stack.ts`

```typescript
// 2026-05-11 (Luiz/dev): heuristica de stack — D7, M3, CA-07/08/19/20/21.
// v6.0.0 SO REGISTRA o stack — knowledge packs (D5, D19) ficam para v6.1+ (D37).

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type StackId = 'nextjs' | 'node-ts' | 'rails' | 'laravel' | 'python' | 'unknown'

export type DetectedStack = {
  id: StackId
  /** Origem do sinal — para registrar em STATE.md (ex: "package.json#dependencies.next"). */
  signalSource: string
}

type Probe = (dir: string) => Promise<DetectedStack | null>

async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const body = await fs.readFile(filePath, 'utf8')
    const parsed: unknown = JSON.parse(body)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function readTextSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

const probeNextjs: Probe = async (dir) => {
  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const deps = { ...(pkg.dependencies as object ?? {}), ...(pkg.devDependencies as object ?? {}) }
  if ('next' in deps) {
    return { id: 'nextjs', signalSource: 'package.json#dependencies.next' }
  }
  return null
}

const probeNodeTs: Probe = async (dir) => {
  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const dev = (pkg.devDependencies as Record<string, unknown> | undefined) ?? {}
  const deps = (pkg.dependencies as Record<string, unknown> | undefined) ?? {}
  if ('typescript' in dev || 'typescript' in deps) {
    return { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' }
  }
  return null
}

const probeRails: Probe = async (dir) => {
  const gemfile = await readTextSafe(path.join(dir, 'Gemfile'))
  if (!gemfile) return null
  if (/^\s*gem\s+["']rails["']/m.test(gemfile)) {
    return { id: 'rails', signalSource: 'Gemfile#gem "rails"' }
  }
  return null
}

const probeLaravel: Probe = async (dir) => {
  const composer = await readJsonSafe(path.join(dir, 'composer.json'))
  if (!composer) return null
  const require = (composer.require as Record<string, unknown> | undefined) ?? {}
  if ('laravel/framework' in require) {
    return { id: 'laravel', signalSource: 'composer.json#require.laravel/framework' }
  }
  return null
}

const probePython: Probe = async (dir) => {
  const pyproject = await readTextSafe(path.join(dir, 'pyproject.toml'))
  if (pyproject) return { id: 'python', signalSource: 'pyproject.toml' }
  const requirements = await readTextSafe(path.join(dir, 'requirements.txt'))
  if (requirements) return { id: 'python', signalSource: 'requirements.txt' }
  return null
}

// Ordem importa (G6): primeiro match positivo vence.
// nextjs antes de node-ts porque next.js tambem matcha node-ts.
const PROBES: ReadonlyArray<Probe> = [probeNextjs, probeNodeTs, probeRails, probeLaravel, probePython]

export async function detectStack(targetDir: string): Promise<DetectedStack> {
  for (const probe of PROBES) {
    const result = await probe(targetDir)
    if (result) return result
  }
  return { id: 'unknown', signalSource: 'no signal' }
}
```

Notas:
- Probes sao funcoes puras-ish (so leem disco). Faceis de testar.
- Ordem documentada: nextjs antes de node-ts (todo Next.js tem node), rails depois (independente), laravel depois (deferido), python depois (deferido).
- Erros de I/O **sao engolidos** nos `readJsonSafe`/`readTextSafe` — heuristica nao deve quebrar `/init` se um arquivo existir mas estar corrompido. Ele simplesmente nao matcha.
- Sem `as` cast — usa type guards (`'next' in deps`).

### Passo 2: Template `STATE.md.tpl`

```markdown
# State

Snapshot of the project for agents and humans. Updated by `/init` and (in future) by hooks.

## Resources

- detected_stack: {{DETECTED_STACK}}
- generated_on: {{TODAY}}

## Recent Activity

(Populated by `/iterate` and other skills as they run.)

## Pending

(Populated as plans move to `docs/exec-plans/active/`.)

---

Replace this scaffold with project-specific content as the project evolves.
```

Adicionar `{{DETECTED_STACK}}` ao set de placeholders reconhecidos por `scaffoldFullTree` (atualizar `renderTemplate` em fase-02 — backward-compatible: se nao for passado, vira string vazia).

Atualizar `template-manifest.ts`:
```typescript
{ src: 'docs/STATE.md.tpl', dst: 'docs/STATE.md', required: true },
```
(Adicionar como entrada 26 — apos `references/README.md.tpl`.)

### Passo 3: Helper `lib/state-md-init.ts`

```typescript
// 2026-05-11 (Luiz/dev): grava detected_stack em docs/STATE.md.
// Plano 02 fase-06 — atende CA-19/20/21.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DetectedStack } from './detect-stack'

const STATE_MD_PATH_REL = path.join('docs', 'STATE.md')

export type WriteStackResult = {
  status: 'updated' | 'created'
  path: string
}

export async function writeStackToStateMd(
  targetDir: string,
  stack: DetectedStack,
): Promise<WriteStackResult> {
  const filePath = path.join(targetDir, STATE_MD_PATH_REL)

  let body: string
  let status: WriteStackResult['status']

  try {
    body = await fs.readFile(filePath, 'utf8')
    status = 'updated'
  } catch {
    // STATE.md nao existe ainda — escrever skeleton minimo.
    body = '# State\n\n## Resources\n\n- detected_stack: unknown\n\n## Recent Activity\n\n## Pending\n'
    status = 'created'
  }

  // Substituicao idempotente — regex captura linha "- detected_stack: <qualquer>"
  const replaced = body.replace(
    /^- detected_stack:.*$/m,
    `- detected_stack: ${stack.id}`,
  )

  // Se a linha nao existia (template editado a mao), append em ## Resources.
  const finalBody = replaced.includes(`detected_stack: ${stack.id}`)
    ? replaced
    : replaced.replace(/(^## Resources\s*$)/m, `$1\n\n- detected_stack: ${stack.id}`)

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, finalBody, 'utf8')

  return { status, path: filePath }
}
```

### Passo 4: Testes parametricos `detect-stack.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'detect')

async function reset(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
}

async function writeJson(rel: string, data: unknown): Promise<void> {
  await fs.writeFile(path.join(FIXTURE, rel), JSON.stringify(data, null, 2), 'utf8')
}

describe('detectStack', () => {
  beforeEach(reset)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('CA-07: detects nextjs from package.json#dependencies.next', async () => {
    await writeJson('package.json', { dependencies: { next: '^14.0.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('nextjs')
    expect(result.signalSource).toContain('package.json')
  })

  it('detects node-ts from devDependencies.typescript (no next)', async () => {
    await writeJson('package.json', { devDependencies: { typescript: '^5.4.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('node-ts')
  })

  it('CA-08: detects rails from Gemfile', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('rails')
  })

  it('detects laravel from composer.json (deferred)', async () => {
    await writeJson('composer.json', { require: { 'laravel/framework': '^11.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('laravel')
  })

  it('detects python from pyproject.toml', async () => {
    await fs.writeFile(path.join(FIXTURE, 'pyproject.toml'), '[tool.poetry]\nname = "x"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('python')
  })

  it('CA-21: returns unknown when no signal present', async () => {
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('unknown')
    expect(result.signalSource).toBe('no signal')
  })

  it('G6: monorepo with both package.json{next} and Gemfile picks nextjs (first probe wins)', async () => {
    await writeJson('package.json', { dependencies: { next: '14' } })
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'gem "rails"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('nextjs') // documentado no JSDoc de PROBES
  })

  it('does not throw on corrupted package.json', async () => {
    await fs.writeFile(path.join(FIXTURE, 'package.json'), '{ not json', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('unknown') // engolido com graca
  })
})
```

### Passo 5: Testes `state-md-init.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { writeStackToStateMd } from './state-md-init'
import type { DetectedStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'state')

const NEXTJS: DetectedStack = { id: 'nextjs', signalSource: 'package.json#dependencies.next' }

describe('writeStackToStateMd', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(path.join(FIXTURE, 'docs'), { recursive: true })
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('CA-19: writes detected_stack: nextjs into docs/STATE.md', async () => {
    // STATE.md ja existe via scaffold (template):
    await fs.writeFile(
      path.join(FIXTURE, 'docs/STATE.md'),
      '# State\n\n## Resources\n\n- detected_stack: unknown\n\n## Recent Activity\n',
      'utf8',
    )

    const result = await writeStackToStateMd(FIXTURE, NEXTJS)
    expect(result.status).toBe('updated')

    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: nextjs')
    expect(body).not.toContain('detected_stack: unknown') // substituido
  })

  it('creates STATE.md if absent (defensive)', async () => {
    const result = await writeStackToStateMd(FIXTURE, NEXTJS)
    expect(result.status).toBe('created')
    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: nextjs')
  })

  it('is idempotent — re-write same stack produces same content', async () => {
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const first = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const second = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(second).toBe(first)
  })

  it('CA-21: writes detected_stack: unknown', async () => {
    const result = await writeStackToStateMd(FIXTURE, { id: 'unknown', signalSource: 'no signal' })
    expect(result.status).toBe('created')
    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: unknown')
  })

  it('does NOT create docs/knowledge/ directory (D37 — no KP in v6.0.0)', async () => {
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const knowledgeExists = await fs.stat(path.join(FIXTURE, 'docs', 'knowledge')).then(() => true).catch(() => false)
    expect(knowledgeExists).toBe(false)
  })
})
```

### Passo 6: SKILL.md do `/init` — Step 3 v6.0.0

Inserir entre Step 2 (symlink fallback) e Step 4 (customize-architecture):

```markdown
## Step 3 (v6.0.0): Detect stack and register in STATE.md (D7, M3)

\`\`\`bash
bun run -e "
import { detectStack } from './lib/detect-stack.ts'
import { writeStackToStateMd } from './lib/state-md-init.ts'

const stack = await detectStack(process.cwd())
console.log('Detected stack:', stack.id, '(via', stack.signalSource, ')')

const result = await writeStackToStateMd(process.cwd(), stack)
console.log('STATE.md', result.status, ':', result.path)
"
\`\`\`

Important: v6.0.0 only **registers** the stack. Knowledge packs (`docs/knowledge/{stack}/`) ship in v6.1+.
```

---

## Gotchas

- **G6 do plano (heuristica ambigua):** Ordem dos PROBES e o desempate documentado. nextjs primeiro porque todo Next.js tambem mataria node-ts (typescript em devDeps). Teste explicito do monorepo cobre.
- **G7 do plano (escopo D37 — sem KP):** **Nada** nesta fase cria `docs/knowledge/`. Teste explicito (`does NOT create docs/knowledge/`) garante que a tentacao nao foi cedida. Se um futuro PR adicionar — quebra esse teste.
- **G2 do plano (cross-platform):** `path.join` em todos os probes. `Gemfile` nao tem extensao — funciona Windows.
- **G8 do plano (provenance):** `detect-stack.ts` e `state-md-init.ts` levam linha de provenance no topo.
- **Local — `'next' in deps` exige guard:** `deps as object ?? {}`. Atencao em strict TS: `pkg.dependencies` e `unknown`. Usar `as object` aqui e necessario porque JSON.parse retorna `unknown`. **CLAUDE.md global proibe `as` indiscriminado** — aqui esta documentado por que: spread de objeto desconhecido. Alternativa mais purista: `function isRecord(v: unknown): v is Record<string, unknown>` antes do spread. Aceitar `as` desde que o helper tenha JSDoc explicando.
- **Local — `STATE.md` e o 26o template:** Atualizar manifest da fase-01 (subir contagem para 26). Teste `template-manifest.test.ts` continua passando porque o `it('lists at least 25')` usa `toBeGreaterThanOrEqual(25)`. Manter assim — futuro pode adicionar mais.
- **Local — STATE.md updated antes de scaffold:** Se `/init` rodar Step 3 (este) **antes** de fase-02 ter rodado, `docs/STATE.md` nao existe ainda — `writeStackToStateMd` retorna `'created'` com skeleton. **Comportamento defensivo proposital**: helper nao depende da ordem. Mas SKILL.md DEVE rodar fase-02 (scaffold) antes de Step 3 (detect+state) — documentado no Step 1 da SKILL.

### Decisao sobre ordem de execucao (referenciada no README do plano)

Esta fase produz `DetectedStack` que **fase-03 consome**. Ordem real: fase-02 → fase-06 → fase-03 (→ fase-04 ‖ fase-05 podem ser intercaladas em qualquer ordem). A numeracao das fases segue agrupamento tematico (scaffold → customizacao → integracoes → detalhes); a numeracao **nao implica** ordem de execucao. Subagente de execucao deve respeitar o grafo do README.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/detect-stack.test.ts` falha — modulo nao existe ou retorna `unknown` em vez de `nextjs` na fixture com `package.json{next}`.
  - Comando: `bun run test skills/init/lib/detect-stack.test.ts`
  - Resultado esperado: ≥1 fail.

- [ ] **GREEN:** Probes implementados — todos os 8 testes passam.
  - Comando: `bun run test skills/init/lib/detect-stack.test.ts`
  - Resultado esperado: `8 passed, 0 failed`

- [ ] **STATE.md tests:** `bun run test skills/init/lib/state-md-init.test.ts` retorna `5 passed, 0 failed`.

### Checklist

- [ ] `detectStack` retorna `nextjs` para package.json{next} (CA-07)
- [ ] `detectStack` retorna `rails` para Gemfile{gem "rails"} (CA-08)
- [ ] `detectStack` retorna `unknown` para diretorio vazio (CA-21)
- [ ] `detectStack` em monorepo (next + rails) retorna `nextjs` por ordem documentada (G6)
- [ ] `detectStack` engole erros de JSON corrompido (nao throws)
- [ ] `writeStackToStateMd` para `nextjs` produz `docs/STATE.md` com `detected_stack: nextjs` (CA-19)
- [ ] `writeStackToStateMd` para `rails` produz `detected_stack: rails` (CA-20)
- [ ] `writeStackToStateMd` e idempotente (segunda chamada nao altera arquivo)
- [ ] **D37 confirmado**: `docs/knowledge/` NAO existe apos run desta fase em fixture com stack detectado
- [ ] Manifest da fase-01 atualizado para 26 entradas; teste `template-manifest.test.ts` continua passando
- [ ] Lint limpo: `bun run lint skills/init/lib/detect-stack.ts skills/init/lib/state-md-init.ts`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`; `as` documentado em JSDoc se usado)

---

## Criterio de Aceite

**Por maquina (CA-19 + CA-20 + CA-21 verbatim):**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/detect-stack.test.ts
# Esperado: 8 passed, 0 failed em <1s

bun run test skills/init/lib/state-md-init.test.ts
# Esperado: 5 passed, 0 failed em <1s

# Em fixture nextjs-new (package.json com next):
grep -F "detected_stack: nextjs" tests/fixtures/nextjs-new/docs/STATE.md
# Esperado: 1 match (CA-19)

# Em fixture rails-new (Gemfile com rails):
grep -F "detected_stack: rails" tests/fixtures/rails-new/docs/STATE.md
# Esperado: 1 match (CA-20)

# Em fixture vazia:
grep -F "detected_stack: unknown" tests/fixtures/empty-dir/docs/STATE.md
# Esperado: 1 match (CA-21)

# D37 — no KP em v6.0.0:
! test -d tests/fixtures/nextjs-new/docs/knowledge
# Esperado: exit 0 (diretorio NAO existe)
```

**Por humano:**

- Apos `/init` em fixture com `package.json{ "dependencies": { "next": "^14" } }`, abrir `docs/STATE.md` e confirmar visualmente:
  - Secao `## Resources` lista `detected_stack: nextjs`.
  - Secao `## Recent Activity` esta vazia (placeholder).
  - **Nao** ha pasta `docs/knowledge/nextjs/` (escopo D37 respeitado).
- Apos /init em diretorio sem nenhum manifest, abrir `docs/STATE.md` — `detected_stack: unknown` aparece sem que o usuario tenha sido perguntado nada (CA-21: "sem confirmacao obrigatoria de stack").

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
