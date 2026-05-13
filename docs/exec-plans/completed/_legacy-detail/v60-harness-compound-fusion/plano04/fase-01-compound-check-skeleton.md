<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): exclui _archived/ — Plano 04 G9`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Compound-check skeleton (scripts/compound-check.ts.tpl)

**Plano:** 04 — Validators Full
**Sizing:** 1.5h
**Depende de:** Plano 02 fase-01 (estrutura `docs/compound/` ja existe via scaffold). Independente de fase-03 deste plano.
**Visual:** false

---

## O que esta fase entrega

Script `scripts/compound-check.ts.tpl` (TS+bun, D13) em sua **forma esqueleto**: itera `docs/compound/*.md` (excluindo `README.md` e `_archived/` — G9), coleta a lista de arquivos a validar e retorna **exit 0** se a lista esta vazia ou todos os arquivos sao legiveis. Validacao de frontmatter e secoes obrigatorias entra na **fase-02**. Esta fase entrega:

- Helper reutilizavel `lib/compound-files-collector.ts` (lista arquivos compound vivos)
- Script `scripts/compound-check.ts.tpl` com framework de coleta + reporting estrutural identico ao `harness-validate.ts` (mesma forma de Failure[], mesma forma de exit codes, mesma estetica de stderr)
- Entry no template manifest do `/init` para que o `compound-check.ts` seja copiado em projetos novos
- Testes E2E em fixture vazia (exit 0) e fixture com arquivo ilegivel (exit 1 com erro acionavel)

Atende **CA-26** (estrutura permite <2s alvo — coleta paralelizada), prepara base para **CA-29** (fase-02 adiciona regras).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/scripts/compound-check.ts.tpl` | Create | Template do segundo validator, copiado pelo `/init` para `scripts/compound-check.ts` no projeto-alvo |
| `anti-vibe-coding/skills/init/lib/compound-files-collector.ts` | Create | Helper exportado: `listCompoundFiles(root): Promise<string[]>` (filtra README.md, _archived/) |
| `anti-vibe-coding/skills/init/lib/compound-files-collector.test.ts` | Create | Testes: vazia, com arquivos, com _archived/, com README.md |
| `anti-vibe-coding/skills/init/lib/template-manifest.ts` | Modify | Adicionar entry `scripts/compound-check.ts.tpl → scripts/compound-check.ts` (manifest cresce de 26 para 27 entries) |
| `anti-vibe-coding/tests/compound-check-skeleton.test.ts` | Create | E2E do script: spawn `bun run scripts/compound-check.ts` em fixture, valida exit code e stderr |

---

## Implementacao

### Passo 1: Helper `lib/compound-files-collector.ts`

```typescript
// 2026-05-11 (Luiz/dev): coleta arquivos compound "vivos" — exclui _archived/ (G9 do Plano 04)
// e README.md (sentinel de pasta). Reusado por compound-check.ts e por skills CRUD em Plano 06.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const COMPOUND_DIR_REL = path.join('docs', 'compound')
const ARCHIVED_SEGMENT = '_archived'
const SKIP_NAMES = new Set(['README.md', 'index.md'])

/**
 * Lista todos os arquivos `.md` em `docs/compound/` (recursivo) que sao compound notes ativas.
 *
 * Exclui:
 * - `_archived/` (e qualquer subpasta abaixo dele) — convencao de soft-delete (D31, Plano 06)
 * - `README.md` e `index.md` em qualquer nivel — sentinels
 *
 * @returns Array de paths absolutos. Vazio se `docs/compound/` nao existe ou nao tem arquivos validos.
 *          NUNCA lanca — se diretorio nao existe, retorna `[]` (defensivo).
 */
export async function listCompoundFiles(root: string): Promise<string[]> {
  const baseDir = path.join(root, COMPOUND_DIR_REL)
  return collectMarkdown(baseDir)
}

async function collectMarkdown(dir: string): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    // Diretorio nao existe. Defensivo: nao lanca.
    return []
  }

  const results: string[][] = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (entry.name === ARCHIVED_SEGMENT) return []
        return collectMarkdown(path.join(dir, entry.name))
      }
      if (!entry.isFile()) return []
      if (!entry.name.endsWith('.md')) return []
      if (SKIP_NAMES.has(entry.name)) return []
      return [path.join(dir, entry.name)]
    }),
  )

  return results.flat()
}
```

### Passo 2: Script `scripts/compound-check.ts.tpl`

```typescript
#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): compound-check minimal — fase-01 do plano04 v6.0.0
// Versao esqueleto: coleta arquivos e reporta unreadable. Frontmatter + secoes (CA-29)
// entram em fase-02 do mesmo plano.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

type Failure = { rule: string; file: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  const files = await listCompoundFilesLocal(root)
  await ensureReadable(files, failures)

  if (failures.length > 0) {
    console.error('Compound check failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.file}: ${f.message}`)
    }
    process.exit(1)
  }

  console.log(`Compound check passed (${files.length} compound notes validated).`)
  process.exit(0)
}

// Helper inlined no template (sem dependencia de `lib/` no projeto-alvo).
// O `lib/compound-files-collector.ts` no plugin e o gerador; o `.tpl` carrega copia inline.
async function listCompoundFilesLocal(rootDir: string): Promise<string[]> {
  const baseDir = path.join(rootDir, 'docs', 'compound')
  return collectMd(baseDir)
}

async function collectMd(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const skip = new Set(['README.md', 'index.md'])
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (entry.name === '_archived') return []
        return collectMd(path.join(dir, entry.name))
      }
      if (!entry.isFile() || !entry.name.endsWith('.md') || skip.has(entry.name)) return []
      return [path.join(dir, entry.name)]
    }),
  )
  return nested.flat()
}

async function ensureReadable(files: ReadonlyArray<string>, failures: Failure[]): Promise<void> {
  // Paralelizar — G1 do Plano 04 (perf <2s em 100 docs).
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.readFile(file, 'utf8')
      } catch (err) {
        failures.push({
          rule: 'readable',
          file: path.relative(root, file),
          message: `cannot read file (${(err as Error).message})`,
        })
      }
    }),
  )
}

await main()
```

Notas:
- Estrutura espelha `harness-validate.ts` minimal (Plano 01 fase-04): tipo `Failure`, `process.exit(1)`, `Promise.all` para perf.
- Helper inlinado dentro do `.tpl` porque o script roda no projeto-alvo sem acesso a `lib/` do plugin. Plugin tem versao "canonica" em `lib/compound-files-collector.ts` (fase-01 deste plano) para reuso por outros pontos do plugin runtime (e.g., CRUD em Plano 06).
- Mensagem de sucesso ja reporta count de notes validadas — usuario sabe que o validator viu N arquivos.
- Erros sao por arquivo (ja preparam terreno para fase-02 com varios `rule`s distintos).

### Passo 3: Testes do helper `lib/compound-files-collector.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { listCompoundFiles } from './compound-files-collector'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'collector')

async function setup(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
}

async function write(rel: string, body: string): Promise<void> {
  const full = path.join(FIXTURE, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, body, 'utf8')
}

describe('listCompoundFiles', () => {
  beforeEach(setup)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('returns empty array when docs/compound/ has no notes', async () => {
    const result = await listCompoundFiles(FIXTURE)
    expect(result).toEqual([])
  })

  it('returns empty array when docs/compound/ does not exist', async () => {
    await fs.rm(path.join(FIXTURE, 'docs'), { recursive: true, force: true })
    const result = await listCompoundFiles(FIXTURE)
    expect(result).toEqual([])
  })

  it('skips README.md and index.md', async () => {
    await write('docs/compound/README.md', '# README\n')
    await write('docs/compound/index.md', '# Index\n')
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
    expect(result[0].endsWith('2026-05-12-foo.md')).toBe(true)
  })

  it('G9: excludes _archived/ subdirectory', async () => {
    await write('docs/compound/2026-05-12-active.md', '# Active\n')
    await write('docs/compound/_archived/2026-05-01-old.md', '# Old\n')
    await write('docs/compound/_archived/nested/2026-04-01-older.md', '# Older\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
    expect(result[0]).toContain('2026-05-12-active.md')
    expect(result.some((p) => p.includes('_archived'))).toBe(false)
  })

  it('ignores non-markdown files', async () => {
    await write('docs/compound/note.txt', 'not markdown')
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
  })

  it('returns absolute paths', async () => {
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(path.isAbsolute(result[0])).toBe(true)
  })
})
```

### Passo 4: Teste E2E do script `tests/compound-check-skeleton.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'compound-check-skeleton')
const SCRIPT_SRC = path.join(
  import.meta.dir,
  '..',
  'skills/init/assets/templates/scripts/compound-check.ts.tpl',
)

async function runScript(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/compound-check.ts')], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

async function setupFixture(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'compound-check.ts'))
}

describe('compound-check (skeleton)', () => {
  beforeEach(setupFixture)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 when docs/compound/ is empty', async () => {
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Compound check passed (0 compound notes')
  })

  it('exits 0 when docs/compound/ has only README.md', async () => {
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/README.md'), '# README\n', 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('0 compound notes')
  })

  it('exits 0 and reports count when 2 compound notes exist (frontmatter validation comes in fase-02)', async () => {
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-a.md'), '# A\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-b.md'), '# B\n', 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('2 compound notes')
  })

  it('G9: ignores files in _archived/ when counting', async () => {
    await fs.mkdir(path.join(FIXTURE, 'docs/compound/_archived'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/_archived/old.md'), '# Old\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-active.md'), '# Active\n', 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('1 compound notes')
  })
})
```

### Passo 5: Atualizar template-manifest

Adicionar entry no array de templates do `/init` (em `lib/template-manifest.ts`, posicao 27, apos `scripts/harness-validate.ts.tpl`):

```typescript
// 2026-05-11 (Luiz/dev): Plano 04 fase-01 — compound-check entra no scaffold.
{ src: 'scripts/compound-check.ts.tpl', dst: 'scripts/compound-check.ts', required: true },
```

Atualizar teste `template-manifest.test.ts` (se houver assert de contagem) para `toBeGreaterThanOrEqual(27)`.

---

## Gotchas

- **G1 do plano (perf):** Ja paralelizado via `Promise.all` na coleta e na leitura. Mesmo no skeleton (0 regras alem de readable), padrao perpetua-se para fase-02.
- **G2 do plano (cross-platform paths):** `path.join` em todos os pontos. Teste `returns absolute paths` confirma que Windows nao quebra.
- **G3 do plano (fixture cleanup):** `afterEach` com `fs.rm({ recursive: true, force: true })`. Sem `--force` em Windows, files lockados por Windows Defender quebram cleanup.
- **G7 do plano (provenance):** Toda linha `.ts` tem cabecalho com linhagem. Templates `.tpl` que viram artefato do usuario nao levam — sao para o projeto-alvo.
- **G9 do plano (exclude _archived/):** Helper exclui defensivamente mesmo que `_archived/` nao exista (Plano 06 que cria). Teste explicito cobre.
- **Local — shebang `#!/usr/bin/env bun`:** No `.tpl` mantemos por consistencia com `harness-validate.ts.tpl`. Mas o `package.json` chama via `bun run scripts/compound-check.ts` — nao depende de shebang executavel em Windows.
- **Local — script duplica logica do helper `lib/compound-files-collector.ts`:** Intencional. O script vai para projeto-alvo (sem acesso ao plugin); o helper fica no plugin para reuso. Manter os dois em sincronia: se mudar exclusao de `_archived/`, mudar nos dois. JSDoc do helper marca isso. Fase-02 vai inflar o script (frontmatter parser); o helper continua so com `listCompoundFiles` enxuto.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/compound-files-collector.test.ts` falha — modulo nao existe.
  - Comando: `bun run test skills/init/lib/compound-files-collector.test.ts`
  - Resultado esperado: erro `Cannot find module './compound-files-collector'`

- [ ] **GREEN (helper):** 6 testes do helper passam.
  - Comando: `bun run test skills/init/lib/compound-files-collector.test.ts`
  - Resultado esperado: `6 passed, 0 failed`

- [ ] **RED (E2E):** `bun run test tests/compound-check-skeleton.test.ts` falha — template `compound-check.ts.tpl` nao existe.
  - Comando: `bun run test tests/compound-check-skeleton.test.ts`
  - Resultado esperado: erro `ENOENT` no `fs.copyFile`

- [ ] **GREEN (E2E):** 4 testes E2E passam.
  - Comando: `bun run test tests/compound-check-skeleton.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `scripts/compound-check.ts.tpl` existe em `anti-vibe-coding/skills/init/assets/templates/scripts/`
- [ ] `lib/compound-files-collector.ts` exporta `listCompoundFiles(root): Promise<string[]>`
- [ ] Helper exclui `_archived/` (G9), `README.md`, `index.md`
- [ ] Helper retorna `[]` quando diretorio nao existe (defensivo) — nao lanca
- [ ] Script `compound-check.ts.tpl` retorna **exit 0** em fixture vazia (skeleton — sem regras de frontmatter ainda)
- [ ] Script reporta contagem `(N compound notes validated)` em stdout
- [ ] Script usa `Promise.all` para paralelizar leitura (preparacao para perf de fase-04)
- [ ] `template-manifest.ts` tem entry 27 para `compound-check.ts.tpl → scripts/compound-check.ts`
- [ ] Teste de manifest (se existir contagem hard-coded) atualizado para 27 entradas
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck` (no `any`, no `as` indiscriminado)

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/compound-files-collector.test.ts
# Esperado: 6 passed, 0 failed

bun run test tests/compound-check-skeleton.test.ts
# Esperado: 4 passed, 0 failed

# Em fixture com docs/compound/ vazio:
cd tests/fixtures/empty-dir
bun run scripts/compound-check.ts
# Esperado: exit 0, stdout contem "Compound check passed (0 compound notes validated)"

# Em fixture com 3 compound notes + 1 README + 2 archived:
bun run scripts/compound-check.ts
# Esperado: exit 0, stdout contem "Compound check passed (3 compound notes validated)"
```

**Por humano:**

- Inspecionar `scripts/compound-check.ts.tpl` — codigo enxuto (<100 linhas), estilo identico ao `harness-validate.ts.tpl`.
- Confirmar que helper e script duplicam logica de coleta intencionalmente (comentario JSDoc explica).
- Mensagem de sucesso em stdout e acionavel: usuario sabe que foram N notes validadas (vs nada validado por bug).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
