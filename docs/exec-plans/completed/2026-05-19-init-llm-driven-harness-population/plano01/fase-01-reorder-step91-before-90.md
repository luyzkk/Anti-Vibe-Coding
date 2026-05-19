<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): Step 91 ANTES do 90 — resolve Bug C (PRD MH-01, CA-07)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Reorder Step 91 Antes do Step 90 (Tracer Bullet)

**Plano:** 01 — Refactor de Registry (Tracer Bullet)
**Sizing:** 1h
**Depende de:** Nenhuma (Tracer Bullet — primeira fatia funcional)
**Visual:** false

---

## O que esta fase entrega

Swap minimo em `registry.ts` para que `generatePopulatePlanStep` execute ANTES de
`finalValidationStep`, mais um smoke test verificando que o PLAN.md e gerado mesmo quando
Step 90 emite warning/abort. Resolve Bug C / MH-01 / CA-07 na fatia mais fina possivel.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Mover `generatePopulatePlanStep` para a posicao imediatamente anterior a `finalValidationStep`. Atualizar comentarios de provenance. |
| `skills/init/lib/registry.test.ts` | Modify | Trocar teste "91-generate-populate-plan is the last step" por "91-generate-populate-plan comes BEFORE final-validation". Manter os demais testes intactos nesta fase (sao removidos na fase-05). |
| `skills/init/lib/registry.smoke.test.ts` | Create | Smoke test novo: registry mock onde `finalValidationStep` aborta, valida que `generatePopulatePlanStep` ja rodou (ordem do array). |

---

## Implementacao

### Passo 1: Inverter ordem em `registry.ts`

Estado atual (relevante — linhas 67-71 do `registry.ts`):

```typescript
  capabilitiesDiscoveryStep,    // 2026-05-17 (Luiz/dev): plano03 fase-06 — Step 7 soft-fail (PRD CA-06, G7).
  finalValidationStep,          // 2026-05-17 (Luiz/dev): Step migrate.5 — valida harness apos migracao completa (PRD CA-09).
  // 2026-05-18 (Luiz/dev): MH-01 do PRD / G7 do plano02 —
  // Step 91 SEMPRE apos finalValidationStep. Gerar PLAN.md com harness invalido geraria lixo.
  generatePopulatePlanStep,      // 2026-05-18 (Luiz/dev): '91-generate-populate-plan' — MH-01 / G7: ultima posicao do registry.
```

Mudanca:

```typescript
  capabilitiesDiscoveryStep,    // 2026-05-17 (Luiz/dev): plano03 fase-06 — Step 7 soft-fail (PRD CA-06, G7).
  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 do PRD init-llm-driven-harness-population —
  // Step 91 ANTES do Step 90. Bug C: Step 90 abortando deixava Step 91 sem rodar.
  // PLAN.md e output principal da init; validation e diagnostico nao-bloqueante.
  generatePopulatePlanStep,     // 2026-05-19 (Luiz/dev): '91-generate-populate-plan' — emite PLAN.md antes do validator.
  finalValidationStep,          // 2026-05-19 (Luiz/dev): Step 90 — agora ULTIMA posicao, modo warning sera Plano 04 fase-04.
```

Tambem atualizar o comentario de bloco no topo do registry (linhas 29-41) trocando a frase
"final-validation: ULTIMA — porta Step migrate.5, valida harness apos toda mutacao." por:

```typescript
  // 2026-05-19 (Luiz/dev): MH-01 do PRD novo — Step 91 (generate-populate-plan) ANTES de
  // Step 90 (final-validation). PLAN.md sai mesmo se Step 90 emitir warning (Bug C resolvido).
  // Step 90 continua sendo ultima execucao (diagnostico nao-bloqueante).
```

### Passo 2: Atualizar `registry.test.ts` (minimo)

Estado atual relevante (linhas 15-24):

```typescript
  test('91-generate-populate-plan is the last step', () => {
    expect(registry.at(-1)?.id).toBe('91-generate-populate-plan')
  })

  test('91-generate-populate-plan comes after final-validation', () => {
    const finalIdx = registry.findIndex(s => s.id === 'final-validation')
    const populateIdx = registry.findIndex(s => s.id === '91-generate-populate-plan')
    expect(finalIdx).toBeGreaterThanOrEqual(0)
    expect(populateIdx).toBeGreaterThan(finalIdx)
  })
```

Substituir por:

```typescript
  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 — Step 91 deve PRECEDER Step 90 (Bug C).
  test('final-validation is the last step', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })

  test('91-generate-populate-plan comes BEFORE final-validation', () => {
    const finalIdx = registry.findIndex(s => s.id === 'final-validation')
    const populateIdx = registry.findIndex(s => s.id === '91-generate-populate-plan')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })
```

Os outros 3 testes (`all step ids are unique`, `positions propose-merge-batch immediately after
classify-blocks-hybrid`, `positions apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents`)
ficam intactos nesta fase. Sao removidos/atualizados na fase-05 quando os steps forem deletados.

### Passo 3: Criar smoke test novo

Arquivo novo `skills/init/lib/registry.smoke.test.ts`:

```typescript
// 2026-05-19 (Luiz/dev): Smoke test Tracer Bullet — Plano 01 fase-01.
// Verifica MH-01 / CA-07: Step 91 (generate-populate-plan) precede Step 90 (final-validation).
// Garantia minima de Bug C: PLAN.md e gerado ANTES do validator poder abortar.
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'

describe('registry smoke (Tracer Bullet Plano 01 fase-01)', () => {
  test('PLAN.md generator runs before final validator (MH-01, CA-07)', () => {
    const ids = registry.map(s => s.id)
    const populateIdx = ids.indexOf('91-generate-populate-plan')
    const finalIdx = ids.indexOf('final-validation')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  test('final-validation is the last step (warning-mode container)', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })
})
```

Sem mock de execucao real — o smoke test e estrutural: a ordem do array garante que mesmo se
`finalValidationStep` abortar, `generatePopulatePlanStep` ja rodou. Plano 05 fase-04
acrescenta o E2E completo de execucao com abort de Step 90.

---

## Gotchas

- **G2 do plano (ordem importa):** Resista a tentacao de simplesmente "puxar para o topo" o
  Step 91. Ele deve ficar ENTRE `capabilitiesDiscoveryStep` e `finalValidationStep`. Antes,
  porque depende de scaffold + stack-detect + persist-knowledge ja terem rodado; depois do
  capabilities-discovery porque ainda nao depende dele. Posicao exata: penultima.
- **G1 do plano (E2E quebrados):** Apos esta fase, qualquer teste E2E que asserta
  `Step 91 e o ultimo` quebra. Audit rapida — sao raros nesta fase porque a maioria
  dos E2E nao asserta posicao final exata. Se algum quebrar, marcar `test.skip` com
  comentario `// 2026-05-19 (Luiz/dev): skip — Plano 05 fase-04 reescreve` e abrir TODO
  no MEMORY.md.
- **Local:** Comentarios de provenance antigos em `registry.ts` linhas 69-71 estao
  INCORRETOS apos a mudanca. NAO esquecer de atualizar (instrucao explicita no Passo 1).
  Plano 05 fase-04 nao reabre `registry.ts` — esta e a unica chance de corrigir o comentario.

---

## Verificacao

### TDD

- [ ] **RED:** Smoke test escrito antes da mudanca em `registry.ts`. Roda e FALHA porque
      `populateIdx > finalIdx` no estado atual.
  - Comando: `bun test skills/init/lib/registry.smoke.test.ts`
  - Resultado esperado: assertion failure `Expected populateIdx < finalIdx, received populateIdx > finalIdx`

- [ ] **GREEN:** Apos swap no `registry.ts`, smoke test passa.
  - Comando: `bun test skills/init/lib/registry.smoke.test.ts`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] `registry.ts` tem `generatePopulatePlanStep` imediatamente antes de `finalValidationStep`
- [ ] Comentarios de provenance atualizados (Passo 1 — linhas 29-41 e 67-71)
- [ ] `registry.test.ts` Teste "91-generate-populate-plan is the last step" trocado por
      "final-validation is the last step"
- [ ] `registry.test.ts` Teste "comes after final-validation" trocado por "comes BEFORE final-validation"
- [ ] `registry.smoke.test.ts` criado com 2 assertions
- [ ] Testes passam: `bun test skills/init/lib/registry.test.ts && bun test skills/init/lib/registry.smoke.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/registry.test.ts` retorna `5 passed, 0 failed` (3 testes
  antigos preservados + 2 testes reescritos)
- `bun test skills/init/lib/registry.smoke.test.ts` retorna `2 passed, 0 failed`
- `grep -n "generatePopulatePlanStep" skills/init/lib/registry.ts` reporta UMA ocorrencia
  na posicao penultima (linha antes de `finalValidationStep`)
- `grep -c "finalValidationStep," skills/init/lib/registry.ts` retorna `1` e ela e
  a ultima linha de step no array

**Por humano:**
- Diff do `registry.ts` mostra apenas o swap das duas linhas e atualizacao de 2 blocos
  de comentario. Nada mais mudou.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
