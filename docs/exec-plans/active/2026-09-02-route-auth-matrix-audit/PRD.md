---
slug: route-auth-matrix-audit
date: 2026-09-02
status: approved
requires: [2026-09-01-shift-left-security-pipeline]
---

# PRD: Matriz Rota x Middleware de Auth no Auditor

**Status:** Approved
**Author:** Luiz + AI
**Date:** 2026-09-02
**Context:** conversation (RF-11 do PRD shift-left-security-pipeline)

---

## Problema

O `security-auditor` acha **codigo ruim que existe**. A secao 8 dele grepa por `role ===` em handler,
`findById` sem filtro de usuario, `req.body.role`. Todo check e uma busca por um padrao **presente**.

Ele nao tem como achar **ausencia**. Uma rota que simplesmente nao tem auth nenhuma nao deixa padrao
ruim para grepar — ela deixa um silencio, e silencio nao casa com regex. O endpoint mais perigoso do
projeto e justamente o que ninguem lembrou de proteger, e ele e invisivel para todo check atual.

E esse o buraco que o spider do ZAP cobre black-box: ele anda o site e bate na rota desprotegida. Mas
black-box so acha o que consegue alcancar — rota sem link, atras de feature flag, ou so chamada pelo
app mobile fica de fora. White-box a lista de rotas esta **no repositorio**, entao da para ser
exaustivo onde o spider e amostral.

Sem isso, o `verify-work` aprova PR que adiciona `app/api/admin/users/route.ts` sem cobertura de
middleware, e nada no pipeline pisca.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- O auditor reporta rota que a mudanca introduziu e que **ninguem cobriu nem declarou publica**.
- Rota legitimamente publica (`/login`, `/health`, webhook) e **declaracao versionada**, revisavel em
  PR — nao excecao silenciosa na cabeca de quem escreveu.
- O veredito distingue "descoberta" de "nao consegui determinar". Incerteza aparece como incerteza.
- Funciona nas quatro stacks que ja tem knowledge no repo, cada uma pelo caminho **nativo dela**.

### Mecanismo (algorítmico — o COMO)

Duas leituras independentes que se cruzam:

```
1. ENUMERAR a superficie de rota      (adaptador nativo por stack)
2. LER o mapa de cobertura de auth    (adaptador nativo por stack)
3. LER a allowlist de rotas publicas  (arquivo versionado no projeto)
4. CRUZAR: para cada rota do CONJUNTO-GATILHO, emitir um dos 4 veredictos
```

O adaptador e nativo **de proposito** — cada stack expressa rota de um jeito, e traduzir tudo para um
enumerador comum troca fidelidade por simetria:

| Stack | Rota vem de | Cobertura vem de |
|---|---|---|
| Next.js | file-system: `app/**/{page,route}.{ts,tsx}` | `config.matcher` do `middleware.ts` |
| Rails | `config/routes.rb` | `before_action`, incluindo herdado de `ApplicationController` |
| Node-TS / Express | chamadas `app.<verb>` / `router.<verb>` | `app.use` / `router.use` antes da rota na cadeia |
| Python | `urls.py` (Django) ou decorator de rota (FastAPI, Flask) | middleware do settings, `Depends`, decorator |

**O que e comum e so o contrato do achado**, nao o caminho ate ele — mesma divisao que o repo ja usa
no `INDEX.md` do knowledge: roteamento cross-stack no indice, conteudo idiomatico dentro de cada stack.

**Escopo hibrido.** A configuracao de cobertura e lida **inteira** — sem isso o check nao funciona,
porque o middleware que protege a rota nova quase nunca esta no mesmo commit que ela. Mas o conjunto
avaliado e limitado ao que a mudanca introduziu, para nao despejar findings de codigo que a PR nao
tocou.

**O CONJUNTO-GATILHO tem duas entradas, nao uma:**

| # | Gatilho | Rotas avaliadas | Regressao que pega |
|---|---|---|---|
| G1 | Arquivo de rota tocado pelo diff | as rotas daquele arquivo | rota nova entra sem protecao |
| G2 | Configuracao de cobertura tocada pelo diff | o **delta** entre a cobertura antes e depois | rota existente **perde** protecao |

G2 e o que quase ficou de fora. Um diff que so estreita o `config.matcher` de `/admin/:path*` para
`/admin/settings` nao toca arquivo de rota nenhum: com G1 sozinho, zero rotas entram no conjunto, o
auditor nao emite nada, e um conjunto inteiro de rotas admin acabou de ficar aberto em silencio.
Cobertura perdida e tao introduzida pela mudanca quanto rota nova desprotegida.

Para computar o delta de G2, o adaptador avalia a cobertura nas duas pontas do diff (antes e depois)
e reporta as rotas que sairam de `coberta`. Onde a ponta "antes" nao for reconstruivel, o veredito e
`indeterminada` — nunca silencio.

### Veredito, severidade e consequencia

Veredito sem consequencia definida vira nota de rodape que ninguem le. Cada um tem destino fixo:

| Veredito | Emite finding? | Severidade | Por que |
|---|---|---|---|
| `coberta` | nao | — | nada a reportar; entra so na contagem |
| `publica-declarada` | nao | — | decisao escrita e revisavel em PR; entra na contagem |
| `DESCOBERTA` | sim | **CRITICO** se a rota casa marcador de privilegio (`admin`, `internal`, `billing`) **ou** o metodo muta estado (nao-GET); **ALTO** nos demais | e a falha que o check existe para achar |
| `indeterminada` | **sim** | **MEDIO** | incapacidade do adaptador e divida visivel, nao aprovacao silenciosa |

A severidade e **regra, nao julgamento caso a caso**: dois implementadores lendo este PRD produzem a
mesma saida para a mesma entrada. `GET /api/preferences` aberta e ALTO; `POST /api/admin/users`
aberta e CRITICO — a diferenca e o que um atacante consegue fazer ao chegar la.

`indeterminada` emitir finding e deliberado e custa ruido. A alternativa — nao emitir — transforma
todo limite do adaptador em aprovacao tacita, que e exatamente o modo de falha que o RF-04 existe
para impedir. Ruido visivel e preferivel a silencio que parece aprovacao.

---

## Requisitos Funcionais

### Must Have (maximo 40% do total)

- [ ] RF-01: Contrato unico de rota e cobertura, com **um adaptador nativo por stack** (Next.js,
      Rails, Node-TS, Python) e uma fixture por stack provando que o shape serve aquela stack.
- [ ] RF-02: Allowlist versionada de rotas publicas + os quatro veredictos (`coberta`,
      `publica-declarada`, `DESCOBERTA`, `indeterminada`), com a consequencia de cada um fixada na
      tabela de severidade. A allowlist mora em **`anti-vibe.public-routes.json` na raiz do projeto**
      — fora de `.anti-vibe/`, que e gitignored e tornaria a declaracao invisivel ao review. Cada
      entrada exige `path` **e** `reason`; entrada sem razao e recusada pelo parser. Arquivo ausente
      significa "nenhuma rota declarada publica" (fail-closed), nunca "pode tudo".
- [ ] RF-03: Emissao pelo `security-auditor` no contrato v2.0.0 sobre o CONJUNTO-GATILHO — **G1**
      (arquivo de rota tocado pelo diff) **e G2** (cobertura estreitada pelo diff: rotas que sairam
      de `coberta`) — com o mapa de cobertura lido inteiro nas duas pontas.

### Should Have

- [ ] RF-04: Degradacao honesta — adaptador que nao consegue enumerar com confianca emite
      `indeterminada`, **nunca** `coberta`. Silencio por incapacidade nunca vira aprovacao.
- [ ] RF-05: Finding nomeia `arquivo:linha` da rota e diz o que faltou (matcher, `before_action`,
      entrada na allowlist), nao so "rota desprotegida".
- [ ] RF-06: Deteccao de stack reutiliza `detect-stack.ts`; projeto multi-stack roda o adaptador de
      cada stack detectada.

### Could Have

- [ ] RF-07: Modo full-surface — enumera todas as rotas, nao so as do diff. Ponte natural para o
      RF-12 do PRD anterior.
- [ ] RF-08: Sugestao de correcao no finding (o matcher ou `before_action` a acrescentar).

### Won't Have (desta versao)

- [ ] RF-09: Rota montada em runtime (mount dinamico, registro por config, plugin carregado em boot).
      Enumeracao estatica nao alcanca — o adaptador deve dizer `indeterminada`, nao inventar.
- [ ] RF-10: Verificacao de **autorizacao** (quem pode fazer o que). Este check responde apenas
      "exige alguem autenticado?". Autorizacao por papel e recurso ja e a secao 8 do auditor.

---

## Requisitos Nao-Funcionais

- **Performance:** o cruzamento roda dentro do passe atual do auditor; sem chamada de rede e sem
  execucao de comando do projeto (nada de `rails routes`) — leitura de arquivo apenas.
- **Seguranca:** read-only sobre o codigo do projeto. Nao escreve, nao executa, nao envia nada.
- **Acessibilidade:** N/A — a saida e texto no relatorio do `verify-work`.
- **Observabilidade:** o relatorio informa quantas rotas foram enumeradas e quantas ficaram
  `indeterminada`. Numero alto de indeterminadas e sinal de adaptador fraco, e precisa ser visivel.

---

## Ameacas & Dados (apenas features de risco)

**Gatilhos disparados:** autenticacao/autorizacao — a feature raciocina sobre a cobertura de auth do
projeto e sua saida influencia se um PR e aprovado.

### Classificacao do dado

| Dado que a feature toca | Classe | Onde vive |
|---|---|---|
| Codigo-fonte do projeto auditado | interno | working tree, leitura apenas |
| Allowlist de rotas publicas | interno | arquivo versionado no repo do projeto |

Nao toca PII, credencial nem dado financeiro: le codigo, nao dado de usuario.

### Fronteiras de confianca

- A **allowlist** e input que altera veredito de seguranca. Um curinga amplo nela desliga o check em
  silencio — precisa ser tratada como configuracao de seguranca, nao como conveniencia.
- A saida do adaptador vira aprovacao no `verify-work`. Enumerar errado nao produz erro, produz
  **falsa garantia** — que e pior que nao ter check nenhum.

### Superficie nova

- `anti-vibe.public-routes.json` na raiz do projeto auditado — arquivo **rastreado**, cujo conteudo
  altera veredito de seguranca. Trata-se como configuracao de seguranca, nao como conveniencia.
- Nova secao no relatorio do `verify-work`.

### Casos de abuso

O atacante aqui e o descuido, e o alvo e o proprio check. Cada linha vira criterio de aceite e, no
`/tdd-workflow`, teste de abuso escrito ANTES da defesa:

| # | Abuso tentado | Defesa esperada | Vira CA |
|---|---|---|---|
| AB-1 | Allowlist com curinga amplo (`/api/*`) cala o check para toda a API | Entrada que cobre mais de um segmento e reportada como finding proprio, nao aceita em silencio | CA-04 |
| AB-2 | Rota existe mas o adaptador nao enxerga (mount dinamico) e ela sai como `coberta` | Sai como `indeterminada` e aparece no relatorio — ausencia de sinal nunca vira aprovacao | CA-05 |
| AB-3 | `config.matcher` do Next parece cobrir `/admin` mas o regex nao casa a rota real | Cobertura so e afirmada quando o match e demonstravel; caso duvidoso vira `indeterminada` | CA-06 |
| AB-4 | Rota nova adicionada junto de entrada na allowlist, escondida num PR grande | Toda mudanca na allowlist e listada em destaque no relatorio, separada dos demais findings | CA-07 |

### Gatilhos de aprovacao humana

- [x] Novo fluxo de autenticacao ou alteracao de logica de auth existente — **indireto**: a feature
      nao altera auth, mas passa a decidir se a auth do projeto esta coberta. Mudanca na allowlist
      exige diff apresentado ao humano.
- [ ] Armazenar nova categoria de PII ou dados de pagamento
- [ ] Nova integracao com servico terceiro
- [ ] Mudanca na configuracao de CORS
- [ ] Novo handler de upload de arquivos
- [ ] Conceder roles ou permissoes elevadas
- [ ] Alterar configuracao de rate limiting

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Cobertura das stacks | Adaptador nativo por stack, contrato comum so no achado | Enumerador unico cross-stack | Rota e conceito idiomatico: file-system no Next, DSL no Rails, imperativo no Express. Enumerador unico vira o menor denominador e erra nas quatro |
| 2 | Escopo da varredura | Hibrido: rota do diff, mapa de cobertura completo | Superficie inteira a cada rodada | Superficie inteira e o RF-12; despejaria findings de codigo que a PR nao tocou, e ruido faz o time ignorar o auditor |
| 3 | Criterio de "coberta" | Coberta OU publica declarada em allowlist | So matcher do middleware | Sem allowlist, `/login` e `/health` viram finding em toda rodada. A allowlist transforma "essa rota e publica" em decisao escrita e revisavel |
| 4 | Auth dentro do handler | Nao conta como cobertura | Aceitar `getServerSession()` no handler | A secao 8 do proprio auditor ja trata auth espalhada em handler como ALTO. Aceitar aqui contradiria a regra que o mesmo agente aplica |
| 5 | Ordem das stacks | As quatro desenhadas juntas | Uma stack nativa primeiro, resto depois | Decisao do dev (2026-09-02), contra a recomendacao inicial e contra a memoria de feedback `stack-knowledge-deve-ser-stack-native`. Mitigado por fixture obrigatoria por stack (RF-01, CA-08) |
| 6 | Conjunto avaliado | G1 (rota tocada) **+ G2** (cobertura estreitada) | So G1 | So G1 deixa passar o diff que estreita o matcher: nenhum arquivo de rota muda, zero rotas entram no conjunto, e rotas existentes ficam abertas em silencio. Cobertura perdida e tao introduzida quanto rota nova |
| 7 | Local da allowlist | `anti-vibe.public-routes.json` na raiz | `.anti-vibe/public-routes.json` | `.anti-vibe/` e **gitignored** (verificado em `.gitignore:62`). A allowlist la dentro nao entraria em PR nenhum, e a premissa inteira de "declaracao versionada e revisavel" cairia sem ninguem perceber |
| 8 | `indeterminada` emite finding | Sim, MEDIO | Nao emitir, so contar no rodape | Nao emitir transforma todo limite do adaptador em aprovacao tacita — o modo de falha exato que o RF-04 existe para impedir. Ruido visivel ganha de silencio que parece aprovacao |
| 9 | Severidade | Regra fixa (marcador de privilegio ou metodo mutante = CRITICO; senao ALTO) | Severidade unica para toda rota descoberta | Severidade unica ou afoga o achado grave no meio dos leves, ou inflaciona os leves ate o time ignorar a categoria |

---

## Premissas a Validar

| # | Premissa (o que estamos apostando ser verdade) | Tier | Como validar |
|---|---|---|---|
| 1 | `config.matcher` do Next.js e literal estatico na grande maioria dos projetos, nao computado | Must | Amostrar projetos reais; se for computado com frequencia, o veredito cai para `indeterminada` e o adaptador Next perde valor |
| 2 | `before_action` herdado de `ApplicationController` e o padrao dominante em Rails | Must | Fixture Rails com heranca; conferir contra `knowledge/rails/atoms/action-controller-and-routing.md` |
| 3 | Enumeracao estatica de Express cobre o suficiente para valer a pena | Should | Fixture Express; medir quantas rotas saem `indeterminada`. Taxa alta = adaptador nao deveria existir nesta versao |
| 4 | A allowlist nao vira lixeira (dev declara tudo publico para calar o check) | Might | Revisar apos duas rodadas reais; AB-1 e a defesa projetada |

---

## Criterios de Aceite

- [ ] CA-01 (G1): Dado um projeto Next.js com `app/api/admin/route.ts` fora do `config.matcher` e
      ausente da allowlist, quando o auditor roda sobre um diff que cria essa rota, entao emite
      finding **CRITICO** (marcador de privilegio `admin`) nomeando `arquivo:linha` e a razao "sem
      cobertura de middleware e nao declarada publica".
- [ ] CA-01b (outro ramo da regra de severidade): Dado a mesma condicao para `GET /api/preferences`
      — sem marcador de privilegio e sem mutacao de estado — quando o auditor roda, entao o finding
      e **ALTO**, nao CRITICO. Os dois ramos da regra sao exercitados.
- [ ] CA-02: Dado o mesmo projeto com a rota **dentro** do matcher, quando o auditor roda, entao
      nenhum finding e emitido para ela.
- [ ] CA-03: Dado a rota listada na allowlist de publicas, quando o auditor roda, entao nenhum finding
      e emitido e o relatorio a contabiliza como `publica-declarada`.
- [ ] CA-04 (abuso AB-1): Dado `anti-vibe.public-routes.json` com uma entrada `/api/*`, quando o
      auditor roda, entao emite finding proprio sobre a amplitude da entrada, independente das rotas.
- [ ] CA-04b: Dado uma entrada da allowlist sem campo `reason`, quando o auditor le o arquivo, entao
      recusa a entrada e a rota volta a ser avaliada como se nao estivesse declarada.
- [ ] CA-05 (edge / abuso AB-2): Dado um projeto Express que monta rota via variavel, quando o
      adaptador nao consegue resolver o caminho, entao a rota sai `indeterminada` e aparece no
      relatorio — **nunca** `coberta`.
- [ ] CA-06 (abuso AB-3): Dado um `config.matcher` cujo regex nao casa a rota, quando o auditor
      avalia, entao o veredito e `indeterminada` ou `DESCOBERTA`, jamais `coberta` por semelhanca
      textual.
- [ ] CA-07 (abuso AB-4): Dado um diff que altera a allowlist, quando o auditor roda, entao as
      mudancas da allowlist aparecem em secao destacada do relatorio.
- [ ] CA-08: Dado um projeto de cada uma das quatro stacks, quando o adaptador correspondente roda
      sobre a fixture, entao produz a lista de rotas esperada pelo contrato unico.
- [ ] CA-09 (G2 — cobertura perdida): Dado um diff que **so** altera `middleware.ts`, estreitando o
      matcher de `/admin/:path*` para `/admin/settings`, quando o auditor roda, entao emite finding
      para cada rota sob `/admin` que saiu de `coberta` — mesmo que nenhum arquivo de rota tenha sido
      tocado pelo diff.
- [ ] CA-10 (RF-04): Dado uma rota que o adaptador nao consegue resolver, quando o auditor roda,
      entao emite finding **MEDIO** com veredito `indeterminada` — nao a omite do relatorio e nao a
      conta como `coberta`.
- [ ] CA-11 (RF-06): Dado um monorepo com Next.js e Rails detectados por `detect-stack.ts`, quando o
      auditor roda, entao os dois adaptadores executam e os findings identificam a stack de origem.

### Rastreio requisito -> criterio

Existe para ser conferido mecanicamente: requisito nao-Could sem criterio e requisito que ninguem
vai verificar.

| Requisito | Criterios que o cobrem |
|---|---|
| RF-01 (contrato + 4 adaptadores) | CA-08 |
| RF-02 (allowlist + veredictos) | CA-03, CA-04, CA-04b, CA-07 |
| RF-03 (emissao sobre o conjunto-gatilho) | CA-01, CA-01b, CA-02, CA-09 |
| RF-04 (degradacao honesta) | CA-05, CA-06, CA-10 |
| RF-05 (finding nomeia arquivo:linha) | CA-01 |
| RF-06 (multi-stack via detect-stack) | CA-11 |
| RF-07, RF-08 (Could) | sem criterio nesta versao — entram se forem promovidos |

---

## Out of Scope

- Autorizacao por papel ou recurso — ja coberto pela secao 8 do `security-auditor`.
- Rota resolvida so em runtime — enumeracao estatica nao alcanca; sai `indeterminada` por design.
- Full-sweep do codebase inteiro — e o RF-12 do PRD anterior; aqui so a ponte (RF-07).
- Stacks sem knowledge no repo (Laravel, Go) — entram quando a camada de knowledge delas existir.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Feature pre-requisito | PRD shift-left-security-pipeline (contrato v2.0.0, Step 3 do verify-work) | codigo mergeado; o plano segue em `active/` com status Approved, nao movido para `completed/` |
| Modulo interno | `skills/init/lib/detect-stack.ts` (deteccao multi-stack) | ja no repo |
| Knowledge | `knowledge/nextjs`, `knowledge/rails`, `knowledge/nodejs-typescript`, `knowledge/python` | ja no repo |
| Agente | `agents/security-auditor.md` (secao 8 e contrato de saida) | ja no repo |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Falso `coberta` da garantia falsa — pior que nao ter check | media | **alto** | RF-04: cobertura so e afirmada quando demonstravel; incerteza vira `indeterminada` |
| Quatro stacks de uma vez multiplica a superficie de erro | **alta** | medio | Fixture obrigatoria por stack (RF-01, CA-08); adaptador sem fixture verde nao entra |
| Enumeracao de Express rende indeterminada demais e o adaptador nao paga o custo | media | medio | Premissa 3 mede antes de construir; se falhar, Express sai desta versao |
| Allowlist vira lixeira e o check morre em silencio | media | alto | AB-1/CA-04 reportam amplitude; AB-4/CA-07 destacam toda mudanca dela no relatorio |
| Ruido na primeira rodada faz o time desligar o check | media | medio | Escopo hibrido limita findings ao que o diff introduziu (Decisao 2) |
