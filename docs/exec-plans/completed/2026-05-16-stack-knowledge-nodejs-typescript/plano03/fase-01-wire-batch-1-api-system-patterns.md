<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): stack-aware-preface — Plano 03 fase-01, PRD §Mecanismo Skill wire-up, D11`
-->

# Fase 01: Wire batch 1 — api-design, system-design, design-patterns

**Plano:** 03 — Skill Wire-up (6 cross-stack restantes)
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano; Plano 01 fase-04 já provou o template em `/security`)
**Visual:** false

---

## O que esta fase entrega

Bloco `<!-- stack-aware-preface:start --> ... :end -->` adicionado verbatim em 3 SKILL.md (`api-design`, `system-design`, `design-patterns`). Posição de inserção em todas: **logo após** `<!-- profile-aware-preface:end -->` e **antes** de `<!-- stale-capabilities-check:start -->`. Diff por skill mostra exclusivamente insertion (CA-10).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/api-design/SKILL.md` | Modify | Adiciona bloco `stack-aware-preface` após `<!-- profile-aware-preface:end -->` (linha ~30) e antes de `<!-- stale-capabilities-check:start -->` (linha ~32) |
| `skills/system-design/SKILL.md` | Modify | Idem, mesma posição relativa |
| `skills/design-patterns/SKILL.md` | Modify | Idem, mesma posição relativa |
| `skills/api-design/__tests__/stack-aware-preface-wire.test.ts` | Create | Harness test co-localizado (mesmo padrão de Plano 01 fase-04 em `skills/security/__tests__/`). 3 asserts. |
| `skills/system-design/__tests__/stack-aware-preface-wire.test.ts` | Create | Idem. |
| `skills/design-patterns/__tests__/stack-aware-preface-wire.test.ts` | Create | Idem. |

---

## Implementacao

### Passo 1 (RED): escrever um teste co-localizado por skill (3 arquivos)

Convenção do repo (confirmada em `skills/security/__tests__/stack-aware-preface-wire.test.ts` do Plano 01 fase-04 e em `skills/architecture/__tests__/`, `skills/qa-visual/__tests__/`): **cada skill tem seu próprio `__tests__/` co-localizado**. Não centralizar batch tests sob `tests/skills/` — quebraria a convenção e tornaria o diff por skill menos auditável.

Criar **3 arquivos idênticos** (exceto pelo caminho do `skillPath`), um em cada skill. Template (instanciar para cada uma das 3 skills, ajustando apenas o `describe` e o `skillPath`):

```typescript
// skills/api-design/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-01, CA-05 + CA-09 wire api-design.
// G1 do plano: bloco verbatim do Plano 01 fase-04. G4: insertion-only diff.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('api-design SKILL.md stack-aware-preface wire-up', () => {
  const skillPath = join(import.meta.dir, '..', 'SKILL.md')
  const body = readFileSync(skillPath, 'utf8')

  it('contains stack-aware-preface block markers', () => {
    expect(body).toContain('<!-- stack-aware-preface:start -->')
    expect(body).toContain('<!-- stack-aware-preface:end -->')
  })

  it('preface uses fixed path .claude/knowledge/INDEX.md (D11)', () => {
    const start = body.indexOf('<!-- stack-aware-preface:start -->')
    const end = body.indexOf('<!-- stack-aware-preface:end -->')
    const block = body.slice(start, end)
    expect(block).toContain('.claude/knowledge/INDEX.md')
    expect(block).toContain('existsSync')
  })

  it('preserves profile-aware-preface block intact and BEFORE stack-aware (CA-10)', () => {
    expect(body).toContain('<!-- profile-aware-preface:start -->')
    expect(body).toContain('<!-- profile-aware-preface:end -->')
    // profile-aware vem ANTES de stack-aware
    expect(body.indexOf('<!-- profile-aware-preface:end -->')).toBeLessThan(
      body.indexOf('<!-- stack-aware-preface:start -->'),
    )
    // stack-aware vem ANTES de stale-capabilities-check (não há blocos no meio)
    expect(body.indexOf('<!-- stack-aware-preface:end -->')).toBeLessThan(
      body.indexOf('<!-- stale-capabilities-check:start -->'),
    )
  })
})
```

Replicar idêntico em `skills/system-design/__tests__/stack-aware-preface-wire.test.ts` e `skills/design-patterns/__tests__/stack-aware-preface-wire.test.ts` (alterar apenas a string do `describe`).

Comando RED: `bun run test -- --grep 'stack-aware-preface wire-up'` → 9 assertion failures totais (3 arquivos × 3 asserts cada). O grep também captura o teste já existente do `/security` (Plano 01 fase-04) — se aquele estiver verde, o resultado será `3 passed + 9 failed = 12 testes`, com os 9 novos vermelhos.

### Passo 2 (GREEN): inserir o bloco verbatim em cada uma das 3 SKILL.md

Para cada skill (`api-design`, `system-design`, `design-patterns`), inserir **logo após** a linha `<!-- profile-aware-preface:end -->` e **antes** de `<!-- stale-capabilities-check:start -->` (geralmente uma linha em branco separa os blocos — preservar essa convenção).

Snippet a inserir (idêntico ao Plano 01 fase-04 com data 2026-05-16 e referência atualizada para fase-01):

```markdown
<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-01 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// Bloco template verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { existsSync } from 'node:fs'

const knowledgePath = '.claude/knowledge/INDEX.md'
const stackKnowledgePreface = existsSync(knowledgePath)
  ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
  : ''
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta (após o `preface` profile-aware, se ambos existirem). Se vazio, ignore — comportamento da skill segue do bloco `profile-aware-preface` acima sem mudança (CA-09).
<!-- stack-aware-preface:end -->
```

Comando GREEN: `bun run test -- --grep 'stack-aware-preface wire-up'` → 9 passed.

### Passo 3: smoke check via grep + lint/typecheck

```bash
# 1 start + 1 end por skill
grep -c 'stack-aware-preface:start' skills/api-design/SKILL.md     # → 1
grep -c 'stack-aware-preface:end'   skills/api-design/SKILL.md     # → 1
grep -c 'stack-aware-preface:start' skills/system-design/SKILL.md  # → 1
grep -c 'stack-aware-preface:end'   skills/system-design/SKILL.md  # → 1
grep -c 'stack-aware-preface:start' skills/design-patterns/SKILL.md # → 1
grep -c 'stack-aware-preface:end'   skills/design-patterns/SKILL.md # → 1

# Verificação ortogonal: linter + typechecker do projeto continuam verdes
bun run test && bun run lint && bun run typecheck
```

---

## Gotchas

- **G1 do plano (verbatim):** o snippet acima é o do Plano 01 fase-04 com apenas duas mudanças: (1) data `2026-05-16` (que já bate) e (2) referência `Plano 03 fase-01`. Qualquer outra divergência (espaços, troca de aspas, reordering de imports) quebra o contrato de zero drift entre as 7 skills e será detectada no E2E da fase-03.
- **G2 do plano (anchor batch 1):** todas as 3 skills deste batch já têm `<!-- profile-aware-preface:end -->`. Inserir **imediatamente após** essa linha (separada por linha em branco se a convenção da skill já usar) e **antes** de `<!-- stale-capabilities-check:start -->`. Não mover, reordenar ou tocar nesses blocos existentes.
- **G4 do plano (insertion-only diff):** o diff de cada SKILL.md deve mostrar exclusivamente as ~13 linhas do novo bloco. Se o diff inclui alteração em qualquer outra linha (mesmo whitespace), reverter e refazer — é regressão CA-10.
- **G5 do plano (provenance):** comentário inline com `// 2026-05-16 (Luiz/dev): Plano 03 fase-01 — ...`. Fase-02 usará `fase-02` no mesmo lugar; isso é o único diff entre as duas variantes do bloco.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: 9 assertion failures novas (3 skills × 3 asserts). O teste do `/security` (Plano 01 fase-04) permanece verde — diferenciar pelo nome do describe.

- [ ] **GREEN:** Bloco inserido nas 3 SKILL.md, testes passam
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: `9 passed, 0 failed`

### Checklist

- [ ] `skills/api-design/SKILL.md` contém bloco `<!-- stack-aware-preface:start --> ... :end -->`
- [ ] `skills/system-design/SKILL.md` contém bloco `<!-- stack-aware-preface:start --> ... :end -->`
- [ ] `skills/design-patterns/SKILL.md` contém bloco `<!-- stack-aware-preface:start --> ... :end -->`
- [ ] Em cada uma das 3 skills, o bloco está **entre** `<!-- profile-aware-preface:end -->` e `<!-- stale-capabilities-check:start -->`
- [ ] Bloco usa path fixo literal `.claude/knowledge/INDEX.md` (D11)
- [ ] Bloco usa `existsSync` de `node:fs` (sem dependência nova)
- [ ] Diff de cada SKILL.md mostra **apenas** adição do bloco (CA-10 — verificável via `git diff --stat skills/{api-design,system-design,design-patterns}/SKILL.md`)
- [ ] Comentário provenance idêntico nas 3 skills: `2026-05-16 (Luiz/dev): Plano 03 fase-01 — ...`
- [ ] `bun run test` global verde (sem regressão em testes de profile-aware ou stale-capabilities)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `grep -c 'stack-aware-preface:start' skills/api-design/SKILL.md` retorna `1`
- `grep -c 'stack-aware-preface:start' skills/system-design/SKILL.md` retorna `1`
- `grep -c 'stack-aware-preface:start' skills/design-patterns/SKILL.md` retorna `1`
- (Idem para `:end` — todos retornam `1`)
- `bun run test -- --grep 'stack-aware-preface wire-up'` retorna `9 passed`
- `bun run test && bun run lint && bun run typecheck` continuam verdes globalmente

**Por humano:**
- Diff visual das 3 SKILL.md confirma snippet **byte-idêntico** ao Plano 01 fase-04, exceto pela referência `Plano 03 fase-01` na linha de comentário provenance
- O bloco está visualmente claro como "adição entre dois blocos pré-existentes" — sem reordenação, sem quebra de espaçamento

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
