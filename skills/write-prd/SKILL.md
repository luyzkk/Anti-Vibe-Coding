---
name: write-prd
description: "Cria especificacao completa de feature via entrevista interativa. Gera PRD com MoSCoW, criterios de aceite e decisoes tecnicas. Importa contexto do /grill-me se disponivel."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: "[descricao da feature ou problema a especificar]"
---

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
1. Buscar arquivos em .planning/CONTEXT-*.md (Glob)
2. Se encontrar:
   - Se mais de 1: perguntar qual importar
   - Ler o CONTEXT.md selecionado
   - Extrair: decisoes, escopo, restricoes, personas ja definidas
   - Informar: "Importei contexto do /grill-me. Vou usar essas decisoes como base."
   - Perguntar: "Algo mudou desde o Grill Me? Quer ajustar algo antes de gerar o PRD?"
3. Prosseguir para Step 2
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

```
1. Criar diretorio .planning/ no projeto do dev se nao existir
2. Gerar nome: .planning/PRD-{feature-name-em-kebab-case}.md
   Ex: .planning/PRD-sistema-notificacoes-push.md
3. Salvar com Write tool
4. Informar: "PRD salvo em .planning/PRD-{name}.md"
5. Informar: "Voce pode editar diretamente se precisar ajustar algo depois."

Se ja existir PRD em .planning/:
1. Ler o PRD existente
2. Perguntar: "Ja existe um PRD para {feature}. Quer atualizar/refinar ou criar um novo?"
3. Se atualizar: carregar como base e aplicar como refinamento
4. Se novo: criar com nome diferente (PRD-{feature}-v2.md)
```

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
| Dev quer parar | "Ok. PRD salvo em .planning/PRD-{name}.md. Retome com /plan-feature quando quiser." |

---

## Pipeline Integration

### 0. Importar Contexto (se disponivel)
Antes de iniciar o PRD, verificar se `.planning/CONTEXT.md` existe:

- **Se existir:** Importar automaticamente. Dizer ao dev:
  > "Encontrei `.planning/CONTEXT.md` do `/grill-me`. Vou usar este contexto para gerar o PRD."
  Usar os campos de CONTEXT.md para pre-preencher: requisitos funcionais, nao-funcionais, restricoes, trade-offs e riscos.

- **Se NAO existir:** Prosseguir com o fluxo normal de coleta de informacoes.

### 1. Salvar PRD
Ao finalizar o PRD gerado e aprovado pelo dev, salvar em `.planning/PRD.md`.

### 2. Sugerir Proximo Passo

> "PRD salvo em `.planning/PRD.md`.
>
> Quer prosseguir para `/plan-feature`? Ele vai quebrar este PRD em vertical slices e waves de execucao."

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
