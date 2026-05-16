---
slug: v6.3.1-coaching-honesty
date: 2026-05-15
status: draft
requires: [2026-05-14-v6.3.0-adaptive-coaching]
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-15 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# PRD: v6.3.1 — Adaptive Coaching: Honesty & Wire-up

**Status:** Draft
**Author:** Luiz/dev + AI
**Date:** 2026-05-15
**Context:** Patch corretivo da v6.3.0 baseado em verify-work + revisão fresh-context. Referência: `docs/exec-plans/completed/2026-05-14-v6.3.0-adaptive-coaching/SUMMARY.md`.

---

## Problema

A v6.3.0 (5 planos, 17 fases, ~44 commits) shippou o Adaptive Coaching Framework com 4 divergências PRD↔ship identificadas no verify-work pós-merge (subagente em fresh-context não confirmou). Cada divergência tem evidência commit/linha em código corrente:

1. **AST honesty quebrada (severidade Alta)** — `skills/lib/capabilities-writer.ts:198-207` ship `source: 'ast', confidence: 1.0` mas `extractMethods()` (linhas 38-50) usa regex `/export\s+(?:async\s+)?function\s+(GET|POST|...)/`. ADR-0020 §D4 declara: "Every entry in capabilities.json declares source: 'ast' | 'llm'. Auditors and skills must prioritize ast entries." Label incorreto polui qualquer auditor downstream que filtra por `source === 'ast'`. RF-MH-02 do PRD v6.3.0 prometia "AST-first" — promessa não cumprida.

2. **tool-registry-inspector cego em agents reais (severidade Alta)** — `skills/lib/tool-registry-inspector.ts:96-97` lê `data['allowed-tools']`, mas todos os 13 `agents/*.md` reais (ex: `agents/security-auditor.md:6`, `agents/plan-executor.md:6`, `agents/design-explorer.md:6`) usam `tools:` (convenção Claude Code: agents=`tools`, skills=`allowed-tools`). Resultado: `inspectToolRegistry` retorna `subagents[*].allowed_tools === []` para todos agents reais, tornando `/parity-audit` cego ao registro. SUMMARY v6.3.0 confirma: "DEV-1 Plano 03: agentes reais usam `tools:`, fixtures/parser usam `allowed-tools:`. **Permanece pendente**."

3. **/parity-audit inerte no harness (severidade Alta)** — `skills/parity-audit/SKILL.md:7` declara `allowed-tools: Read, Glob, Grep, Write, AskUserQuestion` (sem Bash). Os Passos 2-4 (linhas 23-37) instruem "Importe `inspectToolRegistry` de `skills/lib/tool-registry-inspector.ts`" e "Chame `writeParityGaps(output, process.cwd())`", mas não existe `scripts/parity-audit.ts` nem entry `parity:audit` em `package.json` (verificado: `package.json` linhas 6-17 listam scripts; nenhum é parity). Skill é documentada mas não executável no harness do Claude Code.

4. **Schema parity-gaps drifted em 3 campos (severidade Média)** — `discovery/_schemas/parity-gaps-v1.schema.json:45-58` define:
   - `mcps: { items: { type: "string" } }`
   - `builtin_tools: { items: { type: "string" } }`
   - `subagents: { items: { type: "string" } }`

   Mas runtime (`skills/lib/tool-registry-inspector.ts:11-24`) produz:
   - `mcps: Array<{ name: string, tools: string[] }>`
   - `builtin_tools: Array<{ name: string }>`
   - `subagents: Array<{ name: string, description: string, allowed_tools: string[] }>`

   Schema falha em validar runtime real. SUMMARY v6.3.0 lista como "Permanece pendente — escopo v6.3.1" (note: SUMMARY menciona só `mcps`; análise para este PRD encontrou drift em 3 campos, não 1).

**Impacto agregado:** parity-audit é o eixo central da v6.3.0 e está documentado mas inerte. Honestidade de label (`source`) polui auditores. Schema mente sobre shape. A feature "shippou" sem cumprir 4 contratos do PRD original.

---

## Solução

### Outcomes (declarativo)

- `capabilities.json` para `nextjs-app-router` declara `source: 'ast'` somente quando a coleta usar AST real (`@typescript-eslint/parser`).
- `inspectToolRegistry` lê o frontmatter canônico dos agents (`tools:`) e mantém compatibilidade com fixtures legadas (`allowed-tools:`) emitindo deprecation warning.
- `/parity-audit` é executável end-to-end no harness Claude Code via `bun run parity:audit [task_type]` ou via skill UI.
- Schema `parity-gaps-v2.schema.json` valida o runtime real (shapes ricos em 3 campos) e `parity-gaps-writer.ts` escreve em conformidade.
- gap-rules cruzam capabilities declaradas com USO real no projeto (grep imports/rotas) — CA-05 do PRD v6.3.0 cumprido.
- Skills consumidoras de `capabilities.json` emitem warning silencioso quando `generated_at` > 24h — CA-08 do PRD v6.3.0 cumprido.
- `/architecture` e `/detect-architecture` migradas a `readPrefaceContext`; as 2 tolerâncias em `checkProfileAwarePreface` removidas — CA-11 do PRD v6.3.0 cumprido.

### Mecanismo (algorítmico)

1. **AST real:** trocar `extractMethods()` em `capabilities-writer.ts:38-50` por traversal AST usando `@typescript-eslint/parser` (`parseForESLint` ou `parse` com `range: true, loc: true`). Walk `Program > ExportNamedDeclaration > FunctionDeclaration` (case `export async function GET`) e `Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator` com `id.name` em HTTP verbs e `init` arrow/function (case `export const GET = async () => {}`). Captura `loc.start.line` para preservar `handler: 'app/.../route.ts:42'`. Enum `CapabilitySource` permanece `'ast' | 'llm'` — sem expansão (D4 do ADR-0020 intacto).

2. **Dual-field parser:** `readSubagents()` em `tool-registry-inspector.ts:78-107` lê `data['tools']` primeiro; fallback para `data['allowed-tools']` com warning único por agente ao stderr: `[deprecation] agent {name} uses 'allowed-tools'; canonical is 'tools' (per Claude Code convention)`. Fixtures de teste em `tests/fixtures/v6-state-fixture/agents/` migram para `tools:`. Comentário inline com provenance no parser explicando precedência.

3. **/parity-audit wire-up:** novo `scripts/parity-audit.ts` seguindo padrão GT-3/DEC-4 da v6.3.0 (Plano 05 fase-03):
   ```ts
   export async function audit(
     projectRoot: string,
     taskType: string | null
   ): Promise<{ stdout: string[]; stderr: string[]; code: number }>
   ```
   Entrypoint guarded por `import.meta.main`. Entry `parity:audit` em `package.json` inserido alfabeticamente entre `new-plan` e `preface:simulate`. `skills/parity-audit/SKILL.md` ganha `Bash` em `allowed-tools:` (passa de 5 → 6 tools). Passos 2-4 reescritos para `Run: bun run parity:audit "$task_type"`. Skill mantém kind:"audit", user-invocable:true.

4. **Schema v2:** `discovery/_schemas/parity-gaps-v2.schema.json` substitui v1 com shapes ricos nos 3 campos drifted:
   - `mcps: Array<{ name: string, tools: string[] }>`
   - `builtin_tools: Array<{ name: string }>`
   - `subagents: Array<{ name: string, description: string, allowed_tools: string[] }>`
   - `schema_version` const "2.0", `$id: parity-gaps-v2`.
   - Header inclui migration note: "v2 alinha schema ao runtime (v6.3.1). v1 deprecated — remover em v6.4."
   `parity-gaps-writer.ts` valida contra v2 e escreve `schema_version: '2.0'`. v1 permanece em `discovery/_schemas/` como referência histórica até v6.4.

5. **CA-05 use crossing:** `skills/parity-audit/lib/gap-rules.ts` ganha função `crossCapabilitiesWithUsage(capabilities, projectRoot)` que executa Grep por `import.*['"]<handler>['"]` e referências de rota no projeto. Capabilities sem nenhuma referência ganham gap com `severity: 'nice'` e `suggestion: 'declared but not referenced — remove or wire-up'`.

6. **CA-08 stale wire-up:** as 6 skills profile-aware (`security`, `api-design`, `system-design`, `design-patterns`, `decision-registry`, `lessons-learned`) ganham bloco silencioso pós preface-block invocando `isStale(capabilities.generated_at)` de `stale-detector.ts` (já existe — wire-up only). Output: stderr `capabilities.json stale (>24h) — run /init --refresh`. Não-bloqueante (NUNCA bloqueia execução, alinhado com `stale-detector.ts` doc).

7. **CA-11 tolerâncias:** migrar `skills/architecture/SKILL.md` e `skills/detect-architecture/SKILL.md` ao bloco `<!-- profile-aware-preface:start --> ... :end -->` com `readPrefaceContext` (em vez de `readArchitectureProfile`). Após migração estabilizar (Plano 02 fase-07), remover as 2 condições tolerantes em `scripts/harness-validate.ts:618-636` (aceita `readArchitectureProfile(` alt + skip silencioso prosa-only).

---

## Requisitos Funcionais

### Must Have

- [ ] RF-MH-01: `capabilities-writer.ts:discoverNextjsAppRouterCapabilities` usa AST real via `@typescript-eslint/parser`. Cobertura: `export function GET`, `export async function GET`, `export const GET = async () => {}` (arrow assignment).
- [ ] RF-MH-02: `tool-registry-inspector.ts:readSubagents` lê `tools:` em agents/*.md como canônico; fallback a `allowed-tools:` com deprecation warning 1× por agent.
- [ ] RF-MH-03: `bun run parity:audit [task_type]` executa end-to-end e escreve `discovery/parity-gaps.json` válido contra schema v2.
- [ ] RF-MH-04: `discovery/_schemas/parity-gaps-v2.schema.json` reflete runtime real (mcps/builtin_tools/subagents com objetos ricos) e `parity-gaps-writer.ts` escreve em conformidade.

### Should Have

- [ ] RF-SH-01: `gap-rules.crossCapabilitiesWithUsage` cruza capabilities com uso real (grep imports/rotas) — cumpre CA-05 da v6.3.0.
- [ ] RF-SH-02: as 6 skills profile-aware emitem warning silencioso ao stderr quando `capabilities.json > 24h` (CA-08 da v6.3.0).

### Could Have

- [ ] RF-CH-01: `/architecture` + `/detect-architecture` migram a `readPrefaceContext`; as 2 tolerâncias em `checkProfileAwarePreface` removidas (CA-11 da v6.3.0).

### Won't Have (desta versão)

- Preencher slots `PrefaceContext.language` / `framework` — D2 do ADR-0020 reserva para v6.5/v6.6. CA-09 garante non-breaking.
- Reescrita do capabilities-writer para profiles além de `nextjs-app-router` e `mvc-flat` — D3 do ADR-0020 mantém limite (clean-architecture-ritual, vertical-slice, unknown-mixed sem coleta).
- Adicionar novos profiles além dos 5 fixtures atuais.
- Migração automática de v1→v2 do schema parity-gaps em projetos cliente — gitignored (D8), regen via `/init --refresh`.
- Substituir LLM-fallback do profile `mvc-flat` por AST — `source: 'llm', confidence: 0.7` permanece por design (D4).

> **Nota MoSCoW:** Must Have = 4/7 (57%), excede o teto recomendado de 40%. Justificativa: todos os 4 musts são defeitos de contrato verificados via fresh-context — não são "features importantes", são bugs. Excluir qualquer um invalida a v6.3.0 como release confiável. Should/Could (3 itens) são cumprimentos atrasados de CAs já no PRD v6.3.0.

---

## Requisitos Não-Funcionais

- **Performance:** AST traversal de 50 route.ts files em < 500ms (vs. < 100ms do regex anterior — trade-off aceitável para honestidade). Benchmark em fixture grande durante fase-01.
- **Segurança:** sem novas superfícies de entrada. `@typescript-eslint/parser` é parse-only (não executa código do usuário). Aplicar GT-4 (path-traversal regex) se algum script novo aceitar paths de usuário.
- **Acessibilidade:** N/A (sem UI).
- **Observabilidade:** deprecation warning de `allowed-tools:` em agents vai para stderr com prefixo `[deprecation]`; 1× por agent (cached em Set no parser).

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| 1 | Como sanar AST label desonesto (Item 1) | AST real com `@typescript-eslint/parser`, enum `CapabilitySource = 'ast' \| 'llm'` intacto | (a) Relabel para `'regex'` com enum bump v1.1 + confidence 0.9. (b) AST real expandindo enum para `'ast' \| 'regex' \| 'llm'`. | Resolve no PRD em vez de empurrar promessa RF-MH-02 para v6.4. Preserva contrato D4 do ADR-0020 (auditores priorizam `'ast'`). Custo (+dep ~3MB + ~50 LOC + tests) é aceitável. |
| 2 | Como suportar `tools:` vs `allowed-tools:` em agents (Item 2) | Dual-read com precedência `tools:` + deprecation warning 1× por agent | (a) Strict `tools:` apenas (quebra fixtures). (b) Strict `allowed-tools:` (renomear 13 agents reais contra convenção CC oficial). | Alinha com convenção Claude Code (agents=`tools`, skills=`allowed-tools`) sem quebrar fixtures legadas. Warning torna deprecation visível sem bloquear migração. |
| 3 | Como tornar /parity-audit executável (Item 3) | Bash em `allowed-tools` + `scripts/parity-audit.ts` pure-fn (padrão GT-3/DEC-4) | (a) Bash inline com `bun -e "..."` no SKILL.md. (b) Reescrever skill em Read+Glob+Grep puro (sem TS executável). | Pure-fn já validado em `preface:simulate` (Plano 05 fase-03, lição L-3/P-2 emergente). Inline quebra encoding no Windows. Read+Glob+Grep duplica lógica em prosa frágil — sem garantia de fidelidade ao `tool-registry-inspector`. |
| 4 | Como alinhar schema parity-gaps ao runtime (Item 4) | Bump v1 → v2 com shape rico em 3 campos | (a) Schema v1.1 aditivo (`oneOf: [string, object]`). (b) Flatten runtime para `string[]`. | parity-gaps.json é gitignored (D8) — sem consumidor externo, custo de migração é zero. Flatten perderia info de `tools` e `allowed_tools` que CA-05 (use crossing) precisa. v1.1 aditivo dilui semântica e mantém ambiguidade. |
| 5 | Manter v1 schema deprecated ou remover imediatamente | Deprecated em v6.3.1, remover em v6.4 | Remover em v6.3.1 (clean cut). | Permite que `docs/exec-plans/completed/` antigos continuem referenciáveis sem 404 no `$id`. v6.4 promove v2 a `$id: parity-gaps-v1` se decidirmos reset. |
| 6 | 1 plano × 7 fases ou 2 planos × 3-4 fases | 2 planos (Must Have / Should-Could) | 1 plano monolítico × 7 fases. | Permite verify-work gate entre Must e Should/Could. Se Should/Could escapar do prazo, Must já entregou valor verificado. |

---

## Critérios de Aceite

- [ ] CA-01: Dado `app/api/foo/route.ts` com `export async function GET(){}`, quando `discoverNextjsAppRouterCapabilities()` rodar, então capability registrada tem `source: 'ast'`, `confidence: 1.0` e `handler` inclui número de linha real do AST node.
- [ ] CA-02: Dado `app/api/bar/route.ts` com `export const POST = async () => {}` (arrow assignment), quando AST parser rodar, então capability é detectada com `source: 'ast'` (o regex original v6.3.0 missava esse caso — caso de regressão positiva).
- [ ] CA-03: Dado `agents/security-auditor.md` com `tools: Read, Grep, Glob` (campo canônico), quando `inspectToolRegistry()` rodar, então `subagents[name='security-auditor'].allowed_tools === ['Read', 'Grep', 'Glob']`.
- [ ] CA-04: Dado um agent com `allowed-tools: Read` (campo legado), quando `inspectToolRegistry()` rodar, então `allowed_tools === ['Read']` E stderr contém exatamente uma linha `[deprecation] agent {name} uses 'allowed-tools'; canonical is 'tools'`.
- [ ] CA-05: Dado projeto com `.anti-vibe-manifest.json` válido e `agents/*.md`, quando `bun run parity:audit` rodar, então exit code 0 + `discovery/parity-gaps.json` escrito + valida contra `parity-gaps-v2.schema.json` (uso de `ajv` opcional — match estrutural via parse + assert é aceitável).
- [ ] CA-06: Dado `discovery/parity-gaps.json` produzido pelo writer, quando validado contra `parity-gaps-v2.schema.json`, então valida sem erros em `mcps`, `builtin_tools`, `subagents`.
- [ ] CA-07 (edge case): Dado projeto SEM `.anti-vibe-manifest.json`, quando `bun run parity:audit` rodar, então exit code 0 + `parity-gaps.json` escrito com `tool_registry_snapshot.source: 'partial'` + warning ao stderr "Tool registry incompleto".
- [ ] CA-08: Dado capability em `capabilities.json` cujo `handler` aponta para arquivo SEM nenhuma referência grep-able no projeto, quando `gap-rules.crossCapabilitiesWithUsage` rodar, então gera entrada com `severity: 'nice'` e `suggestion` contendo `"declared but not referenced"`.
- [ ] CA-09: Dado `capabilities.json` com `generated_at` há 25h, quando uma das 6 skills profile-aware rodar, então stderr contém `capabilities.json stale (>24h) — run /init --refresh`.
- [ ] CA-10: Dado `/architecture` e `/detect-architecture` migrados ao bloco profile-aware-preface, quando `bun run harness:validate` rodar, então passa SEM as 2 tolerâncias em `scripts/harness-validate.ts:618-636`.
- [ ] CA-11 (regression v6.3.0): Dado as 6 skills profile-aware da v6.3.0 (security/api-design/system-design/design-patterns/decision-registry/lessons-learned), quando v6.3.1 termina, então `bun run test` mantém 0 regressões nas suites correspondentes.
- [ ] CA-12 (regression CA-09 v6.3.0): Dado `readPrefaceContext` em projeto sem `.anti-vibe-manifest.json`, quando chamado, então retorna `{ profile: null, language: null, framework: null, confidence: null }` (CA-09 da v6.3.0 preservada — slots reservados v6.5/v6.6).
- [ ] CA-13 (regression schema): Dado fixtures de `parity-gaps.json` antigos (se houver em fixtures), quando rodar contra v2, então documentado como deprecated (não breaking — v1 permanece em `discovery/_schemas/` até v6.4).

---

## Out of Scope

- Preenchimento de `PrefaceContext.language` / `framework` — D2 do ADR-0020 reserva para v6.5/v6.6.
- Migração automática v1→v2 em projetos cliente — gitignored (D8), projetos regeneram com `/init --refresh`.
- Cobertura de profiles além de `nextjs-app-router` + `mvc-flat` — D3 do ADR-0020 mantém limite.
- Substituir LLM-fallback do `mvc-flat` por AST — `source: 'llm', confidence: 0.7` permanece por design.
- Remover v1 schema em v6.3.1 — deprecação só, remoção em v6.4.

---

## Dependências

| Tipo | Dependência | Status |
|---|---|---|
| Lib/pacote | `@typescript-eslint/parser` ^7.0.0 | a instalar (devDep) |
| Lib/pacote | `@typescript-eslint/types` | a instalar (devDep, types only — tipagem do AST) |
| Feature pre-requisito | v6.3.0 Adaptive Coaching | completed — `docs/exec-plans/completed/2026-05-14-v6.3.0-adaptive-coaching/` |
| Pattern de referência | `scripts/preface-simulate.ts` (Plano 05 fase-03) | pronto — template arquitetural para `scripts/parity-audit.ts` |
| Schema | `discovery/_schemas/capabilities-v1.schema.json` | pronto — mantido inalterado |
| Lib existente | `skills/lib/stale-detector.ts` | pronto — wire-up only em RF-SH-02 |
| Convenção Claude Code | agents=`tools:` / skills=`allowed-tools:` | canônica — referência: `.claude/prd-v5/11-new-agents.md:31`, `.claude/tasks/prd-v5/11/task-01-create-plan-executor-agent.md:36` |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| AST parser não cobre edge cases (re-exports `export {GET} from './x'`, JSX inline em .tsx) | Média | Médio | Testes RED cobrindo cada caso. Casos não cobertos vão para `coverage_gaps` em `capabilities.json` com motivo específico. |
| Deprecation warning poluir stderr em projetos com muitos agents legacy | Baixa | Baixo | Warning 1× por agent (Set cache). Mensagem clara com solução. |
| Schema v2 quebrar projetos que persistiram parity-gaps.json v1 manualmente | Muito baixa | Baixo | parity-gaps.json é gitignored (D8). Migration note no header do schema v2. |
| AST traversal lento em projetos com >200 route.ts files | Baixa | Baixo | Benchmark em fixtures grandes durante fase-01. Cache de parsed AST não necessário em v6.3.1 (regen manual via `/init --refresh`). |
| CA-11 (migrar /architecture + /detect-architecture) maior que estimado | Média | Médio | Could Have — pode ser pushed para v6.3.2 se Plano 02 demorar. Tolerâncias em harness são inofensivas até migração final. |
| @typescript-eslint/parser bump quebrar compat com TS 5.4 (devDep do projeto) | Baixa | Médio | Pinar versão ^7.0.0 (compat TS 5.4+). Smoke test típecheck na fase-01. |
| Plano 02 (Should/Could) ser pulado por prazo | Média | Baixo | Não-bloqueante: Must já entrega valor verificado. Push para v6.3.2. |

---

## Estimativa de Fases

**Recomendação: 2 planos × 3-4 fases cada** para permitir verify-work gate entre Must e Should/Could.

### Plano 01 — Honesty & Wire-up Core (Must Have)

| Fase | Entregável | Tests RED→GREEN |
|---|---|---|
| 01 | AST real (`@typescript-eslint/parser`) em `capabilities-writer.ts` (RF-MH-01) | 3 cases: `function GET`, `async function GET`, `const GET = async () => ` |
| 02 | Dual-field parser + deprecation warning em `tool-registry-inspector.ts` (RF-MH-02) | 2 cases: agent com `tools:`; agent legacy com `allowed-tools:` (assert warning) |
| 03 | `scripts/parity-audit.ts` pure-fn + entry `package.json` + SKILL.md rewrite (RF-MH-03) | 2 cases: happy-path (manifest present), partial (manifest missing) |
| 04 | Schema v2 + `parity-gaps-writer.ts` migration (RF-MH-04) | 2 cases: writer output valida contra v2; v1 fixture deprecated |

**Gate Plano 01:** `bun run typecheck` + `bun run harness:validate` + `bun run test` (0 regressão nas 6 skills v6.3.0).

### Plano 02 — Use Crossing & Tolerance Cleanup (Should/Could)

| Fase | Entregável | Tests RED→GREEN |
|---|---|---|
| 05 | `gap-rules.crossCapabilitiesWithUsage` CA-05 (RF-SH-01) | 2 cases: capability usada (no gap); capability declared-not-used (gap severity:nice) |
| 06 | Stale wire-up nas 6 skills profile-aware (RF-SH-02) | 1 case: capabilities.json com `generated_at` há 25h → warning stderr |
| 07 | Migrar `/architecture` + `/detect-architecture` ao padrão novo + remover tolerâncias (RF-CH-01) | 1 case: `bun run harness:validate` passa sem as 2 tolerâncias |

**Gate Plano 02:** `bun run harness:validate` OK SEM tolerâncias + CHANGELOG `[6.3.1]` + addendum em ADR-0020 (ou novo ADR-0021).

---

## Definição de Done v6.3.1

1. `bun run typecheck` — limpo
2. `bun run harness:validate` — OK (com tolerâncias removidas após Plano 02 fase-07)
3. `bun run test` — 0 regressão nas 6 skills profile-aware da v6.3.0 (security/api-design/system-design/design-patterns/decision-registry/lessons-learned)
4. Suites adicionadas: AST writer (≥3 tests), dual-field parser (≥2 tests), parity-audit script (≥2 tests), schema v2 validation (≥2 tests), gap-rules use crossing (≥2 tests), stale wire-up (≥1 test), tolerance removal (harness passa)
5. `CHANGELOG.md` ganha entrada `[6.3.1]` referenciando os 7 items + 4 decisões
6. v6.3.0 `SUMMARY.md` ganha nota de rodapé "Divergências fechadas em v6.3.1 — ver `docs/exec-plans/active/2026-05-15-v6.3.1-coaching-honesty/`"
7. ADR-0020 ganha addendum "v6.3.1 — AST honored, dual-field tolerance, schema v2" (ou novo ADR-0021 se preferir granularidade)
8. Compound note em `docs/compound/` se alguma lição emergir (ex: AST migration recipe, schema bump checklist)

---

## Smoke Tests Manuais Pós-Implementação

- `bun run parity:audit payment-debug` em projeto real → output mostra top-3 gaps + `discovery/parity-gaps.json` escrito.
- `bun run parity:audit` (sem arg) → roda ruleset completo.
- Adicionar agent com `tools: Read` em `agents/test-dummy.md` → `inspectToolRegistry()` retorna `allowed_tools: ['Read']` sem warning.
- Renomear `agents/test-dummy.md` field para `allowed-tools: Read` → mesma chamada emite warning único ao stderr.
- Criar `app/api/test/route.ts` com `export const POST = async () => {}` → `/init` capability tem `source: 'ast'`.
- Tocar `package.json` (alterar dependência) com `capabilities.json` antigo → stale-detector aponta divergência em qualquer das 6 skills.
