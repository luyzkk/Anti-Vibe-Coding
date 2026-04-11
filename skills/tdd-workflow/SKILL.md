---
name: tdd-workflow
description: "Adaptive 7-step TDD workflow with automatic level detection (guided/assisted/direct). Enforces test-first discipline with RED-GREEN-REFACTOR cycle, naive-first implementation, context isolation, and vertical slices. Use for new features, bug fixes, or refactoring with test-driven development."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, Agent
argument-hint: "[feature description]"
---

# TDD Workflow — Anti-Vibe Coding

Workflow TDD adaptativo de 7 passos. Seguir EXATAMENTE esta sequencia.

---

## IA-TDD — Deteccao Automatica de Nivel

Detectar o nivel sem perguntar. Usar estes sinais:

| Sinal detectado | Nivel inferido |
|----------------|----------------|
| Dev descreve feature em linguagem natural sem mencionar testes | Nivel 1 — Guiado |
| Dev descreve requisitos + identifica alguns edge cases | Nivel 2 — Assistido |
| Dev cola ou referencia um teste que ele mesmo escreveu | Nivel 3 — Direto |
| `user_profile` na memoria do projeto registra nivel | Usar nivel registrado |

Dev pode forcar nivel explicitamente a qualquer momento:
- "quero TDD guiado" → Nivel 1
- "quero TDD direto" → Nivel 3
- "quero TDD assistido" → Nivel 2

### Nivel 1: IA-TDD Guiado (Iniciante/Junior)

Fluxo quando dev descreve feature sem mencionar testes:

1. IA propoe UM unico teste e EXPLICA:
   - O que o teste verifica (comportamento, nao implementacao)
   - Por que importa (qual bug ou regressao previne)
   - Como se chama o padrao (happy path, edge case, boundary, etc.)
   - Conexao com testes anteriores (se existirem)
2. Dev valida: "sim" / "nao entendi" / propoe cenario alternativo
   - Se "nao entendi" → sugerir /anti-vibe-coding:learn para o conceito em questao
3. IA implementa codigo minimo para o teste passar
4. IA propoe o proximo teste — Repetir ate cobertura completa

**Regra:** UM teste por ciclo. Nunca propor 3 testes de uma vez no Nivel 1.

### Nivel 2: IA-TDD Assistido (Intermediario)

Fluxo quando dev descreve requisitos com edge cases identificados:

1. Dev descreve requisitos com edge cases que ja identifica
2. IA gera 1-3 testes por vez (nao todos de uma vez)
3. Dev revisa com olhar critico, adiciona cenarios que faltaram
4. CONTEXT ISOLATION:
   - Subagente RED escreve os testes (recebe requisitos + codigo existente)
   - Subagente GREEN implementa (recebe APENAS testes, nao os requisitos)
5. Dev valida resultado — Repetir com proximo conjunto de requisitos

### Nivel 3: IA-TDD Direto (Avancado)

Fluxo quando dev ja escreve testes:

1. Dev escreve UM teste falhando
2. IA implementa codigo minimo para passar
3. Dev escreve proximo teste — Repetir

IA nao propoe testes no Nivel 3, apenas implementa.

---

## Vertical Slices como Unidade de Trabalho

No IA-TDD, a unidade de trabalho e o slice vertical — nao o modulo ou a camada.

Um slice atravessa todas as camadas necessarias para um comportamento funcionar:
`test → service → API → UI` (quando aplicavel)

**Tracer Bullet — Primeiro Slice Obrigatorio**
Antes de qualquer feature, implementar o caminho mais fino de ponta a ponta:
- Objetivo: confirmar que o ciclo completo funciona (CI, deploy, integracao)
- Tracer bullet NAO precisa ter logica de negocio — apenas "encanamento" funcionando
- Teste do tracer: chama o endpoint → recebe resposta (mesmo que vazia)
- Somente apos o tracer verde → implementar slices com logica real

**Slices subsequentes:** cada slice adiciona um comportamento observavel, nao uma camada:
- Ruim: "implementar toda a camada de repositorio"
- Bom: "usuario autenticado pode criar uma tarefa e ela aparece na listagem"

---

## Deep Modules na Fase RED

Ao projetar a interface de um modulo (durante a fase RED), aplicar o principio de Ousterhout:

> "Que interface eu gostaria de usar?" — nao "como vou implementar isso?"

Sinal de interface bem projetada: o teste NAO sabe detalhes internos.
- Se o teste precisa configurar 5 objetos para testar 1 comportamento → modulo raso (shallow)
- Se o teste chama 1 metodo e verifica 1 resultado → modulo profundo (deep)

Se ao escrever testes voce perceber que precisa expor detalhes de implementacao:
→ Redesenhe a interface antes de implementar

Referencia completa: `skills/tdd-workflow/references/deep-modules.md`

---

## Context Isolation RED/GREEN

Aplicavel no Nivel 2 (Assistido) e opcional no Nivel 3 (Direto).

Principio: o agente que implementa nao deve "ver" os requisitos em texto natural.
A unica fonte da verdade para implementacao sao os testes.

**Subagente RED (escreve testes):**
- Recebe: requisitos da task + codigo existente
- Produz: arquivos de teste que FALHAM por assertion
- NAO produz codigo de producao

**CONTEXTO ZERADO**

**Subagente GREEN (implementa):**
- Recebe: APENAS os testes criados pelo RED + codigo existente
- NAO recebe: requisitos em texto natural, descricao da task
- Produz: codigo minimo para os testes passarem
- Regra: arquivos `*.test.*` e `*.spec.*` sao read-only (ancoras imutaveis)

**Quando usar:** feature com 3+ criterios de aceite distintos, logica critica (financeiro, auth, permissoes), quando o dev quer design emergente garantido.

**Quando NAO usar:** features simples com 1-2 criterios, CRUD basico sem logica.

Nota: context isolation depende do TDD Gate (plano 05) para bloquear edicao de testes durante GREEN. Se nao ativo, as instrucoes no prompt do subagente GREEN sao a unica barreira.

---

## Deteccao: Test-First vs Test-Driven

**Test-First:** todos os testes antes de qualquer implementacao (antipadrao com IA — permite que a IA "cole" mentalmente da suite, sem design emergente).
**Test-Driven:** UM teste → implementa → repete (correto).

Se em um unico ciclo forem adicionados 2+ testes novos simultaneamente → alertar (suave):

> "Voce acabou de adicionar [N] testes de uma vez. TDD real recomenda 1 teste por ciclo para o design emergir incrementalmente. Quer que eu guie teste a teste?"

Enforcement via config: `config/tdd-gate.json → max_tests_per_cycle: 1` para bloqueio real via hook.

**Excecoes aceitas:** testes de regressao para bug conhecido (conjunto fixo ja mapeado), migracao de codigo legado (capturar comportamento existente).

---

## AI Judge — Quando Sugerir

O AI Judge e um segundo LLM que valida conformidade TDD em tempo real. Consome ~2.5x tokens — NAO e o padrao.

**Quando sugerir:**
- Feature com 3+ slices verticais
- Feature critica: financeiro, autenticacao, permissoes, dados pessoais
- Dev expressou incerteza sobre se o TDD esta sendo seguido

**Como sugerir:**
> "Esta feature tem [N] slices e envolve [area critica]. O AI Judge pode validar conformidade TDD em tempo real, mas consome ~2.5x mais tokens. Ativar?"

Dev decide: sim → ativar `config/tdd-gate.json → mode: "ai-judge"` / nao → continuar com regex.

Referencia: plano 05 documenta o mecanismo tecnico do AI Judge.

---

## Piramide Invertida com IA

A piramide classica (muitos unit, poucos E2E) foi projetada para times humanos.
Com IA, o ROI por camada inverte — nao em quantidade, mas em QUEM LIDA COM CADA CAMADA:

| Camada | Quem escreve | Observacao |
|--------|-------------|------------|
| Unit — regras de negocio | Humano define, IA implementa | Mais critico: humano especifica via testes |
| Unit — infra/utils | IA pode gerar | Questionar se vale testar (ex: getter trivial) |
| Component | IA funciona bem | Protocolo-based com DSLs legiveis |
| E2E | IA brilha — melhor ROI | User Story → Example Mapping → Gherkin → E2E |

Ao entrar no Nivel 1 ou 2: inferir se a feature tem comportamento de negocio (priorizar unit com humano definindo criterios) ou e um fluxo de usuario (considerar comecar com E2E via Gherkin).

Referencia completa: `skills/tdd-workflow/references/test-pyramid-ai.md`

---

<decision-tree>
## Classificacao de Complexidade (Modo Classico)

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

<step id="4" name="TDD Green — Implementacao Minima (Naive First)">
<instructions>
- Somente apos aprovacao dos testes pelo desenvolvedor
- Escrever a implementacao mais NAIVE e DIRETA que faz os testes passarem
- Nada mais, nada menos — codigo minimo
- NUNCA otimize na fase GREEN — codigo feio que passa nos testes e melhor que codigo elegante nao validado
- Se existem 2 abordagens: escolha a mais simples, mesmo que "inelegante"
</instructions>
<verification>
Executar os testes para confirmar que passam: `bun run test`
Expectativa: testes devem PASSAR (Green phase)
</verification>
<context>
**Token economy**: Se os testes ainda falharem, o dev pode executar no proprio terminal e compartilhar apenas a linha de erro relevante
</context>
</step>

<step id="5" name="Refatoracao (Optimize with Safety Net)">
<instructions>
- Codigo passou nos testes? Agora otimize preservando a suite verde
- Principio Karpathy: "Write the naive algorithm first, then optimize while preserving correctness"
- Extrair logicas complexas para Services ou modulos dedicados
- Otimizar queries lentas
- Delegar operacoes pesadas para background jobs
- Compare complexidade antes/depois — se a refatoracao nao melhora claramente, mantenha o naive
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
- NUNCA adicionar 2+ testes em um unico ciclo sem alertar sobre test-first vs test-driven
- Sugerir AI Judge quando feature tiver 3+ slices ou for critica (financeiro, auth, permissoes)
- Para features de regras de negocio: humano especifica via testes — IA nao propoe requisitos de negocio
- Para features E2E: User Story → Example Mapping → Gherkin e o fluxo de maior ROI com IA
</constraints>

## Feature solicitada

$ARGUMENTS
