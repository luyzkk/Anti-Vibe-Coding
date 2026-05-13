<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 04: Quick-Plan Template Harmonizado (7 Secoes)

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 1h
**Depende de:** fase-03 (`lib/exec-plan-template.ts` + `EXEC_PLAN_SECTIONS_QUICK`)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:quick-plan` gera mini-plano em `docs/exec-plans/active/YYYY-MM-DD-{slug}.md` com **7 secoes reduzidas** (versao light do template de fase-03) usando o mesmo helper `renderExecPlan({ mode: 'quick', ... })`. Mantem mesma interface da skill atual (D10).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/quick-plan/SKILL.md` | Modify | Substituir secao "Output Format" pelo template reduzido |
| `anti-vibe-coding/skills/quick-plan/index.ts` | Modify | Chama `renderExecPlan({ mode: 'quick', ... })` |
| `anti-vibe-coding/tests/quick-plan-template.test.ts` | Create | Valida exatamente 7 secoes H2 e ausencia das 3 omitidas |

---

## Implementacao

### Passo 1: garantir que `EXEC_PLAN_SECTIONS_QUICK` reflete decisao 05-A5

Conforme Ambiguity 05-A5 do README: as 7 secoes sao `Goal`, `Scope`, `Execution Steps`, `Validation Log`, `Compound Opportunity`, `Lessons Captured`, `Exit Criteria`. Omitidas: `Assumptions`, `Risks`, `Review Checklist` (sao para planos grandes).

```typescript
// 2026-05-11 (Luiz/dev): EXEC_PLAN_SECTIONS_QUICK definido em fase-03; aqui so consumimos
// Ambiguity 05-A5 documentada — reverter se PRD especificar quais 7 secoes preferenciais
```

### Passo 2: atualizar `skills/quick-plan/index.ts`

```typescript
// 2026-05-11 (Luiz/dev): quick-plan usa mesmo writer/renderer com mode='quick' — D10 mantem interface
import { writeExecPlan } from '../../lib/write-exec-plan'

export async function quickPlan(
  arg: string | { title: string; goal?: string; scope?: string; executionSteps?: string[] },
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string }> {
  const opts = typeof arg === 'string' ? { title: arg } : arg
  return writeExecPlan(projectRoot, { ...opts, mode: 'quick' })
}
```

### Passo 3: atualizar `skills/quick-plan/SKILL.md`

````markdown
## Output Format (v6 — D18 reduzido)

```
1. Para tasks de complexidade media (3-7 passos), sem entrar em pipeline /plan-feature
2. Chamar renderExecPlan({ mode: 'quick', ... }) — 7 secoes
3. Escrever em docs/exec-plans/active/YYYY-MM-DD-{slug}.md
4. Secoes (case-sensitive):
   Goal, Scope, Execution Steps, Validation Log,
   Compound Opportunity, Lessons Captured, Exit Criteria
5. Assumptions, Risks, Review Checklist OMITIDAS (over-engineering para tasks medias)
```
````

---

## Gotchas

- **G7 do plano (case-sensitive):** Mesmo cuidado de fase-03 — secoes case-sensitive.
- **Local 04-G1 (decisao de omissao):** Documentar **por que** Assumptions/Risks/Review Checklist nao entram via comment no helper de skill. Ajuda dev futuro entender que omissao foi intencional.
- **Local 04-G2 (frontmatter mode):** `mode: quick` no frontmatter permite validador (Plano 04 fase-03) ter regra diferente para quick-plan se necessario (ex: nao validar `## Review Checklist` ausente).

---

## Verificacao

### TDD

- [ ] **RED:** Teste `renders exactly 7 sections, no Assumptions/Risks/Review Checklist` espera regex match list `=== EXEC_PLAN_SECTIONS_QUICK`
  - Comando: `bun test tests/quick-plan-template.test.ts --grep '7 sections'`
  - Resultado esperado: falha porque ainda renderiza 10 ou 6 secoes

- [ ] **GREEN:** Apos integracao, retorna 7 secoes na ordem canonica

### Checklist

- [ ] `quickPlan("teste curto")` cria `docs/exec-plans/active/YYYY-MM-DD-teste-curto.md`
- [ ] Arquivo contem `mode: quick` no frontmatter
- [ ] `grep -c '^## ' {file}.md` retorna `7`
- [ ] Arquivo NAO contem `## Assumptions`, `## Risks`, nem `## Review Checklist` (busca explicita)
- [ ] Ordem das 7 secoes confirma com `EXEC_PLAN_SECTIONS_QUICK`
- [ ] Backward-compat: `quickPlan("titulo")` (string) e `quickPlan({ title: "titulo" })` produzem mesmo resultado (D10)
- [ ] Testes passam: `bun run test`
- [ ] Lint + typecheck

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/quick-plan-template.test.ts` exit 0
- `grep -c '^## ' docs/exec-plans/active/{file}.md` retorna `7`
- `grep -c '^## Assumptions' {file}.md` retorna `0`

**CA do PRD coberto:**
- (implicitamente CA-18 alinhado — quick-plan e variante reduzida; nao tem CA dedicado, deriva de D18)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
