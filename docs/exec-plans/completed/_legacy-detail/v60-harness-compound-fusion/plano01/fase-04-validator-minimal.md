<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Validator Minimal (scripts/harness-validate.ts em TS+bun)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1h
**Depende de:** Independente das outras fases (pode ser paralelizada com fase-01..03). Para o E2E (fase-05) precisa apenas que os templates definam quais arquivos sao obrigatorios.
**Visual:** false

---

## O que esta fase entrega

Script `scripts/harness-validate.ts` em TypeScript+bun (D13), versao minimal do validator. Checa apenas:

1. Arquivos obrigatorios existem (`AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`).
2. AGENTS.md tem ≤40 linhas (CA-27).
3. AGENTS.md comeca com `# ` (heading H1).
4. Exit 0 = passou; exit 1 + mensagens de erro em stderr.

Atende CA-26 (perf <2s — versao minimal tem 3 checks e fixture pequena, deve rodar em ms) e CA-27 (rejeita AGENTS >40). Versao completa com 15+ checks (links quebrados, planos orfaos, frontmatter compound) fica para Plano 04.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/scripts/harness-validate.ts.tpl` | Create | Template do validator em TS, copiado pelo `/init` para `scripts/harness-validate.ts` no projeto-alvo |
| `anti-vibe-coding/skills/init/assets/templates/package.json.tpl` | Create | Template package.json minimal com `"harness:validate": "bun run scripts/harness-validate.ts"` |
| `anti-vibe-coding/skills/init/lib/scaffold-templates.ts` | Modify | Adicionar os 2 novos pairs (`scripts/harness-validate.ts.tpl` → `scripts/harness-validate.ts`; `package.json.tpl` → `package.json`) |
| `anti-vibe-coding/tests/harness-validate.test.ts` | Create | TDD do validator: AGENTS com 50 linhas → exit 1; AGENTS com 30 linhas + arquivos ok → exit 0 |

---

## Implementacao

### Passo 1: Validator `scripts/harness-validate.ts.tpl`

Reescrita TS+bun do `.mjs` original do Andre, **simplificada** para o tracer bullet:

```typescript
#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): harness-validate minimal — fase-04 do plano01 v6.0.0
// Decisao: D13 (TS+bun). Versao completa (links, planos orfaos, frontmatter)
// fica para Plano 04. Aqui so o essencial para o tracer bullet.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const REQUIRED_FILES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CLAUDE.md',
] as const

const AGENTS_MAX_LINES = 40

type Failure = { rule: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  await checkRequiredFiles(failures)
  await checkAgentsLineCount(failures)
  await checkAgentsHeading(failures)

  if (failures.length > 0) {
    console.error('Harness validation failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.message}`)
    }
    process.exit(1)
  }

  console.log('Harness validation passed.')
  process.exit(0)
}

async function checkRequiredFiles(failures: Failure[]): Promise<void> {
  // Paralelizar — G3 do plano (perf): fs.stat em paralelo
  const checks = REQUIRED_FILES.map(async (rel) => {
    try {
      const stat = await fs.stat(path.join(root, rel))
      if (!stat.isFile() && !stat.isSymbolicLink()) {
        failures.push({ rule: 'required-files', message: `${rel} exists but is not a file or symlink` })
      }
    } catch {
      failures.push({ rule: 'required-files', message: `Missing required file: ${rel}` })
    }
  })
  await Promise.all(checks)
}

async function checkAgentsLineCount(failures: Failure[]): Promise<void> {
  const agentsPath = path.join(root, 'AGENTS.md')
  let content: string
  try {
    content = await fs.readFile(agentsPath, 'utf8')
  } catch {
    // ja registrado em checkRequiredFiles — nao duplicar
    return
  }

  const lineCount = content.split('\n').length
  if (lineCount > AGENTS_MAX_LINES) {
    failures.push({
      rule: 'agents-line-count',
      message: `AGENTS.md should stay short; keep it at ${AGENTS_MAX_LINES} lines or fewer (current: ${lineCount})`,
    })
  }
}

async function checkAgentsHeading(failures: Failure[]): Promise<void> {
  const agentsPath = path.join(root, 'AGENTS.md')
  try {
    const content = await fs.readFile(agentsPath, 'utf8')
    if (!content.startsWith('# ')) {
      failures.push({
        rule: 'agents-heading',
        message: 'AGENTS.md must start with an H1 heading (line 1 begins with "# ")',
      })
    }
  } catch {
    // ja registrado
  }
}

await main()
```

Comparacao com `.mjs` original do Andre (referencia em `f:/Projetos/Claude code/V6.0.0/package/skills/harness-engineering/assets/harness-template/scripts/harness-validate.mjs`):

- Original tem 22 arquivos obrigatorios — versao minimal tem 3.
- Original valida 6 propriedades em AGENTS.md (links + line count + headings em todos `.md`) — versao minimal valida 3.
- Original checa planos orfaos em `docs/exec-plans/active/` — versao minimal NAO checa (sera Plano 04).
- Original valida links relativos quebrados em todos os `.md` — versao minimal NAO valida (sera Plano 04).
- Tipos TS adicionados; logica preservada.

### Passo 2: `package.json.tpl` minimal

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "harness:validate": "bun run scripts/harness-validate.ts",
    "test": "bun test",
    "lint": "echo 'No linter configured yet — Plano 02 adds eslint'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
```

### Passo 3: Estender `scaffold-templates.ts` (fase-02) com 2 pairs novos

```typescript
const pairs: ReadonlyArray<readonly [string, string]> = [
  ['AGENTS.md.tpl', 'AGENTS.md'],
  ['ARCHITECTURE.md.tpl', 'ARCHITECTURE.md'],
  // Adicionados em fase-04:
  ['scripts/harness-validate.ts.tpl', 'scripts/harness-validate.ts'],
  ['package.json.tpl', 'package.json'],
]

// IMPORTANTE: criar diretorio scripts/ antes de escrever
for (const [src, dst] of pairs) {
  // ...
  await fs.mkdir(path.dirname(dstPath), { recursive: true })
  await fs.writeFile(dstPath, rendered, 'utf8')
  // ...
}
```

### Passo 4: TDD do validator — `tests/harness-validate.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'validator')

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/harness-validate.ts')], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d })
    proc.stderr.on('data', (d) => { stderr += d })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

describe('harness-validate (minimal)', () => {
  beforeEach(async () => {
    await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
    // copiar validator real
    await fs.copyFile(
      path.join(import.meta.dir, '..', 'skills/init/assets/templates/scripts/harness-validate.ts.tpl'),
      path.join(FIXTURE, 'scripts/harness-validate.ts')
    )
  })

  afterEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
  })

  it('exits 1 when AGENTS.md has 50 lines (CA-27)', async () => {
    const lines = Array.from({ length: 50 }, (_, i) => `# Line ${i}`).join('\n')
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), lines, 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), lines, 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('40 lines or fewer')
  })

  it('exits 0 when AGENTS.md is small and required files exist', async () => {
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), '# Agent\n\nShort content.\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), '# Agent\n\nShort content.\n', 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Harness validation passed')
  })

  it('exits 1 when ARCHITECTURE.md is missing', async () => {
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), '# Agent\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), '# Agent\n', 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Missing required file: ARCHITECTURE.md')
  })
})
```

---

## Gotchas

- **G3 do plano (perf):** Mesmo na versao minimal, paralelizar `fs.stat` via `Promise.all`. Se rodar sequencial, 3 stats em SSD sao ~3ms — ainda dentro de CA-26, mas estabelece o padrao para Plano 04 que tera 100+ checks.
- **G4 do plano (cross-platform):** `path.join(root, rel)` sempre. Nunca concat string com `/`. O validator roda em Windows do usuario e Linux na CI.
- **Local — shebang `#!/usr/bin/env bun`:** Funciona em Unix mas no Windows precisa ser invocado via `bun run scripts/harness-validate.ts`. O `npm script` `"harness:validate"` faz isso — nao depender de shebang executavel.
- **Local — `process.exit(1)` vs `process.exitCode = 1`:** Andre usa `process.exitCode` no `.mjs`. Usar `process.exit(1)` aqui eh OK porque rodamos sob `bun` e nao temos finalizers async pendentes apos `main()`. Mas se a versao do Plano 04 adicionar logging async, mudar para `exitCode`.
- **Local — symlink/hardlink em `fs.stat`:** `fs.stat` SEGUE symlinks (retorna info do alvo). `fs.lstat` retorna info do link. Para CLAUDE.md (que pode ser symlink ou hardlink ou copia), `stat.isFile()` retorna `true` em todos os 3 casos — perfeito. Por isso o validator usa `stat`, nao `lstat`.

---

## Verificacao

### TDD

- [ ] **RED:** `tests/harness-validate.test.ts` escrito antes do validator. Teste 1 ("exits 1 when AGENTS.md has 50 lines") falha porque `scripts/harness-validate.ts` nao existe.
  - Comando: `bun run test harness-validate.test.ts`
  - Resultado esperado: erro `Cannot find module` ou exit -1 do spawn

- [ ] **GREEN:** Validator implementado. Os 3 testes passam.
  - Comando: `bun run test harness-validate.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

- [ ] **REFACTOR:** Extrair `loadAgents()` em helper se mais de 2 checks lerem o arquivo. (No minimal sao 2 — OK manter inline.)

### Checklist

- [ ] `scripts/harness-validate.ts.tpl` existe em `anti-vibe-coding/skills/init/assets/templates/scripts/`
- [ ] Validator usa `import { promises as fs }` e `import path` (TS strict — sem `require`)
- [ ] **CA-26 (perf):** `time bun run scripts/harness-validate.ts` no fixture do tracer bullet executa em <500ms (alvo final eh <2s no Plano 04 com 100 docs; aqui temos 3 arquivos, deve ser <100ms)
- [ ] **CA-27 (line count):** Validator retorna exit 1 com mensagem `"40 lines or fewer"` quando AGENTS.md tem 50 linhas — testado em `harness-validate.test.ts`
- [ ] Validator retorna exit 1 quando ARCHITECTURE.md ou CLAUDE.md faltam
- [ ] Validator retorna exit 0 quando todos os 3 arquivos existem e AGENTS.md tem ≤40 linhas e comeca com `# `
- [ ] `package.json.tpl` tem script `"harness:validate"` apontando para `bun run scripts/harness-validate.ts`
- [ ] `scaffold-templates.ts` (de fase-02) atualizado para copiar os 2 novos templates e criar `scripts/` antes de escrever
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck` (no `any`, sem `as`)

---

## Criterio de Aceite

**Por maquina:**
- `bun run test tests/harness-validate.test.ts` → 3 passed
- Em fixture com AGENTS.md de 30 linhas + ARCHITECTURE.md + CLAUDE.md: `bun run scripts/harness-validate.ts` retorna exit 0 e imprime `Harness validation passed.` em stdout
- Em fixture com AGENTS.md de 50 linhas: mesmo comando retorna exit 1 e imprime em stderr a linha `[agents-line-count] AGENTS.md should stay short; keep it at 40 lines or fewer (current: 50)`
- `time bun run scripts/harness-validate.ts` em fixture do tracer bullet: real time <500ms

**Por humano:**
- Inspecionar o output do validator: mensagens de erro sao acionaveis (dizem QUAL regra falhou e POR QUE), nao genericas.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
