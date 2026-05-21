<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Re-Entry Gate (Step 1 Separado — `01-reentry-gate.ts`)

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 1h
**Depende de:** fase-02 (apenas para tipo `StepContext` estendido — gate em si independente)
**Visual:** false

---

## O que esta fase entrega

Step 1 do pipeline v7: `01-reentry-gate.ts`. Se `.claude/legacy-manifest.json` ja existe no projeto,
aborta com `AbortError(code=10)` e mensagem instruindo o usuario a esperar `/init:refresh` (D13).
Implementa DR-1 + decisao **DV-3** (gate em step proprio, separado do detect).

**Mudanca de escopo (DV-3 fechada apos geracao inicial):** gate NAO esta mais embutido no Step 2
(detect-legacy-and-stack). E um step proprio que roda ANTES do detect — assim, em projeto ja
inicializado, evitamos o custo de I/O do detect. Pipeline final tem **10 steps** (era 8).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/01-reentry-gate.ts` | Create | Novo step proprio. Apenas le `fs.stat` do manifest e decide abort |
| `skills/init/lib/steps/01-reentry-gate.test.ts` | Create | Testes: manifest existente aborta com code=10, manifest ausente passa silencioso, path eh diretorio passa silencioso |

---

## Implementacao

### Passo 1: Criar o step

```typescript
// skills/init/lib/steps/01-reentry-gate.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-03 — DR-1 do PLAN.md + DV-3 (gate em step proprio).
// Roda ANTES do Step 2 (detect-legacy-and-stack) para evitar custo de I/O do detect
// em projeto ja inicializado. /init:refresh fica para D13 (adiado).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { AbortError } from './abort-error'
import type { Step } from './types'

async function manifestExists(cwd: string): Promise<string | null> {
  const manifestPath = path.join(cwd, '.claude', 'legacy-manifest.json')
  try {
    const stat = await fs.stat(manifestPath)
    return stat.isFile() ? manifestPath : null
  } catch {
    return null
  }
}

export const reentryGateStep: Step = {
  id: 'reentry-gate',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): code 10 reservado para re-entry blocks.
    // Codes 1-2 sao usados por detect-legacy v6.7 (sera deletado em fase-05) — manter livre.
    const existing = await manifestExists(ctx.cwd)
    if (existing !== null) {
      throw new AbortError({
        code: 10,
        reason:
          `Project already initialized (legacy-manifest found at ${path.relative(ctx.cwd, existing)}).\n` +
          'Re-running /init is not supported in v7. Use /init:refresh when available (D13, post-v7).\n' +
          'If you need to force a re-init, delete the manifest manually and re-run.',
      })
    }

    return { mutated: false, summary: 'no prior manifest — proceeding' }
  },
}
```

### Passo 2: Testes RED → GREEN

```typescript
// skills/init/lib/steps/01-reentry-gate.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { reentryGateStep } from './01-reentry-gate'
import { AbortError } from './abort-error'

describe('reentryGateStep (DR-1 / DV-3)', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'init-v7-gate-'))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  test('manifest existente: aborta com code=10', async () => {
    await mkdir(path.join(cwd, '.claude'), { recursive: true })
    await writeFile(
      path.join(cwd, '.claude', 'legacy-manifest.json'),
      JSON.stringify({ schemaVersion: '1.0', legacy: [] }),
    )
    const ctx = { cwd, args: [], flags: {} } as any
    let thrown: unknown = null
    try {
      await reentryGateStep.run(ctx)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(AbortError)
    expect((thrown as AbortError).code).toBe(10)
    expect((thrown as AbortError).reason).toContain('already initialized')
    expect((thrown as AbortError).reason).toContain('/init:refresh')
  })

  test('manifest ausente: prossegue (mutated=false)', async () => {
    const ctx = { cwd, args: [], flags: {} } as any
    const report = await reentryGateStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('no prior manifest')
  })

  test('path do manifest eh diretorio (defensive): NAO aborta', async () => {
    await mkdir(path.join(cwd, '.claude', 'legacy-manifest.json'), { recursive: true })
    const ctx = { cwd, args: [], flags: {} } as any
    const report = await reentryGateStep.run(ctx)
    expect(report.mutated).toBe(false)
  })
})
```

### Passo 3: Reservar code=10 em documentacao

Anotar em `plano01/MEMORY.md` (secao Decisoes de Implementacao) que `AbortError.code = 10`
fica reservado para "re-entry blocks". Codes ja em uso:
- `1`, `2` — detect-legacy v6.7 (sera deletado fase-05)
- `10` — re-entry (NOVO, esta fase)

---

## Gotchas

- **G1 (D13 — wording cuidadoso):** `/init:refresh` NAO existe. Texto do AbortError diz
  "when available" para nao prometer feature inexistente. NAO mencionar flag `--refresh`.
- **G2 (defensive read):** Se o manifest existir mas for JSON invalido, o gate ainda dispara
  porque so checa existencia/file-ness via `fs.stat`. Parser fica para Plano 02.
- **G3 (compat v6.7):** Projetos v6.7 NAO tem `.claude/legacy-manifest.json` — usam
  `.claude/.anti-vibe-manifest.json`. Gate checa apenas o nome novo do v7, entao projetos v6.7
  prosseguem normalmente para o Step 2 (detect) e sao tratados como upgrade path.
- **G4 (DV-3 vs versao original):** A versao anterior desta fase modificava o Step 1
  (detect-legacy-and-stack) adicionando o gate inline. Decisao DV-3 separou em step proprio.
  Beneficio: SRP, gate testavel isoladamente, evita custo de detect se gate aborta.
  Custo: pipeline tem 10 steps em vez de 9 — refletido em PLAN.md.
- **G5 (dependencia trivial com fase-02):** Apesar de listada como `Depende de: fase-02`, esta
  fase nao importa nada de fase-02. A dependencia eh apenas semantica (ordem no registry).
  Pode ser executada em paralelo a fase-02 se for conveniente.

---

## Verificacao

### TDD

- [ ] **RED:** Teste "manifest existente: aborta com code=10" escrito e FALHA por step nao existir
  - Comando: `bun test skills/init/lib/steps/01-reentry-gate.test.ts`
  - Resultado esperado: `Cannot find module './01-reentry-gate'`

- [ ] **GREEN:** Step criado, todos os 3 testes passam
  - Comando: `bun test skills/init/lib/steps/01-reentry-gate.test.ts`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] `skills/init/lib/steps/01-reentry-gate.ts` criado, < 40 linhas
- [ ] AbortError code=10 documentado em MEMORY.md como reservado para re-entry
- [ ] Mensagem do AbortError menciona `/init:refresh` com "when available (D13)" (nao promete feature)
- [ ] `bun test skills/init/lib/steps/01-reentry-gate.test.ts` verde (3 testes)
- [ ] `bun run lint` limpo
- [ ] Gate eh puro — NAO importa `detect-stack` ou `detect-v5-legacy`
- [ ] `grep -c "writeFile\|mkdir" skills/init/lib/steps/01-reentry-gate.ts` retorna `0` (read-only puro)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/01-reentry-gate.test.ts` retorna `3 pass, 0 fail`
- `grep -c "/init:refresh" skills/init/lib/steps/01-reentry-gate.ts` retorna `>= 1`
- `grep -c "code: 10" skills/init/lib/steps/01-reentry-gate.ts` retorna `>= 1`
- `grep -c "detect" skills/init/lib/steps/01-reentry-gate.ts` retorna `0` (gate isolado)

**Por humano:**
- Code review confirma que step apenas verifica `fs.stat` e aborta — nenhuma logica de detect

---

<!-- Gerado por /plan-feature em 2026-05-21 (revisto apos DV-3) -->
