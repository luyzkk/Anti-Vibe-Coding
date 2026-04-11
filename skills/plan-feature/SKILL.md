---
name: plan-feature
description: "Converts PRD into executable plan with vertical slices, tracer bullets, and parallel execution waves. Explores codebase, decomposes into end-to-end slices with acceptance criteria, and generates PLAN.md. Use when breaking down features into tasks, planning implementation order, or preparing for wave-based execution."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: "[caminho do PRD ou nome da feature]"
---

# Plan Feature — Planejamento de Execucao

Skill de planejamento. Converte PRD em plano executavel com vertical slices organizados em waves.

Diferenca das outras skills:
- **write-prd**: gera DOCUMENTO de especificacao (o que construir)
- **plan-feature**: gera PLANO de execucao (como construir, em que ordem)
- **execute-plan**: executa o plano task por task com subagentes

---

## Step 1 — Ler PRD

### Caminho A: Caminho fornecido como argumento

```
1. Se o dev passou caminho (/plan-feature "path/to/PRD.md"):
   - Ler com Read
   - Validar que contem estrutura de PRD (titulo, requisitos, criterios)
   - Se nao for PRD valido: "Este arquivo nao parece ser um PRD. Quer criar com /write-prd?"
2. Prosseguir para Step 2
```

### Caminho B: Buscar em .planning/

```
1. Se nao forneceu caminho:
   - Glob: ".planning/PRD-*.md"
   - Se 1 arquivo: ler diretamente, confirmar: "Encontrei PRD-{name}.md. Vou planejar com base nele."
   - Se mais de 1: listar e perguntar qual usar
2. Prosseguir para Step 2
```

### Caminho C: PRD nao existe

```
1. Informar: "Nao encontrei nenhum PRD em .planning/."
2. Oferecer: "Quer criar um com /write-prd?"
3. Se o dev fornecer descricao inline: aceitar como PRD simplificado
   - Avisar: "Vou planejar com base nessa descricao, mas um PRD completo daria mais precisao."
4. Prosseguir (ou encerrar se dev quiser criar PRD primeiro)
```

---

## Step 2 — Explorar Codebase

**Prioridade: ler CLAUDE.md do projeto primeiro** (fonte de verdade para stack e padroes).
Maximo 10 chamadas de ferramentas.

### 1. Pontos de Integracao
```
Onde a feature se encaixa no codebase existente:
- Rotas: Glob "src/app/**/page.*", "src/app/api/**", "src/routes/**"
- APIs, layouts, middleware que serao tocados
```

### 2. Codigo Existente Relacionado
```
- Features analogas que ja existem (padroes a seguir)
- Modulos que serao estendidos
- Grep por termos relacionados a feature no PRD
```

### 3. Testes Existentes
```
- Localizacao: Glob "**/*.test.*", "**/*.spec.*"
- Framework e padrao: ler 1-2 exemplos
```

### 4. Dependencias entre Modulos
```
- Imports cruzados entre modulos que serao afetados
- Shared types/interfaces
- Grep por imports dos modulos relevantes
```

Output intermediario (interno, nao mostrado ao dev):

```
## Contexto de Codebase
Pontos de Integracao: {lista de rotas, APIs, layouts}
Codigo Existente: {features analogas, modulos a estender}
Testes: {framework, padrao, localizacao}
Dependencias: {imports cruzados, types compartilhados}
Riscos Detectados: {anomalias, inconsistencias}
```

Regras:
- Nao chutar — "nao detectado" e preferivel a suposicao
- Se anomalia detectada (ex: 2 frameworks de teste), registrar como risco

---

## Step 3 — Decompor em Vertical Slices

### Conceito Core

```
Vertical Slice = fatia que atravessa TODAS as camadas da aplicacao
- Cada slice DEVE: test → service/logic → API/route → UI
- Cada slice DEVE ser deployavel independentemente
- Cada slice DEVE entregar valor ao usuario

Anti-pattern: Horizontal Layer (ex: "criar todos os modelos", "criar todas as rotas")
- Horizontal layers geram integracao tardia e riscos ocultos
- Vertical slices geram feedback rapido e deploys incrementais
```

### Tracer Bullet (Primeiro Slice Obrigatorio)

```
O PRIMEIRO slice de QUALQUER plano e o Tracer Bullet.

Definicao: O slice mais FINO possivel que conecta TODAS as camadas end-to-end.

Proposito:
- Prova que a arquitetura funciona ANTES de investir em funcionalidade completa
- Identifica problemas de integracao cedo (quando sao baratos de corrigir)

Como identificar:
1. Pegar o caso de uso mais simples do PRD (normalmente o Must Have principal)
2. Reduzir ao MINIMO viavel: 1 endpoint + 1 teste E2E + 1 tela com dados reais
3. Se ainda parecer grande, reduzir mais
4. Regra de ouro: se leva mais de 2h, nao e fino o suficiente

Exemplo: Feature "Sistema de notificacoes push"
- Tracer Bullet: POST /api/notifications → salva no banco → lista em /notifications (sem estilo, sem filtros)
- NAO e tracer bullet: "criar toda a API de notificacoes" (isso e horizontal layer)
```

### Slices Subsequentes

```
1. Ler cada requisito Must Have e Should Have do PRD
2. Para cada requisito: pode ser um slice independente?
   - Sim: criar slice com test → service → API → UI
   - Nao (depende de outro): agrupar no mesmo slice ou wave posterior
3. Could Have e Won't Have NAO viram slices — sao backlog

Regras:
- Cada slice tem nome descritivo e descreve o valor entregue
- Se slice toca APENAS uma camada, provavelmente e horizontal layer — repensar
- Slices devem ter tamanho de 1 PR (se possivel)
```

---

## Step 4 — Agrupar Slices em Waves

```
Waves agrupam slices por DEPENDENCIA:

Wave 1: slices que nao dependem de nada (rodam em paralelo)
  - SEMPRE contem o Tracer Bullet como Slice 1.1

Wave 2: slices que dependem de algo da Wave 1

Wave N: slices que dependem de Wave N-1

Regras:
- Dentro de uma wave, TODOS os slices sao independentes entre si
- Se 2 slices tem dependencia mutua, devem estar em waves sequenciais
- Se ha mais de 5 waves, a feature pode ser grande demais — sugerir split

Anti-pattern: dependencia escondida
- "Criar componente" (Wave 1) e "Usar componente" (Wave 1)
- Esses devem estar em waves diferentes OU no mesmo slice
```

---

## Step 5 — Detalhar Cada Task

```
Para cada task dentro de cada slice:

Files: caminhos EXATOS dos arquivos afetados
  - Baseado na exploracao do Step 2

Action: Create | Modify | Delete

Acceptance: criterio de aceite VERIFICAVEL por maquina ou humano
  - Escrever ANTES de detalhar a implementacao (forca pensamento declarativo)
  - Preferir criterios verificaveis por maquina:
    - "bun run test -- --grep 'validates email'" (teste especifico passa)
    - "curl localhost:3000/api/users retorna 200" (endpoint responde)
    - "bun run typecheck retorna 0 erros" (tipo compila)
  - Quando necessario, criterio verificavel por humano:
    - "Pagina /settings exibe toggle de dark mode" (visual)
    - "Formulario mostra mensagem de erro ao submeter vazio" (UX)

Complexity: S (< 30min) | M (30min-2h) | L (2h+)
  - Se L, considerar subdividir

Depends on (opcional): "Task N.M.K" — apenas dependencias diretas

Regras:
- Tasks dentro de um slice: ordem TDD (teste → implementacao → UI)
- Acceptance da 1a task do tracer bullet DEVE ser "Teste falha (Red)"
- Acceptance da ultima task do tracer bullet DEVE ser "Teste E2E passa (Green)"
- Acceptance vago invalida a task — "funciona" NAO e criterio aceitavel
```

---

## Step 6 — Gerar PLAN.md

```
1. Ler template de templates/plan-template.md
2. Preencher com dados reais dos Steps anteriores:
   - Header: nome, link ao PRD, totais, data
   - Waves com slices e tasks
   - Summary: tabela calculada por wave
   - Dependencies Graph: grafo ASCII das dependencias
   - Risks: do Step 2 + decomposicao

3. Calcular complexidade total (= complexidade do slice mais complexo)

4. Validar consistencia:
   - Toda task em "Depends on" existe no plano
   - Arquivos em "Files" coerentes com exploracao do Step 2
   - Nenhuma wave tem dependencia interna entre slices
   - Tracer bullet e o primeiro slice da Wave 1

5. Se detectar inconsistencia: corrigir automaticamente e avisar
```

---

## Step 7 — Apresentar ao Dev

```
1. Resumo PRIMEIRO (antes do plano completo):
   "{N} tasks em {M} waves
   Tracer Bullet: {descricao do slice 1.1}
   Complexidade estimada: {S/M/L}
   Riscos identificados: {quantidade}"

2. Destacar o Tracer Bullet:
   - Mostrar o slice completo com todas as tasks
   - "Este e o primeiro slice — prova a arquitetura end-to-end."

3. Mostrar o plano completo (PLAN.md gerado)

4. AskUserQuestion com 4 opcoes:
   - "Aprovar plano como esta"
   - "Ajustar (diga o que mudar)"
   - "Refazer decomposicao"
   - "Cancelar"

5. Se ajustar: aplicar mudancas especificas, mostrar diff, nova aprovacao
   - Maximo 3 iteracoes — se nao convergir, sugerir /grill-me

6. Se refazer: voltar ao Step 3 (manter Steps 1-2 intactos)
```

---

## Step 8 — Salvar Plano Aprovado

```
1. Nome: PLAN-{feature-name-kebab-case}.md
   - Ex: .planning/PLAN-sistema-de-notificacoes.md
2. Se .planning/ nao existir: criar
3. Se ja existir PLAN com mesmo nome: perguntar "Substituir ou criar versao (v2)?"
4. Salvar com Write
5. Confirmar: "Plano salvo em .planning/PLAN-{name}.md"
```

---

## Step 9 — Criar STATE.md Inicial

Criar `.planning/STATE-{feature-name}.md` (mesmo kebab-case do PLAN.md):

```markdown
# State: {Feature Name}

**Plan:** .planning/PLAN-{feature-name}.md
**Phase:** planned
**Current Wave:** 0
**Tasks Done:** 0/{total}
**Last Updated:** {date}

## Progress

| Wave | Slice | Task | Status |
|------|-------|------|--------|
| 1    | 1.1   | 1.1.1 | pending |
| 1    | 1.1   | 1.1.2 | pending |
| ... | ...   | ...   | ...     |

## Log
- {date}: Plano criado via /plan-feature
```

Fases possiveis: `planned` | `in-progress` | `wave-N` | `completed` | `paused`
Status por task: `pending` | `in-progress` | `done` | `blocked` | `skipped`

---

## Step 10 — Learn Point

Oferecer ao dev (NAO forcar):

> "Quer entender os conceitos por tras deste plano?"

Se sim, explicar brevemente:
- **Vertical Slices:** cada slice atravessa todas as camadas (test → service → API → UI). Feedback rapido, deploys incrementais.
- **Tracer Bullet:** o slice mais fino que prova a arquitetura end-to-end. Do livro "The Pragmatic Programmer".
- **Waves:** agrupamento por dependencia. Dentro de uma wave, execucao e paralela.

Para aprofundar: sugerir `/anti-vibe-coding:learn "vertical slices"` ou `/anti-vibe-coding:learn "tracer bullet"`

---

## Step 11 — Proximo Passo

| Cenario | Sugestao |
|---------|----------|
| /execute-plan existe | "Quer prosseguir para /execute-plan?" |
| /execute-plan nao existe | "Comece pelo Tracer Bullet (Slice 1.1). Cada task tem Files, Action e Verify para guiar." |
| Dev quer revisar | "O plano e editavel diretamente em .planning/PLAN-{name}.md. Regenere com /plan-feature se a feature mudar." |
| Dev quer voltar ao PRD | "Quer ajustar o PRD antes de executar? Rode /write-prd para editar." |

---

## Pipeline Integration

### 0. Importar PRD (se disponivel)
Antes de iniciar o planejamento, verificar se `.planning/PRD.md` existe:

- **Se existir:** Importar automaticamente. Dizer ao dev:
  > "Encontrei `.planning/PRD.md` do `/write-prd`. Vou usar este PRD como base para o plano de execucao."
  Usar os requisitos e escopo do PRD para guiar a criacao dos vertical slices e waves.

- **Se NAO existir:** Prosseguir com o fluxo normal — perguntar ao dev o que planejar.

### 1. Salvar Plano e Criar STATE.md Inicial
Ao finalizar o plano aprovado:
1. Salvar plano em `.planning/PLAN.md`
2. Criar `.planning/STATE.md` com `phase: planejado` e todas as tasks como `pending`

### 2. Sugerir Proximo Passo

> "Plano salvo em `.planning/PLAN.md`. STATE.md criado.
>
> Quer prosseguir para `/execute-plan`? Ele vai executar as waves com subagentes isolados."

### 3. Learn Point (opcional)

> "Quer entender vertical slices, tracer bullet ou como waves organizam a execucao paralela? Posso aprofundar via `/learn`."

### Escape Hatches
- Esta skill funciona standalone: o pipeline e opcional
- Se PRD.md existir mas o dev quiser ignorar: confirmar antes de descartar
- Dev pode voltar ao PRD: "quero ajustar o PRD antes de planejar"
- O plano e editavel diretamente em `.planning/PLAN.md`

---

## Regras

1. O plano e o contrato — /execute-plan segue EXATAMENTE o que esta no plano
2. Se o plano estiver errado, corrigir o PLANO (nao improvisar durante execucao)
3. Tracer bullet pode parecer "pouco" mas e o slice mais importante
4. Waves devem ser genuinamente paralelas — sem dependencias escondidas
5. Cada task deve ser verificavel — "Verify" vago invalida a task
6. Se uma feature gera mais de 5 waves, sugerir split em sub-features
7. NUNCA gerar plano sem aprovacao do dev (Step 7 e obrigatorio)
8. NUNCA salvar plano se dev cancelar a aprovacao
9. STATE.md e a fonte de verdade para progresso — /execute-plan atualiza, dev pode editar
10. O plano e um documento vivo — pode ser regenerado se a feature mudar
