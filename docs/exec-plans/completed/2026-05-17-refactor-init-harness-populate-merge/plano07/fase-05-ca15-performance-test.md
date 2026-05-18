<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: CA-15 Performance Test (500 .md, --dry-run < 120s)

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 0.5h
**Depende de:** Nenhuma das outras fases do Plano 07 (gera fixture proprio em tmpdir); gates externos: Plano 03 fase-04 (Step 07 discover-existing-docs com Glob recursivo), Plano 05 fase-01 (dry-run wiring)
**Visual:** false

---

## O que esta fase entrega

Teste de regressao de performance `tests/e2e/ca15-performance.test.ts` validando CA-15 do PRD: dado um repo com 500 arquivos `.md` distribuidos em 3 diretorios (~167 raiz + ~167 `docs/` + ~166 `.claude/`), `runInit({ args: ['--dry-run'] })` completa em < 120s. Detecta regressao no Step 07 (discover-existing-docs) que faz Glob recursivo whitelisted (Plano 03 fase-04 budget proxy: 50 arquivos < 5s; 500 arquivos extrapolam para ~50s + overhead dos outros steps).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/ca15-performance.test.ts` | Create | Teste com `beforeAll` gerando 500 .md em tmpdir, `it` rodando `runInit --dry-run` medindo `performance.now()`, `afterAll` cleanup tolerante |

**Total:** 1 arquivo novo.

---

## Implementacao

### Passo 1: Setup com fixture sintetico em tmpdir

Conforme **G5 do README**, gerar 500 .md em `os.tmpdir()` (nao em `tests/fixtures/`) para nao poluir git history. Distribuir: ~167 raiz, ~167 `docs/`, ~166 `.claude/`.

```typescript
// tests/e2e/ca15-performance.test.ts
// 2026-05-18 (Luiz/dev): CA-15 do PRD refactor-init-harness-populate-merge.
// Detecta regressao no Step 07 (Glob recursivo whitelisted) em escala 500 .md.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const TOTAL_FILES = 500
const PERF_BUDGET_MS = 120_000 // 120s — CA-15 do PRD

describe('CA-15 performance test — init --dry-run < 120s em 500 .md', () => {
  let tmp: string

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ca15-perf-'))

    // 2026-05-18 (Luiz/dev): batch generation. Em Windows NTFS, gerar 500 small files
    // sem batching satura I/O (GT-? fase-05 do MEMORY). Promise.all em batches de 50.
    await fs.mkdir(path.join(tmp, 'docs'), { recursive: true })
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })

    const distribution: Array<{ dir: string; count: number }> = [
      { dir: tmp, count: 167 },
      { dir: path.join(tmp, 'docs'), count: 167 },
      { dir: path.join(tmp, '.claude'), count: 166 },
    ]

    const tasks: Promise<void>[] = []
    let globalIndex = 0
    for (const { dir, count } of distribution) {
      for (let i = 0; i < count; i++) {
        const filePath = path.join(dir, `synthetic-${String(globalIndex).padStart(4, '0')}.md`)
        const content = `# Synthetic Doc ${globalIndex}\n\nContent placeholder para CA-15 performance test.\n`
        tasks.push(fs.writeFile(filePath, content))
        globalIndex++
      }
    }

    // Batch para nao saturar I/O.
    const BATCH_SIZE = 50
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      await Promise.all(tasks.slice(i, i + BATCH_SIZE))
    }

    // Sanity: contagem.
    const totalCreated = (await Promise.all(
      distribution.map(({ dir }) =>
        fs.readdir(dir).then((entries) => entries.filter((e) => e.endsWith('.md')).length)
      )
    )).reduce((a, b) => a + b, 0)
    expect(totalCreated).toBe(TOTAL_FILES)
  }, 60_000) // 60s budget para setup

  afterAll(async () => {
    try {
      await fs.rm(tmp, { recursive: true, force: true })
    } catch {
      // G12 do README — Windows handle leak tolerated
    }
  })
})
```

### Passo 2: Test case — medir elapsed do `runInit --dry-run`

```typescript
  it('runInit --dry-run em 500 .md completa em < 120s', async () => {
    // 2026-05-18 (Luiz/dev): performance.now() medindo o dispatcher completo.
    // CA-15 do PRD detecta regressao Step 07 (Glob recursivo).
    const t0 = performance.now()
    const result = await runInit({ args: ['--dry-run'], cwd: tmp })
    const elapsed = performance.now() - t0

    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS)

    // Side-channel: confirma que dry-run nao mutou o fixture.
    const filesInTmp = await fs.readdir(tmp)
    expect(filesInTmp).not.toContain('.anti-vibe')
  }, PERF_BUDGET_MS + 30_000) // test timeout 150s (margem para teardown)
```

### Passo 3: Considerar skip condicional (opcional)

Conforme **G5 do README**, NAO aplicar skip preventivamente. Apenas adicionar comentario documentando que se flakiness aparecer em CI lento, considerar:

```typescript
  // 2026-05-18 (Luiz/dev): se CI lento (NTFS, runners shared) causar flakiness >5%,
  // considerar test.skipIf(process.env.CI === 'true' && process.env.SLOW_FS === '1').
  // NAO aplicado preventivamente — apenas reativo.
```

### Passo 4: Lint + run local

```bash
bun run lint tests/e2e/ca15-performance.test.ts
time bun test tests/e2e/ca15-performance.test.ts
# Esperado: 1 pass, 0 fail. real <= 130s (budget + teardown).
```

---

## Gotchas

- **G5 do README (geracao em tmpdir, nao em tests/fixtures/):** fixture sintetico fica em `os.tmpdir()` para nao poluir git. Cleanup garantido em `afterAll`.
- **G12 do README (cleanup tolerante a Windows):** `try/catch` silencioso em `afterAll`.
- **Local — batching para Windows NTFS:** sem batch, 500 `Promise.all` paralelas saturam I/O e setup leva >60s. `BATCH_SIZE = 50` resolve.
- **Local — budget de setup vs teste:** setup tem timeout 60s (geracao), teste tem timeout `120s + 30s = 150s`. Documentar nos `it`/`beforeAll` timeouts.
- **Local — `runInit --dry-run` em fixture sem CLAUDE.md:** mesma logica do greenfield (Steps 09/10/11 sao no-ops). Step 07 ainda escaneia os 500 .md — eh exatamente o que CA-15 mede.
- **Local — falso positivo em laptop lento:** dev rodando em maquina antiga pode ver elapsed >120s. Documentar no MEMORY que CA-15 eh budget de **CI canonico**; falha local pode ser por hardware. Se persistir, abrir DEV-N e considerar ajuste do budget (PRD eh autorial — 120s veio do dev).

---

## Verificacao

### TDD

- [ ] **RED:** se Step 07 do Plano 03 tiver regressao (ex: Glob nao usar blacklist + leu node_modules inflando para >10k arquivos), o teste passa de 120s e falha.
  - Comando: `bun test tests/e2e/ca15-performance.test.ts`
  - Resultado esperado em regressao: `Expected elapsed < 120000, received 145232.4`

- [ ] **GREEN:** com Step 07 entregue conforme Plano 03 fase-04, elapsed deve ficar tipicamente em 30-70s (proxy do budget local 50 < 5s extrapolado).
  - Comando: `bun test tests/e2e/ca15-performance.test.ts`
  - Resultado esperado: `1 pass, 0 fail` em < 120s

### Checklist

- [ ] Arquivo `tests/e2e/ca15-performance.test.ts` criado.
- [ ] `bun test tests/e2e/ca15-performance.test.ts` retorna `1 pass, 0 fail` localmente.
- [ ] Elapsed reportado pelo `time bun test ...` < 120s.
- [ ] Cleanup do tmpdir nao deixa 500 .md em `os.tmpdir()` apos run.
- [ ] `bun run lint` clean no arquivo criado.

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/ca15-performance.test.ts` retorna exit 0.
- `elapsed` no log da execucao do `it` < `120000` (assertion explicita do `expect`).

**Por humano (sanidade):**
- Apos run, `os.tmpdir()` nao tem mais `ca15-perf-*` subdirs (cleanup OK).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
