# Fase 03: Snapshot Golden + Suite

**Plano:** 01 — Renderer Cross-Skill + Builder
**Sizing:** ~1h
**Depende de:** fase-02 (`buildFaseFromContext` deve existir e estar testado)
**Visual:** false

---

## O que esta fase entrega

`skills/plan-feature/__golden__/fase-output.md` com o output real de
`buildFaseFromContext(FULL_SAMPLE_CONTEXT) -> renderFasePlan(input)`. Suite em
`skills/plan-feature/lib/fase-builder.test.ts` expandida com: teste de 11 H2 em ordem fixa
(CA-B-01), teste de campos opcionais vazios sem headers N/A (CA-B-06), e teste de snapshot
byte-estavel. Todos os CAs de maquina desta fase passando.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/plan-feature/__golden__/fase-output.md` | Create | Golden gerado por `buildFaseFromContext + renderFasePlan` |
| `skills/plan-feature/lib/fase-builder.test.ts` | Modify | Adicionar 3 testes: H2 order (CA-B-01), empty fields (CA-B-06), snapshot |

---

## Implementacao

### Passo 1: Verificar premissa — fase-02 concluida

```bash
ls "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/lib/fase-builder.ts"
bun test "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/lib/fase-builder.test.ts"
```

Se qualquer um falhar: **PARAR — blocker, fase-02 nao foi concluida.**

### Passo 2: Adicionar testes (RED)

Expandir `skills/plan-feature/lib/fase-builder.test.ts` com as importacoes adicionais e
`FULL_SAMPLE_CONTEXT`, depois adicionar os 3 novos testes. O arquivo deve ficar assim
(adicionar ao final do arquivo existente, antes de fechar o `describe`):

**Novas importacoes** (adicionar no topo do arquivo):

```typescript
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { renderFasePlan, extractH2Sections } from '../../lib/render-fase-plan'
```

**`FULL_SAMPLE_CONTEXT`** (adicionar antes do `describe`):

```typescript
const FULL_SAMPLE_CONTEXT: PlanFaseContext = {
  faseId: 'fase-01-mover-renderer',
  faseNumber: 1,
  planNumber: 1,
  featureSlug: 'migrate-plan-feature-faseplanv1',
  goal: 'Mover renderFasePlan para skills/lib/ (cross-skill) e atualizar o unico importador.',
  scopeIn: [
    'skills/lib/render-fase-plan.ts (destino)',
    'skills/lib/render-fase-plan.test.ts (destino)',
    'skills/lib/__golden__/fase-plan-sample.md (destino)',
    'skills/init/lib/populate-plan-generator.ts (importador)',
  ],
  scopeOut: [
    'skills/plan-feature/index.ts',
    'skills/plan-feature/templates/fase-template.md',
    'Outros skills ou libs nao listados',
  ],
  assumptions: [
    'Feature A mergeada — renderer existe em skills/init/lib/',
    'populate-plan-generator.ts e o unico importador de producao',
    'bun suporta git mv via shell',
  ],
  risks: [
    { risk: 'Importador nao-mapeado quebra suite', mitigation: 'Grep obrigatorio antes do git mv (Passo 1)' },
    { risk: 'Golden path muda com o diretorio do teste', mitigation: 'import.meta.dir resolve para o dir do arquivo fonte — path relativo __golden__ continua correto' },
  ],
  waves: [
    {
      name: 'Wave 1 — Preparacao',
      items: [
        'grep -r "render-fase-plan" skills/ para mapear importadores',
        'Verificar path do golden no teste antes de mover',
      ],
    },
    {
      name: 'Wave 2 — Move',
      items: [
        'git mv render-fase-plan.ts para skills/lib/',
        'git mv render-fase-plan.test.ts para skills/lib/',
        'git mv __golden__/fase-plan-sample.md para skills/lib/__golden__/',
        'Atualizar import em populate-plan-generator.ts',
      ],
    },
    {
      name: 'Wave 3 — Verificacao',
      items: [
        'bun test skills/lib/render-fase-plan.test.ts',
        'bun test (suite completa)',
        'bun run typecheck',
        'grep -r "from ./render-fase-plan" skills/init/ deve retornar vazio',
      ],
    },
  ],
  reviewChecklist: [
    'Zero referencias para ./render-fase-plan em skills/init/',
    'bun test verde (zero regressoes)',
    'git log --follow skills/lib/render-fase-plan.ts mostra historico do arquivo original',
    'bun run typecheck retorna exit code 0',
  ],
  compoundOpportunity: 'Pattern cross-skill renderer valida ADR-0022 — capturar em docs/compound/ se nenhuma regressao ocorrer.',
  exitCriteria: [
    'skills/lib/render-fase-plan.ts existe com mesmo conteudo do original',
    'skills/init/lib/render-fase-plan.ts nao existe mais',
    'bun test retorna 0 failed',
    'grep -r render-fase-plan skills/init/ mostra apenas a linha com ../../lib/render-fase-plan',
  ],
  guidanceFile: '',
  detectionSignals: ['render-fase-plan', 'FasePlanInput', 'renderFasePlan'],
  mustCover: {
    'Passo 1 — Grep': ['mapear todos os importadores', 'confirmar populate-plan-generator.ts como unico caller de producao'],
    'Passo 3 — git mv': ['3 arquivos movidos (ts + test.ts + golden)', 'git status mostra renamed nao deleted'],
  },
  validationCommand: 'bun test',
  dependsOn: [],
}
```

**3 novos testes** (adicionar dentro do `describe('buildFaseFromContext', ...)` existente):

```typescript
  // CA-B-01: 10 H2 base Andre + Final Report Contract na ordem fixa
  test('buildFaseFromContext + renderFasePlan emite 11 H2 na ordem fixa (CA-B-01)', () => {
    const input = buildFaseFromContext(FULL_SAMPLE_CONTEXT)
    const md = renderFasePlan(input)
    const h2s = extractH2Sections(md)
    expect(h2s).toEqual([
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
      '## Final Report Contract',
    ])
  })

  // CA-B-06: campos opcionais vazios nao geram headers N/A ou blocos vazios
  test('campos opcionais vazios nao produzem blocos no output (CA-B-06)', () => {
    const minimalCtx: PlanFaseContext = {
      faseId: 'fase-01-minimal',
      faseNumber: 1,
      planNumber: 1,
      featureSlug: 'test-feature',
      goal: 'Minimal goal',
      scopeIn: ['One thing'],
      scopeOut: ['Other thing'],
      assumptions: ['Assumption'],
      risks: [{ risk: 'Some risk', mitigation: 'Mitigacao' }],
      waves: [{ name: 'Wave 1', items: ['Step 1'] }],
      reviewChecklist: ['Check 1'],
      compoundOpportunity: 'None',
      exitCriteria: ['Criterion 1'],
    }
    const input = buildFaseFromContext(minimalCtx)
    const md = renderFasePlan(input)
    expect(md).not.toContain('N/A')
    expect(md).not.toContain('**Detection signals (grep before writing):**')
    expect(md).not.toContain('**Required outbound links:**')
    expect(md).not.toContain('**Must cover')
  })

  // Snapshot byte-estavel contra golden file
  test('output matches golden snapshot (byte-stable)', async () => {
    const goldenPath = path.join(import.meta.dir, '..', '__golden__', 'fase-output.md')
    const expected = await fs.readFile(goldenPath, 'utf-8')
    const input = buildFaseFromContext(FULL_SAMPLE_CONTEXT)
    const actual = renderFasePlan(input)
    expect(actual).toBe(expected)
  })
```

Rodar para confirmar RED (o snapshot falha porque `fase-output.md` nao existe ainda):

```bash
cd "f:/Projetos/Anti-Vibe-Coding"
bun test skills/plan-feature/lib/fase-builder.test.ts
```

Resultado esperado:
- Testes de H2 order e empty fields PASSAM (GREEN imediato — sem dependencia de arquivo)
- Teste de snapshot FALHA com "ENOENT: no such file or directory" (nao ENOENT de modulo — e de golden)

### Passo 3: Gerar o golden file (GREEN do snapshot)

Criar o diretorio e gerar o golden via script inline:

```bash
mkdir -p "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__"
```

Executar um script bun inline para gerar o golden:

```typescript
// Salvar como f:/tmp/gen-golden.ts e rodar com bun
import { buildFaseFromContext, type PlanFaseContext } from 'f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/lib/fase-builder'
import { renderFasePlan } from 'f:/Projetos/Anti-Vibe-Coding/skills/lib/render-fase-plan'
import { promises as fs } from 'node:fs'

const FULL_SAMPLE_CONTEXT: PlanFaseContext = {
  // ... (mesmo objeto definido no Passo 2) ...
}

const input = buildFaseFromContext(FULL_SAMPLE_CONTEXT)
const md = renderFasePlan(input)
await fs.writeFile('f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__/fase-output.md', md, 'utf-8')
console.log('Golden gerado:', md.slice(0, 120))
```

**Alternativa mais simples:** Adicionar um `test.only` temporario no `fase-builder.test.ts` que
gera o golden em vez de compara-lo, rodar, depois reverter para o teste de comparacao:

```typescript
// Temporario — reverter apos gerar o golden
test.only('GERA GOLDEN — rodar uma vez e reverter', async () => {
  const goldenPath = path.join(import.meta.dir, '..', '__golden__', 'fase-output.md')
  const input = buildFaseFromContext(FULL_SAMPLE_CONTEXT)
  const actual = renderFasePlan(input)
  await fs.writeFile(goldenPath, actual, 'utf-8')
  console.log('Golden gerado em:', goldenPath)
  expect(true).toBe(true) // sempre passa
})
```

Rodar `bun test skills/plan-feature/lib/fase-builder.test.ts`, confirmar que o arquivo foi
criado, reverter o `test.only` para o `test` normal.

### Passo 4: Verificar o golden gerado

```bash
# Confirmar que o golden existe
ls "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__/fase-output.md"

# Confirmar que contem os 11 H2
grep "^## " "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__/fase-output.md"
```

Saida esperada do grep:
```
## Goal
## Scope
## Assumptions
## Risks
## Execution Steps
## Review Checklist
## Validation Log
## Compound Opportunity
## Lessons Captured
## Exit Criteria
## Final Report Contract
```

### Passo 5: Rodar suite completa (todos os testes verdes)

```bash
cd "f:/Projetos/Anti-Vibe-Coding"
bun test skills/plan-feature/lib/fase-builder.test.ts
bun test
bun run typecheck
```

Resultado esperado: 9 testes passando em `fase-builder.test.ts` (6 da fase-02 + 3 novos),
zero falhas na suite completa, zero erros de typecheck.

---

## Gotchas

- **G1 do plano (golden path):** O golden fica em `skills/plan-feature/__golden__/` enquanto
  o teste esta em `skills/plan-feature/lib/`. O `import.meta.dir` aponta para `lib/` — por
  isso o path no teste usa `path.join(import.meta.dir, '..', '__golden__', 'fase-output.md')`.
  O `..` e essencial para subir um nivel.
- **G2 (gerar o golden):** Usar o `test.only` temporario e a forma mais segura — garante que
  o golden foi gerado com o mesmo `FULL_SAMPLE_CONTEXT` que o teste de comparacao usa.
  Nao copiar e colar o output manualmente (risco de diffs de whitespace invisivel).
- **G3 (CA-B-05 implicito):** Nao modificar planos existentes em `docs/exec-plans/active/`.
  O golden e novo, nao substitui nenhum plano em disco.
- **G4 (test.only residual):** Lembrar de reverter o `test.only` para `test` antes do commit.
  Um `test.only` esquecido faz os outros testes serem ignorados silenciosamente.
- **Local:** O teste de empty fields verifica ausencia de `**Detection signals (grep before writing):**`
  — esse e o texto exato que o renderer emite (linha ~73 de `render-fase-plan.ts`). Se o wording
  mudar no renderer, o teste precisara ser atualizado.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/plan-feature/lib/fase-builder.test.ts` apos adicionar os 3 testes:
  - Testes de H2 order e empty fields: PASS (RED nao se aplica — logica pura ja existe)
  - Teste de snapshot: FAIL com "ENOENT: no such file or directory" (golden nao existe)
- [ ] **GREEN:** apos gerar o golden e reverter o `test.only`, todos os 9 testes passam
- [ ] **REFACTOR:** verificar se `FULL_SAMPLE_CONTEXT` tem dados realistas o suficiente para
  servir como documentacao viva. Se nao, enriquecer o contexto sem quebrar os testes.

### Checklist

- [ ] `skills/plan-feature/__golden__/fase-output.md` existe e e legivel
- [ ] `grep "^## " skills/plan-feature/__golden__/fase-output.md` retorna exatamente 11 linhas
- [ ] `extractH2Sections(golden)` retorna a lista exata de 11 H2 (10 Andre + Final Report Contract)
- [ ] Teste de `empty optional fields` passa (sem "N/A", sem blocos de detection/links/mustCover)
- [ ] Teste de snapshot passa (byte-estavel)
- [ ] `bun test skills/plan-feature/lib/fase-builder.test.ts` retorna `9 passed, 0 failed`
- [ ] Suite completa passa: `bun test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] Nenhum `test.only` residual no arquivo de testes

---

## Criterio de Aceite

**Por maquina:**

- `bun test skills/plan-feature/lib/fase-builder.test.ts` retorna `9 passed, 0 failed`
  (CA-B-01: H2 na ordem fixa; CA-B-06: campos vazios sem blocos)
- `ls f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__/fase-output.md` existe (CA-B-01 snapshot)
- `grep "^## " f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/__golden__/fase-output.md | wc -l` retorna `11`
- `bun test` retorna `0 failed` (CA-B-02: zero quebras cross-skill)
- `bun run typecheck` retorna exit code 0

---

## Final Report Contract

Quando esta fase for executada, o relatorio final DEVE listar:
- **Files added** — `skills/plan-feature/__golden__/fase-output.md`
- **Files customized** — `skills/plan-feature/lib/fase-builder.test.ts` (+3 testes, +importacoes, +FULL_SAMPLE_CONTEXT)
- **Files unchanged** — `skills/lib/render-fase-plan.ts` (inspecionado para verificar wording dos blocos, nao modificado)
- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc
- **Validation result** — output de `bun test`
- **First plan path** — Plano 02 (integrar plan-feature/index.ts ao renderer)
