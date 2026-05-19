<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): rails_versions opcional — alinhado com D13+D18 do CONTEXT`
-->

# Fase 02: Schema validator aceita `rails_versions` opcional (regression Node+Rails)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-01 (precisa de fontes canônicas decididas — o validator precisa estar pronto antes do extrator do piloto consumir fonte canônica em fase-04)
**Visual:** false

---

## O que esta fase entrega

Validator de frontmatter atualizado para aceitar `rails_versions` opcional (array de ranges semver-style — D18: `['>=7.1']`, `['>=8.0']`, `['>=7.1', '<8.0']`). Regression test combinada: átomos Node existentes (sem o campo) + átomos Rails dummy (com o campo) — ambos passam validação. RF4 + CA-10 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/atoms-rf11-audit.test.ts` (ou validator equivalente em `harness:validate`) | Modify | Estender com validação opcional de `rails_versions` (não invalidar átomos Node existentes) |
| `skills/init/lib/atoms-frontmatter-schema.test.ts` (novo, se ainda não existir como teste dedicado) | Create | Test unitário do schema cobrindo: (a) átomo Node sem o campo passa; (b) átomo Rails com `rails_versions: ['>=7.1']` passa; (c) átomo Rails com `rails_versions: 'string'` (formato errado) falha; (d) átomo Rails com `rails_versions: []` (array vazio) falha |
| `skills/init/lib/__fixtures__/rails-atoms-dummy/` | Create | Pasta com 2 átomos dummy Rails para fixture combinada — apenas frontmatter válido, corpo pode ser `# placeholder`. Deletada após teste (cleanup via `afterEach`) |

---

## Implementacao

### Passo 1 (RED): escrever o test que falha

Primeiro `Read` o arquivo `skills/init/lib/atoms-rf11-audit.test.ts` para entender o padrão atual do projeto. Se o validator vive em `harness:validate` (script bun), `Read` `scripts/harness-validate.ts` (ou o caminho real após `Glob "**/harness-validate*"`). Depois de confirmar onde mora a lógica de schema, escrever:

```typescript
// skills/init/lib/atoms-frontmatter-schema.test.ts
// 2026-05-18 (Luiz/dev): RF4 + CA-10 — schema aceita rails_versions opcional sem invalidar Node atoms.
// Alinhado com D13 (versionamento Rails no frontmatter) + D18 (formato array semver-style) do CONTEXT.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateAtomFrontmatter } from './atoms-frontmatter-validator' // helper a extrair se já não existir

const SEMVER_RANGE = /^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/

describe('atom frontmatter schema — rails_versions optional', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-schema-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  it('CA-10: Node atom sem rails_versions continua válido (retrocompat)', () => {
    const nodeAtom = [
      '---',
      'topic: type-system-idioms',
      'stack: nodejs-typescript',
      'layer: both',
      'sources:',
      '  - research: f8f4e50c (claude-code/knowledge/Nodejs/x.md)',
      'tier: 1',
      'triggers: [type, generic]',
      'related_skills: [/design-patterns]',
      'updated: 2026-05-16',
      '---',
      '# Type System Idioms',
    ].join('\n')
    writeFileSync(join(fixture, 'node-atom.md'), nodeAtom)
    const result = validateAtomFrontmatter(join(fixture, 'node-atom.md'))
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('Rails atom com rails_versions: [">=7.1"] é válido', () => {
    const railsAtom = [
      '---',
      'topic: rails-conventions-and-magic',
      'stack: rails',
      'layer: both',
      'sources:',
      '  - skill: rails-stack-conventions (claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md)',
      'tier: 1',
      'triggers: [CoC, DRY, Zeitwerk, ActiveSupport]',
      'related_skills: [/architecture, /design-patterns]',
      'updated: 2026-05-18',
      "rails_versions: ['>=7.1']",
      '---',
      '# Rails Conventions',
    ].join('\n')
    writeFileSync(join(fixture, 'rails-atom.md'), railsAtom)
    const result = validateAtomFrontmatter(join(fixture, 'rails-atom.md'))
    expect(result.valid).toBe(true)
  })

  it('Rails atom com rails_versions como string (formato errado D18) é inválido', () => {
    const badAtom = [
      '---',
      'topic: x',
      'stack: rails',
      'layer: both',
      'sources: []',
      'tier: 1',
      'triggers: []',
      'related_skills: []',
      'updated: 2026-05-18',
      "rails_versions: '>=7.1'", // string, não array — REJEITAR
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-string.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-string.md'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('rails_versions'))).toBe(true)
  })

  it('Rails atom com rails_versions vazio é inválido', () => {
    const badAtom = [
      '---',
      'topic: x',
      'stack: rails',
      'layer: both',
      'sources: []',
      'tier: 1',
      'triggers: []',
      'related_skills: []',
      'updated: 2026-05-18',
      'rails_versions: []', // array vazio — REJEITAR (se tem o campo, precisa ter conteúdo)
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-empty.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-empty.md'))
    expect(result.valid).toBe(false)
  })

  it('Rails atom com range malformado é inválido (CA-10 robustez)', () => {
    const badAtom = [
      '---',
      'topic: x', 'stack: rails', 'layer: both', 'sources: []',
      'tier: 1', 'triggers: []', 'related_skills: []', 'updated: 2026-05-18',
      "rails_versions: ['rails-7-and-newer']", // texto livre, não bate SEMVER_RANGE
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-format.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-format.md'))
    expect(result.valid).toBe(false)
  })
})

describe('atom frontmatter schema — fixture combinada Node + Rails', () => {
  it('CA-10: valida 14 átomos Node existentes + 2 átomos Rails dummy juntos (100% pass)', () => {
    // 2026-05-18 (Luiz/dev): regression combinada — schema estendido NÃO quebra átomos Node existentes
    const nodeAtomsDir = join(import.meta.dir, '..', '..', '..', 'docs/knowledge/nodejs-typescript/atoms')
    const railsFixtureDir = join(import.meta.dir, '__fixtures__', 'rails-atoms-dummy')

    const nodeAtoms = require('node:fs').readdirSync(nodeAtomsDir).filter((f: string) => f.endsWith('.md'))
    const railsAtoms = require('node:fs').readdirSync(railsFixtureDir).filter((f: string) => f.endsWith('.md'))

    expect(nodeAtoms.length).toBe(14)
    expect(railsAtoms.length).toBe(2)

    for (const f of nodeAtoms) {
      const r = validateAtomFrontmatter(join(nodeAtomsDir, f))
      expect(r.valid, `Node atom ${f} falhou: ${r.errors.join(', ')}`).toBe(true)
    }
    for (const f of railsAtoms) {
      const r = validateAtomFrontmatter(join(railsFixtureDir, f))
      expect(r.valid, `Rails dummy ${f} falhou: ${r.errors.join(', ')}`).toBe(true)
    }
  })
})
```

Comando RED: `bun run test -- --grep 'rails_versions optional'` → 5+ failures (helper `validateAtomFrontmatter` provavelmente não existe ainda no formato proposto; schema estendido não cobre o campo).

### Passo 2 (GREEN): implementar/estender o validator

Dois cenários, dependendo de onde o validator real mora:

**Cenário A — extender `atoms-rf11-audit.test.ts` (validator inline no test):**

Mover a lógica de parse de frontmatter para um helper exportável (`atoms-frontmatter-validator.ts`) e adicionar regra opcional para `rails_versions`:

```typescript
// skills/init/lib/atoms-frontmatter-validator.ts
// 2026-05-18 (Luiz/dev): helper extraído do atoms-rf11-audit para reuso em schema test — RF4

import { readFileSync } from 'node:fs'

const SEMVER_RANGE = /^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateAtomFrontmatter(filePath: string): ValidationResult {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { valid: false, errors: ['no frontmatter block'] }

  const fm = match[1]
  const errors: string[] = []

  // Campos obrigatórios base (v6.3.2)
  const REQUIRED = ['topic', 'stack', 'layer', 'sources', 'tier', 'triggers', 'related_skills', 'updated']
  for (const field of REQUIRED) {
    if (!new RegExp(`^${field}:`, 'm').test(fm)) errors.push(`missing required field: ${field}`)
  }

  // Campo opcional rails_versions (v6.3.3 — D13 + D18)
  const railsVersionsLine = fm.match(/^rails_versions:\s*(.+)$/m)
  if (railsVersionsLine) {
    const value = railsVersionsLine[1].trim()
    // DEVE ser array YAML inline: ['>=7.1'] ou ['>=7.1', '<8.0']
    if (!value.startsWith('[') || !value.endsWith(']')) {
      errors.push(`rails_versions must be inline array (e.g. ['>=7.1']) — got: ${value}`)
    } else {
      const inner = value.slice(1, -1).trim()
      if (!inner) {
        errors.push('rails_versions must not be empty array')
      } else {
        const ranges = inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        for (const r of ranges) {
          if (!SEMVER_RANGE.test(r)) {
            errors.push(`rails_versions range "${r}" must match semver-style (e.g. >=7.1)`)
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

**Cenário B — `harness:validate` é o validator real (script bun):**

`Read scripts/harness-validate*` e adicionar a mesma regra no schema YAML/JSON usado lá. Ajustar o test acima para chamar o script via `bun run harness:validate <path>` em vez de importar helper.

Decisão entre A e B fica para a execução (após confirmar via `Glob "**/harness-validate*"` qual é a fonte real). Se ambos existem, estender o helper E o script (uma única fonte de verdade chamando o helper).

### Passo 3: criar fixture combinada

```bash
# 2026-05-18 (Luiz/dev): fixture dummy Rails para regression test
mkdir -p skills/init/lib/__fixtures__/rails-atoms-dummy
```

Criar 2 átomos dummy mínimos (apenas frontmatter válido):

```yaml
# skills/init/lib/__fixtures__/rails-atoms-dummy/dummy-t1.md
---
topic: dummy-t1
stack: rails
layer: both
sources:
  - skill: rails-stack-conventions (claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md)
tier: 1
triggers: [dummy]
related_skills: [/architecture]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Dummy atom T1 (fixture)
```

```yaml
# skills/init/lib/__fixtures__/rails-atoms-dummy/dummy-t2-rails8.md
---
topic: dummy-t2-rails8
stack: rails
layer: backend
sources:
  - skill: rails-stack-conventions (claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md)
tier: 2
triggers: [dummy, rails8]
related_skills: [/infrastructure]
updated: 2026-05-18
rails_versions: ['>=8.0']
---

# Dummy atom T2 Rails 8 only (fixture)
```

Comando GREEN: `bun run test -- --grep 'rails_versions optional' && bun run test -- --grep 'fixture combinada'` → 6 passed.

### Passo 4 (REFACTOR): garantir que `atoms-rf11-audit.test.ts` original continua verde

Não modificar a lógica do RF11 audit; apenas garantir que ele continua passando com o helper extraído (se cenário A). Rodar:

```bash
bun run test -- --grep 'RF11'
```

Resultado esperado: `1 pass, 0 fail` (ou contagem atual — não regressão).

---

## Gotchas

- **G4 do plano (formato semver-style):** validator DEVE usar regex `/^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/` (ou equivalente) — não aceitar texto livre. D18 é claro: array de ranges. Strings literais ou versões puras (`'7.1'` sem prefixo) devem falhar.

- **Local — YAML inline vs bloco:** átomos do projeto usam YAML inline para arrays (`triggers: [a, b]`, `related_skills: [/foo]`). Manter consistência: `rails_versions: ['>=7.1']` é inline, não bloco com `- '>=7.1'` na linha de baixo. Validator deve aceitar APENAS inline para não introduzir variação de estilo.

- **Local — fixture path em Windows:** `__fixtures__` com underscores duplos funciona em Windows/Unix; espaços ou caracteres especiais não. Manter convenção `__fixtures__/rails-atoms-dummy/`.

- **Local — não tocar átomos Node reais no `docs/knowledge/nodejs-typescript/atoms/`:** o test combinada LÊ esses átomos (read-only). NÃO adicionar `rails_versions: []` neles para "uniformizar" — eles devem continuar SEM o campo, e o validator aceita ausência. Isso é o ponto da retrocompat (CA-10).

---

## Verificacao

### TDD

- [ ] **RED:** Test `rails_versions optional` escrito antes do helper extendido; FALHA com `validateAtomFrontmatter is not a function` ou equivalente
  - Comando: `bun run test -- --grep 'rails_versions optional'`
  - Resultado esperado: ≥5 assertion failures

- [ ] **GREEN:** Helper `validateAtomFrontmatter` (ou estensão equivalente no `harness:validate`) implementado; testes passam
  - Comando: `bun run test -- --grep 'rails_versions optional'`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `bun run test -- --grep 'rails_versions optional'` retorna `5 passed`
- [ ] `bun run test -- --grep 'fixture combinada Node + Rails'` retorna `1 passed` com 14 Node atoms + 2 Rails dummy = 16 átomos validados
- [ ] `bun run test -- --grep 'RF11'` continua verde (1 passed) — sem regressão no audit existente
- [ ] Helper `validateAtomFrontmatter` exportado de `skills/init/lib/atoms-frontmatter-validator.ts` (ou regra equivalente em `harness:validate`)
- [ ] Fixture `__fixtures__/rails-atoms-dummy/` tem 2 átomos: um T1 com `['>=7.1']`, um T2 com `['>=8.0']`
- [ ] Nenhum átomo Node real foi modificado (verificar `git status docs/knowledge/nodejs-typescript/` sem alterações)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` retorna 0 falhas (toda a suíte)
- `bun run test -- --grep 'fixture combinada Node + Rails'` retorna `1 passed` provando CA-10
- `git diff docs/knowledge/nodejs-typescript/` vazio (átomos Node intactos)

**Por humano:**
- Schema documenta `rails_versions` como OPCIONAL no JSDoc do helper (`@optional rails_versions — array of semver-style ranges per D13+D18`)

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
