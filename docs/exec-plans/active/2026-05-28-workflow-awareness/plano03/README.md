# Plano 03: Cobertura — grill-me + consultant + retrospectivo

**Feature:** workflow-awareness ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~2.5h
**Depende de:** Plano 01 (cria `docs/WORKFLOWS.md` + a mensagem `[WORKFLOW_ADVISOR]` no hook; nascem dele os marcadores in-context)
**Desbloqueia:** Nenhum (Plano 02 depende de Plano 01, não deste — roda em paralelo a este)

---

## O que este plano entrega

Fecha as 3 superfícies de cobertura (MoSCoW: **Could**) que o Plano 02 não toca — `skills/grill-me`,
`skills/consultant` e o retrospectivo do `hooks/stop-reflector.cjs` — adicionando consciência de
workflow no ponto exato onde cada uma já raciocina sobre complexidade ou conclusão de feature.
Toda menção é **suggest-only** e **REFERENCIA** o doc canônico `docs/WORKFLOWS.md` (criado no Plano 01),
nunca duplica a lógica. O ponto delicado é o retrospectivo: a sugestão de workflow entra como UMA linha
DENTRO do menu `FEATURE_COMPLETED` já existente, gated por sinal forte, sem nunca poder virar um novo
`decision:block` (D5). Ao fim, um gate de CI NOVO prova que essas 3 superfícies sugerem mas nunca lançam.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `docs/WORKFLOWS.md` (doc canônico — fonte de verdade que grill-me e consultant referenciam por menção de caminho) | Plano 01, fase-02 | **pendente** — Plano 01 ainda não executado. Existirá no tempo de execução deste plano. As fases o referenciam por **menção de caminho** (texto em backtick, não link markdown verificado) porque o arquivo pode não existir ainda — ver G5. |
| Formato/análogo da lista in-context do `[WORKFLOW_ADVISOR]` (`/verify-work \| /design-twice \| /deep-research \| /plan-feature`) | Plano 01, fase-01 | **pendente** — grill-me/consultant/stop-reflector citam o MESMO análogo, sem copiar o texto do hook |
| Teste de regressão da diretriz (hook-scoped) `tests/e2e/workflow-advisor-directive.test.ts` | Plano 01, fase-04 | **pendente** — a fase-03 deste plano o RE-EXECUTA (não estende); cobre superfícies diferentes (grill-me/consultant/stop-reflector) |
| PRD aprovado + decisões D1-D9 + invariantes INV1-INV8 | `../PRD.md`, `../CONTEXT.md` | pronto |

> **Nota de dependência (importante):** Plano 01 NÃO está executado quando este plano é escrito.
> Isso é esperado. Plano 03 roda DEPOIS do Plano 01. As fases tratam `docs/WORKFLOWS.md` como alvo
> existente (existirá no tempo de execução) e o referenciam por **menção de caminho** justamente para
> ser robusto à ordem de execução — ver Gotcha G5.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 3 superfícies de cobertura (grill-me, consultant, stop-reflector) apontando para `docs/WORKFLOWS.md` | Navegação do dev; nenhum outro plano consome diretamente |
| `detectStrongScaleSignal(transcriptPath)` + `buildBlockOutput(kind, opts)` no `stop-reflector.cjs` | O próprio hook (runtime); o gate da fase-03 assere o contrato |
| Teste de gate `tests/e2e/workflow-coverage-leak.test.ts` (gate destas 3 superfícies) | Exit Criteria do PLAN; gate de qualquer edição futura destas 3 superfícies |

**Relação com Plano 02:** Plano 02 (camadas de skill: plan-feature, quick-plan, verify-work,
design-twice, execute-plan + PIPELINE/PLANS) também depende APENAS do Plano 01, não deste. Os dois
podem rodar em paralelo. **Sem conflito de arquivo:** Plano 02 toca
plan-feature/quick-plan/verify-work/design-twice/execute-plan + PIPELINE/PLANS; **Plano 03 toca
grill-me/consultant + stop-reflector**. Há leve sobreposição conceitual (ambos mencionam workflow em
prosa), mas zero colisão de arquivo. Os gates são arquivos distintos (`workflow-prose-leak.test.ts`
no Plano 02 vs `workflow-coverage-leak.test.ts` aqui) — nenhum estende o do outro.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-grillme-consultant-next-step.md | RF10 + RF11 — `grill-me/SKILL.md` Passo 6 branch Complex: sub-linha condicional de escala; `consultant/SKILL.md` Pipeline Awareness: next-step condicional. Mesma classe de edição (sugestão de próximo passo), commit atômico único. Semântico (INV5), suggest-only (INV6), com fallback in-context. | 0.5h | — |
| 02 | fase-02-stop-reflector-softened-retrospective.md | RF14 — `hooks/stop-reflector.cjs`: `detectStrongScaleSignal(transcriptPath)` + `buildBlockOutput(kind, opts)` (default OFF); linha de workflow appendada DENTRO do `reason` do `FEATURE_COMPLETED` existente; conservador/fail-open; TDD inline em `hooks/stop-reflector.test.cjs`. Nunca `decision:block` novo (D5). | 1h | — |
| 03 | fase-03-coverage-leak-regression-gate.md | GATE — teste e2e NOVO `tests/e2e/workflow-coverage-leak.test.ts`: scan de grill-me + consultant + stop-reflector prova zero `Workflow(` / zero NOVO `decision:block` + marcadores suggest-only; re-roda o teste de hook (`bun test hooks/stop-reflector.test.cjs`), o teste de diretriz do Plano 01 e `harness:validate`. | 0.75h | fase-01, fase-02 |

---

## Grafo de Fases

```
fase-01                    fase-02
(grill-me + consultant)    (stop-reflector retrospectivo)
[RF10 + RF11 — prosa]      [RF14 — hook LOGIC + TDD]
    |                          |
    +------------ + -----------+
                  |
                  v
       fase-03 (coverage-leak-regression-gate)
           [GATE — depende de 01 + 02]
```

**Paralelismo possível:** fase-01 (prosa de skill) e fase-02 (lógica de hook) são **totalmente
independentes** — tocam arquivos distintos (grill-me/consultant vs stop-reflector) e não se cruzam.
Podem rodar em qualquer ordem ou em paralelo. fase-03 é o portão final (fan-in) e aguarda as duas:
ela assere o produto conjunto das 3 superfícies. Nenhuma fase depende de outra além da fase-03 das duas.

---

## TDD Strategy

```
Ciclo por fase:
- fase-01 (PROSA): edições de skill não têm RED/GREEN unitário natural. O "teste" é o gate da fase-03
  (marcadores que DEVEM existir, strings que NÃO PODEM existir). RED = marcadores ausentes antes da
  edição; GREEN = presentes depois.
- fase-02 (HOOK LOGIC): tem RED/GREEN unitário REAL em hooks/stop-reflector.test.cjs.
  RED: teste novo falha (linha de workflow ausente quando strongScaleSignal:true; ou helper inexistente).
  GREEN: helper + opts implementados; teste passa; testes existentes (linhas 83-88) continuam verdes
  (backward-compat: chamam buildBlockOutput('FEATURE_COMPLETED') sem 2º arg → menu SEM o bullet).
- fase-03 (GATE): re-executável; assere o estado conjunto das 3 superfícies + re-roda hook e diretriz.
VERIFY (toda fase): bun run test + bun run typecheck + bun run harness:validate (ver G6).
```

**Por que a fase-02 tem RED/GREEN real e as outras não:** o `stop-reflector.cjs` é código de runtime
com função pura testável (`detectStrongScaleSignal`, `buildBlockOutput`). A fase-01 edita prosa (sem
unidade natural) e a fase-03 é o gate de regressão que cobre ambas. O hook-test da fase-02 roda
explicitamente (`bun test hooks/stop-reflector.test.cjs`) porque `bun run test` NÃO descobre `*.test.cjs` (G7).

**Tracer Bullet deste plano:** N/A (não é o primeiro plano; o tracer da feature vive no Plano 01 fase-01).

---

## Verificação por Fase (comandos canônicos — G6)

Toda fase usa este conjunto (NUNCA `bun run lint` — não existe neste repo):

- `bun run test` — descobre `*.test.{ts,tsx}` em `tests/`, `skills/`, `scripts/` (o teste da fase-03 é `.ts` em `tests/e2e/` → entra aqui). **NÃO** pega `*.test.cjs` (G7).
- `bun test hooks/stop-reflector.test.cjs` — **explícito** para o hook-test da fase-02 (G7). É o RED/GREEN real do plano.
- `bun run typecheck` — `tsc --noEmit` (estado-base GT-01 do Plano 01: erros pré-existentes em `lazy-import.test.ts` e `subagent-contract.ts` NÃO são desta feature; não regredir além disso).
- `bunx biome check <arquivo>` — opcional, por arquivo editado.
- `bun run harness:validate` — link-check + H1 + cap-70 do AGENTS. **Obrigatório** porque a fase-01 toca `skills/**/SKILL.md`, varridos pelo validador.

---

## Gotchas Conhecidos

- **G1 — Uma fonte de verdade (R2/drift, regra em TODA fase):** grill-me, consultant e o retrospectivo
  do stop-reflector SÓ **referenciam** `docs/WORKFLOWS.md`. NUNCA reproduzem a tabela comparativa nem o
  texto da mensagem `[WORKFLOW_ADVISOR]` verbatim. Quando citam o análogo in-context, usam a MESMA lista
  que o hook usa (`/verify-work | /design-twice | /deep-research | /plan-feature`) — sem copiar o
  parágrafo inteiro do hook. Drift = bug.

- **G2 — D5: o MECANISMO do "sinal forte" é DECISÃO ABERTA (apenas o SINAL foi pré-decidido).** A D5 fixou
  que o retrospectivo dispara só em sinal forte (sweep/migração/muitos Agent/Task calls sequenciais no
  turno) e que NUNCA pode virar um novo `decision:block`. O **como detectar** (helper, threshold, varredura
  do transcript) é projetado na fase-02 e registrado em MEMORY.md como DI. A fase-02 propõe
  `detectStrongScaleSignal(transcriptPath)` conservador, fail-open, **default OFF**.

- **G3 — A linha de workflow vive DENTRO do bloco FEATURE_COMPLETED existente (a trava-mor do RF14):** ela
  é appendada como UM bullet `- ` extra no MESMO `reason` string do `FEATURE_COMPLETED` (linhas 89-95 do
  `stop-reflector.cjs`). Tem que ser IMPOSSÍVEL criar um novo/segundo `decision:block`. `buildBlockOutput`
  continua retornando UM objeto `{ decision:'block', reason }` — o gate da fase-03 assere que não existe um
  segundo `decision` no output.

- **G4 — Backward-compat do `buildBlockOutput` (D5):** a assinatura vira `buildBlockOutput(kind, opts)` com
  `opts.strongScaleSignal` **default `false`/ausente**. Os testes existentes (linhas 83-88) chamam
  `buildBlockOutput('FEATURE_COMPLETED')` sem 2º arg e esperam o menu SEM o bullet de workflow → continuam
  passando. NÃO mudar a forma do retorno nem a ordem dos bullets existentes.

- **G5 — Link-check do harness varre `skills/**/SKILL.md`:** `scripts/harness-validate.ts`
  (`collectMarkdownFiles` → `checkMarkdownFiles`) faz `fs.stat` em todo link markdown relativo de qualquer
  `.md`. Como `docs/WORKFLOWS.md` só existe após o Plano 01, referenciar **sempre por menção de caminho**
  (backtick: `` `docs/WORKFLOWS.md` ``), NUNCA como link markdown `[..](..)`. (O `stop-reflector.cjs` não é
  `.md`, então não é varrido — mas grill-me e consultant são; cuidado lá.)

- **G6 — `bun run lint` NÃO existe:** verificação = `bun run test` + `bun run typecheck` (`tsc --noEmit`)
  + opcional `bunx biome check` + `bun run harness:validate`. Onde o template pedir `bun run lint`, substituir.

- **G7 — `bun run test` NÃO descobre `*.test.cjs`:** o hook-test da fase-02 (`hooks/stop-reflector.test.cjs`)
  roda EXPLICITAMENTE via `bun test hooks/stop-reflector.test.cjs`. O teste da fase-03 é `.ts` em
  `tests/e2e/` e ENTRA em `bun run test`. O gate da fase-03 roda os dois.

- **INV5 — Sem thresholds numéricos na prosa de skill:** grill-me e consultant usam sinais **semânticos**
  ("auditoria do codebase inteiro", "centenas de arquivos", "pesquisa cross-checada"). Nenhum número na
  prosa. O único número tolerado é o threshold interno de `detectStrongScaleSignal` no hook (que não é
  prosa de skill) — e é uma decisão de design, não um threshold exposto ao dev.

- **INV6 — Prose-leak hardening:** toda menção de workflow é suggest-only; o opt-in é o humano DIGITAR
  `workflow`/`ultracode`. Nenhuma frase pode ser lida como "a skill/hook pode lançar um workflow por
  decisão própria". Marcadores literais verificáveis (PT-BR): "nao executa", "nao lanca", "opt-in do
  humano", "sugere". A fase-03 verifica esses marcadores nas 3 superfícies.

- **NFR degradação graciosa:** toda sugestão de workflow pareia com um fallback de skill in-context que
  funciona mesmo com workflows desabilitados (mesma lista do hook). grill-me/consultant citam
  `/verify-work | /design-twice | /deep-research | /plan-feature`; o retrospectivo cita a skill análoga
  como fallback.

- **D7 — `/deep-research` "se disponível" só onde pesquisa é o use case:** nomear `/deep-research`
  explicitamente com o hedge "se disponível" APENAS onde o gatilho é pesquisa/cross-check (relevante no
  branch Complex do grill-me quando o sinal é research). Não nomear genericamente.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
