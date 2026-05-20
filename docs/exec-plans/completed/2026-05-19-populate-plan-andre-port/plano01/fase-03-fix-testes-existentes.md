<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Fix testes existentes (regressao por flip da lista)

**Plano:** 01 — MH-1 Lista completa de docs (Tracer Bullet)
**Sizing:** 1h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

`populate-plan-generator.test.ts` linhas 44-54 atualizado para refletir o novo comportamento: o
plano populate INCLUI `docs/PRODUCT_SENSE.md` e `README.md`, e exclui APENAS
`docs/COMPOUND_ENGINEERING.md`. Suite verde apos fase-01 + fase-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.test.ts` | Modify | reescrever teste `'does NOT include excluded files (D14 PRD — filosoficos)'` (linhas 44-54) |
| `tests/e2e/greenfield-populate-plan.test.ts` | Modify (condicional) | linhas 19-23: atualizar `EXCLUDED_FROM_POPULATION` local para refletir novo Set (so COMPOUND_ENGINEERING) — verificar primeiro |

---

## Implementacao

### Passo 1: Reescrever teste em `populate-plan-generator.test.ts`

Estado atual (linhas 44-54):

```typescript
  it('does NOT include excluded files (D14 PRD — filosoficos)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    const docs = result.phases.map(p => p.docCanonico)
    expect(docs).not.toContain('docs/COMPOUND_ENGINEERING.md')
    expect(docs).not.toContain('docs/PRODUCT_SENSE.md')
    expect(docs).not.toContain('README.md')
  })
```

Substituir por:

```typescript
  // 2026-05-19 (Luiz/dev): Plano 01 fase-03 — flip do assert apos D5 do PRD populate-plan-andre-port.
  // D14 do PRD anterior excluia PRODUCT_SENSE e README. D5 do PRD novo reverte: so COMPOUND_ENGINEERING
  // fica de fora (meta-doc filosofico, sem codigo a referenciar). PRODUCT_SENSE e README voltam.
  it('exclui apenas docs filosoficos (D5 PRD — so COMPOUND_ENGINEERING)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    const docs = result.phases.map(p => p.docCanonico)
    // Excluido (meta-documentacao do processo — sem codigo a referenciar):
    expect(docs).not.toContain('docs/COMPOUND_ENGINEERING.md')
    // Reincluidos (D5 do PRD — Andre tem ambos ricos no harness):
    expect(docs).toContain('docs/PRODUCT_SENSE.md')
    expect(docs).toContain('README.md')
  })
```

### Passo 2: Verificar e ajustar `greenfield-populate-plan.test.ts`

Abrir `tests/e2e/greenfield-populate-plan.test.ts` linhas 19-23. Estado atual:

```typescript
const EXCLUDED_FROM_POPULATION = new Set([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
```

Esse Set local **replica** o EXCLUDED do generator (comentario na linha 17: "Replicar exatamente os
filtros"). Se ficar desatualizado, o calculo de `expectedTaskCount` (linha 78) fica errado e o test
quebra. Substituir por:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-03 — sincronizado com generator apos D5 do PRD
// populate-plan-andre-port. PRODUCT_SENSE.md e README.md voltaram para populate. Apenas
// COMPOUND_ENGINEERING permanece excluido (meta-doc filosofico).
const EXCLUDED_FROM_POPULATION = new Set([
  'docs/COMPOUND_ENGINEERING.md',
])
```

**Alternativa melhor (registrar em MEMORY.md como DI):** importar `EXCLUDED_FROM_POPULATION_V2` do
generator (ja exportado em fase-02 Passo 3) em vez de duplicar. Reduz uma fonte de divergencia.

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-03 — importa do generator em vez de duplicar local.
// Single source of truth (CLAUDE.md global: "Uma fonte de verdade").
import { EXCLUDED_FROM_POPULATION_V2 as EXCLUDED_FROM_POPULATION } from '../../skills/init/lib/populate-plan-generator'
```

Preferir a alternativa (import) se o teste ainda passar. Se houver erro de tipo (export e
`Set<string>`, talvez teste use `Set<string>` localmente — compatibilidade direta), aplicar o
hardcoded.

### Passo 3: Auditar outros testes potencialmente afetados

Rodar:

```powershell
bun test skills/init/lib/populate-plan-generator.test.ts
bun test tests/e2e/greenfield-populate-plan.test.ts
bun test
```

Listar no MEMORY.md como `BUG-Plano01-fase03-N` qualquer teste que quebrar com a mudanca, sintoma
e fix aplicado. Candidatos potenciais:

- `tests/e2e/init-tracer-bullet.test.ts` — verificar se conta entries.
- `tests/e2e/ca12-greenfield-populate-validate.test.ts` — verificar se assume lista antiga.
- `tests/e2e/__golden__/init-greenfield.stdout.txt` — golden snapshot ja registrado como precisando
  regeneracao em MEMORY.md raiz (Plano 05 fase-04 do feature antigo). NAO regenerar nesta fase —
  documentar como "esperado quebrar, fix em Plano 05 fase-06 do feature atual".

### Passo 4: Confirmar suite verde

Apos ajustes, rodar suite completa:

```powershell
bun test
bun run lint
```

Expectativa: 0 novos failures alem do golden init-greenfield (esperado quebrar, ja documentado em
MEMORY.md raiz como input para Plano 05 fase-06).

Se houver failures inesperados, NAO mascarar com skip — investigar e fix aqui ou documentar como
input para fase seguinte.

---

## Gotchas

- **G4 do plano (regressao no teste existente):** Esta fase E a fix do G4. Sem ela, o teste fica
  falsamente verde por tautologia mas inutil para detectar regressao real. Mensagem do test name
  foi atualizada de "does NOT include" para "exclui apenas" — refletindo o intent novo.
- **Local (greenfield E2E):** O teste em `tests/e2e/greenfield-populate-plan.test.ts` calcula
  `expectedTaskCount = TEMPLATE_MANIFEST.filter(e => isPopulatable(e.dst)).length`. Se a versao
  local do `isPopulatable` ficar dessincronizada com o generator (3 entries vs 1), o test quebra
  com "expected X, received Y" em `tableRows`. Preferir import direto do generator (Passo 2
  alternativa).
- **Local (golden snapshot quebrado e ESPERADO):** `init-greenfield.stdout.txt` provavelmente
  passou a conter referencia a fases novas que nao existiam no golden antigo. NAO regenerar nesta
  fase — apenas documentar no MEMORY.md como input para Plano 05 fase-06.

---

## Verificacao

### TDD

- [ ] **RED:** Antes desta fase (apos fase-01 mergeada), o teste linha 44-54 esta `not.toContain`
      tautologico — ele passa mas nao testa nada util. Nao ha "RED" literal — e refactor de teste
      semantico, nao adicao de funcionalidade.
- [ ] **GREEN:** Apos esta fase, o teste afirma o intent correto:
      - Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`
      - Resultado esperado: `6 pass, 0 fail` (6 testes — 5 originais + o reescrito).

### Checklist

- [ ] Teste em `populate-plan-generator.test.ts` linha 44-54 reescrito com novo nome
      (`'exclui apenas docs filosoficos (D5 PRD — so COMPOUND_ENGINEERING)'`).
- [ ] Asserts incluem `expect(docs).toContain('docs/PRODUCT_SENSE.md')` E
      `expect(docs).toContain('README.md')` (positivos, nao mais negativos).
- [ ] Comentario datado 2026-05-19 explica o flip e referencia D5 do PRD.
- [ ] `greenfield-populate-plan.test.ts` linhas 19-23 ajustado (hardcoded reduzido OU import direto
      do generator).
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` passa (6 testes).
- [ ] `bun test tests/e2e/greenfield-populate-plan.test.ts` passa.
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` continua passando (nao regrediu).
- [ ] `bun test` suite completa: 0 novos failures alem dos goldens documentados em MEMORY.md raiz.
- [ ] `bun run lint` limpo.

### Comandos verificaveis

```powershell
# Teste unitario do generator
bun test skills/init/lib/populate-plan-generator.test.ts

# Teste E2E greenfield (calcula expectedTaskCount)
bun test tests/e2e/greenfield-populate-plan.test.ts

# Parity test (do fase-02) continua verde
bun test tests/e2e/populate-plan-parity.test.ts

# Suite completa
bun test

# Lint
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-plan-generator.test.ts` retorna exit 0 com 6 testes passando.
- `bun test tests/e2e/greenfield-populate-plan.test.ts` retorna exit 0 (E2E greenfield ainda
  valido).
- `bun test tests/e2e/populate-plan-parity.test.ts` retorna exit 0 (regressao da fase-02 nao
  introduzida).
- `bun test` suite completa: count de failures pre-existentes nao aumenta (golden
  init-greenfield.stdout.txt esperado quebrar — documentar em MEMORY.md como input para Plano 05
  fase-06; NAO contar como regressao desta fase).

**Por humano:**
- Diff do teste mostra mudanca de intent clara: `not.toContain` virou `toContain` para PRODUCT_SENSE
  e README. Test name reflete o novo intent.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
