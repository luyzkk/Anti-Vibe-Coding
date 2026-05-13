<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Skill /init Esqueleto (copy templates → diretorio vazio)

**Plano:** 01 — Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-01 (templates AGENTS.md.tpl + ARCHITECTURE.md.tpl precisam existir)
**Visual:** false

---

## O que esta fase entrega

Skill `/init` minimal (SKILL.md + helper TypeScript) que copia os dois templates da fase-01 para o diretorio corrente, substituindo placeholders `{{PROJECT_NAME}}` e `{{STACK}}` por valores detectados (ou `"unknown"` se nada for detectavel). Esta fase NAO faz symlink ainda — apenas copia. O symlink/hardlink/fallback fica na fase-03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Atualizar para v6.0.0 — adicionar passo "copy harness templates" antes dos passos existentes |
| `anti-vibe-coding/skills/init/lib/scaffold-templates.ts` | Create | Helper TS+bun que copia .tpl, substitui placeholders, escreve AGENTS.md + ARCHITECTURE.md |
| `anti-vibe-coding/skills/init/lib/detect-project-name.ts` | Create | Heuristica simples: nome da pasta corrente como project name |
| `anti-vibe-coding/skills/init/lib/scaffold-templates.test.ts` | Create | Teste unitario: fixture vazia → scaffold → arquivos existem com placeholders substituidos |

---

## Implementacao

### Passo 1: Helper `lib/scaffold-templates.ts`

```typescript
// 2026-05-11 (Luiz/dev): helper de scaffold — fase-02 do plano01 v6.0.0
// Alinhado com D9 (/init absorve harness) e D13 (TS+bun).

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ScaffoldOptions = {
  targetDir: string
  templatesDir: string
  projectName: string
  stack: string
}

export type ScaffoldResult = {
  filesWritten: string[]
}

export async function scaffoldTemplates(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const filesWritten: string[] = []

  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md.tpl', 'AGENTS.md'],
    ['ARCHITECTURE.md.tpl', 'ARCHITECTURE.md'],
  ]

  for (const [src, dst] of pairs) {
    const srcPath = path.join(opts.templatesDir, src)
    const dstPath = path.join(opts.targetDir, dst)

    const tpl = await fs.readFile(srcPath, 'utf8')
    const rendered = tpl
      .replaceAll('{{PROJECT_NAME}}', opts.projectName)
      .replaceAll('{{STACK}}', opts.stack)

    await fs.writeFile(dstPath, rendered, 'utf8')
    filesWritten.push(dstPath)
  }

  return { filesWritten }
}
```

Notas de implementacao:
- `replaceAll` exige ES2021+. `bun` suporta. Type-check em strict.
- **Nao** usar template engine (handlebars/ejs). Substituicao por string crua mantem o helper sem deps.
- Erros de `fs.readFile` propagam — quem chama (SKILL.md ou execute-plan) decide o tratamento.

### Passo 2: Helper `lib/detect-project-name.ts`

```typescript
// 2026-05-11 (Luiz/dev): nome do projeto = basename(cwd) — heuristica minima
// para o tracer bullet. Plano 02 fase-03 expande para ler package.json/Gemfile.

import path from 'node:path'

export function detectProjectName(cwd: string): string {
  return path.basename(cwd)
}
```

Stack detection real (package.json/Gemfile) fica para Plano 02 fase-06. Aqui retornamos `"unknown"` ou aceitamos via parametro.

### Passo 3: SKILL.md do `/init` — atualizar v6.0.0

Adicionar bloco no inicio do fluxo (manter retrocompat para v5.x):

```markdown
## Step 1 (v6.0.0): Copy harness templates

Execute via bun runtime:

\`\`\`bash
bun run -e "
import { scaffoldTemplates } from './lib/scaffold-templates.ts'
import { detectProjectName } from './lib/detect-project-name.ts'

const result = await scaffoldTemplates({
  targetDir: process.cwd(),
  templatesDir: path.join(import.meta.dir, 'assets/templates'),
  projectName: detectProjectName(process.cwd()),
  stack: 'unknown'
})

console.log('Files written:', result.filesWritten)
"
\`\`\`

After this step, AGENTS.md and ARCHITECTURE.md exist in the project root.
Step 2 (next phase) handles the symlink/hardlink/copy fallback for CLAUDE.md.
```

### Passo 4: Teste unitario `scaffold-templates.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scaffoldTemplates } from './scaffold-templates'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'empty')
const TEMPLATES_DIR = path.join(import.meta.dir, '..', 'assets', 'templates')

describe('scaffoldTemplates', () => {
  beforeEach(async () => {
    await fs.mkdir(FIXTURE_DIR, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  })

  it('writes AGENTS.md and ARCHITECTURE.md with placeholders substituted', async () => {
    const result = await scaffoldTemplates({
      targetDir: FIXTURE_DIR,
      templatesDir: TEMPLATES_DIR,
      projectName: 'my-app',
      stack: 'Next.js',
    })

    expect(result.filesWritten).toHaveLength(2)

    const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('my-app')
    expect(agents).toContain('Next.js')
    expect(agents).not.toContain('{{PROJECT_NAME}}')
    expect(agents).not.toContain('{{STACK}}')
  })
})
```

---

## Gotchas

- **G1 do plano (D16):** Esta fase NAO faz symlink. Apenas copia. CLAUDE.md ainda nao existe — usuario que rodar `/init` parando aqui vera `AGENTS.md` mas Claude Code procurara `CLAUDE.md` e nao achara. Fase-03 resolve.
- **G4 do plano (cross-platform):** `path.join` sempre. Nunca `srcPath + '/' + filename`.
- **Local — cwd vs targetDir:** O usuario pode rodar `/init` de qualquer pasta. O helper recebe `targetDir` explicito (nao usa `process.cwd()` internamente). SKILL.md eh que passa `process.cwd()` — testavel via injection.
- **Local — `import.meta.dir` em bun:** Equivalente a `__dirname` no Node. Usar isso para resolver `assets/templates/`, nao paths relativos crus.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `scaffold-templates.test.ts` escrito antes do helper. Falha por `ENOENT` (modulo nao existe).
  - Comando: `bun run test scaffold-templates.test.ts`
  - Resultado esperado: `Cannot find module './scaffold-templates'`

- [ ] **GREEN:** Helper implementado, teste passa.
  - Comando: `bun run test scaffold-templates.test.ts`
  - Resultado esperado: `1 passed, 0 failed`

- [ ] **REFACTOR:** Extrair `replaceAll` em loop em uma funcao `renderTemplate(tpl, vars: Record<string,string>)` se ficar 3+ templates. (Nao obrigatorio com 2 placeholders.)

### Checklist

- [ ] `bun run test scaffold-templates.test.ts` retorna 1 passed
- [ ] Helper escreve **exatamente 2 arquivos** no `targetDir` (AGENTS.md + ARCHITECTURE.md) — nem mais, nem menos
- [ ] Placeholders `{{PROJECT_NAME}}` e `{{STACK}}` sao substituidos em ambos os arquivos quando aplicavel (grep nao acha `{{` no output)
- [ ] Helper nao depende de `process.cwd()` — recebe `targetDir` por parametro (testavel sem chdir)
- [ ] `detectProjectName(cwd)` retorna `path.basename(cwd)` — testavel com `expect(detectProjectName('/tmp/foo')).toBe('foo')`
- [ ] SKILL.md atualizado com Step 1 v6.0.0 (sem remover passos legacy v5.x — backward compat fica para Plano 03)
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (strict mode, no `any`)

---

## Criterio de Aceite

**Por maquina:**
- Em fixture vazia: rodar `bun run -e "<bloco do Step 1>"` cria `AGENTS.md` e `ARCHITECTURE.md` em <1s
- `grep -L '{{' AGENTS.md ARCHITECTURE.md` retorna ambos os arquivos (nenhum tem placeholder residual)
- `wc -l AGENTS.md` retorna ≤40

**Por humano:**
- Inspecao visual de AGENTS.md gerado em fixture com nome `meu-projeto-teste` mostra o nome substituido corretamente, sem aspas extras nem escaping bizarro.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
