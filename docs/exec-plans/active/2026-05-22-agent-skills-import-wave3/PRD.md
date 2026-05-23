---
slug: agent-skills-import-wave3
date: 2026-05-22
status: approved
requires: [agent-skills-import-wave2]
parent_analysis: ../2026-05-22-agent-skills-import-analysis/ANALYSIS.md
---

# PRD: Agent-Skills Import — Wave 3 (Estratégico)

**Status:** Approved (2026-05-22)
**Author:** Luiz Felipe + AI (Claude)
**Date:** 2026-05-22
**Context:** [../2026-05-22-agent-skills-import-analysis/ANALYSIS.md](../2026-05-22-agent-skills-import-analysis/ANALYSIS.md) (seção 6.3 e §7)
**Parent:** Análise comparativa `obra/agent-skills` × Anti-Vibe-Coding
**Wave:** 3 de 3
- ← Depende da Wave 2: `../2026-05-22-agent-skills-import-wave2/PRD.md` (approved 2026-05-22)

---

## Problema

Waves 1 e 2 entregaram bases sólidas: CI, padrão de skill, 5 skills críticas com Common Rationalizations, 5 skills novas portadas, 13 agentes refinados com 5 patterns e contract 2.0.0. Mas restam **5 lacunas estruturais** que só fazem sentido resolver com essas bases no lugar:

1. **Overlap funcional não resolvido entre `/anti-vibe-review` e `/verify-work`** — dois pontos de entrada para o mesmo workflow (análise pós-implementação), criando fragmentação e confusão. Usuário não sabe qual invocar. O mantenedor mantém dois SKILL.md para o mesmo job.
2. **`tdd-verifier` não tem modo "prove que está vermelho"** — audita compliance TDD existente mas não pode gerar o teste RED que precede a correção. A origem (`test-engineer`) tem **Prove-It Pattern**: escreve teste que FALHA primeiro, confirma RED genuíno antes de qualquer fix. Sem isso, o ciclo RED→GREEN→REFACTOR pode ser feito de má fé (teste escrito depois do código, sempre verde).
3. **Compound notes e `docs/references/` ficam em silos sem critério de promoção** — `docs/compound/` tem 35+ notas reativas, `docs/references/` (seeds da Wave 1) tem 3 checklists externos. Sem pipeline de curadoria: (a) notas maduras que se repetem 3+ vezes não são promovidas para reference; (b) references operacionais profundas (init-step-contract, hooks-checklist, tdd-cycle) ainda não existem, extraídas de compound notes.
4. **4 skills críticas com conteúdo desatualizado pós-Waves 1-2** — `tdd-workflow` não ensina Test Sizes nem DAMP nem test-doubles tabela; `plan-feature` não tem Task Sizing table nem Dependency graph ASCII; `enhance-prompt` não tem Context Hierarchy nem Trust Levels. São skills que agentes usam mas ensinam conceitos desatualizados.
5. **Pipeline não está visível como flowchart de primeira visita** — `AGENTS.md`/`CLAUDE.md` mencionam skills mas não traduzem `grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate` em linguagem de fase de trabalho (`Define → Plan → Build → Verify → Review → Ship`). Novo usuário não sabe por onde começar.

**Por que importa:** Wave 3 é a onda de consolidação e polish. Sem ela, o plugin entrega disciplina fragmentada (dois pontos de entrada para review, ciclo TDD sem prova de RED, knowledge sem curadoria, skills desatualizadas). Com ela, cada parte do pipeline fica coesa e autodescritiva.

**Impacto de não resolver Wave 3:** overlap `/anti-vibe-review` vs `/verify-work` gera atrito crescente; prove-it fica indefinidamente "a definir"; notas de compound ficam órfãs sem destino; skills críticas envelhecem enquanto o ecossistema avança.

---

## Solução

### Outcomes (declarativo — o QUE)

- Existe apenas **um ponto de entrada** para análise pós-implementação: `/verify-work`. `/anti-vibe-review` exibe mensagem de deprecation clara com instrução de migração e continua funcionando por 1 ciclo de grace period.
- `tdd-verifier` invocado com `mode: "prove-it"` escreve teste que falha (RED confirmado), retorna `payload.test_status: "red_confirmed"` com snippet do teste antes de qualquer fix ser sugerido.
- Existe pipeline de promoção documentado: compound note → reference (critério: ≥3 repetições no repo) → core-belief (critério: universal, qualquer projeto). Campo `referenced-by: [skill-id]` no frontmatter de compound notes ligadas a skills. ≥3 compound notes maduras promovidas para `docs/references/` operacionais.
- `docs/references/` tem ≥3 checklists operacionais extraídos de compound notes: `init-step-contract.md`, `hooks-checklist.md`, `tdd-cycle-checklist.md`.
- `tdd-workflow` e `plan-feature` refatorados com conceitos ausentes (Test Sizes, DAMP, Task Sizing, Dependency graph ASCII).
- `AGENTS.md` (ou seção nova em `CLAUDE.md`) tem flowchart ASCII `Define → Plan → Build → Verify → Review → Ship` com mapeamento direto para skills do plugin.

### Mecanismo (algorítmico — o COMO)

**Item 1 — Consolidar `/anti-vibe-review` → `/verify-work` com deprecation.**

Editar [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md): adicionar no topo bloco `## ⚠️ Deprecation Notice` com mensagem:

```markdown
## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)

Esta skill foi consolidada em `/verify-work`.
Migração: substitua `/anti-vibe-review` por `/verify-work` no seu workflow.

A skill permanece funcional (grace period), mas não receberá atualizações.
```

Editar [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md): absorver qualquer conteúdo presente em `anti-vibe-review` que não existe em `verify-work` (análise de gap antes de editar). Não duplicar — adicionar apenas o delta.

Atualizar [.claude-plugin/plugin.json](.claude-plugin/plugin.json): mover `anti-vibe-review` para seção `deprecated` (se o schema suportar) ou adicionar comment em `description:` sobre deprecation. Regenerar checksums.

**Item 2 — Modo `prove-it` no tdd-verifier.** Editar [agents/tdd-verifier.md](agents/tdd-verifier.md):

Adicionar seção `## Prove-It Mode`:

```markdown
## Prove-It Mode

Quando invocado com `mode: "prove-it"`:
1. Identifica o comportamento a ser testado (bug ou feature)
2. Escreve um teste que DEVE FALHAR com o código atual
3. Confirma que o teste falha (RED genuíno)
4. Retorna `payload.test_status: "red_confirmed"` + snippet do teste failing
5. NÃO sugere fix — para no RED confirmado (fix é responsabilidade do dev ou ciclo seguinte)

Guardrail: se o teste já passa (código existente satisfaz), retorna `test_status: "already_green"` com diagnóstico — possível que o teste tenha sido escrito depois do código.

payload additions (prove-it mode):
- test_status: "red_confirmed" | "already_green" | "inconclusive"
- failing_test_snippet: string (código do teste que falha)
- failure_message: string (output esperado do test runner)
```

**Item 3 — Pipeline de promoção compound → reference.** Dois sub-itens:

*3a. Documentar critério de promoção:* Editar [docs/compound/README.md](docs/compound/README.md) — adicionar seção `## Quando promover para reference`:
- Critério: note citada em ≥3 compound notes diferentes OU mencionada em ≥2 skills OU representa padrão que todo contribuidor novo precisaria saber.
- Processo: criar `docs/references/<topic>.md` no formato checklist operacional; adicionar `referenced-by: [skill-id]` no frontmatter das notas-origem; linkar da skill que usará o reference.

*3b. Promover 3 compound notes maduras:* Criar 3 references operacionais em `docs/references/`:
- `references/init-step-contract.md` — extraído de `2026-05-18-init-self-protection.md` + `2026-05-18-init-cascade-fix.md` + `2026-05-18-path-escape-cascade.md`. Checklist para criar/modificar steps no `/init`.
- `references/hooks-checklist.md` — extraído de `2026-05-20-prompt-hook-includes-no-loop.md` + compound notes de hooks. Formato: prompt-type vs command-type, stop_hook_active, cap=8, schema `{ok, reason}`.
- `references/tdd-cycle-checklist.md` — extraído de `2026-05-19-tdd-gate-needs-stub-first.md`. RED stub obrigatório, sinal `Cannot find module`, ordem dos commits.

Atualizar frontmatter das compound notes-origem com `referenced-by: [tdd-verifier, tdd-workflow]` etc.

**Item 4 — Refatorar skills críticas.** Dois arquivos a editar:

*4a. [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md)*: Adicionar (não substituir) seções:
- `## Test Sizes` — Unit (ms, sem I/O), Integration (sub-1s, com storage fake), E2E (segundos, com UI real). Quando usar cada tamanho.
- `## DAMP vs DRY em Testes` — "Don't Abstain from Meaningful Phrases". Testes aceitam alguma repetição se tornam o cenário auto-descritivo.
- `## Test-Doubles Reference` — tabela: Stub (valor fixo), Mock (verifica chamada), Fake (implementação simplificada), Spy (log de chamadas sem verificar). Quando cada um é apropriado.

*4b. [skills/plan-feature/SKILL.md](skills/plan-feature/SKILL.md)*: Adicionar:
- `## Task Sizing` — XS (<2h), S (<4h), M (<1 dia), L (>1 dia, deve ser quebrado). Cada task do plano deve ter sizing explícito.
- `## Dependency Graph (ASCII)` — exemplo de representação de dependências entre tasks antes de sequenciar.

**Item 5 — Flowchart de pipeline em AGENTS.md.** Editar [AGENTS.md](AGENTS.md) — adicionar seção `## Pipeline de Trabalho` antes da listagem de agentes:

```markdown
## Pipeline de Trabalho

Fase do trabalho → Skill a invocar:

Define    → /grill-me        (hipótese + confiança antes de qualquer decisão)
Plan      → /write-prd       (spec do problema antes de escrever código)
           → /plan-feature   (plano de execução em vertical slices)
Build     → /execute-plan    (execução wave-based com subagentes)
           → /tdd-workflow   (ciclo RED→GREEN→REFACTOR)
Verify    → /verify-work     (auditoria pós-implementação com 13 agentes)
           → /qa-visual      (QA no browser)
Review    → /anti-vibe-review (DEPRECADO → use /verify-work)
           → /decision-registry (registrar decisões arquiteturais)
Ship      → /iterate         (próximo ciclo)
           → /lessons-learned (capturar o que o repo aprendeu)
```

---

## Fluxos UX por Ator

Backend/skills/agentes — sem UX por ator final. Fluxo do mantenedor:

### Mantenedor (Luiz Felipe)

1. Após Wave 2 mergeada, faz `git pull`.
2. Roda `bun run test && bun run lint` — verde.
3. Em uso real pós-Wave 3:
   - Ao invocar `/anti-vibe-review`, vê mensagem de deprecation + instrução de migração para `/verify-work`. Skill ainda funciona.
   - Ao invocar `/tdd-verifier` com `mode: "prove-it"`, recebe teste RED confirmado antes de qualquer fix.
   - Ao adicionar compound note nova, sabe quando promovê-la para reference (critério explícito no README).
   - Ao planejar feature com `/plan-feature`, cada task recebe sizing (XS/S/M/L) e dependências são explicitadas em ASCII.
   - Ao chegar ao repo pela primeira vez (ou onboarding), lê flowchart `Define → Plan → Build → Verify → Review → Ship` em AGENTS.md e sabe por onde começar.

---

## Requisitos Funcionais

### Must Have (máximo 40%)

- [ ] **MH-01:** [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md) contém bloco `## ⚠️ Deprecation Notice` no topo com mensagem de migração para `/verify-work` e grace period declarado.
- [ ] **MH-02:** [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md) absorve delta de conteúdo de `anti-vibe-review` não duplicado — análise de gap obrigatória antes de editar.
- [ ] **MH-03:** [agents/tdd-verifier.md](agents/tdd-verifier.md) tem seção `## Prove-It Mode` com protocolo RED confirmado, campos `test_status`, `failing_test_snippet`, `failure_message` no payload e guardrail `already_green`.
- [ ] **MH-04:** [docs/compound/README.md](docs/compound/README.md) tem seção `## Quando promover para reference` com critério explícito (≥3 repetições OU ≥2 skills OU padrão obrigatório para onboarding).
- [ ] **MH-05:** ≥3 references operacionais criados em `docs/references/`: `init-step-contract.md`, `hooks-checklist.md`, `tdd-cycle-checklist.md` — extraídos de compound notes maduras.

### Should Have

- [ ] **SH-01:** [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md) refatorado com seções `## Test Sizes`, `## DAMP vs DRY em Testes`, `## Test-Doubles Reference`.
- [ ] **SH-02:** [skills/plan-feature/SKILL.md](skills/plan-feature/SKILL.md) refatorado com `## Task Sizing` (XS/S/M/L) e `## Dependency Graph (ASCII)`.
- [ ] **SH-03:** [AGENTS.md](AGENTS.md) tem seção `## Pipeline de Trabalho` com flowchart `Define → Plan → Build → Verify → Review → Ship` mapeado para skills.
- [ ] **SH-04:** Compound notes-origem das 3 references têm campo `referenced-by: [skill-id]` adicionado ao frontmatter.
- [ ] **SH-05:** Checksums SHA-256 regenerados após todas as edições de skills/agents (`bun run generate:manifest` ou equivalente).

### Could Have

- [ ] **CH-01:** [skills/enhance-prompt/SKILL.md](skills/enhance-prompt/SKILL.md) refatorado com `## Context Hierarchy` e `## Trust Levels`.
- [ ] **CH-02:** Persona "synthesizer" documentada como agente experimental em `agents/synthesizer.md` — recebe 13 JSONs, produz markdown narrativo `merge/no-merge + 3 razões`. Sem invocação automática; documentação apenas.
- [ ] **CH-03:** Hook `sdd-cache` portado de `Infos/agent-skills-main/hooks/` — ETag-revalidated WebFetch cache para `source-driven-development` (da Wave 2).
- [ ] **CH-04:** Seção `## When Not to Use` adicionada em `/anti-vibe-review` SKILL.md (além do deprecation notice) — explica casos onde `/verify-work` é superior.

### Won't Have (desta Wave)

- ❌ **Criar 14º agente Prove-It separado** — modo no tdd-verifier existente (decisão D-2 ANALYSIS §7)
- ❌ **Invocação automática cross-model** (Gemini/Codex) — Wave 4+ ou backlog
- ❌ **Commit-msg hook** bloqueando commits não-conformes — backlog (Wave 3 de skill só ensina)
- ❌ **Tier-2 multi-IDE** — adiado indefinidamente (decisão D-1 ANALYSIS §7)
- ❌ **Deletar `/anti-vibe-review`** — apenas deprecation notice + grace period nesta Wave; delete em Wave 4 ou após confirmação de zero uso
- ❌ **Refatorar `/enhance-prompt` com MCP table** — escopo incerto (aguardar evolução do ecossistema MCP)
- ❌ **Pipeline compound→reference automatizado** (script que detecta repetições) — overhead de tooling não justificado agora; processo manual com critério explícito é suficiente

---

## Requisitos Não-Funcionais

- **Performance:** Novas seções em skills não aumentam tempo de invocação. `tdd-verifier` modo prove-it pode ser mais lento (escreve teste novo) — aceitável, é modo opt-in.
- **Backward compatibility:** Modo `prove-it` é opt-in — invocação padrão de `tdd-verifier` sem `mode:` não muda. `/anti-vibe-review` continua funcional durante grace period.
- **Segurança:** `failing_test_snippet` no payload de prove-it é código de teste, não produção — sem risco de exposição.
- **Acessibilidade:** N/A.
- **Observabilidade:** Telemetria de `tdd-verifier` loga `mode: "prove-it"` quando ativado (distingue métricas de verify vs prove).
- **Idempotência:** Re-rodar promote de compound note não duplica frontmatter `referenced-by` (Edit cirúrgico verifica presença antes de adicionar).
- **Validação:** `bun run harness:validate` deve passar após cada item entregue.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Deprecation de `/anti-vibe-review` | Deprecation notice no topo do SKILL.md + grace period funcional | Deletar imediatamente | Usuários com workflows existentes precisam de tempo de migração. Mensagem explícita é suficiente para mudança de comportamento |
| 2 | Prove-it: novo agente ou modo no existente | Modo `mode: "prove-it"` no tdd-verifier | Criar 14º agente `prove-it-writer` | Decisão D-2 do ANALYSIS §7: evita sprawl, roster permanece 13 agentes. Modo opt-in preserva comportamento existente |
| 3 | Pipeline de promoção compound→reference | Manual com critério explícito documentado em README | Script automatizado que detecta repetições | Overhead de tooling não justificado: notas maduras são pouquíssimas, processo manual com critério claro é suficiente e menos frágil |
| 4 | Flowchart pipeline: onde colocar | AGENTS.md (seção nova no início) | CLAUDE.md global | AGENTS.md é lido por agentes ao entrar no repo; CLAUDE.md é para instruções de comportamento. Flowchart de navegação pertence ao AGENTS.md |
| 5 | Refatoração de skills: substituir ou adicionar | Adicionar seções novas (DAMP, Test Sizes, Task Sizing) sem remover conteúdo existente | Reescrever seções conflitantes | Manter conteúdo que funciona; adicionar o que falta. Risco de regressão menor |
| 6 | Grace period de `/anti-vibe-review` | Indefinido (skill funcional + notice) — Wave 4 decide delete | Grace period com data explícita | Sem dados de uso real, definir prazo seria arbitrário. Revisitar quando Wave 4 for planejada |

---

## Critérios de Aceite

- [ ] **CA-01 (Deprecation notice):** Dado [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md), quando aberto, então a primeira seção após o frontmatter é `## ⚠️ Deprecation Notice` com texto mencionando `/verify-work` e grace period.
- [ ] **CA-02 (verify-work absorve delta):** Dado [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md), quando comparado com `anti-vibe-review`, então contém todo conceito de `anti-vibe-review` não duplicado — sem perda de conteúdo útil.
- [ ] **CA-03 (Prove-It mode payload):** Dado `tdd-verifier` invocado com `mode: "prove-it"` em código com bug conhecido, quando retorna, então `payload.test_status ∈ {"red_confirmed", "already_green", "inconclusive"}` e `payload.failing_test_snippet` é um snippet de código de teste válido (não string vazia).
- [ ] **CA-04 (Prove-It guardrail):** Dado código que JÁ passa nos testes existentes, quando tdd-verifier invocado com `mode: "prove-it"`, então retorna `test_status: "already_green"` com diagnóstico — NÃO retorna `red_confirmed`.
- [ ] **CA-05 (References operacionais):** Dado `docs/references/`, quando listado, então contém `init-step-contract.md`, `hooks-checklist.md`, `tdd-cycle-checklist.md` com conteúdo checklist operacional (não placeholder).
- [ ] **CA-06 (Critério de promoção documentado):** Dado [docs/compound/README.md](docs/compound/README.md), quando aberto, então contém seção `## Quando promover para reference` com critério numérico explícito (≥3 repetições OU ≥2 skills).
- [ ] **CA-07 (tdd-workflow Test Sizes):** Dado [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md), quando inspecionado, então contém seção `## Test Sizes` com pelo menos 3 tamanhos (Unit, Integration, E2E) e critérios distintos para cada.
- [ ] **CA-08 (plan-feature Task Sizing):** Dado [skills/plan-feature/SKILL.md](skills/plan-feature/SKILL.md), quando inspecionado, então contém seção `## Task Sizing` com pelo menos 4 tamanhos (XS, S, M, L) e critério de corte para L ("deve ser quebrado").
- [ ] **CA-09 (Pipeline flowchart):** Dado [AGENTS.md](AGENTS.md), quando aberto, então contém seção `## Pipeline de Trabalho` com mapeamento explícito de fase → skill para pelo menos 5 fases do ciclo.
- [ ] **CA-10 (edge case — anti-vibe-review ainda funciona):** Dado skill `/anti-vibe-review` durante grace period, quando invocada, então executa fluxo completo normalmente (não apenas exibe deprecation notice) — backward compatibility total.
- [ ] **CA-11 (edge case — harness green):** Após todas as edições desta Wave, `bun run harness:validate` passa sem novos erros.

---

## Out of Scope

- **Deletar `/anti-vibe-review`** — apenas deprecation notice; delete em Wave 4 ou confirmação de zero uso
- **Invocação cross-model automatizada** (Gemini/Codex via shell) para `doubt-driven-development` — Wave 4+
- **Commit-msg hook bloqueante** — educar primeiro (Wave 2 já adicionou skill), coerção depois se ROI confirmar
- **Tier-2 multi-IDE** — adiado indefinidamente
- **Common Rationalizations em skills além das 5 da Wave 1** — reavaliar pós-Wave 3 com dados de uso real
- **Persona "synthesizer" com invocação automática** — se criada (CH-02), é documentação/draft apenas
- **Refactoring completo de `/enhance-prompt`** com MCP table — aguardar evolução do ecossistema

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Wave anterior | PRD-WAVE-2 mergeado (13 agentes refinados com contract 2.0.0, 3 skills novas, decision-registry pedagógico) | Aprovado, não-mergeado |
| Arquivo destino | [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md) | No projeto |
| Arquivo destino | [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md) | No projeto |
| Arquivo destino | [agents/tdd-verifier.md](agents/tdd-verifier.md) | No projeto |
| Arquivo destino | [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md) | No projeto |
| Arquivo destino | [skills/plan-feature/SKILL.md](skills/plan-feature/SKILL.md) | No projeto |
| Arquivo destino | [docs/compound/README.md](docs/compound/README.md) | No projeto |
| Arquivo destino | [AGENTS.md](AGENTS.md) | No projeto |
| Compound notes-origem | `2026-05-18-init-self-protection.md`, `2026-05-18-init-cascade-fix.md`, `2026-05-18-path-escape-cascade.md` | No projeto |
| Compound notes-origem | `2026-05-20-prompt-hook-includes-no-loop.md` | No projeto |
| Compound notes-origem | `2026-05-19-tdd-gate-needs-stub-first.md` | No projeto |
| Script existente | `scripts/generate-manifest.js` | No projeto |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **R-01** — Gap analysis entre `anti-vibe-review` e `verify-work` revelar conteúdo difícil de absorver (ex: seções contraditórias) | Média | Médio | Ler ambos SKILL.md antes de qualquer edição; delta mapeado explicitamente; em caso de conflito, prefer `verify-work` como autoridade |
| **R-02** — Prove-It mode gerar testes que passam imediatamente (agente não consegue escrever teste failing para o bug) | Média | Médio | Guardrail `already_green` é mandatory; se falhar, retorna `inconclusive` com diagnóstico em vez de silêncio ou resultado falso |
| **R-03** — Compound notes promovidas para references perderem contexto narrativo ao virar checklist | Baixa | Médio | Preservar compound notes originais; references são destilação operacional, não substituição; linkar de reference para nota-origem |
| **R-04** — Seções novas em tdd-workflow/plan-feature quebrarem validação do harness (ex: seção com nome não-esperado) | Baixa | Baixo | Rodar `bun run harness:validate` após cada edição; verificar regras de validação de seções antes de nomear |
| **R-05** — Flowchart em AGENTS.md ficar desatualizado rapidamente (nomes de skills mudam) | Média | Baixo | Flowchart usa nomes canônicos de skills (slug); mudança de slug já exige atualização de plugin.json (processo existente vai capturar) |
| **R-06** — Grace period de anti-vibe-review criar confusão (usuário não sabe se deve migrar agora) | Baixa | Baixo | Deprecation notice com linguagem clara: "migre agora, funciona por enquanto, sem data de remoção definida" — sem urgência artificial |
| **R-07** — Referencias operacionais (init-step-contract, hooks-checklist, tdd-cycle) ficarem duplicadas com compound notes originais | Média | Baixo | Reference é destilação — citar compound note-origem explicitamente no header da reference; não copiar parágrafos narrativos |

---

## Lessons Captured (até agora)

- **Decisão registrada (DC-6):** Deprecation de skill existente usa notice no topo + grace period funcional — não delete imediato. Sem data, Wave 4 decide.
- **Decisão registrada (DC-7):** Prove-it como modo no tdd-verifier (não 14º agente). Guardrail `already_green` é obrigatório — sem ele, modo pode retornar RED falso.
- **Decisão registrada (DC-8):** Pipeline compound→reference tem critério numérico (≥3 repetições) para promoção manual — sem script automatizado (overhead não justificado em volume atual).
- **Princípio reforçado (P-3):** Refatoração de skills é adição de seções, não substituição — manter conteúdo que funciona, adicionar o que falta.

---

## Approval Log

✅ **Aprovado em 2026-05-22** — Luiz Felipe

**CAs aprovados:** CA-01 a CA-11 (11 CAs totais)
**Riscos aceitos:** R-01 a R-07
**Decisões confirmadas:** DT-1 a DT-6

---

## Próximo Passo (Pipeline)

Após aprovação deste PRD-WAVE-3:

1. **Waves 1, 2, 3 aprovadas** — invocar `/plan-feature` para Wave 1 primeiro.
2. `/plan-feature` gera `PLAN.md` + `STATE.md` + `planoNN/` em cada pasta de Wave.
3. Execução sequencial: Wave 1 → Wave 2 → Wave 3.
4. Cada Wave fechada com `bun run harness:validate` verde + `bun run test` verde antes de mover para `docs/exec-plans/completed/`.
