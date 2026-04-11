---
name: execute-plan
description: "Executa PLAN.md task por task usando subagentes com isolamento de contexto. Le plano e estado, identifica a wave atual, spawna subagentes paralelos (independentes) ou sequenciais (dependentes), aplica TDD com isolamento RED/GREEN e atualiza STATE.md apos cada task."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion
argument-hint: "[caminho do PLAN.md ou nome da feature] [--wave N] [--task N.M.K]"
---

# Execute Plan — Execucao de Plano com Subagentes

Skill de execucao. Le PLAN.md e STATE.md, spawna subagentes para cada task com isolamento de contexto, aplica TDD obrigatorio e mantém STATE.md atualizado.

Diferenca das outras skills:
- **plan-feature**: gera PLANO de execucao (como construir, em que ordem)
- **execute-plan**: executa o plano task por task com subagentes isolados
- **verify-work**: verifica se output de uma task atende criterios do plano

---

## Step 1 — Ler Plano

### Caminho A: Caminho fornecido como argumento

```
1. Se o dev passou caminho (/execute-plan "path/to/PLAN.md"):
   - Ler com Read
   - Validar que contem estrutura de PLAN (waves, slices, tasks)
   - Se nao for PLAN valido: "Este arquivo nao parece ser um PLAN.md. Quer criar com /plan-feature?"
2. Prosseguir para Step 2
```

### Caminho B: Buscar em .planning/

```
1. Se nao forneceu caminho:
   - Glob: ".planning/PLAN-*.md"
   - Se 1 arquivo: ler diretamente, confirmar: "Encontrei PLAN-{name}.md. Vou executar."
   - Se mais de 1: listar e perguntar qual executar
2. Prosseguir para Step 2
```

### Caminho C: PLAN nao existe

```
1. Informar: "Nao encontrei nenhum PLAN.md em .planning/."
2. Oferecer: "Quer criar um com /plan-feature?"
3. Encerrar (nao improvise execucao sem plano)
```

---

## Step 2 — Ler ou Criar STATE.md

Nome esperado: `.planning/STATE-{feature-name}.md` (mesmo kebab-case do PLAN.md).

### Se STATE.md existe:

```
Ler e verificar a fase atual:

Fase "completed":
  - "Este plano ja foi completado em {date}. Quer ver o SUMMARY.md?"
  - Encerrar (nao re-executar sem confirmacao explicita)

Fase "paused":
  - Mostrar: wave atual, tasks feitas, bloqueios registrados
  - AskUserQuestion: "Retomar de onde parou (Wave {N}, Task {task})?" ou "Reiniciar da Wave 1?"

Fase "planned" ou "in-progress":
  - Carregar contexto: wave atual, tasks done, proxima task
  - Prosseguir para Step 3
```

### Se STATE.md nao existe:

```
1. Criar a partir do template templates/STATE.md
2. Preencher com dados do PLAN.md:
   - phase: planned
   - wave: 0
   - total_waves: {N do plano}
   - tasks_done: 0
   - tasks_total: {total de tasks}
   - started: hoje
3. Popular tabela de Progress com todas as tasks (status: pending)
4. Salvar
5. Prosseguir para Step 3
```

---

## Step 3 — Identificar Wave e Confirmar

### 3a. Determinar wave a executar:

```
Se STATE.md tinha fase "paused":
  - Wave = wave atual do STATE
  - Primeira task pendente dessa wave

Se STATE.md foi criado agora (fase "planned"):
  - Wave = 1
  - Primeira task: Tracer Bullet (Slice 1.1, Task 1.1.1)

Se dev passou --wave N:
  - Validar que Wave N existe no PLAN.md
  - Validar que Wave N-1 esta completa (ou pular com aviso)
  - Wave = N

Se dev passou --task N.M.K:
  - Executar apenas essa task especifica
  - Sem wave context (modo pontual)
```

### 3b. Apresentar confirmacao ao dev:

```
Mostrar antes de executar:

"Vou executar Wave {N} ({M} slices, {K} tasks):

Tracer Bullet (Slice 1.1): [descricao]
Tasks independentes: {lista}
Tasks sequenciais: {lista com dependencias}

Subagentes necessarios: {estimativa}
Modelo: {do model-profiles.json}"

AskUserQuestion com opcoes:
  - "Executar agora"
  - "Executar apenas o Tracer Bullet (Slice 1.1)"
  - "Pausar e revisar o plano"
  - "Ajustar wave antes de executar"
```

---

## Step 4 — Executar Tasks da Wave

Ver `references/wave-execution.md` para conceitos detalhados.

### 4a. Classificar tasks:

```
Para cada task na wave atual:

Independentes (sem "Depends on"):
  - Podem ser executadas em paralelo
  - Limite: max 5 subagentes simultaneos

Dependentes ("Depends on: Task N.M.K"):
  - Executar APOS task de dependencia concluir
  - Nunca em paralelo com sua dependencia

Ordem dentro de um slice (TDD obrigatorio):
  - Task de teste (Red) → task de implementacao (Green) → task de UI/refactor
  - Nunca pular a ordem TDD dentro de um slice
```

### 4b. Spawn de Subagentes Paralelos:

```
Para tasks independentes (ate 5 em paralelo):

Spawn do agent plan-executor com contexto:
  - PLAN.md completo
  - Task especifica com Files, Action, Verify, Complexity
  - Padrao de codigo existente (arquivo relacionado mais proximo)
  - Estado atual (STATE.md)
  - Instrucao: "Execute APENAS esta task. Siga TDD. Commit atomico."
  - Instrucao: "Narre cada passo antes de executar no formato: Step N/M: [acao] → verify: [criterio]. Sinalize achados inesperados ANTES de adaptar."

Nao passar para o subagente:
  - Requisitos do PRD (o subagente ve apenas a task)
  - Outras tasks da wave
  - Contexto de decisoes arquiteturais

Aguardar todos completarem antes de prosseguir para 4d.
```

### 4c. Execucao Sequencial para Tasks Dependentes:

```
Para cada task com dependencia:
  1. Verificar que task de dependencia esta com status "done" no STATE
  2. Spawn de subagente com mesmo contexto de 4b
  3. Aguardar conclusao antes de spawnar proximo
  4. Se dependencia falhou: marcar task como "blocked", registrar no STATE
```

### 4d. Contexto Isolado RED/GREEN (TDD):

```
Para tasks de TESTE (primeiro task de cada slice TDD):

Subagente RED:
  - Recebe: especificacao da task (Files, Action, Verify)
  - NAO recebe: implementacao existente, outros testes
  - Deve produzir: teste que FALHA por assertion failure (nao compilation error)
  - Registrar: .tdd-phase.json com {"phase": "red", "task": "N.M.K", "test_file": "path"}
  - Output deve confirmar: "Teste falha com: [mensagem de assertion]"

Subagente GREEN (apos RED confirmar falha):
  - Recebe: APENAS os arquivos de teste do RED (nao os requisitos)
  - Recebe: .tdd-phase.json para saber que e fase GREEN
  - NAO recebe: PRD, historia do usuario, "o que deve fazer"
  - Deve produzir: codigo minimo que faz o teste passar
  - Anchor imutavel: NUNCA modificar testes para faze-los passar
  - Registrar: .tdd-phase.json com {"phase": "green", "task": "N.M.K"}
  - Output deve confirmar: "Teste passa: [resultado de bun test]"

Se GREEN falhar apos 3 tentativas:
  - Marcar task como "blocked"
  - Registrar no STATE.md com erro
  - Continuar com proximas tasks independentes
```

### 4e. Coletar Resultados:

```
Apos cada subagente completar:
  1. Ler output do subagente
  2. Verificar status: done | partial | blocked
  3. Atualizar STATE.md imediatamente (read-before-write):
     - Mudar status da task
     - Incrementar tasks_done se done
     - Registrar bloqueio se blocked
  4. Se partial: registrar o que foi feito e o que falta

Apos todos os subagentes da wave terminarem:
  - Executar: bun run test
  - Se testes falham: registrar no STATE, acionar retry ou escape hatch
```

---

## Step 4 — Retries e Recuperacao

### Niveis de Retry (max 3):

```
Nivel 1 — Mesmo contexto + mensagem de erro:
  - Spawn novo subagente com output de erro do anterior
  - "Tente novamente. O erro anterior foi: {erro}"

Nivel 2 — Contexto expandido:
  - Adicionar arquivo de implementacao existente mais relacionado
  - Adicionar output de bun run test
  - "Contexto expandido. Foque no erro: {erro}"

Nivel 3 — Contexto expandido + hint:
  - Adicionar sugestao especifica de abordagem
  - "Ultima tentativa. Sugestao: {hint baseado no erro}"

Se 3 tentativas falharem:
  - Marcar task como "blocked"
  - Registrar no STATE.md com historico de erros
  - Acionar escape hatch (Step 4f)

Nota: erros de infraestrutura (timeout, permissao) NAO contam como tentativa.
Reiniciar sem contar.
```

---

## Step 4f — Escape Hatches

```
Pause (dev pede ou wave concluida sem completar):
  - Completar subagentes ja em execucao
  - Atualizar STATE.md: phase = "paused"
  - Salvar progresso atual
  - "Execucao pausada. Retome com /execute-plan."

Skip (dev pede pular task especifica):
  - Atualizar STATUS da task para "skipped" no STATE
  - Registrar motivo no Log do STATE
  - Continuar com proximas tasks da wave
  - "Task N.M.K pulada. Tasks dependentes ficam como pending."

Abort (dev pede cancelar tudo):
  - Aguardar subagentes em execucao terminarem (nao matar)
  - Salvar estado atual no STATE.md
  - "Execucao abortada. Estado salvo. Use /execute-plan para retomar."

Edicao Manual Detectada:
  - Antes de cada wave, verificar timestamps dos arquivos do plano
  - Se PLAN.md foi editado apos ultima execucao:
    "PLAN.md foi modificado desde a ultima execucao. Recarregar plano?"
  - Se STATE.md foi editado manualmente:
    "STATE.md parece ter sido editado manualmente. Validar consistencia?"

Wave Total Failure (todas as tasks falharam):
  - Nao prosseguir para proxima wave
  - AskUserQuestion: "Todas as tasks da Wave {N} falharam. O que fazer?"
    - "Ver detalhes dos erros"
    - "Tentar wave novamente"
    - "Pausar e revisar o plano"
    - "Abortar execucao"

Context Threshold (25%):
  - Monitorar uso de contexto durante execucao
  - Se contexto > 75% utilizado:
    "Contexto proximo do limite. Recomendo pausar apos esta wave."
  - Salvar estado antes de pausar
  - "Estado salvo. Retome na proxima sessao com /execute-plan."
```

---

## Step 5 — Validacao Pos-Wave

```
Apos completar todas as tasks de uma wave:

1. Executar: bun run test
   - Se testes passam: registrar no Log do STATE
   - Se testes falham: diagnosticar qual task causou regressao

2. Executar: bun run lint
   - Registrar resultado no STATE
   - Erros de lint nao bloqueiam, mas sao registrados como warns

3. Mostrar diagnostico ao dev:
   "Wave {N} concluida:
   - Tasks completas: {X}/{Y}
   - Testes: {pass|fail} ({N} passando, {M} falhando)
   - Lint: {pass|warn}
   - Skipped: {lista}"

4. AskUserQuestion antes de prosseguir para proxima wave:
   - "Prosseguir para Wave {N+1}"
   - "Revisar o que foi feito antes de prosseguir"
   - "Pausar aqui"
   - "Abortar execucao"
```

---

## Step 6 — Learn Point (Opcional por Wave)

Oferecer apos cada wave (NAO forcar):

> "Quer entender algo sobre o que foi executado nesta wave?"

Se sim, explicar brevemente o conceito mais relevante da wave:
- Se foi tracer bullet: explicar o conceito e por que e o slice mais importante
- Se foi wave de paralelismo: explicar waves e dependencias
- Se houve retry: explicar o ciclo RED/GREEN e por que testes nao podem mudar

Para aprofundar: sugerir `/anti-vibe-coding:learn "conceito relevante"`

---

## Step 7 — SUMMARY.md ao Completar

Quando `tasks_done == tasks_total` (ou dev aprova como completo):

```
Gerar .planning/SUMMARY-{feature-name}.md:

# Summary: {Feature Name}

**Completed:** {date}
**Duration:** {data inicio} → {data fim}
**Total Tasks:** {N} ({X} done, {Y} skipped, {Z} blocked)
**Waves:** {N}

## What Was Built
{lista dos slices entregues com valor ao usuario}

## Decisions Made
{lista de decisoes do plano que foram respeitadas}

## Deviations
{se alguma task foi skipped ou modificada — e por que}

## Blockers Resolved
{bloqueios encontrados e como foram resolvidos}

## Next Steps
{sugestoes baseadas no plano + STATE}

---
Gerado por /execute-plan em {date}
```

Atualizar STATE.md:
- phase: completed
- last_updated: hoje

---

## Regras Criticas

1. **Isolamento e absoluto** — subagentes GREEN nunca veem requisitos, apenas testes
2. **O orchestrador nunca executa codigo** — apenas spawn de subagentes e atualizacao de estado
3. **Max 3 retries** — apos isso, marcar blocked e continuar com outras tasks
4. **Sempre confirma antes da wave** — Step 3b e obrigatorio, nunca pule
5. **Commit atomico por task** — cada subagente faz um commit ao terminar
6. **STATE.md e a fonte de verdade** — ler antes de escrever, sempre
7. **Testes RED devem FALHAR por assertion** — erro de compilacao nao conta como RED valido
8. **Testes GREEN nao podem ser modificados** — anchor imutavel do ciclo TDD
9. **Context threshold a 25%** — pausar, salvar estado, retomar na proxima sessao
10. **Wave failure nao bloqueia** — tasks blocked permitem continuar com independentes da mesma wave

---

## Pipeline Integration

O execute-plan ja usa `.planning/PLAN.md` e `.planning/STATE.md` como parte do seu fluxo principal. A Pipeline Integration complementa com as transicoes ao finalizar.

### Ao Concluir Todas as Waves

1. **Salvar SUMMARY.md:**
Criar ou atualizar `.planning/SUMMARY.md`:

```
# SUMMARY.md — Resumo de Execucao

**Feature:** [nome]
**Data de conclusao:** [data]

## Waves Executadas
[lista de waves com status e principais mudancas]

## Arquivos Modificados
[lista dos principais arquivos tocados]

## Commits Realizados
[lista de commits com mensagens]

## Issues Encontrados
[problemas encontrados e como foram resolvidos]

## Estado Final
[descricao do que foi entregue]
```

2. **Atualizar STATE.md:** Mudar `phase: done`, registrar data de conclusao no Log.

3. **Sugerir Proximo Passo:**
> "Todas as waves concluidas. SUMMARY.md salvo em `.planning/SUMMARY.md`.
>
> Quer prosseguir para `/verify-work`? Ele vai auditar o que foi implementado com testes, lint e agents especializados."

### Learn Point (opcional)

> "Quer entender context isolation RED/GREEN, wave execution ou commits atomicos? Posso aprofundar via `/learn`."

### Escape Hatches
- Se dev quiser pausar antes de verificar: STATE.md e salvo, retomavel
- A verificacao com /verify-work e opcional — dev pode fazer commit diretamente

---

## Referencias

- `references/wave-execution.md` — Conceitos de execucao de waves, paralelismo e recuperacao
- `templates/STATE.md` — Template do arquivo de estado
- `agents/plan-executor.md` — Agent que executa tasks individuais
- `agents/plan-verifier.md` — Agent que verifica output de tasks
