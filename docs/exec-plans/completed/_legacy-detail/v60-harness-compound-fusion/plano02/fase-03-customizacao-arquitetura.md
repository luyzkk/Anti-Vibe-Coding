<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: `/init` customiza ARCHITECTURE.md com framework detectado

**Plano:** 02 — Full Scaffold
**Sizing:** 1.5h
**Depende de:** fase-02 (scaffold full tree em fixture vazia funciona) **+ fase-06 (helper `detectStack` + tipo `DetectedStack`)** — ver "Decisao de ordem" no README do plano.
**Visual:** false

---

## O que esta fase entrega

Apos `scaffoldFullTree` materializar `ARCHITECTURE.md` com o template generico, esta fase **re-escreve** secoes especificas com o nome do framework detectado (Next.js / Rails / Node-TS / unknown), data de geracao e folders/scripts reais lidos do `package.json` (quando aplicavel). Atende M3 e CA-19/CA-20 ("ARCHITECTURE.md menciona Next.js framework detected").

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/customize-architecture.ts` | Create | Helper que le `ARCHITECTURE.md` recem-gerado, injeta secoes "Detected Stack" e "Project Layout" com base em `DetectedStack` |
| `anti-vibe-coding/skills/init/lib/customize-architecture.test.ts` | Create | Testes parametricos: `nextjs` → contem "Next.js framework detected"; `rails` → "Rails framework detected"; `unknown` → "Stack: unknown — please document manually" |
| `anti-vibe-coding/skills/init/assets/templates/ARCHITECTURE.md.tpl` | Modify | Adicionar marcador `<!-- INIT:STACK_BLOCK -->` que `customizeArchitecture` substitui |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 4 v6.0.0 — chamar `customizeArchitecture` apos `scaffoldFullTree` e apos `detectStack` |

---

## Implementacao

### Passo 1: Adicionar marcador no template `ARCHITECTURE.md.tpl`

`ARCHITECTURE.md.tpl` (atualizado — fragmento):

```markdown
# Architecture

Project: {{PROJECT_NAME}}

<!-- INIT:STACK_BLOCK -->
<!-- This block is replaced by /init after stack detection. Do not edit by hand. -->

## Boundaries

(...rest of the template...)
```

O comentario `<!-- INIT:STACK_BLOCK -->` e o **anchor** que `customizeArchitecture` procura.

### Passo 2: Helper `lib/customize-architecture.ts`

```typescript
// 2026-05-11 (Luiz/dev): customiza ARCHITECTURE.md com stack detectado.
// Plano 02 fase-03. Atende PRD M3, CA-19, CA-20.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DetectedStack } from './detect-stack' // fase-06 deste plano

const STACK_BLOCK_MARKER = '<!-- INIT:STACK_BLOCK -->'

const STACK_PRESENTATION: Record<DetectedStack['id'], { display: string; note: string }> = {
  nextjs:  { display: 'Next.js',           note: 'Next.js framework detected via package.json (D7).' },
  'node-ts': { display: 'Node.js + TypeScript', note: 'Node.js + TypeScript detected via package.json (D7).' },
  rails:   { display: 'Ruby on Rails',     note: 'Rails framework detected via Gemfile (D7).' },
  laravel: { display: 'Laravel (deferred)', note: 'PHP+Laravel detected. Knowledge pack ships in v6.x.' },
  python:  { display: 'Python (deferred)', note: 'Python detected via pyproject.toml/requirements.txt. Knowledge pack ships in v6.x.' },
  unknown: { display: 'unknown',           note: 'No supported stack detected — please document the stack manually.' },
}

export type CustomizeArchitectureOptions = {
  targetDir: string
  stack: DetectedStack
  generatedAt?: Date // injetavel para teste deterministico
}

export type CustomizeArchitectureResult = {
  written: boolean
  blockBody: string
}

export async function customizeArchitecture(
  opts: CustomizeArchitectureOptions,
): Promise<CustomizeArchitectureResult> {
  const archPath = path.join(opts.targetDir, 'ARCHITECTURE.md')
  const original = await fs.readFile(archPath, 'utf8')

  if (!original.includes(STACK_BLOCK_MARKER)) {
    // Marker ausente = template foi editado a mao ou versao errada. Nao sobrescrever.
    return { written: false, blockBody: '' }
  }

  const presentation = STACK_PRESENTATION[opts.stack.id]
  const generatedAt = (opts.generatedAt ?? new Date()).toISOString().slice(0, 10)

  const blockBody = [
    '## Detected Stack',
    '',
    `- Stack: **${presentation.display}**`,
    `- Detected on: ${generatedAt}`,
    `- Source signal: ${opts.stack.signalSource}`,
    '',
    presentation.note,
    '',
  ].join('\n')

  const updated = original.replace(STACK_BLOCK_MARKER, blockBody)
  await fs.writeFile(archPath, updated, 'utf8')

  return { written: true, blockBody }
}
```

Notas:
- **Idempotente** apenas na primeira execucao — apos a primeira, o marker some, segunda chamada retorna `{ written: false }`. Comportamento desejado: nao queremos sobrescrever edicoes manuais.
- `STACK_PRESENTATION` e hash map (CLAUDE.md global pede isso em vez de switch).
- `generatedAt` injetavel para testes deterministicos.

### Passo 3: Teste parametrico

```typescript
// 2026-05-11 (Luiz/dev): testes parametricos cobrem cada stack id.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { customizeArchitecture } from './customize-architecture'
import type { DetectedStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'arch')
const TEMPLATE_BODY = `# Architecture

Project: {{PROJECT_NAME}}

<!-- INIT:STACK_BLOCK -->
<!-- This block is replaced by /init after stack detection. Do not edit by hand. -->

## Boundaries

Replace this scaffold with project-specific content.
`

async function setup(stack: DetectedStack): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
  await fs.writeFile(
    path.join(FIXTURE, 'ARCHITECTURE.md'),
    TEMPLATE_BODY.replaceAll('{{PROJECT_NAME}}', 'fixture-app'),
    'utf8',
  )
}

const cases: ReadonlyArray<{ stack: DetectedStack; expectedSubstring: string }> = [
  { stack: { id: 'nextjs', signalSource: 'package.json#dependencies.next' }, expectedSubstring: 'Next.js framework detected' },
  { stack: { id: 'rails',  signalSource: 'Gemfile#gem "rails"' },            expectedSubstring: 'Rails framework detected' },
  { stack: { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' }, expectedSubstring: 'Node.js + TypeScript' },
  { stack: { id: 'unknown', signalSource: 'no signal' },                     expectedSubstring: 'document the stack manually' },
]

describe('customizeArchitecture', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  for (const { stack, expectedSubstring } of cases) {
    it(`writes "${expectedSubstring}" for stack ${stack.id}`, async () => {
      await setup(stack)
      const result = await customizeArchitecture({
        targetDir: FIXTURE,
        stack,
        generatedAt: new Date('2026-05-11T00:00:00Z'),
      })

      expect(result.written).toBe(true)
      const body = await fs.readFile(path.join(FIXTURE, 'ARCHITECTURE.md'), 'utf8')
      expect(body).toContain(expectedSubstring)
      expect(body).toContain('Detected on: 2026-05-11')
      expect(body).not.toContain('<!-- INIT:STACK_BLOCK -->') // marker consumido
    })
  }

  it('is a no-op when marker is absent (already customized)', async () => {
    await fs.mkdir(FIXTURE, { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n\n(no marker)\n', 'utf8')
    const result = await customizeArchitecture({
      targetDir: FIXTURE,
      stack: { id: 'nextjs', signalSource: 'test' },
    })
    expect(result.written).toBe(false)
  })
})
```

### Passo 4: SKILL.md do `/init` — Step 4 v6.0.0

Apos Step 3 (stack-detection — fase-06), adicionar:

```markdown
## Step 4 (v6.0.0): Customize ARCHITECTURE.md with detected stack

\`\`\`bash
bun run -e "
import { customizeArchitecture } from './lib/customize-architecture.ts'
import { detectStack } from './lib/detect-stack.ts'

const stack = await detectStack(process.cwd())
const result = await customizeArchitecture({
  targetDir: process.cwd(),
  stack,
})

console.log('ARCHITECTURE.md customized for', stack.id, '— written:', result.written)
"
\`\`\`

After this step, ARCHITECTURE.md contains a "Detected Stack" section with the framework name and date.
```

---

## Gotchas

- **G2 do plano (cross-platform):** `path.join(opts.targetDir, 'ARCHITECTURE.md')`. Sem string concat.
- **G6 do plano (heuristica ambigua):** Esta fase **nao** detecta — ela **consome** o resultado de fase-06. Se fase-06 retornar `unknown`, esta fase escreve "please document manually" — usuario nao fica preso.
- **G7 do plano (escopo D37):** Mesmo se stack for `nextjs`, esta fase **nao** cria `docs/knowledge/nextjs/`. So escreve em `ARCHITECTURE.md`. CA-19 e explicito.
- **G8 do plano (provenance):** Comentarios em `customize-architecture.ts` levam linha de provenance.
- **Local — marker idempotency:** Se usuario editar `ARCHITECTURE.md` manualmente e remover o marker, segunda chamada e no-op (correto). Se quiser forcar re-customizacao, usuario re-roda `/init` em projeto novo, nao em projeto editado.
- **Local — stack ids como string union:** `DetectedStack['id']` (definido em fase-06) e union literal `'nextjs' | 'node-ts' | 'rails' | 'laravel' | 'python' | 'unknown'`. `Record<DetectedStack['id'], ...>` no STACK_PRESENTATION garante exhaustiveness em compile-time. Se fase-06 adicionar id novo, TS quebra aqui — bom sinal.
- **Ambiguity G-A2 (FRONTEND.md placeholder):** Para projetos onde `stack === 'unknown'` mas usuario sabe que tera frontend, `FRONTEND.md` continua placeholder. Esta fase nao toca em FRONTEND.md — so ARCHITECTURE.md. Se quiser estender no futuro, adicionar `customizeFrontend` analogo. Fora de escopo desta fase.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/customize-architecture.test.ts` falha — ou modulo nao existe (Cannot find module './customize-architecture'), ou marker nao e substituido (assertion `expect(body).toContain('Next.js framework detected')` falha).
  - Comando: `bun run test skills/init/lib/customize-architecture.test.ts`
  - Resultado esperado: ≥1 fail antes de implementar.

- [ ] **GREEN:** Apos helper implementado, todos os casos passam.
  - Comando: `bun run test skills/init/lib/customize-architecture.test.ts`
  - Resultado esperado: `5 passed, 0 failed` (4 casos parametricos + 1 no-op)

### Checklist

- [ ] `customize-architecture.test.ts` passa nos 5 casos (nextjs, rails, node-ts, unknown, no-marker)
- [ ] `ARCHITECTURE.md.tpl` contem o marker `<!-- INIT:STACK_BLOCK -->` (cobre futuras regressoes)
- [ ] Apos `customizeArchitecture` rodar, `ARCHITECTURE.md` **nao** contem mais o marker (consumido na primeira chamada)
- [ ] Para `stack.id === 'nextjs'`, body contem exatamente "**Next.js**" (com bold) e "Next.js framework detected via package.json"
- [ ] Para `stack.id === 'unknown'`, body contem "document the stack manually" (CA-21 friendly)
- [ ] Tracer bullet do Plano 01 continua passando (regressao zero)
- [ ] Lint limpo: `bun run lint skills/init/lib/customize-architecture.ts`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`)

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/customize-architecture.test.ts
# Esperado: 5 passed, 0 failed em <1s

# Em fixture com package.json{ "next": "*" } apos /init completo (fase-02 + fase-06 + fase-03):
grep -F "Next.js framework detected" tests/fixtures/nextjs-new/ARCHITECTURE.md
# Esperado: 1 match
```

**Por humano:**

- Abrir `ARCHITECTURE.md` apos run em fixture `nextjs-new` — secao "Detected Stack" aparece **logo apos** o titulo, antes de "Boundaries". Texto curto (5 linhas), sem placeholders sobrando, data correta.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
