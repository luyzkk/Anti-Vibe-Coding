<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado nesta fase precisam de linhagem
(autor + data + razão). Ver fase-01 para exemplo.
-->

# Fase 02: design-twice consome handler genérico (3x design-explorer paralelo)

**Plano:** 04 — Orquestradores
**Sizing:** 1.5h
**Depende de:** fase-01 (helper `withRetry` ja existe + padrao de consumo validado em producao real)
**Visual:** false

---

## O que esta fase entrega

`design-twice` invocando 3 subagentes paralelos (filosofias A/B/C) que emitem `kind: "proposal"` via `parseAndDispatch()`; Step 3-4 leem `payload.proposal` estruturado (campos: `title`, `summary`, `complexity`, `effort`, `pros[]`, `cons[]`, `risks[]`) para popular a tabela comparativa; `human_readable` (8 secoes preservadas pelo Plano 02 fase-02) concatenado APOS a tabela. Consolidacao **deterministica por indice de input** (A/B/C) — mesma fixture roda 2x e produz output identico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/design-twice/SKILL.md` | Modify | Step 3 (Spawnar Subagentes) atualiza descricao de output esperado para apontar contrato v1 + remove "Template de Input" markdown rigido (agora vem do `design-explorer.md` migrado pelo Plano 02 fase-02); Step 4 (Compilar Tabela) muda fonte de dados de "8 secoes markdown" para `payload.proposal` |
| `skills/design-twice/index.ts` (Create se nao existir) | Create | Modulo TS co-localizado com a skill que (a) invoca 3 subagentes via `Promise.allSettled`, (b) parseia cada output via `parseAndDispatch()`, (c) consolida em ordem determinista por indice A/B/C |
| `skills/design-twice/index.test.ts` (Create) | Create | Testes com 3 fixtures simuladas (variar `payload.proposal`, garantir ordem A/B/C estavel apos shuffle) |

**Nota A3:** `skills/design-twice/SKILL.md` Step 3 usa `subagent_type: "general-purpose"` com prompt do `design-explorer` injetado. Plano 02 fase-02 migrou o **prompt** de `design-explorer.md` para emitir contrato v1 — comportamento do `subagent_type` nao muda. Confirmar na execucao se Plano 02 manteve `general-purpose` ou trocou para `anti-vibe-coding:design-explorer`. Se mudou, atualizar Step 3 conforme.

---

## Implementacao

### Passo 1: Criar `skills/design-twice/index.ts` (handler consolidator)

`design-twice/SKILL.md` hoje e prompt declarativo puro; nao tem `index.ts`. **Criar agora** modulo TS que centraliza a logica de consolidacao — facilita teste e remove necessidade do orquestrador (Claude) parsear markdown.

```typescript
// 2026-05-14 (Luiz/dev): consolidador para design-twice — PRD §Decisões #4 (kind: proposal)
// Promise.allSettled (NAO all) porque 1 design-explorer falhar nao deve derrubar os 3 — G1.

import { parseAndDispatch } from '../lib/subagent-contract'
import type { SubagentContractV1 } from '../lib/subagent-contract-types'

export type DesignTwiceInvocation = {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' // ate 5 propostas (PRD limit)
  philosophy: string
  rawOutput: string // string JSON crua do subagente
}

export type ConsolidatedProposal = {
  letter: string
  philosophy: string
  status: SubagentContractV1['status']
  proposal: ProposalPayload | null // null se status != complete
  reasoning: string
  humanReadable: string | undefined
}

export type ProposalPayload = {
  title: string
  summary: string
  complexity: 1 | 2 | 3 | 4 | 5
  effort: 'S' | 'M' | 'L'
  pros: string[]
  cons: string[]
  risks: string[]
}

export function consolidateProposals(
  invocations: DesignTwiceInvocation[],
): ConsolidatedProposal[] {
  // 2026-05-14 (Luiz/dev): ordem deterministica por letter — G-P04-01 (paralelismo retorna fora de ordem)
  const sorted = [...invocations].sort((a, b) => a.letter.localeCompare(b.letter))

  return sorted.map((inv) => {
    const parsed = parseAndDispatch(inv.rawOutput)

    if (parsed.kind !== 'proposal') {
      // 2026-05-14 (Luiz/dev): kind errado = bug no agente, nao processo silenciosamente
      throw new Error(
        `design-twice esperava kind: proposal de ${inv.letter}, recebeu ${parsed.kind}`,
      )
    }

    return {
      letter: inv.letter,
      philosophy: inv.philosophy,
      status: parsed.status,
      proposal: parsed.status === 'complete' ? (parsed.payload as ProposalPayload) : null,
      reasoning: parsed.reasoning,
      humanReadable: parsed.human_readable,
    }
  })
}
```

### Passo 2: Substituir Step 3 (Spawnar Subagentes) na SKILL.md

Manter o conceito de 3 subagentes paralelos + restricoes divergentes. Atualizar **Output Esperado**: em vez de "produza output EXATAMENTE no formato markdown abaixo" com 8 secoes, agora "produza JSON conforme contrato v1 com `kind: 'proposal'` — ver `agents/design-explorer.md` template atualizado".

Adicionar instrucao explicita:
```
Cada subagente retorna JSON conforme contrato v1 (apos Plano 02 fase-02 migrou design-explorer.md).
Orquestrador NAO parsa markdown — chama `consolidateProposals()` de skills/design-twice/index.ts
que usa parseAndDispatch(). Output dos 3 subagentes vira array ConsolidatedProposal[]
ordenado por letra (A/B/C).
```

### Passo 3: Atualizar Step 4 (Compilar Tabela Comparativa)

Hoje Step 4 espera ler 8 secoes markdown. Trocar fonte:

```
Fonte de dados:
- Tabela comparativa: derivada de ConsolidatedProposal[].proposal (campos title, complexity, effort, pros, cons, risks)
- Detalhamento completo apos tabela: ConsolidatedProposal[].humanReadable (mantem as 8 secoes que design-explorer.md gera)
- Reasoning de cada agente: ConsolidatedProposal[].reasoning — colocar em uma secao "Reasoning dos exploradores"
  (G-P02-03: reasoning != human_readable; reasoning e meta-observacao, h_r e a proposta em si)
```

### Passo 4: Tratar `status` != "complete"

Se 1 dos 3 vier com `status: "needs_human"` ou `"blocked"`:
- Nao incluir naquela tabela (proposta `null`).
- Adicionar nota visivel: "Proposta {letter} bloqueada: {reasoning}".
- Continuar apresentando 2 propostas restantes (PRD: "Se um subagente falhar, reportar ao dev e oferecer re-tentar ou prosseguir com 2 propostas").

`needs_retry` para `kind: proposal` e raro mas possivel (G-P02-04 diz que design-explorer normalmente e `complete`). Quando ocorre, `withRetry(invoke, {max: 1})` da fase-01 cuida.

```typescript
// 2026-05-14 (Luiz/dev): withRetry envolve cada invocacao paralela — D9
// Promise.allSettled garante que 1 retry esgotando nao derruba os outros 2.
const settled = await Promise.allSettled(
  [letterA, letterB, letterC].map((letter) =>
    withRetry(() => invokeDesignExplorer(letter, constraints)),
  ),
)
```

### Passo 5: Telemetria preservada

Bloco `writeTelemetryStart`/`writeTelemetryEnd` em SKILL.md linhas ~10-33 e ~365-385 — nao tocar (G-P04-07).

---

## Gotchas

- **G1 do plano (LLM JSON malformado):** `parseAndDispatch` ja tolerante. Aqui critico porque 3 invocacoes simultaneas amplificam: se 1 dos 3 retornar JSON quebrado, `Promise.allSettled` isola — outros 2 ainda passam. **Nao usar `Promise.all`** (rejeita tudo se um falha).
- **G-P04-01 (paralelismo retorna fora de ordem):** Aplicacao concreta — `consolidateProposals()` ordena por `letter` antes de retornar. Snapshot de teste estavel.
- **G-P04-03 (status: complete != domain_status: clean):** Em `kind: proposal` nao existe `payload.domain_status` significativo (proposta nao tem "achei issues") — campo opcional, normalmente ausente. Skill nao depende dele.
- **G-P02-03 (reasoning vs human_readable):** Critico para o relatorio. `reasoning` vai para secao "Reasoning dos exploradores" (1-3 frases meta). `human_readable` vai para "Detalhamento da Proposta X" (8 secoes completas). Misturar = perder o escape hatch que e o ponto inteiro do contrato (Every: "agent can say things you didn't schema").
- **G-P04-07 (telemetria intacta):** Confirmado nao tocar.
- **Local — `design-explorer` ainda nao migrado se Plano 02 nao rodou:** Esta fase **depende de** Plano 02 fase-02. Se executar antes (sem Plano 02), `parseAndDispatch()` rejeitara o output (que ainda e markdown). Teste TDD RED inicial assume Plano 02 done.

---

## Verificacao

### TDD

- [ ] **RED:** `skills/design-twice/index.test.ts` test "consolidateProposals ordena A/B/C apos shuffle". Input array embaralhado `[C, A, B]`, espera output `[A, B, C]`. Implementacao ausente → ReferenceError ou ordem aleatoria.
  - Comando: `bun test skills/design-twice/index.test.ts -t "ordena A/B/C"`
  - Resultado esperado: `ReferenceError: consolidateProposals is not defined` (RED).

- [ ] **GREEN:** Criar `index.ts` com `consolidateProposals` conforme Passo 1; teste passa.
  - Comando: `bun test skills/design-twice/index.test.ts -t "ordena A/B/C"`
  - Resultado: `1 passed`.

- [ ] **RED 2:** Test "lanca quando kind != proposal" — fixture com `kind: audit` deve throw.
  - Comando: `bun test skills/design-twice/index.test.ts -t "kind errado"`

- [ ] **GREEN 2:** Implementacao do Passo 1 ja faz throw — teste passa.

### Checklist

- [ ] `skills/design-twice/index.ts` exporta `consolidateProposals(invocations): ConsolidatedProposal[]`.
- [ ] `skills/design-twice/SKILL.md` Step 3 cita contrato v1 e `consolidateProposals`.
- [ ] `skills/design-twice/SKILL.md` Step 4 deriva tabela de `ConsolidatedProposal[].proposal`.
- [ ] `Promise.allSettled` usado (nao `Promise.all`).
- [ ] Grep assertion: `grep -n "Abordagem.*Pros.*Contras" skills/design-twice/SKILL.md` retorna 0 ocorrencias de "parse markdown manual" — o template do output agora vem do `agents/design-explorer.md` migrado.
- [ ] Telemetria preservada.
- [ ] Testes passam: `bun run test`
- [ ] Lint: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/design-twice/` retorna 0 failures.
- Teste de determinismo: 3 invocacoes em ordem `[B, A, C]` produzem output cujo `[0].letter === 'A'`.
- `bun test skills/design-twice/index.test.ts -t "needs_human nao quebra os outros"` valida graceful degradation.

**Por humano:**
- Tabela comparativa do relatorio do design-twice continua legivel — nao virou JSON dump.

**Decisoes do PRD aplicadas:**
- **D1** (JSON + `human_readable` opcional): `human_readable` (8 secoes) preservado no relatorio APOS a tabela; tabela vem de `payload.proposal` estruturado.
- **D4** (kind enum — proposal): handler rejeita se subagente emitir `kind != "proposal"`.
- **D5** (shape de `payload` por kind): consumer espera `payload.proposal` com campos `title`, `complexity`, etc.
- **D9** (retry policy): `withRetry` aplicado por invocacao (nao por batch).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
