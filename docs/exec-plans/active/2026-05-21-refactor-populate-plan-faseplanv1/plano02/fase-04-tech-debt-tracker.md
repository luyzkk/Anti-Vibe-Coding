# Fase 04: Registrar Feature B em `tech-debt-tracker.md`

**Plano:** 02 — Orchestrator, Hierarchy, Goldens
**Sizing:** 30min
**Depende de:** — (paralela; pode rodar simultaneamente com fase-01/02/03)
**Visual:** false

---

## O que esta fase entrega

Cria (ou atualiza) `docs/exec-plans/tech-debt-tracker.md` com uma entrada formal para **Feature B**: migrar `/plan-feature` e `/quick-plan` para reusar `FasePlanInput v1` + `renderFasePlan`. Sem essa entrada, B vira debito eterno — a "Continuação Compromissada" do PRD-A fica retorica.

A entrada inclui: trigger (quando disparar), soft deadline (30 dias do merge), arquivos afetados, e link para a ADR-0022.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/tech-debt-tracker.md` | Create or Modify | Adiciona entrada para Feature B |

---

## Implementacao

### Passo 1: Verificar se o arquivo existe

```bash
ls docs/exec-plans/tech-debt-tracker.md || echo "MISSING"
```

Se nao existir: criar com cabecalho e primeira entrada.
Se existir: anexar nova entrada na secao "Active Items" (manter ordenacao por data).

### Passo 2: Conteudo da entrada (template)

```markdown
## TD-{NN}: Migrar /plan-feature e /quick-plan para FasePlanInput v1

**Status:** active
**Created:** {YYYY-MM-DD do merge do Plano 02}
**Owner:** Luiz (handoff aceito)
**ADR:** [ADR-0022](../design-docs/ADR-0022-faseplan-schema-andre-parity.md)
**PRD predecessor:** [refactor-populate-plan-faseplanv1](active/2026-05-21-refactor-populate-plan-faseplanv1/PRD.md)

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
- 30 dias apos o merge da Feature A (soft deadline — adicionar data exata abaixo).
- Dev decidir refatorar `/plan-feature` por outro motivo e quiser ja unificar.

**Soft deadline:** {YYYY-MM-DD + 30 dias}

### Arquivos esperados de tocar

- `skills/plan-feature/lib/...` — logica de geracao de fase
- `skills/quick-plan/lib/...` — se aplicavel
- `skills/init/lib/render-fase-plan.ts` → possivel mover para `skills/lib/render-fase-plan.ts`
- Templates em `skills/plan-feature/templates/fase-template.md`

### Reversibilidade

Medio. Reverter exige migrar consumidores de volta ao formato antigo. Schema fica
como contrato publico do plugin — mudar exige minor version + nota em CHANGELOG.

### Notas

- Nao bundle com Feature A (decisao 1 da ADR-0022 — encadeadas).
- Aproveitar tudo que foi validado em Feature A (renderer puro, drift test, etc).
- Goldens de `/plan-feature` provavelmente regeneram tambem — atomicidade no commit.
```

### Passo 3: Caso o arquivo nao exista — criar com cabecalho

```markdown
# Tech Debt Tracker

Lista de itens de debito tecnico aceitos no plugin Anti-Vibe-Coding. Cada item
tem trigger explicito para reativacao — debito reconhecido NAO eh debito esquecido.

Convencao:
- Cada item eh um H2 `## TD-{NN}: {titulo}`
- Frontmatter: Status, Created, Owner, ADR (opcional), PRD predecessor (opcional)
- Corpo: Resumo, Triggers, Arquivos esperados, Reversibilidade, Notas
- Items ordenados por data de criacao (mais recente embaixo)

---

## Active Items

{... entrada da TD-01 aqui ...}

## Resolved Items

(vazio)
```

### Passo 4: Commit isolado (paralelo a fase-01/02/03)

```bash
git add docs/exec-plans/tech-debt-tracker.md
git commit -m "docs(plan): register Feature B as TD-01 — /plan-feature unification (ADR-0022)"
```

Este commit pode ir ANTES do commit do refactor — eh independente.

---

## Gotchas

- **G1:** Soft deadline eh referencial, NAO bloqueador. Se 30 dias passarem e Feature B nao for prioridade, dev pode estender — apenas registrar aqui que estendeu.
- **G2:** O trigger "Primeira fase com formato divergente confundir a LLM" eh subjetivo. Aceitavel: dev julga.
- **G3:** Se `tech-debt-tracker.md` ja existir com outras entradas, ler convencao usada antes de adicionar — manter consistencia.
- **G4:** A data exata do soft deadline so pode ser calculada APOS o merge da Feature A (data de merge + 30 dias). Substituir placeholder `{YYYY-MM-DD + 30 dias}` no momento do commit.
- **Local:** Este commit eh **independente** dos outros — pode ir paralelo ao refactor. NAO esperar fase-03 para commitar tech-debt-tracker.

---

## Verificacao

### Checklist

- [ ] `docs/exec-plans/tech-debt-tracker.md` existe
- [ ] Contem entrada `## TD-01: Migrar /plan-feature e /quick-plan para FasePlanInput v1`
- [ ] Entrada inclui: Status, Created, Owner, ADR link, Triggers, Soft deadline, Arquivos, Reversibilidade
- [ ] Link para ADR-0022 resolve (`../design-docs/ADR-0022-faseplan-schema-andre-parity.md`)
- [ ] Link para PRD-A resolve (`active/2026-05-21-refactor-populate-plan-faseplanv1/PRD.md`)
- [ ] Commit message menciona ADR-0022

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/exec-plans/tech-debt-tracker.md && echo OK`
- `grep "TD-01" docs/exec-plans/tech-debt-tracker.md`
- `grep "ADR-0022" docs/exec-plans/tech-debt-tracker.md`
- Links do markdown resolvem em editor (verificar visualmente)

**Por humano:**
- Soft deadline calculado corretamente (data merge + 30 dias)
- Triggers claros, acionaveis

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
