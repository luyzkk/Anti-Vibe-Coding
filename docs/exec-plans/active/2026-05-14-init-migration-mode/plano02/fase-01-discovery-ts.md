# Fase 01: discovery.ts — Walk + Inventory + Secret Exclusion

**Plano:** 02 — Discovery TS: Fase 0 + Audit Log
**Sizing:** 1.5h
**Depende de:** Plano 01 completo (migration-mode-detector.ts pronto; runDiscovery só chamado quando mode === 'migration')
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/discovery.ts` com função `runDiscovery(targetDir, opts?)` que percorre o
sistema de arquivos do projeto-alvo segundo o escopo definido em DT-04 e produz
`discovery/inventory.json`. Puramente determinístico — sem LLM, sem efeitos de rede.
Exclui paths sensíveis (secrets) antes de qualquer leitura.

Contrato de saída: `inventory.json` é a matéria-prima que o Explorer subagent (Plano 03) consome.
O agente principal **jamais recebe conteúdo cru de arquivos** — só esta struct (CA-05).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/discovery.ts` | Criar | Walker + extrator de metadata + writer de inventory.json |
| `skills/init/lib/discovery.test.ts` | Criar | Stub inicial RED (importa runDiscovery antes de existir) |

---

## Implementacao

### Passo 1: Escrever teste stub RED antes de criar o módulo

Criar `skills/init/lib/discovery.test.ts` com apenas a importação e uma assertion trivial
para confirmar RED (ModuleNotFoundError):

```typescript
import { describe, it, expect } from 'bun:test'
import { runDiscovery } from './discovery'

describe('runDiscovery', () => {
  it('module exists and exports runDiscovery', () => {
    expect(typeof runDiscovery).toBe('function')
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'runDiscovery'`

O arquivo de teste será expandido na fase-02. Aqui só garantimos que RED está correto
por motivo certo (módulo não existe), não por compilação quebrada.

### Passo 2: Tipos e contratos

```typescript
// discovery.ts

/**
 * Um arquivo descoberto no walk. Contém apenas metadata — nunca o conteúdo completo.
 * CA-05: agente principal recebe esta struct, jamais o arquivo cru.
 */
export type InventoryEntry = {
  /** Caminho relativo ao targetDir, separador POSIX. */
  path: string
  size_bytes: number
  size_lines: number
  /** ISO 8601 — mtime do arquivo. */
  mtime: string
  /** Headings H1 e H2 extraídos (ATX apenas: `# Title`, `## Section`). */
  h1_h2_headings: string[]
  /** Primeiros 500 chars do conteúdo (string slice — seguro para Unicode PT-BR). */
  first_500_chars: string
}

export type InventoryResult = {
  /** UUID único por execução — correlaciona inventory com agents-log. */
  run_id: string
  /** ISO 8601 — momento da varredura. */
  scanned_at: string
  /** Caminho absoluto do projeto varrido. */
  target_dir: string
  /** Arquivos coletados (filtrados por escopo DT-04 e exclusão de secrets CA-12). */
  entries: InventoryEntry[]
  /**
   * Paths relativos excluídos por matching de secret patterns.
   * Para auditoria — operador pode verificar que .env foi excluído intencionalmente.
   */
  excluded_paths: string[]
  /** Duração da varredura em ms. */
  duration_ms: number
}

export type DiscoveryOptions = {
  /**
   * Padrões glob extras de exclusão além dos defaults.
   * Útil em testes para excluir caminhos específicos do fixture.
   */
  extraExcludeGlobs?: string[]
}
```

### Passo 3: Constantes de escopo e exclusão

```typescript
/**
 * DT-04: escopo do walk.
 * Cada entrada define [subdir, recursive, extensão].
 * 'root-md' = arquivos .md diretamente na raiz (não recursivo).
 */
const WALK_SCOPES = [
  { base: 'docs',     recursive: true  },
  { base: '',         recursive: false }, // root-md: *.md na raiz apenas
  { base: '.claude',  recursive: true  },
  { base: 'scripts',  recursive: true  },
  { base: '.github',  recursive: true  },
] as const

/**
 * CA-12 + RNF Segurança: padrões de arquivo/diretório excluídos da varredura.
 * Verificados contra o path relativo (POSIX).
 */
const SECRET_FILE_PATTERNS = [
  /\.env(\.|$)/,      // .env, .env.local, .env.production
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /\.crt$/,
  /\.cer$/,
]

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  'out',
])
```

### Passo 4: Helpers internos

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

async function existsDir(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p)
    return s.isDirectory()
  } catch {
    return false
  }
}

function isSecretFile(relPath: string): boolean {
  const basename = path.posix.basename(relPath)
  return SECRET_FILE_PATTERNS.some((re) => re.test(basename))
}

/** Extrai headings H1 e H2 (ATX format). Não usa parser — regex simples é suficiente. */
function extractH1H2(content: string): string[] {
  const headings: string[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^#{1,2}\s+(.+)/)
    if (m) headings.push(m[1].trim())
  }
  return headings
}

async function buildEntry(absPath: string, relPath: string): Promise<InventoryEntry> {
  const content = await fs.readFile(absPath, 'utf-8')
  const stat = await fs.stat(absPath)
  return {
    path: relPath.replace(/\\/g, '/'),    // normalizar para POSIX
    size_bytes: Buffer.byteLength(content, 'utf-8'),
    size_lines: content.split('\n').length,
    mtime: stat.mtime.toISOString(),      // G5: ISO string, não epoch
    h1_h2_headings: extractH1H2(content), // G1: ATX only
    first_500_chars: content.slice(0, 500), // G2: string slice, seguro para Unicode
  }
}
```

### Passo 5: Walker por escopo

```typescript
async function walkScope(
  targetDir: string,
  base: string,
  recursive: boolean,
  excludedPaths: string[],
): Promise<InventoryEntry[]> {
  const absBase = base ? path.join(targetDir, base) : targetDir
  if (!(await existsDir(absBase))) return []

  const entries: InventoryEntry[] = []

  async function walk(dir: string): Promise<void> {
    let dirEntries: string[]
    try {
      dirEntries = await fs.readdir(dir)
    } catch {
      return
    }
    for (const name of dirEntries) {
      const abs = path.join(dir, name)
      const rel = path.relative(targetDir, abs).replace(/\\/g, '/')

      // Excluir diretórios bloqueados
      const topDir = rel.split('/')[0]
      if (EXCLUDED_DIRS.has(topDir)) continue

      let stat: import('node:fs').Stats
      try {
        stat = await fs.stat(abs)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        if (recursive) await walk(abs)
        continue
      }

      if (!name.endsWith('.md')) continue
      if (isSecretFile(rel)) {
        excludedPaths.push(rel)
        continue
      }

      entries.push(await buildEntry(abs, rel))
    }
  }

  await walk(absBase)
  return entries
}
```

### Passo 6: Função principal

```typescript
/**
 * Fase 0 do pipeline de migration mode: varredura mecânica do projeto.
 * Produz `discovery/inventory.json` com metadata de todos os .md no escopo DT-04.
 * Nenhum LLM envolvido.
 *
 * @param targetDir Raiz do projeto a varrer (absoluto).
 * @param opts Opções opcionais (extra excludes para testes).
 * @returns InventoryResult escrito em disco + retornado para caller.
 *
 * @example
 * const result = await runDiscovery('/path/to/project')
 * console.log(`${result.entries.length} arquivos coletados`)
 */
export async function runDiscovery(
  targetDir: string,
  opts: DiscoveryOptions = {},
): Promise<InventoryResult> {
  const start = Date.now()
  const run_id = randomUUID()
  const excludedPaths: string[] = []
  const allEntries: InventoryEntry[] = []

  for (const scope of WALK_SCOPES) {
    const entries = await walkScope(targetDir, scope.base, scope.recursive, excludedPaths)
    allEntries.push(...entries)
  }

  // Deduplicar por path (root-md e docs/ podem sobrepor se docs/ estiver na raiz)
  const seen = new Set<string>()
  const unique = allEntries.filter((e) => {
    if (seen.has(e.path)) return false
    seen.add(e.path)
    return true
  })

  const result: InventoryResult = {
    run_id,
    scanned_at: new Date().toISOString(),
    target_dir: targetDir,
    entries: unique,
    excluded_paths: excludedPaths,
    duration_ms: Date.now() - start,
  }

  // Escrever inventory.json — G3: criar discovery/ se não existir
  const discoveryDir = path.join(targetDir, 'discovery')
  await fs.mkdir(discoveryDir, { recursive: true })
  await fs.writeFile(
    path.join(discoveryDir, 'inventory.json'),
    JSON.stringify(result, null, 2),
    'utf-8',
  )

  return result
}
```

---

## Gotchas

**G1 (reforço) — ATX headings only:** O método `extractH1H2` usa regex `^#{1,2}\s+(.+)` em cada linha.
Não usar `remarkjs` ou similar — não há dependência de parser markdown nesta lib. Simples e suficiente.

**G2 (reforço) — Unicode slice:** `content.slice(0, 500)` corta em boundary de caractere JS (UTF-16 code unit).
Para o caso de uso (primeiros 500 chars de documentação em PT-BR/EN), não há risco de cortar surrogate pair.

**G3 (reforço) — `discovery/` mkdir:** `fs.mkdir({ recursive: true })` é idempotente — não falha se o dir já existe.
Seguro para re-run (DT-02: full re-run regenera discovery/*).

**G4 — Walk root-md não é recursivo:** O scope `{ base: '', recursive: false }` coleta apenas `*.md` diretamente
na raiz do projeto (ex: `README.md`, `CONTRIBUTING.md`). Não entra em subdiretórios. Isso é intencional — docs
em subdiretórios são cobertos pelos scopes específicos (`docs/**`, `.claude/**`, etc.).

**G5 (reforço) — `mtime.toISOString()`:** `stat.mtime` é um `Date`. `.toISOString()` produz string ISO 8601 padronizada.
Não usar `.getTime()` (número epoch) — o Reconciler do Plano 03 espera string para comparação de recência.

---

## Verificacao

### TDD
- [ ] RED: `discovery.ts` não existe, teste falha com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'runDiscovery'`
- [ ] GREEN: módulo criado, stub test passa
  - Comando: `bun run test -- --grep 'runDiscovery'`

### Checklist
- [ ] `runDiscovery` exportado de `skills/init/lib/discovery.ts`
- [ ] Walk cobre: `docs/**`, `*.md` raiz (não-recursivo), `.claude/**`, `scripts/**`, `.github/**`
- [ ] Arquivos `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt`, `*.cer` excluídos e em `excluded_paths`
- [ ] Diretórios `node_modules/`, `.git/`, `dist/`, `build/` ignorados durante walk
- [ ] `InventoryEntry.mtime` é ISO string
- [ ] `InventoryEntry.first_500_chars` usa `string.slice(0, 500)` (não Buffer)
- [ ] `h1_h2_headings` contém apenas ATX H1/H2 (regex `^#{1,2}\s+`)
- [ ] `discovery/inventory.json` criado em `targetDir/discovery/`
- [ ] `run_id` presente e único por chamada (UUID)
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'runDiscovery'` retorna ≥1 teste PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- Arquivo `discovery/inventory.json` contém campos: `run_id`, `scanned_at`, `target_dir`, `entries`, `excluded_paths`, `duration_ms`

<!-- Gerado por /plan-feature em 2026-05-14 -->
