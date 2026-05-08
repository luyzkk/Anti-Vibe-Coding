# Anti-Vibe Coding Plugin

Plugin Claude Code para desenvolvimento disciplinado. Substitui "vibe coding" por um pipeline com TDD obrigatório, modo consultor antes de codar, especificação interativa, planejamento hierárquico, execução verificada e ciclo pós-deploy estruturado.

Baseado na metodologia Anti-Vibe Coding (Fabio Akita / XP) e em 60+ princípios técnicos extraídos de referências sêniores.

**Versão atual:** 5.2.0

---

## Filosofia em uma frase

> Humano é Navegador. IA é Piloto. Disciplina maior que velocidade.

- Você define arquitetura, limites e regras de negócio
- A IA executa com disciplina dentro desses limites
- Testes vêm antes do código de produção
- Incerteza dispara consultoria antes de implementação
- Decisões irreversíveis (auth, schema, libs críticas) passam por modo consultor

---

## Quick Start

### 1. Instalar o plugin no Claude Code

```bash
claude --plugin-dir ./anti-vibe-coding
```

Ou adicione ao seu `settings.json`:

```json
{
  "plugins": ["./path/to/anti-vibe-coding"]
}
```

### 2. Configurar no projeto-alvo

No diretório do projeto onde quer usar o plugin:

```
/anti-vibe-coding:init
```

Isso instala em `.claude/`:
- `CLAUDE.md` (merge inteligente — preserva o que já existe)
- `rules/` (políticas de TS, testing, API, security, code-quality, etc.)
- `decisions.md` (registro de decisões arquiteturais — nunca sobrescrito)
- `senior-principles.md` (60+ princípios técnicos)
- `.anti-vibe-manifest.json` (rastreamento de versão por checksum SHA-256)

### 3. Comece a usar

Para uma feature nova, o caminho recomendado é o **pipeline**:

```
/anti-vibe-coding:grill-me        → entrevista pré-implementação (resolve ambiguidade)
/anti-vibe-coding:write-prd       → especificação completa interativa
/anti-vibe-coding:plan-feature    → plano hierárquico com vertical slices
/anti-vibe-coding:execute-plan    → execução wave-based com subagentes
/anti-vibe-coding:verify-work     → auditoria multi-agente paralela
```

Cada skill funciona standalone. O pipeline é atalho, não obrigação.

---

## O que vem com o plugin

### Hooks (automáticos, custo zero de contexto)

| Hook | Evento | Função |
|------|--------|--------|
| Skill Advisor | `UserPromptSubmit` | Detecta domínio e sugere skill apropriada |
| TDD Gate | `PreToolUse` (Write/Edit) | Bloqueia código de produção sem testes |
| File Size Guard | `PostToolUse` | Avisa quando função/arquivo passa do limite (40L função) |
| Grepping Names | `PreToolUse` | Verifica padrões de naming antes de criar arquivo |
| Stop Detector | `Stop` | Detecta correções e features completadas, sugere próximo passo |
| Context Injection | `SessionStart` | Injeta princípios Anti-Vibe no início da sessão |

### Skills

#### Pipeline principal (v5.2)

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Grill Me | `/anti-vibe-coding:grill-me` | Entrevista implacável pré-implementação (5–25 perguntas) |
| Design Twice | `/anti-vibe-coding:design-twice` | 3+ propostas arquiteturais divergentes em paralelo |
| Write PRD | `/anti-vibe-coding:write-prd` | Especificação completa via entrevista interativa |
| Plan Feature | `/anti-vibe-coding:plan-feature` | Plano hierárquico com análise semântica de complexidade |
| Execute Plan | `/anti-vibe-coding:execute-plan` | Execução wave-based com isolamento de contexto |
| Verify Work | `/anti-vibe-coding:verify-work` | Auditoria multi-agente paralela pós-execução |

#### Pipeline pós-deploy (v5.2)

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Iterate | `/anti-vibe-coding:iterate` | Ciclo pós-deploy completo: incident → hardening → centralize |
| Incident Response | `/anti-vibe-coding:incident-response` | Investigação disciplinada: raw logs → hipótese → regression test → fix |
| Defensive Patterns | `/anti-vibe-coding:defensive-patterns` | Menu de hardening: rate limit, circuit breaker, retry, timeout, etc. |
| Centralize Config | `/anti-vibe-coding:centralize-config` | Migração de config espalhada para fonte única |
| Pair Programming | `/anti-vibe-coding:pair-programming-with-agent` | Sessão estruturada humano-navega-IA-pilota |

#### Consultoria e domínio

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

#### Workflow e qualidade

| Skill | Comando | Propósito |
|-------|---------|-----------|
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Workflow adaptativo IA-TDD (3 níveis) |
| Quick Plan | `/anti-vibe-coding:quick-plan` | Mini-plano inline (3–7 passos) |
| Anti-Vibe Review | `/anti-vibe-coding:anti-vibe-review` | Auditoria pós-implementação (multi-domínio) |
| QA Visual | `/anti-vibe-coding:qa-visual` | Verificação no browser via Playwright MCP |
| Learn | `/anti-vibe-coding:learn` | Explicações adaptativas pelo nível |
| Lessons Learned | `/anti-vibe-coding:lessons-learned` | Registra lições com filtro de qualidade sênior |
| Decision Registry | `/anti-vibe-coding:decision-registry` | Registro de decisões arquiteturais |
| Enhance Prompt | `/anti-vibe-coding:enhance-prompt` | Otimiza prompts de execução automatizada |

#### Manutenção do plugin

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Init | `/anti-vibe-coding:init` | Setup inicial e atualização incremental |
| Update | `/anti-vibe-coding:update` | Verifica status de atualizações |
| Sync | `/anti-vibe-coding:sync` | Invalida cache e mostra versões |

### Agents (executores isolados, contexto limpo)

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

### Rules (carregam automaticamente ao editar arquivos)

Localizadas em `.claude/rules/` após `/init`:

- `code-quality.md` — naming, early return, política WHY/WHAT comments, threshold 40L
- `typescript-standards.md` — strict mode, named exports, type vs interface
- `testing-standards.md` — coverage thresholds (95% business / 80% global / 70% branch)
- `api-standards.md` — idempotência, DTOs, versionamento
- `security-patterns.md` — OWASP, secrets, validação de input
- `database-patterns.md` — N+1, índices, cache
- `infrastructure-patterns.md` — DNS, HTTPS, health checks
- `solid-patterns.md` — SOLID e composição
- `simplicity-guard.md` — KISS, YAGNI, antiabstração prematura
- `surgical-changes.md` — fix mínimo, sem refactor não pedido
- `verify-premises.md` — confirmar antes de implementar

---

## Pipeline v5.2 — Fluxo de feature nova

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
│  Pós-deploy (v5.2)                                              │
│  /iterate ────► /incident-response ────► /defensive-patterns    │
│  (ciclo)        (investigação)            (hardening)           │
└─────────────────────────────────────────────────────────────────┘
```

**Características:**

- Cada skill funciona standalone — pipeline é atalho, não obrigação
- Cada PRD vive em pasta datada `.planning/YYYY-MM-DD-{slug}/`
- Múltiplos PRDs coexistem sem lock (paralelismo por design)
- Subagentes executam tasks individuais com contexto isolado
- Auditoria paralela via 5+ agents independentes em `/verify-work`

---

## IA-TDD Adaptativo

O `/tdd-workflow` detecta automaticamente o nível do dev e ajusta o comportamento:

| Nível | Quando aplica | Comportamento |
|-------|---------------|---------------|
| **Guiado** | Dev ainda não escreve testes | IA propõe 1 teste por vez com explicação |
| **Assistido** | Dev escreve mas pula edge cases | IA gera 1–3 testes, isolation RED/GREEN |
| **Direto** | Dev escreve testes próprios | IA apenas implementa código de produção |

**AI Judge** sugerido para features com 3+ slices ou áreas críticas (auth, financeiro, dados sensíveis).

**TDD Gate** (hook) bloqueia `Write`/`Edit` em arquivo de produção se não existir teste correspondente. Skip automático em: configs, JSON, YAML, `.d.ts`, Next.js route files (page/layout/route).

---

## Tutoriais de uso

### Cenário 1: Feature nova com pipeline completo

```
# 1. Resolver ambiguidade ANTES de codar
/anti-vibe-coding:grill-me adicionar sistema de notificações in-app

# IA faz 5–25 perguntas dirigidas. Output: CONTEXT-{slug}.md em .planning/

# 2. (Opcional) Explorar 3+ abordagens divergentes
/anti-vibe-coding:design-twice

# 3. Especificar com PRD interativo
/anti-vibe-coding:write-prd

# Cria pasta .planning/2026-05-08-notificacoes/ com PRD.md, MoSCoW, SLOs

# 4. Plano hierárquico
/anti-vibe-coding:plan-feature

# Gera plano01/, plano02/ ... com fases detalhadas

# 5. Executar
/anti-vibe-coding:execute-plan

# Subagentes implementam fase por fase com TDD obrigatório

# 6. Verificar
/anti-vibe-coding:verify-work

# 5+ agents auditam em paralelo (security, code-smell, solid, etc.)
# Ao concluir: oferece arquivar PRD em .planning/_archive/
```

### Cenário 2: Bug fix simples

Para correções triviais, **não use o pipeline** — vai direto:

```
# IA detecta classificação automática (bug fix)
# TDD Gate ainda exige teste antes do fix

# Você descreve o bug
"botão de logout não fecha sessão em mobile Safari"

# IA cria teste reproduzindo o bug → fica vermelho
# IA implementa fix mínimo → teste fica verde
# Pronto. Sem PRD, sem plano.
```

### Cenário 3: Pós-deploy / produção quebrou

```
# 1. Investigação disciplinada
/anti-vibe-coding:incident-response

# Pede raw logs, formula hipótese, escreve regression test, propõe fix

# 2. Hardening defensivo
/anti-vibe-coding:defensive-patterns

# Menu por categoria: rate limit, circuit breaker, retry, timeout, idempotência

# 3. Limpar config espalhada
/anti-vibe-coding:centralize-config

# Detecta strings hardcoded duplicadas e migra para fonte única

# Tudo isso embrulhado em /iterate (ciclo completo pós-deploy)
/anti-vibe-coding:iterate
```

### Cenário 4: Decisão arquitetural irreversível

```
/anti-vibe-coding:consultant

# Antes de implementar auth, schema crítico ou lib core:
# IA apresenta opções, prós/contras, recomendação contextualizada
# NÃO escreve código — só ensina e ajuda decidir
```

---

## Estrutura `.planning/`

Cada PRD vive em sua própria pasta datada:

```
.planning/
├── 2026-05-08-notificacoes/
│   ├── CONTEXT.md           ← gerado pelo /grill-me
│   ├── PRD.md               ← gerado pelo /write-prd (MoSCoW, SLOs)
│   ├── PLAN.md              ← grafo entre planos
│   ├── STATE.md             ← tracking global por plano
│   ├── SUMMARY.md           ← gerado ao concluir
│   ├── MEMORY.md            ← consolidado (gerado ao arquivar)
│   ├── plano01/
│   │   ├── README.md
│   │   ├── MEMORY.md        ← memória viva (bugs, decisões, gotchas)
│   │   ├── fase-01-{nome}.md
│   │   └── fase-02-{nome}.md
│   └── plano02/ ...
├── 2026-05-10-outra-feature/
│   └── ...
└── _archive/                ← PRDs concluídos arquivados via /verify-work
    └── 2026-04-21-anti-vibe-v52/
```

**Vantagens:**

- Múltiplos PRDs coexistem sem colisão (paralelismo sem lock)
- Duas sessões Claude podem trabalhar em PRDs diferentes simultaneamente
- Lições generalizáveis sobem para `CLAUDE.md` do projeto via `/lessons-learned`
- Após `/verify-work`: o código é a fonte de verdade, artefatos viram histórico

---

## Versionamento e atualização

O plugin rastreia checksums SHA-256 de todos os arquivos instalados.

### Atualizar plugin em projeto existente

```
/anti-vibe-coding:init
```

Detecta automaticamente que já existe instalação e:

1. Compara checksums local vs versão nova do plugin
2. Mostra arquivos desatualizados e quais você modificou
3. Aplica estratégia de update por arquivo
4. Cria backup em `.claude/backups/YYYY-MM-DD/` antes de modificar

### Estratégias de atualização

| Arquivo | Estratégia | Comportamento |
|---------|------------|---------------|
| `CLAUDE.md` | merge | Preserva suas seções + adiciona novas |
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

### Invalidar cache

```
/anti-vibe-coding:sync
```

Hook automático já detecta plugin atualizado ao abrir projeto e mostra aviso.

---

## Model Profiles

O plugin permite otimizar custo vs qualidade por agente via perfis.

| Perfil | Composição | Recomendado para |
|--------|------------|-----------------|
| `quality` | Opus para auditores críticos, Sonnet para o resto | Releases, auditoria de segurança, features críticas |
| `balanced` | Sonnet para auditores críticos, Haiku para o resto | Desenvolvimento diário (default) |
| `budget` | Sonnet apenas para segurança e execução, Haiku para o resto | Protótipos, trabalho não-crítico |

Configurar em `config/model-profiles.json`:

```json
{
  "default": "balanced",
  "profiles": {
    "balanced": {
      "security-auditor": "sonnet",
      "code-smell-detector": "haiku",
      "..."
    }
  }
}
```

Skills resolvem o modelo do agente baseado no perfil ativo. Se config não existir, usa o modelo do frontmatter do agente (backward compat).

---

## Histórico de versões (resumo)

### v5.2.0 — Pipeline pós-deploy (Apr 2026)

- 5 novas skills: `/iterate`, `/incident-response`, `/defensive-patterns`, `/centralize-config`, `/pair-programming-with-agent`
- Política D3 de comentários (WHY permitido, WHAT proibido)
- Coverage thresholds D7 hardcoded (95/80/70)
- Hooks `file-size-guard` e `grepping-names`
- Threshold de função reduzido de 100L para 40L
- PRDs em pastas datadas `.planning/YYYY-MM-DD-{slug}/`
- Detecção automática de estrutura legacy + migração atômica
- Multi-lang rules: exemplos Python e Ruby

### v5.1.0 — Plan Feature v2 (Mar 2026)

- Plano hierárquico com análise semântica de complexidade
- Memória viva por plano (bugs, decisões, gotchas)
- Frontmatter `requires` com detecção de ciclos DFS
- Execução interativa com transição entre planos

### v5.0.0 — Pipeline + IA-TDD (Mar 2026)

- Pipeline completo: `grill-me → write-prd → plan-feature → execute-plan → verify-work`
- IA-TDD adaptativo (3 níveis: guiado, assistido, direto)
- Subagentes `plan-executor`, `plan-verifier`, `design-explorer`
- Skills `/grill-me`, `/design-twice`, `/write-prd`, `/qa-visual`

### v4.0.0 — Versionamento (Mar 2026)

- Sistema de versionamento por checksum SHA-256
- Estratégias merge/replace/never por arquivo
- Backups automáticos
- Detecção de modificações do usuário

### v3.0.0 — Conhecimento sênior (Mar 2026)

- 60+ princípios técnicos em `senior-principles.md`
- 6 skills de domínio: security, architecture, api-design, design-patterns, react-patterns, system-design
- 6 agents auditores especializados
- 8 rules carregando automaticamente

### v2.0.0 — Workflows core (Feb 2026)

- Skills `/consultant`, `/tdd-workflow`, `/lessons-learned`, `/decision-registry`, `/anti-vibe-review`
- Hooks classificador e TDD gate
- Agents `tdd-verifier`, `documentation-writer`, `lesson-evaluator`

CHANGELOG completo em [`CHANGELOG.md`](./CHANGELOG.md).

---

## Custo

Plugin é invisível para tarefas simples (~3 chamadas Haiku por mensagem, ~$0.0003).

Pipeline pesado (`/execute-plan` com subagentes paralelos) usa o perfil ativo — profile `balanced` mantém custo previsível.

---

## Princípios

- **Extreme Programming (XP)** — Pair Programming adaptado humano-IA
- **Anti-Vibe Coding** (Fabio Akita) — disciplina, testes, especificação antes
- **TDD estrito** — Red → Green → Refactor sem atalhos
- **Política D3 (comentários)** — WHY sempre permitido, WHAT proibido
- **Coverage D7** — 95% business / 80% global / 70% branch (hardcoded, sem bikeshed)
- **Lições com filtro sênior** — só registra o que tem 4 critérios de qualidade

---

## Contribuição

Issues e PRs em [github.com/luyzkk/Anti-Vibe-Coding](https://github.com/luyzkk/Anti-Vibe-Coding).

Decisões arquiteturais do plugin em [`decisions.md`](./decisions.md).
Lições do desenvolvimento em [`lessons-learned.md`](./lessons-learned.md).
