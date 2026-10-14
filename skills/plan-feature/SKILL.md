---
name: plan-feature
description: "Converte a pagina da feature em plano executavel, uma fatia por vez: cada fatia da pagina vira um plano, e so a que vai comecar ganha fases. Analisa complexidade como um engenheiro senior e gera memoria por plano. Usa subagentes isolados para detalhar cada fatia."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Agent, AskUserQuestion
argument-hint: "[caminho do PRD ou nome da feature] [--fatia N]"
---

```typescript
// === Modo dual: leitura de perfil arquitetural (Plano 04 fase-03) ===
// G1: leitura UMA vez, resolucao via lookup — sem branching profundo
// G2: profile null → FASE_POLICY_V52 → comportamento v5.2 preservado (CA-04)

import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { FASE_POLICY_BY_PROFILE, FASE_POLICY_V52, renderFasePolicyBlock } from './lib/fase-policy'

// 1. UMA leitura
const __profile = readArchitectureProfile()

// 2. UMA resolucao via lookup
const __fasePolicy = getRecommendationForProfile(
  __profile?.profile ?? null,
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
)

// 3. Bloco markdown pronto para injecao no prompt do orchestrador
const fasePolicyBlock = renderFasePolicyBlock(__fasePolicy)
// === Fim do bloco de modo dual ===
```

# Plan Feature — Planejamento Hierarquico de Execucao

Skill de planejamento. Converte a pagina da feature em plano executavel com estrutura hierarquica:
pagina → fatias → planos → fases. Cada fatia da pagina vira um plano, e so a fatia que vai comecar
ganha fases detalhadas.

Diferenca das outras skills:
- **write-prd**: gera DOCUMENTO de especificacao (o que construir)
- **plan-feature**: gera PLANOS de execucao (como construir, em que ordem)
- **execute-plan**: executa os planos fase por fase com subagentes isolados

Estrutura gerada (dentro da pasta datada do PRD):

```
docs/exec-plans/active/
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

```typescript
// === Injecao do bloco de politica de fases (perfil-aware) ===
// fasePolicyBlock foi resolvido no bloco de modo dual acima.
// Incluir no contexto de cada subagente do Step 9 (spawn de planejamento de plano):
//
//   RECEBE (adicionar ao prompt do subagente):
//   - Bloco de politica de fases:
//     ${fasePolicyBlock}
//
// Se profile for null (flag desligada ou manifest ausente), fasePolicyBlock contera
// a politica v5.2 (FASE_POLICY_V52) — comportamento identico ao anterior (CA-04).
// === Fim da injecao ===
```

---

## Step 0 — Deteccao de Legacy

Roda ANTES de qualquer outra coisa. Detecta dois niveis de estrutura legacy:

- **v4 legacy**: `PRD-*.md` ou `planoNN/` soltos na raiz de `.planning/` (pre-pasta-datada)
- **v5 legacy**: pastas `YYYY-MM-DD-slug/` dentro de `.planning/` (pre-v6, deve migrar para `docs/exec-plans/active/`)

Algoritmo referenciado: `skills/lib/legacy-detector.md` (v4 detection).
Migracao referenciada: `skills/lib/legacy-migrator.md`.

### Fluxo

```
1. Se `.planning/` nao existe E `docs/exec-plans/active/` existe: skip Step 0, ir para Step 1.
   Se nem `.planning/` nem `docs/exec-plans/active/` existem: skip Step 0, projeto greenfield.

2. Verificar v5 legacy PRIMEIRO:
   - Glob `.planning/YYYY-MM-DD-*/` (pastas datadas dentro de .planning/)
   - Se encontrar pastas datadas: sao v5 legacy
   - Apresentar ao dev:
     "Detectei {N} pasta(s) v5 em .planning/ que devem migrar para docs/exec-plans/active/:
        - .planning/2026-04-20-auth/
        - .planning/2026-04-21-notificacoes/ ...
      Deseja migrar agora?"
   - AskUserQuestion: opcoes "Sim, migrar" / "Nao — usarei .planning/ (modo compatibilidade)" / "Cancelar"
   - Se "Sim": mover cada .planning/YYYY-MM-DD-slug/ → docs/exec-plans/active/YYYY-MM-DD-slug/
     (criar docs/exec-plans/active/ se nao existir)
   - Se "Nao": setar BASE_PATH = ".planning/" e prosseguir (compatibilidade)
   - Se "Cancelar": encerrar

3. Verificar v4 legacy (apenas se nao havia v5 legacy):
   - Executar `detectLegacy(".planning/")` conforme `skills/lib/legacy-detector.md`
   - Se `legacy == false`: skip — ir para Step 1

4. Se v4 `legacy == true`:
   a. Apresentar ao dev:
      "Detectei estrutura v4 legacy em .planning/:
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
   d. Se `docs/exec-plans/active/{targetFolderName}/` ja existir: avisar colisao e oferecer
      `{targetFolderName}-v2` ou cancelar.
   e. AskUserQuestion: "Migrar estes {N} artefatos para docs/exec-plans/active/{targetFolderName}/?"
      Opcoes:
        - "Sim, migrar agora"
        - "Nao — prosseguir com plan-feature em modo greenfield (legacy fica intocado)"
        - "Cancelar plan-feature"
   f. Se "Sim":
      - Chamar `migrateLegacy(detectorResult, targetFolderName)` conforme `skills/lib/legacy-migrator.md`
        (target path = "docs/exec-plans/active/{targetFolderName}/")
      - Se retorno status == "success":
        - Confirmar: "Migrado com sucesso. {N} artefatos em docs/exec-plans/active/{targetFolderName}/"
        - Continuar Step 1 com a pasta migrada como contexto ativo
      - Se retorno status == "rolled_back" ou "aborted":
        - Reportar erro claramente
        - Perguntar: "prosseguir em modo greenfield ou cancelar?"
   g. Se "Nao":
      - Confirmar: "Prosseguindo em modo greenfield. Legacy em .planning/ nao foi tocado."
      - Ir para Step 1
   h. Se "Cancelar":
      - Encerrar skill sem tocar em nada

Regras:
- Step 0 roda apenas 1 vez por invocacao
- Se migracao falhou (rolled_back): NAO insistir automaticamente — deixar dev corrigir
- Slug fornecido pelo dev vale apenas para a sessao atual
- BASE_PATH default = "docs/exec-plans/active/" (salvo se dev escolheu modo compatibilidade)
```

---

## Step 1 — Ler PRD

NOTA: Apos identificar o PRD, a skill fixa a PASTA_ATIVA = diretorio que contem `PRD.md`.
TODOS os artefatos gerados por esta skill (PLAN.md, STATE.md, planoNN/) sao escritos
dentro de PASTA_ATIVA. Nunca fora da pasta do PRD.

### Caminho A: Caminho fornecido como argumento

```
1. Se o dev passou caminho, aceita DOIS formatos:

   a) Caminho de ARQUIVO: /plan-feature "docs/exec-plans/active/2026-04-20-slug/PRD.md"
      - Validar que o arquivo existe
      - PASTA_ATIVA = diretorio pai do arquivo (ex: "docs/exec-plans/active/2026-04-20-slug/")
      - Salvaguarda: se o caminho contem "docs/exec-plans/_archive/" ou ".planning/", RECUSAR com:
        "Este PRD esta arquivado ou em estrutura legada. Mova para docs/exec-plans/active/ se quiser re-planejar."

   b) Caminho de PASTA: /plan-feature "docs/exec-plans/active/2026-04-20-slug/"
      - PASTA_ATIVA = a propria pasta informada
      - Verificar existencia de "{PASTA_ATIVA}/PRD.md"
      - Se nao existir: "Nao encontrei PRD.md em {PASTA_ATIVA}. Quer criar com /write-prd?"
      - Salvaguarda: se a pasta esta dentro de "docs/exec-plans/_archive/", RECUSAR com a mesma mensagem acima

   Apos identificar o arquivo PRD.md:
   - Ler com Read
   - Validar que contem estrutura de pagina (titulo, cenarios, fatias — ou, em PRD anterior a
     8.0, requisitos e criterios)
   - Se nao for PRD valido: "Este arquivo nao parece ser um PRD. Quer criar com /write-prd?"
   - Extrair frontmatter (se presente):
     1. Se conteudo comeca com `---\n`:
        - Extrair bloco entre primeiro `---` e segundo `---`
        - Procurar linha `requires:`
        - Se encontrada:
          - Se valor comeca com `[`: split por virgula, trim, remover `[` e `]`, lista
          - Se valor e string simples (nao vazia): lista com 1 elemento
          - Se `[]` ou vazio: lista vazia
        - Se nao encontrada ou bloco ausente: requires = []
     2. Armazenar: `prd_requires = [...]`
     3. Prosseguir normalmente para o proximo step

2. Se `--fatia N` veio no argumento e `{PASTA_ATIVA}/PLAN.md` ja existe: pular direto para o
   Step 9 com a fatia N (a estrutura ja foi aprovada; so falta detalhar esta fatia)

3. Prosseguir para Step 2
```

### Caminho B: Buscar em docs/exec-plans/active/ (estrutura v6)

```
1. Se nao forneceu caminho:
   a. Enumerar pastas datadas em `docs/exec-plans/active/` (mesmo algoritmo do execute-plan Step 1a)
      - Glob `docs/exec-plans/active/YYYY-MM-DD-*/`
      - Excluir `docs/exec-plans/_archive/`
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
      - Se `--all` foi usado: "Nenhum PRD em docs/exec-plans/active/." → Caminho C
      - Se default: "Nenhum PRD ativo (planned/in-progress/paused). Rode /plan-feature --all para ver todos."
      - Oferecer Caminho C (PRD nao existe)
   e. Se ZERO pastas datadas em docs/exec-plans/active/ (independente de filtro):
      - Verificar se ha pastas em .planning/ → step 0 cuida disso se rodar antes
      - Oferecer Caminho C
2. Prosseguir para Step 2 operando DENTRO da pasta escolhida
   (todos os outputs vao para `{pasta}/PLAN.md`, `{pasta}/STATE.md`,
    `{pasta}/planoNN/` — conforme Step 8)
```

### Caminho C: PRD nao existe

```
1. Informar: "Nao encontrei nenhum PRD em docs/exec-plans/active/."
2. Oferecer: "Quer criar um com /write-prd?"
3. Se o dev fornecer descricao inline: aceitar como PRD simplificado
   - Avisar: "Vou planejar com base nessa descricao, mas um PRD completo daria mais precisao."
4. Prosseguir (ou encerrar se dev quiser criar PRD primeiro)
```

**Quando nem da para escrever o PRD.** Se a descricao do dev revelar que as decisoes de base ainda
nao foram tomadas — nao e falta de documento, e falta de resposta —, planejar em cima disso e
planejar sobre premissa. Oferecer o `/anti-vibe-coding:grill-me` em modo profundo, que fecha essas
decisoes antes de existir plano.

A fronteira e estreita, e vale respeita-la: **a maioria das features cabe direto no `/write-prd`.**
Este desvio e para a ideia que ainda esta em neblina, nao para toda feature sem PRD.

---

## Step 1.5 — Detectar Ciclos em Requires

```
1. Glob `docs/exec-plans/active/YYYY-MM-DD-*/` (APENAS pastas ativas — NAO incluir `docs/exec-plans/_archive/`)
   - Se vazio ou apenas o PRD atual: pular este step silenciosamente
2. Para cada pasta encontrada:
   a. Ler `PRD.md` dentro dela
   b. Parsear frontmatter (mesmo parser do Step 1: buscar `---\n...\nrequires:...\n---`)
   c. Extrair `requires:` normalizado como lista
   d. Para cada item em requires:
      - Se e pasta exata (`YYYY-MM-DD-slug`): usar diretamente
      - Se e slug (`auth`): buscar pasta que termina em `-auth` em `docs/exec-plans/active/YYYY-MM-DD-*/`
      - Se nao encontrado ou ambiguo: ignorar silenciosamente (fase-01 ja reporta dangling)
   e. Registrar no grafo: `{nome_pasta: [dep1, dep2, ...]}`
3. Incluir o PRD atual no grafo:
   - Se esta em pasta `YYYY-MM-DD-*`: usar nome da pasta
   - Se nao (PRD sendo criado, sem pasta ainda): usar chave `__current__`
4. Executar DFS com 3 cores:

   cores = {pasta: "branco" para cada pasta no grafo}
   ciclos_encontrados = []

   para cada pasta em grafo onde cores[pasta] == "branco":
     dfs(pasta, caminho=[])

   def dfs(no, caminho):
     cores[no] = "cinza"
     caminho.append(no)
     para cada dep em grafo[no]:
       se dep nao esta em cores: ignorar (referencia externa nao resolvida)
       se cores[dep] == "cinza":
         idx = caminho.index(dep)
         ciclo = caminho[idx:] + [dep]
         ciclos_encontrados.append(ciclo)
       senao se cores[dep] == "branco":
         dfs(dep, caminho)
     caminho.pop()
     cores[no] = "preto"

5. Apos DFS:
   - Se ciclos_encontrados esta vazio: prosseguir para Step 2 silenciosamente
   - Para cada ciclo encontrado:
     - caminho_visual = " -> ".join(ciclo)
     - Mostrar:
       "AVISO: Ciclo em `requires:` detectado:
          {caminho_visual}
       Isto pode causar comportamento circular na verificacao de dependencias.
       Voce pode ter contexto que justifica (ex: milestone composto).
       Nao vou bloquear — apenas sinalizo."
   - NAO usar AskUserQuestion aqui (aviso informativo, nao pergunta)
   - Prosseguir automaticamente para Step 2
```

Gotchas:
- **Auto-referencia:** `A requires: [A]` — DFS entra em A (cinza), visita A novamente (cinza) → ciclo `[A, A]`. Tratar igual.
- **Ciclo indireto:** `A → B → C → A` — coberto naturalmente pelas 3 cores.
- **`_archive/` ignorado:** Pastas arquivadas nao entram no grafo.
- **PRD legacy sem frontmatter:** Parser retorna `requires = []`, entra no grafo com lista vazia — DFS nao detecta ciclo.
- **Dangling (referencia nao resolvida):** Ignorar silenciosamente (fase-01 ja reporta).

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

### Fatias da página

<!-- 2026-10-14 (Luiz/dev): o plano vem em fatias — 8.0 fatia 3, F3-4 (D3). -->

A unidade do plano é a fatia da página (`## Fatias` do PRD.md): cada fatia vira um `plano{NN}`, na
mesma ordem. Só a fatia que vai começar ganha fases, quando ela for começar. As seguintes ficam como
uma linha na página até a vez delas, e então são detalhadas já com o que as anteriores ensinaram (as
"Notas para Planos Seguintes" do MEMORY.md).

Antes de detalhar, conferir cada fatia contra o conceito abaixo: ela deixa algo funcionando de ponta a
ponta? Fatia horizontal ("criar todas as tabelas") ou grande demais (mais de ~1 semana) → propor
dividir ou juntar. A proposta muda a página, com aprovação do dev; o PLAN.md nunca guarda uma lista de
fatias diferente da página.

Página anterior à 8.0, sem `## Fatias`: decompor como descrito abaixo, propor as fatias ao dev e,
aprovadas, gravá-las em `## Fatias` da página antes de seguir.

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

### Grafo de Camadas (ordem de fundacao)

Antes de fatiar, mapeie a dependencia ENTRE CAMADAS (nao entre fases). A ordem
de implementacao segue este grafo de baixo para cima — construa fundacoes primeiro:

```
schema / migrations
    |
    +-- types / models
            |
            +-- API / services
                    |
                    +-- client / hooks
                            |
                            +-- UI / paginas
```

**Principio:** a ordem das fases segue o grafo de dependencias de baixo para cima —
fundacao primeiro. (Isto e o porque de `fundacao → core → UI → polish` no Step 4: dentro de
cada fatia, as fases seguem de baixo para cima.) O grafo de CAMADAS guia a ordem; o grafo de
FASES (`## Dependency Graph (ASCII)`) registra a ordem ja decidida.

### Tracer Bullet (Primeiro Slice Obrigatorio)

```
O PRIMEIRO slice de QUALQUER plano e o Tracer Bullet.

Definicao: O slice mais FINO possivel que conecta TODAS as camadas end-to-end.

Proposito:
- Prova que a arquitetura funciona ANTES de investir em funcionalidade completa
- Identifica problemas de integracao cedo (quando sao baratos de corrigir)

Como identificar:
1. Pegar o caso de uso mais simples da fatia 1 (normalmente o "Precisa ter" principal da pagina)
2. Reduzir ao MINIMO viavel: 1 endpoint + 1 teste E2E + 1 tela com dados reais
3. Se ainda parecer grande, reduzir mais
4. Regra de ouro: se leva mais de 2h, nao e fino o suficiente

Exemplo: Feature "Sistema de notificacoes push"
- Tracer Bullet: POST /api/notifications → salva no banco → lista em /notifications (sem estilo, sem filtros)
- NAO e tracer bullet: "criar toda a API de notificacoes" (isso e horizontal layer)
```

### Slices Subsequentes

```
1. Ler cada item "Precisa ter" e "Deveria ter" da pagina que cabe na fatia em detalhamento
2. Para cada item: pode ser um slice independente?
   - Sim: criar slice com test → service → API → UI
   - Nao (depende de outro): agrupar no mesmo slice ou em fase posterior
3. "Poderia ter" e "Nao tera" NAO viram slices — sao backlog

Regras:
- Cada slice tem nome descritivo e descreve o valor entregue
- Se slice toca APENAS uma camada, provavelmente e horizontal layer — repensar
- Slices devem ter tamanho de 1 PR (se possivel)
```

### Classificacao de Risco do Slice

<!-- 2026-09-01 (Luiz/dev): risco e propriedade do slice, nao impressao do executor — PRD §RF-06 -->

Ao nomear cada slice, marcar se ele e **de risco**. O criterio mora em
`skills/tdd-workflow/SKILL.md` §Abuse-It, e nao e repetido aqui: o slice e de risco quando
**escreve ou muda a defesa** de um dos seis gatilhos, nao quando passa por uma defesa que ja existe.

Notacao, direto no nome do slice:

```
Slice 3: usuario autenticado ve apenas os proprios pedidos  [RISCO: auth/authz]
Slice 4: importar planilha de alunos                        [RISCO: input externo, PII/sensivel]
Slice 5: trocar a cor do badge de status
Slice 6: tela que lista os pedidos (consome a API do slice 3)
```

Slice que nao escreve defesa **nao recebe marca** — nao existe `[RISCO: nenhum]`. A ausencia e a
marca, e e o que mantem o plano legivel: se tudo e marcado, nada e. O slice 6 mostra pedidos de
pessoas, mas quem decide quem ve o que e o slice 3; a tela so consome.

A marca tem quatro consequencias (nao e etiqueta decorativa):

1. O slice carrega ao menos UM criterio de aceite de seguranca `CA-SEC-*` (formato abaixo).
2. A fase gerada dele preenche o bloco `### Seguranca` do `## Verificacao` (`templates/fase-template.md`).
3. O `/anti-vibe-coding:tdd-workflow` exige teste de abuso no RED antes da defesa (Abuse-It).
4. Vale o principio 5 do Step 4 — **risco pede task MENOR**. Slice marcado que estourou 2h se divide;
   nao se aceita "e maior porque e mais delicado".

**Formato do criterio de aceite de seguranca.** Um `CA-SEC-*` diz o que o atacante tenta, o que o
sistema responde e — a parte que costuma faltar — o que NAO pode acontecer:

```
CA-SEC-{n}: Dado {ator sem direito, ou input hostil},
            quando {acao de abuso},
            entao {defesa observavel: 403 / 401 / rejeicao na validacao / evento no log}
            — e NAO {vazar existencia do recurso / persistir / cobrar / gravar sem sanitizar}
```

Exemplo preenchido (assim, nao com placeholders):

```
CA-SEC-1: Dado um usuario autenticado que NAO e dono do pedido, quando faz GET /api/orders/{id},
          entao a API responde 403 — e NAO permite distinguir "nao e seu" de "nao existe"
CA-SEC-2: Dado um CSV com formula `=cmd|...` numa celula, quando o admin importa,
          entao o valor e gravado como texto — e NAO e interpretado na exportacao
```

**De onde vem o conteudo:** cada caso de abuso `AB-*` dos Cenarios da pagina vira um `CA-SEC-*`
aqui — traducao direta, um para um — e o mapa de ameacas do `DESIGN.md` (`## Ameaças & Dados`) diz
onde ficam as fronteiras de confianca. Em pagina anterior a 8.0, os `AB-*` e o mapa estao na secao
"Ameacas & Dados" do proprio PRD. Se o slice e de risco e **nao** ha `AB-*` nem mapa, o gatilho se
perdeu na especificacao: registrar como risco no `README.md` do plano e sinalizar ao dev. Nao montar
o modelo de ameaca sozinho durante o planejamento — e a mesma regra de "nao inventar requisito que o
dev nao mencionou".

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

5. A ordem dos grupos segue o grafo de camadas (Step 3): de baixo
   (schema) para cima (UI). Fundacao primeiro, sempre.

O NUMERO DE PLANOS E O NUMERO DE FATIAS DA PAGINA. Estes fatores servem para outra coisa: dizer
se uma fatia esta grande demais (propor dividi-la na pagina) e quantas fases ela tem quando for
detalhada.

Fatia que se resolve em 2-5 fases: otimo. Fatia que pede 8 ou mais: provavelmente sao duas fatias.
O numero de fases e consequencia do julgamento, nao meta.
```

---

## Step 5 — Agrupar Slices em Planos

### Criterios de Agrupamento

Cada PLANO e uma fatia da pagina (secao "Fatias da pagina" do Step 3). Os slices do Step 3 viram as
fases do plano da fatia a que pertencem.

Se a pagina nao separa bem os slices em fatias (dois slices que dependem um do outro em fatias
diferentes, ou uma fatia que nao entrega nada sozinha), propor o ajuste na pagina. Nunca agrupar por
camada tecnica ("Plano 1: tipos e migrations, Plano 2: API, Plano 3: telas"): isso e corte horizontal,
e cada plano deixa de entregar algo que funciona.

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
- Criterio de aceite de seguranca (CA-SEC-*), quando a fase vem de slice marcado [RISCO]
- Sizing estimado (0.5h / 1h / 1.5h / 2h)
```

---

## Step 6 — Gerar PLAN Overview

```
1. Ler template de templates/plan-overview-template.md
2. Preencher com dados reais:
   - Header: nome da feature, link para a pagina, data
   - Tabela de fatias: numero da fatia, plano, estado (detalhada / a detalhar) e dependencias —
     sem repetir o texto das fatias, que mora na pagina
   - Tracer bullet (fase 01 do plano 01)
   - Riscos identificados no Step 2 + decomposicao
3. Validar consistencia:
   - Toda fatia da pagina tem uma linha na tabela, na mesma ordem
   - Dependencias entre fatias sao aciclicas
4. NÃO gerar os planos detalhados ainda — apenas o overview
```

---

## Step 7 — Apresentar ao Dev

```
1. Resumo PRIMEIRO (antes de qualquer arquivo):
   "A pagina tem {N} fatias. Vou detalhar so a fatia 1 agora:

   Fatia 1 → plano01: {linha da pagina} ({M} fases previstas, ~{X}h)
   Fatias 2..{N}: detalhadas quando chegar a vez de cada uma

   Tracer Bullet: {descricao do slice mais fino, na fatia 1}
   Riscos: {quantidade}
   {Se propus mudar fatias na pagina: o antes e o depois}"

2. Mostrar dependencias entre fatias, se houver:
   "Fatia 1 → Fatia 2 → Fatia 4
    Fatia 3 ──────────↗"

3. AskUserQuestion com opcoes:
   - "Aprovar e detalhar a fatia 1"
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
1. PASTA_ATIVA ja definida no Step 1 (ex: "docs/exec-plans/active/2026-04-20-sistema-notificacoes/")
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
O orchestrador NUNCA gera todos os planos de uma vez: so a fatia que vai comecar.
Fluxo:

1. "Detalhar a fatia {N} (plano{NN})?"
   [Dev: "sim"]
   - Primeira vez: fatia 1, logo apos o Step 8
   - Depois: o /execute-plan oferece ao fechar a fatia anterior, ou o dev roda
     `/plan-feature {pasta} --fatia {N}`, que pula direto para este step

2. Spawn subagente isolado com:
   RECEBE:
   - Caminho de PASTA_ATIVA: {caminho absoluto}  ← OBRIGATORIO, sempre absoluto
   - Todos os outputs DEVEM ser escritos em "{PASTA_ATIVA}/plano{NN}/..."
   - Se escrever fora de PASTA_ATIVA, a fase eh invalida
   - A pagina completa ("{PASTA_ATIVA}/PRD.md") e o desenho ("{PASTA_ATIVA}/DESIGN.md"), se existir
   - Contexto de codebase (Step 2)
   - PLAN overview (de "{PASTA_ATIVA}/PLAN.md")
   - A linha da fatia a detalhar (de `## Fatias` da pagina)
   - Se N > 1: o README e as "Notas para Planos Seguintes" do MEMORY.md dos planos anteriores —
     e para isso que a fatia esperou: as fases nascem com o que as anteriores ensinaram
   - Templates: plan-readme-template.md + fase-template.md + memory-template.md
     (caminhos do plugin — inalterados)

   NAO RECEBE:
   - Fases detalhadas de outros planos (isolamento)
   - Conversas anteriores

   GERA (dentro de PASTA_ATIVA):
   - "{PASTA_ATIVA}/plano{NN}/README.md" (overview do plano)
   - "{PASTA_ATIVA}/plano{NN}/MEMORY.md" (template vazio)
   - "{PASTA_ATIVA}/plano{NN}/fase-01-{nome}.md"
   - "{PASTA_ATIVA}/plano{NN}/fase-02-{nome}.md"
   - ...

3. Subagente retorna resumo do que gerou — e, se o que as fatias anteriores ensinaram muda alguma
   fatia seguinte, a proposta de mudanca na pagina (o dev aprova antes de gravar)

4. Orchestrador mostra ao dev:
   "Fatia {N} detalhada em plano{NN}, com {M} fases:
    fase-01: {nome} (~{tempo})
    fase-02: {nome} (~{tempo})
    ...
    A fatia {N+1} e detalhada quando esta fechar — o /execute-plan oferece."

5. Atualizar a tabela de fatias do PLAN.md e o STATE.md: fatia {N} detalhada, plano{NN} pending
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
9. Toda fase de tipo comportamento ou risco preenche no RED-check "Defesa a mutar" (qual linha ou
   condicao remover ou inverter) e "Teste que deve cair" (nome do teste). Fase sem-comportamento
   nomeia o alvo textual do gate (o que remover para o grep cair). Fonte: skills/tdd-workflow/SKILL.md,
   "Contrato do Ciclo por Fase"
10. Nunca prever a mensagem de erro do RED nem do RED-check ("Expected 3, Received 0"): numero e
    mensagem previstos sao chute do planejador. Nomear a assertion ou o teste que quebra
    (docs/compound/2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md)
```

---

## Step 10 — Learn Point

Oferecer ao dev (NAO forcar):

> "Quer entender os conceitos por tras deste plano?"

Se sim, explicar brevemente:
- **Vertical Slices:** cada slice atravessa todas as camadas (test → service → API → UI). Feedback rapido, deploys incrementais.
- **Tracer Bullet:** o slice mais fino que prova a arquitetura end-to-end. Do livro "The Pragmatic Programmer".
- **Planos hierarquicos:** decomposicao natural por dominio, permitindo contextos isolados e execucao incremental.

Para aprofundar: explicar "vertical slices" e "tracer bullet" em linguagem simples, com um exemplo do proprio projeto

---

## Step 11 — Proximo Passo

| Cenario | Sugestao |
|---------|----------|
| Fatia detalhada, /execute-plan existe | "Quer prosseguir para /execute-plan? Ao fechar cada fatia, ele oferece detalhar a proxima." |
| Dev quer detalhar a proxima fatia antes | "A fatia {N+1} costuma esperar a {N} fechar, para nascer com o que ela ensinou. Se quiser antes: /plan-feature {pasta} --fatia {N+1}." |
| Dev quer revisar plano especifico | "Os planos sao editaveis em docs/exec-plans/active/{slug}/plano{NN}/. Regenere com /plan-feature se a feature mudar." |
| Dev quer voltar ao PRD | "Quer ajustar o PRD antes de executar? Rode /write-prd para editar." |

---

## Pipeline Integration

### 0. Deteccao de Legacy (ver Step 0 acima)
Se detectar artefatos em `.planning/` (v4 ou v5), oferece migrar para `docs/exec-plans/active/`
antes de qualquer outro fluxo. Ver `skills/lib/legacy-detector.md` e `skills/lib/legacy-migrator.md`.

### 1. Importar PRD (se disponivel)
Antes de iniciar o planejamento, executar o Step 1 para localizar o PRD:

- **Se encontrar PRD em pasta datada (`docs/exec-plans/active/YYYY-MM-DD-{slug}/PRD.md`):** Importar automaticamente. Dizer ao dev:
  > "Encontrei PRD em `docs/exec-plans/active/{pasta}/PRD.md` do `/write-prd`. Vou usar este PRD como base."
  Fixar PASTA_ATIVA = diretorio que contem o PRD.md (caminho absoluto).
  Usar os requisitos e escopo do PRD para guiar a decomposicao.

- **Se NAO encontrar:** Prosseguir com o fluxo normal — perguntar ao dev o que planejar (Caminho C).

### 1. Importar CONTEXT (se disponivel)
Se `{PASTA_ATIVA}/CONTEXT.md` existir (do /grill-me, movido pelo /write-prd):
- Importar decisoes indexadas (D1, D2...)
- Usar como restricoes na decomposicao
- Referenciar decisoes nas fases: "Conforme D3: usar Supabase RLS"

### 2. Salvar Plano e Criar STATE.md
Ao finalizar o overview (via Step 8):
1. Salvar overview em `{PASTA_ATIVA}/PLAN.md` (nu, sem prefixo)
2. Criar `{PASTA_ATIVA}/STATE.md` com tracking por plano (nu, sem prefixo)
3. Cada fatia detalhada em `{PASTA_ATIVA}/plano{NN}/` quando for comecar (Step 9)

### 3. Sugerir Proximo Passo

> "Overview salvo. Quer detalhar a fatia 1?
> Depois, execute com `/execute-plan`; ao fechar cada fatia ele oferece detalhar a proxima."

### Escape Hatches
- Esta skill funciona standalone: o pipeline e opcional
- Se PRD.md existir mas o dev quiser ignorar: confirmar antes de descartar
- Dev pode voltar ao PRD: "quero ajustar o PRD antes de planejar"
- Dev pode forcar plano flat: "quero tudo em um arquivo so"
- Os planos sao editaveis diretamente nos arquivos .md

---

## Output Format (v6 — D18)

Os artefatos gerados ficam DENTRO da pasta `docs/exec-plans/active/YYYY-MM-DD-{slug}/`
(PASTA_ATIVA). Estrutura:

```
docs/exec-plans/active/YYYY-MM-DD-{slug}/   ← PASTA_ATIVA (criada pelo /write-prd)
├── PRD.md                                  ← a pagina, ja existe
├── DESIGN.md                               ← o desenho, quando o sistema pede
├── PLAN.md                                 ← overview gerado no Step 8
├── STATE.md                                ← tracking global gerado no Step 8
├── plano01/                                ← fatia 1, detalhada no Step 9
│   ├── README.md
│   ├── MEMORY.md
│   ├── fase-01-{nome}.md
│   └── fase-02-{nome}.md
└── plano02/ ...                            ← fatia 2, so quando ela for comecar
```

PLAN.md segue `templates/plan-overview-template.md` (Step 6): a tabela de fatias, o tracer bullet,
os riscos e as decisoes aplicadas. O formato de 10 secoes de `lib/exec-plan-template.ts` (modo full)
aparece em planos antigos; os gerados desde 2026-09 seguem o overview, e e ele que vale.

---

## Regras

1. O plano e o contrato — /execute-plan segue EXATAMENTE o que esta nos planos
2. Se o plano estiver errado, corrigir o PLANO (nao improvisar durante execucao)
3. A quantidade de planos e fases e decidida por analise semantica, NUNCA por thresholds fixos
4. NUNCA salvar plano se dev cancelar a aprovacao
5. STATE.md e a fonte de verdade para progresso — /execute-plan atualiza, dev pode editar
6. Cada plano tem sua propria MEMORY.md — preenchida durante execucao

---

## Task Sizing

Quatro tamanhos calibrados pelo tempo medio de execucao por um dev senior com IA:

| Tamanho | Criterio | Exemplo | Regra-corte |
|---------|----------|---------|-------------|
| **XS** | < 2h | Adicionar campo a tabela existente + migration | Sem dependencia entre arquivos |
| **S** | < 4h | Endpoint novo com 1 service + 1 teste | <= 3 arquivos tocados |
| **M** | < 1 dia (~6h efetivos) | Feature pequena: endpoint + UI + teste E2E | 5-10 arquivos |
| **L** | > 1 dia | Refactor multi-modulo, migracao de schema, novo subsistema | DEVE SER QUEBRADO |

**Regra inviolavel:** **L sempre quebra**. Divida em subtasks XS/S/M antes de planejar.
Uma fase L escondida e sempre underestimate disfarcado.

**Sinais de que algo "S" e na verdade "M":**
- Toca mais de 3 arquivos
- Precisa de migration de schema
- Tem decisao arquitetural pendente

**Sinais de que algo "M" e na verdade "L":**
- Quebra contratos publicos (API/types exportados)
- Requer coordenacao entre 2+ equipes ou subsistemas
- Tem incerteza tecnica nao resolvida (precisa de spike antes)
- O titulo da fase contem "e"/"and" (ex: "criar API e UI") — sinal de que sao duas fases

---

## Dependency Graph (ASCII)

Notacao canonica para grafos de dependencia entre fases (mesmo formato usado em
`plan-readme-template.md`):

- **Nome do node** = `fase-NN` (numero da fase do plano)
- **Seta horizontal** = `→` ou `--->` (continuacao na mesma linha)
- **Seta vertical** = `|` no meio + `v` no fim (3 caracteres minimo)
- **Junction (fan-in)** = `+----+----+` com `|` saindo do meio

Exemplo curto (4 nodes mostrando paralelismo):

```
fase-01 (tipos base)
    |
    v
fase-02 (services)     fase-03 (UI components)
    |                          |
    +------------+-------------+
                 |
                 v
          fase-04 (E2E gate)
```

**Como ler:** `fase-02` e `fase-03` rodam em paralelo (ambas saem de `fase-01`).
`fase-04` aguarda as duas (fan-in). Indentacao alinha `|` verticalmente — facilita
leitura em monospace.

**Anti-padroes:**
- Usar caixas (`+---+\n| X |\n+---+`) — ruido visual sem benefit.
- Setas diagonais (`\` ou `/`) — quebram em alguns renderers markdown.
- Nodes sem prefixo `fase-NN` — perde rastreabilidade com os arquivos.

---

## Parallelization Safety

Desenhar o grafo (acima) diz a ORDEM. Esta taxonomia diz o que pode rodar
ao MESMO tempo com seguranca — aplicar ao decidir paralelismo entre planos
(Step 5) e entre fases (`**Paralelismo possivel:**` nos templates).

| Categoria | O que e | Regra |
|---|---|---|
| **Seguro paralelizar** | Slices/fases independentes, testes de feature ja implementada, documentacao | Paralelizar a vontade |
| **Deve ser sequencial** | Migrations de schema, mudancas em estado compartilhado, cadeias de dependencia (fan-in) | Serializar — uma de cada vez |
| **Precisa de coordenacao** | Fases/planos que compartilham um contrato de API (types, rota, payload) | **Definir o contrato PRIMEIRO, depois paralelizar** — nunca correr sobre um contrato ainda nao acordado |

A terceira categoria e a armadilha mais comum: dois subagentes editando o mesmo
contrato em paralelo geram conflito ou divergencia silenciosa. Se duas fases tocam
o mesmo type/endpoint, extraia o contrato para uma fase anterior (sequencial) e so
entao deixe as consumidoras rodarem em paralelo.

---

## Completion Signal (D33)

Ao finalizar o output principal (criacao do plano), a skill emite automaticamente um bloco YAML machine-readable via `console.log`. Orquestradores podem extrair o sinal usando `extractCompletionSignal(output)`.

```typescript
import { renderCompletionSignal } from '../lib/completion-signal'
console.log('\n\n' + renderCompletionSignal({
  skill: 'plan-feature',
  status: 'complete',
  outputs: [/* filePath do plano criado */],
  next_suggested: '/execute-plan',
  blocks_for_user: [],
}))
```

---

## Referencias

- `skills/lib/legacy-detector.md` — Algoritmo de deteccao de estrutura legacy (consumido pelo Step 0)
- `skills/lib/legacy-migrator.md` — Algoritmo de migracao atomica STAGE/MOVE/CONFIRM/ROLLBACK (consumido pelo Step 0)

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Vou planejar enquanto codifico" | Planejamento e implementacao misturados geram escopo crescente invisivel. Quando perceber o desvio, ja ha codigo que resiste a mudanca. |
| "O plano esta na minha cabeca" | Plano nao escrito nao e plano — e intencao. Intencao nao passa por revisao nem por sub-agente. |
| "Essa feature e simples, nao precisa de PRD" | Features "simples" sem spec sao as maiores fontes de retrabalho. A simplificacao e visivel antes de comecar, nao depois. |
| "Vou ajustar as fases durante a execucao" | Ajustes durante execucao nao documentados geram desvios invisiveis. Correto e pausar, corrigir o plano, entao prosseguir. |

## Red Flags

- Task sem criterio explicito de verificacao (como saber que esta pronta?)
- Fase com descricao "criar tudo de uma vez" ou "implementar o modulo completo"
- Estimativa de sizing ausente ou apenas "grande/medio/pequeno" sem justificativa
- Dependencia entre fases nao declarada explicitamente
- Plano sem secao de rollback ou exit criteria
- Feature com >3 etapas sem diagrama de fluxo ou sequencia de estados
