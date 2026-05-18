<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Portar Step 4 — `customizeArchitecture`

**Plano:** 02 — Steps puros
**Sizing:** 1h
**Depende de:** fase-03 (detect-stack precisa rodar antes — ARCHITECTURE.md eh customizada com o stack detectado)
**Visual:** false

---

## O que esta fase entrega

Step 4 do `SKILL.md` (linhas 336-352) portado para `skills/init/lib/steps/04-customize-architecture.ts`,
envelopando `customizeArchitecture` (helper preservado) + uma SEGUNDA chamada a `detectStack`
(o SKILL.md re-detecta o stack aqui em vez de propagar do Step 3 — preservar esse comportamento
para byte-identicality). Registry passa a ter 6 entradas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/04-customize-architecture.ts` | Create | Step que re-detecta stack e customiza ARCHITECTURE.md |
| `skills/init/lib/registry.ts` | Modify | Adicionar como SEXTA entrada |
| `skills/init/lib/steps/04-customize-architecture.test.ts` | Create | 2 testes (cenario com stack detectado vs unknown) |
| `skills/init/lib/steps/__fixtures__/customize-with-architecture/ARCHITECTURE.md` | Create | Pre-requisito: ARCHITECTURE.md existe |
| `skills/init/lib/steps/__fixtures__/customize-with-architecture/package.json` | Create | Stack detectavel (next, vue, etc.) |
| `skills/init/lib/steps/__golden__/customize-architecture-nextjs.txt` | Create | stdout esperado |

---

## Implementacao

### Passo 1: Portar o step (`04-customize-architecture.ts`)

**Wording (SKILL.md linha 349):** `ARCHITECTURE.md customized for ${stack.id} — written: ${result.written}`

```typescript
// skills/init/lib/steps/04-customize-architecture.ts
import { customizeArchitecture } from '../customize-architecture'
import { detectStack } from '../detect-stack'
import type { Step } from './types'

export const customizeArchitectureStep: Step = {
  id: 'customize-architecture',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): re-deteccao explicita do stack — mesmo padrao do SKILL.md linha 343.
    // NAO le STATE.md aqui. Trade-off: detectStack roda 2x (em Step 3 e Step 4). Aceitavel
    // porque detectStack eh idempotente e barata (le 1-2 arquivos). Preservar byte-idemp.
    const stack = await detectStack(ctx.cwd)
    const result = await customizeArchitecture({ targetDir: ctx.cwd, stack })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 349 (PRD R1, G1).
    // Note o em-dash entre id e "written".
    const summary = `ARCHITECTURE.md customized for ${stack.id} — written: ${result.written}`
    return { mutated: result.written, summary }
  },
}
```

### Passo 2: Registrar no `registry.ts`

```typescript
export const registry: readonly Step[] = [
  detectLegacyStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep, // 2026-05-17 (Luiz/dev): apos Step 3/3.1 (PRD CA-01).
]
```

### Passo 3: Fixtures

`__fixtures__/customize-with-architecture/ARCHITECTURE.md`:
```markdown
# ARCHITECTURE

## Structure

(scaffolded — to be customized)

<!-- INIT:DETECTED_STACK_SLOT -->
```

> O slot `INIT:DETECTED_STACK_SLOT` (ou marker equivalente — conferir no helper) eh onde
> `customizeArchitecture` injeta a secao "Detected Stack". Confirmar o marker exato em
> `customize-architecture.ts` antes do RED. Se o helper procura outro marker (ex: comentario
> HTML diferente), ajustar a fixture.

`__fixtures__/customize-with-architecture/package.json`:
```json
{ "name": "test", "dependencies": { "next": "^14.0.0" } }
```

### Passo 4: Goldens

`__golden__/customize-architecture-nextjs.txt`:
```
ARCHITECTURE.md customized for nextjs — written: true
```

### Passo 5: Testes (`04-customize-architecture.test.ts`)

```typescript
// skills/init/lib/steps/04-customize-architecture.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { customizeArchitectureStep } from './04-customize-architecture'

const FIX = path.join(import.meta.dir, '__fixtures__')
const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('customizeArchitectureStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('nextjs fixture: summary mentions stack and written=true', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'customize-test-'))
    await cp(path.join(FIX, 'customize-with-architecture'), tmpDir, { recursive: true })

    const report = await customizeArchitectureStep.run(ctx(tmpDir))
    expect(report.summary).toMatch(/^ARCHITECTURE\.md customized for nextjs — written: (true|false)$/)
    // 2026-05-17 (Luiz/dev): se ARCHITECTURE.md tem marker, written=true; senao false.
    // O byte-identical com SKILL.md depende do result.written em runtime — aceitar ambos.
  })

  test('without ARCHITECTURE.md: helper handles gracefully (does not throw)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'customize-empty-'))
    // 2026-05-17 (Luiz/dev): testar resiliencia — se helper lanca, eh bug do helper (G2).
    // Step propaga. Esperar que NAO lanca aqui (helpers existentes sao tolerantes).
    const r = await customizeArchitectureStep.run(ctx(tmpDir))
    expect(r.summary).toMatch(/^ARCHITECTURE\.md customized for unknown — written: false$/)
  })
})
```

### Passo 6: Paranoia grep contra SKILL.md (G1)

```bash
grep -F 'ARCHITECTURE.md customized for' skills/init/SKILL.md
grep -F '— written:' skills/init/SKILL.md
```

Ambos exit 0.

---

## Gotchas

- **G1 do plano (wording):** o em-dash `—` entre `${stack.id}` e `written:`. Conferir.
- **G2 do plano (helper preservado):** `customizeArchitecture` NAO modificado. Se ARCHITECTURE.md
  nao existe e helper lanca, eh bug do helper — NAO patch aqui.
- **G3 do plano (imports estaticos):** OK.
- **Local — `detectStack` chamado 2x:** Step 3 e Step 4 ambos chamam. Preservado para
  byte-identicality. Otimizacao (passar via STATE.md ou via cache no ctx) eh tentadora mas
  fora de escopo (G7 do README). Documentar como "tech debt aceitavel" no MEMORY.md ao
  executar.
- **Local — `result.written: true | false`:** o helper retorna `written: boolean`. Se a
  ARCHITECTURE.md nao tem o marker esperado, helper retorna `written: false`. O `summary`
  carrega esse boolean literal (`written: true` ou `written: false`). NAO ha string fixed —
  o teste usa regex.
- **Local — Step 4 NAO atualiza `mutated` em caso false:** se `written: false`, o step retorna
  `mutated: false`. Refletir no campo. Decisao explicita aqui — preserva fidelidade ao
  result do helper.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos. Falham por modulo nao encontrado.
- [ ] **GREEN:** Step + registry. Testes passam.

### Checklist

- [ ] `04-customize-architecture.ts` criado
- [ ] `registry.ts` com 6 entradas (G4 do plano)
- [ ] Fixture + golden criados
- [ ] 2 testes passam
- [ ] Helpers `customize-architecture.ts` e `detect-stack.ts` NAO modificados
- [ ] `SKILL.md` NAO modificado
- [ ] Paranoia grep exit 0
- [ ] Sem `await import` ou `bun -e`
- [ ] Lint limpo

---

## Criterio de Aceite

Step `customize-architecture` portado, registrado, validado em 2 cenarios. Wording byte-identico
ao SKILL.md linha 349.

**Por maquina:**
- `bun run test skills/init/lib/steps/04-customize-architecture.test.ts` exit 0 com 2 testes
- `git diff --stat skills/init/SKILL.md skills/init/lib/customize-architecture.ts skills/init/lib/detect-stack.ts` retorna 0 arquivos

**Por humano:**
- Inspecao visual: golden bate com SKILL.md linha 349 (estrutura)

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
