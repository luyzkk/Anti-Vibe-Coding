<!--
Princípio universal #5 — Comment Provenance.
Cada decisão não óbvia neste arquivo tem autor, data e justificativa inline.
Não remova comentários de proveniência — eles são o contexto que previne regressões.
-->

# Fase 03: AGENTS.md Template — Extensão Anti-Vibe

**Plano:** 05 — Polish: Idempotência + Fixtures + AGENTS.md
**Sizing:** 1h
**Depende de:** fase-01 (conceptualmente — idempotência valida CA-11 em testes)
**Visual:** false

---

## O que esta fase entrega

Template `AGENTS.md.tpl` estendido com seção `## Anti-Vibe Extensions` referenciando as 4
extensões anti-vibe (DT-10), mais `AGENTS_REQUIRED_LINKS` no harness-validate atualizado com
os 4 novos links. Template final: ≤40 linhas (CA-11), validado pelo harness.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/AGENTS.md.tpl` | Modificar | Adicionar seção Anti-Vibe Extensions com 4 links |
| `scripts/harness-validate.ts` | Modificar | Adicionar 4 links a AGENTS_REQUIRED_LINKS |

---

## Implementacao

### Passo 1: Contagem de linhas do template atual

O template atual (`AGENTS.md.tpl`) tem 30 linhas (29 com conteúdo + 1 linha vazia de EOF).
Verificar antes de modificar:

```bash
wc -l skills/init/assets/templates/AGENTS.md.tpl
# Esperado: 30 (29 content + 1 blank EOF)
# Ou: cat -n skills/init/assets/templates/AGENTS.md.tpl | tail -5
```

Budget disponível: 40 - 30 = 10 linhas.
Extensão planejada: 6 linhas (1 blank + `## Anti-Vibe Extensions` + 1 blank + 4 links).
Total após extensão: 30 + 6 = 36 linhas ≤ 40. ✓

### Passo 2: Modificar `AGENTS.md.tpl`

Inserir a seção `## Anti-Vibe Extensions` após os 5 links existentes em `## Read Before Major Changes`,
imediatamente antes de `## Required Working Rules`.

**Estado atual (linhas 3-9):**
```markdown
## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.

## Required Working Rules
```

**Estado após modificação (linhas 3-16):**
```markdown
## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.

## Anti-Vibe Extensions

- [docs/MERGE_GATES.md](./docs/MERGE_GATES.md): PR gates, TDD enforcement, and quality checklist.
- [docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md): compound engineering and lessons capture.
- [docs/review-checklists/](./docs/review-checklists/): pre-merge review checklists by domain.
- [docs/smoke-flows/](./docs/smoke-flows/): critical user flows for smoke testing.

## Required Working Rules
```

**Template completo após modificação (deve ter ≤40 linhas):**

```
# AGENTS.md

## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.

## Anti-Vibe Extensions

- [docs/MERGE_GATES.md](./docs/MERGE_GATES.md): PR gates, TDD enforcement, and quality checklist.
- [docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md): compound engineering and lessons capture.
- [docs/review-checklists/](./docs/review-checklists/): pre-merge review checklists by domain.
- [docs/smoke-flows/](./docs/smoke-flows/): critical user flows for smoke testing.

## Required Working Rules

1. Keep durable context in the repo, not only in chat history.
2. Update architecture or docs when code changes invalidate them.
3. Use an execution plan for substantial or multi-step work.
4. Prefer small diffs that preserve architectural boundaries.
5. Do not report completion while an active plan is still in `docs/exec-plans/active/`.
6. Run `bun run harness:validate` before opening a PR.

<!-- INIT:DELIVERY_LOOP_SLOT -->

## Pre-Mutation Gate

Before any edit, dependency install, codegen, or formatting rewrite, decide whether the task is substantial. If it is, read `AGENTS.md`, `ARCHITECTURE.md`, and the relevant active plan before editing.

If substantial work has no active plan, create one before mutation. If editing already started, stop, create or update the plan, record current state, then continue.

## Project context

- Name: {{PROJECT_NAME}}
- Stack: {{STACK}}
```

Contagem exata de linhas no template final:
1. `# AGENTS.md`
2. (blank)
3. `## Read Before Major Changes`
4. (blank)
5. `- [ARCHITECTURE.md]...`
6. `- [docs/PLANS.md]...`
7. `- [docs/PRODUCT_SENSE.md]...`
8. `- [docs/QUALITY_SCORE.md]...`
9. `- [docs/SECURITY.md]...`
10. (blank)
11. `## Anti-Vibe Extensions`
12. (blank)
13. `- [docs/MERGE_GATES.md]...`
14. `- [docs/COMPOUND_ENGINEERING.md]...`
15. `- [docs/review-checklists/]...`
16. `- [docs/smoke-flows/]...`
17. (blank)
18. `## Required Working Rules`
19. (blank)
20. `1. Keep durable context...`
21. `2. Update architecture...`
22. `3. Use an execution plan...`
23. `4. Prefer small diffs...`
24. `5. Do not report completion...`
25. `6. Run bun run harness:validate...`
26. (blank)
27. `<!-- INIT:DELIVERY_LOOP_SLOT -->`
28. (blank)
29. `## Pre-Mutation Gate`
30. (blank)
31. `Before any edit...`
32. (blank)
33. `If substantial work...`
34. (blank)
35. `## Project context`
36. (blank)
37. `- Name: {{PROJECT_NAME}}`
38. `- Stack: {{STACK}}`
39. (blank EOF)

**Total: 39 linhas ≤ 40 ✓** (CA-11 satisfeito)

### Passo 3: Modificar `AGENTS_REQUIRED_LINKS` em `scripts/harness-validate.ts`

Localizar a constante `AGENTS_REQUIRED_LINKS` (atualmente linhas 44-48 do harness-validate.ts):

**Estado atual:**
```typescript
const AGENTS_REQUIRED_LINKS = [
  '[ARCHITECTURE.md](./ARCHITECTURE.md)',
  '[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)',
  '[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)',
] as const
```

**Estado após modificação:**
```typescript
// 2026-05-14 (Luiz/dev): Plano 05 fase-03 — DT-10: 4 extensões anti-vibe adicionadas.
// Links devem corresponder exatamente ao AGENTS.md.tpl — qualquer diferença de texto
// causa falso negativo no content.includes(link) check.
const AGENTS_REQUIRED_LINKS = [
  '[ARCHITECTURE.md](./ARCHITECTURE.md)',
  '[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)',
  '[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)',
  // Anti-vibe extensions (DT-10 — category: 'anti-vibe-extension')
  '[docs/MERGE_GATES.md](./docs/MERGE_GATES.md)',
  '[docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md)',
  '[docs/review-checklists/](./docs/review-checklists/)',
  '[docs/smoke-flows/](./docs/smoke-flows/)',
] as const
```

**Verificar que o `checkAgentsConstraints` usa o array corretamente** (já usa `for...of AGENTS_REQUIRED_LINKS`
com `content.includes(link)` — nenhuma mudança lógica necessária, apenas o array).

### Passo 4: Testes da extensão

Criar ou adicionar ao suite existente de testes do template:

```typescript
// tests/agents-md-template.test.ts
// 2026-05-14 (Luiz/dev): Plano 05 fase-03 — CA-11: AGENTS.md.tpl ≤40 linhas + 4 anti-vibe links.
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const TEMPLATE_PATH = path.join(
  import.meta.dir,
  '../skills/init/assets/templates/AGENTS.md.tpl',
)

const AGENTS_MAX_LINES = 40

const ANTI_VIBE_LINKS = [
  '[docs/MERGE_GATES.md](./docs/MERGE_GATES.md)',
  '[docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md)',
  '[docs/review-checklists/](./docs/review-checklists/)',
  '[docs/smoke-flows/](./docs/smoke-flows/)',
] as const

describe('AGENTS.md.tpl', () => {
  it(`has ≤${AGENTS_MAX_LINES} lines (CA-11)`, async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(AGENTS_MAX_LINES)
  })

  it('contains all 4 anti-vibe extension links (DT-10)', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    for (const link of ANTI_VIBE_LINKS) {
      expect(content).toContain(link)
    }
  })

  it('has ## Anti-Vibe Extensions section', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('## Anti-Vibe Extensions')
  })

  it('retains original 5 core links', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('[ARCHITECTURE.md](./ARCHITECTURE.md)')
    expect(content).toContain('[docs/PLANS.md](./docs/PLANS.md)')
    expect(content).toContain('[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)')
    expect(content).toContain('[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)')
    expect(content).toContain('[docs/SECURITY.md](./docs/SECURITY.md)')
  })

  it('retains INIT:DELIVERY_LOOP_SLOT comment', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->')
  })
})
```

### Passo 5: Verificar harness-validate após modificação

Após modificar `AGENTS_REQUIRED_LINKS`, rodar o harness completo para confirmar que o repo
atual (que JÁ tem os 4 links no seu próprio `AGENTS.md`) continua passando:

```bash
bun run harness:validate
# Esperado: exit 0 — validation passed
```

Se o `AGENTS.md` do repo Anti-Vibe-Coding ainda não tiver os 4 links, o harness vai falhar.
Nesse caso, adicionar os links ao `AGENTS.md` do próprio repo também (dogfood). Mas isso
está fora do escopo desta fase — registrar como gotcha se ocorrer.

---

## Gotchas

**G1 — Contagem de linhas inclui linha vazia de EOF:** `content.split('\n').length` conta
a linha vazia após o último `\n`. O template deve terminar com exatamente 1 `\n` final.
Verificar com `cat -A skills/init/assets/templates/AGENTS.md.tpl | tail -2` — a última
linha deve ser `$` (linha vazia com apenas `\n`), não `  $` (espaços extra).

**G2 — Strings de link em `AGENTS_REQUIRED_LINKS` devem ser exatas:** O check usa
`content.includes(link)`. A string `'[docs/review-checklists/](./docs/review-checklists/)'`
deve corresponder ao caractere exato no template — incluindo a barra final em `review-checklists/`.
Sem espaço extra, sem diferença de capitalização.

**G3 — `harness-validate.ts` é um script standalone:** O arquivo não importa helpers
externos. A modificação em `AGENTS_REQUIRED_LINKS` é segura (apenas adicionar ao array).
Não adicionar imports no processo.

**G4 — `AGENTS.md` do próprio repo pode precisar ser atualizado:** Se `bun run harness:validate`
falhar após a modificação do harness, verificar se o `AGENTS.md` atual do repo Anti-Vibe-Coding
já contém os 4 novos links obrigatórios. Se não, este é o momento de adicionar — trata-se de
dogfood do próprio plugin.

**G5 — `## Anti-Vibe Extensions` antes de `## Required Working Rules`:** A ordem das seções
importa para legibilidade. Referências (Read Before Major Changes + Anti-Vibe Extensions)
aparecem antes das regras operacionais. Não inserir a seção no final do arquivo.

---

## Verificacao

### TDD
- [ ] RED: `AGENTS_REQUIRED_LINKS` não tem os 4 novos links, teste de harness-validate falha
  - Verificar: `bun run test -- --grep 'AGENTS.md.tpl'` (ou escrever stub primeiro)
- [ ] GREEN: template modificado + harness atualizado, todos os testes passam
  - Comando: `bun run test -- --grep 'AGENTS.md.tpl'`

### Checklist
- [ ] `AGENTS.md.tpl` modificado com seção `## Anti-Vibe Extensions` com 4 links
- [ ] Contagem de linhas do template ≤40: `wc -l skills/init/assets/templates/AGENTS.md.tpl`
- [ ] Template retém todos os 5 links originais (`## Read Before Major Changes`)
- [ ] Template retém `<!-- INIT:DELIVERY_LOOP_SLOT -->`
- [ ] Template retém `{{PROJECT_NAME}}` e `{{STACK}}` placeholders
- [ ] `AGENTS_REQUIRED_LINKS` em `harness-validate.ts` tem 7 links (3 originais + 4 novos)
- [ ] Strings de link exatas (sem espaços extras, barras corretas)
- [ ] `bun run test -- --grep 'AGENTS.md.tpl'` passa (≥5 testes GREEN)
- [ ] `bun run harness:validate` passa (exit 0) após modificações
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina (CA-11 do PRD):**
- `wc -l skills/init/assets/templates/AGENTS.md.tpl` retorna ≤40
- `bun run test -- --grep 'AGENTS.md.tpl'` retorna ≥5 testes PASS, 0 FAIL
- `bun run harness:validate` retorna exit code 0

**Por humano:**
Dado `AGENTS.md` final do template gerado pelo `/init` scaffold:
- Tem ≤40 linhas (validado por `harness-validate.ts`)
- Referencia as 4 extensões anti-vibe agrupadas em `## Anti-Vibe Extensions`
- Mantém os 5 links core originais em `## Read Before Major Changes`
- Tem slot `<!-- INIT:DELIVERY_LOOP_SLOT -->` intacto (usado pelo pipeline de delivery loop)

<!-- Gerado por /plan-feature em 2026-05-14 -->
