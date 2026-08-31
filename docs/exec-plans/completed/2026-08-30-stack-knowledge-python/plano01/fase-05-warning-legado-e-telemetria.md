<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 05: Warning legado requires-python <3.11 (TDD) + confirmação telemetria RF10

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-04 (fixtures reutilizadas nos testes de integração)
**Visual:** false

---

## O que esta fase entrega

`/init` em projeto Python legado (`requires-python` resolvendo abaixo de 3.11) emite
`⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.` com parse
conservador (formato não reconhecido = sem warning, R7) — espelho do RF11 Rails (RF8, CA-04,
D7). E confirma por teste que a telemetria `knowledge_copied` já registra
`stack: 'python'` + `atom_count` sem mudança de código (RF10).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/format-knowledge-preview.test.ts` | Modify | RED: describe `extractPythonVersionWarning` (casos R7) |
| `skills/init/lib/format-knowledge-preview.ts` | Modify | GREEN: constantes de piso + `extractPythonVersionWarning` |
| `skills/init/lib/run-stack-knowledge-init.ts` | Modify | Branch `primary === 'python'` lendo pyproject.toml (espelho do bloco Rails linhas 115-128) |
| `skills/init/lib/run-stack-knowledge-init.test.ts` | Modify | Integração: warning propagado em `result.warnings` + telemetria RF10 |

---

## Implementacao

### Passo 1: RED — testes do parser conservador (casos R7 do PLAN)

Em `format-knowledge-preview.test.ts`, seguir o padrão do describe existente de
`extractRailsVersionWarning`:

```typescript
// 2026-08-30 (Luiz/dev): warning legado Python — D7/RF8 + CA-04 do PRD stack-knowledge-python.
// R7: parse conservador — formato nao reconhecido NUNCA gera warning (zero falso-positivo).
describe('extractPythonVersionWarning (RF8/D7)', () => {
  const WARNING = '⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.'

  const pyproject = (requires: string | null): string =>
    ['[project]', 'name = "x"', 'version = "0.1.0"',
     ...(requires === null ? [] : [`requires-python = "${requires}"`]),
     'dependencies = ["fastapi>=0.110"]'].join('\n')

  it('>=3.9 (abaixo do piso) gera warning', () => {
    expect(extractPythonVersionWarning(pyproject('>=3.9'))).toBe(WARNING)
  })

  it('>=3.10 (abaixo do piso) gera warning', () => {
    expect(extractPythonVersionWarning(pyproject('>=3.10'))).toBe(WARNING)
  })

  it('>=3.11 (exatamente o piso) NAO gera warning', () => {
    expect(extractPythonVersionWarning(pyproject('>=3.11'))).toBeNull()
  })

  it('>=3.12 NAO gera warning (CA-04 lado negativo)', () => {
    expect(extractPythonVersionWarning(pyproject('>=3.12'))).toBeNull()
  })

  it('range composto ">=3.9,<3.13" usa o lower bound e gera warning', () => {
    expect(extractPythonVersionWarning(pyproject('>=3.9,<3.13'))).toBe(WARNING)
  })

  it('R7: formato nao reconhecido "^3.10" (poetry legacy, nao-PEP440) NAO gera warning', () => {
    expect(extractPythonVersionWarning(pyproject('^3.10'))).toBeNull()
  })

  it('R7: requires-python ausente NAO gera warning', () => {
    expect(extractPythonVersionWarning(pyproject(null))).toBeNull()
  })

  it('R7: conteudo que nem e TOML valido NAO gera warning nem lanca', () => {
    expect(extractPythonVersionWarning('not a toml {{{')).toBeNull()
  })
})
```

Rodar e registrar o RED genuíno (função não existe → começar exportando stub `return null`
para o RED ser por assertion, não por compilation error):

```
bun test skills/init/lib/format-knowledge-preview.test.ts
```

### Passo 2: GREEN — implementação em format-knowledge-preview.ts

Mesma vizinhança do bloco Rails (constantes de piso moram aqui porque o piso é sobre a
COBERTURA DO KNOWLEDGE, não sobre parsing — precedente do comentário 2026-08-18 no arquivo):

```typescript
// 2026-08-30 (Luiz/dev): RF8/D7 — warning quando pyproject declara requires-python < 3.11.
// Piso deriva de constantes (mexer no piso nao deixa o texto mentindo), espelho do bloco Rails.
// R7 (parse conservador): so reconhece lower bound `>=X.Y[.Z]` — qualquer outro formato
// (^3.10 poetry-legacy, ==3.*, ausente, TOML torto) retorna null. Falso-negativo e aceitavel;
// falso-positivo nao. TaskGroup e 3.11+, TypeIs e 3.13+ — D7 do PRD stack-knowledge-python.
export const MIN_SUPPORTED_PYTHON_MAJOR = 3
export const MIN_SUPPORTED_PYTHON_MINOR = 11
export const PYTHON_FOCUS_VERSION = '3.13'

const REQUIRES_PYTHON_LINE = /^\s*requires-python\s*=\s*["']([^"']+)["']\s*$/m
const LOWER_BOUND = />=\s*(\d+)\.(\d+)(?:\.\d+)?/

export function extractPythonVersionWarning(pyprojectContent: string): string | null {
  const line = REQUIRES_PYTHON_LINE.exec(pyprojectContent)
  if (!line || line[1] === undefined) return null

  const bound = LOWER_BOUND.exec(line[1])
  if (!bound || bound[1] === undefined || bound[2] === undefined) return null

  const major = Number(bound[1])
  const minor = Number(bound[2])
  const belowFloor =
    major < MIN_SUPPORTED_PYTHON_MAJOR ||
    (major === MIN_SUPPORTED_PYTHON_MAJOR && minor < MIN_SUPPORTED_PYTHON_MINOR)

  if (belowFloor) {
    return `⚠️ Knowledge Python cobre ${MIN_SUPPORTED_PYTHON_MAJOR}.${MIN_SUPPORTED_PYTHON_MINOR}+, foco ${PYTHON_FOCUS_VERSION}. Alguns padrões podem não se aplicar.`
  }
  return null
}
```

Nota de escopo deliberada: um regex line-based basta — parser TOML completo seria
over-engineering para ler 1 chave (o pyproject típico tem `requires-python` top-level em
`[project]`). Caso patológico (chave igual dentro de outra seção) cai no "conservador":
warning errado é pior que warning ausente, e o formato exigido pelo regex é o canônico.

### Passo 3: GREEN — integração no run-stack-knowledge-init.ts

Espelho do bloco Rails (linhas 115-128). Generalizar a constante de cap de manifest — ela é
local ao arquivo, rename seguro:

```typescript
// 2026-08-30 (Luiz/dev): RF8 — GEMFILE_MAX_BYTES renomeada para MANIFEST_MAX_BYTES;
// mesmo cap DoS-defensivo (1MB) agora cobre Gemfile e pyproject.toml.
const MANIFEST_MAX_BYTES = 1_048_576
```

E após o bloco `if (stackJson.primary === 'rails') {...}`:

```typescript
// 2026-08-30 (Luiz/dev): RF8/D7 — warning Python legado, espelho do RF11 Rails acima.
// ENOENT/oversize = no-op silencioso (best-effort, mesma politica do bloco Rails).
if (stackJson.primary === 'python') {
  const pyprojectPath = path.join(targetDir, 'pyproject.toml')
  try {
    const stat = await fs.stat(pyprojectPath)
    if (stat.isFile() && stat.size <= MANIFEST_MAX_BYTES) {
      const pyprojectContent = await fs.readFile(pyprojectPath, 'utf8')
      const warning = extractPythonVersionWarning(pyprojectContent)
      if (warning) warnings.push(warning)
    }
  } catch {
    // pyproject ausente (projeto requirements-only) — sem warning (CA-11)
  }
}
```

Atualizar o import na linha 9 para incluir `extractPythonVersionWarning`.

### Passo 4: Integração + telemetria RF10 em run-stack-knowledge-init.test.ts

```typescript
// 2026-08-30 (Luiz/dev): RF8 integracao + RF10 confirmacao — CA-04 do PRD stack-knowledge-python
describe('warning legado python + telemetria (RF8/RF10)', () => {
  it('CA-04: pyproject requires-python >=3.9 -> knowledge copiado E warning presente', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "legacy"\nversion = "0.1.0"\nrequires-python = ">=3.9"\ndependencies = ["fastapi"]\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.copyResult.status).toBe('copied')  // warning NAO bloqueia a copia
    expect(result.warnings).toContain('⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.')
  })

  it('CA-04: requires-python >=3.12 -> sem warning', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "modern"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["fastapi"]\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.warnings).toBeUndefined()
  })

  it('RF10: knowledge_copied emitido com stack=python e atom_count real (sem mudanca de codigo)', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "telemetry"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["fastapi"]\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    // writeTelemetryDomainEvent grava em {targetDir}/.claude/metrics/{YYYY-MM}.jsonl
    const monthlyFile = join(project, '.claude', 'metrics', new Date().toISOString().slice(0, 7) + '.jsonl')
    const lines = readFileSync(monthlyFile, 'utf8').trim().split('\n').map(l => JSON.parse(l))
    const copied = lines.find(e => e.evento === 'knowledge_copied')
    expect(copied).toBeDefined()
    expect(copied.stack).toBe('python')
    // G5: dinamico contra copyResult — NAO hardcodear 18 (nem 1)
    expect(copied.atom_count).toBe(result.copyResult.atomCount)
    expect(copied.atom_count).toBeGreaterThanOrEqual(1)
  })
})
```

(Adaptar `project`/`PLUGIN_ROOT` ao harness já existente no arquivo de teste — ele já tem
`beforeEach` com mkdtemp e a constante do root.)

### Passo 5: Suite completa + commit próprio

```
bun test && bun run typecheck && bun run harness:validate
git add skills/init/lib/format-knowledge-preview.ts skills/init/lib/format-knowledge-preview.test.ts skills/init/lib/run-stack-knowledge-init.ts skills/init/lib/run-stack-knowledge-init.test.ts
git commit -m "feat(python-knowledge): warning requires-python <3.11 + confirmacao telemetria (RF8/RF10, CA-04)"
```

Depois do commit: abrir o PR do Plano 01 (`gh pr create`) — branch
`feat/stack-knowledge-python-plano01`, nunca merge direto (G9).

---

## Gotchas

- **G7 do README (R7):** conservador SEMPRE — `^3.10` está abaixo do piso mas NÃO gera
  warning porque o formato não é PEP 440 reconhecido. O teste do Passo 1 fixa esse
  comportamento de propósito; não "melhorar" o parser para cobrir caret.
- **G5 do README:** telemetria assertada contra `copyResult.atomCount` dinâmico. `18` só no
  e2e full (Plano 04 fase-07).
- **Local:** a mensagem do warning é contrato de teste em 3 lugares (unit, integração e —
  no Plano 04 — e2e full). Derivar SEMPRE das constantes; mudar o piso sem mudar texto
  quebra os testes de propósito (feature, não bug).
- **Local:** o rename `GEMFILE_MAX_BYTES → MANIFEST_MAX_BYTES` é local ao arquivo — mas rodar
  `rg -n "GEMFILE_MAX_BYTES"` no repo inteiro antes (Busca Não é Semântica) para confirmar
  zero referências externas, inclusive em testes e strings.
- **Local:** o tracer da fase-04 já asserta `warnings` undefined para `>=3.12` e
  requirements-only — se esta fase o quebrar, o parser está gerando falso-positivo (violação
  de R7), não é o tracer que se ajusta.
- **Local:** `writeTelemetryDomainEvent` é fire-and-forget silencioso (G7 da infra) — se o
  teste RF10 não achar o arquivo mensal, investigar `baseDir` passado, não adicionar retry.

---

## Verificacao

### TDD

- [ ] **RED:** describe do Passo 1 escrito, stub `return null` exportado, testes de warning
      FALHAM por assertion
  - Comando: `bun test skills/init/lib/format-knowledge-preview.test.ts`
  - Resultado esperado: `Expected: "⚠️ Knowledge Python cobre 3.11+..." Received: null`

- [ ] **GREEN:** implementação completa, describes novo e antigos passam
  - Comando: `bun test skills/init/lib/format-knowledge-preview.test.ts skills/init/lib/run-stack-knowledge-init.test.ts`
  - Resultado esperado: `0 fail`

### Checklist

- [ ] Casos R7 todos verdes: `>=3.9`→warning, `>=3.10`→warning, `>=3.11`→null, `>=3.12`→null,
      `>=3.9,<3.13`→warning, `^3.10`→null, ausente→null, TOML torto→null (sem throw)
- [ ] Warning NÃO bloqueia a cópia (CA-04: copiado E warning juntos)
- [ ] `extractRailsVersionWarning` e testes Rails intactos (regressão)
- [ ] RF10 confirmado: `knowledge_copied` com `stack: 'python'` + `atom_count` dinâmico no
      `.claude/metrics/*.jsonl`
- [ ] `rg "GEMFILE_MAX_BYTES"` retorna zero após o rename
- [ ] Testes passam: `bun test` (suite completa, incluindo tracer da fase-04)
- [ ] TypeCheck: `bun run typecheck`
- [ ] `bun run harness:validate` verde
- [ ] Commit próprio + PR do Plano 01 aberto (G9)

---

## Criterio de Aceite

**Por maquina:**
- `bun test` completo retorna 0 fail
- Teste CA-04 positivo E negativo verdes no mesmo run (warning aparece com `>=3.9`, some com
  `>=3.12`)

**Por humano:**
- Revisão do diff confirma: zero mudança em `copyKnowledge`, `detect-stack`, preface e
  `emitStackKnowledgeEvents` (RF10 é confirmação, não implementação)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
