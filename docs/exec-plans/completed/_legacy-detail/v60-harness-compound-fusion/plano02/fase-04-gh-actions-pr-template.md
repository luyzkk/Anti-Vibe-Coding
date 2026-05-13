<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: `/init` instala `.github/workflows/harness.yml` + PR template (D14 sempre)

**Plano:** 02 — Full Scaffold
**Sizing:** 1h
**Depende de:** fase-02 (scaffold full tree existe; estrutura de pastas pronta para receber `.github/`)
**Visual:** false

---

## O que esta fase entrega

`/init` sempre escreve dois arquivos em `.github/`:
- `.github/workflows/harness.yml` — roda `bun run harness:validate` em PRs e push para `main`.
- `.github/pull_request_template.md` — checklist Summary/Plan/Validation/Docs/Risk.

Atende **D14 (sempre instalado, opt-out manual)**, **S1**, **CA-12** ("`cat .github/workflows/harness.yml` referencia `bun run harness:validate`"). Adapta os arquivos do Andre que usavam `npm` para `bun` (D13).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/static/.github/workflows/harness.yml` | Create | YAML adaptado: usa `oven-sh/setup-bun@v2` + `bun run harness:validate` |
| `anti-vibe-coding/skills/init/assets/static/.github/pull_request_template.md` | Create | Copia adaptada do Andre (referencias a `bun run` em vez de `npm run`) |
| `anti-vibe-coding/skills/init/lib/install-gh-files.ts` | Create | Helper que copia os 2 arquivos de `assets/static/.github/` para `targetDir/.github/` |
| `anti-vibe-coding/skills/init/lib/install-gh-files.test.ts` | Create | Teste: ambos arquivos existem em `targetDir/.github/`, conteudo bate, contem `bun run harness:validate`, NAO contem `npm run` |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 5 v6.0.0 — chamar `installGhFiles(targetDir)` |

---

## Implementacao

### Passo 1: Static asset `.github/workflows/harness.yml`

Conteudo adaptado (YAML, 2 espacos, sem BOM):

```yaml
# 2026-05-11 (Luiz/dev): adaptado do harness do Andre — D13 troca npm por bun.
# PRD CA-12 exige referencia a `bun run harness:validate`.
name: Harness Guardrails

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
        if: hashFiles('bun.lockb') != ''
      - run: bun run harness:validate
```

Notas:
- `oven-sh/setup-bun@v2` e a action oficial.
- `bun install --frozen-lockfile` so se houver `bun.lockb` (projetos sem deps nao precisam).
- Sem job de `compound-check` aqui — fica para Plano 04 fase-05 (que estende este YAML).

### Passo 2: Static asset `.github/pull_request_template.md`

```markdown
# Summary

Describe the user-visible or system-visible change.

# Plan

- Link the execution plan if the work was substantial.
- Note any scope changes made during implementation.

# Validation

- [ ] `bun run harness:validate`
- [ ] Tests or manual checks completed

# Docs

- [ ] `ARCHITECTURE.md` reviewed
- [ ] Relevant docs under `docs/` updated

# Risk

List rollout, migration, or monitoring concerns.
```

(Identico ao do Andre exceto a linha de comando `bun run` em vez de `npm run`.)

### Passo 3: Helper `lib/install-gh-files.ts`

```typescript
// 2026-05-11 (Luiz/dev): instala .github/ sempre (D14, S1).
// Plano 02 fase-04. Atende CA-12.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const STATIC_GH_ROOT = path.join(import.meta.dir, '..', 'assets', 'static', '.github')

const FILES_TO_COPY: ReadonlyArray<string> = [
  'workflows/harness.yml',
  'pull_request_template.md',
]

export type InstallGhFilesResult = {
  filesWritten: ReadonlyArray<string>
}

export async function installGhFiles(targetDir: string): Promise<InstallGhFilesResult> {
  const written: string[] = []

  for (const rel of FILES_TO_COPY) {
    const src = path.join(STATIC_GH_ROOT, rel)
    const dst = path.join(targetDir, '.github', rel)
    await fs.mkdir(path.dirname(dst), { recursive: true })
    const body = await fs.readFile(src, 'utf8')
    await fs.writeFile(dst, body, 'utf8')
    written.push(dst)
  }

  return { filesWritten: written }
}
```

### Passo 4: Teste `install-gh-files.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida que GH files instalam com adaptacoes bun.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { installGhFiles } from './install-gh-files'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'gh')

describe('installGhFiles', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(FIXTURE, { recursive: true })
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('writes both .github files', async () => {
    const result = await installGhFiles(FIXTURE)
    expect(result.filesWritten).toHaveLength(2)
    await fs.access(path.join(FIXTURE, '.github/workflows/harness.yml'))
    await fs.access(path.join(FIXTURE, '.github/pull_request_template.md'))
  })

  it('CA-12: harness.yml references bun run harness:validate', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    expect(yml).toContain('bun run harness:validate')
    expect(yml).not.toContain('npm run harness:validate') // D13 — bun, nao npm
    expect(yml).toContain('oven-sh/setup-bun@v2')
  })

  it('PR template uses bun in checklist (no npm leftovers)', async () => {
    await installGhFiles(FIXTURE)
    const pr = await fs.readFile(path.join(FIXTURE, '.github/pull_request_template.md'), 'utf8')
    expect(pr).toContain('`bun run harness:validate`')
    expect(pr).not.toContain('`npm run')
  })

  it('YAML is valid: starts with `name:` and has no tabs', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    expect(yml.startsWith('# ')).toBe(true) // header de provenance
    expect(yml).toContain('name: Harness Guardrails')
    expect(yml).not.toContain('\t') // YAML rejeita tabs
  })
})
```

### Passo 5: SKILL.md do `/init` — Step 5 v6.0.0

```markdown
## Step 5 (v6.0.0): Install GitHub Actions + PR template (D14 — always)

\`\`\`bash
bun run -e "
import { installGhFiles } from './lib/install-gh-files.ts'
const result = await installGhFiles(process.cwd())
console.log('.github files installed:', result.filesWritten)
"
\`\`\`

These files are installed unconditionally (D14). Projects not using GitHub may delete `.github/` after init.
```

---

## Gotchas

- **G4 do plano (GH Actions YAML schema):** YAML rejeita tabs e BOM. Validar: `! grep -P "\t" .github/workflows/harness.yml` (zero matches). Se editor (VS Code default ja eh OK) salvar com BOM, GitHub aceita mas alguns runners falham. Static asset commitado vem certo se redator nao mexer em editor com config bizarra.
- **G2 do plano (cross-platform paths):** `path.join` em todo helper. `import.meta.dir` resolve `assets/static/.github/` relativo ao `.ts` — funciona Windows/macOS/Linux.
- **Local — D14 escolha consciente:** Nao ha pergunta "instalar GH actions?". Default e SEMPRE instalar (PRD diz explicitamente). Se quisermos opt-out futuramente, adicionar flag `--no-gh-actions` em SKILL.md — fora de escopo desta fase.
- **Local — `bun.lockb` condicional:** O step `bun install --frozen-lockfile` so roda se `bun.lockb` existir (`if: hashFiles('bun.lockb') != ''`). Projetos sem deps (so harness scaffold) nao quebram.
- **Local — `npm` leftover:** O teste explicito `expect(yml).not.toContain('npm run harness:validate')` previne regressao acidental se alguem copiar versao do Andre sem adaptar.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/install-gh-files.test.ts` — falha porque `install-gh-files.ts` nao existe ou static assets nao foram criados.
  - Comando: `bun run test skills/init/lib/install-gh-files.test.ts`
  - Resultado esperado: ≥1 fail.

- [ ] **GREEN:** Helper + 2 static assets criados — todos os 4 `it()` passam.
  - Comando: `bun run test skills/init/lib/install-gh-files.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `assets/static/.github/workflows/harness.yml` existe e usa `oven-sh/setup-bun@v2`
- [ ] `assets/static/.github/pull_request_template.md` existe e referencia `bun run harness:validate`
- [ ] `installGhFiles(fixture)` cria exatamente 2 arquivos (`workflows/harness.yml` + `pull_request_template.md`)
- [ ] Validador YAML (`actionlint` se disponivel; senao inspecao + `bun -e "JSON.parse(...)"` nao se aplica a YAML — usar `bun add -d yaml` apenas para teste): file e parseavel sem erro
- [ ] Zero tabs no YAML (`! grep -P "\t" assets/static/.github/workflows/harness.yml`)
- [ ] Zero ocorrencias de `npm run` em ambos arquivos (CA-12 friendly)
- [ ] `bun run test skills/init/lib/install-gh-files.test.ts` retorna `4 passed`
- [ ] Lint limpo: `bun run lint skills/init/lib/install-gh-files.ts`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina (CA-12 verbatim):**

```bash
cd anti-vibe-coding
# Apos /init em fixture vazia
cat tests/fixtures/empty-dir/.github/workflows/harness.yml | grep -F "bun run harness:validate"
# Esperado: 1 linha (a referencia)

bun run test skills/init/lib/install-gh-files.test.ts
# Esperado: 4 passed, 0 failed
```

**Por humano:**

- Abrir `tests/fixtures/empty-dir/.github/workflows/harness.yml` apos run e ler — YAML legivel, sem caracteres bizarros, header de provenance no topo.
- Abrir PR template — checklist Summary/Plan/Validation/Docs/Risk visivel; box "Validation" tem `[ ] bun run harness:validate`.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
