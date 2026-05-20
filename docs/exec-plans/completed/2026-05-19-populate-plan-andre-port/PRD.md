---
slug: populate-plan-andre-port
date: 2026-05-19
status: approved
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# PRD: Portar a estrutura de populate-plan do Andre (harness + compound) para `/init`

**Status:** Approved (2026-05-19)
**Author:** Luiz + AI
**Date:** 2026-05-19
**Context:** N/A (briefing fornecido inline no /write-prd; sem CONTEXT.md de /grill-me)

---

## Princípio inegociável

> **Copiar literalmente o que o Andre faz (skills `harness-engineering` + `compound-engineering`, V6.0.0), melhorar em cima, NUNCA diminuir.**

Cada decisão deste PRD responde "isso é ≥ o que o Andre entrega?". Se a resposta for "menos", o caminho está errado.

Referência canônica do Andre (copiada para inspeção em `F:\Projetos\Anti-Vibe-Coding\tmp\andre-skills\`):
- `harness-engineering/SKILL.md` — seção "First Use Customization"
- `harness-engineering/assets/harness-template/` — scaffold completo
- `compound-engineering/SKILL.md` — gate de captura de lições

---

## Problema

Comparativo executado no projeto Carreirarte (rodando nosso `/anti-vibe-coding:init` vs `harness-engineering + compound-engineering` do Andre, em pastas espelhadas) revelou que **nosso init produz scaffolds com `TBD` em arquivos críticos enquanto o do Andre produz docs contextualizados ao código real**.

Diagnóstico estrutural (4 causas-raiz já mapeadas no código):

1. **`EXCLUDED_FROM_POPULATION_V2`** (`skills/init/lib/populate-plan-generator.ts:60`) exclui explicitamente `docs/PRODUCT_SENSE.md` e `README.md` da geração de fases. Comentário antigo `D14 do PRD mantem filosoficos sem populate` ficou — decisão obsoleta.
2. **`ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md`** provavelmente ausentes ou não-populáveis no `TEMPLATE_MANIFEST` — confirmar e corrigir. `CanonicalDoc` em `stack-aware-input-paths.ts` já inclui os 3, mas eles não chegam ao plano gerado.
3. **`LLM_INSTRUCTIONS`** atuais são permissivas (ex: QUALITY_SCORE — "Se nao houver historico de PR review, mantenha o template e adicione TODO"). Andre é imperativo ("Fontes: X, Y, Z" + "Honestidade > marketing").
4. **`PLAN.md` (root do populate-plan)** tem 3 seções (Glossário/Tabela/Como Executar). Andre tem 13 (Goal/Scope/Risks/Lessons/Validation/etc).

**Impacto:** projetos que rodam `/init` ficam com docs vazios em ARCHITECTURE/AGENTS/README/PRODUCT_SENSE (< 1 KB stubs) enquanto projetos com Andre ficam com docs ricos (7-15 KB com personas, threat models, evidência de código real).

**Por que isso importa:** o produto do `/init` é o ponto de partida do projeto. Stub significa que agentes operando depois leem placeholder e tomam decisão contra contexto fictício — degrada todo o pipeline anti-vibe.

---

## Solução

### Outcomes (declarativo — o QUE)

- O plano populate gerado pelo `/init` cobre **100% dos docs do contrato Harness do Andre** (ARCHITECTURE, AGENTS, README, PRODUCT_SENSE, QUALITY_SCORE, SECURITY, RELIABILITY, DESIGN, FRONTEND, PLANS, db-schema) sem exclusões silenciosas.
- O `PLAN.md` do populate vira **contrato executável** (Goal / Scope / Assumptions / Risks / Execution Steps / Review Checklist / Validation Log / Compound Opportunity / Lessons Captured / Exit Criteria / Follow-up / Final Report / Pré-GO), idêntico em estrutura ao do Andre.
- Cada fase do plano carrega **instruções imperativas com Fontes específicas** ("leia X, Y, Z; preencha seção W com evidência") em vez de instruções permissivas ("se houver, registre; senão, mantenha template").
- O `Inputs (codigo)` de cada fase é **populado por mapa (stack-id + doc-canonico) → paths reais validados via `fs.access`**, com cobertura para Next.js, Next.js+Supabase, Rails, Node-TS, e fallback genérico.
- Existe **test fixture comparativo** que falha o build se o output gerado tiver menos seções/inputs/docs que o golden de referência — gate "nunca diminuir" mecânico.

### Mecanismo (algorítmico — o COMO)

**Mudança 1 — Lista de docs populáveis (fix #1):**
- Remover `docs/PRODUCT_SENSE.md` e `README.md` de `EXCLUDED_FROM_POPULATION_V2` em `populate-plan-generator.ts`.
- Garantir que `TEMPLATE_MANIFEST` (em `template-manifest.ts`) inclui entries para `ARCHITECTURE.md`, `AGENTS.md`, e `.claude/CLAUDE.md` (não apenas docs/*). Se ausentes, adicionar.

**Mudança 2 — PLAN.md.tpl (fix #3):**
- Criar `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com as 13 seções do Andre.
- Refatorar `renderPlanIndex()` em `populate-plan-generator.ts` para ler o tpl e injetar variáveis (`{{PROJECT_NAME}}`, `{{DATE}}`, `{{PHASES_TABLE}}`) — fica determinístico no scaffold, LLM preenche corpo de cada seção no `/execute-plan`.
- Cada fase individual (`fase-XX-*.md`) também ganha estrutura Andre (Goal/Scope/Validation/Lessons) — não só "Doc canonico + Inputs + Instrução".

**Mudança 3 — Instruções imperativas (fix #2):**
- Reescrever `LLM_INSTRUCTIONS` em `populate-plan-generator.ts:79-126` removendo brechas tipo "se não houver, mantenha template". Padrão novo: `"Leia <fontes específicas>. Registre seções <Strengths/Gaps/Priorities>. Cada afirmação rastreia a um arquivo lido. Quando não rastreia, marca TODO(<contexto>):. Honestidade > marketing."`
- `DEFAULT_INSTRUCTION` também vira imperativa.

**Mudança 4 — discovery cruzando stack+doc (fix #4):**
- Expandir `stack-aware-input-paths.ts` para cobrir **todos os docs canônicos** (atualmente só ~6 de 12 têm entries; `AGENTS.md`, `docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/STATE.md`, `docs/design-docs/core-beliefs.md`, `.claude/CLAUDE.md` precisam de paths).
- Adicionar `PRODUCT_SENSE.md` e `README.md` ao tipo `CanonicalDoc`.
- Adicionar candidatos reais para LARAVEL e PYTHON (hoje caem em GENERIC) — sem inventar paths, apenas os que existem no scaffold padrão de cada stack.

**Mudança 5 — Gate "nunca diminuir":**
- Criar `tests/e2e/populate-plan-parity.test.ts` que:
  - Roda `/init` em fixture greenfield + fixture com docs herdados.
  - Asserta: plano tem >= N fases (onde N = total de docs do contrato Andre).
  - Asserta: PLAN.md contém as 13 seções obrigatórias (regex por header).
  - Asserta: cada fase tem >= 1 Input de código quando stack é detectado.
  - Golden file em `tests/e2e/__golden__/populate-plan-andre-parity.md` espelha estrutura mínima esperada (referência Andre).
- Adicionar regra escrita ao `docs/design-docs/core-beliefs.md` ou novo `docs/compound/2026-05-19-never-diminish-andre.md` — captura compound.

---

## Requisitos Funcionais

### Must Have (4 fixes — 1 Must por fix; cada um carrega seu próprio gate de regressão)

- [ ] **MH-1 — Lista completa de docs no plano (fix #1 do briefing)**
  - Remover `docs/PRODUCT_SENSE.md` e `README.md` de `EXCLUDED_FROM_POPULATION_V2` em `populate-plan-generator.ts`. Anular decisão obsoleta D14 com comentário datado.
  - Garantir que `TEMPLATE_MANIFEST` inclui entries para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md`. Se ausentes, adicionar — **`.claude/CLAUDE.md` é obrigatório por contrato (Risco #3 do PRD), sem opt-out**: alguns agents externos só leem AGENTS.md, outros só leem CLAUDE.md, ambos devem espelhar o mesmo conteúdo.
  - Atualizar `CanonicalDoc` (type) em `stack-aware-input-paths.ts` para incluir `docs/PRODUCT_SENSE.md` e `README.md`.
  - **Gate de regressão (sub-assertion no test fixture):** plano gerado contém >= 12 fases cobrindo a lista enumerada em CA-01. Build quebra se alguém readicionar entrada em `EXCLUDED_FROM_POPULATION_V2` ou remover entrada do `TEMPLATE_MANIFEST`.

- [ ] **MH-2 — PLAN.md com seções estilo Andre + melhoria Observability (fix #3 do briefing)**
  - Fonte canônica: `tmp/andre-skills/harness-engineering/assets/harness-template/scripts/new-plan.mjs` define **10 seções base**: Goal / Scope (in-out) / Assumptions / Risks / Execution Steps / Review Checklist / Validation Log / Compound Opportunity / Lessons Captured / Exit Criteria.
  - **Melhoria (decisão B do dev — "nunca diminuir"):** adicionar **Observability** como 11ª seção obrigatória — descreve o audit log esperado da execução (subagent_id, input_paths, contagens, duração_ms).
  - **Seções opcionais (3, baseadas no plano real do Andre `2026-05-13-customizar-docs-harness-restantes...`):** Follow-up Plans / Final Report / Pré-GO decisões pendentes. Incluir no tpl como placeholders vazios — preenchidos quando aplicável, omitidos no PLAN final se vazios.
  - Total: **11 obrigatórias + 3 opcionais = 14 seções no template; 11 mínimas no output**.
  - Criar `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com a estrutura acima.
  - Criar `skills/init/assets/templates/exec-plan/fase.md.tpl` para fase individual com sub-seções estilo Andre (Goal local, Inputs docs, Inputs código, Instrução LLM imperativa, Critério de Done).
  - Refatorar `renderPlanIndex()` em `populate-plan-generator.ts` para ler o tpl e injetar variáveis (`{{PROJECT_NAME}}`, `{{DATE}}`, `{{PHASES_TABLE}}`) — Step 91 continua PURO (zero LLM); LLM preenche o corpo no `/execute-plan`.
  - **Gate de regressão:** test fixture valida via regex que o PLAN.md gerado contém as 11 seções obrigatórias (CA-03). Build quebra se alguma sumir.

- [ ] **MH-3 — Instruções imperativas no Step 91 (fix #2 do briefing)**
  - Reescrever `LLM_INSTRUCTIONS` em `populate-plan-generator.ts:79-126` removendo todas as brechas tipo "se não houver, mantenha template". Padrão novo (obrigatório por instrução):
    1. Lista de **Fontes:** específicas para o doc.
    2. Lista de **Seções obrigatórias** do output.
    3. Frase de honestidade: "Cada afirmação rastreia um arquivo lido. Quando não rastreia, marca `TODO(<contexto>):`. Honestidade > marketing."
  - `DEFAULT_INSTRUCTION` (fallback) também vira imperativa.
  - **Exemplo concreto para `ARCHITECTURE.md` (orientação ao subagente):** a instrução deve direcionar o subagente a procurar **convenções arquiteturais não-óbvias** do projeto — separação dog-food vs runtime asset, fronteiras entre camadas, contratos entre módulos — citando arquivo+linha como prova. Referência viva: seção *"Convencao: `docs/` vs Runtime Assets"* em `ARCHITECTURE.md` deste plugin (adicionada em V6.6.0 pelo PRD `knowledge-path-cutover`) é o **tipo de conteúdo** esperado quando `ARCHITECTURE.md` está bem populado — não é placeholder genérico nem lista exaustiva de pastas, é decisão arquitetural com motivação rastreada. Instruções de outros docs canônicos seguem o mesmo padrão: dar ao subagente um exemplo do output esperado, não só checklist do que ler.
  - **Gate de regressão:** test fixture valida que cada `LLM_INSTRUCTION` contém os 3 elementos acima (CA-06). Build quebra se alguém adicionar instrução sem Fontes ou sem honestidade.

- [ ] **MH-4 — Discovery cruzando `(stack-id + doc-canonico) → paths` (fix #4 do briefing)**
  - Expandir `stack-aware-input-paths.ts` com entries para **todos os 12+ docs canônicos** em cada stack suportado (Next.js, Next.js+Supabase, Rails, Node-TS). Cobrir os atualmente ausentes: AGENTS.md, docs/PLANS.md, docs/QUALITY_SCORE.md, docs/STATE.md, docs/design-docs/core-beliefs.md, .claude/CLAUDE.md, docs/PRODUCT_SENSE.md, README.md.
  - Manter validação `fs.access` (não regredir invariante G2 do PRD anterior).
  - **Gate de regressão:** test fixture valida que em projeto Next.js+Supabase, fases SECURITY/ARCHITECTURE/RELIABILITY têm >= 3 paths reais com `exists: true` (CA-02). Em stack `unknown`, fases ainda existem com `Inputs (codigo)` vazio + nota explícita (CA-05). Build quebra se cobertura cair.

### Should Have

- [ ] **SH-1**: Atualizar `docs/PIPELINE.md` (referenciado no CLAUDE.md do plugin) com nova estrutura do populate-plan.
- [ ] **SH-2**: Adicionar entries de stack para **Laravel** e **Python** em `stack-aware-input-paths.ts` (não inventar — apenas paths do scaffold padrão).
- [ ] **SH-3**: `Lessons Captured` do PLAN.md.tpl vir **pré-populado** com 6 lições genéricas que toda first-use customization aprende (extraídas do plano do Andre na referência Carreirarte).
- [ ] **SH-4**: Audit log do Step 91 emite contagem detalhada (docs cobertos por stack, docs sem evidência de código, fases criadas vs esperadas).

### Could Have

- [ ] **CH-1**: Sub-comando `/anti-vibe-coding:init --refresh-plan` que regenera só o populate-plan sem rodar steps anteriores (útil quando o usuário atualiza TEMPLATE_MANIFEST).
- [ ] **CH-2**: Diff visual side-by-side (HTML report) comparando output do nosso `/init` vs output do harness-engineering+compound-engineering rodado na mesma pasta — referência visual para validar paridade.

### Won't Have (desta versão)

- Reescrever steps anteriores do `/init` (01-90). Escopo é Step 91 + libs que ele invoca.
- Substituir `populate-plan-generator.ts` por gerador escrito em outra linguagem.
- Suportar projetos onde nem `TEMPLATE_MANIFEST` nem `stack-aware-input-paths` cobrem o stack — fica para iteração futura quando aparecer caso real.

---

## Requisitos Não-Funcionais

- **Performance:** geração do populate-plan deve continuar < 2s em greenfield (referência atual). Adicionar 6-7 fases não pode quebrar isso.
- **Determinismo:** Step 91 continua **PURO** (sem chamada de LLM). Toda síntese ainda acontece no `/execute-plan`. Não regressar este invariante.
- **Compatibilidade:** plano gerado tem que ser legível pelo `/anti-vibe-coding:execute-plan` atual (manter contrato: pasta com PLAN.md + fase-XX-{slug}.md).
- **Observabilidade:** audit log do Step 91 emite, por fase: `docCanonico`, `inputsDocsCount`, `inputsCodeCount`, `inputsCodeExistsCount`, `stackPrimary`.
- **Acessibilidade:** N/A (infra do plugin, sem UI).

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Estratégia PLAN.md | Template estático com 11 seções obrigatórias (10 do Andre canonical + Observability) + 3 opcionais; LLM preenche corpo no `/execute-plan` | (a) Gerador programático estendido com blocos / (b) Híbrido header gerado + corpo livre / (c) Copiar literal 10 do Andre sem adicionar | Aderência ao princípio "copiar + melhorar, nunca diminuir". Andre tem 10 base; nós cobrimos os 10 + Observability (melhoria) + 3 opcionais (sourced do plano real do Andre, não da template). Mantém determinismo do Step 91 (zero LLM). |
| 2 | Discovery cruzando stack+doc | Hash map `(stack-id + doc-canonico) → paths` (lib já existe — `stack-aware-input-paths.ts`, expandir) | (a) Hash por doc-only / (b) LLM-driven inference | Lib JÁ implementa este padrão. Falta apenas expandir entries — caminho de menor risco. Testável, extensível, sem regredir determinismo. |
| 3 | Gate "nunca diminuir" | Test fixture comparativo (estrutura + cobertura + inputs + golden) + regra escrita em compound | (a) Doc-only sem teste / (b) Schema lint TypeScript-only | Teste automatizado é o único gate que sobrevive a refactor futuro. Schema lint cobre estrutura mas não cobertura. Doc-only depende de review humano consistente — improvável. |
| 4 | Localização do PLAN.md.tpl | `skills/init/assets/templates/exec-plan/PLAN.md.tpl` (sub-pasta nova) | `skills/init/assets/templates/PLAN.md.tpl` (root junto dos docs) | Sub-pasta `exec-plan/` separa templates de **planos** de templates de **docs**. Facilita futuro `phase.md.tpl`, `STATE.md.tpl` de plano, etc. |
| 5 | Remoção do `EXCLUDED_FROM_POPULATION_V2` | Remover entries de PRODUCT_SENSE e README, manter COMPOUND_ENGINEERING (filosófico real, não precisa code-grounded) | Esvaziar a lista totalmente | COMPOUND_ENGINEERING.md é meta-documentação do processo — não há "código a referenciar". Manter exclusão. |
| 6 | `.claude/CLAUDE.md` no plano | Sim, vira fase própria espelhando AGENTS.md | Pular .claude/CLAUDE.md (já tem CLAUDE.md global do usuário) | Andre não tem `.claude/` mas tem `AGENTS.md` rico. Nosso plugin tem ambos. Espelhar conteúdo de AGENTS.md em CLAUDE.md por contrato (alguns agents leem um, outros o outro). Decisão obrigatória para coerência. |

---

## Critérios de Aceite

- [ ] **CA-01:** Dado um projeto greenfield (sem código), quando `/anti-vibe-coding:init` rodar, então o populate-plan gerado contém **>= 12 fases** cobrindo: ARCHITECTURE.md, AGENTS.md, README.md, .claude/CLAUDE.md, docs/PRODUCT_SENSE.md, docs/QUALITY_SCORE.md, docs/SECURITY.md, docs/RELIABILITY.md, docs/DESIGN.md, docs/FRONTEND.md, docs/PLANS.md, docs/CODE_STYLE.md (mínimo — outros aceitos).
- [ ] **CA-02:** Dado um projeto Next.js+Supabase, quando `/init` rodar, então cada fase para SECURITY/ARCHITECTURE/RELIABILITY tem **>= 3 paths reais** em `Inputs (codigo)` (validados com `exists: true`).
- [ ] **CA-03:** Dado o PLAN.md gerado, quando inspecionado por regex de header, então contém literalmente as **11 seções obrigatórias** (Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria, Observability). As 3 opcionais (Follow-up Plans, Final Report, Pré-GO) ficam ausentes ou marcadas `<!-- opcional: preencher quando aplicável -->`.
- [ ] **CA-04:** Dado o test fixture `populate-plan-parity.test.ts`, quando alguém adicionar entry a `EXCLUDED_FROM_POPULATION_V2` ou remover entry de `LLM_INSTRUCTIONS`, então o build quebra (gate "nunca diminuir" mecânico).
- [ ] **CA-05 (edge case):** Dado um projeto com stack `unknown`, quando `/init` rodar, então o plano ainda é gerado, fases ainda existem, e cada fase emite `Inputs (codigo)` vazio com nota explícita "stack não detectado — LLM deve inferir do README + package.json". NÃO falha o build.
- [ ] **CA-06:** Dado uma `LLM_INSTRUCTION`, quando inspecionada por contrato, então contém pelo menos: (a) lista de "Fontes:" específicas, (b) sub-seções obrigatórias do output, (c) frase de honestidade ("Honestidade > marketing" ou equivalente). Sem brecha tipo "se não houver, mantenha template".
- [ ] **CA-07:** Dado a regra "nunca diminuir" violada em PR (ex: alguém remove um doc da lista), quando o reviewer rodar `bun test populate-plan-parity`, então o teste falha com mensagem clara apontando o que foi removido e linkando este PRD.
- [ ] **CA-08:** Dado o golden snapshot atualizado por mudança intencional, quando o autor regenera via `bun test --update-snapshots`, então o diff é visível no PR e exige aprovação humana explícita.

---

## Out of Scope

- **Conteúdo dos docs gerados** — escopo é a **estrutura** do plano que dispara a geração. O conteúdo é responsabilidade do `/execute-plan` (próximo passo do pipeline).
- **Refactor do `populate-plan-writer.ts`** — apenas adicionar suporte ao novo `PLAN.md.tpl`. Não reescrever.
- **Mudanças no `discovery-manifest-light.ts`** — discovery atual já amostra paths e 100 primeiras linhas. Suficiente. Mudanças ficam para iteração futura se aparecer necessidade.
- **Internacionalização do PLAN.md.tpl** — manter pt-BR como o Andre tem em inglês. Misturar idiomas no scaffold do plugin não é problema (validado pelo usuário em outras skills).

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Lib interna | `populate-plan-generator.ts` | ✅ existe, refatorar |
| Lib interna | `stack-aware-input-paths.ts` | ✅ existe, expandir |
| Lib interna | `template-manifest.ts` | ✅ existe, adicionar entries |
| Lib interna | `populate-plan-writer.ts` | ✅ existe, adicionar suporte ao tpl novo |
| Step adjacente | `skills/init/lib/steps/90-final-validation.ts` | ⚠️ NÃO MEXER — V6.6.0 (PRD `knowledge-path-cutover`) adicionou check bloqueante de `.claude/knowledge/{stack}/INDEX.md`. Pode abortar E2E antes do Step 91 rodar. Ver seção **Riscos**. |
| Asset | `skills/init/assets/templates/exec-plan/PLAN.md.tpl` | 🆕 a criar |
| Asset | `skills/init/assets/templates/exec-plan/fase.md.tpl` | 🆕 a criar (opcional — pode ficar inline no generator) |
| Test | `tests/e2e/populate-plan-parity.test.ts` | 🆕 a criar |
| Golden | `tests/e2e/__golden__/populate-plan-andre-parity.md` | 🆕 a criar |
| Doc compound | `docs/compound/2026-05-19-never-diminish-andre.md` | 🆕 a criar (gate "nunca diminuir") |
| Referência | `tmp/andre-skills/harness-engineering/` (já copiado) | ✅ disponível |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Regressão em E2E `init-greenfield` (golden snapshot atual em `tests/e2e/__golden__/init-greenfield.stdout.txt` lista fases antigas) | Alta | Médio | MEMORY.md já registra que esse golden precisa regenerar (Plano 05 fase-04). Este PRD ASSUME regen como parte do escopo. Adicionar checklist explícito. |
| LLM_INSTRUCTIONS imperativas custarem mais tokens no `/execute-plan` | Média | Baixo | Aceito — princípio "nunca diminuir" precede custo de tokens. Documentar trade-off no PRD. |
| Novos paths em `stack-aware-input-paths` com `exists: false` poluírem o output | Média | Médio | Lib já marca com nota; renderer pode optar por suprimir paths inexistentes no markdown (decisão futura — não bloqueia este PRD). |
| Golden snapshot do gate "nunca diminuir" virar churn (muda toda semana) | Baixa | Médio | Golden assertion é sobre **estrutura mínima** (>= N seções, >= K fases), não conteúdo exato. Estrutura é estável. |
| TEMPLATE_MANIFEST não incluir `.claude/CLAUDE.md` por design (decisão antiga) | Média | Alto | **Decisão do dev (2026-05-19): sempre incluir, sem opt-out.** Verificar no início. Se ausente, adicionar entry; se presente mas filtrado, remover filtro. Test fixture (MH-4) asserta presença obrigatória de `.claude/CLAUDE.md` no plano gerado para todo stack — build quebra se omitida. Documentar reversão no commit. |
| Equivalência Andre quebrar quando ele lançar V7 das skills | Baixa | Médio | Golden snapshot é nosso — desacoplado da versão dele. Atualizar manualmente se quisermos paridade com V7. |
| E2E do CA-02 (`populate-plan-parity.test.ts`) abortar no Step 90 antes do Step 91 rodar — V6.6.0 introduziu check bloqueante `.claude/knowledge/{stack}/INDEX.md` ausente → AbortError code:1. Em ambiente de teste/CI o plugin cache global pode estar vazio ou desatualizado, o que dispara o abort mesmo com fluxo de produção correto. | Alta | Médio | Test fixture deve **pré-popular** `.claude/knowledge/{stack}/INDEX.md` como stub (assert do CA-02 não depende do conteúdo do INDEX, só dos paths em `Inputs (codigo)`) **OU** rodar `sync-to-global.sh` no `beforeAll` **OU** chamar `generatePopulatePlanV2()` isolado, sem o pipeline `/init` inteiro. Documentar a escolha no commit do teste. |

---

## Lessons Captured (pré-populado para o plan-feature usar)

- **Anti-pattern detectado**: heurística + LLM podem ambos errar pelo mesmo motivo se o input mecânico (lista de docs no `TEMPLATE_MANIFEST` ou `EXCLUDED_FROM_POPULATION_V2`) estiver errado. Validar **lista de docs primeiro** antes de qualquer melhoria de qualidade na geração.
- **Princípio universal**: ao portar de ferramenta validada externa (Andre, libs maduras), copiar literalmente primeiro, melhorar em cima — nunca "adaptar para baixo". Registrado em `feedback_copy-then-improve.md` em memory/.
- **Compound-engineering pattern**: gate "nunca diminuir" deve ser **teste**, não doc — docs decaem, testes não. Aplicar este padrão a outros pontos do plugin onde "paridade com referência" importa.

---

## Follow-up Plans

- **Conteúdo dos docs** (depois deste PRD): após `/execute-plan` rodar este PRD, validar que o pipeline E2E completo (`/init` → `/execute-plan {populate-plan-folder}`) produz docs ricos no nível Andre. Criar plano dedicado se gaps de **conteúdo** surgirem (escopo diferente — este PRD é só estrutura).
- **Migração de projetos antigos**: projetos que já rodaram `/init` antes desta mudança precisam regenerar o populate-plan. Documentar comando ou adicionar `--refresh-plan` (Could Have CH-1).
