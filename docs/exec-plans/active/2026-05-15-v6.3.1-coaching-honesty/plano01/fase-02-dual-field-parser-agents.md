<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Dual-field parser + deprecation warning

**Plano:** 01 — Honesty & Wire-up Core
**Sizing:** 1.5h
**Depende de:** Nenhuma técnica (mas executada após fase-01 por ordem de PR — RF-MH-01 antes de RF-MH-02)
**Visual:** false

---

## O que esta fase entrega

`readSubagents()` lê `tools:` (canônico Claude Code) com fallback `allowed-tools:` (legacy) emitindo deprecation warning único por agent ao stderr. `inspectToolRegistry()` deixa de retornar `allowed_tools: []` para os 13 agents reais do plugin — RF-MH-02 do PRD v6.3.1, CA-03 + CA-04.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/lib/tool-registry-inspector.ts` | Modify | Linhas 78-107 (`readSubagents`): precedência `tools:` → fallback `allowed-tools:` + warning único cached em `Set` no escopo do módulo |
| `tests/fixtures/agents-dual-field/agent-canonical.md` | Create | Fixture com `tools: Read, Grep` |
| `tests/fixtures/agents-dual-field/agent-legacy.md` | Create | Fixture com `allowed-tools: Read` |
| `tests/unit/tool-registry-inspector.dual-field.test.ts` | Create | 2 testes RED→GREEN |
| `tests/fixtures/v6-state-fixture/agents/*.md` | Modify (se existirem com `allowed-tools:`) | Migrar para `tools:` para silenciar deprecation em suites legadas |

---

## Implementacao

### Passo 1 — Adicionar cache de warning no escopo do módulo

Topo de `skills/lib/tool-registry-inspector.ts` (após imports, antes dos types):

```typescript
// 2026-05-15 (Luiz/dev): cache 1× por agent — evita poluir stderr em projetos com muitos
// agents legacy. RNF Observabilidade do PRD v6.3.1. Module-scoped Set persiste entre
// múltiplas chamadas de inspectToolRegistry() no mesmo processo (ex: test suite).
const warnedAgents = new Set<string>()
```

### Passo 2 — Reescrever `readSubagents()` (linhas 78-107)

Substituir o bloco atual (que lê apenas `data['allowed-tools']`) por dual-read com precedência:

```typescript
async function readSubagents(projectRoot: string): Promise<{
  subagents: SubagentDescriptor[]
  found: boolean
}> {
  const agentsDir = path.join(projectRoot, 'agents')
  const entries = await readdir(agentsDir, { withFileTypes: true }).catch(() => null)
  if (!entries) return { subagents: [], found: false }

  const subagents: SubagentDescriptor[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const full = path.join(agentsDir, entry.name)
    const raw = await readFile(full, 'utf-8').catch(() => null)
    if (!raw) continue

    const { data } = matter(raw)
    const name = typeof data['name'] === 'string' ? data['name'] : entry.name.replace(/\.md$/, '')
    const description = typeof data['description'] === 'string' ? (data['description'].split('\n')[0] ?? '') : ''

    // 2026-05-15 (Luiz/dev): precedência 'tools:' canônica per convenção Claude Code
    // (agents=tools, skills=allowed-tools) — ref D2 do PRD v6.3.1, .claude/prd-v5/11-new-agents.md:31.
    // Fallback a 'allowed-tools:' emite deprecation warning 1× por agent (cache módulo).
    let toolsRaw = ''
    if (typeof data['tools'] === 'string') {
      toolsRaw = data['tools']
    } else if (typeof data['allowed-tools'] === 'string') {
      toolsRaw = data['allowed-tools']
      if (!warnedAgents.has(name)) {
        process.stderr.write(
          `[deprecation] agent ${name} uses 'allowed-tools'; canonical is 'tools' (per Claude Code convention)\n`
        )
        warnedAgents.add(name)
      }
    }

    const allowed_tools = toolsRaw
      .split(',')
      .map((s: string) => s.trim())
      .filter((s): s is string => s.length > 0)

    subagents.push({ name, description, allowed_tools })
  }

  return { subagents, found: true }
}
```

Mudanças chave vs. atual (linhas 96-103):
1. Leitura prioritária de `data['tools']` (linha 97 do código atual usa só `allowed-tools`).
2. Warning único cached em `warnedAgents` Set.
3. Comentário de provenance acima do dual-read explicando D2 do PRD.

### Passo 3 — Criar fixtures

**`tests/fixtures/agents-dual-field/agent-canonical.md`:**
```markdown
---
name: agent-canonical
description: Fixture com campo canônico tools (CA-03)
tools: Read, Grep
---

# Canonical agent
```

**`tests/fixtures/agents-dual-field/agent-legacy.md`:**
```markdown
---
name: agent-legacy
description: Fixture com campo legacy allowed-tools (CA-04)
allowed-tools: Read
---

# Legacy agent
```

### Passo 4 — Testes em `tests/unit/tool-registry-inspector.dual-field.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-02 (CA-03 + CA-04 do PRD v6.3.1)
import { describe, expect, test, beforeEach } from 'bun:test'
import { inspectToolRegistry } from '../../skills/lib/tool-registry-inspector'
import { mkdtemp, mkdir, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function setupProject(fixtureFiles: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'avc-dual-'))
  const agentsDir = path.join(root, 'agents')
  await mkdir(agentsDir, { recursive: true })
  const fixturesRoot = path.join(import.meta.dir, '..', 'fixtures', 'agents-dual-field')
  for (const f of fixtureFiles) {
    await copyFile(path.join(fixturesRoot, f), path.join(agentsDir, f))
  }
  return root
}

describe('tool-registry-inspector dual-field parser', () => {
  let stderrCaptured: string

  beforeEach(() => {
    stderrCaptured = ''
    const origWrite = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrCaptured += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
      return true
    }) as typeof process.stderr.write
    // restore via afterEach (or test scope) — omitido aqui por brevidade
  })

  test('reads tools: canonical without warning (CA-03)', async () => {
    const root = await setupProject(['agent-canonical.md'])
    const snapshot = await inspectToolRegistry(root)
    const agent = snapshot.subagents.find(s => s.name === 'agent-canonical')
    expect(agent?.allowed_tools).toEqual(['Read', 'Grep'])
    expect(stderrCaptured).not.toContain('[deprecation]')
  })

  test('falls back to allowed-tools: with single deprecation warning (CA-04)', async () => {
    const root = await setupProject(['agent-legacy.md'])
    const snapshot = await inspectToolRegistry(root)
    const agent = snapshot.subagents.find(s => s.name === 'agent-legacy')
    expect(agent?.allowed_tools).toEqual(['Read'])
    const warningLines = stderrCaptured.split('\n').filter(l => l.includes('[deprecation]'))
    expect(warningLines.length).toBe(1)
    expect(warningLines[0]).toContain("agent-legacy uses 'allowed-tools'")
    expect(warningLines[0]).toContain("canonical is 'tools'")
  })
})
```

> **Gotcha de teste:** o cache `warnedAgents` é module-scoped. Suites múltiplas precisam resetar o Set entre testes — adicionar export opcional `__resetWarnedAgentsForTests()` em `tool-registry-inspector.ts` se aparecer flake. Em RED inicial, suficiente rodar testes isolados.

### Passo 5 — Migrar fixtures legadas para `tools:`

Buscar arquivos em `tests/fixtures/v6-state-fixture/agents/*.md` (se existirem) com `allowed-tools:` e renomear o campo para `tools:`. Comando de verificação:

```bash
grep -l "^allowed-tools:" tests/fixtures/v6-state-fixture/agents/ 2>/dev/null || echo "none — nothing to migrate"
```

Se `none`, pular este passo (fixtures já canônicas). Se houver matches, editar cada um.

---

## Gotchas

- **G2 do plano:** Cache `warnedAgents` é module-scoped — sobrevive entre chamadas de `inspectToolRegistry()` no mesmo processo. Suites de teste que executam múltiplas inspeções verão warning apenas na primeira. Documentar em comentário.
- **G6 do plano:** Convenção CC oficial é agents=`tools:`, skills=`allowed-tools:`. NÃO inverter precedência. Ref `agents/security-auditor.md:6` (campo `tools: Read, Grep, Glob` em produção).
- **Local — `tools:` como array YAML:** se algum agent usar `tools: [Read, Grep]` (lista YAML em vez de CSV string), `data['tools']` virá como `string[]`. O parser atual em `readSubagents` usa `typeof === 'string'` — array é silenciosamente ignorado, voltando para fallback. Decisão: aceitar limitação por enquanto (todos 13 agents reais usam CSV — ver `agents/security-auditor.md:6`). Documentar como `coverage_gap` futuro se necessário.
- **Local — `stderr.write` mock em Bun:** `process.stderr.write` aceita string OU Uint8Array. Mock deve cobrir ambos. Padrão usado no teste acima.
- **Local — Order independence:** dois agents podem ter mesmo `name` (improvável, mas possível em fixtures). Cache por `name` é OK — falha graciosamente (warning só no primeiro de mesmo nome processado).

---

## Verificacao

### TDD

- [ ] **RED:** 2 testes escritos antes do dual-read. Contra código atual, o teste `reads tools: canonical without warning` FALHA porque `allowed_tools` vem `[]` (parser atual lê só `allowed-tools:`).
  - Comando: `bun run test -- --test-name-pattern "dual-field parser"`
  - Resultado esperado: `1 fail, 1 pass` (o legacy passa coincidentemente; o canonical falha com `Expected ['Read', 'Grep'], received []`)

- [ ] **GREEN:** Após reescrita de `readSubagents()`, ambos passam.
  - Comando: `bun run test -- --test-name-pattern "dual-field parser"`
  - Resultado esperado: `2 pass, 0 fail`

### Checklist

- [ ] `bun run typecheck` limpo após mudança
- [ ] `inspectToolRegistry(process.cwd())` em projeto real retorna `subagents[*].allowed_tools` populado para os 13 agents reais (`agents/security-auditor.md`, `agents/plan-executor.md`, etc.) — verificar manualmente
- [ ] Rodar 2× a mesma `inspectToolRegistry()` em projeto com 1 agent legacy: warning aparece apenas na 1ª execução (cache funciona)
- [ ] `bun run harness:validate` não regride
- [ ] `bun run test` mantém 0 regressões em suites adjacentes (especialmente `agents:contract` em `package.json:16`)

---

## Criterio de Aceite

Mapeia para **CA-03** + **CA-04** do PRD v6.3.1.

**Por maquina:**
- `bun run test -- --test-name-pattern "dual-field parser"` → `2 pass, 0 fail`
- Smoke manual: `bun -e "import('./skills/lib/tool-registry-inspector.ts').then(m => m.inspectToolRegistry(process.cwd())).then(s => console.log(s.subagents.find(a => a.name === 'security-auditor')))"` → output mostra `allowed_tools: ['Read', 'Grep', 'Glob']` (não `[]`)
- Stderr captura exatamente 1 linha `[deprecation]` por agent legacy distinto

**Por humano:**
- N/A (sem UI).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
