<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): manifest contrato D7/D21 — PRD MH-04, CA-03`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Skill Stub + Manifest Puro

**Plano:** 01 — Fundação + Bug Fix
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Criação da skill `compound-engineering` (SKILL.md user-invocable com 4 subcomandos no `argument-hint`) + função pura `getCompoundManifest()` retornando os 10 paths compound, fechando MH-04 e CA-03 com paths AINDA apontando para `skills/init/assets/templates/`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/SKILL.md` | Create | Stub user-invocable com telemetria literal copiada de `skills/lessons-learned/SKILL.md` (R10), `argument-hint` D22, descrição apontando para os 4 subcomandos. |
| `skills/compound-engineering/lib/manifest.ts` | Create | `getCompoundManifest(): Array<{src: string, dst: string}>` com 10 entradas resolvendo `src` absoluto via `import.meta.dir` (D21). |
| `skills/compound-engineering/lib/manifest.test.ts` | Create | Testes unitários da função pura: retorna 10 entradas; cada `src` é absoluto e existe em disco; cada `dst` é relativo (não começa com `/` ou drive letter); ordem determinística. |
| `skills/compound-engineering/references/capture-guide.md` | Create | Placeholder `# Capture Guide\n\n_TBD — Plano 03 fase-03 (gate) preenche._` (D13). |

---

## Implementacao

### Passo 1: Criar SKILL.md com telemetria literal

Copiar literalmente o bloco `<!-- profile-aware-preface:start --> ... <!-- stale-capabilities-check:end -->` de `skills/lessons-learned/SKILL.md` (linhas 10-59) para a nova SKILL.md (R10). Trocar apenas:
- `LESSONS_LEARNED_PREFACE_BY_PROFILE` / `DEFAULT_LESSONS_LEARNED_PREFACE` → ainda não existem para compound-engineering. Manter referência placeholder OU usar diretamente o padrão de `lessons-learned` por enquanto (decidir na execução; se quebrar build, criar `lib/compound-engineering-prefaces.ts` com `DEFAULT_COMPOUND_ENGINEERING_PREFACE = ''`).

Frontmatter:

```yaml
---
name: compound-engineering
description: "This skill should be used when the user asks to 'install compound engineering scaffold', 'run compound gate', 'migrate compound schema', or 'check compound notes'. Manages the compound engineering scaffold (templates, decision gate, brownfield migration) and delegates capture to lessons-learned."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit, Skill
argument-hint: "install|check|gate|migrate [--strict] [--force]"
---
```

Corpo: seção `## Acao solicitada\n\n$ARGUMENTS` no fim (espelha lessons-learned). Subcomandos só serão IMPLEMENTADOS no Plano 03 — nesta fase, listar conceitualmente em `## Subcomandos`:

- `install [--force]` — _Plano 03 fase-01_
- `check [--strict]` — _Plano 03 fase-02_
- `gate` — _Plano 03 fase-03_
- `migrate` — _Plano 03 fase-04_

### Passo 2: Implementar `manifest.ts`

```typescript
// 2026-05-23 (Luiz/dev): contrato init↔skill (D7/D21) — PRD MH-04, CA-03.
// Paths AINDA apontam para skills/init/assets/templates/ (transitório).
// Plano 02 fase-01 troca para '../assets' após git mv.

import path from 'node:path'

export type CompoundManifestEntry = {
  /** Caminho absoluto da fonte `.tpl` (resolvido em runtime). */
  src: string
  /** Caminho de saida relativo a raiz do target. */
  dst: string
}

// 2026-05-23 (Luiz/dev): durante Plano 01, src vive em init/assets/templates.
// Apos Plano 02 fase-01 (git mv), trocar '../../init/assets/templates' por '../assets'.
const TEMPLATES_ROOT = path.resolve(import.meta.dir, '../../init/assets/templates')

const COMPOUND_ENTRIES: ReadonlyArray<{ src: string; dst: string }> = [
  { src: 'docs/COMPOUND_ENGINEERING.md.tpl',                   dst: 'docs/COMPOUND_ENGINEERING.md'                   },
  { src: 'docs/compound/README.md.tpl',                        dst: 'docs/compound/README.md'                        },
  { src: 'docs/review-checklists/README.md.tpl',               dst: 'docs/review-checklists/README.md'               },
  { src: 'docs/review-checklists/security.md.tpl',             dst: 'docs/review-checklists/security.md'             },
  { src: 'docs/review-checklists/reliability.md.tpl',          dst: 'docs/review-checklists/reliability.md'          },
  { src: 'docs/review-checklists/agent-api.md.tpl',            dst: 'docs/review-checklists/agent-api.md'            },
  { src: 'docs/review-checklists/frontend-ui.md.tpl',          dst: 'docs/review-checklists/frontend-ui.md'          },
  { src: 'docs/review-checklists/production-readiness.md.tpl', dst: 'docs/review-checklists/production-readiness.md' },
  { src: 'docs/smoke-flows/README.md.tpl',                     dst: 'docs/smoke-flows/README.md'                     },
  { src: 'scripts/compound-check.ts.tpl',                      dst: 'scripts/compound-check.ts'                      },
]

export function getCompoundManifest(): CompoundManifestEntry[] {
  return COMPOUND_ENTRIES.map(({ src, dst }) => ({
    src: path.resolve(TEMPLATES_ROOT, src),
    dst,
  }))
}
```

### Passo 3: Testes unitários da função pura

```typescript
// 2026-05-23 (Luiz/dev): unit tests CA-03 — funcao pura, deve passar < 50ms.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import fs from 'node:fs'
import { getCompoundManifest } from './manifest'

describe('getCompoundManifest', () => {
  const manifest = getCompoundManifest()

  test('retorna 10 entradas compound (PRD MH-04)', () => {
    expect(manifest).toHaveLength(10)
  })

  test('cada src e absoluto', () => {
    for (const entry of manifest) {
      expect(path.isAbsolute(entry.src)).toBe(true)
    }
  })

  test('cada src aponta para arquivo existente em skills/init/assets/templates', () => {
    for (const entry of manifest) {
      expect(fs.existsSync(entry.src)).toBe(true)
    }
  })

  test('cada dst e relativo (nao comeca com / nem drive letter)', () => {
    for (const entry of manifest) {
      expect(path.isAbsolute(entry.dst)).toBe(false)
    }
  })

  test('ordem deterministica entre chamadas', () => {
    const m2 = getCompoundManifest()
    expect(manifest.map(e => e.dst)).toEqual(m2.map(e => e.dst))
  })

  test('inclui os 10 dst esperados (D7 contract)', () => {
    const dsts = manifest.map(e => e.dst).sort()
    expect(dsts).toEqual([
      '.tmp-sort-placeholder'.replace(/.*/, '') || // explicit alphabetical:
      'docs/COMPOUND_ENGINEERING.md',
      'docs/compound/README.md',
      'docs/review-checklists/README.md',
      'docs/review-checklists/agent-api.md',
      'docs/review-checklists/frontend-ui.md',
      'docs/review-checklists/production-readiness.md',
      'docs/review-checklists/reliability.md',
      'docs/review-checklists/security.md',
      'docs/smoke-flows/README.md',
      'scripts/compound-check.ts',
    ].sort())
  })
})
```

> Nota: o `replace(/.*/, '') ||` no exemplo é placeholder; subagente da fase escreve o array final limpo. Ponto é validar todos os 10 `dst` por enumeração explícita, não substring.

### Passo 4: Placeholder `capture-guide.md`

```markdown
# Capture Guide

_TBD — Plano 03 fase-03 (subcomando `gate`) preenche._

Este arquivo é knowledge interno da skill `compound-engineering` (D13).
Consultado pelo agente durante o decision gate; NÃO instalado em projetos consumidores.
```

---

## Gotchas

- **G1 do plano (R10):** Telemetria literal. Esquecer o bloco `<!-- profile-aware-preface:start --> ... <!-- stale-capabilities-check:end -->` = skill sem instrumentação. Confirmar via grep que ambos os comentários `:start` e `:end` aparecem na SKILL.md nova.
- **G3 do plano (D21):** `path.resolve(import.meta.dir, '../../init/assets/templates', ...)` — três níveis: `lib/` → `compound-engineering/` → `skills/` → `init/assets/templates/`. Se mover `manifest.ts` para outra pasta, ajustar.
- **Local:** A SKILL.md de `lessons-learned` referencia `LESSONS_LEARNED_PREFACE_BY_PROFILE` / `DEFAULT_LESSONS_LEARNED_PREFACE` de `./lib/lessons-learned-prefaces`. Se copiar literal, criar ANALOGO `compound-engineering-prefaces.ts` exportando `DEFAULT_COMPOUND_ENGINEERING_PREFACE = ''` (string vazia) para não quebrar build. Decisão registrar em MEMORY se desviar.
- **Local:** `allowed-tools: Read, Grep, Glob, Write, Edit, Skill` — inclui `Skill` desde fase-01 mesmo sem uso ainda, porque o Plano 03 fase-03 (gate) vai invocar `Skill({ skill: 'anti-vibe-coding:lessons-learned', ... })` (D20). Adicionar agora evita ter que editar SKILL.md depois.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `getCompoundManifest retorna 10 entradas` escrito ANTES da função existir
  - Comando: `bun test skills/compound-engineering/lib/manifest.test.ts`
  - Resultado esperado: erro de import (`Cannot find module './manifest'`) → criar `manifest.ts` vazio → erro de assertion (`Expected 10, received undefined`)

- [ ] **GREEN:** Função implementada, todos os testes do `manifest.test.ts` passam
  - Comando: `bun test skills/compound-engineering/lib/manifest.test.ts`
  - Resultado esperado: `6 passed, 0 failed`

### Checklist

- [ ] `skills/compound-engineering/SKILL.md` existe com frontmatter `user-invocable: true`, `disable-model-invocation: false`, `argument-hint: "install|check|gate|migrate [--strict] [--force]"` (D22)
- [ ] Telemetria literal copiada de `skills/lessons-learned/SKILL.md` — grep por `profile-aware-preface:start` e `stale-capabilities-check:end` na nova SKILL.md retorna match (R10)
- [ ] `skills/compound-engineering/lib/manifest.ts` exporta `getCompoundManifest` e tipo `CompoundManifestEntry`
- [ ] `skills/compound-engineering/references/capture-guide.md` existe como placeholder (D13)
- [ ] Goldens E2E do init NÃO foram tocados nesta fase (`git diff tests/e2e/__golden__/init-greenfield.*` vazio)
- [ ] `template-manifest.ts` do init NÃO foi tocado nesta fase (fase-02 cuida disso)
- [ ] Testes passam: `bun test skills/compound-engineering/`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por máquina (CA-03 do PRD):**

```bash
bun -e "import('./skills/compound-engineering/lib/manifest.ts').then(m => { const r = m.getCompoundManifest(); if (r.length !== 10) process.exit(1); if (!r.every(e => require('node:path').isAbsolute(e.src))) process.exit(2); if (!r.every(e => !require('node:path').isAbsolute(e.dst))) process.exit(3); console.log('OK', r.length) })"
```
Resultado esperado: `OK 10` e exit 0.

```bash
grep -c "profile-aware-preface:start" skills/compound-engineering/SKILL.md
```
Resultado esperado: `1` (literal de lessons-learned copiado — R10).

```bash
grep -q "user-invocable: true" skills/compound-engineering/SKILL.md && echo "OK"
```
Resultado esperado: `OK`.

**Por humano:** N/A (sem UI).

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
