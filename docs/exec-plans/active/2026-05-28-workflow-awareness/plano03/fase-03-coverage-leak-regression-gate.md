<!--
Princípio universal #5 — Comment Provenance.
Esta fase cria um teste e2e (.ts). O comentário de provenance dos asserts vai inline no teste,
seguindo a convenção dos demais tests/e2e/ (autor/data/decisão).
Provenance da decisão: PRD RF15 (estendido às 3 superfícies de cobertura); CONTEXT D5/INV6; PLAN R3.
-->

# Fase 03: Gate de Regressão de Cobertura (grill-me + consultant + stop-reflector)

**Plano:** 03 — Cobertura (grill-me + consultant + retrospectivo)
**Sizing:** 0.75h
**Depende de:** fase-01 (grill-me + consultant), fase-02 (stop-reflector) — assere o produto conjunto das 3 superfícies
**Visual:** false

---

## O que esta fase entrega

Um teste e2e NOVO (`tests/e2e/workflow-coverage-leak.test.ts`) que prova, por máquina, que as 3
superfícies de cobertura deste plano (grill-me, consultant, stop-reflector) (a) NÃO emitem a tool
Workflow (`Workflow(`) nem um `decision:block` NOVO/extra, e (b) contêm os marcadores suggest-only
(INV6) obrigatórios. O gate também RE-EXECUTA o hook-test da fase-02 e o teste de diretriz do Plano 01,
fechando a "sugere, nunca executa" para as superfícies que o Plano 02 não cobre.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/workflow-coverage-leak.test.ts` | Create | Teste NOVO (`bun:test`). Scan de grill-me + consultant (prosa) + import do `stop-reflector.cjs` (runtime). Negativos (`Workflow(` ausente; sem 2º `decision:block`) + positivos (marcadores INV6). |

> **Decisão de design do gate (registrar na MEMORY — DI-Plano03-fase03-gate-file): STANDALONE, NÃO estende os gates dos outros planos.**
> - O `tests/e2e/workflow-advisor-directive.test.ts` (Plano 01 fase-04) é **hook-scoped** (caminhos do `[WORKFLOW_ADVISOR]` em `user-prompt-gate.cjs`).
> - O `tests/e2e/workflow-prose-leak.test.ts` (Plano 02 fase-06) cobre as 5 skills + 2 docs do Plano 02 — **outras superfícies**, e o Plano 02 roda em PARALELO a este (sem ownership cruzado).
> - Este plano cobre grill-me + consultant + stop-reflector. Estender qualquer um dos outros dois misturaria ownership entre planos paralelos. Por isso a fase-03 cria arquivo NOVO. O gate RE-EXECUTA o hook-test da fase-02 e o teste de diretriz do Plano 01 como parte da verificação — sem mesclar arquivos.
>
> **Confirmado (Read 2026-05-29):** `tests/e2e/` usa `bun:test`. Arquivos `.ts` em `tests/e2e/` ENTRAM em `bun run test` (`scripts/run-tests.ts` globa `*.test.{ts,tsx}`). O hook-test da fase-02 é `.cjs` e roda explicitamente (G7).

---

## Implementacao

### Passo 1 — Escrever o teste (modo RED — escrever ANTES de fase-01/fase-02, se possível)

Recomendação TDD: escrever este teste PRIMEIRO. Antes das edições, os asserts POSITIVOS falham
(marcadores ausentes) — RED genuíno. Após fase-01 + fase-02, tudo passa — GREEN.

Estrutura proposta (`bun:test`, espelhando convenção dos irmãos em `tests/e2e/`). Note que grill-me e
consultant são scan de prosa (`readFileSync`), mas o stop-reflector é verificado por IMPORT do módulo
de runtime (`require`) — o comportamento do bullet só é observável chamando `buildBlockOutput`.

```typescript
// 2026-05-29 (Luiz/dev): gate de cobertura do Plano 03 — PRD RF15 estendido às 3 superfícies
// de cobertura (grill-me, consultant, stop-reflector). Risco coberto: prose-leak (INV6) + a trava
// RF14/D5 (nunca um decision:block novo). STANDALONE — não estende os gates dos Planos 01/02.
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dir, '../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

// Superfícies de PROSA tocadas pela fase-01.
const PROSE_FILES = [
  'skills/grill-me/SKILL.md',
  'skills/consultant/SKILL.md',
] as const

// Marcadores POSITIVOS por arquivo de prosa (presença obrigatória — suggest-only / INV6).
// Ajustar se a redação final divergir (disciplina anti-drift: alinhar marcador↔prosa).
const REQUIRED_MARKERS: Record<string, string[]> = {
  'skills/grill-me/SKILL.md': ['docs/WORKFLOWS.md', 'nao executa', 'opt-in e do humano'],
  'skills/consultant/SKILL.md': ['docs/WORKFLOWS.md', 'nao lanca', 'opt-in e do humano'],
}

describe('workflow coverage-leak gate (Plano 03 — grill-me + consultant + stop-reflector)', () => {
  // NEGATIVO (prosa): nenhuma skill pode emitir a tool Workflow nem um decision:block.
  for (const file of PROSE_FILES) {
    test(`${file} does not emit the Workflow tool or decision:block`, () => {
      const content = read(file)
      expect(content).not.toMatch(/\bWorkflow\s*\(/) // chamada literal, não a palavra "workflow"
      expect(content).not.toContain('decision:block')
    })
  }

  // POSITIVO (prosa): marcadores suggest-only presentes onde devidos.
  for (const file of PROSE_FILES) {
    test(`${file} carries the required suggest-only markers`, () => {
      const content = read(file)
      for (const marker of REQUIRED_MARKERS[file] ?? []) {
        expect(content).toContain(marker)
      }
    })
  }

  // G5 reforço: nenhuma skill introduziu link markdown verificado p/ WORKFLOWS.md (menção de caminho).
  for (const file of PROSE_FILES) {
    test(`${file} references WORKFLOWS.md by path mention, not a checked markdown link`, () => {
      const content = read(file)
      expect(content).not.toMatch(/\]\(([^)]*WORKFLOWS\.md)\)/)
    })
  }

  // RUNTIME (stop-reflector): a trava-mor RF14/D5.
  describe('stop-reflector retrospective (RF14/D5)', () => {
    const hook = require(path.join(root, 'hooks', 'stop-reflector.cjs'))

    test('with strong scale signal, workflow bullet lives INSIDE the single FEATURE_COMPLETED block', () => {
      const out = hook.buildBlockOutput('FEATURE_COMPLETED', { strongScaleSignal: true })
      // exatamente UM bloco: chaves apenas decision + reason (nunca um 2º decision:block).
      expect(Object.keys(out).sort()).toEqual(['decision', 'reason'])
      expect(out.decision).toBe('block')
      expect(out.reason).toMatch(/security-auditor/) // menu original preservado
      expect(out.reason).toMatch(/workflow/i)         // bullet novo presente
      expect(out.reason).toMatch(/nao lanca|nao executa/i) // suggest-only (INV6)
      expect(out.reason).not.toMatch(/Workflow\s*\(/) // nunca emite a tool Workflow
    })

    test('without strong scale signal (default), the workflow bullet is absent (backward-compat)', () => {
      const out = hook.buildBlockOutput('FEATURE_COMPLETED')
      expect(out.decision).toBe('block')
      expect(out.reason).toMatch(/security-auditor/)
      expect(out.reason).not.toMatch(/da proxima vez considere/i)
    })

    test('detectStrongScaleSignal fails open (false) on missing transcript', () => {
      expect(hook.detectStrongScaleSignal('/nonexistent/path.jsonl')).toBe(false)
    })
  })
})
```

> **Nota sobre os marcadores:** as strings em `REQUIRED_MARKERS` e nos regex devem casar a redação
> FINAL das fases 01/02. Se a execução ajustar uma frase, atualizar o marcador correspondente aqui
> (manter teste↔prosa em sincronia — disciplina anti-drift do gate).

### Passo 2 — Rodar o gate completo

O gate é a soma de quatro verificações re-executáveis:

1. `bun run test` — inclui este `workflow-coverage-leak.test.ts` (`.ts` em `tests/e2e/` → coletado).
2. `bun test hooks/stop-reflector.test.cjs` — RE-EXECUTAR o hook-test da fase-02 (G7: `.cjs` não entra
   em `bun run test`). Prova que a lógica do retrospectivo não regrediu.
3. `bun test tests/e2e/workflow-advisor-directive.test.ts` (ou via `bun run test`, pois é `.ts`) —
   RE-EXECUTAR o teste de diretriz do Plano 01 (hook directive). Prova que a cobertura nova não regrediu
   o hook do Plano 01.
4. `bun run harness:validate` — prova que as edições de prosa (grill-me/consultant) não quebraram
   link/H1/cap-70.

### Passo 3 — Grep de confirmação (defense-in-depth, fora do teste)

Como dupla checagem manual (não substitui o teste), via Grep tool:
- `Workflow\(` em grill-me + consultant + stop-reflector.cjs → ZERO.
- `decision:block` em grill-me + consultant → ZERO (no `.cjs` há exatamente um `decision: 'block'` por
  case — o gate de runtime já garante que não há um segundo).
- `\]\([^)]*WORKFLOWS\.md\)` em grill-me + consultant → ZERO (nenhum link markdown verificado).

---

## Gotchas

- **G3 do plano (trava-mor RF14):** o assert de runtime `Object.keys(out).sort()` ==
  `['decision','reason']` é o que garante "nunca um decision:block novo". É o coração deste gate; não
  afrouxar.
- **G7 do plano (test.cjs explícito):** o hook-test da fase-02 é re-executado via comando explícito; o
  `bun run test` não o pega. Já este arquivo (`.ts`) entra no `bun run test`.
- **G5 do plano (link-check):** o assert anti-link cobre só os `.md` (grill-me/consultant); o
  `stop-reflector.cjs` não é varrido pelo harness (não é `.md`).
- **G6 do plano:** verificação = `bun run test` + `bun run typecheck` + `bun run harness:validate`
  (+ opcional `bunx biome check`). NUNCA `bun run lint`.
- **Local — `Workflow(` vs palavra "workflow":** o regex negativo casa a CHAMADA literal `Workflow(`
  (tool emission), NÃO a palavra "workflow" em prosa (esperada e desejável). Não usar
  `not.toContain('workflow')` — reprovaria a prosa correta.
- **Local — gate é STANDALONE:** arquivo NOVO; não estende `workflow-prose-leak.test.ts` (Plano 02) nem
  `workflow-advisor-directive.test.ts` (Plano 01). Re-executa os outros como passo de verificação.
- **Local — runtime via require, não scan de prosa:** o comportamento do bullet do stop-reflector só é
  observável CHAMANDO `buildBlockOutput` — por isso o gate importa o módulo, não faz grep no `.cjs`.

---

## Verificacao

### TDD

- [ ] **RED:** com fase-01/fase-02 AINDA não aplicadas (ou revertendo uma delas), os asserts POSITIVOS
  falham (marcadores de prosa ausentes; `buildBlockOutput`/`detectStrongScaleSignal` sem o 2º arg →
  TypeError ou bullet ausente).
  - Comando: `bun run test -- --test-name-pattern "workflow coverage"`
  - Resultado esperado: assertion/TypeError failure

- [ ] **GREEN:** com grill-me + consultant editados E o stop-reflector implementado, TODOS os asserts
  (negativos + positivos + runtime) passam.
  - Comando: `bun run test -- --test-name-pattern "workflow coverage"`
  - Resultado esperado: todos passed

### Checklist

- [ ] `tests/e2e/workflow-coverage-leak.test.ts` criado (`bun:test`), lendo prosa por caminho relativo ao root e importando `stop-reflector.cjs` via `require`.
- [ ] Asserts NEGATIVOS (`Workflow(` e `decision:block` ausentes) em grill-me + consultant.
- [ ] Asserts POSITIVOS (marcadores suggest-only) em grill-me + consultant conforme `REQUIRED_MARKERS`.
- [ ] Assert G5 (nenhum link markdown verificado para WORKFLOWS.md) em grill-me + consultant.
- [ ] Asserts de RUNTIME do stop-reflector: single-block invariant, bullet presente (true)/ausente (default), fail-open, zero `Workflow(`.
- [ ] Hook-test da fase-02 RE-EXECUTADO (`bun test hooks/stop-reflector.test.cjs`) — verde.
- [ ] Teste de diretriz do Plano 01 RE-EXECUTADO — verde.
- [ ] `bun run harness:validate` verde (estado conjunto das superfícies de prosa).
- [ ] `bun run test` verde no geral; `bun run typecheck` sem novos erros (GT-01 inalterado).
- [ ] `bunx biome check tests/e2e/workflow-coverage-leak.test.ts` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde, incluindo todos os casos de `workflow-coverage-leak.test.ts`.
- `bun test hooks/stop-reflector.test.cjs` verde quando re-executado.
- Teste de diretriz do Plano 01 verde quando re-executado.
- `bun run harness:validate` exit 0.

**Por humano:**
- Revisão do teste: os marcadores casam a redação final das fases 01/02; o regex de `Workflow(`
  distingue tool-emission de palavra em prosa; o assert single-block prova que o retrospectivo nunca
  cria um segundo `decision:block`.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
