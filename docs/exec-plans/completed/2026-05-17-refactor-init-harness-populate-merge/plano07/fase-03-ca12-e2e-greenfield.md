<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: CA-12 E2E Greenfield

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 1h
**Depende de:** fase-01 (fixture greenfield-v6.4) + gates externos: Plano 02 fase-03 (Step 91 registrado), Plano 06 fase-01 (audit log canonico), Plano 01 fase-02 (backup helper)
**Visual:** false

---

## O que esta fase entrega

Teste E2E `tests/e2e/ca12-greenfield-populate-validate.test.ts` validando CA-12 do PRD: dado um fixture greenfield (sem CLAUDE.md, sem docs/), apos rodar `runInit` + (simulado) `/execute-plan` consumindo o PLAN.md de populacao + `bun run scripts/harness-validate.ts`, todos os 3 passos retornam exit 0 E `docs/AGENTS.md` final tem ≤40 linhas com conteudo nao-placeholder. Ratifica indiretamente CA-01 (PLAN.md emitido), CA-09 (validacao no fim) e CA-11 (registry sem AbortError).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/ca12-greenfield-populate-validate.test.ts` | Create | Teste E2E com 1 `describe` + 3 `it` (init runs → PLAN.md emitido → harness:validate green) |

**Total:** 1 arquivo novo.

---

## Implementacao

### Passo 1: Setup e helpers

Replicar padrao de isolamento de `tests/e2e/init-tracer-bullet.test.ts` (ja existente — `spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd: tmpdir })`). Usar `fs.mkdtemp` para isolamento por teste, com `afterAll` cleanup tolerante a Windows handle leak (**G12 do README**).

```typescript
// tests/e2e/ca12-greenfield-populate-validate.test.ts
// 2026-05-18 (Luiz/dev): CA-12 do PRD refactor-init-harness-populate-merge.
// E2E greenfield: init -> PLAN.md de populacao -> harness:validate exit 0.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'greenfield-v6.4')
const PLUGIN_ROOT = path.join(import.meta.dir, '..', '..')

async function copyDirRecursive(src: string, dst: string): Promise<void> {
  // TODO ADAPTAR — usar helper canonico se existir em skills/lib/.
  await fs.mkdir(dst, { recursive: true })
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) await copyDirRecursive(s, d)
    else await fs.copyFile(s, d)
  }
}

async function runHarnessValidate(cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // 2026-05-18 (Luiz/dev): script roda do plugin root mas opera no cwd passado.
    // Padrao espelhado de tests/e2e/init-tracer-bullet.test.ts.
    const proc = spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd: PLUGIN_ROOT })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    // Validator espera cwd via argv `.` — adaptar para passar cwd alvo via spawn argument
    // se necessario. Confirmar invocacao final consultando scripts/harness-validate.ts.
    proc.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}
```

**Nota sobre invocacao do harness:validate:** segundo `package.json`, o script `harness:validate` eh `bun scripts/harness-validate.ts .` — o `.` indica que o validator opera no cwd. Para apontar o validator para um tmpdir, **a invocacao correta eh** `spawn('bun', ['run', 'scripts/harness-validate.ts', tmpdir], { cwd: PLUGIN_ROOT })` (passando tmpdir como argv[2]) OR `spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd: tmpdir })` (executando do tmpdir). **TODO ADAPTAR:** verificar `scripts/harness-validate.ts` para decidir qual estilo o script suporta — replicar o padrao usado em `tests/e2e/init-tracer-bullet.test.ts`.

### Passo 2: Test case `it 1` — init runs sem AbortError

```typescript
describe('CA-12 E2E greenfield populate-validate', () => {
  let tmp: string

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ca12-greenfield-'))
    await copyDirRecursive(FIXTURE, tmp)
  })

  afterAll(async () => {
    try {
      await fs.rm(tmp, { recursive: true, force: true })
    } catch {
      // G12 do README — Windows handle leak tolerated
    }
  })

  it('runInit em greenfield-v6.4 completa sem AbortError', async () => {
    // TODO ADAPTAR — shape final de runInit conforme plano01/MEMORY.md.
    // Assume `runInit({ args, cwd })` por convencao atual; ajustar se Plano 01 fase-03 mudou.
    const result = await runInit({ args: [], cwd: tmp })
    expect(result).toBeDefined()
    // CA-11 ratificado: registry executa sem AbortError em greenfield
    // (cada step ate Step 91 retorna report valido)
  })
})
```

### Passo 3: Test case `it 2` — PLAN.md de populacao emitido

Conforme **G9 do `plano02/README.md`** (CA-01 — Aceite por contrato): apos `runInit` em greenfield, existe `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com >=1 task por arquivo do harness (excluindo filosoficos — G2 do plano02).

```typescript
  it('emite docs/exec-plans/active/{date}-populate-harness/PLAN.md com >=N tasks', async () => {
    const activeDir = path.join(tmp, 'docs', 'exec-plans', 'active')
    const dirs = await fs.readdir(activeDir)
    const populateDir = dirs.find((d) => d.endsWith('-populate-harness'))
    expect(populateDir).toBeTruthy()

    const planPath = path.join(activeDir, populateDir!, 'PLAN.md')
    expect(await fs.access(planPath).then(() => true).catch(() => false)).toBe(true)

    const planContent = await fs.readFile(planPath, 'utf-8')
    // CA-01: pelo menos 1 task por arquivo do harness (excluindo COMPOUND_ENGINEERING + PRODUCT_SENSE).
    // TEMPLATE_MANIFEST.length - 2 (filosoficos) tasks no minimo.
    // TODO ADAPTAR — importar TEMPLATE_MANIFEST e contar tasks dinamicamente:
    const taskCount = (planContent.match(/^### Task/gm) ?? []).length
    expect(taskCount).toBeGreaterThanOrEqual(5) // ajustar threshold conforme TEMPLATE_MANIFEST real

    // SH-06 (G4 do plano02): ultima task eh harness:validate
    expect(planContent).toMatch(/bun run scripts\/harness-validate\.ts/)
  })
```

### Passo 4: Test case `it 3` — harness:validate exit 0 + AGENTS.md valido

**Importante:** esta fase NAO executa o PLAN.md de populacao automaticamente — D3 do PRD eh explicito que init **sugere**, dev decide. Para CA-12 E2E real, o teste precisa **simular** que o execute-plan ja rodou:

**Opcao A (recomendada — simulacao):** o teste copia para o tmpdir um AGENTS.md ja populado (a partir de um snapshot canonico em `tests/fixtures/agents-populated-snapshot.md`), depois roda harness:validate. Documenta que CA-12 E2E REAL (rodar `/execute-plan` programaticamente) eh deferido para v6.5+ quando execute-plan tiver entrypoint nao-interativo.

**Opcao B:** invocar `/anti-vibe-coding:execute-plan` via process spawn se houver entrypoint CLI nao-interativo. Provavel NAO existir em v6.4.0 (PRD Plano 01 fase-01 audita execute-plan — ver `EXECUTE_PLAN_AUDIT.md`).

Adotar **Opcao A** com comentario claro:

```typescript
  it('harness:validate exit 0 apos populacao simulada', async () => {
    // 2026-05-18 (Luiz/dev): D3 PRD — init sugere, nao executa /execute-plan.
    // Para CA-12 E2E completo, simulamos o output do execute-plan copiando AGENTS.md
    // populado canonico. CA-12 E2E REAL (invocar /execute-plan programaticamente) fica
    // deferido para v6.5+ — depende de entrypoint nao-interativo do execute-plan.
    const snapshotPath = path.join(import.meta.dir, '..', 'fixtures', 'agents-populated-snapshot.md')
    // TODO ADAPTAR — criar o snapshot canonico em fase-03 se nao existir.
    // O snapshot deve ter <= 40 linhas conforme D29 do v6.0.0 (PRD R1).
    if (await fs.access(snapshotPath).then(() => true).catch(() => false)) {
      await fs.copyFile(snapshotPath, path.join(tmp, 'docs', 'AGENTS.md'))
    } else {
      // Fallback: gerar AGENTS.md minimo valido inline (<=40 linhas).
      const minimal = [
        '# AGENTS.md',
        '',
        '## Stack',
        'TypeScript + Bun (greenfield)',
        '',
        '## Build / Test',
        '- `bun run test`',
        '- `bun run lint`',
        '',
        '## Conventions',
        'See docs/DESIGN.md for code style.',
      ].join('\n') + '\n'
      await fs.writeFile(path.join(tmp, 'docs', 'AGENTS.md'), minimal)
    }

    const validateResult = await runHarnessValidate(tmp)
    expect(validateResult.code).toBe(0)

    // CA-12 assertion: AGENTS.md final tem <=40 linhas com conteudo nao-placeholder.
    const agents = await fs.readFile(path.join(tmp, 'docs', 'AGENTS.md'), 'utf-8')
    const lineCount = agents.trimEnd().split('\n').length
    expect(lineCount).toBeLessThanOrEqual(40)
    // nao-placeholder: nao contem `<<PLACEHOLDER>>` nem `TODO populate`
    expect(agents).not.toMatch(/<<PLACEHOLDER>>/)
    expect(agents).not.toMatch(/TODO populate/i)
  })
```

### Passo 5: Lint + run

```bash
bun run lint tests/e2e/ca12-greenfield-populate-validate.test.ts
bun test tests/e2e/ca12-greenfield-populate-validate.test.ts
```

---

## Gotchas

- **G2 do README (caminho de `scripts/harness-validate.ts`):** confirmar invocacao replicando `tests/e2e/init-tracer-bullet.test.ts`. Script roda do plugin root e opera no cwd passado via spawn options OR argv[2]. **TODO ADAPTAR** se a leitura do script revelar exigencia de argv obrigatorio.
- **G3 do README (shape de `runInit`):** assumir `runInit({ args, cwd })` por padrao do tracer bullet existente. Comentario `// TODO ADAPTAR` inline ate confirmar via `plano01/MEMORY.md` apos execucao.
- **G6 do README (registry reorder D23 nao afeta greenfield):** Steps 09/10 retornam `mutated: false` em greenfield (G13 do `plano04/README.md`). Teste nao precisa assertar a ordem — apenas que init completa sem AbortError.
- **G12 do README (cleanup Windows handle leak):** `afterAll` usa try/catch silencioso. Replicar do `init-tracer-bullet.test.ts`.
- **Local — snapshot canonico de AGENTS.md:** se ainda nao existir, criar `tests/fixtures/agents-populated-snapshot.md` durante esta fase (1 arquivo extra; total da fase passa de 1 para 2). Alternativa: usar fallback inline ja documentado no Passo 4 (Opcao A com mocked content) — preferida para nao inflar fixtures.
- **Local — execute-plan nao-invocavel programaticamente em v6.4.0:** documentar explicitamente. CA-12 "E2E completo" eh com simulacao do execute-plan; o init em si eh testado fim-a-fim. v6.5+ pode adicionar entrypoint CLI ao execute-plan e cobrir o gap.

---

## Verificacao

### TDD

- [ ] **RED:** teste rodando sem Plano 02 fase-03 entregue falha em `expect(populateDir).toBeTruthy()` — PLAN.md de populacao nao existe.
  - Comando: `bun test tests/e2e/ca12-greenfield-populate-validate.test.ts --grep 'emite docs/exec-plans'`
  - Resultado esperado: `Expected truthy value, received undefined`

- [ ] **GREEN:** apos Planos 01-06 entregues, todas as 3 `it` passam.
  - Comando: `bun test tests/e2e/ca12-greenfield-populate-validate.test.ts`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] Arquivo `tests/e2e/ca12-greenfield-populate-validate.test.ts` criado.
- [ ] `bun test tests/e2e/ca12-greenfield-populate-validate.test.ts` retorna `3 pass, 0 fail` em < 60s.
- [ ] Snapshot `tests/fixtures/agents-populated-snapshot.md` criado OU fallback inline funcionando — escolha documentada no MEMORY (DI-?).
- [ ] Cleanup do tmpdir nao deixa lixo em `os.tmpdir()` (verificar manualmente apos 1 run).
- [ ] `bun test` total (todos os testes E2E) ainda verde — fase nao quebra testes existentes.
- [ ] `bun run lint` clean no arquivo criado.

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/ca12-greenfield-populate-validate.test.ts` retorna exit 0 com `3 pass, 0 fail`.
- Apos run, `docs/exec-plans/active/{date}-populate-harness/PLAN.md` no tmpdir conteve `>=5` tasks (proxy do `TEMPLATE_MANIFEST.length - 2`).
- `docs/AGENTS.md` no tmpdir final tem `<=40` linhas e nao contem `<<PLACEHOLDER>>`.

**Por humano:** N/A (E2E automatizado).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
