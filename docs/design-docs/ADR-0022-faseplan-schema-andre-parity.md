---
adr-id: 0022
title: "FasePlanInput v1 — Paridade Estrutural com Harness do Andre + Extensoes AVC"
date: 2026-05-21
status: active
tags: [init, plan-feature, populate-plan, schema, andre-parity, hybrid-prose-code]
---

# ADR-0022: FasePlanInput v1 — Paridade Estrutural com Harness do Andre + Extensoes AVC

## Context

O gerador atual `skills/init/lib/populate-plan-generator.ts` produz 16 `PLAN.md`
soltos (um por doc canonico) sob `docs/exec-plans/active/{date}-populate-{slug}/PLAN.md`.
Isso viola a convencao de exec-plan do proprio plugin, em que:

- `PRD.md` = contrato (O QUE construir)
- `CONTEXT.md` = decisoes/background (POR QUE)
- `PLAN.md` = OVERVIEW da feature (lista de sub-planos)
- `planoNN/fase-XX-*.md` = spec executavel de 1 passo

Alem do problema estrutural, o conteudo das instrucoes esta hardcoded como
strings em TypeScript (`populate-instructions-table.ts`), perdendo a liberdade
interpretativa da LLM. Por comparacao, o Harness do Andre Prado mantem prosa
rica per-doc em `SKILL.md` (secao First Use Customization), o que a LLM consome
sem reducao estrutural.

A consulta `/anti-vibe-coding:consultant` (sessao 2026-05-21) auditou os
trade-offs entre (a) bundle vs encadeadas e (b) campos do `FasePlanInput`.
Esta ADR registra as decisoes resultantes.

## Decision

A partir de 2026-05-21, todo plano executavel do plugin (init populate-harness,
`/plan-feature`, futuras skills produtoras de fase) adota o schema **`FasePlanInput v1`**:
base literal das 10 secoes H2 do Andre + extensoes AVC. A guidance interpretativa
fica em `.md` per-doc; a estrutura deterministica fica em TS.

A implementacao e dividida em **duas features encadeadas** (NAO bundle):

- **Feature A** — Refatorar `populate-plan-generator` para emitir hierarquia
  `PRD/CONTEXT/PLAN/fase-XX` adotando `FasePlanInput v1`. Blast radius pequeno
  (so init). Schema validado contra 1 consumidor antes de propagar.
- **Feature B** — Migrar `/plan-feature` e demais skills produtoras de fase
  para o mesmo `FasePlanInput v1`. Blast radius grande, executada apos A
  estabilizar.

## Specific Decisions

| # | Decision | Choice | Rejected Alternative | Reason |
|---|----------|--------|----------------------|--------|
| 1 | Estrategia de implementacao | Encadeadas (A entao B) | Bundle unico; so A deferindo B | Schema validado em 1 consumidor antes de propagar; reversibilidade > atomicidade. |
| 2 | Localizacao da guidance interpretativa | `skills/init/assets/populate-guidance/{slug}.md` | Hardcoded em TS (status atual); apenas SKILL.md global (estilo Andre) | Liberdade interpretativa da LLM + editavel sem recompilar + per-doc (mais granular que Andre). |
| 3 | Base H2 do schema | 10 secoes do Andre literal, ordem fixa | Reordenar/renomear para "ficar nosso" | Copy-then-improve: piso = Andre literal. Renomear quebra paridade. |
| 4 | Campo `detectionSignals: string[]` | Incluir (signals a grepar antes de escrever) | Deferir e confiar so na guidance prose | LLM nao e exata — quanto mais direto, melhor (decisao explicita do dev). |
| 5 | Campo `stackVariants` | Incluir, limitado a Rails / Next+React / Node+TS | Deferir como YAGNI; cobrir 5 stacks | 3 stacks sao realidade hoje; Laravel/Python adicionados quando aparecer caso real. |
| 6 | "Final Report Contract" | Hardcoded no renderer como secao fixa | Campo no `FasePlanInput` | Template fixo, nao parametrizavel — colocar como campo seria abstracao prematura. |
| 7 | Campos novos `validationCommand` + `dependsOn` | Adicionar | Manter implicito em prosa | Permite gate automatico e paralelizacao confiavel. |
| 8 | `schemaVersion: 1` no `FasePlanInput` | Adicionar agora (custo zero) | Deferir ate v2 existir | Prepara evolucao sem migration path retroativo; renderer aceita N versoes. |
| 9 | Output do init populate | 1 pasta `{date}-populate-harness/` com PRD + CONTEXT + PLAN + 16 fase-XX | 16 PLAN.md soltos (status atual); 16 pastas separadas | Respeita convencao do proprio plugin; LLM ve overview antes de executar. |
| 10 | Cobertura de Feature B no PRD-A | Secao "Continuacao Compromissada" + entrada em `tech-debt-tracker.md` | Apenas confiar que B sera feita "em algum momento" | Evita que B vire debito eterno; sinal concreto para reativar. |

## Alternatives Considered

1. **Bundle unico (A + B numa exec-plan so)**
   - Rejeitado: schema desenhado contra 2 consumidores simultaneos aumenta risco
     de premature abstraction; rollback exige reverter tudo ou nada; blast radius
     desnecessario.

2. **Apenas Feature A, deferir B sem compromisso formal**
   - Rejeitado: `/plan-feature` e usado a todo momento — divergencia entre
     schemas de init e `/plan-feature` confunde a LLM em projetos reais.
     B nao e YAGNI; e uso atual.

3. **Manter guidance em TS hardcoded, so refatorar a hierarquia**
   - Rejeitado: nao resolve a perda de liberdade interpretativa. Strings TS viram
     bullets achatados; prosa rica em `.md` permite a LLM "entender o espirito"
     e adaptar ao projeto real (lacuna observada vs Andre).

4. **Guidance apenas no SKILL.md global (estilo Andre puro)**
   - Rejeitado: guidance generica num unico arquivo se dilui — LLM precisa
     "lembrar" de aplicar contexto certo a cada doc. Per-doc `.md` segmenta.

5. **Adotar `detectionSignals` so depois de medir se LLM ignora a prosa**
   - Rejeitado pelo dev: LLM nao e exata, quanto mais direto melhor. Custo
     baixo de manter campo populado em paralelo com prosa.

6. **`stackVariants` deferido como YAGNI ate aparecer caso concreto**
   - Rejeitado pelo dev: as 3 stacks (Rails, Next+React, Node+TS) sao realidade
     hoje em projetos cliente; valor incremental > custo da abstracao.

7. **Encadeadas com compromisso formal de B** (esta ADR) ✓

## Schema Final — FasePlanInput v1

```typescript
type FasePlanInput = {
  // === Identidade ===
  docPath: string                              // ex: "docs/SECURITY.md"
  schemaVersion: 1                             // versionamento futuro

  // === Base Andre (10 H2 literal, ordem fixa) ===
  goal: string
  scope: { in: string[]; out: string[] }
  assumptions: string[]
  risks: RiskEntry[]
  waves: Wave[]                                // Execution Steps
  reviewChecklist: string[]
  // Validation Log    -> placeholder vazio no renderer
  compoundOpportunity: string
  // Lessons Captured  -> placeholder vazio no renderer
  exitCriteria: string[]

  // === Extensoes AVC ===
  guidanceFile: string                         // -> skills/init/assets/populate-guidance/{slug}.md
  detectionSignals: string[]                   // sinais a grepar antes de escrever
  mustCover: Record<string, string[]>          // H2 -> checklist interno
  linkTargets: string[]                        // links obrigatorios pra outros docs
  stackVariants?: {
    rails?: string
    nextjs?: string                            // Next + React
    'node-ts'?: string                         // Node + TypeScript (sem Next)
  }
  validationCommand: string                    // comando que fecha a fase
  dependsOn: string[]                          // IDs de fases anteriores
}
```

Hardcoded no renderer (nao no input): **Final Report Contract** — secao fixa
do template espelhando o formato do Andre (files added / customized / unchanged /
unresolved TODOs / validation result / first plan path).

## Consequences

Positivas:
- Output do init populate alinhado com a convencao do proprio plugin (PRD/CONTEXT/PLAN/fase).
- LLM ganha liberdade interpretativa via `.md` per-doc sem perder gates deterministicos.
- Paridade estrutural com o Harness do Andre garantida — todo doc canonico tem
  o piso "First Use Customization" + nossas extensoes.
- `schemaVersion: 1` prepara evolucao sem locking; renderer pode aceitar v2 no futuro
  sem migration retroativa.
- Schema unificado entre init e `/plan-feature` apos Feature B — uma so fonte
  de verdade para fases executaveis.

Negativas:
- **Goldens regeneram** — `tests/e2e/__golden__/init-greenfield.*` (2-3 arquivos)
  precisam atualizar. Commit do golden vai junto com Feature A; CI nao quebra entre commits.
- **Janela de divergencia** entre A merged e B iniciada — init usa schema novo,
  `/plan-feature` usa formato antigo. Mitigado pelo compromisso formal em PRD-A +
  `tech-debt-tracker.md`.
- **Risco de drift** entre `guidance/*.md` e `mustCover` (prosa diz "Auth Flow",
  mustCover diz "Authentication Flow"). Mitigado por teste validador (PRD-A inclui).
- Surface de manutencao cresce: 16 arquivos novos em `assets/populate-guidance/`.
  Aceitavel pelo valor de editabilidade sem recompilar.

## Reversibility

**Schema (`FasePlanInput v1`):** parcialmente reversivel.
- Reverter os 5 campos novos (detectionSignals, mustCover, linkTargets,
  stackVariants, validationCommand, dependsOn) e trivial — sao opcionais para o
  renderer interpretar (ausencia = secao curta).
- Reverter a base 10 H2 do Andre nao se aplica — e literal do upstream.
- Reverter `schemaVersion: 1` quebra contrato uma vez planos estiverem em
  produçao em projetos cliente; preferivel evoluir para v2.

**Feature A (output hierarchy):** totalmente reversivel via git revert.
Planos legados em `docs/exec-plans/active/` em projetos cliente nao sao tocados —
renderer so emite novos.

**Feature B (cross-skill schema):** medio.
- Reversao requer migrar consumidores de volta ao formato antigo.
- Schema fica no plugin como contrato publico; mudar exige minor version + nota
  em CHANGELOG.

## Referencias

- Consultor session: `/anti-vibe-coding:consultant` (2026-05-21)
- Discussao predecessora: comparacao Harness Andre Prado v6.0.0 vs init AVC
- Feedback memory: `feedback_copy-then-improve.md` (piso = ferramenta validada,
  soma extensoes em cima)
- Feedback memory: `feedback_stack_knowledge_native.md` (stack-specific nativo,
  nao paridade artificial — guia a decisao sobre `stackVariants` limitado a 3)
- Codigo afetado:
  - `skills/init/lib/populate-plan-generator.ts`
  - `skills/init/lib/populate-instructions-table.ts`
  - `skills/init/assets/populate-guidance/*.md` (NOVO)
  - `tests/e2e/__golden__/init-greenfield.*` (regenerar em Feature A)
  - `skills/plan-feature/*` (Feature B)
- PRDs futuros: PRD-A (init populate hierarchy) + PRD-B (cross-skill schema)
