---
slug: agent-skills-import-wave1
date: 2026-05-22
status: approved
requires: []
parent_analysis: ../2026-05-22-agent-skills-import-analysis/ANALYSIS.md
---

# PRD: Agent-Skills Import — Wave 1 (Quick Wins)

**Status:** Approved (2026-05-22)
**Author:** Luiz Felipe + AI (Claude)
**Date:** 2026-05-22
**Context:** [../2026-05-22-agent-skills-import-analysis/ANALYSIS.md](../2026-05-22-agent-skills-import-analysis/ANALYSIS.md) (seções 1-7, fonte canônica)
**Parent:** Análise comparativa `obra/agent-skills` × Anti-Vibe-Coding
**Wave:** 1 de 3 — cada Wave tem PRD em pasta dedicada:
- Wave 1: `2026-05-22-agent-skills-import-wave1/` (esta)
- Wave 2: `2026-05-22-agent-skills-import-wave2/` (a criar)
- Wave 3: `2026-05-22-agent-skills-import-wave3/` (a criar)

---

## Problema

A análise comparativa entre `obra/agent-skills` (Addy) e Anti-Vibe-Coding (ver `ANALYSIS.md`) identificou **20 ações de melhoria** distribuídas em 3 Waves. As 6 ações da Wave 1 são **quick wins independentes** de baixo risco — adições/refinamentos que não exigem refatoração estrutural nem alteram pipeline existente.

**Por que importa:**
- O plugin não valida em CI que continua instalável → regressões silenciosas chegam só quando alguém roda `/init` em projeto novo.
- Skills nossas não têm a defesa anti-rationalization estruturada (`Common Rationalizations` + `Red Flags`) que combate exatamente o "vibe coding" que o plugin se propõe a destruir.
- Lacunas conceituais (sem skill de simplificação dirigida, sem disciplina codificada de slice incremental) deixam o agente improvisar.
- `grill-me` não tem proxy quantificável de qualidade ("confidence%", "guess anexado") — atrito desnecessário com o usuário.
- Não existe canal para consultar **docs externas curadas** (OWASP, WCAG, Core Web Vitals, docs de frameworks). Skills citam padrões mas não linkam para fonte oficial.

**Impacto de não resolver Wave 1:** Wave 2 e 3 (refatorações maiores) ficam mais arriscadas sem (a) CI de install validation, (b) padrão consistente de skill, (c) baseline de references/.

---

## Solução

### Outcomes (declarativo — o QUE)

- O repositório valida automaticamente em PR que o plugin ainda instala via `claude plugin install` (GH Actions).
- Toda skill crítica do plugin (top 5) tem seção `## Common Rationalizations` e `## Red Flags` padronizadas — defesa explícita contra "desculpas IA".
- Existe skill `incremental-implementation` no plugin, complementar a `tdd-workflow`, codificando a disciplina "100 linhas → teste → commit".
- Existe skill `code-simplification` no plugin, complementar a `anti-vibe-review`, com playbook de remediação de complexidade.
- `grill-me` declara hipótese inicial + confidence% antes da 1ª pergunta, anexa `GUESS:` em cada pergunta aberta, e tem condição de parada quantificada ("posso prever as próximas 3 respostas?").
- Existe `docs/references/` com 2-3 arquivos seed de documentações externas curadas (estilo hub-and-spoke da origem).

### Mecanismo (algorítmico — o COMO)

**Item 1 — GH Actions install workflow.** Criar [.github/workflows/test-plugin-install.yml](.github/workflows/test-plugin-install.yml) com 3 jobs sequenciais inspirados em `Infos/agent-skills-main/.github/workflows/test-plugin-install.yml`:
1. `validate-manifest` — roda `bun run harness:validate` + `bun run compound:check`
2. `validate-plugin` — roda `claude plugin validate .` (CLI do Claude Code)
3. `test-install` — instala em pasta temp via `claude plugin install` e verifica que skills/agentes/commands ficam acessíveis

Trigger: `pull_request` para `main` + `push` para `main`. Falha bloqueia merge.

**Item 2 — Common Rationalizations + Red Flags.** Adicionar duas seções a cada uma das 5 skills críticas (`tdd-workflow`, `security`, `plan-feature`, `grill-me`, `execute-plan`). Padrão:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "{desculpa que o modelo costuma dar}" | {a verdade contra-argumentando} |

## Red Flags

- {sinal negativo 1}
- {sinal negativo 2}
- {... até 6-10 itens}
```

Conteúdo curado por leitura de SKILL.md da origem (`agent-skills-main/skills/{test-driven-development,security-and-hardening,planning-and-task-breakdown,interview-me}/SKILL.md`) + adaptação para o estilo/idioma das nossas skills. Mecanizável via subagente paralelo (1 por skill).

**Item 3 — Portar `incremental-implementation`.** Copiar literal de `Infos/agent-skills-main/skills/incremental-implementation/SKILL.md` (princípio copy-then-improve registrado em memória `feedback_copy-then-improve.md`), depois melhorar:
- Adicionar frontmatter padrão nosso (`user-invocable: true`, `disable-model-invocation: false`)
- Adicionar bloco de telemetria padrão (mesmo padrão das outras skills nossas — ver `skills/grill-me/SKILL.md` linhas 1-30)
- Traduzir para PT-BR mantendo termos técnicos em inglês quando padrão de mercado
- Cross-reference com `skills/tdd-workflow/SKILL.md` (não duplicar — focar em "como implementar incrementalmente" enquanto tdd-workflow foca em "como aplicar TDD")

**Item 4 — Portar `code-simplification`.** Mesma metodologia do Item 3. Fonte: `Infos/agent-skills-main/skills/code-simplification/SKILL.md`. Cross-reference com `skills/anti-vibe-review/SKILL.md` e `skills/centralize-config/SKILL.md`.

**Item 5 — Refatorar `grill-me`.** Editar [skills/grill-me/SKILL.md](skills/grill-me/SKILL.md) adicionando:
- **Passo 0 (novo, antes do atual Passo 1):** Declarar hipótese + confidence% explícito ("CONFIDENCE: ~30% — missing: who, why, success criteria")
- **Template de pergunta atualizado:** Cada pergunta aberta vem com `GUESS: {chute específico}` anexado — usuário reage 3× mais rápido a chute errado que pergunta aberta (lição extraída de `Infos/agent-skills-main/skills/interview-me/SKILL.md`)
- **Want vs should-want detector:** Quando user diz "scalable / modern / clean", disparar pergunta especular ("se não tivesse que justificar isso pra ninguém, o que você realmente quer?")
- **Stop condition quantificada:** Ao final de cada rodada, agente declara "posso prever as próximas 3 perguntas/respostas? Se sim → 95%+ confidence → parar"

Não quebrar comportamento existente — adicionar passos, não substituir.

**Item 6 — Bootstrap `docs/references/`.** Criar:
- `docs/references/README.md` — explica o que é a pasta (coleção de docs externas curadas para consulta), critério de inclusão ("documentação canônica de fonte oficial, atemporal, transferível"), regra anti-podridão ("se a referência mudou, atualizar — não acumular versões")
- `docs/references/security-checklist.md` — adaptado de `Infos/agent-skills-main/references/security-checklist.md` (base OWASP Top 10) com links externos oficiais
- `docs/references/accessibility-checklist.md` — adaptado de `Infos/agent-skills-main/references/accessibility-checklist.md` (base WCAG 2.0/2.1) com links externos oficiais
- `docs/references/testing-patterns.md` — adaptado de `Infos/agent-skills-main/references/testing-patterns.md` (patterns canônicos: AAA, DAMP > DRY, test pyramid)

**Conceito ajustado (decisão do dev):** `docs/references/` é canal para **docs externas curadas**, não promoção de compound notes. Compound continua reativo-local; references é proativo-externo (fonte oficial citada). Não modificar pipeline compound→reference por enquanto (vai para Wave 3).

---

## Fluxos UX por Ator

Backend/infra-only (modificações no plugin) — sem UX por ator final. Fluxo do dev mantenedor:

### Mantenedor do plugin (Luiz Felipe)

1. Roda `git pull` e vê os novos arquivos: 1 workflow, 2 skills novas, 5 skills atualizadas, 1 skill refatorada, 4 references.
2. Roda `bun run test && bun run lint` localmente — todos verdes.
3. Abre PR — GH Actions roda os 3 jobs do novo workflow, verde.
4. Merge.
5. Em uso real: ao invocar `/grill-me`, vê hipótese+confidence% logo no início; ao invocar `/tdd-workflow`, lê `Common Rationalizations` table; novas skills aparecem em `/help`.

---

## Requisitos Funcionais

### Must Have (máximo 40% — 4 de 10 funcionais reais)

- [ ] **MH-01:** GH Actions workflow `test-plugin-install.yml` existe, roda em PR para `main`, e bloqueia merge se falhar.
- [ ] **MH-02:** As 5 skills críticas (`tdd-workflow`, `security`, `plan-feature`, `grill-me`, `execute-plan`) têm seções `## Common Rationalizations` e `## Red Flags` em formato padronizado.
- [ ] **MH-03:** Skills `incremental-implementation` e `code-simplification` existem em `skills/`, com SKILL.md completo (frontmatter + telemetria + corpo + verification checklist).
- [ ] **MH-04:** `docs/references/` existe com README + 3 arquivos seed (security, accessibility, testing).

### Should Have

- [ ] **SH-01:** `grill-me` declara `CONFIDENCE: ~N%` antes da primeira pergunta.
- [ ] **SH-02:** `grill-me` anexa `GUESS:` em cada pergunta aberta (formato consistente).
- [ ] **SH-03:** `grill-me` tem stop condition documentado ("posso prever as próximas 3 respostas?").
- [ ] **SH-04:** As 2 skills novas (`incremental-implementation`, `code-simplification`) estão listadas em `.claude-plugin/plugin.json` e `plugin-manifest.json` com checksum SHA-256.
- [ ] **SH-05:** GH Actions workflow tem badge no `README.md`.

### Could Have

- [ ] **CH-01:** `grill-me` detecta "scalable/modern/clean" e dispara pergunta especular (want vs should-want).
- [ ] **CH-02:** `docs/references/README.md` documenta como skills devem citar references (hub-and-spoke pattern).
- [ ] **CH-03:** 4º arquivo de reference adicional (`orchestration-patterns.md` ou `performance-checklist.md`).

### Won't Have (desta Wave)

- ❌ Refinamento dos 13 agentes (5 patterns de prompt-engineering) → **Wave 2**
- ❌ Portar `source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning` → **Wave 2**
- ❌ Refatorar `tdd-workflow`, `anti-vibe-review`, `plan-feature` com novos patterns (Test Sizes, severity prefixes, Task Sizing table) → **Wave 2**
- ❌ Consolidar `/anti-vibe-review` em `/verify-work` → **Wave 3**
- ❌ Modo `prove-it` no tdd-verifier → **Wave 3**
- ❌ Pipeline compound→reference→core-belief → **Wave 3** (Wave 1 só cria a pasta references como canal externo)
- ❌ Tier-2 multi-IDE (Cursor/Windsurf/Copilot) → **Adiado indefinidamente** (decisão registrada ANALYSIS.md §7)

---

## Requisitos Não-Funcionais

- **Performance:** GH Actions install workflow completa em < 5min p95. Skills carregam sem regressão de tempo (medido via telemetria existente).
- **Segurança:** Workflow não expõe secrets. Skills novas não introduzem chamadas externas não autorizadas (mantém `allowed-tools` restrito).
- **Acessibilidade:** N/A (sem UI).
- **Observabilidade:** Skills novas usam o mesmo padrão de telemetria das existentes (`writeTelemetryStart`/`writeTelemetryEnd` em `lib/telemetry-utils`). GH Actions logs auditáveis.
- **Compatibilidade:** Nenhuma mudança quebra projetos que já rodaram `/init`. Pipeline existente (`grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate`) continua funcional.
- **Manifest hygiene:** `plugin-manifest.json` regenerado via `scripts/generate-manifest.js` cobre os arquivos novos com checksums SHA-256.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Onde salvar PRDs das 3 Waves | Pasta dedicada por Wave (`2026-05-22-agent-skills-import-waveN/PRD.md`) | Mesma pasta da análise | Cada PRD gera seu próprio plano de execução (PLAN.md, STATE.md, planoNN/, fases). Pasta dedicada isola artefatos por escopo e facilita `/plan-feature` e `/execute-plan` (que assumem 1 PRD = 1 pasta com PLAN/STATE). ANALYSIS.md fica como índice na pasta original |
| 2 | Conceito de `docs/references/` | Docs externas curadas (hub-and-spoke estilo origem) | Promoção automática de compound notes maduras → references | Dev escolheu canal proativo-externo em vez de extração reativa-local. Compound mantém função separada (Wave 3 reavaliará pipeline) |
| 3 | Como portar skills novas | Copy literal da origem + melhorar (telemetria, frontmatter, PT-BR) | Reescrever do zero | Memory `feedback_copy-then-improve.md`: ao portar de ferramenta validada, copiar literalmente e melhorar em cima |
| 4 | 14º agente OU modo no tdd-verifier | Modo `prove-it` no tdd-verifier existente (Wave 3) | Criar 14º agente especializado | Evita sprawl no roster de agentes; mantém constraint "13 especialistas" |
| 5 | Common Rationalizations: escopo Wave 1 | 5 skills críticas (`tdd-workflow`, `security`, `plan-feature`, `grill-me`, `execute-plan`) | Todas as 34 skills | Risco vs ROI: top 5 entrega 80% do valor. Wave 2 expande para mais skills se ROI confirmar |
| 6 | GH Actions: linguagem | YAML padrão GH Actions (não reusable workflow) | Reusable workflow + matrix | Plugin é mono-repo, sem variantes — overhead desnecessário |
| 7 | `grill-me`: adicionar Passo 0 ou substituir Passo 1 | Adicionar Passo 0 (novo) | Substituir Passo 1 existente | Não-quebrar comportamento. Passo 0 declarativo precede a pergunta operacional |

---

## Critérios de Aceite

- [ ] **CA-01 (GH Actions instala):** Dado uma PR que toca `skills/`, `agents/`, `commands/`, `hooks/` ou `plugin-manifest.json`, quando o workflow `test-plugin-install.yml` roda, então os 3 jobs (`validate-manifest`, `validate-plugin`, `test-install`) passam em < 5min e o badge aparece verde no README.
- [ ] **CA-02 (Common Rationalizations padrão):** Dado uma das 5 skills críticas, quando aberta, então contém seção `## Common Rationalizations` com tabela `| Rationalization | Reality |` e ≥3 linhas, e seção `## Red Flags` com ≥5 bullets.
- [ ] **CA-03 (Skills novas válidas):** Dado as skills `incremental-implementation` e `code-simplification`, quando rodar `bun run harness:validate`, então não há violação (frontmatter completo, telemetria presente, listadas no manifest).
- [ ] **CA-04 (Grill-me confidence visível):** Dado uma invocação `/grill-me {qualquer arg}`, quando a skill responde a primeira mensagem, então a resposta contém literal `CONFIDENCE:` e percentual numérico antes da 1ª pergunta.
- [ ] **CA-05 (Grill-me GUESS anexado):** Dado uma pergunta gerada pelo `/grill-me`, quando inspecionada, então contém `GUESS:` seguido de chute específico (não genérico tipo "talvez X").
- [ ] **CA-06 (References pasta válida):** Dado o repo, quando navegar para `docs/references/`, então existem 4 arquivos (`README.md`, `security-checklist.md`, `accessibility-checklist.md`, `testing-patterns.md`), cada um com links para fonte oficial externa (OWASP, WCAG, etc.).
- [ ] **CA-07 (edge case — workflow falha controlada):** Dado uma PR que quebra o manifest (ex: SKILL.md com frontmatter inválido), quando o workflow roda, então `validate-manifest` falha com mensagem clara apontando o arquivo problemático, e merge fica bloqueado.
- [ ] **CA-08 (edge case — refatoração grill-me não regride):** Dado o teste existente `skills/grill-me/grill-me.test.ts` (se existir) ou `tests/e2e/grill-me-*.test.ts`, quando rodado, então passa sem modificação dos asserts existentes — apenas asserts novos adicionados para CA-04 e CA-05.

---

## Out of Scope

- **Refinamento dos 13 agentes** — Wave 2 (PRD-WAVE-2.md). Patterns: Positive Observations, Severity→SLA, Triad PoC/Impact/Fix, Anti-degeneration rules, Composition block.
- **Skills `source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning`** — Wave 2.
- **Refatorações estruturais** (`tdd-workflow` com Test Sizes/DAMP, `anti-vibe-review` com severity prefixes, `plan-feature` com Task Sizing table) — Wave 2.
- **Consolidação `/anti-vibe-review` → `/verify-work`** — Wave 3 (decisão do dev: sim, mas precisa deprecation path).
- **Modo `prove-it` no tdd-verifier** — Wave 3.
- **Pipeline 3 camadas compound→reference→core-belief** — Wave 3. Wave 1 só cria `docs/references/` como canal externo (não conecta com compound).
- **Tier-2 multi-IDE** — adiado indefinidamente (decisão registrada).
- **Persona "synthesizer"** que recebe N JSONs e gera narrativa merge/no-merge — Wave 3 (talvez).
- **Portar `sdd-cache` hook** — não-prioritário; reavaliar pós-Wave 3.

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Arquivo fonte | `Infos/agent-skills-main/skills/incremental-implementation/SKILL.md` | Disponível (já lido pelo subagente 1) |
| Arquivo fonte | `Infos/agent-skills-main/skills/code-simplification/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/skills/interview-me/SKILL.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/skills/{tdd,security,planning,execute}/SKILL.md` | Disponível (5 skills críticas) |
| Arquivo fonte | `Infos/agent-skills-main/references/{security,accessibility,testing}-checklist.md` | Disponível |
| Arquivo fonte | `Infos/agent-skills-main/.github/workflows/test-plugin-install.yml` | Disponível |
| Script existente | `scripts/generate-manifest.js` (regenera plugin-manifest.json com checksums) | No projeto |
| Script existente | `scripts/harness-validate.ts` (valida estrutura) | No projeto |
| Lib existente | `lib/telemetry-utils` + `lib/telemetry-types` (telemetria padrão skills) | No projeto |
| CI provider | GitHub Actions | Disponível (sem secrets necessários) |
| CLI externo | `claude plugin validate` + `claude plugin install` | Disponível no runner GH Actions Ubuntu |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **R-01** — `claude plugin install` no runner GH Actions falhar por incompatibilidade de versão | Média | Alto (bloqueia CA-01) | **Validar local primeiro:** rodar `claude plugin install` em pasta temp local ANTES de criar o workflow. Se passar local, fixar versão exata do CLI no workflow. Se falhar local, ajustar antes de commitar. Fallback: skip-if-not-installable com warning (não fail) para não bloquear PRs por bug do CLI |
| **R-02** — Common Rationalizations adicionadas em massa quebrarem testes de tamanho de SKILL.md (file-size-guard hook) | Média | Médio | Verificar `hooks/file-size-guard.cjs` antes; se necessário, mover seções longas para `references/` dentro da skill |
| **R-03** — Refatoração `grill-me` quebrar testes existentes | Média | Alto (regression) | TDD-first: ler testes atuais ANTES de modificar; rodar suite após cada edit; verificar telemetria não-corrompida |
| **R-04** — Skills portadas (`incremental`, `simplification`) sobreporem semanticamente com `tdd-workflow`/`anti-vibe-review` e confundir invocação | Baixa | Médio | Cross-reference explícito no frontmatter `description:`; documentar diferenças no top de cada SKILL.md |
| **R-05** — `docs/references/` virar pasta órfã (criada e abandonada) sem skills citando | Alta | Médio | Wave 1 não conecta references com skills (escopo). Wave 2/3 garantirá citação. Mitigar com TODO explícito no `README.md` |
| **R-06** — GH Actions ficar lento (>5min) e atrasar PRs | Baixa | Médio | Cache de dependências Node/Bun no workflow; matriz mínima |
| **R-07** — Conflito com decisão futura sobre conceito de `docs/references/` (Wave 3 pode redefinir pipeline) | Média | Baixo | Conteúdo seed é estável (OWASP, WCAG) — sobrevive a mudanças estruturais |
| **R-08** — Tradução PT-BR das skills novas perder nuance do original em inglês | Média | Médio | Manter termos técnicos em inglês (DAMP, RED-GREEN, etc.); revisar com leitura comparativa antes do commit |

---

## Lessons Captured (até agora)

- **Decisão registrada (DC-1):** `docs/references/` é canal proativo-externo (não pipeline reativo). Compound continua reativo-local. Wave 1 não conecta os dois.
- **Decisão registrada (DC-2):** Modo `prove-it` no tdd-verifier (Wave 3), não 14º agente.
- **Princípio reforçado (P-1):** Copy-then-improve ao portar de ferramenta validada (Andre/Addy). Ver memória `feedback_copy-then-improve.md`.
- **Decisão registrada (DC-3):** Pasta dedicada por PRD/Wave (cada PRD vira plano próprio com PLAN/STATE/planoNN). PRDs não compartilham pasta.

---

## Approval Log

**2026-05-22 — Aprovado por Luiz Felipe**

Todas as 7 Decisões Assumidas, 8 Riscos e 8 Critérios de Aceite revisados e aprovados. Ajustes solicitados:

- **D-1 alterado:** pasta dedicada por PRD/Wave (em vez de pasta compartilhada). Reflexo em "Decisões Técnicas" tabela e na estrutura de pastas (este PRD movido para `2026-05-22-agent-skills-import-wave1/PRD.md`).
- **R-01 mitigação reforçada:** validar `claude plugin install` localmente ANTES de comitar o workflow ao CI. Garante que CI só falha por regressão real, não por incompatibilidade pré-existente.

Demais decisões/riscos/CAs aprovados sem ajuste.

---

## Próximo Passo (Pipeline)

Após aprovação deste PRD-WAVE-1:

1. **Implementação direta** (não precisa `/plan-feature` formal — 6 itens são pequenos e independentes). Sugestão: executar em ordem 6 → 1 → 3 → 4 → 2 → 5 (dependência mínima primeiro).
2. **Pode invocar `/quick-plan`** para inline plan de 6-8 passos no momento da execução.
3. Ao fechar Wave 1: gerar `PRD-WAVE-2.md` usando este como template + ANALYSIS.md §6.2.
