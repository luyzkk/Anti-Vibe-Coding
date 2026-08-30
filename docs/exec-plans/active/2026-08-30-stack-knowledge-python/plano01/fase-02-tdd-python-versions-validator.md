<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 02: TDD — python_versions no atoms-frontmatter-validator

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-00 (paralelizável com fase-01 — arquivos disjuntos)
**Visual:** false

---

## O que esta fase entrega

`validateAtomFrontmatter` reconhece o campo opcional `python_versions` com o MESMO contrato de
`rails_versions` (array de ranges semver-style; string/array-vazio/texto-livre rejeitados com
erro claro), mantendo 100% dos átomos Rails/Node existentes válidos (RF3, CA-03, D9).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/atoms-frontmatter-schema.test.ts` | Modify | Novo describe `python_versions` (RED primeiro) + caso CRLF |
| `skills/init/lib/atoms-frontmatter-validator.ts` | Modify | Extrair validação de campo de versões para helper e aplicar a `rails_versions` + `python_versions` |

---

## Implementacao

### Passo 1: RED — escrever os testes ANTES da implementação

Adicionar ao `atoms-frontmatter-schema.test.ts` (seguir o padrão dos describes existentes —
`mkdtempSync` + `writeFileSync` + assert do MOTIVO, não só do veredito):

```typescript
// 2026-08-30 (Luiz/dev): python_versions opcional, mesmo contrato de rails_versions —
// D9/RF3 + CA-03 do PRD stack-knowledge-python. RED escrito antes da implementação.
describe('atom frontmatter schema — python_versions optional', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-py-schema-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  const PY_BASE = [
    'topic: async-and-concurrency',
    'stack: python',
    'layer: backend',
    'sources:',
    '  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md',
    'tier: 1',
    'triggers: [asyncio, TaskGroup, GIL]',
    'related_skills: [/system-design]',
    'updated: 2026-08-30',
  ]

  function writePyAtom(name: string, extra: string[] = []): string {
    writeFileSync(join(fixture, name), ['---', ...PY_BASE, ...extra, '---', '# Body'].join('\n'))
    return join(fixture, name)
  }

  it("aceita python_versions: ['>=3.11'] (array semver-style, D9)", () => {
    const result = validateAtomFrontmatter(writePyAtom('ok-311.md', ["python_versions: ['>=3.11']"]))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("aceita python_versions: ['>=3.13'] (padrões 3.13-only: TypeIs, free-threading)", () => {
    expect(validateAtomFrontmatter(writePyAtom('ok-313.md', ["python_versions: ['>=3.13']"])).valid).toBe(true)
  })

  it('átomo python SEM python_versions continua válido (campo é opcional)', () => {
    expect(validateAtomFrontmatter(writePyAtom('no-field.md')).valid).toBe(true)
  })

  it('rejeita python_versions como string (CA-03: erro claro, não veredito seco)', () => {
    const result = validateAtomFrontmatter(writePyAtom('bad-string.md', ["python_versions: '>=3.11'"]))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('python_versions') && e.includes('array'))).toBe(true)
  })

  it('rejeita python_versions array vazio', () => {
    const result = validateAtomFrontmatter(writePyAtom('bad-empty.md', ['python_versions: []']))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must not be empty'))).toBe(true)
  })

  it('rejeita range texto-livre e item não-string', () => {
    expect(validateAtomFrontmatter(writePyAtom('bad-free.md', ["python_versions: ['python-3-and-newer']"])).valid).toBe(false)
    expect(validateAtomFrontmatter(writePyAtom('bad-num.md', ['python_versions: [3.11]'])).valid).toBe(false)
  })

  it('valida python_versions em átomo salvo com CRLF (compound 2026-05-19)', () => {
    const lines = ['---', ...PY_BASE, "python_versions: ['>=3.11']", '---', '# Body']
    writeFileSync(join(fixture, 'crlf.md'), lines.join('\r\n'))
    const result = validateAtomFrontmatter(join(fixture, 'crlf.md'))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })
})
```

Rodar e confirmar RED genuíno (assertion failure, não erro de compilação):

```
bun test skills/init/lib/atoms-frontmatter-schema.test.ts
```

Falha esperada HOJE: os 3 testes de rejeição falham porque o validador IGNORA campo
desconhecido (`python_versions` malformado passa silencioso — G3 do README). Os testes de
aceite passam por vacuidade — o RED que importa está nas rejeições. Registrar o output real.

### Passo 2: GREEN — generalizar a validação de campo de versões

Em `atoms-frontmatter-validator.ts`, extrair o bloco `rails_versions` (linhas 73-89) para um
helper e aplicá-lo aos dois campos. Não duplicar o bloco — mesma regra, uma fonte de verdade:

```typescript
// 2026-08-30 (Luiz/dev): python_versions opcional — mesmo contrato de rails_versions
// (array de ranges semver-style, não-vazio). Generalizado em helper para nao duplicar
// a regra por stack — D9/RF3 + CA-03 do PRD stack-knowledge-python.
const OPTIONAL_VERSION_FIELDS = ['rails_versions', 'python_versions'] as const

function validateVersionsField(data: Record<string, unknown>, field: string, errors: string[]): void {
  if (!(field in data)) return
  const value = data[field]

  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array, not a string`)
  } else if (value.length === 0) {
    errors.push(`${field} array must not be empty`)
  } else {
    for (const item of value) {
      if (typeof item !== 'string' || !SEMVER_RANGE.test(item)) {
        errors.push(
          `${field} item "${String(item)}" does not match semver range format (e.g. >=3.11)`,
        )
      }
    }
  }
}
```

E no corpo de `validateAtomFrontmatter`, substituir o bloco inline por:

```typescript
for (const field of OPTIONAL_VERSION_FIELDS) {
  validateVersionsField(data, field, errors)
}
```

`SEMVER_RANGE` (`/^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/`) já cobre `>=3.11` e `>=3.13` —
não mexer na regex.

### Passo 3: GREEN confirmado + regressão

```
bun test skills/init/lib/atoms-frontmatter-schema.test.ts   # tudo verde, incl. describes antigos
bun test                                                     # suite inteira
bun run typecheck
```

Atenção especial aos describes pré-existentes: a fixture combinada Node+Rails (14 Node + 2
Rails dummy, 100% pass) e os describes CRLF/YAML NÃO podem mudar de resultado — o refactor do
helper precisa preservar as mensagens de erro de `rails_versions` byte a byte (os testes
antigos assertam substring `'must not be empty'` e `'rails_versions'`).

---

## Gotchas

- **G3 do README:** ANTES desta fase, `python_versions` malformado passava silencioso. É por
  isso que esta fase entra no commit bundle com o piloto (fase-03) — o átomo nasce validado.
- **G4 do README:** normalização CRLF vive em `extractFrontmatter` (linha 34) — NÃO tocar.
  O teste CRLF do Passo 1 protege a regressão (compound
  `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md`).
- **Local:** as mensagens de erro existentes de `rails_versions` são contrato de teste
  (`rails_versions must be an array, not a string`, etc.). O helper generalizado gera as
  MESMAS strings com o nome do campo interpolado — conferir que nenhum teste antigo quebrou.
- **Local:** não adicionar `python_versions` ao `REQUIRED_FIELDS` — é opcional (átomos de
  linguagem sem sensibilidade de versão não o usam).
- **G1 do README:** NÃO commitar ao fim desta fase — bundle na fase-03.

---

## Verificacao

### TDD

- [ ] **RED:** Testes de rejeição escritos e FALHAM por assertion (campo desconhecido é
      ignorado hoje)
  - Comando: `bun test skills/init/lib/atoms-frontmatter-schema.test.ts`
  - Resultado esperado: `expect(result.valid).toBe(false)` — `Expected: false, Received: true`

- [ ] **GREEN:** Helper implementado, describe novo passa inteiro
  - Comando: `bun test skills/init/lib/atoms-frontmatter-schema.test.ts`
  - Resultado esperado: `0 fail`, incluindo os describes pré-existentes

### Checklist

- [ ] `python_versions: ['>=3.11']` e `['>=3.13']` aceitos; ausência do campo aceita
- [ ] String, array vazio, texto-livre e item numérico rejeitados com erro citando o campo (CA-03)
- [ ] Átomo CRLF com `python_versions` válido (G4)
- [ ] Fixture combinada Node+Rails continua 100% pass (regressão CA-03/CA-10 Rails)
- [ ] Zero duplicação: bloco `rails_versions` inline removido, helper único
- [ ] Testes passam: `bun test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] NÃO commitado (bundle na fase-03)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/atoms-frontmatter-schema.test.ts` retorna 0 fail com ≥8 testes
  novos de `python_versions`
- `bun test` (suite completa) retorna 0 fail

**Por humano:**
- Diff do validador mostra generalização (helper), não copy-paste do bloco Rails

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
