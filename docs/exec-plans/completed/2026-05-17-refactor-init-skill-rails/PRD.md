---
slug: refactor-init-skill-rails
date: 2026-05-17
status: approved
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Refatoração Rails-style do SKILL.md do /anti-vibe-coding:init

**Status:** Approved
**Author:** Luiz/dev + AI
**Date:** 2026-05-17
**Context:** (sem CONTEXT.md — contexto inline da sessão de aprovação)

---

## Problema

O arquivo `skills/init/SKILL.md` acumulou **1215 linhas** em ~22 steps ao longo de v6.0.0 → v6.3.2 sem refatoração. Cada step repete o padrão (header + HTML comment de rationale + bloco JS de 3-5 linhas + post-condition), gerando duplicação massiva:

- Aviso "DI-06: bun -e quebra no Windows com paths absolutos" repetido ~18×
- HTML comments com rationale extenso inline em cada step
- Apêndice Akita (5 seções: Code Style, Comments, Tests, Dependencies, Logging) colado no fim do arquivo
- Versionamento (v6.0.0/v6.3.2) embutido em títulos de step

**Impacto:**
1. ~15-20K tokens carregados no contexto LLM a cada invocação de `/init`
2. Adicionar step novo exige copiar boilerplate Markdown + JS, com risco de divergência
3. Round-trips LLM desnecessários (cada step é lido + executado em turno separado)
4. Ordem/sequência dos steps não é testável isoladamente (apenas helpers individuais têm testes)

---

## Solução

### Outcomes (declarativo — o QUE)

- SKILL.md reduz de 1215 → ≤200 linhas (~80% menos tokens carregados)
- `/anti-vibe-coding:init` executa com menos round-trips LLM (orquestrador único)
- Adicionar step novo = 1 linha no registry + 1 arquivo em `lib/steps/`
- Cada step vira unidade testável isolada
- Rationale acumulado (DI-XX, GT-04, CA-XX, gates) preservado em local indexado

### Mecanismo (algorítmico — o COMO)

Padrão Rails (**Convention over Configuration** + **Skinny Controllers, Fat Models**):

1. **SKILL.md** vira manifest declarativo — tabela de steps (id, order, when, helper, args) + intent header + referências para rationale extraído.
2. **Dispatcher único** em `skills/init/lib/run-init.ts`: parseia flags (--dry-run, --reuse-discovery, --refresh), itera registry, executa cada `step.run()`, captura `AbortError`, pausa em steps interativos.
3. **Step modular** em `skills/init/lib/steps/NN-{slug}.ts`: implementa interface `Step { id, order, shouldRun, run, report }`. Boilerplate Windows (DI-06/GT-04) centralizado no dispatcher.
4. **Registry** em `skills/init/lib/steps/registry.ts`: array ordenado importando cada step module.
5. **Rationale extraído** para `docs/design-docs/init-rationale.md`: HTML comments removidos do SKILL.md viram seções indexadas por ID (CA-XX, DI-XX, GT-XX, gates).
6. **Apêndice Akita** vira snippets em `skills/init/assets/snippets/akita-{section}.md` (5 arquivos: code-style, comments, tests, dependencies, logging) — SKILL.md apenas referencia.

Fluxo de invocação:

```
Usuário → /anti-vibe-coding:init [flags]
         → SKILL.md (manifest, ≤200 linhas)
         → import lib/run-init.ts
         → run({ args, cwd })                        // 1 turno LLM
            → for step of registry:
                step.run(...)                         // sequencial
              → pausa se step interativo (retorna ao LLM para AskUserQuestion)
              → throw AbortError se gate falhar
              → console.log no formato atual (byte-idêntico)
```

---

## Fluxos UX por Ator

*(Feature de tooling, sem UI — pulado conforme guia do template)*

---

## Requisitos Funcionais

### Must Have (5 itens — 33% do total ✓ abaixo do limite de 40%)

- [ ] **MH-01:** SKILL.md reescrito como manifest declarativo com tabela de steps (id, order, when, helper), ≤200 linhas
- [ ] **MH-02:** Dispatcher `lib/run-init.ts` executa todos os ~22 steps via interface `Step` única
- [ ] **MH-03:** Comportamento de `/init` byte-idêntico ao atual (mesmos arquivos gerados, mesmos `console.log`, mesmos exit codes/aborts)
- [ ] **MH-04:** Suporte preservado para flags `--dry-run`, `--reuse-discovery`, `--refresh`
- [ ] **MH-05:** Gates de abortagem (migrate.1 backup fail, migrate.2 conflicts, etc.) viram `throw AbortError(reason)` capturado pelo dispatcher

### Should Have

- [ ] **SH-01:** Rationale extraído para `docs/design-docs/init-rationale.md` indexado por ID (DI-XX, GT-XX, CA-XX, gates)
- [ ] **SH-02:** Apêndice Akita movido para `skills/init/assets/snippets/akita-*.md` (5 arquivos)
- [ ] **SH-03:** Testes E2E do dispatcher (fixture greenfield + fixture legacy v5) provando byte-idempotência vs comportamento atual
- [ ] **SH-04:** Cada step module com teste unitário (mock dos helpers, valida shape do report)

### Could Have

- [ ] **CH-01:** Step interativo (Step 6 Delivery Loop) usa contract padronizado `{ status: 'needs-user', prompt, options }` em vez de chamar AskUserQuestion direto
- [ ] **CH-02:** Schema do registry validado em build (TypeScript strict)
- [ ] **CH-03:** Seção "como adicionar um novo step" em `docs/design-docs/init-rationale.md`

### Won't Have (desta versão)

- Reescrita dos helpers em `lib/*.ts` — preservados tal qual
- Mudança em qualquer template em `assets/templates/`
- Migração para framework de pipeline externo (mantém vanilla TS)
- Telemetria adicional dos steps (fica para v6.4+)
- Migração das outras skills para o mesmo padrão (PRD separado se aplicável)

---

## Requisitos Não-Funcionais

- **Performance:** SKILL.md ≤200 linhas. Execução de `/init` greenfield em ≤ tempo atual (idealmente menos, devido a menos round-trips LLM)
- **Segurança:** Nenhuma mudança no perfil de segurança (sem secrets novos, sem integrações novas)
- **Acessibilidade:** N/A (sem UI)
- **Observabilidade:** Console output user-facing preservado byte-a-byte (formato e wording). Telemetria existente (`writeTelemetryStart`/`End`) permanece intacta
- **Compatibilidade Windows:** Workaround DI-06/GT-04 centralizado no dispatcher; validar com fixture Windows-like ou CI Windows runner se existir

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Padrão arquitetural | Manifest + dispatcher (Rails) | Manter inline + helpers (status quo) | Status quo gera duplicação crescente; cada versão adiciona 50-100 linhas sem refatorar |
| 2 | Local da interface `Step` | `skills/init/lib/steps/types.ts` | `skills/init/lib/types.ts` (raiz) | Steps são unidade coesa; manter próximos do uso |
| 3 | Steps interativos | Step retorna `{ status: 'needs-user', prompt, options }`; dispatcher pausa para LLM chamar AskUserQuestion | Step chama AskUserQuestion direto via tool | Step puro = testável sem mock de tool; dispatcher centraliza interação |
| 4 | Gates de abortagem | `throw AbortError(reason)` capturado pelo dispatcher | `process.exit(N)` direto | exit() impede cleanup/teste; throw é controlável |
| 5 | Rationale extraído | Arquivo único `docs/design-docs/init-rationale.md` indexado por ID | Espalhar em JSDoc dos helpers | Cross-step rationale (gates, contratos) fica órfão em JSDoc; centralização preserva relação |
| 6 | Apêndice Akita | 5 snippets em `skills/init/assets/snippets/akita-*.md` | Inline no SKILL.md ou em `templates/` | `templates/` é para outputs finais do projeto; `snippets/` já é convenção (delivery-loop.md) |
| 7 | Cutover | Big-bang após plano completo (PRD → 4 planos → cutover na última fase) | Strangler (steps coexistem com flag) | Strangler exige flag de seleção, duplicação temporária; big-bang com testes E2E é mais limpo |

---

## Critérios de Aceite

- [ ] **CA-01:** Dado um projeto greenfield, quando rodar `/anti-vibe-coding:init`, então os mesmos 27+ arquivos são gerados (AGENTS.md, ARCHITECTURE.md, TODO.md, docs/* etc.) com conteúdo byte-idêntico ao comportamento atual
- [ ] **CA-02:** Dado um projeto com legacy v5 (`.planning/` com pastas datadas), quando rodar `/anti-vibe-coding:init`, então a migração completa (backup → planning → lessons → decisions) acontece igual ao atual
- [ ] **CA-03:** Dado a flag `--dry-run`, quando rodar `/anti-vibe-coding:init migrate --dry-run`, então o relatório de migração é gerado sem nenhuma mutação em disco
- [ ] **CA-04:** Dado a flag `--refresh`, quando rodar `/anti-vibe-coding:init --refresh`, então `capabilities.json` e `parity-gaps.json` são regenerados via reuse-discovery
- [ ] **CA-05:** Dado que o Step 6 (Delivery Loop) pergunta opt-in, quando o usuário responde "y", então o snippet é injetado em AGENTS.md (interatividade preservada)
- [ ] **CA-06:** Dado que o Step 7 (capabilities-discovery) falha internamente, quando o `/init` continua, então o erro é logged mas a execução prossegue (soft-fail preservado)
- [ ] **CA-07:** Dado que o backup (migrate.1) falha por permissão, quando o pipeline tenta migrate.2, então a execução aborta com mensagem clara (gate preservado)
- [ ] **CA-08 (edge):** Dado o usuário roda `/anti-vibe-coding:init` no Windows sem dev mode, quando o link CLAUDE.md→AGENTS.md falha (Tier 1/2), então o Tier 3 (copy + hook) é ativado igual ao atual
- [ ] **CA-09:** Dado o SKILL.md refatorado, quando `wc -l skills/init/SKILL.md` é executado, então o resultado é ≤200 linhas
- [ ] **CA-10:** Dado a nova suíte de testes do dispatcher, quando `bun run test` é executado, então todos os testes passam (existentes + novos do dispatcher e steps)

---

## Out of Scope

- Refatoração dos helpers em `lib/*.ts` (escopo é orquestração, não lógica)
- Mudança em templates de `assets/templates/` (são outputs, não orquestração)
- Migração das outras skills (write-prd, plan-feature, etc.) para mesmo padrão
- Implementação de framework de pipeline externo (e.g., listr, signale)
- Reescrita de testes existentes dos helpers (continuam tal qual)
- Mudança no formato dos snippets/templates de output

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Lib/pacote | bun (runtime + test runner) | já no projeto |
| Lib/pacote | TypeScript strict | já no projeto |
| Feature pré-requisito | Todos os helpers em `skills/init/lib/` | pronta (preservados) |
| Tool externa | AskUserQuestion (para steps interativos) | disponível como deferred tool |
| Arquivo | `skills/init/assets/snippets/delivery-loop.md` | já existe |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Regressão funcional em step específico (ex: gate de migrate.2) | média | alto | CA-01/CA-02/CA-07 com fixtures greenfield e legacy; testes E2E byte-diff |
| Steps interativos quebrarem por novo contrato | média | alto | Plano 02 inclui Step 6 explicitamente, com teste de contrato `{ status: 'needs-user' }` |
| Wording de `console.log` divergir e quebrar parsing humano/scripts | baixa | médio | Golden test do output text por step; revisão linha-a-linha no Plano 04 |
| Compatibilidade Windows quebrar (centralização do DI-06/GT-04) | média | alto | Testar com fixture Windows-like; CI Windows runner se existir |
| Rationale extraído perder traçabilidade (IDs órfãos) | baixa | médio | Plano 04 valida grep cross-reference: cada ID em init-rationale.md aparece ≥1× em algum step module |
| Cutover big-bang criar período de instabilidade | média | médio | Plano 01 valida tracer bullet primeiro; cutover no Plano 04 só após Planos 02/03 completos com testes verdes |
| Escopo crescer durante implementação (refatorar helpers junto) | alta | médio | "Won't Have" explícito; revisões periódicas; mudança fora do escopo vira backlog/PRD novo |

---

## Distribuição MoSCoW

- **Must Have:** 5 itens (33% — abaixo do limite de 40% ✓)
- **Should Have:** 4 itens (27%)
- **Could Have:** 3 itens (20%)
- **Won't Have:** 5 itens (de escopo explícito)
- **Total:** 17 requisitos
