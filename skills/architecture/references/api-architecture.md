# API Architecture & Stack Selection — Referencia Detalhada

---

## REST vs GraphQL

### REST (Representational State Transfer)

**Pontos fortes:**
- Maturidade extrema (desde 2000)
- Todo dev sabe usar — devpool enorme
- Cache simples via HTTP (CDN, ETags, headers padrao)
- Custo inicial baixissimo (setup em minutos)
- Monitoramento maduro (ferramentas consolidadas)
- Upload de arquivos nativo
- Real-time via WebSockets/SSE

**Limitacoes:**
- Overfetching (receber dados que nao precisa)
- Multiplas chamadas para dados relacionados
- Endpoint especifico para cada necessidade do front = manutencao crescente

### GraphQL (Graph Query Language)

**Pontos fortes:**
- Resolve overfetching nativamente (front pede so o que precisa)
- Uma chamada para dados complexos/relacionados
- Schema como contrato — front e back trabalham independentes
- Ideal para times grandes e distribuidos

**Limitacoes:**
- Maturidade menor que REST
- Devpool menor
- Cache muito mais complexo (nao usa cache HTTP padrao)
- Setup inicial pesado (code generation, resolvers, schema)
- Monitoramento requer tooling especifico
- Upload de arquivos requer workaround

### Comparacao Detalhada

| Aspecto | REST | GraphQL |
|---------|------|---------|
| Cache | HTTP nativo (CDN, ETags) | Requer solucao custom |
| Curva de aprendizado | Baixa | Media-alta |
| Overfetching | Endpoints especializados | Resolvido nativamente |
| Monitoramento | Maduro | Requer tooling especifico |
| Upload de arquivos | Nativo | Workaround necessario |
| Real-time | WebSockets/SSE | Subscriptions |
| Documentacao | Swagger/OpenAPI maduro | Schema introspection |
| Devpool | Enorme | Menor |
| Setup inicial | Minutos | Horas/dias |
| Contrato front-back | Implícito ou via OpenAPI | Schema explicito |

### Quando Usar REST

- Time pequeno (< 5 devs)
- Projeto novo / MVP
- 1-2 front-ends consumindo a API
- Cache HTTP e importante (CDN)
- Dominio simples, CRUD predominante

### Quando Considerar GraphQL

- 3+ front-ends com necessidades diferentes (web, mobile, tablet)
- Times distribuidos que precisam de contrato (schema) claro
- Telas complexas que agregam muitos dados de fontes diferentes
- Time tem experiencia comprovada com GraphQL

### Abordagem Hibrida

REST para a maioria dos endpoints + GraphQL para telas complexas que agregam muitos dados. Nao e tudo ou nada. Muitas empresas usam ambos com sucesso.

### Antes de Migrar para GraphQL

Verificar se problemas podem ser resolvidos no REST:
- Documentacao ruim → Swagger/OpenAPI
- Overfetching → Endpoints especializados
- Multiplos front-ends → BFF (Backend for Frontend)

---

## Stack Selection

### Processo de Decisao

```
1. ESCOPO     → Definir o problema com clareza (quantos usuarios, MVP vs escala)
2. CORE       → Identificar os componentes essenciais (multitenancy, admin panel, etc.)
3. PESQUISA   → Avaliar opcoes maduras para cada componente
4. PoC        → Prototipos para validar riscos tecnicos
5. ADR        → Documentar a decisao e justificativa
```

### Passo 1: Dimensionar o Problema

A stack que leva de zero a mil usuarios NAO e a mesma que leva de mil a um bilhao. Definir claramente:
- Quantos usuarios se quer atingir inicialmente?
- Qual e o MVP?
- O negocio e B2B ou B2C?

Se o software funcionar para 2 usuarios, funciona para 2 mil. Quando tiver 2 mil clientes pagantes, o problema de escalabilidade se resolve com dinheiro.

### Passo 2: Identificar Componentes Core

Gastar pelo menos 5 horas com a equipe nessa etapa. Desenhar esbocos de telas, listar features imprescindiveis, identificar integracoes com terceiros.

**Escolhas erradas aqui custam semanas de retrabalho.** Se nao identificar que o projeto precisa de multitenancy, por exemplo, a escolha de stack pode ser incompativel.

### Passo 3: Pesquisar Tecnologias

Fatores que pesam na decisao:
- O que a equipe domina ou pode dominar rapidamente
- Maturidade da tecnologia para o PROBLEMA ESPECIFICO
- Facilidade de contratar desenvolvedores
- Disponibilidade de comunidade e suporte
- Se o negocio e B2B ou B2C (impacta prioridade front vs back)

**Pergunta central:** O que leva ao MVP mais rapido?

### Passo 4: PoC (Proof of Concept)

Criar repositorio do zero e validar que cada componente core funciona. NAO e para implementar funcionalidades — e para validar que nao ha bloqueios tecnicos.

**Checklist de validacao:**
- Cada componente core funciona?
- Integracoes funcionam?
- Deploy funciona?
- CI/CD funciona?

Se algo nao funcionar, voltar as etapas anteriores e reajustar.

### Passo 5: ADR (Architecture Decision Record)

Documentar a decisao no formato:

```
# ADR-001: [Titulo da Decisao]
## Status: [Proposta | Aceita | Deprecada | Substituida]
## Contexto: [Qual problema estamos resolvendo?]
## Decisao: [O que decidimos fazer?]
## Alternativas Consideradas: [O que mais avaliamos e por que descartamos?]
## Consequencias: [Positivas e negativas da decisao]
## Data: YYYY-MM-DD
```

---

## Principios de Escolha de Stack

### Hype e irrelevante
"Todo mundo esta usando X" nao e argumento. A tecnologia no "zeitgeist do Twitter" pode nao resolver o problema especifico.

### Dimensionar o problema ANTES
"Precisamos de Kafka?" → "Qual o volume de mensagens?" Avaliar necessidade real antes de adotar complexidade.

### Maturidade > Modernidade
Ecossistema maduro = mais libs, mais respostas no Stack Overflow, mais candidatos para contratar. A maturidade para o PROBLEMA ESPECIFICO importa mais que a maturidade geral.

### Boring Technology
Tecnologia chata e comprovada reduz risco. Tokens de inovacao sao limitados — gastar apenas onde traz vantagem competitiva real.

### Considerar o que a equipe domina
Tecnologia que ninguem na equipe conhece traz custo de aprendizado. "Nao se chuta uma arvore e caem 10 devs em Elixir."

### O processo e iterativo
Escolher stack nao e linear. Ao fazer o PoC, pode-se descobrir que precisa voltar e reconsiderar tecnologias.

---

## Red Flags

| Red Flag | Problema |
|----------|----------|
| "Vamos usar porque e o que eu conheco" | Sem avaliar alternativas |
| "Vamos usar porque e novo e moderno" | Hype-driven development |
| "E o padrao do mercado" | Sem validar se resolve SEU problema |
| Nenhuma PoC antes de adotar tecnologia critica | Risco de bloqueio tecnico |
| Ausencia de ADR para decisoes significativas | Decisoes nao documentadas, nao revisitaveis |
| Otimizacao para bilhoes de usuarios com zero clientes | Otimizacao prematura |
| 3 apps (iOS + Android + web) para zero usuarios | Desperdicio de esforco |

---

## Checklist de Verificacao

```
[ ] Escopo do MVP esta claramente definido?
[ ] Componentes core foram identificados? (5+ horas de planejamento)
[ ] Tecnologias foram avaliadas para cada componente core?
[ ] A equipe tem experiencia com as tecnologias escolhidas?
[ ] PoC validou que nao ha bloqueios tecnicos?
[ ] Decisoes foram documentadas em ADRs?
[ ] A stack resolve o problema de HOJE, nao de escala imaginaria?
```
