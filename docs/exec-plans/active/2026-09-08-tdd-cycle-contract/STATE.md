# State: Contrato Único do Ciclo TDD por Fase

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/2
**Last Updated:** 2026-09-08

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fonte e contrato | 3 | 1/3 | in-progress |
| 02 | O ciclo roda no execute-plan | 4 | 0/4 | pending |

## Progress Global

Fases done: 1/7 (14%)

## Log do Ciclo TDD por Fase

Campos conforme PRD §Observabilidade. O formato definitivo é implementado no Plano 02 fase-03;
aqui já é preenchido à mão para não perder a evidência da fase.

| Fase | red_confirmed | human_gate | red_check | refactor |
|---|---|---|---|---|
| p01/fase-01 | `assertion` (0 pass / 2 fail, ambos `Expected: true / Received: false`) | `skipped(gate ainda não existe — chega no Plano 02 fase-01)` | `pass` ×3 — (1) defesa: linha `**REFACTOR:**` do `fase-template.md` / teste: `fase-template — bloco "### TDD" (RF-02) > o bloco mantem o checkbox REFACTOR`; (2) defesa: heading `## Contrato do Ciclo por Fase` do `tdd-workflow/SKILL.md` / teste: `tdd-workflow — a fonte unica do ciclo (RF-01) > a skill tem a secao ...`; (3) defesa: `(opcional)` na linha 22 de `tdd-cycle-checklist.md` / gate: `grep -n "Passo 7 (opcional)"`. `git diff --stat` vazio após cada restauração. | `none (sem refactor: teste de 2 assertions, helpers copiados do molde write-prd-contract.test.ts)` |

## Log

- 2026-09-08: Plano criado via /plan-feature (2 planos, 7 fases, ~8.5h) na branch feat/tdd-cycle-contract. Decisões do PRD D1–D6 mapeadas para fases. Tracer bullet = Plano 01 fase-01 (teste de paridade RED → seção-fonte mínima + checkbox REFACTOR). Sequencial entre e dentro dos planos: todas as fases editam o mesmo teste de paridade.
- 2026-09-08: Plano 01 detalhado via /plan-feature (3 fases, 1h cada; README com 6 decisões de planejamento DP-1..DP-6 e gotchas G1–G13). Achados do planejador ao ler os arquivos reais: `skills/lib/__tests__/universal-principles.test.ts` já lê o fase-template (Premissa 3 do PRD corrigida); `docs/references/tdd-cycle-checklist.md` não é rastreado pelo manifest (`docs/` ignorado); as regras do Step 9 do plan-feature vivem dentro de um fence, então a paridade da fase-03 assere com `section()` cru; a fonte cita `--tdd-level` e o 4c desde a fase-01, que só chegam no Plano 02 (DP-4).
- 2026-09-08: Plano 02 detalhado via /plan-feature (4 fases: 1.5h + 1.5h + 1h + 1.5h = 5.5h, igual ao PLAN.md; fase-04 subiu de 1h para 1.5h por ter três rodadas de dogfood: Assistido, negativo `blocked`, `--tdd-level direto`). Primeira tentativa do subagente morreu por limite de sessão sem escrever nada; segunda concluiu. README com DP-1..DP-16 e G14–G23 (G1–G13 herdados). Achados: `plan-verifier.md` §Composition diz que o execute-plan o invoca no Step 5, mas ninguém o spawna — fase-03 corrige para 4c VERIFY (DP-11); `subagent-contract.ts:126` confirma `checks[].name: string` livre, então `red-check-evidence` não toca o parser (CA-10); o script de sync lê o checkout, então o dogfood roda da branch antes do merge; a regex real do guard destrutivo casa `git checkout --`/`git checkout .`/`git restore .`, não `-b` — o bloqueio de 2026-09-08 foi o heredoc do PRD citando `git checkout --` (PLAN.md §Risks corrigido).
- 2026-09-08: **Baseline da branch medida ANTES de qualquer edição**, em `66e6575`: `bun run test` = lote 1 `1450 pass / 0 fail` (175 arquivos) + lote 2 `694 pass / 0 fail` (106 arquivos) = **2144 pass, 0 fail, 281 arquivos**, exit 0; `bun run typecheck` exit 0. O total só aparece somando os dois lotes — o output final mostra apenas o segundo.
- 2026-09-08: **Plano 01 fase-01 (tracer bullet) CONCLUÍDA.** RED em `690cfb1` (`tests/fase-template-tdd-contract.test.ts`, 2 assertions, falha por assertion — confirmado pelo orquestrador rodando o teste, não só pelo subagente). GREEN em `d4993b8`: seção `## Contrato do Ciclo por Fase` em `skills/tdd-workflow/SKILL.md` (linha 547, aditiva, `$ARGUMENTS` segue última linha), checkbox `**REFACTOR:**` no bloco `### TDD` de `fase-template.md`, Passo 7 de `docs/references/tdd-cycle-checklist.md` deixa de ser "(opcional)", manifest regenerado. Os 3 RED-checks por mutação foram executados pelo orquestrador e passaram (ver tabela acima). Suite final `2146 pass, 0 fail` em 282 arquivos (delta = o arquivo novo + suas 2 assertions), typecheck exit 0, harness:validate ok.
- 2026-09-08: Achados registrados no MEMORY do Plano 01 — **BUG-1**: a suite deu 13+1 fail logo após o GREEN por `EBUSY` no fixture `tests/__fixtures__/harness-advanced` (subprocesso `bun` segurando o CWD no Windows sob carga), não por regressão; limpo o resíduo, ficou verde. **GT-1**: `generate:manifest` bumpa `lastModified` de 10 arquivos não tocados (checksum idêntico) — conferir manifest por checksum, não por `git diff --stat`. **GT-2**: `git restore <arquivo>` passa pelo guard, `rm -rf` é bloqueado (mover para lixo). **GT-3**: apagar só o heading derruba o teste com o corpo no lugar — regex ancorada, não `includes`. **DI-3**: o GREEN recebeu os Passos 2-5 da fase (não "apenas os testes") porque o entregável é prosa; sem isso o subagente escreveria um heading vazio que passa o gate.
