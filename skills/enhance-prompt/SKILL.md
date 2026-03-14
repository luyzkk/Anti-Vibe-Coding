---
name: enhance-prompt
description: "This skill should be used when the user asks to 'enhance my prompt', 'optimize start.md', 'add anti-vibe to my plans', 'improve my execution prompt', 'prepare tasks for automation', 'add skills to tasks', or wants to integrate Anti-Vibe Coding into their existing plan/task structure for automated execution by Claude Code."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path or prompt file path (default: current directory)]"
---

# Enhance Prompt — Otimizar Planos, Tasks e Prompts de Execucao

Integrar o Anti-Vibe Coding em estruturas existentes de planos e tasks, e otimizar prompts de execucao automatizada (start.md).

## Contexto

Usuarios organizam trabalho em:
- **Planos** (`.claude/plans/`) — descricao de features/epics
- **Tasks** (`.claude/tasks/`) — passos detalhados de implementacao
- **Prompts de execucao** (start.md, run.md) — instrucoes para Claude executar automaticamente

O Anti-Vibe Coding precisa estar INTEGRADO nessa estrutura para que o Claude consulte skills e execute agents DURANTE a execucao automatizada.

## Fluxo de Execucao

### Passo 1 — Detectar Estrutura do Projeto

Buscar no diretorio do projeto (argumento ou cwd):

```
.claude/plans/       → Planos
.claude/tasks/       → Tasks
.claude/prompt/      → Prompts de execucao
prompt/              → Prompts de execucao (alternativo)
start.md             → Prompt de execucao (raiz)
```

Usar Glob com patterns:
- `.claude/plans/**/*.md`
- `.claude/tasks/**/*.md`
- `.claude/prompt/**/*.md`
- `prompt/**/*.md`
- `start.md`

Classificar o que encontrou:
- **Planos**: arquivos em `plans/` que descrevem features (INDEX.md, overview, specs)
- **Tasks**: arquivos em `tasks/` com instrucoes de implementacao
- **Prompts**: arquivos start.md, run.md ou similares com instrucoes de execucao
- **Progress**: progress.txt ou similar com estado atual

### Passo 2 — Analisar Tasks Existentes

Para cada task encontrada:

1. **Ler o conteudo** da task
2. **Verificar se ja tem** secao `## Anti-Vibe`
3. **Se NAO tem**, classificar o tipo da task e determinar skills/agents relevantes

#### Classificacao Automatica de Tasks

Analisar o conteudo da task e classificar usando estas heuristicas:

| Palavras-chave no conteudo | Tipo detectado | Skills recomendadas | Agents |
|---------------------------|----------------|---------------------|--------|
| migration, CREATE TABLE, ALTER, RLS, policy, index | Database | `security`, `architecture` | database-analyzer |
| edge function, webhook, serve, Deno.env | Edge Function | `api-design`, `security` | api-auditor, security-auditor |
| component, useState, useEffect, React, tsx | React Component | `react-patterns`, `tdd-workflow` | react-auditor |
| endpoint, REST, route, controller, DTO | API | `api-design`, `security` | api-auditor |
| payment, checkout, split, Pagar.me, Stripe, PIX | Pagamentos | `security`, `api-design`, `consultant` | security-auditor |
| auth, login, JWT, token, password, MFA, TOTP | Auth/Security | `security` | security-auditor |
| cache, Redis, TTL, scaling, replication | Infra | `system-design` | database-analyzer |
| refactor, extract, rename, SOLID, pattern | Refactoring | `architecture`, `design-patterns` | solid-auditor, code-smell-detector |
| test, spec, TDD, red-green | Testing | `tdd-workflow` | tdd-verifier |
| hook (React), useMutation, useQuery, TanStack | React Hook | `react-patterns` | react-auditor |
| CORS, CSP, header, sanitize, XSS | Security Headers | `security` | security-auditor |

Se multiplas categorias detectadas, incluir TODAS as skills relevantes.

Se nenhuma categoria clara, usar `consultant` como fallback.

### Passo 3 — Apresentar Analise ao Usuario

Mostrar um resumo organizado:

```
## Analise de Integracao Anti-Vibe Coding

### Estrutura detectada
- X planos em .claude/plans/
- Y tasks em .claude/tasks/
- Z prompts de execucao

### Tasks sem integracao Anti-Vibe (N de Y)

| Task | Tipo detectado | Skills recomendadas | Agents |
|------|---------------|---------------------|--------|
| 01/task-01-create-tables.md | Database | security, architecture | database-analyzer |
| 02/task-01-scaffold-edge-function.md | Edge Function | api-design, security | api-auditor |
| ... | ... | ... | ... |

### Tasks ja com Anti-Vibe (M de Y)
- task-xx.md (ok)

### Prompt de execucao
- [encontrado/nao encontrado] start.md
```

Usar AskUserQuestion com opcoes:

- Opcao 1: "Aplicar em todas as tasks" — adiciona ## Anti-Vibe em todas as tasks que nao tem
- Opcao 2: "Revisar task por task" — mostra cada task e pede aprovacao individual
- Opcao 3: "Apenas criar/atualizar prompt de execucao (start.md)"
- Opcao 4: "Tudo: tasks + planos + prompt de execucao"

### Passo 4 — Aplicar nas Tasks

Para cada task aprovada, adicionar ao FINAL do arquivo (antes de qualquer secao de notas):

```markdown

## Anti-Vibe

### Antes de implementar
- /anti-vibe-coding:<skill-1> - [motivo especifico baseado no conteudo da task]
- /anti-vibe-coding:<skill-2> - [motivo especifico]

### Apos implementar
- Executar agent <agent-name> [se aplicavel, com motivo]
- /anti-vibe-coding:anti-vibe-review
```

**Regras para o conteudo da secao:**
- O motivo DEVE ser especifico para a task, NAO generico
- Exemplo BOM: `/anti-vibe-coding:security` - validar RLS policies e REVOKE/GRANT pattern
- Exemplo RUIM: `/anti-vibe-coding:security` - verificar seguranca
- Incluir `anti-vibe-review` em TODA task de implementacao
- Incluir agents relevantes com descricao do que auditar

### Passo 5 — Aplicar nos Planos

Para cada plano (nao INDEX.md), adicionar ao final:

```markdown

## Anti-Vibe Coding

### Skills recomendadas para este plano
- /anti-vibe-coding:<skill> - [motivo geral baseado no escopo do plano]

### Agents para auditoria pos-implementacao
- <agent-name> - [o que auditar especificamente]

### Observacoes
- [Decisoes que devem passar por /consultant antes de implementar]
- [Riscos de seguranca que exigem /security]
```

### Passo 6 — Criar/Atualizar Prompt de Execucao

Se o usuario pediu prompt de execucao, criar ou atualizar o arquivo.

**Se NAO existe prompt de execucao:**

Perguntar onde criar usando AskUserQuestion:
- `.claude/prompt/start.md`
- `prompt/start.md`
- Local customizado

**Conteudo do prompt de execucao (template adaptavel):**

```markdown
# Instrucoes de Execucao Automatizada

## Setup Inicial
1. Leia `CLAUDE.md` do projeto para entender padroes e stack
2. Leia `.claude/plans/INDEX.md` para o estado geral dos planos
3. Leia `.claude/progress.txt` para gotchas e licoes aprendidas
4. Identifique o proximo plano nao implementado (status != concluido)

## Fluxo por Plano
1. Leia o plano completo (`.claude/plans/<plano>.md`)
2. Leia o README.md das tasks (`.claude/tasks/<plano>/README.md`)
3. Identifique a proxima task pendente

## Fluxo por Task (OBRIGATORIO)

Para CADA task, siga esta ordem EXATA:

### Fase 1: Preparacao
1. Leia o arquivo da task completo
2. Verifique as secoes `Dependencies` e `Gotchas`
3. **Se existir secao `## Anti-Vibe`:**
   - Execute TODOS os comandos em "Antes de implementar" usando a tool Skill
   - Aplique as recomendacoes das skills na implementacao
   - Se a skill recomendar mudanca de abordagem, AJUSTE antes de codar

### Fase 2: TDD (Red -> Green -> Refactor)
4. Crie o arquivo de TESTE primeiro (TDD Red)
   - O TDD Gate vai bloquear edicao de codigo de producao sem teste
5. Implemente o codigo minimo para o teste passar (TDD Green)
6. Refatore mantendo testes verdes

### Fase 3: Validacao
7. Execute `bun run test` — todos os testes devem passar
8. Execute `bun run lint` — sem erros
9. **Se existir secao `## Anti-Vibe`:**
   - Execute TODOS os comandos em "Apos implementar"
   - Agents: use a tool Task com o subagent_type correspondente
10. Verifique os `Criterios de Aceite` da task

### Fase 4: Registro
11. Atualize o status da task para concluido
12. Commit com conventional commit (feat/fix/chore)
13. Se descobrir novos gotchas, registre em progress.txt

## Ao Concluir Todas as Tasks do Plano
1. Atualize o README.md das tasks com status final
2. Atualize o INDEX.md dos planos
3. Execute `bun run test && bun run lint` (validacao final)
4. Push para remote

## Regras Inviolaveis
- NUNCA pule a secao Anti-Vibe de uma task
- NUNCA escreva codigo de producao sem teste (TDD Gate bloqueia)
- NUNCA ignore recomendacoes de skills de seguranca
- Se encontrar conflito entre task e skill, PARE e pergunte ao usuario
- Se entrar em loop de erro (3+ tentativas), PARE e pergunte
```

**Se JA existe prompt de execucao:**

1. Ler o conteudo existente
2. Identificar se ja tem regras Anti-Vibe
3. Se NAO tem: adicionar a secao "Regras Anti-Vibe Coding" e "Fluxo por Task"
4. Se JA tem: verificar se esta completo e sugerir melhorias
5. Apresentar diff ao usuario antes de aplicar

### Passo 7 — Resumo Final

```
## Enhance Prompt — Concluido

### Alteracoes realizadas
- [N] tasks atualizadas com secao ## Anti-Vibe
- [M] planos atualizados com secao ## Anti-Vibe Coding
- [criado/atualizado/nao alterado] prompt de execucao

### Skills mapeadas
- security: X tasks
- react-patterns: Y tasks
- api-design: Z tasks
- ...

### Proximos passos
1. Revisar as secoes Anti-Vibe adicionadas
2. Usar o prompt de execucao para executar os planos
3. O TDD Gate e Skill Advisor funcionam automaticamente durante execucao
```

## Regras Importantes

- **NUNCA** alterar o conteudo existente das tasks (apenas ADICIONAR secao Anti-Vibe)
- **NUNCA** remover informacoes dos planos (apenas ADICIONAR secao Anti-Vibe Coding)
- **SEMPRE** mostrar preview antes de modificar qualquer arquivo
- **SEMPRE** basear recomendacoes no conteudo REAL da task, nao em suposicoes
- Se uma task ja tem `## Anti-Vibe`, verificar se esta completa antes de pular
- O prompt de execucao deve ser ADAPTADO ao projeto (ler CLAUDE.md para entender stack, test runner, linter)

## Diretorio do projeto

$ARGUMENTS
