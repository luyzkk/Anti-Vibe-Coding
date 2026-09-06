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

- **DI-fase01-1: a mensagem literal do RED2 citou `readNextjsCoverageAtBase`, nao `isNextjsCoverageFile`.**
  O doc previa `SyntaxError: Export named 'isNextjsCoverageFile' not found`. O Bun reporta o primeiro
  export ausente que encontra, e a ordem do `import { ... }` no teste poe `readNextjsCoverageAtBase` antes.
  - Por que foi aceito: e o mesmo fenomeno (G5 / GT-fase02-1 — RED de compilacao total); so o nome no
    texto diverge. O executor reportou a divergencia em vez de fabricar a mensagem prevista.
  - Impacto: nenhum. Nao chutar o nome do export ao escrever o RED esperado de fases futuras — quem
    decide e a ordem do import, nao o doc.

- **DI-fase01-2: na mutacao 1 do RED-check, quem falha primeiro e `summary.g2.sources`, nao `calls.get('middleware.ts')`.**
  O checklist da fase previa a falha em `calls.get`. Com `isNextjsCoverageFile` sempre `false`, a assertion
  anterior (`sources` sem `middleware.ts`) ja derruba o teste.
  - Impacto: nenhum na defesa — o RED-check do orquestrador confirmou `2 fail` com a causa raiz certa
    (`flags G2 as triggered` + `reads each base file once`). Registrado para que o proximo RED-check nao
    leia isso como "falhou no lugar errado".

- **DI-fase02-1: a mutacao 6 do RED-check derruba `stillOpaque` com `Received length: 6`, nao `5`.**
  O checklist previa `Expected length: 0, Received length: 5` ao remover o `continue` do par
  `indeterminada → indeterminada`. O valor real e `6`.
  - Por que: aritmetica do doc, nao do codigo — a defesa dispara certo e a assertion e a prevista
    (`stillOpaque` esperando `0`).
  - Impacto: nenhum. Registrado junto com DI-fase01-2 pelo mesmo motivo: **os numeros previstos no
    checklist sao chute do planejador; o que vale e a assertion que quebra**. Nao ajustar codigo para
    fazer o numero do doc bater.

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

- **GT-fase01-1: os greps literais `switch` e ` as ` do checklist dao falso positivo.**
  `grep -n "switch"` casa o comentario-guarda `// Hash map em vez de switch (CLAUDE.md)` — pre-existente
  do Plano 01 fase-05, confirmado com `git show 01a069f:skills/security/lib/route-auth-matrix.ts`.
  `grep -n " as "` casa prosa em portugues em comentario ("as duas pontas", "as rotas").
  - Descoberto em: fase-01
  - Impacto: a verificacao util e por cast REAL —
    `grep -nE "\b[A-Za-z_$][A-Za-z0-9_$.)\]]* as [A-Z]"` nos 3 arquivos (deu vazio) e nas linhas `+` do
    commit (tambem vazio). NAO apagar o comentario nem reescrever a prosa para "limpar" o grep: o
    checklist e que e literal demais, o codigo esta certo.

- **GT-fase02-diff-bullet: `git diff | grep -c '^-[^-]'` NAO conta linha removida que e bullet markdown.**
  O checklist da fase-02 mandava conferir `git diff agents/security-auditor.md | grep -c '^-[^-]'` → `2`.
  O real e `1`. A primeira linha do bullet removido comeca com `- ` no arquivo; sob o marcador `-` do
  diff ela vira `-- Entrada em ...`, que o padrao `^-[^-]` exclui de proposito (o padrao existe para
  descartar o header `--- a/arquivo`).
  - Descoberto em: fase-02 (pelo executor, confirmado pelo orquestrador)
  - **Nao confundir com o `GT-fase02-1` do Plano 02** (import de valor novo = RED de compilacao no Bun).
  - Impacto: a verificacao correta do G13 e `git diff --stat <arquivo>` (mostrou `13 insertions(+), 2
    deletions(-)`) somada a leitura das linhas `^-` sem o header. Usar `grep -c '^-[^-]'` em arquivo
    markdown subconta remocoes e pode aprovar uma remocao indevida em silencio — o oposto do que o G13
    quer. Corrigir o padrao nas fases futuras que herdarem este checklist.

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

- **DEV-fase01-1 (executor): o teste de `verdictFor` (Passo 6) nasceu VERDE, sem RED.** O doc desenhava o
  Passo 6 como passo separado com RED de compilacao (import de valor novo, G5). O executor o acrescentou
  depois do Passo 5 ja compilar — `verdictFor` ja existia, e o teste passou de primeira.
  - Motivo/impacto: o teste nunca foi visto falhando, que e exatamente o modo de falha que o RED-check
    existe para pegar. O orquestrador cobriu com uma **6a mutacao, nao prevista no checklist**:
    `if (declared !== null && false)` em `verdictFor` → o teste FALHA com
    `Expected: "publica-declarada", Received: "DESCOBERTA"`; restaurado identico. A defesa e real.
  - Para as fases 02/03: manter o import de valor novo em passo separado ANTES de a producao existir —
    ou, se nascer verde, provar por mutacao no mesmo passo em vez de deixar para o orquestrador.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 2 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

**Contagens de teste (estimativa do planejamento — a real vai aqui se diferir):**

| Arquivo | Antes | fase-01 | fase-02 | fase-03 |
|---|---|---|---|---|
| `route-auth-matrix.test.ts` | 33 | 39 (+6) | 46 (+7) | 52 (+6) |
| `route-auth-nextjs.test.ts` | 34 | 39 (+5) | 39 | 40 (+1) |
| suite completa (`bun run test`) | 2033 | 2044 | 2051 | 2058 |

**fase-01 medida (2026-09-06, commit 2b743e6) — bateu com a estimativa, sem drift:**
`route-auth-matrix.test.ts` **39**, `route-auth-nextjs.test.ts` **39**, `skills/security/lib/` **119**,
suite completa **2044 pass / 0 fail** (lotes 1397 + 647; baseline medida antes da fase era 2033 = 1386 + 647).

**fase-02 medida (2026-09-06, commit 303769c) — tambem sem drift:**
`route-auth-matrix.test.ts` **46**, `route-auth-nextjs.test.ts` **39** (inalterado), `skills/security/lib/` **126**,
suite completa **2051 pass / 0 fail** (lotes 1404 + 647). `agents/security-auditor.md`: 13 insertions(+),
2 deletions(-) — as duas linhas do bullet stale e nada mais (G13 satisfeito).

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
