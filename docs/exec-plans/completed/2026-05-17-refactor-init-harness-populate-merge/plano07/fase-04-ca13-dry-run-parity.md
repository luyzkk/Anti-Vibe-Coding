<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: CA-13 Dry-Run Parity (inclui CA-14 audit log)

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 1h
**Depende de:** fase-02 (fixture inverted-merge-v6.4) + gates externos: Plano 05 fase-01/02 (dry-run wiring + WriteRecorder + renderer), Plano 04 fase-03/05 (apply-merge + move-docs com backup manifest D29), Plano 06 fase-01 (audit log canonico + `INIT_SUBAGENT_IDS`)
**Visual:** false

---

## O que esta fase entrega

Teste E2E `tests/e2e/ca13-dry-run-parity.test.ts` validando **dois CAs do PRD em uma so execucao do fixture**:

- **CA-13 (dry-run parity):** dado o fixture `inverted-merge-v6.4` (CLAUDE.md 287 + 4 docs), apos rodar init em `--dry-run` mode E depois em modo real (em copia FRESH do fixture), a lista de arquivos previstos pelo dry-run (output do Step 09 capturado via `__dryRunRecorder`) bate byte-a-byte com a lista realmente modificada (manifest D29 em `.anti-vibe/backup/{ts}/manifest.json`).
- **CA-14 (audit log ordem canonica):** apos o real run, inspeciona `discovery/agents-log.json` e asserta presenca de entries com `subagent_id` na ordem exata: `init-secrets-scan` → `init-discover-existing-docs` → `init-classify-blocks` → `init-propose-merge` → `init-apply-merge` → `init-move-docs` → `init-populate-plan-gen`. Cada entry tem `input_paths`, `output_struct`, `duration_ms`. RunId compartilhado (assertion condicional se schema fornecido).

**Decisao:** CA-13 e CA-14 sao integrados na MESMA fase porque consomem a mesma fixture, mesmo runId, mesma execucao real. Separar inflaria custo de setup duplicado sem ganho semantico. Documentado no README G1.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/ca13-dry-run-parity.test.ts` | Create | Teste E2E com `describe` "CA-13 + CA-14" + 4 `it` (dry-run captures recorder; real run produces manifest; lists match; audit log order canonica) |

**Total:** 1 arquivo novo.

---

## Implementacao

### Passo 1: Setup e helpers

Replicar isolamento via `mkdtemp` + cleanup tolerante a Windows. **Duas copias frescas** do fixture: uma para dry-run, outra para real-run. Sem rollback intermediario (mais simples que reusar mesmo tmpdir).

```typescript
// tests/e2e/ca13-dry-run-parity.test.ts
// 2026-05-18 (Luiz/dev): CA-13 + CA-14 do PRD refactor-init-harness-populate-merge.
// Parity entre dry-run preview e real-run manifest + ordem canonica de audit log entries.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { INIT_SUBAGENT_IDS } from '../../skills/init/lib/init-subagent-ids'
// TODO ADAPTAR — tipos finais quando Planos 01/04/05/06 publicarem APIs.

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'inverted-merge-v6.4')

async function copyDirRecursive(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true })
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) await copyDirRecursive(s, d)
    else await fs.copyFile(s, d)
  }
}

async function safeCleanup(p: string): Promise<void> {
  try { await fs.rm(p, { recursive: true, force: true }) } catch { /* Windows handle leak */ }
}
```

### Passo 2: Capturar dry-run recorder (CA-13 parte 1)

```typescript
describe('CA-13 dry-run parity + CA-14 audit log canonica (inverted-merge-v6.4)', () => {
  let tmpDry: string
  let tmpReal: string
  let dryRunPaths: ReadonlyArray<string>
  let realRunManifest: ReadonlyArray<{ originalPath: string; action: string }>
  let realRunLog: ReadonlyArray<{ subagent_id: string; input_paths?: unknown; output_struct?: unknown; duration_ms?: number; runId?: string }>

  beforeAll(async () => {
    tmpDry = await fs.mkdtemp(path.join(os.tmpdir(), 'ca13-dry-'))
    tmpReal = await fs.mkdtemp(path.join(os.tmpdir(), 'ca13-real-'))
    await copyDirRecursive(FIXTURE, tmpDry)
    await copyDirRecursive(FIXTURE, tmpReal)

    // ---- DRY RUN ----
    // 2026-05-18 (Luiz/dev): G4 do README — `__dryRunRecorder` em ctx.flags via cast.
    // Decisao mantida pelo Plano 05 DI-1; tipo final via plano05/MEMORY.md.
    const dryResult = await runInit({ args: ['--dry-run'], cwd: tmpDry })
    // TODO ADAPTAR — shape final de runInit. Assume retorno expoe ctx.flags ou similar.
    const recorder = (dryResult as unknown as { ctx?: { flags?: Record<string, unknown> } })
      ?.ctx?.flags?.['__dryRunRecorder']
    // Se shape final difere, ajustar acesso ao recorder.
    const paths = (recorder as { paths?: ReadonlyArray<string> })?.paths ?? []
    dryRunPaths = [...paths].sort()

    // Sanity: dry-run NAO mutou o tmpdir.
    const filesInTmp = await fs.readdir(tmpDry)
    expect(filesInTmp).not.toContain('.anti-vibe')
    expect(filesInTmp).not.toContain('AGENTS.md') // root AGENTS.md nao existe em dry-run
  })

  afterAll(async () => {
    await safeCleanup(tmpDry)
    await safeCleanup(tmpReal)
  })

  // tests it() abaixo
})
```

### Passo 3: Executar real-run e ler manifest D29 (CA-13 parte 2)

Continuando o `beforeAll`:

```typescript
    // ---- REAL RUN ----
    // 2026-05-18 (Luiz/dev): real run consome FRESH copy do fixture.
    // Step 09 normalmente chamaria `needsUser`; teste injeta auto-approve via opts.
    const realResult = await runInit({
      args: [],
      cwd: tmpReal,
      // TODO ADAPTAR — passar `askUser` que auto-aprova batch merge.
      // Se Plano 04 fase-02 expor `opts.askUser` ou `opts.autoApproveMerge`, usar aqui.
      // Caso contrario, abrir DEV-N e considerar rodar real-run com `--auto-approve` flag stub.
    } as Parameters<typeof runInit>[0])

    // Ler backup manifest D29 — Step 10/11 escrevem juntos em .anti-vibe/backup/{ts}/manifest.json.
    const backupRoot = path.join(tmpReal, '.anti-vibe', 'backup')
    const backupTimestamps = await fs.readdir(backupRoot)
    expect(backupTimestamps.length).toBeGreaterThan(0)
    // Pega o mais recente (G6 do plano01 — getLatestBackupDir).
    const latestTs = backupTimestamps.sort().at(-1)!
    const manifestPath = path.join(backupRoot, latestTs, 'manifest.json')
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestRaw) as { files: ReadonlyArray<{ originalPath: string; action: string }> }
    realRunManifest = manifest.files

    // Ler agents-log.json (audit log canonico do Plano 06).
    const logPath = path.join(tmpReal, 'discovery', 'agents-log.json')
    // TODO ADAPTAR — confirmar path canonico em audit-log.ts; pode ser .anti-vibe/discovery/...
    const logRaw = await fs.readFile(logPath, 'utf-8')
    const logEntries = JSON.parse(logRaw) as ReadonlyArray<{ subagent_id: string; input_paths?: unknown; output_struct?: unknown; duration_ms?: number; runId?: string }>
    realRunLog = logEntries
```

### Passo 4: Assertions CA-13 (parity)

```typescript
  it('dry-run recorder paths bate byte-a-byte com real-run manifest paths', () => {
    const realPaths = realRunManifest
      .map((f) => f.originalPath)
      .sort()
    // CA-13 do PRD: byte-a-byte parity entre simulacao e execucao.
    expect(dryRunPaths).toEqual(realPaths)
  })

  it('dry-run nao mutou o filesystem (mutated: false em todos os steps)', async () => {
    // 2026-05-18 (Luiz/dev): sanity check redundante mas explicito para CA-13.
    const filesInTmpDry = await fs.readdir(tmpDry, { withFileTypes: true })
    const hasAntiVibe = filesInTmpDry.some((d) => d.name === '.anti-vibe')
    expect(hasAntiVibe).toBe(false)
    // Fixture CLAUDE.md ainda intocado.
    const claudeMdLines = (await fs.readFile(path.join(tmpDry, 'CLAUDE.md'), 'utf-8'))
      .split('\n').length
    expect(claudeMdLines).toBeGreaterThanOrEqual(287)
  })
```

### Passo 5: Assertions CA-14 (audit log ordem canonica)

Conforme **G13 do README**: drift-detect NAO aparece em migration mode; rollback NAO aparece (nao foi invocado). Esperados exatos 7 subagent_ids.

```typescript
  it('audit log contem 7 entries na ordem canonica esperada (CA-14)', () => {
    const subagentIds = realRunLog
      .map((e) => e.subagent_id)
      .filter((id) => id.startsWith('init-')) // ignora entries de outros sistemas se houver

    const expectedOrder = [
      INIT_SUBAGENT_IDS.secretsScan,        // init-secrets-scan
      INIT_SUBAGENT_IDS.discoverDocs,       // init-discover-existing-docs
      INIT_SUBAGENT_IDS.classifyBlocks,     // init-classify-blocks
      INIT_SUBAGENT_IDS.proposeMerge,       // init-propose-merge
      INIT_SUBAGENT_IDS.applyMerge,         // init-apply-merge
      INIT_SUBAGENT_IDS.moveDocs,           // init-move-docs
      INIT_SUBAGENT_IDS.populatePlanGen,    // init-populate-plan-gen
    ]

    // CA-14 do PRD: ordem exata. Note que init-drift-detect NAO aparece
    // (Step 12 so roda em modo already-initiated — G13 do README).
    expect(subagentIds).toEqual(expectedOrder)
  })

  it('cada entry do audit log tem input_paths + output_struct + duration_ms', () => {
    for (const entry of realRunLog) {
      expect(entry.input_paths).toBeDefined()
      expect(entry.output_struct).toBeDefined()
      expect(typeof entry.duration_ms).toBe('number')
    }
  })

  it('runId compartilhado entre todas as entries (se schema fornece) — G7 do README', () => {
    // 2026-05-18 (Luiz/dev): assertion condicional. Se AgentLogEntry.runId ainda nao
    // foi adicionado ao schema do AuditLogWriter, skipa com warning.
    const runIds = realRunLog.map((e) => e.runId).filter(Boolean)
    if (runIds.length === 0) {
      console.warn('CA-14: runId nao presente no schema do audit log — assertion skipada (TODO ADAPTAR conforme Plano 06 GT-CROSS-2)')
      return
    }
    const uniqueRunIds = new Set(runIds)
    expect(uniqueRunIds.size).toBe(1) // todos do mesmo run
  })
```

### Passo 6: Lint + run

```bash
bun run lint tests/e2e/ca13-dry-run-parity.test.ts
bun test tests/e2e/ca13-dry-run-parity.test.ts
```

---

## Gotchas

- **G1 do README (CA-14 integrado nesta fase):** documentado no `describe` title. README do Plano 07 + MEMORY listam que CA-14 esta dentro desta fase.
- **G3 do README (shape de `runInit`):** assertions de `dryResult.ctx?.flags?.['__dryRunRecorder']` dependem do shape exato. TODO ADAPTAR inline.
- **G4 do README (`__dryRunRecorder` cast):** decisao do Plano 05 DI-1 — mantido em `ctx.flags` com cast `as unknown as WriteRecorder`. Replicado no Passo 2.
- **G7 do README (runId compartilhado):** assertion condicional no Passo 5.
- **G12 do README (cleanup tolerante Windows):** `safeCleanup` no `afterAll`.
- **G13 do README (CA-14 ordem — sem drift, sem rollback):** assertion explicita esperar 7 subagent_ids exatos, nao 9. Comentario inline justifica ausencia de `detectDrift` e `rollback`.
- **Local — auto-approve do Step 09:** real-run normalmente chama `needsUser` em Step 09. Teste precisa modo nao-interativo. **TODO ADAPTAR:** opts `askUser` injetado ou flag `--auto-approve` (Plano 04 fase-02 decide). Se nao houver mecanismo, abrir DEV-N e considerar rodar com `--additive-merge` (skip 09/10) — mas isso quebra CA-13 parity. Solucao mais limpa: garantir que Plano 04 fase-02 expoe `opts.askUser` callable.
- **Local — path do `agents-log.json`:** PRD diz `discovery/agents-log.json`. Confirmar via `audit-log.ts` se eh `.anti-vibe/discovery/...` ou apenas `discovery/...` no cwd. ADAPTAR via leitura do MEMORY do Plano 06.
- **Local — manifest D29 append entre Step 10 e Step 11:** Plano 04 G10 confirma que ambos compartilham o mesmo `{ts}/manifest.json`. Teste le DEPOIS de ambos terem rodado, entao manifest final tem entries de transform + move.

---

## Verificacao

### TDD

- [ ] **RED:** teste rodando sem Planos 04/05/06 entregues falha em `expect(dryRunPaths).toEqual(realPaths)` (recorder vazio) OU em audit log assertion (entries ausentes).
  - Comando: `bun test tests/e2e/ca13-dry-run-parity.test.ts`
  - Resultado esperado: `Expected [], received [...287 paths...]` OU `subagent_id 'init-secrets-scan' not found`

- [ ] **GREEN:** apos Planos 01-06 entregues, 4 `it` passam.
  - Comando: `bun test tests/e2e/ca13-dry-run-parity.test.ts`
  - Resultado esperado: `4 pass, 0 fail`

### Checklist

- [ ] Arquivo `tests/e2e/ca13-dry-run-parity.test.ts` criado.
- [ ] `bun test tests/e2e/ca13-dry-run-parity.test.ts` retorna `4 pass, 0 fail` em < 90s.
- [ ] Auto-approve do Step 09 funcional — caminho de injecao documentado no comment inline.
- [ ] Path do `agents-log.json` confirmado (cwd-relative — `discovery/agents-log.json` ou `.anti-vibe/discovery/agents-log.json`).
- [ ] Cleanup nao deixa lixo em `os.tmpdir()` (verificar manualmente apos 1 run).
- [ ] `bun test` total ainda verde.
- [ ] `bun run lint` clean no arquivo criado.

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/ca13-dry-run-parity.test.ts` retorna exit 0 com `4 pass, 0 fail`.
- Apos run, `dryRunPaths` (sorted) === `realRunManifest.files.map(originalPath).sort()` (parity byte-a-byte).
- `realRunLog.map(e => e.subagent_id).filter(id => id.startsWith('init-'))` === exatos 7 ids canonicos na ordem do INIT_SUBAGENT_IDS.

**Por humano:** N/A (E2E automatizado).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
