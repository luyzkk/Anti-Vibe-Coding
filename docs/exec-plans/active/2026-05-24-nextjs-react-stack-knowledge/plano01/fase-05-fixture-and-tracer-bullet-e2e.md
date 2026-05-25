<!--
Princípio universal #5 — Comment Provenance.
Fixture criada nesta fase é estrutura minimal de projeto Next.js 14 App Router — não
ganha provenance inline (são arquivos de projeto fixture, não plugin code). Apenas o
arquivo de teste E2E `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` ganha comment
header `// 2026-05-24 (Luiz/dev): E2E tracer bullet Plano01 fase-05 — RF-05 + CA-01/02/03/07/10`.

Esta fase fecha o vertical slice do Plano 01: prova ponta-a-ponta que (a) fixture Next.js
é detectada, (b) `.claude/stack.json` escreve `primary: 'nextjs'`, (c) `.claude/knowledge/`
recebe o INDEX EN e o piloto `app-router-and-layouts.md`, (d) Vite-puro (sem Next) é
detectado como `'react'` mas usa o mesmo INDEX (D6), (e) monorepo Next+Vite (R5) ainda
classifica como `'nextjs'` (G3 ordem dos probes).
-->

# Fase 05: Fixture Next.js + E2E tracer bullet (RF-05, fecha vertical slice Plano 01)

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 3h
**Depende de:** fase-01 (matrix folder `knowledge/nextjs/` existe), fase-03 (piloto `app-router-and-layouts.md` existe), fase-04 (detector reconhece nextjs + react)
**Visual:** false

---

## O que esta fase entrega

1. **Fixture `tests/fixtures/nextjs-app-router-fixture/`** (5 arquivos) — projeto Next.js 14 App Router minimal: `package.json` (next 14.x + react 18.x + react-dom 18.x), `src/app/page.tsx` (server component default), `src/app/layout.tsx` (root layout), `next.config.js` (minimal), `tsconfig.json` (Next 14 strict).
2. **E2E `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts`** — prova vertical slice:
   - **CA-01 happy path:** rodar pipeline `/init` contra fixture Next.js, assertar `.claude/stack.json` com `primary: 'nextjs'`, `.claude/knowledge/INDEX.md` existe e começa com `# Next.js + React Knowledge — Index` (D16), `.claude/knowledge/atoms/app-router-and-layouts.md` existe.
   - **CA-02 Vite-only:** describe aninhado — fixture Vite+React (criada inline no teste, sem novo fixture file porque escopo S), `primary: 'react'`, mesmo INDEX copiado (D6 matrix compartilhada).
   - **CA-03 monorepo Next+Vite (R5):** describe aninhado — fixture inline com vite.config.ts + package.json contendo `next` E `react`, `primary: 'nextjs'` vence (G3).
   - **CA-07 performance:** assertar pipeline ≤500ms (NFR).
   - **CA-10 zero regressão:** rodar `bun test` global após esta fase — todos verdes.

Critério de sucesso: `bun test tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` EXIT=0 + `bun test` global EXIT=0.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/nextjs-app-router-fixture/package.json` | Create | `{ "name": "next-fixture", "dependencies": { "next": "^14.0.0", "react": "^18.2.0", "react-dom": "^18.2.0" }, "devDependencies": { "typescript": "^5.0.0", "@types/react": "^18.0.0", "@types/node": "^20.0.0" } }` |
| `tests/fixtures/nextjs-app-router-fixture/src/app/page.tsx` | Create | Server component default — `export default function Page() { return <main>Hello</main> }` |
| `tests/fixtures/nextjs-app-router-fixture/src/app/layout.tsx` | Create | Root layout — `export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html> }` |
| `tests/fixtures/nextjs-app-router-fixture/next.config.js` | Create | `module.exports = {}` (minimal) |
| `tests/fixtures/nextjs-app-router-fixture/tsconfig.json` | Create | Strict + Next 14 defaults (paths, jsx preserve, moduleResolution bundler) |
| `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` | Create | E2E novo cobrindo CA-01/02/03/07/10 |

---

## Implementacao

### Passo 1: criar fixture `tests/fixtures/nextjs-app-router-fixture/`

```bash
mkdir -p tests/fixtures/nextjs-app-router-fixture/src/app
```

**`tests/fixtures/nextjs-app-router-fixture/package.json`**

```json
{
  "name": "next-fixture",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```

> **Por que esses pinos:** Next 14 é o range "estável atual" do PRD (D5 — `next_versions: ["13.x", "14.x", "15.x"]`). React 18.2 é o baseline de Server Components. TypeScript 5 garante typecheck moderno. Sem `eslint` / `tailwind` — fixture minimal para detector, não para build real (jamais executamos `next build` no teste).

**`tests/fixtures/nextjs-app-router-fixture/src/app/page.tsx`**

```tsx
export default function Page() {
  return <main>Hello Next 14</main>
}
```

**`tests/fixtures/nextjs-app-router-fixture/src/app/layout.tsx`**

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**`tests/fixtures/nextjs-app-router-fixture/next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {}
```

**`tests/fixtures/nextjs-app-router-fixture/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

> **Sanity check:** rodar `bun typecheck` na raiz do plugin ANTES de prosseguir — fixture é só conteúdo estático; não deve afetar typecheck. Se afetar, mover fixture para fora do scope de typecheck do plugin (já está em `tests/fixtures/` — convenção excluída).

### Passo 2: criar `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts`

Estrutura espelha `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (molde existente, lido em fase de planejamento).

```ts
// 2026-05-24 (Luiz/dev): E2E tracer bullet Plano01 fase-05 — Next.js + React Stack Knowledge feature.
// Prova CA-01 (happy path Next.js), CA-02 (Vite puro herda matrix Next via D6),
// CA-03 (monorepo Next+Vite, R5 — G3 ordem probes), CA-07 (perf <500ms), CA-10 (zero regressão global).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const FIXTURE_DIR = join(PLUGIN_ROOT, 'tests', 'fixtures', 'nextjs-app-router-fixture')

async function cloneFixture(): Promise<string> {
  const dest = await fs.mkdtemp(path.join(tmpdir(), 'e2e-next-'))
  await fs.cp(FIXTURE_DIR, dest, { recursive: true })
  return dest
}

async function readStackJson(targetDir: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(path.join(targetDir, '.claude', 'stack.json'), 'utf8')
  return JSON.parse(raw) as Record<string, unknown>
}

async function runPipeline(targetDir: string): Promise<{ elapsedMs: number }> {
  const start = performance.now()
  const detection = await detectMultiStack(targetDir)
  await writeStackJson(targetDir, detection)
  await copyKnowledge({
    targetDir,
    pluginRoot: PLUGIN_ROOT,
    primary: detection.primary,
    refresh: false,
  })
  return { elapsedMs: performance.now() - start }
}

describe('init Next.js + React tracer bullet (Plano 01 fase-05)', () => {

  // CA-01: happy path Next.js App Router
  describe('CA-01: happy path Next.js fixture', () => {
    let project: string

    beforeEach(async () => {
      project = await cloneFixture()
    })

    afterEach(() => {
      rmSync(project, { recursive: true, force: true })
    })

    it('detectStack returns primary nextjs', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('nextjs')
    })

    it('writes .claude/stack.json with primary nextjs', async () => {
      await runPipeline(project)
      const stackJson = await readStackJson(project)
      expect(stackJson.primary).toBe('nextjs')
    })

    it('copies INDEX.md starting with canonical EN header (D16)', async () => {
      await runPipeline(project)
      const indexPath = join(project, '.claude', 'knowledge', 'INDEX.md')
      expect(existsSync(indexPath)).toBe(true)
      const content = await fs.readFile(indexPath, 'utf8')
      // D16: cabeçalho canônico EN
      expect(content).toMatch(/^# Next\.js \+ React Knowledge — Index/m)
    })

    it('copies pilot atom app-router-and-layouts.md', async () => {
      await runPipeline(project)
      const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'app-router-and-layouts.md')
      expect(existsSync(atomPath)).toBe(true)
      const content = await fs.readFile(atomPath, 'utf8')
      // frontmatter EN + 4 H2 sections
      expect(content).toMatch(/tier:\s*1/)
      expect(content).toMatch(/^## When to consult/m)
      expect(content).toMatch(/^## Senior patterns/m)
      expect(content).toMatch(/^## Anti-patterns/m)
      expect(content).toMatch(/^## Decision criteria/m)
    })

    it('CA-07: pipeline completes in <500ms', async () => {
      const { elapsedMs } = await runPipeline(project)
      expect(elapsedMs).toBeLessThan(500)
    })
  })

  // CA-02: Vite-puro herda matrix Next via D6
  describe('CA-02: Vite-only project (StackId react, shared matrix D6)', () => {
    let project: string

    beforeEach(() => {
      project = mkdtempSync(join(tmpdir(), 'e2e-vite-'))
      writeFileSync(join(project, 'vite.config.ts'), 'export default {}')
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          name: 'vite-fixture',
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
        }, null, 2),
      )
    })

    afterEach(() => {
      rmSync(project, { recursive: true, force: true })
    })

    it('detectStack returns primary react', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('react')
    })

    it('writes .claude/stack.json mapping to matrix nextjs (D6 shared)', async () => {
      await runPipeline(project)
      const stackJson = await readStackJson(project)
      // detect-multi-stack escreve o matrix folder, não o StackId — D6: 'react' → 'nextjs'
      expect(stackJson.primary).toBe('nextjs')
    })

    it('copies same INDEX.md with EN canonical header', async () => {
      await runPipeline(project)
      const indexPath = join(project, '.claude', 'knowledge', 'INDEX.md')
      expect(existsSync(indexPath)).toBe(true)
      const content = await fs.readFile(indexPath, 'utf8')
      expect(content).toMatch(/^# Next\.js \+ React Knowledge — Index/m)
    })
  })

  // CA-03: monorepo Next+Vite — Next vence (R5, G3 ordem probes)
  describe('CA-03: monorepo Next+Vite (R5 edge case, G3 probe order)', () => {
    let project: string

    beforeEach(() => {
      project = mkdtempSync(join(tmpdir(), 'e2e-monorepo-'))
      // Setup: vite.config.ts + package.json com NEXT e REACT em deps.
      writeFileSync(join(project, 'vite.config.ts'), 'export default {}')
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          name: 'monorepo-fixture',
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        }, null, 2),
      )
    })

    afterEach(() => {
      rmSync(project, { recursive: true, force: true })
    })

    it('detectStack returns primary nextjs (probeNextjs wins via G3 ordem)', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('nextjs')
      // signalSource confirma probe Next (não react)
      expect(result.signalSource).toContain('next')
    })

    it('writes .claude/stack.json with primary nextjs (not react)', async () => {
      await runPipeline(project)
      const stackJson = await readStackJson(project)
      expect(stackJson.primary).toBe('nextjs')
    })
  })
})
```

### Passo 3: rodar E2E novo isolado

```bash
bun test tests/e2e/init-v7-nextjs-tracer-bullet.test.ts
```

Esperado: todos verdes. Investigar falhas imediatamente — não prosseguir para Passo 4 com red.

### Passo 4: rodar suíte global (CA-10 zero regressão)

```bash
bun test
```

Esperado: EXIT=0. Se algum teste antigo quebrar:
- Provável causa #1: fase-00 não cobriu algum lugar onde `'nodejs-typescript'` foi codificado para Next. Voltar a fase-00 e adicionar à matriz de hits Categoria A/B/C.
- Provável causa #2: algum E2E golden file referencia `primary: 'nodejs-typescript'` em projeto Next — regenerar golden (com aprovação do dev) ou ajustar fixture.
- Provável causa #3: `MATRIX_FOLDER_VALUES` ganhou `'nextjs'` mas algum consumer faz exhaustive switch em MatrixFolder e perdeu o case. Typecheck deve ter pegado isso na fase-04.

### Passo 5: commit fixture + E2E

```bash
git add tests/fixtures/nextjs-app-router-fixture/ \
        tests/e2e/init-v7-nextjs-tracer-bullet.test.ts
git commit -m "test(e2e): tracer bullet Next.js + React stack knowledge

- Fixture nextjs-app-router-fixture/: Next 14 App Router minimal (5 arquivos)
- E2E init-v7-nextjs-tracer-bullet.test.ts: CA-01 happy path, CA-02 Vite-only
  (D6 matrix compartilhada), CA-03 monorepo Next+Vite (R5/G3), CA-07 perf <500ms
- Fecha vertical slice Plano 01: detector → stack.json → INDEX.md + piloto atom

Ref: PRD §RF-05, CA-01/02/03/07/10, D6, R5 mitigation."
```

---

## Critérios de Sucesso

- [ ] `tests/fixtures/nextjs-app-router-fixture/` contém 5 arquivos especificados
- [ ] `bun typecheck` EXIT=0 (fixture não polui scope do plugin)
- [ ] `bun test tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` EXIT=0
- [ ] CA-01: `stack.json.primary === 'nextjs'` para fixture Next.js
- [ ] CA-01: `INDEX.md` começa com `# Next.js + React Knowledge — Index` (D16)
- [ ] CA-01: `atoms/app-router-and-layouts.md` existe com frontmatter `tier: 1` + 4 H2 obrigatórias
- [ ] CA-02: Vite-only fixture inline → `primary: 'nextjs'` no stack.json (D6 matrix compartilhada)
- [ ] CA-03: monorepo Next+Vite fixture inline → `primary: 'nextjs'` (G3 — probeNextjs vence)
- [ ] CA-07: pipeline ≤500ms (perf NFR)
- [ ] CA-10: `bun test` global EXIT=0 (zero regressão pós-fase)
- [ ] Commit fixture + E2E juntos (clareza de linhagem)

---

## Gotchas / Observações

- **G7 (fase-00 cobertura completa):** se algum teste E2E pré-existente referencia `'nodejs-typescript'` literal para projeto Next.js sem ter sido catalogado em fase-00, esta fase quebra. Sintoma: `bun test` global vermelho em arquivo NÃO modificado por fase-04. Fix: voltar a fase-00, atualizar audit-report-fase00.md, aplicar Opção A/B/C.
- **R5 (monorepo):** CA-03 prova que monorepo Next+Vite é classificado como `'nextjs'`. Documentar no atom piloto (fase-03 já adicionou seção `## Edge cases`) que comportamento NÃO É BUG — é decisão consciente (G3). Não removível mesmo se o usuário pedir "detecte como react" — pediria reordenação de PROBES, contraria PRD.
- **Performance flake:** CA-07 (<500ms) pode flakear em CI lento. Se acontecer >2x consecutivas, considerar bump para <1000ms (registrar como Desvio em MEMORY.md). Baseline esperado: ~50-150ms numa máquina dev.
- **Fixture vs. real Next:** fixture **NÃO** roda `next build` nem `next dev`. É só estrutura para detector. Tentar build falha (faltam tons de coisas) — não é o objetivo do tracer bullet.
- **Golden files:** se houver `tests/e2e/__golden__/init-greenfield.*.txt` que cobrem fixture Next, regenerar (com aprovação) só após CA-01/02/03 verdes. Goldens são output do pipeline, não entrada. NÃO regenerar antes — risco de mascarar bug.
- **D6 boundary check:** o assert "primary === 'nextjs'" em CA-02 (Vite-only) prova que `detect-multi-stack` resolve via `STACK_ID_TO_MATRIX_FOLDER['react'] = 'nextjs'`. Se um dev futuro mudar para `'react': 'react'` (matrix dedicada), CA-02 quebra explicitamente. Sinal de design.

---

## Vinculo com PRD/CONTEXT

- **RF-05:** tracer bullet ponta-a-ponta — concretizado pelo E2E novo.
- **CA-01:** happy path Next.js → `stack.json` + INDEX + piloto — coberto em describe CA-01.
- **CA-02:** Vite-puro → matrix Next via D6 — coberto em describe CA-02.
- **CA-03:** monorepo Next+Vite → primary Next (G3) — coberto em describe CA-03.
- **CA-07:** perf <500ms — coberto pelo assert `elapsedMs < 500`.
- **CA-10:** zero regressão global — gate `bun test` EXIT=0 no Passo 4.
- **D6:** matrix compartilhada — assert CA-02 prova consumo via `'react'` StackId.
- **D16:** cabeçalho canônico EN — assert regex `/^# Next\.js \+ React Knowledge — Index/`.
- **R5 mitigation:** monorepo edge case — CA-03 valida G3 (probeNextjs primeiro).
