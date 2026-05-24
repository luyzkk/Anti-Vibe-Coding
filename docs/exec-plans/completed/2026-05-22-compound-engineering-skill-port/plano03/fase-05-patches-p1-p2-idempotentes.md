<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
-->

# Fase 05: Patches P1 + P2 idempotentes (AGENTS.md + new-plan.ts.tpl)

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 1.5h
**Depende de:** fase-01 (installer chamando os patches)
**Visual:** false

---

## O que esta fase entrega

Dois patches idempotentes invocados por `install`:
- **P1** (`lib/patch-agents.ts`): adiciona link `[Compound Engineering](./docs/COMPOUND_ENGINEERING.md)` em `AGENTS.md` sob `## Read Before Major Changes`. Idempotente via regex multi-padrao D23 (CA-11/CA-12).
- **P2** (`lib/patch-new-plan.ts`): injeta 4 secoes (`## Compound Opportunity | ## Review Checklist | ## Validation Log | ## Lessons Captured`) em `scripts/new-plan.ts.tpl` ANTES de `## Exit Criteria`. Idempotente — skip se ja presentes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/patch-agents.ts` | Create | `patchAgentsMd(targetRoot): Promise<PatchResult>` — regex D23 + insercao sob secao ou append |
| `skills/compound-engineering/lib/patch-agents.test.ts` | Create | Testes CA-11 (idempotencia) + CA-12 (path relativo) |
| `skills/compound-engineering/lib/patch-new-plan.ts` | Create | `patchNewPlanTpl(targetRoot): Promise<PatchResult>` — injeta 4 secoes idempotente |
| `skills/compound-engineering/lib/patch-new-plan.test.ts` | Create | Testes idempotencia + ordem das secoes |
| `skills/compound-engineering/lib/installer.ts` | Modify | Apos copia dos templates, invoca `patchAgentsMd` + `patchNewPlanTpl` |

---

## Implementacao

### Passo 1: `patch-agents.ts` com regex D23

```typescript
// 2026-05-23 (Luiz/dev): P1 — PRD SH-03/CA-11/CA-12 + D23 regex multi-padrao
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type PatchResult = {
  status: 'patched' | 'already-present' | 'created' | 'appended'
  message: string
}

// 2026-05-23 (Luiz/dev): D23 — cobre [text](docs/...), (./docs/...), (../docs/...)
const COMPOUND_LINK_REGEX = /\[.*?\]\(\.{0,2}\/?docs\/COMPOUND_ENGINEERING\.md\)/

const SECTION_HEADING = '## Read Before Major Changes'
const LINK_LINE = '- [Compound Engineering](./docs/COMPOUND_ENGINEERING.md)'

export async function patchAgentsMd(targetRoot: string): Promise<PatchResult> {
  const agentsPath = path.join(targetRoot, 'AGENTS.md')
  const exists = await fs.access(agentsPath).then(() => true).catch(() => false)

  if (!exists) {
    // 2026-05-23 (Luiz/dev): Assumption do PLAN.md — se AGENTS.md ausente, append final basta
    await fs.writeFile(
      agentsPath,
      `# AGENTS.md\n\n${SECTION_HEADING}\n\n${LINK_LINE}\n`,
    )
    return { status: 'created', message: 'Created AGENTS.md with compound link' }
  }

  const content = await fs.readFile(agentsPath, 'utf-8')

  // 2026-05-23 (Luiz/dev): CA-11/CA-12 — qualquer match no arquivo = no-op
  if (COMPOUND_LINK_REGEX.test(content)) {
    return { status: 'already-present', message: 'AGENTS.md already has compound link — no patch needed' }
  }

  // 2026-05-23 (Luiz/dev): se secao `## Read Before Major Changes` existe, insere apos
  const sectionIdx = content.indexOf(SECTION_HEADING)
  if (sectionIdx >= 0) {
    const lineEndIdx = content.indexOf('\n', sectionIdx) + 1
    const patched = `${content.slice(0, lineEndIdx)}\n${LINK_LINE}\n${content.slice(lineEndIdx)}`
    await fs.writeFile(agentsPath, patched)
    return {
      status: 'patched',
      message: `Patched AGENTS.md: added link to docs/COMPOUND_ENGINEERING.md under '${SECTION_HEADING}'`,
    }
  }

  // 2026-05-23 (Luiz/dev): degraded path — D23 + Assumption: append no fim com nova secao
  const patched = `${content.trimEnd()}\n\n${SECTION_HEADING}\n\n${LINK_LINE}\n`
  await fs.writeFile(agentsPath, patched)
  return {
    status: 'appended',
    message: `Patched AGENTS.md: appended '${SECTION_HEADING}' section with compound link`,
  }
}
```

### Passo 2: `patch-new-plan.ts` (P2 — 4 secoes)

```typescript
// 2026-05-23 (Luiz/dev): P2 — PRD SH-04/D8 + D10
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { PatchResult } from './patch-agents'

const NEW_PLAN_SECTIONS = [
  '## Compound Opportunity',
  '## Review Checklist',
  '## Validation Log',
  '## Lessons Captured',
]

const EXIT_CRITERIA_MARKER = '## Exit Criteria'

export async function patchNewPlanTpl(targetRoot: string): Promise<PatchResult> {
  // 2026-05-23 (Luiz/dev): suporta .ts.tpl ou .mjs (RF-04) — verificar primeiro existente
  const candidates = ['scripts/new-plan.ts.tpl', 'scripts/new-plan.mjs', 'scripts/new-plan.ts']
  let tplPath: string | undefined
  for (const c of candidates) {
    const abs = path.join(targetRoot, c)
    if (await fs.access(abs).then(() => true).catch(() => false)) {
      tplPath = abs
      break
    }
  }
  if (!tplPath) {
    return { status: 'already-present', message: 'No new-plan template found — skip P2' }
  }

  const content = await fs.readFile(tplPath, 'utf-8')

  // 2026-05-23 (Luiz/dev): idempotencia — se todas as 4 secoes ja presentes, no-op
  const allPresent = NEW_PLAN_SECTIONS.every((s) => content.includes(s))
  if (allPresent) {
    return { status: 'already-present', message: `new-plan template already has 4 compound sections — no patch needed` }
  }

  const exitIdx = content.indexOf(EXIT_CRITERIA_MARKER)
  const sectionsBlock = NEW_PLAN_SECTIONS.map((s) => `${s}\n\n_(Preenchido durante execucao.)_\n`).join('\n')

  let patched: string
  if (exitIdx >= 0) {
    // 2026-05-23 (Luiz/dev): D10 — insere ANTES de `## Exit Criteria`
    patched = `${content.slice(0, exitIdx)}${sectionsBlock}\n${content.slice(exitIdx)}`
  } else {
    // 2026-05-23 (Luiz/dev): degraded — append no fim
    patched = `${content.trimEnd()}\n\n${sectionsBlock}\n`
  }
  await fs.writeFile(tplPath, patched)
  return {
    status: 'patched',
    message: `Patched ${path.relative(targetRoot, tplPath)}: injected 4 compound sections before ${EXIT_CRITERIA_MARKER}`,
  }
}
```

### Passo 3: Plugar em `installer.ts`

Apos o loop de copia em `installer.ts` (fase-01), antes do `return result`:

```typescript
// 2026-05-23 (Luiz/dev): patches P1/P2 — PRD SH-03/SH-04 + idempotencia RNF-02
import { patchAgentsMd } from './patch-agents'
import { patchNewPlanTpl } from './patch-new-plan'

// ... dentro de installCompound:
const p1 = await patchAgentsMd(targetRoot)
result.notes.push(p1.message)
const p2 = await patchNewPlanTpl(targetRoot)
result.notes.push(p2.message)
```

### Passo 4: Testes idempotencia

```typescript
// 2026-05-23 (Luiz/dev): CA-11 — 2a invocacao e no-op
test('CA-11 P1 idempotente: 2a invocacao nao modifica AGENTS.md', async () => {
  // setup fixture AGENTS.md sem link
  await patchAgentsMd(fixtureRoot) // 1a vez: patched
  const after1 = await fs.readFile(agentsPath, 'utf-8')
  const r2 = await patchAgentsMd(fixtureRoot)
  const after2 = await fs.readFile(agentsPath, 'utf-8')
  expect(r2.status).toBe('already-present')
  expect(after1).toBe(after2) // bytewise identical
})

// 2026-05-23 (Luiz/dev): CA-12 — path relativo detectado
test('CA-12 P1 detecta link com path relativo (./docs/...)', async () => {
  // fixture AGENTS.md com [Compound](./docs/COMPOUND_ENGINEERING.md)
  const r = await patchAgentsMd(fixtureRoot)
  expect(r.status).toBe('already-present')
})
```

---

## Gotchas

- **G1 do README (R3 + D23):** regex `/\[.*?\]\(\.{0,2}\/?docs\/COMPOUND_ENGINEERING\.md\)/` cobre `(docs/...)`, `(./docs/...)`, `(../docs/...)`. Edge case `(../../docs/...)` tambem coberto por `\.{0,2}` (0, 1 ou 2 pontos).
- **Local — secao ausente em AGENTS.md:** se `## Read Before Major Changes` nao existe, append no final com a secao criada (degraded path documentado em Assumption do PLAN.md).
- **Local — multiplas variantes new-plan:** target pode ter `new-plan.ts.tpl`, `new-plan.mjs` ou `new-plan.ts`. Patch tenta na ordem e opera no PRIMEIRO encontrado. Se nenhum, log `No new-plan template found — skip P2` e nao falha.
- **Local — ordem das 4 secoes (P2):** preservar ordem `Compound Opportunity → Review Checklist → Validation Log → Lessons Captured` (D10). Teste verifica indexOf de cada uma e suas posicoes relativas.
- **Local — `PatchResult` reutilizado:** mesma tipagem entre P1 e P2 para simplificar agregacao no `installer.ts`. Re-exportada do `patch-agents.ts`.

---

## Verificacao

### TDD

- [ ] **RED:** `patch-agents.test.ts` falha antes da implementacao
  - Comando: `bun test skills/compound-engineering/lib/patch-agents.test.ts --grep 'CA-11 idempotente'`
  - Resultado esperado: `Expected after1 === after2`, recebido `after2 has duplicate link` (assertion failure)

- [ ] **GREEN:** `patch-agents.ts` + `patch-new-plan.ts` implementados, todos os testes passam
  - Comando: `bun test skills/compound-engineering/lib/patch-agents.test.ts skills/compound-engineering/lib/patch-new-plan.test.ts`
  - Resultado esperado: `4+ passed, 0 failed` (CA-11, CA-12 + 2 testes P2)

### Checklist

- [ ] CA-11: AGENTS.md sem link → 1a invocacao patcheia; 2a e no-op (status `already-present`)
- [ ] CA-12: AGENTS.md com `[Compound](./docs/COMPOUND_ENGINEERING.md)` → nao duplica
- [ ] P2 idempotencia: tpl com 4 secoes ja presentes → status `already-present`
- [ ] P2 ordem: tpl sem secoes → patch insere `Compound Opportunity → Review Checklist → Validation Log → Lessons Captured` antes de `## Exit Criteria`
- [ ] `installer.ts` invoca P1 e P2 ao fim do loop de copia (sem flag adicional — sempre executa)
- [ ] Testes passam: `bun test skills/compound-engineering/lib/patch-*.test.ts`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/compound-engineering/lib/patch-agents.test.ts` retorna 2+ passed (CA-11/12)
- `bun test skills/compound-engineering/lib/patch-new-plan.test.ts` retorna 2+ passed (idempotencia + ordem)
- Diff `git diff AGENTS.md` apos 2 invocacoes consecutivas do `install` retorna 0 (RNF-02)

**Por humano:**
- Em fixture brownfield sem link compound: `install` aplica P1 e P2; rodar de novo: nenhuma mudanca visivel em `git diff`

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
