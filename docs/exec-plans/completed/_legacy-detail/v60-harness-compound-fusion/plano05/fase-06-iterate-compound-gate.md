<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 06: Iterate Compound Decision Gate

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 2h
**Depende de:** fase-01 (criacao de compound note), fase-05 (helper `moveToCompleted`)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:iterate` integra o **Compound Decision Gate** (D17): ao detectar plano em `docs/exec-plans/active/` com Exit Criteria todos marcados, oferece interativamente 3 opcoes — capturar compound note / registrar `no_capture_needed` com razao / postergar (`pending-capture`). Se capturar, gera compound note (via fase-01 writer) e move plano para `completed/` (fase-05). Cobre CA-16 e CA-25.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/compound-decision-gate.ts` | Create | Orquestra prompt interativo + 3 fluxos (capture/no-capture/postpone) |
| `anti-vibe-coding/skills/iterate/SKILL.md` | Modify | Adicionar bloco "Compound Decision Gate" antes do encerramento |
| `anti-vibe-coding/skills/iterate/index.ts` | Modify | Chamar `runCompoundGate` entre hardening tradicional e fim |
| `anti-vibe-coding/tests/compound-decision-gate.test.ts` | Create | RED→GREEN com mock de user input para 3 caminhos |

---

## Implementacao

### Passo 1: `lib/compound-decision-gate.ts`

```typescript
// 2026-05-11 (Luiz/dev): Compound Decision Gate — D17 + CA-25
// Fluxo: detectar plano completo → perguntar → 3 caminhos
import { writeCompoundNote } from './compound-note-writer'
import { moveToCompleted } from './exec-plan-mover'
import { readExecPlan } from './exec-plan-reader'
import { resolvePaths } from './path-resolver-v6'
import { promises as fs } from 'node:fs'

export type GateChoice = 'capture' | 'no_capture_needed' | 'postpone'

export type GateContext = {
  projectRoot: string
  planPath: string
}

export type GatePromptFn = (planTitle: string) => Promise<{
  choice: GateChoice
  // se capture: dados da licao a registrar
  captureInput?: { title: string; problem: string; solution: string; prevention: string; tags?: string[] }
  // se no_capture_needed: razao curta para telemetria
  noCaptureReason?: string
}>

export type GateResult = {
  choice: GateChoice
  planMoved: boolean
  compoundCreatedPath?: string
  noCaptureReason?: string
}

export async function runCompoundGate(
  ctx: GateContext,
  prompt: GatePromptFn,
): Promise<GateResult> {
  const plan = await readExecPlan(ctx.planPath)
  const response = await prompt(plan.frontmatter.title)

  // 2026-05-11 (Luiz/dev): hash-map de handlers > switch (CLAUDE.md global)
  const handlers: Record<GateChoice, () => Promise<GateResult>> = {
    capture: async () => {
      if (!response.captureInput) {
        throw new Error('captureInput required for capture choice')
      }
      const paths = await resolvePaths(ctx.projectRoot)
      const { filePath } = await writeCompoundNote(paths.compoundDir, {
        title: response.captureInput.title,
        problem: response.captureInput.problem,
        solution: response.captureInput.solution,
        prevention: response.captureInput.prevention,
        tags: response.captureInput.tags,
        category: 'compound-from-plan',
      })
      const moved = await moveToCompleted(ctx.projectRoot, ctx.planPath)
      return { choice: 'capture', planMoved: true, compoundCreatedPath: filePath }
    },
    no_capture_needed: async () => {
      // 2026-05-11 (Luiz/dev): registrar razao na Validation Log do plano antes de mover
      await appendValidationLog(ctx.planPath, `no_capture_needed: ${response.noCaptureReason ?? '(no reason)'}`)
      await moveToCompleted(ctx.projectRoot, ctx.planPath)
      return { choice: 'no_capture_needed', planMoved: true, noCaptureReason: response.noCaptureReason }
    },
    postpone: async () => {
      // 2026-05-11 (Luiz/dev): adiciona tag pending-capture ao frontmatter, plano FICA em active/
      // Ambiguity 05-A4 documentada
      await setPlanStatus(ctx.planPath, 'pending-capture')
      return { choice: 'postpone', planMoved: false }
    },
  }

  return handlers[response.choice]()
}

async function appendValidationLog(planPath: string, line: string): Promise<void> {
  const raw = await fs.readFile(planPath, 'utf-8')
  // 2026-05-11 (Luiz/dev): inserir linha no fim da secao Validation Log; defensivo se secao nao existir
  const today = new Date().toISOString().slice(0, 10)
  const entry = `- ${today}: ${line}\n`
  const updated = raw.replace(
    /(## Validation Log\n[\s\S]*?)(?=\n## |\n*$)/,
    (_, block) => `${block}${entry}`,
  )
  await fs.writeFile(planPath, updated, 'utf-8')
}

async function setPlanStatus(planPath: string, status: 'pending-capture'): Promise<void> {
  const raw = await fs.readFile(planPath, 'utf-8')
  const updated = raw.replace(/^(status:\s*)\S+$/m, `$1${status}`)
  await fs.writeFile(planPath, updated, 'utf-8')
}
```

### Passo 2: integracao em `skills/iterate/index.ts`

```typescript
// 2026-05-11 (Luiz/dev): /iterate v6 — adiciona Compound Decision Gate antes do encerramento
import { runCompoundGate } from '../../lib/compound-decision-gate'
import { listActivePlans } from '../../lib/exec-plan-mover'
import { readExecPlan, isComplete } from '../../lib/exec-plan-reader'

export async function iterate(
  promptUser: GatePromptFn,                 // injetado pelo orquestrador da skill
  projectRoot: string = process.cwd(),
): Promise<{ gatesRun: number }> {
  // ... fluxo existente: incident-response, hardening, etc

  // 2026-05-11 (Luiz/dev): NOVO — Compound Decision Gate (D17, CA-25)
  const activePaths = await listActivePlans(projectRoot)
  let gatesRun = 0
  for (const planPath of activePaths) {
    const plan = await readExecPlan(planPath)
    if (!isComplete(plan)) continue
    await runCompoundGate({ projectRoot, planPath }, promptUser)
    gatesRun++
  }
  return { gatesRun }
}
```

### Passo 3: atualizar `skills/iterate/SKILL.md`

Acrescentar antes do "End of flow":

````markdown
## Compound Decision Gate (D17 — NOVO em v6)

```
APOS incident-response + hardening, ANTES de encerrar:

1. Listar planos em docs/exec-plans/active/ com isComplete() === true
2. Para cada plano completo, perguntar ao usuario:
   "Plano '{titulo}' esta completo. Esse trabalho ensinou algo durável que
    outro agente/humano usaria? [Sim - capturar / Nao - registrar razao / Pensar mais]"
3. Caminhos:
   a. Capturar → coletar (title, problem, solution, prevention) → gerar compound note → mover plano para completed/
   b. Registrar razao → appendar linha em Validation Log do plano → mover para completed/
   c. Pensar mais → atualizar frontmatter status: pending-capture → plano FICA em active/
4. Telemetria: emitir evento iterate.compound_gate { choice, plan_slug }
```
````

---

## Gotchas

- **G6 do plano (fluxo do Compound Gate):** 3 caminhos + ordem detalhada em pseudo-codigo no SKILL.md. Razao: orquestrador LLM precisa de logica explicita em bloco.
- **Ambiguity 05-A4 resolvida:** "Pensar mais" mantem em `active/` com tag `pending-capture`. Validador (Plano 04) precisa aceitar esse status — Plano 06 fase-03 (STATE.md) tambem deve enumerar planos `pending-capture` em secao Pending.
- **Local 06-G1 (mock do user input nos testes):** Skill atual provavelmente usa stdin interativo. Para teste TDD, injetar `GatePromptFn` como dependencia (inversao de controle). Funcao production lê stdin, mock retorna `{ choice: 'capture', captureInput: { ... } }`.
- **Local 06-G2 (race iterate vs execute-plan):** Se `/execute-plan` ja moveu plano (via `onPlanPotentiallyComplete`), `/iterate` nao encontrara em `active/`. Aceito — Compound Gate so dispara se plano permaneceu em active (ex: `/execute-plan` falhou ao mover, ou usuario rodou `/iterate` antes de `/execute-plan` encerrar). Documentar.
- **Local 06-G3 (texto da pergunta em PT-BR ou EN?):** Skills do plugin em PT (CLAUDE.md global). Mensagem de prompt eh **pelo dev usuario** — manter em PT. Frontmatter/codigo em EN.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `runCompoundGate captures lesson and moves plan` — mock retorna `{ choice: 'capture', captureInput: { title: 'X', problem: '...', ... } }`. Espera (1) arquivo em `docs/compound/`, (2) plano sumiu de `active/` e apareceu em `completed/`
  - Comando: `bun test tests/compound-decision-gate.test.ts --grep 'captures lesson'`
  - Resultado esperado: arquivo nao foi criado (falha)

- [ ] **GREEN:** apos implementacao, ambas assercoes passam

### Checklist

- [ ] `runCompoundGate` aceita `GatePromptFn` injetada (testavel)
- [ ] Caminho **capture**: cria compound note via `writeCompoundNote` + chama `moveToCompleted` + retorna `compoundCreatedPath`
- [ ] Caminho **no_capture_needed**: appenda linha em Validation Log com formato `- YYYY-MM-DD: no_capture_needed: {razao}` + move plano
- [ ] Caminho **postpone**: atualiza `status: active` para `status: pending-capture` no frontmatter; plano permanece em `active/`
- [ ] Cenario edge: chamar `runCompoundGate` em plano NAO completo deve lancar erro ou retornar early (verificar via teste)
- [ ] Telemetria: stubbar `telemetry.emit` e verificar evento `iterate.compound_gate` emitido em todos os 3 caminhos com `choice` correto
- [ ] Integracao com `iterate.ts`: rodar `iterate` em fixture v6 com 2 planos (1 completo + 1 ativo) processa **so o completo**
- [ ] Testes passam: `bun run test`
- [ ] Lint + typecheck

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/compound-decision-gate.test.ts` exit 0 com >=4 testes (3 caminhos + edge)
- Apos teste de `capture`: `ls docs/compound/*.md | wc -l` aumenta em 1; `ls docs/exec-plans/completed/{slug}.md` existe
- `bun run compound:check` (Plano 04) exit 0 sobre o compound recem-criado

**CA do PRD coberto:**
- CA-16 (verbatim): "Dado plugin v6 e plano em `docs/exec-plans/active/foo.md` completo, quando rodar `/iterate`, então dispara Compound Decision Gate, move plano para `docs/exec-plans/completed/` se aceito."
- CA-25 (verbatim): "Dado plano ativo completo, quando rodar `/iterate`, então Compound Decision Gate é executado e usuário pode escolher: capturar lição / registrar 'no capture needed' com razão / postergar."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
