<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): --additive-merge opt-in — SH-09 + D26 + D28`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 05: Additive-Merge Opt-In

**Plano:** 05 — Modos Reversiveis
**Sizing:** 0.5h
**Depende de:** Nenhuma direta (consome apenas os early-skips ja entregues pelo Plano 04 fase-02/03 nos Steps 09/10; toca dispatcher + Step 02)
**Visual:** false

---

## O que esta fase entrega

Cabeamento final do flag `--additive-merge` que preserva comportamento v6.3.x (merge aditivo, sem reescrever CLAUDE.md). Plano 04 ja declarou os early-skips em Steps 09 e 10. Esta fase: (1) garante `parseFlags` reconhece `--additive-merge` (caso Plano 01 nao tenha pre-adicionado); (2) Step 02 (`link-claude-agents`) ganha branch `if (ctx.flags['--additive-merge'] === true)` que aplica logica legada v6.3.x (NAO transforma CLAUDE.md — apenas faz symlink/link 3-tier no formato original); (3) emite terminal warning ao final sugerindo migracao futura.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/parse-flags.ts` | Modify (no-op se Plano 01 ja adicionou) | Confirma que `--additive-merge` eh parseado como boolean. Ja eh free (parser eh generico) — apenas adicionar test pareado |
| `skills/init/lib/parse-flags.test.ts` | Modify | Test: `parseFlags(['--additive-merge']).flags['--additive-merge'] === true` |
| `skills/init/lib/steps/02-link-claude-agents.ts` | Modify | Branch `if (ctx.flags['--additive-merge'] === true) { /* legacy v6.3.x */ } else { /* nova logica do Plano 04 */ }` |
| `skills/init/lib/steps/02-link-claude-agents.test.ts` | Modify | Estende testes existentes com 2 casos novos (additive vs default) |
| `skills/init/lib/run-init.ts` | Modify | Emite log final (via `log` injetado, nao console.warn) quando `ctx.flags['--additive-merge'] === true` apos sucesso do registry |

---

## Implementacao

### Passo 1: Confirmar `parseFlags` ja suporta `--additive-merge`

O parser eh generico — qualquer `--foo` vira `flags.foo = true`. Mas o **alvo** sao testes garantirem que a chave eh ESCRITA EXATAMENTE como `--additive-merge` (com hifens preservados — Plano 01 fase-03 ja confirma o behavior para `--rollback` e `--dry-run`).

```typescript
// skills/init/lib/parse-flags.test.ts (adicao)
// 2026-05-18 (Luiz/dev): Plano 05 fase-05 — confirma reconhecimento de --additive-merge
it('parses --additive-merge as boolean true', () => {
  const parsed = parseFlags(['--additive-merge'])
  expect(parsed.flags['--additive-merge']).toBe(true)
})

it('preserves --additive-merge alongside other flags', () => {
  const parsed = parseFlags(['--additive-merge', '--dry-run'])
  expect(parsed.flags['--additive-merge']).toBe(true)
  expect(parsed.flags['--dry-run']).toBe(true)
})
```

### Passo 2: Adicionar branch em Step 02 `link-claude-agents`

```typescript
// skills/init/lib/steps/02-link-claude-agents.ts (trecho — adicao no inicio do run)
// 2026-05-18 (Luiz/dev): Plano 05 fase-05 — branch legacy v6.3.x. Quando --additive-merge,
// Step 02 mantem comportamento original (CLAUDE.md NAO transformado — Step 10 ja foi pulado).
// Quando default (sem flag), Step 02 ja encontra CLAUDE.md como espelho >= 40 linhas (Plano 04
// fase-06 reorder: Step 10 rodou antes).

import { isDryRun } from '../dry-run-mode'

export const linkClaudeAgentsStep: Step = {
  id: '02-link-claude-agents',
  async run(ctx) {
    if (ctx.flags['--additive-merge'] === true) {
      // 2026-05-18 (Luiz/dev): SH-09 + D26 + D28 — comportamento conservador v6.3.x:
      //   - Step 09 (propose-merge-batch) ja early-skipou (Plano 04 fase-02 G9)
      //   - Step 10 (apply-merge-destructive) ja early-skipou (Plano 04 fase-03 G9)
      //   - Aqui em Step 02: fazer merge ADITIVO entre CLAUDE.md existente (se houver) e AGENTS.md
      //   - NAO reduzir CLAUDE.md a espelho — preservar conteudo original
      return await runLegacyAdditiveMerge(ctx)  // ADAPTAR conforme plano04/MEMORY.md "Lista de testes do Step 02"
    }

    // Caminho default (v6.4.0+): CLAUDE.md ja foi transformado em espelho pelo Step 10.
    // Apenas garante symlink/hardlink/copy 3-tier sobre o arquivo correto.
    return await runMirrorLinking(ctx)
  },
}

// Logica legada v6.3.x — ADAPTAR conforme codigo PRE-Plano 04 fase-06 (reorder). Pode existir
// como funcao isolada em symlink-fallback.ts ou como inline no Step 02 antigo.
async function runLegacyAdditiveMerge(ctx: StepContext): Promise<StepReport> {
  if (isDryRun(ctx)) {
    return { mutated: false, summary: 'dry-run: would apply legacy additive merge (v6.3.x behavior)' }
  }
  // ... codigo legado de merge aditivo + symlink ...
  // 2026-05-18 (Luiz/dev): summary literal "additive-merge" — Plano 06 fase-02 (warning runtime)
  // pode detectar este token nos logs para coletar metricas de opt-in.
  return { mutated: true, summary: 'additive-merge: v6.3.x behavior applied (CLAUDE.md preserved)' }
}

async function runMirrorLinking(ctx: StepContext): Promise<StepReport> {
  // ... logica nova do Plano 04 fase-06 (assume CLAUDE.md ja espelho) ...
  return { mutated: true, summary: 'CLAUDE.md ↔ AGENTS.md linked (mirror format)' }
}
```

### Passo 3: Warning final no `runInit`

```typescript
// skills/init/lib/run-init.ts (apos o for-loop do registry, antes do return final)
// 2026-05-18 (Luiz/dev): Plano 05 fase-05 — warning amarelo sugerindo migracao quando --additive-merge

if (flags['--additive-merge'] === true) {
  log('')
  log('⚠️  Running in --additive-merge mode (v6.3.x behavior).')
  log('   Destructive merge skipped. CLAUDE.md preserved as-is.')
  log('   To migrate later: re-run /anti-vibe-coding:init without --additive-merge.')
  log('')
}
```

Nota: o emoji `⚠️` aparece aqui APENAS porque o usuario configurou explicitamente o uso de emojis no CLI deste plugin (terminal warnings sao convencao do projeto — verificar via `grep -r "⚠️" skills/init/` no codebase atual). Se a convencao real do plugin for sem emoji, substituir por `WARN:` prefixo.

### Passo 4: Suite de 4 testes em `02-link-claude-agents.test.ts`

```typescript
// skills/init/lib/steps/02-link-claude-agents.test.ts (extensao)
import { describe, it, expect } from 'bun:test'
import { linkClaudeAgentsStep } from './02-link-claude-agents'
import type { StepContext } from './types'

const mkCtx = (flags: Record<string, unknown> = {}, cwd = '/tmp'): StepContext => ({
  cwd, args: [], flags: flags as Record<string, boolean | string>,
})

describe('linkClaudeAgentsStep with --additive-merge', () => {
  it('without flag: destructive path (Plano 04 behavior unchanged)', async () => {
    // Default: usa runMirrorLinking — assume CLAUDE.md ja espelho.
    // ADAPTAR: fixture com CLAUDE.md de 36 linhas (espelho) ja existente.
    const report = await linkClaudeAgentsStep.run(mkCtx())
    expect(report.summary).toMatch(/mirror|CLAUDE\.md.*AGENTS\.md/)
  })

  it('with flag: legacy additive merge runs', async () => {
    const report = await linkClaudeAgentsStep.run(mkCtx({ '--additive-merge': true }))
    expect(report.summary).toMatch(/additive-merge.*v6\.3\.x/)
  })

  it('with flag in dry-run: legacy path is simulated', async () => {
    const report = await linkClaudeAgentsStep.run(mkCtx({ '--additive-merge': true, '--dry-run': true }))
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/dry-run.*legacy|legacy.*additive/)
  })

  it('Step 11 still runs (orphans -> docs/references/) regardless of flag', async () => {
    // Cross-check: importa Step 11 e verifica que NAO tem branch additive-merge.
    const { moveDocsWithStubStep } = await import('./11-move-docs-with-stub')
    const src = await import('node:fs').then(fs => fs.promises.readFile('skills/init/lib/steps/11-move-docs-with-stub.ts', 'utf8'))
    expect(src).not.toMatch(/additive-merge/)  // Step 11 should NOT branch on this flag
  })
})
```

### Passo 5: Teste do warning no `run-init.test.ts`

```typescript
// skills/init/lib/run-init-additive-warning.test.ts (novo file ou extensao)
import { describe, it, expect } from 'bun:test'
import { runInit } from './run-init'

describe('runInit with --additive-merge', () => {
  it('emits terminal warning at end', async () => {
    const lines: string[] = []
    const log = (l: string) => { lines.push(l) }
    // Fixture mock registry (vazio ou minimal) injetado via opts.registry
    await runInit(['--additive-merge'], { log, registry: [] })
    const combined = lines.join('\n')
    expect(combined).toMatch(/additive-merge.*v6\.3\.x/i)
    expect(combined).toMatch(/migrate later|re-run.*without/i)
  })

  it('does NOT emit warning without flag', async () => {
    const lines: string[] = []
    await runInit([], { log: (l) => { lines.push(l) }, registry: [] })
    expect(lines.join('\n')).not.toMatch(/additive-merge/)
  })
})
```

---

## Gotchas

- **G6 do plano (additive-merge interaction):** Esta fase nao toca Steps 09/10 — Plano 04 ja entregou os early-skips com `if (ctx.flags['--additive-merge'] === true) return { mutated: false, ... }`. Verificar via `grep "additive-merge" skills/init/lib/steps/09-propose-merge-batch.ts skills/init/lib/steps/10-apply-merge-destructive.ts` retorna `>= 2` antes de comecar esta fase.
- **G10 do plano (terminal warning):** Usar o `log` injetado, NAO `console.warn`. Razao: tests capturam via sink injetado; `console.warn` em test runner spurious-fails CI configurations.
- **G11 do plano (Step 02 legacy branch):** A logica de `runLegacyAdditiveMerge` precisa ser portada do estado pre-Plano-04-fase-06 (reorder). Antes do reorder, Step 02 era responsavel pelo merge inteiro. Apos reorder, Step 10 assumiu o merge destrutivo e Step 02 apenas links. Esta fase RESTAURA o codigo de merge legado COMO OPCAO via flag. `plano04/MEMORY.md` "Lista de testes do Step 02 atualizados em fase-06" lista quais testes foram movidos/adaptados — esta fase pode precisar reverter parte daquilo OU duplicar a logica (decisao a registrar em MEMORY.md como DI-1).
- **Local: a flag `--additive-merge` NAO eh recursiva.** Steps 06/07/08/11/12/91 RODAM em modo additive — apenas Steps 09 e 10 (merge destrutivo) sao pulados. Step 02 ganha o branch legacy. Test #4 da suite confirma que Step 11 nao branch nesse flag.
- **Local: emoji no warning depende de convencao do plugin.** Se `grep "⚠️" skills/init/` retorna 0 matches no codebase atual, substituir por `WARN:` prefix. Registrar decisao em MEMORY.md.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/steps/02-link-claude-agents.test.ts` falha — branches novos nao existem.
  - Comando: `bun run test skills/init/lib/steps/02-link-claude-agents.test.ts`
  - Resultado esperado: `Expected /additive-merge/, received /mirror/` em test #2.

- [ ] **GREEN:** Branches implementados + warning emitido. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/02-link-claude-agents.test.ts skills/init/lib/parse-flags.test.ts skills/init/lib/run-init-additive-warning.test.ts`
  - Resultado esperado: `4 + 2 + 2 passed, 0 failed`.

### Checklist

- [ ] `parseFlags(['--additive-merge']).flags['--additive-merge'] === true` (verificado por test).
- [ ] Step 02 `link-claude-agents` tem 2 branches: `if (ctx.flags['--additive-merge'] === true) { /* legacy */ }` e `else { /* mirror */ }` (verificavel via grep do source).
- [ ] `runInit` emite warning amarelo via `log` injetado quando flag presente.
- [ ] Step 11 NAO tem branch para `--additive-merge` (test #4 valida — orfaos continuam indo para `docs/references/`).
- [ ] Testes passam: 4 em `02-link-claude-agents.test.ts` + 2 em `parse-flags.test.ts` + 2 em `run-init-additive-warning.test.ts`.
- [ ] Lint limpo.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/02-link-claude-agents.test.ts skills/init/lib/parse-flags.test.ts skills/init/lib/run-init-additive-warning.test.ts` retorna `8 passed, 0 failed`.
- `grep -c "additive-merge" skills/init/lib/steps/02-link-claude-agents.ts` retorna `>= 2` (branch + comentario provenance).
- `grep -c "additive-merge" skills/init/lib/steps/11-move-docs-with-stub.ts` retorna `0` (Step 11 nao se importa com a flag).

**Por humano:**
- Apos `init --additive-merge` em repo com CLAUDE.md de 287 linhas, CLAUDE.md continua >40 linhas (NAO foi transformado em espelho) E terminal mostra o warning amarelo.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
