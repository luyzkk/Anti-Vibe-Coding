# State: Matriz Rota x Middleware de Auth no Auditor

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 03/4
**Last Updated:** 2026-09-05

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fundacao + Tracer Bullet (Next.js) | 5 | 5/5 | completed |
| 02 | Allowlist e veredictos completos | 3 | 3/3 | completed |
| 03 | G2: cobertura perdida | 3 | 0/3 | pending |
| 04 | Os outros tres adaptadores + multi-stack | 5 | 0/5 | pending |

## Progress Global

Fases done: 8/16 (50%)

## Log

- 2026-09-03: Plano criado via /plan-feature (4 planos, 16 fases). Decisao de planejamento: o
  `security-auditor` ganha `Bash` para invocar libs TS em `skills/security/lib/` — precedente em
  `dependency-auditor`, `tdd-verifier`, `database-analyzer`. Tracer bullet = Plano 01 fase-01.
- 2026-09-04: Execucao iniciada via /execute-plan na branch feat/route-auth-matrix-plano01. Dev optou por rodar as 5 fases em sequencia, com validacao entre elas.
- 2026-09-04: fase-01 (tracer bullet) concluida no commit cde2582. Cadeia end-to-end provada: fixture -> lib -> finding CRITICO -> security-auditor com Bash restrito. Suite 1887 pass / 0 fail. RED-check do orquestrador confirmou que o teste falha quando o alvo e reintroduzido. Pendente: validar que CLAUDE_PLUGIN_ROOT chega ao Bash do subagente.
- 2026-09-04: fase-02 (contrato de tipos) concluida no commit 0c3caeb, executada direto pelo orquestrador (dev recusou o subagente). Contrato congelado: mudanca em route-auth-matrix.types.ts agora reabre os tres adaptadores do Plano 04. Campo handler acrescentado ao Route por exigencia do criterio 'por humano'. Suite 1898 pass / 0 fail.
- 2026-09-04: fase-03 (enumeracao App Router) concluida no commit 8ada239. Fixture ampliada de 1 para 6 rotas; adaptador movido para route-auth-nextjs.ts. Suite 1911 pass / 0 fail. Proxima: fase-04, que PARA no Passo 0 para decisao do dev sobre o parser (DI-0b).
- 2026-09-04: fase-04 (match real do matcher) concluida no commit 15f7464. Gate do Passo 0 disparou: parser nao resolve do cache (GT-fase04-1); dev escolheu parser proprio (DI-fase04-parser). Zero dependencia nova. Suite 1933 pass / 0 fail. Falta so a fase-05 (regra de severidade + escopo G1 pelo diff).
- 2026-09-04: fase-05 (motor de veredito + severidade por regra + escopo G1) concluida no commit f5af441. PLANO 01 COMPLETO (5/5). Suite 1947 pass / 0 fail; agents:contract 39 pass; os 4 CAs verdes. Contrato congelado e handoff escrito em plano01/MEMORY.md secao 'Notas para Planos Seguintes'. Proximo: Plano 02 (allowlist), que encaixa ANTES do evaluateRoute.
- 2026-09-05: Plano 02 detalhado via /plan-feature (3 fases, ~4h; o PLAN.md dizia ~3h e foi corrigido). 14 decisoes de planejamento (DP-1..DP-14) fixadas em plano02/README.md. DP-11 e DP-12 refinadas com evidencia do codebase: needs_human faria o consolidador do verify-work descartar as issues, entao CA-07 usa complete + request_changes + bloco destacado. Gate do cache do plugin esta defasado (sem fixtures/ no SKIP_PATTERN): fixtures deste plano nao tem middleware.ts por desenho.
- 2026-09-05: Execucao do Plano 02 iniciada via /execute-plan na branch feat/route-auth-matrix-plano02 (sessao autonoma: 3 fases em sequencia, verificacao do orquestrador entre elas; requires shift-left-security-pipeline esta completed). fase-01 (parser allowlist fail-closed + publica-declarada antes do motor) concluida no commit 10f7e89. Suite 2012 pass / 0 fail (+16: 12 da lib nova, 4 do motor); typecheck limpo; agents:contract 39 pass; CA-03 e CA-04b verdes. RED-check do orquestrador: com matchAllowlist trocado por null, os 2 testes CA-03 falham com 'Received length: 1'; restaurado identico. Executor reportou zero DI/BUG/GT/DEV.
- 2026-09-05: fase-02 (entrada ampla → ALLOW-* high; duplicata recusada; buildContractIssues com ALLOW-* antes de ROUTE-*) concluida no commit 7fcc8e9. Suite 2021 pass / 0 fail (+9: 6 do parser, 3 do motor); typecheck limpo; agents:contract 39 pass; CA-04 verde (2 testes) e CA-04b consolidado. RED-check do orquestrador: isWideEntry → false derruba CA-04 no motor ('Received length: 0') e no parser; restaurado identico. DI-fase02-1 registrada na MEMORY (RED do motor foi de compilacao por import novo, nao por assertion).
- 2026-09-05: fase-03 (indeterminada → finding medium; allowlist no diff → changed + delta via seam readAtBase de 3 estados; bloco destacado na secao 11 do agente e no Step 3 do verify-work) concluida no commit 61387f9. PLANO 02 COMPLETO (3/3). Suite 2033 pass / 0 fail (+12 sobre a fase-02); typecheck limpo; agents:contract 39 pass; CA-07 (6 testes) e CA-10 verdes; edicoes em agente e SKILL 100% aditivas. BUG-fase03-1: git cat-file -e rev:path sai 128 para path ausente — executor trocou por leitura do stderr do git show; orquestrador (DI-fase03-2) trocou por git ls-tree, sem parse de texto. RED-check do orquestrador: indeterminada→low derruba CA-10; changed forcado false derruba CA-07; absent nunca disparando derruba 'returns absent'. Handoff em plano02/MEMORY.md 'Notas para Planos Seguintes'. Proximo: Plano 03 (G2), que reusa readAtBase e consome delta.removed.
