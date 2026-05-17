<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): stack-aware-preface — Plano 01 fase-04, PRD §Mecanismo Skill wire-up, D11`
-->

# Fase 04: Wire `/security` com `stack-aware-preface`

**Plano:** 01 — Tracer Bullet
**Sizing:** 1h
**Depende de:** fase-03 (precisa de `.claude/knowledge/INDEX.md` capaz de existir em projeto de teste para validar o caminho "preface aparece")
**Visual:** false

---

## O que esta fase entrega

Bloco `<!-- stack-aware-preface:start --> ... :end -->` adicionado em `skills/security/SKILL.md` logo após `<!-- profile-aware-preface:end -->`. Snippet curto, self-contained, usando path fixo `.claude/knowledge/INDEX.md` (D11). Graceful degradation: se INDEX ausente, preface = string vazia (CA-09). Vira **template verbatim** para as outras 6 skills cross-stack do Plano 03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/SKILL.md` | Modify | Adiciona bloco `stack-aware-preface` logo após `<!-- profile-aware-preface:end -->` (linha ~30) e antes do bloco `<!-- stale-capabilities-check:start -->` |

---

## Implementacao

### Passo 1 (RED): escrever teste que valida presença do bloco e comportamento condicional

Criar `skills/security/lib/stack-aware-preface.test.ts` (mesmo padrão dos blocos existentes que têm helpers separados quando ficam não-triviais — aqui usamos arquivo separado se o bloco crescer; para o snippet do PRD basta uma fn de uma linha então um teste unitário direto é suficiente).

Para Plano 01 (Tracer Bullet), validar via **harness test** + grep no `SKILL.md`. Teste mais profundo (assert sobre a string do preface emitida) vai para Plano 03 fase-03.

```typescript
// skills/security/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 01 fase-04, CA-05 + CA-09 wire check.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

describe('security SKILL.md stack-aware-preface wire-up', () => {
  const skillPath = join(import.meta.dir, '..', 'SKILL.md')
  const body = readFileSync(skillPath, 'utf8')

  it('contains stack-aware-preface block', () => {
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

  it('preserves profile-aware-preface block intact (CA-10 regression check)', () => {
    expect(body).toContain('<!-- profile-aware-preface:start -->')
    expect(body).toContain('<!-- profile-aware-preface:end -->')
    // profile-aware vem ANTES de stack-aware
    expect(body.indexOf('<!-- profile-aware-preface:end -->')).toBeLessThan(
      body.indexOf('<!-- stack-aware-preface:start -->'),
    )
  })
})
```

Comando RED: `bun run test -- --grep 'stack-aware-preface wire-up'` → 3 assertion failures (bloco não existe ainda).

### Passo 2 (GREEN): adicionar o bloco em `skills/security/SKILL.md`

Inserir **logo após** `<!-- profile-aware-preface:end -->` (linha ~30) e **antes** de `<!-- stale-capabilities-check:start -->` (linha ~32). Usar exatamente o snippet do PRD §Mecanismo (linhas 107-114), adaptado a bloco preface da skill:

```markdown
<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 01 fase-04 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G4 do plano: este bloco é template verbatim para as 6 skills cross-stack restantes (Plano 03).
// G2 do plano: path fixo .claude/knowledge/INDEX.md — init garantiu o stack certo (D13).
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

Comando GREEN: `bun run test -- --grep 'stack-aware-preface wire-up'` → 3 passed.

### Passo 3: verificar manualmente com projeto de teste

```bash
# em projeto Node+TS de teste (resultado da fase-03):
ls .claude/knowledge/INDEX.md  # deve existir

# Validação humana: simular invocação da skill e verificar que a primeira linha cita .claude/knowledge/INDEX.md
# (validação automatizada completa vai para fase-05 E2E)
```

---

## Gotchas

- **G4 do plano:** este bloco vira **template verbatim para Plano 03** (api-design, system-design, design-patterns, architecture, infrastructure, tdd-workflow). Manter snippet curto, self-contained, sem dependências novas. `node:fs` já é importado em outras skills — sem custo extra.
- **G2 do plano (CA-10):** o bloco `profile-aware-preface` existente (linhas 10-30) **permanece intacto**. `stack-aware-preface` é aditivo, posicionado **após** profile-aware. Testar com regression check do Passo 1 (`profile-aware vem ANTES de stack-aware`).
- **Local — ordem dos blocos:** convenção do projeto é blocos `<!-- nome:start -->` ... `<!-- nome:end -->` empilhados no topo, antes do corpo da skill. Ordem importa para precedence das prefaces (profile-aware primeiro, stack-aware depois). Em runtime, ambas as strings podem ser concatenadas se ambas não-vazias.
- **Local — `existsSync` vs async:** preface roda no início de toda invocação da skill — síncrono evita complexidade de async no preface. Custo de I/O é desprezível para um `existsSync`.
- **Local — graceful degradation (CA-09):** se INDEX ausente, `stackKnowledgePreface = ''`. Skill **não emite warning**, **não logga**, **não crasha**. Apenas string vazia → comportamento pré-v6.3.2 intacto.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: 3 assertion failures (`Expected ... to contain '<!-- stack-aware-preface:start -->'`)

- [ ] **GREEN:** Bloco adicionado, testes passam
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `skills/security/SKILL.md` contém bloco `<!-- stack-aware-preface:start --> ... :end -->`
- [ ] Bloco posicionado **após** `<!-- profile-aware-preface:end -->` e **antes** de `<!-- stale-capabilities-check:start -->`
- [ ] Bloco usa path fixo `.claude/knowledge/INDEX.md` (literal — D11)
- [ ] Bloco usa `existsSync` de `node:fs` (sem dependência nova)
- [ ] Comportamento condicional: INDEX existe → preface não-vazio; ausente → preface vazio (CA-09)
- [ ] Diff de `skills/security/SKILL.md` mostra **apenas** adição do bloco (resto byte-idêntico)
- [ ] `bun run test` passa (sem regressão em testes de profile-aware ou stale-capabilities)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `grep -c 'stack-aware-preface:start' skills/security/SKILL.md` retorna 1
- `grep -c 'stack-aware-preface:end' skills/security/SKILL.md` retorna 1
- `bun run test -- --grep 'stack-aware-preface wire-up'` retorna 3 passed
- `bun run test` global continua verde (sem regressão)

**Por humano:**
- Inspeção do diff confirma snippet idêntico ao da PRD §Mecanismo "Skill wire-up" (linhas 107-114), com comentário provenance correto
- O bloco é claramente reutilizável (auto-contido) — copy-paste em outras skills no Plano 03 deve funcionar sem ajustes

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
