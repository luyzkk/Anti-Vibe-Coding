# Summary: Contrato de Subagentes v1 (v6.1.0)

**Completed:** 2026-05-14
**Duration:** 2026-05-14 → 2026-05-14 (sessão única, múltiplos contextos)
**Planos:** 5 (5 completed, 0 skipped)
**Fases Total:** 23 (23 done, 0 skipped, 0 blocked)

---

## O que foi construído

### Plano 01 — Fundação do Contrato (5 fases)

- `docs/design-docs/ADR-0002-subagent-contract.md` — 10 decisões arquiteturais em tabela + 5 alternativas rejeitadas; headings em inglês (consistente com ADR-0001)
- `docs/design-docs/subagent-contract-v1.md` — Doc canônico: 8 seções, 4 exemplos por kind (audit/verification/proposal/mutation), migration guide com diff antes/depois copy-paste-ready, FAQ
- `agents/_contract/v1.schema.json` — JSON Schema draft-07, oneOf por kind, 4 variantes com discriminador `kind: { const: "..." }`, `"type":"object"` explícito (compat ajv v8 strict)
- `skills/lib/subagent-contract.ts` — Parser tolerante (`parseLooseJSON`), validator ajv (`validateContract`, `parseContract`), dispatch por kind (`parseAndDispatch`, `KindHandlers`), secret detection, threshold reasoning (rejeita <20, warn <50 chars)
- `agents/__fixtures__/security-auditor/` — Fixture piloto E2E (input.md + expected-output.json) validando envelope v1 end-to-end

### Plano 02 — Migração Piloto (4 fases)

- `agents/plan-verifier.md` — Migrado para kind: verification; prompt usa `checks[].name/status` (alinhado com schema real)
- `agents/design-explorer.md` — Migrado para kind: proposal; human_readable com 8 seções canônicas; schema proposalVariant corrigido de stub para `payload.proposal` com 6 campos required
- Correção de schema `v1.schema.json` proposalVariant (BUG-1: stub era incompatível com consumidor design-twice do Plano 04)
- Migration guide expandido em doc canônico: Status Mapping (4 tabelas), reasoning exemplos contrastantes, APIs do validator

### Plano 03 — Migração em Escala (5 fases)

10 agentes migrados: react-auditor, solid-auditor, code-smell-detector, tdd-verifier, api-auditor, database-analyzer, infrastructure-auditor, lesson-evaluator, plan-executor, documentation-writer

- Todos com frontmatter `kind` + `contract_version: "1.0"` + seção "Formato de Saída" com template JSON v1
- plan-executor normalizado: `done→complete`, `partial→complete+domain_status:partial`, payload dual (`checks[]` + `tasks_completed/tasks_skipped`)
- documentation-writer com envelope cosmético `kind: mutation` (spec real do payload = v6.2)
- 13 fixtures totais em `agents/__fixtures__/{agente}/`
- Test runner parameterizado: 27 testes (14 base + 13 loop por fixture)

### Plano 04 — Orquestradores via Handler Genérico (4 fases)

Ordem por blast radius crescente (PRD §Riscos):

- **execute-plan:** `withRetry<T extends SubagentContractBase>` exportado em subagent-contract.ts (cap=1 default, D9 escalation para needs_human); SKILL.md Step 4d substituiu parsing markdown por `parseAndDispatch` + D2/D9/D10
- **design-twice:** `consolidateProposals` em `skills/design-twice/index.ts`; ordem determinística por letter; usa `parseContract` (sem handlers — correto para este caso de uso); `ProposalPayload` alias de `ProposalContract['payload']['proposal']`
- **verify-work:** `consolidateAudits` + `invokeAndConsolidate` em `skills/verify-work/lib/audit-consolidator.ts`; dedup por file:line:description; severidade lowercase EN; Promise.allSettled + withRetry; CA-06 coberto por teste (auditor novo sem mudar código)
- **anti-vibe-review:** Escopo reduzido (v6.1.0): checklist inline preservado; bloco "## Delegação Opcional a Auditores" + `<report-template>` com seções condicionais para opt-in v6.2; allowed-tools ganhou Agent/Bash

### Plano 05 — Validação Final + Harness + Unlock /init (5 fases)

- `scripts/harness-validate.ts` estendido com `checkAgentContracts()` — regex em `agents/*.md` confirma que prompt instrui emissão de contrato v1 com os 5 tokens obrigatórios
- Husky 9 via `prepare` script + `.husky/pre-commit` (bloqueia commit quando agent staged não instrui v1; `.gitattributes` com LF para mitigar Windows CRLF)
- `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` confirmado com `requires: [v6.1.0-subagent-contract]` + subsecção §Dependências mapeando reconciler→verification, explorer→proposal, compound-writer→mutation
- Script `agents:contract` em `package.json` + step em `.github/workflows/harness.yml` apos `compound:check` (CA-07)
- `CHANGELOG.md` entry `## [6.1.0]` com Breaking Changes, Added, Changed, Security, Reservation v6.2
- **Remediação crítica:** `checkAgentContracts()` descobriu que claims anteriores de migração em agents/*.md eram fictícias (git log não tinha commits tocando agents/*.md). 13 prompts migrados de verdade em commit `b1fce74`; every_agents.md H1 + broken-links pré-existentes corrigidos
- Plan arquivado em `docs/exec-plans/completed/` via commit `17a2901`

---

## Decisões de Implementação (consolidado)

As mais significativas e generalizáveis entre os 5 planos:

| DI | Plano | Decisão |
|----|-------|---------|
| DI-4 (P01) | 01 | `"type": "object"` obrigatório em cada definition do JSON Schema — ajv v8 strict rejeita `properties` sem type explícito |
| DI-5 (P01) | 01 | Schema carregado via `readFileSync` — mais robusto com `exactOptionalPropertyTypes: true` do que import-attributes |
| DI-6 (P01) | 01 | Spread condicional `...(value ? { key: value } : {})` para campos opcionais em TypeScript com `exactOptionalPropertyTypes: true` |
| DI-4 (P02) | 02 | `parseContract()` para validators/tests, `parseAndDispatch()` para orquestradores — APIs servem propósitos distintos |
| DI-5 (P02) | 02 | `ProposalPayload` como alias de `ProposalContract['payload']['proposal']` — sincronizado com schema sem duplicar definição |
| DI-1 (P04) | 04 | `withRetry` genérico `<T extends SubagentContractBase>` preserva tipo concreto sem `as` no consumidor |
| DI-3 (P04) | 04 | Cap `max=1` default, segundo needs_retry escala para needs_human com reasoning anotado |
| DI-3 (P05) | 05 | **Commit aggregator pattern:** subagentes editam e reportam; orquestrador agrega + commita quando hook valida globalmente |
| DI-4 (P05) | 05 | Compound note não criada — MEMORY dos Planos 01-04 não contém evidência observada (só antecipada pelo PRD) |

---

## Bugs e Gotchas (consolidado — generalizáveis)

| ID | Plano | Tipo | Descrição |
|----|-------|------|-----------|
| BUG-1 | 02 | Schema stub | `proposalVariant` ficou como stub sem ser exercitado no Plano 01 — descoberto quando Plano 02 tentou usar. **Lição:** qualquer variante de schema deve ter ao menos 1 teste de integração com fixture real antes de passar para o próximo plano |
| BUG-P05-01 | 05 | Git state | STATE.md reivindica trabalho que nunca foi commitado. **Lição:** `git log -- agents/<file>` antes de marcar fase como completa — não confiar na memória da sessão |
| BUG-P05-02 | 05 | Hook paralelo | Pre-commit hook global + subagentes paralelos = cada commit individual falha (estado intermediário incompleto). **Solução:** orquestrador commita, não o subagente |
| GT-5 (P01) | 01 | TypeScript | `exactOptionalPropertyTypes: true` → array access retorna `T \| undefined`. Extrair para const + usar `?.` |
| GT-3 (P02) | 02 | API | `parseContract` vs `parseAndDispatch` — spec da fase misturava as duas. Usar `parseContract` em testes, `parseAndDispatch` em orquestradores |
| GT-06 (P04) | 04 | Git | `git stash` reverteu edições durante verificação de regressão. **Lição:** evitar stash em repos com muitos arquivos modificados por processos concorrentes — usar `git diff` direto |
| GT-P05-01 | 05 | Paralelismo | Hook que valida globalmente + subagentes paralelos = armadilha. Padrão recomendado documentado |
| GT-P05-02 | 05 | Paths | Contar `../` para paths relativos em markdown é error-prone. 4 ups de `docs/exec-plans/active/.../plano05/X.md` chega em `docs/`, não em root. Usar 5 ups para root |
| GT-P05-03 | 05 | Git tracking | Planning docs histórico sem rastrear — quando entram em git pela primeira vez, todos os problemas latentes (broken-links, H1 faltante) aparecem de uma vez. Rodar `git status` regularmente |

---

## Desvios dos Planos

| DEV | Plano | Desvio | Justificativa |
|-----|-------|--------|---------------|
| BUG-1 | 02 | proposalVariant expandido (1→3 arquivos) | Stub incompatível com consumidor real |
| DEV-P05-01 | 05 | Fase-01 disparou remediação ~3h fora de escopo | `checkAgentContracts()` revelou que migração Plano 01-03 era fictícia no git |
| DEV-P05-02 | 05 | Commit aggregator pattern | Hook bloqueou batches paralelos — padrão revisado |
| GT-07 (P04) | 04 | anti-vibe-review → prep opt-in v6.2 (não migração completa) | Checklist inline preservado; migração completa para v6.2 |

---

## Métricas Consolidadas

| Métrica | Valor |
|---------|-------|
| Planos | 5 |
| Fases total | 23 |
| Fases completas | 23 (100%) |
| Decisões de implementação | 38 (9+9+8+8+4) |
| Bugs encontrados | 6 (0+1+0+2+3) |
| Retries | 0 |
| Desvios significativos | 18 (4+5+5+2+2) |
| Agentes migrados | 13/13 |
| Fixtures criadas | 13 (em agents/__fixtures__/) |
| Testes adicionados | 27 (em subagent-contract.test.ts) |
| Testes globais finais | 31 pass (após fase-04 CI) |
| Commits do feature | ~15 (a0d743c → b1fce74 + CI + CHANGELOG + archive) |

---

## Gate Final (pré-merge, G-P05-06)

Todos os 5 gates passaram antes do merge/tag:
- `bun run harness:validate` → 0 failures (após remediação b1fce74)
- `bun run compound:check` → 0 failures
- `bun run agents:contract` → 13/13 passed (commit 780b951)
- `bun run test` → suite completa verde
- `bun run lint` → N/A (não configurado — pré-existente)

Tag `v6.1.0` + CHANGELOG entry `## [6.1.0]` entregues em commit `6de33e8`.

---

*Gerado por /execute-plan finalização administrativa em 2026-05-14*
