# Anti-Vibe Coding Plugin

Plugin Claude Code para desenvolvimento disciplinado. Substitui "vibe coding" por um pipeline com TDD obrigatório, modo consultor antes de codar, especificação interativa, planejamento hierárquico, execução verificada e ciclo pós-deploy estruturado.

Baseado na metodologia Anti-Vibe Coding (Fabio Akita / XP) e em 60+ princípios técnicos extraídos de referências sêniores.

**Versão atual:** 7.3.0

---

## Filosofia em uma frase

> Humano é Navegador. IA é Piloto. Disciplina maior que velocidade.

- Você define arquitetura, limites e regras de negócio
- A IA executa com disciplina dentro desses limites
- Testes vêm antes do código de produção
- Incerteza dispara consultoria antes de implementação
- Decisões irreversíveis (auth, schema, libs críticas) passam por modo consultor

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/luyzkk/Anti-Vibe-Coding.git
cd Anti-Vibe-Coding
```

### 2. Adicionar como marketplace local no Claude Code

Dentro de qualquer sessão Claude Code:

```
/plugin marketplace add /caminho/absoluto/para/Anti-Vibe-Coding
```

Isso registra o `.claude-plugin/marketplace.json` deste repositório como fonte de plugins.

### 3. Instalar o plugin

```
/plugin install anti-vibe-coding@local-plugins
```

A partir daí, todas as skills `/anti-vibe-coding:*` ficam disponíveis em qualquer projeto onde você abrir o Claude Code.

### 4. Verificar instalação

```
/anti-vibe-coding:sync
```

Mostra a versão do plugin global e força invalidação de cache. Deve reportar `v7.3.0`.

---

## Primeiro uso em um projeto

### Greenfield (repositório vazio ou novo)

No diretório do projeto:

```
/anti-vibe-coding:init
```

O comando funciona mesmo em repositório **completamente vazio** (sem `package.json`, `Gemfile`, etc.). Se a stack não puder ser detectada, ele pergunta interativamente:

> `Stack not detected — run /anti-vibe-coding:detect-architecture before /init.`
> `(s)kip populate-plan and continue, or (a)bort?`

Resposta `s` → pula a geração do plano de população dos docs e prossegue com o restante do scaffold. Resposta `a` → aborta com código 20 (comportamento histórico).

Para uso não-interativo (CI):

```bash
bun scripts/init-cli.ts --cwd=/path/to/project --skip-populate-plan
```

### Projeto com stack já existente

```
/anti-vibe-coding:init
```

Detecta automaticamente Node-TS, Next.js, React (Vite), Rails, Laravel ou Python via manifests (`package.json`, `Gemfile`, `composer.json`, `pyproject.toml`/`requirements.txt`). Em monorepos detecta também stacks secundárias.

### O que o `/init` cria

Em um projeto greenfield: ~59 arquivos. Em projeto com stack detectada: ~37 placeholders + scripts harness.

| Path | Função |
|------|--------|
| `.claude/CLAUDE.md` | Espelho de `AGENTS.md` (mirror canônico) |
| `.claude/.anti-vibe-manifest.json` | Rastreamento de versão + checksums |
| `.claude/knowledge/atoms/` | Knowledge stack-específico (16 atoms para Next.js, etc.) |
| `.claude/legacy-manifest.json` | Inventário de artefatos v5.x migrados |
| `AGENTS.md` | Índice de leitura para agentes (fonte de verdade) |
| `CLAUDE.md` | Symlink/mirror para `AGENTS.md` (3 tiers com fallback Windows) |
| `TODO.md` | Micro-débito do projeto |
| `docs/ARCHITECTURE.md` | Personalizado pela stack detectada |
| `docs/STATE.md` | Estado vivo do projeto |
| `docs/exec-plans/active/` | Planos em andamento (1 pasta por feature) |
| `docs/compound/` | Lições aprendidas com filtro de qualidade sênior |
| `docs/design-docs/` | ADRs e princípios sêniores |
| `docs/review-checklists/` | Checklists de revisão por domínio |
| `.github/workflows/` + `pull_request_template.md` | CI + template de PR |

---

## Quick Start — feature nova

O caminho recomendado para uma feature não trivial é o **pipeline**:

```
/anti-vibe-coding:grill-me        → entrevista pré-implementação (resolve ambiguidade)
/anti-vibe-coding:write-prd       → especificação completa interativa
/anti-vibe-coding:plan-feature    → plano hierárquico com vertical slices
/anti-vibe-coding:execute-plan    → execução wave-based com subagentes
/anti-vibe-coding:verify-work     → auditoria multi-agente paralela
```

Cada skill funciona standalone. O pipeline é atalho, não obrigação.

Para tasks de complexidade média (3–7 passos, 2–5 arquivos), use o atalho leve:

```
/anti-vibe-coding:quick-plan
```

Para correções triviais, **não use o pipeline** — vai direto. O TDD Gate exige teste antes do fix, mas dispensa PRD.

---

## Catálogo completo de skills

### Pipeline principal

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Grill Me | `/anti-vibe-coding:grill-me` | Entrevista implacável pré-implementação (5–25 perguntas) |
| Design Twice | `/anti-vibe-coding:design-twice` | 3+ propostas arquiteturais divergentes em paralelo |
| Write PRD | `/anti-vibe-coding:write-prd` | Especificação completa via entrevista interativa |
| Plan Feature | `/anti-vibe-coding:plan-feature` | Plano hierárquico com análise semântica de complexidade |
| Execute Plan | `/anti-vibe-coding:execute-plan` | Execução wave-based com isolamento de contexto |
| Verify Work | `/anti-vibe-coding:verify-work` | Auditoria multi-agente paralela pós-execução |
| Quick Plan | `/anti-vibe-coding:quick-plan` | Mini-plano inline (3–7 passos) sem arquivos extras |

### Pós-deploy

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Iterate | `/anti-vibe-coding:iterate` | Ciclo pós-deploy: incident → hardening → centralize |
| Incident Response | `/anti-vibe-coding:incident-response` | Investigação disciplinada: raw logs → hipótese → regression test → fix |
| Defensive Patterns | `/anti-vibe-coding:defensive-patterns` | Menu de hardening: rate limit, circuit breaker, retry, timeout |
| Centralize Config | `/anti-vibe-coding:centralize-config` | Migração de config espalhada para fonte única |
| TODO Pick | `/anti-vibe-coding:todo-pick` | Puxa 1 item do `TODO.md` por vez para correção |

### Consultoria e domínio

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Consultor | `/anti-vibe-coding:consultant` | Fase Zero — ensina trade-offs antes de codar |
| Architecture | `/anti-vibe-coding:architecture` | SOLID, CQRS, monolito vs microserviço |
| Security | `/anti-vibe-coding:security` | OWASP Top 10, auth, JWT, crypto, secrets |
| API Design | `/anti-vibe-coding:api-design` | N+1, idempotência, DTOs, webhooks, REST |
| System Design | `/anti-vibe-coding:system-design` | CAP, PACELC, cache, scaling, replicação |
| React Patterns | `/anti-vibe-coding:react-patterns` | useEffect, data fetching, memoization, state |
| Design Patterns | `/anti-vibe-coding:design-patterns` | Code smells, error handling, refactoring |
| Infrastructure | `/anti-vibe-coding:infrastructure` | DNS, hosting, deploy, CDN, serverless |
| Learn | `/anti-vibe-coding:learn` | Explicações adaptativas pelo nível |

### Workflow e qualidade

| Skill | Comando | Propósito |
|-------|---------|-----------|
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Workflow adaptativo IA-TDD (3 níveis) |
| Anti-Vibe Review | `/anti-vibe-coding:anti-vibe-review` | Auditoria pós-implementação (multi-domínio) |
| QA Visual | `/anti-vibe-coding:qa-visual` | Verificação no browser via Playwright MCP |
| Doubt-Driven Development | `/anti-vibe-coding:doubt-driven-development` | Revisão adversarial fresh-context antes de decisão "ficar de pé" |
| Source-Driven Development | `/anti-vibe-coding:source-driven-development` | Ancora cada decisão em documentação oficial citada |
| Code Simplification | `/anti-vibe-coding:code-simplification` | Identifica over-engineering, duplicação, complexidade |
| Incremental Implementation | `/anti-vibe-coding:incremental-implementation` | Divide features em incrementos verificáveis |
| Pair Programming | `/anti-vibe-coding:pair-programming-with-agent` | Sessão estruturada humano-navega-IA-pilota |

### Memória e decisões

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Lessons Learned | `/anti-vibe-coding:lessons-learned` | Registra lições com filtro de qualidade sênior |
| Decision Registry | `/anti-vibe-coding:decision-registry` | Registro de decisões arquiteturais (ADRs) |
| Compound Engineering | `/anti-vibe-coding:compound-engineering` | Scaffold + gate de captura de conhecimento durável |
| Git Workflow | `/anti-vibe-coding:git-workflow-and-versioning` | Conventional commits, atomicidade, PR como contrato |
| Enhance Prompt | `/anti-vibe-coding:enhance-prompt` | Otimiza prompts de execução automatizada |
| Parity Audit | `/anti-vibe-coding:parity-audit` | Audita capabilities (MCPs, tools, subagentes) e produz gaps |

### Manutenção do plugin

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Init | `/anti-vibe-coding:init` | Setup inicial + atualização incremental (greenfield-aware) |
| Update | `/anti-vibe-coding:update` | Verifica status de atualizações |
| Sync | `/anti-vibe-coding:sync` | Invalida cache e mostra versões |
| Detect Architecture | `/anti-vibe-coding:detect-architecture` | Classifica projeto em 1 dos 5 perfis arquiteturais |

---

## Cinco perfis arquiteturais (Modo Dual)

`/anti-vibe-coding:detect-architecture` classifica o projeto em 1 destes 5 perfis usando heurística de pasta + imports. Ativa "Modo Dual" nas skills estruturantes (cada skill ajusta sugestões ao perfil):

| Perfil | Quando |
|--------|--------|
| `clean-architecture-ritual` | Camadas estritas, DDD, ports & adapters |
| `mvc-flat` | Rails, Laravel clássico, MVC sem layers extras |
| `vertical-slice` | Features auto-contidas (slice por feature) |
| `nextjs-app-router` | Next.js App Router com Server Components |
| `unknown-mixed` | Projeto sem padrão claro — exige confirmação |

Confiança <80% pede confirmação do dev antes de aplicar.

---

## Hooks (automáticos, custo zero de contexto)

| Hook | Evento | Função |
|------|--------|--------|
| Skill Advisor | `UserPromptSubmit` | Detecta domínio e sugere skill apropriada |
| TDD Gate | `PreToolUse` (Write/Edit) | Bloqueia código de produção sem testes |
| Pre-Tool-Use Destructive Guard | `PreToolUse` (Bash) | Bloqueia `rm -rf`, `git checkout --`, `force push` sem `AVC_ALLOW_DESTRUCTIVE=1` |
| File Size Guard | `PostToolUse` | Avisa quando função/arquivo passa do limite (40L função) |
| Stop Detector | `Stop` | Detecta correções e features completadas, sugere próximo passo |
| Context Injection | `SessionStart` | Injeta princípios Anti-Vibe no início da sessão |

---

## Agents (executores isolados, contexto limpo)

| Agent | Função |
|-------|--------|
| plan-executor | Executa task individual de um plano com TDD obrigatório |
| plan-verifier | Verifica output de tasks (read-only, JSON output) |
| design-explorer | Gera proposta arquitetural sob restrição específica |
| tdd-verifier | Verifica compliance TDD (read-only) |
| documentation-writer | Cria/atualiza documentação |
| lesson-evaluator | Avalia qualidade de lições (4 critérios sênior) |
| security-auditor | Audita criptografia, secrets, ReDoS, OWASP |
| database-analyzer | Detecta N+1, falta de índices, cache mal configurado |
| api-auditor | Verifica idempotência, DTOs, REST design, rate limit |
| solid-auditor | Verifica SRP, LSP, Lei de Demeter, acoplamento |
| code-smell-detector | Detecta 9 code smells com sugestões |
| react-auditor | Verifica useEffect, memoization, state management |
| infrastructure-auditor | Audita DNS, deploy, Docker, health checks |

---

## Pipeline — fluxo de feature nova

```
┌─────────────────────────────────────────────────────────────────┐
│  Pré-implementação                                              │
│  /grill-me ────► /design-twice ────► /write-prd                 │
│  (entrevista)    (3+ propostas)      (especificação interativa) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Implementação                                                  │
│  /plan-feature ────► /execute-plan ────► /verify-work           │
│  (plano por slices)  (subagentes)        (auditoria paralela)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pós-deploy                                                     │
│  /iterate ────► /incident-response ────► /defensive-patterns    │
│  (ciclo)        (investigação)            (hardening)           │
└─────────────────────────────────────────────────────────────────┘
```

**Características:**

- Cada skill funciona standalone — pipeline é atalho, não obrigação
- Cada feature vive em pasta datada `docs/exec-plans/active/YYYY-MM-DD-{slug}/`
- Múltiplas features coexistem sem lock (paralelismo por design)
- Subagentes executam tasks com contexto isolado
- Auditoria paralela via 5+ agents independentes em `/verify-work`

---

## IA-TDD Adaptativo

O `/tdd-workflow` detecta automaticamente o nível do dev e ajusta o comportamento:

| Nível | Quando aplica | Comportamento |
|-------|---------------|---------------|
| **Guiado** | Dev ainda não escreve testes | IA propõe 1 teste por vez com explicação |
| **Assistido** | Dev escreve mas pula edge cases | IA gera 1–3 testes, isolation RED/GREEN |
| **Direto** | Dev escreve testes próprios | IA apenas implementa código de produção |

**TDD Gate** (hook) bloqueia `Write`/`Edit` em arquivo de produção se não existir teste correspondente. Skip automático em: configs, JSON, YAML, `.d.ts`, Next.js route files (`page`/`layout`/`route`).

---

## Tutoriais

### Cenário 1: Feature nova com pipeline completo

```
# 1. Resolver ambiguidade ANTES de codar
/anti-vibe-coding:grill-me adicionar sistema de notificações in-app
# IA faz 5–25 perguntas dirigidas. Output: CONTEXT.md em docs/exec-plans/active/{slug}/

# 2. (Opcional) Explorar 3+ abordagens divergentes
/anti-vibe-coding:design-twice

# 3. Especificar com PRD interativo
/anti-vibe-coding:write-prd
# Cria pasta docs/exec-plans/active/2026-05-28-notificacoes/ com PRD.md, MoSCoW, SLOs

# 4. Plano hierárquico
/anti-vibe-coding:plan-feature
# Gera plano01/, plano02/ ... com fases detalhadas

# 5. Executar
/anti-vibe-coding:execute-plan
# Subagentes implementam fase por fase com TDD obrigatório

# 6. Verificar
/anti-vibe-coding:verify-work
# 5+ agents auditam em paralelo (security, code-smell, solid, etc.)
# Ao concluir: oferece arquivar em docs/exec-plans/completed/
```

### Cenário 2: Bug fix simples

Para correções triviais, **não use o pipeline** — vai direto:

```
# Você descreve o bug com dados brutos (logs, stack trace)
"botão de logout não fecha sessão em mobile Safari — segue stack: ..."

# IA cria teste reproduzindo o bug → fica vermelho
# IA implementa fix mínimo → teste fica verde
# Pronto. Sem PRD, sem plano.
```

### Cenário 3: Pós-deploy / produção quebrou

```
# Ciclo completo embrulhado
/anti-vibe-coding:iterate

# Ou passo a passo:
/anti-vibe-coding:incident-response       # raw logs → hipótese → regression test → fix
/anti-vibe-coding:defensive-patterns      # menu de hardening
/anti-vibe-coding:centralize-config       # migra config espalhada para fonte única
```

### Cenário 4: Decisão arquitetural irreversível

```
/anti-vibe-coding:consultant
# Apresenta opções, prós/contras, recomendação contextualizada
# NÃO escreve código — só ensina e ajuda decidir
```

### Cenário 5: Aprender um conceito antes de aplicar

```
/anti-vibe-coding:learn JWT vs session cookies
# Calibra ao seu nível (basic/intermediate/advanced)
# Conecta a código real do projeto quando relevante
```

---

## Estrutura do projeto após `/init`

```
seu-projeto/
├── .claude/
│   ├── CLAUDE.md                  ← mirror de AGENTS.md (3 tiers)
│   ├── .anti-vibe-manifest.json   ← versionamento por checksum
│   ├── legacy-manifest.json       ← artefatos v5.x migrados
│   ├── knowledge/
│   │   ├── INDEX.md
│   │   └── atoms/                 ← knowledge stack-específico
│   └── settings.json
├── docs/
│   ├── ARCHITECTURE.md            ← personalizado pela stack
│   ├── STATE.md                   ← estado vivo do projeto
│   ├── compound/                  ← lições aprendidas (filtro sênior)
│   ├── design-docs/               ← ADRs + princípios sêniores
│   ├── exec-plans/
│   │   ├── active/                ← 1 pasta por feature em andamento
│   │   │   └── 2026-05-28-feature/
│   │   │       ├── PRD.md
│   │   │       ├── PLAN.md
│   │   │       ├── STATE.md
│   │   │       ├── MEMORY.md      ← memória viva (bugs, decisões, gotchas)
│   │   │       ├── plano01/fase-01-*.md
│   │   │       └── plano02/ ...
│   │   └── completed/             ← features arquivadas
│   ├── review-checklists/         ← checklists por domínio
│   └── smoke-flows/               ← fluxos manuais de validação
├── .github/
│   ├── workflows/                 ← CI (harness validate, compound check)
│   └── pull_request_template.md
├── AGENTS.md                      ← fonte de verdade (lido por agentes)
├── CLAUDE.md                      ← mirror de AGENTS.md
└── TODO.md                        ← micro-débito
```

**Vantagens:**

- Múltiplas features coexistem sem colisão (paralelismo sem lock)
- Duas sessões Claude podem trabalhar em features diferentes simultaneamente
- Lições generalizáveis sobem para `docs/compound/` via `/lessons-learned`
- ADRs sobem para `docs/design-docs/` via `/decision-registry`
- Após `/verify-work`: o código é a fonte de verdade, artefatos viram histórico

---

## Versionamento e atualização

O plugin rastreia checksums SHA-256 de todos os arquivos instalados em `.claude/.anti-vibe-manifest.json`.

### Atualizar plugin em projeto existente

```
/anti-vibe-coding:init
```

Detecta automaticamente que já existe instalação e:

1. Compara checksums local vs versão nova do plugin
2. Mostra arquivos desatualizados e quais você modificou
3. Aplica estratégia de update por arquivo
4. Cria backup em `.claude/backups/YYYY-MM-DD/` antes de modificar

Em projetos com `CLAUDE.md` pré-existente, o `/init` aplica o **default destrutivo + revogável** (transforma o `CLAUDE.md` em espelho ≤40 linhas extraindo regras Akita para `docs/DESIGN.md`). Backup sempre criado. Reversível via `/anti-vibe-coding:init --rollback`.

Para preservar o comportamento aditivo da v6.3.x (merge sem reescrever):

```
/anti-vibe-coding:init --additive-merge
```

### Estratégias de atualização

| Arquivo | Estratégia | Comportamento |
|---------|------------|---------------|
| `CLAUDE.md` | merge (ou destructive default) | Preserva suas seções ou converte em mirror |
| `rules/*.md` | merge | Preserva customizações + adiciona regras novas |
| `senior-principles.md` | replace | Substitui (documentação oficial) |
| `agents/*.md` | replace | Substitui (prompts oficiais) |
| `hooks/*.cjs` | replace | Substitui (lógica crítica) |
| `decisions.md` | never | Nunca toca (é do projeto) |

### Verificar status sem aplicar

```
/anti-vibe-coding:update
```

Mostra: versão instalada vs versão do plugin, arquivos desatualizados, arquivos modificados por você, preview das mudanças.

### Invalidar cache do plugin

```
/anti-vibe-coding:sync
```

O hook `SessionStart` também detecta plugin atualizado ao abrir projeto e mostra aviso.

---

## Compound Engineering — captura de conhecimento durável

Após reportar conclusão de trabalho significativo, o plugin oferece um "compound decision gate":

> *Did this work teach the repo something durable? If yes, run `/anti-vibe-coding:lessons-learned`.*

Lições passam por filtro de qualidade sênior (4 critérios) antes de serem persistidas em `docs/compound/`. ADRs vão para `docs/design-docs/` via `/decision-registry`.

Validação automática:

```bash
bun run compound:check     # valida higiene das compound notes
bun run harness:validate   # valida estrutura docs/
```

---

## Stack Knowledge

A partir da v7.3.0, o plugin instala knowledge stack-específico em `.claude/knowledge/atoms/`. Exemplo Next.js: 15 atoms cobrindo App Router, Server Components, Server Actions, middleware, Suspense, performance Turbopack, testing strategy, Supabase integration. Extraídos de 9 fontes oficiais com cláusula anti-drift.

Stacks suportadas com knowledge nativo:
- Next.js (15 atoms)
- Node-TS (16 atoms genéricos: type, generic, branded, discriminated, satisfies, ESM, CJS, event loop, etc.)
- React (Vite)
- Rails, Laravel, Python (knowledge genérico)

---

## Model Profiles

O plugin permite otimizar custo vs qualidade por agente via perfis.

| Perfil | Composição | Recomendado para |
|--------|------------|-----------------|
| `quality` | Opus para auditores críticos, Sonnet para o resto | Releases, auditoria de segurança, features críticas |
| `balanced` | Sonnet para auditores críticos, Haiku para o resto | Desenvolvimento diário (default) |
| `budget` | Sonnet apenas para segurança e execução, Haiku para o resto | Protótipos, trabalho não-crítico |

Configurar em `config/model-profiles.json`. Skills resolvem o modelo do agente baseado no perfil ativo.

---

## Validação e CI

Scripts disponíveis (rodar a partir da raiz do plugin):

```bash
bun run test              # suite completa de testes
bun run typecheck         # tsc --noEmit
bun run test:e2e          # e2e isolado
bun run harness:validate  # estrutura docs/
bun run compound:check    # compound notes
bun run parity:audit      # capabilities do agente
```

GitHub Actions roda esses checks em PR automaticamente.

---

## Princípios

- **Extreme Programming (XP)** — Pair Programming adaptado humano-IA
- **Anti-Vibe Coding** (Fabio Akita) — disciplina, testes, especificação antes
- **TDD estrito** — Red → Green → Refactor sem atalhos
- **Política D3 (comentários)** — WHY sempre permitido, WHAT proibido
- **Coverage D7** — 95% business / 80% global / 70% branch (hardcoded, sem bikeshed)
- **Lições com filtro sênior** — só registra o que tem 4 critérios de qualidade
- **Source-Driven Development** — toda decisão framework-específica ancorada em doc oficial
- **Doubt-Driven Development** — submeter cada decisão não-trivial a revisão adversarial antes de "ficar de pé"

---

## Custo

Plugin é invisível para tarefas simples (~3 chamadas Haiku por mensagem, ~$0.0003).

Pipeline pesado (`/execute-plan` com subagentes paralelos) usa o perfil ativo — `balanced` mantém custo previsível.

---

## Histórico de versões (resumo)

### v7.3.0 — Next.js Stack Knowledge (May 2026)

- 15 atoms Next.js+React em inglês extraídos de 9 fontes oficiais (94% rastreabilidade)
- Detector multi-stack: `nextjs` e `react` como StackIds distintos
- `probeReact` com `vite.config + react` guard (false-positive fix)
- `next.config.{js,ts}` como anchor nextjs-específico
- Workflow `stack-knowledge-extraction` validado como template reusável

### v7.0.0 — Init refactor + Harness scaffold (May 2026)

- Pipeline `/init` reescrito em 12 steps (10 reais + 2 stubs)
- Greenfield-aware: funciona em repo zerado
- Detect-architecture com 5 perfis arquiteturais (Modo Dual)
- `docs/exec-plans/active/` substituiu `.planning/`
- AGENTS.md como fonte de verdade, CLAUDE.md como mirror
- Compound engineering como first-class (docs/compound/)

### v6.x — Compound Engineering + Harness Engineering

- Skills `/compound-engineering`, `/parity-audit`, `/source-driven-development`
- Sistema de migration de v5.x → v6.x
- ADRs em `docs/design-docs/`

### v5.2 — Pipeline pós-deploy

- Skills `/iterate`, `/incident-response`, `/defensive-patterns`, `/centralize-config`
- Política D3 de comentários (WHY/WHAT)
- Coverage thresholds D7 hardcoded
- Threshold de função 40L

CHANGELOG completo em [`CHANGELOG.md`](./CHANGELOG.md).

---

## Contribuição

Issues e PRs em [github.com/luyzkk/Anti-Vibe-Coding](https://github.com/luyzkk/Anti-Vibe-Coding).

- Decisões arquiteturais: [`docs/design-docs/`](./docs/design-docs/) (ADRs)
- Lições do desenvolvimento: [`docs/compound/`](./docs/compound/)
- Pipeline e profiles do próprio plugin: [`docs/PIPELINE.md`](./docs/PIPELINE.md), [`docs/MODEL_PROFILES.md`](./docs/MODEL_PROFILES.md)
- Princípios sêniores: [`docs/design-docs/core-beliefs.md`](./docs/design-docs/core-beliefs.md)

Antes de qualquer PR que toque `docs/`:

```bash
bun run harness:validate && bun run compound:check
```
