<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Parity asserts CA-02 + CA-05 (gate "nunca diminuir")

**Plano:** 04 — MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido
**Sizing:** 1h
**Depende de:** fase-01 e fase-02 (stack-aware-input-paths expandido, fixture nextjs-supabase com stubs CA-02)
**Visual:** false

---

## O que esta fase entrega

Adicionar 2 sub-asserts em `tests/e2e/populate-plan-parity.test.ts` que fecham
mecanicamente CA-02 (Next.js+Supabase tem `>= 3` paths reais em
ARCHITECTURE/SECURITY/RELIABILITY) e CA-05 (stack `null` gera plano completo com
`Inputs (codigo)` vazio + nota explicita, sem falhar build). Asserts integram com o
gate "nunca diminuir" — se alguem reverter fase-01 ou fase-02 (remover entries do
map ou stubs do fixture), o teste quebra com mensagem listando o doc afetado e
linkando o PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/populate-plan-parity.test.ts` | Modify | Adicionar 2 testes novos: "Next.js+Supabase: >= 3 paths reais em ARCH/SEC/REL (CA-02)" e "stack null: plano completo com Inputs vazios + nota (CA-05)". Mensagens de erro linkam PRD. |

Estado esperado apos esta fase: arquivo `populate-plan-parity.test.ts` tem **4 testes**
(standalone Plano 01 + Plano 04: 2 MH-1 + 2 CA-02/CA-05). Se Plano 02 e Plano 03 tambem
mergeados, total e 8 (mas Plano 04 nao depende disso — cada plano adiciona seu sub-set
de asserts).

---

## Implementacao

### Passo 1: Reler o estado atual do parity test

Abrir `tests/e2e/populate-plan-parity.test.ts` e confirmar estrutura:

```typescript
import { describe, expect, test } from 'bun:test'
import {
  generatePopulatePlanV2,
  EXCLUDED_FROM_POPULATION_V2,
} from '../../skills/init/lib/populate-plan-generator'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')
const PRD_LINK = 'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md (CA-01, CA-04, D5)'
const CA_01_REQUIRED_DOCS: ReadonlyArray<string> = [ /* 12 docs */ ]

describe('populate-plan parity (gate "nunca diminuir")', () => {
  test('plano gerado contem >= 12 fases cobrindo lista CA-01', async () => { /* ... */ })
  test('EXCLUDED_FROM_POPULATION_V2 nao readiciona PRODUCT_SENSE nem README (CA-04)', () => { /* ... */ })
})
```

Confirmar que `generatePopulatePlanV2` aceita `stackPaths?` injetavel — sim, ja existe
(linha 41 de `populate-plan-generator.ts`).

### Passo 2: Adicionar 2 testes novos ao mesmo describe

APOS o teste 2 (`EXCLUDED ...`), antes do fechamento do `describe`, adicionar:

```typescript
// 2026-05-19 (Luiz/dev): Plano 04 fase-03 do PRD populate-plan-andre-port (MH-4).
// CA-02: stack-aware-input-paths cobre 3+ paths reais em ARCHITECTURE/SECURITY/RELIABILITY
// quando primary='nextjs' + sinal Supabase. Reusa fixture `tests/fixtures/stack-aware/nextjs-supabase`
// (stubs adicionados em Plano 04 fase-01).
test('Next.js+Supabase: >= 3 paths reais em ARCH/SEC/REL (CA-02)', async () => {
  // import dinamico — keep top-level imports limpos. Se preferido por consistencia, mover
  // para top.
  const { stackAwareInputPaths } = await import('../../skills/init/lib/stack-aware-input-paths')
  const path = await import('node:path')

  const fixture = path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', 'nextjs-supabase')
  const stackPaths = await stackAwareInputPaths(fixture, 'nextjs')

  // Injetar paths no generator e gerar plano.
  const result = await generatePopulatePlanV2({
    cwd: fixture,
    projectName: 'parity-ca02',
    stackPaths,
    clock: () => FIXED_DATE,
  })

  const docsCriticos = ['ARCHITECTURE.md', 'docs/SECURITY.md', 'docs/RELIABILITY.md'] as const
  const reportadoMenos = docsCriticos
    .map(doc => {
      const phase = result.phases.find(p => p.docCanonico === doc)
      const real = phase?.inputsCode.filter(p => p.exists) ?? []
      return { doc, count: real.length }
    })
    .filter(x => x.count < 3)

  if (reportadoMenos.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" / CA-02] Next.js+Supabase nao atinge 3 paths reais:\n` +
      reportadoMenos.map(x => `  - ${x.doc}: ${x.count} reais (esperado >= 3)`).join('\n') +
      `\n\nVerificar:\n` +
      `  1. Entries em skills/init/lib/stack-aware-input-paths.ts (NEXTJS_SUPABASE_EXTRA + NEXTJS_CANDIDATES).\n` +
      `  2. Stubs em tests/fixtures/stack-aware/nextjs-supabase/ (Plano 04 fase-01 do PRD).\n` +
      `\nRef: ${PRD_LINK}, CA-02.\n`
    )
  }

  for (const { count } of reportadoMenos) {
    expect(count).toBeGreaterThanOrEqual(3)
  }
  // Re-afirmar mesmo apos throw nao acionado (defesa contra falha silenciosa do filter).
  expect(reportadoMenos).toEqual([])
})

// 2026-05-19 (Luiz/dev): Plano 04 fase-03 do PRD populate-plan-andre-port (MH-4).
// CA-05: stack `null` (unknown) ainda gera plano completo. Cada fase tem `inputsCode` vazio
// (ou apenas paths `exists: false`) + nota explicita. Build NAO falha.
test('stack null: plano completo com Inputs vazios + nota (CA-05)', async () => {
  const { stackAwareInputPaths } = await import('../../skills/init/lib/stack-aware-input-paths')
  const path = await import('node:path')

  const fixture = path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', 'empty')
  const stackPaths = await stackAwareInputPaths(fixture, null)

  const result = await generatePopulatePlanV2({
    cwd: fixture,
    projectName: 'parity-ca05',
    stackPaths,
    clock: () => FIXED_DATE,
  })

  // CA-05.a: plano gerado com >= 12 fases mesmo sem stack detectado.
  expect(result.phases.length).toBeGreaterThanOrEqual(12)

  // CA-05.b: cada fase ou tem inputsCode vazio, ou paths todos com exists:false.
  //  "Stack nao detectado" sinaliza ausencia de evidencia de codigo — nao sinaliza falha.
  const fasesFalhas: string[] = []
  for (const phase of result.phases) {
    const realCount = phase.inputsCode.filter(p => p.exists).length
    if (realCount > 0) {
      // Stack null nao deveria retornar paths reais — sinal de bug do GENERIC_CANDIDATES.
      fasesFalhas.push(`${phase.docCanonico}: ${realCount} paths com exists=true (esperado 0)`)
    }
  }

  if (fasesFalhas.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" / CA-05] stack null produziu paths reais (deveria 0):\n` +
      fasesFalhas.map(s => `  - ${s}`).join('\n') +
      `\n\nGENERIC_CANDIDATES em skills/init/lib/stack-aware-input-paths.ts deveria emitir paths\n` +
      `que NAO existem no fixture tests/fixtures/stack-aware/empty/.\n` +
      `Se fixture cresceu (Plano 05?), confirmar que stubs de empty foram preservados.\n` +
      `Ref: ${PRD_LINK}, CA-05.\n`
    )
  }

  // CA-05.c: renderer emite nota explicita quando inputsCode esta vazio.
  //  renderInputsCodeBlock retorna "_(Nenhum path candidato para este doc no stack detectado.)_"
  //  quando entries.length === 0. Conferir que PELO MENOS UMA fase no plano tem
  //  inputsCode com >= 1 entry de exists:false (nao vazio) OU literalmente 0 (vazio).
  //
  //  Estrategia: localizar o markdown renderizado de cada fase e checar a presenca da nota.
  const fasesComNota: string[] = []
  for (const [, content] of result.phaseFiles.entries()) {
    if (
      content.includes('_(Nenhum path candidato') ||
      content.includes('_(candidato nao encontrado')
    ) {
      fasesComNota.push('ok')
    }
  }
  // Pelo menos 1 fase deve emitir a nota — caso contrario, renderer regrediu.
  expect(fasesComNota.length).toBeGreaterThanOrEqual(1)
})
```

### Passo 3: Decidir top-level vs dynamic import

Atualmente o teste usa `import dinamico` para `stackAwareInputPaths` e `node:path`.
Alternativa: mover ambos para topo do arquivo. Decisao recomendada:

- **Mover** `import path from 'node:path'` para topo (limpo, sem custo).
- **Manter dinamico** `stackAwareInputPaths` se houver preocupacao com isolamento de
  contexto de teste — nao ha, simplificar para top-level.

Refator (preferida — top-level):

```typescript
// Topo do arquivo
import { describe, expect, test } from 'bun:test'
import path from 'node:path'
import {
  generatePopulatePlanV2,
  EXCLUDED_FROM_POPULATION_V2,
} from '../../skills/init/lib/populate-plan-generator'
import { stackAwareInputPaths } from '../../skills/init/lib/stack-aware-input-paths'
```

Atualizar os 2 testes novos para usar imports do topo (remover `await import(...)`).

Registrar em MEMORY.md como `DI-Plano04-fase03-imports-toplevel`.

### Passo 4: Rodar parity test

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** 4 pass, 0 fail.

Cenarios de falha simulada (NAO commitar — apenas mental):
1. Remover entry `'docs/SECURITY.md'` de `NEXTJS_SUPABASE_EXTRA` → CA-02 falha listando
   `docs/SECURITY.md`.
2. Deletar `tests/fixtures/stack-aware/nextjs-supabase/supabase/migrations/20260519000000_init.sql`
   → CA-02 falha com `< 3 reais` em RELIABILITY ou SECURITY (dependendo de quais paths
   estavam atingindo).
3. Adicionar arquivo a `tests/fixtures/stack-aware/empty/` (ex: `package.json`) →
   CA-05 falha listando `ARCHITECTURE.md` com paths reais > 0.

Verificar que cada cenario produz mensagem util.

### Passo 5: Suite completa + lint/typecheck

```powershell
bun test
bun run typecheck
bun run lint
```

**Esperado:** zero regressao em outros testes.

### Passo 6: Atualizar MEMORY.md

Registrar:
- `DI-Plano04-fase03-imports-toplevel` (decisao de mover imports para topo).
- `DI-Plano04-fase03-fasesComNota-min1`: assert CA-05.c verifica `>= 1` fase com nota.
  Decisao: nao exige todas as fases — basta UMA para provar que o renderer continua
  emitindo a nota correta. Plano 05 fase-01 pode endurecer para "todas as fases sem
  paths emitem nota".
- Numero final de testes no parity: 4 (standalone) ou 8 (com Plano 02 e Plano 03 merged).

### Passo 7: Cross-check de mensagens de erro

Antes de fechar a fase, confirmar:
- Mensagem CA-02 lista doc afetado + path do arquivo a verificar + link PRD.
- Mensagem CA-05 explica o invariante ("stack null deveria produzir 0 paths reais") + cite
  fixture e PRD.
- Mensagens seguem o padrao das fases anteriores (formato multi-linha com `\n` literais,
  bullets indentados, "Ref:" no final).

---

## Gotchas

- **G1 (fixture empty pode crescer):** `tests/fixtures/stack-aware/empty/` ideal NAO tem
  arquivos. Se em algum momento alguem adicionar arquivos para outro teste, CA-05 quebra
  silenciosamente (paths reais > 0). Mitigacao: adicionar `.gitkeep` E nota no
  `tests/fixtures/stack-aware/README.md` (fase-01) explicitando.
- **G2 (CA-05.c — fasesComNota):** se renderer mudar a frase exata (ex: alguem refatorar
  de "_(Nenhum path candidato_" para "_(Sem paths candidatos_"), o assert quebra. Documentar
  em MEMORY.md a frase exata esperada. Plano 05 fase-01 (golden snapshot) e onde a frase
  fica canonicizada — esta fase aceita verificacao loose.
- **G3 (path.join em tests com paths absolutos):** `import.meta.dir` retorna pasta do
  arquivo de teste (em `tests/e2e/`). `path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', ...)`
  resolve para `tests/fixtures/stack-aware/...` — esse e o mesmo padrao usado em
  `skills/init/lib/stack-aware-input-paths.test.ts` linha 6, mas com profundidade diferente
  (4 levels vs 5). Conferir antes de rodar.
- **G4 (CA-02 depende de fase-01 + fase-02 mergeadas):** se Plano 04 fase-03 rodar antes
  de fase-01/fase-02 (cenario teorico — desencorajado), o teste falha. Mantain a ordem
  (fase-01 → fase-02 → fase-03) no commit/PR.
- **G5 (mensagem de erro nao deve mostrar paths absolutos do Windows):** mensagens listam
  `tests/fixtures/stack-aware/...` (relativo). NAO emitir `import.meta.dir` resolved
  (poluiria stdout no CI). Verificar com simulacao de falha.

---

## Verificacao

### TDD

- [ ] **RED:** ANTES das mudancas de codigo de fase-01/fase-02 (cenario reverso), adicionar
      apenas os 2 novos testes — esperado: 2 fails (`< 3 reais` em CA-02 e/ou paths reais
      > 0 em CA-05 se generic emite paths reais para o fixture empty).
- [ ] **GREEN:** apos fase-01 e fase-02 aplicadas, rodar — 4 pass.

### Checklist

- [ ] `tests/e2e/populate-plan-parity.test.ts` tem 4 testes (`describe` cobre todos).
- [ ] Teste 3 (CA-02) usa `stackAwareInputPaths` + `nextjs-supabase` fixture e checa 3 docs
      criticos.
- [ ] Teste 4 (CA-05) usa `empty` fixture com `primary=null` e checa que:
      (a) plano e gerado com `>= 12` fases;
      (b) nenhuma fase tem `exists:true` em paths;
      (c) ao menos 1 fase emite nota explicita no markdown.
- [ ] Mensagens de erro de ambos testes linkam PRD via const `PRD_LINK`.
- [ ] Imports de `path` e `stackAwareInputPaths` movidos para topo do arquivo (decisao
      `DI-Plano04-fase03-imports-toplevel`).
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` — 4 pass.
- [ ] `bun test` — zero regressao.
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.

### Comandos verificaveis

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: 4 pass, 0 fail (com Plano 01 + Plano 04 mergeados)
# Se Plano 02 e Plano 03 tambem mergeados: 8 pass, 0 fail

bun test
# Zero regressao

bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `tests/e2e/populate-plan-parity.test.ts` contem 4 ocorrencias de `test(`/`test('` no
  describe principal.
- `bun test tests/e2e/populate-plan-parity.test.ts` retorna exit 0 com >= 4 testes passando.
- Reverter manualmente fase-01 (apenas para validacao, nao commit) e rodar mesmo comando —
  retorna exit code != 0 com mensagem contendo `'CA-02'` e linkando PRD.
- `Select-String -Pattern "Next.js\+Supabase: >= 3 paths" -Path tests/e2e/populate-plan-parity.test.ts`
  retorna 1 match.
- `Select-String -Pattern "stack null: plano completo" -Path tests/e2e/populate-plan-parity.test.ts`
  retorna 1 match.

**Por humano:**
- Mensagens de erro dos 2 novos testes sao legiveis para reviewer do PR — explicam o que
  foi removido e onde verificar, sem precisar abrir o codigo do teste.
- Imports limpos no topo (sem `await import` dinamico salvo justificativa em comentario).
- Comentarios `2026-05-19 (Luiz/dev)` apontando Plano 04 fase-03 + CA-02 / CA-05.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
