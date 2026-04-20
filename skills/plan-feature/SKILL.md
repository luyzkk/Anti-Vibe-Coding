---
name: plan-feature
description: "Converts PRD into executable hierarchical plan. Analyzes complexity like a senior engineer, decomposes into multiple plans with detailed phases, generates folder structure with memory per plan. Uses isolated subagents for each plan creation."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Agent, AskUserQuestion
argument-hint: "[caminho do PRD ou nome da feature]"
---

# Plan Feature — Planejamento Hierarquico de Execucao

Skill de planejamento. Converte PRD em plano executavel com estrutura hierarquica:
PRD → Planos → Fases (tasks detalhadas por plano).

Diferenca das outras skills:
- **write-prd**: gera DOCUMENTO de especificacao (o que construir)
- **plan-feature**: gera PLANOS de execucao (como construir, em que ordem)
- **execute-plan**: executa os planos fase por fase com subagentes isolados

Estrutura gerada (dentro da pasta datada do PRD):

```
.planning/
└── 2026-04-20-{feature-slug}/        ← criada pelo /write-prd
    ├── PRD.md                        ← ja existe
    ├── PLAN.md                       ← gerado aqui (overview)
    ├── STATE.md                      ← gerado aqui (tracking global)
    │
    ├── plano01/
    │   ├── README.md                 ← overview do plano
    │   ├── MEMORY.md                 ← memoria viva (bugs, learnings)
    │   ├── fase-01-{nome}.md         ← task detalhada
    │   └── fase-02-{nome}.md
    │
    └── plano02/ ...
```

---

## Step 0 — Deteccao de Legacy

Roda ANTES de qualquer outra coisa. Se projeto tem estrutura pre-refatoracao
(`PRD-*.md` ou `planoNN/` soltos em `.planning/`), esta skill nao consegue operar sem antes
migrar — ou sem explicitamente ignorar.

Algoritmo referenciado: `lib/legacy-detector.md`.
Migracao referenciada: `lib/legacy-migrator.md`.

### Fluxo

```
1. Se `.planning/` nao existe: skip Step 0, ir direto para Step 1 (projeto greenfield).
2. Executar `detectLegacy(".planning/")` conforme `lib/legacy-detector.md`.
3. Se `legacy == false`: skip — ir para Step 1.
4. Se `legacy == true`:
   a. Apresentar ao dev:
      "Detectei estrutura legacy em .planning/:
         Sinais: {signals.join(', ')}
         Artefatos:
           - {cada artifact.path}
         Slug inferido: {suggestedSlug ou 'nenhum — preciso que voce forneca'}
      "
   b. Se `suggestedSlug` for null (ambiguous):
      - Perguntar ao dev (AskUserQuestion): "Qual slug usar para a pasta destino?
        Formato: kebab-case, ex: auth, sistema-notificacoes"
      - Validar resposta contra regex `^[a-z0-9][a-z0-9-]*$`
      - Se invalido: re-perguntar 1x; se continuar invalido: oferecer cancelar
   c. Computar nome da pasta: `targetFolderName = "{YYYY-MM-DD}-{slug}"`
      - Data: data atual no formato YYYY-MM-DD
   d. Se `.planning/{targetFolderName}/` ja existir: avisar colisao e oferecer
      `{targetFolderName}-v2` ou cancelar.
      Mensagem: "A pasta {targetFolderName} ja existe. Possiveis causas:
        - Outra sessao ja migrou esta feature
        - Voce rodou plan-feature 2x hoje para a mesma feature
        Opcoes: criar como {targetFolderName}-v2 / cancelar"
   e. AskUserQuestion: "Migrar estes {N} artefatos para .planning/{targetFolderName}/?"
      Opcoes:
        - "Sim, migrar agora"
        - "Nao — prosseguir com plan-feature em modo greenfield (legacy fica intocado)"
        - "Cancelar plan-feature"
   f. Se "Sim":
      - Chamar `migrateLegacy(detectorResult, targetFolderName)` conforme `lib/legacy-migrator.md`
      - Se retorno status == "success":
        - Confirmar: "Migrado com sucesso. {N} artefatos em .planning/{targetFolderName}/"
        - Continuar Step 1 com a pasta migrada como contexto ativo
      - Se retorno status == "rolled_back" ou "aborted":
        - Reportar erro claramente
        - Perguntar: "prosseguir em modo greenfield ou cancelar?"
   g. Se "Nao":
      - Confirmar: "Prosseguindo em modo greenfield. Legacy em .planning/ nao foi tocado."
      - Ir para Step 1 (que vai criar nova pasta datada para a nova feature)
   h. Se "Cancelar":
      - Encerrar skill sem tocar em nada

Regras:
- Step 0 roda apenas 1 vez por invocacao
- Se migracao falhou (rolled_back): NAO insistir automaticamente — deixar dev corrigir
- Slug fornecido pelo dev vale apenas para a sessao atual
```

---

## Step 1 — Ler PRD

NOTA: Apos identificar o PRD, a skill fixa a PASTA_ATIVA = diretorio que contem `PRD.md`.
TODOS os artefatos gerados por esta skill (PLAN.md, STATE.md, planoNN/) sao escritos
dentro de PASTA_ATIVA. Nunca na raiz de `.planning/`.

### Caminho A: Caminho fornecido como argumento

```
1. Se o dev passou caminho, aceita DOIS formatos:

   a) Caminho de ARQUIVO: /plan-feature ".planning/2026-04-20-slug/PRD.md"
      - Validar que o arquivo existe
      - PASTA_ATIVA = diretorio pai do arquivo (ex: ".planning/2026-04-20-slug/")
      - Salvaguarda: se o caminho contem "_archive/", RECUSAR com:
        "Este PRD esta arquivado. Mova para fora de `_archive/` se quiser re-planejar."

   b) Caminho de PASTA: /plan-feature ".planning/2026-04-20-slug/"
      - PASTA_ATIVA = a propria pasta informada
      - Verificar existencia de "{PASTA_ATIVA}/PRD.md"
      - Se nao existir: "Nao encontrei PRD.md em {PASTA_ATIVA}. Quer criar com /write-prd?"
      - Salvaguarda: se a pasta esta dentro de "_archive/", RECUSAR com a mesma mensagem acima

   Apos identificar o arquivo PRD.md:
   - Ler com Read
   - Validar que contem estrutura de PRD (titulo, requisitos, criterios)
   - Se nao for PRD valido: "Este arquivo nao parece ser um PRD. Quer criar com /write-prd?"

2. Prosseguir para Step 2
```

### Caminho B: Buscar em .planning/ (nova estrutura — pastas datadas)

```
1. Se nao forneceu caminho:
   a. Enumerar pastas datadas em `.planning/` (mesmo algoritmo do execute-plan Step 1a)
      - Glob `.planning/YYYY-MM-DD-*/`
      - Excluir `_archive/`
      - Para cada pasta, ler `STATE.md` e extrair `Phase`
        (STATE.md usa "**Phase:**" bold — buscar com regex, nao grep literal)
      - Default filtrar: `planned` + `in-progress` + `paused`
      - Flag `--all`: incluir `completed`
      - Pasta sem STATE.md: tratar como status `planned`
   b. Se 1 PRD apos filtro:
      - Ler `{pasta}/PRD.md` diretamente
      - Confirmar: "Encontrei {nome}. Vou planejar com base no PRD.md dentro."
      - PASTA_ATIVA = "{pasta}/" (caminho ABSOLUTO — necessario para subagentes)
   c. Se 2+ PRDs apos filtro:
      - Listar como no execute-plan:
        [1] 2026-04-20-sistema-notificacoes (in-progress)
        [2] 2026-04-21-auth-refactor (planned)
        Para qual vou criar/ajustar planos?
      - Dev escolhe, le `{escolhida}/PRD.md`
      - PASTA_ATIVA = pasta escolhida (caminho ABSOLUTO)
   d. Se lista vazia:
      - Se `--all` foi usado: "Nenhum PRD em .planning/." → Caminho C
      - Se default: "Nenhum PRD ativo (planned/in-progress/paused). Rode /plan-feature --all para ver todos."
      - Oferecer Caminho C (PRD nao existe)
   e. Se ZERO pastas datadas (independente de filtro):
      - Verificar se ha PRD-*.md solto na raiz de .planning/ → legacy, nao migrar aqui
      - Oferecer Caminho C
2. Prosseguir para Step 2 operando DENTRO da pasta escolhida
   (todos os outputs vao para `{pasta}/PLAN.md`, `{pasta}/STATE.md`,
    `{pasta}/planoNN/` — conforme Step 8)
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

## Step 4 — Analise de Complexidade (Julgamento Senior)

Este e o passo critico. A decisao de quantos planos e quantas fases NAO usa thresholds arbitrarios.
A LLM deve analisar como um engenheiro senior faria:

### Principios de Decomposicao Senior

```
1. RESPONSABILIDADE UNICA POR TASK
   Se nao cabe em uma frase, e grande demais.
   "Criar migration de notifications com RLS" = 1 task.
   "Criar todas as migrations" = multiplas tasks.

2. COMMIT ATOMICO
   Cada task = um commit revertivel.
   Teste mental: "se precisar de git revert, o revert faz sentido sozinho?"

3. TESTAVEL ISOLADAMENTE
   Cada task tem criterio de verificacao que roda sem depender das tasks seguintes.

4. TIME-BOXED
   Completavel em uma sessao (30min-2h).
   Se parece "trabalho de um dia", precisa de split.

5. RISCO PROPORCIONAL A GRANULARIDADE
   Areas incertas (integracao externa, auth, migration complexa) → tasks menores.
   Areas conhecidas (CRUD padrao, componente similar) → tasks maiores.

6. VERTICAL, NAO HORIZONTAL
   Uma task toca todas as camadas para UM comportamento.
   Nao "criar todos os tipos" — mas "criar tipo + migration + query para entidade X".
```

### Sinais Semanticos de Complexidade

Analisar o PRD buscando estes sinais (NAO contar KBs ou linhas):

```
SINAIS DE COMPLEXIDADE ALTA (multiplos planos):
- Multiplas entidades com relacionamentos (joins, FK, RLS policies)
- Integracoes externas (APIs terceiras, webhooks, sync)
- Multiplos roles/permissoes afetados
- Migrations + API + UI + testes E2E na mesma feature
- Dependencias entre requisitos Must Have (um bloqueia outro)
- Dominio de negocio complexo (regras condicionais, estados, transicoes)
- Preocupacoes de seguranca (auth, crypto, rate limiting)

SINAIS DE COMPLEXIDADE BAIXA (plano unico):
- CRUD simples de uma entidade
- Feature isolada sem dependencias externas
- Extensao de algo que ja existe (adicionar campo, novo filtro)
- UI pura sem backend novo
```

### Decisao de Estrutura

```
Apos decompor os slices (Step 3), analisar:

1. Quantas camadas distintas sao cruzadas?
   (migration, types, queries, API, componentes, paginas, testes)

2. Quantas entidades independentes existem?
   (cada entidade com seu proprio ciclo de vida)

3. Existem dependencias seriais entre grupos de slices?
   (grupo A precisa estar pronto antes de grupo B comecar)

4. Existe divisao natural em "dominios" ou "fases"?
   (fundacao → core → UI → polish)

A QUANTIDADE DE PLANOS E EMERGENTE desses fatores.
Nao e pre-determinada. O modelo analisa e decide.

Se a feature se resolve em 1 plano com 3-5 fases: otimo.
Se precisa de 5 planos com 4-8 fases cada: otimo tambem.
O numero e consequencia do julgamento, nao meta.
```

---

## Step 5 — Agrupar Slices em Planos

### Criterios de Agrupamento

```
Cada PLANO agrupa slices que:
1. Compartilham o mesmo dominio/camada principal
2. Tem dependencias internas entre si
3. Formam uma "unidade coerente" de entrega

Exemplos de agrupamento natural:
- Plano 1 "Fundacao": types, migrations, seed data, configs
- Plano 2 "API Core": queries, services, endpoints, testes de integracao
- Plano 3 "Componentes": componentes shared, hooks, utils de UI
- Plano 4 "Paginas": montagem de paginas, rotas, layouts
- Plano 5 "Polish": error handling, loading states, a11y, E2E
```

### Cada Plano tem Fases

```
Dentro de cada plano, as fases seguem a mesma logica senior:

1. Cada fase = 1 vertical slice ou grupo coeso de tasks
2. Cada fase e completavel em 30min-2h (time-boxed)
3. Cada fase tem criterio de verificacao claro
4. Fases dentro do plano podem ter dependencias entre si
5. A ordem das fases reflete a ordem natural de construcao

Uma fase DEVE conter:
- Descricao clara do que entrega
- Arquivos exatos afetados (caminhos reais do codebase)
- Codigo de referencia (snippets, tipos, SQL) quando aplicavel
- Gotchas conhecidos do PRD/CONTEXT
- Checklist de verificacao
- Sizing estimado (0.5h / 1h / 1.5h / 2h)
```

---

## Step 6 — Gerar PLAN Overview

```
1. Ler template de templates/plan-overview-template.md
2. Preencher com dados reais:
   - Header: nome da feature, link ao PRD, totais, data
   - Lista de planos com descricao e sizing
   - Grafo ASCII de dependencias entre planos
   - Riscos identificados no Step 2 + decomposicao
3. Validar consistencia:
   - Todo plano referenciado existe na lista
   - Dependencias entre planos sao aciclicas
   - Nenhum plano isolado sem conexao (exceto se genuinamente independente)
4. NÃO gerar os planos detalhados ainda — apenas o overview
```

---

## Step 7 — Apresentar ao Dev

```
1. Resumo PRIMEIRO (antes de qualquer arquivo):
   "Analisei o PRD e identifiquei {N} planos:

   Plano 1: {nome} ({M} fases, ~{X}h)
     {descricao de 1 linha do que entrega}

   Plano 2: {nome} ({M} fases, ~{X}h)
     {descricao de 1 linha do que entrega}

   ...

   Tracer Bullet: {descricao do slice mais fino, no Plano 1}
   Riscos: {quantidade}"

2. Mostrar grafo de dependencias entre planos:
   "Plano 1 → Plano 2 → Plano 4
                    ↘
   Plano 3 ──────→ Plano 4"

3. AskUserQuestion com opcoes:
   - "Aprovar estrutura e criar Plano 1"
   - "Ajustar (diga o que mudar)"
   - "Refazer decomposicao"
   - "Quero plano unico (flat) mesmo"
   - "Cancelar"

4. Se ajustar: aplicar mudancas, mostrar diff, nova aprovacao
   - Maximo 3 iteracoes — se nao convergir, sugerir /grill-me

5. Se "plano unico": gerar PLAN.md flat com todas as tasks (fallback para formato antigo)
   - Usar templates/plan-template.md (backward compat)

6. Se refazer: voltar ao Step 3 (manter Steps 1-2 intactos)
```

---

## Step 8 — Salvar Overview e Criar Estrutura

```
1. PASTA_ATIVA ja definida no Step 1 (ex: ".planning/2026-04-20-sistema-notificacoes/")
2. Salvar overview em "{PASTA_ATIVA}/PLAN.md" (nu, sem prefixo)
   - Se ja existir: perguntar "Substituir ou cancelar?"
   (nota: colisao de v2 nao se aplica aqui — ja estamos DENTRO da pasta do PRD)
3. Criar "{PASTA_ATIVA}/STATE.md" (tracking global LOCAL a este PRD) usando templates/state-template.md
   - STATE.md nu, sem prefixo
4. Confirmar: "Overview salvo em `{PASTA_ATIVA}/PLAN.md`. STATE em `{PASTA_ATIVA}/STATE.md`. Pronto para criar o Plano 1."
```

---

## Step 9 — Gerar Planos Detalhados (Progressivo, Isolado)

Este e o passo chave. Cada plano e gerado em contexto isolado (subagente)
e SOMENTE quando o dev pedir.

### Geracao sob demanda

```
O orchestrador NUNCA gera todos os planos de uma vez.
Fluxo:

1. "Criar tasks do Plano 1?"
   [Dev: "sim"]

2. Spawn subagente isolado com:
   RECEBE:
   - Caminho de PASTA_ATIVA: {caminho absoluto}  ← OBRIGATORIO, sempre absoluto
   - Todos os outputs DEVEM ser escritos em "{PASTA_ATIVA}/plano{NN}/..."
   - Se escrever fora de PASTA_ATIVA, a fase eh invalida
   - PRD completo (lido de "{PASTA_ATIVA}/PRD.md")
   - Contexto de codebase (Step 2)
   - PLAN overview (de "{PASTA_ATIVA}/PLAN.md")
   - Descricao do plano a detalhar (do overview)
   - Templates: plan-readme-template.md + fase-template.md + memory-template.md
     (caminhos do plugin — inalterados)

   NAO RECEBE:
   - Detalhes de outros planos (isolamento)
   - Conversas anteriores

   GERA (dentro de PASTA_ATIVA):
   - "{PASTA_ATIVA}/plano{NN}/README.md" (overview do plano)
   - "{PASTA_ATIVA}/plano{NN}/MEMORY.md" (template vazio)
   - "{PASTA_ATIVA}/plano{NN}/fase-01-{nome}.md"
   - "{PASTA_ATIVA}/plano{NN}/fase-02-{nome}.md"
   - ...

3. Subagente retorna resumo do que gerou

4. Orchestrador mostra ao dev:
   "Plano 1 criado com {N} fases:
    fase-01: {nome} (~{tempo})
    fase-02: {nome} (~{tempo})
    ...
    Quer criar o Plano 2?"

5. Se dev aprovar: repete para proximo plano
   O subagente do Plano 2 RECEBE tambem:
   - README do Plano 1 ("{PASTA_ATIVA}/plano01/README.md")
   - NAO recebe as fases detalhadas do Plano 1

6. Repetir ate todos os planos criados ou dev parar
```

### Regras do subagente de planejamento

```
1. Cada fase deve ser auto-contida e executavel em 30min-2h
2. Incluir code snippets de referencia quando a task nao e trivial:
   - Tipos TypeScript que serao criados
   - SQL de migrations com comentarios
   - Imports e exports esperados
   - Exemplos de chamadas de API
3. Incluir gotchas do PRD/CONTEXT inline na fase relevante
4. Checklist de verificacao com itens especificos (nao genericos)
5. Numerar fases sequencialmente: fase-01, fase-02, etc.
6. Nome da fase deve ser descritivo: fase-01-tipos-migration.md, fase-02-queries-filtros.md
7. Cada fase indica dependencias: "Depende de: fase-01" ou "Independente"
8. Marcar fases com "visual: true" se modificam UI (sinaliza /qa-visual)
```

---

## Step 10 — Learn Point

Oferecer ao dev (NAO forcar):

> "Quer entender os conceitos por tras deste plano?"

Se sim, explicar brevemente:
- **Vertical Slices:** cada slice atravessa todas as camadas (test → service → API → UI). Feedback rapido, deploys incrementais.
- **Tracer Bullet:** o slice mais fino que prova a arquitetura end-to-end. Do livro "The Pragmatic Programmer".
- **Planos hierarquicos:** decomposicao natural por dominio, permitindo contextos isolados e execucao incremental.

Para aprofundar: sugerir `/anti-vibe-coding:learn "vertical slices"` ou `/anti-vibe-coding:learn "tracer bullet"`

---

## Step 11 — Proximo Passo

| Cenario | Sugestao |
|---------|----------|
| Planos criados, /execute-plan existe | "Quer prosseguir para /execute-plan? Ele vai executar plano por plano." |
| Dev quer criar mais planos | "Criar Plano {N+1}?" |
| Dev quer revisar plano especifico | "Os planos sao editaveis em .planning/plano{NN}/. Regenere com /plan-feature se a feature mudar." |
| Dev quer voltar ao PRD | "Quer ajustar o PRD antes de executar? Rode /write-prd para editar." |

---

## Pipeline Integration

### 0. Deteccao de Legacy (ver Step 0 acima)
Se detectar PRD/plano soltos na raiz de .planning/, oferece migrar antes de qualquer outro
fluxo. Ver `lib/legacy-detector.md` e `lib/legacy-migrator.md`.

### 1. Importar PRD (se disponivel)
Antes de iniciar o planejamento, executar o Step 1 para localizar o PRD:

- **Se encontrar PRD em pasta datada (`.planning/YYYY-MM-DD-{slug}/PRD.md`):** Importar automaticamente. Dizer ao dev:
  > "Encontrei PRD em `.planning/{pasta}/PRD.md` do `/write-prd`. Vou usar este PRD como base."
  Fixar PASTA_ATIVA = diretorio que contem o PRD.md (caminho absoluto).
  Usar os requisitos e escopo do PRD para guiar a decomposicao.

- **Se NAO encontrar:** Prosseguir com o fluxo normal — perguntar ao dev o que planejar (Caminho C).

### 1. Importar CONTEXT (se disponivel)
Se `.planning/CONTEXT-*.md` existir (do /grill-me):
- Importar decisoes indexadas (D1, D2...)
- Usar como restricoes na decomposicao
- Referenciar decisoes nas fases: "Conforme D3: usar Supabase RLS"

### 2. Salvar Plano e Criar STATE.md
Ao finalizar o overview (via Step 8):
1. Salvar overview em `{PASTA_ATIVA}/PLAN.md` (nu, sem prefixo)
2. Criar `{PASTA_ATIVA}/STATE.md` com tracking por plano (nu, sem prefixo)
3. Planos detalhados criados sob demanda em `{PASTA_ATIVA}/plano{NN}/` (Step 9)

### 3. Sugerir Proximo Passo

> "Overview salvo. Quer criar as tasks do Plano 1?
> Apos criar, pode executar com `/execute-plan`."

### Escape Hatches
- Esta skill funciona standalone: o pipeline e opcional
- Se PRD.md existir mas o dev quiser ignorar: confirmar antes de descartar
- Dev pode voltar ao PRD: "quero ajustar o PRD antes de planejar"
- Dev pode forcar plano flat: "quero tudo em um arquivo so"
- Os planos sao editaveis diretamente nos arquivos .md

---

## Regras

1. O plano e o contrato — /execute-plan segue EXATAMENTE o que esta nos planos
2. Se o plano estiver errado, corrigir o PLANO (nao improvisar durante execucao)
3. Tracer bullet pode parecer "pouco" mas e o slice mais importante
4. A quantidade de planos e fases e decidida por analise semantica, NUNCA por thresholds fixos
5. Cada plano e gerado em contexto isolado (subagente) para evitar poluicao
6. Planos sao gerados sob demanda — NUNCA gerar todos de uma vez
7. Cada fase deve ser time-boxed (30min-2h) e ter checklist de verificacao
8. NUNCA gerar overview sem aprovacao do dev (Step 7 e obrigatorio)
9. NUNCA salvar plano se dev cancelar a aprovacao
10. STATE.md e a fonte de verdade para progresso — /execute-plan atualiza, dev pode editar
11. Cada plano tem sua propria MEMORY.md — preenchida durante execucao
12. A decisao de quantos planos depende do julgamento senior da LLM, nao de regras fixas

---

## Referencias

- `lib/legacy-detector.md` — Algoritmo de deteccao de estrutura legacy (consumido pelo Step 0)
- `lib/legacy-migrator.md` — Algoritmo de migracao atomica STAGE/MOVE/CONFIRM/ROLLBACK (consumido pelo Step 0)
