# Fase 01: TemplateEntry.category + Classificação dos 31 Slots

**Plano:** 01 — Fundação: Category Field + Detection + Tracer Bullet
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Adiciona o campo `category: 'canon-andre' | 'anti-vibe-extension'` ao tipo `TemplateEntry` em
`template-manifest.ts` e classifica todos os 31 slots existentes. O validador do harness passa
a tratar ausência de entry `canon-andre` como erro e ausência de `anti-vibe-extension` como warning.
Callers existentes (`scaffold-full-tree`, `harness-validate`) não quebram — campo é additive e
sempre preenchido (não optional).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/template-manifest.ts` | Editar | Adicionar campo `category` ao tipo + classificar 31 slots |
| `skills/init/lib/template-manifest.test.ts` | Criar | Testes RED→GREEN para validar presença de category e contagem por tipo |

---

## Implementacao

### Passo 1: Contar os slots reais antes de tocar no código

O PRD menciona "26 slots" mas o arquivo real tem **31 entradas**. Ler `template-manifest.ts`
completo antes de qualquer edição para não perder slots adicionados recentemente.

Ao contar, verificar cada layer:
- Layer 1 (docs raiz): 9 entradas (DESIGN, FRONTEND, PLANS, PRODUCT_SENSE, QUALITY_SCORE, MERGE_GATES, RELIABILITY, SECURITY, COMPOUND_ENGINEERING)
- Layer 2 (design-docs): 2 entradas
- Layer 3 (exec-plans): 3 entradas
- Layer 4 (compound): 1 entrada
- Layer 5 (review-checklists): 6 entradas
- Layer 6 (smoke-flows/product-specs/references/generated): 4 entradas
- Layer 7 (STATE.md): 1 entrada
- Raiz (TODO.md, README.md): 2 entradas
- Scripts: 2 entradas
- .github: 1 entrada

**Total: 31 slots**

### Passo 2: Escrever teste RED antes de tocar no tipo

Criar `skills/init/lib/template-manifest.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { TEMPLATE_MANIFEST } from './template-manifest'

describe('TEMPLATE_MANIFEST', () => {
  it('all entries have a category field', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(entry.category).toBeDefined()
      expect(['canon-andre', 'anti-vibe-extension']).toContain(entry.category)
    }
  })

  it('has exactly 22 canon-andre entries', () => {
    const canon = TEMPLATE_MANIFEST.filter((e) => e.category === 'canon-andre')
    expect(canon.length).toBe(22)
  })

  it('has exactly 9 anti-vibe-extension entries', () => {
    const ext = TEMPLATE_MANIFEST.filter((e) => e.category === 'anti-vibe-extension')
    expect(ext.length).toBe(9)
  })

  it('no entry is missing required field', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(typeof entry.required).toBe('boolean')
    }
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'TEMPLATE_MANIFEST'`

### Passo 3: Atualizar o tipo `TemplateEntry`

```typescript
export type TemplateEntry = {
  /** Caminho do `.tpl` relativo a `assets/templates/`. */
  src: string
  /** Caminho de saida relativo ao `targetDir` do projeto. */
  dst: string
  /** Marca arquivos que sempre sao copiados (nao opcionais). */
  required: boolean
  /**
   * Classificação do slot:
   * - 'canon-andre': um dos 22 arquivos do harness-engineering de André Prado (imutáveis por DT-09)
   * - 'anti-vibe-extension': extensão adicionada pelo Anti-Vibe Coding (4–9 slots extras)
   *
   * Impacto no validador:
   * - Ausência de canon-andre instalado = erro
   * - Ausência de anti-vibe-extension instalado = warning
   */
  category: 'canon-andre' | 'anti-vibe-extension'
}
```

### Passo 4: Classificar os 31 slots no TEMPLATE_MANIFEST

Classificação baseada em DT-09 (canon André imutável) e DT-10 (extensões anti-vibe marcadas):

**Canon André (22 slots):**
```typescript
// Layer 1: docs institucionais (raiz docs/) — canon exceto MERGE_GATES e COMPOUND_ENGINEERING
{ src: 'docs/DESIGN.md.tpl',                     dst: 'docs/DESIGN.md',                     required: true, category: 'canon-andre' },
{ src: 'docs/FRONTEND.md.tpl',                   dst: 'docs/FRONTEND.md',                   required: true, category: 'canon-andre' },
{ src: 'docs/PLANS.md.tpl',                      dst: 'docs/PLANS.md',                      required: true, category: 'canon-andre' },
{ src: 'docs/PRODUCT_SENSE.md.tpl',              dst: 'docs/PRODUCT_SENSE.md',              required: true, category: 'canon-andre' },
{ src: 'docs/QUALITY_SCORE.md.tpl',              dst: 'docs/QUALITY_SCORE.md',              required: true, category: 'canon-andre' },
// MERGE_GATES: anti-vibe-extension (split 2026-05-13, não existe no harness original)
{ src: 'docs/MERGE_GATES.md.tpl',                dst: 'docs/MERGE_GATES.md',                required: true, category: 'anti-vibe-extension' },
{ src: 'docs/RELIABILITY.md.tpl',                dst: 'docs/RELIABILITY.md',                required: true, category: 'canon-andre' },
{ src: 'docs/SECURITY.md.tpl',                   dst: 'docs/SECURITY.md',                   required: true, category: 'canon-andre' },
// COMPOUND_ENGINEERING: anti-vibe-extension (não existe no harness-engineering original)
{ src: 'docs/COMPOUND_ENGINEERING.md.tpl',       dst: 'docs/COMPOUND_ENGINEERING.md',       required: true, category: 'anti-vibe-extension' },

// Layer 2: design-docs/ — canon
{ src: 'docs/design-docs/index.md.tpl',          dst: 'docs/design-docs/index.md',          required: true, category: 'canon-andre' },
{ src: 'docs/design-docs/core-beliefs.md.tpl',   dst: 'docs/design-docs/core-beliefs.md',   required: true, category: 'canon-andre' },

// Layer 3: exec-plans/ — canon
{ src: 'docs/exec-plans/active/README.md.tpl',         dst: 'docs/exec-plans/active/README.md',         required: true, category: 'canon-andre' },
{ src: 'docs/exec-plans/completed/README.md.tpl',      dst: 'docs/exec-plans/completed/README.md',      required: true, category: 'canon-andre' },
{ src: 'docs/exec-plans/tech-debt-tracker.md.tpl',     dst: 'docs/exec-plans/tech-debt-tracker.md',     required: true, category: 'canon-andre' },

// Layer 4: compound/ — canon
{ src: 'docs/compound/README.md.tpl',            dst: 'docs/compound/README.md',            required: true, category: 'canon-andre' },

// Layer 5: review-checklists/ — canon
{ src: 'docs/review-checklists/README.md.tpl',               dst: 'docs/review-checklists/README.md',               required: true, category: 'canon-andre' },
{ src: 'docs/review-checklists/security.md.tpl',             dst: 'docs/review-checklists/security.md',             required: true, category: 'canon-andre' },
{ src: 'docs/review-checklists/reliability.md.tpl',          dst: 'docs/review-checklists/reliability.md',          required: true, category: 'canon-andre' },
{ src: 'docs/review-checklists/agent-api.md.tpl',            dst: 'docs/review-checklists/agent-api.md',            required: true, category: 'canon-andre' },
{ src: 'docs/review-checklists/frontend-ui.md.tpl',          dst: 'docs/review-checklists/frontend-ui.md',          required: true, category: 'canon-andre' },
{ src: 'docs/review-checklists/production-readiness.md.tpl', dst: 'docs/review-checklists/production-readiness.md', required: true, category: 'canon-andre' },

// Layer 6: product-specs + references — canon (smoke-flows e generated: anti-vibe-extension)
{ src: 'docs/smoke-flows/README.md.tpl',         dst: 'docs/smoke-flows/README.md',         required: true, category: 'anti-vibe-extension' },
{ src: 'docs/product-specs/index.md.tpl',        dst: 'docs/product-specs/index.md',        required: true, category: 'canon-andre' },
{ src: 'docs/references/README.md.tpl',          dst: 'docs/references/README.md',          required: true, category: 'canon-andre' },
{ src: 'docs/generated/db-schema.md.tpl',        dst: 'docs/generated/db-schema.md',        required: true, category: 'anti-vibe-extension' },

// Layer 7: STATE.md — canon
{ src: 'docs/STATE.md.tpl',                      dst: 'docs/STATE.md',                      required: true, category: 'canon-andre' },

// Raiz — TODO.md: anti-vibe-extension; README.md: anti-vibe-extension
{ src: 'TODO.md.tpl',                            dst: 'TODO.md',                            required: true, category: 'anti-vibe-extension' },

// Scripts — anti-vibe-extension
{ src: 'scripts/compound-check.ts.tpl',          dst: 'scripts/compound-check.ts',          required: true, category: 'anti-vibe-extension' },
{ src: 'scripts/new-plan.ts.tpl',                dst: 'scripts/new-plan.ts',                required: true, category: 'anti-vibe-extension' },

// Raiz + .github — anti-vibe-extension
{ src: 'README.md.tpl',                          dst: 'README.md',                          required: true, category: 'anti-vibe-extension' },
{ src: '.github/pull_request_template.md.tpl',   dst: '.github/pull_request_template.md',   required: true, category: 'anti-vibe-extension' },
```

**Resultado:** 22 `canon-andre` + 9 `anti-vibe-extension` = 31 total.

**Nota de calibração:** Se a contagem de testes falhar, inspecionar harness-engineering de André Prado
para confirmar quais slots existem no harness original vs foram adicionados pelo Anti-Vibe. Os candidatos
a reclassificação são `product-specs/index.md` e `references/README.md` — se não existirem no harness
original, mover para `anti-vibe-extension` e ajustar os counts nos testes.

---

## Gotchas

**G3 — `category` é required, não optional:** Não use `category?` no tipo — isso quebraria o TypeScript
em callers que constroem `TemplateEntry` manualmente. O campo deve ser `category: 'canon-andre' | 'anti-vibe-extension'`
(required). Todos os 31 objetos no array DEVEM ter o campo ou o compilador falha.

**G4 — Contagem real é 31, não 26:** O PRD estimou 26 com base em uma leitura anterior. O arquivo real
tem 31 entradas. Os testes devem usar os números reais — não os do PRD. Se a contagem canon/extension
não bater 22+9=31, os testes são o ponto de verdade para calibrar a classificação.

---

## Verificacao

### TDD
- [ ] RED: testes escritos e FALHAM (campo `category` não existe ainda)
  - Comando: `bun run test -- --grep 'TEMPLATE_MANIFEST'`
- [ ] GREEN: campo adicionado e slots classificados, testes PASSAM
  - Comando: `bun run test -- --grep 'TEMPLATE_MANIFEST'`

### Checklist
- [ ] `TemplateEntry` tem campo `category: 'canon-andre' | 'anti-vibe-extension'` (required, não optional)
- [ ] Todos os 31 slots têm `category` preenchido
- [ ] Contagem: 22 `canon-andre`, 9 `anti-vibe-extension`
- [ ] `bun run tsc --noEmit` passa sem erros no `template-manifest.ts`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'TEMPLATE_MANIFEST'` retorna 4 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0

<!-- Gerado por /plan-feature em 2026-05-14 -->
