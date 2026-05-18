<!--
Princípio universal #5 — Comment Provenance. Aplicar em comentarios de codigo
de runtime usuario-facing. Helpers TS internos seguem JSDoc; sem repeticao.
-->

# Fase 02: Step 06 — `secrets-scan` (integracao registry + discovery-store)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 0.5h
**Depende de:** fase-01 (consome `scanSecrets` + tipo `SecretMatch`)
**Visual:** false

---

## O que esta fase entrega

Step `secretsScanStep` (id `06-secrets-scan`) que varre arquivos `.md`/`.mdx` do `cwd` + `cwd/docs/` + `cwd/.claude/` aplicando `scanSecrets` da fase-01, persiste resultado em `.anti-vibe/discovery/secrets-scan-result.json` via novo helper `lib/discovery-store.ts` e retorna `mutated: false` + `summary` resumindo matches. Step entra no registry APOS `reuseDiscoveryStep` e ANTES de `migrate0ParseDryRunStep`. Atende SH-01 + CA-04 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/discovery-store.ts` | Create | Helper read/write parametrizavel para `.anti-vibe/discovery/*.json`. Exporta `readDiscoveryArtifact`, `writeDiscoveryArtifact`, `discoveryArtifactPath`. Aceita `noWrite: true` (wiring em Plano 05 fase-01). |
| `skills/init/lib/discovery-store.test.ts` | Create | Testes pareados do helper (write+read roundtrip, `noWrite` no-op, path canonico Windows-safe). |
| `skills/init/lib/steps/06-secrets-scan.ts` | Create | Implementa `secretsScanStep: Step` consumindo `scanSecrets` + `discovery-store`. Glob inline simples filtrando blacklist. |
| `skills/init/lib/steps/06-secrets-scan.test.ts` | Create | 3 testes: (1) scan vazio (zero matches), (2) scan com matches em arquivo X bloqueia X, prossegue, (3) integracao registry asserta posicao. |
| `skills/init/lib/registry.ts` | Modify | Adicionar `secretsScanStep` apos `reuseDiscoveryStep` e antes de `migrate0ParseDryRunStep`. |
| `skills/init/lib/registry.test.ts` | Modify | Adicionar assert: registry contem id `06-secrets-scan` em posicao 2 (apos `detectLegacyStep` indice 0, `reuseDiscoveryStep` indice 1). |

---

## Implementacao

### Passo 1: `lib/discovery-store.ts` (helper compartilhado)

Helper isolado em lib propria — Plano 03 fase-04 e fase-06 reusam para `discovered-docs.json` e `classification-result.json`. Plano 05 fase-01 ativa `noWrite: true` em modo `--dry-run`.

```typescript
// skills/init/lib/discovery-store.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type DiscoveryArtifactName =
  | 'secrets-scan-result'
  | 'discovered-docs'
  | 'classification-result'

export type DiscoveryWriteOptions = {
  /** Quando true, o helper retorna sem escrever em disco. Wiring de --dry-run (Plano 05 fase-01). */
  readonly noWrite?: boolean
}

export function discoveryArtifactPath(cwd: string, name: DiscoveryArtifactName): string {
  return path.join(cwd, '.anti-vibe', 'discovery', `${name}.json`)
}

export async function writeDiscoveryArtifact<T>(
  cwd: string,
  name: DiscoveryArtifactName,
  data: T,
  opts: DiscoveryWriteOptions = {},
): Promise<void> {
  if (opts.noWrite === true) return
  const filePath = discoveryArtifactPath(cwd, name)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readDiscoveryArtifact<T>(
  cwd: string,
  name: DiscoveryArtifactName,
): Promise<T | null> {
  const filePath = discoveryArtifactPath(cwd, name)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}
```

> **Por que helper proprio (e nao reuso de `backup-anti-vibe.ts`):** o backup helper do Plano 01 cuida de `manifest.json` + arquivos espelhados — semantica destrutiva. Discovery store guarda apenas JSONs estruturados de leitura. Manter responsabilidades separadas evita acoplar discovery a operacoes destrutivas.

### Passo 2: Tipos do resultado persistido

```typescript
// skills/init/lib/steps/06-secrets-scan.ts
import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { Step, StepContext, StepReport } from './types'
import { scanSecrets, type SecretMatch } from '../secrets-scanner'
import { writeDiscoveryArtifact } from '../discovery-store'

export type SecretsScanFileEntry = {
  readonly relativePath: string
  readonly matches: readonly SecretMatch[]
}

export type SecretsScanResult = {
  readonly subagent_id: 'init-secrets-scan'
  readonly scannedCount: number
  readonly blockedFiles: readonly SecretsScanFileEntry[]
  readonly durationMs: number
}
```

> **`subagent_id` literal:** fixado aqui ja como narrowed string. Quando Plano 06 fase-01 padronizar o audit log, o type checker garante consistencia.

### Passo 3: Glob inline simples (sem dependencia da fase-03)

Step 06 roda ANTES do Step 07 (discover-existing-docs). Por isso usa glob inline minimo — apenas `cwd` + `cwd/docs` + `cwd/.claude`, sem reuso do `discoverExistingDocs` da fase-03. Isso eh deliberado: secrets-scan precisa rodar primeiro mesmo se `discover-existing-docs` falhar.

```typescript
async function listCandidateFiles(cwd: string): Promise<readonly string[]> {
  const roots: ReadonlyArray<{ dir: string; recursive: boolean }> = [
    { dir: cwd, recursive: false },                       // raiz: nivel 0 apenas
    { dir: path.join(cwd, 'docs'), recursive: true },
    { dir: path.join(cwd, '.claude'), recursive: true },
  ]
  const out: string[] = []
  for (const { dir, recursive } of roots) {
    try {
      await walkDir(dir, recursive, out, cwd)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  return out
}

async function walkDir(
  dir: string,
  recursive: boolean,
  acc: string[],
  cwd: string,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(cwd, full).split(path.sep).join('/')
    if (containsBlacklisted(rel)) continue
    if (entry.isDirectory()) {
      if (recursive) await walkDir(full, true, acc, cwd)
      continue
    }
    if (entry.isFile() && hasMarkdownExtension(entry.name)) {
      acc.push(full)
    }
  }
}

function containsBlacklisted(relPath: string): boolean {
  const tokens = ['node_modules', 'dist', 'build', '.git', '.anti-vibe/backup']
  return tokens.some((t) => relPath.includes(t))
}

function hasMarkdownExtension(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx')
}
```

### Passo 4: Implementar `secretsScanStep`

```typescript
export const secretsScanStep: Step = {
  id: '06-secrets-scan',

  async run(ctx: StepContext): Promise<StepReport> {
    const startedAt = Date.now()
    const files = await listCandidateFiles(ctx.cwd)
    const blocked: SecretsScanFileEntry[] = []

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8')
      const matches = scanSecrets(content)
      if (matches.length > 0) {
        const rel = path.relative(ctx.cwd, filePath).split(path.sep).join('/')
        blocked.push({ relativePath: rel, matches })
      }
    }

    const result: SecretsScanResult = {
      subagent_id: 'init-secrets-scan',
      scannedCount: files.length,
      blockedFiles: blocked,
      durationMs: Date.now() - startedAt,
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'secrets-scan-result', result, { noWrite })

    return {
      mutated: false,
      summary: `secrets-scan [init-secrets-scan]: ${result.scannedCount} arquivos varridos, ${blocked.length} arquivos com match`,
    }
  },
}
```

> **`mutated: false`:** writing em `.anti-vibe/discovery/` eh metadata de discovery, NAO mutacao de harness/usuario. O contrato `mutated` reflete impacto em arquivos do projeto-alvo (Plano 04 fase-03 explica em detalhe).

### Passo 5: Integrar no registry

```typescript
// skills/init/lib/registry.ts (diff)
+ import { secretsScanStep } from './steps/06-secrets-scan'

export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
+ secretsScanStep,              // 2026-05-18 (Luiz/dev): Plano 03 fase-02 — varre secrets ANTES de qualquer move (D16, SH-01, CA-04).
  // Plano 03 fase-04 inserira discoverExistingDocsStep aqui.
  // Plano 03 fase-06 inserira classifyBlocksHybridStep aqui.
  migrate0ParseDryRunStep,
  ...
]
```

### Passo 6: Testes pareados

```typescript
// skills/init/lib/steps/06-secrets-scan.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { secretsScanStep } from './06-secrets-scan'
import { readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-secrets-scan-'))
}

describe('secretsScanStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel', () => {
    expect(secretsScanStep.id).toBe('06-secrets-scan')
  })

  test('scan vazio (sem .md/.mdx) retorna scannedCount=0 sem blocked', async () => {
    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 arquivos varridos')
    const persisted = await readDiscoveryArtifact<{ blockedFiles: unknown[] }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(0)
  })

  test('match em arquivo X eh registrado em blockedFiles; outros arquivos limpos passam', async () => {
    await fs.mkdir(path.join(tmp, 'docs'), { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'STRIPE.md'), 'STRIPE=sk_live_1234567890ABCDEFGHIJKLMN')
    await fs.writeFile(path.join(tmp, 'docs', 'CLEAN.md'), '# arquivo limpo')

    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('2 arquivos varridos')
    expect(report.summary).toContain('1 arquivos com match')

    const persisted = await readDiscoveryArtifact<{
      blockedFiles: ReadonlyArray<{ relativePath: string }>
    }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(1)
    expect(persisted?.blockedFiles[0]?.relativePath).toBe('docs/STRIPE.md')
  })

  test('blacklist node_modules eh ignorada', async () => {
    await fs.mkdir(path.join(tmp, 'node_modules', 'foo'), { recursive: true })
    await fs.writeFile(path.join(tmp, 'node_modules', 'foo', 'README.md'), 'AKIAIOSFODNN7EXAMPLE')
    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 arquivos varridos')
  })

  test('registry: secretsScanStep apos reuseDiscoveryStep, antes de migrate0ParseDryRunStep', () => {
    const ids = registry.map((s) => s.id)
    const idxSecrets = ids.indexOf('06-secrets-scan')
    const idxReuse = ids.indexOf('00_1-reuse-discovery') // ajustar para o id real do reuseDiscoveryStep
    const idxMigrate0 = ids.indexOf('09-migrate-0-parse-dry-run') // ajustar conforme id real
    expect(idxSecrets).toBeGreaterThan(idxReuse)
    expect(idxSecrets).toBeLessThan(idxMigrate0)
  })

  test('flag --dry-run leva noWrite (arquivo nao eh criado)', async () => {
    await fs.mkdir(path.join(tmp, 'docs'), { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'X.md'), '# clean')
    const report = await secretsScanStep.run({ cwd: tmp, args: ['--dry-run'], flags: { 'dry-run': true } })
    expect(report.mutated).toBe(false)
    const persisted = await readDiscoveryArtifact(tmp, 'secrets-scan-result')
    expect(persisted).toBeNull()
  })
})
```

> **Atencao IDs reais no registry:** os ids exatos dos steps existentes (`reuseDiscoveryStep`, `migrate0ParseDryRunStep`) devem ser conferidos no momento do test (o subagente que executar a fase fara `grep -n 'id:' skills/init/lib/steps/00_1-reuse-discovery.ts` para confirmar). Se o id real difere, ajustar o teste — o contrato eh **posicao relativa**, nao string literal.

---

## Gotchas

- **G3 do plano (ordem no registry):** Step 06 ANTES de qualquer mutacao destrutiva. Test #5 desta fase + tests pareados das fases 04/06 verificam invariante. Plano 04 fase-06 reorder (Step 10 antes Step 02) acontece DEPOIS no registry — nao colide.
- **G8 do plano (`--dry-run` global):** Esta fase ja respeita `ctx.flags['dry-run']` para `noWrite`. Plano 05 fase-01 fara o wiring completo (parsing de args + propagacao de flag para todos os steps). Aqui apenas usamos a flag se estiver presente — defensivo.
- **G9 do plano (audit log):** `summary` carrega `[init-secrets-scan]` literal. Plano 06 fase-01 troca a string em log por uma chamada ao `AuditLogWriter.append({ subagent_id: 'init-secrets-scan', ... })`. Stub local agora: `summary` contem o literal.
- **Local (walkDir manual vs glob):** Optei por walker manual em vez de `Bun.Glob` para nao acoplar com runtime especifico — Plano 03 fase-03 fara escolha similar e os dois walkers compartilham filosofia (blacklist por substring de path posix-normalizado). Plano 07 fase-05 (performance) avalia se vale migrar para `Bun.Glob`.
- **Local (lendo arquivos grandes):** Sem limite de tamanho aqui — para v6.4.0 aceita-se que um arquivo de 10MB seria carregado inteiro em memoria. Risco: doc de release notes muito grande. Mitigacao: documentar em README do plano que arquivos `.md` > 1MB sao raros; caso surja, abrir issue para streaming scan em v6.5+.

---

## Verificacao

### TDD

- [ ] **RED:** todos os 6 testes do passo 6 escritos antes do step. Comando: `bun test skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/discovery-store.test.ts` — resultado esperado: erros de modulo nao encontrado/assertion failures.
- [ ] **GREEN:** discovery-store + step implementados. Comando: `bun test skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/discovery-store.test.ts` — resultado esperado: todos pass.
- [ ] **REFACTOR:** extrair `walkDir`/`containsBlacklisted` se util tambem para fase-03 lib (avaliar — pode ficar duplicado por enquanto para nao acoplar). Re-rodar testes.

### Checklist

- [ ] `secretsScanStep.id === '06-secrets-scan'`.
- [ ] `secretsScanStep` aparece em `registry` na posicao [reuseDiscoveryStep + 1].
- [ ] Em fixture com `node_modules/foo/secret.md` contendo AKIA*, scanner NAO bloqueia nem reporta.
- [ ] Em fixture com `.anti-vibe/backup/2026-05-18/old.md` contendo email, scanner NAO bloqueia (blacklist).
- [ ] `mutated: false` em todos os caminhos de execucao.
- [ ] Com `--dry-run` flag, arquivo `.anti-vibe/discovery/secrets-scan-result.json` NAO eh criado.
- [ ] `bun test skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/discovery-store.test.ts skills/init/lib/registry.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/06-secrets-scan.test.ts` exit 0.
- `bun test skills/init/lib/discovery-store.test.ts` exit 0.
- `bun test skills/init/lib/registry.test.ts` exit 0.
- `grep -c "secretsScanStep" skills/init/lib/registry.ts` retorna `2` (1 import + 1 entrada no array).
- Test #5 (registry order) passa — `idxSecrets > idxReuse && idxSecrets < idxMigrate0`.

**Por humano:**
- Reviewer le `06-secrets-scan.ts` em ~3 minutos e consegue explicar: (1) por que `mutated: false` mesmo escrevendo JSON, (2) por que glob inline e nao depende da fase-03 lib, (3) onde Plano 05 fase-01 vai conectar `--dry-run` completo.

---

## Decisoes Aplicadas

- **D16 do PRD** (secrets antes de move): Step 06 eh o primeiro novo step do registry, antes de qualquer Step 09/10/11 (Plano 04) que move/transforma arquivos.
- **SH-01 do PRD** (scan regex bloqueia arquivo especifico, nao init inteiro): Step retorna `mutated: false` + `summary` com contagem; nao chama `AbortError`. Plano 04 fase-05 (move-docs-with-stub) le o JSON persistido e pula arquivos `blockedFiles[].relativePath`.
- **CA-04 do PRD** (Stripe live bloqueado, outros movem): teste #2 desta fase prova diretamente — fixture com 1 stripe-live + 1 limpo → `blockedFiles.length === 1`.
- **D18 do PRD** (`--dry-run` global): step respeita `ctx.flags['dry-run']` para `noWrite`. Wiring completo em Plano 05 fase-01.
- **D19 + SH-07 do PRD** (audit log subagent_id canonico): `summary` carrega `init-secrets-scan` literal. Plano 06 fase-01 substitui por chamada canonica ao `AuditLogWriter`.
- **D21 do PRD** (dispatcher imutavel): Step usa contrato `Step{id, run}` existente; nada muda em `run-init.ts`.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
