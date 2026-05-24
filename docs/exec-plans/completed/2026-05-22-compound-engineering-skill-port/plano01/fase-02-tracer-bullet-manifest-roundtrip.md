<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): consumo cross-skill — D7, R11 mitigado por invariante`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Tracer Bullet — Manifest Roundtrip via Init

**Plano:** 01 — Fundação + Bug Fix
**Sizing:** 1.5h
**Depende de:** fase-01 (precisa de `getCompoundManifest()` exportado)
**Visual:** false

---

## O que esta fase entrega

Refactor de `skills/init/lib/template-manifest.ts` para consumir as 10 entradas compound via `getCompoundManifest()` da skill nova — mantendo paths, ordem e categoria idênticos. Prova end-to-end que a arquitetura D7/D21 funciona em runtime SEM mexer em paths físicos. Goldens E2E permanecem verdes (invariante R11).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/template-manifest.ts` | Modify | Trocar as 10 entradas literais compound por iteração sobre `getCompoundManifest()`, preservando ordem posicional, `required: true`, e classificação (`canon-andre` ou `anti-vibe-extension` por dst). |
| `skills/init/lib/template-manifest.test.ts` | Modify | Adicionar test de invariante: ordem, ids e dsts compound idênticos antes/depois do refactor (snapshot literal). |
| `skills/compound-engineering/lib/manifest.test.ts` | Modify | Adicionar test cross-skill: `template-manifest.ts` do init expõe todas as 10 entradas via `TEMPLATE_MANIFEST` (filtragem por dsts esperados). |

---

## Implementacao

### Passo 1: Mapear classificação por dst (preservar `category`)

`template-manifest.ts` atual classifica as 10 entradas compound como:
- `canon-andre` (9): tudo em `docs/compound/`, `docs/review-checklists/`, `docs/smoke-flows/`
- `anti-vibe-extension` (2): `docs/COMPOUND_ENGINEERING.md` (linha 38) e `scripts/compound-check.ts` (linha 79)

Construir hash-map (preferir hash-map sobre switch — CLAUDE.md global):

```typescript
// 2026-05-23 (Luiz/dev): classificação compound preservada do hardcode anterior.
// Trocar para hash-map evita switch e mantém regra explícita por dst.
const COMPOUND_CATEGORY_BY_DST: Record<string, TemplateEntry['category']> = {
  'docs/COMPOUND_ENGINEERING.md':                   'anti-vibe-extension',
  'docs/compound/README.md':                        'canon-andre',
  'docs/review-checklists/README.md':               'canon-andre',
  'docs/review-checklists/security.md':             'canon-andre',
  'docs/review-checklists/reliability.md':          'canon-andre',
  'docs/review-checklists/agent-api.md':            'canon-andre',
  'docs/review-checklists/frontend-ui.md':          'canon-andre',
  'docs/review-checklists/production-readiness.md': 'canon-andre',
  'docs/smoke-flows/README.md':                     'anti-vibe-extension',
  'scripts/compound-check.ts':                      'anti-vibe-extension',
}
```

> Confirmar com Grep antes de codar: `grep -n "COMPOUND_ENGINEERING\|compound/README\|review-checklists\|smoke-flows/README\|compound-check" skills/init/lib/template-manifest.ts` — comparar com snapshot acima.

### Passo 2: Substituir as 10 entradas literais por iteração

`template-manifest.ts` atual tem `src` relativo a `TEMPLATES_ROOT`. `getCompoundManifest()` retorna `src` absoluto. Adaptar via `path.relative`:

```typescript
// 2026-05-23 (Luiz/dev): consumo cross-skill (D7) — substitui hardcode das 10 entradas compound.
// IMPORTANTE: preserva ORDEM POSICIONAL original (G2 do plano — R11 mitigado).
// Goldens E2E iteram nesta ordem; mudar quebra init-greenfield.tree.json.

import { getCompoundManifest } from '../../compound-engineering/lib/manifest'

function buildCompoundEntries(): TemplateEntry[] {
  return getCompoundManifest().map(({ src, dst }) => {
    const category = COMPOUND_CATEGORY_BY_DST[dst]
    if (!category) {
      throw new Error(`[template-manifest] compound dst sem categoria mapeada: ${dst}`)
    }
    return {
      src: path.relative(TEMPLATES_ROOT, src),
      dst,
      required: true,
      category,
    }
  })
}
```

> O retorno de `buildCompoundEntries()` substitui as linhas 38, 55, 58-63, 66, 79 do array `TEMPLATE_MANIFEST`. As outras 26 entradas (não-compound) ficam literais. Usar spread:

```typescript
export const TEMPLATE_MANIFEST: ReadonlyArray<TemplateEntry> = [
  // ... entradas não-compound antes de COMPOUND_ENGINEERING ...
  ...buildCompoundEntries().filter(e => e.dst === 'docs/COMPOUND_ENGINEERING.md'),
  // ... entradas não-compound entre COMPOUND_ENGINEERING e compound/README ...
  ...buildCompoundEntries().filter(e => e.dst === 'docs/compound/README.md'),
  // ... e assim por diante
]
```

> **Alternativa mais limpa:** inserir as 10 entradas compound em 1 bloco contíguo se a ordem do array permitir (review-checklists já são contíguas; smoke-flows e compound-check estão fora). **Decisão (DI):** preservar posição literal por linha — segura invariante posicional do golden (G2). Subagente da fase escolhe a forma menos verbosa que preserve ordem. Se decidir reagrupar, MUST atualizar goldens em commit separado e documentar em MEMORY.

### Passo 3: Test de invariante (R11)

```typescript
// 2026-05-23 (Luiz/dev): snapshot literal das 10 entradas compound DEPOIS do refactor.
// Se este array muda, golden de scaffold quebra — R11 do PLAN.

import { describe, test, expect } from 'bun:test'
import { TEMPLATE_MANIFEST } from './template-manifest'

const EXPECTED_COMPOUND_DSTS = [
  'docs/COMPOUND_ENGINEERING.md',
  'docs/compound/README.md',
  'docs/review-checklists/README.md',
  'docs/review-checklists/security.md',
  'docs/review-checklists/reliability.md',
  'docs/review-checklists/agent-api.md',
  'docs/review-checklists/frontend-ui.md',
  'docs/review-checklists/production-readiness.md',
  'docs/smoke-flows/README.md',
  'scripts/compound-check.ts',
]

describe('template-manifest — invariante compound (R11)', () => {
  test('as 10 entradas compound estão presentes', () => {
    const compoundDsts = TEMPLATE_MANIFEST
      .filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
      .map(e => e.dst)
    expect(compoundDsts.sort()).toEqual(EXPECTED_COMPOUND_DSTS.slice().sort())
  })

  test('cada entrada compound tem required: true', () => {
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    for (const entry of compoundEntries) {
      expect(entry.required).toBe(true)
    }
  })

  test('classificação preservada: 7 canon-andre + 3 anti-vibe-extension', () => {
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    const canon = compoundEntries.filter(e => e.category === 'canon-andre').length
    const ext = compoundEntries.filter(e => e.category === 'anti-vibe-extension').length
    expect(canon).toBe(7)
    expect(ext).toBe(3)
  })

  test('src de cada compound entry resolve para arquivo existente (roundtrip CA-03)', async () => {
    const { default: fs } = await import('node:fs')
    const { default: path } = await import('node:path')
    const TEMPLATES_ROOT = path.join(import.meta.dir, '..', 'assets', 'templates')
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    for (const entry of compoundEntries) {
      const absSrc = path.join(TEMPLATES_ROOT, entry.src)
      expect(fs.existsSync(absSrc)).toBe(true)
    }
  })
})
```

### Passo 4: Verificar boundary D25 (init NÃO invoca subskill install)

Grep enforcement test:

```typescript
test('init NÃO invoca subskill compound-engineering install (D25)', async () => {
  const { readFileSync } = await import('node:fs')
  const content = readFileSync(
    new URL('./template-manifest.ts', import.meta.url),
    'utf-8'
  )
  expect(content).not.toContain('Skill(')
  expect(content).not.toContain("compound-engineering:install")
})
```

### Passo 5: Rodar E2E goldens (verificação de não-regressão)

Comando obrigatório no fim:

```bash
bun test tests/e2e/init-cutover-greenfield.test.ts
```

Esperado: todos os testes não-skipados verdes (5 dos 7 esperados; 2 com `test.skip` por motivos pré-existentes do MEMORY do init-refactor-v7).

---

## Gotchas

- **G2 do plano (R11):** ORDEM POSICIONAL das 10 entradas compound no array final DEVE ser idêntica à atual. Se subagente decidir reagrupar (ex: bloco contíguo das 10 entradas após a camada 1), goldens E2E quebram. Preferir spread fragmentado preservando posições — feio mas seguro.
- **G6 do plano (D25):** Refactor NÃO usa `Skill({ skill: 'anti-vibe-coding:compound-engineering', ... })`. É import puro (`import { getCompoundManifest } from '../../compound-engineering/lib/manifest'`). Tests enforce isso.
- **Local:** `path.relative(TEMPLATES_ROOT, src)` resolve para `docs/COMPOUND_ENGINEERING.md.tpl` quando `src = /abs/skills/init/assets/templates/docs/COMPOUND_ENGINEERING.md.tpl`. Validar manualmente com `bun -e "console.log(require('node:path').relative(...))"` se houver dúvida.
- **Local:** `TEMPLATES_ROOT` é exportado como `path.join(import.meta.dir, '..', 'assets', 'templates')`. Continua válido — não muda nesta fase.

---

## Verificacao

### TDD

- [ ] **RED:** Test de invariante `as 10 entradas compound estão presentes` escrito ANTES do refactor
  - Comando: `bun test skills/init/lib/template-manifest.test.ts --grep "invariante compound"`
  - Resultado esperado (antes): teste passa contra hardcode original (já estão presentes). Após DELETAR temporariamente o bloco compound do array: teste FALHA com mensagem de diff de arrays.

- [ ] **GREEN:** Refactor implementado, todos os testes passam
  - Comando: `bun test skills/init/lib/template-manifest.test.ts`
  - Resultado esperado: todos os testes (existentes + 4 novos) verdes.

### Checklist

- [ ] `skills/init/lib/template-manifest.ts` importa `getCompoundManifest` de `../../compound-engineering/lib/manifest`
- [ ] Não há mais literais hardcoded para as 10 entradas compound em `template-manifest.ts` (grep por `'docs/COMPOUND_ENGINEERING.md.tpl'` retorna 0 matches no array literal — só pode aparecer em comentário)
- [ ] Ordem posicional preservada — comparar com snapshot do array antes do refactor (subagente faz `git diff` mental ou usa snapshot)
- [ ] Test de invariante R11 passa: `bun test skills/init/lib/template-manifest.test.ts --grep "invariante"`
- [ ] Goldens E2E init permanecem verdes: `bun test tests/e2e/init-cutover-greenfield.test.ts`
- [ ] Boundary D25 enforcement test passa (init não usa Skill tool)
- [ ] CA-17 ainda válido (compound-engineering não importa de init — grep): `! grep -rE "from ['\"]\\.\\./\\.\\./init" skills/compound-engineering/`
- [ ] Lint: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por máquina (Tracer Bullet — prova arquitetura D7/D21):**

```bash
bun test skills/init/lib/template-manifest.test.ts && bun test tests/e2e/init-cutover-greenfield.test.ts
```
Resultado esperado: todos verdes (exceto os 2 `test.skip` pré-existentes em init-cutover-greenfield).

```bash
grep -c "getCompoundManifest" skills/init/lib/template-manifest.ts
```
Resultado esperado: `>= 1` (refactor consumiu a função pura).

```bash
! grep -rE "from ['\"]\\.\\./\\.\\./init" skills/compound-engineering/ && echo "CA-17 OK"
```
Resultado esperado: `CA-17 OK` (cross-skill import one-way — compound-engineering NÃO importa de init).

```bash
diff <(git show HEAD:tests/e2e/__golden__/init-greenfield.tree.json) tests/e2e/__golden__/init-greenfield.tree.json
```
Resultado esperado: vazio (golden NÃO mudou — R11 mitigado).

**Por humano:** N/A.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
