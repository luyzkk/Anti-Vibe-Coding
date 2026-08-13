---
name: grill-me
description: "Entrevista pre-implementacao que resolve ambiguidade antes de codar. Gera CONTEXT.md com decisoes indexadas. Use antes de planejar feature complexa, ou quando os requisitos estao vagos."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, AskUserQuestion
argument-hint: "[descricao da feature a ser grelhada]"
---

# Grill Me — Entrevista Pre-Implementacao

Skill ativa. Modo: entrevistador implacavel. Nao aceita ambiguidade. Nao gera codigo. Nunca.

## Loading Constraints

Esta skill exige um humano presente e responsivo. NÃO invocar em contextos não-interativos (CI, runs agendados, `/loop`, loop autônomo). Se estiver em um desses e a descrição estiver subespecificada, sinalizar isso como BLOQUEIO para o humano — nunca auto-responder as perguntas.

## Objetivo

Resolver TODA ambiguidade antes de qualquer planejamento ou implementacao. Output: CONTEXT.md estruturado em `docs/exec-plans/active/YYYY-MM-DD-{slug}/CONTEXT.md` com decisoes indexadas e rastreadas.

Diferenca de /consultant: grill-me e sobre RESOLVER ambiguidades. Consultant e sobre ENSINAR antes de codar. Use grill-me quando precisa clareza, consultant quando precisa orientacao tecnica.

---

## Passo 1 — Receber Descricao da Feature

Se o dev passou argumento no comando, usar como ponto de partida.
Se for vago ou sem argumento: usar AskUserQuestion:

> "Descreva a feature em 2-3 frases. Qual problema ela resolve para o usuario?"

Se a resposta ainda for vaga (ex: "quero adicionar autenticacao"), explorar o codebase (Glob/Grep/Read) para contextualizar as proximas perguntas.

---

## Passo 1.5 — Formular Hipótese com Confiança

ANTES de fazer qualquer pergunta, declarar internamente (pode mostrar ao dev):

```
HYPOTHESIS: {hipótese sobre o que o dev realmente quer — 1 frase}
CONFIDENCE: {N}% — {motivo da incerteza, o que falta saber}
```

Regras:
- Começar com confiança HONESTA (normalmente 20-40% antes de perguntar)
- Se confiança > 70%, verificar: consegue predizer as respostas das próximas 3 perguntas? Se não, o número está inflado
- A hipótese força comprometimento com um modelo mental — as perguntas testam essa hipótese

Nas perguntas do Passo 3, adicionar GUESS ao final de cada uma:

```
GUESS: {sua hipótese para a resposta desta pergunta específica, com razão}
```

O GUESS expõe o modelo mental do entrevistador. Dev que discorda do GUESS ativa uma correção mais rica do que um simples "sim/não".

---

## Passo 2 — Fatos sao seus; decisoes sao do dev

Regra permanente, nao uma fase que termina aqui. Antes do primeiro round, exploracao curta para
**semear a arvore**:

- Stack tecnica (package.json, README, .env.example)
- Padroes existentes (como outras features similares foram implementadas)
- Entidades relevantes (schemas, tipos, modelos)
- Pontos de integracao (APIs, servicos externos)

Depois, sempre que uma pergunta da fronteira depender de um **fato** do ambiente, despachar subagente
e descobrir — nunca perguntar ao dev o que da para achar sozinho. **Sem bloquear o round:** exploracao
em curso e pre-requisito nao resolvido, entao so as perguntas a jusante esperam; o resto vai agora.

Objetivo: fazer perguntas CONTEXTUALIZADAS, nao genericas.

Exemplo ruim: "Qual banco de dados voce usa?"
Exemplo bom: "Vejo que usam Prisma com PostgreSQL. O novo modelo `Payment` estende `User` (1:N) ou e independente?"

---

## Passo 3 — Rounds e Fronteira

Toda decisao ramifica nas decisoes que dependem dela: o **design tree**. A **fronteira** e o conjunto
de decisoes cujos pre-requisitos ja estao resolvidos — as perguntas que dao para fazer *agora* sem
chutar resposta que ainda nao se ouviu.

Cada **round**:

1. Calcular a fronteira.
2. Perguntar a fronteira **inteira**, numerada, cada pergunta com sua recomendacao e seu GUESS.
3. Esperar as respostas. Cada uma remodela a arvore e empurra a fronteira.
4. Recalcular. Proximo round.

**Pergunta que depende de outra ainda aberta pertence a um round posterior**, nao a este. Perguntar
fora de ordem obriga o dev a responder no vacuo, e a resposta muda quando a dependencia resolve.

Regras inviolaveis:
- UMA decisao por pergunta (nunca agrupar)
- Respostas vagas → reformular com opcoes concretas (A, B, C)
- "Nao sei" → apresentar trade-offs e RECOMENDAR uma opcao
- "Tanto faz" → NAO aceitar (ver Passo 4)
- Nunca gerar codigo durante a entrevista

Para cada "nao sei" do dev:
> "Deixa eu apresentar as opcoes: [A] faz X com trade-off Y. [B] faz W com trade-off Z. Para o seu caso [contexto], recomendo [A] porque [razao]. Concorda?"

---

## As 7 Sementes da Arvore

As 7 categorias sao as **raizes** do design tree, plantadas antes do primeiro round — nao uma lista a
varrer. Semente que nao se aplica **fecha explicitamente** ("sem sistema externo — ramo fechado") e
vira linha em Open Questions. O que nao pode acontecer e um ramo nunca ter existido: arvore semeada so
pelo que o dev mencionou fecha sem tocar em seguranca uma unica vez.

### ESCOPO — O que esta IN e OUT?
- "Essa feature inclui [X] ou so [Y]?"
- "MVP ou versao completa? Se MVP, o que corta?"
- "Isso substitui [funcionalidade existente] ou coexiste com ela?"
- ESCOPO e a raiz de que quase tudo depende — na pratica, cai sozinha no round 1.

### DADOS — Entidades, campos, relacoes
- "Quais campos sao obrigatorios vs opcionais?"
- "Relacao 1:N ou N:N com [entidade]?"
- "Precisa de soft delete ou hard delete?"
- "Historico de mudancas (audit log) e necessario?"

### UX — Fluxo do usuario e feedback
- "Para cada ator que usa a feature, descreva o fluxo completo passo a passo: o que ele ve, o que clica, o que acontece em cada etapa?"
- "Que copy aparece ao usuario? Mensagens de confirmacao, avisos educativos, toasts de sucesso e erro?"
- "Se houver modais: quantos? O que cada um mostra e quais acoes oferece ao usuario?"
- "Quando um ator age, que notificacao o outro ator recebe — e qual seria o texto dessa notificacao?"
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
- ESCOPO e sempre a primeira raiz a resolver
- SEGURANCA ramifica obrigatoriamente se detectar auth, dados sensiveis ou pagamentos
- Prioridade decide **profundidade**, nunca existencia: semente irrelevante fecha explicitamente numa
  linha, e nao vira 4 perguntas forcadas numa feature trivial

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

### Resposta sofisticada demais → sondar (quer vs. acha que deveria querer)

As respostas mais perigosas não são as vagas — são as que SOAM como boa engenharia mas escondem que o dev não sabe o que quer. Sinais:
- Buzzwords como objetivo: "escalável", "clean", "moderno", "robusto" sem métrica/cenário concreto
- Apelo à convenção: "a forma padrão", "como a maioria faz"
- Auto-justificativa: "eu deveria...", "acho que é o esperado", "boa prática manda..."

Ao ouvir isso, sondar com UMA pergunta:
> "Se você não tivesse que justificar isso pra ninguém, o que você realmente quer aqui?"

Essa pergunta costuma render mais que as cinco anteriores. NÃO registrar um buzzword como decisão no CONTEXT.md sem essa sondagem.

---

## Passo 4.5 — Sintetizar e Confirmar (gate antes do CONTEXT.md)

ANTES de gravar o CONTEXT.md, devolver ao dev um resumo curto (5-8 linhas) na linguagem dele, confirmável linha a linha:

```
Aqui está o que entendi que você quer:

- Resultado:      {uma linha}
- Usuário:        {uma linha — quem se beneficia}
- Por que agora:  {uma linha — o que mudou}
- Sucesso:        {uma linha — como sabemos que funcionou}
- Restrição:      {uma linha — o limite que aperta}
- Fora de escopo: {uma linha — o que explicitamente NÃO vamos fazer}

Sim / não / ajustar?
```

A linha "Fora de escopo" é OBRIGATÓRIA: metade do desalinhamento é discordância silenciosa sobre o que NÃO está sendo construído.

O gate é um "sim" EXPLÍCITO. Os seguintes NÃO contam como sim:
- "tanto faz" / "você decide" → delegação, não decisão. Re-perguntar com duas opções concretas.
- "parece bom" → ambíguo. Perguntar "algo a ajustar?". Silêncio não é confirmação.
- "vai logo" / "bora" → muitas vezes saída educada, não endosso. Mesmo follow-up.
- silêncio seguido de "ok, começa" → o dev desistiu da entrevista, não convergiu. Parar e perguntar o que ficou faltando.

Se o dev corrigir, dobrar a correção no resumo e re-confirmar. Só seguir para o Passo 5 com sim explícito.

---

## Condicao de Parada — Fronteira Vazia

A entrevista termina quando a **fronteira esvazia**: todo ramo do design tree visitado, resolvido pelo
dev ou fechado explicitamente. Nada assumido em silencio.

Binario, e substitui piso, teto e limiar — cada um saiu por um motivo distinto: **piso de 5** (fronteira
vazia em 2 significa feature simples; forcar mais 3 e ruido), **teto de 20** (cortaria a fronteira pela
metade e devolveria decisao nao resolvida) e **limiar de percentual** (bound vago — o agente encerra
quando *parece* suficiente; fronteira e enumeravel).

Cross-check antes de sintetizar: com a fronteira vazia, voce prev a reacao do dev as proximas 3
perguntas que faria? Se nao, algum ramo fechou cedo demais — reabra.

**Fronteira que nao esvazia:** se um round produzir mais fronteira do que resolveu **duas vezes
seguidas**, parar e nomear — achado, nao bug, e o pedido precisa de um mapa, nao de mais perguntas:

> "Ja fiz {N} perguntas e cada resposta abre mais decisoes do que fecha. Isso e escopo grande demais,
> nao entrevista incompleta. Quer fatiar a feature antes de continuar?"

---

## Passo 5 — Gerar CONTEXT.md

Ao final da entrevista, criar a pasta datada do PRD e salvar CONTEXT.md dentro dela:

1. Derivar:
   - `slug` = kebab-case do nome da feature
   - `date` = YYYY-MM-DD atual
   - `folder` = `docs/exec-plans/active/{date}-{slug}/`
2. Se `{folder}` nao existe: criar e salvar `{folder}/CONTEXT.md`
3. Se `{folder}` ja existe (write-prd rodou antes? raro): salvar/mesclar `{folder}/CONTEXT.md`
4. Compatibilidade legacy (apenas LEITURA): se houver `.planning/CONTEXT-{slug}.md` solto, mesclar conteudo no novo CONTEXT.md e deixar o arquivo antigo intacto para o dev limpar manualmente

Template do conteudo:

```markdown
# Context: {Feature Name}

**Generated by:** /grill-me
**Date:** {YYYY-MM-DD}
**Decisions:** {total count}
**Complexity:** {trivial | medium | complex}

## Resumo Executivo

{2-4 linhas: o que a feature e, e o que esta entrevista resolveu. E o que alguem le ao voltar
ao documento meses depois, antes de decidir se precisa das decisoes uma a uma.}

## Decisions

### D1: {Titulo curto da decisao}
**Categoria:** {Escopo | Dados | UX | Edge Cases | Performance | Seguranca | Integracao}
**Pergunta:** {pergunta feita ao dev}
**Resposta:** {resposta do dev}
**Alternativa rejeitada:** {se aplicavel}
**Razao:** {justificativa da escolha}
**Origem:** {dev | recomendacao-aceita | importado-consultant}

### D2: ...

<!-- As cinco secoes abaixo sao OPCIONAIS: incluir so as que a entrevista de fato produziu, e
     omitir o heading das outras. Aqui fica o rascunho que saiu da conversa; requisito detalhado,
     MoSCoW e criterio de aceite sao trabalho do /write-prd, que le este arquivo. Entrevista
     trivial costuma fechar sem nenhuma delas. -->

## Requisitos Funcionais
- {comportamento que o dev enunciou como esperado}

## Requisitos Nao-Funcionais
- {performance, escala, seguranca, acessibilidade — quando discutidos}

## Restricoes
- {tecnicas, de negocio, de prazo}

## Trade-offs Discutidos
- {o trade-off e a decisao tomada, referenciando o D correspondente}

## Riscos Identificados
- {riscos levantados durante a entrevista}

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
- **Complex** (15+ decisoes): "Feature complexa. Recomendo /write-prd e depois /plan-feature."

---

## Passo 7 — Oferecer Learn Point

> "Quer entender algum dos trade-offs discutidos? Posso explicar via /learn."

Se o dev disser sim, identificar o topico mais relevante da entrevista e sugerir.

---

## Pipeline Integration

Ao finalizar a entrevista (todas as perguntas respondidas, contexto suficiente coletado):

### 1. Salvar Contexto

Salvar o resultado consolidado em `docs/exec-plans/active/{date}-{slug}/CONTEXT.md`, **no template
do Passo 5** — que e o unico. Ele ja carrega decisao indexada, resumo executivo e as cinco secoes
opcionais (requisitos, restricoes, trade-offs, riscos).

> Ate 2026-08-13 esta secao trazia um segundo template, com headings proprios. O agente lia os dois
> e o CONTEXT.md saia diferente conforme qual tivesse pesado mais. Ha **um** template, no Passo 5;
> mudanca de formato se faz la.

### 2. Sugerir Proximo Passo

> "Contexto salvo em `docs/exec-plans/active/{date}-{slug}/CONTEXT.md`.
>
> Quer prosseguir para `/write-prd`? Ele vai importar este contexto automaticamente e gerar o PRD da feature na mesma pasta."

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
3. Perguntar a fronteira inteira por round; parar quando ela esvaziar. Sem piso, sem teto.
4. Se o dev ja passou pelo /consultant, importar decisoes de la.
5. Se ja existe um CONTEXT.md anterior, fazer merge (nao sobrescrever).
6. Salvar em `docs/exec-plans/active/{date}-{slug}/CONTEXT.md` (criar pasta datada se nao existir).
7. Explorar codebase para contextualizar perguntas — perguntas genericas sao proibidas.
8. Intensidade proporcional a complexidade da feature.
9. Sempre oferecer learn point ao final.
10. Sempre sugerir proximo passo ao final.

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Já entendo o suficiente para começar" | Assumir entendimento sem validar é a fonte mais comum de retrabalho. O custo de uma pergunta é zero; o custo de uma semana de código errado não é. |
| "O usuário sabe o que quer" | Usuários descrevem soluções, não problemas. O trabalho do entrevistador é escavar até o problema real por baixo da solução proposta. |
| "Fazer muitas perguntas vai irritar o dev" | Um dev irritado por perguntas prefere isso a um agente que entrega a coisa errada. Clareza é respeito. |
| "Posso inferir o contexto do nome do projeto" | Nomes de projeto são rótulos, não specs. Dois projetos com o mesmo nome podem ter arquiteturas e restrições completamente diferentes. |
| "Ele disse que quer algo 'escalável/clean/moderno', isso é claro" | Buzzword não é spec. É o dev dizendo o que soa bem, não o que ele quer. Sondar: "se não tivesse que justificar pra ninguém, o que você realmente quer?" antes de registrar como decisão. |

## Red Flags

- Código sendo gerado durante o grill-me (entrevista não concluída)
- Perguntas genéricas sem referência ao codebase ou contexto específico do dev
- Aceitar "sei lá, você decide" sem forçar uma escolha com trade-offs explícitos
- Avançar para implementação com confiança < 70% sem registrar as incertezas
- Hipótese não declarada antes de fazer perguntas (modelo mental oculto)
- Perguntas que confirmam o que o agente já assumiu em vez de testarem a hipótese
- Aceitar resposta com buzzword ("escalável", "clean", "moderno", "a forma padrão", "eu deveria...") como decisão sem a sondagem de des-justificação
- Gravar o CONTEXT.md sem o gate de sintetizar-e-confirmar (Passo 4.5) — especialmente sem a linha "Fora de escopo"

## Verification

Depois de aplicar o grill-me:

- [ ] Hipótese + número de confiança declarados no primeiro turno (Passo 1.5)
- [ ] Toda confiança < 70% veio com uma razão de uma linha (o que falta)
- [ ] Uma decisão por pergunta, cada uma com GUESS anexado
- [ ] >= 1 sondagem de des-justificação rodou quando apareceu resposta com buzzword
- [ ] Restate concreto escrito (Resultado / Usuário / Por que agora / Sucesso / Restrição / Fora de escopo) no Passo 4.5
- [ ] "Sim" explícito obtido (não "tanto faz", não "parece bom", não silêncio)
- [ ] A fronteira esvaziou: todo ramo resolvido ou fechado explicitamente, nenhum assumido em silêncio
- [ ] Cross-check no ponto de parada: era possível prever as próximas 3 perguntas
- [ ] Handoff downstream (/write-prd, /plan-feature) enquadrado na intenção confirmada, não no pedido original vago

---

## Expansão opcional — 10 Questions Test (princípio universal #1)

Se o feature for de complexidade alta E o questionário acima ainda deixou ambiguidade,
expanda para o 10 Questions Test (definido em `consultant/SKILL.md`) antes de fechar o CONTEXT.md.
