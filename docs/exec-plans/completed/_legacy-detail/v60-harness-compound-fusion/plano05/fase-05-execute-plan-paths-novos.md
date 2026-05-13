<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 05: Execute-Plan Paths Novos

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 2h
**Depende de:** fase-03 (`docs/exec-plans/active/` ja eh populado por `/plan-feature` v6)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:execute-plan` (1) le planos de `docs/exec-plans/active/` (em vez de `.planning/{date-slug}/`), (2) executa fase por fase como hoje, (3) ao detectar Exit Criteria todos marcados, **move** o arquivo do plano para `docs/exec-plans/completed/` preservando o nome e atualiza frontmatter `status: completed`. Mantem interface (mesmo comando, mesmo retorno) — D10.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/exec-plan-mover.ts` | Create | Move plano de `active/` para `completed/` com atualizacao de frontmatter |
| `anti-vibe-coding/lib/exec-plan-reader.ts` | Create | Le plano, faz parse YAML frontmatter + secoes; expoe `isComplete(plan)` |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Substituir referencias a `.planning/` por `docs/exec-plans/active/` |
| `anti-vibe-coding/skills/execute-plan/index.ts` | Modify | Discovery + reading + completion flow |
| `anti-vibe-coding/tests/execute-plan-move.test.ts` | Create | RED→GREEN: plano completo move arquivo |

---

## Implementacao

### Passo 1: `lib/exec-plan-reader.ts`

```typescript
// 2026-05-11 (Luiz/dev): leitor + detector de completude — usa contrato D18 (Exit Criteria + Validation Log)
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ExecPlanFile = {
  filePath: string
  frontmatter: {
    title: string
    mode: 'full' | 'quick'
    status: 'active' | 'completed' | 'pending-capture'
    created: string
    completedAt?: string
  }
  bodyByH2: Record<string, string>          // 'Exit Criteria' -> body lines
}

export async function readExecPlan(filePath: string): Promise<ExecPlanFile> {
  const raw = await fs.readFile(filePath, 'utf-8')
  // 2026-05-11 (Luiz/dev): strip BOM defensivo (Plano 03 G4 herdado)
  const text = raw.replace(/^\uFEFF/, '')
  const { frontmatter, body } = splitFrontmatter(text)
  const bodyByH2 = parseH2Sections(body)
  return { filePath, frontmatter: parseFrontmatter(frontmatter), bodyByH2 }
}

export function isComplete(plan: ExecPlanFile): boolean {
  // 2026-05-11 (Luiz/dev): completude = (a) status active, (b) todas checkboxes de Exit Criteria marcadas
  if (plan.frontmatter.status !== 'active') return false
  const exit = plan.bodyByH2['Exit Criteria'] ?? ''
  if (!exit.trim() || exit.includes('<!-- preencher -->')) return false
  const unchecked = exit.match(/^- \[ \]/gm) ?? []
  const checked = exit.match(/^- \[x\]/gm) ?? []
  return checked.length > 0 && unchecked.length === 0
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { frontmatter: '', body: text }
  return { frontmatter: m[1], body: m[2] }
}

function parseFrontmatter(fm: string): ExecPlanFile['frontmatter'] {
  // 2026-05-11 (Luiz/dev): YAML simples — chaves : valor, sem nested. Para validacao rigorosa usar gray-matter futuro.
  const obj: Record<string, string> = {}
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) obj[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
  return {
    title: obj.title ?? '(untitled)',
    mode: (obj.mode as 'full' | 'quick') ?? 'full',
    status: (obj.status as 'active' | 'completed' | 'pending-capture') ?? 'active',
    created: obj.created ?? new Date().toISOString().slice(0, 10),
    completedAt: obj.completedAt,
  }
}

function parseH2Sections(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = body.split('\n')
  let current: string | null = null
  let buf: string[] = []
  for (const line of lines) {
    const m = line.match(/^## (.+)$/)
    if (m) {
      if (current) out[current] = buf.join('\n')
      current = m[1].trim()
      buf = []
    } else if (current) {
      buf.push(line)
    }
  }
  if (current) out[current] = buf.join('\n')
  return out
}
```

### Passo 2: `lib/exec-plan-mover.ts`

```typescript
// 2026-05-11 (Luiz/dev): mover de active/ para completed/ — operacao atomica + frontmatter status update
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resolvePaths } from './path-resolver-v6'

export async function moveToCompleted(
  projectRoot: string,
  activePlanPath: string,
): Promise<{ newPath: string }> {
  const paths = await resolvePaths(projectRoot)
  await fs.mkdir(paths.execPlansCompletedDir, { recursive: true })

  const fileName = path.basename(activePlanPath)
  const newPath = path.join(paths.execPlansCompletedDir, fileName)

  const raw = await fs.readFile(activePlanPath, 'utf-8')
  // 2026-05-11 (Luiz/dev): atualizar status no frontmatter + adicionar completedAt
  const today = new Date().toISOString().slice(0, 10)
  const updated = raw
    .replace(/^(status:\s*)active\s*$/m, `$1completed`)
    .replace(/^---\n([\s\S]*?)\n---\n/m, (full, fm) => {
      if (fm.includes('completedAt:')) return full
      return `---\n${fm}\ncompletedAt: ${today}\n---\n`
    })

  await fs.writeFile(newPath, updated, 'utf-8')
  // 2026-05-11 (Luiz/dev): G2 — read-then-delete em vez de rename porque editamos conteudo
  await fs.unlink(activePlanPath)
  return { newPath }
}

export async function listActivePlans(projectRoot: string): Promise<string[]> {
  const paths = await resolvePaths(projectRoot)
  try {
    const entries = await fs.readdir(paths.execPlansActiveDir)
    return entries
      .filter((e) => e.endsWith('.md') && e !== 'README.md')
      .map((e) => path.join(paths.execPlansActiveDir, e))
  } catch {
    return []
  }
}
```

### Passo 3: atualizar `skills/execute-plan/SKILL.md`

Substituir todas as referencias a `.planning/` no fluxo:

````markdown
## Discovery (v6)

```
1. Resolve project layout (lib/path-resolver-v6.ts)
2. Se v6:
     a. Listar planos em docs/exec-plans/active/ (lib/exec-plan-mover.ts listActivePlans)
     b. Apresentar ao usuario para escolher qual executar
3. Se v5 (legado): usar fluxo antigo .planning/{date-slug}/ (mantido para D10)
```

## Completion Flow

```
1. Apos cada fase: pedir confirmacao do usuario para marcar Exit Criteria
2. Quando isComplete(plan) === true:
     a. Mover arquivo via moveToCompleted(projectRoot, planPath)
     b. Disparar telemetria: exec_plan.completed { slug, mode, duration_ms }
     c. Sugerir /iterate (que disparara o Compound Decision Gate — fase-06)
```
````

### Passo 4: integracao com skill

```typescript
// 2026-05-11 (Luiz/dev): integracao alto-nivel — D10 mantem entry point existente
import { readExecPlan, isComplete } from '../../lib/exec-plan-reader'
import { moveToCompleted, listActivePlans } from '../../lib/exec-plan-mover'

export async function onPlanPotentiallyComplete(projectRoot: string, planPath: string): Promise<{ moved: boolean }> {
  const plan = await readExecPlan(planPath)
  if (!isComplete(plan)) return { moved: false }
  await moveToCompleted(projectRoot, planPath)
  return { moved: true }
}
```

---

## Gotchas

- **G1 do plano (D10):** `execute-plan` mantem comando + assinatura; so mudou discovery + completion path.
- **G2 do plano (cross-platform):** `path.join` em todos os helpers. `fs.unlink` + `fs.writeFile` em Windows precisa que handles estejam fechados — usar `await` em sequence, nao `Promise.all` para essas 2 ops.
- **Local 05-G1 (rename atomic vs read-edit-write):** Optei por `read → edit frontmatter → writeFile newPath → unlink oldPath` em vez de `fs.rename`. Justificativa: precisamos editar o frontmatter (status: completed + completedAt). Trade-off: nao-atomico — se crash entre `writeFile` e `unlink`, fica copia duplicada (em `active/` e `completed/`). Aceito porque idempotente: rodar de novo detecta isso (plano em completed/ tem status: completed; ignore em active/).
- **Local 05-G2 (parse frontmatter simples):** Implementacao usa regex linha-a-linha, nao parser YAML completo. Funciona para chaves planas. Se Plano 06 introduzir frontmatter aninhado (ex: `superseded-by: ADR-0042`), trocar para parser robusto. Documentar via JSDoc.
- **Local 05-G3 (Exit Criteria vazio):** Plano recem-criado tem `<!-- preencher -->` em Exit Criteria. `isComplete` retorna `false` corretamente porque `unchecked.length` eh 0 mas `checked.length` tambem eh 0 — condicao `checked.length > 0` previne falso-positivo.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `moves plan to completed when all exit criteria checked`
  - Setup: fixture v6 com `docs/exec-plans/active/2026-05-12-foo.md` com Exit Criteria `- [x] step 1\n- [x] step 2`
  - Acao: chamar `onPlanPotentiallyComplete(root, planPath)`
  - Esperado: arquivo aparece em `docs/exec-plans/completed/2026-05-12-foo.md` com `status: completed`
  - Comando: `bun test tests/execute-plan-move.test.ts --grep 'moves plan'`
  - Resultado esperado: arquivo nao move (falha) ate implementacao

- [ ] **GREEN:** apos implementacao, move corretamente e atualiza frontmatter

### Checklist

- [ ] `listActivePlans(root)` retorna array de paths absolutos para `*.md` em `active/` (exclui `README.md`)
- [ ] `readExecPlan(filePath)` parsea frontmatter (`title`, `mode`, `status`, `created`) e secoes H2 indexadas
- [ ] `isComplete(plan)` retorna `true` so quando: status active + Exit Criteria tem >=1 `- [x]` e zero `- [ ]`
- [ ] `isComplete` retorna `false` para plano com `<!-- preencher -->` em Exit Criteria
- [ ] `moveToCompleted` move arquivo E atualiza `status: active → completed` no frontmatter E adiciona `completedAt: YYYY-MM-DD`
- [ ] Apos `moveToCompleted`, `fs.stat(oldPath)` rejeita (arquivo nao existe mais)
- [ ] Apos `moveToCompleted`, `fs.stat(newPath)` resolve (arquivo existe em completed/)
- [ ] Cenario idempotente: rodar `moveToCompleted` 2x — segunda vez `oldPath` nao existe, retornar erro claro (`ENOENT: active plan not found`) em vez de quebra silenciosa
- [ ] Testes passam: `bun run test`
- [ ] Lint + typecheck

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/execute-plan-move.test.ts` exit 0 com >=3 testes (move, frontmatter update, isComplete edge cases)
- Apos teste: `ls docs/exec-plans/active/{slug}.md` ENOENT + `ls docs/exec-plans/completed/{slug}.md` exists
- `bun run harness:validate` (Plano 04 fase-03) nao detecta orfao porque arquivo saiu de active/

**CA do PRD coberto:**
- Parcial de CA-16: "Dado plugin v6 e plano em `docs/exec-plans/active/foo.md` completo, quando rodar `/iterate`, então dispara Compound Decision Gate, move plano para `docs/exec-plans/completed/` se aceito." — essa fase entrega o **move**; o **gate** entra em fase-06.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
