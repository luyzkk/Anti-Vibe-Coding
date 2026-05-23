# Tech Debt Tracker

Formal tracker complementing `TODO.md`. Use for items that require planning before resolution.

| Item | Impact | Owner | Next Step | Added |
|------|--------|-------|-----------|-------|
| TD-02: Telemetria boilerplate duplicada em N skills — candidato a helper compartilhado | Médio (manutenção: change em 1 lugar requer edit em 6+ SKILL.md) | — | PRD próprio cobrindo refactor de telemetria em todas as skills (não no escopo do compound-engineering-port) | 2026-05-23 |
| TD-03: 8 testes falhando no baseline pre-Wave-3 — `v6-path-whitelist` (x6) + `CA-09 grep-deleted-steps` (x2). Sem relação com Wave 3; bloqueiam suite 100% verde. | Baixo (ruído de baseline; cada nova feature precisa subtrair 8 falhas mentalmente) | — | Investigar isoladamente: rodar `bun run test 2>&1 \| grep -A 3 "v6-path-whitelist"` para extrair contexto e decidir fix vs `skip` justificado. Não bloquear features novas. | 2026-05-23 |

---

## Won't Fix

### TD-01: Migrar `/plan-feature` e `/quick-plan` para FasePlanInput v1

**Status:** won't-fix
**Created:** 2026-05-21
**Closed:** 2026-05-22
**Owner:** Luiz
**ADR:** [ADR-0022](design-docs/ADR-0022-faseplan-schema-andre-parity.md) (ver Amendment 2026-05-22)
**PRD predecessor:** [refactor-populate-plan-faseplanv1](completed/2026-05-21-refactor-populate-plan-faseplanv1/PRD.md)
**Wont entry:** [wonts/15-migrate-plan-feature-faseplanv1.md](../../wonts/15-migrate-plan-feature-faseplanv1.md)

### Razao do descarte (2026-05-22)

Apos discussao com base na evidencia historica:

1. **Trigger primario nao disparou:** TD-01 listava "primeira fase gerada via `/plan-feature`
   confundir a LLM em projeto real" como gatilho. Nenhum episodio foi registrado entre
   2026-05-21 e 2026-05-22.

2. **Pattern ainda nao validado universalmente:** O SUMMARY de Feature A explicitamente
   marcou "Schema deterministico + guidance interpretativa em `.md`" como lesson candidata
   condicionada a "esperar Feature B confirmar antes de capturar como pattern universal".
   A propria Feature A reconheceu a validacao pendente.

3. **Tensao estrutural identificada:** Schema `FasePlanInput v1` foi desenhado para fases
   do init (popular docs canonicos). `/plan-feature` gera fases de implementacao de codigo,
   que precisam de code snippets ricos em `## Implementacao`. O campo `waves.items: string[]`
   nao suporta blocos de codigo nativamente — migrar perderia riqueza inline.

4. **Custos > beneficios teoricos:** Unificacao seria perda concreta (riqueza de implementacao)
   em troca de ganho teorico (LLM "menos confusa") sem evidencia empirica do problema.

### Reabertura

Reabrir SE acontecer:
- Primeira fase real gerada por `/plan-feature` pos-Feature-A produzir confusao mensuravel
  da LLM (registrar episodio em compound notes antes de reabrir).
- Decisao de evoluir schema para v2 com suporte nativo a prosa rica (campo
  `implementationDetail` ou similar) — neste caso, B vira candidata natural junto da evolucao.

Se reaberto, criar novo PRD — nao reusar o anterior (estava em draft, foi removido).
