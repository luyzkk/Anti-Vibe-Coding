<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 01: Golden snapshot + mensagem clara no parity test (CA-07 + CA-08)

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-02 (`tests/e2e/populate-plan-parity.test.ts` ja existe com asserts MH-1/MH-2/MH-3/MH-4)
**Visual:** false

---

## O que esta fase entrega

Fecha o gate "nunca diminuir" no nivel de revisao humana:

1. **Golden snapshot** `tests/e2e/__golden__/populate-plan-andre-parity.md` espelha a estrutura minima esperada do plano populate gerado por `generatePopulatePlanV2()` em projeto Next.js+Supabase (fixture de Plano 04 fase-01). O snapshot e estrutura — headers, lista de fases, primeira linha de cada instrucao imperativa — nao conteudo livre.
2. **Mensagem clara em assert failure** (CA-07): quando qualquer sub-assert do `populate-plan-parity.test.ts` falha, a mensagem aponta exatamente **o que foi removido** (doc canonico, secao, paths) e linka o PRD `docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md`. Substitui mensagens cruas tipo `Expected 12, got 11` por `Faltam docs no plano populate (esperado >= 12, encontrado 11). Verifique se EXCLUDED_FROM_POPULATION_V2 nao readicionou entry. Ver PRD secao MH-1.`
3. **Sub-assert novo (CA-08)** valida diff contra golden e exige aprovacao humana explicita quando snapshot diverge (gate via env `UPDATE_GOLDENS=1` para regenerar — mesma convencao de `init-cutover-greenfield.test.ts`).

Sem esta fase o gate "nunca diminuir" e mecanico (CA-04 ja cobre via Plano 01 fase-02) mas opaco — um regressor le `Expected X, got Y` sem entender o que quebrou. Esta fase torna o gate **legivel** alem de mecanico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/__golden__/populate-plan-andre-parity.md` | Create | Snapshot minimo da estrutura do plano populate (PLAN.md root + 1 fase de exemplo). Linhas estaveis somente — sem date stamps ou paths absolutos. |
| `tests/e2e/populate-plan-parity.test.ts` | Modify | (a) Adicionar 1 `it` novo: `'matches golden snapshot (CA-08)'`. (b) Refatorar mensagens de erro dos asserts MH-1/MH-2/MH-3/MH-4 (acumulados ate Plano 04 fase-03) com formato `Faltam {X} no plano populate. Verifique {causa provavel}. Ver PRD secao {MH-N}.` (c) Helper `assertMatchesGolden(actual, goldenPath)` que normaliza CRLF → LF antes do diff. (d) Suporte a env `UPDATE_GOLDENS=1` para regravar golden via `fs.writeFile`. |
| `tests/e2e/__golden__/README.md` | Modify (se existir) ou Create | Linha de nota explicando que `populate-plan-andre-parity.md` e estrutura minima — regerada apenas com `UPDATE_GOLDENS=1` + aprovacao no PR. |

Estado esperado apos esta fase: rodar `bun test tests/e2e/populate-plan-parity.test.ts` produz N+1 it's (N pre-existentes ate fase-04 do PRD + 1 novo CA-08), todos verdes. Forcar regressao removendo 1 doc canonico do `TEMPLATE_MANIFEST` deve gerar mensagem clara apontando o doc faltante + link ao PRD.

---

## Implementacao

### Passo 1: Reler estado do parity test apos Plano 04 fase-03

```powershell
# Confirmar que o test ja existe e tem os asserts cumulativos MH-1/MH-2/MH-3/MH-4.
Get-Content tests/e2e/populate-plan-parity.test.ts | Select-Object -First 60
```

Esperado: arquivo existe, tem `describe('populate-plan parity (Andre port)', ...)` com pelo menos 4-6 `it` blocks (1 por sub-assert dos Planos 01-04). Se o arquivo nao existir, **parar** — esta fase depende de Plano 01 fase-02 mergeado.

### Passo 2: Capturar estado atual para gerar golden inicial

Em um arquivo temporario `tmp/render-plan-output.ts` (gitignore — usado so para capturar o snapshot inicial):

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-01 — script descartavel para capturar primeiro golden.
// NAO comitar este arquivo. Deletar apos golden inicial gravado.

import { generatePopulatePlanV2 } from '../skills/init/lib/populate-plan-generator'
import { stackAwareInputPaths } from '../skills/init/lib/stack-aware-input-paths'
import path from 'node:path'

async function main() {
  const cwd = path.resolve('tests/fixtures/stack-aware/nextjs-supabase')
  const stackPaths = await stackAwareInputPaths(cwd, 'nextjs')
  const plan = await generatePopulatePlanV2({
    cwd,
    projectName: 'fixture-nextjs-supabase',
    manifest: [],
    stackPaths,
    clock: () => new Date('2026-05-19T00:00:00Z'),
  })
  console.log('=== PLAN INDEX ===')
  console.log(plan.planIndexMarkdown)
  console.log('\n=== FIRST PHASE ===')
  const firstPhaseKey = Array.from(plan.phaseFiles.keys())[0]
  console.log(plan.phaseFiles.get(firstPhaseKey))
}
main()
```

```powershell
bun run tmp/render-plan-output.ts > tmp/golden-raw.txt
```

O output e a base do golden — mas o golden **nao** copia tudo. Filtrar para apenas as linhas estaveis (headers, lista de docs, primeira frase de cada instrucao).

### Passo 3: Criar `tests/e2e/__golden__/populate-plan-andre-parity.md`

Estrutura do golden — capturar **apenas** os marcadores estruturais minimos:

```markdown
<!--
2026-05-19 (Luiz/dev): Plano 05 fase-01 do PRD populate-plan-andre-port.

GOLDEN SNAPSHOT — estrutura minima do plano populate gerado pelo Step 91.

REGRAS:
- Edicao manual apenas para REDUZIR (cobertura cair) — exige justificativa no PR linkando PRD.
- Regen automatica: UPDATE_GOLDENS=1 bun test tests/e2e/populate-plan-parity.test.ts
- Apos regen, diff deve ser revisado humanamente (CA-08).

REGEN VALIDA:
- Adicao de doc canonico (>= 12 → 13 fases).
- Refinamento de instrucao LLM imperativa.
- Path candidato novo em stack-aware-input-paths.

REGEN INVALIDA (build deve quebrar):
- Doc canonico removido.
- LLM_INSTRUCTION sem Fontes/Secoes/Honestidade.
- EXCLUDED_FROM_POPULATION_V2 ganhou entry.
-->

# Plan: Populate Harness — fixture-nextjs-supabase

## Glossario de Instrucoes LLM

- needsUser
- Inputs (docs candidatos)
- Inputs (codigo)
- Criterio done

## Fases

| Fase | Doc canonico |
|------|--------------|
| 01 | ARCHITECTURE.md |
| 02 | AGENTS.md |
| 03 | CLAUDE.md |
| 04 | docs/DESIGN.md |
| 05 | docs/FRONTEND.md |
| 06 | docs/SECURITY.md |
| 07 | docs/RELIABILITY.md |
| 08 | docs/PLANS.md |
| 09 | docs/QUALITY_SCORE.md |
| 10 | docs/CODE_STYLE.md |
| 11 | docs/STATE.md |
| 12 | docs/design-docs/core-beliefs.md |
| 13 | docs/PRODUCT_SENSE.md |
| 14 | README.md |

## Como executar

(despacha 1 subagent por fase via /anti-vibe-coding:execute-plan)

---

## Estrutura minima de fase (qualquer fase)

### Inputs (docs candidatos)

### Inputs (codigo)

### Instrucao LLM
- Fontes:
- Secoes:
- Honestidade

### Criterio de done
```

**Observacao:** o golden **nao** captura o output literal. Captura **marcadores estruturais** — headers exatos e ordem. A diff e `actual.includes(marker)` para cada linha do golden, nao `actual === golden`. Helper `assertMatchesGolden` faz essa comparacao linha-a-linha.

### Passo 4: Refatorar mensagens de erro dos asserts existentes

Localizar no `tests/e2e/populate-plan-parity.test.ts` os asserts dos Planos 01-04:

```typescript
// Antes (assert cru — exemplo Plano 01 fase-02):
expect(plan.phases.length).toBeGreaterThanOrEqual(12)

// Depois (mensagem clara — CA-07):
// 2026-05-19 (Luiz/dev): Plano 05 fase-01 — CA-07. Mensagem aponta o que foi removido
// + linka PRD secao para o regressor entender o gate.
expect(
  plan.phases.length,
  `Plano populate tem ${plan.phases.length} fases (esperado >= 12). ` +
  `Verifique se EXCLUDED_FROM_POPULATION_V2 readicionou entry ou se TEMPLATE_MANIFEST ` +
  `perdeu doc canonico. Ver docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md ` +
  `secao "MH-1 — Lista completa de docs".`,
).toBeGreaterThanOrEqual(12)
```

**Bun test API:** `expect(value, message).toBe...()` aceita mensagem como 2o argumento (compativel com Jest). Se a versao do Bun em uso nao suportar, fallback: wrappar em try/catch e re-throw com mensagem rica.

Aplicar mensagem clara a CADA assert herdado dos Planos 01-04. Padrao:

```
{Verbo do que foi violado} no plano populate (esperado {Y}, encontrado {X}).
Verifique {causa provavel}. Ver PRD secao {MH-N}.
```

Lista nao-exaustiva dos asserts a contextualizar (verificar no test apos Plano 04 fase-03 mergeado):

| Assert origem | Mensagem nova |
|---------------|---------------|
| `phases.length >= 12` (Plano 01) | "Plano populate tem N fases (esperado >= 12). Verifique EXCLUDED_FROM_POPULATION_V2 e TEMPLATE_MANIFEST. PRD secao MH-1." |
| `EXCLUDED nao contem PRODUCT_SENSE/README` (Plano 01) | "EXCLUDED_FROM_POPULATION_V2 readicionou PRODUCT_SENSE.md ou README.md. Remova entry. PRD secao MH-1 + D5." |
| `11 secoes obrigatorias presentes` (Plano 02 fase-04) | "PLAN.md gerado falta secao obrigatoria '{X}' (esperadas 11). Verifique PLAN.md.tpl em skills/init/assets/templates/exec-plan/. PRD secao MH-2 + CA-03." |
| `cada LLM_INSTRUCTION satisfaz isImperativeInstruction` (Plano 03 fase-03) | "LLM_INSTRUCTION para '{dst}' nao tem Fontes/Secoes/Honestidade. PRD secao MH-3 + CA-06." |
| `Next.js+Supabase >= 3 paths reais em SECURITY/ARCHITECTURE/RELIABILITY` (Plano 04 fase-03) | "Cobertura CA-02 caiu — {doc} tem N paths reais (esperado >= 3). Verifique NEXTJS_SUPABASE_EXTRA + fixture tests/fixtures/stack-aware/nextjs-supabase/. PRD secao MH-4 + CA-02." |
| `stack null gera nota sem falhar` (Plano 04 fase-03) | "Stack 'unknown' (null) causou falha — esperado nota 'stack nao detectado' + plano valido. PRD secao MH-4 + CA-05." |

### Passo 5: Adicionar sub-assert CA-08 (snapshot diff)

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-01 do PRD populate-plan-andre-port (CA-08).
// Golden snapshot — diff com aprovacao humana via UPDATE_GOLDENS=1.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const GOLDEN_PATH = path.resolve('tests/e2e/__golden__/populate-plan-andre-parity.md')

function normalize(content: string): string {
  return content.replace(/\r\n/g, '\n').trimEnd()
}

async function assertMatchesGolden(actual: string, goldenPath: string): Promise<void> {
  const actualN = normalize(actual)
  if (process.env.UPDATE_GOLDENS === '1') {
    await fs.writeFile(goldenPath, actualN + '\n')
    return
  }
  const golden = normalize(await fs.readFile(goldenPath, 'utf-8'))
  // Golden contem linhas estruturais minimas. Cada linha nao-vazia deve estar presente
  // no actual (substring match — toleramos variacoes de conteudo em volta).
  const goldenLines = golden.split('\n').filter(l => l.trim() && !l.startsWith('<!--') && !l.startsWith('-->'))
  const missing: string[] = []
  for (const line of goldenLines) {
    if (!actualN.includes(line.trim())) {
      missing.push(line.trim())
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Golden snapshot diverge — ${missing.length} marcador(es) ausente(s) no output:\n` +
      missing.slice(0, 5).map(m => `  - ${m}`).join('\n') +
      (missing.length > 5 ? `\n  ...+${missing.length - 5} mais` : '') +
      `\n\nSe a mudanca e intencional, rode: UPDATE_GOLDENS=1 bun test tests/e2e/populate-plan-parity.test.ts` +
      `\nApos regen, o diff aparece no PR e exige aprovacao humana explicita (CA-08).`
    )
  }
}

it('matches golden snapshot (CA-08)', async () => {
  const cwd = path.resolve('tests/fixtures/stack-aware/nextjs-supabase')
  const stackPaths = await stackAwareInputPaths(cwd, 'nextjs')
  const plan = await generatePopulatePlanV2({
    cwd,
    projectName: 'fixture-nextjs-supabase',
    manifest: [],
    stackPaths,
    clock: () => new Date('2026-05-19T00:00:00Z'),
  })
  // Concatena plan index + 1 fase exemplo (primeira) — golden cobre apenas estrutura
  // minima, nao todas as fases.
  const firstPhaseKey = Array.from(plan.phaseFiles.keys())[0]!
  const firstPhase = plan.phaseFiles.get(firstPhaseKey) ?? ''
  const combined = plan.planIndexMarkdown + '\n---\n## Estrutura minima de fase (qualquer fase)\n\n' + firstPhase
  await assertMatchesGolden(combined, GOLDEN_PATH)
})
```

### Passo 6: Gravar golden inicial via `UPDATE_GOLDENS=1`

```powershell
# Primeira rodada: gera golden
$env:UPDATE_GOLDENS = "1"
bun test tests/e2e/populate-plan-parity.test.ts
Remove-Item env:UPDATE_GOLDENS

# Inspeciona resultado
Get-Content tests/e2e/__golden__/populate-plan-andre-parity.md
```

**Verificar manualmente** que o golden tem **APENAS marcadores estruturais** — sem nomes de projeto especificos, dates absolutos, paths absolutos. Se contiver, editar manualmente para extrair so as estruturas e re-rodar para validar.

### Passo 7: Rodar suite completa para confirmar verde

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** N+1 it's pass (N do Plano 01-04 + 1 novo CA-08).

```powershell
bun test
```

**Esperado:** suite completa verde, zero regressao.

### Passo 8: Validar mensagem clara via regressao simulada

Editar temporariamente `skills/init/lib/populate-plan-generator.ts` linha 60-64:

```typescript
// SIMULACAO — adicionar entry para validar mensagem (REVERTER apos teste)
const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',  // <-- readicionado para simular regressao
])
```

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** ao menos 1 assert falha com mensagem do tipo:
```
EXCLUDED_FROM_POPULATION_V2 readicionou PRODUCT_SENSE.md... PRD secao MH-1 + D5.
```

Apos validar, **reverter** a mudanca em `populate-plan-generator.ts` e re-rodar para confirmar verde.

### Passo 9: Cleanup

```powershell
# Deletar script temporario do Passo 2
Remove-Item tmp/render-plan-output.ts -ErrorAction SilentlyContinue
Remove-Item tmp/golden-raw.txt -ErrorAction SilentlyContinue
```

Registrar em MEMORY.md:
- `DI-Plano05-fase01-golden-format`: golden contem marcadores estruturais (substring match), nao output literal — toleramos variacoes de conteudo em volta dos headers.
- `DI-Plano05-fase01-update-flag`: env var `UPDATE_GOLDENS=1` (mesma convencao de `init-cutover-greenfield.test.ts`) regera golden; sem essa flag, diff quebra build.

---

## Gotchas

- **G1 do plano (line endings em Windows):** Bun em Windows pode gravar golden com CRLF. Helper `normalize()` aplica `.replace(/\r\n/g, '\n')` em ambos os lados antes do diff. Se a regen do Passo 6 gerar CRLF, e cosmetico — proxima rodada normaliza no compare.
- **G2 do plano (Bun `--update-snapshots`):** API e diferente de Jest. NAO usar `toMatchSnapshot()` — convencao do repo e `tests/e2e/__golden__/` + env `UPDATE_GOLDENS=1`. Manter consistencia.
- **G-bun-expect-message (assert message como 2o arg):** Bun test ate versao ~1.0.x aceita `expect(val, msg).toBeXXX()` mas a sintaxe ainda nao e estavel. Se quebrar em CI, fallback:
  ```typescript
  if (plan.phases.length < 12) {
    throw new Error(`Plano populate tem ${plan.phases.length} fases (esperado >= 12). ...`)
  }
  ```
  Registrar como DI no MEMORY.md (`DI-Plano05-fase01-throw-vs-expect`).
- **G-golden-includes-not-equals:** o assert usa `actual.includes(goldenLine)`, nao `actual === golden`. Isso permite que mudancas em conteudo (ex: instrucoes imperativas expandirem com mais texto) nao quebrem o gate — so quebram se a **estrutura** mudar. Decisao consciente: golden e contrato de estrutura, nao de conteudo.
- **G-golden-fase-content:** o golden inclui "Estrutura minima de fase" mas o teste so checa a PRIMEIRA fase do plan. Se a primeira fase tiver instrucao especial (ex: ARCHITECTURE.md primeira), validar manualmente que o trecho capturado nao e content-specific.
- **G-tmp-cleanup:** o `tmp/render-plan-output.ts` do Passo 2 nao deve ser commitado. Adicionar `tmp/` ao `.gitignore` se ainda nao estiver (verificar — `tmp/` ja aparece em `git status` como untracked, mas confirmar que pasta inteira esta gitignored).

---

## Verificacao

### TDD

- [ ] **RED:** ANTES do Passo 6 (sem golden gravado), rodar `bun test tests/e2e/populate-plan-parity.test.ts` — o it `'matches golden snapshot (CA-08)'` falha com `ENOENT: no such file or directory ... populate-plan-andre-parity.md` (golden nao existe).
- [ ] **GREEN:** apos Passo 6 (`UPDATE_GOLDENS=1` + re-rodar), todos os it's pass.
- [ ] **REFACTOR:** se o helper `assertMatchesGolden` for usado em outros testes (improvavel agora, mas pode no Plano 06), extrair para `tests/e2e/__helpers__/golden.ts`. Senao, mantem inline.

### Checklist

- [ ] `tests/e2e/__golden__/populate-plan-andre-parity.md` existe e tem >= 30 linhas de estrutura minima.
- [ ] Helper `assertMatchesGolden()` no parity test normaliza CRLF.
- [ ] Helper `assertMatchesGolden()` suporta env `UPDATE_GOLDENS=1` para regravar.
- [ ] **Todos** os asserts MH-1/MH-2/MH-3/MH-4 (acumulados ate Plano 04 fase-03) tem mensagem rica no formato `... esperado X, encontrado Y. Verifique Z. Ver PRD secao ...`.
- [ ] Sub-assert CA-08 (`'matches golden snapshot (CA-08)'`) presente e verde.
- [ ] Regressao simulada (Passo 8) emite mensagem com link ao PRD — validado manualmente e revertido.
- [ ] `bun test` (suite completa) verde, zero regressao.
- [ ] `bun run lint` limpo.
- [ ] `bun run typecheck` limpo.
- [ ] Script temporario `tmp/render-plan-output.ts` deletado.
- [ ] MEMORY.md atualizada com `DI-Plano05-fase01-golden-format` e `DI-Plano05-fase01-update-flag`.

### Comandos verificaveis

```powershell
# Confirma golden criado
Test-Path tests/e2e/__golden__/populate-plan-andre-parity.md
# Esperado: True

# Suite especifica do parity
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: N+1 pass (N pre-existentes + 1 CA-08)

# Suite completa nao regride
bun test
# Esperado: pre-fase total + 1 (CA-08), zero fails

# Snapshot diff exige UPDATE_GOLDENS=1 para regen — sem ele, mudanca quebra build
# (validado em Passo 8 com regressao simulada e revertida)

# Typecheck + Lint
bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `Test-Path tests/e2e/__golden__/populate-plan-andre-parity.md` retorna `True`.
- `bun test tests/e2e/populate-plan-parity.test.ts` — exit 0; N+1 it's pass.
- Forcar `EXCLUDED_FROM_POPULATION_V2` a ter `'docs/PRODUCT_SENSE.md'` faz o test quebrar com mensagem contendo `"MH-1"` e `"PRD"` (validado manualmente + revertido em Passo 8).
- `bun run typecheck` e `bun run lint` exit 0.

**Por humano:**
- Mensagem de erro de cada assert do parity test linka o PRD (`docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md`) e nomeia a secao (MH-1, MH-2, etc).
- Golden file e legivel (estrutura clara, sem linhas geradas estilo machine-readable).
- Comentario inicial do golden explica regen valida vs invalida.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
