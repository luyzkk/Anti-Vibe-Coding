# Plano 03: G2 — cobertura perdida

**Feature:** Matriz Rota x Middleware de Auth no Auditor ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4.5h (igual ao PLAN.md — sem drift)
**Depende de:** Plano 02 (completo na branch `feat/route-auth-matrix-plano03`, PR #75 pendente: `readAtBase`/`BaseRead`, `parsePublicRoutes`, `delta`)
**Desbloqueia:** Plano 04 fase-04 (registro de adaptadores le DP-2 antes de registrar); nenhum outro plano depende deste

---

## O que este plano entrega

Ao final, um diff que **so** estreita o `config.matcher` (ou apaga o `middleware.ts`, ou tira uma entrada da
allowlist) deixa de passar em silencio: a lib reconstroi a cobertura na ponta ANTES do diff pelo mesmo
seam `readAtBase` que o Plano 02 criou, avalia cada rota nas duas pontas com o MESMO pipeline
(allowlist → `evaluateRoute`) e emite finding para toda rota existente que saiu de `coberta` ou
`publica-declarada` e hoje esta `DESCOBERTA` ou `indeterminada` — com a mesma regra de severidade (D9),
a mesma emissao (D8) e a description prefixada com `[cobertura perdida]` (CA-09). Onde a ponta "antes"
nao for reconstruivel (git falhou, `readAtBase` ausente, adaptador sem suporte), toda rota aberta fora
do G1 vira `indeterminada` MEDIO com o motivo — nunca silencio (RF-04/CA-10 estendidos ao G2).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Seam `AuditOptions.readAtBase?: (file) => BaseRead` com `BaseRead` de 3 estados (`found`/`absent`/`unavailable`) + `readAtBaseFromGit(targetDir, ref)` = merge-base → ls-tree → show, ja injetado pela CLI | Plano 02 fase-03 (DP-11 refinada, DI-fase03-2) | pronto — commits 10f7e89 / 7fcc8e9 / 61387f9 |
| `parsePublicRoutes(source, file)` pura + `diffAllowlist(before, after)` + `PUBLIC_ROUTES_FILE`; `computeAllowlistDelta` em `route-auth-matrix.ts` ja le a base UMA vez para o `delta` | Plano 02 fases 01/03 | pronto — e o que a fase-01 refatora para servir tambem o G2 |
| `summary.allowlist.delta.removed` (entrada que saiu da allowlist) — input do G2 (G18 do Plano 02) | Plano 02 fase-03 | pronto |
| `parseMatcherConfig(source, file)` PURA em `route-auth-nextjs.ts` — reconstroi cobertura a partir de TEXTO, sem I/O | Plano 01 fase-04 (DI-fase04-fixtures-inline) | pronto — e o que `readCoverageAtBase` do adaptador chama |
| `indeterminada` emite `medium` (`SEVERITY_BY_VERDICT`, `DESCRIPTION_BY_VERDICT`) e `toContractIssue` monta a description por veredito | Plano 02 fase-03 (DP-10) | pronto — G2 reusa sem severidade especial |
| Fixture `tests/fixtures/route-auth-matrix/nextjs-minimal/` (6 rotas, matcher `/dashboard/:path*`) e `nextjs-allowlist/` (health + stripe declaradas, admin sem reason, sem middleware) | Planos 01/02 | pronto — nenhuma fixture nova neste plano (DP-9) |
| Secao 11 do `agents/security-auditor.md` com o bullet `delta.removed ... o G2 (Plano 03) fecha` | Plano 02 fase-03 | pronto no checkout; ausente no cache do plugin (G1) |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Metodos OPCIONAIS em `RouteAdapter`: `isCoverageFile?(file): boolean` e `readCoverageAtBase?(read): CoverageMap \| { unavailable: string }` (DP-2) | Plano 04 fases 01/02/03: cada adaptador DECIDE se implementa. Sem os dois metodos, G2 sai `before: 'not-applicable'` com nota visivel — nunca silencio, nunca `coberta`. Fase-04 do Plano 04 le DP-2 antes de registrar adaptadores |
| `RouteVerdict.trigger?` / `RouteFinding.trigger?: 'G1' \| 'G2'` (DP-4) e prefixo `[cobertura perdida]` na description (DP-4) | Plano 04 (relatorio por stack), `verify-work` (a description ja carrega o marcador — sem mudanca de skill neste plano, DP-8) |
| `AuditSummary.g2: G2Summary` (`triggered`, `sources`, `before`, `lost`, `indeterminate`, `reason?`) e `evaluated` = G1 + G2 (DP-7) | Plano 04 fase-04 (summary por stack); secao 11 do agente (bullets a–d da DP-8) |
| `verdictFor(route, coverage, allowlist)` — a UNICA forma de produzir veredito (allowlist antes do motor), usada nas duas pontas (DP-3) | Plano 04 fase-04 (loop multi-stack chama uma funcao, nao duplica o pipeline) |
| `AuditOptions.adapter?: RouteAdapter` — seam de teste com default `nextjsAdapter` (fase-03, G14) | Plano 04 fase-04 decide se vira selecao por `detectStack()` ou continua seam |
| Convencao de sufixo `@base` em `file`/`sources` da ponta antes (`middleware.ts@base`, `anti-vibe.public-routes.json@base`) (DP-2, G6) | Plano 04: cada adaptador que implementar `readCoverageAtBase` usa o mesmo sufixo |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-cobertura-nas-duas-pontas-do-diff.md | Adaptador Next com `isCoverageFile`/`readCoverageAtBase` (puro sobre `BaseRead`); `auditRouteCoverage` reconhece o gatilho G2, le a base UMA vez, reconstroi `coverageBefore` + `allowlistBefore`, extrai `verdictFor` e expoe `summary.g2` (`triggered/sources/before`, `lost: 0`) — sem emitir finding G2 | 1.5h | — |
| 02 | fase-02-delta-e-veredito-cobertura-perdida.md | Conjunto G2 (rota fora do G1 que era `coberta`/`publica-declarada` e agora esta aberta) entra em `verdicts`/`findings` com `trigger: 'G2'`, mesma severidade e emissao; `[cobertura perdida]` na description; `evaluated` = G1 + G2; `g2.lost` fecha; agente ganha bullets a/b (CA-09 + allowlist removida + middleware deletado no diff; rota `indeterminada` na base que ficou aberta vira `indeterminada` G2 — DP-4 emendada) | 1.5h | fase-01 |
| 03 | fase-03-ponta-antes-irreconstruivel.md | Base `unavailable` (git falhou, `readAtBase` lancou ou ausente) → toda rota nao-G1 aberta vira `indeterminada` MEDIO com o motivo; `absent` = nada a perder (o caso inverso, middleware deletado, foi para a fase-02); adaptador sem suporte → `not-applicable` com nota; seam `adapter?`; agente ganha bullets c/d (RF-04/CA-10 estendidos ao G2) | 1.5h | fase-02 |

---

## Grafo de Fases

```
fase-01 (gatilho G2 + duas pontas + summary.g2)
    |
    v
fase-02 (delta rota a rota → finding [cobertura perdida], CA-09)
    |
    v
fase-03 (ponta antes irreconstruivel → indeterminada medio; absent; not-applicable)
```

**Paralelismo possivel:** nenhum dentro do plano. As tres fases editam o MESMO trecho de
`auditRouteCoverage` em `route-auth-matrix.ts` e o mesmo `route-auth-matrix.test.ts`; duas delas editam a
secao 11 do `security-auditor.md`. Entre planos: o **Plano 04 pode correr em paralelo** (ele implementa
`RouteAdapter` contra o contrato congelado), **mas a fase-04 dele (registro de adaptadores) deve ler a DP-2
deste plano antes de registrar** — os metodos `isCoverageFile`/`readCoverageAtBase` sao opcionais, e o
adaptador que nao os implementar precisa saber que vai sair `not-applicable` com nota, nao `coberta`.

---

### Política de fases (perfil-aware)

**Granularidade:** Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)
**Critério de fase atômica:** Testável, atomicamente revertível, sizing 30min-2h
**Exemplo de nome de fase:** `fase-02-implementar-X`

**Evitar:**
- Fase de mais de 2h
- Fase que toca mais de 5 arquivos

> Excecao declarada (mesmo criterio dos Planos 01/02: manifest e gerado, nao escrito):
> - **fase-01** toca 5 arquivos de codigo/teste + manifest. Tipos, adaptador e motor sao a mesma fatia
>   (o adaptador reconstroi a base, o motor a consome, o tipo liga os dois) — separar deixaria um metodo
>   opcional sem chamador ou um chamador sem metodo.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error — ver G5 para a excecao)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test ; bun run typecheck   (comandos SEPARADOS — ver G12)
```

Filtro de teste neste repo: `bun test <arquivo> -t '<regex do nome>'` (flag `-t`, nao `--grep`).
Suite completa: `bun run test` (roda em lotes — o total real e a soma dos lotes; hoje 2033 pass / 0 fail).
Typecheck: `bun run typecheck` (tsc strict, `exactOptionalPropertyTypes` e `noUncheckedIndexedAccess`
ligados). **`bun run lint` nao existe** (G12). Contrato dos agentes: `bun run agents:contract`.

**Teste primeiro, por desenho e por gate:** `hooks/tdd-gate.cjs` bloqueia `Write/Edit` de `.ts` de
producao sem teste colocalizado. Todos os `.ts` deste plano ja tem `.test.ts` ao lado — a ordem e:
acrescentar o teste, ver o RED, depois editar o `.ts`.

**Duas pontas sem fixture nova (DP-9):** a ponta "antes" vem pelo seam `readAtBase` devolvendo TEXTO de
middleware (`{ status: 'found', source: middlewareSource(['/api/:path*']) }`); a ponta "depois" vem por
`coverageOverride` ou pela fixture `nextjs-minimal` existente. Nenhum `middleware.ts` novo em `tests/`
(G1). Helper de teste `middlewareSource(patterns)` monta `export const config = { matcher: [...] }`.

**Testes sem import novo primeiro, imports novos em passo separado (GT-fase02-1, G5):** em cada fase,
os testes que so leem campos novos (`summary.g2`, `trigger`) sao escritos ANTES e dao RED por assertion
(`Received: undefined` / `Received length: 0`). Testes que importam simbolo novo (`verdictFor`,
`isNextjsCoverageFile`, `readNextjsCoverageAtBase`) entram num segundo passo, com o RED de compilacao
aceito e a defesa provada no RED-check pos-GREEN.

**RED-check do orquestrador (obrigatorio em toda fase):** depois do GREEN, mutar o alvo nomeado no
checklist da fase e ver o teste FALHAR com a mensagem prevista; restaurar; ver passar. Um teste que
continua verde com a defesa removida nao esta testando a defesa (BUG-fase01-1 do Plano 01).

**Teste de abuso antes da defesa (PRD "Casos de abuso"):** CA-09 e escrito na fase-02 ANTES do
`lostCoverage` existir — o RED e `Expected length: 3, Received length: 0`, exatamente o silencio que o
G2 existe para quebrar. Na fase-03, `never stays silent when the base coverage cannot be reconstructed`
e escrito ANTES do ramo `irreconstruivel`.

**Tracer Bullet deste plano:** N/A (o tracer bullet do PRD foi a fase-01 do Plano 01).

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-05 pelo orquestrador do `/plan-feature` (sessao autonoma — o dev NAO esta presente
para gates intermediarios; ele veta na revisao do PR). As fases **implementam** estas decisoes; nao as
reabrem, nao param para confirmar.

- **DP-1 Gatilho G2.** G2 dispara quando o diff toca um ARQUIVO DE COBERTURA — `adapter.isCoverageFile(f)`
  para algum `f` em `changedFiles` — OU quando `PUBLIC_ROUTES_FILE` esta em `changedFiles` (entrada
  removida da allowlist e estreitamento de cobertura, G18 do Plano 02). Para o Next,
  `isCoverageFile = (f) => f === 'middleware.ts'` (igualdade exata, POSIX vindo do git).
- **DP-2 Extensao ADITIVA e OPCIONAL de `RouteAdapter`.** Dois metodos opcionais:
  `isCoverageFile?(file: string): boolean` e
  `readCoverageAtBase?(read: (file: string) => BaseRead): CoverageMap | { unavailable: string }`.
  O adaptador Next implementa: le `MIDDLEWARE_FILE` via `read`; `found` →
  `parseMatcherConfig(source, 'middleware.ts@base')` com `sources: ['middleware.ts@base']`; `absent` →
  `{ rules: [], sources: [], notes: ['middleware.ts ausente na base — nenhuma cobertura a perder'] }`
  (sem middleware antes = nenhuma cobertura antes); `unavailable` → `{ unavailable: reason }`.
  Adaptador SEM os dois metodos (o Plano 04 pode nao implementar de cara) → G2 `not-applicable` com nota
  visivel `adaptador <stack> sem suporte a G2` — nunca silencio, nunca `coberta`. O sufixo `@base` segue
  a convencao do Plano 02 (`anti-vibe.public-routes.json@base`).
- **DP-3 Duas pontas, mesmo pipeline.** `verdictFor(route, coverage, allowlist)` e extraida do map do G1
  (allowlist casa → `publica-declarada`; senao `evaluateRoute`) e passa a ser a UNICA forma de produzir
  veredito. `verdictBefore = verdictFor(route, coverageBefore, allowlistBefore)`; `verdictAfter` = o que
  ja existe. `allowlistBefore` vem de `parsePublicRoutes(read(PUBLIC_ROUTES_FILE).source, '...@base')`
  (ou `[]` se `absent`) — REUSANDO a leitura que `computeAllowlistDelta` ja faz: refatorar para
  `readAllowlistAtBase(read)` (le UMA vez) e derivar `delta` e `allowlistBefore` dela, sem segunda chamada
  ao seam. Se a allowlist NAO esta no diff, `allowlistBefore = allowlist.entries` (nada mudou). Se o
  arquivo de cobertura NAO esta no diff, `coverageBefore = coverage` (idem). **`evaluateRoute` NAO muda.**
- **DP-4 Conjunto G2 (emendada).** Rotas NAO pertencentes ao G1 (arquivo nao esta em `changedFiles`) cujo
  `verdictBefore` ∈ {`coberta`, `publica-declarada`, `indeterminada`} e `verdictAfter` ∈ {`DESCOBERTA`, `indeterminada`},
  excluindo o par `indeterminada` → `indeterminada` (nao e mudanca). **Emenda do orquestrador (2026-09-05, revisao
  do plano):** a DP original exigia `coberta`/`publica-declarada` antes. Base com matcher COMPUTADO da `indeterminada`
  antes; se a rota esta `DESCOBERTA` agora e o arquivo dela nao esta no diff, exclui-la seria aprovacao tacita por
  incapacidade — o modo de falha que RF-04 e a Decisao 8 proibem. Ela ENTRA no G2, mas com veredito
  `indeterminada` (medium), porque nao da para provar que era coberta:
  `verdict = was.verdict === 'indeterminada' ? 'indeterminada' : now.verdict`. O dev pode vetar no PR (voltar a
  `LOST_FROM` de dois elementos e remover um teste).
  Entram em `evaluated` e em `verdicts`/`findings` com a MESMA regra de severidade (D9) e emissao (D8) —
  nao ha severidade especial para "perdida". `RouteVerdict` e `RouteFinding` ganham campo opcional
  aditivo `trigger?: 'G1' | 'G2'` (o motor sempre preenche; `evaluateRoute` puro nao). `evidence`/`missing`
  de G2 leva as duas pontas: `cobertura perdida — antes: <evidenceBefore>; agora: <evidenceAfter>`.
  `toContractIssue` prefixa `[cobertura perdida] ` na description quando `trigger === 'G2'`.
- **DP-5 Ponta "antes" irreconstruivel (fase-03).** PRD: "Onde a ponta antes nao for reconstruivel, o
  veredito e `indeterminada` — nunca silencio." Se G2 disparou e `readCoverageAtBase` devolveu
  `unavailable` (ou `readAtBase` ausente/lancou): toda rota NAO-G1 com `verdictAfter` ∈ {`DESCOBERTA`,
  `indeterminada`} passa a `indeterminada` com `trigger: 'G2'` e evidence
  `ponta 'antes' irreconstruivel (<reason>) — nao da para saber se <path> perdeu cobertura neste diff`,
  emitida como `medium` (D8). Rotas `coberta`/`publica-declarada` HOJE nao sao tocadas. Se so a allowlist
  disparou G2 e a base dela e `unavailable`, a mesma regra vale usando o `reason` do `delta`. **Aplicacao
  de planejamento:** `not-applicable` com `triggered: true` (adaptador sem suporte, allowlist no diff)
  recebe a MESMA consequencia — a ponta antes e irreconstruivel por definicao — com `reason`
  `adaptador <stack> sem suporte a G2`.
- **DP-6 Base ausente ≠ irreconstruivel.** `absent` = havia ZERO cobertura antes → nada pode ter sido
  perdido → conjunto G2 vazio, `summary.g2.before = 'resolved'`, nota
  `middleware.ts ausente na base — nenhuma cobertura a perder` (vem do adaptador, mesclada em
  `summary.notes`). Middleware DELETADO no diff (existe na base, ausente agora) e o caso inverso e cai
  naturalmente: `readCoverage` atual devolve `rules: []`, tudo que era `coberta` vira `DESCOBERTA` com
  `trigger: 'G2'`.
- **DP-7 Summary aditivo.** `AuditSummary.g2: G2Summary` com
  `{ triggered: boolean; sources: string[]; before: 'resolved' | 'unavailable' | 'not-applicable'; lost: number; indeterminate: number; reason?: string }`
  (`sources` = arquivos de cobertura e/ou allowlist que estavam no diff, cobertura primeiro; `lost` = G2
  com `DESCOBERTA`; `indeterminate` = G2 com `indeterminada`; `reason` so quando `before !== 'resolved'`).
  `triggered: false` com adaptador suportado → `before: 'resolved'` (a ponta antes E a ponta depois: nada
  de cobertura mudou). `evaluated` passa a contar G1 + G2. `scope` continua `'diff'`. A nota
  `'escopo G1 sem rotas: o diff nao tocou arquivo de rota (cobertura perdida e o Plano 03)'` e
  SUBSTITUIDA por `'escopo G1 sem rotas: o diff nao tocou arquivo de rota'` — `summary.g2` fala por si;
  nota de lib nao esta sob "nunca diminuir".
- **DP-8 Agente e relatorio (ADITIVO — G13).** `agents/security-auditor.md` secao 11 ganha bullets:
  (a) `summary.g2.triggered`, `sources` e `lost` devem ser citados em `reasoning`; (b) issue com
  `[cobertura perdida]` e rota EXISTENTE que ficou aberta por mudanca no matcher/allowlist — nao e
  "rota nova", e o revisor precisa olhar o diff do `middleware.ts`/allowlist; (c)
  `summary.g2.before: "unavailable"` = a lib NAO conseguiu ler a base — os `indeterminada` medium dai NAO
  sao aprovacao; (d) `before: "not-applicable"` com `triggered: true` = adaptador sem suporte a G2 —
  dizer isso literalmente. O bullet existente `delta.removed ... o G2 (Plano 03) fecha` fica FALSO apos a
  fase-02 e e corrigido (unica linha `-` permitida — ver G13). `skills/verify-work/SKILL.md` NAO muda
  neste plano: o relatorio ja lista issues por severidade e a description carrega `[cobertura perdida]`.
  *Sugestao registrada, nao fase:* uma linha `- Cobertura perdida (G2): {triggered → N lost / M indeterminate | not-applicable | n/a}`
  no Summary do `verify-work` ajudaria o leitor a ver o G2 sem abrir a tabela — fica para um PR de docs
  ou para a fase-04 do Plano 04, que ja mexe no summary por stack.
- **DP-9 Nada de fixture nova.** CA-09 e coberto com `nextjs-minimal` + `changedFiles: ['middleware.ts']`
  + `readAtBase: () => ({ status: 'found', source: middlewareSource(['/api/:path*']) })` +
  `coverageOverride: coverage(['/api/preferences'])` (depois). Esperado: G2 = `GET /api/admin` (critical,
  marcador), `DELETE /api/users/[id]` (critical, mutante), `GET /api/users/[id]` (high); `/api/preferences`
  continua `coberta` (nao aparece); `/docs/[...slug]` e `/pricing` eram DESCOBERTA antes e depois → NAO
  entram (nao perderam nada). Helper `middlewareSource(patterns: string[]): string` monta o texto
  `export function middleware() {}\nexport const config = { matcher: [...] }` — o matcher fica na linha 2,
  entao a evidence "antes" e `middleware.ts@base:2 casa <path>`.
- **DP-10 Ordem G1/G2 em `findings`.** A ordenacao existente (severidade, depois path) permanece;
  `trigger` NAO reordena. Ids `ROUTE-*` continuam sequenciais na lista combinada.

---

## Gotchas Conhecidos

Numeracao propria deste plano. Onde o gotcha e herdado, a origem esta citada com a numeracao de la.

- **G1 — Cache do plugin defasado → NENHUMA fixture com `middleware.ts`** (herda G1 e G12 do Plano 02).
  O TDD gate em execucao vem do cache `7.7.0`, cujo `SKIP_PATTERN` nao tem `fixtures/`: `Write/Edit` em
  `tests/fixtures/**/middleware.ts` e BLOQUEADO. Regra desta execucao: NAO contornar trocando de
  ferramenta. Por isso a ponta "antes" vem pelo seam `readAtBase` devolvendo TEXTO
  (`middlewareSource(...)`) e a ponta "depois" por `coverageOverride` ou pela fixture `nextjs-minimal`
  existente (DP-9). O cache tambem nao tem a lib nem a secao 11 do agente — criterios "por humano" ficam
  pendentes de `scripts/sync-to-global.sh` (Git Bash); registrar como divida, nao como falha.
- **G2 — Manifest no MESMO commit** (herda G2 do Plano 02). `route-auth-matrix.ts`,
  `route-auth-matrix.types.ts`, `route-auth-nextjs.ts` e `agents/security-auditor.md` sao rastreados por
  `plugin-manifest.json`; `.test.ts`, `tests/` e `docs/` nao. Toda fase deste plano toca arquivo rastreado
  → `bun run generate:manifest` no mesmo commit. Revisar o diff do manifest pelo checksum, nao pela data
  (GT-fase01-2 do Plano 01).
- **G3 — `exactOptionalPropertyTypes` ligado** (herda G3 do Plano 02). Vale para `trigger?` em
  `RouteVerdict`/`RouteFinding`, `reason?` em `G2Summary` e `delta?` em `AllowlistSummary`. Nunca
  `reason: undefined`; spread condicional: `...(before.kind === 'resolved' ? {} : { reason: before.reason })`.
  Ao propagar `trigger` de verdict para finding: `...(v.trigger !== undefined ? { trigger: v.trigger } : {})`
  — ou preencher SEMPRE no motor (o que a DP-4 manda: o motor sempre sabe qual gatilho).
- **G4 — `noUncheckedIndexedAccess` ligado** (herda G4 do Plano 02). `findings[0]?.trigger`,
  `verdicts[0]?.evidence`; nunca `xs[0]!`.
- **G5 — Import novo num arquivo de teste existente = RED de compilacao TOTAL** (GT-fase02-1 do Plano 02).
  O Bun recusa o modulo de teste inteiro se um export importado nao existe. Cada fase separa: (1) testes
  que so leem campos novos (`summary.g2`, `trigger`) — RED por assertion; (2) testes que importam simbolo
  novo (`verdictFor`, `isNextjsCoverageFile`, `readNextjsCoverageAtBase`) — segundo passo, RED de
  compilacao aceito, defesa provada no RED-check pos-GREEN. Na fase-03 nao ha import de valor novo
  (`RouteAdapter` e `import type`, apagado em runtime) — RED por assertion em tudo.
- **G6 — Sufixo `@base` em `file`/`sources` da ponta antes.** `parseMatcherConfig(source, 'middleware.ts@base')`
  e `parsePublicRoutes(source, 'anti-vibe.public-routes.json@base')`. No relatorio, a evidence "antes"
  (`middleware.ts@base:2 casa /api/admin`) deixa claro que a linha e da versao antiga. Nao "limpar" o
  sufixo: ele e a unica coisa que distingue as duas pontas no texto do finding.
- **G7 — Middleware DELETADO no diff e o inverso do `absent`** (DP-6). Base `found` com regras, HEAD sem
  arquivo → `readNextjsCoverage` devolve `rules: []` + nota `middleware.ts nao encontrado na raiz` → toda
  rota que era `coberta` vira `DESCOBERTA` com `trigger: 'G2'`. Nao precisa de codigo especial; precisa
  de TESTE (fase-02 — a fase-03 so trava o `absent`) para que ninguem "otimize" o caso depois. Em teste, o "depois" e
  `coverageOverride: { stack: 'nextjs', rules: [], sources: [], notes: [...] }`.
- **G8 — Rota do G1 que TAMBEM perdeu cobertura conta UMA vez, como G1** (DP-4). `lostCoverage` pula
  `changed.has(route.file)`. Sem isso, `changedFiles: ['middleware.ts', 'app/api/admin/route.ts']`
  emitiria dois `ROUTE-*` para a mesma rota. Teste dedicado na fase-02.
- **G9 — Proxy G13 do Plano 01 vale nas DUAS pontas.** `parseMatcherConfig` sem `config`/`matcher` devolve
  `/:path*` (cobertura total por proxy — prova que o middleware roda, nao que autentica). Na ponta antes
  isso significa: base com middleware SEM matcher e HEAD com matcher estreito → TODAS as rotas fora do
  matcher novo saem como "perdidas". E o comportamento certo (o diff de fato estreitou), mas a nota de
  proxy precisa aparecer tambem para a base: `readNextjsCoverageAtBase` acrescenta
  `middleware.ts@base sem config.matcher — cobertura por proxy` em `notes`, e o motor mescla em
  `summary.notes`.
- **G10 — `git` em shallow clone / ref invalida → `unavailable`, nunca `absent`.** `git merge-base <ref> HEAD`
  falha com exit != 0 quando o merge-base nao esta no clone (CI com `fetch-depth: 1`) ou a ref nao existe;
  `readAtBaseFromGit` ja devolve `{ status: 'unavailable', reason: stderr }`. No G2 isso vira
  `before: 'unavailable'` + `indeterminada` medium por rota aberta (DP-5). E ruido esperado em CI shallow
  — a defesa e o `reason` visivel, nao rebaixar. Ver tambem BUG-fase03-1/DI-fase03-2 do Plano 02: "ausente"
  e decidido por `ls-tree`, nao por mensagem de erro.
- **G11 — `skills/verify-work/SKILL.md` NAO muda neste plano** (DP-8). O relatorio ja lista `issues` por
  severidade e a description traz `[cobertura perdida]`. Nao acrescentar secao nova no template sem
  pedido; a sugestao de linha no Summary esta registrada na DP-8 como sugestao, nao como fase.
- **G12 — `bun run lint` NAO existe; verificacoes SEPARADAS** (herda G11 do Plano 02). O equivalente e
  `bun run typecheck`. `a && b | tail` mente sobre exit code — um comando por linha, lido ate o fim.
- **G13 — "Nunca diminuir" no agente, com UMA excecao declarada** (herda G9 do Plano 02). Edicoes na secao
  11 sao ADITIVAS — exceto o bullet do Plano 02 `Entrada em delta.removed ... a lib nao a reavaliou nesta
  versao (escopo G1) — aponte isso no bloco; o G2 (Plano 03) fecha`, que fica FALSO apos a fase-02 e e
  corrigido no lugar (uma linha `-`, o resto `+`). Afirmacao falsa no agente e pior que uma linha
  removida. `git diff agents/security-auditor.md` da fase-02 deve mostrar exatamente essa remocao e nada
  mais em `-`.
- **G14 — `not-applicable` precisa de adaptador injetavel para ser testado.** `auditRouteCoverage`
  hardcoda `nextjsAdapter`, que TEM suporte a G2. Para exercitar o ramo "adaptador sem os metodos" sem
  esperar o Plano 04, a fase-03 acrescenta `AuditOptions.adapter?: RouteAdapter` (seam de teste, default
  `nextjsAdapter`, mesma natureza de `coverageOverride`). Registrado para o Plano 04 fase-04 decidir se o
  seam vira selecao por `detectStack()` ou continua opcional. Nao e a selecao multi-stack (RF-06) — e so
  o que torna DP-2 testavel.
- **G15 — Estreitar `CoverageMap | { unavailable: string }` sem `as`.** Type guard em
  `route-auth-matrix.types.ts`: `isCoverageUnavailable(value): value is { unavailable: string }` via
  `'unavailable' in value`. `CoverageMap` nao tem essa chave, entao o `in` narrowing e exato. O repo
  proibe `as` — nao trocar por assercao.
- **G16 — A base e lida UMA vez por arquivo** (DP-3). `safeBaseReader(opts.readAtBase)` embrulha o seam
  (ausente → `unavailable` com `readAtBase ausente`; lancou → `unavailable` com a mensagem) e e passado
  tanto para `readAllowlistAtBase` quanto para `adapter.readCoverageAtBase`. Teste da fase-01 conta as
  chamadas por arquivo (`1` para `anti-vibe.public-routes.json`, `1` para `middleware.ts`). Um
  `readAtBase` com `git` real custa 3 processos por chamada — chamar duas vezes dobra o custo e abre
  espaco para dois resultados diferentes da mesma base.
- **G17 — `isCoverageFile` e igualdade exata com `'middleware.ts'`, e isso e coerente com `readCoverage`.**
  `readNextjsCoverage` so le `middleware.ts` na RAIZ; `src/middleware.ts` nao e lido hoje. Logo
  `isCoverageFile('src/middleware.ts')` deve devolver `false` — reconhecer um arquivo que o adaptador nao
  le produziria G2 com `coverageBefore` vazia e falsos "perdidos". Se um dia `readCoverage` passar a ler
  `src/`, os dois mudam juntos. `changedFiles` vem POSIX do git (G15 do Plano 02); sem normalizacao.
- **G18 — `unavailable` em G2 e ruidoso POR DESENHO.** Com `readAtBase` falhando, toda rota aberta fora do
  G1 vira `indeterminada` medium — num projeto com 40 rotas descobertas, sao 40 issues `medium`. E a
  Decisao 8 do PRD aplicada ao G2 ("ruido visivel ganha de silencio que parece aprovacao"). Nao filtrar,
  nao agrupar, nao rebaixar. O agente explica (bullet c da DP-8).
- **G19 — `bun run typecheck` FALHA na janela RED por desenho** (herda G17 do Plano 02). O teste referencia
  `summary.g2` / `f.trigger` / `opts.adapter` antes de existirem. `bun test` nao typechecka, entao o RED e
  assertion; o `tsc` so precisa ficar verde depois do GREEN.
- **G20 — `summary.evaluated` muda de semantica (G1 + G2) sem quebrar teste existente.** O teste
  `evaluates only routes whose files are in changedFiles` usa `changedFiles: ['app/api/admin/route.ts']`
  — G2 nao dispara, `evaluated` continua 1. O nome do teste fica levemente desatualizado; nao renomear
  (o comportamento que ele prova continua verdadeiro para o caso que ele cobre).
- **G21 — Testes de CA-07 do Plano 02 passam a disparar G2 (allowlist no diff) sem quebrar.** Com
  `ALLOWLIST_IN_DIFF` e base `{"routes":[]}`, `allowlistBefore` e vazia → nenhuma rota era
  `publica-declarada` antes → conjunto G2 vazio. Com base `unavailable` (`never stays silent when the base
  is unavailable`), a fase-03 passa a emitir `indeterminada` G2 para `/api/admin` — o teste antigo so le
  `summary.allowlist` e continua verde. Rodar a suite inteira do arquivo apos cada fase, nao so o `-t`.

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
