# Memoria: Plano 03 — Migracao em Escala (10 auditores + mutation stub)

**Feature:** v6.1.0-subagent-contract
**Iniciado:** 2026-05-14
**Concluido:** 2026-05-14
**Status:** completed (5/5 fases verdes; 27 testes em subagent-contract.test.ts; suite global 727 pass / 1 skip / 0 fail)

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** tdd-verifier preserva grafia exata "NON-COMPLIANT" (hifem) no arquivo original — INVENTORY listava "NON_COMPLIANT" (underscore). Coluna "antigo" da tabela de mapping reflete o texto real do arquivo. Mapping para `critical` no domain_status independente da grafia.
- **DI-2 (fase-01 + fase-02):** Todos os auditores audit-only usam severity do schema `critical|high|medium|low` (NAO `info|warning|error|critical` como o plano sugeria). Razao: schema vence spec quando contradicao mecanica.
- **DI-3 (fase-02):** `payload.issues[].file` usado como string semantica por dominio: api = endpoint (`POST /payments`), database = `path:line` ou tabela, infra = recurso/hostname/Dockerfile path. Schema aceita string livre.
- **DI-4 (fase-03):** lesson-evaluator define vocabulario NOVO (`clean | issues_found | critical`) — antes nao tinha enum estruturado, so texto livre QUALIFICA/NAO QUALIFICA. Decisao: `critical` = rejeitar licao (NAO abortar pipeline). Documentado inline.
- **DI-5 (fase-03):** plan-executor payload usa shape DUAL — `checks[]` (schema-required) + `tasks_completed[]/tasks_skipped[]` (campos adicionais via additionalProperties default). Razao: checks[] garante validade do schema; tasks_* preservam riqueza semantica para consumidores (Plano 04 fase-01 — execute-plan).
- **DI-6 (fase-04):** TODO.md ja tinha entrada equivalente `{feature:plugin} v6.2 — definir spec real do mutation payload` na linha 17 (criada antes desta sessao). NAO duplicada — confirmou-se cobertura.
- **DI-7 (fase-05):** Test runner mantem os 2 testes antigos da fase-03 do Plano 02 (plan-verifier, design-explorer) que validam campos domain-especificos extras alem do baseline. Adicionado loop parameterizado validando 13 fixtures via parseContract. Total: 27 testes (= 14 base + 13 loop).
- **DI-8 (fase-05):** input.json criado para os 10 novos fixtures (padrao consistente). security-auditor fixture piloto nao tem input.json (criado em Plano 01 fase-05 sem ele). Aceito como divergencia — input.json eh opcional na suite atual.

---

## Bugs Descobertos

Nenhum bug detectado. Todos os 10 prompts das fases 01-04 emitiram shapes coerentes com os fixtures criados na fase-05.

---

## Gotchas

- **GT-1 (fase-01):** Plano usava `severity: info|warning|error|critical` em exemplos — schema auditVariant exige `critical|high|medium|low`. Anomalia herdada do exemplo original. **Regra para futuras fases:** schema eh fonte de verdade quando contradiz spec.
- **GT-2 (fase-01):** code fences ao redor do JSON do Output template removidas (instrucao explicita "sem code fences ao redor"). Cria divergencia visual com security-auditor.md (criado em Plano 01 fase-05) que usa ```json em "Shape". Cleanup cosmetico para Plano 05 fase-05 ou TODO.md.
- **GT-3 (fase-02):** api-auditor e infrastructure-auditor compartilham enum identico `COMPLIANT/ISSUES_FOUND/CRITICAL`. Reasoning examples e formato de `file` foram deliberadamente diferentes para evitar clone (G2/copy-paste laziness do plano).
- **GT-4 (fase-03):** `domain_status: "critical"` (string livre — qualidade) eh semanticamente diferente de `severity: "critical"` (enum — gravidade da issue). Ambiguidade documentada inline em prompts.
- **GT-5 (fase-03):** verification schema NAO tem `additionalProperties: false` — payload pode ter campos alem de `checks/issues/suggestions/domain_status`. plan-executor explora isso com tasks_completed/tasks_skipped. **Documentar** se Plano 04 quer normalizar para apenas checks[] ou aceitar shape estendido.
- **GT-6 (fase-05):** Reasoning de fixture vira "exemplo bom" para autores futuros (autores podem copy-paste). Reasoning fraco em fixture vira reasoning fraco em prompts copiados. Todas as 13 fixtures finais tem reasoning >50 chars distintos por dominio.

---

## Desvios do Plano

- **DEV-1 (fase-01):** Severity enum corrigido do plano (`info|warning|error|critical`) para o schema (`critical|high|medium|low`). Aplicado em 4 auditores.
- **DEV-2 (fase-02):** Idem — 3 auditores. Tambem: campo `location` do plano usado como `file` do schema (string semantica).
- **DEV-3 (fase-03):** plan-executor payload com shape DUAL (checks + tasks_completed/tasks_skipped) em vez de escolher um. Justificativa: schema compliance + riqueza semantica.
- **DEV-4 (fase-04):** TODO.md nao modificado (entrada equivalente ja existia). Desvio em relacao a "2 arquivos modificados" da spec, mas correto conforme princípio de nao-duplicacao.
- **DEV-5 (fase-05):** Test runner usa loop parameterizado (1 test() interno com forEach implicit) cobrindo 13 fixtures + 2 testes legados domain-especificos da fase-03 do Plano 02. Total final 27 testes (vs 14 antes de fase-05).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 5 (todas — divergencias menores documentadas) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Agentes migrados | 10 (somados aos 3 do Plano 02 = 13/13 total) |
| Fixtures novas | 10 (somadas as 3 pilotos = 13/13 total) |
| Testes adicionados | 13 (14 -> 27 em subagent-contract.test.ts) |
| Suite global | 714 -> 727 pass / 1 skip / 0 fail |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 04 — Orquestradores) PRECISA saber.

### Estado final do contrato

- **13/13 agentes migrados:** security-auditor, plan-verifier, design-explorer (Planos 01-02) + react-auditor, solid-auditor, code-smell-detector, tdd-verifier, api-auditor, database-analyzer, infrastructure-auditor, lesson-evaluator, plan-executor, documentation-writer (Plano 03).
- **13/13 fixtures verdes:** em `agents/__fixtures__/{agente}/{input.json, expected-output.json}`.
- **27 testes** em `skills/lib/subagent-contract.test.ts` cobrindo: tracer bullet E2E (Plano 01) + 14 testes base + 13 fixtures via loop parameterizado (Plano 03 fase-05).
- **Suite global:** 727 pass / 1 skip / 0 fail (vs 714 antes do Plano 03).

### Shapes por kind (canonico — consumiveis no Plano 04)

```ts
// audit (8 dos 13: security, react, solid, code-smell, tdd, api, database, infra, lesson-evaluator)
payload: {
  domain_status?: 'clean' | 'issues_found' | 'critical',  // 3-tier canonico
  issues: Array<{ severity: 'critical'|'high'|'medium'|'low', file?: string, line?: number, description: string }>
}

// verification (2 dos 13: plan-verifier, plan-executor)
payload: {
  domain_status?: string,  // varia por agente: plan-verifier usa pass/warn/fail; plan-executor usa done/partial
  checks: Array<{ name: string, status: 'pass'|'warn'|'fail'|'unable_to_verify', detail?: string }>,
  // plan-executor adiciona (campos extras OK):
  tasks_completed?: Array<{ id: string, summary: string }>,
  tasks_skipped?: Array<{ id: string, summary: string, reason: string }>
}

// proposal (1 dos 13: design-explorer)
payload: {
  proposal: {
    title: string, summary: string,
    constraints: string[],
    tradeoffs: Array<{ axis: string, choice: string }>,
    recommendation: string,
    alternatives: Array<{ id: string, title: string, rejected_because: string }>
  }
}

// mutation (1 dos 13: documentation-writer)
payload: {
  mutation: unknown  // stub v1; spec real em v6.2 (TODO.md)
}
```

### Recomendacoes para Plano 04 (handler generico, ordem por blast radius)

Ordem fixa do PRD §Riscos: execute-plan -> design-twice -> verify-work -> anti-vibe-review.

- **fase-01 execute-plan:** consumidor unico de `plan-verifier` (verification) + `plan-executor` (verification). Handler generico via `parseAndDispatch(raw, { verification: handler })`. Substituir parsing custom existente.
- **fase-02 design-twice:** consome 3 invocacoes paralelas de `design-explorer` (proposal). Consolida `payload.proposal` (campos estruturados para tabela comparativa) + `human_readable` (markdown integral 8 secoes).
- **fase-03 verify-work:** ate 8 auditores `kind: audit` em paralelo. Handler `parseAndDispatch(raw, { audit: handler })` agrega `payload.issues[]` + `payload.domain_status` + `reasoning` numa secao do relatorio.
- **fase-04 anti-vibe-review:** replica padrao do verify-work; cobertura ampla mas mesmo handler. Cuidado: este eh o de maior blast radius — confirmar com dev antes se escopo eh prep opt-in ou migracao completa (ja sinalizado em plano04 README, anomalia A2).

### withRetry helper (D9)

PRD Decisao #9 prescreve 1 retry default em `needs_retry`. Plano 04 fase-01 (execute-plan) deve criar `withRetry` em `skills/lib/` reusavel pelas 4 fases.

### APIs canonicas (lembrete)

- **`parseContract(raw: string) -> ValidationResult`** — validators/tests/CI.
- **`parseAndDispatch(raw: string, handlers: KindHandlers) -> DispatchResult`** — orquestradores (use isto nas 4 fases do Plano 04).

### Pendencias estruturais (Plano 05 fase-05 ou TODO.md)

- GT-2 (Plano 01): links broken em `plano05/fase-05-changelog-compound-merge.md`.
- GT-3 (Plano 01): `every_agents.md` raiz sem H1.
- GT-1 (Plano 03 fase-01): code fences ao redor do Output do security-auditor (criado em Plano 01 fase-05) divergem dos 10 prompts novos. Cleanup cosmetico.

---

<!-- Atualizado automaticamente durante execucao em 2026-05-14 -->
