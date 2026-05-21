<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 06: Tracer Bullet E2E (Greenfield Init Verde)

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 0.5h
**Depende de:** fase-04 (registry novo com 10 entries: 2 reais + 8 stubs)
**Visual:** false

---

## O que esta fase entrega

Teste e2e em `tests/e2e/init-v7-tracer-bullet.test.ts` que:
1. Cria fixture greenfield (`package.json` minimo, sem `.claude/`, sem `docs/`)
2. Invoca `runInit([])` apontando para a fixture
3. Verifica que os **10 steps** do registry novo executam em ordem (asserta sequencia de step.ids no log)
4. Verifica que Step 2 (detect) populou `ctx.legacy` e `ctx.stack` (via summary do log)
5. Verifica que Step 1 (gate) NAO disparou em greenfield
6. Verifica exit code 0 (`result.kind === 'ok'`)

Este eh o tracer bullet do projeto inteiro — prova que o pipeline novo funciona ponta-a-ponta.

**Mudanca vs versao original:** pipeline tem 10 steps (DV-1 + DV-3), nao 8.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/init-v7-tracer-bullet.test.ts` | Create | E2E novo, isolado, usa registry de producao via lazyImport |
| `tests/e2e/__fixtures__/init-v7-greenfield/package.json` | Create | Fixture minima: `{ "name": "v7-greenfield", "devDependencies": { "typescript": "^5" } }` |

---

## Implementacao

### Passo 1: Criar fixture greenfield

```bash
mkdir -p tests/e2e/__fixtures__/init-v7-greenfield
```

```json
// tests/e2e/__fixtures__/init-v7-greenfield/package.json
{
  "name": "v7-greenfield",
  "version": "0.0.0",
  "devDependencies": { "typescript": "^5" }
}
```

> Nao commitar nenhum `.claude/` ou `docs/` — fixture deve simular projeto Node.js zerado.

### Passo 2: Escrever o tracer

```typescript
// tests/e2e/init-v7-tracer-bullet.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-06 — tracer bullet do init v7.
// Prova que o pipeline novo (registry com 10 entries — D12 revisada por DV-1+DV-3)
// executa ponta-a-ponta em greenfield. Steps 1-2 reais; outros 8 stubs.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { cpSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInit } from '../../skills/init/lib/run-init'

describe('init v7 tracer bullet (Plano 01 fase-06)', () => {
  let cwd: string
  const logs: string[] = []

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'init-v7-tracer-'))
    cpSync(
      path.join(__dirname, '__fixtures__', 'init-v7-greenfield'),
      cwd,
      { recursive: true },
    )
    logs.length = 0
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  test('greenfield: 10 steps executam em ordem D12 revisada, exit 0', async () => {
    const result = await runInit([], {
      cwd,
      log: (line: string) => logs.push(line),
    })

    // 1. Exit ok (gate nao dispara em greenfield)
    expect(result.kind).toBe('ok')

    // 2. Ordem dos 10 steps no log (cada step emite `[<id>] <summary>`)
    const stepLogPattern = /^\[([^\]]+)\]/
    const stepIds = logs
      .map(l => l.match(stepLogPattern)?.[1])
      .filter((id): id is string => id !== undefined)
      .filter((id, i, arr) => arr[i - 1] !== id || i === 0)

    expect(stepIds).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      'secrets-scan',
      'migrate-planning-and-manifest',
      'scaffold-and-link',
      'install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
    ])

    // 3. Step 1 (gate) passou silencioso em greenfield
    const gateLog = logs.find(l => l.startsWith('[reentry-gate]'))
    expect(gateLog).toContain('no prior manifest')

    // 4. Step 2 (detect) detectou stack node-ts
    const detectLog = logs.find(l => l.startsWith('[detect-legacy-and-stack]'))
    expect(detectLog).toContain('stack=node-ts')
    expect(detectLog).toContain('no legacy artifacts')
  })

  test('legacy-manifest.json minimo eh escrito quando Step 4 (migrate) estiver real (Plano 02). Por ora: TODO', () => {
    // 2026-05-21 (Luiz/dev): este sub-teste e o gancho para Plano 02 endurecer.
    // Aqui apenas documenta a intencao. Plano 02 fase-final substitui pela assercao real:
    //   expect(existsSync(path.join(cwd, '.claude', 'legacy-manifest.json'))).toBe(true)
    //   const manifest = JSON.parse(readFileSync(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf-8'))
    //   expect(manifest.legacy).toEqual([])
    expect(true).toBe(true)  // placeholder ate Plano 02 implementar Step 4
  })

  test('re-run em projeto ja inicializado: aborta com code=10 (DR-1, DV-3)', async () => {
    // simular manifest pre-existente — Step 1 (gate) deve abortar antes do Step 2
    const fs = await import('node:fs/promises')
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude', 'legacy-manifest.json'),
      JSON.stringify({ schemaVersion: '1.0', legacy: [] }),
    )

    const result = await runInit([], {
      cwd,
      log: (line: string) => logs.push(line),
    })

    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(10)
      expect(result.reason).toContain('already initialized')
    }

    // 4. Gate aborta ANTES de qualquer outro step rodar — log do detect NAO existe
    const detectLog = logs.find(l => l.startsWith('[detect-legacy-and-stack]'))
    expect(detectLog).toBeUndefined()
  })
})
```

### Passo 3: Rodar e estabilizar

```bash
bun test tests/e2e/init-v7-tracer-bullet.test.ts
# Esperado (apos fase-04): 3 pass, 0 fail
```

Se algum step stub estiver emitindo summary diferente do esperado (ex: log nao casa com regex
`^\[([^\]]+)\]`), ajustar o filtro. Nao mudar os stubs — mudar o filtro no teste.

### Passo 4: Re-rodar apos fase-05 (delete)

Apos `fase-05` deletar os 15+ steps obsoletos, repetir o comando acima. Resultado deve ser
identico (3 pass). Se algum teste quebrar: regressao introduzida pelo delete.

---

## Gotchas

- **G1 (R6 critica):** este teste eh o sensor de R6 (delete em cascata quebra dispatcher).
  Deve permanecer verde antes E depois da fase-05. Se quebrar apos fase-05, fazer revert.
- **G2 (run-init.ts vestiges):** o dispatcher ainda tem cross-upgrade-detector e WriteRecorder
  logic. Pode emitir logs adicionais (warning amarelo, etc) — o filtro do tracer ignora linhas
  que nao casam com `^\[<id>\]`. NAO mudar run-init.ts neste plano.
- **G3 (DV-3 — gate em Step 1 proprio):** o gate de re-entrada agora roda como Step 1 separado
  (`reentry-gate`). Em greenfield: gate passa silencioso, Step 2 (detect) prossegue. Em
  projeto ja inicializado: gate aborta com code=10 ANTES do detect rodar (subteste prova).
- **G4 (no fixture commit):** garantir que fixture nao tem nenhum `.claude/` commitado por engano
  — `ls -la tests/e2e/__fixtures__/init-v7-greenfield/` deve mostrar so `package.json`.
- **G5 (askUser nao injetado):** Step 8 stub (delivery-loop) nao chama askUser, retorna direto.
  Plano 05 introduz askUser real e atualiza esta fase para injetar stub. Por ora: stub nao precisa.
- **G6 (tracer dual-fase):** este teste roda 2x no Plano 01 — depois de fase-04 (validacao do
  registry novo) e depois de fase-05 (validacao do delete). Anotar nos commit messages.
- **G7 (DV-1 — secrets-scan eh Step 3 stub):** Step 3 (`secrets-scan`) eh stub nesta fase.
  Plano 02 endurece com logica real do step antigo (`06-secrets-scan.ts` deletado em fase-05).

---

## Verificacao

### TDD

- [ ] **RED:** Teste "10 steps executam em ordem" falha por step ids nao corresponderem (rodar antes de fase-04 terminar — 21 ids vs 10 esperados)
  - Comando: `bun test tests/e2e/init-v7-tracer-bullet.test.ts --grep "10 steps"`
  - Resultado esperado: `Expected [...21 ids...] to equal [...10 ids...]`

- [ ] **GREEN:** Apos fase-04 terminar, todos os 3 testes passam
  - Comando: `bun test tests/e2e/init-v7-tracer-bullet.test.ts`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] Fixture `tests/e2e/__fixtures__/init-v7-greenfield/package.json` criada (1 unico arquivo)
- [ ] Teste roda em < 5s (greenfield + 10 steps mayoritariamente stubados eh barato)
- [ ] Assertions de ordem dos 10 step.ids passam
- [ ] Assertion `result.kind === 'ok'` em greenfield passa
- [ ] Assertion do gate (code=10) passa quando manifest pre-existente
- [ ] Assertion de "detect nao rodou" no caso aborted passa (DV-3 — gate antes do detect)
- [ ] Teste roda verde ANTES de fase-05 (delete)
- [ ] Teste roda verde APOS fase-05 (delete) — re-execucao explicita
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-v7-tracer-bullet.test.ts` retorna `3 pass, 0 fail` (executado 2x: pre e pos fase-05)
- Comando completa em < 5s

**Por humano:**
- Dev humano confirma que tracer eh "tracer bullet do projeto inteiro" (citado no PLAN.md linha 14)
- Code review confirma que teste usa `runInit` real (nao registry mockado)

---

<!-- Gerado por /plan-feature em 2026-05-20, revisto apos DV-1 + DV-3 em 2026-05-21 -->
