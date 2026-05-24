---
title: Agent-Skills Import Analysis
date: 2026-05-22
status: analysis-only
scope: Compare `obra/agent-skills` (Addy) com Anti-Vibe-Coding plugin (skills, agentes, harness, compound)
inputs:
  - F:/Projetos/Anti-Vibe-Coding/Infos/agent-skills-main/ (origem — 22 skills, 3 agentes, 7 commands, 6 IDEs)
  - F:/Projetos/Anti-Vibe-Coding/skills/ (destino — 34 skills)
  - F:/Projetos/Anti-Vibe-Coding/agents/ (destino — 13 subagentes)
  - F:/Projetos/Anti-Vibe-Coding/docs/compound/ (destino — 35+ lições)
  - F:/Projetos/Anti-Vibe-Coding/tmp/andre-skills/harness-engineering/ (Andre Prado port)
method: 4 subagentes paralelos (skills, agentes, harness, compound) + consolidação
---

# Agent-Skills Import Analysis

Análise comparativa entre o plugin open-source **`obra/agent-skills`** (que chamamos de "origem", "Addy") e o **Anti-Vibe-Coding plugin** (nosso destino), focada em decidir **o que portar, o que melhorar, o que ignorar**.

## TL;DR

- **Origem vence em:** consistência estrutural de SKILL.md (Common Rationalizations, Red Flags, Verification), multi-IDE adapters, brevidade focada (220 linhas vs nossas 600+), formato de description orientado a trigger humano.
- **Nós vencemos em:** pipeline opinado (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate), adaptação por perfil arquitetural, progressive disclosure via `references/`, manifest/checksums com merge inteligente em `/init`, enforcement layer via 7 hooks obrigatórios, captura de tribal knowledge via `docs/compound/`.
- **Filosofias ortogonais (Andre + Addy):** Andre nos dá *onde escrever decisões* (scaffold, validators, harness). Addy nos dá *como combater rationalizations* (textual anti-vibe, fan-out paralelo). Já temos o primeiro; falta materializar o segundo.

## Sumário Executivo: Top 10 Ações Priorizadas

| # | Ação | Tipo | Esforço | ROI | Origem do insight |
|---|---|---|---|---|---|
| 1 | Padronizar `## Common Rationalizations` + `## Red Flags` em toda skill nova/refatorada | Pattern | M (mecanizável via subagente paralelo, 35 skills) | Muito alto | Skills/Harness |
| 2 | Portar `source-driven-development` (combate alucinação de API) | Skill nova | M | Alto | Skills |
| 3 | Portar `incremental-implementation` (disciplina 100-linhas-teste-commit) | Skill nova | S | Alto | Skills |
| 4 | Portar `doubt-driven-development` (adversarial review in-flight, cross-model escalation) | Skill nova | M | Alto | Skills |
| 5 | Adicionar GH Actions workflow `test-plugin-install.yml` (3 jobs em série) | Infra | S (30min) | Alto | Harness |
| 6 | Tier-2 multi-IDE: gerar `.cursor/rules/*.md` para skills de domínio puro | Infra | S (1 dia) | Médio | Harness |
| 7 | Criar `docs/references/` com 3-5 checklists operacionais (init-step-contract, hooks-checklist, tdd-cycle-checklist) | Compound | M | Médio | Compound |
| 8 | Adotar **5 patterns de prompt-engineering** nos agentes (Positive Observations, Severity→SLA, Triad PoC/Impact/Fix, Anti-degeneration rules, Composition block) | Agentes | M | Alto | Agentes |
| 9 | Refatorar `grill-me` com `Hypothesis + Confidence%` antes da 1ª pergunta + `GUESS:` anexado | Skill (melhoria) | S | Alto | Skills |
| 10 | Consolidar `/anti-vibe-review` em `/verify-work` (overlap funcional) | Refactor | S (2h) | Médio | Harness |

**Top 3 a executar primeiro** (combinação ROI alto × esforço baixo-médio):
1. **#5** — GH Actions install validation (30min, garante "o plugin ainda instala")
2. **#3** — Portar `incremental-implementation` (S, complementa tdd-workflow sem sobreposição)
3. **#1** — Common Rationalizations em skills críticas (começar por tdd-workflow, security, plan-feature)

---

## 1. Inventário Comparado

### 1.1 Skills (22 origem vs 34 nossas)

| Origem | Nossa equivalente | Sobreposição |
|---|---|---|
| api-and-interface-design | api-design | partial |
| browser-testing-with-devtools | qa-visual | partial |
| ci-cd-and-automation | infrastructure (parcial) | partial |
| code-review-and-quality | anti-vibe-review + verify-work | partial |
| **code-simplification** | — | **none (lacuna)** |
| context-engineering | enhance-prompt (parcial) | partial |
| debugging-and-error-recovery | incident-response | partial |
| **deprecation-and-migration** | — | **none (lacuna)** |
| documentation-and-adrs | decision-registry | partial |
| doubt-driven-development | design-twice (parcial) | partial |
| frontend-ui-engineering | react-patterns + qa-visual | partial |
| **git-workflow-and-versioning** | — | **none (lacuna)** |
| idea-refine | design-twice (parcial) | partial |
| incremental-implementation | tdd-workflow (parcial) | partial |
| interview-me | grill-me | full |
| **performance-optimization** | — | **none (lacuna)** |
| planning-and-task-breakdown | plan-feature / quick-plan | full |
| security-and-hardening | security | full |
| **shipping-and-launch** | — | **none (lacuna)** |
| **source-driven-development** | — | **none (lacuna crítica)** |
| spec-driven-development | write-prd | partial |
| test-driven-development | tdd-workflow | full |
| using-agent-skills | (meta) | partial |

**Skills nossas únicas** (sem equivalente na origem): init, sync, update, learn, detect-architecture, centralize-config, design-twice, parity-audit, pair-programming-with-agent, incident-response, iterate, todo-pick, defensive-patterns, consultant.

### 1.2 Agentes (3 origem vs 13 nossos)

| Origem | Nossos correspondentes | Diferença |
|---|---|---|
| code-reviewer | solid-auditor + code-smell-detector + api-auditor + react-auditor + database-analyzer | Generalista vs especializado |
| security-auditor | security-auditor | Mesmo nome, abordagens diferentes (markdown narrativo vs JSON envelope) |
| test-engineer | tdd-verifier (parcial) | Origem é writer/designer; nosso é verifier read-only — **gap**: ninguém escreve test-de-bug-prove-it |

### 1.3 Knowledge System

| Aspecto | Origem (`references/`) | Nosso (`docs/compound/`) |
|---|---|---|
| Tipo | Checklist proativo | Lição reativa pós-incidente |
| Origem | Consenso senior (OWASP, WCAG) | Bug real deste repo |
| Granularidade | 5 arquivos longos por domínio | 35+ arquivos curtos por incidente |
| Universalidade | Stack-agnóstico | Local/situacional |
| Decay | Lento (anos) | Rápido (vira trivial quando código sai) |

---

## 2. Análise: Skills

> **Subagente 1** — leitura empírica de 10+ SKILL.md de cada lado.

### 2.1 Top 5 Skills a Portar (origem → nós)

#### 2.1.1 `source-driven-development` (Esforço: M, ROI: alto)
Força o agente a citar fontes oficiais (`react.dev`, `docs.djangoproject.com`) toda vez que escreve código framework-específico. Hierarquia clara (docs oficiais > changelog > MDN; Stack Overflow nunca como primária). Pattern UNVERIFIED: sinalizar explicitamente quando não achou doc.

**Por que faz falta:** Anti-Vibe combate alucinação via TDD, mas não tem mecanismo explícito contra "API deprecada que parece atual" — o vetor mais frequente quando o modelo gera código de React/Next 14 vs 15, Rails 7 vs 8.

**Conflito:** parcial com `consultant`. Pode virar skill irmã.

#### 2.1.2 `incremental-implementation` (Esforço: S, ROI: alto)
Disciplina "100 linhas, teste, commit, repete" codificada. Rule 0 (Simplicity First), Rule 0.5 (Scope Discipline), Rule 3 (Feature flags), Rule 5 (Rollback-Friendly). Seção "NOTICED BUT NOT TOUCHING" — padrão ouro contra scope creep da IA.

**Por que portar:** [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md) cobre RED/GREEN mas dilui vertical slices em 600 linhas. Skill curta focada em "como implementar incrementalmente" é diferente o suficiente para não sobrepor.

#### 2.1.3 `git-workflow-and-versioning` (Esforço: S, ROI: médio)
Trunk-based, commits atômicos, conventional commit messages, PR description como contrato histórico. "Fix bug" como antipadrão explícito.

**Por que faz falta:** CLAUDE.md global menciona conventional commits, mas sem disciplina codificada como skill descobrível.

#### 2.1.4 `code-simplification` (Esforço: S, ROI: médio)
5 princípios: Preserve Behavior, Follow Conventions, Reduce Cognitive Load, Eliminate Duplication, Remove Dead Code. "Fewer lines is NOT the goal — clarity is".

**Por que portar:** [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md) detecta complexidade mas não tem playbook de remediação. Complementa: anti-vibe-review *detecta*, code-simplification *age*.

#### 2.1.5 `doubt-driven-development` (Esforço: M, ROI: alto)
Posture in-flight: cada decisão não-trivial passa por reviewer fresh-context ADVERSARIAL ("find what is wrong" — não "is this good"). Sequência CLAIM → EXTRACT → DOUBT → RECONCILE → STOP com classificação precedencial (contract misread / actionable / trade-off / noise). Cross-model escalation (Gemini/Codex) com salvaguardas de shell escaping. 3 ciclos máximo antes de escalar pro humano.

**Por que faz falta:** [skills/design-twice/SKILL.md](skills/design-twice/SKILL.md) gera múltiplas propostas mas não tem loop adversarial dentro de uma escolha. [skills/verify-work/SKILL.md](skills/verify-work/SKILL.md) tem auditores paralelos mas é pós-implementação.

### 2.2 Top 5 Skills Nossas a Melhorar

#### 2.2.1 [skills/grill-me/SKILL.md](skills/grill-me/SKILL.md) ← `interview-me`
- **Hipótese + confidence% antes da 1ª pergunta** ("CONFIDENCE: ~30% — missing: who, why, success"). Honestidade quantificável.
- **GUESS anexado a cada pergunta** — usuário reage 3× mais rápido a chute errado que pergunta aberta.
- **Want vs should-want detection:** quando user fala "scalable / modern / clean", disparar *"se não tivesse que justificar isso pra ninguém, o que você realmente quer?"*
- **95% confidence stop condition** — "consigo prever a reação do user às próximas 3 perguntas?"

#### 2.2.2 [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md) ← `test-driven-development` + `incremental-implementation`
- Tabela de **Test Sizes** (Small/Medium/Large por recursos consumidos).
- **Beyoncé Rule:** "if you liked it, you should have put a test on it".
- **DAMP > DRY em testes** (Descriptive And Meaningful Phrases). Nossa skill nem cita.
- Tabela de **preference order de test doubles** (real > fake > stub > mock).

**Ação:** extrair `references/test-doubles.md` e `references/test-sizes.md` para tirar peso do SKILL.md atual (320+ linhas).

#### 2.2.3 [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md) ← `code-review-and-quality`
- **Severity prefixes em comentários** (Critical: / Nit: / Optional: / FYI).
- **Approval Standard:** "Approve a change when it definitely improves overall code health, even if it isn't perfect".
- **Change Sizing table** (100/300/1000 linhas) com splitting strategies.
- **"I'll clean it up later" como red flag explícito**.

#### 2.2.4 [skills/plan-feature/SKILL.md](skills/plan-feature/SKILL.md) ← `planning-and-task-breakdown`
- Tabela **Task Sizing XS/S/M/L/XL** com gatilhos concretos para quebra ("usei 'and' no título = são duas tasks").
- **Dependency graph ASCII** como artefato obrigatório.
- **Checkpoints explícitos entre N tasks**.
- Plus: nossa skill tem 850 linhas em 11 Steps; a origem entrega 80% em 220 linhas. Reduzir verbosidade.

#### 2.2.5 [skills/enhance-prompt/SKILL.md](skills/enhance-prompt/SKILL.md) ← `context-engineering`
- **Pyramid de Context Hierarchy** (Rules Files > Specs > Source > Errors > History).
- **Trust levels** (Trusted / Verify before acting / Untrusted).
- **MCP integrations tabela** (Context7 / Chrome DevTools / Postgres) — falta total na nossa coleção.

### 2.3 Patterns Estruturais Aprendidos

#### P1 — Frontmatter `description` orientado a TRIGGER, não a CAPABILITY
**Origem:**
```yaml
description: Drives development with tests. Use when implementing any logic, fixing any bug, or changing any behavior.
```
**Nós:**
```yaml
description: "This skill should be used when the user asks about 'SOLID principles', 'monolith vs microservices', ..."
```
Nossa abordagem lista keywords (`'SOLID', 'CQRS', 'ADR'`) — funciona para invocação por slash mas fica deselegante. A origem usa frases curtas verbo-iniciadas, mais legíveis para o próprio LLM no momento da decisão de invocação.

**Ação:** padronizar como `[Verb-led action]. Use when X, Y, Z.` mantendo keywords só onde são trigger real.

#### P2 — Tabela "Common Rationalizations" como seção canônica
```
| Rationalization | Reality |
|---|---|
| "I'll write tests after the code works" | You won't. And tests written after the fact test implementation, not behavior. |
```
Defesa ANTI-VIBE explícita — antecipa cada desculpa do modelo. Só tdd-workflow e incident-response têm equivalente. **Padronizar como obrigatória em toda skill nova.**

#### P3 — Seção `## Red Flags` curta no fim
Bullet list de 6-10 sinais negativos. Origem usa universalmente. Nossas skills têm seções parecidas mas terminologia inconsistente ("antipadrões", "Regras Invioláveis").

#### P4 — Verification checklist no final (`- [ ]`)
Cada skill termina com self-audit. Algumas nossas têm; inconsistente.

#### P5 — Progressive disclosure subutilizado na origem
Só `idea-refine` da origem tem múltiplos arquivos. Nossas skills usam `references/` mais agressivamente. **Aqui nós estamos melhores — ponto forte a destacar.**

### 2.4 Skills Nossas Únicas (Diferencial Competitivo)

`init`, `sync`, `update`, `learn`, `detect-architecture`, `centralize-config`, `design-twice` (com subagentes paralelos), `parity-audit`, `pair-programming-with-agent`, `incident-response`, `iterate`. Nosso plugin tem pipeline opinado; origem é buffet de boas práticas sem fluxo prescritivo. **Filosofias diferentes, não concorrentes.**

### 2.5 Anti-Padrões na Origem (NÃO copiar)

- **`using-agent-skills` como meta-skill** — índice-em-skill com decision tree ASCII. Em Claude Code real, esse papel já é feito por frontmatter+autoload. Mantê-lo é redundância que envelhece (a árvore menciona skills só descobríveis lendo o arquivo). Nossa abordagem (CLAUDE.md + AGENTS_LIST.md) é mais limpa.
- **Single-file balofo** — `code-review-and-quality` (350L), `interview-me` (225L) em single SKILL.md sem progressive disclosure. Desperdiça contexto.
- **Sobreposição interna não reconciliada** — `idea-refine` + `interview-me` + `doubt-driven-development` + `spec-driven-development` cobrem partes do mesmo problema (clarificar intenção). Nosso pipeline é mais coeso.
- **Telemetria/wire-up vs pureza** — nossas skills têm blocos TypeScript no início (~50L de preface). Trade-off real: ganhamos observabilidade, perdemos legibilidade. Considerar mover para `lib/preface.ts` importável via diretiva curta (`<!-- preface: stack-aware -->`).

---

## 3. Análise: Agentes

> **Subagente 2** — comparação lado a lado dos 3 pares principais.

### 3.1 `code-reviewer` (origem) vs nosso ecossistema multi-agente

| Dimensão | code-reviewer (origem) | Equivalente nosso |
|---|---|---|
| Frontmatter | `name`, `description` (2 campos) | `name`, `kind`, `description`, `model`, `tools` (5) |
| Escopo | 5 eixos numa única persona | Distribuído entre [agents/solid-auditor.md](agents/solid-auditor.md), [agents/code-smell-detector.md](agents/code-smell-detector.md), [agents/security-auditor.md](agents/security-auditor.md), [agents/api-auditor.md](agents/api-auditor.md), [agents/react-auditor.md](agents/react-auditor.md), [agents/tdd-verifier.md](agents/tdd-verifier.md), [agents/database-analyzer.md](agents/database-analyzer.md) |
| Tools | Não restritas | Explicitamente `Read, Grep, Glob` (read-only enforced) |
| Output | Markdown estruturado (APPROVE/REQUEST CHANGES + Critical/Important/Suggestion + "What's Done Well") | JSON envelope versionado (`contract_version: "1.0"`) + `payload.issues[]` |

**Origem faz melhor:**
1. **Veredito binário explícito** — `APPROVE | REQUEST CHANGES` no topo. Nossos JSONs têm `domain_status` mas nenhum agente emite veredito merge/no-merge canônico — o caller infere.
2. **"What's Done Well" obrigatório** — combate viés acusatório. Nossos prompts são unilateralmente adversariais.
3. **"Verification Story"** narrativa — declara se rodou testes/build/security check. Nosso só checklist técnico.

**Nós fazemos melhor:** profundidade verificável (greps específicos), JSON validável programaticamente, restrição de tools explícita.

### 3.2 `security-auditor` vs [agents/security-auditor.md](agents/security-auditor.md)

**Origem faz melhor:**
- **Triad PoC/Impact/Recommendation por finding** — nosso schema só pede `description`. Para CRITICAL "MD5 usado para hash de senha", a origem exige caminho de exploração + código de exemplo da correção.
- **Severidade vinculada a SLA**: `Critical → Fix immediately, block release` / `High → Fix in current sprint`. Nossos níveis são puramente descritivos.
- **Regra anti-burrice**: `"Never suggest disabling security controls as a fix"`. Vale ouro — IAs adoram sugerir `// eslint-disable-next-line` como "fix".

**Nós fazemos melhor:**
- Cobertura específica de stack moderna (JWT sem `expiresIn`, `localStorage.setItem` perto de `refreshToken`, `response_type=token`, CSRF/SameSite, CORS wildcards).
- Output validável programaticamente.
- Restrição de tools no frontmatter.

### 3.3 `test-engineer` (origem) vs [agents/tdd-verifier.md](agents/tdd-verifier.md)

| Dimensão | Origem | Nosso |
|---|---|---|
| Foco | **Designer**: escreve, analisa cobertura, propõe estratégia | **Verificador**: audita compliance TDD existente (read-only) |
| Tools | Write | `Read, Grep, Glob, Bash` (read-only) |
| Padrão chave | **Prove-It Pattern** — escreve teste que FALHA, depois fixe | test.skip detection, banned phrases |
| Scenarios checklist | Tabela explícita (happy/empty/boundary/error/concurrency) | Sem tabela equivalente |

**Gap real:** nossos 13 agentes **não têm test-writer**. `tdd-verifier` só audita. Não existe persona "QA Engineer designe-me uma suíte de testes para este módulo já existente sem cobertura".

### 3.4 Filosofia: Generalista vs Especializado

| Origem (3 generalistas) | Nosso (13 especialistas) |
|---|---|
| Composição via `/ship` (fan-out paralelo) | Composição via `verify-work` skill |
| Constraint: "Personas do not invoke other personas" | Mesma constraint (plataforma) |
| Menos overhead cognitivo | JSON contract permite agregação programática |
| Sem gaps entre auditores | Per-agent model profile (cost optimization) |
| 80 linhas/5 dimensões = profundidade rasa | Especialização força profundidade |
| Narrativa coerente p/ humano | Output JSON p/ máquina |

**Veredito**: as duas abordagens resolvem problemas diferentes. **Origem otimizada para review humano com 1 persona; nossa otimizada para automação multi-agente com agregação.** Colapsar em 3 agentes perderia ~70% das verificações específicas de stack. **Não criar meta-reviewer** — origem explicitamente proíbe ("Pure routing layer with no domain value... 2× token cost").

### 3.5 Patterns de Prompt Engineering a Portar

- **P1** — "What's Done Well" obrigatório (campo `payload.positive_observations: string[]`, ≥1 item)
- **P2** — Severity → SLA action mapping (não só adjetivo)
- **P3** — Triad PoC/Impact/Recommendation para severity critical|high (sub-campos `{exploitation_scenario, impact, fix_with_example}`)
- **P4** — Anti-degeneration rules no fim do prompt (`"Never suggest @ts-ignore, eslint-disable, test.skip as fixes"`)
- **P5** — Composition block ao final (`Invoke directly when / Invoke via / Do not invoke from another persona`)

### 3.6 Refinamentos Concretos por Agente Nosso

1. **[agents/security-auditor.md](agents/security-auditor.md)** — adicionar `payload.exploitation_scenario` e `payload.fix_example` para critical/high. Mapear severity → SLA. Regra `"Never suggest disabling validators or auth middleware as a fix"`.
2. **[agents/tdd-verifier.md](agents/tdd-verifier.md)** — incorporar **Prove-It Pattern** como modo opcional (`mode: "prove-it"` → escreve teste que falha + retorna `payload.test_status: "red_confirmed"`). Tabela de scenarios obrigatórios.
3. **[agents/code-smell-detector.md](agents/code-smell-detector.md)** — portar "Positive Observations". Hoje retorna `{status: clean, issues: []}` — silêncio. Deveria retornar observação positiva específica.
4. **[agents/api-auditor.md](agents/api-auditor.md)** — adicionar `verdict: "ship | block"` explícito no payload. Hoje `domain_status: "issues_found"` é ambíguo.
5. **[agents/plan-verifier.md](agents/plan-verifier.md)** — adicionar "Verification Story" narrativa estilo code-reviewer. Hoje `detail` é string solta por check.

### 3.7 Decisão Final: Agentes

**Manter os 13 especialistas + adotar 5 patterns da origem + considerar 14º agente "Prove-It test-writer" (ou modo opcional no tdd-verifier).**

Considerar persona **synthesizer** (não router) que recebe 13 JSONs e produz markdown narrativo "merge/no-merge + 3 razões". Diferente de meta-reviewer porque não decide *qual* persona chamar — recebe outputs já produzidos. É o "merge phase" que a origem mantém no main agent.

---

## 4. Análise: Harness / Infraestrutura

> **Subagente 3** — multi-IDE, slash commands, hooks, packaging, CI, Andre port.

### 4.1 Multi-IDE Support

A origem é deliberadamente **tool-agnóstica**:

| IDE | Local | Formato |
|---|---|---|
| Claude Code | `.claude/commands/*.md` + `.claude-plugin/plugin.json` | Markdown + frontmatter |
| Gemini CLI | `.gemini/commands/*.toml` + `gemini skills install` | TOML |
| OpenCode | `AGENTS.md` no root + skill tool nativo | Skill-driven |
| Cursor | `.cursor/rules/*.md` ou `.cursorrules` | Paste do SKILL.md |
| Windsurf | `.windsurfrules` | Paste do SKILL.md |
| Copilot | `.github/skills/<name>/SKILL.md` + `.github/agents/*.md` | Múltiplos modos |
| Kiro | `.kiro/skills/` + `AGENTS.md` | Nativo |

**Estratégia central:** SKILL.md como ponto de convergência (Markdown puro + frontmatter mínimo). Comandos por IDE são wrappers de 5-15 linhas. Sincronização à mão (não há gerador).

**Nós:** 100% Claude Code. Hooks usam APIs específicas (`CLAUDE_HOOK_INPUT`, `CLAUDE_TOOL_INPUT`, exit 2) — sem equivalente em outras IDEs.

**Recomendação — degradação graceful:**
- **Tier-1 (Claude Code):** todos os hooks + manifest + checksums
- **Tier-2 (Cursor, Windsurf, Copilot):** só skills+rules estáticos via gerador `scripts/generate-multi-ide.ts`. Sem coerção. Documentar como versão reduzida.
- **Não vale tier-2 para:** `init`/`sync`/`update` (dependem de checksum + manifest)

### 4.2 Slash Commands

| Origem (7) | Nosso (18) | Sobreposição |
|---|---|---|
| `/spec` | `/write-prd` | Nosso mais granular (MoSCoW, SLOs) |
| `/plan` | `/plan-feature` + `/quick-plan` | Dois níveis de detalhe |
| `/build` | `/execute-plan` + `/tdd-workflow` | Nosso é wave-based com subagentes |
| `/test` | `/tdd-workflow` | Equivalentes |
| `/review` | `/verify-work` + `/anti-vibe-review` | Verify-work é parallel fan-out |
| `/code-simplify` | — | **Lacuna nossa** |
| `/ship` | `/verify-work` | Ambos parallel + merge |

**Padrão origem:** comando ultra-fino (5-15L) que invoca skill. Toda lógica no SKILL.md.

**Padrão nosso:** comando quase invisível (~6L). Mais limpo arquiteturalmente mas perde chance de injetar contexto situacional.

**Redundância nossa:** `/verify-work`, `/anti-vibe-review`, `/iterate`, `/incident-response`, `/defensive-patterns` têm overlap funcional. Origem força um único entry-point (`/ship`) que fan-out internamente.

### 4.3 Hooks: Filosofias

**Origem:** 2 hooks opcionais (`sdd-cache`, `simplify-ignore`) + 1 SessionStart obrigatório. Filosofia: hooks como recurso opcional, não como spinal cord.

- `sdd-cache` — cacheia `WebFetch` com revalidação `ETag`/`Last-Modified`
- `simplify-ignore` — substitui blocos marcados por placeholders durante `/code-simplify`

**Nosso:** 7 hooks obrigatórios em [hooks/hooks.json](hooks/hooks.json):
- version-check, tdd-gate, pre-mutation-gate, prompt-guard, pre-tool-use-destructive-guard, grepping-names, state-md-hook, sync-agents-to-claude, file-size-guard, context-monitor, stop-reflector

**É proporcional?**
- *Perfeccionista:* hook é o que separa "metodologia" de "leitura recomendada". TDD-gate sem hook é instrução em prosa que o modelo skipa.
- *Pragmatista:* 7 hooks toda PostToolUse têm custo de latência cumulativo. `node -e "try{require(...)}catch{}"` é frágil (fallback silencioso eat-all-errors).

**Ideia barata para incorporar:** `sdd-cache` (ETag-revalidated WebFetch cache) é genuinamente útil e independente. Pode ser portado sem mexer no resto.

### 4.4 Plugin Packaging & Versionamento

| Aspecto | Origem | Nosso |
|---|---|---|
| Update strategy | Git pull replaces everything | Per-file: merge/replace/never |
| User customizations | Sobrescrevidas | **Preservadas** via merge inteligente |
| Reprodutibilidade | Tag git | SHA-256 por arquivo |
| Stateful em projeto-alvo | Não | Sim — `.claude/.anti-vibe-manifest.json` |
| Manifest | Não tem | [plugin-manifest.json](plugin-manifest.json) 2462L gerado |

**Nossa abordagem é mais complexa mas resolve problema real** (atualizar plugin que coabita com modificações do usuário). Origem assume zero-customization.

### 4.5 Validação & CI

**Origem:** [.github/workflows/test-plugin-install.yml](Infos/agent-skills-main/.github/workflows/test-plugin-install.yml) — 3 jobs em série:
1. `validate-skills` (`scripts/validate-skills.js` — 220L: frontmatter, descrição ≤1024 chars, seções obrigatórias)
2. `validate` (`claude plugin validate .`)
3. `test-install` (instala e verifica)

**Nosso:** [scripts/harness-validate.ts](scripts/harness-validate.ts) — testa estrutura do *target project* gerada por `/init` (25 required files, link checker, orphan plan detector). **Sem `.github/workflows/`** — toda validação local/manual.

**Diferença filosófica:** Origem usa CI como source of authority. Nós validamos saúde semântica do projeto-alvo.

**Vantagem deles:** cada PR público sabe que plugin instala.
**Vantagem nossa:** validamos saúde semântica do scaffold, não só sintaxe.

**Recomendação:** portar `test-plugin-install.yml` é barato e útil (30min). `claude plugin validate .` deveria rodar em PRs nossos também.

### 4.6 Andre Port (harness-engineering)

Template em [tmp/andre-skills/harness-engineering/](tmp/andre-skills/harness-engineering/) é **standalone**: SKILL.md + scripts + `assets/harness-template/`.

**Complementaridade com agent-skills:**

| Dimensão | Andre (harness) | Addy (agent-skills) |
|---|---|---|
| Artefato | Docs estruturados (PLAN.md, AGENTS.md, ADRs) | Workflows behaviorais (RED-GREEN, fan-out review) |
| Foco | "Onde escrever as decisões" | "Como tomar as decisões" |
| Sinal de saúde | `harness:validate` | `validate-skills.js` |
| Coerção | Pre-mutation gate exige plano | Common Rationalizations table |
| Distribuição | Cópia local do template | Skills referenciadas por nome |

**Nosso plugin já é a união dos dois**, mas pesado no Andre e leve no padrão Addy (rationalizations table esparso).

### 4.7 Recomendações Estruturais (Harness)

1. **Common Rationalizations + Red Flags em todas as skills** (M, ROI muito alto, mecanizável)
2. **Portar workflow `test-plugin-install.yml`** (30min, ROI alto)
3. **Tier-2 multi-IDE para skills de domínio** (1 dia, ROI médio)
4. **Consolidar `/anti-vibe-review` em `/verify-work`** (2h, ROI médio)
5. **Adicionar `/code-simplify`** (4h, ROI médio — lacuna pura)
6. **(Opcional) Portar `sdd-cache` hook** (2h, ROI baixo-médio)

---

## 5. Análise: Compound / References

> **Subagente 4** — captura de conhecimento durável.

### 5.1 Filosofias Opostas

| Dimensão | `references/` (origem) | `docs/compound/` (nosso) |
|---|---|---|
| Origem do conhecimento | Consenso senior (OWASP, WCAG, Core Web Vitals) | Bug real, incidente vivido neste repo |
| Timing | Proativo — *antes* de escrever código | Reativo — *depois* do bug |
| Forma | Checklist com items binários `[ ]`, tabelas anti-padrão | Narrativa Problem/Solution/Prevention com forense |
| Granularidade | 5 arquivos longos (~150-370L) por domínio | 35+ arquivos curtos (~50-100L) por incidente |
| Universalidade | Stack-agnóstico, transferível | Profundamente local |
| Voz | Imperativa, prescritiva | Forense, narrativa |
| Decay | Lento — OWASP muda em anos | Rápido — vira trivial quando código sai |
| Risco | Vira ritual ignorado | Vira cemitério de bugs irrelevantes sem poda |

**Diferença filosófica real:** `references/` é **conhecimento de fora pra dentro**. `docs/compound/` é **conhecimento de dentro pra fora**. Compatíveis, não competem.

### 5.2 Como Cada Sistema é Consumido

**Origem:** hub-and-spoke. Skills declaram no topo *"Use alongside the `frontend-ui-engineering` skill"*. Quando agente entra em `performance-optimization`, 90% de chance de carregar `performance-checklist.md` no contexto.

**Nosso:** compound notes se referenciam entre si, mas **nenhuma skill atual diz "antes de escrever um detector, leia `docs/compound/2026-05-19-anchor-presence-vs-content-match.md`"**. Consulta é ad-hoc. [docs/compound/README.md](docs/compound/README.md) (16L) descreve apenas o esquema YAML.

Há uma terceira via: [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) (153L) funciona como reference proativo, mas cobre 9 domínios em densidade extrema sem detalhamento operacional.

### 5.3 ADRs: `documentation-and-adrs` vs `decision-registry`

**Origem (pedagógica):** ensina *quando* escrever ADR, template Context/Decision/Alternatives/Consequences, lifecycle PROPOSED→ACCEPTED→SUPERSEDED. Texto normativo: "Don't delete old ADRs", tabela Common Rationalizations.

**Nosso ([skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md), operacional):** comandos `add`/`list`/`query`, fluxo v6 detecta layout, `adr-writer.ts` numera automaticamente. Implementação mais sofisticada — temos profile-aware preface, stale capabilities check.

**ADRs reais nossos** (ADR-0001, ADR-0021) têm rigor superior ao template da origem (tabela "Specific Decisions" com 8 linhas, Alternatives + Rejected/Reason, Reversibility em 3 níveis). **O capital tácito existe; falta materializá-lo na skill.**

**Conclusão:** Origem ganha em pedagogia (ensina o ofício). Nós ganhamos em infraestrutura. Os ADRs reais que escrevemos são mais ricos que o template da origem.

### 5.4 Gap Analysis

**Temos compound, faltam references/ proativas?** Sim, parcialmente. `core-beliefs.md` cobre o slot mas:
- Cobre 9 domínios em 153L — cada tópico vira bala em vez de checklist operacional
- Não há equivalente para `accessibility-checklist.md` ou `testing-patterns.md`
- Não há `orchestration-patterns.md` — e nós **temos** orquestração complexa (parity audit, design twice, multi-auditor parallel wave)

**Eles têm references/, faltam compound/ reativas?** Sim, **e essa é a vantagem real do nosso modelo.** Origem não tem mecanismo para capturar "o repo aprendeu isso da maneira difícil". Sem compound notes, lições como `2026-05-18-init-self-protection.md` seriam perdidas.

### 5.5 Proposta de Integração (5 ações)

1. **Criar `docs/references/` com 3-5 checklists operacionais** adaptadas para nossa stack:
   - `references/init-step-contract.md` — checklist para criar/modificar steps no `/init`
   - `references/hooks-checklist.md` — prompt-type vs command-type, stop_hook_active, cap=8, schema `{ok, reason}` (extraído de [docs/compound/2026-05-20-prompt-hook-includes-no-loop.md](docs/compound/2026-05-20-prompt-hook-includes-no-loop.md))
   - `references/tdd-cycle-checklist.md` — RED stub obrigatório, sinal `Cannot find module`, ordem dos commits (extraído de [docs/compound/2026-05-19-tdd-gate-needs-stub-first.md](docs/compound/2026-05-19-tdd-gate-needs-stub-first.md))

   **Padrão:** cada reference é o **fim de vida de compound notes maduras**. Quando uma lição se repete em 3+ compound notes, promover para reference.

2. **Adicionar campo `referenced-by: [skill-id]` no frontmatter** dos compound notes + citação explícita nas skills.

3. **Pipeline de promoção de 3 camadas:**
   - Compound note (situacional, este bug)
   - Reference (consolidado, este projeto/stack)
   - Core belief (universal, qualquer projeto)
   - Critério intermediário: "Universal dentro deste repo, recorre em 3+ compound notes" → vira reference.

4. **Migrar conteúdo pedagógico da origem `documentation-and-adrs` para `decision-registry`** — adicionar seção `## When to Write an ADR` antes do fluxo CRUD atual. Não quebrar o que existe.

5. **Adotar árvore de decisão da origem `using-agent-skills` em AGENTS.md/CLAUDE.md** — para agente entrando no repo pela primeira vez, **fase do trabalho** é mais óbvio que **categoria de skill**. Reaproveitar flowchart `Define → Plan → Build → Verify → Review → Ship` adaptado para `grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate`.

---

## 6. Plano de Ação Consolidado

Priorização final cruzando ROI × esforço × dependências.

### 6.1 Wave 1 — Quick Wins (1 semana, ROI imediato)

| # | Ação | Esforço | Quem decide | Bloqueia |
|---|---|---|---|---|
| 1 | GH Actions `test-plugin-install.yml` (3 jobs em série) | 30min | Direto | — |
| 2 | Common Rationalizations + Red Flags nas 5 skills mais críticas (tdd-workflow, security, plan-feature, grill-me, execute-plan) | 1 dia (subagente paralelo) | Direto | — |
| 3 | Portar `incremental-implementation` como skill nova | S (4h) | Direto | — |
| 4 | Portar `code-simplification` como skill nova | S (4h) | Direto | — |
| 5 | Refatorar [skills/grill-me/SKILL.md](skills/grill-me/SKILL.md) com Hypothesis+Confidence%+GUESS | S (3h) | Direto | — |
| 6 | **Bootstrapar `docs/references/`** (pasta + README + 2-3 seed files: `security-checklist.md`, `accessibility-checklist.md`, `testing-patterns.md` adaptados da origem) | S (4h) | Direto | — |

### 6.2 Wave 2 — Médio Prazo (2-4 semanas)

| # | Ação | Esforço | Quem decide |
|---|---|---|---|
| 6 | Portar `source-driven-development` (+ pattern UNVERIFIED) | M (1 dia) | Direto |
| 7 | Portar `doubt-driven-development` (cross-reference com design-twice + verify-work) | M (1 dia) | **PRD** |
| 8 | Adotar 5 patterns de prompt-engineering nos 13 agentes (Positive Observations, Severity→SLA, Triad PoC, Anti-degeneration, Composition block) | M (2-3 dias, mecanizável) | Direto |
| 9 | Criar `docs/references/` com 3 checklists operacionais (init-step, hooks, tdd-cycle) | M (1-2 dias) | Direto |
| 10 | Tier-2 multi-IDE: gerador `scripts/generate-multi-ide.ts` para Cursor/Windsurf/Copilot — skills de domínio puro | M (1 dia) | **Decisão estratégica** (escopo) |
| 11 | Migrar conteúdo pedagógico do `documentation-and-adrs` para [skills/decision-registry/SKILL.md](skills/decision-registry/SKILL.md) | S (4h) | Direto |
| 12 | Portar `git-workflow-and-versioning` | S (4h) | Direto |

### 6.3 Wave 3 — Estratégico (1-2 meses)

| # | Ação | Esforço | Quem decide |
|---|---|---|---|
| 13 | Consolidar `/anti-vibe-review` em `/verify-work` (deprecate path) | S (2h) | **Migração com prazo** |
| 14 | **Modo `prove-it` opcional no tdd-verifier** (decisão registrada: não criar 14º agente) | M | **PRD** |
| 15 | Pipeline 3-camadas compound→reference→core-belief + campo `referenced-by` no frontmatter | M | Direto |
| 16 | Adotar árvore de decisão `Define → Plan → Build → Verify → Review → Ship` em CLAUDE.md/AGENTS.md | S | Direto |
| 17 | Considerar persona "synthesizer" (não router) que recebe 13 JSONs e produz markdown narrativo | M | **PRD** |
| 18 | Portar `sdd-cache` hook (ETag-revalidated WebFetch cache) | S (2h) | Opcional |
| 19 | Refatorar [skills/tdd-workflow/SKILL.md](skills/tdd-workflow/SKILL.md) com Test Sizes + DAMP + test-doubles tabela | M | Direto |
| 20 | Refatorar [skills/anti-vibe-review/SKILL.md](skills/anti-vibe-review/SKILL.md) com severity prefixes + Change Sizing table | S | Direto |

### 6.4 NÃO portar (com justificativa)

- ❌ **`using-agent-skills`** — meta-skill índice. Em Claude Code real, descoberta de skills já é nativa via frontmatter+autoload.
- ❌ **Colapsar 13 auditores em 3 generalistas** — perderia ~70% das verificações específicas de stack.
- ❌ **Criar meta-reviewer/router** — origem explicitamente proíbe ("Pure routing layer with no domain value... 2× token cost").
- ❌ **Single-file balofo sem progressive disclosure** — nossa arquitetura `references/` é estruturalmente superior.
- ❌ **Marketplace remoto** — nosso modelo é fork+customize, não install-and-use.

---

## 7. Decisões (Tomadas 2026-05-22)

1. **Tier-2 multi-IDE:** ❌ Adiado. Foco mantém 100% Claude Code por enquanto.
2. **14º agente Prove-It OU modo no tdd-verifier:** ✅ **Modo no tdd-verifier** — evita sprawl, mantém o roster em 13. `mode: "prove-it"` opcional.
3. **Consolidar `/anti-vibe-review` em `/verify-work`:** ✅ Sim. Migração com prazo + path de deprecation.
4. **PRD formal para Wave 2/3:** ✅ Sim. Cada bloco de domínio vira PRD próprio (não um PRD gigante).
5. **`docs/references/`:** ✅ **Criar agora — conceito ajustado**. Não é extração de compound notes maduras. É **pasta para documentações externas consultáveis** — coleção curada estilo `agent-skills-main/references/` original (OWASP, WCAG, Core Web Vitals, docs oficiais de frameworks que skills podem citar via hub-and-spoke). Compound continua reativo-local; references vira proativo-externo.

---

## 8. Artefatos Gerados

- Este documento: [./ANALYSIS.md](./ANALYSIS.md) (índice canônico da análise)
- **PRD-WAVE-1 aprovado:** [../2026-05-22-agent-skills-import-wave1/PRD.md](../2026-05-22-agent-skills-import-wave1/PRD.md)
- PRD-WAVE-2: a criar em `../2026-05-22-agent-skills-import-wave2/PRD.md`
- PRD-WAVE-3: a criar em `../2026-05-22-agent-skills-import-wave3/PRD.md`
- 4 transcripts de subagentes em `tmp/claude/tasks/` (auto-clean)

## 9. Próximos Passos

1. ✅ Decisões pendentes resolvidas (ver §7)
2. ✅ PRD-WAVE-1 gerado, revisado e aprovado (2026-05-22)
3. ⏳ Gerar PRD-WAVE-2 (refinamento de agentes + skills novas)
4. ⏳ Gerar PRD-WAVE-3 (consolidação verify-work + modo prove-it + pipeline compound→reference)
5. ⏳ Cada PRD aprovado → `/plan-feature` para gerar plano de execução na própria pasta
6. ⏳ Executar wave por wave (sequencial conforme decisão do dev)

---

**Fonte da análise:**
- Origem: `F:/Projetos/Anti-Vibe-Coding/Infos/agent-skills-main/`
- Destino: `F:/Projetos/Anti-Vibe-Coding/{skills,agents,docs/compound,scripts,hooks,.claude-plugin}/`
- Método: 4 subagentes paralelos × leitura empírica de 30+ arquivos cada × consolidação
- Tokens gastos pelos subagentes: ~425k total (skills 142k + agents 70k + harness 118k + compound 95k)
