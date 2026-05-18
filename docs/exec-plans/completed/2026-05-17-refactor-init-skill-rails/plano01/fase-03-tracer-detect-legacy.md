<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Tracer Bullet — detect-legacy portado

**Plano:** 01 — Foundation + Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

Step 0.5 do `SKILL.md` (linhas 16-36) portado para `skills/init/lib/steps/00-detect-legacy.ts`,
registrado no `registry`, e validado por **golden test** byte-identico contra o stdout do bloco
inline original. Este eh o **tracer bullet** que prova que o contrato `Step` + dispatcher
funcionam ponta-a-ponta.

**IMPORTANTE:** `skills/init/SKILL.md` NAO eh modificado nesta fase. O cutover acontece somente
no Plano 04. Aqui, o step portado coexiste com o inline — ambos sao validados a produzirem o
mesmo output.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/00-detect-legacy.ts` | Create | Step que invoca `detectV5Legacy` e emite os logs canonicos |
| `skills/init/lib/registry.ts` | Modify | Adicionar `detectLegacyStep` como PRIMEIRA entrada |
| `skills/init/lib/steps/00-detect-legacy.test.ts` | Create | Testes unitarios (3 cenarios) + golden test |
| `skills/init/lib/steps/__fixtures__/greenfield/` | Create | Fixture vazia (sem artefatos v5) |
| `skills/init/lib/steps/__fixtures__/legacy/.planning/keep.md` | Create | Fixture com `.planning/` populado |
| `skills/init/lib/steps/__fixtures__/partial/.planning/keep.md` | Create | Fixture v5 + `docs/exec-plans/` (partial migration) |
| `skills/init/lib/steps/__fixtures__/partial/docs/exec-plans/.gitkeep` | Create | Marca v6 da fixture partial |
| `skills/init/lib/steps/__golden__/detect-legacy-greenfield.txt` | Create | Snapshot stdout esperado (greenfield) |
| `skills/init/lib/steps/__golden__/detect-legacy-legacy.txt` | Create | Snapshot stdout esperado (legacy) |
| `skills/init/lib/steps/__golden__/detect-legacy-partial.txt` | Create | Snapshot stdout esperado (partial) |

---

## Implementacao

### Passo 1: Portar o step (`00-detect-legacy.ts`)

REGRA ABSOLUTA: wording dos `console.log`/`reason` byte-identico ao bloco inline em
`skills/init/SKILL.md` linhas 21-35. Comparar caractere a caractere — incluindo backticks,
hifens, ponto final. PRD R1, G1 do plano.

Mapeamento `process.exit(N)` → `throw new AbortError({ code: N, reason })` (PRD D4).

```typescript
// skills/init/lib/steps/00-detect-legacy.ts
import { detectV5Legacy } from '../detect-v5-legacy'
import { AbortError } from './abort-error'
import type { Step } from './types'

export const detectLegacyStep: Step = {
  id: 'detect-legacy',
  async run(ctx) {
    const state = await detectV5Legacy(ctx.cwd)

    if (state.alreadyMigrated && state.isLegacy) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 26-27 (PRD R1, G1).
      // Concatenado com \n para colapsar 2 console.log em uma reason — dispatcher emite via log().
      throw new AbortError({
        code: 2,
        reason:
          'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?\n' +
          'Run `/init migrate --resume` or remove residuals manually.',
      })
    }

    if (state.isLegacy) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 31-32 (PRD R1, G1).
      throw new AbortError({
        code: 1,
        reason:
          `Detected v5.x artifacts: ${state.artifacts.join(', ')}\n` +
          'Run `/init migrate` (or `--dry-run` to preview).',
      })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 35 (PRD R1, G1).
    return { mutated: false, summary: 'Greenfield project — proceeding with scaffold.' }
  },
}
```

> Decisao explicita: o caso greenfield retorna via `summary` (dispatcher loga prefixado com `[detect-legacy]`).
> Os 2 casos de abort embutem o wording inteiro em `reason` para que o dispatcher emita
> palavra-por-palavra. Isso preserva o que scripts CI fazem `grep` (PRD R3).
> Trade-off conhecido: o prefixo `[detect-legacy] ` aparece SOMENTE no caso ok. O Plano 04 decide
> se o cutover do SKILL.md remove esse prefixo do log() para casar 100% com o inline. Por ora,
> golden tests separam: stdout puro (reason) vs stdout do dispatcher (com prefixo).

### Passo 2: Registrar no `registry.ts`

```typescript
// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy SEMPRE primeiro (PRD: gate inicial).
export const registry: readonly Step[] = [detectLegacyStep]
```

### Passo 3: Criar fixtures

Estruturas minimas no FS para reproduzir os 3 cenarios:

```
skills/init/lib/steps/__fixtures__/
  greenfield/          (diretorio vazio — git nao versiona vazio; usar .gitkeep)
    .gitkeep
  legacy/
    .planning/
      keep.md          (qualquer conteudo — exists() so olha se eh nao-vazio)
  partial/
    .planning/
      keep.md
    docs/
      exec-plans/
        .gitkeep
```

Conteudo de `keep.md` (qualquer): `# placeholder`. Conteudo dos `.gitkeep`: vazio.

### Passo 4: Testes unitarios + golden (`00-detect-legacy.test.ts`)

```typescript
// skills/init/lib/steps/00-detect-legacy.test.ts
import { describe, test, expect } from 'bun:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { detectLegacyStep } from './00-detect-legacy'
import { AbortError } from './abort-error'

const FIX = path.join(import.meta.dir, '__fixtures__')
const GOLDEN = path.join(import.meta.dir, '__golden__')

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('detectLegacyStep', () => {
  test('greenfield: returns summary, no abort', async () => {
    const report = await detectLegacyStep.run(ctx(path.join(FIX, 'greenfield')))
    expect(report).toEqual({
      mutated: false,
      summary: 'Greenfield project — proceeding with scaffold.',
    })
    const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-greenfield.txt'), 'utf8')).trimEnd()
    expect(report.summary).toBe(golden)
  })

  test('legacy: throws AbortError code 1 with byte-identical reason', async () => {
    try {
      await detectLegacyStep.run(ctx(path.join(FIX, 'legacy')))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(1)
        const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-legacy.txt'), 'utf8')).trimEnd()
        expect(e.reason).toBe(golden)
      }
    }
  })

  test('partial migration: throws AbortError code 2 with byte-identical reason', async () => {
    try {
      await detectLegacyStep.run(ctx(path.join(FIX, 'partial')))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
        const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-partial.txt'), 'utf8')).trimEnd()
        expect(e.reason).toBe(golden)
      }
    }
  })
})
```

### Passo 5: Criar os snapshots golden

Conteudo EXATO de cada arquivo (copiar de `SKILL.md` linhas 21-35):

`skills/init/lib/steps/__golden__/detect-legacy-greenfield.txt`:
```
Greenfield project — proceeding with scaffold.
```

`skills/init/lib/steps/__golden__/detect-legacy-legacy.txt`:
```
Detected v5.x artifacts: planning-dir
Run `/init migrate` (or `--dry-run` to preview).
```

`skills/init/lib/steps/__golden__/detect-legacy-partial.txt`:
```
Project has both v5 artifacts AND docs/exec-plans/ — partial migration?
Run `/init migrate --resume` or remove residuals manually.
```

> Atencao: o caractere `—` (em-dash, U+2014) NAO eh `--` (dois hifens). Copiar do bloco inline
> garante UTF-8 correto. Verificar com `xxd` em caso de duvida.

### Passo 6: Verificacao byte-identica contra SKILL.md (extra-paranoid)

Antes de declarar GREEN, comparar os 3 goldens contra as strings exatas em `skills/init/SKILL.md`:

```bash
# 2026-05-17 (Luiz/dev): paranoia check — golden DEVE bater com bloco inline original.
# Se este check falhar, o tracer falhou seu trabalho (PRD R1).
grep -F 'Greenfield project — proceeding with scaffold.' skills/init/SKILL.md
grep -F 'Detected v5.x artifacts:' skills/init/SKILL.md
grep -F 'Run `/init migrate` (or `--dry-run` to preview).' skills/init/SKILL.md
grep -F 'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?' skills/init/SKILL.md
grep -F 'Run `/init migrate --resume` or remove residuals manually.' skills/init/SKILL.md
```

Todos devem retornar exit 0 (encontrou) ANTES E DEPOIS do step ser portado.

---

## Gotchas

- **G1 do plano (wording byte-identico):** este eh o calcanhar de Aquiles do tracer. Se o golden
  falhar, PARE — nao reescreva o golden para passar. Investigue o que esta diferente: pode ser
  charset (em-dash vs hifen duplo), trailing newline, ou ordem de artifacts em `state.artifacts`.
  Em caso de divergencia, o original (SKILL.md) eh a verdade.
- **G4 do plano (helper preservado):** `detectV5Legacy` NAO eh tocado. Se o teste do step
  precisar mudar comportamento do detector, eh sinal de que o step esta tentando fazer demais.
- **G5 do plano (sem cutover):** apos esta fase, `grep -F 'detectV5Legacy' skills/init/SKILL.md`
  ainda deve achar o bloco inline. Nao remover.
- **Local — ordem em `state.artifacts`:** `detect-v5-legacy.ts` itera as probes em ordem fixa
  (planning-dir, lessons-learned, decisions, senior-principles). A fixture `legacy/` so contem
  `.planning/` → o golden lista apenas `planning-dir`. Se acrescentar mais artefatos a fixture,
  ATUALIZAR o golden em ordem.
- **Local — `trimEnd()` nos goldens:** snapshots versionados costumam ter trailing newline.
  `trimEnd()` no teste evita brigar com o editor. NAO `trim()` no inicio — espaco a esquerda
  importa.
- **Local — `import.meta.dir` (Bun):** usado para resolver paths de fixture. Em Bun funciona;
  em Node puro nao. Como rodamos com `bun run test`, ok. Documentar para o Plano 04 caso eles
  troquem runner.

---

## Verificacao

### TDD

- [ ] **RED:** Escrever os 3 testes antes de criar o step. Falham por `Cannot find module './00-detect-legacy'`.
  - Comando: `bun run test skills/init/lib/steps/00-detect-legacy.test.ts`
  - Resultado esperado: erro de modulo

- [ ] **GREEN:** Criar `00-detect-legacy.ts`, fixtures, goldens, atualizar `registry.ts`. Tudo passa.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: `>= 3 passed, 0 failed` (apenas os 3 do detect-legacy nesta fase)

### Checklist

- [ ] `skills/init/lib/steps/00-detect-legacy.ts` criado, exporta `detectLegacyStep`
- [ ] `skills/init/lib/registry.ts` modificado: registry agora tem 1 entrada (detectLegacyStep)
- [ ] 3 fixtures criadas em `skills/init/lib/steps/__fixtures__/`
- [ ] 3 goldens criados em `skills/init/lib/steps/__golden__/`
- [ ] 3 testes passam: `bun run test skills/init/lib/steps/00-detect-legacy.test.ts`
- [ ] Paranoia check (grep): todas as 5 strings ainda existem em `skills/init/SKILL.md`
- [ ] `skills/init/SKILL.md` NAO foi modificado: `git diff skills/init/SKILL.md` vazio
- [ ] `skills/init/lib/detect-v5-legacy.ts` NAO foi modificado: `git diff` vazio
- [ ] Lint limpo: `bun run lint skills/init/lib/steps/`
- [ ] Dispatcher executa o step end-to-end:
  - `bun -e 'import("./skills/init/lib/run-init.ts").then(m => m.runInit([], { cwd: "skills/init/lib/steps/__fixtures__/greenfield" })).then(console.log)'`
  - Saida esperada: `{ kind: "ok", report: { mutated: false, summary: "all steps completed" } }`
  - Atencao: este comando bate em GT-04 no Windows. Se rodar Windows, usar fixture relativa
    (sem barra invertida) ou rodar via `bun run test` — fase-04 centraliza esse pattern.

---

## Criterio de Aceite

Step `detect-legacy` portado e validado byte-identico contra `SKILL.md` em 3 cenarios
(greenfield, legacy, partial). Dispatcher consegue executa-lo via registry. `SKILL.md` intocado.

**Por maquina:**
- `bun run test skills/init/lib/steps/00-detect-legacy.test.ts` exit 0 com 3 testes passando
- `diff <(cat skills/init/lib/steps/__golden__/detect-legacy-greenfield.txt) <(echo "Greenfield project — proceeding with scaffold.")` retorna vazio
- `git diff --stat skills/init/SKILL.md skills/init/lib/detect-v5-legacy.ts` retorna 0 arquivos modificados

**Por humano:**
- Inspecao visual dos 3 goldens: wording IDENTICO ao bloco inline em `SKILL.md` linhas 21-35
  (em-dash, backticks, ponto final, ordem de palavras)

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
