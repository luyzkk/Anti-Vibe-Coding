---
slug: agent-skills-import-wave2
date: 2026-05-22
status: completed
completedAt: 2026-05-23
requires: [agent-skills-import-wave1]
parent_analysis: ../2026-05-22-agent-skills-import-analysis/ANALYSIS.md
---

# PRD: Agent-Skills Import — Wave 2 (Médio Prazo)

**Status:** Approved (2026-05-22)
**Author:** Luiz Felipe + AI (Claude)
**Date:** 2026-05-22
**Context:** [../2026-05-22-agent-skills-import-analysis/ANALYSIS.md](../2026-05-22-agent-skills-import-analysis/ANALYSIS.md) (seção 6.2 e §7)
**Parent:** Análise comparativa `obra/agent-skills` × Anti-Vibe-Coding
**Wave:** 2 de 3
- ← Depende da Wave 1: `../2026-05-22-agent-skills-import-wave1/PRD.md` (approved 2026-05-22)
- → Wave 3 a criar: `2026-05-22-agent-skills-import-wave3/PRD.md`

---

## Problema

A Wave 1 entregou quick wins táticos (CI, padrão de skill, 2 skills novas, refactor leve em `grill-me`, bootstrap `docs/references/`). Mas a análise comparativa (ANALYSIS.md §3, §6.2) identificou **gaps mais profundos** que exigem refatoração coordenada:

1. **Agentes nossos são adversariais demais** — 13 auditores que só apontam problemas, nunca reforçam acertos. Origem (`agent-skills`) usa "What's Done Well" obrigatório, severidade vinculada a SLA, triad PoC/Impact/Fix para criticals. Nosso JSON contract é validável programaticamente mas operacionalmente raso (campo `description` sozinho).
2. **Falta defesa contra alucinação de API/framework** — agente gera código React 14 vs 15, Rails 7 vs 8, libs deprecadas, sem citar fonte. Origem tem `source-driven-development` com hierarquia de fontes (docs oficiais > changelog > MDN; Stack Overflow nunca primária).
3. **Falta loop adversarial in-flight** — nossa `design-twice` gera propostas mas não tem reviewer fresh-context que ataque CADA escolha. Origem tem `doubt-driven-development` com CLAIM → EXTRACT → DOUBT → RECONCILE → STOP + cross-model escalation.
4. **Falta disciplina de commit codificada** — CLAUDE.md global menciona conventional commits, mas sem skill descobrível. "Fix bug" continua sendo aceito como commit message.
5. **`decision-registry` é forte em infra, fraco em pedagogia** — automatiza ADR mas não ensina *quando* escrever, *como pensar* sobre reversibilidade. Origem (`documentation-and-adrs`) tem 350L de pedagogia.

**Por que importa:** sem isso, o plugin entrega disciplina superficial (TDD + planos + reviews) mas perde batalhas profundas (alucinação de API, vieses de confirmação, commit history ruim).

**Impacto de não resolver Wave 2:** Wave 3 (consolidações) fica perigosa sem agentes refinados — `verify-work` consolidado herda 13 auditores rasos. Pipeline compound→reference (Wave 3) fica órfão sem fluxo de citação ensinado.

---

## Solução

### Outcomes (declarativo — o QUE)

- Cada um dos 13 agentes auditores emite (1) veredito explícito merge/no-merge ou ship/block, (2) ≥1 observação positiva obrigatória, (3) severidade mapeada a ação SLA, (4) tríade PoC/Impact/Fix para issues critical/high, (5) regras anti-degeneração no fim do prompt, (6) bloco de Composition documentando orquestração canônica.
- Existe skill `source-driven-development` que força citação de fonte oficial antes de gerar código framework-específico, com pattern UNVERIFIED para casos sem doc disponível.
- Existe skill `doubt-driven-development` com sequência CLAIM → EXTRACT → DOUBT → RECONCILE → STOP e cross-model escalation guardrails.
- Existe skill `git-workflow-and-versioning` codificando conventional commits, atomicidade, PR description como contrato histórico, "Fix bug" como antipadrão.
- [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md) ganha seção pedagógica `## When to Write an ADR` antes do fluxo CRUD existente, com tabela "Common Rationalizations", lifecycle PROPOSED→ACCEPTED→SUPERSEDED, regra "Don't delete old ADRs".

### Mecanismo (algorítmico — o COMO)

**Item 1 — Refinar 13 agentes com 5 patterns.** Aplicação em massa via subagente paralelo (1 agente por arquivo, ou 3-4 em lote). Cada [agents/*.md](agents/) recebe:

```markdown
## Output Contract (additions)

- payload.positive_observations: string[] (≥1 obrigatório, mesmo em estado "clean")
- payload.verdict: "approve" | "request_changes" | "block" (binário canônico)
- payload.severity_action_map:
  | Severity | SLA / Action |
  |---|---|
  | critical | Fix immediately, block release |
  | high | Fix in current sprint |
  | medium | Backlog with target date |
  | low | Nice to have |

Para issues com severity ∈ {critical, high}, payload.issues[].* DEVE conter:
- exploitation_scenario: como o problema se manifesta / é explorado
- impact: consequências mensuráveis
- fix_with_example: snippet de correção

## Anti-Degeneration Rules

GENÉRICAS (≥2 obrigatórias, universais):
- NUNCA sugerir `@ts-ignore`, `eslint-disable`, `test.skip` como correção
- NUNCA sugerir desabilitar validadores, gates, hooks como correção

ESPECÍFICAS DO DOMÍNIO (≥2 obrigatórias por agente — total ≥52 no plugin):
- {regra 1 específica — ver CA-10 para exemplos por domínio}
- {regra 2 específica}

## Composition

- Invoke directly when: {casos}
- Invoke via: {skill canônica que orquestra}
- Do not invoke from another persona (constraint plataforma)
```

Por agente, customizar `anti-degeneration` (ex: security-auditor adiciona "Never suggest disabling CORS as a fix"; react-auditor adiciona "Never suggest removing dependency array as a fix").

**Item 2 — Portar `source-driven-development`.** Copy literal de `Infos/agent-skills-main/skills/source-driven-development/SKILL.md` + melhorias padrão (frontmatter, telemetria, PT-BR). Conteúdo principal:
- Hierarquia: docs oficiais (`react.dev`, `nextjs.org/docs`, `docs.djangoproject.com`) > changelogs versionados > MDN > Stack Overflow (nunca primária)
- Pattern `UNVERIFIED:` — quando não acha doc, NÃO chuta — declara explicitamente "UNVERIFIED — buscar em {fonte}"
- Cross-reference com `consultant` (skill irmã: SDD cita docs, consultant ensina trade-offs)
- Integração com `references/` da Wave 1 (citar quando aplicável)

**Item 3 — Portar `doubt-driven-development`.** Copy literal de `Infos/agent-skills-main/skills/doubt-driven-development/SKILL.md` + melhorias. Sequência:
- CLAIM (agente declara) → EXTRACT (decisão verificável extraída) → DOUBT (fresh-context reviewer ataca) → RECONCILE (classificação: contract misread / actionable / trade-off / noise) → STOP (3 ciclos máximo, escala humano)
- Cross-model escalation: invocar Gemini/Codex como segundo cérebro, com shell escaping guardrails
- Cross-reference com `design-twice` (DDD ataca UMA escolha; D2 gera N alternativas) e `verify-work` (DDD in-flight; VW pós-implementação)

**Item 4 — Portar `git-workflow-and-versioning`.** Copy literal + melhorias. Conteúdo:
- Trunk-based development, commits atômicos, conventional commit format (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- PR description como contrato histórico (não bullet point preguiçoso)
- Antipadrão explícito: `git commit -m "Fix bug"` — vetado
- Integração com nosso pipeline (`/iterate`, `/incident-response` já tocam git mas sem disciplina codificada)

**Item 5 — Migrar pedagogia `documentation-and-adrs` → `decision-registry`.** Editar [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md). Adicionar seção `## When to Write an ADR` ANTES do fluxo CRUD existente. Conteúdo:
- Tabela "Quando ADR é obrigatório" — framework choice, data model, auth strategy, decisões expensive to reverse
- Template Context/Decision/Alternatives/Consequences (já temos no `adr-writer.ts`, mas a pedagogia falta)
- Lifecycle PROPOSED → ACCEPTED → SUPERSEDED — quando mudar status, como referenciar predecessores
- Tabela "Common Rationalizations" extraída de `Infos/agent-skills-main/skills/documentation-and-adrs/SKILL.md`
- Regra: "Don't delete old ADRs — they preserve historical reasoning"
- Não tocar no fluxo CRUD existente (adição, não substituição)

---

## Fluxos UX por Ator

Backend/agentes/skills — sem UX por ator final. Fluxo do mantenedor:

### Mantenedor (Luiz Felipe)

1. Após Wave 1 mergeada, faz `git pull`.
2. Roda `bun run test && bun run lint` — verde.
3. Em uso real:
   - Ao invocar `/verify-work`, recebe verdict explícito + observação positiva em CADA agente (não silêncio).
   - Ao implementar feature framework-específica, agente automaticamente cita fonte oficial (ou declara `UNVERIFIED:` se não achou).
   - Ao tomar decisão arquitetural, `/grill-me` ou `/design-twice` pode escalar para `/doubt-driven-development` para ataque adversarial.
   - Ao escrever commit message ruim, hook ou skill sugere refinamento conforme `git-workflow-and-versioning`.
   - Ao invocar `/decision-registry`, vê seção pedagógica que ensina *quando* antes de oferecer CRUD.

---

## Requisitos Funcionais

### Must Have (máximo 40% — 6 de 14 funcionais)

- [ ] **MH-01:** Cada um dos 13 agentes em [agents/](agents/) tem seções `## Output Contract (additions)`, `## Anti-Degeneration Rules` e `## Composition` adicionadas conforme padrão definido em Mecanismo Item 1.
- [ ] **MH-02:** Cada agente emite `payload.positive_observations: string[]` com ≥1 item satisfazendo 4 testes anti-genérico (cita arquivo, não-tautológico, verificável, não-banal — ver CA-02).
- [ ] **MH-03:** Cada agente emite `payload.verdict` ∈ `{"approve", "request_changes", "block"}`.
- [ ] **MH-04:** Cada um dos 13 agentes tem ≥2 anti-degen GENÉRICAS + ≥2 ESPECÍFICAS do domínio (total ≥52 regras catalogadas — ver CA-10).
- [ ] **MH-05:** Skill `source-driven-development` existe em `skills/source-driven-development/SKILL.md` com SKILL.md completo (frontmatter + telemetria + corpo + verification).
- [ ] **MH-06:** Skill `doubt-driven-development` existe em `skills/doubt-driven-development/SKILL.md` com SKILL.md completo.

### Should Have

- [ ] **SH-01:** Skill `git-workflow-and-versioning` existe em `skills/git-workflow-and-versioning/SKILL.md`.
- [ ] **SH-02:** [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md) tem seção `## When to Write an ADR` ANTES do fluxo CRUD existente, com tabela Common Rationalizations.
- [ ] **SH-03:** Issues `severity: critical|high` em qualquer agente incluem campos `exploitation_scenario`, `impact`, `fix_with_example`.
- [ ] **SH-04:** Severity mapping (`Severity → SLA Action`) documentado nos 13 agentes (decisão do dev — CA-10 estendido). Para agentes não-críticos onde severidade é menos central (ex: `documentation-writer`, `plan-executor`), o mapping é simplificado mas presente.
- [ ] **SH-05:** 3 skills novas (`source-driven`, `doubt-driven`, `git-workflow`) listadas em `.claude-plugin/plugin.json` e `plugin-manifest.json` com checksums SHA-256 regenerados.

### Could Have

- [ ] **CH-01:** ~~Anti-degeneration rules específicas~~ → Promovido para **MH-04** (decisão CA-10).
- [ ] **CH-02:** Cross-references entre skills novas e existentes documentadas no topo do SKILL.md de cada nova skill.
- [ ] **CH-03:** Skill `source-driven-development` cita pelo menos 1 reference em `docs/references/` (criada na Wave 1) como exemplo de fonte canônica.
- [ ] **CH-04:** Skill `doubt-driven-development` documenta integração cross-model (Gemini/Codex) com snippet de shell-escape seguro.
- [ ] **CH-05:** Migration guide do bump 1.0 → 2.0.0 inclui exemplo de código antes/depois para parser TypeScript.

### Won't Have (desta Wave)

- ❌ **Tier-2 multi-IDE** (Cursor/Windsurf/Copilot) → Adiado indefinidamente (decisão D-1 ANALYSIS §7)
- ❌ **Refactor tdd-workflow com Test Sizes/DAMP/test-doubles** → Wave 3
- ❌ **Refactor anti-vibe-review com severity prefixes/Change Sizing** → Wave 3
- ❌ **Refactor plan-feature com Task Sizing table/Dependency graph ASCII** → Wave 3
- ❌ **Refactor enhance-prompt com Context Hierarchy/Trust Levels/MCP table** → Wave 3
- ❌ **Consolidação `/anti-vibe-review` → `/verify-work`** → Wave 3
- ❌ **Modo `prove-it` no tdd-verifier** → Wave 3
- ❌ **Pipeline compound→reference→core-belief** → Wave 3
- ❌ **References operacionais profundas** (init-step-contract, hooks-checklist, tdd-cycle-checklist) → Wave 3 (Wave 1 só fez seeds externos OWASP/WCAG/testing)
- ❌ **Persona "synthesizer"** que agrega N JSONs em narrativa → Wave 3 (talvez)
- ❌ **Common Rationalizations em mais skills** além das 5 da Wave 1 → reavaliar pós-Wave 2

---

## Requisitos Não-Funcionais

- **Performance:** Refinamento de agentes não pode regredir tempo de invocação. Verificar via telemetria existente (baseline pré-Wave 2 vs pós).
- **Backward compatibility:** Contract JSON existente continua válido — adições só estendem schema. Callers (ex: `verify-work`) podem ignorar campos novos sem quebrar.
- **Segurança:** Novos campos em payload não expõem informação sensível. `exploitation_scenario` é descritivo, não código executável.
- **Acessibilidade:** N/A.
- **Observabilidade:** Telemetria das 3 skills novas usa padrão `writeTelemetryStart`/`writeTelemetryEnd` igual às existentes.
- **Idempotência:** Re-rodar refinamento de agentes não duplica seções (script de aplicação detecta marcadores ou usa Edit cirúrgico).
- **Validação:** `bun run harness:validate` deve passar após cada item entregue.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Como aplicar 5 patterns em 13 agentes | Subagente paralelo: 1 subagente edita 3-4 agentes por wave de paralelização | Edição manual sequencial OU 1 subagente para todos | Sequencial = 13 ciclos lentos. 1 subagente = degradação de contexto. 4 subagentes em paralelo balanceia velocidade vs qualidade. CLAUDE.md global "Sub-Agentes em Paralelo" confirma 5-8 arquivos por agente |
| 2 | Manter ou alterar `contract_version` do JSON | Bumpar para `"2.0.0"` (semver **MAJOR**) | Manter `"1.0"` OU bump minor `"1.1.0"` | **Decisão do dev (CA-09):** mesmo sendo adições, `positive_observations` e `verdict` são **obrigatórios** — caller que valida exato `"1.0"` precisa adaptar parser. Marcar major sinaliza isso claramente. Inclui migration guide no changelog |
| 3 | Onde colocar tabela severity→SLA | Inline em cada agente (5 críticos) + ref em `docs/references/` | Só em `docs/references/severity-sla.md` (DRY) | Inline = agente self-contained, fresh-context reviewer entende sem chase de link. Ref evita duplicação para futuras manutenções |
| 4 | Migração documentation-and-adrs: substituir ou adicionar | Adicionar seção ANTES do CRUD existente, não substituir | Substituir fluxo CRUD pelo pedagógico | Manter automação (adr-writer.ts auto-numera, profile-aware preface) — adicionar pedagogia ao invés de trocar |
| 5 | Cross-model escalation (DDD) | Documentar pattern + guardrails, não implementar invocação | Implementar invocação via shell wrapper | Invocação direta requer setup multi-CLI por usuário. Documentação permite uso opcional sem ser bloqueante |
| 6 | Conventional commits: enforcement | Skill ensina + commit-msg hook opcional documentado | Hook obrigatório bloqueando commits não-conformes | Coerção excessiva sobre git workflow gera atrito. Educar primeiro, automatizar depois (Wave 3 se ROI confirmar) |
| 7 | `positive_observations` obrigatório em domain_status:"clean" | Sim, ≥1 item mesmo quando nada problemático | Permitir array vazio quando clean | Combate viés acusatório (ANALYSIS §3). "Tudo limpo" sem explicar O QUE está limpo = silêncio inútil |

---

## Critérios de Aceite

- [ ] **CA-01 (Agente refinado):** Dado qualquer agente em [agents/*.md](agents/), quando inspecionado, então contém seções `## Output Contract (additions)`, `## Anti-Degeneration Rules` e `## Composition` no formato definido em Mecanismo Item 1.
- [ ] **CA-02 (Positive obs obrigatório + anti-genérico):** Dado qualquer agente invocado (clean OU com issues), quando retorna payload, então `payload.positive_observations.length >= 1` e cada item satisfaz TODOS os 4 testes anti-genérico abaixo:
  1. **Cita arquivo específico ou padrão concreto** — ex: ✅ "src/auth/middleware.ts usa bcrypt com saltRounds=12" / ❌ "código de auth está bom"
  2. **Não é tautologia do `domain_status`** — proibido literal ou variante de "no issues found", "everything looks fine", "código limpo", "tudo certo"
  3. **Verificável por terceiro** — leitor independente consegue confirmar olhando no código
  4. **Não-banal** — não cita ausência de coisa óbvia (ex: ❌ "não usa eval()" só vale se contexto exigisse atenção; ✅ "não usa eval() mesmo recebendo JSON do usuário")

  Validação automatizada: regex de blacklist no schema validator (palavras: "no issues", "looks fine", "everything is", "tudo certo", "limpo", "ok") + exigência de regex `(\.(ts|tsx|js|jsx|py|go|rs|java|sql):\d+)` OU citação de função/classe identificável no texto.
- [ ] **CA-03 (Verdict canônico):** Dado qualquer agente invocado, quando retorna payload, então `payload.verdict` ∈ `{"approve", "request_changes", "block"}` e a escolha é justificada no `payload.reasoning`.
- [ ] **CA-04 (Triad PoC/Impact/Fix):** Dado um issue com `severity ∈ {"critical", "high"}` em qualquer agente, quando inspecionado, então contém `exploitation_scenario`, `impact` e `fix_with_example` não-vazios. *(decisão do dev — manter critical+high apenas; medium não inclui triad para evitar overhead desnecessário)*
- [ ] **CA-05 (Skill `source-driven` válida):** Dado o repo, quando rodar `bun run harness:validate`, então `skills/source-driven-development/SKILL.md` passa todas as validações (frontmatter, telemetria, manifest, sections obrigatórias).
- [ ] **CA-06 (Skill `doubt-driven` válida):** Mesmo critério de CA-05 para `skills/doubt-driven-development/SKILL.md`.
- [ ] **CA-07 (Skill `git-workflow` válida):** Mesmo critério para `skills/git-workflow-and-versioning/SKILL.md`.
- [ ] **CA-08 (decision-registry pedagogia):** Dado [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md), quando aberto, então contém seção `## When to Write an ADR` posicionada ANTES da primeira menção ao fluxo `add`/`list`/`query`, com tabela de gatilhos e tabela Common Rationalizations.
- [ ] **CA-09 (Contract version bump — MAJOR):** Dado o schema JSON dos agentes, quando inspecionado, então `contract_version: "2.0.0"` (semver MAJOR — decisão do dev) e existe entry no changelog mencionando: campos novos obrigatórios (`positive_observations`, `verdict`), campos opcionais (`exploitation_scenario`, `impact`, `fix_with_example`, `severity_action_map`), e nota de migração para callers que validavam `"1.0"` literal. Migration guide explica como adaptar parsers.
- [ ] **CA-10 (Anti-degeneration genérica + específica EM TODOS OS 13 AGENTES):** Dado QUALQUER um dos 13 agentes em [agents/](agents/), quando inspecionado, então tem ≥2 regras anti-degeneração GENÉRICAS (universais: `@ts-ignore`, `eslint-disable`, `test.skip`, desabilitar validador/gate/hook) + ≥2 ESPECÍFICAS do domínio do agente. Exemplos por domínio:
  - `security-auditor`: "Never suggest disabling CORS / CSRF / auth middleware as a fix"
  - `react-auditor`: "Never suggest removing dependency array; never suggest useEffect for data fetching"
  - `api-auditor`: "Never suggest GET with side effects; never suggest skipping idempotency key"
  - `database-analyzer`: "Never suggest SELECT * in production code; never suggest disabling FK constraint"
  - `tdd-verifier`: "Never accept test.skip with TODO; never accept test sem assertion real"
  - `code-smell-detector`: "Never suggest `// eslint-disable` over fixing the smell; never suggest `any` over typing"
  - `solid-auditor`: "Never suggest violating SRP with `if (env === 'test')` branches"
  - `infrastructure-auditor`: "Never suggest hardcoding secrets em prod; never suggest `chmod 777`"
  - `design-explorer`, `documentation-writer`, `lesson-evaluator`, `plan-executor`, `plan-verifier`: regras específicas a definir conforme escopo do agente

  **Total esperado:** 13 agentes × ≥4 regras (2 gen + 2 spec) = ≥52 regras anti-degen no plugin.
- [ ] **CA-11 (edge case — refactor não quebra callers):** Dado [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md) ou qualquer skill que consome agentes, quando invocada após Wave 2, então continua funcionando sem mudança de código (compatibilidade backward por adição-only).
- [ ] **CA-12 (edge case — agente sem issues retorna positive):** Dado um agente que detecta 0 issues, quando retorna payload, então `verdict: "approve"`, `issues: []`, `positive_observations.length >= 1` — nunca silêncio.

---

## Out of Scope

- **Refatorações deeper de SKILL.md das 5 skills críticas** (tdd-workflow, anti-vibe-review, plan-feature, grill-me, execute-plan) — Wave 3
- **Consolidação `/anti-vibe-review` → `/verify-work`** com deprecation path — Wave 3
- **Modo `prove-it` no tdd-verifier** — Wave 3
- **Pipeline compound→reference→core-belief** (com critério "3+ compound notes → vira reference") — Wave 3
- **References operacionais profundas** extraídas de compound notes maduras — Wave 3
- **Persona "synthesizer"** que agrega 13 JSONs em narrativa merge/no-merge — Wave 3 (decisão pendente)
- **Implementação da invocação cross-model** (Gemini/Codex via shell wrapper) — Wave 4+ ou backlog
- **Commit-msg hook** bloqueando commits não-conformes — Wave 3+ se ROI confirmar
- **Tier-2 multi-IDE** — adiado indefinidamente
- **Refactor enhance-prompt com MCP table** — Wave 3 ou skill nova de context-engineering

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Wave anterior | PRD-WAVE-1 mergeado (5 skills críticas com Common Rationalizations, `docs/references/` bootstrapado, GH Actions install validation) | Aprovado, não-mergeado ainda |
| Arquivo fonte | `Infos/agent-skills-main/skills/source-driven-development/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/skills/doubt-driven-development/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/skills/git-workflow-and-versioning/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/skills/documentation-and-adrs/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/agents/{code-reviewer,security-auditor,test-engineer}.md` (padrões a portar) | Disponível |
| Arquivo destino | 13 arquivos em [agents/](agents/) | No projeto |
| Arquivo destino | [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md) | No projeto |
| Schema | JSON contract dos agentes (versão atual `"1.0"`) | Documentado em algum lugar — localizar ou criar |
| Script existente | `scripts/generate-manifest.js` | No projeto |
| Lib existente | `lib/telemetry-utils` | No projeto |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **R-01** — Refinamento em 13 agentes via subagentes paralelos gerar inconsistências de padrão (cada subagente interpretar template ligeiramente diferente) | Alta | Médio | Definir template canônico VERBATIM antes de spawnar subagentes; subagentes recebem template literal + 2 exemplos já refinados como gold standard; validar todos os 13 com grep batch após conclusão |
| **R-02** — Bump `contract_version` 1.0 → **2.0.0 (MAJOR)** quebrar parsers existentes | Alta | Alto | Audit prévio OBRIGATÓRIO: grep por `contract_version`, `"1.0"`, `positive_observations`, `verdict` em `skills/`, `lib/`, `scripts/`, `agents/`. Mapear TODOS os consumidores. Update simultâneo dos parsers no mesmo PR. Migration guide no changelog. Bumpar MAJOR é sinal honesto — preferível a esconder breaking change em minor |
| **R-03** — `positive_observations` obrigatório virar "obrigação genérica" ("everything is fine") e perder valor | Média | Médio | Anti-degeneration rule específica: agente NUNCA emite `"no issues found"` como positive obs — deve citar O QUE especificamente está bem |
| **R-04** — Skills novas (`source-driven`, `doubt-driven`, `git-workflow`) sobreporem com existentes (consultant, design-twice, iterate) | Média | Médio | Cross-reference explícito no `description:` frontmatter; top do SKILL.md documenta diferenças; matriz de invocação no ANALYSIS update |
| **R-05** — Doubt-driven cross-model escalation introduzir dependência externa não documentada (usuário precisa Gemini/Codex instalado) | Baixa | Médio | Documentar como OPCIONAL desde o início; pattern só requer "convocar reviewer fresh-context" — se cross-model não disponível, mesmo modelo com contexto isolado serve |
| **R-06** — Pedagogia migrada de `documentation-and-adrs` colidir com automação existente em `decision-registry` (template duplicado) | Média | Baixo | Pedagogia precede CRUD, não substitui. CRUD continua autoridade técnica. Pedagogia foca em "quando e por que", CRUD em "como fazer" |
| **R-07** — Aplicação em 13 agentes via subagentes consumir muito token (~50k por agente × 13 = 650k) | Alta | Baixo | Aceitável — 1 vez de custo único. Spawnar em waves de 4-5 para distribuir |
| **R-08** — Anti-degeneration rules virarem "lista vazia de boas intenções" se não vinculadas a teste/hook | Média | Médio | Wave 3 considera hook que grep'a por `@ts-ignore` / `eslint-disable-next-line` em diff e bloqueia. Wave 2 só documenta — enforcement vem depois |
| **R-09** — Skill `git-workflow` colidir com Conventional Commits do CLAUDE.md global (origens diferentes podem divergir) | Baixa | Baixo | Skill usa CLAUDE.md global como fonte de verdade; complementa com técnicas adicionais (atomicidade, PR description) |
| **R-10** — `source-driven-development` introduzir overhead em cada geração de código (custo de buscar doc oficial sempre) | Média | Médio | Skill só ativa para código framework-específico (detecta via stack + nome de import); código de domínio puro não dispara busca |

---

## Lessons Captured (até agora)

- **Decisão registrada (DC-1):** Refinamento em massa de agentes via 4 subagentes paralelos com template canônico verbatim (evita degradação de contexto + inconsistência).
- **Decisão registrada (DC-2):** Contract version bump 1.0 → **2.0.0 (semver MAJOR)** — `positive_observations` e `verdict` são obrigatórios, caller validando string exata precisa adaptar. Migration guide obrigatório.
- **Decisão registrada (DC-4):** Anti-degeneration rules específicas EM TODOS os 13 agentes (não só 5 críticos). Total esperado: ≥52 regras anti-degen catalogadas.
- **Decisão registrada (DC-5):** `positive_observations` reforçado com 4 testes anti-genérico (cita arquivo, não é tautologia, verificável, não-banal) + validação automatizada por regex blacklist no schema validator.
- **Decisão registrada (DC-3):** Pedagogia ADR é ADIÇÃO ao decision-registry, não substituição do CRUD.
- **Princípio reforçado (P-1):** Copy-then-improve continua aplicável às 3 skills novas portadas.
- **Princípio reforçado (P-2):** Adições não-disruptivas (positive obs, verdict, triad PoC) seguem padrão "estender schema, não rebumper version major".

---

## Approval Log

✅ **Aprovado em 2026-05-22** — Luiz Felipe

**CAs aprovados:** CA-01 a CA-12 (12 CAs totais)
- CA-02: reforçado com 4 testes anti-genérico + regex blacklist (dev solicitou melhoria)
- CA-04: Triad PoC/Impact/Fix mantido em `critical|high` apenas — medium excluído deliberadamente (overhead não justificado)
- CA-09: bump para `2.0.0` MAJOR confirmado (campos obrigatórios = breaking change)
- CA-10: anti-degeneration estendido para TODOS os 13 agentes (≥52 regras totais), não só 5 críticos

**Riscos aceitos:** R-01 a R-10
- R-02 promovido para Alta probabilidade + Alto impacto; audit prévio obrigatório antes de bumpar version
- R-07 aceito (custo de token paralelizado — "custo único")

**Decisões consolidadas:** DT-1 a DT-7
**MH promovido:** CH-01 (anti-degen específica) → MH-04 por decisão do dev

---

## Próximo Passo (Pipeline)

Após aprovação deste PRD-WAVE-2:

1. **Implementação requer `/plan-feature`** (5 itens grandes, 13 arquivos editados, 3 skills novas, 1 schema bump). Não cabe em quick-plan inline.
2. `/plan-feature` gera `PLAN.md` + `STATE.md` + `planoNN/` nesta pasta (`docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/`).
3. Sugestão de ordem de execução interna (a definir no plan):
   - Fase 1: Refinar 13 agentes (subagentes paralelos)
   - Fase 2: Portar 3 skills novas (subagentes paralelos)
   - Fase 3: Migrar pedagogia decision-registry (sequencial, requer leitura cuidadosa)
   - Fase 4: Regenerar manifest + validar
4. Ao fechar Wave 2: gerar `PRD-WAVE-3.md` em pasta dedicada `2026-05-22-agent-skills-import-wave3/`.
