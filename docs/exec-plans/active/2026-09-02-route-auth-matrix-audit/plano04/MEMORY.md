# Memoria: Plano 04 — Os outros tres adaptadores + multi-stack

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-06
**Status:** concluido (2026-09-07)

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-06 no `/plan-feature` (orquestrador, sessao autonoma — o dev veta no PR). As fases
implementam; o executor NAO re-pergunta nem reabre. Detalhe completo em `README.md` "Decisoes de
planejamento (DP)".

- **DP-1:** uma variante nova e generica de `CoverageRule`: `handler-chain { handler, file, line, via }` = auth demonstrada presa a ESTE handler; matcher casa por `handler` OU `file:line`; o motor nao aprende stack — o adaptador resolve heranca/only/except/prefixo/ordem e emite uma regra por rota coberta; condicional → `opaque`; middleware global sem ordem → `path-pattern /:path*` proxy. *Refinada: DP-1a `opaque.handler?` (escopo do opaco) e DP-1b evidence/description por stack — ver Desvios.*
- **DP-2:** `Route.unresolved?: string` (opcional, aditivo): declaracao que o adaptador ve mas nao resolve (path nao literal, `match` sem via, `mount`, `re_path`, montagem aninhada...) vira rota com motivo; o motor curto-circuita para `indeterminada` ANTES de allowlist/matcher; `isRoute` aceita string nao-vazia.
- **DP-3:** `route-auth-heuristics.ts` com `AUTH_NAME_RE` + `isAuthName` + `splitByAuthName`; filtro/middleware/dependencia com nome que nao casa e ignorado e listado em `notes`; os que casam tambem sao listados; proxy declarado. *Refinada: DP-3a — a lib tambem abriga `lineOf`/`readBalanced`/`splitTopLevel` movidos do Next.*
- **DP-4:** Rails por regex/linha: subset de `routes.rb` (`resources`/`resource` com only/except, `namespace`, `scope path:/module:`, verbos com `to:`/`=>`, `root`, nested 1 nivel, `member`/`collection`, `match via:`); fora do subset → `unresolved`; cobertura por `before_action`/`skip_before_action` com heranca ate `ActionController::Base|API`, redeclaracao substitui, `if:/unless:` → `opaque` escopado, controller ausente → `opaque` escopado; fixture `rails-minimal`.
- **DP-5:** Express por regex/linha sobre `.ts/.tsx/.js/.jsx/.mjs/.cjs` em `src/`,`app/`,`routes/`,`lib/`,raiz; subset `express()`/`Router()`, `app|router.<verb>('/lit', ...mws, h)`, `app.use([path,] ...)`, mount de router do mesmo arquivo ou importado 1 nivel, `app.route().get().post()`; path nao literal/`*`/regex → `unresolved` (CA-05); `hasExpress()`; Premissa 3 medida na fixture `express-minimal` (.mjs). *Refinada: DP-5a — Express NAO emite `path-pattern`; `use` anterior por linha vira `handler-chain` com `via` — ver Desvios.*
- **DP-6:** Python num adaptador com tres dialetos por import: FastAPI primeira classe (`FastAPI()`, `APIRouter(prefix, dependencies)`, decorators, `Depends`/`Annotated`/`Security` na assinatura, `include_router` com prefixos concatenados e import 1 nivel, `add_middleware`/`@app.middleware` proxy); Flask (`route`/shortcuts, `Blueprint`+`register_blueprint`, `@login_required` → handler-chain, `before_request` proxy); Django SO enumeracao (`path`/`include` 1 nivel; `re_path` → unresolved; cobertura = `opaque` escopado por handler → tudo `indeterminada`); fixture `python-fastapi-minimal`; Flask/Django por texto inline.
- **DP-7:** G13 RESOLVIDO contra a enumeracao: `wide` do parser vira CANDIDATA (guarda `reason?`); `promoteWideCandidates(parsed, routes)` no motor, antes de `matchAllowlist`: candidata igual (por `normalizePath`) a um `Route.path` enumerado e declaracao literal (com reason → `entries`; sem → `rejected`); sem rota igual → `AllowlistFinding high` (description emendada). Substitui a DP-3 do Plano 02 no "recusada"; `high` permanece. Multi-stack: `ALLOW-*` so se nenhuma stack promoveu.
- **DP-8:** `route-auth-adapters.ts` com `ADAPTERS` por `StackId` (`nextjs`, `rails`, `node-ts` com `applies = hasExpress`, `python`) + `SKIP_REASONS` (`react`, `laravel`, `node-ts` sem express, nenhuma stack); `selectAdapters(detected, targetDir)`; `auditProject()` assincrona em `route-auth-matrix.ts` chamando `auditRouteCoverage` SINCRONA por stack via seam `adapter?`; `ProjectAuditResult`/`ProjectSummary`; issues `[<stack>] ` prefixadas, ids sequenciais na lista combinada; allowlist lida por stack (aceito); CLI `await auditProject`; `issues` no topo inalterado.
- **DP-9:** adaptadores novos NAO implementam G2 (`isCoverageFile?`/`readCoverageAtBase?`) → `g2Support: false` + nota por stack; divida explicita (Rails `skip_before_action` num controller e G2 puro e nao e detectado nesta versao).
- **DP-10:** fixtures `rails-minimal`, `express-minimal` (.mjs), `python-fastapi-minimal`, `monorepo-next-rails` — sem `middleware.ts`, sem `.ts` fora de `route.ts`, `route.ts` sem `next/*`, sem token/segredo literal.
- **DP-11:** gate `tests/e2e/route-auth-four-stacks.test.ts` com golden inline por stack + monorepo (CA-08, CA-11); corte da Premissa 3: `indeterminada/enumerated > 0.25` na fixture → adaptador sai do registro (nota `experimental`, stack `skipped` com razao), nunca afrouxar veredito; taxa afirmada por stack.
- **DP-12:** `node-ts` so roda Express se `express` estiver em deps/devDeps do `package.json` da raiz; senao `skipped` com nota (Fastify/Koa/Hono/NestJS fora do escopo).
- **DP-13:** monorepo por subdiretorio FORA (`detectStack` le so a raiz); adaptador sem arvore → `enumerated: 0` com nota, nao erro.
- **DP-14:** secao 11 do agente ADITIVA: `summary.detected/stacks/skipped`, prefixo `[<stack>]`, `skipped` nao e "tudo coberto", heuristica de nome e proxy (citar notes), `g2Support: false`, entrada ampla promovida (emenda ao bullet `ALLOW-*` do Plano 02); comando Bash inalterado.
- **DP-15:** sizing real 2h + 2h + 2h + 1.5h + 1h = 8.5h (PLAN.md diz ~7.5h) — DEV-plan-1.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

- **DI-fase01-1: `parseRailsRoutes` NAO ordena por path — ordem de declaracao e o contrato.** O doc da
  fase sugeria ordenar como o adaptador Next faz. Nao se sustenta: o teste de `unresolved` afirma a
  posicao das rotas na ordem em que aparecem no `routes.rb`, e `resources`/`namespace` produzem blocos
  cuja ordem carrega significado (o `match` sem `via:` da fixture vem por ultimo). O executor removeu o
  sort ao ver o teste falhar.
  - Por que foi aceito: o teste e a ancora imutavel; o doc era sugestao de simetria com o Next, nao
    requisito. Ordem de declaracao tambem e o que `bin/rails routes` imprime.
  - Impacto: `Route[]` do Rails sai em ordem de arquivo. Os adaptadores Express (ordem de `use` por
    linha, G13) e Python dependem da mesma propriedade — **nao reintroduzir sort por path** nas
    fases 02/03.

- **DI-fase01-2: `readRailsCoverage` processa handlers em ordem alfabetica.** Necessario para
  `chains[0]` ser deterministico no teste (o `Map` de controllers nao garante ordem estavel entre
  execucoes).
  - Impacto: so a ordem das regras em `CoverageMap.rules`; o matcher casa por `handler`/`file:line`
    (G18), nunca por posicao. Nao confundir com a ordem das ROTAS (DI-fase01-1), que e de declaracao.


- **DI-fase04-1: `tests/fixtures/route-auth-matrix/nextjs-minimal/package.json` criado — arquivo FORA da lista
  de "Arquivos Afetados" da fase.** Sem ele, `detectStack` nao reconhecia a fixture como `nextjs` e o teste
  `never turns a skipped stack into approval` nao tinha o que exercitar (a fixture nasceu no Plano 01, quando
  a deteccao de stack ainda nao entrava no caminho).
  - Impacto: fixture existente ganhou 1 arquivo de 1 linha; nenhum teste anterior mudou de resultado.
    Desvio de escopo real, pequeno e declarado — registrado aqui em vez de passar despercebido.

- **DI-fase04-2: `withG2Note` esta INALCANCAVEL hoje — codigo fantasma (para o dev decidir no PR).**
  A funcao so acrescenta a nota `sem suporte a G2` quando o adaptador nao tem os metodos **e** a nota ainda
  nao esta em `summary.notes`. Mas o `reconstructBefore` do Plano 03 ja emite
  `adaptador <stack> sem suporte a G2 (isCoverageFile/readCoverageAtBase ausentes)` incondicionalmente para
  esses adaptadores — o guard curto-circuita sempre, e o corpo nunca roda com os 4 adaptadores registrados.
  - Como apareceu: a **mutacao 5 do RED-check do checklist da fase nao derrubou teste nenhum**. O executor
    investigou e reportou em vez de marcar a linha como confirmada.
  - Por que o doc errou: a fase-04 foi escrita quando o Plano 03 ainda nao estava mergeado; a nota do
    `reconstructBefore` chegou depois e tornou a defesa redundante.
  - **Nao removi** (codigo especificado pelo doc; remover e decisao de escopo do dev). Mas pelo criterio do
    proprio CLAUDE.md ("sem codigo fantasma", "nao super-engenheirar") isso ou vira teste que o alcance, ou sai.

- **DI-fase04-3: o agente tem 1 delecao fisica, e ela e legitima.** `git diff --stat agents/security-auditor.md`
  = 28 insercoes, 1 delecao. A linha removida (`finding so. Cite \`summary.allowlist.wide\` em \`reasoning\`.`)
  foi **estendida**: a nova comeca com o texto identico e continua (`— salvo quando a entrada e a declaracao
  ...`), porque a DP-7 tornou a afirmacao absoluta anterior incompleta. Nada foi diminuido; G13/DP-14
  satisfeitos em substancia. Conferido lendo as linhas, nao contando-as (ver GT-fase02-diff-bullet do Plano 03).


- **DI-fase05-1: golden do Rails no doc citava handler que o adaptador nunca produz.** O Passo 2 da fase-05
  escrevia `LegacyController#handle` para a rota `/legacy`, mas `route-auth-rails.ts:322` nao seta `handler`
  em `match` sem `via:` (a rota sai `unresolved`, DP-2). O executor corrigiu **o teste**, nao o adaptador —
  a ancora e o comportamento ja provado na fase-01, nao o rascunho do doc.
- **DI-fase05-2: o snippet do doc nao compilava.** `Golden.stack` tipado como `string` nao passa em
  `toEqual(KnownStack[])`. Corrigido importando o tipo, sem `as` (o repo proibe cast).

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01

- **BUG-fase02-1: rota de um SEGUNDO `Router()` no mesmo arquivo sumia em silencio.**
  - Sintoma: `analyzeExpress` com `const a = Router(); const b = Router(); a.get('/alpha'); b.get('/beta')`
    devolvia SO `GET /alpha`. `/beta` nao aparecia como `Route`, nem como `unresolved`, nem em `notes`.
  - Causa raiz: `primaryRouterVar` usava `parsed.routers[0]`; qualquer router seguinte do mesmo modulo
    era ignorado no loop de rotas.
  - Por que e defeito e nao escopo novo: a **DP-2** manda que toda declaracao que o adaptador ENXERGA e
    nao resolve vire `Route.unresolved`. O parser enxerga o segundo router (esta em `parsed.routers`) e
    o descartava. Rota que o relatorio nunca menciona e o modo de falha que o PRD inteiro existe para
    impedir (RF-04/RF-09) — pior que `indeterminada`, porque nem ruido deixa.
  - Fix: `secondaryRouters = new Set(pf.routers.slice(1))`; rota de router secundario vira `unresolved`
    (`segundo Router() no mesmo modulo — nao da para saber onde \`b\` foi montado`) + nota dedup por
    `file:owner`. Commit `4dc7ae2`, com teste antes.
  - Descoberto por: o proprio executor da fase-02, que reportou o gap em vez de omitir; reproduzido e
    confirmado pelo orquestrador antes de mandar corrigir.
  - Fase afetada: fase-02

- **BUG-fase01-1: `skip_before_action ... only:` estava invertido.** O `only:` do `skip` restringe
  QUAIS acoes deixam de ter o filtro; a implementacao inicial removia o filtro das acoes FORA do
  `only:`.
  - Sintoma: `health#show` continuava `coberta` (deveria perder a cobertura) e as demais acoes do
    controller perdiam.
  - Fix: aplicado pelo proprio ciclo GREEN dos testes do Passo 2, ANTES do commit — o teste
    `Premissa 2: ... skip uncovers health ...` foi escrito primeiro e pegou a inversao.
  - Fase afetada: fase-01

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

- **GT-fase02-1: a mutacao `isAuthName -> true` do RED-check NAO quebrava nada na fase-02.**
  Das 5 mutacoes do checklist da fase-02, 4 derrubaram o teste previsto e essa passou com `14 pass,
  0 fail`. Causa: a fixture `express-minimal` so tem `requireAuth`/`requireAdmin` (ambos ja auth) e
  nenhum teste misturava nome auth com nao-auth no mesmo handler — a heuristica so tinha rede em
  `route-auth-heuristics.test.ts` (fase-01), nao no adaptador.
  - Descoberto em: fase-02 (executor reportou como gap, nao marcou a linha do checklist como confirmada)
  - Impacto: teste novo com `requestLogger` (nao-auth) ao lado de `requireAuth`; a mutacao **agora**
    derruba (`Expected to contain: "requireAuth", Received: "middleware de rota requestLogger"`).
    **Licao para as fases 03/04:** fixture cujos middlewares sao TODOS auth nao exercita a heuristica —
    toda fixture de adaptador precisa de pelo menos um nome nao-auth junto de um auth.


- **GT-fase03-1: fase grande demais para um executor so — `max_output_tokens` (64000) mata a tentativa.**
  A primeira tentativa da fase-03 (3 dialetos + fixture + 16 testes + relatorio com saidas literais
  completas) morreu com `API Error: max_output_tokens`. Nada foi escrito no disco — working tree limpa,
  retry sem estado parcial para reconciliar.
  - Descoberto em: fase-03
  - Causa: o codigo escrito conta no orcamento de SAIDA junto com o relatorio. Rails deu 655 linhas,
    Express 523; Python com 3 dialetos passou de 740 — mais fixture, mais 16 testes, mais dumps.
  - Mitigacao aplicada, nesta ordem: (1) **dividir na costura que o proprio doc ja usava** (FastAPI e
    primeira classe; "Flask/Django por testes inline") em Parte A e Parte B, cada uma com commit
    proprio — a FASE continua uma so, o que foi dividido e a execucao; (2) **evidencia longa vai para
    arquivo** no scratchpad e o relatorio cita o caminho (principio "sistema de arquivos como estado"
    do CLAUDE.md); (3) relatorio final com teto de linhas.
  - Impacto para as fases 04/05 e para planos futuros: fase que cria lib nova grande + fixture + suite
    de teste deve nascer dividida, ou pedir evidencia em arquivo desde o comeco. Estimar por
    **linhas de codigo a escrever**, nao so por horas.

- **GT-fase03-2: ramo nao implementado tem que emitir NOTA, nao array vazio.** Entre a Parte A e a
  Parte B, Flask e Django ficaram declarados-mas-minimos. Verificado pelo orquestrador antes de seguir:
  os dois devolviam `routes: []` **com nota** (`dialeto flask ainda nao implementado nesta fase...`),
  nunca vazio calado — um projeto Flask auditado naquele estado enumerava zero rotas mas dizia por que.
  - Descoberto em: fase-03 (estado intermediario)
  - Impacto: e o padrao a repetir sempre que um plano deixar um ramo para depois. Vazio sem nota seria
    o BUG-fase02-1 de novo, com outra roupa.


- **GT-fase04-1: nao rodar `bun run typecheck` em paralelo com `bun run test` neste repo.**
  O orquestrador rodou os dois ao mesmo tempo e o `tsc` falhou com
  `error TS6053: File 'tests/__fixtures__/harness-advanced/scripts/harness-validate.ts' not found ...
  Matched by include pattern '**/*.ts'`. A suite CRIA e REMOVE arquivos em `tests/__fixtures__/` durante a
  execucao, e o `tsconfig` inclui `**/*.ts` — o `tsc` pegou a janela em que o arquivo nao existia.
  - Descoberto em: fase-04 (falha auto-infligida do orquestrador, nao do executor)
  - Impacto: **falso negativo de typecheck**. Rodado de novo, sozinho, deu exit 0. Verificacao concorrente
    neste repo mente; rodar sequencial. Vale para qualquer sessao futura que queira "ganhar tempo".


- **GT-fase05-1: o Criterio de Aceite do doc diz "6 pass" e o proprio codigo do doc gera 7 `it()`** — o
  `describe` da Premissa 3 tem 2 testes, nao 1. O executor reportou a divergencia em vez de fabricar o 6.
  - Descoberto em: fase-05
  - Impacto: nenhum no comportamento. E a **setima vez** nesta feature que um numero previsto no doc nao
    bate com o real (DI-fase01-2, DI-fase02-1, DI-fase03-1, mutacao 5 da fase-04, e agora esta). O padrao
    esta consolidado: **numero em checklist e chute do planejador; o que vale e qual assertion quebra.**

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->


- **DEV-plan-1 (nota de planejamento, 2026-09-06): sizing ~8.5h, nao ~7.5h.** O PLAN.md registra ~7.5h
  para o Plano 04; a soma real das fases e 2h + 2h + 2h + 1.5h + 1h = 8.5h. A fase-01 carrega o Passo
  0 (contrato aditivo `handler-chain`/`unresolved`/`opaque.handler`, heuristica de nome, G13, utilitarios
  de texto movidos) alem do adaptador Rails; a fase-04 carrega registro + `auditProject` + CLI + agente
  + fixture do monorepo. O orquestrador atualiza o PLAN.md; o executor nao toca nele.
- **DEV-plan-2 (nota de planejamento, 2026-09-06): DP-1 refinada — `opaque.handler?` (escopo do opaco).**
  A DP-1 original previa `opaque` (ja existente) para cobertura condicional e controller ausente. Mas
  o matcher `opaque` do `RULE_MATCHERS` devolve `unsure` para QUALQUER rota: um unico controller com
  `before_action ... if:` (ou um `root to: 'home#index'` sem `HomeController`) tornaria TODAS as rotas
  do projeto `indeterminada` — 40 issues medium por um controller. Campo OPCIONAL aditivo
  `handler?: string` em `opaque`: definido e diferente de `route.handler` → `no`; igual ou ausente →
  `unsure`. Next continua emitindo `opaque` global (sem `handler`), comportamento identico. Tambem
  DP-1b: evidence de DESCOBERTA e description do finding por `route.stack` (hash map
  `MISSING_BY_STACK`), porque "sem cobertura de middleware"/"config.matcher" e falso para Rails e
  Python (RF-05 pede o que faltou). **Aceito pelo orquestrador** (sessao autonoma; o dev pode vetar
  no PR — voltar a `opaque` global e aceitar o ruido).
- **DEV-plan-3 (nota de planejamento, 2026-09-06): DP-5 refinada — Express NAO emite `path-pattern`.**
  A DP-5 original mandava `app.use(auth)` global virar `path-pattern '/:path*'` "cobrindo rotas
  declaradas DEPOIS dele". O motor nao conhece linha: um `path-pattern '/:path*'` cobriria tambem
  `app.get('/health')` declarado ANTES do `use` — exatamente o abuso que a fase-02 testa no RED. O
  adaptador resolve a ordem por linha (rota vs `use` no mesmo arquivo; `use` vs montagem do router;
  `router.use` vs rota do router) e emite `handler-chain` por rota coberta com `via` nomeando o `use`
  e a linha. `path-pattern '/:path*'` fica reservado a middleware SEM ordem (Python:
  `add_middleware`, `@app.middleware`, `before_request`, Django `MIDDLEWARE`). A nota de proxy
  continua. **Aceito pelo orquestrador** (sessao autonoma).
- **DEV-plan-4 (nota de planejamento, 2026-09-06): DP-3 refinada — utilitarios de texto movem para
  `route-auth-heuristics.ts`.** `lineOf`, `readBalanced` e `splitTopLevel` sao privados de
  `route-auth-nextjs.ts` e os tres adaptadores novos precisam deles (Rails: `lineOf`; Express:
  `readBalanced`+`splitTopLevel`; Python: os tres). Duplicar 50 linhas em tres arquivos contraria "uma
  fonte de verdade"; importar de `route-auth-nextjs` faria Rails depender do Next por nome. Movidos
  na fase-01 (Passo 0, commit de refactor separado), Next importa; 40 testes do Next sao a rede.
  **Aceito pelo orquestrador.**

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

### Contagens de teste estimadas (a contagem real vai aqui se diferir)

Ponto de partida (estado estimado apos o Plano 03): `route-auth-matrix.test.ts` = 52,
`route-auth-nextjs.test.ts` = 40, `public-routes-allowlist.test.ts` = 20, `route-auth-matrix.types.test.ts` = 8,
suite ~2058.

| Fase | Arquivo de teste | Novos | Total no arquivo | Observacao |
|------|------------------|-------|------------------|------------|
| 01 | `route-auth-matrix.types.test.ts` | +2 | 10 | `isRoute` com `unresolved` |
| 01 | `route-auth-matrix.test.ts` | +8 | 60 | `handler-chain` (3), `unresolved` (2), `opaque` escopado (1), promocao (2) |
| 01 | `public-routes-allowlist.test.ts` | +4 | 24 | `reason` na candidata (1), `promoteWideCandidates` (3) |
| 01 | `route-auth-heuristics.test.ts` (novo) | +7 | 7 | `isAuthName` (3), `splitByAuthName` (1), `lineOf`/`readBalanced`/`splitTopLevel` (3) |
| 01 | `route-auth-rails.test.ts` (novo) | +14 | 14 | routes.rb (7), controller (4), cobertura efetiva + fixture (3) |
| 01 | `route-auth-nextjs.test.ts` | 0 | 40 | so muda import; deve continuar 40 pass |
| 02 | `route-auth-express.test.ts` (novo) | +14 | 14 | parse (7), ordem de `use` (3), mount/import (2), fixture (2) |
| 03 | `route-auth-python.test.ts` (novo) | +16 | 16 | FastAPI (8), Flask (4), Django (3), fixture (1) |
| 04 | `route-auth-adapters.test.ts` (novo) | +6 | 6 | registro, `applies`, `skipped` |
| 04 | `route-auth-matrix.test.ts` | +5 | 65 | `auditProject`: CA-11, prefixo, `ALLOW` dedupe, `skipped` nunca aprova, Next ignora `.rb` |
| 05 | `tests/e2e/route-auth-four-stacks.test.ts` (novo) | +6 | 6 | 4 fixtures + monorepo + taxa/segredos |
| — | **Total estimado** | **+82** | | suite ~2140 |

**fase-01 medida (2026-09-06, commits 0daf049 + 78d158f):**
`skills/security/lib/` **168** (era 133: +21 do Passo 0, +14 do Rails), `route-auth-rails.test.ts` **14**
(bateu com a estimativa), `route-auth-nextjs.test.ts` **40** (inalterado apos os utilitarios sairem para
`route-auth-heuristics.ts` — DP-3a), suite completa **2093 pass / 0 fail** (baseline do plano: 2058).
`typecheck` exit 0, `agents:contract` 39 pass, manifest idempotente.

**fase-02 medida (2026-09-06, commits 98b6a05 + 4dc7ae2):**
`route-auth-express.test.ts` **16** (14 do doc + 2 do fix), `skills/security/lib/` **184**, suite completa
**2109 pass / 0 fail** (lotes 1436 + 673). Taxa de `indeterminada` da fixture Express: **1/6 = 0.167**,
abaixo do corte 0.25 (DP-11) — o adaptador fica. `typecheck` exit 0, `agents:contract` 39 pass,
manifest idempotente, fixture so `.mjs` (G2).

**fase-03 medida (2026-09-07, commits 1c5d244 Parte A + 28b16a8 Parte B):**
`route-auth-python.test.ts` **16** (9 FastAPI + 7 Flask/Django; o doc estimava 16), `skills/security/lib/`
**200**, suite completa **2125 pass / 0 fail** (lotes 1444 + 681). Taxa de `indeterminada` da fixture
`python-fastapi-minimal`, medida pelo orquestrador: **0/5 = 0.000**, muito abaixo do corte 0.25 (DP-11).
**Django nao entra nesse denominador** — nao tem fixture nesta fase (so testes inline) e, por desenho
(DP-6/G16), toda rota dele e `indeterminada`. Se a fase-05 criar fixture Django, a taxa dela sera 1.000
e o corte precisa ser lido por stack, nao no agregado.

**fase-04 medida (2026-09-07, commit 781220e):**
`route-auth-adapters.test.ts` **6**, `route-auth-matrix.test.ts` **65**, `skills/security/lib/` **211**,
suite completa **2136 pass / 0 fail** (lotes 1448 + 688). CA-11 verificado pelo orquestrador na fixture
`monorepo-next-rails`: `detected.primary=nextjs`, `secondary=[node-ts, rails]`; rodaram `nextjs` e `rails`;
`node-ts` foi para `skipped` com razao (`sem express` — DP-12/G8, a defesa que impede todo projeto Next de
rodar o adaptador Express); com `changedFiles`, os findings saem prefixados:
`[nextjs] DESCOBERTA: GET /api/admin` (critical) e `[rails] indeterminada: GET /status` (medium).
Sem `changedFiles` o conjunto G1 e vazio e `evaluated: 0` — escopo hibrido (Decisao 2 do PRD), nao defeito.

**fase-05 medida (2026-09-07, commit 7f0723b):**
`tests/e2e/route-auth-four-stacks.test.ts` **7** (o doc dizia 6 — ver GT-fase05-1), suite completa
**2143 pass / 0 fail** (lotes 1449 + 694). Gate CA-08 verde nas quatro stacks + CA-11 no monorepo.

**Premissa 3 — taxa de `indeterminada` por stack, medida pelo orquestrador (corte 0.25, DP-11):**

| Stack | Fixture | indeterminada / enumerated | Taxa | Veredito |
|---|---|---|---|---|
| nextjs | `nextjs-minimal` | 0/6 | 0.000 | entra |
| rails | `rails-minimal` | 2/13 | 0.154 | entra |
| node-ts | `express-minimal` | 1/6 | 0.167 | entra |
| python | `python-fastapi-minimal` | 0/5 | 0.000 | entra |

**Nenhum adaptador cortado** — os quatro numeros batem exatamente com o previsto no planejamento, e a
Premissa 3 do PRD ("enumeracao estatica de Express cobre o suficiente para valer a pena") esta validada
com dado, nao com opiniao. **Django fica FORA deste gate por desenho**: nao tem fixture (so testes
inline) e toda rota dele e `indeterminada` (DP-6/G16) — taxa seria 1.000 e o corte o expulsaria por uma
regra que nao foi pensada para ele. Se um plano futuro criar fixture Django, o corte precisa ser lido
por stack com excecao declarada, nunca no agregado.

### Taxa de `indeterminada` por stack (Premissa 3 — MEDIDA na fase-05 pelo orquestrador)

| Stack | Fixture | enumerated | indeterminada | taxa | corte 0.25 | decisao |
|-------|---------|-----------:|--------------:|-----:|:----------:|---------|
| nextjs | `nextjs-minimal` | 6 | 0 | 0.000 | ok | **entra no registro** |
| rails | `rails-minimal` | 13 | 2 | 0.154 | ok | **entra no registro** |
| node-ts/express | `express-minimal` | 6 | 1 | 0.167 | ok | **entra no registro** |
| python/fastapi | `python-fastapi-minimal` | 5 | 0 | 0.000 | ok | **entra no registro** |

Os quatro numeros bateram exatamente com o previsto no planejamento. **Nenhum adaptador cortado** — a
Premissa 3 do PRD esta validada com medida, nao com opiniao. **Django fica FORA deste gate por desenho**
(sem fixture; toda rota e `indeterminada` por DP-6/G16 — taxa seria 1.000).

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.

**A FEATURE FECHA AQUI.** 4 planos, 16 fases, 16/16. Nao ha proximo plano nesta feature — o que segue
sao follow-ups declarados, cada um com o ponto exato de encaixe.

### Estado final (2026-09-07)

| Fase | Commits | Entrega |
|---|---|---|
| 01 | `0daf049` + `78d158f` | Passo 0 (contrato aditivo + heuristica + G13) e adaptador Rails |
| 02 | `98b6a05` + `4dc7ae2` | Adaptador Express + fix do descarte silencioso de router secundario |
| 03 | `1c5d244` + `28b16a8` | Adaptador Python: FastAPI (A), Flask e Django (B) |
| 04 | `781220e` | Registro por `StackId`, `auditProject` multi-stack, prefixo `[<stack>]`, CA-11 |
| 05 | `7f0723b` | Gate e2e das 4 stacks (CA-08) e corte da Premissa 3 |

`skills/security/lib/` **211 pass**; e2e do gate **7**; suite completa **2143 pass / 0 fail**
(lotes 1449 + 694; baseline no inicio do plano: 2058). `typecheck` exit 0, `agents:contract` 39 pass,
`harness:validate` 0 warnings, manifest idempotente (so datas mudam ao regenerar).

**Adaptadores no registro (todos passaram no corte da Premissa 3):** `nextjs`, `rails`, `node-ts`
(Express), `python`. Tabela de taxas na secao Metricas.

### Assinaturas publicas (copiadas do codigo)

```ts
// route-auth-matrix.types.ts
type CoverageRule = { kind: 'path-pattern'; ... } | { kind: 'opaque'; reason; file; line; handler? } |
                    { kind: 'handler-chain'; handler: string; file: string; line: number; via: string }
type Route = { method; path; file; line; stack; handler?; unresolved?: string }
interface RouteAdapter { stack; enumerate; readCoverage; isCoverageFile?; readCoverageAtBase? }

// route-auth-heuristics.ts (compartilhada pelos 4 adaptadores)
AUTH_NAME_RE; isAuthName(name): boolean; splitByAuthName(names); authNameNotes(label, split)
lineOf(source, index); readBalanced(source, start, open, close); splitTopLevel(body); QUOTES

// route-auth-adapters.ts
type KnownStack = Exclude<StackId, 'unknown'>
type AdapterEntry = { adapter: RouteAdapter; applies: (targetDir: string) => boolean }
ADAPTERS: Readonly<Partial<Record<KnownStack, AdapterEntry>>>   // nextjs, rails, node-ts, python
SKIP_REASONS: Readonly<Record<string, string>>
selectAdapters(detected, targetDir): { selected: SelectedAdapter[]; skipped: SkippedStack[] }

// route-auth-matrix.ts (camada multi-stack; auditRouteCoverage segue SINCRONA)
type StackAudit = { stack: KnownStack; result: AuditResult; g2Support: boolean }
type ProjectAuditResult = { detected; stacks: StackAudit[]; skipped: SkippedStack[]; issues: ContractIssue[] }
type ProjectSummary = { detected; stacks: Record<string, AuditSummary & { g2Support }>; skipped; totals }
async auditProject(targetDir, opts): Promise<ProjectAuditResult>
summarizeProject(result): ProjectSummary
buildProjectIssues(stacks): ContractIssue[]      // dedupe de ALLOW-* entre stacks (DP-7)

// public-routes-allowlist.ts
promoteWideCandidates(parsed, routes): AllowlistParseResult   // amplitude decidida contra a ENUMERACAO

// adaptadores: railsAdapter, expressAdapter, pythonAdapter, nextjsAdapter (+ hasExpress)
```

### Follow-ups declarados

- **RF-07 (full-surface):** `auditProject` ja itera todas as rotas enumeradas por stack. Full-surface e
  trocar o filtro `changed.has(route.file)` por "todas" atras de uma opcao (`scope: 'diff' | 'full'`) e
  propagar `summary.scope`. **Nenhuma mudanca de adaptador.**
- **G2 por stack:** os 3 adaptadores novos NAO implementam `isCoverageFile`/`readCoverageAtBase` (DP-9) —
  hoje sai `g2Support: false` + nota por stack. Rails: `app/controllers/**` sao os arquivos de cobertura,
  e `readCoverageAtBase` precisa ler N controllers na base (o seam `readAtBase` e por arquivo — cabe, mas
  custa 3 processos git por controller). Express: o arquivo de rota E o de cobertura. FastAPI:
  `deps.py` e routers com `dependencies=`.
- **Django coverage:** hoje `opaque` escopado por handler → tudo `indeterminada`, por desenho. Faltaria
  `@login_required`, `LoginRequiredMixin`, `MIDDLEWARE` com `AuthenticationMiddleware` +
  `LoginRequiredMiddleware` (Django 5.1).
- **Monorepo por subdiretorio:** `detectStack` le so a raiz (DP-13). Precisaria de `detectStack` por
  subpasta ou `anchorFiles` recursivo.
- **DP-7 substitui a DP-3 do Plano 02 no "recusada":** entrada ampla agora e *candidata* — promovida se
  casar rota enumerada, `AllowlistFinding high` so se nao casar nenhuma, em NENHUMA stack.

### Pendencias para o dev decidir no PR

1. **`withG2Note` esta inalcancavel** (DI-fase04-2): o `reconstructBefore` do Plano 03 ja emite a mesma
   nota, entao o corpo nunca roda com os 4 adaptadores registrados. Foi a mutacao do RED-check que **nao
   derrubou teste nenhum**. Ou ganha teste que o alcance, ou sai — pelo criterio "sem codigo fantasma".
2. **Django fora do gate da Premissa 3** (fase-05): sem fixture, por desenho. Se um plano futuro criar
   uma, a taxa sera 1.000 e o corte precisa de excecao declarada por stack — nunca media agregada.
3. **Criterio "por humano" pendente em TODAS as fases:** o cache do plugin esta defasado; rodar
   `scripts/sync-to-global.sh` (Git Bash) antes de validar num projeto real. Inclui comparar
   `railsAdapter.enumerate` contra `bin/rails routes` (fase-01), que nao foi feito por falta de projeto Rails.

### Compound candidates (para `/anti-vibe-coding:lessons-learned`)

- Rota que some em silencio e pior que rota `indeterminada` — BUG-fase02-1 (segundo `Router()` descartado).
- Fixture cujos middlewares sao TODOS de auth nao exercita a heuristica — GT-fase02-1.
- Fase grande demais estoura `max_output_tokens`; dividir na costura do doc e mandar evidencia para
  arquivo — GT-fase03-1. Estimar fase por **linhas de codigo a escrever**, nao so por horas.
- Ramo nao implementado emite NOTA, nunca vazio calado — GT-fase03-2.
- Nao rodar `typecheck` em paralelo com a suite (a suite mexe em `tests/__fixtures__/`) — GT-fase04-1.
- **Numero previsto em checklist e chute do planejador; o que vale e qual assertion quebra** — DI-fase01-2,
  DI-fase02-1, DI-fase03-1, mutacao 5 da fase-04, GT-fase05-1. Sete ocorrencias em uma feature.

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
<!-- Atualizado automaticamente durante execucao -->
