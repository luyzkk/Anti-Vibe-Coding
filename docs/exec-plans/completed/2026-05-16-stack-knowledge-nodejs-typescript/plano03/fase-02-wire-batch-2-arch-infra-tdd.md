<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): stack-aware-preface — Plano 03 fase-02, PRD §Mecanismo Skill wire-up, D11`
-->

# Fase 02: Wire batch 2 — architecture, infrastructure, tdd-workflow

**Plano:** 03 — Skill Wire-up (6 cross-stack restantes)
**Sizing:** 1-1.5h
**Depende de:** Nenhuma — **pode rodar em paralelo com fase-01** (toca arquivos disjuntos)
**Visual:** false

---

## O que esta fase entrega

Bloco `<!-- stack-aware-preface:start --> ... :end -->` adicionado verbatim em 3 SKILL.md heterogêneas:
- `skills/architecture/SKILL.md` — anchor `<!-- profile-aware-preface:end -->` (mesmo padrão do batch 1).
- `skills/infrastructure/SKILL.md` — **greenfield** (sem profile-aware): anchor = fechamento do frontmatter (`---` na linha 8), inserir antes do H1 `# Consultor de Infraestrutura & Deploy` (linha 10).
- `skills/tdd-workflow/SKILL.md` — **greenfield**: anchor = fechamento do frontmatter (`---` na linha 8), inserir antes do H1 `# TDD Workflow — Anti-Vibe Coding` (linha 10).

Em greenfield, o bloco fica no topo da skill, **antes** do primeiro `#` H1, sem modificar nenhuma linha do corpo.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/architecture/SKILL.md` | Modify | Adiciona bloco `stack-aware-preface` após `<!-- profile-aware-preface:end -->` (linha ~77) e antes de `# Consultor de Arquitetura de Software` (linha ~79) |
| `skills/infrastructure/SKILL.md` | Modify | **Greenfield insertion**: bloco logo após `---` (linha 8 — fim do frontmatter) e antes de `# Consultor de Infraestrutura & Deploy` (linha 10) |
| `skills/tdd-workflow/SKILL.md` | Modify | **Greenfield insertion**: bloco logo após `---` (linha 8 — fim do frontmatter) e antes de `# TDD Workflow — Anti-Vibe Coding` (linha 10) |
| `skills/architecture/__tests__/stack-aware-preface-wire.test.ts` | Create | Harness test co-localizado (mesma convenção do Plano 01 fase-04). Asserts: marcadores + path fixo + preserva profile-aware. |
| `skills/infrastructure/__tests__/stack-aware-preface-wire.test.ts` | Create | Harness test co-localizado. Asserts: marcadores + path fixo + **posicional greenfield** (preface antes do primeiro H1, depois do frontmatter). |
| `skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts` | Create | Idem (greenfield, mesma asserção posicional). |

---

## Implementacao

### Passo 1 (RED): escrever um teste co-localizado por skill (3 arquivos)

Convenção do repo (Plano 01 fase-04, `skills/architecture/__tests__/`, etc.): **co-localizar em `skills/<name>/__tests__/`**. Criar **3 arquivos**:

#### 1) `skills/architecture/__tests__/stack-aware-preface-wire.test.ts` (NÃO-greenfield)

Idêntico ao da fase-01 (api-design/system-design/design-patterns), apenas com `describe('architecture SKILL.md stack-aware-preface wire-up', ...)`. Asserts: marcadores, path fixo, profile-aware preserved + before stack-aware. **Não asserir presença de `stale-capabilities-check`** se essa skill não tiver — usar somente "profile-aware end vem antes de stack-aware start".

#### 2) `skills/infrastructure/__tests__/stack-aware-preface-wire.test.ts` (GREENFIELD)

Variante posicional: substituir o assert "preserves profile-aware" por "preface appears between frontmatter close and first H1".

```typescript
// skills/infrastructure/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-02, CA-05 + CA-09 wire greenfield.
// G1 verbatim. G2: greenfield — anchor = fechamento do frontmatter, antes do primeiro H1.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('infrastructure SKILL.md stack-aware-preface wire-up', () => {
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

  it('preface appears between frontmatter close and first H1 (greenfield positional, CA-10)', () => {
    const startIdx = body.indexOf('<!-- stack-aware-preface:start -->')
    const firstH1Idx = body.search(/^# /m)
    const frontmatterCloseIdx = body.indexOf('\n---\n', 4) // pula o `---` de abertura na linha 1
    expect(startIdx).toBeGreaterThan(-1)
    expect(firstH1Idx).toBeGreaterThan(-1)
    expect(frontmatterCloseIdx).toBeGreaterThan(-1)
    expect(startIdx).toBeGreaterThan(frontmatterCloseIdx)
    expect(startIdx).toBeLessThan(firstH1Idx)
  })
})
```

#### 3) `skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts` (GREENFIELD)

Idêntico ao de `infrastructure` (mesma asserção posicional), apenas com `describe('tdd-workflow SKILL.md stack-aware-preface wire-up', ...)`.

Comando RED: `bun run test -- --grep 'stack-aware-preface wire-up'` → 9 novas assertion failures (3 arquivos × 3 asserts). Junto com os 9 de fase-01 (se rodando em paralelo), o `--grep` captura tudo — diferenciar pelo `describe`.

### Passo 2 (GREEN): inserir o bloco verbatim em cada uma das 3 SKILL.md

Snippet (idêntico ao da fase-01, exceto pela referência `Plano 03 fase-02`):

```markdown
<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-02 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
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

Posicionamento por skill:

- `skills/architecture/SKILL.md`: inserir **logo após** `<!-- profile-aware-preface:end -->` (próximo da linha 77) e **antes** de `# Consultor de Arquitetura de Software` (linha ~79). Separar por uma linha em branco se essa for a convenção observada no diff.
- `skills/infrastructure/SKILL.md`: **greenfield** — inserir entre a linha `---` (linha 8, fim do frontmatter) e a linha `# Consultor de Infraestrutura & Deploy` (linha 10). Manter a linha em branco que separa frontmatter do H1 — o bloco entra **entre** elas.
- `skills/tdd-workflow/SKILL.md`: **greenfield** — inserir entre `---` (linha 8) e `# TDD Workflow — Anti-Vibe Coding` (linha 10). Mesma convenção.

Comando GREEN: `bun run test -- --grep 'stack-aware-preface wire-up'` → 9 passed.

### Passo 3: smoke check via grep + lint/typecheck

```bash
grep -c 'stack-aware-preface:start' skills/architecture/SKILL.md     # → 1
grep -c 'stack-aware-preface:start' skills/infrastructure/SKILL.md   # → 1
grep -c 'stack-aware-preface:start' skills/tdd-workflow/SKILL.md     # → 1
# (idem :end)

bun run test && bun run lint && bun run typecheck
```

---

## Gotchas

- **G1 do plano (verbatim):** o bloco é byte-idêntico ao da fase-01 e ao do Plano 01 fase-04, exceto pela referência `Plano 03 fase-02` na linha de comentário provenance. Trocar `fase-01` por `fase-02` é a única edição permitida.
- **G2 do plano (anchor heterogêneo) — pilar desta fase:** `architecture` segue o padrão do batch 1 (anchor `<!-- profile-aware-preface:end -->`). `infrastructure` e `tdd-workflow` são **greenfield** — não têm profile-aware-preface, então o anchor é o fechamento do frontmatter (segundo `---`). O bloco entra como **primeira coisa** após o frontmatter, antes do primeiro `#` H1 do corpo. Confundir anchor (ex: inserir após o H1) quebra a expectativa de "preface vem antes do corpo da skill".
- **G3 do plano (graceful degradation strict):** em greenfield (infra/tdd-workflow), o bloco é o **único** preface da skill. CA-09 ainda vale — se INDEX ausente, preface vazio, skill executa exatamente como antes do wire (corpo inalterado). Nenhum warning, nenhum log.
- **G4 do plano (insertion-only diff):** em greenfield, zero modificações no corpo da skill. Diff esperado: ~14 linhas adicionadas no topo, zero linhas removidas, zero linhas modificadas. Em `architecture`, mesma restrição — bloco entre profile-aware:end e o H1 do corpo, sem mexer no resto.
- **G5 do plano (provenance):** comentário `// 2026-05-16 (Luiz/dev): Plano 03 fase-02 — ...`. Único diff vs fase-01 do mesmo plano.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: 9 assertion failures (3 skills × 3 asserts; em greenfield o 3º assert é o posicional "before H1")

- [ ] **GREEN:** Bloco inserido nas 3 SKILL.md (1 com profile-aware anchor, 2 greenfield), testes passam
  - Comando: `bun run test -- --grep 'stack-aware-preface wire-up'`
  - Resultado esperado: `9 passed, 0 failed`

### Checklist

- [ ] `skills/architecture/SKILL.md` contém bloco, posicionado entre `<!-- profile-aware-preface:end -->` e `# Consultor de Arquitetura de Software`
- [ ] `skills/infrastructure/SKILL.md` contém bloco, posicionado entre `---` (fim do frontmatter, linha 8) e `# Consultor de Infraestrutura & Deploy` (linha 10)
- [ ] `skills/tdd-workflow/SKILL.md` contém bloco, posicionado entre `---` (fim do frontmatter, linha 8) e `# TDD Workflow — Anti-Vibe Coding` (linha 10)
- [ ] Em greenfield, o bloco aparece **antes** do primeiro `#` H1 (asserção do test posicional)
- [ ] Bloco usa path fixo literal `.claude/knowledge/INDEX.md` (D11) nas 3 skills
- [ ] Bloco usa `existsSync` de `node:fs` (sem dependência nova)
- [ ] Diff de cada SKILL.md mostra **apenas** adição do bloco (CA-10) — confirmar via `git diff --stat skills/{architecture,infrastructure,tdd-workflow}/SKILL.md`
- [ ] Comentário provenance: `2026-05-16 (Luiz/dev): Plano 03 fase-02 — ...` nas 3 skills
- [ ] `bun run test` global verde
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `grep -c 'stack-aware-preface:start' skills/architecture/SKILL.md` retorna `1`
- `grep -c 'stack-aware-preface:start' skills/infrastructure/SKILL.md` retorna `1`
- `grep -c 'stack-aware-preface:start' skills/tdd-workflow/SKILL.md` retorna `1`
- (Idem `:end`)
- `bun run test -- --grep 'stack-aware-preface wire-up'` retorna `9 passed`
- `bun run test && bun run lint && bun run typecheck` continuam verdes globalmente

**Por humano:**
- Diff visual das 3 SKILL.md confirma snippet **byte-idêntico** ao Plano 01 fase-04, exceto pela referência `Plano 03 fase-02`
- Em `infrastructure` e `tdd-workflow` (greenfield), confirmar **zero modificações no corpo da skill** — só insertion no topo entre frontmatter e H1
- Em `architecture`, confirmar que o bloco não bagunçou nenhum outro `<!-- bloco:start -->` existente acima (telemetria, profile-aware)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
