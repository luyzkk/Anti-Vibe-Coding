---
name: execute-plan
description: "Executa planos hierarquicos fase por fase usando subagentes com isolamento de contexto. Navega plano por plano, le fases detalhadas, aplica TDD com isolamento RED/GREEN, mantém MEMORY.md e STATE.md atualizados. Oferece troca de contexto entre planos."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion
argument-hint: "[caminho do PLAN.md ou nome da feature] [--plano N] [--fase N]"
---

```typescript
// === Telemetria passiva (Plano 03 fase-02) — nao remover sem registrar em MEMORY.md ===
// G5: telemetria SEMPRE ativa, ignora architectureDetectorEnabled
// G7: skill name canonico fixo

import { writeTelemetryStart, writeTelemetryEnd } from '../../lib/telemetry-utils'
import type { TelemetryStart, TelemetryEnd } from '../../lib/telemetry-types'

const __telemetry_skillName = 'execute-plan'
const __telemetry_fasePipeline = 'execute-plan'
const __telemetry_startTimestamp = new Date().toISOString()
const __telemetry_startMs = Date.now()

const __telemetry_startEntry: TelemetryStart = {
  evento: 'start',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
}

writeTelemetryStart(__telemetry_startEntry)
// === Fim do bloco de inicio ===
```

```typescript
// === Perfil arquitetural (Plano 04 fase-05) — leitura UMA vez ===
// Reutiliza FASE_POLICY_BY_PROFILE da fase-03 via cross-skill import (sem duplicar lookup).
// G1: UMA leitura, UMA resolucao, zero branching profundo.
// G2: readArchitectureProfile() retorna null se flag=false → policy = FASE_POLICY_V52 (CA-04).

import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { FASE_POLICY_BY_PROFILE, FASE_POLICY_V52, renderFasePolicyBlock } from '../plan-feature/lib/fase-policy'

const __profile = readArchitectureProfile()

const __fasePolicy = getRecommendationForProfile(
  __profile?.profile ?? null,
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
)

const __fasePolicyBlock = renderFasePolicyBlock(__fasePolicy)
// Inject ${__fasePolicyBlock} into the orchestrator prompt as guideline for mid-flight phase subdivision.
// === Fim do bloco de perfil ===
```

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

## Discovery (v6)

<!-- 2026-05-12 (Luiz/dev): Plano 05 fase-05 — adiciona caminho v6 usando exec-plans/active/ -->

```
1. Resolve project layout (skills/lib/path-resolver-v6.ts → resolvePaths)
2. Se layout === 'v6':
     a. Listar planos em docs/exec-plans/active/ via listActivePlans (skills/lib/exec-plan-mover.ts)
     b. Apresentar ao usuario para escolher qual executar
     c. Ler plano escolhido via readExecPlan (skills/lib/exec-plan-reader.ts)
     d. Continuar para Step 4 (execucao das fases)
3. Se layout === 'v5' ou 'cru' (legado): usar fluxo .planning/{date-slug}/ descrito no Step 0 abaixo (mantido para D10)
```

## Completion Flow

<!-- 2026-05-12 (Luiz/dev): Plano 05 fase-05 — fluxo de movimentacao quando plano fica completo -->

```
1. Apos cada fase executada: pedir confirmacao do usuario para marcar Exit Criteria
2. Chamar isComplete(plan) via exec-plan-reader.ts para checar se todos os criterios estao marcados
3. Quando isComplete(plan) === true:
     a. Mover arquivo via moveToCompleted(projectRoot, planPath) de skills/lib/exec-plan-mover.ts
        — atualiza frontmatter (status: completed, adiciona completedAt: YYYY-MM-DD)
        — move de docs/exec-plans/active/ para docs/exec-plans/completed/
     b. Disparar telemetria: exec_plan.completed { slug, mode, duration_ms }
     c. Sugerir /iterate (que disparara o Compound Decision Gate — fase-06)
4. Idempotencia: se crash entre writeFile e unlink, arquivo pode existir em ambos os dirs.
   Proxima invocacao detecta status: completed em active/ e ignora (nao re-executa).
```

---

## Step 0 — Deteccao de Legacy

Roda antes de qualquer outra coisa. Se `.planning/` tem artefatos soltos pre-refatoracao
(`PRD-*.md`, `PLAN-*.md`, `STATE-*.md`, `planoNN/` solto), oferece migrar para pasta datada.

Algoritmo: `lib/legacy-detector.md`.
Migracao: `lib/legacy-migrator.md`.

### Fluxo

```
1. Se `.planning/` nao existe: skip — ir para Step 1.
2. Executar `detectLegacy(".planning/")` conforme `lib/legacy-detector.md`.
3. Se `legacy == false`: skip — ir para Step 1.
4. Se `legacy == true`:
   a. Apresentar ao dev:
      "Detectei estrutura legacy em .planning/:
         Sinais: {signals.join(', ')}
         Artefatos:
           - {cada artifact.path}
         Slug inferido: {suggestedSlug ou 'nenhum — dev fornece'}"
   b. Se detectou apenas PLAN.md/STATE.md flat (sinal C sem A nem B):
      - Nota: o detector retorna legacy=false se so C presente (conforme lib/legacy-detector.md).
        Portanto esse caso nao chega aqui — PLAN.md flat puro nao eh legacy pelo algoritmo.
        Execute-plan Step 1b detecta o flat normalmente e vai para Step 2-FLAT.
   c. Se `suggestedSlug` for null (ambiguous):
      - AskUserQuestion: "Qual slug usar para a pasta destino? (kebab-case, ex: auth)"
      - Validar regex `^[a-z0-9][a-z0-9-]*$`; re-perguntar 1x em caso de invalido
   d. Computar `targetFolderName = "{YYYY-MM-DD}-{slug}"` (data atual UTC)
   e. Se pasta destino ja existir: oferecer `{targetFolderName}-v2` ou cancelar.
      Mensagem: "A pasta {targetFolderName} ja existe. Possiveis causas:
        - Outra sessao ja migrou
        - execute-plan rodou 2x hoje para o mesmo slug
        Opcoes: criar como {targetFolderName}-v2 / cancelar"
   f. AskUserQuestion:
      - "Sim, migrar agora e executar dentro da pasta"
      - "Nao — executar legacy em modo v1 a partir de .planning/ raiz (nao migra)"
      - "Cancelar execute-plan"
   g. Se "Sim":
      - Chamar `migrateLegacy(detectorResult, targetFolderName)` conforme `lib/legacy-migrator.md`
      - Se `status == "success"`: continuar Step 1 dentro da pasta migrada
      - Se `rolled_back`/`aborted`: reportar erro, perguntar se prosseguir em modo legacy v1 ou cancelar
   h. Se "Nao — legacy v1":
      - Modo legacy v1 ativado para esta invocacao
      - Ir para Step 1 com convencao ANTIGA: buscar `.planning/PLAN-*.md`, `.planning/STATE-*.md`,
        `.planning/plano*/` soltos — o Step 2-FLAT opera sobre eles
      - Nota: na proxima invocacao, Step 0 vai perguntar de novo (nao ha estado entre sessoes)
   i. Se "Cancelar": encerrar sem tocar em nada

Regras:
- Step 0 roda apenas 1 vez por invocacao
- Se migracao falhou: dev decide prosseguir legacy v1 ou cancelar
- "Nao (legacy v1)" vale SO para esta invocacao

Nota sobre CA-12 (projeto em execucao nao interrompido):
  Se STATE.md legacy tinha `phase: in-progress`, a migracao o move INTACTO (byte-a-byte).
  Apos migrar, Step 1 le STATE.md da nova pasta, ve mesmo `Current Plan` e retoma de onde parou.
```

---

## Step 1 — Detectar Formato e Ler Plano

### 1a. Localizar plano (nova estrutura — pastas datadas)

```
Se caminho fornecido (/execute-plan "path/to/PASTA/" ou ".../PLAN.md"):
  - Resolver para pasta datada `docs/exec-plans/active/YYYY-MM-DD-{slug}/`
  - Ler `STATE.md` de dentro da pasta
  - Prosseguir para 1b

Se NAO forneceu caminho:
  1. Enumerar pastas datadas em `docs/exec-plans/active/` (Glob `docs/exec-plans/active/YYYY-MM-DD-*/`)
     - Pastas em `docs/exec-plans/completed/` ficam fora (estado terminal — nao listadas no default)
     - Para cada pasta, ler `STATE.md` local e extrair `Phase` + `Current Plan`
       (STATE.md usa "**Phase:**" bold — buscar com regex, nao grep literal)
  2. Aplicar filtro default: mostrar apenas `planned` + `in-progress` + `paused`
     - Flag `--all` incluida no argumento: mostrar tambem `completed` (de active/ e completed/)
  3. Apresentar lista ao dev:

     Encontrei 3 PRDs ativos em docs/exec-plans/active/:
       [1] 2026-04-20-sistema-notificacoes  (in-progress — Plano 2/4)
       [2] 2026-04-21-auth-refactor         (planned)
       [3] 2026-04-15-billing               (paused — Plano 3/5)
     Qual executar? (--all para ver completed tambem)

  4. Se dev escolher um: usar aquela pasta como raiz, ler `STATE.md` dela
  5. Se lista vazia apos filtro:
     - Se `--all` foi usado: "Nenhum PRD em docs/exec-plans/active/." + oferecer /plan-feature
     - Se default: "Nenhum PRD ativo (planned/in-progress/paused). Rode /execute-plan --all para ver todos."
  6. Se apenas 1 PRD ativo apos filtro: pedir confirmacao
     "Encontrei 1 PRD ativo: {nome} ({status}). Executar?"

Se apos enumeracao NAO houver nenhuma pasta datada:
  - Verificar se ha artefatos legacy v5 (`.planning/PRD-*.md` solto, `.planning/plano*/` solto)
    → detectLegacy() via Step 0 (mantido para D10 — `/init` faz a migracao v5→v6)
  - Senao: "Nao encontrei nenhum PRD em docs/exec-plans/active/. Quer criar um com /write-prd?"
  - Encerrar

Nota sobre flag --all:
  - Se `--all` vier com caminho explicito: ignorar a flag (caminho tem precedencia)
  - Se `--all` vier sozinho: listar tambem status `completed`
```

### 1b. Detectar formato

Opera DENTRO da pasta escolhida no Step 1a (PASTA_ATIVA ja definida).
O `PLAN.md` e lido como `{PASTA_ATIVA}/PLAN.md`.

```
Ler o PLAN.md encontrado e verificar:

HIERARQUICO (v2 — NOVA ESTRUTURA):
  - PASTA_ATIVA contem `PLAN.md`
  - Glob `{PASTA_ATIVA}/plano*/` encontra pastas
  - Cada pasta tem README.md + fase-*.md

FLAT (v1 — backward compat):
  - PLAN.md contem "## Wave" com slices/tasks
  - Nao existem subpastas `plano*/`
  - IMPORTANTE: o fluxo FLAT pode vir de pasta datada (se `plan-feature` fallback gerou plano unico)
    OU de legacy (PLAN.md solto na raiz). Deteccao de legacy eh Plano 02 — aqui apenas seguir
    fluxo flat se detectado dentro de PASTA_ATIVA.

Se hierarquico: prosseguir para Step 2 (hierarquico)
Se flat: prosseguir para Step 2-FLAT (backward compat — fluxo original)
```

---

## Step 2 — Ler Estado Global (Hierarquico)

Nome esperado: `{PASTA_ATIVA}/STATE.md` (nu, sem prefixo, LOCAL a pasta)

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
Criar a partir do PLAN overview em `{PASTA_ATIVA}/STATE.md`:
  - Listar todos os planos com status "pending"
  - phase: planned
  - current_plan: 01
  - Salvar
  - Prosseguir para Step 3
```

### Formato do STATE.md (hierarquico)

```markdown
# State: {Feature Name}

**Plan:** ./PLAN.md
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

## Step 2.5 — Verificar Requires

```
1. Ler `{PASTA_ATIVA}/PRD.md`
2. Extrair frontmatter (mesmo parser de plan-feature):
   - Se conteudo comeca com `---\n`:
     - Extrair bloco entre primeiro `---` e segundo `---`
     - Procurar linha `requires:`
     - Se encontrada:
       - Se valor comeca com `[`: split por virgula, trim, remover `[` e `]`, lista
       - Se valor e string simples (nao vazia): lista com 1 elemento
       - Se `[]` ou vazio: lista vazia
     - Se nao encontrada ou bloco ausente: requires = []
   - Se `requires` vazio: pular este step inteiramente
3. Para cada dependencia em `requires`:
   a. Resolver para pasta:
      - Se valor e pasta exata (`2026-04-20-auth`): usar diretamente
      - Se e slug (`auth`): glob `docs/exec-plans/active/????-??-??-*-auth/` (sufixo exato)
                            + `docs/exec-plans/completed/????-??-??-*-auth/`
      - Se nao encontrou: status = "nao encontrado"
      - Se mais de 1 pasta: status = "ambiguo" (listar pastas)
   b. Se resolveu para exatamente 1 pasta:
      - Ler `STATE.md` da pasta
      - Extrair campo `**Phase:**` com regex (nao grep literal)
      - Se Phase == "completed": dependencia OK — nao aparece no aviso
4. Montar lista de dependencias com problema (nao-completed, nao-encontradas, ambiguas)
5. Se lista de problemas vazia: pular — ir para Step 3
6. Se ha dependencias com problema, montar aviso:

   "AVISO: Dependencias nao concluidas:
     - {slug}: {status} (em {pasta})
     - {slug}: nao encontrado
     - {slug}: ambiguo (pastas: X, Y)

   Este PRD declara `requires:` em seu frontmatter. Prosseguir mesmo assim?"

7. AskUserQuestion:
   - "Prosseguir (aceito o risco)"
   - "Cancelar e resolver dependencias primeiro"
8. Se cancelar: exibir "Execucao cancelada. Conclua as dependencias e rode /execute-plan novamente." e encerrar.
9. Se prosseguir: registrar no Log do STATE.md: "Aviso de requires aceito pelo dev em {data}"
```

---

## Step 3 — Ler Plano Ativo e Consultar Memoria

### 3a. Carregar plano

```
1. Identificar plano ativo do STATE.md (Current Plan: NN)
2. Ler `{PASTA_ATIVA}/plano{NN}/README.md`
3. Listar fases: Glob `{PASTA_ATIVA}/plano{NN}/fase-*.md`
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
  - PASTA_ATIVA (caminho absoluto — contexto obrigatorio)
  - Arquivo da fase: `{PASTA_ATIVA}/plano{NN}/fase-MM-nome.md` (completo)
  - README do plano: `{PASTA_ATIVA}/plano{NN}/README.md`
  - "Notas para Planos Seguintes" de `{PASTA_ATIVA}/plano{01..NN-1}/MEMORY.md`
  - Estado atual: relevant-only do `{PASTA_ATIVA}/STATE.md` (progresso, nao logs completos)
  - Padrao de codigo existente (1-2 arquivos de referencia do codebase do projeto — nao do docs/exec-plans/active/)
  - Instrucao: "Execute APENAS esta fase. Siga TDD. Commit atomico por passo."
  - Instrucao: "Reporte: decisoes tomadas, bugs encontrados, desvios do plano."
  - Instrucao: "Commits e edits de codigo vao para o repositorio DO PROJETO, nao dentro de PASTA_ATIVA.
    PASTA_ATIVA eh apenas para artefatos de planejamento (MEMORY.md, STATE.md updates)."

  NAO RECEBE:
  - PRD completo (o subagente ve apenas a fase)
  - Outras fases do plano
  - MEMORY.md completa de planos anteriores (so "Notas para Planos Seguintes")
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

<!-- 2026-05-14 (Luiz/dev): Step 4d agora consome contrato v1 — PRD §Decisoes #5 (kind dispatch)
     Aplica D2 (lifecycle vs domain_status), D9 (retry policy), D10 (reasoning threshold).
     Regex/markdown parse de status removido — dados vem do JSON estruturado. Plano 04 fase-01. -->

```
Apos cada subagente completar:

1. Ler output do subagente (string JSON — raw output do Task tool)
2. Parsar output via skills/lib/subagent-contract.ts → parseAndDispatch():
   - Se status === "blocked": registrar blocker no STATE.md, nao consolida payload
   - Se status === "needs_human": empilhar pergunta ao operador antes de consolidar
   - Se status === "needs_retry": withRetry(invoke, {max: 1}) ja cuidou — escala para
     needs_human apos 2a tentativa (D9)
   - Se status === "complete":
     - kind === "verification" (plan-verifier): ler payload.checks[] + payload.domain_status
     - kind === "verification" (plan-executor): ler payload.checks[] + payload.domain_status
       + payload.tasks_completed[] + payload.tasks_skipped[] (dual shape pos Plano 03 fase-03)
     - payload.domain_status === "partial" NAO e blocker lifecycle — fase parcial, mas segue (D2)
   - reasoning vai para MEMORY.md secao "Decisoes de Implementacao" como contexto rico (D10)
   - Extrair adicionalmente do human_readable:
     - Decisoes tomadas (DI-*)
     - Bugs encontrados (BUG-*)
     - Gotchas descobertos (GT-*)
     - Desvios do plano (DEV-*)

3. Atualizar `{PASTA_ATIVA}/STATE.md`:
   - Mudar status da fase
   - Incrementar progresso
   - Registrar evento no Log

4. Atualizar `{PASTA_ATIVA}/plano{NN}/MEMORY.md` do plano ativo:
   - Append decisoes em "Decisoes de Implementacao"
   - Append bugs em "Bugs Descobertos"
   - Append gotchas em "Gotchas"
   - Append desvios em "Desvios do Plano"
   - Atualizar metricas

5. Se payload.domain_status === "partial": registrar o que foi feito e o que falta
```

---

## Step 4-RETRY — Retries e Recuperacao

<!-- 2026-05-14 (Luiz/dev): Nota adicionada em Plano 04 fase-01 — PRD §Decisoes #9 (D9) -->
Nota: retries semanticos (status: "needs_retry") agora sao tratados pelo helper
withRetry() de skills/lib/subagent-contract.ts (1 retry default, cap em v6.1.0).
Os niveis 1/2/3 abaixo cobrem APENAS erros mecanicos do subagente
(timeout, processo morreu, output vazio). PRD §Decisoes #9.

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

## Captura Out-of-Scope (CA-33, D4 filosofia)

Durante execucao de uma fase, monitore arquivos lidos/editados. Se detectar trabalho **fora do campo `Scope`** do frontmatter do plano em curso, NAO tente corrigir — proponha adicao a `TODO.md`.

### Heuristica de deteccao (G5, 07-A4)

```
1. Ler campo `Scope` do frontmatter do plano (template D18 — array de glob patterns).
2. Para cada Edit/Write/Read de arquivo em tool call, comparar contra patterns:
   - Se path bate → in-scope, continuar.
   - Se path NAO bate → potencial out-of-scope.
3. Se detectar bug/typo em arquivo in-scope mas fora do foco da fase atual, tambem eh candidato.
```

### Fluxo de captura

```typescript
// Pseudocodigo — executar via importacao direta do helper
import { captureToTodoMd } from '../lib/execute-plan-todo-capture'

// 1. Detectar candidato out-of-scope
// 2. Perguntar ao usuario UMA vez:
//    "Item fora do scope detectado: {descricao}. Adicionar a TODO.md? [s/N]"
// 3. Default N (D4 — sugestivo, nao bloqueante)
// 4. Se 's': chamar captureToTodoMd(todoMdPath, { projectRoot, absolutePath, lineNumber, featureName, description })
// 5. Se 'n': continuar fluxo normal
```

### Fallback quando `Scope` ausente (07-A4)

```
Se o plano nao tem campo `Scope` parseavel:
- NAO oferecer captura automatica.
- Log: "Plano sem campo Scope estruturado — captura out-of-scope desativada para esta sessao."
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
Gerar `{PASTA_ATIVA}/SUMMARY.md` (nu, sem prefixo):

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

### Contexto de operacao pos-refatoracao

O Step 2-FLAT pode operar em 2 modos dependendo do que aconteceu no Step 0:

1. **Modo migrado (padrao):** PLAN.md flat vive em `docs/exec-plans/active/YYYY-MM-DD-{slug}/PLAN.md`.
   STATE.md ao lado. Step 2-FLAT le de la. (PASTA_ATIVA ja foi resolvida no Step 1.)

2. **Modo legacy v1 (opt-in via Step 0 "Nao"):** Dev escolheu nao migrar. PLAN.md flat
   esta em `.planning/PLAN-{feature}.md` solto. Step 2-FLAT le de la (legacy v5 — `/init` faz a migracao para v6).

O conteudo interno (waves/tasks) eh IDENTICO nos 2 modos — so o path eh diferente.

Para planos flat (PLAN.md unico com waves/tasks), manter o fluxo original:

```
Step 2-FLAT assume PASTA_ATIVA ja identificada no Step 1.
Todos os caminhos (STATE.md, logs) vivem dentro de PASTA_ATIVA.
Se detectar PLAN.md SOLTO na raiz de `.planning/` (sem pasta datada),
isso eh legacy v5 puro — `/anti-vibe-coding:init` faz a migracao v5→v6. Nesta fase, apenas
avisar: "PLAN.md solto detectado em `.planning/`. Rode `/anti-vibe-coding:init` para migrar."

O fluxo flat funciona exatamente como a versao anterior:
- Le waves e tasks do `{PASTA_ATIVA}/PLAN.md`
- Executa wave por wave com subagentes
- TDD com isolamento RED/GREEN
- STATE.md com tracking por task — vive em `{PASTA_ATIVA}/STATE.md`
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

1. **Salvar `{PASTA_ATIVA}/SUMMARY.md`** com consolidado de todas as memorias
2. **Destilacao de memoria** — oferecer salvar licoes uteis
3. **Atualizar `{PASTA_ATIVA}/STATE.md`** — phase: completed
4. **Sugerir /verify-work** para auditoria pos-implementacao

### Learn Point (opcional)

> "Quer entender context isolation RED/GREEN, execucao hierarquica ou memoria por plano? Posso aprofundar via `/learn`."

### Escape Hatches
- Dev pode pausar entre planos (estado salvo em `{PASTA_ATIVA}/STATE.md`)
- Dev pode pular plano inteiro (dependentes ficam pending)
- Dev pode abortar a qualquer momento (estado e memoria salvos dentro de PASTA_ATIVA)
- Dev pode trocar de contexto entre planos (recomendado para features grandes)

---

## Completion Signal (D33)

Ao finalizar a execucao de um plano (quando `onPlanPotentiallyComplete` move o plano para `completed/`), a skill emite automaticamente um bloco YAML machine-readable via `console.log`. Orquestradores podem extrair o sinal usando `extractCompletionSignal(output)`.

```typescript
import { renderCompletionSignal } from '../lib/completion-signal'
console.log('\n\n' + renderCompletionSignal({
  skill: 'execute-plan',
  status: 'complete',
  outputs: [/* path relativo do plano movido para completed/ */],
  next_suggested: '/iterate',
  blocks_for_user: [],
}))
```

---

## Referencias

- `references/wave-execution.md` — Conceitos de waves, paralelismo e recuperacao (formato flat)
- `skills/plan-feature/templates/memory-template.md` — Template de memoria por plano
- `agents/plan-executor.md` — Agent que executa tasks/fases individuais
- `agents/plan-verifier.md` — Agent que verifica output (read-only)
- `lib/legacy-detector.md` — Algoritmo de deteccao de estrutura legacy (consumido pelo Step 0)
- `lib/legacy-migrator.md` — Algoritmo de migracao atomica STAGE/MOVE/CONFIRM/ROLLBACK (consumido pelo Step 0)

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "O plano estava errado, vou improvisar" | Improviso durante execucao gera desvios nao documentados. Correto: pausar, atualizar o plano com a decisao, entao prosseguir. O plano e o registro de decisao — improvisacao apaga rastro. |
| "Esse arquivo extra nao conta como desvio de escopo" | Todo arquivo fora do escopo declarado e uma decisao nao registrada. Se vale tocar, vale registrar no plano. |
| "Vou passar pela fase sem validar — sei que funcionou" | Verificacao sem evidencia nao e verificacao. Checklist nao executado e teatro de qualidade. |
| "Posso pular a fase de testes — os tipos ja garantem" | Types nao testam comportamento em runtime. Fases de teste existem precisamente porque o compilador nao consegue garantir tudo. |

## Red Flags

- Sub-agente que toca mais de 5 arquivos nao relacionados sem justificativa no plano
- Fase concluida sem checklist de verificacao preenchido
- PR que mistura mudancas de 2+ planos distintos
- Decisao tomada durante execucao que nao foi registrada no MEMORY.md do plano
- Step executado sem ter lido o arquivo antes de editar (violacao de integridade de edicao)
- Fase marcada como concluida antes de `bun run harness:validate` verde

```typescript
// === Telemetria passiva (Plano 03 fase-02) — registra fim ===
// CA-03: end emitido SEMPRE
// Limitacao conhecida: sucesso=true hardcoded (skill declarativa sem try/catch — ver MEMORY.md G9)

const __telemetry_endEntry: TelemetryEnd = {
  evento: 'end',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  timestamp_fim: new Date().toISOString(),
  duracao_ms: Date.now() - __telemetry_startMs,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 0,
  arquivos_modificados: 0,
  sucesso: true,
}

writeTelemetryEnd(__telemetry_endEntry)
// === Fim do bloco de fim ===
```
