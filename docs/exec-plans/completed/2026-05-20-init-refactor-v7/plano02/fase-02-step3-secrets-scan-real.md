<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Step 3 — secrets-scan REAL (substitui stub do Plano 01 fase-04)

**Plano:** 02 — Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Manifest Schema
**Sizing:** 1h
**Depende de:** fase-01 (mesma sessao de plano; nao importa schema mas a sessao RED-GREEN-VERIFY
e sequencial para usar o mesmo `bun run test`)
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/03-secrets-scan.ts` REAL portando a logica de `06-secrets-scan.ts` sem
dry-run / sem `noWrite` (D4 removeu). Step 3 substitui o stub do Plano 01 fase-04. Testes
portados de `06-secrets-scan.test.ts` exceto o de dry-run (obsoleto) e o de registry order
(reescrito para nova ordem). DV-1 cumprido — secrets-scan vira step proprio.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/03-secrets-scan.ts` | Create | Step real (substitui stub do Plano 01 fase-04). Porta logica de 06-secrets-scan.ts sem dry-run/noWrite |
| `skills/init/lib/steps/03-secrets-scan.test.ts` | Create | Testes portados (sem teste de dry-run; registry order reescrito) |

**Nota:** `skills/init/lib/steps/06-secrets-scan.ts` e `06-secrets-scan.test.ts` sao
DELETADOS no Plano 01 fase-05. Esta fase NAO toca neles — apenas cria os novos arquivos.
A substituicao do stub no `registry.ts` acontece em fase-04 deste plano.

---

## Implementacao

### Passo 1: RED — escrever testes do `03-secrets-scan.test.ts`

Portar testes validos do `06-secrets-scan.test.ts`. Conforme AUDIT.md linha 5 + G11 do README
deste plano: o teste antigo de dry-run (`'flag --dry-run leva noWrite'`) e o de registry order
(`'registry: secretsScanStep apos reuseDiscoveryStep...'`) NAO sao portados. Substituir o de
registry por um que reflita a ordem nova.

```typescript
// skills/init/lib/steps/03-secrets-scan.test.ts
// 2026-05-21 (Luiz/dev): Step 3 — secrets-scan REAL (Plano 02 fase-02 init-refactor-v7).
// Portado de skills/init/lib/steps/06-secrets-scan.test.ts SEM testes obsoletos (D4):
//   - removido: 'flag --dry-run leva noWrite' (D4 removeu dry-run)
//   - reescrito: registry order para nova posicao (DV-1 do PLAN.md)
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { secretsScanStep } from './03-secrets-scan'
import { readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-secrets-scan-'))
}

describe('secretsScanStep (Step 3 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 03-secrets-scan', () => {
    expect(secretsScanStep.id).toBe('03-secrets-scan')
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

  test('registry: 03-secrets-scan apos 02-detect-legacy-and-stack, antes de 04-migrate-planning-and-manifest', () => {
    const ids = registry.map((s) => s.id)
    const idxSecrets = ids.indexOf('03-secrets-scan')
    const idxDetect = ids.indexOf('02-detect-legacy-and-stack')
    const idxMigrate = ids.indexOf('04-migrate-planning-and-manifest')
    expect(idxSecrets).toBeGreaterThan(idxDetect)
    expect(idxSecrets).toBeLessThan(idxMigrate)
  })
})
```

**Nota:** O teste de registry order DEPENDE de `registry.ts` ja ter sido atualizado em fase-04
deste plano (substituindo os 2 stubs). Para que a fase-02 fique GREEN sem depender da fase-04,
esse teste sera deixado em `.skip` temporariamente OU os assertions do registry order serao
movidos para fase-04. **Decisao:** mover o `test('registry: ...')` para o arquivo de e2e da
fase-04, mantendo fase-02 focada apenas em behaviors do step isolado. Deletar esse teste deste
arquivo na implementacao real.

### Passo 2: GREEN — escrever `03-secrets-scan.ts`

Portar logica de `06-secrets-scan.ts` (linhas 1-111) removendo:
- `import { isDryRun } from '../dry-run-mode'` (linha 8) — D4 removeu dry-run
- `const noWrite = ctx.flags['dry-run'] === true` (linha 91) + passagem ao `writeDiscoveryArtifact`
- Bloco `writer?.append({...})` (linhas 94-104) — `__auditLog` removido (DI-Plano02-fase02-audit-log-removido)

```typescript
// skills/init/lib/steps/03-secrets-scan.ts
// 2026-05-21 (Luiz/dev): Step 3 — secrets-scan REAL (init v7).
// Portado de skills/init/lib/steps/06-secrets-scan.ts removendo dry-run/noWrite (D4 do CONTEXT)
// e audit-log writer (sem __auditLog no novo pipeline).
// DV-1 do PLAN.md init-refactor-v7: secrets-scan vira step proprio (Step 3).

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

const BLACKLIST_TOKENS = ['node_modules', 'dist', 'build', '.git', '.anti-vibe/backup']

function containsBlacklisted(relPath: string): boolean {
  return BLACKLIST_TOKENS.some((t) => relPath.includes(t))
}

function hasMarkdownExtension(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx')
}

async function walkDir(
  dir: string,
  recursive: boolean,
  acc: string[],
  cwd: string,
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
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

async function listCandidateFiles(cwd: string): Promise<readonly string[]> {
  const out: string[] = []
  await walkDir(cwd, false, out, cwd)
  await walkDir(path.join(cwd, 'docs'), true, out, cwd)
  await walkDir(path.join(cwd, '.claude'), true, out, cwd)
  return out
}

export const secretsScanStep: Step = {
  id: '03-secrets-scan',

  async run(ctx: StepContext): Promise<StepReport> {
    const startMs = performance.now()
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
      durationMs: Math.round(performance.now() - startMs),
    }

    // 2026-05-21 (Luiz/dev): sempre escreve (D4 removeu dry-run/noWrite).
    await writeDiscoveryArtifact(ctx.cwd, 'secrets-scan-result', result, { noWrite: false })

    return {
      mutated: false,
      summary: `secrets-scan [init-secrets-scan]: ${result.scannedCount} arquivos varridos, ${blocked.length} arquivos com match`,
    }
  },
}
```

**Diferencas vs. `06-secrets-scan.ts`:**
- `id: '03-secrets-scan'` (era `'06-secrets-scan'`)
- Removido `import { isDryRun } from '../dry-run-mode'`
- Removido `import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'` e `import type { AuditLogWriter }`
- Removido bloco audit-log
- `writeDiscoveryArtifact` recebe `{ noWrite: false }` literal (mantemos a flag para compatibilidade do signature da lib, mas nunca passamos true)
- Comentario de provenance atualizado para 2026-05-21 / Plano 02 fase-02

### Passo 3: VERIFY local

```bash
bun test skills/init/lib/steps/03-secrets-scan.test.ts
```

Esperado: 4 testes passam (sem o teste de registry order — esse fica para fase-04).

Validar `bun run typecheck` — o arquivo novo nao deve adicionar nenhum erro TS.

---

## Gotchas

- **G3 do plano (remocao do dry-run / noWrite):** Confirmar via `grep -r "isDryRun" skills/init/lib/steps/03-secrets-scan.ts` — deve retornar 0 matches. Mesmo para `'dry-run'` em `ctx.flags`.

- **G9 do plano (discovery artifact mantido):** `writeDiscoveryArtifact` continua sendo usado.
  Artefato vai para `.claude/.anti-vibe/discovery/secrets-scan-result.json` (consumido pelos
  testes via `readDiscoveryArtifact`). NAO confundir com `.claude/legacy-manifest.json` do Step 4.

- **G11 do plano (teste de registry order):** Movido para fase-04 — fase-02 NAO inclui esse teste.

- **Local — `writeDiscoveryArtifact` signature:** A lib `discovery-store.ts` recebe `{ noWrite: boolean }`
  como ultimo parametro. Estamos mantendo a signature da lib (nao reescreva a lib) — apenas sempre
  passamos `noWrite: false`. Em PR futuro, a flag pode ser removida da lib (mas e fora do escopo deste plano).

- **Local — comportamento de exec do `06-secrets-scan.ts`:** Algumas linhas de `walkDir` usam
  `path.sep` (Windows separator). Em Windows, `rel` precisa de `.split(path.sep).join('/')` para
  normalizar antes de validar com `containsBlacklisted`. **Logica ja faz isso** — copiar como-eh.

- **Local — sem AbortError:** Step 3 nao aborta o init se encontrar secrets. Ele apenas escreve
  o discovery artifact e retorna `mutated: false`. Outros gates (workflow, harness:validate) ficam
  responsaveis por bloquear o commit. Isso e by design do `06-secrets-scan.ts` original.

---

## Verificacao

### TDD

- [ ] **RED:** Testes do `03-secrets-scan.test.ts` escritos ANTES do step — falham por
  `secretsScanStep` nao existir (modulo nao encontrado). Para evitar compilation error,
  criar `03-secrets-scan.ts` com `export const secretsScanStep: Step = { id: 'TODO', run: async () => ({ mutated: false, summary: '' }) }` — testes falham por assertion (`expected '03-secrets-scan' received 'TODO'`).
  - Comando: `bun test skills/init/lib/steps/03-secrets-scan.test.ts --grep "id contratual"`
  - Resultado esperado: `expected '03-secrets-scan' to equal '03-secrets-scan'` falha com `'TODO'`

- [ ] **GREEN:** Logica completa portada, 4 testes passam
  - Comando: `bun test skills/init/lib/steps/03-secrets-scan.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/steps/03-secrets-scan.ts` criado com `id: '03-secrets-scan'`
- [ ] Sem imports de `dry-run-mode`, `init-subagent-ids`, `audit-log` (confirmar via grep)
- [ ] 4 testes em `03-secrets-scan.test.ts` passam
- [ ] `bun run typecheck` limpo no arquivo novo
- [ ] `bun run lint` limpo
- [ ] `bun run test` global continua verde
- [ ] Provenance comment com data 2026-05-21 no top do arquivo
- [ ] Old `06-secrets-scan.ts` NAO foi tocado (sera deletado em Plano 01 fase-05)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/03-secrets-scan.test.ts` retorna `4 passed, 0 failed`
- `grep -c "isDryRun\|dry-run" skills/init/lib/steps/03-secrets-scan.ts` retorna `0`
- `grep -q "id: '03-secrets-scan'" skills/init/lib/steps/03-secrets-scan.ts` retorna exit 0
- `bun run typecheck` retorna exit 0

**Por humano:**
- Diff `06-secrets-scan.ts` vs `03-secrets-scan.ts` mostra apenas: id mudou, 3 imports removidos,
  1 bloco audit-log removido. Resto e identico.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
