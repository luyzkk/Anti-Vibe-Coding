<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Portar Step 5 — `installGhFiles`

**Plano:** 02 — Steps puros
**Sizing:** 1h
**Depende de:** fase-01 (registry; padrao golden) — paralelizavel com fase-02/03/04
**Visual:** false

---

## O que esta fase entrega

Step 5 do `SKILL.md` (linhas 356-364) portado para `skills/init/lib/steps/05-install-gh-files.ts`,
envelopando `installGhFiles` (helper preservado). Sempre roda (D14 do PRD — "always"). Emite UM
log com a contagem de arquivos. Registry passa a ter 7 entradas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/05-install-gh-files.ts` | Create | Step wrapper sobre `installGhFiles` |
| `skills/init/lib/registry.ts` | Modify | Adicionar como SETIMA entrada |
| `skills/init/lib/steps/05-install-gh-files.test.ts` | Create | 2 testes (greenfield + idempotente) |
| `skills/init/lib/steps/__fixtures__/gh-empty/.gitkeep` | Create | Fixture vazia |
| `skills/init/lib/steps/__golden__/install-gh-files.txt` | Create | stdout esperado |

---

## Implementacao

### Passo 1: Portar o step (`05-install-gh-files.ts`)

**Wording (SKILL.md linha 362):** `.github files installed: ${result.filesWritten}`

> Nota: `result.filesWritten` no helper retorna um numero OR um array? Conferir no
> `install-gh-files.ts`. O SKILL.md atual usa interpolacao direta — se for array, `console.log`
> imprime virgulas. Se for numero, imprime numero. O wording byte-identico depende disso.
> Confirmar antes do RED.

```typescript
// skills/init/lib/steps/05-install-gh-files.ts
import { installGhFiles } from '../install-gh-files'
import type { Step } from './types'

export const installGhFilesStep: Step = {
  id: 'install-gh-files',
  async run(ctx) {
    const result = await installGhFiles(ctx.cwd)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 362 (PRD R1, G1).
    // PRD D14: sempre roda — nao ha shouldRun condicional.
    const summary = `.github files installed: ${result.filesWritten}`
    return { mutated: true, summary }
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
  customizeArchitectureStep,
  installGhFilesStep, // 2026-05-17 (Luiz/dev): D14 — sempre apos customize-architecture (PRD CA-01).
]
```

### Passo 3: Fixture

```
__fixtures__/gh-empty/
  .gitkeep      (vazio)
```

### Passo 4: Goldens

`__golden__/install-gh-files.txt`:
```
.github files installed: <N>
```

> `<N>` placeholder — testes usam regex porque o numero exato (ou conteudo do array) depende
> do helper.

### Passo 5: Testes (`05-install-gh-files.test.ts`)

```typescript
// skills/init/lib/steps/05-install-gh-files.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { installGhFilesStep } from './05-install-gh-files'

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('installGhFilesStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('greenfield: installs .github files, summary follows wording', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gh-test-'))
    const report = await installGhFilesStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/^\.github files installed: .+$/)

    // 2026-05-17 (Luiz/dev): D14 — sempre instala. Validar artefato no FS.
    expect(existsSync(path.join(tmpDir, '.github'))).toBe(true)
  })

  test('idempotent: re-run on existing .github does not throw', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gh-idem-'))
    await installGhFilesStep.run(ctx(tmpDir))
    // 2026-05-17 (Luiz/dev): segunda run nao deve falhar — helper eh idempotente (G2).
    await installGhFilesStep.run(ctx(tmpDir))
    expect(existsSync(path.join(tmpDir, '.github'))).toBe(true)
  })
})
```

### Passo 6: Paranoia grep contra SKILL.md (G1)

```bash
grep -F '.github files installed:' skills/init/SKILL.md
```

Exit 0.

---

## Gotchas

- **G1 do plano (wording):** depende do `result.filesWritten`. Se for array, o `${...}` chama
  `toString()` (vira `a.md,b.md,...`). Se for numero, vira `3`. NAO ALTERAR — preservar exatamente
  como esta hoje. Se a leitura do helper revelar que o atual SKILL.md emite com ambiguidade,
  documentar no MEMORY.md como "drift detectado em produção" e propor PRD novo (G7 do README).
- **G2 do plano:** `install-gh-files.ts` NAO modificado.
- **G3 do plano (imports estaticos):** OK.
- **G9 do plano (D14 sempre roda):** NAO adicionar `shouldRun: () => ...` ao step. Sempre roda.
- **Local — idempotencia do helper:** segunda run em `.github` ja existente nao deve falhar.
  Se falha, eh bug do helper — abrir PRD de correcao, nao patch aqui.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos. Falham por modulo nao encontrado.
- [ ] **GREEN:** Step + registry. Testes passam.

### Checklist

- [ ] `05-install-gh-files.ts` criado
- [ ] `registry.ts` com 7 entradas em ordem (G4)
- [ ] Fixture vazia + golden criados
- [ ] 2 testes passam
- [ ] Helper `install-gh-files.ts` NAO modificado
- [ ] `SKILL.md` NAO modificado
- [ ] Paranoia grep exit 0
- [ ] Sem `await import` ou `bun -e`
- [ ] Lint limpo

---

## Criterio de Aceite

Step `install-gh-files` portado, sempre roda, idempotente.

**Por maquina:**
- `bun run test skills/init/lib/steps/05-install-gh-files.test.ts` exit 0 com 2 testes
- `git diff --stat skills/init/SKILL.md skills/init/lib/install-gh-files.ts` retorna 0 arquivos
- `grep -c 'shouldRun' skills/init/lib/steps/05-install-gh-files.ts` retorna 0 (D14 sempre)

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
