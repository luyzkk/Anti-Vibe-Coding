---
name: write-prd
description: "Cria especificacao completa de feature via entrevista interativa. Gera PRD com MoSCoW, criterios de aceite e decisoes tecnicas. Importa contexto do /grill-me se disponivel."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: "[descricao da feature ou problema a especificar]"
---

```typescript
// === Telemetria passiva (Plano 03 fase-02) — nao remover sem registrar em MEMORY.md ===
// G5: telemetria SEMPRE ativa, ignora architectureDetectorEnabled
// G7: skill name canonico fixo

import { writeTelemetryStart, writeTelemetryEnd } from '../../lib/telemetry-utils'
import type { TelemetryStart, TelemetryEnd } from '../../lib/telemetry-types'

const __telemetry_skillName = 'write-prd'
const __telemetry_fasePipeline = 'write-prd'
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
// === Perfil arquitetural (Plano 04 fase-04) ===
// G1: UMA leitura + UMA resolucao via lookup. Sem branching profundo.
// G2 / CA-04: profile null (flag off ou manifest ausente) → snippet vazio → template preserva v5.2

import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52 } from './lib/structure-snippets'

// 1. UMA leitura
const __prd_profile = readArchitectureProfile()

// 2. UMA resolucao via lookup
const __prd_structureSnippet = getRecommendationForProfile(
  __prd_profile?.profile ?? null,
  STRUCTURE_SNIPPETS,
  STRUCTURE_SNIPPET_V52,
)

// 3. Injecao no template durante Step 3
// Ao gerar o PRD: substituir '{- structure-snippet -}' por __prd_structureSnippet
// Se __prd_structureSnippet === '', remover o marcador sem deixar linha em branco extra
// === Fim do bloco de perfil ===
```

# Write PRD — Especificacao de Feature

Skill de especificacao. Gera PRD (Product Requirements Document) estruturado a partir de contexto coletado via entrevista ou importado do /grill-me.

Diferenca das outras skills:
- **consultant**: ensina conceitos e apresenta trade-offs para UMA decisao
- **grill-me**: resolve ambiguidades fazendo perguntas implacaveis
- **write-prd**: gera DOCUMENTO estruturado (PRD) a partir de contexto coletado

---

## Step 1 — Capturar Contexto

### Caminho A: Importar do /grill-me

```
1. Buscar CONTEXT.md em duas fontes (nessa ordem de prioridade):
   a. v6 (default): Glob "docs/exec-plans/active/YYYY-MM-DD-*/CONTEXT.md"
   b. legacy v5 (fallback): Glob ".planning/CONTEXT-*.md" — apenas se (a) nao retornar nada
2. Se encontrar:
   - Se mais de 1: perguntar qual importar (mostrar caminho completo)
   - Ler o CONTEXT.md selecionado
   - Extrair: decisoes, escopo, restricoes, personas ja definidas
   - Informar: "Importei contexto do /grill-me. Vou usar essas decisoes como base."
   - Perguntar: "Algo mudou desde o Grill Me? Quer ajustar algo antes de gerar o PRD?"
   - Se a fonte foi (a) v6: extrair o slug/date da pasta — o PRD sera salvo na MESMA pasta
   - Se a fonte foi (b) legacy: marcar para mover CONTEXT para v6 no Step 5.5
3. Prosseguir para Step 2
   NOTA: Se o CONTEXT veio do legacy `.planning/`, o Step 5.5 move o arquivo para dentro
   da pasta v6 do PRD como CONTEXT.md (sem prefixo). Se ja veio de v6, nenhum move e necessario.
```

### Caminho B: Mini-Entrevista (sem CONTEXT.md)

Usar AskUserQuestion para CADA pergunta (uma por vez, nao em bloco):

1. "O que essa feature faz? Descreva o problema que resolve e a solucao proposta."
2. "Quem usa essa feature? Qual o papel/persona do usuario principal?"
3. "Qual o criterio de 'pronto'? Como saberemos que a feature esta completa?"
4. "O que esta FORA do escopo? O que essa feature NAO deve fazer?"
5. "Tem alguma restricao tecnica? (prazo, tech stack obrigatoria, infra, integracao)"

Regras:
- Resposta vaga ("algo para gerenciar usuarios") → follow-up pedindo especificidade
- "Nao sei" → registrar como "A DEFINIR" e prosseguir
- NAO fazer mais de 5 perguntas — o PRD nao precisa ser perfeito no primeiro rascunho
- Ao final, resumir o que entendeu e confirmar antes de prosseguir

### Caminho C: Argumento direto no comando

Se o dev passar argumento no comando `/write-prd "sistema de notificacoes push"`:
- Usar como resposta da pergunta 1
- Adaptar perguntas 2-5: "Voce quer criar um sistema de notificacoes push. Quem e o usuario principal?"

---

## Step 2 — Explorar Codebase

Coletar contexto tecnico automaticamente (maximo 10 chamadas de ferramentas):

**Prioridade: ler CLAUDE.md do projeto primeiro** — e a fonte de verdade para stack e padroes.

### 1. Stack Atual
```
Detectar em: package.json, Cargo.toml, go.mod, tsconfig.json, next.config.*
- Framework, ORM/Database, Auth, UI, Testing, Monorepo
- .env.example para variaveis de ambiente existentes
- prisma/schema.prisma ou drizzle.config.* para ORM
```

### 2. Padroes Existentes
```
- Folder structure: Glob para organizacao (src/app, src/lib, etc.)
- Naming conventions: ler 2-3 arquivos existentes
- Features similares: buscar analogas a nova feature
- Testing: Glob "**/*.test.*" e ler 1 exemplo
```

### 3. Pontos de Integracao
```
- Rotas: Glob "src/app/**/page.*" ou "src/routes/**"
- APIs: Glob "src/app/api/**" ou "src/pages/api/**"
- Middleware, Layout, Navegacao
```

### 4. Modelos de Dados Relacionados
```
- Ler schema Prisma ou equivalente
- Grep por "type " e "interface " em arquivos de tipos
- Filtrar por nomes relacionados a feature
```

Formato de output intermediario (interno, nao mostrado ao dev):

```
## Contexto Tecnico Detectado
Stack: {framework, ORM, auth, UI, testing}
Padroes: {folder structure, naming, features similares}
Integracao: {onde se encaixa, rotas/APIs relacionadas}
Modelos: {entidades existentes, relacoes}
```

Regras:
1. Se nao detectar algo, registrar como "nao detectado" — NAO chutar
2. Se detectar anomalia (ex: 2 ORMs), mencionar no PRD como risco
3. Focar no diretorio mais relevante para a feature — nao explorar tudo

---

## Step 3 — Gerar PRD

Ler o template em `skills/write-prd/templates/prd-template.md` e preencher cada secao:

| Secao | Fonte dos dados |
|-------|----------------|
| Problema | Mini-entrevista Q1 ou CONTEXT.md |
| Solucao | Resposta do dev + contexto Step 2; se veio do /design-twice, referenciar proposta |
| Fluxos UX por Ator | Decisoes UX do grill-me / mini-entrevista — omitir se feature for backend-only |
| Must Have | Criterio de "pronto" Q3 — maximo 40% dos requisitos |
| Should Have | Funcionalidades importantes mas nao bloqueantes |
| Could Have | Nice-to-haves mencionados pelo dev |
| Won't Have | Fora de escopo Q4 |
| Nao-funcionais | WCAG 2.0, performance (API < 200ms), seguranca, observabilidade |
| Decisoes tecnicas | Decisoes detectadas com alternativa rejeitada + razao |
| Criterios de aceite | Derivados dos Must Have — formato Dado/Quando/Entao |
| Dependencias | Detectadas na exploracao (servicos, APIs, libs, features pre-req) |
| Riscos | Anomalias, tech debt, integracao complexa |

Regras de geracao:
1. PRD CONTEXTUALIZADO — usar nomes reais de arquivos, modelos e rotas do projeto
2. Informacao insuficiente → preencher com "[A DEFINIR — perguntar ao dev]" em vez de inventar
3. NAO gerar requisitos que o dev nao mencionou — apenas organizar e estruturar
4. Must Have MINIMALISTA — aplicar teste: "Se mover para Should, a feature ainda resolve o problema core?"

---

## Step 4 — Apresentar ao Dev

Apresentar o PRD gerado destacando:

```
1. DECISOES ASSUMIDAS — marcar com "⚠️ Assumido:" antes de cada decisao nao confirmada
   Ex: "⚠️ Assumido: Usar tabela existente `users` em vez de criar nova entidade"

2. SECOES INCOMPLETAS — listar secoes com "[A DEFINIR]" e fazer pergunta especifica

3. DISTRIBUICAO MOSCOW — "X Must, Y Should, Z Could, W Won't"
   Se Must > 40% dos requisitos: alertar e sugerir mover itens para Should

4. PEDIR VALIDACAO:
   - "Revise o PRD acima. O que voce mudaria?"
   - "As decisoes assumidas estao corretas?"
   - "A priorizacao MoSCoW reflete suas prioridades reais?"
```

Fluxo de ajuste:
- Se o dev pedir mudancas: aplicar, re-apresentar apenas secoes alteradas, repetir ate aprovar
- Se o dev aprovar: mudar Status para "Approved" e prosseguir para Step 5

---

## Step 5 — Salvar PRD

1. Criar diretorio `docs/exec-plans/active/` se nao existir
2. Derivar:
   - `slug` = kebab-case do nome da feature
   - `date` = YYYY-MM-DD atual
   - `folder` = `docs/exec-plans/active/{date}-{slug}/`
   - Se CONTEXT foi importado do Caminho A fonte (a) v6: REUSAR o `folder` da pasta encontrada (mesmo date+slug), nao derivar novo
3. Se `{folder}` ja existir:
   - Caso especial pipeline: se `{folder}/CONTEXT.md` existe MAS `{folder}/PRD.md` NAO existe → grill-me criou a pasta primeiro, este e o fluxo esperado. Escrever `{folder}/PRD.md` direto (sem prompt).
   - Senao: prosseguir para o bloco de colisao abaixo
4. Se NAO existir:
   - Criar `{folder}`
   - Escrever `{folder}/PRD.md` com Write (arquivo nu, sem prefixo)
5. Informar: "PRD salvo em `{folder}/PRD.md`. Voce pode editar diretamente se precisar ajustar."

### Colisao de pasta mesmo-dia mesmo-slug (RF9 / CA-10)

```
Apos calcular `docs/exec-plans/active/YYYY-MM-DD-{slug}/`, antes de criar:

1. Verificar se a pasta ja existe:
   - Se NAO existe: criar pasta + salvar PRD.md nu (fluxo normal)
   - Se existe COM CONTEXT.md mas SEM PRD.md: fluxo pipeline normal (grill-me → write-prd), escrever PRD direto
   - Se existe COM PRD.md: prosseguir para 2

2. Ler `{pasta}/PRD.md` existente, extrair:
   - Status (Draft / Approved / Completed)
   - Titulo

3. Apresentar ao dev com AskUserQuestion:

   "Ja existe uma pasta para esta feature hoje: {pasta}
    PRD atual: {titulo} (status: {status})

    O que deseja?
    [1] Atualizar PRD existente (sobrescreve PRD.md; CONTEXT/PLAN/STATE/planoNN inalterados)
    [2] Criar v2 (nova pasta com sufixo)
    [3] Cancelar"

4. Acao conforme resposta:

   OPCAO 1 — ATUALIZAR:
     - AVISAR explicitamente:
       "ATENCAO: Apenas PRD.md sera sobrescrito.
        CONTEXT.md, PLAN.md, STATE.md e planoNN/ permanecerao com conteudo antigo.
        Se o PRD mudou substancialmente, considere opcao [2] v2.
        Confirma?"
     - Se dev confirma: sobrescrever `{pasta}/PRD.md` apenas
     - Se dev cancela: voltar ao prompt do passo 3

   OPCAO 2 — CRIAR V2:
     - Calcular proximo sufixo disponivel:
       - Se `{pasta}-v2/` nao existe: usar `-v2`
       - Se existe: tentar `-v3`, `-v4`, ate v99
       - Se v99 ocupado: "Mais de 99 versoes no mesmo dia — revise o slug manualmente"
     - Criar `docs/exec-plans/active/YYYY-MM-DD-{slug}-v2/` (ou -vN)
     - Salvar PRD.md nu la dentro
     - Informar: "PRD salvo em {nova-pasta}/PRD.md"
     - Pasta v2 nao recebe CONTEXT.md automaticamente (v2 eh reformulacao; dev roda /grill-me se precisar)

   OPCAO 3 — CANCELAR:
     - Nao criar nada
     - "PRD nao foi salvo. Ajuste o slug com /write-prd {novo-nome} se quiser pasta diferente."
```

### 5.5 — Migrar CONTEXT legacy (apenas se veio de `.planning/`)

So executa se a pasta e o PRD.md foram criados com sucesso E o CONTEXT importado veio do legacy `.planning/` (fonte (b) do Caminho A). Se ja veio de v6, pular este passo — o CONTEXT.md ja esta na pasta correta.

```
1. Glob `.planning/CONTEXT-*.md` na raiz de `.planning/` (nao subpastas)
2. Se 0 matches: nao fazer nada (sem legacy — prosseguir)
3. Se 1+ matches, para cada CONTEXT encontrado:
   a. Extrair slug-do-grill do nome do arquivo: CONTEXT-{slug-do-grill}.md
   b. Comparar com {slug} da pasta recem-criada
   c. Se slug-do-grill == slug-da-pasta:
      - mv .planning/CONTEXT-{slug}.md → docs/exec-plans/active/{date}-{slug}/CONTEXT.md
      - Informar: "CONTEXT.md legacy migrado para dentro da pasta v6."
      - Se a referencia "Context:" no PRD.md aponta para caminho absoluto, substituir por "./CONTEXT.md"
   d. Se slug-do-grill != slug-da-pasta (colisao R2):
      - AskUserQuestion:
        "Encontrei `.planning/CONTEXT-{slug-do-grill}.md` mas a pasta do PRD e `{folder}`.
         Este CONTEXT e do mesmo PRD ou de outro?
         [a] Este CONTEXT e deste PRD — renomear e mover para `{folder}/CONTEXT.md`
         [b] Este CONTEXT e de OUTRO PRD — deixar em paz
         [c] Nao sei — deixar em paz"
      - Se [a]: mv e renomear; substituir referencia "Context:" no PRD.md para "./CONTEXT.md"
        Informar: "CONTEXT renomeado e migrado: .planning/CONTEXT-{slug-do-grill}.md → {folder}/CONTEXT.md"
      - Se [b] ou [c]: nao mover, prosseguir
4. Se 2+ matches com MESMO slug da pasta: pegar o mais recente por mtime e perguntar sobre os outros
5. Se mv falhar (permissao, etc): logar o erro mas NAO derrubar a skill
   Informar: "Nao consegui migrar CONTEXT-{slug}.md: {motivo}. PRD salvo normalmente — mova manualmente se necessario."
```

Auditoria de output ao final do Step 5:
```
PRD salvo em `docs/exec-plans/active/{date}-{slug}/PRD.md`
CONTEXT migrado de `.planning/CONTEXT-{slug}.md` para `docs/exec-plans/active/{date}-{slug}/CONTEXT.md`
```
Se sem CONTEXT ou CONTEXT ja veio de v6: omitir a segunda linha.

---

## Step 6 — Learn Point

Apos salvar, oferecer:

```
"Quer entender melhor como funciona a priorizacao MoSCoW
ou como definir criterios de aceite testaveis?"
```

Se aceitar, explicar (ou sugerir `/anti-vibe-coding:learn`):

**MoSCoW:**
- Origem: DSDM (Dynamic Systems Development Method)
- Por que funciona: forca classificacao explicita em vez de "tudo e importante"
- Armadilha comum: Must Have vira lixeira — o teste e "sem isso o produto falha?"
- Relacao com MVP: Must Have = MVP, Should Have = v1.1, Could Have = backlog

**Criterios de Aceite (BDD):**
- Formato Dado/Quando/Entao
- Ruim: "O sistema deve ser rapido"
- Bom: "Dado um usuario com 1000 registros, quando acessar a lista, entao a pagina carrega em < 2s"
- Relacao com TDD: criterios de aceite viram testes automatizados

Se recusar, seguir para Step 7 sem insistir.

---

## Step 7 — Proximo Passo

| Cenario | Sugestao |
|---------|----------|
| PRD simples (poucos requisitos, stack clara) | "Quer prosseguir para /plan-feature?" |
| PRD complexo (decisoes tecnicas em aberto) | "Quer usar /design-twice para explorar abordagens?" |
| PRD com incertezas (secoes [A DEFINIR]) | "Quer usar /grill-me para resolver ambiguidades?" |
| Dev quer parar | "Ok. PRD salvo em `docs/exec-plans/active/{date}-{slug}/PRD.md`. Retome com /plan-feature quando quiser." |

---

## Pipeline Integration

### 0. Importar Contexto (se disponivel)
Antes de iniciar o PRD, verificar se existe CONTEXT.md de `/grill-me` em duas fontes (nessa ordem):
  a. v6 (default): `docs/exec-plans/active/YYYY-MM-DD-*/CONTEXT.md`
  b. legacy v5 (fallback): `.planning/CONTEXT-*.md`

- **Se existir (v6):** Importar automaticamente. Dizer ao dev:
  > "Encontrei `docs/exec-plans/active/{pasta}/CONTEXT.md` do `/grill-me`. Vou usar este contexto e salvar o PRD na mesma pasta."
  Reusar `{pasta}` (date + slug) como destino do PRD. Nenhum move necessario.

- **Se existir (legacy `.planning/`):** Importar automaticamente. Dizer ao dev:
  > "Encontrei `.planning/CONTEXT-{slug}.md` legacy. Vou usar este contexto e migrar o CONTEXT para a estrutura v6."
  Ao final (Step 5.5), este arquivo sera MOVIDO para `docs/exec-plans/active/{date}-{slug}/CONTEXT.md`.
  Se o slug do CONTEXT nao bater com o slug final da pasta: perguntar ao dev (mitigacao R2).

- **Se NAO existir:** Prosseguir com o fluxo normal de coleta de informacoes.

### 1. Salvar PRD
Ao finalizar o PRD gerado e aprovado pelo dev, salvar em `docs/exec-plans/active/{YYYY-MM-DD}-{slug}/PRD.md`.

### 2. Sugerir Proximo Passo

> "PRD salvo em `docs/exec-plans/active/{date}-{slug}/PRD.md`.
>
> Quer prosseguir para `/plan-feature`? Ele vai quebrar este PRD em planos e fases de execucao."

Se o dev disser NAO: encerrar normalmente. O PRD.md continua disponivel.

### 3. Learn Point (opcional)

> "Quer entender como o MoSCoW prioriza features ou como o PRD alimenta o plano de execucao? Posso explicar via `/learn`."

### Escape Hatches
- Esta skill funciona standalone: o pipeline e opcional
- Se CONTEXT.md existir mas o dev quiser ignorar: confirmar antes de descartar o contexto
- Dev pode voltar a qualquer fase: "quero refazer o PRD"

---

## Regras

1. O PRD e um documento VIVO — o dev pode edita-lo diretamente apos geracao
2. A skill NAO gera PRDs genericos — DEVE contextualizar ao codebase real do projeto
3. Criterios de aceite DEVEM ser testaveis (formato Dado/Quando/Entao)
4. Must Have deve ser MINIMALISTA — maximo 40% dos requisitos totais
5. Decisoes assumidas DEVEM ser destacadas e confirmadas com o dev
6. Se o dev ja tem um PRD escrito, a skill REFINA em vez de reescrever
7. NAO gerar requisitos que o dev nao mencionou — apenas organizar e estruturar
8. Se o dev pedir "PRD rapido", pular mini-entrevista e gerar com informacao minima (marcando como Draft)
9. A skill NAO substitui o /grill-me (resolver ambiguidades) nem o /consultant (ensinar trade-offs) — gera DOCUMENTO
10. O PRD deve caber em 1-2 paginas para features simples. Para features complexas, cada secao deve ser concisa

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
