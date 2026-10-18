---
name: write-prd
description: "Cria a página de uma folha da feature via entrevista curta: nível de risco, apetite, MoSCoW, cenários e fatias. Quando o sistema pede, cria também o documento de desenho com o mapa de ameaças. Importa contexto do /grill-me se disponível."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: "[descricao da feature ou problema a especificar]"
---

# Write PRD — A página da feature

Gera a página de uma folha da feature (`PRD.md`) e, quando o sistema pede, o documento de desenho
(`DESIGN.md`). A página é o que o usuário lê e aprova; o desenho é para quem constrói e revisa.

Diferença das outras skills:
- **consultant**: ensina conceitos e apresenta trade-offs para UMA decisão
- **grill-me**: resolve ambiguidades fazendo perguntas implacáveis
- **write-prd**: escreve a PÁGINA da feature a partir do contexto coletado

Esta skill pressupõe que você **consegue descrever** a feature. Quando a ideia é grande demais para
uma sessão e você ainda não sabe o que precisa decidir, comece pelo `/grill-me` em modo profundo:
ele fecha as decisões e devolve um `CONTEXT.md` que entra aqui como contexto.

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
   - Perguntar: "Algo mudou desde o Grill Me? Quer ajustar algo antes de gerar a pagina?"
   - Se a fonte foi (a) v6: extrair o slug/date da pasta — a pagina sera salva na MESMA pasta
   - Se a fonte foi (b) legacy: marcar para mover CONTEXT para v6 no Step 5.5
3. Prosseguir para Step 2
```

### Caminho B: Mini-Entrevista (sem CONTEXT.md)

Usar AskUserQuestion para CADA pergunta (uma por vez, não em bloco):

1. "O que essa feature faz? Descreva o problema que resolve e a solução proposta."
2. "Quem usa essa feature? Qual o papel do usuário principal?"
3. "Como saberemos que ficou pronta?"
4. "O que fica FORA desta versão?"
5. "Quanto tempo vale gastar nisso? Tem prazo ou restrição (stack obrigatória, integração)?"

Regras:
- Resposta vaga ("algo para gerenciar usuários") → follow-up pedindo especificidade
- "Não sei" → registrar como "A DEFINIR" e prosseguir
- NÃO fazer mais de 5 perguntas — a página não precisa ser perfeita no primeiro rascunho
- Ao final, resumir o que entendeu e confirmar antes de prosseguir

### Caminho C: Argumento direto no comando

Se o dev passar argumento no comando `/write-prd "sistema de notificacoes push"`:
- Usar como resposta da pergunta 1
- Adaptar perguntas 2-5: "Você quer criar um sistema de notificações push. Quem é o usuário principal?"

---

## Step 2 — Explorar Codebase

Coletar contexto técnico automaticamente (máximo 10 chamadas de ferramentas):

**Prioridade: ler CLAUDE.md do projeto primeiro** — é a fonte de verdade para stack e padrões.

1. **Stack:** package.json, Cargo.toml, go.mod, tsconfig.json, next.config.*; ORM (prisma/schema.prisma,
   drizzle.config.*); `.env.example` para variáveis existentes.
2. **Padrões:** organização de pastas, 2-3 arquivos existentes para naming, features análogas, 1 teste
   de exemplo.
3. **Pontos de integração:** rotas, APIs, middleware, layout, navegação.
4. **Modelos de dados relacionados:** schema do ORM e tipos com nomes ligados à feature.

Regras:
1. Se não detectar algo, registrar como "não detectado" — NÃO chutar
2. Se detectar anomalia (ex.: 2 ORMs), mencionar no desenho como decisão em aberto
3. Focar no diretório mais relevante para a feature — não explorar tudo

### Antes de gerar — confirmar suposições (boundary Step 2 -> Step 3)

Antes de escrever QUALQUER conteúdo da página, listar as suposições que serão "assadas" no rascunho.
Surgir aqui (e não no Step 4, já com o rascunho pronto) evita desperdiçar um rascunho inteiro sobre uma
premissa errada.

```
SUPOSIÇÕES QUE VOU ASSUMIR:
1. Nível de risco: {nível} — {o que a feature toca que decidiu o nível}
2. Stack: {ex: Next.js App Router + Prisma + Postgres — detectado no Step 2}
3. Fonte de dados: {ex: reutilizar tabela `users` existente, não criar entidade nova}
4. Desenho: {vou criar o DESIGN.md porque ... | não precisa porque ...}
→ Corrija agora ou prossigo com estas.
```

Regra: derivar cada item do que o Step 2 detectou; onde não detectou, marcar "[A DEFINIR]" em vez de
chutar.

---

## Step 3 — Gerar a página (e o desenho, quando precisa)

Ler `skills/write-prd/templates/prd-template.md` e preencher cada seção:

| Seção | Fonte |
|---|---|
| Nível de risco | Seção "Nível de risco" abaixo, confirmado nas suposições |
| Apetite | Pergunta 5 ou CONTEXT.md |
| Desenho | Seção "Documento de desenho" abaixo |
| Problema | Pergunta 1 ou CONTEXT.md |
| Solução | O resultado para quem usa, em palavras simples; o como vai para o desenho |
| Precisa / Deveria / Poderia ter | Pergunta 3 e o que o dev descreveu |
| Não terá | Pergunta 4 |
| Premissa mais arriscada | A aposta que, se falsa, derruba a feature; com o teste mais barato |
| Cenários | Seção "Cenários" abaixo |
| Fatias | Cortes que deixam algo funcionando de ponta a ponta, uma linha cada |
| Como saber que ficou pronto | Pergunta 3 |

Regras de geração:
1. Página CONTEXTUALIZADA — usar nomes reais de arquivos, modelos e rotas do projeto
2. Informação insuficiente → "[A DEFINIR — perguntar ao dev]" em vez de inventar
3. NÃO gerar requisitos que o dev não mencionou — apenas organizar e estruturar
4. Precisa ter MINIMALISTA — teste: "Se mover para Deveria ter, a feature ainda resolve o problema?"
5. A página cabe numa folha. O que não cabe vai para o desenho, nunca para uma seção nova

### Nível de risco

<!-- 2026-10-14 (Luiz/dev): tres niveis — 8.0 fatia 3, F3-1. Substitui a triagem que so decidia a secao de ameacas. -->

O nível decide quanto de prova a feature exige. O Claude propõe o nível; o usuário confirma.

| Nível | Quando | O que muda |
|---|---|---|
| experimento | protótipo ou teste de ideia: ninguém real depende, sem dinheiro de verdade nem dado pessoal real | página só com Problema, Solução e Como saber que ficou pronto; cenários do essencial; sem desenho |
| produto | pessoas reais usam, mas um erro não custa dinheiro, saúde nem expõe dado pessoal | página inteira; desenho quando o sistema pede |
| dinheiro, saúde ou dados | um erro cobra errado, libera acesso indevido, expõe dado pessoal ou orienta errado sobre saúde | cenários com casos de abuso, aprovados antes do código; desenho obrigatório com o mapa de ameaças; no fim, o usuário explica de volta o que foi feito |

Para propor, responder SIM/NÃO aos seis gatilhos:

| # | Gatilho | Sinal na descrição ou no Step 2 |
|---|---|---|
| 1 | Autenticação ou autorização | login, sessão, token, role, permissão, RLS, "só o dono" |
| 2 | Dados sensíveis / PII | email, CPF, telefone, endereço, saúde, documento, foto |
| 3 | Input externo | body de request, query param, webhook, CSV importado, conteúdo de terceiro |
| 4 | Upload de arquivo | multipart, storage bucket, avatar, anexo |
| 5 | Pagamento / financeiro | cobrança, saldo, split, gateway, assinatura, reembolso |
| 6 | Integração com terceiro | OAuth provider, SDK externo, API de parceiro, webhook recebido |

- **Gatilho 1, 2 ou 5** → propor **dinheiro, saúde ou dados**.
- **Só gatilhos 3, 4 ou 6** → propor **produto**, com o mapa de ameaças no desenho.
- **Nenhum gatilho** → propor **produto**, ou **experimento** se o dev disse que é protótipo ou teste.
- **Na dúvida entre dois níveis: o mais alto.** Nível alto demais custa alguns cenários a mais; nível
  baixo demais deixa um erro de dinheiro ou de acesso sem teste.

O usuário pode mudar o nível. Se ele baixar o nível de uma feature com gatilho 1, 2 ou 5, dizer em uma
linha o que deixa de ser conferido (ex.: "sem aprovação dos cenários, sem mapa de ameaças e sem a
quebra proposital da defesa") e registrar o motivo na linha `**Nível de risco:**`. A escolha é dele.

### Documento de desenho

O `DESIGN.md` mora na mesma pasta da página, a partir de `skills/write-prd/templates/design-template.md`.

Propor o desenho quando a feature:
- cria dado novo no banco (tabela ou coluna);
- junta partes que conversam entre si (fila, webhook, tarefa agendada, outro serviço);
- muda dinheiro de estado (cobrança, saldo, reembolso);
- dispara qualquer um dos seis gatilhos (o mapa de ameaças precisa de onde morar).

No nível **dinheiro, saúde ou dados** o desenho é obrigatório, com a seção `## Ameaças & Dados`
PREENCHIDA (não com os placeholders do template). Nos outros níveis o usuário pode recusar a proposta;
os casos de abuso continuam nos Cenários da página.

Sem desenho, a página grava UMA linha: `**Desenho:** não precisa — {motivo}`. O motivo é obrigatório:
sem ele, "não tem desenho" fica indistinguível de "ninguém pensou no assunto", e o dev perde a chance
de discordar.

Nas `## Decisões` do desenho entram só decisões com alternativa real, com as opções e os prós e contras
em português simples.

### Cenários

- Linguagem de negócio, sem jargão: "Dado um cliente que paga duas vezes o mesmo pedido, quando o
  segundo pagamento chega, então ele só é cobrado uma vez".
- `CA-NN` para comportamento, `AB-N` para caso de abuso. Mínimo 3, ao menos 1 de erro.
- Cada cenário se confere com sim ou não. Reframe vago → mensurável:
  "deixe o dashboard mais rápido" → "a lista carrega em menos de 2 segundos com 1000 registros".
- No nível **dinheiro, saúde ou dados**: ao menos um AB-* por gatilho disparado. Cada AB-* vira teste
  de abuso no RED do `/anti-vibe-coding:tdd-workflow`, escrito antes da defesa.
- No nível **experimento**: só os cenários do essencial; AB-* não é exigido.

---

## Step 4 — Apresentar ao Dev

Apresentar a página destacando:

```
1. NÍVEL DE RISCO — o nível e o motivo em uma linha.
2. DECISÕES ASSUMIDAS — "⚠️ Assumido:" antes de cada decisão não confirmada.
3. SEÇÕES INCOMPLETAS — as que têm "[A DEFINIR]", com uma pergunta específica para cada.
4. MOSCOW — "X Precisa, Y Deveria, Z Poderia, W Não terá".
   Se Precisa ter > 40% dos itens: alertar e sugerir mover itens para Deveria ter.
5. DESENHO — criado e por quê, ou o motivo de não precisar.
6. PEDIR VALIDAÇÃO — "O que você mudaria?"
```

Fluxo de ajuste:
- Se o dev pedir mudanças: aplicar, re-apresentar apenas as seções alteradas, repetir até aprovar
- Se o dev aprovar: no nível dinheiro, saúde ou dados, seguir para a aprovação dos cenários; nos
  outros, mudar `status:` do frontmatter para `approved` e prosseguir para o Step 5

### Aprovação dos cenários

<!-- 2026-10-14 (Luiz/dev): D2 da 8.0 — aprovacao unica no inicio substitui a parada por fase de risco. -->

Só no nível **dinheiro, saúde ou dados**. Esta é a única vez que o usuário aprova os testes: depois
dela, a prova vem da máquina (cada cenário vira teste que falha antes do código existir, e o RED-check
quebra a defesa de propósito e exige que o teste caia).

1. Apresentar só os Cenários (CA-* e AB-*), em linguagem de negócio, e perguntar também: "Falta algum
   abuso óbvio que alguém tentaria?"
2. AskUserQuestion: **Aprovar** / **Ajustar um cenário** / **Falta um cenário**.
3. Ao aprovar: preencher a linha `Aprovados por {nome} em {YYYY-MM-DD}.` e mudar `status:` para
   `approved`. Nenhum código antes disso: o `/execute-plan` confere essa linha antes do primeiro RED.
4. Cenário mudou depois da aprovação: nova aprovação, nova data.

Nos outros níveis, apagar a linha de aprovação: os cenários são revistos junto com a página.

---

## Step 5 — Salvar

1. Criar diretório `docs/exec-plans/active/` se não existir
2. Derivar:
   - `slug` = kebab-case do nome da feature
   - `date` = YYYY-MM-DD atual
   - `folder` = `docs/exec-plans/active/{date}-{slug}/`
   - Se CONTEXT foi importado do Caminho A fonte (a) v6: REUSAR o `folder` da pasta encontrada (mesmo date+slug), não derivar novo
3. Se `{folder}` já existir:
   - Caso especial pipeline: se `{folder}/CONTEXT.md` existe MAS `{folder}/PRD.md` NÃO existe → grill-me criou a pasta primeiro, este é o fluxo esperado. Escrever direto (sem prompt).
   - Senão: prosseguir para o bloco de colisão abaixo
4. Se NÃO existir: criar `{folder}`
5. Escrever `{folder}/PRD.md` e, quando houver desenho, `{folder}/DESIGN.md`
6. Informar: "Página salva em `{folder}/PRD.md`{ e desenho em `{folder}/DESIGN.md`}. Você pode editar direto."

### Colisão de pasta mesmo-dia mesmo-slug (RF9 / CA-10)

```
Apos calcular `docs/exec-plans/active/YYYY-MM-DD-{slug}/`, antes de criar:

1. Verificar se a pasta ja existe:
   - Se NAO existe: criar pasta + salvar (fluxo normal)
   - Se existe COM CONTEXT.md mas SEM PRD.md: fluxo pipeline normal (grill-me → write-prd), escrever direto
   - Se existe COM PRD.md: prosseguir para 2

2. Ler `{pasta}/PRD.md` existente, extrair:
   - `status:` do frontmatter (draft / approved / completed); em PRD antigo, a linha **Status:**
   - Titulo

3. Apresentar ao dev com AskUserQuestion:

   "Ja existe uma pasta para esta feature hoje: {pasta}
    Pagina atual: {titulo} (status: {status})

    O que deseja?
    [1] Atualizar a pagina existente (sobrescreve PRD.md e DESIGN.md; CONTEXT/PLAN/STATE/planoNN inalterados)
    [2] Criar v2 (nova pasta com sufixo)
    [3] Cancelar"

4. Acao conforme resposta:

   OPCAO 1 — ATUALIZAR:
     - AVISAR explicitamente:
       "ATENCAO: Apenas PRD.md e DESIGN.md serao sobrescritos.
        CONTEXT.md, PLAN.md, STATE.md e planoNN/ permanecerao com conteudo antigo.
        Se a feature mudou substancialmente, considere opcao [2] v2.
        Se os cenarios mudaram, eles precisam de nova aprovacao.
        Confirma?"
     - Se dev confirma: sobrescrever
     - Se dev cancela: voltar ao prompt do passo 3

   OPCAO 2 — CRIAR V2:
     - Calcular proximo sufixo disponivel:
       - Se `{pasta}-v2/` nao existe: usar `-v2`
       - Se existe: tentar `-v3`, `-v4`, ate v99
       - Se v99 ocupado: "Mais de 99 versoes no mesmo dia — revise o slug manualmente"
     - Criar `docs/exec-plans/active/YYYY-MM-DD-{slug}-v2/` (ou -vN) e salvar la dentro
     - Pasta v2 nao recebe CONTEXT.md automaticamente (v2 eh reformulacao; dev roda /grill-me se precisar)

   OPCAO 3 — CANCELAR:
     - Nao criar nada
     - "Pagina nao foi salva. Ajuste o slug com /write-prd {novo-nome} se quiser pasta diferente."
```

### 5.5 — Migrar CONTEXT legacy (apenas se veio de `.planning/`)

Só executa se a página foi salva E o CONTEXT importado veio do legacy `.planning/` (fonte (b) do
Caminho A). Se já veio de v6, pular este passo — o CONTEXT.md já está na pasta correta.

```
1. Glob `.planning/CONTEXT-*.md` na raiz de `.planning/` (nao subpastas)
2. Se 0 matches: nao fazer nada (sem legacy — prosseguir)
3. Se 1+ matches, para cada CONTEXT encontrado:
   a. Extrair slug-do-grill do nome do arquivo: CONTEXT-{slug-do-grill}.md
   b. Comparar com {slug} da pasta recem-criada
   c. Se slug-do-grill == slug-da-pasta:
      - mv .planning/CONTEXT-{slug}.md → docs/exec-plans/active/{date}-{slug}/CONTEXT.md
      - Informar: "CONTEXT.md legacy migrado para dentro da pasta v6."
   d. Se slug-do-grill != slug-da-pasta (colisao R2):
      - AskUserQuestion:
        "Encontrei `.planning/CONTEXT-{slug-do-grill}.md` mas a pasta da pagina e `{folder}`.
         Este CONTEXT e da mesma feature ou de outra?
         [a] Desta feature — renomear e mover para `{folder}/CONTEXT.md`
         [b] De OUTRA feature — deixar em paz
         [c] Nao sei — deixar em paz"
      - Se [a]: mv e renomear. Informar: "CONTEXT renomeado e migrado: .planning/CONTEXT-{slug-do-grill}.md → {folder}/CONTEXT.md"
      - Se [b] ou [c]: nao mover, prosseguir
4. Se 2+ matches com MESMO slug da pasta: pegar o mais recente por mtime e perguntar sobre os outros
5. Se mv falhar (permissao, etc): logar o erro mas NAO derrubar a skill
   Informar: "Nao consegui migrar CONTEXT-{slug}.md: {motivo}. Pagina salva normalmente — mova manualmente se necessario."
```

---

## Step 6 — Learn Point

Após salvar, oferecer uma vez, sem insistir:

> "Quer entender como o nível de risco muda o que é conferido, ou como escrever um cenário que dá
> para testar?"

Se aceitar, explicar em linguagem simples:
- **Nível de risco:** o erro mais caro decide o nível. Um protótipo pode quebrar; uma cobrança errada
  não volta atrás.
- **MoSCoW:** força escolher em vez de "tudo é importante". A armadilha é o "Precisa ter" virar
  lixeira; o teste é "sem isso a feature falha?".
- **Cenário bom:** "Dado um usuário com 1000 registros, quando abre a lista, então ela carrega em
  menos de 2 segundos". Cenário ruim: "o sistema deve ser rápido". O bom vira teste; o ruim não.

---

## Step 7 — Próximo Passo

| Cenário | Sugestão |
|---|---|
| Página pronta, decisões claras | "Quer que o /plan-feature detalhe a fatia 1?" |
| Decisões técnicas em aberto | "Quer usar /design-twice para explorar abordagens?" |
| Seções [A DEFINIR] | "Quer usar /grill-me para resolver as dúvidas?" |
| Dev quer parar | "Ok. Página salva em `docs/exec-plans/active/{date}-{slug}/PRD.md`. Retome com /plan-feature quando quiser." |

---

## Verification

Antes de sugerir `/plan-feature`, confirmar:

- [ ] O nível de risco foi proposto com motivo e confirmado pelo dev.
- [ ] A página cabe numa folha; o resto foi para o desenho.
- [ ] Os cenários são testáveis (Dado/quando/então): mínimo 3, ao menos 1 de erro.
- [ ] Precisa ter ≤ 40% dos itens.
- [ ] Há desenho, ou a linha `**Desenho:**` registra o motivo de não haver.
- [ ] No nível dinheiro, saúde ou dados: AB-* nos cenários, linha `Aprovados por` preenchida e
      `DESIGN.md` com `## Ameaças & Dados` preenchida.
- [ ] `status: approved` e salvo em `docs/exec-plans/active/{date}-{slug}/PRD.md`.

---

## Escape Hatches
- Esta skill funciona standalone: o pipeline é opcional
- Se CONTEXT.md existir mas o dev quiser ignorar: confirmar antes de descartar o contexto
- Dev pode voltar a qualquer fase: "quero refazer a página"

---

## Regras

1. A skill NÃO gera páginas genéricas — DEVE contextualizar ao codebase real do projeto
2. Se o dev já tem um PRD escrito, a skill REFINA em vez de reescrever
3. Se o dev pedir "PRD rápido", pular a mini-entrevista e gerar com informação mínima (status draft)
4. A skill NÃO substitui o /grill-me (resolver ambiguidades) nem o /consultant (ensinar trade-offs)
5. A página cabe numa folha. O que não cabe vai para o DESIGN.md, não para uma seção nova

---

## Common Rationalizations

| Racionalização | Realidade |
|---|---|
| "Escrevo a página depois do código" | Isso é documentação, não especificação. O valor está em forçar clareza ANTES do código. |
| "Esta task é simples, não precisa de página" | Task simples não precisa de página longa, mas ainda precisa de cenários. Três linhas servem. |
| "É só um checkout simples, não precisa aprovar cenários" | Checkout é dinheiro. O erro mais caro (cobrar duas vezes) é justamente o cenário que ninguém escreve quando acha simples. |
| "Os requisitos vão mudar de qualquer jeito" | Por isso a página é viva. Desatualizada ainda é melhor que nenhuma. |

---

## Red Flags

- Implementando requisitos que não estão na página nem foram mencionados pelo dev.
- Tomando decisões técnicas sem registrá-las nas `## Decisões` do desenho.
- Código começando numa feature de dinheiro, saúde ou dados sem a linha `Aprovados por`.
- Precisa ter ocupando mais de 40% dos itens (lixeira de prioridade).
