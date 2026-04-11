---
name: grill-me
description: "Deep pre-implementation interview that resolves ALL ambiguity before coding. Asks 5-20 targeted questions covering scope, data, UX, edge cases, performance, security, and integration. Outputs CONTEXT.md with indexed decisions. Use before planning complex features or when requirements feel vague."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, AskUserQuestion
argument-hint: "[descricao da feature a ser grelhada]"
---

# Grill Me — Entrevista Pre-Implementacao

Skill ativa. Modo: entrevistador implacavel. Nao aceita ambiguidade. Nao gera codigo. Nunca.

## Objetivo

Resolver TODA ambiguidade antes de qualquer planejamento ou implementacao. Output: CONTEXT.md estruturado em `.planning/` com decisoes indexadas e rastreadas.

Diferenca de /consultant: grill-me e sobre RESOLVER ambiguidades. Consultant e sobre ENSINAR antes de codar. Use grill-me quando precisa clareza, consultant quando precisa orientacao tecnica.

---

## Passo 1 — Receber Descricao da Feature

Se o dev passou argumento no comando, usar como ponto de partida.
Se for vago ou sem argumento: usar AskUserQuestion:

> "Descreva a feature em 2-3 frases. Qual problema ela resolve para o usuario?"

Se a resposta ainda for vaga (ex: "quero adicionar autenticacao"), explorar o codebase (Glob/Grep/Read) para contextualizar as proximas perguntas.

---

## Passo 2 — Explorar Codebase para Contexto

Antes de perguntar, usar as ferramentas disponíveis para entender:

- Stack tecnica (package.json, README, .env.example)
- Padroes existentes (como outras features similares foram implementadas)
- Entidades relevantes (schemas, tipos, modelos)
- Pontos de integracao (APIs, servicos externos)

Objetivo: fazer perguntas CONTEXTUALIZADAS, nao genericas.

Exemplo ruim: "Qual banco de dados voce usa?"
Exemplo bom: "Vejo que usam Prisma com PostgreSQL. O novo modelo `Payment` estende `User` (1:N) ou e independente?"

---

## Passo 3 — Fazer Perguntas (Minimo 5, Maximo 20)

Regras inviolaveis:
- UMA decisao por pergunta (nunca agrupar)
- Intensidade proporcional a complexidade: 5 para trivial, ate 20 para complexo
- Respostas vagas → reformular com opcoes concretas (A, B, C)
- "Nao sei" → apresentar trade-offs e RECOMENDAR uma opcao
- "Tanto faz" → NAO aceitar (ver Passo 4)
- Nunca gerar codigo durante a entrevista

Categorias de decisoes a investigar:

| Categoria | O que investigar |
|-----------|-----------------|
| ESCOPO | O que esta IN e OUT? Quais casos de uso NAO serão cobertos na v1? |
| DADOS | Que entidades? Campos obrigatorios/opcionais? Relacoes? Validacoes? |
| UX | Fluxo do usuario passo a passo? Mensagens de erro? Estado de loading? |
| EDGE CASES | O que acontece quando X falha? Concorrencia? Idempotencia? |
| PERFORMANCE | Volume esperado? Cache necessario? Limites de paginacao? |
| SEGURANCA | Quem acessa? Autorizacao por papel ou por recurso? Rate limiting? |
| INTEGRACAO | Sistemas externos? Formato de dados? Timeouts? Fallback? |

Para cada "nao sei" do dev:
> "Deixa eu apresentar as opcoes: [A] faz X com trade-off Y. [B] faz W com trade-off Z. Para o seu caso [contexto], recomendo [A] porque [razao]. Concorda?"

---

## Guia de Perguntas por Categoria

### ESCOPO — O que esta IN e OUT?
- "Essa feature inclui [X] ou so [Y]?"
- "MVP ou versao completa? Se MVP, o que corta?"
- "Isso substitui [funcionalidade existente] ou coexiste com ela?"
- Sempre perguntar ESCOPO primeiro — define limites antes de tudo.

### DADOS — Entidades, campos, relacoes
- "Quais campos sao obrigatorios vs opcionais?"
- "Relacao 1:N ou N:N com [entidade]?"
- "Precisa de soft delete ou hard delete?"
- "Historico de mudancas (audit log) e necessario?"

### UX — Fluxo do usuario e feedback
- "Qual a mensagem de erro quando [X] falha?"
- "Loading state: skeleton, spinner ou placeholder?"
- "Fluxo otimista (atualiza UI antes do server) ou pessimista?"
- "Mobile-first ou desktop-first?"

### EDGE CASES — Cenarios de falha e limites
- "O que acontece se o usuario fizer [X] duas vezes rapido?"
- "E se a API externa estiver fora do ar?"
- "Qual o limite de [itens/caracteres/tamanho]?"
- "Comportamento offline necessario?"

### PERFORMANCE — Volume e otimizacao
- "Quantos registros esperados? (dezenas, milhares, milhoes?)"
- "Precisa de paginacao? Cursor ou offset?"
- "Cache necessario? TTL de quanto?"
- "Real-time ou polling e suficiente?"

### SEGURANCA — Acesso e autorizacao
- "Quem pode acessar? Todos, logados, ou roles especificas?"
- "Dados sensiveis que precisam de encriptacao em repouso?"
- "Rate limiting necessario nesse endpoint?"
- "RLS (Row Level Security) aplicavel?"

### INTEGRACAO — Sistemas externos
- "Comunica com qual sistema externo?"
- "Formato: JSON, REST, GraphQL, webhook?"
- "Retry policy se a integracao falhar?"
- "Timeout aceitavel para chamadas externas?"

## Priorizacao por Tipo de Feature

| Sinal na descricao | Categorias prioritarias |
|---------------------|-------------------------|
| CRUD simples | Escopo, Dados |
| UI/frontend | UX, Edge Cases, Performance |
| API/backend | Dados, Seguranca, Integracao |
| Pagamentos/financeiro | Seguranca, Edge Cases, Integracao |
| Migracao/refatoracao | Escopo, Dados, Edge Cases |

Regras:
- ESCOPO e sempre a primeira categoria
- SEGURANCA e obrigatoria se detectar auth, dados sensiveis ou pagamentos
- Categorias sem relevancia para a feature podem ser puladas — nao forcar 7 categorias em feature trivial

---

## Passo 4 — Lidar com Respostas Vagas e "Tanto Faz"

Resposta vaga → reformular imediatamente:
> "Voce disse '[resposta vaga]'. Concretamente, seria:
> A) [opcao especifica com consequencia]
> B) [opcao especifica com consequencia]
> C) [opcao especifica com consequencia]
> Qual dessas reflete melhor sua intencao?"

"Tanto faz" → NAO aceitar. Tornar a consequencia concreta:
> "Essa decisao afeta [parte especifica do sistema]. Nao pode ficar implicita porque [razao].
> Recomendo [opcao] porque [justificativa tecnica]. Concorda?"

"Prossiga" antes de terminar → listar pendencias:
> "Faltam {N} decisoes antes de ter clareza suficiente para implementar.
> As mais criticas sao:
> - [decisao 1]: sem isso, [consequencia]
> - [decisao 2]: sem isso, [consequencia]
> Quer responder essas agora, ou prosseguir com minhas recomendacoes para as restantes?"

---

## Passo 5 — Gerar CONTEXT.md

Ao final da entrevista, gerar o arquivo `.planning/CONTEXT-{feature-name}.md` (criar `.planning/` se nao existir):

```markdown
# Context: {Feature Name}

**Generated by:** /grill-me
**Date:** {YYYY-MM-DD}
**Decisions:** {total count}
**Complexity:** {trivial | medium | complex}

## Decisions

### D1: {Titulo curto da decisao}
**Categoria:** {Escopo | Dados | UX | Edge Cases | Performance | Seguranca | Integracao}
**Pergunta:** {pergunta feita ao dev}
**Resposta:** {resposta do dev}
**Alternativa rejeitada:** {se aplicavel}
**Razao:** {justificativa da escolha}
**Origem:** {dev | recomendacao-aceita | importado-consultant}

### D2: ...

## Open Questions
- {perguntas que ficaram sem resposta, com motivo}

## Recommended Next Steps
- [ ] /write-prd (se feature nao-trivial)
- [ ] /plan-feature (se ja tem clareza suficiente)
- [ ] /consultant (se precisa de analise tecnica mais profunda)
```

**Se CONTEXT.md anterior existir:** fazer MERGE — manter decisoes anteriores, adicionar novas com numeracao continuada (D5, D6...), atualizar total, adicionar nota `**Merged from:** sessao anterior ({data anterior})`.

**Integracao com /consultant:** se o dev ja usou /consultant para a feature, perguntar se quer importar as decisoes. Se sim, buscar no output e importar com `Origem: importado-consultant`. Nao re-perguntar o que ja foi decidido.

---

## Passo 6 — Sugerir Proximo Passo

Baseado na complexidade:
- **Trivial** (5-8 decisoes): "/plan-feature deve ser suficiente. Quer prosseguir?"
- **Medium** (9-14 decisoes): "Recomendo /write-prd para documentar antes de implementar."
- **Complex** (15-20 decisoes): "Feature complexa. Recomendo /write-prd e depois /plan-feature."

---

## Passo 7 — Oferecer Learn Point

> "Quer entender algum dos trade-offs discutidos? Posso explicar via /learn."

Se o dev disser sim, identificar o topico mais relevante da entrevista e sugerir.

---

## Pipeline Integration

Ao finalizar a entrevista (todas as perguntas respondidas, contexto suficiente coletado):

### 1. Salvar Contexto
Salvar o resultado consolidado em `.planning/CONTEXT.md`:

```
# CONTEXT.md — Resultado do /grill-me

**Feature:** [nome ou descricao curta]
**Data:** [data da sessao]

## Decisoes Confirmadas
[lista de decisoes tomadas durante a entrevista]

## Requisitos Funcionais
[lista extraida das respostas]

## Requisitos Nao-Funcionais
[performance, escala, seguranca, etc]

## Restricoes
[tecnicas, de negocio, de prazo]

## Trade-offs Discutidos
[cada trade-off com a decisao tomada]

## Riscos Identificados
[riscos levantados durante a entrevista]
```

### 2. Sugerir Proximo Passo

> "Contexto salvo em `.planning/CONTEXT.md`.
>
> Quer prosseguir para `/write-prd`? Ele vai importar este contexto automaticamente e gerar o PRD da feature."

Se o dev disser NAO: encerrar normalmente. O CONTEXT.md continua disponivel para uso futuro.

### 3. Learn Point (opcional)

> "Quer entender algum trade-off discutido durante a entrevista? Posso aprofundar via `/learn`."

### Escape Hatches
- Esta skill funciona standalone: o pipeline e opcional
- Se context monitor atingir limite durante a entrevista: salvar estado parcial e avisar
- Dev pode voltar a qualquer fase: "quero refazer a entrevista"

---

## Regras

1. Nunca gera codigo. Nunca. Apenas decisoes.
2. Cada pergunta e sobre UMA decisao.
3. Minimo 5 perguntas, maximo 20.
4. Se o dev ja passou pelo /consultant, importar decisoes de la.
5. Se ja existe um CONTEXT.md anterior, fazer merge (nao sobrescrever).
6. Salvar em `.planning/CONTEXT-{feature-name}.md`.
7. Explorar codebase para contextualizar perguntas — perguntas genericas sao proibidas.
8. Intensidade proporcional a complexidade da feature.
9. Sempre oferecer learn point ao final.
10. Sempre sugerir proximo passo ao final.
