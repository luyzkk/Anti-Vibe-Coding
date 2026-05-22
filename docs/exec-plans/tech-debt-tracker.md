# Tech Debt Tracker

Formal tracker complementing `TODO.md`. Use for items that require planning before resolution.

| Item | Impact | Owner | Next Step | Added |
|------|--------|-------|-----------|-------|
| [TD-01](#td-01-migrar-plan-feature-e-quick-plan-para-faseplaninput-v1) | High | Luiz | Trigger-based or 2026-06-20 deadline | 2026-05-21 |

---

## TD-01: Migrar `/plan-feature` e `/quick-plan` para FasePlanInput v1

**Status:** active
**Created:** 2026-05-21
**Owner:** Luiz (handoff aceito)
**ADR:** [ADR-0022](design-docs/ADR-0022-faseplan-schema-andre-parity.md)
**PRD predecessor:** [refactor-populate-plan-faseplanv1](active/2026-05-21-refactor-populate-plan-faseplanv1/PRD.md)
**Soft deadline:** 2026-06-20 (30 dias do merge da Feature A)

### Resumo

Apos o merge da Feature A (init usa `FasePlanInput v1` e `renderFasePlan`),
ha divergencia entre o schema do init e o formato gerado por `/plan-feature`
e `/quick-plan`. A LLM consumindo planos em projetos reais ve dois shapes
diferentes, o que prejudica a interpretacao.

Feature B unifica: ambos consumiriam o mesmo `renderFasePlan` (idealmente
movido para `skills/lib/render-fase-plan.ts` para ser cross-skill).

### Triggers para disparar

Disparar PRD-B quando QUALQUER um dos abaixo acontecer:
- Primeira fase gerada via `/plan-feature` com formato divergente confundir a
  LLM em projeto real (registrar episodio aqui se ocorrer).
- 2026-06-20 (soft deadline — extensivel se outras prioridades).
- Dev decidir refatorar `/plan-feature` por outro motivo e quiser ja unificar.

### Arquivos esperados de tocar

- `skills/plan-feature/lib/...` — logica de geracao de fase
- `skills/quick-plan/lib/...` — se aplicavel
- `skills/init/lib/render-fase-plan.ts` -> possivel mover para `skills/lib/render-fase-plan.ts`
- Templates em `skills/plan-feature/templates/fase-template.md`

### Reversibilidade

Medio. Reverter exige migrar consumidores de volta ao formato antigo. Schema fica
como contrato publico do plugin — mudar exige minor version + nota em CHANGELOG.

### Notas

- Nao bundle com Feature A (decisao 1 da ADR-0022 — encadeadas).
- Aproveitar tudo que foi validado em Feature A (renderer puro, drift test, etc).
- Goldens de `/plan-feature` provavelmente regeneram tambem — atomicidade no commit.
