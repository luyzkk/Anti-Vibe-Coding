---
name: tdd-workflow
description: "Workflow TDD adaptativo de 7 passos do Anti-Vibe Coding. Use quando iniciar implementação de nova funcionalidade, bug fix ou refatoração significativa. Adapta rigor baseado na complexidade."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
argument-hint: "[feature description]"
---

# TDD Workflow — Anti-Vibe Coding

Você está executando o workflow TDD adaptativo. Siga EXATAMENTE esta sequência.

## Classificação de Complexidade

Antes de iniciar, classifique a tarefa:

| Nível | Critério | Adaptação |
|-------|----------|-----------|
| **Baixa** | Função pura, sem I/O, sem dependências | Pode combinar passos 3-4 |
| **Média** | Múltiplos arquivos, API calls, estado | Siga todos os 7 passos |
| **Alta** | Decisões arquiteturais, integrações, schema | Exige Fase Zero (consultant) antes |

Se complexidade = Alta, instrua o usuário a usar `/anti-vibe-coding:consultant` primeiro.

## Os 7 Passos

### Passo 1 — Investigação e Contexto
- Releia o CLAUDE.md do projeto
- Entenda a stack, diretórios, padrões vigentes
- Se algo não estiver claro, PERGUNTE antes de escrever qualquer código
- Verifique se existem testes similares como referência

### Passo 2 — Fundação
- Gere ou atualize arquivos de infraestrutura necessários (dependências, configs, env vars)
- Atualize CLAUDE.md se a nova feature exigir novos padrões
- Não escreva código de produção aqui

### Passo 3 — TDD Red (Testes Primeiro)
- Escreva APENAS os testes para a funcionalidade solicitada
- Use mocks e stubs conforme necessário
- Os testes DEVEM falhar (fase Red)
- NÃO escreva código de produção nesta etapa
- Execute os testes para confirmar que falham: `bun run test`

### Passo 4 — TDD Green (Implementação Mínima)
- Somente após aprovação dos testes pelo desenvolvedor
- Escreva o código ESTRITAMENTE necessário para fazer os testes passarem
- Nada mais, nada menos — código mínimo
- Execute os testes para confirmar que passam: `bun run test`

### Passo 5 — Refatoração
- O código passou nos testes? Agora otimize
- Extraia lógicas complexas para Services ou módulos dedicados
- Otimize queries lentas
- Delegue operações pesadas para background jobs
- Execute os testes para confirmar que CONTINUAM passando

### Passo 6 — Interface
- Somente após backend e testes estarem sólidos
- Gere a camada de visualização (frontend, API pública, bots)
- Se aplicável, escreva testes de integração/E2E

### Passo 7 — Validação Final
- Execute linters: `bun run lint`
- Execute análise estática se disponível
- Execute a suíte de testes completa do módulo: `bun run test`
- Em monorepo, rode testes dos módulos dependentes
- Sugira ao desenvolvedor executar `/anti-vibe-coding:anti-vibe-review`

## Regras Invioláveis

- NUNCA gere código de produção e testes ao mesmo tempo
- NUNCA pule a etapa de testes para "ganhar tempo"
- Se o humano pedir funcionalidade sem mencionar testes, avise-o e crie os testes primeiro
- Se entrar em loop de erro (3+ tentativas falhando), PARE e informe o desenvolvedor
- Teste **comportamento**, não implementação
- Use verbos em terceira pessoa nos nomes de teste (não use "should")

## Feature solicitada

$ARGUMENTS
