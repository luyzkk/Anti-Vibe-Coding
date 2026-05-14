<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): retry max=1 — PRD §Decisões #9 (D9)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: execute-plan consome handler genérico + helper `withRetry`

**Plano:** 04 — Orquestradores (handler generico, blast radius crescente)
**Sizing:** 1.5h
**Depende de:** Plano 03 fase-05 (13 fixtures verdes + 13 agentes contrato-compliant)
**Visual:** false

---

## O que esta fase entrega

`execute-plan` consumindo `plan-verifier` (kind=verification) e `plan-executor` (kind=verification) via `parseAndDispatch()`; helper `withRetry(invoke, max=1)` extraido e exportado de `skills/lib/subagent-contract.ts`; regex/markdown parse de status removido do Step 4d. Mini-tracer-bullet dos orquestradores: menor blast radius (consumidor unico — 2 agentes), valida `parseAndDispatch()` + retry em producao real antes de escalar.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/execute-plan/SKILL.md` | Modify | Step 4d (Coletar Resultados) substitui parsing markdown por chamada a `parseAndDispatch()`; Step 4-RETRY documenta que retry agora vem do helper |
| `skills/execute-plan/index.ts` | Modify | Importa `parseAndDispatch` + `withRetry` de `skills/lib/subagent-contract`; logica de consumo de output de subagente passa pelo handler |
| `skills/execute-plan/index.test.ts` | Modify | Adiciona teste de integracao consumindo fixture `agents/__fixtures__/plan-verifier/expected-output.json` |
| `skills/lib/subagent-contract.ts` | Modify | Adiciona export `withRetry(invokeFn, opts)` — se primeira chamada retorna `status: "needs_retry"`, re-invoca 1x; segunda `needs_retry` escala para `needs_human` (PRD D9) |
| `skills/lib/subagent-contract.test.ts` | Modify | Testes co-localizados para `withRetry`: 1 retry feliz, 1 retry → needs_human, 1 cap (nao loop) |

**Nota sobre A1 (anomalia):** se Plano 01 fase-04 nao tiver criado `skills/lib/subagent-contract.ts` ou tiver criado com nomes diferentes (ex: `parseContract` vs `parseAndDispatch`), AJUSTAR os imports nesta fase e atualizar MEMORY.md com nome real. Nao reinventar o helper aqui — apenas consumir/estender.

---

## Implementacao

### Passo 1: Adicionar helper `withRetry` em `skills/lib/subagent-contract.ts`

Helper minimo que envolve a invocacao de subagente. **Nao loop infinito, max 1 retry mecanico para `needs_retry` semantico**. Retry mecanico de `JSON.parse` failure ja vive dentro de `parseAndDispatch()` (Plano 01 fase-04) — sao coisas diferentes.

```typescript
// 2026-05-14 (Luiz/dev): retry helper para status: "needs_retry" — PRD §Decisões #9 (D9)
// max=1 default, escala para needs_human apos segundo needs_retry (sem loop infinito).
// Retry de JSON.parse failure vive em parseAndDispatch() — esse e SEMANTICO.

import type { SubagentContractV1 } from './subagent-contract-types'

export type RetryOpts = {
  max?: number // default 1, cap absoluto em v6.1.0 — RF-SH-03 fica para v6.2
}

export type InvokeFn = () => Promise<SubagentContractV1>

export async function withRetry(
  invoke: InvokeFn,
  opts: RetryOpts = {},
): Promise<SubagentContractV1> {
  const max = opts.max ?? 1
  let attempt = 0
  let result = await invoke()

  while (result.status === 'needs_retry' && attempt < max) {
    attempt += 1
    result = await invoke()
  }

  if (result.status === 'needs_retry') {
    // 2026-05-14 (Luiz/dev): segundo needs_retry vira needs_human — D9 escalation
    return {
      ...result,
      status: 'needs_human',
      reasoning:
        result.reasoning +
        ` [withRetry: ${max} retries esgotados, escalando para humano]`,
    }
  }

  return result
}
```

### Passo 2: Substituir parsing de output no `execute-plan` Step 4d

Hoje `skills/execute-plan/SKILL.md` Step 4d le output de subagente e extrai "Status: done | partial | blocked" via texto livre. Substituir por chamada ao handler.

**Forma do codigo na skill (pseudocodigo TS, ja que SKILL.md e prompt declarativo):**

```typescript
// 2026-05-14 (Luiz/dev): Step 4d agora consome contrato v1 — PRD §Decisões #5 (kind dispatch)
// Aplica D2 (lifecycle vs domain_status), D9 (retry policy), D10 (reasoning threshold).

import { parseAndDispatch, withRetry } from '../lib/subagent-contract'

// invoke() abstrai chamada ao Task tool com subagent_type: "anti-vibe-coding:plan-verifier"
// e retorna JSON parseado conforme contrato v1.
const verifierOutput = await withRetry(() => invokePlanVerifier(faseSpec))

if (verifierOutput.status === 'needs_human') {
  // 2026-05-14 (Luiz/dev): G-P04-03 — blocked != complete+critical
  // needs_human = orquestrador para e pergunta; nao consolida payload
  pushOperatorQuestion(verifierOutput.reasoning)
  return
}

if (verifierOutput.status === 'blocked') {
  registerBlocker(verifierOutput.reasoning, verifierOutput.payload)
  return
}

// status: "complete" — consolidar payload
const checks = verifierOutput.payload.checks ?? []
const domainStatus = verifierOutput.payload.domain_status // "pass" | "warn" | "fail"
// Atualizar MEMORY.md / STATE.md como antes, mas dados vem do JSON estruturado.
```

### Passo 3: Atualizar SKILL.md prosa

No bloco "Step 4d. Coletar Resultados e Atualizar Memoria" do `SKILL.md`, substituir:

```
2. Extrair do report:
   - Status: done | partial | blocked
   - Decisoes tomadas (DI-*)
   ...
```

Por:

```
2. Parsar output do subagente via skills/lib/subagent-contract.ts → parseAndDispatch():
   - Se status === "blocked": registrar blocker no STATE.md, nao consolida payload
   - Se status === "needs_human": empilhar pergunta ao operador antes de consolidar
   - Se status === "needs_retry": withRetry(invoke, {max: 1}) ja cuidou — escala para
     needs_human apos 2a tentativa (D9)
   - Se status === "complete":
     - kind === "verification" (plan-verifier): ler payload.checks[] + payload.domain_status
     - kind === "verification" (plan-executor): ler payload.steps[] + payload.domain_status
       (apos Plano 03 fase-03 normalizou done/partial/blocked)
   - reasoning vai para MEMORY.md secao "Decisoes de Implementacao" como contexto rico
```

### Passo 4: Step 4-RETRY documentar que helper assume retries semanticos

Manter o bloco "Nivel 1/2/3" do Step 4-RETRY para **erros mecanicos** (timeout, subagente nao respondeu) — esses ainda sao do dominio do orquestrador. **Adicionar nota** no topo:

```
Nota: retries semanticos (status: "needs_retry") agora sao tratados pelo helper
withRetry() de skills/lib/subagent-contract.ts (1 retry default, cap em v6.1.0).
Os niveis 1/2/3 abaixo cobrem APENAS erros mecanicos do subagente
(timeout, processo morreu, output vazio). PRD §Decisões #9.
```

### Passo 5: Verificar telemetria preservada

Os blocos `writeTelemetryStart` / `writeTelemetryEnd` no SKILL.md (linhas ~10-35 e ~865-885) **nao sao tocados** (G-P04-07). `parseAndDispatch` entra entre `start` e `end`, sem mudar o ciclo de telemetria.

---

## Gotchas

- **G1 do plano (LLM JSON malformado):** `parseAndDispatch` ja retry mecanico de `JSON.parse`. Nesta fase, apenas confirmar que `index.ts` propaga o erro final se retry mecanico tambem falhar — `execute-plan` registra fase como "blocked" com motivo "subagent output unparseable" e segue.
- **G-P04-02 (retry idempotente, LLM nao):** Helper aqui criado tem cap explicito (1). Nao expor configurabilidade ainda (RF-SH-03 fica pra v6.2). Teste co-localizado garante que `max=2` nao foi aceito por API.
- **G-P04-05 (execute-plan consome 2 agents — verifier + executor):** Ambos `kind: verification` apos Plano 03 fase-03. `parseAndDispatch` retorna shape uniforme; consumidor usa `kind` para escolher se le `payload.checks[]` (verifier) ou `payload.steps[]` (executor) — **a skill** discrimina, nao o handler.
- **G-P04-06 (Comment Provenance):** Snippets neste arquivo seguem padrao `// YYYY-MM-DD (autor/papel): justificativa — referencia`. Mesmo padrao nos arquivos `.ts` modificados.
- **G-P04-07 (telemetria intacta):** Diff desta fase NAO toca linhas com `writeTelemetryStart` / `writeTelemetryEnd`. Grep no PR confirma.
- **Local — `plan-executor` lifecycle parcial:** Apos Plano 03 fase-03, `plan-executor` emite `status: "complete"` com `payload.domain_status: "partial"` quando antigamente emitia `partial`. O consumer (`execute-plan`) precisa **deixar de bloquear** em `partial` no top-level — agora o sinal vem do payload. Atualizar logica de Step 4d para reconhecer `payload.domain_status === "partial"` como "fase nao totalmente concluida" sem virar blocker lifecycle.

---

## Verificacao

### TDD

- [ ] **RED:** Teste de integracao `skills/execute-plan/index.test.ts` invoca handler contra fixture `agents/__fixtures__/plan-verifier/expected-output.json` e espera `result.status === 'complete'` + `result.payload.checks.length > 0`. Implementacao atual ainda parsa markdown → teste falha por `result` indefinido / shape errado.
  - Comando: `bun test skills/execute-plan/index.test.ts -t "consome plan-verifier via parseAndDispatch"`
  - Resultado esperado: `Expected status complete, received undefined` (assertion failure).

- [ ] **GREEN:** Substituir parsing de output por `parseAndDispatch()` + `withRetry()`; teste passa.
  - Comando: `bun test skills/execute-plan/index.test.ts -t "consome plan-verifier via parseAndDispatch"`
  - Resultado esperado: `1 passed, 0 failed`.

- [ ] **RED-withRetry:** `skills/lib/subagent-contract.test.ts` test "withRetry escala needs_retry → needs_human apos max". Implementacao do helper ausente → ReferenceError.
  - Comando: `bun test skills/lib/subagent-contract.test.ts -t "withRetry escala"`
  - Resultado esperado: `ReferenceError: withRetry is not defined` ou import error.

- [ ] **GREEN-withRetry:** Adicionar export `withRetry` conforme Passo 1; teste passa.

### Checklist

- [ ] `skills/execute-plan/SKILL.md` Step 4d cita `parseAndDispatch` e referencia D2/D9.
- [ ] `skills/execute-plan/index.ts` importa `withRetry` e `parseAndDispatch` de `../lib/subagent-contract`.
- [ ] `skills/lib/subagent-contract.ts` exporta `withRetry(InvokeFn, RetryOpts): Promise<SubagentContractV1>`.
- [ ] Grep assertion: `grep -rn "Status: done\|partial\|blocked" skills/execute-plan/index.ts` retorna 0 (parsing de status por texto removido — agora vem de `result.status` typed).
- [ ] Telemetria preservada — diff nao toca linhas `writeTelemetryStart` / `writeTelemetryEnd`.
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/execute-plan/` retorna 0 failures.
- `bun test skills/lib/subagent-contract.test.ts -t "withRetry"` retorna 3+ testes verdes (happy retry, needs_human escalation, cap=1).
- `grep -rn "parse markdown\|Status: done" skills/execute-plan/index.ts skills/execute-plan/SKILL.md | wc -l` retorna 0 (ou apenas em comentarios de migracao).

**Decisoes do PRD aplicadas:**
- **D2** (lifecycle vs domain_status): consumer le `status` para decidir prosseguir/retry/escalar; le `payload.domain_status` separadamente para enriquecer relatorio.
- **D5** (shape de payload por kind): consumer le `payload.checks[]` quando `kind: verification` (plan-verifier) ou `payload.steps[]` (plan-executor).
- **D7** (`contract_version: "1.0"` fixo): handler rejeita outras; consumer apenas propaga erro.
- **D9** (1 retry default em `needs_retry`): `withRetry(invoke, {max: 1})` implementa.
- **D10** (reasoning <20 rejeita / <50 warn): consumer NAO re-valida — handler ja o fez.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
