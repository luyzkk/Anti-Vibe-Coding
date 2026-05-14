<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Validar 3 padroes (security + verifier + explorer) contra o validator

**Plano:** 02 — Migracao Piloto (3 padroes)
**Sizing:** 1h
**Depende de:** fase-01 (plan-verifier migrado), fase-02 (design-explorer migrado), Plano 01 fase-05 (fixture security existente)
**Visual:** false

---

## O que esta fase entrega

3 fixtures verdes contra `skills/lib/subagent-contract.ts` cobrindo os 3 padroes distintos:
1. `kind: audit` — security-auditor (revalidacao da fixture do Plano 01 fase-05)
2. `kind: verification` — plan-verifier (fixture nova)
3. `kind: proposal` — design-explorer (fixture nova)

Comando `bun test agents:contract` (ou equivalente conforme test runner do Plano 01 fase-04) verde nos 3. Prova final que o contrato v1 cobre as 3 formas de output distintas no plugin antes de Plano 03 escalar mecanicamente nos 10 restantes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/__fixtures__/plan-verifier/input.json` | Create | Input simulado: plano hierarquico curto para verificar |
| `agents/__fixtures__/plan-verifier/expected-output.json` | Create | Output esperado conforme envelope v1 (vide fase-01 passo 2) |
| `agents/__fixtures__/design-explorer/input.json` | Create | Input simulado: problema arquitetural com 2-3 constraints |
| `agents/__fixtures__/design-explorer/expected-output.json` | Create | Output esperado conforme envelope v1 (vide fase-02 passo 2) |
| `agents/__fixtures__/security-auditor/expected-output.json` | Verify | Revalidar fixture do Plano 01 contra validator atualizado (caso schema tenha tido tweaks em fase-01/02) — sem modificar a menos que necessario |

Nenhum codigo TS de runtime e tocado — fixtures sao dados.

---

## Implementacao

### Passo 1: Criar `__fixtures__/plan-verifier/`

**input.json** — descreve o que o agente recebeu (formato livre, simula payload de invocacao):

```json
{
  "plan_path": "docs/exec-plans/active/example-feature/plano01/",
  "phases_to_verify": ["fase-01-foo.md", "fase-02-bar.md"],
  "context": "Plano 01 de feature simples; verificar coverage de CAs, sizing total, grafo de dependencias."
}
```

**expected-output.json** — output esperado do agente apos a migracao (fase-01):

```json
{
  "contract_version": "1.0",
  "agent": "plan-verifier",
  "kind": "verification",
  "status": "complete",
  "reasoning": "Verifiquei 4 checks contra o plano exemplo. 3 passaram, 1 emitiu warn em coverage de teste — o plano nao especifica matriz de fixtures por kind. Nao bloqueia, mas vale antecipar para o autor do proximo plano.",
  "payload": {
    "domain_status": "warn",
    "checks": [
      { "id": "ac_coverage", "result": "pass", "detail": "Todos os CAs do PRD tem fase associada." },
      { "id": "phase_sizing", "result": "pass", "detail": "Total 5h, alinhado com overview." },
      { "id": "dependency_graph", "result": "pass", "detail": "fase-02 depende corretamente de fase-01." },
      { "id": "fixture_matrix", "result": "warn", "detail": "Matriz por kind nao especificada explicitamente." }
    ]
  },
  "human_readable": "## Resumo\n- 3 OK\n- 1 warn (fixture_matrix)",
  "metadata": { "run_id": "fixture-pv-001", "duration_ms": 1200, "model": "sonnet" }
}
```

### Passo 2: Criar `__fixtures__/design-explorer/`

**input.json**:

```json
{
  "problem": "Adicionar cache de leitura em endpoint /api/lessons. P99 atual 800ms, alvo 100ms.",
  "constraints": ["Sem novas deps de runtime", "Compativel com horizontal scaling", "Falha aberta se cache cair"],
  "context": "Stack: Node + Postgres + Redis (ja existe). Trafego 50req/s pico."
}
```

**expected-output.json**:

```json
{
  "contract_version": "1.0",
  "agent": "design-explorer",
  "kind": "proposal",
  "status": "complete",
  "reasoning": "A constraint 'sem novas deps' do input conflita com a Recommendation natural (lib X de cache wrapper). Sinalizado como tradeoff #2. Tambem notei que o problema admite serverless KV que voce nao mencionou — incluida como Alternative B.",
  "payload": {
    "proposal": {
      "title": "Cache Redis com TTL adaptativo",
      "summary": "Cache de leitura no /api/lessons com TTL ajustado por latencia upstream. Falha aberta.",
      "constraints": ["Latencia P99 <100ms", "Sem novas deps", "Horizontal scaling OK"],
      "tradeoffs": [
        { "axis": "consistencia x latencia", "choice": "TTL 30s favorece latencia; staleness aceitavel para lessons" },
        { "axis": "complexidade x deps", "choice": "Redis ja existe — reuso vence Alternative B (KV)" }
      ],
      "recommendation": "Redis com TTL adaptativo (Alternative A). Implementacao em <1 dia.",
      "alternatives": [
        { "id": "B", "title": "Cloudflare KV", "rejected_because": "introduz dep nova" },
        { "id": "C", "title": "Otimizar query SQL", "rejected_because": "nao resolve P99 sob trafego pico" }
      ]
    }
  },
  "human_readable": "## Context\nEndpoint /api/lessons tem P99 de 800ms.\n\n## Constraints\n- Sem novas deps\n- Horizontal scaling\n- Falha aberta\n\n## Alternatives\n### A — Redis TTL adaptativo\nRedis ja existe na stack. TTL ajusta-se conforme latencia upstream.\n\n### B — Cloudflare KV\nServerless, distribuido. Introduz dep nova.\n\n### C — Otimizar query\nSem cache. Nao alcanca P99 100ms sob 50req/s.\n\n## Tradeoffs\nConsistencia x latencia: TTL 30s tolera staleness.\nComplexidade x deps: Redis vence.\n\n## Recommendation\nAlternative A.\n\n## Risks\n- Cache stampede em invalidacao mass\n- Memoria Redis sob pressao em pico\n\n## Open Questions\n- TTL fixo ou adaptativo no v1?\n\n## References\n- docs/architecture/cache.md",
  "metadata": { "run_id": "fixture-de-001", "duration_ms": 3400, "model": "sonnet" }
}
```

### Passo 3: Revalidar fixture do `security-auditor` (Plano 01)

Rodar o validator contra `agents/__fixtures__/security-auditor/expected-output.json` exatamente como esta:

```
bun test agents:contract -- --grep "security-auditor"
```

Esperado: passa sem mudancas. Se falhar:
- pode ser que schema teve tweak em fase-01/02 (ex: campo `domain_status` virou required em algum lugar — nao deveria, mas verificar)
- correcao mecanica na fixture, nao no schema (a menos que decisao explicita)
- registrar em `MEMORY.md` como BUG ou DI

### Passo 4: Adicionar 2 testes ao runner

Localizar o test file criado no Plano 01 fase-04 (provavelmente `skills/lib/subagent-contract.test.ts`). Adicionar:

```typescript
// 2026-05-14 (Luiz/dev): fixture plan-verifier — valida kind=verification + domain_status warn
test("plan-verifier fixture valida envelope v1 com domain_status warn", async () => {
  const output = await readJson("agents/__fixtures__/plan-verifier/expected-output.json")
  const result = parseAndDispatch(output)
  expect(result.ok).toBe(true)
  expect(result.kind).toBe("verification")
  expect(result.warnings).toEqual([])
})

// 2026-05-14 (Luiz/dev): fixture design-explorer — valida kind=proposal + 6 campos do payload.proposal
test("design-explorer fixture valida envelope v1 kind=proposal", async () => {
  const output = await readJson("agents/__fixtures__/design-explorer/expected-output.json")
  const result = parseAndDispatch(output)
  expect(result.ok).toBe(true)
  expect(result.kind).toBe("proposal")
  expect(output.payload.proposal.alternatives.length).toBeGreaterThanOrEqual(1)
  expect(result.warnings).toEqual([])
})
```

(Exata sintaxe depende do runner do Plano 01 fase-04 — `bun test` nativo ou vitest. Ajustar conforme.)

### Passo 5: Rodar a suite e iterar ate verde

```
bun test agents:contract
```

Esperado: 3 testes passam (security + verifier + explorer). Se falhar:
- ler erro
- ajustar fixture (NAO schema — schema e Plano 01)
- se erro for schema, registrar como BUG em `MEMORY.md` e propor ajuste

---

## Gotchas

- **G1 do plano (LLM malformado):** Fixtures sao dados estaticos, sem variancia LLM aqui. Mas testes futuros (ondas 4-5) vao invocar agentes reais — fixtures servem de oraculo para detecar drift.
- **G2 do plano (lifecycle vs dominio):** Fixture plan-verifier exemplifica `status: "complete"` + `payload.domain_status: "warn"`. Se alguem futuro tentar inverter (warn no top), o validator pega.
- **G6 do Plano 01 (schema oneOf por kind):** Crucial — fixtures testam que o schema discrimina corretamente `kind: verification` (precisa `payload.checks[]`) vs `kind: proposal` (precisa `payload.proposal`). Cross-contamination = bug do schema, nao da fixture.
- **G-P02-04 (proposal status):** Fixture design-explorer fixa `status: "complete"` — qualquer ondas futuras tentando `needs_retry` em proposal vao falhar contra esse oraculo.
- **Local (run_id fixo nas fixtures):** Usar IDs deterministicos (`fixture-pv-001`, `fixture-de-001`) — nao gerar UUID novo a cada run. Senao snapshot quebra em CI.
- **Local (duration_ms placeholder):** Valor 1200/3400 e ilustrativo. Validator nao deve assertar valor exato — apenas que campo existe e e numero. Se assertar exato, ajustar test ou schema.

---

## Verificacao

### TDD

- [ ] **RED:** Criar fixtures vazias `{}` primeiro, rodar `bun test agents:contract`. Esperado: ambos os testes novos falham com `MISSING_FIELD` ou `INVALID_JSON`.
- [ ] **GREEN:** Substituir por fixtures completas (passo 1 e 2). Re-rodar. Esperado: 3 testes verdes (security + verifier + explorer).
- [ ] **REFACTOR:** Revisar se algum campo da fixture e redundante / poderia ser mais minimal (mantem-se util como oraculo? remove). Tipicamente nao precisa.

### Checklist

- [ ] `agents/__fixtures__/plan-verifier/input.json` criado
- [ ] `agents/__fixtures__/plan-verifier/expected-output.json` criado e valida pelo schema
- [ ] `agents/__fixtures__/design-explorer/input.json` criado
- [ ] `agents/__fixtures__/design-explorer/expected-output.json` criado e valida
- [ ] `agents/__fixtures__/security-auditor/expected-output.json` revalida sem mudanca (ou mudancas anotadas em MEMORY.md)
- [ ] 2 testes novos adicionados ao test file do Plano 01
- [ ] `bun test agents:contract` retorna 3 passed, 0 failed
- [ ] `bun run lint` limpo
- [ ] Se schema precisou ajuste, BUG anotado em MEMORY.md com fase de origem
- [ ] Anotacao em MEMORY.md sobre qualquer divergencia entre output esperado fase-01/fase-02 vs fixture final

---

## Criterio de Aceite

**Por maquina:**
- `bun test agents:contract` retorna exit code 0 com 3 testes verdes (security-auditor + plan-verifier + design-explorer)
- Cada fixture passa pelo schema JSON do Plano 01 fase-03 sem warnings (reasoning >= 50 chars em todas)

**Por humano:**
- N/A — esta fase e 100% automatizavel via runner

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
