---
name: execute-plan
description: "Executa planos hierarquicos fase por fase usando subagentes com isolamento de contexto. Navega plano por plano, le fases detalhadas, aplica TDD com isolamento RED/GREEN, mantém MEMORY.md e STATE.md atualizados. Oferece troca de contexto entre planos."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion
argument-hint: "[caminho do PLAN.md ou nome da feature] [--plano N] [--fase N]"
---

# Execute Plan — Execucao Hierarquica com Memoria

Skill de execucao. Navega planos hierarquicos (gerados por /plan-feature), executa fase por fase com subagentes isolados, aplica TDD obrigatorio, e mantém memoria viva por plano.

Diferenca das outras skills:
- **plan-feature**: gera PLANOS de execucao (como construir, em que ordem)
- **execute-plan**: executa os planos fase por fase com subagentes isolados
- **verify-work**: verifica se output atende criterios do plano

Suporta dois formatos:
- **Hierarquico (v2):** PLAN overview + plano{NN}/fases + MEMORY.md
- **Flat (v1 — backward compat):** PLAN.md unico com waves e tasks

---

## Step 1 — Detectar Formato e Ler Plano

### 1a. Localizar plano

```
Se caminho fornecido (/execute-plan "path/to/PLAN.md"):
  - Ler com Read
  - Prosseguir para 1b

Se nao forneceu caminho:
  - Glob: ".planning/PLAN-*.md"
  - Se 1 arquivo: ler diretamente
  - Se mais de 1: listar e perguntar qual executar

Se nao encontrou:
  - "Nao encontrei nenhum PLAN.md em .planning/."
  - Oferecer: "Quer criar um com /plan-feature?"
  - Encerrar
```

### 1b. Detectar formato

```
Ler o PLAN.md encontrado e verificar:

HIERARQUICO (v2) — detectado se:
  - Contem secao "## Planos" com tabela de planos numerados
  - Glob ".planning/plano*/" encontra pastas
  - Cada pasta tem README.md + fase-*.md

FLAT (v1) — detectado se:
  - Contem "## Wave" com slices e tasks
  - Nao existem pastas plano*/

Se hierarquico: prosseguir para Step 2 (hierarquico)
Se flat: prosseguir para Step 2-FLAT (backward compat — fluxo original)
```

---

## Step 2 — Ler Estado Global (Hierarquico)

Nome esperado: `.planning/STATE-{feature-name}.md`

### Se STATE.md existe:

```
Ler e verificar:

Fase "completed":
  - "Todos os planos foram concluidos em {date}. Quer ver o SUMMARY.md?"
  - Encerrar (nao re-executar sem confirmacao explicita)

Fase "paused":
  - Mostrar: plano ativo, fase atual, progresso global
  - AskUserQuestion: "Retomar Plano {N}, fase {M}?" ou "Recomecar do inicio?"

Fase "planned" ou "in-progress":
  - Identificar plano ativo (Current Plan no STATE)
  - Carregar contexto: progresso por plano
  - Prosseguir para Step 3
```

### Se STATE.md nao existe:

```
Criar a partir do PLAN overview:
  - Listar todos os planos com status "pending"
  - phase: planned
  - current_plan: 01
  - Salvar
  - Prosseguir para Step 3
```

### Formato do STATE.md (hierarquico)

```markdown
# State: {Feature Name}

**Plan:** .planning/PLAN-{feature}.md
**Phase:** {planned | in-progress | paused | completed}
**Current Plan:** {NN}/{total}
**Last Updated:** {date}

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | {nome} | {N} | {M}/{N} | {pending/in-progress/completed/paused} |
| 02 | {nome} | {N} | {M}/{N} | {pending} |
| 03 | {nome} | {N} | {M}/{N} | {pending} |

## Progress Global
Tasks done: {X}/{Y} ({Z}%)
[progress bar visual]

## Log
- {date}: Plano criado via /plan-feature
- {date}: Execucao iniciada — Plano 01
```

---

## Step 3 — Ler Plano Ativo e Consultar Memoria

### 3a. Carregar plano

```
1. Identificar plano ativo do STATE.md (Current Plan: NN)
2. Ler .planning/plano{NN}/README.md
3. Listar fases: Glob ".planning/plano{NN}/fase-*.md"
4. Identificar proxima fase pendente
```

### 3b. Consultar memorias anteriores

```
CRITICO: Antes de executar qualquer plano alem do primeiro:

1. Ler MEMORY.md dos planos anteriores completados
   - Focar na secao "Notas para Planos Seguintes"
   - Absorver decisoes de implementacao (DI-*)
   - Absorver gotchas descobertos (GT-*)

2. Este contexto e passado aos subagentes como "Contexto de planos anteriores"
   - NAO passar a MEMORY inteira — apenas a secao de "Notas para Planos Seguintes"
   - Isso mantem o contexto limpo e relevante
```

### 3c. Confirmar com dev

```
"Vou executar Plano {NN}: {nome} ({M} fases)

Fases:
  fase-01: {nome} (~{tempo})
  fase-02: {nome} (~{tempo})
  ...

Proxima fase: fase-{MM} ({nome})
{Se plano > 1: 'Contexto de planos anteriores carregado (N decisoes, M gotchas).'}

Subagentes necessarios: {estimativa}
Modelo: {do model-profiles.json}"

AskUserQuestion:
  - "Executar agora"
  - "Executar apenas fase-{MM}"
  - "Pausar e revisar o plano"
  - "Ajustar antes de executar"
```

---

## Step 4 — Executar Fases do Plano

### 4a. Classificar fases

```
Para cada fase no plano ativo:

Independentes (sem "Depende de"):
  - Podem ser executadas em paralelo
  - Limite: max 3 subagentes simultaneos (fases sao maiores que tasks)

Dependentes ("Depende de: fase-NN"):
  - Executar APOS fase de dependencia concluir
  - Nunca em paralelo com sua dependencia
```

### 4b. Spawn de Subagente por Fase

```
Para cada fase a executar:

Spawn do agent plan-executor com contexto:
  RECEBE:
  - Arquivo da fase completo (fase-NN-nome.md)
  - README.md do plano (overview e gotchas)
  - "Notas para Planos Seguintes" dos planos anteriores (se existirem)
  - Estado atual (STATE.md — apenas progresso, nao logs)
  - Padrao de codigo existente (1-2 arquivos de referencia do codebase)
  - Instrucao: "Execute APENAS esta fase. Siga TDD. Commit atomico por passo."
  - Instrucao: "Reporte: decisoes tomadas, bugs encontrados, desvios do plano."

  NAO RECEBE:
  - PRD completo (o subagente ve apenas a fase)
  - Outras fases do plano
  - MEMORY.md completa de planos anteriores
  - Contexto de conversas anteriores

Aguardar conclusao antes de atualizar estado.
```

### 4c. Ciclo TDD por Fase

```
Cada fase segue o ciclo TDD definido no seu checklist:

Se a fase tem secao TDD com RED/GREEN:

  Subagente RED (contexto isolado):
  - Recebe: especificacao da fase (arquivos, descricao, verificacao)
  - NAO recebe: implementacao existente
  - Produz: teste que FALHA por assertion failure
  - Registra: .tdd-phase.json

  Subagente GREEN (contexto isolado):
  - Recebe: APENAS os arquivos de teste do RED
  - NAO recebe: PRD, descricao da feature
  - Produz: codigo minimo que faz o teste passar
  - Anchor imutavel: NUNCA modifica testes

Se a fase NAO tem TDD explicito (ex: migration pura, config):
  - Executar diretamente com subagente unico
  - Validar via checklist da fase
```

### 4d. Coletar Resultados e Atualizar Memoria

```
Apos cada subagente completar:

1. Ler output do subagente
2. Extrair do report:
   - Status: done | partial | blocked
   - Decisoes tomadas (DI-*)
   - Bugs encontrados (BUG-*)
   - Gotchas descobertos (GT-*)
   - Desvios do plano (DEV-*)

3. Atualizar STATE.md:
   - Mudar status da fase
   - Incrementar progresso
   - Registrar evento no Log

4. Atualizar MEMORY.md do plano ativo:
   - Append decisoes em "Decisoes de Implementacao"
   - Append bugs em "Bugs Descobertos"
   - Append gotchas em "Gotchas"
   - Append desvios em "Desvios do Plano"
   - Atualizar metricas

5. Se partial: registrar o que foi feito e o que falta
```

---

## Step 4-RETRY — Retries e Recuperacao

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
  - Marcar fase como "blocked"
  - Registrar no STATE.md e MEMORY.md com historico de erros
  - Acionar escape hatch
```

---

## Step 4-ESCAPE — Escape Hatches

```
Pause (dev pede ou limite de contexto):
  - Completar subagentes em execucao
  - Atualizar STATE.md: phase = "paused"
  - Salvar MEMORY.md atual
  - "Execucao pausada. Retome com /execute-plan."

Skip (dev pede pular fase):
  - Atualizar STATUS da fase para "skipped" no STATE
  - Registrar motivo no Log e MEMORY
  - Continuar com proximas fases
  - "Fase {NN} pulada. Fases dependentes ficam como pending."

Abort (dev pede cancelar):
  - Aguardar subagentes em execucao
  - Salvar estado e memoria
  - "Execucao abortada. Estado salvo. Use /execute-plan para retomar."

Context Threshold (75%):
  - "Contexto proximo do limite. Recomendo pausar apos esta fase."
  - Salvar estado antes de pausar
```

---

## Step 5 — Validacao Pos-Fase

```
Apos cada fase concluir:

1. Executar: bun run test
   - Se testes passam: registrar no Log do STATE
   - Se testes falham: diagnosticar e registrar na MEMORY

2. Executar: bun run lint
   - Registrar resultado

3. Mostrar diagnostico ao dev:
   "Fase {NN} concluida:
   - Testes: {pass|fail}
   - Lint: {pass|warn}
   - Decisoes tomadas: {N}
   - Bugs encontrados: {N}"
```

---

## Step 6 — Transicao entre Planos

### 6a. Ao completar todas as fases de um plano

```
1. Finalizar MEMORY.md do plano:
   - Atualizar metricas finais
   - Verificar secao "Notas para Planos Seguintes" — preencher se vazio

2. Atualizar STATE.md:
   - Plano atual: completed
   - Current Plan: proximo plano pendente

3. Apresentar ao dev:
   "Plano {NN} concluido ({M}/{M} fases).

   Memoria registrada:
   - {N} decisoes de implementacao
   - {N} bugs descobertos
   - {N} gotchas
   - {N} desvios

   Proximo: Plano {NN+1} — {nome} ({M} fases)

   O que deseja?"

4. AskUserQuestion:
   - "Avancar para Plano {NN+1} neste contexto"
   - "Encerrar e iniciar Plano {NN+1} em contexto novo"
   - "Revisar memoria do plano concluido antes de avancar"
   - "Pausar aqui"
```

### 6b. Se dev escolher "contexto novo"

```
1. Salvar STATE.md com progresso atual
2. Salvar MEMORY.md final
3. "Estado salvo. Na proxima sessao, rode /execute-plan — ele retoma do Plano {NN+1}."
4. Encerrar
```

### 6c. Se dev escolher "avancar neste contexto"

```
1. Ler MEMORY.md do plano concluido (secao "Notas para Planos Seguintes")
2. Ler README.md do proximo plano
3. Voltar ao Step 3 com proximo plano como ativo
```

### 6d. Se dev escolher "revisar memoria"

```
1. Mostrar MEMORY.md completa do plano concluido
2. Perguntar: "Quer adicionar ou corrigir algo na memoria?"
3. Se sim: editar MEMORY.md conforme dev indicar
4. Voltar as opcoes do Step 6a
```

---

## Step 7 — Conclusao Total (Todos os Planos)

Quando todos os planos estao como "completed":

### 7a. Gerar SUMMARY.md

```
Gerar .planning/SUMMARY-{feature-name}.md:

# Summary: {Feature Name}

**Completed:** {date}
**Duration:** {data inicio} → {data fim}
**Planos:** {N} ({X} completed, {Y} skipped)
**Fases Total:** {N} ({X} done, {Y} skipped, {Z} blocked)

## O que foi construido
{lista de planos com o que cada um entregou}

## Decisoes de Implementacao (consolidado)
{decisoes significativas de todas as MEMORYs}

## Bugs e Gotchas (consolidado)
{bugs e gotchas de todas as MEMORYs que sao generalizaveis}

## Desvios dos Planos
{desvios significativos — o que mudou vs planejado}

## Metricas Consolidadas
| Metrica | Valor |
|---------|-------|
| Planos | {N} |
| Fases total | {N} |
| Bugs encontrados | {N} |
| Retries | {N} |
| Desvios | {N} |
```

### 7b. Destilacao de Memoria

```
CRITICO: Oferecer destilacao ao dev.

"Todos os planos foram concluidos. As memorias dos planos contem:
- {N} decisoes de implementacao
- {N} bugs descobertos
- {N} gotchas

Quer que eu analise as memorias e salve as licoes uteis
no repositorio (via /lessons-learned)?"

Se sim:
1. Ler todas as MEMORY.md dos planos
2. Filtrar o que e GENERALIZAVEL:
   - Gotchas que se aplicam a qualquer feature similar
   - Padroes que foram descobertos durante implementacao
   - Armadilhas do stack/framework que nao sao obvias
3. Descartar o que e ESPECIFICO demais:
   - "Migration X conflitou com migration Y" (contexto pontual)
   - "Variavel renomeada de A para B" (trivial)
4. Sugerir cada licao ao dev antes de salvar
5. Salvar via /lessons-learned add ou na memoria geral do projeto
```

### 7c. Atualizar STATE e Sugerir Proximo Passo

```
Atualizar STATE.md: phase = "completed"

Sugerir:
> "Feature concluida. Quer rodar /verify-work para auditoria pos-implementacao?"
```

---

## Step 2-FLAT — Backward Compat (Formato v1)

Para planos flat (PLAN.md unico com waves/tasks), manter o fluxo original:

```
O fluxo flat funciona exatamente como a versao anterior:
- Le waves e tasks do PLAN.md
- Executa wave por wave com subagentes
- TDD com isolamento RED/GREEN
- STATE.md com tracking por task
- Sem MEMORY.md por plano (nao ha planos separados)

Referencia: ver references/wave-execution.md para conceitos de waves.
```

### Detalhamento do fluxo flat (preservado)

```
Step 2-FLAT: Ler ou Criar STATE.md (formato flat)
  - STATE com tracking por wave/task (formato original)

Step 3-FLAT: Identificar Wave e Confirmar
  - Determinar wave: --wave N, ou wave atual do STATE
  - Confirmar: "Vou executar Wave {N} ({M} slices, {K} tasks)"

Step 4-FLAT: Executar Tasks da Wave
  - Classificar: independentes (paralelo, max 5) vs dependentes (sequencial)
  - Spawn plan-executor com task especifica
  - TDD: RED subagente → GREEN subagente (isolamento absoluto)
  - Coletar resultados, atualizar STATE.md

Step 5-FLAT: Validacao Pos-Wave
  - bun run test + bun run lint
  - Diagnostico ao dev, confirmar proxima wave

Step 6-FLAT: SUMMARY ao completar
  - Gerar SUMMARY.md
  - Sugerir /verify-work
```

---

## Regras Criticas

1. **Isolamento e absoluto** — subagentes GREEN nunca veem requisitos, apenas testes
2. **O orchestrador nunca executa codigo** — apenas spawn de subagentes e atualizacao de estado
3. **Max 3 retries** — apos isso, marcar blocked e continuar com outras fases
4. **Sempre confirma antes de executar** — Step 3 e obrigatorio, nunca pule
5. **Commit atomico por fase** — cada subagente faz commit(s) ao terminar
6. **STATE.md e a fonte de verdade** — ler antes de escrever, sempre
7. **MEMORY.md e preenchida durante execucao** — nao apos
8. **Memorias anteriores sao consultadas** — antes de iniciar cada plano
9. **Transicao entre planos e interativa** — dev decide se avanca ou troca contexto
10. **Context threshold a 75%** — pausar, salvar estado e memoria
11. **Destilacao de memoria ao final** — extrair licoes generalizaveis para o repositorio
12. **Backward compat** — planos flat (v1) continuam funcionando sem mudanca

---

## Pipeline Integration

### Ao Concluir Todos os Planos

1. **Salvar SUMMARY.md** com consolidado de todas as memorias
2. **Destilacao de memoria** — oferecer salvar licoes uteis
3. **Atualizar STATE.md** — phase: completed
4. **Sugerir /verify-work** para auditoria pos-implementacao

### Learn Point (opcional)

> "Quer entender context isolation RED/GREEN, execucao hierarquica ou memoria por plano? Posso aprofundar via `/learn`."

### Escape Hatches
- Dev pode pausar entre planos (estado salvo)
- Dev pode pular plano inteiro (dependentes ficam pending)
- Dev pode abortar a qualquer momento (estado e memoria salvos)
- Dev pode trocar de contexto entre planos (recomendado para features grandes)

---

## Referencias

- `references/wave-execution.md` — Conceitos de waves, paralelismo e recuperacao (formato flat)
- `skills/plan-feature/templates/memory-template.md` — Template de memoria por plano
- `agents/plan-executor.md` — Agent que executa tasks/fases individuais
- `agents/plan-verifier.md` — Agent que verifica output (read-only)
