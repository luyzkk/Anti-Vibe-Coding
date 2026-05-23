# Audit: Consumidores de `contract_version` — Wave 2 Plano 01

**Gerado em:** 2026-05-23
**Schema atual:** `"1.0"` — sera bumpado para `"2.0.0"` na fase-02

---

## Resumo executivo

- **Total de matches (nao-historico):** 51
- **Emissores (escrita):** 13 arquivos (agents/*.md — cada agente emite JSON com `"1.0"`)
- **Consumidores/parsers (leitura — runtime):** 5 arquivos TypeScript que chamam `parseContract()` ou definem o tipo com `contract_version: '1.0'`
- **Schema canonico:** 2 arquivos (`agents/_contract/v1.schema.json` + `skills/lib/subagent-contract.ts`)
- **Documentacao:** 3 arquivos (`docs/design-docs/subagent-contract-v1.md`, `docs/design-docs/ADR-0002-subagent-contract.md`, `scripts/harness-validate.ts` token check)
- **Testes/fixtures:** 22 arquivos (test.ts com fixtures inline + `agents/__fixtures__/*/expected-output.json` + `skills/lib/__fixtures__/contract-v1/*.json`)
- **Historico (completed/):** 35 arquivos em `docs/exec-plans/completed/` — nao migrar
- **Bump status:** **needs-migration** — ha 5 callers de `parseContract()` em runtime que validam `contract_version: '1.0'` como literal TS e via AJV; quebram silenciosamente se o campo mudar sem adaptacao do parser

---

## Tabela de matches

| # | Caminho | Linha | Tipo | Snippet | Acao na fase-02/03 |
|---|---------|-------|------|---------|---------------------|
| 1 | `agents/security-auditor.md` | 99 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (fase-03) |
| 2 | `agents/security-auditor.md` | 125 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto para `"2.0.0"` (fase-03) |
| 3 | `agents/database-analyzer.md` | 67 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (fase-03 / Plano 02) |
| 4 | `agents/database-analyzer.md` | 87 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 5 | `agents/code-smell-detector.md` | 78 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 6 | `agents/code-smell-detector.md` | 91 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 7 | `agents/api-auditor.md` | 93 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 8 | `agents/api-auditor.md` | 119 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 9 | `agents/tdd-verifier.md` | 51 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 10 | `agents/tdd-verifier.md` | 78 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 11 | `agents/solid-auditor.md` | 71 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 12 | `agents/solid-auditor.md` | 98 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 13 | `agents/react-auditor.md` | 79 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 14 | `agents/react-auditor.md` | 106 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 15 | `agents/plan-verifier.md` | 85 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 16 | `agents/plan-verifier.md` | 111 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 17 | `agents/lesson-evaluator.md` | 56 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 18 | `agents/lesson-evaluator.md` | 76 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 19 | `agents/documentation-writer.md` | 81 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 20 | `agents/documentation-writer.md` | 102 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 21 | `agents/plan-executor.md` | 137 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 22 | `agents/plan-executor.md` | 163 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 23 | `agents/infrastructure-auditor.md` | 80 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 24 | `agents/infrastructure-auditor.md` | 94 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 25 | `agents/design-explorer.md` | 103 | Escrita | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` (Plano 02) |
| 26 | `agents/design-explorer.md` | 132 | Doc | `` `contract_version` sempre `"1.0"`. `` | Atualizar texto (Plano 02) |
| 27 | `agents/_contract/v1.schema.json` | 11 | Schema/Leitura | `"const": "1.0"` (AJV constraint) | **FEITO (fase-02)** — `v2.schema.json` criado com `"const": "2.0.0"`. v1 permanece imutavel. Ver migration guide. |
| 28 | `skills/lib/subagent-contract.ts` | 23 | Leitura/Tipo | `contract_version: '1.0'` (tipo TS literal) | **CRITICO — fase-03** — adicionar union ou novo tipo `SubagentContractBaseV2` com `contract_version: '2.0.0'`. Ver migration guide. |
| 29 | `skills/lib/subagent-contract.ts` | 267 | Leitura/Validator | `INVALID_CONTRACT_VERSION` — valida contra `"1.0"` | **CRITICO — fase-03** — adaptar validacao para aceitar `"2.0.0"` e rejeitar `"1.0"` com mensagem apontando migration guide. |
| 30 | `skills/verify-work/lib/audit-consolidator.ts` | 71, 165 | Leitura/Parser | `parseContract(inv.rawOutput)` — 2 call-sites | Adaptacao automatica quando `parseContract` aceitar v2 (fase-03 bloqueia). Ver migration guide. |
| 31 | `skills/design-twice/index.ts` | 54 | Leitura/Parser | `parseContract(inv.rawOutput)` | Adaptacao automatica quando `parseContract` aceitar v2 (fase-03 bloqueia). Ver migration guide. |
| 32 | `skills/init/lib/compound-writer.ts` | 193 | Leitura/Parser | `parseContract(rawOutput)` | Adaptacao automatica quando `parseContract` aceitar v2 (fase-03 bloqueia). Ver migration guide. |
| 33 | `skills/init/lib/migration-planner.ts` | 206 | Leitura/Parser | `parseContract(rawOutput)` | Adaptacao automatica quando `parseContract` aceitar v2 (fase-03 bloqueia). Ver migration guide. |
| 34 | `skills/init/lib/reconciler.ts` | 85 | Leitura/Parser | `parseContract(rawOutput)` | Adaptacao automatica quando `parseContract` aceitar v2 (fase-03 bloqueia). Ver migration guide. |
| 35 | `scripts/harness-validate.ts` | 275-276 | Leitura/Validator | `CONTRACT_TOKENS` inclui `'"1.0"'` como token obrigatorio em agents/*.md | **FEITO (fase-02)** — adaptado para aceitar `"1.0"` OU `"2.0.0"` em modo transitional. Fixture `valid-audit` atualizada. |
| 36 | `docs/design-docs/subagent-contract-v1.md` | 50, 76, 139, 176, 220, 261, 333, 510-511 | Documentacao | 8 ocorrencias — exemplos JSON + tabela de validacao | **FEITO (fase-02)** — todos os exemplos atualizados para `"2.0.0"`. Secoes Anti-Degeneration e Composition adicionadas. |
| 37 | `docs/design-docs/ADR-0002-subagent-contract.md` | 38, 53 | Documentacao | Mencoes a `"1.0"` fixo em v1 | Adicionar nota de historico — v1 usava literal; v2 usa semver (fase-02) |
| 38 | `agents/__fixtures__/security-auditor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar para `"2.0.0"` junto com o agente (fase-03) |
| 39 | `agents/__fixtures__/infrastructure-auditor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 40 | `agents/__fixtures__/code-smell-detector/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 41 | `agents/__fixtures__/solid-auditor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 42 | `agents/__fixtures__/plan-verifier/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 43 | `agents/__fixtures__/react-auditor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 44 | `agents/__fixtures__/api-auditor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 45 | `agents/__fixtures__/documentation-writer/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 46 | `agents/__fixtures__/plan-executor/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 47 | `agents/__fixtures__/design-explorer/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 48 | `agents/__fixtures__/lesson-evaluator/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 49 | `agents/__fixtures__/database-analyzer/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 50 | `agents/__fixtures__/tdd-verifier/expected-output.json` | 2 | Fixture | `"contract_version": "1.0"` | Bumpar (Plano 02) |
| 51 | `skills/lib/__fixtures__/contract-v1/*.json` | 2 | Fixture (4 arquivos) | `"contract_version": "1.0"` (valid.json, short-reasoning.json, secret-in-payload.json, invalid-status.json) | Manter como fixtures v1 deprecadas; criar equivalentes `contract-v2/` para testes novos (fase-02) |
| 52 | `skills/verify-work/lib/audit-consolidator.ts` | 170 | Escrita sintetica | `contract_version: '1.0' as const` — emite contrato sintetico para needs_retry | Adaptar junto com o tipo base (fase-02) |
| 53 | `skills/execute-plan/index.test.ts` | 64 | Fixture-teste | `contract_version: '1.0'` em fixture inline | Atualizar apos fase-02 (nao bloqueia) |
| 54 | `skills/design-twice/index.test.ts` | 14, 38, 51 | Fixture-teste | 3 fixtures inline com `contract_version: '1.0'` | Atualizar apos fase-02 (nao bloqueia) |
| 55 | `skills/lib/subagent-contract.test.ts` | 36, 51, 65, 81, 95, 232 | Fixture-teste | 6 fixtures inline com `contract_version: '1.0'` | Atualizar apos fase-02 — testes de comportamento devem cobrir `"2.0.0"` tambem |
| 56 | `skills/verify-work/lib/audit-consolidator.test.ts` | 20, 193, 248 | Fixture-teste | 3 fixtures inline com `contract_version: '1.0'` | Atualizar apos fase-02 (nao bloqueia) |
| 57 | `skills/init/lib/migration-planner.test.ts` | 37, 215, 269 | Fixture-teste | 3 fixtures inline com `contract_version: '1.0'` | Atualizar apos fase-02 (nao bloqueia) |
| 58 | `skills/init/lib/compound-writer.test.ts` | 73 | Fixture-teste | 1 fixture inline com `contract_version: '1.0'` | Atualizar apos fase-02 (nao bloqueia) |
| 59 | `skills/init/lib/prompts/reconciler.md` | 29 | Escrita (prompt) | `"contract_version": "1.0"` em exemplo de output esperado | Bumpar para `"2.0.0"` (Plano 02 — prompt instrui o LLM a emitir esta versao) |
| 60 | `skills/init/lib/prompts/compound.md` | 26 | Escrita (prompt) | `"contract_version": "1.0"` em exemplo de output esperado | Bumpar para `"2.0.0"` (Plano 02) |
| 61 | `skills/init/lib/prompts/explorer.md` | 32, 110 | Escrita (prompt) | 2 ocorrencias de `"contract_version": "1.0"` | Bumpar ambas para `"2.0.0"` (Plano 02) |
| 62 | `tests/harness-validate-agent-contracts.test.ts` | 7, 13, 17 | Leitura/Teste | Testes de `checkAgentContracts` verificam presenca de token `contract_version` e `"1.0"` | Adaptar apos mudanca em `harness-validate.ts` CONTRACT_TOKENS (fase-02) |
| 63 | `tests/fixtures/agent-contract-fixtures/valid-audit/example-auditor.md` | 13 | Fixture-teste | `"contract_version": "1.0"` | Criar equivalente v2 + manter v1 como caso de compatibilidade retroativa (fase-02) |
| 64 | `tests/fixtures/agent-contract-fixtures/missing-reasoning/missing-reasoning.md` | 12 | Fixture-teste | `"contract_version": "1.0"` | Manter — testa campo ausente, versao nao e o ponto focal |
| 65 | `tests/fixtures/agent-contract-fixtures/missing-kind/missing-kind.md` | 11 | Fixture-teste | `"contract_version": "1.0"` | Manter — testa campo ausente, versao nao e o ponto focal |
| 66 | `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/design-docs/ADR-001.md` | 12 | Doc (fixture) | `contract_version` citado em texto | Historico de fixture — nao migrar |
| 67 | `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/compound/2026-04-01-compound.md` | 20 | Doc (fixture) | `contract_version` citado em texto | Historico de fixture — nao migrar |

**Matches em `docs/exec-plans/completed/`:** 35 arquivos. Todos historicos — nao requerem migracao.

---

## Callers descobertos em `agents/_contract/`

`agents/_contract/` contem **2 arquivos**:

### `v1.schema.json`

JSON Schema draft-07 canonico do contrato v1. Usado por `skills/lib/subagent-contract.ts` que o carrega via `readFileSync` e valida com AJV. Define:

- `"const": "1.0"` na propriedade `contract_version` — AJV rejeita qualquer outro valor com erro
- `required: ["contract_version", "agent", "kind", "status", "reasoning", "payload"]`
- `oneOf` com 4 variantes de payload: `auditVariant`, `verificationVariant`, `proposalVariant`, `mutationVariant`

**Impacto no bump:** Adicionar `v2.schema.json` com `"const": "2.0.0"`. O README de `_contract/` documenta explicitamente que "versoes futuras adicionam novos arquivos; v1 fica imutavel" — policy ja prevista.

### `README.md`

Documentacao do diretorio. Confirma policy de imutabilidade de versoes anteriores e aponta para `docs/design-docs/subagent-contract-v1.md` como spec em prosa.

**Nao ha `validator.ts`, `schema.ts` ou `parser.ts`** — a logica TypeScript de validacao vive inteiramente em `skills/lib/subagent-contract.ts`.

---

## Decisao de migracao

- [x] **Bump PRECISA DE MIGRACAO** — ha 5 callers de `parseContract()` em runtime e 1 schema AJV com `"const": "1.0"` hardcoded; sem adaptacao do parser, outputs v2 de agentes sao rejeitados silenciosamente com `INVALID_CONTRACT_VERSION`.

**Justificativa:** `skills/lib/subagent-contract.ts` define `contract_version: '1.0'` como tipo literal TypeScript E valida via AJV com `"const": "1.0"` — qualquer agente emitindo `"2.0.0"` falha na validacao antes de chegar ao handler. Os 5 callers downstream (`audit-consolidator.ts`, `design-twice/index.ts`, `compound-writer.ts`, `migration-planner.ts`, `reconciler.ts`) dependem desta validacao; sao afetados indiretamente.

**Sequencia obrigatoria de migracao:**
1. `fase-02`: Adaptar `skills/lib/subagent-contract.ts` (tipo + validacao) + adicionar `v2.schema.json` + adaptar `scripts/harness-validate.ts` CONTRACT_TOKENS
2. `fase-03`: Bumpar `agents/security-auditor.md` (tracer bullet)
3. `Plano 02`: Bumpar os 12 agentes restantes + fixtures + prompts

---

## Callers de `parseContract()` — mapa detalhado

| Arquivo | Call-sites | Kind esperado | Impacto |
|---------|-----------|---------------|---------|
| `skills/verify-work/lib/audit-consolidator.ts` | linha 71 + linha 165 | `audit` | Parseia outputs dos auditores no pipeline verify-work |
| `skills/design-twice/index.ts` | linha 54 | `proposal` | Parseia outputs dos design-explorers |
| `skills/init/lib/compound-writer.ts` | linha 193 | `mutation` | Parseia output do compound-writer subagent |
| `skills/init/lib/migration-planner.ts` | linha 206 | `mutation` | Parseia output do explorer subagent |
| `skills/init/lib/reconciler.ts` | linha 85 | `verification` | Parseia output do reconciler subagent |

---

## Migration Guide

**Migration guide disponivel em `docs/design-docs/subagent-contract-v2-migration.md`.**

Para cada parser listado como "Leitura/Parser" ou "Leitura/Validator" na tabela acima, a acao na fase-03 e:

1. Atualizar tipo TS (`contract_version: '2.0.0'` + campos `positive_observations` e `verdict`)
2. Adaptar type guard / validator AJV para aceitar `"2.0.0"` (ou criar `v2.schema.json` — ja criado em fase-02)
3. Emitir erro claro quando receber v1.0 apontando para `docs/design-docs/subagent-contract-v2-migration.md`
4. Adicionar/atualizar testes: caso v2.0.0 valido + caso v1.0 rejeitado

Ver checklist completo no migration guide.

---

## Notas para fase-02

### Descobertas que alteram o sizing

1. **`scripts/harness-validate.ts` token check inesperado (GT candidato):** `CONTRACT_TOKENS` inclui `'"1.0"'` como string literal exata. Isso significa que apos o bump, `harness:validate` vai REJEITAR todos os agents que migrarem para `"2.0.0"` — o check procura `"1.0"` no texto do arquivo. A fase-02 DEVE adaptar este check antes ou junto com o bump dos agents. Impacto: +30min no sizing de fase-02.

2. **`audit-consolidator.ts` emite contrato sintetico** (linha 170): `contract_version: '1.0' as const` — alem de consumir, tambem EMITE. Este e um emissor secundario que passa batido se buscar apenas por `contract_version` em strings literais nos agents.

3. **Prompts LLM em `skills/init/lib/prompts/`** (3 arquivos, 4 ocorrencias): os prompts instruem os LLMs a emitirem JSON com `"1.0"`. Se nao forem atualizados, os subagents da init continuarao emitindo v1 mesmo apos o bump do schema — silently broken. Adicionar ao escopo de Plano 02.

4. **Zero parsers em `agents/_contract/`** — confirma que o validator canonico e `skills/lib/subagent-contract.ts`, nao ha surpresas de infraestrutura em diretorio separado.

5. **`tests/harness-validate-agent-contracts.test.ts` linha 13** usa `'missing-contract-version'` como fixture e verifica que o validator detecta ausencia. Este teste passa mesmo apos o bump (ausencia ainda e erro), mas o teste na linha 7 (`valid-audit`) pode falhar se a fixture nao for atualizada para `"2.0.0"` — verificar na fase-02.

### Sem descobertas bloqueadoras

Nenhum parser externo (CI, pre-commit hook externo, scripts de deploy) foi encontrado. O scope e totalmente interno ao repositorio. Migracao e cirurgica.
