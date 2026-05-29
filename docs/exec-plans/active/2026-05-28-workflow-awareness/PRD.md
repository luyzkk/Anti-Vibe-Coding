---
slug: workflow-awareness
date: 2026-05-28
status: approved
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-28 (Luiz/dev): threshold 100+ — alinhado com âncora "500-file" do CC (D2)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Workflow-Awareness no Anti-Vibe Coding

**Status:** Approved
**Author:** Luiz + AI
**Date:** 2026-05-28
**Context:** ./CONTEXT.md

---

## Problema

O Claude Code lançou **dynamic workflows** (scripts que orquestram dezenas-a-centenas de subagentes) e
recomenda usá-los em tarefas de escala. O dev (Luiz) sente dificuldade recorrente em saber **quando** uma
tarefa justifica um workflow versus o pipeline normal. O plugin anti-vibe-coding hoje tem uma escada de
complexidade (`quick-plan → plan-feature`) e várias skills que spawnam subagentes (`design-twice`,
`verify-work`, `execute-plan`), mas **nenhum degrau de escala acima disso** e **nenhuma menção a workflows**
em parte alguma (hooks, skills, docs).

Por que importa: sem essa consciência, o dev ou (a) nunca usa workflow quando deveria (auditoria do codebase
inteiro, migração de centenas de arquivos) — perdendo paralelismo e qualidade adversarial; ou (b) tenta usar
workflow para tudo, queimando tokens à toa. A raiz da confusão é tratar **complexidade** e **escala** como a
mesma coisa — não são. Uma tarefa complexa (multi-domínio, irreversível) é resolvida pelo Claude orquestrando
turno a turno; workflow só ganha quando o **volume** estoura o que uma conversa segura.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- O agente reconhece sinais de **escala** num pedido e **SUGERE** rodar como dynamic workflow, sem nunca lançá-lo.
- O dev recebe um sinal inequívoco de "isto é escala de workflow" exatamente quando a régua complexidade≠escala se aplica.
- O opt-in permanece 100% do humano: a sugestão pede para incluir a palavra `workflow` (ou `/effort ultracode`); o plugin nunca emite a tool Workflow nem `decision:block`.
- Cada sugestão de workflow vem pareada com a skill in-context equivalente (`/verify-work`, `/design-twice`, `/deep-research`, `/plan-feature`) — que funciona mesmo se workflows estiverem desabilitados.
- A diretriz "sugere, nunca executa" fica travada por teste de CI, não só por prosa.
- O plugin documenta, num único lugar canônico, a fronteira workflow vs subagente vs skill.

### Mecanismo (algorítmico — o COMO)

Espelhar a máquina do **skill-advisor** existente (regex → texto stdout → "pergunte antes de prosseguir"),
adicionando uma camada ortogonal de detecção de **escala**:

1. **Doc canônico** `docs/WORKFLOWS.md` é a fonte de verdade; tudo referencia, nada duplica a lógica.
2. **Camada permanente** (banner SessionStart) dá consciência durante a sessão toda.
3. **Camada por-prompt** (`user-prompt-gate.cjs`) detecta sinal de escala e emite `[WORKFLOW_ADVISOR]` (texto advisory).
4. **Camadas de skill** (plan-feature, quick-plan, verify-work, etc.) referenciam o doc canônico no ponto onde cada uma já raciocina sobre complexidade/paralelismo.
5. **Trava de CI** garante a diretriz.

Detecção keyed em **escala, não em contagem de domínios** (sinal semântico: varredura do codebase inteiro,
migração de 100+/500+ arquivos, pesquisa cross-checada, plano de muitos ângulos) — para não colidir com o
branch multi-domínio que já existe (`≥2 domínios → consultant/grill-me`).

**Mensagem `[WORKFLOW_ADVISOR]` (redação confirmada 2026-05-29 — final em `plano01/fase-01`):**

> `[WORKFLOW_ADVISOR] Esta tarefa tem sinal de escala ({gatilho}) — pode exceder o que uma conversa coordena.`
> `Considere rodá-la como um dynamic workflow: inclua a palavra "workflow" no seu pedido para optar (o plugin`
> `não lança nada sozinho). Alternativa in-context: {/verify-work | /design-twice | /deep-research | /plan-feature}.`
> `Workflows consomem substancialmente mais tokens. Pergunte ao usuário qual prefere antes de prosseguir.`

---

## Fluxos UX por Ator

### Dev (autor do prompt)

1. Dev escreve um pedido com sinal de escala — ex: _"auditar o codebase inteiro por uso de `any`"_.
2. `user-prompt-gate.cjs` detecta `SCALE_PATTERNS` e injeta o texto `[WORKFLOW_ADVISOR]` como contexto.
3. → Caminho A: o agente relata a sugestão ao dev e **pergunta** se quer rodar como workflow (incluindo a palavra) ou usar a skill in-context.
3. → Caminho B: o pedido já continha `workflow`/`ultracode` → anti-deadlock retorna `null`, nenhuma sugestão (o humano já optou).
3. → Caminho C: o threshold não bate (ex: _"renomeie 12 arquivos"_) → nenhuma sugestão.
4. Dev decide: re-roda com `workflow` (opt-in), aceita a skill análoga, ou ignora.

**Copy relevante:**
- Sugestão: _ver mensagem `[WORKFLOW_ADVISOR]` acima._
- Banner permanente (SessionStart): _"Para tarefas que precisam de dezenas-a-centenas de agentes coordenados... SUGIRA um workflow... NUNCA lance a tool Workflow automaticamente."_

**Retrospectivo (pós-turno, suavizado):** _"Esta tarefa tocou muitos arquivos sequencialmente — da próxima
vez, considere re-rodar incluindo a palavra workflow para coordenar os agentes em paralelo."_ — apenas como
linha DENTRO do menu FEATURE_COMPLETED existente, gated por sinal forte.

---

## Requisitos Funcionais

### Must Have (núcleo — entrega 100% do comportamento)
- [ ] RF1: Criar `docs/WORKFLOWS.md` (PRIMEIRO) — tabela comparativa (paráfrase), gatilhos+exemplos, padrões de qualidade, limites, custo, gate de disponibilidade + degradação graciosa, caixa PRIME-DIRECTIVE, seção "Workflow vs skills paralelas existentes".
- [ ] RF2: `AGENTS.md` — 1 linha na tabela "When to Read What" → `docs/WORKFLOWS.md` (respeitar cap de 70 linhas).
- [ ] RF3: `hooks/hooks.json` — cláusula "Workflows dinâmicos" no banner SessionStart (após a tabela Akita).
- [ ] RF4: `hooks/user-prompt-gate.cjs` — anti-deadlock (`workflow`/`ultracode` → null) + `SCALE_PATTERNS` conservador + branch `[WORKFLOW_ADVISOR]` (independe de verbo; suprimir/mesclar com branch multi-domínio).
- [ ] RF15: Teste de regressão e2e travando a diretriz (ver CA-04/CA-05).

### Should Have (descoberta no fluxo de planejamento)
- [ ] RF5: `skills/plan-feature/SKILL.md` — Step 4 tier "ESCALA-WORKFLOW" (semântico); Step 7 opção explicativa-only.
- [ ] RF6: `skills/quick-plan/SKILL.md` — 1 linha no "Quando NÃO Usar" + sibling no Step 3.
- [ ] RF7: `skills/verify-work/SKILL.md` — callout "mesmo-padrão-escala-diferente" (diff vs codebase inteiro).
- [ ] RF8: `skills/design-twice/SKILL.md` — nota "workflow só acima de 5 ângulos / cross-review / rerunnable".
- [ ] RF9: `skills/execute-plan/SKILL.md` — callout "Workflow vs orquestrador" (keep-separate; opt-in fresco; INV6).
- [ ] RF12: `docs/PIPELINE.md` — 1 bullet em "Alternative Entry Points".
- [ ] RF13: `docs/PLANS.md` — nota de escalação (plano → workflow) após a lista de traits.

### Could Have (cobertura completa)
- [ ] RF10: `skills/grill-me/SKILL.md` — linha condicional no branch Complex.
- [ ] RF11: `skills/consultant/SKILL.md` — next-step condicional no Pipeline Awareness.
- [ ] RF14: `hooks/stop-reflector.cjs` — retrospectivo suavizado (linha no FEATURE_COMPLETED, gated por sinal forte, nunca decision:block novo).

### Won't Have (desta versao)
- Telemetria do `WORKFLOW_ADVISOR` (D8) — UserPromptSubmit roda antes das tool calls do turno; sinal quase-zero. Candidata clara a reativar se o nag aparecer.
- Fork de sugestão no `pre-mutation-gate.cjs` (D4/INV7) — risco de nag duplo (HOOK_LOCK não compartilhado).
- Detecção em runtime se workflows estão habilitados — hooks não conseguem detectar de forma confiável; degradação é suave (fallback sempre presente).

---

## Requisitos Nao-Funcionais

- **Performance:** branch novo no hook é regex O(1); preserva o timer de segurança de 500ms e o fail-open atual.
- **Seguranca (da diretriz):** nenhum caminho emite tool Workflow nem `decision:block`. Opt-in só por ação humana (palavra `workflow`/`ultracode`). Travado por RF15.
- **Acessibilidade:** N/A (sem UI; só texto de terminal).
- **Observabilidade:** sem telemetria nova no v1 (D8). Comportamento auditável via teste de regressão.
- **Anti-nag:** regex conservador (100+/500+, palavras só com qualificador de escopo); sugestão sempre suave, escopada, com aviso de custo e fallback de skill.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Escopo do v1 | Design completo (14 pontos + teste) | MVP enxuto 4+1 | Dev priorizou simetria/descoberta; aceita custo de manutenção (D1) |
| 2 | Limiar de detecção | Conservador `\d{3,}` / palavras+qualificador | Sensível `\d{2,}` (10+) | Âncora do CC é 500 arquivos; evitar nag (D2) |
| 3 | Gatilho | Independe de verbo de implementação | Só com `hasImplementation` | Auditoria/pesquisa em escala não têm verbo (D3) |
| 4 | Superfície | Só `user-prompt-gate` | + `pre-mutation-gate` | Evita nag duplo (HOOK_LOCK não compartilhado) (D4) |
| 5 | Retrospectivo | Manter, suavizado | Item 14 puro / cortar | Honra escopo + não afoga menu de segurança (D5) |
| 6 | Teste de regressão | Incluir no v1 | Pular | Diretriz vira garantia de CI (D6) |
| 7 | Pesquisa cruzada | Nomear `/deep-research` (se disponível) | Genérico | Caminho concreto; corrige erro do design (D7) |
| 8 | Telemetria | Adiar | Incluir agora | YAGNI: sinal quase-zero (D8) |
| 9 | Tag do banner | Confirmada (2026-05-29): `[ANTI_VIBE_CODING v5.1 - SKILL & WORKFLOW ADVISOR ATIVO]` | Manter intacta | Workflow vira preocupação de 1ª classe (D9) |
| 10 | Tabela comparativa CC | Confirmada (2026-05-29): parafrasear (não verbatim) | Copiar verbatim | Evita copy-paste de conteúdo externo; estilo do repo |

---

## Criterios de Aceite

- [ ] CA-01: Dado um prompt com sinal de escala (ex: "migrar 400 arquivos para o novo formato"), quando o `user-prompt-gate` processa, então emite `[WORKFLOW_ADVISOR]` sugerindo a palavra "workflow" + skill análoga, terminando em "pergunte ... antes de prosseguir".
- [ ] CA-02: Dado um prompt que já contém "workflow" ou "ultracode", quando processado, então o hook retorna `null` (anti-deadlock; não re-sugere).
- [ ] CA-03 (edge / falso-positivo): Dado "renomeie esses 12 arquivos", quando processado, então NÃO emite `[WORKFLOW_ADVISOR]` (threshold 100+ não dispara).
- [ ] CA-04 (diretriz): Dado qualquer caminho do `[WORKFLOW_ADVISOR]`, quando inspecionado pelo teste de regressão, então nenhum emite a tool Workflow nem `decision:block`.
- [ ] CA-05: Dado `docs/WORKFLOWS.md`, quando o `bun run harness:validate` roda, então o arquivo existe, começa com H1, `AGENTS.md` linka pra ele, e a validação passa verde.
- [ ] CA-06 (escala sem verbo): Dado "auditar o codebase inteiro por XSS" (sem verbo implementar/criar), quando processado, então emite `[WORKFLOW_ADVISOR]` (dispara independente de verbo).
- [ ] CA-07 (multi-domínio + escala): Dado um prompt com ≥2 domínios E sinal de escala, quando processado, então emite UMA mensagem mesclada (não dois pedidos de escalação empilhados — INV1).

---

## Out of Scope

- Alterar a mecânica de opt-in do próprio Claude Code — fora do controle do plugin.
- Detectar em runtime se workflows estão habilitados/disponíveis — degradação é suave (fallback de skill sempre presente).
- Escrever workflows reais (scripts) prontos — o plugin só sugere; quem escreve é o Claude quando o humano opta.
- Tocar `pre-mutation-gate.cjs` (D4) e adicionar telemetria (D8) — explicitamente Won't desta versão.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Plataforma | Claude Code v2.1.154+ (dynamic workflows, research preview) | disponível no ambiente do dev |
| Skill bundled | `/deep-research` (citada no gatilho de pesquisa) | presente nesta sessão; "se disponível" cobre installs sem ela |
| Toolchain | bun + TypeScript (testes e2e) | já no projeto |
| Validação | `bun run harness:validate` (link-check do AGENTS/docs) | já no projeto |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Regex dispara em falso-positivo apesar do limiar conservador | média | médio | Sugestão suave + fallback; telemetria pronta como Won't a reativar |
| Scope creep / drift entre as 8 skills e o doc canônico | média | médio | Uma fonte de verdade (`docs/WORKFLOWS.md`); skills só referenciam; RF15 ancora doc+link |
| Prose-leak: opção/callout lido pela LLM como permissão de lançar | média | alto | INV6 obrigatório (rótulo explicativo-only; opt-in fresco no execute-plan); RF15 checa não-emissão |
| Banner já longo / cap de tokens do SessionStart | baixa | baixo | Cláusula curta; detalhe vive em `docs/WORKFLOWS.md` |
| Feature do CC em research preview muda a mecânica de opt-in | baixa | médio | Guidance ancorada em sinais (escala/qualidade), não em UI; degradação documentada |
