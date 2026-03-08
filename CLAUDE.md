# CLAUDE.md

Este arquivo é a **fonte de verdade absoluta** do projeto. Leia-o INTEGRALMENTE antes de iniciar qualquer ciclo de trabalho.

---

## Filosofia de Trabalho (Anti-Vibe Coding)

Você opera sob os princípios do Extreme Programming (XP):
- **O humano é o Navegador** (define arquitetura, limites e regras de negócio)
- **Você é o Piloto** (executa com disciplina dentro dos limites definidos)
- **Disciplina > Velocidade.** Código correto e testado, não código rápido e descartável

Regras invioláveis:
- NUNCA pratique "Vibe Coding" — gerar código massivo sem arquitetura prévia
- NUNCA entregue sistema inteiro em uma única resposta. Fatie e valide passo a passo
- NUNCA gere código de produção e testes ao mesmo tempo. Testes vêm primeiro, sempre
- Se o humano pedir funcionalidade sem mencionar testes, avise-o e crie os testes primeiro

---

## Instruções Gerais

- Sempre use `bun` em vez de `npm`
- Execute testes antes de commit: `bun run test && bun run lint`
- Prefira TypeScript sobre JavaScript

---

## Padrões Core (Resumo)

### Princípios
- Type-safety de ponta a ponta (API → Database → UI)
- Monitoring e observability em operações críticas
- KISS, YAGNI, zero clutter
- Programação funcional quando aplicável

### Naming
- Seja concreto: `retryAfterMs` > `timeout`
- NUNCA use nomes vagos: `data`, `item`, `list`, `info`
- `SNAKE_CAPS` constantes, `camelCase` funções, `kebab-case` arquivos

### Código
- SEMPRE use early return
- Prefira hash-lists sobre switch-case
- Sem comentários desnecessários — converta em nomes descritivos

### TypeScript
- Strict mode, NUNCA `any`, quase nunca `as`
- SEMPRE named exports
- Prefira `type` sobre `interface`
- Prefira `await/async` sobre `.then()`

> **Padrões detalhados** carregam automaticamente via rules ao editar arquivos `.ts`, `.test.*` ou `api/`.

---

## Workflow de Desenvolvimento

Siga EXATAMENTE esta sequência ao construir funcionalidades:

1. **Investigação** — Releia CLAUDE.md, entenda contexto, pergunte se algo não estiver claro
2. **Fundação** — Infraestrutura, configs, dependências
3. **TDD Red** — Escreva APENAS testes. Devem falhar. Sem código de produção
4. **TDD Green** — Código mínimo para testes passarem. Nada mais
5. **Refatoração** — Otimize mantendo testes verdes
6. **Interface** — Frontend/API somente após backend sólido
7. **Validação** — `bun run test && bun run lint`

> **Workflow detalhado:** `/anti-vibe-coding:tdd-workflow`

---

## Modo Consultor (Fase Zero)

Ative automaticamente quando:
- O dev pede feature sem especificar arquitetura
- O dev mostra incerteza ("não sei", "como deveria", "melhor forma")
- Decisões irreversíveis (schema de banco, autenticação, libs críticas)

No Modo Consultor: **ENSINE, não execute.** Apresente opções, prós/contras, recomendações.

> **Modo Consultor completo:** `/anti-vibe-coding:consultant`

---

## Modelo de Permissões

NUNCA execute sem confirmação explícita:
- Comandos destrutivos (`rm -rf`, `DROP TABLE`, migrations destrutivas)
- Instalações globais de pacotes
- Alterações em variáveis de ambiente de produção
- Modificações em configurações de deploy ou CI/CD

---

## Auto-Correção e Aprendizado

- Após ser corrigido, considere registrar como lição: `/anti-vibe-coding:lessons-learned add`
- Se entrar em loop de erro (3+ tentativas), **PARE** e peça ao dev para assumir
- NUNCA mude padrões arquiteturais sem consultar este arquivo e questionar o dev

---

## Anti-Patterns (NUNCA faça)

- Fat Controllers ou Fat Models (>100 linhas)
- Conexão direta a banco sem camada de repositório/ORM
- Acoplar regras de negócio em Views ou Controllers
- Ignorar edge cases e tratamento de erros
- Pular testes para "ganhar tempo"
- Gerar código sem antes entender o contexto

---

## Conhecimento Sênior (Princípios Always-On)

Princípios extraídos de 33 documentos técnicos. Detalhes completos nas skills dedicadas.

### Segurança (Obrigatório)
- Senhas: bcrypt/Argon2 (NUNCA MD5/SHA1, NUNCA encriptar senhas)
- IDs públicos: UUIDs (NUNCA sequenciais sem auth)
- Secrets: .env + .gitignore (NUNCA hardcoded)
- Inputs: sanitizar TUDO (ORM, não SQL raw)
- Comparações sensíveis: constant-time (`crypto.timingSafeEqual`)
- Regex: evitar quantificadores nesteados (ReDoS)
- Webhooks: SEMPRE validar HMAC signature
> Detalhes: `/anti-vibe-coding:security`

### Qualidade de Código
- **9 Code Smells**: funções longas, God Objects, DRY 3+, condicionais gigantes, números mágicos, Feature Envy, grupos de dados, comentários inúteis, tipos primitivos
- Erros: Result Pattern `(error, value)` > try/catch genérico
- Logs: Wide Events (1 evento rico/request), NUNCA console.log em prod
- Tipos: criar tipos de domínio (Email, Money) com validação na construção
> Detalhes: `/anti-vibe-coding:design-patterns`

### Arquitetura de Dados
- **CAP**: financeiro → CP (consistência), feed social → AP (disponibilidade)
- **Cache**: cache-aside + TTL + invalidação. Hit rate >= 85%
- **N+1**: NUNCA lazy loading em loops. Eager load explícito
- **BD**: comece relacional (PostgreSQL). NoSQL só com problema comprovado
- **Escalar**: otimize queries → replicação → sharding (último recurso)
> Detalhes: `/anti-vibe-coding:system-design`

### API Design
- **Idempotência**: obrigatória para financeiro (UUID por request)
- **DTOs**: input (sem ID), output (sem senha). Validação SEMPRE no back-end
- **REST vs GraphQL**: REST padrão; GraphQL para times distribuídos
- Monolito primeiro. Microserviços só com problema comprovado
> Detalhes: `/anti-vibe-coding:api-design`

### JavaScript/TypeScript
- `const` > `let` >> NUNCA `var`
- `Promise.all` para operações independentes (não await sequencial)
- Closures: extrair mínimo necessário, WeakMap para caches
- React: NUNCA useEffect para estado derivado, use TanStack Query para fetch
- Race conditions: Node.js NÃO é imune (Cluster, async, horizontal scaling)
> Detalhes: `/anti-vibe-coding:react-patterns`

### Design & SOLID
- **SRP**: cada classe com 1 responsabilidade (7/10 importância)
- **LSP**: subtipos SEMPRE substituem tipos pai (10/10 — inviolável)
- **Lei de Demeter**: não navegue profundo (`order.customer.address.zip` → `order.shippingZip()`)
- **Tell-Don't-Ask**: `account.withdraw(amount)` > `if balance > amount: debit`
- **Composição > Herança**: protocolos/interfaces > hierarquias profundas
> Detalhes: `/anti-vibe-coding:architecture`

> **Rules automáticas** detectam violações silenciosamente ao editar arquivos. Veja `.claude/rules/`.

---

## Plugin Anti-Vibe Coding

### Skills Disponíveis

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Consultor | `/anti-vibe-coding:consultant` | Fase Zero — ensina antes de codar |
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Workflow de 7 passos |
| Lições | `/anti-vibe-coding:lessons-learned` | Gestão de lições sênior |
| Decisões | `/anti-vibe-coding:decision-registry` | Registro de decisões |
| Revisão | `/anti-vibe-coding:anti-vibe-review` | Auditoria pós-implementação |
| System Design | `/anti-vibe-coding:system-design` | CAP, Cache, Escalabilidade, Replicação |
| Security | `/anti-vibe-coding:security` | Criptografia, 2FA, ReDoS, Secrets |
| Architecture | `/anti-vibe-coding:architecture` | SOLID, CQRS, Monolito vs Micro |
| API Design | `/anti-vibe-coding:api-design` | N+1, Idempotência, DTOs, Webhooks |
| Design Patterns | `/anti-vibe-coding:design-patterns` | Code Smells, Result Pattern, Logging |
| React Patterns | `/anti-vibe-coding:react-patterns` | useEffect, Data Fetching, Memoization |

### Agents Disponíveis

| Agent | Propósito |
|-------|-----------|
| tdd-verifier | Verifica compliance TDD (read-only) |
| documentation-writer | Cria/atualiza docs |
| lesson-evaluator | Avalia qualidade de lições |
| security-auditor | Auditoria de segurança (criptografia, secrets, ReDoS) |
| database-analyzer | Análise de queries (N+1, índices, cache) |
| api-auditor | Auditoria de endpoints (idempotência, DTOs, REST) |
| solid-auditor | Verifica princípios SOLID e design patterns |
| code-smell-detector | Detecta 9 code smells com sugestões |
| react-auditor | Auditoria de componentes React (useEffect, memoization) |

---

## Git Workflow

- Conventional commits (breves e descritivos)
- Nunca incluir "Claude Code" em commit messages

---

## Lições Aprendidas

_Nenhuma entrada ainda. Use `/anti-vibe-coding:lessons-learned add` para registrar._

## Decisões Arquiteturais

Registradas em `.claude/decisions.md`. Use `/anti-vibe-coding:decision-registry list` para consultar.
