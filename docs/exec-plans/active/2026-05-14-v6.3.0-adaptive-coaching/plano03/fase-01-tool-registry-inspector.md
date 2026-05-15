<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): inspector lê só manifest + agents/ — alinhado com PRD §Risco "scope creep"`
-->

# Fase 01: tool-registry-inspector — Enumera MCPs / builtin tools / subagentes

**Plano:** 03 — /parity-audit + tool-registry-inspector ([README](./README.md))
**Sizing:** ~1.5h
**Depende de:** Nenhuma (primeira fase do plano — TRACER BULLET)
**Visual:** false

---

## O que esta fase entrega

`skills/lib/tool-registry-inspector.ts` exportando `inspectToolRegistry(projectRoot)` — função única que lê `.anti-vibe-manifest.json` + frontmatter de `agents/*.md` e devolve `{ mcps, builtin_tools, subagents, generated_at, source }` sem nenhuma introspecção runtime de MCPs. É a tracer bullet do Plano 03: fase-02 (`/parity-audit`) e fase-03 (qa-visual pre-check) consomem o output dessa função.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/lib/tool-registry-inspector.ts` | Create | Tipos `MCPDescriptor`/`BuiltinToolDescriptor`/`SubagentDescriptor`/`ToolRegistrySnapshot` + função `inspectToolRegistry(projectRoot)` |
| `skills/lib/__tests__/tool-registry-inspector.test.ts` | Create | 4 testes unitários (manifest vazio, manifest com MCPs, agents/ ausente, agents/ com 2 subagentes válidos) |

---

## Pre-trabalho

Antes de escrever qualquer linha de código:

1. **Localizar o shape real do manifest:** rodar `Glob` por `**/.anti-vibe-manifest.json` (incluindo fixtures de Plano 01 e mocks de migration mode em `skills/init/`). Confirmar quais campos existem: `mcps`, `tools`, `builtin_tools`, `subagents` (ou variação). Se o shape divergir do esperado, registrar em MEMORY.md (`DI-N`) antes de codar.
2. **Verificar existência da pasta `agents/`:** rodar `Glob` por `agents/*.md` no projeto-alvo de teste (o próprio plugin Anti-Vibe-Coding) para entender se já há subagentes definidos. Se não houver, fase-01 ainda funciona (`source: 'partial'`).
3. **Confirmar deps disponíveis:** `package.json` já tem `gray-matter` (parse de frontmatter). Sem necessidade de novas deps. Sem AST library.
4. **Localizar `read-architecture-profile.ts` para padrão de path resolution:** o helper existente em `skills/lib/` faz busca ascendente até encontrar `.anti-vibe-manifest.json`. Reusar o mesmo idiom (não importar — apenas espelhar o padrão, já que esta lib é independente do profile).

---

## Implementacao

### Passo 1: Tipos exportados

```typescript
// 2026-05-14 (Luiz/dev): shape composto desde já — PRD §Decisão #2 (composabilidade futura)
export type MCPDescriptor = {
  name: string         // ex: 'plugin_playwright_playwright'
  tools: string[]      // ex: ['browser_click', 'browser_navigate']
}

export type BuiltinToolDescriptor = {
  name: string         // ex: 'Read', 'Glob', 'Grep'
}

export type SubagentDescriptor = {
  name: string         // ex: 'verify-work-auditor'
  description: string  // 1ª linha da description do frontmatter
  allowed_tools: string[]
}

export type ToolRegistrySnapshot = {
  mcps: MCPDescriptor[]
  builtin_tools: BuiltinToolDescriptor[]
  subagents: SubagentDescriptor[]
  generated_at: string                // ISO 8601
  source: 'manifest' | 'partial'      // 'partial' quando agents/ não existe ou manifest ausente
}
```

Notas:
- `language` e `framework` não entram nesta lib — são responsabilidade de `preface-context.ts` (Plano 01 fase-01).
- `source` é binário nesta fase. Versões futuras podem adicionar `'runtime'` se introspecção heavy for habilitada — fora do escopo (PLAN.md risco "scope creep").

### Passo 2: Leitura do manifest com graceful fail

```typescript
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

// 2026-05-14 (Luiz/dev): busca ascendente até root — espelha read-architecture-profile.ts
async function findManifestPath(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir)
  const root = path.parse(dir).root
  while (dir !== root) {
    const candidate = path.join(dir, '.anti-vibe-manifest.json')
    try {
      await readFile(candidate, 'utf-8')
      return candidate
    } catch {
      dir = path.dirname(dir)
    }
  }
  return null
}

type ManifestShape = {
  mcps?: Array<{ name: string; tools?: string[] }>
  builtin_tools?: string[]
}

async function readManifest(projectRoot: string): Promise<{
  mcps: MCPDescriptor[]
  builtin_tools: BuiltinToolDescriptor[]
  found: boolean
}> {
  const manifestPath = await findManifestPath(projectRoot)
  if (!manifestPath) {
    return { mcps: [], builtin_tools: [], found: false }
  }

  const raw = await readFile(manifestPath, 'utf-8').catch(() => null)
  if (!raw) return { mcps: [], builtin_tools: [], found: false }

  const parsed = JSON.parse(raw) as ManifestShape
  const mcps: MCPDescriptor[] = (parsed.mcps ?? []).map(m => ({
    name: m.name,
    tools: m.tools ?? [],
  }))
  const builtin_tools: BuiltinToolDescriptor[] = (parsed.builtin_tools ?? []).map(name => ({ name }))

  return { mcps, builtin_tools, found: true }
}
```

Notas:
- `JSON.parse` pode lançar se o manifest estiver corrompido — envelopar em try/catch no nível do `inspectToolRegistry` e retornar `found: false` (degrada para `source: 'partial'`).
- Nunca usar `process.cwd()` aqui — sempre `projectRoot` passado por parâmetro (testabilidade via `tmpdir`).

### Passo 3: Leitura de subagentes da pasta `agents/`

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
    const name = typeof data.name === 'string' ? data.name : entry.name.replace(/\.md$/, '')
    const description = typeof data.description === 'string' ? data.description.split('\n')[0] : ''
    const allowedRaw = typeof data['allowed-tools'] === 'string' ? data['allowed-tools'] : ''
    const allowed_tools = allowedRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    subagents.push({ name, description, allowed_tools })
  }

  return { subagents, found: true }
}
```

Notas:
- Campo de frontmatter é `allowed-tools` (com hífen) — não `allowed_tools`. CSV string → array via split-trim-filter.
- Se `data.name` ausente, usa filename como fallback (idêntico ao padrão do Claude Code para subagent registration).
- `description` pega só a 1ª linha (subagents costumam ter descriptions multi-linha; primeira linha é o resumo).

### Passo 4: Compor o snapshot

```typescript
export async function inspectToolRegistry(projectRoot: string): Promise<ToolRegistrySnapshot> {
  let manifestResult: { mcps: MCPDescriptor[]; builtin_tools: BuiltinToolDescriptor[]; found: boolean }
  try {
    manifestResult = await readManifest(projectRoot)
  } catch {
    // 2026-05-14 (Luiz/dev): JSON.parse ou IO error → degrada para partial — PLAN.md risco "scope creep"
    manifestResult = { mcps: [], builtin_tools: [], found: false }
  }

  const subagentsResult = await readSubagents(projectRoot)

  const source: 'manifest' | 'partial' =
    manifestResult.found && subagentsResult.found ? 'manifest' : 'partial'

  return {
    mcps: manifestResult.mcps,
    builtin_tools: manifestResult.builtin_tools,
    subagents: subagentsResult.subagents,
    generated_at: new Date().toISOString(),
    source,
  }
}
```

Notas:
- Nunca lança. Pior caso: retorna `{ mcps: [], builtin_tools: [], subagents: [], source: 'partial' }`.
- `source === 'partial'` quando QUALQUER um dos dois (manifest, agents/) falhar. Consumidores (fase-02 /parity-audit) decidem se mostram warning.
- Performance: 2 reads (manifest + readdir de agents/) + N reads de subagent files. Em projetos típicos (<20 subagentes), <50ms (CA não-funcional aproximado do PRD §RNF Performance).

---

## Gotchas

- **G2 do plano:** ler APENAS metadata. Não tentar `require()` de MCPs nem chamar tool registries — manifest é a fonte de verdade nesta versão.
- **G6 do plano:** `agents/` ausente é caso esperado (projetos sem subagentes definidos). Retornar `source: 'partial'`, nunca throw.
- **G8 do plano:** `allowed-tools` no frontmatter é CSV string com hífen no nome do campo — não `allowed_tools`. Split-trim-filter para virar array.
- **G9 do plano:** sem AST. Apenas `gray-matter` para frontmatter + `JSON.parse` para manifest.
- **Local — Windows paths:** `path.join` retorna separadores backslash em Windows. Para output `name` em descriptors, usar o nome do arquivo (não path completo) — sem conversão necessária.
- **Local — Determinismo do `generated_at`:** não testar valor exato; testar apenas que é uma string ISO 8601 válida (`!isNaN(Date.parse(snapshot.generated_at))`).

---

## Verificacao

### TDD

Comando para rodar: `bun test skills/lib/__tests__/tool-registry-inspector.test.ts`

### Setup do arquivo de teste

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { inspectToolRegistry } from '../tool-registry-inspector'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tri-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})
```

### Caso 1: "returns empty registry with source 'partial' when manifest missing"

Fixture: `tmpDir` vazio (sem manifest, sem `agents/`).

Assertions:
- `snapshot.mcps` === `[]`
- `snapshot.builtin_tools` === `[]`
- `snapshot.subagents` === `[]`
- `snapshot.source` === `'partial'`
- `!isNaN(Date.parse(snapshot.generated_at))`

### Caso 2: "reads MCPs and builtin tools from manifest"

Fixture: criar `.anti-vibe-manifest.json` em `tmpDir/` com:
```json
{
  "mcps": [{ "name": "plugin_playwright_playwright", "tools": ["browser_click", "browser_navigate"] }],
  "builtin_tools": ["Read", "Glob", "Grep"]
}
```
(sem `agents/`).

Assertions:
- `snapshot.mcps.length` === 1
- `snapshot.mcps[0].name` === `'plugin_playwright_playwright'`
- `snapshot.mcps[0].tools` deep equal `['browser_click', 'browser_navigate']`
- `snapshot.builtin_tools.map(t => t.name)` deep equal `['Read', 'Glob', 'Grep']`
- `snapshot.source` === `'partial'` (porque `agents/` não existe)

### Caso 3: "graceful fail when agents/ folder is missing"

Fixture: manifest válido (mesmo do Caso 2), sem `agents/`.

Assertions:
- `snapshot.subagents` === `[]`
- `snapshot.source` === `'partial'`
- Função não lança.

### Caso 4: "parses 2 subagents from agents/ folder with full manifest"

Fixture:
- `.anti-vibe-manifest.json` válido (mesmo do Caso 2).
- `agents/verify-work-auditor.md`:
  ```markdown
  ---
  name: verify-work-auditor
  description: Audits work for correctness and quality.
  allowed-tools: Read, Glob, Grep
  ---
  Body irrelevante.
  ```
- `agents/security-auditor.md`:
  ```markdown
  ---
  name: security-auditor
  description: Reviews code for OWASP Top 10.
  allowed-tools: Read, Grep
  ---
  Body.
  ```

Assertions:
- `snapshot.subagents.length` === 2
- `snapshot.subagents.find(s => s.name === 'verify-work-auditor').allowed_tools` deep equal `['Read', 'Glob', 'Grep']`
- `snapshot.subagents.find(s => s.name === 'security-auditor').allowed_tools` deep equal `['Read', 'Grep']`
- `snapshot.source` === `'manifest'` (ambos manifest + agents/ encontrados)

### Checklist

- [ ] Os 4 testes acima passam: `bun test skills/lib/__tests__/tool-registry-inspector.test.ts` → `4 pass, 0 fail`
- [ ] Sem imports de bibliotecas AST (apenas `gray-matter`, `node:fs/promises`, `node:path`)
- [ ] Função nunca lança em qualquer caminho (validado por Caso 1 + Caso 3)
- [ ] `source` é `'manifest'` somente quando ambos manifest E agents/ existem
- [ ] Typecheck limpo: `bun run typecheck` (se configurado)
- [ ] `bun run test` global: `0 failed`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/lib/__tests__/tool-registry-inspector.test.ts` retorna `4 pass, 0 fail`.
- `bun run test` (suite completa) continua verde.

**Por humano:**
- Leitura manual do código: zero `require()` ou import dinâmico de MCPs; zero recursão de filesystem além de `agents/*.md`.
- Smoke: `await inspectToolRegistry(process.cwd())` no plugin retorna em <50ms (PRD §RNF Performance — aproximado).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
