# Fase 05: Final Validation (gates do plugin + suite completa)

**Plano:** 02 — Orchestrator, Hierarchy, Goldens
**Sizing:** 1-2h
**Depende de:** fase-03 (goldens precisam estar regenerados); fase-04 paralela ja resolvida
**Visual:** false

---

## O que esta fase entrega

Gate final: roda todos os checks do plugin para garantir que a Feature A nao quebrou nada e atende todos os criterios de aceite (CA-01 a CA-10 do PRD). Inclui `bun run harness:validate`, `bun run compound:check`, lint, typecheck, suite completa. Se algum check falhar, esta fase NAO esta completa — bug eh investigado antes de marcar feature como done.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/STATE.md` | Modify | Atualiza progress final (9/9 fases) |
| `docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/PLAN.md` | Modify | Preenche Validation Log + Lessons Captured se aplicavel |
| `docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/plano01/MEMORY.md` | Modify | Notas finais |
| `docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/plano02/MEMORY.md` | Modify | Notas finais + handoff para Feature B |

---

## Implementacao

### Passo 1: Rodar a bateria de checks

```bash
# 1. Type-checker em modo strict (CLAUDE.md global — Verificacao Forcada)
bun run typecheck

# 2. Linter
bun run lint

# 3. Suite completa
bun test

# 4. Gates do plugin
bun run harness:validate
bun run compound:check

# 5. E2E especificos
bun test tests/e2e/init-cutover-greenfield.test.ts
```

Cada comando deve retornar exit code 0. Se algum falhar:
- NAO marcar fase como completa
- Investigar root cause
- Adicionar bug em `plano02/MEMORY.md`
- Aplicar fix
- Reexecutar a bateria

### Passo 2: Re-checar criterios de aceite do PRD um a um

Abrir `docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/PRD.md` e ler os 10 CAs.

Marcar cada CA com evidencia objetiva:

| CA | Como validar |
|----|-------------|
| CA-01 (10 H2 ordem Andre) | `bun test skills/init/lib/render-fase-plan.test.ts --grep "emits H2"` retorna verde |
| CA-02 (1 pasta {date}-populate-harness/) | `bun test skills/init/lib/populate-plan-generator.test.ts --grep "ONE folder"` retorna verde |
| CA-03 (PRD + CONTEXT + PLAN + 16 fase) | mesmo arquivo, teste `"folder contains"` retorna verde |
| CA-04 (16 docs com 6 campos novos) | `bun test skills/init/lib/populate-instructions-table.test.ts` retorna verde |
| CA-05 (16 .md guidance existem) | `bun test skills/init/lib/populate-guidance-files.test.ts` retorna verde |
| CA-06 (drift test passa) | `bun test skills/init/lib/populate-guidance-drift.test.ts` retorna verde |
| CA-07 (Final Report Contract hardcoded) | snapshot test do renderer mostra `## Final Report Contract` |
| CA-08 (Step 7 summary novo) | `bun test skills/init/lib/steps/07-generate-populate-plans.test.ts` retorna verde |
| CA-09 (Performance < 2s) | test "completes in under 2s" no generator retorna verde |
| CA-10 (goldens e2e regenerados) | `bun test tests/e2e/init-cutover-greenfield.test.ts` retorna verde |

Se qualquer CA falhar: voltar para a fase correspondente e completar.

### Passo 3: Atualizar STATE.md

```markdown
# State: Refatorar populate-plan-generator → hierarquia + FasePlanInput v1

**Plan:** ./PLAN.md
**Phase:** completed
**Current Plan:** 02/2
**Last Updated:** {YYYY-MM-DD}

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Schema + Renderer + Data | 4 | 4/4 | completed |
| 02 | Orchestrator + Hierarchy + Goldens | 5 | 5/5 | completed |

## Progress Global

Fases done: 9/9 (100%)

## Log

- 2026-05-21: PRD escrito via /write-prd (auto mode)
- 2026-05-21: PLAN.md + STATE.md gerados via /plan-feature inline
- 2026-05-21: plano01/ e plano02/ detalhados gerados
- {YYYY-MM-DD}: Plano 01 fase-01 a fase-04 completas (renderer + data + guidance + drift)
- {YYYY-MM-DD}: Plano 02 fase-01 a fase-05 completas (orquestrador + goldens + tech-debt + validation)
- {YYYY-MM-DD}: Final validation OK — todos os 10 CAs do PRD verificados
- {YYYY-MM-DD}: Feature B (TD-01) registrada em tech-debt-tracker.md
```

### Passo 4: Preencher Validation Log do PLAN.md

```markdown
## Validation Log

### {YYYY-MM-DD} — Final validation
- `bun run typecheck`: passed
- `bun run lint`: passed (0 new warnings)
- `bun test`: {N} passed, 0 failed
- `bun run harness:validate`: passed
- `bun run compound:check`: passed
- `bun test tests/e2e/init-cutover-greenfield.test.ts`: passed
- CA-01..CA-10 do PRD verificados (ver Plano 02 fase-05)
```

### Passo 5: Decidir sobre Compound Capture

Per CLAUDE.md ("Compound Decision Gate"): apos completar a feature, perguntar se algo eh durable o suficiente para virar compound note.

**Candidatos** (do Compound Opportunity do PLAN.md):
- "Schema deterministico + guidance interpretativa em .md" — Eh durable? Provavelmente SIM se Feature B confirmar que o padrao escala.
- "Drift test entre data e prosa" — Eh durable? SIM — eh pattern reutilizavel para qualquer schema+prosa em outros lugares.
- "Lazy loading de prosa em renderer puro" — Eh durable? Provavelmente NAO sozinho (eh detalhe), mas pode entrar em compound maior.
- "Hierarquia PRD+CONTEXT+PLAN+fase como contrato vs flat" — Eh durable? Discutivel — pode ser observacao especifica deste contexto.

**Decisao recomendada:** capturar compound note sobre o **drift test pattern** (eh reusable e foi descoberto durante esta feature). As outras esperam Feature B confirmar.

Sugerir ao dev:
> "Esta feature ensinou ao repo um pattern durable (drift test entre schema e prosa)? Quer rodar /anti-vibe-coding:lessons-learned para capturar?"

### Passo 6: Notas finais nos MEMORY.md

`plano01/MEMORY.md` — campo "Notas para Planos Seguintes" preenchido com paths finais e shape:
- Arquivos novos: `render-fase-plan.ts`, `populate-harness-{prd,context,plan-overview}-template.ts`, 16 `.md` em `assets/populate-guidance/`
- Arquivos deletados: `assets/snippets/populate-plan-template.md`
- Funcoes publicas exportadas

`plano02/MEMORY.md` — campo "Notas para Feature B":
- `renderFasePlan` continua em `skills/init/lib/` por enquanto — Feature B move para `skills/lib/` (cross-skill)
- Drift test eh reusable — Feature B pode rodar versao similar para `/plan-feature` templates

---

## Gotchas

- **G1:** "Final validation" NAO eh formalidade. Cada check tem que retornar exit code 0 — sem hand-waving. Se algum falhar, fase NAO esta completa.
- **G2:** `bun run harness:validate` pode falhar se algum doc em `docs/` ficou com placeholder. NAO eh este plano que popula docs do plugin — eh outro fluxo. Se falhar, investigar se foi efeito colateral do refactor.
- **G3:** Compound capture eh **gate**, nao opcional. Se voce reportar Feature A como "feita" sem refletir sobre compound, esta violando CLAUDE.md. Pode decidir "nao capturar" — mas explicitamente.
- **G4 (local):** Se a suite tem flake (testes que falham as vezes), rodar 3x para ter certeza. NAO mascarar flake como "passou".

---

## Verificacao

### Checklist

- [ ] `bun run typecheck` passa
- [ ] `bun run lint` passa
- [ ] `bun test` passa (suite completa)
- [ ] `bun run harness:validate` passa
- [ ] `bun run compound:check` passa
- [ ] `bun test tests/e2e/` passa
- [ ] CA-01 a CA-10 do PRD verificados objetivamente
- [ ] STATE.md atualizado para `Phase: completed`, 9/9 fases done
- [ ] Validation Log em PLAN.md preenchido com data e resultado dos checks
- [ ] Compound capture decidido (capturar OU registrar explicitamente o "nao")
- [ ] MEMORY.md de plano01 e plano02 com notas finais

---

## Criterio de Aceite

**Por maquina:**
- Comando atomico: `bun run typecheck && bun run lint && bun test && bun run harness:validate && bun run compound:check` retorna exit 0
- `grep "Phase: completed" docs/exec-plans/active/2026-05-21-refactor-populate-plan-faseplanv1/STATE.md` retorna match

**Por humano:**
- Os 10 CAs do PRD foram verificados com evidencia objetiva (nao "achei que estava ok")
- Compound capture decidido conscientemente (sim ou nao, com razao)

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
