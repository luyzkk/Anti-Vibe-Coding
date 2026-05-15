# Fase 03: audit-log.ts — Writer de agents-log.json

**Plano:** 02 — Discovery TS: Fase 0 + Audit Log
**Sizing:** 1h
**Depende de:** fase-01 (discovery.ts exporta `run_id` que é correlacionado no audit log)
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/audit-log.ts` com `AuditLogWriter` — um writer de append que registra
a saída estruturada de cada subagente (Explorer, Reconciler, Compound-writer) em
`discovery/agents-log.json`. **Sem conteúdo de arquivo** (DT-07: sem PII) — só metadata,
paths, duração e resultado estruturado.

O `AuditLogWriter` é criado pelo orchestrator (Plano 03) passando o `run_id` gerado pelo
`runDiscovery`. Isso garante correlação entre `inventory.json` e `agents-log.json` da mesma
execução.

O arquivo `discovery/agents-log.json` deve ser gitignored (template `.gitignore.tpl` — anotado
aqui para o Plano 05 implementar quando criar os fixtures completos).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/audit-log.ts` | Criar | Writer de agents-log.json |
| `skills/init/lib/audit-log.test.ts` | Criar | Testes TDD com tmpdir |

---

## Implementacao

### Passo 1: Escrever testes RED antes de criar o módulo

Criar `skills/init/lib/audit-log.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises'
import path from 'node:path'
import { AuditLogWriter } from './audit-log'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'audit-log-test-'))
  await mkdir(path.join(tmp, 'discovery'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('AuditLogWriter', () => {
  it('module exists and exports AuditLogWriter', () => {
    expect(typeof AuditLogWriter).toBe('function')
  })

  it('creates agents-log.json on first append', async () => {
    const writer = new AuditLogWriter(tmp, 'run-abc-123')
    await writer.append({
      subagent_id: 'explorer-01',
      input_paths: ['docs/DESIGN.md'],
      output_struct: { slot_match: 'docs/DESIGN.md', confidence: 0.9 },
      duration_ms: 1500,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.run_id).toBe('run-abc-123')
    expect(log.entries).toHaveLength(1)
  })

  it('appends multiple entries preserving order', async () => {
    const writer = new AuditLogWriter(tmp, 'run-xyz')
    await writer.append({
      subagent_id: 'explorer-01',
      input_paths: ['docs/ADR-001.md'],
      output_struct: {},
      duration_ms: 800,
      retry_count: 0,
    })
    await writer.append({
      subagent_id: 'explorer-02',
      input_paths: ['docs/ADR-002.md', 'docs/ADR-003.md'],
      output_struct: {},
      duration_ms: 950,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries).toHaveLength(2)
    expect(log.entries[0].subagent_id).toBe('explorer-01')
    expect(log.entries[1].subagent_id).toBe('explorer-02')
  })

  it('records error field when subagent failed', async () => {
    const writer = new AuditLogWriter(tmp, 'run-err')
    await writer.append({
      subagent_id: 'explorer-03',
      input_paths: ['docs/dense.md'],
      output_struct: null,
      duration_ms: 30000,
      retry_count: 1,
      error: 'Timeout after 30s',
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    const entry = log.entries[0]
    expect(entry.error).toBe('Timeout after 30s')
    expect(entry.retry_count).toBe(1)
  })

  it('does not include file content in output_struct (caller responsibility)', async () => {
    // Este teste verifica que o writer aceita qualquer output_struct mas não valida
    // conteúdo — a responsabilidade de não incluir conteúdo cru é do caller (Plano 03).
    // O teste documenta essa responsabilidade via comentário, não via assertion.
    // DT-07: sem PII — auditoria é de paths e metadados, nunca conteúdo de arquivo.
    const writer = new AuditLogWriter(tmp, 'run-pii-test')
    await writer.append({
      subagent_id: 'reconciler',
      input_paths: ['docs/DESIGN.md'],
      output_struct: { decision: 'consolidate', slot: 'docs/DESIGN.md' }, // só metadata
      duration_ms: 2000,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries[0].output_struct).not.toHaveProperty('file_content')
  })

  it('each entry has timestamp in ISO format', async () => {
    const writer = new AuditLogWriter(tmp, 'run-ts')
    await writer.append({
      subagent_id: 'compound-writer',
      input_paths: [],
      output_struct: {},
      duration_ms: 100,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('survives concurrent appends (sequential writes, no interleave)', async () => {
    const writer = new AuditLogWriter(tmp, 'run-concurrent')
    // Simular 6 appends "paralelos" (não são realmente paralelos — writer é sequencial)
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        writer.append({
          subagent_id: `explorer-0${i + 1}`,
          input_paths: [`docs/file-${i}.md`],
          output_struct: { index: i },
          duration_ms: 100 * (i + 1),
          retry_count: 0,
        }),
      ),
    )

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries).toHaveLength(6)
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'AuditLogWriter'`

### Passo 2: Tipos e contratos

```typescript
// audit-log.ts

/**
 * Uma entrada no audit log — registra o que um subagente recebeu e produziu.
 * DT-07: sem PII. `input_paths` são paths (não conteúdo). `output_struct` é struct semântica
 * retornada pelo subagente (não o arquivo lido). Responsabilidade do caller não incluir conteúdo cru.
 */
export type AgentLogEntry = {
  /** ISO 8601 — momento do append. */
  timestamp: string
  /** Identificador do subagente (ex: "explorer-01", "reconciler", "compound-writer"). */
  subagent_id: string
  /** Paths dos arquivos passados como input para este subagente (relativos ao targetDir). */
  input_paths: string[]
  /**
   * Output estruturado retornado pelo subagente.
   * Deve ser apenas metadata/struct semântica — nunca conteúdo de arquivo (DT-07).
   */
  output_struct: unknown
  /** Duração da chamada ao subagente em ms. */
  duration_ms: number
  /** Número de retries realizados (0 = sem retry). DT-03: max 1 retry. */
  retry_count: number
  /** Mensagem de erro se o subagente falhou (após todos os retries). */
  error?: string
}

export type AgentsLog = {
  /** UUID — mesmo run_id do InventoryResult (correlação inventory ↔ agents-log). */
  run_id: string
  /** ISO 8601 — quando o AuditLogWriter foi instanciado. */
  started_at: string
  entries: AgentLogEntry[]
}

export type AppendInput = Omit<AgentLogEntry, 'timestamp'>
```

### Passo 3: Implementar AuditLogWriter

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Writer sequencial de agents-log.json.
 *
 * Criado pelo orchestrator com o run_id do discovery para correlação.
 * append() é serializado internamente via promise chain para evitar
 * escritas interleaved em chamadas "paralelas" do caller (Plano 03).
 *
 * @example
 * const writer = new AuditLogWriter(targetDir, inventoryResult.run_id)
 * await writer.append({ subagent_id: 'explorer-01', ... })
 */
export class AuditLogWriter {
  private readonly logPath: string
  private log: AgentsLog
  private writeChain: Promise<void> = Promise.resolve()

  constructor(targetDir: string, run_id: string) {
    this.logPath = path.join(targetDir, 'discovery', 'agents-log.json')
    this.log = {
      run_id,
      started_at: new Date().toISOString(),
      entries: [],
    }
  }

  /**
   * Adiciona uma entrada ao log e persiste em disco.
   * Chamadas concorrentes são serializadas — a última chamada completa garante
   * que todas as entradas anteriores estão no arquivo.
   */
  async append(input: AppendInput): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      const entry: AgentLogEntry = {
        timestamp: new Date().toISOString(),
        ...input,
      }
      this.log.entries.push(entry)
      await fs.writeFile(this.logPath, JSON.stringify(this.log, null, 2), 'utf-8')
    })
    await this.writeChain
  }
}
```

### Passo 4: Observação sobre `discovery/` no .gitignore

O arquivo `discovery/agents-log.json` deve ser gitignored. O template `.gitignore.tpl`
(em `skills/init/assets/templates/.gitignore.tpl`) precisa incluir:

```
# Anti-Vibe Coding / init migration mode
discovery/agents-log.json
```

**Não implementar aqui** — isso é responsabilidade do Plano 05 fase-02 (fixtures completas)
que revisará todos os templates. Registrar no MEMORY.md deste plano como nota para o Plano 05.

---

## Gotchas

**G11 — Serialização sequencial via promise chain:** O Plano 03 vai chamar `writer.append()` em
paralelo (6 Explorer subagents). Sem serialização, dois `JSON.parse → push → writeFile` simultâneos
podem produzir race condition. A promise chain `this.writeChain = this.writeChain.then(...)` garante
que writes são sequenciais mesmo quando append é chamado concorrentemente.

**G12 — O log é mantido em memória (`this.log`) e persistido a cada append:** Isso é intencional —
evita `readFile + parse + push + writeFile` a cada append (mais lento e sujeito a race em casos
extremos). Trade-off: se o processo morrer no meio, o arquivo em disco pode ter menos entries que
a memória. Para o caso de uso (debug pós-execução), isso é aceitável.

**G13 — `output_struct: unknown`:** O tipo é `unknown` (não `any`) para forçar callers a tipar
corretamente no Plano 03. O writer não valida o conteúdo — só serializa. A responsabilidade de
não incluir conteúdo de arquivo é documentada no tipo via JSDoc.

**G14 — `discovery/` deve existir antes do primeiro append:** No fluxo normal, `runDiscovery`
cria `discovery/` antes do orchestrator instanciar o `AuditLogWriter`. Mas nos testes, o `beforeEach`
cria o diretório explicitamente. O writer **não cria** o diretório — assume que já existe.
Se o orchestrator chamar o writer sem rodar discovery primeiro, terá um erro de `ENOENT`.
Isso é correto: Fase 0 (discovery) é pré-requisito de Fase 1 (subagentes + audit).

---

## Verificacao

### TDD
- [ ] RED: `audit-log.ts` não existe, testes falham com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'AuditLogWriter'`
- [ ] GREEN: módulo criado, todos os testes passam
  - Comando: `bun run test -- --grep 'AuditLogWriter'`

### Checklist
- [ ] `AuditLogWriter` exportado de `skills/init/lib/audit-log.ts`
- [ ] `append()` serializa writes via promise chain (sem race condition em paralelo)
- [ ] `AgentLogEntry.timestamp` é ISO string (não epoch)
- [ ] `AgentLogEntry` tem todos os campos: timestamp, subagent_id, input_paths, output_struct, duration_ms, retry_count, error?
- [ ] `AgentsLog` tem run_id correlacionado com inventory.json
- [ ] `agents-log.json` escrito em `targetDir/discovery/` (não cria o diretório — assume que existe)
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] MEMORY.md atualizado com nota para Plano 05: `.gitignore.tpl` deve incluir `discovery/agents-log.json`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'AuditLogWriter'` retorna ≥6 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- `AgentsLog.run_id` no `agents-log.json` gerado é idêntico ao `InventoryResult.run_id` do `inventory.json`
  (verificável manualmente rodando o flow completo após Plano 03)

<!-- Gerado por /plan-feature em 2026-05-14 -->
