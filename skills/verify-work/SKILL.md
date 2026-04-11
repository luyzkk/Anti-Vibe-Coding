---
name: verify-work
description: "Verificacao pos-execucao com testes, auditoria multi-agente paralela, test quality audit (cobertura real, testes fracos, alucinacoes) e debug automatico. Evolucao do anti-vibe-review com superpoderes."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
argument-hint: "[feature name ou caminho de arquivos]"
---

# Verify Work — Verificacao Pos-Execucao

Skill de verificacao ativa. Roda testes, lint, auditoria multi-agente paralela e test quality audit. Debug automatico quando algo falha.

Diferenca das outras skills:
- **anti-vibe-review**: auditoria read-only pos-implementacao (manual, sem testes)
- **verify-work**: verificacao ativa com testes + debug automatico + pipeline de auditoria
- **plan-verifier agent**: verifica se uma task especifica do plano foi completada

---

## Step 1 — Rodar Testes e Lint

```
1. IDENTIFICAR escopo:
   - Se argumento fornecido → usar como nome da feature para o relatorio
   - Se nao → inferir do branch atual (git branch) ou ultimo commit (git log -1)

2. LER CONFIG:
   Ler anti-vibe-coding/config/verify-work.json
   Se nao existir → usar defaults:
     max_debug_retries: 3, auditors: all true, mutation_testing: false

3. RODAR testes:
   Executar via Bash: bun run test
   Capturar output completo (stdout + stderr)
   Se comando nao existir: "bun run test nao encontrado. Verificar package.json."

4. RODAR lint:
   Executar via Bash: bun run lint
   Capturar output completo
   Se comando nao existir: registrar como "lint nao configurado" (nao bloqueia)

5. SE TUDO PASSA:
   "Testes e lint passando. Iniciando audit pipeline..."
   Prosseguir para Step 2

6. SE FALHA → Debug Agent:
   a. Extrair linhas relevantes do erro (stack trace, assertion, arquivo:linha)
   b. Identificar arquivos relevantes via stack trace (max 3 arquivos)
   c. Spawn subagente debug com:
      - Output de erro (linhas relevantes, nao dump inteiro)
      - Conteudo dos arquivos relevantes (Read)
      - "Analise este erro e proponha um fix especifico com arquivo:linha"
   d. Apresentar ao dev:
      "Fix proposto para [erro]:
       Diagnostico: [resumo em 1 linha]
       Mudanca: [arquivo:linha — descricao]
       Aplicar?"
   e. Se dev aprova → aplicar fix → re-rodar testes (voltar ao passo 3)
   f. Se dev rejeita → registrar como issue manual, perguntar se continua audit mesmo assim
   g. Max tentativas: config.max_debug_retries (default: 3)
      - Se esgotadas → registrar como BLOCKER no relatorio
      - "3 tentativas falharam. Continuar audit pipeline mesmo assim?"
```

---

## Step 2 — Audit Pipeline

Spawnar auditores em paralelo (quando config.parallel_auditors = true).

### 2a. Identificar Arquivos Modificados

```
Prioridade (em ordem):
1. Argumento fornecido → usar como escopo
2. git diff --name-only HEAD~1 → arquivos do ultimo commit
3. git diff --name-only → staged files
4. git status → arquivos modificados

Classificar por dominio para determinar auditores domain-specific:
| Pattern no caminho/conteudo | Dominio | Agent |
|-----------------------------|---------|-------|
| api/, route, controller, endpoint, handler | API | api-auditor |
| .tsx, .jsx, component, hook, use | React | react-auditor |
| .sql, migration, prisma, drizzle, query | DB | database-analyzer |
| docker, Dockerfile, .env, deploy, ci | Infra | infrastructure-auditor |
| class, interface, extends, implements | SOLID | solid-auditor |
```

### 2b. Auditores Fixos (sempre rodam, se config.auditors.X = true)

**tdd-verifier:**
- Input: arquivos de teste + arquivos de producao correspondentes
- Verifica: testes existem? foram escritos antes do codigo? TDD compliance
- Skippado se: config.auditors.tdd = false

**security-auditor:**
- Input: todos os arquivos modificados
- Verifica: OWASP top 10, secrets expostos, input validation, timing attacks
- Skippado se: config.auditors.security = false

**code-smell-detector:**
- Input: todos os arquivos modificados
- Verifica: God objects, funcoes longas, DRY violations, magic numbers
- Skippado se: config.auditors.code_quality = false

### 2c. Auditores Domain-Specific (condicional, se config.auditors.domain_specific = true)

Spawn apenas dos detectados na classificacao de arquivos modificados.

Spawn todos em paralelo com os fixos (mesma mensagem, multiplos Agent calls).

### 2d. Modelo por Auditor

```
Para cada auditor a spawnar:
1. Ler config.model_profiles.{agent_name}
2. Se "default" → resolver via model-profile-utils.md (plano 01)
   Se model profiles nao existir → herdar modelo do contexto pai
3. Passar model no spawn do Agent
```

### 2e. Test Quality Audit (se config.auditors.test_quality = true)

Executar APOS auditores fixos/domain-specific (precisa dos arquivos de teste identificados).

**Verificacao 1 — Cobertura Real (Negocios vs Infra):**
```
1. Classificar arquivos com testes por categoria:
   - Negocios: service, useCase, domain, validator, business (keywords no caminho)
   - Infra: mapper, config, util, adapter, dto, type, schema
   - Fronteira: controller, route, handler (conta 50% para cada)
2. Calcular:
   - Cobertura negocios: (arquivos de negocio testados / total negocio) × 100
   - Cobertura infra: (arquivos infra testados / total infra) × 100
3. Alertas:
   - Cobertura negocios < config.coverage_threshold_business → WARNING
   - >30% testes cobrem apenas infra → WARNING: "cobertura inflada"
```

**Verificacao 2 — Testes Fracos:**
```
Patterns CRITICO (teste nao testa nada):
- expect(true).toBe(true) ou equivalente
- Teste sem nenhuma assertion

Patterns WARNING (teste superficial):
- Apenas verifica .length ou .count sem validar conteudo
- Apenas happy path (nao testa edge cases ou erros)
- Nomes genericos: "should work", "test function", "test1"
- Assertions apenas em typeof/instanceof sem verificar valores
- Nome de teste com "should" (anti-pattern do CLAUDE.md)
```

**Verificacao 3 — Alucinacoes:**
```
Para cada teste:
1. Extrair imports de modulos do projeto (excluir node_modules)
2. Para cada import:
   - Verificar que o arquivo existe (Glob)
   - Verificar que o metodo/export chamado existe no arquivo (Grep)
3. Alertas:
   - Import aponta para arquivo inexistente → CRITICO
   - Metodo chamado nao existe no arquivo importado → CRITICO
   - Referencia a variavel nao encontrada no escopo → WARNING
```

**Verificacao 4 — Mutation Testing (se config.mutation_testing = true):**
```
Pre-condicao: mutation_testing = true
Se false: "Mutation testing desabilitado. Habilite em config/verify-work.json para ativar."

Mecanica:
1. Identificar pontos de mutacao nos arquivos modificados:
   - Operadores: > → <, >= → <=, == → !=, && → ||
   - Valores: true → false, 0 → 1
2. Para cada mutacao (max 20 por arquivo):
   a. Aplicar mutacao TEMPORARIAMENTE (git stash ou copy em memoria)
   b. Rodar testes que cobrem aquele arquivo
   c. Se testes FALHAM → mutacao detectada (bom)
   d. Se testes PASSAM → mutacao sobreviveu (teste fraco)
   e. REVERTER mutacao IMEDIATAMENTE apos cada teste
3. Report: "Mutation score: X/Y ({percentage}%)"
   - Listar mutacoes que sobreviveram com arquivo:linha
   - Alvo: >70% para codigo de negocios

IMPORTANTE: mutacoes sao SEMPRE revertidas. Nunca persistir.
```

**Verificacao 5 — TDD Compliance via Git History:**
```
1. Analisar commits recentes (desde inicio da feature):
   - git log --name-only para extrair arquivos por commit
   - Separar: .test.* (testes) vs arquivos de producao
2. Para cada par (teste, producao):
   - Qual commit veio primeiro?
3. Classificar:
   - STRICT: teste commitado ANTES do codigo (1 a 1)
   - PARTIAL: testes existem mas commitados junto ou depois
   - NONE: codigo sem testes correspondentes
```

### 2f. Coletar Resultados

```
- Aguardar todos os agents completarem
- Se agent falha (timeout, erro) → registrar como "audit incomplete: {agent}"
- Consolidar todos os findings em lista unica
- Deduplicar: se mesmo issue aparece em 2+ agents → manter o mais severo
- Prosseguir para Step 3
```

---

## Step 3 — Compilar Relatorio

```
1. Classificar cada finding por severidade:
   CRITICO: vulnerabilidade exploravell, referencia a codigo inexistente,
            dados sensiveis expostos, teste que nunca falha por design
   ALTO: sem testes para logica de negocio, N+1 em producao,
         code smell que indica bug potencial, TDD: NONE
   MEDIO: code smells esteticos, cobertura baixa em infra,
          nomes de teste genericos, sugestoes de refatoracao

2. Ordenar: CRITICO → ALTO → MEDIO

3. Limitar a config.max_report_lines (default: 50):
   - Se exceder: agrupar findings similares (ex: "3 funcoes longas em parser.ts")
   - Nota ao final: "{N} findings adicionais. Quer ver lista completa?"

4. Gerar relatorio:
```

### Template do Relatorio

```markdown
## Verification Report: {Feature Name}

### Summary
- Tests: ✅ {pass}/{total} | ❌ FAILED ({failures})
- Lint: ✅ clean | ❌ {N} errors
- TDD Compliance: ✅ strict | ⚠️ partial | ❌ none
- Security: ✅ clean | ⚠️ {N} warnings | ❌ {N} issues
- Code Quality: ✅ clean | ⚠️ {N} smells | ❌ {N} issues
- Test Quality: ✅ solid | ⚠️ {N} weak | ❌ {N} hallucinated

### Issues Found
| # | Severity | Category | Description | File:Line |
|---|----------|----------|-------------|-----------|
| 1 | CRITICO  | Security | ...         | ...       |
| 2 | ALTO     | TDD      | ...         | ...       |
| 3 | MEDIO    | Quality  | ...         | ...       |

### Test Quality Assessment
- Business coverage: {X}% ({Y}/{Z} business files tested)
- Weak tests detected: {N}
- Hallucinated references: {N}
- Mutation score: {X}% | Disabled
- TDD compliance: strict | partial | none

### Recommendations
- {top 3 acoes priorizadas por severidade}
```

---

## Step 4 — Apresentar ao Dev e Decidir

```
1. Mostrar relatorio compilado

2. SE tudo verde (nenhum finding):
   "Tudo limpo. Verificacao completa."
   "Quer fazer commit? Push? Criar PR?"
   Encerrar.

3. SE existem findings CRITICOS:
   "Encontrei {N} issues criticos. Recomendo corrigir antes de prosseguir."
   AskUserQuestion:
   - "Fix automatico dos criticos" → spawnar agent por categoria, re-verificar parcialmente
   - "Corrigir manualmente" → listar issues com arquivo:linha exato
   - "Aceitar como esta (exige justificativa)" → perguntar motivo, registrar

4. SE apenas ALTOS/MEDIOS:
   "Encontrei {N} issues (nenhum critico)."
   AskUserQuestion:
   - "Fix automatico" → spawnar agent, re-verificar
   - "Corrigir manualmente" → listar issues
   - "Aceitar" → sem justificativa necessaria

5. SE fix automatico escolhido:
   - Spawn agent por CATEGORIA (nao 1 agent por finding)
   - Agent recebe: findings da categoria + arquivos relevantes
   - Apos fix → re-rodar APENAS o auditor da categoria (nao pipeline inteiro)
   - Apresentar: "Corrigido {X} de {Y}. Restam: {lista}"

6. SE aceitar CRITICOS:
   AskUserQuestion: "Issues criticos serao aceitos. Motivo?"
   Registrar: "{date} — Aceito: {issue} — Motivo: {motivo}"
   Sugerir: "Quer registrar como decisao? /anti-vibe-coding:decision-registry"
```

---

## Step 5 — Learn Point

```
Oferecer apos resolucao (NAO forcar):
"Quer entender algum finding da auditoria?"

Se sim:
- Listar categorias com findings
- Dev escolhe categoria
- Explicar o conceito (usando senior-principles.md como base):
  - O que e o problema
  - Por que e um problema (consequencia real, nao teorica)
  - Como evitar no futuro (padrao concreto)
- Sugerir skill relevante: /anti-vibe-coding:{skill}

Se nao:
- "Verificacao completa. {status resumido}"
```

---

## Pipeline Integration

### 0. Importar Contexto de Pipeline (se disponivel)
Antes de iniciar a verificacao, verificar se `.planning/SUMMARY.md` existe:

- **Se existir:** Usar o SUMMARY.md para enriquecer o contexto da verificacao:
  - Waves executadas → focar auditoria nas areas tocadas
  - Arquivos modificados → verificar especificamente esses arquivos
  - Issues encontrados durante execucao → verificar se foram realmente resolvidos
  - Dizer ao dev: "Encontrei `.planning/SUMMARY.md`. Vou usar este contexto para focar a verificacao."

- **Se NAO existir:** Prosseguir com o fluxo normal de verificacao.

### Ao Finalizar a Verificacao

**Se tudo verde:**
> "Verificacao concluida com sucesso.
>
> Quer fazer commit, push e abrir o PR agora?
> - `/commit` para commit atomico
> - `/push` para push
> - `/open-pr` para abrir PR no GitHub"

**Se issues encontrados:**
> "Encontrei [N] issues. Quer que eu corrija antes de prosseguir com o commit/PR?"

### Learn Point (opcional)

> "Quer entender algum finding da verificacao ou como um dos auditores funciona? Posso aprofundar via `/learn`."

### Cleanup de Artefatos

Apos verificacao completa, sugerir ao dev:

> "Os artefatos em `.planning/` (CONTEXT, PRD, PLAN, STATE, SUMMARY) serviram para rastrear o processo. O codigo agora e a fonte de verdade.
>
> Opcoes:
> - Arquivar em `.planning/archive/{date}/` (preserva historico)
> - Manter como esta (para referencia futura)
> - Remover artefatos (o codigo e os commits contam a historia)"

NAO deletar automaticamente — sempre perguntar. O dev decide.

### Escape Hatches
- Esta skill e o encerramento do pipeline mas funciona standalone
- Dev pode aceitar issues e prosseguir para commit/PR mesmo com findings
- Se pipeline nao foi usado, o SUMMARY.md nao existira — a skill funciona normalmente sem ele

---

## Regras

1. Esta skill NAO modifica codigo diretamente — apenas coordena agents
2. Debug agent no Step 1 recebe contexto MINIMO (erro + 3 arquivos max)
3. Fix automatico re-roda apenas o auditor da categoria (nao pipeline inteiro)
4. Aceitar issues CRITICOS DEVE ter justificativa documentada
5. Mutation testing SEMPRE reverte mutacoes — nunca persistir
6. Se bun run test nao existir, reportar gracefully e continuar com lint + audit
7. Se nenhum agent estiver disponivel (plano 11 nao implementado), degradar para anti-vibe-review
8. Config e lida uma vez no inicio — nao reler em cada step
