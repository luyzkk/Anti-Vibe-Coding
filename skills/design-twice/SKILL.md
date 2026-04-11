---
name: design-twice
description: "Gera 3+ propostas arquiteturais divergentes via subagentes paralelos. Combate convergencia prematura forcando exploracoes com restricoes diferentes antes de escolher."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Agent, Write
argument-hint: "[descricao do problema ou feature a explorar]"
---

# Design Twice — Propostas Arquiteturais Divergentes

Skill de exploracao arquitetural. Gera multiplas propostas genuinamente diferentes em paralelo antes de convergir em uma decisao. Baseada no principio "Design It Twice" de John Ousterhout.

Diferenca das outras skills:
- **consultant**: ensina conceitos e apresenta trade-offs para UMA decisao
- **grill-me**: resolve ambiguidades fazendo perguntas
- **design-twice**: gera MULTIPLAS solucoes completas em paralelo para COMPARAR

---

## Step 1 — Receber Descricao do Problema

Se argumento passado no comando, usar como ponto de partida.

Se vem do `/grill-me`: importar CONTEXT.md de `.planning/` com Read para reaproveitar decisoes ja tomadas.

Se descricao vaga: usar AskUserQuestion:
> "Descreva o problema em 2-3 frases. O que a feature precisa fazer? Quais sao as constraints conhecidas?"

Se o dev ja tem preferencia clara por uma abordagem:
> "Voce ja tem uma preferencia. Design Twice e mais util quando nao ha clareza sobre a melhor abordagem. Quer prosseguir mesmo assim para validar a escolha?"

---

## Step 2 — Identificar Constraints e Requisitos

Explorar codebase com Glob/Grep/Read para extrair contexto:
- Stack existente (package.json, README, .env.example, CLAUDE.md)
- Libs ja no projeto (nao introduzir alternativas sem motivo)
- Padroes de codigo do projeto
- Entidades e schemas relevantes

Registrar em formato estruturado para repassar aos subagentes:

```
## Constraints Compartilhadas
- Stack: [detectada do codebase]
- Must have: [comportamentos inegociaveis do dev]
- Constraints tecnicas: [detectadas + informadas]
- Constraints de negocio: [prazo, custo, equipe — informadas pelo dev]
```

Selecionar dominio baseado nas constraints coletadas (ver secao abaixo).

---

## Restricoes Divergentes por Dominio

### Dominio 1: Arquitetura de Codigo
**Quando usar:** feature envolve decisao sobre estrutura, camadas, modulos ou patterns

| Agente | Restricao (enviada ao subagente) | Filosofia |
|--------|----------------------------------|-----------|
| A | "Minimize complexity. Simplest possible approach. Fewer abstractions, fewer files." | KISS radical |
| B | "Maximize flexibility. Design for future extension. Plugin points, interfaces." | Open-Closed |
| C | "Optimize for performance. Every millisecond matters. Inline, cache, batch." | Performance-first |

### Dominio 2: Escolha de Tecnologia
**Quando usar:** feature requer escolha de lib, framework ou ferramenta

| Agente | Restricao (enviada ao subagente) | Filosofia |
|--------|----------------------------------|-----------|
| A | "Use only what's already in the project. Zero new dependencies." | Conservador |
| B | "Use the best tool for the job, even if new. Optimize for developer experience." | Best-of-breed |
| C | "Minimize dependencies. Prefer built-in solutions and platform APIs." | Minimalista |

### Dominio 3: Schema de Dados
**Quando usar:** feature envolve modelo de dados, banco, entidades

| Agente | Restricao (enviada ao subagente) | Filosofia |
|--------|----------------------------------|-----------|
| A | "Normalize fully. Third normal form. Single source of truth." | Normalizado |
| B | "Denormalize for read performance. Accept redundancy for speed." | Denormalizado |
| C | "Event-sourced. Store events, derive state. Full audit trail." | Event-driven |

### Dominio 4: Frontend
**Quando usar:** feature envolve interface, componentes, UX

| Agente | Restricao (enviada ao subagente) | Filosofia |
|--------|----------------------------------|-----------|
| A | "Server-first. Minimize client JS. SSR, progressive enhancement." | Server-centric |
| B | "Client-rich. Optimistic updates, offline support, local state." | Client-centric |
| C | "Progressive. Works without JS, enhanced with it. Accessibility first." | Progressive |

### Heuristicas de Selecao de Dominio

| Sinal nas constraints | Dominio recomendado |
|-----------------------|--------------------|
| "Como estruturar", patterns, camadas, SOLID | Arquitetura de Codigo |
| "Qual lib usar", framework, tool, dependency | Escolha de Tecnologia |
| "Modelo de dados", schema, tabelas, relacoes, banco | Schema de Dados |
| "Tela", componente, UI, layout, formulario, pagina | Frontend |
| Multiplos sinais | Usar dominio MAIS relevante ou perguntar ao dev |

Se o problema nao encaixa em nenhum dominio: criar restricoes customizadas baseadas nos eixos de trade-off mais relevantes (ex: custo vs velocidade, seguranca vs usabilidade).

Regras para restricoes:
1. As 3 restricoes DEVEM ser genuinamente diferentes — nao variacoes do mesmo tema
2. Cada restricao deve produzir uma solucao estruturalmente diferente, nao apenas detalhes diferentes
3. Para 4-5 propostas: criar restricoes adicionais nao cobertas pelas 3 iniciais
4. Para "proposta focada em [X]": criar restricao customizada com foco explicito em X
5. O orquestrador NAO gera solucao propria — apenas distribui restricoes e compara resultados

---

## Step 3 — Spawnar Subagentes em Paralelo

Usar a Agent tool para spawnar 3 subagentes em PARALELO (em uma unica mensagem com 3 tool calls simultaneos):

```
Para cada agente (A, B, C):
- description: "Design Twice — Proposta {A|B|C}: {nome da filosofia}"
- subagent_type: "general-purpose"
- model: "sonnet" (custo-eficiente para exploracao)
```

Regras de isolamento:
- Subagentes NAO veem as solucoes uns dos outros
- Cada subagente recebe as MESMAS constraints compartilhadas + restricao UNICA
- Se um subagente falhar, reportar ao dev e oferecer re-tentar ou prosseguir com 2 propostas

### Template de Input para Cada Subagente

```markdown
# Design Twice — Proposta {letra}

## Problema
{descricao do problema/feature do dev}

## Constraints Compartilhadas (inegociaveis)
{constraints do Step 2 — stack, must-haves, constraints tecnicas e de negocio}

## Sua Restricao Especifica
{restricao unica deste agente — ex: "Minimize complexity. Simplest possible approach."}

## Instrucoes
Voce e um arquiteto de software explorando UMA abordagem especifica para este problema.
Sua restricao e seu norte — TODAS as decisoes devem favorecer essa direcao.
Use Read/Grep/Glob para explorar o codebase se precisar de mais contexto.
Produza o output EXATAMENTE no formato abaixo. Nao omita nenhuma secao.

## Output Esperado

### Abordagem
{descricao da solucao proposta em 3-5 paragrafos}
{incluir estrutura de arquivos/modulos se aplicavel}
{incluir diagrama textual se ajudar na compreensao}

### Pros (minimo 3)
1. {vantagem concreta e especifica ao problema, nao generica}
2. ...
3. ...

### Contras (minimo 3)
1. {desvantagem concreta e especifica ao problema, nao generica}
2. ...
3. ...

### Complexidade: {1-5}
{1=trivial, 2=simples, 3=moderado, 4=complexo, 5=muito complexo}
{justificativa em relacao ao projeto atual}

### Riscos
1. {risco tecnico ou de negocio concreto}
2. ...

### Esforco: {S|M|L}
{S=horas, M=dias, L=semanas}
{justificativa em relacao ao projeto atual}
```

Regras de output dos subagentes:
1. TODAS as secoes sao obrigatorias — se um agente omitir algo, reformatar antes de comparar
2. Pros e contras devem ser CONCRETOS e especificos ao problema — nao genericos
3. Complexidade e esforco justificados em relacao ao projeto atual, nao em absoluto
4. O orquestrador espera TODOS os 3 agentes completarem antes de prosseguir

---

## Step 4 — Compilar Tabela Comparativa

Apos os subagentes retornarem, compilar em tabela Markdown:

```markdown
## Comparacao de Propostas

| Aspecto          | Proposta A ({filosofia}) | Proposta B ({filosofia}) | Proposta C ({filosofia}) |
|------------------|--------------------------|--------------------------|--------------------------|
| **Abordagem**    | {resumo em 1-2 frases}   | {resumo em 1-2 frases}   | {resumo em 1-2 frases}   |
| **Complexidade** | {N}/5                    | {N}/5                    | {N}/5                    |
| **Esforco**      | {S/M/L}                  | {S/M/L}                  | {S/M/L}                  |
| **Pros**         | {top 2 pros}             | {top 2 pros}             | {top 2 pros}             |
| **Contras**      | {top 2 contras}          | {top 2 contras}          | {top 2 contras}          |
| **Riscos**       | {principal risco}        | {principal risco}        | {principal risco}        |
```

Regras da tabela:
- Resumir para caber na tabela — o detalhamento completo fica abaixo (em secoes sequenciais)
- Para 4-5 propostas, estender com colunas adicionais (ou usar formato de lista se ficar muito largo)
- Incluir output COMPLETO de cada subagente apos a tabela

---

## Step 5 — Apresentar ao Dev com Deteccao de Convergencia

### Criterios de Convergencia

Antes de apresentar, analisar se as propostas convergiram (2+ criterios = convergente):
1. Mesma estrutura de arquivos/modulos proposta
2. Mesma lib/framework escolhido
3. Mesma abordagem de dados (normalizado/denormalizado/etc)
4. Complexidade e esforco similares (diferenca <= 1 ponto e <= 1 nivel)
5. Pros e contras se sobrepoe em >60%

### Se CONVERGENTE

```
As 3 propostas sao fundamentalmente similares. O problema e mais simples do que parece —
qualquer abordagem funciona. A diferenca esta em detalhes, nao em direcao.

Recomendacao: Proposta {X} por ser a mais {simples|alinhada|pragmatica}.
Razao: {justificativa curta}.
```

### Se DIVERGENTE

```
As 3 propostas oferecem direcoes genuinamente diferentes.

{tabela comparativa}

{detalhamento completo de cada proposta}

Recomendacao: Proposta {X}.
Razao: {justificativa baseada em constraints do projeto}.

Qual voce prefere? Ou quer um hibrido combinando aspectos de diferentes propostas?
```

### Tratamento de Respostas do Dev

| Resposta do dev | Acao do orquestrador |
|-----------------|---------------------|
| Escolhe proposta X | Registrar escolha e prosseguir para Step 6 |
| "Quero hibrido de A e C" | Combinar aspectos solicitados, apresentar proposta hibrida, confirmar |
| "Mais propostas" | Spawnar 1-2 subagentes adicionais com restricoes nao cobertas (max 5 total) |
| "Proposta focada em [X]" | Spawnar 1 subagente com restricao customizada focada em X |
| "Nenhuma me agrada" | Perguntar o que falta, refinar constraints, re-executar com restricoes ajustadas |
| "Tanto faz" | NAO aceitar: "Essa decisao impacta [aspecto]. Recomendo {X} porque [razao]. Concorda?" |

---

## Step 6 — Registrar Decisao

Apos o dev escolher (ou aceitar recomendacao), salvar em `.claude/decisions.md`:

```markdown
### DT-{numero}: {titulo curto do problema}

**Data:** {YYYY-MM-DD}
**Metodo:** Design Twice (3 propostas)
**Dominio:** {dominio usado — Arquitetura/Tecnologia/Dados/Frontend}
**Escolha:** Proposta {letra} — {nome da filosofia}
**Razao:** {justificativa do dev ou "recomendacao aceita"}

**Alternativas rejeitadas:**
- Proposta {letra}: {resumo} — Rejeitada porque: {motivo}
- Proposta {letra}: {resumo} — Rejeitada porque: {motivo}

**Convergencia:** {sim|nao} — {comentario se relevante}
```

Regras de registro:
- Prefixo `DT-` para decisoes do Design Twice (diferente de `D-` do grill-me)
- Numeracao auto-incrementada baseada nas entradas DT- existentes em decisions.md
- Se decisions.md nao existir, criar com header padrao
- Se o dev pediu hibrido: registrar como "Hibrido de A+C" com detalhes
- Se convergente: registrar "Todas as propostas convergiram — problema simples"
- Se o dev quiser ADR formal: sugerir `/decision-registry` (nao forcar)

---

## Step 7 — Learn Point

Oferecer aprendizado contextualizado ao trade-off especifico da decisao:

```
Quer entender por que a Proposta {escolhida} tem {trade-off especifico}?
Posso explicar via /learn.
```

Exemplos por dominio:
- **Arquitetura:** "Quer entender por que simplificar agora pode complicar depois (KISS vs extensibilidade)?"
- **Tecnologia:** "Quer entender os trade-offs de adicionar uma nova dependencia ao projeto?"
- **Dados:** "Quer entender quando desnormalizar compensa e quando cria problemas de consistencia?"
- **Frontend:** "Quer entender a diferenca entre SSR e client-side rendering em termos de performance e DX?"

O learn point deve ser especifico ao trade-off da decisao, NAO generico.

---

## Step 8 — Sugerir Proximo Passo

Baseado no contexto:

| Cenario | Sugestao |
|---------|----------|
| Dev veio do /grill-me | "Quer prosseguir para /write-prd ou /plan-feature?" |
| Complexidade >= 4 | "Feature complexa. Recomendo /write-prd para especificar antes de implementar." |
| Complexidade <= 2 | "Feature simples. /plan-feature deve ser suficiente." |
| Moderada | "Quer /write-prd para documentar ou /plan-feature para ir direto?" |

---

## Regras

1. Subagentes NAO veem as solucoes uns dos outros — isolamento total
2. Cada subagente recebe as MESMAS constraints mas restricoes DIFERENTES
3. O orquestrador NAO gera solucao propria — apenas compara e recomenda
4. Se TODAS as propostas convergirem, declarar que o problema e simples
5. Minimo 3 propostas, maximo 5 (3 e o default)
6. Dev pode pedir "mais propostas" ou "proposta focada em [X]"
7. "Tanto faz" NAO e aceito — insistir com recomendacao justificada
8. A qualidade das propostas depende da qualidade das restricoes
9. As restricoes devem ser genuinamente diferentes — nao variacoes do mesmo tema
10. Decisao sempre registrada em decisions.md com prefixo DT-
11. Learn point sempre oferecido ao final
12. Proximo passo sempre sugerido ao final
