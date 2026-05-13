<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: package.json scripts + GH Actions integration

**Plano:** 04 — Validators Full
**Sizing:** 1h
**Depende de:** fase-02 (compound-check.ts.tpl com frontmatter ja completo) + fase-03 (harness-validate.ts.tpl full) — ambos scripts existem para serem chamados
**Visual:** false

---

## O que esta fase entrega

Plumbing final que conecta os 2 validators (fase-02 + fase-03) ao **workflow de CI** e ao **fluxo de desenvolvimento local**:

1. Adicionar script `"compound:check": "bun run scripts/compound-check.ts"` ao `package.json.tpl` (template copiado pelo `/init`).
2. Estender `.github/workflows/harness.yml` (entregue por Plano 02 fase-04 com `harness:validate` apenas) para chamar **ambos** validators em sequencia, com reporting de tempo via `time` builtin do bash.
3. Documentar exit codes esperados na `docs/PLANS.md` template (informativo).
4. Adicionar comentario provenance no `package.json.tpl` (via JSON comments — usando padrao `// 2026-...` em **README do template**, ja que JSON puro nao aceita comentarios).
5. Teste de integracao verifica que workflow YAML eh sintaticamente valido e referencia ambos os scripts.

Atende **D14** (GH Actions sempre instalado), **M5+M6** (validators rodam em CI), prepara base para **Plano 09** (release valida via mesmo workflow).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/package.json.tpl` | Modify | Adicionar entry `"compound:check"` em `scripts` |
| `anti-vibe-coding/skills/init/assets/templates/.github/workflows/harness.yml.tpl` | Modify | Step novo `- name: Validate compound notes` apos step `Validate harness` |
| `anti-vibe-coding/skills/init/assets/templates/docs/PLANS.md.tpl` | Modify | Adicionar paragrafo final "Validators" listando os 2 scripts + exit codes |
| `anti-vibe-coding/tests/workflow-yaml.test.ts` | Create | Parse YAML + verifica steps + verifica que ambos scripts sao chamados |
| `anti-vibe-coding/tests/package-json-scripts.test.ts` | Create | Verifica que `package.json.tpl` tem chave `compound:check` |

---

## Implementacao

### Passo 1: Atualizar `package.json.tpl`

O Plano 01 fase-04 entregou versao minimal:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "harness:validate": "bun run scripts/harness-validate.ts",
    "test": "bun test",
    "lint": "echo 'No linter configured yet'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
```

**Plano 04 fase-05 atualiza para:**

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "harness:validate": "bun run scripts/harness-validate.ts",
    "compound:check": "bun run scripts/compound-check.ts",
    "harness:all": "bun run harness:validate && bun run compound:check",
    "test": "bun test",
    "lint": "echo 'No linter configured yet'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
```

- `compound:check` (nova): chama o segundo validator.
- `harness:all` (nova): conveniencia local — usuario roda 1 comando para rodar ambos (`&&` para fail-fast).
- Ordem: `harness:validate` primeiro porque valida o **scaffold estrutural**. Se faltar `docs/compound/README.md`, ele falha antes do `compound:check` tentar iterar diretorio inexistente.

### Passo 2: Atualizar `.github/workflows/harness.yml.tpl`

Plano 02 fase-04 entregou (esperado):

```yaml
name: Harness Validation

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Validate harness
        run: bun run harness:validate
```

**Plano 04 fase-05 estende para:**

```yaml
name: Harness Validation

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Validate harness structure
        # Plano 04 fase-03 (full): 25 required files, AGENTS.md links, orphan plans, broken links.
        # Exit 1 if structural issue; exit 0 if clean.
        run: |
          echo "::group::harness:validate"
          time bun run harness:validate
          echo "::endgroup::"

      - name: Validate compound notes
        # Plano 04 fase-02: frontmatter (title/category/tags/created) + sections (Problem/Solution/Prevention).
        # Exit 1 if any compound note invalid; exit 0 if all valid (or none present).
        run: |
          echo "::group::compound:check"
          time bun run compound:check
          echo "::endgroup::"
```

Notas:
- `time` builtin do bash (Ubuntu runner) imprime real/user/sys. Reportado dentro do `::group::` para colapso visual no UI do GitHub.
- Steps separados (nao `harness:all`) para que falha em um aparece nominalmente no UI do GitHub. Se usar `harness:all`, falha em `compound:check` aparece como falha do step `harness:validate` — confunde.
- Sem cache de `node_modules` — projeto-alvo tem zero deps em runtime (so devDeps TS). `bun install` no setup ja eh sub-segundo.
- Triggers: PR + push em main/master. Plano 09 (release) pode adicionar trigger em `release: types: [published]` se necessario — fora de escopo desta fase.

### Passo 3: Atualizar `docs/PLANS.md.tpl`

Adicionar paragrafo final ao template (assumindo Plano 02 fase-01 ja escreveu base):

```markdown
## Validators

This project ships with two validation scripts wired to CI:

- `bun run harness:validate` — checks structural requirements: 25 required files, AGENTS.md must stay at 40 lines or fewer, AGENTS.md must link to ARCHITECTURE.md / docs/QUALITY_SCORE.md / docs/PRODUCT_SENSE.md, all markdown links must resolve, no orphaned plans in `docs/exec-plans/active/`.
- `bun run compound:check` — checks each note in `docs/compound/` has YAML frontmatter (`title`, `category`, `tags`, `created`) plus the three required H2 sections (`## Problem`, `## Solution`, `## Prevention`).

Exit codes:

- `0` — all checks passed; stdout reports counts.
- `1` — at least one rule failed; stderr lists each failure with rule name + file + message.
- `2` — script usage error (invalid argv).

Combined run: `bun run harness:all`. Run before committing.
```

### Passo 4: Teste `tests/workflow-yaml.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const WORKFLOW_PATH = path.resolve(
  import.meta.dir,
  '..',
  'skills/init/assets/templates/.github/workflows/harness.yml.tpl',
)

describe('harness.yml workflow template', () => {
  it('exists and is non-empty', async () => {
    const stat = await fs.stat(WORKFLOW_PATH)
    expect(stat.isFile()).toBe(true)
    expect(stat.size).toBeGreaterThan(0)
  })

  it('contains both validators as steps', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('bun run harness:validate')
    expect(body).toContain('bun run compound:check')
  })

  it('uses oven-sh/setup-bun action', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('oven-sh/setup-bun')
  })

  it('triggers on pull_request and push to main/master', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('pull_request:')
    expect(body).toContain('push:')
    expect(body).toMatch(/branches:\s*\[main,\s*master\]/)
  })

  it('is syntactically valid YAML (parse without error)', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    // Parse minimal — bun nao tem YAML builtin. Validar via heuristica:
    // (a) tem `name:`, `on:`, `jobs:` no top-level
    // (b) indentacao consistente 2 espacos
    // (c) sem TAB
    expect(body).not.toContain('\t')
    expect(body).toMatch(/^name:\s/m)
    expect(body).toMatch(/^on:\s*$/m)
    expect(body).toMatch(/^jobs:\s*$/m)
  })
})
```

Nota: integracao opcional com `actionlint` (binario do Rhys Arkins) pode dar parsing real do YAML do GitHub Actions schema. Em fase-05 ficamos com heuristica para nao introduzir dependencia. Decisao registrada em MEMORY DI-6 — se for adicionado, vira validator separado.

### Passo 5: Teste `tests/package-json-scripts.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const TPL_PATH = path.resolve(
  import.meta.dir,
  '..',
  'skills/init/assets/templates/package.json.tpl',
)

type PackageJsonTpl = {
  name: string
  scripts: Record<string, string>
}

describe('package.json.tpl template', () => {
  it('parses as JSON (placeholders are OK in string values)', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    // `{{PROJECT_NAME}}` esta dentro de string — JSON.parse aceita.
    expect(() => JSON.parse(body)).not.toThrow()
  })

  it('has harness:validate, compound:check, harness:all scripts', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    const parsed = JSON.parse(body) as PackageJsonTpl
    expect(parsed.scripts['harness:validate']).toBe('bun run scripts/harness-validate.ts')
    expect(parsed.scripts['compound:check']).toBe('bun run scripts/compound-check.ts')
    expect(parsed.scripts['harness:all']).toBe('bun run harness:validate && bun run compound:check')
  })

  it('has placeholder for project name (replaced by /init)', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    expect(body).toContain('{{PROJECT_NAME}}')
  })

  it('declares TypeScript and Node types as devDependencies', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    const parsed = JSON.parse(body) as PackageJsonTpl & { devDependencies: Record<string, string> }
    expect(parsed.devDependencies.typescript).toBeDefined()
    expect(parsed.devDependencies['@types/node']).toBeDefined()
  })
})
```

---

## Gotchas

- **G4 do README do Plano 02 (YAML schema):** GitHub Actions YAML eh estrito — indentacao 2 espacos, sem tabs, UTF-8 sem BOM. Verificar antes de commit via `file harness.yml.tpl` em Linux (deve dizer `UTF-8 Unicode text`, nao `with BOM`).
- **Local — `time` builtin vs `/usr/bin/time`:** `time` builtin do bash imprime para stderr; alguns scripts assumem stdout. Em CI Ubuntu, GitHub Actions captura ambos no log do step — sem problema. Em Windows runner (nao usamos aqui), `time` nao funciona — escolha intencional do Ubuntu.
- **Local — `harness:all` vs steps separados:** O `package.json` tem `harness:all` para uso local (1 comando, fail-fast). O **workflow** YAML mantem steps separados (UI do GitHub mostra cada um). Sem duplicacao: workflow nao chama `harness:all`, chama cada um diretamente. Decisao deliberada.
- **Local — exit 2 vs 1:** Validators usam `exit 1` para falha de regra e `exit 2` para erro de uso (argv invalido, fixture corrompida). Workflow GitHub Actions trata qualquer exit !=0 como falha — sem distincao. Mensagem em stderr eh quem distingue. Documentado em `docs/PLANS.md.tpl`.
- **Local — `JSON.parse` aceita placeholders:** `{{PROJECT_NAME}}` esta dentro de string JSON — parsea OK. O `/init` faz replace antes de escrever no projeto-alvo. Mas se algum dia tiver placeholder em chave (`{ "{{KEY}}": "value" }`), JSON parse falha — atencao nas keys.
- **Local — Plano 02 fase-04 entrega `harness.yml.tpl` inicial:** Esta fase **estende** (modify). Se Plano 02 fase-04 ainda nao foi feita, fase-05 deste plano cria do zero (mesma sintaxe). Documentar em MEMORY (DI) se isso acontecer.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test tests/workflow-yaml.test.ts` falha — workflow nao foi atualizado, nao referencia `compound:check`.

- [ ] **GREEN:** 5 testes do workflow passam.

- [ ] **RED:** `bun run test tests/package-json-scripts.test.ts` falha — `package.json.tpl` nao tem `compound:check`.

- [ ] **GREEN:** 4 testes do package.json passam.

### Checklist

- [ ] `package.json.tpl` tem `"compound:check": "bun run scripts/compound-check.ts"` em `scripts`
- [ ] `package.json.tpl` tem `"harness:all": "bun run harness:validate && bun run compound:check"`
- [ ] `package.json.tpl` parsea como JSON valido (placeholders dentro de strings)
- [ ] `harness.yml.tpl` tem step `Validate harness structure` chamando `bun run harness:validate`
- [ ] `harness.yml.tpl` tem step `Validate compound notes` chamando `bun run compound:check`
- [ ] Steps usam `::group::` para colapso no UI do GitHub
- [ ] Steps usam `time` builtin para reportar duracao
- [ ] `harness.yml.tpl` triggera em pull_request + push to main/master
- [ ] `docs/PLANS.md.tpl` documenta os 2 validators + exit codes + comando combinado `harness:all`
- [ ] `harness.yml.tpl` nao tem TABs (so 2-espacos) — G4 do Plano 02
- [ ] Lint + TypeCheck strict (nos testes)

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test tests/workflow-yaml.test.ts
# Esperado: 5 passed, 0 failed

bun run test tests/package-json-scripts.test.ts
# Esperado: 4 passed, 0 failed

# Smoke: rodar o `/init` em fixture vazia e checar que package.json gerado tem ambos scripts
cd /tmp && rm -rf init-smoke && mkdir init-smoke && cd init-smoke
# (assume /init implementado — Plano 02 fase-02)
# bun run <plugin>/skills/init/index.ts .
cat package.json | grep -E "(harness:validate|compound:check|harness:all)"
# Esperado: 3 linhas matching
```

**Por humano:**

- Abrir `harness.yml.tpl` no GitHub UI (apos commit em fixture) — confirmar visualmente que os 2 steps colapsam corretamente em `::group::`.
- Em PR real apos Plano 04 completo, abrir Actions tab — ver 2 steps separados (`Validate harness structure` e `Validate compound notes`), cada um com duracao `time` no log.
- `bun run harness:all` no diretorio do projeto-alvo: roda ambos em sequencia, fail-fast em primeiro erro. UX local consistente com CI.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
