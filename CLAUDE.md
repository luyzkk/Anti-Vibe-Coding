# CLAUDE.md

Este arquivo é a **fonte de verdade absoluta** do projeto. Leia-o INTEGRALMENTE antes de iniciar qualquer ciclo de trabalho.

---

## Filosofia de Trabalho (Anti-Vibe Coding)

Você opera sob os princípios do Extreme Programming (XP):
- **O humano é o Navegador** (define arquitetura, limites e regras de negócio)
- **Você é o Piloto** (executa com disciplina dentro dos limites definidos)
- **Disciplina > Velocidade.** Código correto e testado, não código rápido e descartável

Regras invioláveis:
- NUNCA pratique "Vibe Coding" — código sem arquitetura prévia gera retrabalho exponencial
- NUNCA entregue sistema inteiro em uma única resposta — contexto se polui e erros passam despercebidos
- NUNCA gere código de produção e testes ao mesmo tempo — testes escritos depois tendem a validar a implementação, não o comportamento esperado
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
- Strict mode. Use `unknown` e narrow com type guards (`any` desativa toda type-safety e esconde bugs silenciosos). Quase nunca `as`
- SEMPRE named exports
- Prefira `type` sobre `interface`
- Prefira `await/async` sobre `.then()`

> **Padrões detalhados** carregam automaticamente via rules ao editar arquivos `.ts`, `.test.*` ou `api/`.

---

## Workflow de Desenvolvimento

Siga EXATAMENTE esta sequência ao construir funcionalidades:

1. **Investigação** — Releia CLAUDE.md e `senior-principles.md`, entenda contexto, pergunte se algo não estiver claro
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
- NUNCA mude padrões arquiteturais sem consultar este arquivo e questionar o dev — decisões arquiteturais são irreversíveis e afetam todo o projeto

---

## Anti-Patterns (NUNCA faça)

- Fat Controllers ou Fat Models (>100 linhas)
- Conexão direta a banco sem camada de repositório/ORM
- Acoplar regras de negócio em Views ou Controllers
- Ignorar edge cases e tratamento de erros
- Pular testes para "ganhar tempo"
- Gerar código sem antes entender o contexto

---

## Conhecimento Sênior

Princípios always-on extraídos de 60+ documentos técnicos.
Resumo completo em `senior-principles.md`. Detalhes nas skills dedicadas.

> **Rules automáticas** detectam violações ao editar arquivos. Veja `.claude/rules/`.

---

## Versionamento e Atualizações

O plugin usa **versionamento automático** para manter seu projeto sincronizado.

### Como Funciona

1. **Na instalação inicial:** `/anti-vibe-coding:init` cria `.claude/.anti-vibe-manifest.json`
2. **Em atualizações:** Roda `/anti-vibe-coding:init` novamente e ele detecta mudanças
3. **Rastreamento:** Todos os arquivos (CLAUDE.md, rules, agents, hooks) têm checksums
4. **Invalidação de cache:** Hook automático ao abrir projeto + comando `/anti-vibe-coding:sync`

### Estratégias de Atualização

| Arquivo | Estratégia | Comportamento |
|---------|------------|---------------|
| CLAUDE.md | **Merge** | Preserva modificações + adiciona novos princípios |
| senior-principles.md | **Replace** | Substitui (é documentação oficial) |
| rules/*.md | **Merge** | Preserva rules customizadas + adiciona novas |
| hooks/*.cjs | **Replace** | Substitui (lógica crítica) |
| agents/*.md | **Replace** | Substitui (prompts oficiais) |
| decisions.md | **Never** | Nunca toca (é do projeto) |

### Comandos

- `/anti-vibe-coding:init` — Instalar ou atualizar
- `/anti-vibe-coding:update` — Verificar status de atualizações
- `/anti-vibe-coding:sync` — Invalidar cache e mostrar versões

**Invalidação de cache:**
- Hook automático detecta plugin atualizado ao abrir projeto
- Mostra aviso: "⚠️ Plugin atualizado! Rodar /init"

**Backup automático:** Tudo vai para `.claude/backups/YYYY-MM-DD/` antes de modificar.

---

## Plugin Anti-Vibe Coding

### Skills Disponíveis

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Init | `/anti-vibe-coding:init` | Setup inicial e atualização do plugin |
| Update | `/anti-vibe-coding:update` | Detecta e aplica atualizações incrementais |
| Sync | `/anti-vibe-coding:sync` | Invalida cache e mostra status de versão |
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
| Infrastructure | `/anti-vibe-coding:infrastructure` | DNS, hosting, deploy, CDN, serverless |
| Aprendizado | `/anti-vibe-coding:learn` | Explicações adaptativas (básico/intermediário/avançado) |

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
| infrastructure-auditor | Auditoria de infra (DNS, deploy, Docker, health checks) |

---

## Git Workflow

- Conventional commits (breves e descritivos)
- Nunca incluir "Claude Code" em commit messages

---

## Lições Aprendidas

_Nenhuma entrada ainda. Use `/anti-vibe-coding:lessons-learned add` para registrar._

## Decisões Arquiteturais

Registradas em `.claude/decisions.md`. Use `/anti-vibe-coding:decision-registry list` para consultar.
