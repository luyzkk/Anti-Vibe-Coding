<!--
Princípio universal #5 — Comment Provenance.
Esta fase cria um teste e2e (.ts). O comentário de provenance dos asserts vai inline no teste,
seguindo a convenção dos demais tests/e2e/ (autor/data/decisão).
Provenance da decisão: PRD RF15 (extensão p/ prosa de skill); CONTEXT INV5/INV6; PLAN R3.
-->

# Fase 06: Gate de Regressão de Prose-Leak (skills + docs)

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03, fase-04, fase-05 (assere o produto conjunto das 7 superfícies)
**Visual:** false

---

## O que esta fase entrega

Um teste e2e NOVO (`tests/e2e/workflow-prose-leak.test.ts`) que prova, por máquina, que as 5 skills
e 2 docs editados nas fases 01-05 (a) NÃO contêm emissão de tool Workflow (`Workflow(`) nem
`decision:block`, e (b) contêm os marcadores INV6/INV2 suggest-only obrigatórios — fechando o risco
NOVO que este plano introduz (prose-leak em arquivos de skill/doc), que é distinto do risco de HOOK
travado pelo teste do Plano 01.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/workflow-prose-leak.test.ts` | Create | Teste NOVO. Scan das 5 skills + 2 docs editados: negativos (`Workflow(`, `decision:block` ausentes) + positivos (marcadores INV6/INV2 presentes). Re-roda o teste do Plano 01 conceitualmente como parte do gate. |

> **Decisão de design do gate (registrar na MEMORY): STANDALONE, não estende o teste do Plano 01.**
> O `tests/e2e/workflow-advisor-directive.test.ts` (Plano 01 fase-04) é **hook-scoped** — assere os
> caminhos do `[WORKFLOW_ADVISOR]` em `user-prompt-gate.cjs`. O risco NOVO deste plano é prose-leak em
> `SKILL.md`/doc — outra superfície. Estender o teste do Plano 01 misturaria responsabilidades e
> ownership entre planos. Por isso a fase-06 cria um arquivo NOVO. O teste do Plano 01 continua sendo
> a trava do HOOK; este é a trava da PROSA. O gate (passo de verificação) RE-EXECUTA ambos.
>
> **Confirmado (Glob/Read 2026-05-29):** `tests/e2e/` usa `bun:test` (ver irmãos como
> `populate-plan-parity.test.ts`). Arquivos `.ts` em `tests/e2e/` ENTRAM em `bun run test`
> (`scripts/run-tests.ts` globa `*.test.{ts,tsx}`) — diferente do teste de hook `.cjs` do Plano 01,
> que precisa rodar explicitamente (G7 do Plano 01).

---

## Implementacao

### Passo 1 — Escrever o teste (modo RED — escrever ANTES das fases 01-05, se possível)

Recomendação TDD: escrever este teste PRIMEIRO. Antes das edições 01-05, os asserts POSITIVOS falham
(marcadores ainda não existem) — RED genuíno. Após 01-05, tudo passa — GREEN.

Estrutura proposta (`bun:test`, espelhando convenção dos irmãos em `tests/e2e/`):

```typescript
// 2026-05-29 (Luiz/dev): gate de prose-leak do Plano 02 — PRD RF15 estendido p/ prosa de skill.
// Risco coberto: INV6 prose-leak em SKILL.md/doc (distinto do hook-scoped do Plano 01).
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

// As 7 superfícies tocadas pelas fases 01-05 deste plano.
const EDITED_FILES = [
  'skills/plan-feature/SKILL.md',
  'skills/execute-plan/SKILL.md',
  'skills/verify-work/SKILL.md',
  'skills/design-twice/SKILL.md',
  'skills/quick-plan/SKILL.md',
  'docs/PIPELINE.md',
  'docs/PLANS.md',
] as const

// Marcadores POSITIVOS por arquivo (presença obrigatória — a prosa de workflow foi adicionada).
// Strings escolhidas para serem estáveis e específicas; ajustar se a redação final divergir.
const REQUIRED_MARKERS: Record<string, string[]> = {
  'skills/plan-feature/SKILL.md': ['SINAIS DE ESCALA-WORKFLOW', '(nao executa)'],
  'skills/execute-plan/SKILL.md': ['Workflow vs este orquestrador', 'opt-in NOVO e explicito'],
  'skills/verify-work/SKILL.md': ['mesmo padrao, escala diferente'],
  'skills/design-twice/SKILL.md': ['~5 angulos'],
  'skills/quick-plan/SKILL.md': ['quick-plan → plan-feature → workflow'],
  'docs/PIPELINE.md': ['dynamic workflow'],
  'docs/PLANS.md': ['dynamic workflow', 'Scale escalation'],
}

describe('workflow prose-leak gate (Plano 02 — INV6)', () => {
  // NEGATIVO: nenhuma superfície pode emitir a tool Workflow nem decision:block.
  for (const file of EDITED_FILES) {
    test(`${file} does not emit the Workflow tool or decision:block`, () => {
      const content = read(file)
      // Emissão da tool: chamada literal Workflow( — não confundir com a PALAVRA "workflow" em prosa.
      expect(content).not.toMatch(/\bWorkflow\s*\(/)
      expect(content).not.toContain('decision:block')
    })
  }

  // POSITIVO: marcadores suggest-only / INV6 presentes onde devidos.
  for (const file of EDITED_FILES) {
    test(`${file} carries the required suggest-only markers`, () => {
      const content = read(file)
      for (const marker of REQUIRED_MARKERS[file] ?? []) {
        expect(content).toContain(marker)
      }
    })
  }

  // INV6 reforço: nas DUAS superfícies sensíveis, a frase no-launch existe.
  test('plan-feature and execute-plan reaffirm no-launch invariant', () => {
    const planFeature = read('skills/plan-feature/SKILL.md')
    const executePlan = read('skills/execute-plan/SKILL.md')
    // plan-feature Step 7: NUNCA lança / NÃO emite a tool / opt-in 100% humano.
    expect(planFeature).toMatch(/N[ÃA]O emite a tool Workflow|NUNCA lanca/i)
    // execute-plan callout: NUNCA lança / NUNCA delega / opt-in fresco.
    expect(executePlan).toMatch(/NUNCA lanca o workflow|NUNCA delega uma fase/i)
  })

  // G5 reforço: nenhum dos arquivos introduziu link markdown verificado p/ WORKFLOWS.md
  // (deve ser menção de caminho; link verificado quebraria harness:validate antes do Plano 01).
  for (const file of EDITED_FILES) {
    test(`${file} references WORKFLOWS.md by path mention, not a checked markdown link`, () => {
      const content = read(file)
      // Falha se houver [..](...WORKFLOWS.md) — link relativo verificado.
      expect(content).not.toMatch(/\]\(([^)]*WORKFLOWS\.md)\)/)
    })
  }
})
```

> **Nota sobre os marcadores:** as strings em `REQUIRED_MARKERS` e nos regex devem casar a redação
> FINAL das fases 01-05. Se a execução ajustar alguma frase proposta, atualizar o marcador
> correspondente aqui (manter teste e prosa em sincronia — é a disciplina anti-drift do gate).

### Passo 2 — Rodar o gate completo

O gate da fase-06 é a soma de três verificações re-executáveis:

1. `bun run test` — inclui este `workflow-prose-leak.test.ts` (`.ts` em `tests/e2e/` → coletado).
2. `bun test hooks/user-prompt-gate.test.cjs` — RE-EXECUTAR o teste de hook do Plano 01 (G7: `.cjs`
   não entra em `bun run test`; rodar explicitamente). Prova que a prosa nova não regrediu o hook.
   (Se o nome do arquivo de teste do Plano 01 divergir, usar `tests/e2e/workflow-advisor-directive.test.ts`
   conforme plano01/README — esse é `.ts` e entra em `bun run test`.)
3. `bun run harness:validate` — prova que nenhuma das 7 edições quebrou link/H1/cap-70.

### Passo 3 — Grep de confirmação (defense-in-depth, fora do teste)

Como dupla checagem manual (não substitui o teste), rodar via Grep tool sobre os 7 arquivos:
- `Workflow\(` → deve retornar ZERO.
- `decision:block` → deve retornar ZERO.
- `\]\([^)]*WORKFLOWS\.md\)` → deve retornar ZERO (nenhum link markdown verificado).

---

## Gotchas

- **G8 do plano (gate é NOVO, não estende o do Plano 01):** o teste do Plano 01 é hook-scoped; este é
  prose-scoped. Não mesclar. O gate RE-EXECUTA ambos.
- **G7 do Plano 01 herdado:** se a trava do Plano 01 for `.cjs` (`hooks/user-prompt-gate.test.cjs`),
  rodar explicitamente — `bun run test` não pega `.cjs`. O teste do Plano 01 nomeado em plano01/README
  (`tests/e2e/workflow-advisor-directive.test.ts`) é `.ts` e ENTRA em `bun run test` — confirmar qual
  existe no tempo de execução.
- **G6 do plano:** verificação = `bun run test` + `bun run typecheck` + `bun run harness:validate`
  (+ opcional `bunx biome check`). NUNCA `bun run lint`.
- **Local — `Workflow(` vs palavra "workflow":** o regex negativo casa a CHAMADA literal `Workflow(`
  (tool emission), NÃO a palavra "workflow" em prosa (que é esperada e desejável). Não usar
  `not.toContain('workflow')` — isso reprovaria a prosa correta.
- **Local — falso-negativo de marcador:** se a redação final divergir das frases propostas, o assert
  positivo falha legitimamente. O fix é alinhar marcador↔prosa, NÃO afrouxar o teste para `.toMatch(/.*/)`.

---

## Verificacao

### TDD

- [ ] **RED:** com as fases 01-05 AINDA não aplicadas (ou revertendo uma delas), os asserts POSITIVOS
  falham por marcador ausente.
  - Comando: `bun run test -- --test-name-pattern "workflow prose-leak"`
  - Resultado esperado: `expect(received).toContain(expected)` failure

- [ ] **GREEN:** com as 5 skills + 2 docs editados, TODOS os asserts (negativos + positivos) passam.
  - Comando: `bun run test -- --test-name-pattern "workflow prose-leak"`
  - Resultado esperado: todos passed

### Checklist

- [ ] `tests/e2e/workflow-prose-leak.test.ts` criado, usando `bun:test`, lendo os 7 arquivos por caminho relativo ao root.
- [ ] Asserts NEGATIVOS (`Workflow(` e `decision:block` ausentes) em cada um dos 7 arquivos.
- [ ] Asserts POSITIVOS (marcadores suggest-only) por arquivo conforme `REQUIRED_MARKERS`.
- [ ] Assert dedicado reforçando no-launch em plan-feature E execute-plan (INV6).
- [ ] Assert G5 (nenhum link markdown verificado para WORKFLOWS.md) em cada arquivo.
- [ ] Teste do Plano 01 RE-EXECUTADO como parte do gate (hook directive) — verde.
- [ ] `bun run harness:validate` verde (estado conjunto das 7 superfícies).
- [ ] `bun run test` verde no geral; `bun run typecheck` sem novos erros (GT-01 do Plano 01 inalterado).
- [ ] `bunx biome check tests/e2e/workflow-prose-leak.test.ts` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde, incluindo todos os casos de `workflow-prose-leak.test.ts`.
- Teste do Plano 01 (hook directive) verde quando re-executado.
- `bun run harness:validate` exit 0.

**Por humano:**
- Revisão do teste: os marcadores casam a redação final das fases 01-05; o regex de `Workflow(`
  distingue tool-emission de palavra em prosa.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
