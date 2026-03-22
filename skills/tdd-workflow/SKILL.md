---
name: tdd-workflow
description: "This skill should be used when the user asks to 'start TDD', 'implement with tests first', 'follow TDD workflow', 'write tests before code', 'red green refactor', or mentions test-driven development for a new feature, bug fix, or refactoring. Provides a 7-step adaptive TDD workflow that classifies complexity and enforces test-first discipline."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
argument-hint: "[feature description]"
---

# TDD Workflow — Anti-Vibe Coding

Workflow TDD adaptativo de 7 passos. Seguir EXATAMENTE esta sequencia.

<decision-tree>
## Classificacao de Complexidade

Antes de iniciar, classificar a tarefa:

| Nivel | Criterio | Adaptacao |
|-------|----------|-----------|
| **Baixa** | Funcao pura, sem I/O, sem dependencias | Combinar passos 3-4 |
| **Media** | Multiplos arquivos, API calls, estado | Seguir todos os 7 passos |
| **Alta** | Decisoes arquiteturais, integracoes, schema | Exigir Fase Zero (`/anti-vibe-coding:consultant`) antes |

Se complexidade = Alta, direcionar para `/anti-vibe-coding:consultant` primeiro.
</decision-tree>

## Os 7 Passos

<step id="1" name="Investigacao e Contexto">
<instructions>
- Reler o CLAUDE.md e `senior-principles.md` do projeto
- Entender a stack, diretorios, padroes vigentes
- Se algo nao estiver claro, PERGUNTAR antes de escrever qualquer codigo
- Verificar se existem testes similares como referencia
</instructions>
</step>

<step id="2" name="Fundacao">
<instructions>
- Gerar ou atualizar arquivos de infraestrutura necessarios (dependencias, configs, env vars)
- Atualizar CLAUDE.md se a nova feature exigir novos padroes
- Nao escrever codigo de producao aqui
</instructions>
</step>

<step id="3" name="TDD Red — Testes Primeiro">
<instructions>
- Escrever APENAS os testes para a funcionalidade solicitada
- Usar mocks e stubs conforme necessario
- Os testes DEVEM falhar (fase Red)
- NAO escrever codigo de producao nesta etapa
</instructions>
<verification>
Executar os testes para confirmar que falham: `bun run test`
Expectativa: testes devem FALHAR (Red phase)
</verification>
<context>
**Token economy**: Se houver erros de configuracao, solicitar ao dev que execute no proprio terminal e compartilhe apenas as linhas de erro relevantes (~20 tokens vs ~500 tokens com output completo)
</context>
</step>

<step id="4" name="TDD Green — Implementacao Minima">
<instructions>
- Somente apos aprovacao dos testes pelo desenvolvedor
- Escrever o codigo ESTRITAMENTE necessario para fazer os testes passarem
- Nada mais, nada menos — codigo minimo
</instructions>
<verification>
Executar os testes para confirmar que passam: `bun run test`
Expectativa: testes devem PASSAR (Green phase)
</verification>
<context>
**Token economy**: Se os testes ainda falharem, o dev pode executar no proprio terminal e compartilhar apenas a linha de erro relevante
</context>
</step>

<step id="5" name="Refatoracao">
<instructions>
- Codigo passou nos testes? Agora otimizar
- Extrair logicas complexas para Services ou modulos dedicados
- Otimizar queries lentas
- Delegar operacoes pesadas para background jobs
</instructions>
<verification>
Executar os testes para confirmar que CONTINUAM passando: `bun run test`
</verification>
</step>

<step id="6" name="Interface">
<instructions>
- Somente apos backend e testes estarem solidos
- Gerar a camada de visualizacao (frontend, API publica, bots)
- Se aplicavel, escrever testes de integracao/E2E
</instructions>
</step>

<step id="7" name="Validacao Final">
<instructions>
- Executar linters: `bun run lint`
- Executar analise estatica se disponivel
- Executar a suite de testes completa do modulo: `bun run test`
- Em monorepo, rodar testes dos modulos dependentes
</instructions>
<verification>
`bun run test && bun run lint` — todos devem passar sem erros.
</verification>
<context>
**Staged/Unstaged Review**: Antes de solicitar `/anti-vibe-coding:anti-vibe-review`, deixar as alteracoes em staged (`git add`). Ao receber sugestoes de melhoria, pedir que sejam aplicadas como unstaged — isso permite comparar o antes/depois com `git diff` sem perder o trabalho original.

Sugerir ao desenvolvedor executar `/anti-vibe-coding:anti-vibe-review`.
</context>
</step>

<constraints>
## Regras Inviolaveis

- NUNCA gerar codigo de producao e testes ao mesmo tempo — testes escritos depois tendem a validar a implementacao, nao o comportamento esperado
- NUNCA pular a etapa de testes para "ganhar tempo" — divida tecnica acumula juros exponenciais
- Se o humano pedir funcionalidade sem mencionar testes, avisar e criar os testes primeiro
- Se entrar em loop de erro (3+ tentativas falhando), PARAR e informar o desenvolvedor
- Testar **comportamento**, nao implementacao
- Usar verbos em terceira pessoa nos nomes de teste (nao usar "should")
</constraints>

## Feature solicitada

$ARGUMENTS
