# Memoria: Plano 02 — Allowlist e veredictos completos

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-05
**Status:** em andamento

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

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 1 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- A execucao preenche ao fechar a fase-03. Minimo esperado:
- Assinatura final de `AuditOptions.readAtBase` e de `readAtBaseFromGit(targetDir, ref)` — o Plano 03
  fase-01 le `middleware.ts` na base com o MESMO seam; nao criar um segundo.
- Shape final de `summary.allowlist` (`changed`, `delta.added/removed/before/reason`) e o fato de que
  `delta.removed` e input do G2 (Plano 03): rota que perdeu a declaracao e nao esta no diff NAO foi
  reavaliada nesta versao.
- `matchAllowlist(route, entries)` e stack-agnostico sobre `Route.path`; o Plano 04 nao escreve nada
  de allowlist por stack — mas ler G13 (`:nome` amplo vs. Express) antes da fase-02 dele.
- Ids `ALLOW-*` vem antes de `ROUTE-*` em `issues`; `buildContractIssues(result)` e a funcao que a CLI usa.
- Dividas herdadas: gate do cache (G1), cache sem a lib/secao 11 (G12 — criterios por humano pendentes).
-->

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
<!-- Atualizado automaticamente durante execucao -->
