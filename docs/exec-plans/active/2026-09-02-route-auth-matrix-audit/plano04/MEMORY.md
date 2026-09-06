# Memoria: Plano 04 — Os outros tres adaptadores + multi-stack

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-06
**Status:** em andamento

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

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

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
| Fases concluidas | 1 |
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

### Taxa de `indeterminada` por stack (Premissa 3 — preencher na fase-05)

| Stack | Fixture | enumerated | indeterminada | taxa | corte 0.25 | decisao |
|-------|---------|-----------:|--------------:|-----:|:----------:|---------|
| nextjs | `nextjs-minimal` | 6 (esperado) | 0 | 0.00 | ok | mantido |
| rails | `rails-minimal` | 13 (esperado) | 2 | 0.15 | ok | (preencher) |
| node-ts/express | `express-minimal` | 6 (esperado) | 1 | 0.17 | ok | (preencher) |
| python/fastapi | `python-fastapi-minimal` | 5 (esperado) | 0 | 0.00 | ok | (preencher) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**A feature fecha neste plano.** Preencher na fase-05 com, no minimo:

- **Estado final:** commits por fase; contagem real de testes por arquivo; suite total; `typecheck`,
  `agents:contract`, `harness:validate` verdes; taxa de `indeterminada` por stack (tabela acima) e
  quais adaptadores entraram no registro.
- **Assinaturas publicas (copiadas do codigo, nao redescobrir):** `CoverageRule` com `handler-chain` e
  `opaque.handler?`; `Route.unresolved?`; `isAuthName`/`splitByAuthName`/`lineOf`/`readBalanced`/
  `splitTopLevel` em `route-auth-heuristics.ts`; `railsAdapter`/`expressAdapter`/`pythonAdapter` e suas
  funcoes puras `parse*`; `hasExpress`; `ADAPTERS`/`SKIP_REASONS`/`selectAdapters`; `auditProject`,
  `ProjectAuditResult`, `ProjectSummary`, `buildProjectIssues`; `promoteWideCandidates`.
- **O que o RF-07 (full-surface, plano futuro) precisa:** `auditProject` ja itera todas as rotas
  enumeradas por stack — full-surface e trocar o filtro `changed.has(route.file)` por "todas" atras de
  uma opcao (`scope: 'diff' | 'full'`) e propagar `summary.scope`; nenhuma mudanca de adaptador.
- **G2 por stack (follow-up):** cada adaptador novo precisa de `isCoverageFile` + `readCoverageAtBase`
  (DP-2 do Plano 03). Rails: `app/controllers/**` sao arquivos de cobertura; `readCoverageAtBase`
  precisa ler N controllers na base (o seam `readAtBase` e por arquivo — cabe, mas custa 3 processos
  git por controller). Express: o arquivo de rota E o de cobertura (G1 ja reavalia). FastAPI:
  `deps.py`/routers com `dependencies=`. Ate la, `g2Support: false` e a nota por stack.
- **Django coverage (follow-up):** `@login_required`, `LoginRequiredMixin`, `MIDDLEWARE` com
  `AuthenticationMiddleware` + `LoginRequiredMiddleware` (Django 5.1). Hoje: `opaque` escopado por
  handler → tudo `indeterminada`.
- **Monorepo por subdiretorio (follow-up):** `detectStack` le so a raiz (DP-13). Precisaria de
  `detectStack` por subpasta ou de `anchorFiles` recursivo — fora deste plano.
- **DP-7 substitui a DP-3 do Plano 02 no "recusada":** se a secao 11 do agente ou o
  `verify-work/SKILL.md` disserem que entrada ampla e "recusada", corrigir para "candidata: promovida
  se for declaracao literal de rota enumerada; senao finding high" (a fase-04 emenda o agente; o
  `verify-work` nao cita "recusada" hoje — conferir com `grep -n recusad skills/verify-work/SKILL.md`).
- **G24:** se o Plano 03 for executado DEPOIS deste, `readAllowlistAtBase` precisa aplicar
  `promoteWideCandidates` na ponta antes (uma linha) e `verdictFor` precisa do curto-circuito de
  `unresolved` na primeira linha.
- **`CLAUDE_PLUGIN_ROOT` no Bash do subagente** continua pendente desde o Plano 01 — validar num
  projeto real de cada stack antes de dar a feature por fechada de ponta a ponta; o cache do plugin
  precisa de `scripts/sync-to-global.sh` antes.
- **Compound candidates** (para `/lessons-learned`): `opaque` global infecta o projeto inteiro (DEV-plan-2);
  `path-pattern` nao conhece ordem — Express exige `handler-chain` por linha (DEV-plan-3); redeclarar
  `before_action` no filho substitui a herdada (G22); Express 4 vs 5 `*` (G12).

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
<!-- Atualizado automaticamente durante execucao -->
