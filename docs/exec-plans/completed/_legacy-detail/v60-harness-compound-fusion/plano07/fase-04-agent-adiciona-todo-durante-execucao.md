<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: `/execute-plan` detecta out-of-scope e appenda em `TODO.md` (CA-33)

**Plano:** 07 — TODO.md + /todo-pick
**Sizing:** 2h (overview do PLAN.md dizia 1.5h — apurado em 2h pela complexidade da heuristica out-of-scope; ver §Mapa de Fases do README)
**Depende de:** Plano 06 fase-07 (`addLine` em `lib/todo-utils.ts`); Plano 05 fase-05 (skill `/execute-plan` migrada com paths v6); Plano 05 fase-03 (template D18 define campo `Scope` no frontmatter do plano)
**Visual:** false

---

## O que esta fase entrega

Bloco "Out-of-scope capture" no `SKILL.md` de `/execute-plan` (PT-BR) que instrui o agente a propor adicao a `TODO.md` quando detectar trabalho fora do `Scope` do plano em curso (CA-33 verbatim). Captura eh **sugestiva, com confirmacao** (D4 filosofia herdada).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/execute-plan/SKILL.md` | Modify | Adicionar bloco "Out-of-scope capture" no ponto de execucao de tasks (apos load do plano, antes do exit) |
| `lib/execute-plan-todo-capture.ts` | Create | Helper TS opcional que formata linha CA-33 + chama `addLine` — separa logica da skill (testavel isolado) |
| `tests/skills/execute-plan-todo-capture.test.ts` | Create | E2E em fixture `v6-with-plan/` simulando deteccao out-of-scope |
| `tests/lib/execute-plan-todo-capture-formatter.test.ts` | Create | Unit test do formatador (sem I/O) |

---

## Implementacao

### Passo 1: Helper de formatacao (`lib/execute-plan-todo-capture.ts`)

```typescript
// 2026-05-11 (Luiz/dev): formatador isolado — testavel sem I/O nem skill
// Referencia: CA-33 formato `- [ ] {date} {file:path:line} descricao`
//             G6 do plano: paths relativos a projectRoot, forward slashes (Windows-safe)
import { relative, sep } from 'path'
import { addLine } from './todo-utils'

export type CaptureInput = {
  projectRoot: string
  absolutePath: string | null     // null se eh out-of-scope abstrato (feature:)
  lineNumber: number | null
  featureName: string | null      // usado quando absolutePath null
  description: string
  today?: Date
}

export function formatTodoLine(input: CaptureInput): string {
  const date = (input.today ?? new Date()).toISOString().slice(0, 10) // YYYY-MM-DD UTC
  const classifier = buildClassifier(input)
  const cls = classifier ? `{${classifier}} ` : ''
  return `- [ ] {${date}} ${cls}${input.description.trim()}`
}

// 2026-05-11 (Luiz/dev): heuristica 07-A5 — file_path presente => file: ; senao feature:
function buildClassifier(input: CaptureInput): string | null {
  if (input.absolutePath) {
    const rel = relative(input.projectRoot, input.absolutePath).split(sep).join('/')
    return input.lineNumber !== null ? `file:${rel}:${input.lineNumber}` : `file:${rel}`
  }
  if (input.featureName) return `feature:${input.featureName}`
  return null
}

// 2026-05-11 (Luiz/dev): wrapper que escreve via addLine — chamado pela skill APOS confirmacao do usuario
export function captureToTodoMd(todoMdPath: string, input: CaptureInput): void {
  const line = formatTodoLine(input)
  addLine(todoMdPath, line)
}
```

### Passo 2: Modificar `skills/execute-plan/SKILL.md`

Adicionar bloco no fluxo da skill (PT-BR — G10). Local: dentro da secao que descreve execucao de fases, apos load do plano.

```markdown
## Captura Out-of-Scope (CA-33, D4 filosofia)

Durante execucao de uma fase, monitore arquivos lidos/editados. Se detectar trabalho **fora do campo `Scope`** do frontmatter do plano em curso, NAO tente corrigir — proponha adicao a TODO.md.

### Heuristica de deteccao (G5, 07-A4)

1. Le `Scope` do frontmatter do plano (Plano 05 fase-03 template D18 — array de glob patterns).
2. Para cada `Edit`/`Write`/`Read` de arquivo em tool call, comparar contra patterns:
   - Se path bate -> in-scope, continuar.
   - Se path NAO bate -> potencial out-of-scope.
3. Adicionalmente, se notar bug/typo/refactor em arquivo in-scope mas que **nao eh foco da fase atual** (ex: typo em comentario do arquivo X enquanto a fase pede mudanca em logica de X), tambem eh candidato.

### Fluxo de captura

1. Detectar candidato out-of-scope.
2. Perguntar ao usuario UMA vez (D4 filosofia — sugestivo, nao bloqueante):
   "Item potencialmente fora do scope detectado: {descricao curta}. Adicionar a TODO.md? [s/N]"
3. **Default N** (se usuario nao responder explicitamente).
4. Se `s`:
   - Coletar:
     - `absolutePath` do arquivo (ou `null` se abstrato)
     - `lineNumber` (ou `null`)
     - `featureName` (se abstrato)
     - `description` (curta — uma linha)
   - Chamar `captureToTodoMd(todoMdPath, { projectRoot, absolutePath, lineNumber, featureName, description })` (helper `lib/execute-plan-todo-capture.ts`).
   - Confirmar ao usuario: "Adicionado a TODO.md".
5. Se `n` ou sem resposta: continuar fluxo normal da fase, sem registro.

### Frontmatter `Scope` ausente ou malformado (07-A4 fallback)

Se o plano nao tem `Scope` parseavel (formato livre / ausente):
- NAO oferecer captura automatica.
- Logar warning ao iniciar: "Plano sem campo Scope estruturado — captura out-of-scope desativada para esta sessao".
- Usuario pode rodar `/todo-pick --add` manualmente (07-A7: NAO existe em v6.0.0; usuario edita TODO.md manualmente).
```

### Passo 3: Testes

**Unit test do formatter:**

```typescript
// 2026-05-11 (Luiz/dev): formatter cobre todos os classifiers
import { describe, it, expect } from 'bun:test'
import { formatTodoLine } from '../../lib/execute-plan-todo-capture'

const fixedToday = new Date('2026-05-13T12:00:00Z')

describe('formatTodoLine', () => {
  it('formats file classifier with line number (CA-33 verbatim)', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: '/repo/src/foo.ts',
      lineNumber: 42,
      featureName: null,
      description: 'typo no comentario',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {file:src/foo.ts:42} typo no comentario')
  })

  it('formats file classifier without line number', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: '/repo/src/bar.ts',
      lineNumber: null,
      featureName: null,
      description: 'review imports',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {file:src/bar.ts} review imports')
  })

  it('formats feature classifier when no file (07-A5)', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: null,
      lineNumber: null,
      featureName: 'billing',
      description: 'extract magic number',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {feature:billing} extract magic number')
  })

  it('normalizes Windows backslash paths to forward slashes (G6)', () => {
    const line = formatTodoLine({
      projectRoot: 'C:\\repo',
      absolutePath: 'C:\\repo\\src\\foo.ts',
      lineNumber: 10,
      featureName: null,
      description: 'fix',
      today: fixedToday,
    })
    expect(line).toContain('{file:src/foo.ts:10}')
    expect(line).not.toContain('\\')
  })

  it('omits classifier when no file and no feature', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: null,
      lineNumber: null,
      featureName: null,
      description: 'general cleanup',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} general cleanup')
  })
})
```

**E2E test da captura:**

```typescript
// 2026-05-11 (Luiz/dev): valida CA-33 em fixture v6-with-plan
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { runSkill } from '../helpers/skill-runner'

const planContent = `---
title: Test Plan
status: in-progress
Scope:
  - src/notifications/**
  - tests/notifications/**
---

# Test Plan
`

describe('/execute-plan out-of-scope capture (CA-33)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'avc-exec-capture-'))
    mkdirSync(join(tmpDir, 'docs/exec-plans/active'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'docs/exec-plans/active/test-plan.md'),
      planContent,
      'utf-8',
    )
    writeFileSync(join(tmpDir, 'TODO.md'), '# TODO\n', 'utf-8')
  })

  it('appends out-of-scope item with file classifier when user confirms', async () => {
    await runSkill('execute-plan', {
      cwd: tmpDir,
      args: ['test-plan'],
      simulateOutOfScope: {
        path: join(tmpDir, 'src/billing/index.ts'),
        line: 42,
        description: 'magic number',
      },
      input: ['s'], // confirma captura
    })
    const todo = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(todo).toMatch(/- \[ \] \{\d{4}-\d{2}-\d{2}\} \{file:src\/billing\/index\.ts:42\} magic number/)
  })

  it('does NOT append when user declines (default N, D4)', async () => {
    await runSkill('execute-plan', {
      cwd: tmpDir,
      args: ['test-plan'],
      simulateOutOfScope: {
        path: join(tmpDir, 'src/billing/index.ts'),
        line: 42,
        description: 'magic number',
      },
      input: ['n'],
    })
    const todo = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(todo).not.toContain('magic number')
  })

  it('does NOT prompt when path matches Scope glob', async () => {
    const result = await runSkill('execute-plan', {
      cwd: tmpDir,
      args: ['test-plan'],
      simulateInScope: {
        path: join(tmpDir, 'src/notifications/sender.ts'),
        line: 10,
      },
    })
    expect(result.stdout).not.toContain('fora do scope')
  })

  it('skips capture entirely when plan lacks Scope frontmatter (07-A4 fallback)', async () => {
    writeFileSync(
      join(tmpDir, 'docs/exec-plans/active/no-scope.md'),
      '---\ntitle: No Scope\n---\n# No Scope\n',
      'utf-8',
    )
    const result = await runSkill('execute-plan', {
      cwd: tmpDir,
      args: ['no-scope'],
      simulateOutOfScope: {
        path: join(tmpDir, 'src/anywhere.ts'),
        line: 1,
        description: 'unused',
      },
    })
    expect(result.stdout).toContain('captura out-of-scope desativada')
    const todo = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(todo).not.toContain('unused')
  })
})
```

---

## Gotchas

- **G5 do plano (heuristica out-of-scope):** Depende de `Scope` parseavel no frontmatter. Plano 05 fase-03 (template D18) deve definir como array de glob patterns. **Validar antes de executar** — se Plano 05 ficou com `Scope` em prosa, esta fase precisa de fallback (G/07-A4 — desativa captura).
- **G6 do plano (paths relativos + forward slashes):** `relative(projectRoot, absolutePath).split(sep).join('/')` garante `src/foo.ts` em ambos os OS. Test inclui caso Windows.
- **G12 do plano (captura proposta, nao automatica):** Filosofia D4 — sugere com confirmacao, nunca insere sem usuario topar. Default N. Mensagem curta (≤2 linhas) para nao virar fricao.
- **07-A3 do plano (race condition):** Se 2 execucoes paralelas do `/execute-plan` no mesmo projeto, `addLine` em paralelo pode ter last-write-wins. Aceitar — improvavel. Documentar como known-limitation.
- **07-A4 do plano (`Scope` ausente / malformado):** Fallback: desativa captura, loga warning. Nao crashes a skill.
- **07-A5 do plano (escolha de classifier):** `absolutePath` presente -> `file:`; senao `feature:` com `featureName` inferido. Decisao do agente (LLM-side) — nao tem regra de codigo aqui.
- **Local — `simulateOutOfScope` hook nos testes:** Test helper `runSkill` precisa suportar injecao de eventos sinteticos para teste E2E. Confirmar API em Plano 05 fase-04 (que cria a fixture `v6-with-plan/`). Se hook nao existe, criar em `tests/helpers/skill-runner.ts` como extensao opcional.
- **Local — ordem do bloco no SKILL.md:** O bloco "Captura Out-of-Scope" entra **depois** do load do plano (precisa de `Scope`) e **antes** do completion signal (que indica fim). Confirmar localizacao em Plano 05 fase-05.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `'appends out-of-scope item with file classifier when user confirms'` FALHA porque `simulateOutOfScope` hook nao existe ainda + helper `captureToTodoMd` nao existe.
  - Comando: `bun run test -- --grep 'out-of-scope capture'`
  - Resultado esperado: `Expected match, received TODO.md unchanged` (assertion) ou throw em `simulateOutOfScope`

- [ ] **GREEN:** Implementacao do helper TS + bloco SKILL.md + hook em `runSkill`. Todos 5 testes E2E passam + 5 unit tests do formatter.
  - Comando: `bun run test -- --grep 'execute-plan-todo|out-of-scope'`
  - Resultado esperado: `10 passed, 0 failed`

### Checklist

- [ ] Helper `lib/execute-plan-todo-capture.ts` exporta `formatTodoLine` e `captureToTodoMd`
- [ ] Provenance comments (G9)
- [ ] Paths Windows normalizados para forward slashes (G6) — teste explicito
- [ ] Bloco "Captura Out-of-Scope" adicionado ao `skills/execute-plan/SKILL.md`
- [ ] Default da confirmacao eh `N` (D4 filosofia)
- [ ] Fallback quando `Scope` ausente: desativa captura, loga warning
- [ ] CA-33 formato exato: `- [ ] {YYYY-MM-DD} {classifier} descricao`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'execute-plan-todo|out-of-scope'` retorna `10 passed, 0 failed`
- Em fixture `v6-with-plan/` com plano com `Scope: [src/notifications/**]`, ao simular edit em `src/billing/index.ts:42` + confirmacao `s`, `TODO.md` ganha exatamente uma linha matching `/- \[ \] \{\d{4}-\d{2}-\d{2}\} \{file:src\/billing\/index\.ts:42\} .+/` (CA-33)
- Ao declinar (`n`), `TODO.md` permanece inalterado

**Por humano:**
- Rodar `/execute-plan` em projeto real com plano em curso, deliberadamente tentar editar arquivo fora de Scope — confirmar que prompt aparece UMA vez, mensagem eh curta, e captura registra item corretamente

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
