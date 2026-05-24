<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
-->

# Fase 03: Subcomando `gate` (delegacao via Skill tool)

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 2h
**Depende de:** fase-01 (skill compound-engineering operacional) + `skills/lessons-learned` v6.x estavel (RT-02)
**Visual:** false

---

## O que esta fase entrega

Subcomando `compound-engineering gate` operacional: detecta plano ativo unico em `docs/exec-plans/active/`, faz 3 perguntas (bug/review/production) ao dev, delega criacao da nota para `lessons-learned add` via Skill tool nativa (D20/CA-16), atualiza secao `## Lessons Captured` do plano com link OU `no compound capture needed because X`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/gate.ts` | Create | `runGate(targetRoot): Promise<GateResult>` — orquestra deteccao + perguntas + delegacao |
| `skills/compound-engineering/lib/gate.test.ts` | Create | Testes cobrindo CA-07 (captura), CA-08 (no capture), CA-18 (zero planos), CA-19 (multiplos planos) |
| `skills/compound-engineering/lib/invoke-lessons-learned.ts` | Create | Helper isolado para Skill tool (mitigacao R9) — encapsula `Skill({ skill: 'anti-vibe-coding:lessons-learned', args })` |
| `skills/compound-engineering/lib/active-plan-detector.ts` | Create | `detectActivePlan(targetRoot): Promise<ActivePlanResult>` — retorna `single`, `multiple` (com lista) ou `none` |
| `skills/compound-engineering/lib/lessons-captured-updater.ts` | Create | `updateLessonsCaptured(planPath, content): Promise<void>` — patcha secao `## Lessons Captured` no PLAN.md alvo |
| `skills/compound-engineering/SKILL.md` | Modify | Adiciona case `gate` no parser de args + bloco de prompt para as 3 perguntas |
| `skills/compound-engineering/references/capture-guide.md` | Modify | Preenche placeholder criado em Plano 01 fase-01 com guia de captura (knowledge interno D13) |

---

## Implementacao

### Passo 1: `active-plan-detector.ts`

```typescript
// 2026-05-23 (Luiz/dev): detecta plano ativo unico/multiplo/zero — PRD CA-18/19
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ActivePlanResult =
  | { status: 'single'; planPath: string; slug: string }
  | { status: 'multiple'; candidates: Array<{ planPath: string; slug: string }> }
  | { status: 'none' }

export async function detectActivePlan(targetRoot: string): Promise<ActivePlanResult> {
  const activeDir = path.join(targetRoot, 'docs', 'exec-plans', 'active')
  let entries: string[]
  try {
    entries = await fs.readdir(activeDir)
  } catch {
    return { status: 'none' }
  }

  // 2026-05-23 (Luiz/dev): plano = subdir com PLAN.md (v6 layout) — Assumption do PLAN.md
  const candidates: Array<{ planPath: string; slug: string }> = []
  for (const entry of entries) {
    const subdir = path.join(activeDir, entry)
    const stat = await fs.stat(subdir).catch(() => null)
    if (!stat || !stat.isDirectory()) continue
    const planMd = path.join(subdir, 'PLAN.md')
    const planExists = await fs.access(planMd).then(() => true).catch(() => false)
    if (planExists) candidates.push({ planPath: planMd, slug: entry })
  }

  if (candidates.length === 0) return { status: 'none' }
  if (candidates.length === 1) return { status: 'single', ...candidates[0] }
  return { status: 'multiple', candidates }
}
```

### Passo 2: `invoke-lessons-learned.ts` (helper R9 mitigacao)

```typescript
// 2026-05-23 (Luiz/dev): encapsula Skill tool — D20 + R9 (substituivel se interface mudar)
// IMPORTANTE: nao usa subprocess (D20 rejected). Nao importa lib de lessons-learned (CA-17).

export type InvokeLessonsResult = {
  invoked: boolean
  noteCreated?: string // path da nota se completion signal trouxer
  rawOutput: string
}

/**
 * Invoca lessons-learned via Skill tool nativa.
 * NOTA: como esta funcao roda DENTRO de uma skill, a invocacao real e feita pelo
 * runtime do Claude Code interpretando a instrucao Skill tool no markdown do SKILL.md.
 * Esta funcao apenas estrutura o payload e parseia o completion signal de retorno.
 */
export function buildLessonsLearnedInvocation(title: string): string {
  // 2026-05-23 (Luiz/dev): args literal compativel com lessons-learned add — RT-02
  return `add "${title.replace(/"/g, '\\"')}"`
}

export function parseLessonsLearnedCompletion(output: string): InvokeLessonsResult {
  // 2026-05-23 (Luiz/dev): completion signal YAML padrao — D33 da lessons-learned
  const yamlBlockMatch = output.match(/```yaml\s*\n([\s\S]*?)\n```/)
  if (!yamlBlockMatch) return { invoked: true, rawOutput: output }
  const yaml = yamlBlockMatch[1]
  const noteCreatedMatch = yaml.match(/note_created:\s*['"]?([^'"\n]+)['"]?/)
  return {
    invoked: true,
    noteCreated: noteCreatedMatch?.[1]?.trim(),
    rawOutput: output,
  }
}
```

### Passo 3: `lessons-captured-updater.ts`

```typescript
// 2026-05-23 (Luiz/dev): patcha secao `## Lessons Captured` do PLAN.md alvo — D10 + CA-07/08
import { promises as fs } from 'node:fs'

export async function updateLessonsCaptured(
  planPath: string,
  content: string,
): Promise<void> {
  const original = await fs.readFile(planPath, 'utf-8')
  const sectionRegex = /(## Lessons Captured\s*\n)([\s\S]*?)(\n##\s|\n*$)/
  const match = original.match(sectionRegex)

  // 2026-05-23 (Luiz/dev): se secao ausente, append no fim (degraded path)
  if (!match) {
    await fs.writeFile(planPath, `${original}\n\n## Lessons Captured\n\n${content}\n`)
    return
  }

  const replaced = original.replace(sectionRegex, `$1\n${content}\n$3`)
  await fs.writeFile(planPath, replaced)
}
```

### Passo 4: `gate.ts` orquestrador

```typescript
// 2026-05-23 (Luiz/dev): gate — PRD MH-06/RF-06
import { detectActivePlan } from './active-plan-detector'
import { buildLessonsLearnedInvocation, parseLessonsLearnedCompletion } from './invoke-lessons-learned'
import { updateLessonsCaptured } from './lessons-captured-updater'

export type GateAnswers = {
  bug: { answer: 'yes' | 'no'; details?: string }
  review: { answer: 'yes' | 'no'; details?: string }
  production: { answer: 'yes' | 'no'; details?: string }
  noCaptureReason?: string // se todos 'no'
  selectedPlanPath?: string // se status era 'multiple'
}

export type GateResult = {
  status: 'captured' | 'no-capture' | 'no-plan' | 'multiple-plans'
  planPath?: string
  notePath?: string
  message: string
}

export async function runGate(
  targetRoot: string,
  // 2026-05-23 (Luiz/dev): answers + invokeSkill injetados pelo SKILL.md runtime — testavel via mock
  answers: GateAnswers,
  invokeSkill: (skill: string, args: string) => Promise<string>,
): Promise<GateResult> {
  const plan = await detectActivePlan(targetRoot)

  if (plan.status === 'none') {
    return {
      status: 'no-plan',
      message: 'No active plan found. Run /plan-feature first or specify --plan path.',
    }
  }

  let planPath: string
  if (plan.status === 'multiple') {
    if (!answers.selectedPlanPath) {
      return { status: 'multiple-plans', message: 'Multiple active plans — selectedPlanPath required' }
    }
    planPath = answers.selectedPlanPath
  } else {
    planPath = plan.planPath
  }

  const captured = answers.bug.answer === 'yes' || answers.review.answer === 'yes' || answers.production.answer === 'yes'

  if (!captured) {
    const reason = answers.noCaptureReason ?? 'no reason given'
    await updateLessonsCaptured(planPath, `no compound capture needed because: ${reason}`)
    return {
      status: 'no-capture',
      planPath,
      message: `Logged 'no compound capture needed' in plan's Lessons Captured section`,
    }
  }

  // 2026-05-23 (Luiz/dev): titulo derivado da primeira resposta 'yes' — heuristica simples
  const title = pickFirstYesDetails(answers) ?? 'compound capture from gate'
  const args = buildLessonsLearnedInvocation(title)
  const rawOutput = await invokeSkill('anti-vibe-coding:lessons-learned', args)
  const parsed = parseLessonsLearnedCompletion(rawOutput)

  const notePath = parsed.noteCreated ?? 'docs/compound/<see lessons-learned output>'
  await updateLessonsCaptured(planPath, `- Lesson captured: [${notePath}](../../${notePath})`)
  return {
    status: 'captured',
    planPath,
    notePath,
    message: `Lesson captured: ${notePath}. Linked in plan's Lessons Captured section.`,
  }
}

function pickFirstYesDetails(answers: GateAnswers): string | undefined {
  if (answers.bug.answer === 'yes') return answers.bug.details
  if (answers.review.answer === 'yes') return answers.review.details
  if (answers.production.answer === 'yes') return answers.production.details
  return undefined
}
```

### Passo 5: Plugar no SKILL.md

Caso `gate` no parser de args:

```markdown
### Subcomando: gate

Quando `args` comeca com `gate`:

1. Invoca `detectActivePlan(targetRoot)`.
2. Se `status === 'none'`: imprime `No active plan found. Run /plan-feature first or specify --plan path.` e exit 0.
3. Se `status === 'multiple'`: use `AskUserQuestion` com cada plano como opcao (singleSelect). Set `selectedPlanPath`.
4. Faz 3 perguntas (uma de cada vez):
   - "Algum bug aprendido aqui que outro dev/agente futuro poderia ter evitado se soubesse?"
   - "Algum review/checklist falhou de forma que indica padrao repetivel?"
   - "Algum issue de producao/operacional revelado durante esta feature?"
5. Se qualquer 'sim': pergunte titulo curto. Invoca Skill tool:
   `Skill({ skill: 'anti-vibe-coding:lessons-learned', args: 'add "<titulo>"' })`
6. Se todos 'nao': pergunta razao curta. Atualiza `## Lessons Captured` com `no compound capture needed because: <razao>`.
```

### Passo 6: Preencher `references/capture-guide.md`

Substituir placeholder criado em Plano 01 fase-01 por guia de captura (knowledge interno D13). Conteudo orienta o agente sobre:
- Quais sinais sugerem captura (bug nao-obvio, review falhou, producao tossiu)
- Quando NAO capturar (fix trivial, mudanca cosmetica)
- Como formular titulo (curto, declarativo, indexavel)

---

## Gotchas

- **G2 do README (R4 + CA-19):** multiplos planos ativos exige `AskUserQuestion`. `gate.test.ts` injeta `answers.selectedPlanPath` via mock.
- **G3 do README (R8 + CA-17):** `gate.ts` NAO importa nada de `skills/lessons-learned/`. Apenas invoca via Skill tool. Validar via grep.
- **G4 do README (R9):** `invoke-lessons-learned.ts` e o unico ponto de troca se a interface da Skill tool mudar. Mantenha-o pequeno e isolado.
- **Local:** `runGate` recebe `invokeSkill` como dependencia injetada — isso permite testes unitarios sem precisar do runtime Claude. SKILL.md substitui pelo runtime real.
- **Local:** `updateLessonsCaptured` e idempotente em estrutura mas NAO em conteudo — re-rodar gate gera append. Considerar dedup futura, fora do escopo v1.

---

## Verificacao

### TDD

- [ ] **RED:** `gate.test.ts` falha antes da implementacao
  - Comando: `bun test skills/compound-engineering/lib/gate.test.ts --grep 'CA-07 captura com sim'`
  - Resultado esperado: `Expected status === 'captured'`, recebido `undefined` (assertion failure)

- [ ] **GREEN:** `gate.ts` + libs implementadas, todos os 4 testes passam
  - Comando: `bun test skills/compound-engineering/lib/gate.test.ts`
  - Resultado esperado: `4 passed, 0 failed` (CA-07, CA-08, CA-18, CA-19)

### Checklist

- [ ] CA-07: plano ativo unico + 1 'yes' → Skill tool invocada com `args: 'add "<titulo>"'` e PLAN.md atualizado com link
- [ ] CA-08: plano ativo + 3 'no' + razao → PLAN.md `## Lessons Captured` recebe `no compound capture needed because: <razao>`
- [ ] CA-16: grep em `gate.ts` por `Bun.spawn` ou `child_process` retorna 0 (NAO usa subprocess para lessons-learned)
- [ ] CA-17: grep em `skills/compound-engineering/**/*.ts` por `from '../../init/` retorna 0
- [ ] CA-18: target sem `docs/exec-plans/active/` ou vazio → status `no-plan` + mensagem literal
- [ ] CA-19: target com 2+ planos → status `multiple-plans` quando `selectedPlanPath` ausente
- [ ] `invoke-lessons-learned.ts` < 50 linhas (mantem helper pequeno — G4)
- [ ] Testes passam: `bun test skills/compound-engineering/lib/`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/compound-engineering/lib/gate.test.ts` retorna 4 passed (CA-07/08/18/19)
- `grep -r 'from .*lessons-learned' skills/compound-engineering/` retorna 0 (CA-17 inverso — compound-engineering nao importa lessons-learned)
- `grep -rE 'Bun\.spawn|child_process' skills/compound-engineering/lib/gate.ts skills/compound-engineering/lib/invoke-lessons-learned.ts` retorna 0 (CA-16)

**Por humano:**
- Rodar `gate` no proprio repo Anti-Vibe-Coding com plano ativo desta feature `compound-engineering-skill-port`, responder 'yes' a uma das 3, observar Skill tool sendo invocada e nota aparecendo em `docs/compound/`

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
