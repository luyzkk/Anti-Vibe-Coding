# Anti-Vibe Coding Plugin v4.0

Plugin Claude Code para desenvolvimento disciplinado baseado na metodologia Anti-Vibe Coding (Fabio Akita / XP).

Automatiza TDD, consultor sênior, auditoria de código e decisões arquiteturais — com custo zero de contexto para tarefas simples.

## Instalação

```bash
# Local (durante desenvolvimento do plugin)
claude --plugin-dir ./anti-vibe-coding

# Como plugin local registrado
claude plugin install ./anti-vibe-coding
```

## O que o plugin faz

### Hooks (automáticos)

| Hook | Evento | Função |
|------|--------|--------|
| Skill Advisor | `SessionStart` | Injeta lista de skills e instrui o Claude a recomendar a skill certa antes de implementar |
| Skill Advisor Gate | `UserPromptSubmit` | Detecta domínio da tarefa e recomenda skill relevante antes de qualquer implementação |
| TDD Gate | `PreToolUse (Write/Edit)` | Bloqueia edição de código de produção sem testes existentes |
| Stop Analyzer | `Stop` | Detecta correções (sugere `/lessons-learned`) e features completas (sugere auditoria + docs) |

### Skills (workflows invocáveis)

| Skill | Comando | Quando usar |
|-------|---------|-------------|
| Consultor | `/anti-vibe-coding:consultant` | Incerteza, decisões irreversíveis, múltiplos domínios |
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Implementação test-first (7 passos) |
| Security | `/anti-vibe-coding:security` | Auth, crypto, JWT, CORS, XSS, OAuth2 |
| API Design | `/anti-vibe-coding:api-design` | Endpoints, N+1, DTOs, idempotência, webhooks |
| Architecture | `/anti-vibe-coding:architecture` | SOLID, CQRS, monolito vs micro, DI |
| System Design | `/anti-vibe-coding:system-design` | Cache, CAP, scaling, replicação, CDN |
| React Patterns | `/anti-vibe-coding:react-patterns` | useEffect, data fetching, memoização, TanStack Query |
| Design Patterns | `/anti-vibe-coding:design-patterns` | Code smells, Result Pattern, logging, GoF |
| Infrastructure | `/anti-vibe-coding:infrastructure` | DNS, deploy, Docker, Kubernetes, CI/CD, serverless |
| Enhance Prompt | `/anti-vibe-coding:enhance-prompt` | Integrar Anti-Vibe em planos, tasks e prompts de execução automatizada |
| Lições | `/anti-vibe-coding:lessons-learned` | Registrar e consultar lições aprendidas com filtro sênior |
| Decisões | `/anti-vibe-coding:decision-registry` | Registrar ADRs com alternativas e justificativas |
| Revisão | `/anti-vibe-coding:anti-vibe-review` | Auditoria pós-implementação (TDD, segurança, qualidade) |

### Agents (executores isolados, read-only)

| Agent | Modelo | Função |
|-------|--------|--------|
| `security-auditor` | Sonnet | Criptografia, secrets, ReDoS, OWASP Top 10, auth |
| `code-smell-detector` | Sonnet | 9 code smells com sugestões de refatoração |
| `database-analyzer` | Sonnet | N+1, índices ausentes, queries sem otimização |
| `api-auditor` | Sonnet | Idempotência, DTOs, REST design, webhooks, rate limiting |
| `solid-auditor` | Sonnet | SRP, LSP, Lei de Demeter, Tell-Don't-Ask, acoplamento |
| `react-auditor` | Sonnet | useEffect desnecessários, stale closures, memoização prematura |
| `infrastructure-auditor` | Sonnet | DNS, health checks, HTTPS, Docker, CDN, deploy configs |
| `tdd-verifier` | Haiku | Verifica compliance TDD — testes existem e são reais |
| `documentation-writer` | Sonnet | Cria/atualiza documentação com contexto limpo |
| `lesson-evaluator` | Haiku | Avalia qualidade de lições com 4 critérios sênior |

### Rules (carregam automaticamente por contexto de arquivo)

| Rule | Ativa quando |
|------|-------------|
| `typescript-standards` | Editando `.ts` / `.tsx` |
| `testing-standards` | Editando `.test.*` / `.spec.*` |
| `api-standards` | Editando arquivos em `api/` |
| `security-patterns` | Editando auth, crypto, middleware |
| `database-patterns` | Editando queries, migrations, schemas |
| `solid-patterns` | Editando classes, services, repositories |
| `infrastructure-patterns` | Editando Docker, CI/CD, configs de deploy |
| `code-quality` | Editando qualquer arquivo de código |

## Filosofia

> **Disciplina > Velocidade**

- **Humano = Navegador** — define arquitetura, limites e regras de negócio
- **IA = Piloto** — executa com disciplina dentro dos limites definidos
- Testes vêm **antes** do código (TDD Gate garante isso)
- Incerteza → Consultoria **antes** de implementação
- Correções → Lições registradas para não repetir erros

## Fluxo de Trabalho

```
Mensagem do usuário
    ↓
[Skill Advisor] → Detecta domínio e recomenda skill
    ↓
┌── Incerteza/decisão complexa? → /consultant (ensina antes de codar)
├── Feature/Bug?                → /tdd-workflow (7 passos TDD)
├── Segurança?                  → /security (antes de implementar)
├── API/Infra/React?            → skill específica do domínio
└── Planos/Tasks/Prompts?       → /enhance-prompt (integra Anti-Vibe)
    ↓
[TDD Gate] → Bloqueia edição sem testes
    ↓
Implementação com disciplina
    ↓
[Stop Analyzer] → Detecta resultado
    ↓
┌── Correção detectada?    → Sugere /lessons-learned
└── Feature completa?      → Sugere agentes de auditoria + /anti-vibe-review
```

## Estrutura do Plugin

```
anti-vibe-coding/
├── .claude-plugin/
│   └── plugin.json              # Manifest (nome, versão, keywords)
├── agents/                      # Agentes especializados (read-only)
│   ├── security-auditor.md
│   ├── code-smell-detector.md
│   ├── database-analyzer.md
│   ├── api-auditor.md
│   ├── solid-auditor.md
│   ├── react-auditor.md
│   ├── infrastructure-auditor.md
│   ├── tdd-verifier.md
│   ├── documentation-writer.md
│   └── lesson-evaluator.md
├── hooks/
│   ├── hooks.json               # Registro de hooks (SessionStart, PreToolUse, Stop)
│   ├── tdd-gate.cjs             # Lógica do TDD Gate
│   └── user-prompt-gate.cjs    # Lógica do Skill Advisor
├── rules/                       # Carregadas automaticamente por contexto
│   ├── typescript-standards.md
│   ├── testing-standards.md
│   ├── api-standards.md
│   ├── security-patterns.md
│   ├── database-patterns.md
│   ├── solid-patterns.md
│   ├── infrastructure-patterns.md
│   └── code-quality.md
├── skills/                      # Skills invocáveis pelo usuário
│   ├── consultant/
│   ├── tdd-workflow/
│   ├── security/
│   │   └── references/          # Detalhes: crypto, auth, authorization...
│   ├── api-design/
│   │   └── references/          # Detalhes: REST, GraphQL, gRPC, N+1...
│   ├── architecture/
│   │   └── references/          # Detalhes: SOLID, CQRS, DI...
│   ├── system-design/
│   │   └── references/          # Detalhes: CAP, cache, sharding, CDN...
│   ├── react-patterns/
│   │   └── references/          # Detalhes: useEffect, data fetching...
│   ├── design-patterns/
│   │   └── references/          # Detalhes: code smells, GoF, logging...
│   ├── infrastructure/
│   │   └── references/          # Detalhes: DNS, deploy, serverless...
│   ├── enhance-prompt/          # Integra Anti-Vibe em planos e tasks
│   ├── lessons-learned/
│   ├── decision-registry/
│   ├── anti-vibe-review/
│   └── init/
├── CLAUDE.md                    # Fonte de verdade do plugin (princípios, padrões)
└── decisions.md                 # ADRs do próprio plugin
```

## Uso com Execução Automatizada

Para sessões automatizadas (headless, `/loop`, subagentes), use `/enhance-prompt` para preparar planos e tasks:

```
/anti-vibe-coding:enhance-prompt .claude/plans/minha-feature/
```

A skill vai:
1. Detectar todos os planos e tasks do projeto
2. Classificar cada task por domínio (auth, React, API, DB...)
3. Injetar seção `## Anti-Vibe` com skills e agents relevantes
4. Criar/atualizar o prompt de execução (`start.md`) com fluxo Anti-Vibe completo

## Princípios

Baseado em:
- **Extreme Programming (XP)** — Pair Programming adaptado para IA
- **Anti-Vibe Coding** (Fabio Akita) — disciplina contra geração massiva sem arquitetura
- **TDD estrito** — Red → Green → Refactor, sem exceções
- **Progressive disclosure** — skills carregam apenas o contexto necessário para cada consulta
