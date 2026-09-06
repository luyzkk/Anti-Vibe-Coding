# Plano 02: Allowlist e veredictos completos

**Feature:** Matriz Rota x Middleware de Auth no Auditor ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h (o PLAN.md registra ~3h — ver G10; a divergencia esta em MEMORY "Desvios do Plano")
**Depende de:** Plano 01 (completo: contrato congelado, motor `evaluateRoute`, CLI com `--ref`)
**Desbloqueia:** Plano 03 (G2 — consome `readAtBase` e `summary.allowlist.delta`); Plano 04 ja pode correr em paralelo a este

---

## O que este plano entrega

Ao final, `anti-vibe.public-routes.json` na raiz do projeto auditado e a UNICA forma de declarar uma rota
publica — versionada, revisavel em PR e fail-closed: arquivo ausente, JSON invalido, entrada sem `reason`
ou entrada ampla (`/api/*`) nunca viram "pode tudo". Os quatro veredictos do PRD ficam completos e com
consequencia fixa: `publica-declarada` entra na contagem sem finding, `indeterminada` deixa de ser rodape
e vira finding **MEDIO** (D8), entrada ampla vira finding proprio **ALTO** (AB-1), e toda mudanca na
allowlist aparece em bloco destacado do relatorio, separada dos demais findings, exigindo olhar humano (AB-4).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato congelado em `skills/security/lib/route-auth-matrix.types.ts` (`Route`, `Verdict` ja inclui `publica-declarada`, `RouteFinding.verdict` ja aceita `indeterminada`) | Plano 01 fase-02 | pronto |
| Motor `evaluateRoute` + `auditRouteCoverage(targetDir, { changedFiles, coverageOverride })` + `toContractIssue` + CLI `--ref` / `changedFilesFromGit` em `route-auth-matrix.ts` | Plano 01 fase-05 | pronto (16 testes verdes em `route-auth-matrix.test.ts`; 71 em `skills/security/lib/`) |
| Seam `coverageOverride` (evita fixture de `middleware.ts`, que o gate barra — G1) | Plano 01 fase-05 | pronto |
| Estilo de parser puro sobre texto: `parseMatcherConfig(source, file)` em `route-auth-nextjs.ts` | Plano 01 fase-04 (DI-fase04-fixtures-inline) | pronto — `parsePublicRoutes(source, file)` segue o mesmo desenho |
| Secao 11 do `agents/security-auditor.md` (comando unico via Bash, `--ref`, `blocked`) | Plano 01 fases 01/05 | pronto no checkout; **ausente no cache do plugin** (G12) |
| Fixture `tests/fixtures/route-auth-matrix/nextjs-minimal/` (6 rotas, matcher `/dashboard/:path*`, sem allowlist) | Plano 01 | pronto — e a fixture "allowlist ausente" deste plano |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Seam `AuditOptions.readAtBase?: (file) => BaseRead` (leitura de um arquivo no merge-base do diff) + `readAtBaseFromGit(targetDir, ref)` na CLI | Plano 03 fase-01 le `middleware.ts` nas duas pontas com o MESMO seam — nao criar um segundo |
| `summary.allowlist.delta.removed` (rota que perdeu a declaracao de publica sem estar no diff) | Plano 03 (G2): entrada removida da allowlist e estreitamento de cobertura — entra no conjunto avaliado la (G18) |
| `matchAllowlist(route, entries)` stack-agnostico sobre `Route.path` + veredito `publica-declarada` produzido ANTES do motor | Plano 04: os tres adaptadores ganham allowlist de graca, sem codigo por stack (atencao a G13 no Express) |
| `AuditSummary.publicaDeclarada`, `AuditSummary.allowlist`, `AuditResult.allowlistFindings`, ids `ALLOW-*` | Plano 03 e 04 (relatorio); `verify-work` Step 3 |
| Lib `skills/security/lib/public-routes-allowlist.ts` (`PUBLIC_ROUTES_FILE`, `parsePublicRoutes`, `readPublicRoutes`, `matchAllowlist`, `isWideEntry`, `diffAllowlist`) | Plano 03 (delta), Plano 04 (nenhuma mudanca esperada) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-parser-allowlist-fail-closed.md | Lib `public-routes-allowlist.ts` (parser puro fail-closed, leitura na raiz, match exato), veredito `publica-declarada` antes do motor, `summary.allowlist` + `publicaDeclarada`, texto do finding DESCOBERTA cita a allowlist (CA-03, CA-04b) | 1.5h | — |
| 02 | fase-02-amplitude-de-curinga-e-reason.md | Entrada ampla recusada + `AllowlistFinding high` proprio, ids `ALLOW-*` antes de `ROUTE-*`, duplicata recusada (CA-04; fecha CA-04b) | 1h | fase-01 |
| 03 | fase-03-destaque-mudanca-e-indeterminada-medio.md | `indeterminada` emite MEDIO (CA-10); allowlist no diff → `changed` + `delta` via `readAtBase`, nunca silencio; bloco destacado no agente e no relatorio do `verify-work` (CA-07) | 1.5h | fase-02 |

---

## Grafo de Fases

```
fase-01 (parser fail-closed + publica-declarada)
    |
    v
fase-02 (amplitude → ALLOW-* high; duplicata)
    |
    v
fase-03 (indeterminada → medium; changed/delta; bloco destacado)
```

**Paralelismo possivel:** nenhum dentro do plano. As tres fases editam `route-auth-matrix.ts` e
`route-auth-matrix.test.ts` (e duas delas a secao 11 do `security-auditor.md`) — rodar duas em paralelo
e conflito de merge garantido no mesmo trecho de `auditRouteCoverage`. Entre planos: o **Plano 04 pode
correr em paralelo a este** desde ja (ele implementa `RouteAdapter` contra o contrato congelado e nao
toca `auditRouteCoverage`); o Plano 03 espera este plano fechar, porque consome `readAtBase` e
`summary.allowlist.delta`.

---

### Política de fases (perfil-aware)

**Granularidade:** Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)
**Critério de fase atômica:** Testável, atomicamente revertível, sizing 30min-2h
**Exemplo de nome de fase:** `fase-02-implementar-X`

**Evitar:**
- Fase de mais de 2h
- Fase que toca mais de 5 arquivos

> Excecoes declaradas (mesmo criterio do Plano 01: fixture e dado, manifest e gerado):
> - **fase-01** toca 6 arquivos de codigo/agente + 4 de fixture + manifest. A fixture
>   `nextjs-allowlist` e um JSON e tres `route.ts` de tres linhas; o manifest e regenerado.
> - **fase-03** toca 7 arquivos: 4 de lib/teste + agente + `verify-work/SKILL.md` + manifest. Agente e
>   skill sao o MESMO caminho de emissao (o bloco destacado nasce no agente e e reproduzido no
>   relatorio) — separar em duas fases deixaria um estado intermediario em que o agente emite um bloco
>   que o relatorio ignora.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test ; bun run typecheck   (comandos SEPARADOS — ver G11)
```

Filtro de teste neste repo: `bun test <arquivo> -t '<regex do nome>'` (flag `-t`, nao `--grep`).
Suite completa: `bun run test` (roda em lotes — o total real e a soma dos lotes). Typecheck:
`bun run typecheck` (tsc strict). **`bun run lint` nao existe** (G11).

**Teste primeiro, por desenho e por gate:** `hooks/tdd-gate.cjs` bloqueia `Write/Edit` de `.ts` de
producao sem teste colocalizado. `public-routes-allowlist.test.ts` e criado ANTES de
`public-routes-allowlist.ts` (fase-01, Passo 1). Fixtures `.json` e `route.ts` passam pelo gate;
`middleware.ts` NAO — por isso nenhuma fixture deste plano tem `middleware.ts` (G1).

**RED-check do orquestrador (obrigatorio em toda fase):** depois do GREEN, remover/reverter o alvo
nomeado no checklist e ver o teste FALHAR com a mensagem prevista; restaurar; ver passar. No Plano 01
varios testes passaram pelo motivo errado ate esse check (BUG-fase01-1). Um teste que continua verde
com a defesa removida nao esta testando a defesa.

**Tracer Bullet deste plano:** N/A (o tracer bullet do PRD foi a fase-01 do Plano 01).

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-05 pelo orquestrador do `/plan-feature` com o dev. As fases **implementam** estas
decisoes; nao as reabrem. Duas (DP-11 e DP-12) foram **refinadas nesta etapa de planejamento** com
evidencia do codebase — o refinamento esta marcado e registrado em MEMORY "Desvios do Plano".

- **DP-1 Schema do arquivo.** `anti-vibe.public-routes.json` na raiz do projeto auditado. Shape UNICO:
  `{ "routes": [ { "path": "/health", "reason": "probe do load balancer" } ] }`. JSON invalido,
  top-level array, `routes` ausente ou nao-array = fail-closed: zero entradas + motivo em
  `summary.allowlist.notes`. Arquivo ausente = `present: false`, zero entradas, nota "nenhuma rota
  declarada publica" — nunca "pode tudo".
- **DP-2 Semantica de match.** Igualdade EXATA entre `entry.path` e `Route.path` (o path como a stack
  escreve — `/api/users/[id]` e literal valido no Next), normalizando apenas barra final. Metodo NAO
  entra: a entrada declara o path publico para todos os verbos. Stack-agnostica.
- **DP-3 Entrada ampla (AB-1 / CA-04).** `path` com `*`, segmento `:nome` ou grupo `(...)` e AMPLA:
  recusada (nao casa rota nenhuma) **e** gera `AllowlistFinding` com `severity: 'high'`,
  `file: 'anti-vibe.public-routes.json'`, `line` da entrada, descricao "entrada ampla `<path>` cobriria
  mais de uma rota — declare cada rota publica individualmente". `high` e nao `critical`: nenhuma rota
  foi comprovadamente exposta (as rotas sob ela continuam no motor e ganham os proprios findings).
  Nao `medium`: amplitude e tentativa de desligar o check, pior que incapacidade do adaptador.
- **DP-4 Entrada invalida (CA-04b).** Sem `reason`, `reason` vazio/so espacos, `path` nao-string,
  `path` sem `/` inicial, ou `path` duplicado (segunda ocorrencia) = recusada, listada em
  `summary.allowlist.rejected` (`{ path?, line, reason }`), SEM finding proprio — a rota volta ao motor
  e, se estiver aberta, o finding dela aparece. A secao 11 do agente instrui a citar `rejected`.
- **DP-5 Linha da entrada.** `JSON.parse` perde posicao. Apos o parse, localizar a N-esima ocorrencia
  textual de `"path"\s*:\s*"<valor escapado>"` (N = quantas vezes esse path ja apareceu, para a
  duplicata apontar a propria linha). Fallback: linha 1 + nota. Nao escrever parser JSON proprio.
- **DP-6 Onde encaixa.** Em `auditRouteCoverage`, para cada rota do conjunto avaliado (G1),
  `matchAllowlist(route, entries)` roda ANTES de `evaluateRoute`. Casou →
  `{ route, verdict: 'publica-declarada', evidence: 'anti-vibe.public-routes.json:<line> declara publica — <reason>' }`
  sem chamar o motor. **`evaluateRoute` nao muda.**
- **DP-7 Lib nova.** `skills/security/lib/public-routes-allowlist.ts` (+ `.test.ts` colocalizado, escrito
  PRIMEIRO). Exports: `PUBLIC_ROUTES_FILE`, `parsePublicRoutes(source, file)` (pura), `readPublicRoutes(targetDir)`,
  `matchAllowlist(route, entries)`, `normalizePath`, `isWideEntry` (fase-02), `diffAllowlist` (fase-03).
  Tipos `AllowlistEntry`, `RejectedEntry`, `AllowlistFinding`, `AllowlistParseResult` entram em
  `route-auth-matrix.types.ts` de forma ADITIVA. Type guards para o JSON `unknown` (o repo proibe `as`).
- **DP-8 Summary aditivo.** `AuditSummary` ganha `publicaDeclarada: number` e
  `allowlist: { file, present, accepted, rejected: RejectedEntry[], wide: number, notes: string[] }`.
  Fase-03 acrescenta `allowlist.changed: boolean` e `allowlist.delta?: { before: 'resolved' | 'unavailable'; added; removed; reason? }`.
- **DP-9 Findings de allowlist.** `AuditResult` ganha `allowlistFindings: AllowlistFinding[]` (array
  SEPARADO de `findings`, porque nao ha `route`). **A fase-01 ja declara o campo como `[]`** para que o
  RED da fase-02 seja assertion, nao erro de compilacao. A CLI emite `issues` = allowlist PRIMEIRO
  (`ALLOW-001`...) seguidas das de rota (`ROUTE-001`...), cada lista ordenada por severidade.
  `toContractIssue` continua para rota; nasce `allowlistToContractIssue` e `buildContractIssues`.
- **DP-10 `indeterminada` emite MEDIO (D8 / CA-10, fase-03).** `findings` inclui veredito `indeterminada`
  com `severity: 'medium'` e `missing: evidence`. Description:
  `indeterminada: GET /x (file:line) — cobertura nao demonstravel: <evidence>`. O teste
  `counts indeterminada in the summary without emitting a finding (emission is Plano 02)` e REESCRITO
  (RED honesto: espera 2 findings `medium`; falha com `Expected length: 2, Received length: 0`).
- **DP-11 Destaque de mudanca da allowlist (AB-4 / CA-07, fase-03).** Se `anti-vibe.public-routes.json`
  ∈ `changedFiles`, `summary.allowlist.changed = true` e a lib computa o delta lendo a versao ANTES no
  merge-base (`git merge-base <ref> HEAD` → `git cat-file -e` / `git show <sha>:<file>`). Seam:
  `AuditOptions.readAtBase` (a CLI injeta `readAtBaseFromGit(targetDir, ref)`; testes injetam lambda).
  Arquivo inexistente na base → `before: 'resolved'`, tudo em `added`. `ref` nao resolvivel ou git falhou
  → `before: 'unavailable'`, `added` = estado atual inteiro, `reason` explica — NUNCA silencio.
  **Refinamento de planejamento (2026-09-05):** a assinatura `(file) => string | null` da DP original
  nao consegue expressar os TRES estados que a propria DP exige (encontrado / ausente na base /
  indisponivel). O seam devolve `BaseRead = { status: 'found'; source } | { status: 'absent' } | { status: 'unavailable'; reason }`.
  Nome e intencao (reuso pelo Plano 03 para `middleware.ts`) mantidos.
- **DP-12 Agente e relatorio (fase-03, ADITIVO — "nunca diminuir").** Secao 11 do `security-auditor.md`
  ganha: (a) se `summary.allowlist.changed`, `reasoning` DEVE comecar com bloco
  `### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF` listando `added`/`removed` com `path` + `reason` +
  `line`, e a mudanca exige olhar humano (PRD "Gatilhos de aprovacao humana"); (b) issues `ALLOW-*`
  copiadas como estao; (c) `indeterminada` = `medium` = incapacidade do adaptador — nunca rebaixar nem
  omitir; (d) citar `summary.publicaDeclarada`, `allowlist.accepted/rejected/wide`. `verify-work/SKILL.md`
  Step 3 ganha a linha `- Public routes allowlist: ...` no Summary e a secao
  `### Allowlist de rotas publicas — ALTERADA` ANTES de `### Issues Found`.
  **Refinamento de planejamento (2026-09-05):** a DP original pedia `status: "needs_human"` no envelope.
  `skills/verify-work/lib/audit-consolidator.ts:91-95` (regra G-P04-03) trata `blocked`/`needs_human`
  como `incomplete[]` e **descarta todas as `issues` do agente** — o PR que mexe na allowlist perderia
  os findings `ROUTE-*`, `ALLOW-*` e das secoes 1–10, o oposto do AB-4. O mecanismo passa a ser
  `status: "complete"` + `verdict` no minimo `request_changes` + bloco destacado no inicio de
  `reasoning` (que o consolidador preserva por agente) + secao propria no relatorio. A intencao do
  PRD (diff apresentado ao humano) e atendida; o dev valida antes da fase-03 (ver MEMORY).
- **DP-13 Fixtures novas (sem `middleware.ts`).** `tests/fixtures/route-auth-matrix/nextjs-allowlist/`
  com `anti-vibe.public-routes.json` (declara `/api/health` e `/api/webhooks/stripe` com `reason`; UMA
  entrada invalida sem `reason` para `/api/admin`) + `app/api/health/route.ts` (GET),
  `app/api/webhooks/stripe/route.ts` (POST), `app/api/admin/route.ts` (GET). Esperado: health e stripe
  = `publica-declarada`; admin = recusada → `DESCOBERTA critical`. Fase-02 acrescenta
  `nextjs-allowlist-wide/` com `{ "path": "/api/*", "reason": "..." }` + `app/api/admin/route.ts` →
  1 `AllowlistFinding high` + 1 `RouteFinding critical`. `route.ts` de fixture NAO importa `next/*` (G14).
- **DP-14 Texto do finding DESCOBERTA (fase-01, RF-05 / CA-01).** `toContractIssue` passa a dizer
  `sem cobertura de middleware e nao declarada publica em anti-vibe.public-routes.json — <missing>`.
  O teste CA-01 existente ganha assercao sobre `anti-vibe.public-routes.json` na description (RED por
  assertion).

---

## Gotchas Conhecidos

- **G1 — O TDD gate que roda nesta sessao vem do CACHE do plugin (7.7.0) e esta defasado.** O checkout
  ja corrigiu (`hooks/lib/tdd-decision.cjs:18` inclui `__fixtures__|fixtures` no `SKIP_PATTERN`,
  commit `cc925dc`; o bypass por Bash foi fechado em `1dffae7`), mas o hook em execucao e o do cache,
  cujo `SKIP_PATTERN` NAO tem `fixtures/`. Consequencia pratica: `Write/Edit` em
  `tests/fixtures/**/middleware.ts` e BLOQUEADO; `route.ts`/`page.tsx` passam (`NEXTJS_ROUTE_FILE`);
  `.json` e `.md` passam. **Regra desta execucao: NAO contornar trocando de ferramenta.** Por isso
  nenhuma fixture deste plano tem `middleware.ts`: ausencia de middleware produz `rules: []`, o motor
  da `DESCOBERTA` para toda rota nao declarada — exatamente o cenario da allowlist. Cobertura, quando
  precisar, vem pelo seam `coverageOverride`.
- **G2 — Manifest no MESMO commit.** Todo `.ts` em `skills/**/lib/` (exceto `.test.ts`) e todo `.md` em
  `agents/` e `skills/*/SKILL.md` e rastreado por `plugin-manifest.json`. Arquivo rastreado alterado
  exige `bun run generate:manifest` no mesmo commit — esquecer inverte o veredito do `/update`.
  `tests/` e `docs/` sao ignorados (fixtures nao contam). O gerador mexe em `lastModified` de arquivo
  nao tocado (GT-fase01-2): revisar o diff do manifest pelo **checksum**, nao pela data.
- **G3 — `exactOptionalPropertyTypes` ligado.** Nunca atribuir `undefined` a campo opcional
  (`delta: maybeDelta` quebra se `maybeDelta` for `AllowlistDelta | undefined`; `reason: undefined`
  quebra em `AllowlistDelta`). Usar spread condicional: `...(delta !== undefined ? { delta } : {})`,
  como `subagent-contract.ts` faz. Vale para `RejectedEntry.path?` tambem.
- **G4 — `noUncheckedIndexedAccess` ligado.** `entries[0]` e `AllowlistEntry | undefined`;
  `result.rejected[0]?.line`, `match.index ?? 0`, `process.argv[2] ?? fallback`. Nos testes, sempre
  `xs[0]?.campo` — nunca `xs[0]!` (o repo evita assercao tanto quanto `as`).
- **G5 — `JSON.parse` perde a linha (DP-5).** A linha da entrada vem de busca textual pela N-esima
  ocorrencia de `"path": "<valor>"` — `JSON.stringify(path)` gera o literal escapado canonico; se o
  arquivo usar escape diferente (`/`), a busca falha e o fallback e linha 1 + nota. Nao "melhorar"
  com parser JSON proprio: o PRD nao pede e o custo nao paga.
- **G6 — `git merge-base` / `git cat-file` / `git show` rodam com `cwd: targetDir` (projeto auditado) e
  falham por varios motivos:** nao e repo, `ref` invalida, shallow clone sem o merge-base, arquivo
  ausente na base. Cada falha vira um estado explicito do `BaseRead` — `unavailable` com `reason`, ou
  `absent` — e o `summary.allowlist.delta` diz qual. Silencio e proibido (DP-11). Os comandos `git`
  rodam DENTRO da lib, como `changedFilesFromGit` ja faz — o Bash do agente continua sendo UM comando
  (regra em `security-auditor.md` "## Regras").
- **G7 — Barra final e a UNICA normalizacao de path (DP-2).** `/api/health/` == `/api/health`; `/`
  permanece `/`. Nada de lowercase (Next e case-sensitive no filesystem Linux), nada de decode de `%2F`,
  nada de colapsar `//`. Normalizar mais e abrir espaco para match que o PRD nao autorizou.
- **G8 — A allowlist e configuracao de SEGURANCA, nao conveniencia** (PRD "Fronteiras de confianca").
  E o unico input do check que muda veredito para melhor. Toda decisao do parser e fail-closed: em
  duvida, recusa e lista a recusa. O agente le a saida da lib e NUNCA edita o arquivo.
- **G9 — "Nunca diminuir" em agente e skill.** Edicoes em `security-auditor.md` e
  `verify-work/SKILL.md` sao ADITIVAS: acrescentar bullets a secao 11, acrescentar linha ao Summary e
  secao nova ao template. Nao reescrever secoes 1–10, nao reordenar o template, nao remover o bullet
  de `blocked`/`--ref`. `git diff` dos dois arquivos deve ser so `+`.
- **G10 — Sizing drift no PLAN.md.** O PLAN.md diz ~3h para este plano; a soma real das fases e ~4h
  (a fase-03 carrega D8 + AB-4 + duas edicoes de prosa). Registrado em MEMORY "Desvios do Plano" como
  nota de planejamento — o orquestrador atualiza o PLAN.md, nao o executor.
- **G11 — `bun run lint` NAO existe.** O `fase-template.md` traz essa linha; aqui o equivalente e
  `bun run typecheck`. E as verificacoes rodam **separadas**: `a && b | tail` mente sobre exit code
  (o pipe reporta o `tail`). Um comando por linha, cada um lido ate o fim.
- **G12 — O cache do plugin nao tem a lib `route-auth-matrix` nem a secao 11 do agente**
  (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/7.7.0/skills/security/lib/` so tem
  `security-prefaces` e `stack-aware-preface`; `grep -c route-auth-matrix agents/security-auditor.md`
  no cache = 0). Criterios "por humano" que exigem rodar `/anti-vibe-coding:security` num projeto real
  ficam **pendentes de sync do cache** — registrar como divida no MEMORY, nao como falha da fase.
- **G13 — `[id]` e literal, `:id` e amplo — e isso colide com o Express no Plano 04.** No Next,
  `Route.path` e `/api/users/[id]` (dialeto da stack, fase-02 do Plano 01), entao a entrada
  `/api/users/[id]` casa exatamente UMA rota do contrato e NAO e ampla. Ja `:nome` e a sintaxe de
  parametro do path-to-regexp/Express: hoje nao casa rota Next nenhuma, e no Plano 04 a rota Express
  `/users/:id` teria `Route.path` literal `/users/:id`. A DP-3 fixa `:nome` como amplo — logo um dev
  Express nao consegue declarar `/users/:id` publica sem finding `high`. Registrado para o dev decidir
  antes do Plano 04 fase-02 (ver MEMORY); nesta versao, seguir a DP-3.
- **G14 — `tsconfig.json` inclui `**/*.ts`; `tests/fixtures/**` passa pelo `typecheck`.** `route.ts` de
  fixture NAO pode importar `next/server` (`next` nao esta instalado). Usar `Response.json` global
  (bun-types) — precedente: `nextjs-minimal/app/api/admin/route.ts`. (= G7 do Plano 01.)
- **G15 — Windows.** `path.relative()` devolve `\`; o adaptador ja normaliza com `toPosix`. Os
  `changedFiles` vindos de `git diff --name-only` ja sao POSIX. A comparacao
  `changed.has(PUBLIC_ROUTES_FILE)` e igualdade exata com `'anti-vibe.public-routes.json'` — arquivo
  na raiz nao tem separador, entao nao ha o que normalizar; mas se alguem passar `./anti-vibe...` por
  fora do git, nao casa. Documentar, nao "consertar" (a CLI e a unica fonte real).
- **G16 — Teste antes do arquivo de producao.** O gate exige `X.test.ts` existente ANTES de criar `X.ts`.
  Fase-01 Passo 1 cria `public-routes-allowlist.test.ts`; so o Passo 2 cria a lib. Nao e contorno de
  hook — e o RED honesto (DI-fase01-ordem-red do Plano 01).
- **G17 — `bun run typecheck` FALHA na janela RED por desenho.** O teste referencia
  `summary.publicaDeclarada` / `result.allowlistFindings` / `summary.allowlist.changed` antes de
  existirem. `bun test` nao typechecka, entao o RED e assertion (`Received: undefined`); o `tsc` so
  precisa ficar verde depois do GREEN. Nao "arrumar" o RED declarando o tipo antes do teste falhar.
- **G18 — Entrada REMOVIDA da allowlist e estreitamento de cobertura (G2), e G1 nao a reavalia.** Se o
  diff tira `/api/legacy` da allowlist mas nao toca `app/api/legacy/route.ts`, a rota nao entra no
  conjunto avaliado desta versao — ela ficou aberta e o motor nao a viu. A defesa desta fase e
  `delta.removed` no bloco destacado + `request_changes`: o humano ve. O Plano 03 (G2) deve incluir
  rotas que casam `delta.removed` no conjunto avaliado — esta anotado em "Produz para".
- **G19 — `needs_human` no envelope descarta as issues do agente** (`audit-consolidator.ts:91-95`,
  G-P04-03). E lifecycle ("nao consegui terminar"), nao veredito. Por isso a DP-12 foi refinada:
  o sinal de "exige humano" viaja em `verdict: request_changes` + bloco em `reasoning` + secao no
  relatorio, com `status: "complete"`. Nao usar `needs_human` para isso sem antes mudar o
  consolidador (fora deste plano).

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
