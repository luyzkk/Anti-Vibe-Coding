# Memoria: Plano 02 — Allowlist e veredictos completos

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-05
**Status:** concluido (2026-09-05)

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-05 no `/plan-feature` (orquestrador + dev). As fases implementam; o executor NAO
re-pergunta nem reabre. Detalhe completo em `README.md` "Decisoes de planejamento (DP)".

- **DP-1:** `anti-vibe.public-routes.json` na raiz; shape unico `{ "routes": [ { "path", "reason" } ] }`; qualquer outra coisa ou arquivo ausente = fail-closed com nota, nunca "pode tudo".
- **DP-2:** match por igualdade EXATA de `path` (dialeto da stack, `[id]` e literal), so barra final normalizada; metodo nao entra; stack-agnostico.
- **DP-3:** entrada ampla (`*`, `:nome`, `(...)`) e recusada E gera `AllowlistFinding high` proprio em `anti-vibe.public-routes.json:linha` (fase-02).
- **DP-4:** entrada sem `reason`/vazia, `path` nao-string, sem `/` inicial ou duplicada = recusada em `summary.allowlist.rejected`, sem finding; a rota volta ao motor.
- **DP-5:** linha da entrada por busca textual da N-esima ocorrencia de `"path": "<valor>"` apos `JSON.parse`; fallback linha 1 + nota; sem parser JSON proprio.
- **DP-6:** `matchAllowlist` roda ANTES de `evaluateRoute` em `auditRouteCoverage`; casou → `publica-declarada` com evidence `file:line declara publica — reason`; `evaluateRoute` nao muda.
- **DP-7:** lib nova `skills/security/lib/public-routes-allowlist.ts` (+ test colocalizado, escrito primeiro); tipos aditivos em `route-auth-matrix.types.ts`; type guards, nunca `as`.
- **DP-8:** `AuditSummary` ganha `publicaDeclarada` e `allowlist: { file, present, accepted, rejected, wide, notes }`; fase-03 acrescenta `changed` e `delta?`.
- **DP-9:** `AuditResult.allowlistFindings: AllowlistFinding[]` separado de `findings`; fase-01 ja declara `[]` (RED da fase-02 por assertion); CLI emite `ALLOW-*` antes de `ROUTE-*`, cada lista por severidade.
- **DP-10:** `indeterminada` emite finding `medium` com description `indeterminada: GET /x (file:line) — cobertura nao demonstravel: <evidence>`; teste de "sem emitir" e reescrito (fase-03).
- **DP-11:** allowlist no diff → `summary.allowlist.changed = true` + `delta` lendo a base via seam `readAtBase` (CLI injeta git-backed); base indisponivel → `before: 'unavailable'` + tudo em `added` + `reason`; nunca silencio. *Refinada: seam devolve `BaseRead` de 3 estados — ver Desvios.*
- **DP-12:** agente e relatorio ganham, aditivamente, bloco `### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF` + `ALLOW-*` copiadas + `indeterminada` nunca rebaixada + citacao do summary; `verify-work` Step 3 ganha linha no Summary e secao propria antes de Issues Found. *Refinada: `request_changes` com `status: complete`, nao `needs_human` — ver Desvios.*
- **DP-13:** fixtures `nextjs-allowlist/` (health + stripe declaradas, admin sem reason; 3 `route.ts`) e `nextjs-allowlist-wide/` (`/api/*` + admin); ambas SEM `middleware.ts`; `route.ts` sem import de `next/*`.
- **DP-14:** description de DESCOBERTA passa a citar `nao declarada publica em anti-vibe.public-routes.json`; CA-01 ganha assercao (RED por assertion).

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

- **DI-fase02-1: RED do motor foi de compilacao, nao de assertion.** A fase previa que
  `route-auth-matrix.test.ts -t 'CA-04: emits its own'` falharia com `Expected length: 1, Received
  length: 0` (porque `allowlistFindings` ja existia como `[]`). Na pratica o executor acrescentou os 3
  testes novos de uma vez, e o import de `buildContractIssues` (ainda inexistente) fez o Bun recusar o
  modulo de teste inteiro (`SyntaxError: Export named 'buildContractIssues' not found`).
  - Por que foi aceito: o executor reportou a divergencia em vez de fabricar a mensagem de assertion; o
    RED do parser (`isWideEntry` inexistente) e o mesmo padrao previsto em G16; e a defesa foi provada
    pelo RED-check pos-GREEN nos dois arquivos.
  - Impacto: nenhum no resultado. O orquestrador reproduziu o RED-check: `isWideEntry` → `false`
    derruba CA-04 no motor (`Received length: 0`, 2 fail) e no parser (`entries` com 8 itens em vez
    de `[]`). Ver GT-fase02-1 para nao repetir.

- **DI-fase03-1 (executor): `absent` passou a vir do `git show`, nao do `cat-file -e`.** O Passo 4 da
  fase previa `git cat-file -e <sha>:<file>` com exit 1 = ausente. Nao se sustenta (BUG-fase03-1). O
  executor removeu o comando e classificou "ausente" pela mensagem de erro do `git show`
  (`does not exist in` / `but not in`), coberto pelos 3 testes de integracao com o repo real.
  - Impacto: superado no mesmo dia por DI-fase03-2; fica registrado porque explica o commit intermediario.
- **DI-fase03-2 (orquestrador, revisao da fase-03): `git ls-tree <sha> -- <file>` decide "ausente", sem
  parse de texto.** Ler a mensagem do `git show` depende do idioma: o git traduz `fatal:` quando ha
  catalogo i18n e `LANG` definido (nao neste Git for Windows 2.53.0, medido com `LC_ALL=pt_BR.UTF-8`,
  mas sim em Linux com i18n). Numa maquina traduzida, todo arquivo ausente na base viraria
  `unavailable` — nao e silencio (DP-11 preservada), mas e ruido sistematico. `ls-tree` responde a
  mesma pergunta por contrato: exit 0 + stdout vazio = ausente; blob listado = existe; exit 128 = arvore
  invalida. Medido no repo antes de trocar.
  - Impacto: 3 comandos git de novo (merge-base → ls-tree → show), como a fase desenhava, so que o do
    meio e `ls-tree` em vez de `cat-file -e`. Testes inalterados (comportamento); RED-check:
    quebrar a deteccao de ausente faz `returns absent` falhar com `Received: "unavailable"`.

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

- **BUG-fase03-1: `git cat-file -e <sha>:<file>` nunca devolve exit 1 para path ausente.**
  - Sintoma: o teste de integracao `returns absent for a file that does not exist at the base` recebia
    `unavailable` em vez de `absent`.
  - Causa raiz: com a forma composta `rev:path`, o parser de revisao do git morre com `die()` (exit
    128, "fatal: path 'x' does not exist in 'sha'") ANTES de chegar na logica que devolveria 1. O exit 1
    documentado vale para um SHA bem formado que nao existe, nao para `rev:path`. Medido em git 2.53.0.
  - Fix: DI-fase03-1 (executor, leitura do stderr do `show`) e depois DI-fase03-2 (orquestrador,
    `git ls-tree <sha> -- <file>` com stdout vazio = ausente). O Plano 03 herda a versao final.
  - Fase afetada: fase-03

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

- **GT-fase02-1: import novo num arquivo de teste existente = RED de compilacao TOTAL.** O Bun (ESM
  estrito) recusa carregar o modulo de teste inteiro quando um export importado nao existe — os testes
  preexistentes tambem aparecem como falha, e o RED por assertion que a fase descrevia nunca acontece.
  - Descoberto em: fase-02
  - Impacto: para ter RED por assertion isolado, acrescentar o import SO junto com o teste que o usa,
    em passo separado do teste cujo RED se quer observar; ou aceitar o RED de compilacao e provar a
    defesa no RED-check pos-GREEN (que e o que salvou aqui). Vale para a fase-03 (`readAtBaseFromGit`,
    `diffAllowlist` sao imports novos) e para o `fase-template.md` do plugin.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

- **DEV-plan-1 (nota de planejamento, 2026-09-05): sizing ~4h, nao ~3h.** O PLAN.md registra ~3h para
  o Plano 02; a soma real das fases e 1.5h + 1h + 1.5h = 4h. A fase-03 carrega D8 (emissao MEDIO),
  AB-4 (delta via git) e duas edicoes de prosa (agente + verify-work). O orquestrador atualiza o
  PLAN.md; o executor nao toca nele.
- **DEV-plan-2 (nota de planejamento, 2026-09-05): DP-11 refinada — seam de 3 estados.** A assinatura
  original `readAtBase?: (file) => string | null` nao distingue "arquivo ausente na base" (que a DP manda
  tratar como `before: 'resolved'`, tudo `added`) de "git falhou / ref invalida" (`before: 'unavailable'`).
  Um leitor generico (o Plano 03 vai usa-lo para `middleware.ts`) nao pode devolver um literal de
  allowlist vazia para "ausente". O seam devolve
  `BaseRead = { status: 'found'; source } | { status: 'absent' } | { status: 'unavailable'; reason }`.
  Nome, intencao e reuso mantidos. **Aceito pelo orquestrador em 2026-09-05** (sessao autonoma; o dev pode vetar na revisao do PR).
- **DEV-plan-3 (nota de planejamento, 2026-09-05): DP-12 refinada — `request_changes`, nao `needs_human`.**
  `skills/verify-work/lib/audit-consolidator.ts:91-95` (G-P04-03) coloca `blocked`/`needs_human` em
  `incomplete[]` e descarta todas as `issues` do agente. Emitir `needs_human` quando a allowlist muda
  faria o `verify-work` perder `ROUTE-*`, `ALLOW-*` e os findings das secoes 1–10 exatamente no PR que o
  AB-4 quer vigiar. Mecanismo adotado: `status: "complete"`, `verdict` no minimo `request_changes`, bloco
  destacado no INICIO de `reasoning` (preservado por agente pelo consolidador) e secao propria no
  relatorio. A intencao do PRD ("mudanca na allowlist exige diff apresentado ao humano") e atendida.
  **Aceito pelo orquestrador em 2026-09-05** apos confirmar `audit-consolidator.ts:91-93` no checkout (sessao autonoma; o dev pode vetar na revisao do PR). Se ele preferir `needs_human`, o consolidador precisa mudar
  primeiro (fora deste plano).
- **DEV-plan-4 (pendencia para o dev, 2026-09-05): `:nome` amplo vs. rota Express literal (G13).** DP-3
  fixa `:nome` como amplo. No Plano 04 fase-02 a rota Express tera `Route.path` literal `/users/:id`, e um
  dev Express nao conseguira declara-la publica sem finding `high`. Nesta versao, seguir a DP-3; decidir
  antes do Plano 04 fase-02 (opcoes: amplitude por stack via `Route.stack`, ou aceitar `:nome` quando casa
  exatamente UMA rota enumerada).

- **DEV-fase03-1 (executor): item de checklist da CLI com `anti-vibe.public-routes.json` NAO commitado
  e invalido.** Arquivo untracked nao entra em `git diff --name-only <ref>...HEAD`, entao o comando
  sempre devolveria `changed: false`. Substituido por: CLI contra o repo com `--ref main` devolve
  `changed: false`, sem `delta`, sem `blocked`; o caminho `changed: true` fica coberto pelos 6 testes de
  CA-07 (seam injetado) + 3 de `readAtBaseFromGit` (git real). Sinalizado pelo orquestrador no prompt.
- **DEV-fase03-2 (executor): o RED de `never stays silent` falhou por assertion com mensagem diferente
  da prevista no doc.** RED honesto confirmado; so o texto divergiu do chute do doc. Sem impacto.
- **DEV-fase03-3 (executor): `grep -n "Public routes allowlist" skills/verify-work/SKILL.md` devolve 2,
  nao 1** — o proprio item `2c.` (texto do Passo 6, copiado verbatim) cita a frase. Contagem do doc
  estava errada; conteudo correto.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 1 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Estado final (2026-09-05, commits 10f7e89 / 7fcc8e9 / 61387f9):** `route-auth-matrix.test.ts` 33
testes, `public-routes-allowlist.test.ts` 20, `skills/security/lib/` 108; suite completa 2033 pass / 0 fail.

**Assinaturas publicas (copiadas do codigo — nao redescobrir):**

```ts
// skills/security/lib/route-auth-matrix.types.ts (ADITIVO ao contrato congelado do Plano 01)
type AllowlistEntry = { path: string; reason: string; file: string; line: number }
type RejectedEntry  = { path?: string; line: number; reason: string }
type AllowlistFinding = { path: string; file: string; line: number; severity: IssueSeverity; description: string }
type BaseRead = { status: 'found'; source: string } | { status: 'absent' } | { status: 'unavailable'; reason: string }
type AllowlistDelta = { before: 'resolved' | 'unavailable'; added: AllowlistEntry[]; removed: AllowlistEntry[]; reason?: string }

// skills/security/lib/route-auth-matrix.ts
type AuditOptions = { changedFiles?: string[]; coverageOverride?: CoverageMap; readAtBase?: (file: string) => BaseRead }
type AllowlistSummary = { file; present; accepted; rejected: RejectedEntry[]; wide: number; notes; changed: boolean; delta?: AllowlistDelta }
type AuditResult = { findings: RouteFinding[]; allowlistFindings: AllowlistFinding[]; verdicts: RouteVerdict[]; summary: AuditSummary }
readAtBaseFromGit(targetDir: string, ref: string): (file: string) => BaseRead   // merge-base -> ls-tree -> show
buildContractIssues(result: AuditResult): ContractIssue[]                        // ALLOW-* primeiro, depois ROUTE-*
// CLI: auditRouteCoverage(target, { changedFiles: diff.files, readAtBase: readAtBaseFromGit(target, ref ?? 'HEAD~1') })

// skills/security/lib/public-routes-allowlist.ts (stack-agnostica; nao importa do adaptador Next)
PUBLIC_ROUTES_FILE = 'anti-vibe.public-routes.json'
parsePublicRoutes(source, file): AllowlistParseResult   // { entries, rejected, wide, notes } — pura
readPublicRoutes(targetDir): AllowlistParseResult & { present: boolean }
matchAllowlist(route, entries): AllowlistEntry | null   // igualdade exata de path, so barra final normalizada
isWideEntry(path): boolean                              // *, :nome, ( — recusada + finding high
diffAllowlist(before, after): { added; removed }        // chave = normalizePath(path)
```

**Onde o Plano 03 (G2) encaixa:**

- **Reusar `opts.readAtBase` para ler `middleware.ts` na base** — `readAtBase(MIDDLEWARE_FILE)` →
  `parseMatcherConfig(source, file)` da a `CoverageMap` "antes". NAO criar um segundo seam nem um
  segundo leitor git. `status: 'absent'` = nao havia middleware na base (cobertura antes = nenhuma);
  `'unavailable'` = veredito `indeterminada` para o delta (fase-03 do Plano 03), nunca silencio.
- **`summary.allowlist.delta.removed` e input do G2:** rota que perdeu a declaracao de publica e cujo
  arquivo NAO esta no diff nao foi reavaliada nesta versao (G18 do README). O conjunto avaliado do
  Plano 03 deve incluir rotas que casam `delta.removed` por `normalizePath(path)`.
- A nota `'escopo G1 sem rotas: o diff nao tocou arquivo de rota (cobertura perdida e o Plano 03)'`
  continua em `summary.notes` — o Plano 03 a substitui/complementa quando G2 existir.
- `indeterminada` agora EMITE finding `medium` (D8). Qualquer regra `opaque` na cobertura "antes" ou
  "depois" vai gerar issues — planejar as fixtures do G2 com isso em mente.

**Onde o Plano 04 (adaptadores) encaixa:**

- Allowlist e stack-agnostica: `matchAllowlist` compara `Route.path` no dialeto da stack. Nenhum
  codigo de allowlist por stack. MAS ler **G13 / DEV-plan-4** antes da fase-02 (Express): `:nome` e
  amplo por DP-3, e `Route.path` do Express e `/users/:id` literal — um dev Express nao consegue
  declarar essa rota publica sem finding `high`. Decidir (amplitude por `Route.stack`, ou aceitar
  `:nome` quando casa exatamente UMA rota enumerada) ANTES de escrever o adaptador.
- Regra nova de `CoverageRule` continua caindo em `indeterminada` por hash map — e agora isso vira
  finding `medium` visivel, nao so contagem.

**Dividas herdadas (nenhuma bloqueia o Plano 03):**

- **Cache do plugin defasado** (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/7.7.0/`): nao
  tem a lib `route-auth-matrix`, a secao 11 do agente, `hooks/lib/tdd-decision.cjs` nem o gate Bash.
  Consequencias: (a) o TDD gate em execucao bloqueia `middleware.ts` em fixtures — por isso as fixtures
  `nextjs-allowlist` e `nextjs-allowlist-wide` NAO tem middleware; (b) todo criterio "por humano" que
  exige `/anti-vibe-coding:security` num projeto real esta pendente. Rodar
  `scripts/sync-to-global.sh` (Git Bash) antes de validar por humano.
- **GT-fase02-1:** import novo num arquivo de teste existente = RED de compilacao total no Bun. Para RED
  por assertion, acrescentar o import so junto com o teste que o usa, em passo separado (a fase-03 fez
  assim e funcionou).
- Pendencia do Plano 01 continua: validar que `CLAUDE_PLUGIN_ROOT` chega ao Bash do subagente.
- **Compound candidates** (para `/lessons-learned`): BUG-fase03-1 (`cat-file -e rev:path`),
  DI-fase03-2 (nao classificar por mensagem do git), G19 (`needs_human` descarta issues no
  consolidador), GT-fase02-1.

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
<!-- Atualizado automaticamente durante execucao -->
