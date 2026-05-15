# State: Adaptive Coaching (v6.3.0)

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 03/05
**Last Updated:** 2026-05-15 (Plano 03 fase-02 concluída — 2/3 fases)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fundação Adaptativa | 4 | 4/4 | completed |
| 02 | /init produz capabilities.json | 3 | 3/3 | completed |
| 03 | /parity-audit + tool-registry-inspector | 3 | 2/3 | in-progress |
| 04 | profile-aware-preface ×4-6 skills | 4 | 0/4 | pending |
| 05 | Polish & DX (Could Haves) | 3 | 0/3 | pending |

## Progress Global

Fases done: 9/17 (53%)

## Log

- 2026-05-14: Plano criado via /plan-feature
- 2026-05-14: Plano 01 detalhado (4 fases) via /plan-feature
- 2026-05-14: Plano 02 detalhado (3 fases) via /plan-feature
- 2026-05-15: Plano 03 detalhado (3 fases) via /plan-feature
- 2026-05-15: Plano 04 detalhado (4 fases) via /plan-feature
- 2026-05-15: Plano 05 detalhado (3 fases) via /plan-feature — Could Haves, defer-friendly v6.3.0/v6.3.1
- 2026-05-15: Plano 01 fase-01 (preface-context-helper) concluída — commit 441baee, TDD RED→GREEN, typecheck limpo. DEV-01: `bun run lint` substituído por `bun run typecheck` (script inexistente).
- 2026-05-15: Execução pausada pelo dev após fase-01. Próxima retomada: Plano 01 fase-02.
- 2026-05-15: Plano 01 fase-02 (json-schemas + discovery/) concluída — commit 8106c34, 4 arquivos (153 insertions), 4/4 checks pass, typecheck limpo. Sem TDD (setup config).
- 2026-05-15: Plano 01 fase-03 (ADR-0020 + framework canônico) concluída — commit b64007d, 3 arquivos (317 insertions), 6/6 checks pass, harness:validate OK. Sem TDD (fase documental). DI-04: index.md ganhou seção Canonical Docs e entrada faltante de ADR-0002. DEV-02: spec listava "Verbatim original" no template do index.md; substituído por "References" para refletir formato do ADR-0020 (ADR-0001 mantém Verbatim, ADR-0002/0020 usam References).
- 2026-05-15: Plano 01 fase-04 (fixtures 5 profiles + stale-detector) concluída — commits bf74826 (fixtures + folder tracking) e 78e1c33 (stale-detector + CA-09 regression). 11/11 checks pass. RED→GREEN confirmado: stale-detector.test.ts falhou com "Cannot find module" antes da implementação, depois 3 pass. Suite global: 887 testes, 9 failures = baseline pré-fase-04 (sem regressões introduzidas).
- 2026-05-15: **Plano 01 (Fundação Adaptativa) CONCLUÍDO** — 4/4 fases, desbloqueia Planos 02, 03 e 04 (paralelizáveis).
- 2026-05-15: Plano 02 fase-01 (AST parser Next.js App Router) concluída — commits ecca33a (RED), 086b216 (GREEN), f470eeb (typecheck fix). 5/5 testes passam (23 assertions), typecheck limpo. RED→GREEN confirmado: import-not-found → all green. DI-01 (typecheck no lugar de lint) reaplicado. DEV-01: spec sugeria importar stale-detector.ts em capabilities-writer.ts; agente GREEN não importou — não exigido pelos testes desta fase (uso real em fase-03 quando capabilities.json for escrito em disco). DEV-02: orquestrador editou test file pós-GREEN para satisfazer noUncheckedIndexedAccess via optional chaining (3 linhas); semântica preservada.
- 2026-05-15: Plano 02 fase-02 (LLM fallback mvc-flat + dispatcher) concluída — commits d726169 (RED), 54064c0 (GREEN). 10/10 testes passam (44 assertions), typecheck limpo. RED→GREEN confirmado: SyntaxError "Export named 'discoverCapabilities' not found" → all green. Adicionados `discoverMvcFlatCapabilities` (source 'llm', confidence 0.7) + dispatcher `discoverCapabilities(profile)`. DEV-04: implementação GREEN divergiu do pseudocódigo do spec em 3 pontos não-cobertos por teste (handler sem `:line`, walk só da primeira candidate dir, regex linha-a-linha em vez de matchAll global). Registrado em plano02/MEMORY.md para reavaliação se fase-03 exigir.
- 2026-05-15: Execução pausada pelo dev após fase-02. Próxima retomada: Plano 02 fase-03 (/init Integration + Audit).
- 2026-05-15: Plano 02 fase-03 (/init Integration + Audit) concluída — commit 0069d6d. Integration test 2/2 pass (12 assertions), regression 10/10 pass, typecheck limpo. Sem TDD RED→GREEN clássico (smoke test contra dispatcher pré-existente — DI-07). SKILL.md: Step 7 inserido após Step 6 (Delivery Loop), antes de Passo 0. DEV-07: spec citava "Step 4 — Detect Architecture Profile" mas tal step não existe — `/detect-architecture` é skill SEPARADA; novo step pula silenciosamente quando `readArchitectureProfile()` retorna null. DEV-08: AuditLogWriter requer `run_id` (vem de `inventory.json` em migration mode); em /init greenfield não há inventory — usado `crypto.randomUUID()` como fallback. DEV-09: pseudocódigo do spec listava `readFile` import; mantido no SKILL.md mesmo sem uso (SKILL.md é prosa instrucional, não compilada). DI-08: schema validation reduzida a check de `schema_version === '1.0'` (sem ajv) — alinhado com spec.
- 2026-05-15: **Plano 02 (/init produz capabilities.json) CONCLUÍDO** — 3/3 fases. Desbloqueia Plano 03 (parity-audit pode consumir capabilities.json) e qualquer skill que precise de contexto de rotas.
- 2026-05-15: Execução pausada pelo dev no marco de conclusão do Plano 02. Próxima retomada: Plano 03 fase-01 (tool-registry-inspector).
- 2026-05-15: Plano 03 fase-01 (tool-registry-inspector) concluída — commits c4a172f (RED) e e422053 (GREEN). 4/4 testes passam (18 assertions), typecheck limpo, suite global sem regressões (mesmos 9 fails pré-existentes). RED→GREEN confirmado: "Cannot find module" → all green. DEV-1: agents reais do projeto usam frontmatter `tools:` (sem hífen), mas spec da fase e fixtures de teste usam `allowed-tools:` (com hífen) — testes self-consistent, mas leitura de agents reais retornaria `allowed_tools:[]` para todos. Decisão de campo fica para fase-02. GT-1: `noUncheckedIndexedAccess:true` no tsconfig exige `?? ''` em `String.split()[0]` — não documentado nos gotchas da fase mas resolvido sem mudar comportamento.
- 2026-05-15: Plano 03 fase-02 (parity-audit skill + lib) concluída — commits be9d41d (RED) e 2378388 (GREEN). parity-gaps-writer: 3/3 pass (11 assertions). gap-rules: 2/2 pass adicional. Typecheck limpo. Suite global 898 pass / 9 fail (baseline preservado). RED→GREEN confirmado: "Cannot find module ../parity-gaps-writer" → all green. DEV-2: schema `parity-gaps-v1.schema.json` define `tool_registry_snapshot.mcps` como `array of string`, mas `ToolRegistrySnapshot.mcps` é `Array<{name,tools}>` — validação soft per G4, não corrigido nesta fase (escopo Plano 01 ou v6.3.1). DEV-3: TDD gate aplicou basename matching e forçou criar `gap-rules.test.ts` (2 testes adicionais, additivo — não tocou no anchor `parity-gaps-writer.test.ts`). DEV-1 da fase-01 (allowed-tools vs tools no parser de subagentes) PERMANECE pendente — fase-02 consome snapshot via inspectToolRegistry e não depende do campo allowed_tools.
