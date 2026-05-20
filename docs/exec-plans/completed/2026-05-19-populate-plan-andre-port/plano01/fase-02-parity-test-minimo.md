<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Parity test minimo (gate "nunca diminuir")

**Plano:** 01 — MH-1 Lista completa de docs (Tracer Bullet)
**Sizing:** 1.5h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

`tests/e2e/populate-plan-parity.test.ts` com 2 asserts iniciais que travam o gate "nunca diminuir"
(CA-04 do PRD): plano gerado tem `phases.length >= 12` e `EXCLUDED_FROM_POPULATION_V2` nao contem
`docs/PRODUCT_SENSE.md` nem `README.md`. Mensagem de erro aponta o doc removido + linka PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/populate-plan-parity.test.ts` | Create | parity test E2E com 2 asserts iniciais |

Sub-asserts adicionais (CA-02, CA-03, CA-05, CA-06) serao adicionados em Plano 02 fase-04, Plano 03
fase-03, Plano 04 fase-03. Esta fase cria o esqueleto + 2 asserts MH-1.

---

## Implementacao

### Passo 1: Decidir estrategia para evitar abort do Step 90 (G1 do plano)

Risco PRD: Step 90 (`90-final-validation.ts`) verifica `.claude/knowledge/{stack}/INDEX.md` e aborta
com code:1 se ausente. Em test environment o cache global pode estar vazio.

Duas opcoes:

**Opcao A (preferida — menos acoplamento):** chamar `generatePopulatePlanV2()` diretamente, sem
rodar pipeline `/init` inteiro. Vantagens: nao depende de fixture filesystem; nao mexe em cache
global; setup minimo. Desvantagens: nao valida integracao Step 91 -> writer.

**Opcao B:** pre-popular stub `.claude/knowledge/{stack}/INDEX.md` no fixture antes de chamar
`runInit`. Vantagens: cobre integracao end-to-end. Desvantagens: dependencia frageis de stack
detection; setup maior.

**Decisao: usar Opcao A** para o assert MH-1 (introspeccao da lista). Esta fase fica focada em
"lista correta de docs no plano gerado" — isso e propriedade da pure function
`generatePopulatePlanV2`. Integracao E2E completa (com `runInit`) fica em Plano 05 fase-01 (golden
snapshot).

Registrar decisao no MEMORY.md como `DI-Plano01-fase02-isolated-call`.

### Passo 2: Criar arquivo de teste

Criar `tests/e2e/populate-plan-parity.test.ts`:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-02 do PRD populate-plan-andre-port.
// Gate "nunca diminuir" (CA-04, CA-07). Cresce em sub-asserts:
//   - Plano 02 fase-04: 11 secoes obrigatorias do PLAN.md (CA-03).
//   - Plano 03 fase-03: cada LLM_INSTRUCTION imperativa (CA-06).
//   - Plano 04 fase-03: paths reais por stack (CA-02, CA-05).
// Decisao DI-Plano01-fase02-isolated-call: chama generatePopulatePlanV2 direto, sem runInit,
// para evitar abort do Step 90 (V6.6.0 knowledge gate). Integracao end-to-end fica em Plano 05.

import { describe, expect, test } from 'bun:test'
import {
  generatePopulatePlanV2,
  EXCLUDED_FROM_POPULATION_V2,
} from '../../skills/init/lib/populate-plan-generator'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')

const PRD_LINK =
  'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md (CA-01, CA-04, D5)'

// Lista enumerada em CA-01 do PRD — mantem reference visivel para mensagens de erro.
const CA_01_REQUIRED_DOCS: ReadonlyArray<string> = [
  'ARCHITECTURE.md',
  'AGENTS.md',
  'README.md',
  '.claude/CLAUDE.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/SECURITY.md',
  'docs/RELIABILITY.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/CODE_STYLE.md',
]

describe('populate-plan parity (gate "nunca diminuir")', () => {
  test('plano gerado contem >= 12 fases cobrindo lista CA-01', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'parity-test',
      clock: () => FIXED_DATE,
    })

    const docsEmitidos = result.phases.map(p => p.docCanonico)
    const ausentes = CA_01_REQUIRED_DOCS.filter(d => !docsEmitidos.includes(d))

    if (ausentes.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir"] Docs esperados ausentes do plano:\n` +
        ausentes.map(d => `  - ${d}`).join('\n') +
        `\n\nSe removido propositalmente, atualize ${PRD_LINK} CA-01 e regenere golden\n` +
        `tests/e2e/__golden__/populate-plan-andre-parity.md.\n` +
        `Plano gerado: ${result.phases.length} fases. Esperado: >= 12.\n`
      )
    }

    expect(result.phases.length).toBeGreaterThanOrEqual(12)
  })

  test('EXCLUDED_FROM_POPULATION_V2 nao readiciona PRODUCT_SENSE nem README (CA-04)', () => {
    const proibidos: ReadonlyArray<string> = ['docs/PRODUCT_SENSE.md', 'README.md']
    const readicionados = proibidos.filter(d => EXCLUDED_FROM_POPULATION_V2.has(d))

    if (readicionados.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir"] EXCLUDED_FROM_POPULATION_V2 readicionou docs proibidos:\n` +
        readicionados.map(d => `  - ${d}`).join('\n') +
        `\n\nD5 do PRD removeu esses docs do EXCLUDED — eles devem aparecer no plano populate.\n` +
        `Reverter mudanca em skills/init/lib/populate-plan-generator.ts:60.\n` +
        `Ref: ${PRD_LINK}.\n`
      )
    }

    expect(readicionados).toEqual([])
  })
})
```

### Passo 3: Tornar `EXCLUDED_FROM_POPULATION_V2` exportado

O teste importa `EXCLUDED_FROM_POPULATION_V2` de `populate-plan-generator.ts`. Atualmente esta como
`const` privado (linha 60). Mudar para `export const`:

```typescript
// 2026-05-19 (Luiz/dev): D5 do PRD populate-plan-andre-port — exportado para inspeccao em
// tests/e2e/populate-plan-parity.test.ts (gate "nunca diminuir", CA-04).
export const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
])
```

Verificar com `bun run typecheck` que nenhum caller atual quebra (era privado, agora exportado —
adicao, nao remocao).

### Passo 4: Rodar o teste e validar mensagem de erro

Confirmar que ambos asserts passam APOS fase-01 estar mergeada:

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

Esperado: `2 passed, 0 failed`.

Para validar mensagem de erro do gate, simular regressao manual (NAO commitar):
1. Reverter `populate-plan-generator.ts` para `EXCLUDED_FROM_POPULATION_V2` com 3 entries.
2. Rodar teste — deve falhar com mensagem listando `docs/PRODUCT_SENSE.md` e `README.md` como
   readicionados + link para PRD.
3. Re-aplicar fase-01.

---

## Gotchas

- **G1 do plano (Step 90 abort):** Mitigado via Opcao A (chamada isolada de `generatePopulatePlanV2`).
  Documentado em DI-Plano01-fase02-isolated-call no MEMORY.md. Sem essa decisao, o test poderia
  abortar antes do assert rodar.
- **Local (test isolation):** O teste usa `clock: () => FIXED_DATE` para determinismo
  (CLAUDE.md global: "Clock injetado para determinismo"). Sem isso, `relativeFolderPath` muda a
  cada run e quebra hipotetica regeneracao de golden.
- **Local (export const):** Adicionar `export` em `EXCLUDED_FROM_POPULATION_V2` e mudanca aditiva
  segura (nao remove API existente). Se algum lint stricter sinalizar "no unused exports", suprimir
  com comentario apontando uso em test.
- **Local (mensagem de erro do gate):** Mensagem deve listar o doc removido NOMEADO + linkar PRD —
  CA-07 e explicito sobre isso. Sem listar nome + link, o gate falha em "ser util" mesmo passando.

---

## Verificacao

### TDD

- [ ] **RED:** Antes de aplicar fase-01 (se rodar em ordem inversa — apenas mental check), o teste
      deveria falhar com mensagem listando docs ausentes.
      - Comando: `bun test tests/e2e/populate-plan-parity.test.ts`
      - Resultado esperado SEM fase-01: erro `Docs esperados ausentes do plano: PRODUCT_SENSE.md, README.md`
- [ ] **GREEN:** Apos fase-01 mergeada + Passo 3 (export), teste passa.
      - Comando: `bun test tests/e2e/populate-plan-parity.test.ts`
      - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] Arquivo `tests/e2e/populate-plan-parity.test.ts` existe e tem 2 testes.
- [ ] Teste 1 (`plano gerado contem >= 12 fases`): verifica todos os docs de `CA_01_REQUIRED_DOCS`
      estao em `result.phases.map(p => p.docCanonico)`.
- [ ] Teste 2 (`EXCLUDED nao readiciona`): introspeciona o Set exportado, verifica que
      `docs/PRODUCT_SENSE.md` e `README.md` NAO estao presentes.
- [ ] Mensagens de erro de ambos testes linkam o PRD (`PRD_LINK` const).
- [ ] `EXCLUDED_FROM_POPULATION_V2` virou `export const` em `populate-plan-generator.ts`.
- [ ] Typecheck limpo: `bun run typecheck`.
- [ ] Suite completa nao regrediu: `bun test`.
- [ ] Lint limpo: `bun run lint`.

### Comandos verificaveis

```powershell
# Rodar so o parity test
bun test tests/e2e/populate-plan-parity.test.ts

# Confirmar 2 passed
# Output esperado: "2 pass, 0 fail" (formato bun:test)

# Suite completa nao regride
bun test
```

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/populate-plan-parity.test.ts` retorna exit code 0 com 2 testes passando.
- Reverter manualmente fase-01 (apenas para validacao, nao commit) e rodar mesmo comando — retorna
  exit code != 0 com mensagem de erro contendo `'docs/PRODUCT_SENSE.md'` E linkando PRD.
- `import { EXCLUDED_FROM_POPULATION_V2 } from '../../skills/init/lib/populate-plan-generator'`
  compila sem erro de tipo.

**Por humano:**
- Mensagem de erro do gate e legivel para o reviewer do PR sem precisar abrir o codigo do teste —
  ele ve "doc X foi removido do plano, atualize PRD Y" de cara.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
