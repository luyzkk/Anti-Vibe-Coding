# State: Matriz Rota x Middleware de Auth no Auditor

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/4
**Last Updated:** 2026-09-03

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fundacao + Tracer Bullet (Next.js) | 5 | 4/5 | in-progress |
| 02 | Allowlist e veredictos completos | 3 | 0/3 | pending |
| 03 | G2: cobertura perdida | 3 | 0/3 | pending |
| 04 | Os outros tres adaptadores + multi-stack | 5 | 0/5 | pending |

## Progress Global

Fases done: 4/16 (25%)

## Log

- 2026-09-03: Plano criado via /plan-feature (4 planos, 16 fases). Decisao de planejamento: o
  `security-auditor` ganha `Bash` para invocar libs TS em `skills/security/lib/` — precedente em
  `dependency-auditor`, `tdd-verifier`, `database-analyzer`. Tracer bullet = Plano 01 fase-01.
- 2026-09-04: Execucao iniciada via /execute-plan na branch feat/route-auth-matrix-plano01. Dev optou por rodar as 5 fases em sequencia, com validacao entre elas.
- 2026-09-04: fase-01 (tracer bullet) concluida no commit cde2582. Cadeia end-to-end provada: fixture -> lib -> finding CRITICO -> security-auditor com Bash restrito. Suite 1887 pass / 0 fail. RED-check do orquestrador confirmou que o teste falha quando o alvo e reintroduzido. Pendente: validar que CLAUDE_PLUGIN_ROOT chega ao Bash do subagente.
- 2026-09-04: fase-02 (contrato de tipos) concluida no commit 0c3caeb, executada direto pelo orquestrador (dev recusou o subagente). Contrato congelado: mudanca em route-auth-matrix.types.ts agora reabre os tres adaptadores do Plano 04. Campo handler acrescentado ao Route por exigencia do criterio 'por humano'. Suite 1898 pass / 0 fail.
- 2026-09-04: fase-03 (enumeracao App Router) concluida no commit 8ada239. Fixture ampliada de 1 para 6 rotas; adaptador movido para route-auth-nextjs.ts. Suite 1911 pass / 0 fail. Proxima: fase-04, que PARA no Passo 0 para decisao do dev sobre o parser (DI-0b).
- 2026-09-04: fase-04 (match real do matcher) concluida no commit 15f7464. Gate do Passo 0 disparou: parser nao resolve do cache (GT-fase04-1); dev escolheu parser proprio (DI-fase04-parser). Zero dependencia nova. Suite 1933 pass / 0 fail. Falta so a fase-05 (regra de severidade + escopo G1 pelo diff).
