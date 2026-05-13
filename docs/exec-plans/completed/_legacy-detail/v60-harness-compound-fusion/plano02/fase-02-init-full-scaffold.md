<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: `/init` expande para scaffold completo (14+ docs em arvore)

**Plano:** 02 — Full Scaffold
**Sizing:** 2h
**Depende de:** fase-01 (manifest + 25 templates `.tpl` precisam existir)
**Visual:** false

---

## O que esta fase entrega

Helper `scaffoldFullTree` que itera o `TEMPLATE_MANIFEST` da fase-01 e materializa toda a arvore (`docs/`, `docs/exec-plans/active/`, `docs/exec-plans/completed/`, `docs/design-docs/`, etc.) em fixture vazia, com substituicao de placeholders (`{{PROJECT_NAME}}`, `{{STACK}}`, `{{TODAY}}`). SKILL.md do `/init` passa a chamar `scaffoldFullTree` em vez do `scaffoldTemplates` (2-arquivos) do Plano 01. Apos esta fase, `/init` em fixture vazia produz **27 arquivos** (25 do manifest + AGENTS.md + ARCHITECTURE.md herdados de Plano 01) e o tracer bullet do Plano 01 continua passando (regressao zero).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/scaffold-full-tree.ts` | Create | Helper que itera `TEMPLATE_MANIFEST`, garante diretorios via `mkdir -p`, copia + substitui placeholders |
| `anti-vibe-coding/skills/init/lib/scaffold-templates.ts` | Modify | Adicionar substituicao de `{{TODAY}}` (placeholder introduzido em fase-01 `TODO.md.tpl`) |
| `anti-vibe-coding/skills/init/lib/scaffold-full-tree.test.ts` | Create | Teste em fixture vazia — espera 25+ arquivos criados, zero placeholders residuais, AGENTS.md + ARCHITECTURE.md preservados |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Substituir chamada `scaffoldTemplates(...)` por `scaffoldFullTree(...)` no Step 1 v6.0.0 |
| `anti-vibe-coding/tests/e2e/init-tracer-bullet.test.ts` | Modify | Atualizar assertion `expect(scaffoldResult.filesWritten.length).toBeGreaterThanOrEqual(2)` para `>= 27`; manter resto do teste para garantir regressao zero do tracer Plano 01 |

---

## Implementacao

### Passo 1: Helper `lib/scaffold-full-tree.ts`

```typescript
// 2026-05-11 (Luiz/dev): expande scaffoldTemplates do Plano 01 para a arvore inteira.
// Plano 02 fase-02. Alinhado com PRD M2 e CA-06.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT, type TemplateEntry } from './template-manifest'

export type ScaffoldFullTreeOptions = {
  targetDir: string
  projectName: string
  stack: string
}

export type ScaffoldFullTreeResult = {
  filesWritten: ReadonlyArray<string>
  durationMs: number
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  let out = body
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

export async function scaffoldFullTree(opts: ScaffoldFullTreeOptions): Promise<ScaffoldFullTreeResult> {
  const start = Date.now()
  const filesWritten: string[] = []

  // 2026-05-11 (Luiz/dev): {{TODAY}} adicionado para TODO.md.tpl — fase-01 introduziu.
  const vars: Record<string, string> = {
    PROJECT_NAME: opts.projectName,
    STACK: opts.stack,
    TODAY: new Date().toISOString().slice(0, 10),
  }

  // Paraleliza por entry — cada uma e independente (mkdir + read + write).
  await Promise.all(
    TEMPLATE_MANIFEST.map(async (entry: TemplateEntry) => {
      const srcPath = path.join(TEMPLATES_ROOT, entry.src)
      const dstPath = path.join(opts.targetDir, entry.dst)

      await fs.mkdir(path.dirname(dstPath), { recursive: true })
      const tpl = await fs.readFile(srcPath, 'utf8')
      const rendered = renderTemplate(tpl, vars)
      await fs.writeFile(dstPath, rendered, 'utf8')
      filesWritten.push(dstPath)
    }),
  )

  return {
    filesWritten,
    durationMs: Date.now() - start,
  }
}
```

Notas:
- `Promise.all` paraleliza I/O. Em fixture vazia + SSD, 25 arquivos em <200ms.
- `mkdir { recursive: true }` e idempotente — multiplas entries no mesmo diretorio nao colidem.
- `renderTemplate` e funcao pura — facil de testar isoladamente se virar gargalo.
- **Nao engole erros**: se um `.tpl` faltar, propaga `ENOENT` para o chamador (SKILL.md).

### Passo 2: Atualizar `scaffoldTemplates` para tambem suportar `{{TODAY}}`

`scaffoldTemplates` (Plano 01) gera AGENTS.md + ARCHITECTURE.md. Eles **nao** usam `{{TODAY}}` hoje, mas para consistencia (e caso o template AGENTS.md.tpl venha a usar no futuro), adicionar:

```typescript
// 2026-05-11 (Luiz/dev): + {{TODAY}} para alinhar com scaffoldFullTree — Plano 02 fase-02.
const today = new Date().toISOString().slice(0, 10)
const rendered = tpl
  .replaceAll('{{PROJECT_NAME}}', opts.projectName)
  .replaceAll('{{STACK}}', opts.stack)
  .replaceAll('{{TODAY}}', today)
```

### Passo 3: SKILL.md do `/init` — Step 1 v6.0.0 atualizado

Substituir o bloco `bun run -e "..."` do Plano 01 por:

```markdown
## Step 1 (v6.0.0): Scaffold full harness tree

Run via bun:

\`\`\`bash
bun run -e "
import path from 'node:path'
import { scaffoldTemplates } from './lib/scaffold-templates.ts'
import { scaffoldFullTree } from './lib/scaffold-full-tree.ts'
import { detectProjectName } from './lib/detect-project-name.ts'

const projectName = detectProjectName(process.cwd())
const stack = 'unknown' // step 6 (stack-detection) refines this

// AGENTS.md + ARCHITECTURE.md (Plano 01)
const baseResult = await scaffoldTemplates({
  targetDir: process.cwd(),
  templatesDir: path.join(import.meta.dir, 'assets/templates'),
  projectName,
  stack,
})

// 14+ docs + structure (Plano 02 fase-02)
const treeResult = await scaffoldFullTree({
  targetDir: process.cwd(),
  projectName,
  stack,
})

console.log('Base files:', baseResult.filesWritten.length)
console.log('Tree files:', treeResult.filesWritten.length, 'in', treeResult.durationMs, 'ms')
"
\`\`\`

After this step the project has 27 files: AGENTS.md, ARCHITECTURE.md, TODO.md, and 24 docs/* files.
Step 2 (next phase) handles symlink fallback for CLAUDE.md → AGENTS.md.
```

### Passo 4: Teste `scaffold-full-tree.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida fase-02 — arvore completa em fixture vazia.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scaffoldFullTree } from './scaffold-full-tree'
import { TEMPLATE_MANIFEST } from './template-manifest'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'tree')

async function clean(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })
}

describe('scaffoldFullTree', () => {
  beforeEach(async () => { await clean(FIXTURE_DIR) })
  afterEach(async () => { await fs.rm(FIXTURE_DIR, { recursive: true, force: true }) })

  it('writes every template from the manifest', async () => {
    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'fixture-app',
      stack: 'unknown',
    })

    expect(result.filesWritten.length).toBe(TEMPLATE_MANIFEST.length)

    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(FIXTURE_DIR, entry.dst))
      expect(stat.isFile()).toBe(true)
    }
  })

  it('substitutes {{PROJECT_NAME}}, {{STACK}}, {{TODAY}} — no residuals', async () => {
    await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'fixture-app',
      stack: 'nextjs',
    })

    for (const entry of TEMPLATE_MANIFEST) {
      const body = await fs.readFile(path.join(FIXTURE_DIR, entry.dst), 'utf8')
      expect(body).not.toContain('{{PROJECT_NAME}}')
      expect(body).not.toContain('{{STACK}}')
      expect(body).not.toContain('{{TODAY}}')
    }
  })

  it('completes in under 1 second on empty fixture (perf budget — feeds CA-06 ≤60s)', async () => {
    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'perf-fixture',
      stack: 'unknown',
    })
    expect(result.durationMs).toBeLessThan(1000)
  })

  it('is idempotent — re-running overwrites without error', async () => {
    await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    const second = await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    expect(second.filesWritten.length).toBe(TEMPLATE_MANIFEST.length)
  })
})
```

### Passo 5: Atualizar tracer bullet (regressao zero do Plano 01)

Em `tests/e2e/init-tracer-bullet.test.ts`, ajustar:

```typescript
// 2026-05-11 (Luiz/dev): apos fase-02 do Plano 02, scaffold gera 27 arquivos (2 base + 25 tree).
// Antes: >= 2. Agora: >= 27. Mantem o resto do tracer intacto.
expect(scaffoldResult.filesWritten.length + treeResult.filesWritten.length).toBeGreaterThanOrEqual(27)
```

E adicionar a chamada de `scaffoldFullTree` no proprio teste (entre `scaffoldTemplates` e `linkClaudeToAgents`).

---

## Gotchas

- **G1 do plano (D2 EN):** Os 25 templates ja foram garantidos EN-only em fase-01 (teste cobre). Esta fase nao re-valida; confia em fase-01.
- **G2 do plano (cross-platform paths):** `path.dirname(dstPath)` antes de `mkdir`. **Cuidado**: em Windows, `path.dirname('docs')` retorna `'.'`. `mkdir('.', { recursive: true })` e no-op — OK. Mas alguns paths como `TODO.md` (raiz) tem `dirname === '.'` — confirmar que `mkdir` nao explode (testado: nao explode).
- **G3 do plano (fixture limpa):** O `afterEach` deste teste usa `fs.rm(FIXTURE_DIR, { recursive: true, force: true })` — apaga tudo, incluindo `__fixtures__/tree`. Diferente do tracer do Plano 01 que preserva `.gitignore`/`.gitkeep` (porque essa fixture e versionada). A fixture deste teste **nao** e versionada — `__fixtures__/` esta em `.gitignore` global do plugin (verificar).
- **G8 do plano (provenance):** Toda alteracao em `scaffold-templates.ts` (adicionar `{{TODAY}}`) leva linha de comentario com data + autor + motivo. Templates `.tpl` nao precisam (sao output, nao runtime).
- **Local — `Promise.all` race em mkdir:** Multiplas entries no mesmo diretorio (ex: 5 templates em `docs/review-checklists/`) disparam `mkdir` paralelo. `recursive: true` torna isso seguro (kernel garante atomicidade do `mkdirat`). Documentado.
- **Local — regressao do tracer:** Apos esta fase, o tracer do Plano 01 (`bun run test:tracer`) PRECISA continuar passando. Se quebrar, gargalo geralmente e: (a) `expect(filesWritten.length).toBeGreaterThanOrEqual(2)` ficou strict `=== 2` em alguma versao do teste; (b) `afterEach` apagando arquivos versionados da fixture. Validar antes de commitar.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/scaffold-full-tree.test.ts` — falha porque `scaffold-full-tree.ts` nao existe ou retorna < 25 arquivos.
  - Comando: `bun run test skills/init/lib/scaffold-full-tree.test.ts`
  - Resultado esperado: assertion fail em `result.filesWritten.length`

- [ ] **GREEN:** Helper implementado — todos os 4 `it()` passam.
  - Comando: `bun run test skills/init/lib/scaffold-full-tree.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

- [ ] **REGRESSAO:** Tracer bullet do Plano 01 continua passando.
  - Comando: `bun run test:tracer`
  - Resultado esperado: `2 passed, 0 failed` (happy path E2E + regression de 50 linhas)

### Checklist

- [ ] `scaffoldFullTree` em fixture vazia cria **exatamente 25 arquivos** (`TEMPLATE_MANIFEST.length`)
- [ ] Tracer bullet (Plano 01 fase-05) continua exit 0 — agora com 27 arquivos totais (2 + 25)
- [ ] `bun run test skills/init/lib/scaffold-full-tree.test.ts` retorna `4 passed`
- [ ] `bun run test:tracer` retorna `2 passed` (regressao zero)
- [ ] `grep -rE "\{\{[A-Z_]+\}\}" tests/fixtures/empty-dir/docs/` retorna **vazio** apos run do tracer (zero placeholders residuais)
- [ ] Performance: `result.durationMs` reportado < 1000ms em fixture vazia (alvo: <200ms em SSD)
- [ ] SKILL.md do `/init` referencia `scaffoldFullTree` no Step 1 v6.0.0 (nao apenas `scaffoldTemplates`)
- [ ] Lint limpo: `bun run lint skills/init/lib/scaffold-full-tree.ts skills/init/lib/scaffold-templates.ts`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`, sem `as`)

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/scaffold-full-tree.test.ts
# Esperado: 4 passed, 0 failed em <2s

bun run test:tracer
# Esperado: 2 passed, 0 failed (regressao do Plano 01 nao quebrou)

# Em fixture vazia apos scaffoldFullTree:
find tests/fixtures/empty-dir -type f -name "*.md" | wc -l
# Esperado: >= 25 (manifest) + 2 (AGENTS, ARCHITECTURE) = 27
```

**Por humano:**

- Inspecao visual de `tests/fixtures/empty-dir/` apos rodar o tracer mostra a arvore completa: `docs/{DESIGN,FRONTEND,PLANS,...}.md`, `docs/exec-plans/{active,completed}/README.md`, `docs/exec-plans/tech-debt-tracker.md`, `docs/compound/README.md`, `docs/review-checklists/{security,reliability,...}.md`, `docs/{smoke-flows,product-specs,references,generated}/...`, `TODO.md` na raiz.
- TODO.md gerado tem a data de hoje (substituicao de `{{TODAY}}` funcionando) — abrir o arquivo confirma.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
