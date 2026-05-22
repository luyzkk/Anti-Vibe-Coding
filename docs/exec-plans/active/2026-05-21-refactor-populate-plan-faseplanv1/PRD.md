---
slug: refactor-populate-plan-faseplanv1
date: 2026-05-21
status: ready
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-21 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Refatorar populate-plan-generator para hierarquia PRD/CONTEXT/PLAN/fase + FasePlanInput v1

**Status:** Ready (auto-validado 2026-05-21 em auto mode — defaults aceitos)
**Author:** Luiz + AI (Claude)
**Date:** 2026-05-21
**Context:** ADR-0022 (`docs/design-docs/ADR-0022-faseplan-schema-andre-parity.md`)

---

## Problema

O gerador atual `skills/init/lib/populate-plan-generator.ts` (Step 7 do init) emite
**16 `PLAN.md` soltos** sob `docs/exec-plans/active/{date}-populate-{slug}/PLAN.md`
— um por doc canonico. Isso viola a convencao do proprio plugin, em que:

- `PRD.md` = contrato (O QUE construir)
- `CONTEXT.md` = decisoes/background (POR QUE)
- `PLAN.md` = overview da feature (lista os sub-planos)
- `planoNN/fase-XX-*.md` = spec executavel de 1 passo

Cada doc canonico (SECURITY.md, ARCHITECTURE.md, etc.) e logicamente uma **fase**
de uma feature unica "popular o harness", nao 16 features paralelas.

Alem do problema estrutural, as instrucoes por doc estao **hardcoded como strings
em TypeScript** (`populate-instructions-table.ts`). A LLM consumindo o PLAN.md
gerado le bullets achatados, sem espaco para interpretacao rica. Em contraste, o
Harness do Andre Prado mantem prosa rica per-doc na secao First Use Customization
do `SKILL.md`, e a LLM consome sem reducao estrutural.

**Impacto observado:** planos gerados pelo init ficam menos densos que os do Andre.
Quando executados via /execute-plan, deixam pendencias e placeholders que os
planos do Andre nao deixariam. A decisao arquitetural correspondente esta em
[ADR-0022](../../design-docs/ADR-0022-faseplan-schema-andre-parity.md).

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- A LLM executando `/execute-plan` no projeto cliente recebe **1 pasta** com
  hierarquia canonica completa, em vez de 16 pastas isoladas.
- Cada fase contem **base Andre (10 H2 literais, ordem fixa) + extensoes AVC**
  (`guidanceFile`, `mustCover`, `detectionSignals`, `linkTargets`,
  `stackVariants`, `validationCommand`, `dependsOn`).
- Guidance prose rica per-doc vive em arquivos `.md` editaveis, **fora do
  TypeScript** — devs alteram prosa sem recompilar/re-testar.
- Stack-aware paths (Wave 1) continuam deterministicos e testaveis via grep-gate.
- `harness:validate` verifica integridade do par `{fase.md ↔ guidance.md}` para
  prevenir drift.

### Mecanismo (algoritmico — o COMO)

Baseado em ADR-0022 (FasePlanInput v1 schema + Feature A→B encadeadas).

1. **Schema novo** em `skills/init/lib/render-fase-plan.ts` (renderer
   compartilhado, prepara Feature B):

   ```typescript
   type FasePlanInput = {
     docPath: string
     schemaVersion: 1
     // Base Andre (10 H2, ordem fixa)
     goal, scope { in, out }, assumptions, risks[], waves[],
     reviewChecklist, compoundOpportunity, exitCriteria
     // Extensoes AVC
     guidanceFile: string
     detectionSignals: string[]
     mustCover: Record<string, string[]>
     linkTargets: string[]
     stackVariants?: { rails?, nextjs?, 'node-ts'? }
     validationCommand: string
     dependsOn: string[]
   }
   ```

2. **Expansao do `DocInstruction`** em `populate-instructions-table.ts` para
   produzir todos os campos novos para cada um dos 16 docs canonicos.

3. **16 arquivos novos** em `skills/init/assets/populate-guidance/{slug}.md`,
   cada um derivado e expandido a partir do First Use Customization do Andre
   (linhas 148-193 do SKILL.md upstream) + nuances AVC.

4. **Refatoracao do `generatePopulatePlans`** em
   `populate-plan-generator.ts` para emitir UMA pasta
   `{date}-populate-harness/` contendo:

   ```
   2026-XX-XX-populate-harness/
   ├── PRD.md         ← contrato gerado: "popular 16 docs"
   ├── CONTEXT.md     ← stack detectada, manifest, paths descobertos
   ├── PLAN.md        ← overview: lista as 16 fases + ordem
   ├── STATE.md       ← (vazio, /execute-plan preenche)
   └── fase-01-architecture.md ... fase-16-claude-mirror.md
   ```

5. **Renderer hardcoded** emite secao final **"Final Report Contract"** em cada
   fase, espelhando o formato do Andre (files added / customized / unchanged /
   unresolved TODOs / validation result).

6. **Goldens regenerados** em `tests/e2e/__golden__/init-greenfield.*`,
   commitados junto com a mudanca no mesmo PR (CI nao quebra entre commits).

7. **Teste validador anti-drift**: para todo H2 listado em `mustCover` de um doc
   canonico, o `guidance.md` correspondente deve conter o mesmo texto literal
   ou referencia inequivoca.

---

## Fluxos UX por Ator

<!-- Feature backend / dev-tooling — fluxos descrevem o que o dev e o agente
     LLM observam durante e apos init. -->

### Dev rodando `/anti-vibe-coding:init` em projeto greenfield

1. Init executa Steps 1-6 normalmente (detect, scaffold, link, gh files).
2. Step 7 (`generate-populate-plans`) detecta stack, le manifest, escreve UMA pasta
   `docs/exec-plans/active/{date}-populate-harness/` com 5 arquivos raiz + 16 fases.
3. Init termina com mensagem:
   > *"Harness scaffold criado. Plano populate em
   > `docs/exec-plans/active/{date}-populate-harness/PLAN.md`. Proximo passo:
   > rode `/anti-vibe-coding:execute-plan {populatePlanPath}` para a IA popular
   > cada doc canonico lendo o codigo real. Cada fase = 1 doc canonico."*

### Agente LLM executando `/execute-plan` apos init

1. LLM abre `PLAN.md` (overview) e identifica as 16 fases.
2. Para cada fase `fase-XX-{doc}.md`, LLM le:
   - As 10 secoes Andre (Goal, Scope, Risks, Waves, etc.)
   - O ponteiro `guidanceFile: skills/init/assets/populate-guidance/{slug}.md`
3. LLM abre o `guidance.md` indicado e absorve a prosa rica per-doc.
4. LLM executa Wave 1 (Discovery — grepa `detectionSignals`, le paths stack-aware).
5. LLM executa Wave 2 (Write sections), escrevendo cada H2 listado em
   `mustCover` com o conteudo derivado da Wave 1.
6. LLM roda `validationCommand` da fase. Se passar, marca fase concluida.
7. Ao final das 16 fases, LLM emite **Final Report Contract** consolidado.

---

## Requisitos Funcionais

### Must Have (maximo 40% do total)

- [ ] M1: `generatePopulatePlans` emite **1 pasta** `{date}-populate-harness/`
      contendo `PRD.md`, `CONTEXT.md`, `PLAN.md`, `STATE.md` (vazio) e 16
      `fase-XX-{doc}.md` — nao 16 PLAN.md soltos.
- [ ] M2: Schema `FasePlanInput v1` implementado com **todos os 12 campos** da
      ADR-0022 (incluindo `schemaVersion: 1`, `detectionSignals`, `mustCover`,
      `linkTargets`, `validationCommand`, `dependsOn`, `stackVariants` opcional).
- [ ] M3: 16 arquivos `skills/init/assets/populate-guidance/{slug}.md` criados
      com prosa derivada do First Use Customization do Andre + expansoes AVC,
      todos nao-vazios.
- [ ] M4: Novo renderer em `skills/init/lib/render-fase-plan.ts` compartilhavel
      (preparado para Feature B reusar).
- [ ] M5: Cada `fase-XX-{doc}.md` gerado contem as **10 secoes H2 do Andre na
      ordem literal** + secao Final Report Contract no final.
- [ ] M6: Teste validador anti-drift: para todo H2 em `mustCover`, o
      `guidance.md` correspondente contem o mesmo texto.
- [ ] M7: Goldens regenerados em `tests/e2e/__golden__/init-greenfield.*` e
      todos os testes e2e do init passam.
- [ ] M8: `harness:validate` continua passando em projeto cliente apos init.

### Should Have

- [ ] S1: Final Report Contract hardcoded no renderer (nao como campo do
      `FasePlanInput`).
- [ ] S2: Teste de coverage que verifica que cada doc canonico em
      `POPULATE_INSTRUCTIONS_BY_DOC` tem `guidance.md` correspondente
      nao-vazio.
- [ ] S3: README curto em `skills/init/assets/populate-guidance/README.md`
      explicando convencao de edicao da prosa (sem isso, devs futuros podem
      nao saber que esses arquivos sao alimentados a LLM).

### Could Have

- [ ] C1: Script `bun run sync-guidance` que diffa `mustCover` vs `guidance.md`
      e sugere atualizacoes (alem do teste validador binario).
- [ ] C2: Documentacao do schema `FasePlanInput v1` em
      `docs/design-docs/faseplan-schema.md` (referenciado pela ADR-0022).

### Won't Have (desta versao)

- Migration de planos legados em projetos cliente — **zero retroatividade**.
  Apenas novos planos usam schema novo.
- `stackVariants` para Laravel e Python — cobertos hoje apenas via Wave 1
  paths stack-aware (sem prosa). Adicionar quando aparecer caso real.
- Migration da skill `/plan-feature` para o novo renderer — **escopo da
  Feature B**, encadeada com compromisso formal (ver seccao "Continuacao
  Compromissada — Feature B").
- Versionamento real do schema (v2, migration path) — `schemaVersion: 1` e
  hardcoded; renderer nao precisa interpretar outras versoes ainda.
- Refactor profundo do `registry.ts` alem do minimo para chamar o novo
  gerador.

---

## Requisitos Nao-Funcionais

- **Performance:** `generatePopulatePlans` completa em **< 2s** (preserva NFR
  existente em [populate-plan-generator.ts:5-6]).
- **Idempotencia:** re-rodar `/init` sobrescreve planos gerados sem efeitos
  colaterais (preserva D10 / G7 documentados em
  [populate-plan-generator.ts:158-167]).
- **Determinismo:** mesmos inputs (stack, manifest, clock injetado) sempre
  produzem o mesmo output. Permite golden testing.
- **Seguranca:** nao aplica (geracao server-side de markdown, sem secrets).
- **Acessibilidade:** nao aplica (sem UI).
- **Observabilidade:** telemetria existente do init mantida; sem novas
  metricas necessarias.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Estrutura do output do init | 1 pasta `{date}-populate-harness/` com hierarquia PRD/CONTEXT/PLAN/fase | 16 pastas separadas; 1 pasta com 16 PLAN.md achatados | Respeita convencao do proprio plugin (ADR-0022 Dec 9) |
| 2 | Localizacao da guidance | `.md` per-doc em `skills/init/assets/populate-guidance/` | Hardcoded em TS (atual); SKILL.md global estilo Andre | Liberdade interpretativa da LLM + editavel sem recompilar (ADR-0022 Dec 2) |
| 3 | Renderer | Novo `render-fase-plan.ts` compartilhavel | Manter renderer local ao init | Prepara Feature B sem custo adicional (ADR-0022) |
| 4 | Schema versioning | `schemaVersion: 1` hardcoded | Sem versionamento ate v2 existir | Custo zero hoje, prepara evolucao sem migration retroativa (ADR-0022 Dec 8) |
| 5 | `stackVariants` | Limitado a `rails`, `nextjs`, `node-ts` | Deferir como YAGNI; cobrir 5 stacks | 3 stacks sao realidade hoje (ADR-0022 Dec 5) |
| 6 | Final Report Contract | Hardcoded no renderer | Campo no `FasePlanInput` | Template fixo, nao parametrizavel — abstracao prematura como campo (ADR-0022 Dec 6) |
| 7 | `detectionSignals` | Incluir como campo TS | Confiar so na prosa do `guidance.md` | LLM nao e exata; quanto mais direto melhor (ADR-0022 Dec 4, decisao explicita do dev) |
| 8 | Estrategia de implementacao | Encadeadas (A entao B) | Bundle unico; so A sem compromisso de B | Schema validado em 1 consumidor antes de propagar; reversibilidade > atomicidade (ADR-0022 Dec 1) |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado init rodando em greenfield (sem `docs/exec-plans/active/`
      preexistente), quando completar, entao existe pasta
      `docs/exec-plans/active/{YYYY-MM-DD}-populate-harness/` contendo
      `PRD.md`, `CONTEXT.md`, `PLAN.md`, `STATE.md` e exatamente 16
      `fase-XX-{doc}.md`.
- [ ] **CA-02:** Dado um `fase-XX-{doc}.md` gerado, quando inspecionado, entao
      contem as **10 secoes H2 do Andre na ordem literal** (`## Goal`,
      `## Scope`, `## Assumptions`, `## Risks`, `## Execution Steps`,
      `## Review Checklist`, `## Validation Log`, `## Compound Opportunity`,
      `## Lessons Captured`, `## Exit Criteria`) seguidas da secao
      `## Final Report Contract`.
- [ ] **CA-03:** Dado um doc canonico com `guidanceFile` apontando para
      `skills/init/assets/populate-guidance/{slug}.md`, quando o arquivo
      apontado for lido, entao existe, e nao-vazio (> 50 caracteres) e tem
      front-matter ou H1 que identifique o doc-alvo.
- [ ] **CA-04:** Dado `mustCover` de um doc canonico com chave `"Auth Flow"`,
      quando o `guidance.md` correspondente for lido, entao contem literal
      `Auth Flow` (case-sensitive) em algum ponto do texto.
- [ ] **CA-05:** Dado stack=`rails` detectada, quando `fase-XX-security.md`
      for gerado, entao Wave 1 contem paths Rails
      (`app/controllers/application_controller.rb`, `config/initializers/`)
      e, se `stackVariants.rails` estiver presente em `populate-instructions-table.ts`,
      seu conteudo aparece renderizado dentro da fase.
- [ ] **CA-06:** Dado dois runs consecutivos de `/init` no mesmo projeto,
      quando ambos completam, entao o output do segundo e bit-identico ao do
      primeiro (mesmos paths, mesmo conteudo, mesma ordem) — assumindo
      `--clock` injetado ou run em < 1s.
- [ ] **CA-07 (edge case):** Dado stack=null (detection falhou), quando init
      tenta gerar plano, entao aborta hard com mensagem clara (preserva DR-2
      do init-rationale, comportamento atual).
- [ ] **CA-08:** Dado teste validador anti-drift rodando, quando alguma H2 em
      `mustCover` nao aparece literal no `guidance.md` correspondente, entao
      o teste falha com mensagem clara identificando qual doc e qual H2.
- [ ] **CA-09:** Dado golden test em
      `tests/e2e/__golden__/init-greenfield.tree.json`, quando init rodar
      greenfield, entao a arvore de arquivos gerada bate exatamente com o
      golden (regenerado nesta entrega).
- [ ] **CA-10:** Dado teste de coverage rodando, quando algum doc canonico em
      `POPULATE_INSTRUCTIONS_BY_DOC` nao tiver `guidance.md` correspondente em
      `skills/init/assets/populate-guidance/`, entao o teste falha com lista
      dos docs faltantes.

---

## Out of Scope

- **Feature B** (migrar `/plan-feature` para reusar `render-fase-plan.ts`) — sera
  PRD separado encadeado, ver "Continuacao Compromissada" abaixo.
- **Migration de planos legados** em projetos cliente — `docs/exec-plans/active/`
  existentes nao sao tocados; so novos planos usam schema novo.
- **`stackVariants` para Laravel/Python** — limitado a `rails/nextjs/node-ts` por
  ADR-0022 Dec 5.
- **Versionamento real do schema** (v2, migration path) — `schemaVersion: 1` e
  hardcoded sem interpretacao multi-versao.
- **Refactor profundo do `registry.ts`** alem do minimo para chamar o novo gerador.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Decisao arquitetural | ADR-0022 (`docs/design-docs/ADR-0022-faseplan-schema-andre-parity.md`) | aprovada e arquivada 2026-05-21 |
| Feature subsequente | Feature B — migrar `/plan-feature` pro mesmo renderer | aguardando esta feature concluir |
| Lib existente | `skills/init/lib/populate-instructions-table.ts` | a expandir |
| Lib existente | `skills/init/lib/populate-plan-generator.ts` | a refatorar |
| Lib existente | `skills/init/lib/detect-stack.ts` | reusar — `StackId` ja exportado |
| Lib existente | `skills/init/_shared/legacy-manifest-schema.ts` | reusar — schema do manifest ja existe |
| Asset structure novo | `skills/init/assets/populate-guidance/` | criar nesta entrega |
| Source de prosa | First Use Customization do Andre (`tmp/andre-skills/harness-engineering/SKILL.md` linhas 148-193) | disponivel localmente |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Drift entre `guidance.md` e `mustCover` (prosa diz "Auth Flow", `mustCover` diz "Authentication Flow") | Media | Alto (LLM confusa) | CA-08: teste validador automatizado anti-drift (Must Have M6) |
| Goldens regenerados causam diff grande no PR review | Alta | Baixo | Commit dos goldens vai junto com a mudanca no mesmo PR; CI nao quebra entre commits |
| Prosa do `guidance.md` ficar generica demais (so copia do Andre, sem expansao AVC) | Media | Alto | Cada arquivo deriva do Andre + secao "AVC Extensions" obrigatoria + review explicito antes do merge |
| 16 arquivos novos viram dead code se ninguem atualiza | Baixa | Medio | CA-10 (teste de coverage) + S3 (README explicando convencao) |
| Schema v1 fica engessado depois de release publico | Baixa | Medio | `schemaVersion: 1` prepara evolucao; renderer pode aceitar v2 sem migration retroativa |
| Refactor do gerador quebra Step 7 do init (`generate-populate-plans` no registry) | Media | Alto | Manter assinatura publica `generatePopulatePlans(opts)`; mudancas internas; testes existentes validam contrato |
| Performance regride alem do NFR de 2s ao ler 16 `guidance.md` do disco | Baixa | Medio | Leitura lazy (so o caminho vai no plano; LLM le sob demanda) — nao injetar prosa no plano em runtime |

---

## Continuacao Compromissada — Feature B

Esta secao formaliza o compromisso de executar Feature B apos esta feature
estabilizar (ADR-0022 Dec 10).

**Feature B:** Migrar `/plan-feature` (e demais skills produtoras de fase, ex:
`/quick-plan`) para reusar o renderer `render-fase-plan.ts` introduzido aqui.

**Contract a manter nesta feature para nao quebrar B:**
- `render-fase-plan.ts` deve exportar `renderFasePlan(input: FasePlanInput): string`
  como funcao publica, sem dependencias internas do init.
- `FasePlanInput` type exportado de `render-fase-plan.ts` (nao `populate-plan-generator.ts`).
- Renderer **nao** assume contexto de init (stack detection, manifest) — recebe
  input pronto e emite markdown.

**Sinal que dispara o inicio de B:**
- Primeira fase gerada via `/plan-feature` com formato divergente do init
  confundindo a LLM em projeto real; OU
- 30 dias apos esta feature merged (soft deadline, registrar em
  `docs/exec-plans/tech-debt-tracker.md` com data exata no merge).

**Arquivos que B tocara:**
- `skills/plan-feature/*` (logica de geracao de fase)
- `skills/quick-plan/*` se aplicavel
- Possivel `skills/init/lib/render-fase-plan.ts` para extracao se ficar acoplado

---

## Notas de Implementacao

- Manter `populate-plan-generator.ts` como **orquestrador** (le manifest, itera
  16 docs, monta `FasePlanInput`, chama renderer, grava em disco).
- Mover `renderAndrePlan` (atual) para `render-fase-plan.ts` e expandir para
  `renderFasePlan` cobrindo todos os campos novos.
- `populate-instructions-table.ts` ganha campos novos em `DocInstruction`, mas
  mantem `POPULATE_INSTRUCTIONS_BY_DOC` como Map publico — caller existente
  (Step 7) so muda na construcao do input.
- Prosa de `guidance.md` deriva do First Use Customization do Andre como piso e
  expande com:
  - "AVC Extensions" — heuristicas qualitativas adicionais
  - Exemplos do que escrever vs nao escrever
  - Tom esperado ("descritivo, nao aspiracional")
  - Marcacao explicita de `TODO(<owner/context needed>): ...` quando LLM nao
    tem contexto suficiente (convencao do Andre)

---

## Pendencias Marcadas — RESOLVIDAS (auto mode 2026-05-21)

Nenhuma `[A DEFINIR]` neste rascunho. As 4 decisoes deixadas em aberto foram
fechadas com defaults sensatos em auto mode:

1. **Slug do PRD** — `refactor-populate-plan-faseplanv1` ✓ (descritivo, casa com
   o nome da pasta).
2. **Slug da pasta de output do init** — `{date}-populate-harness/` ✓ (uma so
   feature "popular o harness", 16 fases dentro).
3. **Distribuicao MoSCoW** — 8 Must / 3 Should / 2 Could / 5 Won't ✓. Must Have
   = ~50%, mas todos os 8 sao genuinos (sem eles a feature nao entrega o
   outcome — schema, hierarquia, guidance, gates).
4. **NFR Performance < 2s** — confirmado com **lazy loading** ✓. Renderer NAO
   le `guidance.md` em runtime; apenas referencia o path no plano gerado. LLM
   le sob demanda quando executa o fase via /execute-plan. Mantem performance
   sem aumentar I/O do init.

Course-correction admitida: dev pode reverter qualquer um destes a qualquer
momento; sao defaults registrados em auto mode, nao decisoes irreversiveis.
