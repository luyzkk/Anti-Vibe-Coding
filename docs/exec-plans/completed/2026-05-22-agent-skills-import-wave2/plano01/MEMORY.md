# Memoria: Plano 01 — Tracer Bullet Schema v2.0.0 + Gold Standard (security-auditor)

**Feature:** Agent-Skills Import — Wave 2 — Plano 01
**Iniciado:** pendente
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Wave2-P01-harness-token (fase-01):** `scripts/harness-validate.ts` linha 276 inclui `'"1.0"'` como token obrigatorio em `CONTRACT_TOKENS`. Fase-02 DEVE adaptar este check (substituir por `"2.0.0"` OU aceitar ambos durante transicao) — sem isso o `bun run harness:validate` da fase-03 vai REJEITAR o security-auditor refinado. Adiciona ~15min ao sizing da fase-02.
- **DI-Wave2-P01-emissor-sintetico (fase-01):** `skills/verify-work/lib/audit-consolidator.ts` linha 170 emite `contract_version: '1.0' as const` sinteticamente (fallback para needs_retry). E tanto consumidor quanto emissor — nao aparece em busca por `agents/*.md`. Bumpar tambem na fase-03 (parser e emissor no mesmo commit).
- **DI-Wave2-P01-prompts-llm (fase-01):** `skills/init/lib/prompts/` contem 3 arquivos (reconciler.md, compound.md, explorer.md) que instruem LLMs a emitirem `"1.0"`. NAO sao agentes auditores — sao subagents da init. Decisao: deixar fora do escopo da fase-03 (Plano 02 ou Wave 3 — registrar como notas para Plano 04). Rationale: nao bloqueiam o tracer bullet.
- **DI-Wave2-P01-schema-canonico (fase-01):** Validacao do contract_version e feita por JSON Schema AJV em `agents/_contract/v1.schema.json` (`"const": "1.0"`), carregado por `skills/lib/subagent-contract.ts`. Fase-02 DEVE atualizar o schema JSON (nao apenas a doc `.md`) — sem isso, parsers continuam rejeitando v2.
- **DI-Wave2-P01-schema-v2-novo-arquivo (fase-02):** RESOLUCAO da DI-schema-canonico: criado `agents/_contract/v2.schema.json` novo em vez de editar v1 in-place. Rationale: `agents/_contract/README.md` documenta explicitamente "versoes futuras adicionam novos arquivos; v1 fica imutavel". Editar v1 violaria policy pre-existente. **Acao em fase-03/Plano 02:** `skills/lib/subagent-contract.ts` precisa carregar v2.schema.json (alem de v1) — verificar se ja foi adaptado.
- **DI-Wave2-P01-harness-transitional (fase-02):** RESOLUCAO da DI-harness-token: `CONTRACT_VERSION_TOKENS` em `scripts/harness-validate.ts` aceita AMBOS `"1.0"` e `"2.0.0"` em modo transitional. Rationale: durante Plano 01→02, 12 de 13 agentes ainda emitem `"1.0"`. Trocar exclusivamente para `"2.0.0"` faria todos falharem no harness. **Acao em Plano 02 (apos refinar os 12 agentes):** remover `"1.0"` da alternativa — modo transitional encerra.
- **DI-Wave2-P01-harness-type-coercion (fase-02):** `missing.push('"1.0" or "2.0.0"' as ...)` usa type assertion fraca em harness-validate.ts. Compila mas a string nao e membro real do tipo. Candidato a refactor quando o modo transitional sair (Plano 02). Nao bloqueia agora.
- **DI-Wave2-P01-synthetic-contract-stays-v1 (fase-03):** Objeto sintetico de `needs_retry` em `skills/verify-work/lib/audit-consolidator.ts:172` MANTIDO como `'1.0' as const`. Razao: `SubagentContractBaseV2` exige `verdict` e `positive_observations` obrigatorios — esse objeto e sinal de controle interno do orquestrador, NAO output real de agente. Bumpar quebraria typecheck sem ganho. **Importante para Plano 02/04:** este NAO e oversight — e decisao de design.
- **DI-Wave2-P01-validateContract-transitional (fase-03):** `validateContract` em `skills/lib/subagent-contract.ts` agora detecta `contract_version` do payload e escolhe `validateSchemaV1` ou `validateSchemaV2` — modo transitional ate Plano 02 completar. Contratos com versao desconhecida usam v1 (rejeita com `INVALID_CONTRACT_VERSION`).
- **DI-Wave2-P01-subagent-v2-types (fase-03):** Adicionados em `skills/lib/subagent-contract.ts`: `Verdict`, `SubagentContractBaseV2`, `AuditContractV2`, `SubagentContractBaseAny`, `SubagentContractV2`. `InvokeFn` e `withRetry` aceitam `SubagentContractBaseAny`. **Estes tipos sao a FUNDACAO para Plano 02** — todos os 12 agentes os usam.

---

## Gotchas

- **GT-Wave2-P01-schema-required-description (fase-03):** `agents/_contract/v2.schema.json` exige `"description"` (NAO `"title"`) nos objetos `issues[]` do `auditVariant`. A spec original da fase-03 sugeriu JSON de exemplo com `"title"` sem `"description"` — corrigido no gold standard. **Acao em Plano 02:** ao replicar nos 12 agentes, garantir que cada bloco JSON de exemplo use `"description"` (e nao `"title"`) ou inclua ambos.
- **GT-Wave2-P01-no-lint-script (fase-03):** `package.json` NAO tem script `lint` configurado — apenas `typecheck`. Checklist do plano (e do plugin geral) que reza "rodar bun run lint" falha silenciosamente. Plano 04 deve considerar adicionar lint OU atualizar checklist removendo referencia.
- **GT-Wave2-P01-preexisting-harness-failures (fase-03):** `bun run harness:validate` tem falhas pre-existentes em `Infos/knowledge/Rails` (markdown-heading, broken-link) e `tmp/trash/` — NAO relacionadas a fases desta Wave. Ignorar nas verificacoes; documentar como tech-debt separada.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **Gold standard:** `f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md`
- **Schema v2.0.0:** `f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md`
- **Migration guide parsers:** `f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v2-migration.md`
- **Audit map de consumidores:** `f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano01/audit-consumers.md`
- **Validator anti-generico localizado em (fase-04):** `f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.ts`
- **API do validator:** `validatePositiveObservations(items: unknown): ValidationResult`
- **Fixture de referencia humana:** `f:/Projetos/Anti-Vibe-Coding/agents/_contract/__fixtures__/positive-observations.fixture.ts`
- **Uso em Plano 02 (validacao batch dos 12 agentes):**
  ```ts
  import { validatePositiveObservations } from 'agents/_contract/positive-observations-validator'
  for (const agentPath of agentFiles) {
    // 1. Localizar bloco JSON de exemplo no .md do agente
    // 2. Extrair positive_observations[]
    // 3. validatePositiveObservations(observations)
    // 4. Reportar agentes com observacoes invalidas (rejeitar antes de merge)
  }
  ```
- **Parsers ajustados na fase-03:** `skills/lib/subagent-contract.ts` (validateContract, tipos v2), `scripts/harness-validate.ts` (CONTRACT_VERSION_TOKENS transitional).
- **DI-Wave2-P01-fixture-convencao (fase-04):** Fixture TS criada em `agents/_contract/__fixtures__/` (sub-pasta do _contract, NAO em `agents/__fixtures__/`). Convencao pre-existente `agents/__fixtures__/` usa JSON por-agente. A nova convencao TS fica no _contract porque e reutilizavel como validator em codigo, nao como dado de fixture por agente.

---

<!-- Atualizado automaticamente durante execucao -->
