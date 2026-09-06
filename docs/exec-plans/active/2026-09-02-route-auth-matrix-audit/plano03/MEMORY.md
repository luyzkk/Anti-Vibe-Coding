# Memoria: Plano 03 — G2: cobertura perdida

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-05
**Status:** em andamento

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-05 no `/plan-feature` (orquestrador, sessao autonoma — o dev veta na revisao do PR).
As fases implementam; o executor NAO re-pergunta nem reabre. Detalhe completo em `README.md`
"Decisoes de planejamento (DP)".

- **DP-1:** G2 dispara quando o diff toca arquivo de cobertura (`adapter.isCoverageFile(f)`) OU `anti-vibe.public-routes.json`; no Next, `isCoverageFile = (f) => f === 'middleware.ts'`.
- **DP-2:** `RouteAdapter` ganha metodos OPCIONAIS `isCoverageFile?` e `readCoverageAtBase?(read): CoverageMap | { unavailable }`; Next implementa (found → `parseMatcherConfig(source, 'middleware.ts@base')`; absent → `rules: []` + nota; unavailable → `{ unavailable }`); adaptador sem os metodos → `not-applicable` com nota visivel, nunca silencio.
- **DP-3:** `verdictFor(route, coverage, allowlist)` e a UNICA forma de produzir veredito, usada nas duas pontas; base lida UMA vez via `safeBaseReader` → `readAllowlistAtBase` deriva `delta` e `allowlistBefore`; `evaluateRoute` nao muda.
- **DP-4 (emendada):** conjunto G2 = rota fora do G1 com `verdictBefore` ∈ {coberta, publica-declarada, indeterminada} e `verdictAfter` ∈ {DESCOBERTA, indeterminada}, menos o par indeterminada → indeterminada; `indeterminada` antes vira `indeterminada` G2 (nao da para provar que era coberta); mesma severidade (D9) e emissao (D8); `trigger?: 'G1' | 'G2'` aditivo; evidence `cobertura perdida — antes: ...; agora: ...`; description prefixada `[cobertura perdida] `. *Emenda do orquestrador na revisao do plano — ver Desvios.*
- **DP-5:** base irreconstruivel (`unavailable`, `readAtBase` ausente/lancou, ou `not-applicable` com `triggered: true`) → toda rota nao-G1 aberta vira `indeterminada` G2 medium com `ponta 'antes' irreconstruivel (<reason>) — nao da para saber se <path> perdeu cobertura neste diff`; rotas coberta/publica-declarada hoje nao sao tocadas.
- **DP-6:** `absent` = zero cobertura antes = nada a perder (`before: 'resolved'`, nota `middleware.ts ausente na base — nenhuma cobertura a perder`); middleware DELETADO no diff cai naturalmente (tudo que era coberta vira DESCOBERTA G2).
- **DP-7:** `AuditSummary.g2: { triggered; sources; before: 'resolved' | 'unavailable' | 'not-applicable'; lost; indeterminate; reason? }`; `evaluated` = G1 + G2; nota G1 perde o sufixo `(cobertura perdida e o Plano 03)`.
- **DP-8:** secao 11 do agente ganha bullets (a) citar `g2.triggered/sources/lost`, (b) `[cobertura perdida]` = rota existente, olhar o diff da cobertura, (c) `before: unavailable` = indeterminada nao e aprovacao, (d) `not-applicable` + `triggered` = adaptador sem suporte, dizer literalmente; bullet stale de `delta.removed` corrigido (unica linha `-`); `verify-work/SKILL.md` NAO muda (sugestao de linha no Summary registrada no README).
- **DP-9:** nenhuma fixture nova; CA-09 = `nextjs-minimal` + `changedFiles: ['middleware.ts']` + `readAtBase` devolvendo `middlewareSource(['/api/:path*'])` + `coverageOverride: coverage(['/api/preferences'])` → 3 findings (admin critical, users DELETE critical, users GET high).
- **DP-10:** ordenacao de `findings` (severidade, path) inalterada; `trigger` nao reordena; ids `ROUTE-*` sequenciais na lista combinada.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

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

- **DEV-plan-1 (nota de planejamento, 2026-09-05): seam `AuditOptions.adapter?` nasce na fase-03.** O
  PLAN.md nao o preve. E o minimo para testar o ramo `not-applicable` da DP-2 sem esperar o Plano 04
  (G14 do README). Default `nextjsAdapter`; comportamento da CLI inalterado. O Plano 04 fase-04 decide
  se vira selecao por `detectStack()`. **Aceito pelo orquestrador em 2026-09-05** (sessao autonoma; o dev
  pode vetar na revisao do PR — se vetar, o ramo `not-applicable` fica coberto so por type-level e o teste
  correspondente e removido).
- **DEV-plan-2 (nota de planejamento, 2026-09-05): a fase-01 NAO computa `verdictBefore` rota a rota.**
  A distribuicao original pedia isso na fase-01. Computar um mapa de vereditos que ninguem consome ate a
  fase-02 seria codigo morto por uma fase (CLAUDE.md "sem codigo fantasma"). A fase-01 entrega as pecas
  (`verdictFor` extraida e usada pelo G1, `reconstructBefore` produzindo a `coverageBefore`/`allowlistBefore`
  reais, `summary.g2` com `before` e `sources`); a fase-02 escreve o loop `lostCoverage` que as consome.
  Nenhum comportamento observavel do plano muda.
- **DEV-plan-3 (nota de planejamento, 2026-09-05): DP-4 emendada na revisao do orquestrador.** O subagente que
  escreveu a fase-02 apontou que a DP-4 literal deixava fora a rota com `verdictBefore = indeterminada` (base com
  matcher computado) e `verdictAfter = DESCOBERTA` — uma lacuna silenciosa. E exatamente o que RF-04 e a Decisao 8
  do PRD proibem (incapacidade nunca vira aprovacao). Emenda: `LOST_FROM` ganha `indeterminada`; o par
  indeterminada → indeterminada e pulado; o veredito G2 nesse caso e `indeterminada` (medium), nao DESCOBERTA.
  Custo: uma linha em `lostCoverage` + um teste na fase-02. **Aceito pelo orquestrador em 2026-09-05** (sessao
  autonoma; o dev pode vetar na revisao do PR).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

**Contagens de teste (estimativa do planejamento — a real vai aqui se diferir):**

| Arquivo | Antes | fase-01 | fase-02 | fase-03 |
|---|---|---|---|---|
| `route-auth-matrix.test.ts` | 33 | 39 (+6) | 46 (+7) | 52 (+6) |
| `route-auth-nextjs.test.ts` | 34 | 39 (+5) | 39 | 40 (+1) |
| suite completa (`bun run test`) | 2033 | 2044 | 2051 | 2058 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Preencher ao fechar a fase-03. Minimo esperado (o Plano 04 precisa disto): -->

<!--
**Estado final (data, commits):** contagens reais de `route-auth-matrix.test.ts`, `route-auth-nextjs.test.ts`,
`skills/security/lib/`, suite completa.

**Assinaturas publicas (copiadas do codigo — nao redescobrir):**

```ts
// route-auth-matrix.types.ts
interface RouteAdapter { stack; enumerate(targetDir); readCoverage(targetDir); isCoverageFile?(file): boolean; readCoverageAtBase?(read: (file) => BaseRead): CoverageMap | { unavailable: string } }
type RouteVerdict = { route; verdict; evidence; trigger?: 'G1' | 'G2' }
type RouteFinding = { route; verdict; severity; missing; trigger?: 'G1' | 'G2' }
type G2Summary = { triggered; sources; before: 'resolved' | 'unavailable' | 'not-applicable'; lost; indeterminate; reason? }
isCoverageUnavailable(value): value is { unavailable: string }

// route-auth-matrix.ts
type AuditOptions = { changedFiles?; coverageOverride?; readAtBase?; adapter?: RouteAdapter }
verdictFor(route, coverage, allowlist): RouteVerdict      // allowlist ANTES do motor; as duas pontas passam aqui
// AuditSummary.g2: G2Summary; evaluated = G1 + G2

// route-auth-nextjs.ts
isNextjsCoverageFile(file): boolean                        // file === 'middleware.ts'
readNextjsCoverageAtBase(read): CoverageMap | { unavailable: string }   // puro sobre BaseRead; sources ['middleware.ts@base']
```

**Onde o Plano 04 encaixa (G2):**
- Cada adaptador DECIDE se implementa `isCoverageFile`/`readCoverageAtBase`. Sem os dois, o G2 sai
  `before: 'not-applicable'` com nota `adaptador <stack> sem suporte a G2` — nunca silencio, nunca coberta.
  Com allowlist no diff, `not-applicable` + `triggered: true` emite `indeterminada` medium por rota aberta (DP-5).
- Se implementar: `read(<arquivo de cobertura>)`; `found` → parser puro da stack com `file` sufixado `@base`;
  `absent` → `rules: []` + nota "ausente na base — nenhuma cobertura a perder"; `unavailable` → `{ unavailable: reason }`.
  Rails: `before_action` vive no controller, nao em um arquivo so — `isCoverageFile` precisa reconhecer
  `app/controllers/**` e `readCoverageAtBase` precisa ler VARIOS arquivos pelo mesmo `read`.
- `trigger` e preenchido pelo motor, nunca pelo adaptador. `verdictFor` e a unica funcao de veredito —
  o loop multi-stack da fase-04 chama ela, nao duplica allowlist + evaluateRoute.
- `AuditOptions.adapter?` e seam de teste (DEV-plan-1): a fase-04 decide se vira selecao por detectStack().

**Dividas herdadas / abertas:** cache do plugin defasado (G1); `CLAUDE_PLUGIN_ROOT` no Bash do subagente
(Plano 01); sugestao de linha `Cobertura perdida (G2)` no Summary do verify-work (DP-8); G13/DEV-plan-4 do
Plano 02 (`:nome` amplo vs Express) continua pendente para o Plano 04 fase-02.

**Compound candidates** (para `/lessons-learned`): duas pontas pelo mesmo seam (nao criar segundo leitor);
`absent` ≠ `unavailable` como decisao de produto (nada a perder vs irreconstruivel); metodo opcional em
interface + `not-applicable` visivel como padrao de extensao para adaptadores que chegam depois.
-->

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
<!-- Atualizado automaticamente durante execucao -->
