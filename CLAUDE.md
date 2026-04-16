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

Anti-Sycophancy:
- Quando um pedido tem forma mais simples que o especificado, apresente a alternativa
- Quando uma premissa do usuário parece incorreta, verifique e corrija antes de implementar
- Quando uma abstração parece prematura (uso único), diga
- Concordar silenciosamente com algo errado não é ser prestativo — é ser negligente

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

### Pipeline v5.0

Fluxo opcional conectando skills em sequencia:
```
grill-me → write-prd → plan-feature → execute-plan → verify-work
```
Cada skill funciona standalone. O pipeline é atalho, não obrigação.

Artefatos de Pipeline:
- Artefatos em `.planning/` (CONTEXT, PRD, PLAN, STATE, SUMMARY, plano{NN}/) são **temporários**
- Após `/verify-work`, o código é a fonte de verdade — artefatos servem para rastrear processo
- Não crie documentos para explicar outros documentos — se precisa de resumo, adicione seção no doc original
- Se um artefato existe APENAS para explicar ou resumir outro, delete e corrija o original

Estrutura hierárquica (v2):
```
.planning/
├── PLAN-{feature}.md         ← Overview (grafo entre planos)
├── STATE-{feature}.md        ← Tracking global por plano
├── plano01/
│   ├── README.md             ← Overview do plano + dependências
│   ├── MEMORY.md             ← Memória viva (bugs, decisões, gotchas)
│   └── fase-01-{nome}.md    ← Tasks detalhadas com snippets e checklist
├── plano02/ ...
└── SUMMARY-{feature}.md      ← Gerado ao concluir todos os planos
```
- Planos são gerados sob demanda (um por vez, em contexto isolado)
- MEMORY.md é preenchida DURANTE execução e destilada ao final via /lessons-learned

Entradas alternativas:
- `/grill-me` → pode alimentar `/write-prd` ou ser standalone
- `/design-twice` → pode alimentar `/plan-feature` ou ser standalone
- `/consultant` → continua existindo para consultas sem pipeline
- `/tdd-workflow` → continua existindo para implementação direta
- `/learn` → pode ser invocado a qualquer momento

### IA-TDD (v5.0)

3 níveis adaptativos detectados automaticamente:
- **Guiado** (dev sem testes) — IA propõe 1 teste por vez com explicação
- **Assistido** (dev com edge cases) — IA gera 1-3 testes, context isolation RED/GREEN
- **Direto** (dev escreve testes) — IA apenas implementa

AI Judge sugerido para features com 3+ slices ou áreas críticas (auth, financeiro).

### Skills Disponíveis

| Skill | Comando | Propósito |
|-------|---------|-----------|
| Init | `/anti-vibe-coding:init` | Setup inicial e atualização do plugin |
| Update | `/anti-vibe-coding:update` | Detecta e aplica atualizações incrementais |
| Sync | `/anti-vibe-coding:sync` | Invalida cache e mostra status de versão |
| Consultor | `/anti-vibe-coding:consultant` | Fase Zero — ensina antes de codar |
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Workflow adaptativo com IA-TDD (v5) |
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
| Aprendizado | `/anti-vibe-coding:learn` | Explicações adaptativas + contexto de pipeline |
| **Grill Me** | `/anti-vibe-coding:grill-me` | **[v5] Entrevista implacável pré-implementação** |
| **Design Twice** | `/anti-vibe-coding:design-twice` | **[v5] Exploração paralela de soluções divergentes** |
| **Write PRD** | `/anti-vibe-coding:write-prd` | **[v5] Especificação interativa de features** |
| **Plan Feature** | `/anti-vibe-coding:plan-feature` | **[v5.1] Plano hierárquico com análise semântica de complexidade** |
| **Execute Plan** | `/anti-vibe-coding:execute-plan` | **[v5.1] Execução por planos com memória e transição interativa** |
| **Verify Work** | `/anti-vibe-coding:verify-work` | **[v5] Verificação pós-execução com auditoria completa** |

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
| **plan-executor** | **[v5] Executa tasks individuais com TDD obrigatório** |
| **plan-verifier** | **[v5] Verifica output de tasks (read-only, JSON output)** |
| **design-explorer** | **[v5] Proposta arquitetural com restrição específica** |

---

## Model Profiles

O plugin suporta perfis de modelo que otimizam custo vs qualidade por agente.

### Perfis Disponíveis

| Perfil | Descrição | Uso recomendado |
|--------|-----------|-----------------|
| quality | Opus para auditores críticos, Sonnet para o resto | Features críticas, releases, auditorias de segurança |
| balanced | Sonnet para auditores críticos, Haiku para o resto | Desenvolvimento diário (default) |
| budget | Sonnet apenas para segurança e execução, Haiku para o resto | Trabalho não-crítico, protótipos |

### Como configurar

Editar `config/model-profiles.json`:
- Trocar perfil ativo: alterar campo `"default"` para `"quality"`, `"balanced"` ou `"budget"`
- Customizar por agente: editar modelo de um agente específico dentro do perfil

### Como funciona

1. Skills leem `config/model-profiles.json` ao invocar agentes
2. Resolvem o modelo do agente baseado no perfil ativo
3. Passam o modelo via parâmetro `model` do Agent tool
4. Se config não existir, usa modelo do frontmatter do agente (backward compat)

Detalhes técnicos em `skills/lib/model-profile-utils.md`.

---

## Git Workflow

- Conventional commits (breves e descritivos)
- Nunca incluir "Claude Code" em commit messages

---

## Lições Aprendidas

_Nenhuma entrada ainda. Use `/anti-vibe-coding:lessons-learned add` para registrar._

## Decisões Arquiteturais

Registradas em `.claude/decisions.md`. Use `/anti-vibe-coding:decision-registry list` para consultar.
