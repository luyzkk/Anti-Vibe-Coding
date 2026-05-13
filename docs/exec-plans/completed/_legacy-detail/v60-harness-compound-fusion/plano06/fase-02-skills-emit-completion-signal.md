<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: skills-emit-completion-signal

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 2h
**Depende de:** fase-01 (helper `lib/completion-signal.ts` disponivel)
**Visual:** false

---

## O que esta fase entrega

As 6 skills migradas em Plano 05 invocam `renderCompletionSignal()` ao fim do output, emitindo bloco YAML parseavel. Cobertura: `/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`, `/execute-plan` (CA-47, S12).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lessons-learned/SKILL.md` | Modify | Adicionar bloco de emissao do signal apos write da compound note |
| `anti-vibe-coding/skills/decision-registry/SKILL.md` | Modify | Idem, apos write do ADR |
| `anti-vibe-coding/skills/iterate/SKILL.md` | Modify | Emitir signal apos Compound Gate concluido (merge point dos 3 ramos) |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Emitir signal apos escrever todos os planoNN/ |
| `anti-vibe-coding/skills/quick-plan/SKILL.md` | Modify | Emitir signal apos renderizar mini-plano |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Emitir signal apos mover plano para `completed/` |
| `anti-vibe-coding/skills/lessons-learned/lessons-learned.ts` | Modify | Importar `renderCompletionSignal` e chamar antes do return final (se helper TS auxiliar existir; senao instrucao fica so em SKILL.md) |
| `anti-vibe-coding/skills/decision-registry/decision-registry.ts` | Modify | Idem |
| `anti-vibe-coding/tests/completion-signal-emission.test.ts` | Create | E2E: invoca cada skill via fixture v6 e verifica presenca do bloco YAML no stdout |

**Nota:** Estrutura de arquivos `.ts` interno por skill depende de como Plano 05 finalizou cada skill. Se uma skill nao tem `.ts` separado (so SKILL.md), a emissao fica no proprio SKILL.md como instrucao executavel dentro de bloco de codigo (CLAUDE.md: instrucoes executaveis pertencem a blocos).

---

## Implementacao

### Passo 1: Padrao de emissao por skill

Para cada uma das 6 skills, no ponto de saida final (apos todas as side-effects de filesystem), inserir:

```typescript
// 2026-05-11 (Luiz/dev): completion signal emitido aqui — fim do fluxo da skill (D33/S12/CA-47)
// IDEMPOTENCIA: este eh o UNICO ponto de chamada — multiplos exit points (ex: ramos do
// Compound Gate em /iterate) convergem aqui via merge.
import { renderCompletionSignal } from '../../lib/completion-signal'

const signal = renderCompletionSignal({
  skill: 'lessons-learned',
  status: 'complete',
  outputs: [path.relative(projectRoot, writtenPath)],
  next_suggested: null,
  blocks_for_user: [],
})

console.log(mainOutput + '\n\n' + signal)
```

### Passo 2: Mapeamento por skill (campos especificos)

| Skill | `next_suggested` | `outputs` |
|-------|------------------|-----------|
| `/lessons-learned` (add) | null | `[docs/compound/{date}-{slug}.md]` |
| `/decision-registry` (add) | null | `[docs/design-docs/ADR-NNNN-{slug}.md]` |
| `/iterate` | `/lessons-learned` se Compound Gate retornou "Sim e capturar"; null senao | plano movido para `completed/` + (opcional) compound note criada |
| `/plan-feature` | `/execute-plan` | `[.planning/{date-slug}/PRD.md, .planning/{date-slug}/PLAN.md, .planning/{date-slug}/planoNN/...]` |
| `/quick-plan` | `/execute-plan` ou null (quick-plan eh standalone) | `[.planning/{date-slug}/PLAN.md]` ou similar |
| `/execute-plan` | `/iterate` se plano concluido; `/execute-plan` se proximo plano disponivel; null se ultimo plano | `[docs/exec-plans/completed/{plan}.md]` |

### Passo 3: Tratamento de `status: 'blocked'`

Se skill encerra esperando input do usuario (ex: `/grill-me` parou em pergunta), emitir:

```typescript
renderCompletionSignal({
  skill: 'grill-me',
  status: 'blocked',
  outputs: [],
  next_suggested: null,
  blocks_for_user: ['Resposta a pergunta 3: arquitetura escolhida'],
})
```

Para as 6 skills migradas em Plano 05, `blocked` raramente acontece (skills sao batch). Documentar caso a caso em SKILL.md.

### Passo 4: Teste E2E de cobertura

```typescript
// anti-vibe-coding/tests/completion-signal-emission.test.ts
// 2026-05-11 (Luiz/dev): valida CA-47 verbatim — cada skill emite bloco YAML
// FIXTURE: tests/fixtures/v6-with-plan/ (de Plano 05 fase-04)
import { describe, it, expect } from 'bun:test'
import { extractCompletionSignal } from '../lib/completion-signal'
import { runSkill } from './helpers/run-skill' // helper que invoca skill em subprocess

const SKILLS_AND_INPUTS: ReadonlyArray<{ skill: string; argv: string[]; expectStatus: 'complete' | 'blocked' }> = [
  { skill: 'lessons-learned', argv: ['add', 'teste fase-02'], expectStatus: 'complete' },
  { skill: 'decision-registry', argv: ['add', 'teste fase-02'], expectStatus: 'complete' },
  { skill: 'iterate', argv: [], expectStatus: 'complete' }, // fixture tem plano com Exit Criteria
  { skill: 'plan-feature', argv: ['--from-prd', './fixtures/v6-with-plan/.planning/sample/PRD.md'], expectStatus: 'complete' },
  { skill: 'quick-plan', argv: ['migrate config'], expectStatus: 'complete' },
  { skill: 'execute-plan', argv: ['--plan', '01'], expectStatus: 'complete' },
]

describe('all 6 migrated skills emit valid completion signal (CA-47)', () => {
  for (const { skill, argv, expectStatus } of SKILLS_AND_INPUTS) {
    it(`${skill} emits parseable YAML block with status=${expectStatus}`, async () => {
      const stdout = await runSkill(skill, argv, { fixture: 'v6-with-plan' })
      const parsed = extractCompletionSignal(stdout)

      expect(parsed).not.toBeNull()
      expect(parsed?.skill).toBe(skill)
      expect(parsed?.status).toBe(expectStatus)
      expect(Array.isArray(parsed?.outputs)).toBe(true)
      expect(Array.isArray(parsed?.blocks_for_user)).toBe(true)
    })
  }
})
```

### Passo 5: Helper `runSkill` (tests/helpers/)

```typescript
// anti-vibe-coding/tests/helpers/run-skill.ts
// 2026-05-11 (Luiz/dev): helper de teste — invoca skill em subprocess isolado
import { spawnSync } from 'child_process'
import * as path from 'path'

export async function runSkill(
  skill: string,
  argv: string[],
  opts: { fixture: string }
): Promise<string> {
  const fixtureRoot = path.resolve(__dirname, '..', 'fixtures', opts.fixture)
  // 2026-05-11 (Luiz/dev): assume cada skill tem entry-point TS executavel via bun
  const skillEntry = path.resolve(__dirname, '..', '..', 'skills', skill, 'index.ts')
  const result = spawnSync('bun', [skillEntry, ...argv], {
    cwd: fixtureRoot,
    env: { ...process.env, ANTI_VIBE_DISABLE_HOOKS: '1' }, // herda de Plano 05 G3
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    throw new Error(`skill ${skill} exited with ${result.status}: ${result.stderr}`)
  }
  return result.stdout
}
```

**Nota:** Se skills nao tem `index.ts` executavel (skills do Claude Code rodam via prompt + tool calls), substituir por invocacao via Claude Code CLI ou mock que carrega SKILL.md e simula execucao do helper TS. Validar com user antes — depende de como Plano 05 estruturou a invocacao programatica das skills.

---

## Gotchas

- **G2 do plano (append ao output existente):** Signal nao substitui output principal — concatena com `'\n\n'` apos.
- **G14 do plano (idempotencia eh contrato com a skill):** Skills com multiplos exit points (ex: `/iterate` 3 ramos do Compound Gate) devem convergir em merge point antes de chamar `renderCompletionSignal`. Auditar visualmente cada skill.
- **G13 do plano (R16 fallback gracioso):** Se uma das 6 skills falhar em emitir, teste correspondente falha mas as outras 5 continuam. Documentar como "falha isolada" — nao bloqueia merge do plano.
- **Local — `outputs` path absolute vs relative:** Decisao: paths **relativos a `projectRoot`** (mais portavel em logs). Usar `path.relative(projectRoot, absolutePath)`. Sem `..` no inicio (skill escreveu dentro do projeto).
- **Local — invocacao programatica de skill:** Se skills sao puramente prompt-based (SKILL.md + agent tool calls), helper `runSkill` precisa de adapter. Ambiguity 06-A-extra: validar antes de implementar Passo 4.

---

## Verificacao

### TDD

- [ ] **RED:** Teste E2E rodado antes de modificar skills, FALHA por `expect(parsed).not.toBeNull()` em todas as 6
  - Comando: `cd anti-vibe-coding && bun test tests/completion-signal-emission.test.ts`
  - Resultado esperado: `6 fail, 0 pass` com mensagem "received null"

- [ ] **GREEN:** Cada skill adiciona emissao + cada teste passa individualmente
  - Comando: `cd anti-vibe-coding && bun test tests/completion-signal-emission.test.ts`
  - Resultado esperado: `6 pass, 0 fail`

### Checklist

- [ ] `/lessons-learned add "x"` em fixture v6 emite bloco YAML com `skill: lessons-learned`
- [ ] `/decision-registry add "y"` em fixture v6 emite bloco com `skill: decision-registry`
- [ ] `/iterate` em fixture com plano Exit-Criteria emite bloco com `status: complete`
- [ ] `/plan-feature` em fixture com PRD emite bloco com `next_suggested: /execute-plan`
- [ ] `/quick-plan "tarefa"` em fixture emite bloco
- [ ] `/execute-plan --plan 01` em fixture com 1 plano emite bloco com `next_suggested: /iterate`
- [ ] Cada bloco eh parseavel via `extractCompletionSignal()`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`
- [ ] `harness:validate` continua exit 0 em fixture v6 (nada quebrou)

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test tests/completion-signal-emission.test.ts` retorna `6 pass, 0 fail`.
- Em fixture `v6-with-plan/`, executar cada uma das 6 skills, capturar stdout, e `extractCompletionSignal(stdout)` retorna objeto valido com `skill` correto.
- CA-47 verbatim: bloco YAML extraido de `/grill-me` (escopo Plano 06 cobre apenas as 6 migradas; `/grill-me` fica para Plano 08 dog-food — registrar como "nao coberto nesta fase" na MEMORY.md).

**Por humano:**

- N/A.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
