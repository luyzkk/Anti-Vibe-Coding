<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: scripts/parity-audit.ts pure-fn + wire-up

**Plano:** 01 — Honesty & Wire-up Core
**Sizing:** 2h
**Depende de:** fase-02 (snapshot rico via parser dual-field é input do script)
**Visual:** false

---

## O que esta fase entrega

`bun run parity:audit [task_type]` executa end-to-end: lê snapshot via `inspectToolRegistry`, computa gaps via `computeParityGaps`, escreve `discovery/parity-gaps.json`, e imprime resumo top-3 por severity ao stdout. Skill `/parity-audit` ganha `Bash` em `allowed-tools` e instrui invocação do script em vez de "importe X" prosa frágil — RF-MH-03 do PRD v6.3.1, CA-05 + CA-07.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/parity-audit.ts` | Create | Pure-fn `audit(projectRoot, taskType)` + entrypoint guarded por `import.meta.main`. Padrão DEC-4 espelhado de `scripts/preface-simulate.ts` |
| `package.json` | Modify | Inserir entry `"parity:audit": "bun run scripts/parity-audit.ts"` ALFABETICAMENTE entre `new-plan` (linha 12) e `preface:simulate` (linha 13) |
| `skills/parity-audit/SKILL.md` | Modify | `allowed-tools:` ganha `Bash` (5 → 6 tools). Passos 2-4 reescritos: `Run: bun run parity:audit "$task_type"` em vez de "Importe inspectToolRegistry". Frontmatter `kind: audit, user-invocable: true` intacto |
| `tests/fixtures/parity-audit-happy/.anti-vibe-manifest.json` | Create | Manifest válido com mcps + builtin_tools |
| `tests/fixtures/parity-audit-happy/agents/dummy.md` | Create | Agent com `tools: Read` |
| `tests/unit/parity-audit-script.test.ts` | Create | 2 testes RED→GREEN (happy-path + partial) |

---

## Implementacao

### Passo 1 — Criar `scripts/parity-audit.ts` espelhando padrão `preface-simulate.ts`

```typescript
#!/usr/bin/env bun
// 2026-05-15 (Luiz/dev): parity-audit script — PRD v6.3.1 §RF-MH-03, plano01 fase-03 GREEN.
// Pure-fn audit() + entrypoint guarded. Padrão DEC-4 da v6.3.0 (preface-simulate.ts:92).

import { inspectToolRegistry } from "../skills/lib/tool-registry-inspector"
import {
  computeParityGaps,
  writeParityGaps,
} from "../skills/parity-audit/lib/parity-gaps-writer"

// 2026-05-15 (Luiz/dev): regex barra input malicioso — GT-4 do PRD v6.3.0 lessons (path traversal).
// task_type aceito é slug kebab-case (alfanumérico + hífen, deve começar com letra).
const SAFE_TASK_TYPE = /^[a-z][a-z0-9-]*$/i

export async function audit(
  projectRoot: string,
  taskType: string | null,
): Promise<{ stdout: string[]; stderr: string[]; code: number }> {
  const stdout: string[] = []
  const stderr: string[] = []

  if (taskType !== null && !SAFE_TASK_TYPE.test(taskType)) {
    stderr.push(
      `Invalid task_type. Allowed: [a-z][a-z0-9-]*, no path separators or special chars.`,
    )
    return { stdout, stderr, code: 1 }
  }

  const snapshot = await inspectToolRegistry(projectRoot)
  if (snapshot.source === "partial") {
    stderr.push(
      "Tool registry incompleto (manifest ou agents/ ausente). Resultado será best-effort.",
    )
  }

  const output = computeParityGaps(snapshot, taskType)
  const outPath = await writeParityGaps(output, projectRoot)

  // resumo top-3 por severity
  const bySeverity = {
    critical: output.gaps.filter(g => g.severity === "critical"),
    important: output.gaps.filter(g => g.severity === "important"),
    nice: output.gaps.filter(g => g.severity === "nice"),
  }

  stdout.push(`Parity Audit — ${output.gaps.length} gap(s) encontrado(s)`)
  stdout.push("")
  for (const sev of ["critical", "important", "nice"] as const) {
    const list = bySeverity[sev]
    if (list.length === 0) continue
    stdout.push(`${sev.toUpperCase()} (${list.length}):`)
    for (const g of list.slice(0, 3)) {
      stdout.push(
        `  - gap_id: ${g.gap_id} | missing: ${g.missing_capability} | suggestion: ${g.suggestion}`,
      )
    }
    stdout.push("")
  }
  stdout.push(`Output completo: ${outPath}`)

  return { stdout, stderr, code: 0 }
}

if (import.meta.main) {
  const taskTypeArg = process.argv[2] ?? null
  const taskType = taskTypeArg && taskTypeArg.length > 0 ? taskTypeArg : null
  audit(process.cwd(), taskType)
    .then(result => {
      for (const line of result.stdout) console.log(line)
      for (const line of result.stderr) console.error(line)
      process.exit(result.code)
    })
    .catch((err: unknown) => {
      console.error("parity:audit error:", err)
      process.exit(1)
    })
}
```

Contrato exatamente igual ao `simulate` de `preface-simulate.ts:43-90` — facilita teste isolado sem `process.exit` colateral.

### Passo 2 — Adicionar entry em `package.json` alfabeticamente

`package.json:5-17` ordem atual (relevante):
```
"new-plan": "bun run scripts/new-plan.ts",
"preface:simulate": "bun run scripts/preface-simulate.ts",
```

Inserir `parity:audit` entre as duas (alfabético: `new-plan` < `parity:audit` < `preface:simulate`):

```json
{
  "scripts": {
    "test": "bun run scripts/run-tests.ts",
    "typecheck": "tsc --noEmit",
    "test:e2e": "bun test tests/e2e/",
    "test:tracer": "bun test tests/e2e/init-tracer-bullet.test.ts",
    "harness:validate": "bun scripts/harness-validate.ts .",
    "compound:check": "bun scripts/compound-check.ts .",
    "new-plan": "bun run scripts/new-plan.ts",
    "parity:audit": "bun run scripts/parity-audit.ts",
    "preface:simulate": "bun run scripts/preface-simulate.ts",
    "state:regenerate": "bun run skills/lib/state-md-generator.ts $PWD",
    "prepare": "husky",
    "agents:contract": "bun test skills/lib/subagent-contract.test.ts"
  }
}
```

### Passo 3 — Reescrever `skills/parity-audit/SKILL.md`

**Frontmatter (linhas 1-9):**
```yaml
---
name: parity-audit
description: Audita capabilities do agente (MCPs, tools, subagentes) e produz parity-gaps.json com gaps ranqueados por severity. Use quando quiser revisar se o agente tem ferramentas para o task_type que você vai pedir.
kind: audit
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Glob, Grep, Write, AskUserQuestion
argument-hint: "[task_type opcional, ex: payment-debug, browser-test]"
---
```

Mudança: `allowed-tools` ganha `Bash` no início da lista (5 → 6 tools). `kind: audit` e `user-invocable: true` intactos.

**Substituir Passos 2-4 (linhas 23-37) por execução do script:**

```markdown
## Passo 2 — Executar script parity-audit

Rode o script via Bash. O script faz: snapshot via `inspectToolRegistry` → compute gaps → escrita em `discovery/parity-gaps.json` → resumo top-3 ao stdout.

Se `task_type` foi resolvido no Passo 1, passe como argumento; se vazio, omita (audita ruleset completo):

```bash
bun run parity:audit "$task_type"
```

Ou (sem argumento, ruleset completo):

```bash
bun run parity:audit
```

Saída esperada (exemplo):

```
Parity Audit — 2 gap(s) encontrado(s)

CRITICAL (1):
  - gap_id: GAP-001 | missing: MCP playwright | suggestion: instalar @playwright/mcp

IMPORTANT (1):
  - gap_id: GAP-007 | missing: Bash tool | suggestion: adicionar Bash em allowed-tools

Output completo: /path/to/project/discovery/parity-gaps.json
```

Se stderr contém `Tool registry incompleto`, sinalize ao usuário ANTES do resumo final:
> "Tool registry incompleto (manifest ou agents/ ausente). Resultado é best-effort — considere rodar `/init --refresh` antes de re-auditar."

## Passo 3 — Apresentar resumo ao dev

(Passo 5 antigo, renumerado.) O script já imprime o resumo; reforce a interpretação ao dev se houver gaps `critical`.

Se 0 gaps: "Nenhum gap detectado para task_type=`<taskType>`. O agente tem todas as capabilities mapeadas no ruleset atual."
```

> **Nota:** o conteúdo do antigo Passo 5 (apresentar top-3 ao dev) é absorvido pelo Passo 3 novo. O Passo 1 (resolver task_type) permanece intacto.

### Passo 4 — Fixtures de teste

**`tests/fixtures/parity-audit-happy/.anti-vibe-manifest.json`:**
```json
{
  "mcps": [
    { "name": "playwright", "tools": ["browser_navigate", "browser_snapshot"] }
  ],
  "builtin_tools": ["Bash", "Read", "Write", "Glob", "Grep"]
}
```

**`tests/fixtures/parity-audit-happy/agents/dummy.md`:**
```markdown
---
name: dummy
description: Dummy agent for parity-audit fixture
tools: Read, Grep
---

# Dummy
```

### Passo 5 — Testes em `tests/unit/parity-audit-script.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-03 (CA-05 + CA-07 do PRD v6.3.1)
import { describe, expect, test } from 'bun:test'
import { audit } from '../../scripts/parity-audit'
import { mkdtemp, mkdir, copyFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FIXTURES_HAPPY = path.join(import.meta.dir, '..', 'fixtures', 'parity-audit-happy')

async function setupHappyProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'avc-parity-'))
  await copyFile(
    path.join(FIXTURES_HAPPY, '.anti-vibe-manifest.json'),
    path.join(root, '.anti-vibe-manifest.json'),
  )
  await mkdir(path.join(root, 'agents'), { recursive: true })
  await copyFile(
    path.join(FIXTURES_HAPPY, 'agents', 'dummy.md'),
    path.join(root, 'agents', 'dummy.md'),
  )
  return root
}

async function setupPartialProject(): Promise<string> {
  // sem manifest, sem agents/
  const root = await mkdtemp(path.join(tmpdir(), 'avc-parity-partial-'))
  return root
}

describe('parity-audit script', () => {
  test('happy-path: manifest present + agents → exit 0 + parity-gaps.json escrito (CA-05)', async () => {
    const root = await setupHappyProject()
    const result = await audit(root, null)
    expect(result.code).toBe(0)
    const outPath = path.join(root, 'discovery', 'parity-gaps.json')
    const written = JSON.parse(await readFile(outPath, 'utf-8'))
    expect(written.tool_registry_snapshot.source).toBe('manifest')
    expect(written.tool_registry_snapshot.subagents.length).toBeGreaterThan(0)
  })

  test('partial: no manifest → exit 0 + tool_registry_snapshot.source: partial + warning (CA-07)', async () => {
    const root = await setupPartialProject()
    const result = await audit(root, null)
    expect(result.code).toBe(0)
    expect(result.stderr.some(l => l.includes('Tool registry incompleto'))).toBe(true)
    const outPath = path.join(root, 'discovery', 'parity-gaps.json')
    const written = JSON.parse(await readFile(outPath, 'utf-8'))
    expect(written.tool_registry_snapshot.source).toBe('partial')
  })

  test('rejects unsafe task_type (GT-4 hardening)', async () => {
    const root = await setupHappyProject()
    const result = await audit(root, '../etc/passwd')
    expect(result.code).toBe(1)
    expect(result.stderr.some(l => l.includes('Invalid task_type'))).toBe(true)
  })
})
```

---

## Gotchas

- **G3 do plano:** `import.meta.main` guard obrigatório — sem ele, importar `audit` em teste dispara `process.exit` durante carregamento. Padrão validado em `scripts/preface-simulate.ts:92`.
- **G4 do plano:** `discovery/parity-gaps.json` é gitignored (D8 v6.3.0) — testes podem escrever em tmpdir sem poluir repo. `writeParityGaps` cria `discovery/` recursivamente.
- **G8 do plano:** Inserção em `package.json:5-17` deve ser alfabética. `parity:audit` cai entre `new-plan` e `preface:simulate`.
- **Local — `bun run` em Windows:** `bun run parity:audit "$task_type"` em PowerShell expansão de variável é `$task_type` (diferente de bash). SKILL.md instrui em pseudo-bash; agente que invoca o skill em Windows precisa usar sintaxe shell apropriada. Documentar como nota no Passo 2 do SKILL.md se virar dor frequente.
- **Local — `Bash` em `allowed-tools` do skill:** adicionar Bash habilita o harness Claude Code a executar `bun run` ao invocar o skill. Sem Bash, harness recusa execução (verify-work v6.3.0 confirmou). Não remover.
- **Local — `taskType` argv null vs. string vazia:** `process.argv[2]` retorna `undefined` se sem arg; `""` se passado `parity:audit ""`. Normalizar para `null` no entrypoint (cobertura no código do Passo 1).
- **Local — Regex SAFE_TASK_TYPE:** GT-4 do PRD lessons. Permite `payment-debug`, `Browser-Test`, mas rejeita `../etc`, `foo/bar`, `;rm`. Caso flag `null` (audita tudo), valida só se string presente.

---

## Verificacao

### TDD

- [ ] **RED:** 3 testes escritos antes de `scripts/parity-audit.ts` existir. Bun resolve import → erro `Cannot find module`. Após criar o arquivo vazio (só `export async function audit() { throw new Error('not implemented') }`), os 3 testes falham por assertion.
  - Comando: `bun run test -- --test-name-pattern "parity-audit script"`
  - Resultado esperado: `3 fail, 0 pass` (assertion errors, não module-not-found)

- [ ] **GREEN:** Após implementação completa, todos passam.
  - Comando: `bun run test -- --test-name-pattern "parity-audit script"`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] `bun run typecheck` limpo
- [ ] `bun run parity:audit` na raiz do projeto: exit 0, imprime resumo, escreve `discovery/parity-gaps.json` (verificar `.gitignore` cobre — D8 v6.3.0)
- [ ] `bun run parity:audit payment-debug` filtra por task_type (CA-05 happy-path)
- [ ] `bun run parity:audit "../etc/passwd"` retorna exit 1 + stderr "Invalid task_type"
- [ ] `discovery/parity-gaps.json` produzido em projeto real tem `tool_registry_snapshot.subagents` com `allowed_tools` populados (depende de fase-02)
- [ ] `skills/parity-audit/SKILL.md` frontmatter parsea sem erro (validar com `bun run harness:validate`)
- [ ] `bun run harness:validate` aceita Bash em allowed-tools (não regride contra contrato de skills v6.1.0)

---

## Criterio de Aceite

Mapeia para **CA-05** + **CA-07** do PRD v6.3.1.

**Por maquina:**
- `bun run test -- --test-name-pattern "parity-audit script"` → `3 pass, 0 fail`
- `bun run parity:audit` em projeto com manifest válido → exit 0 + `discovery/parity-gaps.json` escrito
- `bun run parity:audit` em projeto SEM manifest → exit 0 + stderr "Tool registry incompleto" + `tool_registry_snapshot.source === 'partial'`
- `bun run harness:validate` → exit 0 (SKILL.md com 6 tools é válido)

**Por humano:**
- N/A (sem UI).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
