# Wave Execution — Conceitos e Referencia

Documento de referencia para a skill `/execute-plan`. Explica os conceitos fundamentais de execucao de waves com subagentes.

---

## 1. Conceito de Wave

Uma **wave** e um grupo de slices que compartilham o mesmo nivel de dependencia no plano.

```
Wave 1: slices sem dependencia (executam em paralelo)
Wave 2: slices que dependem de algo da Wave 1
Wave N: slices que dependem de Wave N-1
```

**Propriedade fundamental:** dentro de uma wave, todos os slices sao independentes entre si. Se dois slices tem dependencia mutua, eles devem estar em waves sequenciais.

**Sequencia de execucao:**
```
Confirmar Wave → Classificar Tasks → Paralelo/Sequencial → Coletar → Validar → Proxima Wave
```

O orchestrador (skill execute-plan) nunca executa codigo. Ele apenas:
1. Le o plano e o estado
2. Spawna subagentes com contexto especifico
3. Coleta resultados
4. Atualiza STATE.md
5. Confirma com o dev antes de cada wave

---

## 2. Paralelismo dentro de uma Wave

### Tasks Independentes (paralelas)

Tasks sem `Depends on` podem ser executadas simultaneamente:

```
Wave 2:
  Slice 2.1 (sem dependencia) ──┐
  Slice 2.2 (sem dependencia) ──┼──> executam em paralelo
  Slice 2.3 (sem dependencia) ──┘
```

**Limite:** maximo 5 subagentes simultaneos. Se a wave tem 8 tasks independentes, executar em 2 lotes de 4 e 4.

### Tasks Dependentes (sequenciais)

Tasks com `Depends on` esperam pela conclusao da dependencia:

```
Wave 1, Slice 1.1:
  Task 1.1.1 (Red) → Task 1.1.2 (Green) → Task 1.1.3 (UI)
  [cada uma aguarda a anterior]
```

### Ordem dentro de um Slice (TDD)

A ordem dentro de um slice e sempre:
1. Task de **teste** (Red) — falha proposital
2. Task de **implementacao** (Green) — minimo para passar
3. Task de **UI/integracao** (se existir)
4. Task de **refatoracao** (se existir)

Nunca inverter esta ordem. Nunca pular o Red.

---

## 3. Isolamento de Contexto RED/GREEN

Este e o mecanismo central de qualidade do execute-plan.

### Por que isolar?

Quando o subagente GREEN ve os requisitos do usuario, ele tende a:
- Sobre-engenheirar a solucao antes de ver os testes
- Fazer suposicoes que divergem dos testes
- Tratar o teste como secundario ao requisito

Com isolamento, o GREEN ve **apenas os testes** e implementa o codigo minimo para faze-los passar.

### Subagente RED

**Recebe:**
- Especificacao da task: Files, Action, Verify
- Contexto de codebase (imports, tipos existentes)

**NAO recebe:**
- Implementacao existente (para nao copiar)
- Outros testes da feature

**Objetivo:** criar um teste que falha por `assertion failure`, nao por erro de compilacao.

```
✅ Correto: "Expected 200, received 404"
❌ Invalido: "TypeError: Cannot read property 'data' of undefined"
```

**Registro:** ao concluir, o RED atualiza `.tdd-phase.json`:
```json
{
  "phase": "red",
  "task": "1.1.1",
  "test_file": "src/__tests__/notifications.test.ts",
  "failure_message": "Expected 200, received 404"
}
```

### Subagente GREEN

**Recebe:**
- Apenas os arquivos de teste criados pelo RED
- `.tdd-phase.json` (sabe que esta na fase green)
- Files e Action da task de implementacao

**NAO recebe:**
- PRD ou historia do usuario
- Requisitos da feature
- "O que a feature deve fazer"

**Anchor imutavel:** NUNCA modificar arquivos de teste para faze-los passar. Se o teste parecer errado, reportar como blocker, nao modificar.

**Objetivo:** codigo minimo que faz o teste passar. Nada mais.

**Registro:** ao concluir:
```json
{
  "phase": "green",
  "task": "1.1.2",
  "test_result": "5 passed, 0 failed"
}
```

### Ciclo Completo

```
Orchestrator: spawna RED com spec da task
    ↓
RED: cria teste que FALHA
RED: registra .tdd-phase.json (phase: red)
    ↓
Orchestrator: confirma falha, spawna GREEN com APENAS os testes
    ↓
GREEN: implementa codigo minimo
GREEN: confirma que teste PASSA
GREEN: registra .tdd-phase.json (phase: green)
    ↓
Orchestrator: coleta resultado, atualiza STATE.md
```

---

## 4. Gerenciamento de Estado

### STATE.md como Fonte de Verdade

O STATE.md e lido e escrito pelo orchestrador (nunca pelos subagentes).

**Regra:** sempre ler STATE.md antes de escrever. Nunca fazer write sem ler o estado atual.

**Atualizacao apos cada task:**
1. Ler STATE.md (versao mais recente)
2. Atualizar status da task
3. Recalcular progress bar
4. Escrever STATE.md

### Fases do STATE

```
planned    → Plano criado, nunca executado
in-progress → Execucao em andamento
wave-N     → Executando especificamente a wave N
paused     → Pausado pelo dev ou por context threshold
completed  → Todas as tasks done ou explicitamente aprovado como completo
```

### Status por Task

```
pending    → Nao iniciada
in-progress → Subagente em execucao (efemero)
done       → Concluida com sucesso
blocked    → Falhou apos 3 retries ou dependencia falhou
skipped    → Pulada pelo dev
```

### Progress Bar

Calculada automaticamente:
```
Tasks done: 7/15 (46%)
[███████░░░░░░░░] 46%
```

Inclui tasks `done` e `skipped` no numerador. Tasks `blocked` nao contam.

### Log do STATE

Cada evento significativo e registrado no Log:
```markdown
## Log
- 2026-04-08: Plano criado via /plan-feature
- 2026-04-08: Wave 1 iniciada (5 tasks)
- 2026-04-08: Task 1.1.1 done — teste criado (Red)
- 2026-04-08: Task 1.1.2 done — implementacao minima (Green)
- 2026-04-08: Task 1.1.3 blocked — retry 3/3 falhou (TypeError no handler)
- 2026-04-08: Wave 1 concluida: 4 done, 1 blocked
```

---

## 5. Recuperacao de Erros

### Hierarquia de Retry

Antes de marcar como blocked, tentar 3 vezes com escalada:

**Tentativa 1 — Mesmo contexto + erro:**
```
Spawn subagente com:
  - Contexto original da task
  - Output de erro da tentativa anterior
  - "Tente novamente. O erro foi: {erro}"
```

**Tentativa 2 — Contexto expandido:**
```
Adicionar ao contexto:
  - Arquivo de implementacao existente mais proximo
  - Output completo de bun run test
  - "Contexto expandido. Foque em: {erro}"
```

**Tentativa 3 — Contexto expandido + hint:**
```
Adicionar ao contexto:
  - Sugestao especifica baseada no tipo de erro
  - "Ultima tentativa. Sugestao: {hint}"

Exemplos de hints por tipo de erro:
  - TypeError: "Verifique imports e tipos. O erro indica tipo nulo."
  - 404: "Verifique se a rota esta registrada. Importe o router."
  - Assertion: "O teste espera X. Retorne X no handler."
```

**Pos-3-tentativas:**
- Marcar task como `blocked`
- Registrar historico completo no STATE.md
- Continuar com tasks independentes da mesma wave
- Reportar ao dev no Step 5 (validacao pos-wave)

### Erros de Infraestrutura

Nao contam como tentativa de retry:
- Timeout de rede
- Permissao negada (arquivo)
- Limite de contexto do subagente
- Falha ao spawnar subagente

Para estes: reiniciar imediatamente sem incrementar contador.

### Wave Total Failure

Se todas as tasks de uma wave estao blocked ou failed:
1. Nao prosseguir para proxima wave automaticamente
2. Mostrar diagnostico completo dos erros
3. AskUserQuestion com opcoes:
   - Tentar wave novamente
   - Pausar e revisar o plano
   - Pular wave e prosseguir (com aviso de riscos)
   - Abortar execucao

### Context Threshold

O orchestrador monitora o uso de contexto durante a execucao.

**A 75% do limite:**
1. Completar wave atual (nao interromper subagentes)
2. Avisar dev: "Contexto proximo do limite (75%). Pausando apos esta wave."
3. Salvar STATE.md com fase `paused` e nota no Log
4. Nao iniciar proxima wave

**Retomada:**
1. Dev invoca `/execute-plan` em nova sessao
2. Skill le STATE.md com fase `paused`
3. Pergunta: "Retomar de onde parou (Wave N, Task X)?"
4. Continua normalmente

---

## Sumario dos Limites

| Parametro | Valor |
|-----------|-------|
| Subagentes paralelos max | 5 |
| Retries por task | 3 |
| Context threshold (pause) | 75% |
| Context buffer (seguranca) | 25% |
| Max waves antes de sugerir split | 5 |
