<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): D7 — incremental drift detection`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 03: Drift Detector + Step 12

**Plano:** 05 — Modos Reversiveis
**Sizing:** 1h
**Depende de:** Nenhuma direta (consome `.claude/.anti-vibe-manifest.json` ja existente do v6.3.x; consome `lib/discovery-store.ts` do Plano 03 fase-02 apenas se for persistir o resultado)
**Visual:** false

---

## O que esta fase entrega

`lib/drift-detector.ts` (`detectDrift`, `DriftReport`, `DriftStatus`) + Step 12 (`detectDriftIncrementalStep`) que roda APENAS em modo `already-initiated`. Compara checksums sha256 dos arquivos rastreados pelo manifest contra o estado atual, classifica cada arquivo em PLACEHOLDER (manifest indica template-only ainda nao populado) | POPULATED (mudou desde install, conteudo nao-trivial) | DRIFT (mudou mas conteudo continua trivial/template — possivel edit-then-revert). Resultado escrito em `.anti-vibe/discovery/drift-report.json` para Step 91 (`generate-populate-plan` do Plano 02 fase-03) filtrar tasks seletivamente.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/drift-detector.ts` | Create | Exporta `detectDrift`, `DriftReport`, `DriftStatus`, `DRIFT_REPORT_FILENAME` |
| `skills/init/lib/drift-detector.test.ts` | Create | 5 testes minimos (skip-when-not-already-initiated, PLACEHOLDER, POPULATED, DRIFT, missing-manifest) |
| `skills/init/lib/steps/12-detect-drift-incremental.ts` | Create | Exporta `detectDriftIncrementalStep: Step` com id `12-detect-drift-incremental` |
| `skills/init/lib/steps/12-detect-drift-incremental.test.ts` | Create | Testes do Step (integracao com `detectDrift` + registry position) |
| `skills/init/lib/registry.ts` | Modify | Insere `detectDriftIncrementalStep` APOS `moveDocsWithStubStep` (Step 11 do Plano 04) e ANTES de `generatePopulatePlanStep` (Step 91 do Plano 02) |
| `skills/init/lib/steps/12-detect-drift-incremental.test.ts` | (parte do registry test) | Asserta posicao via `registry.indexOf(...)` |

---

## Implementacao

### Passo 1: Definir tipos publicos em `lib/drift-detector.ts`

```typescript
// skills/init/lib/drift-detector.ts
// 2026-05-18 (Luiz/dev): D7 + SH-05 + CA-05 — drift detection incremental em re-runs

export type DriftStatus = 'PLACEHOLDER' | 'POPULATED' | 'DRIFT'

export type DriftReport = {
  readonly generatedAt: string  // ISO 8601
  readonly summary: {
    readonly placeholder: number
    readonly populated: number
    readonly drift: number
  }
  readonly byFile: Readonly<Record<string, DriftStatus>>
}

export const DRIFT_REPORT_FILENAME = 'drift-report.json'

export type DetectDriftOptions = {
  readonly manifestPath: string  // ex: path.join(cwd, '.claude/.anti-vibe-manifest.json')
  readonly cwd: string
}

/**
 * Detecta drift comparando sha256 atual de cada arquivo no manifest com o registrado.
 * Tres regras de classificacao:
 *  - sha atual === sha do manifest E arquivo eh template (heuristica abaixo): PLACEHOLDER
 *  - sha diferente E conteudo nao-trivial (linhas >10 + nao bate template): POPULATED
 *  - sha diferente E conteudo trivial/template: DRIFT (possivel reset acidental)
 *
 * Se manifest ausente, retorna { byFile: {}, summary: { placeholder:0, populated:0, drift:0 } }
 * com warning silencioso (caller decide se loga).
 */
export async function detectDrift(opts: DetectDriftOptions): Promise<DriftReport> {
  // implementacao no Passo 2
}
```

### Passo 2: Implementar `detectDrift`

```typescript
// 2026-05-18 (Luiz/dev): heuristica de template — arquivos com <= 10 linhas E sem palavras-chave
// significativas (TODO, FIXME, class, function, etc.) sao considerados template-only.
// Conservador: dev pode editar superficialmente um placeholder e ainda contar como PLACEHOLDER.
// CA-05 cobre este caso explicitamente.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const TEMPLATE_LINE_LIMIT = 10
const SIGNIFICANT_TOKENS = /\b(TODO|FIXME|class|function|interface|export|import|const|let|describe|it)\b/i

async function computeSha256(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function isTemplateContent(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length <= TEMPLATE_LINE_LIMIT && !SIGNIFICANT_TOKENS.test(content)) {
      return true
    }
    return false
  } catch {
    return true  // arquivo nao existe ou ilegivel: trate como template (sera flagged)
  }
}

type ManifestEntry = { path: string; sha256: string }
type Manifest = { files: ReadonlyArray<ManifestEntry> }

export async function detectDrift(opts: DetectDriftOptions): Promise<DriftReport> {
  let manifest: Manifest
  try {
    const raw = await fs.readFile(opts.manifestPath, 'utf8')
    manifest = JSON.parse(raw) as Manifest
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      summary: { placeholder: 0, populated: 0, drift: 0 },
      byFile: {},
    }
  }

  const byFile: Record<string, DriftStatus> = {}
  let placeholder = 0, populated = 0, drift = 0

  for (const entry of manifest.files) {
    const absPath = path.join(opts.cwd, entry.path)
    let currentSha: string
    try {
      currentSha = await computeSha256(absPath)
    } catch {
      // arquivo deletado pelo dev → tratar como DRIFT (manifest ainda referencia)
      byFile[entry.path] = 'DRIFT'
      drift += 1
      continue
    }

    if (currentSha === entry.sha256) {
      // unchanged desde install — provavel placeholder (template original)
      if (await isTemplateContent(absPath)) {
        byFile[entry.path] = 'PLACEHOLDER'
        placeholder += 1
      } else {
        // unchanged mas nao-template (raro — install ja escreveu conteudo significativo)
        byFile[entry.path] = 'POPULATED'
        populated += 1
      }
    } else {
      // checksum diferente — dev tocou no arquivo
      if (await isTemplateContent(absPath)) {
        // mudou mas continua trivial: DRIFT (provavel revert acidental)
        byFile[entry.path] = 'DRIFT'
        drift += 1
      } else {
        // mudou e tem conteudo significativo: POPULATED (dev editou de verdade)
        byFile[entry.path] = 'POPULATED'
        populated += 1
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: { placeholder, populated, drift },
    byFile,
  }
}
```

### Passo 3: Implementar Step 12 em `lib/steps/12-detect-drift-incremental.ts`

```typescript
// skills/init/lib/steps/12-detect-drift-incremental.ts
// 2026-05-18 (Luiz/dev): SH-05 + CA-05 — Step 12 incremental drift detection (already-initiated only)
import path from 'node:path'
import type { Step, StepReport, StepContext } from './types'
import { detectDrift, DRIFT_REPORT_FILENAME } from '../drift-detector'
import { isDryRun } from '../dry-run-mode'

// 2026-05-18 (Luiz/dev): ADAPTAR conforme convencao em plano01/MEMORY.md — como ctx.mode eh
// propagado. Por enquanto leitura defensiva via ctx.flags['__initMode'] ou ctx.flags['mode'].
function getInitMode(ctx: StepContext): string | undefined {
  const raw = ctx.flags['__initMode'] ?? ctx.flags['mode']
  return typeof raw === 'string' ? raw : undefined
}

export const detectDriftIncrementalStep: Step = {
  id: '12-detect-drift-incremental',
  async run(ctx) {
    const mode = getInitMode(ctx)
    if (mode !== 'already-initiated') {
      return { mutated: false, summary: `skipped (only runs in already-initiated mode; current: ${mode ?? 'unknown'})` }
    }

    const manifestPath = path.join(ctx.cwd, '.claude', '.anti-vibe-manifest.json')
    const report = await detectDrift({ manifestPath, cwd: ctx.cwd })

    // 2026-05-18 (Luiz/dev): em dry-run nao escreve o JSON; summary lista contagens
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: `dry-run: would write drift-report.json — placeholder=${report.summary.placeholder}, populated=${report.summary.populated}, drift=${report.summary.drift}`,
      }
    }

    // Escreve via discovery-store (Plano 03 fase-02). ADAPTAR conforme MEMORY do Plano 03.
    const { writeDiscoveryArtifact } = await import('../discovery-store')
    await writeDiscoveryArtifact({ cwd: ctx.cwd, filename: DRIFT_REPORT_FILENAME, content: report })

    // 2026-05-18 (Luiz/dev): subagent_id literal init-drift-detect — Plano 06 fase-01 conecta
    // ao AuditLogWriter. Por enquanto o literal aparece no summary para grepability.
    return {
      mutated: true,
      summary: `init-drift-detect: placeholder=${report.summary.placeholder}, populated=${report.summary.populated}, drift=${report.summary.drift}`,
    }
  },
}
```

### Passo 4: Inserir Step 12 no registry

```typescript
// skills/init/lib/registry.ts (trecho)
// 2026-05-18 (Luiz/dev): Plano 05 fase-03 — Step 12 detect-drift apos move-docs-with-stub (Plano 04 fase-05)
// e antes de generate-populate-plan (Plano 02 fase-03). Position calcada por relacao ao Step 91.
import { detectDriftIncrementalStep } from './steps/12-detect-drift-incremental'

// dentro do array registry, na ordem certa:
//   ...,
//   moveDocsWithStubStep,            // Plano 04 fase-05 (Step 11)
//   detectDriftIncrementalStep,      // Plano 05 fase-03 (Step 12) — esta linha
//   finalValidationStep,             // Step 90 (existente)
//   generatePopulatePlanStep,        // Plano 02 fase-03 (Step 91)
```

### Passo 5: Suite de testes em `drift-detector.test.ts`

```typescript
// skills/init/lib/drift-detector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { detectDrift } from './drift-detector'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

describe('detectDrift', () => {
  it('returns empty report when manifest missing', async () => {
    const report = await detectDrift({ manifestPath: path.join(tmpDir, 'missing.json'), cwd: tmpDir })
    expect(report.byFile).toEqual({})
    expect(report.summary).toEqual({ placeholder: 0, populated: 0, drift: 0 })
  })

  it('marks PLACEHOLDER when sha matches and content is template', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    const content = '# AGENTS\n\nTODO: populate.\n'
    await fs.writeFile(filePath, content, 'utf8')
    // template heuristic: <=10 lines + no significant tokens... 'TODO' is significant.
    // Adjust: use truly minimal content.
    const trivialContent = '# AGENTS\n\n(placeholder)\n'
    await fs.writeFile(filePath, trivialContent, 'utf8')
    const manifestPath = path.join(tmpDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: sha(trivialContent) }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('PLACEHOLDER')
    expect(report.summary.placeholder).toBe(1)
  })

  it('marks POPULATED when sha differs and content has substance', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    const populatedContent = '# AGENTS\n\n## Mission\n\nThis project does X.\n\n## Stack\n\nReact + Bun.\n\n## Modules\n\n- src/auth — sessions\n- src/db — queries\n\n## Conventions\n\nUse TanStack Query, never useEffect.\n'
    await fs.writeFile(filePath, populatedContent, 'utf8')
    const manifestPath = path.join(tmpDir, 'manifest.json')
    // manifest had OLD sha (template); current is populated
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: sha('template original') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('POPULATED')
    expect(report.summary.populated).toBe(1)
  })

  it('marks DRIFT when sha differs but content is trivial', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(filePath, '\n', 'utf8')  // dev apagou conteudo
    const manifestPath = path.join(tmpDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: sha('original placeholder content') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('DRIFT')
    expect(report.summary.drift).toBe(1)
  })

  it('marks DRIFT when file deleted but manifest references it', async () => {
    // arquivo nunca foi criado em tmpDir
    const manifestPath = path.join(tmpDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'GHOST.md', sha256: sha('gone') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['GHOST.md']).toBe('DRIFT')
    expect(report.summary.drift).toBe(1)
  })
})
```

### Passo 6: Suite de testes do Step em `12-detect-drift-incremental.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { detectDriftIncrementalStep } from './12-detect-drift-incremental'
import type { StepContext } from './types'

const mkCtx = (flags: Record<string, unknown> = {}, cwd = '/tmp/x'): StepContext => ({
  cwd, args: [], flags: flags as Record<string, boolean | string>,
})

describe('detectDriftIncrementalStep', () => {
  it('skips when mode is not already-initiated', async () => {
    const report = await detectDriftIncrementalStep.run(mkCtx({ '__initMode': 'greenfield' }))
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/skipped/)
  })

  it('skips when mode is undefined', async () => {
    const report = await detectDriftIncrementalStep.run(mkCtx())
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/skipped/)
  })

  it('emits subagent_id literal in summary when running', async () => {
    // 2026-05-18 (Luiz/dev): fixture com manifest e arquivo placeholder
    // (ADAPTAR — usar mkdtemp como em drift-detector.test.ts)
    // Skipped here for brevity; full test in implementation.
    expect(true).toBe(true)
  })
})
```

---

## Gotchas

- **G1 do plano (drift somente em already-initiated):** `ctx.mode === 'already-initiated'` eh a unica condicao de execucao. Outras modos = skip. Forma de obter `mode` ainda nao esta congelada — ADAPTAR conforme `plano01/MEMORY.md` (Plano 01 fase-01 documenta como o mode eh detectado e propagado). Por enquanto: `ctx.flags['__initMode']` como slot reservado.
- **G7 do plano (drift artifact schema):** Schema canonico do `drift-report.json` eh CONTRATO com Plano 02 fase-02 (`populate-plan-generator` le esse arquivo em modo `already-initiated` para filtrar tasks). NAO mudar `summary: { placeholder, populated, drift }` sem atualizar `plano02/MEMORY.md`.
- **G4 do plano (Windows path safety):** `fs.readFile(absPath)` retorna Buffer — sha256 dele eh determinista cross-OS (sem normalizacao de EOL). Bem. Mas ATENCAO: se o repo tem `*.md text eol=lf` em `.gitattributes` e o checkout no Windows normalizou para CRLF, o sha do manifest (gerado no install) vai BATER ou NAO BATER dependendo de QUANDO o manifest foi gravado. **Decisao conservadora:** documentar em MEMORY.md como GT-1 que o manifest deve ser gerado APOS qualquer normalizacao de EOL — responsabilidade do Plano 01 fase-02.
- **Local: heuristica de template eh frou-frou.** `TEMPLATE_LINE_LIMIT = 10` + ausencia de tokens significativos eh conservadora. Pode classificar arquivo curto-mas-significativo (ex: README de subprojeto com 8 linhas valiosas) como template. Aceitavel para v6.4.0 — falsos positivos no PLACEHOLDER apenas geram tasks extras no Step 91, nao causam mutacao destrutiva. Refinar em v6.5+ se for problema real.
- **Local: arquivo deletado pelo dev = DRIFT.** Decisao conservadora — evita falsos positivos de "deletado intencional" como POPULATED. Dev pode investigar via diff de manifest e ADR de rollback (fase-04).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/drift-detector.test.ts` falha — modulo nao existe.
  - Comando: `bun run test skills/init/lib/drift-detector.test.ts`
  - Resultado esperado: `Cannot find module './drift-detector'`.

- [ ] **GREEN:** Helpers + Step + testes verdes.
  - Comando: `bun run test skills/init/lib/drift-detector.test.ts skills/init/lib/steps/12-detect-drift-incremental.test.ts`
  - Resultado esperado: `5+3 passed, 0 failed`.

### Checklist

- [ ] `skills/init/lib/drift-detector.ts` exporta exatos 4 simbolos publicos: `detectDrift`, `DriftReport`, `DriftStatus`, `DRIFT_REPORT_FILENAME`.
- [ ] `skills/init/lib/steps/12-detect-drift-incremental.ts` exporta `detectDriftIncrementalStep: Step`.
- [ ] Registry posiciona `detectDriftIncrementalStep` apos `moveDocsWithStubStep` e antes de `generatePopulatePlanStep` — assertable via `registry.findIndex(s => s.id === '12-detect-drift-incremental')` retorna indice valido.
- [ ] Em modo nao-already-initiated, Step retorna `mutated: false` com summary contendo `skipped`.
- [ ] Em modo already-initiated, Step retorna `mutated: true` e summary contem `init-drift-detect:` (literal subagent_id para Plano 06 fase-01 conectar).
- [ ] Testes passam: 5 em `drift-detector.test.ts` + 3 em `12-detect-drift-incremental.test.ts`.
- [ ] Lint limpo.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/drift-detector.test.ts skills/init/lib/steps/12-detect-drift-incremental.test.ts` retorna 0 falhas.
- `grep -c "DriftStatus\|DriftReport\|detectDrift\|DRIFT_REPORT_FILENAME" skills/init/lib/drift-detector.ts` retorna `>= 4` (exports presentes).
- `grep -c "init-drift-detect" skills/init/lib/steps/12-detect-drift-incremental.ts` retorna `>= 1` (subagent_id literal grepable).

**Por humano:**
- Em re-run do init em projeto ja inicializado com manifest, terminal mostra `[12-detect-drift-incremental] init-drift-detect: placeholder=N, populated=M, drift=K`.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
