# Plano 02: Camadas de Skill — Descoberta no Planejamento

**Feature:** workflow-awareness ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~6.5h
**Depende de:** Plano 01 (cria `docs/WORKFLOWS.md` + a mensagem `[WORKFLOW_ADVISOR]` no hook)
**Desbloqueia:** Nenhum (Plano 03 depende de Plano 01, não deste — roda em paralelo a este)

---

## O que este plano entrega

Espalha a consciência de workflow pelas 7 superfícies onde cada skill/doc já raciocina sobre
complexidade ou paralelismo — **sempre REFERENCIANDO** o doc canônico `docs/WORKFLOWS.md`
(criado no Plano 01), **nunca duplicando** sua lógica nem o texto da mensagem `[WORKFLOW_ADVISOR]`.
Ao fim, qualquer porta de entrada (plan-feature, quick-plan, verify-work, design-twice,
execute-plan, PIPELINE.md, PLANS.md) ensina a escada completa `quick-plan → plan-feature → [workflow]`,
e um teste de CI prova que nenhuma dessas edições de prosa pode ser lida como permissão de lançar
um workflow (mitiga R3/prose-leak — o risco NOVO que este plano introduz, distinto do risco de hook
que o Plano 01 trava).

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `docs/WORKFLOWS.md` (doc canônico — fonte de verdade única que TODAS as fases referenciam) | Plano 01, fase-02 | **pendente** — Plano 01 ainda não executado (0/4 fases). Existirá no tempo de execução deste plano. As fases referenciam o doc por **menção de caminho** (texto, não link markdown verificado) justamente porque o arquivo não existe ainda — ver G5. |
| Formato/análogo da mensagem `[WORKFLOW_ADVISOR]` no hook (lista in-context `/verify-work \| /design-twice \| /deep-research \| /plan-feature`) | Plano 01, fase-01 | **pendente** — as skills citam o MESMO análogo, sem copiar o texto do hook |
| Teste de regressão da diretriz (hook-scoped) `tests/e2e/workflow-advisor-directive.test.ts` | Plano 01, fase-04 | **pendente** — a fase-06 deste plano o RE-EXECUTA (não estende); cobre uma superfície diferente (prosa de skill) |
| PRD aprovado + decisões D1-D9 + invariantes INV1-INV8 | `../PRD.md`, `../CONTEXT.md` | pronto |

> **Nota de dependência (importante):** Plano 01 NÃO está executado quando este plano é escrito.
> Isso é esperado. Plano 02 roda DEPOIS do Plano 01. Todas as fases tratam `docs/WORKFLOWS.md`
> como alvo existente (existirá no tempo de execução). A escolha de **referenciar por menção de
> caminho** (e não por link markdown `[..](../../docs/WORKFLOWS.md)`) é proposital e cobre o caso
> de a fase rodar antes de o Plano 01 ter criado o arquivo — ver Gotcha G5.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 7 superfícies de skill/doc apontando para `docs/WORKFLOWS.md` | Navegação do dev; nenhum outro plano consome diretamente |
| Teste de prose-leak `tests/e2e/workflow-prose-leak.test.ts` (gate de prosa de skill) | Exit Criteria do PLAN; gate de qualquer edição futura de skill que mencione workflow |

**Relação com Plano 03:** Plano 03 (cobertura: grill-me, consultant, stop-reflector) também depende
APENAS do Plano 01, não deste. Os dois podem rodar em paralelo. Se rodarem em paralelo, há leve
sobreposição conceitual (ambos mencionam workflow em prosa) — sem conflito de arquivo: este plano
toca plan-feature/quick-plan/verify-work/design-twice/execute-plan + PIPELINE/PLANS; o Plano 03 toca
grill-me/consultant + stop-reflector.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-plan-feature-tier-and-option.md | RF5 — `plan-feature/SKILL.md` Step 4: terceiro tier "SINAIS DE ESCALA-WORKFLOW" (semântico, INV5) + Step 7: opção AskUserQuestion explicativa-only com invariante no-launch adjacente (INV6) | 1.5h | — |
| 02 | fase-02-execute-plan-keep-separate-callout.md | RF9 — `execute-plan/SKILL.md` callout "Workflow vs este orquestrador": keep-separate no nível do plano (INV8) + offer-alongside só p/ 1 fase mecânica com opt-in fresco (INV6) | 1.5h | — |
| 03 | fase-03-parallel-subagent-skills.md | RF7 + RF8 — `verify-work/SKILL.md` callout "mesmo-padrão, escala-diferente" (diff vs codebase) + `design-twice/SKILL.md` nota "workflow só acima de ~5 ângulos / cross-review / rerunnable" | 1h | — |
| 04 | fase-04-quick-plan-ladder-rung.md | RF6 — `quick-plan/SKILL.md` 1 linha no "Quando NÃO Usar" + sibling no Step 3 (degrau de baixo da escada) | 0.5h | — |
| 05 | fase-05-docs-pipeline-and-plans.md | RF12 + RF13 — `docs/PIPELINE.md` 1 bullet em "Alternative Entry Points" + `docs/PLANS.md` nota de escalação após a lista de traits (sem colidir com o `## Workflow` git existente) | 1h | — |
| 06 | fase-06-prose-leak-regression-gate.md | GATE — teste e2e NOVO `tests/e2e/workflow-prose-leak.test.ts`: scan das 5 skills + 2 docs editados prova zero emissão de tool Workflow / `decision:block` e presença dos marcadores INV6; re-roda o teste do Plano 01 + `harness:validate` | 1h | fase-01, 02, 03, 04, 05 |

---

## Grafo de Fases

```
fase-01            fase-02            fase-03            fase-04            fase-05
(plan-feature)     (execute-plan)     (verify+design)    (quick-plan)       (PIPELINE+PLANS)
[RF5 — INV6]       [RF9 — INV6]       [RF7+RF8]          [RF6]              [RF12+RF13]
    |                  |                  |                  |                  |
    +------------------+--------+---------+---------+--------+------------------+
                                          |
                                          v
                              fase-06 (prose-leak-regression-gate)
                                  [GATE — depende de 01..05]
```

**Paralelismo possível:** fase-01 a fase-05 são **totalmente independentes entre si** — cada uma
toca arquivos distintos e só LÊ `docs/WORKFLOWS.md` (sem escrevê-lo). Podem rodar em qualquer ordem
ou em paralelo. fase-06 é o portão final e aguarda as cinco (fan-in): ela assere o produto conjunto
da prosa editada. Nenhuma fase depende de outra deste plano.

---

## TDD Strategy (adaptada a edições de prosa)

```
Estas fases editam PROSA de skill/doc (não código executável). O "teste" de uma edição de prosa é:
1. RED  : escrever a asserção do gate (fase-06) ANTES das edições — ela deve FALHAR
          (marcadores INV6 ausentes / arquivos ainda sem a seção de workflow).
2. GREEN: aplicar a edição de prosa mínima em cada superfície; o gate passa.
3. VERIFY: bun run test  +  bun run typecheck  +  bun run harness:validate  (ver G6)
```

**Por que o gate é a "casca de teste" deste plano:** edições de prosa não têm RED/GREEN unitário
natural. A disciplina TDD aqui é: a fase-06 define **marcadores verificáveis por máquina** (strings
que DEVEM existir — ex: "não executa", "não lança" — e strings que NÃO PODEM existir — ex:
`Workflow(`, `decision:block`) e o gate roda como teste de regressão. As fases 01-05 escrevem prosa
para satisfazer esses marcadores. Recomenda-se escrever a fase-06 PRIMEIRO em modo RED (asserções
falham porque a prosa ainda não existe), depois implementar 01-05 até o gate ficar verde.

**Tracer Bullet deste plano:** N/A (não é o primeiro plano; o tracer da feature vive no Plano 01 fase-01).

**Ordem do gate (mitiga R2/R3):** fase-06 é re-executável e assere o estado conjunto das 7
superfícies. Rode-a DEPOIS das cinco primeiras. Ela é a trava que garante que nada nas edições de
prosa (especialmente fase-01 plan-feature Step 7 e fase-02 execute-plan callout) pode ser lido pela
LLM como permissão de lançar um workflow.

---

## Verificação por Fase (comandos canônicos — G6)

Toda fase usa este conjunto (NUNCA `bun run lint` — não existe neste repo):

- `bun run test` — descobre `*.test.{ts,tsx}` em `tests/`, `skills/`, `scripts/` (o teste da fase-06 é `.ts` em `tests/e2e/` → entra aqui).
- `bun run typecheck` — `tsc --noEmit` (estado-base GT-01 do Plano 01: erros pré-existentes em `lazy-import.test.ts` e `subagent-contract.ts` NÃO são desta feature; não regredir além disso).
- `bunx biome check <arquivo>` — opcional, por arquivo editado.
- `bun run harness:validate` — link-check + H1 + cap-70 do AGENTS. **Obrigatório** porque as fases tocam `docs/` e `skills/**/SKILL.md`, ambos varridos pelo validador.

---

## Gotchas Conhecidos

- **G1 — Uma fonte de verdade (R2/drift, regra em TODA fase):** as skills SÓ **referenciam**
  `docs/WORKFLOWS.md`. NUNCA reproduzem a tabela comparativa nem o texto da mensagem
  `[WORKFLOW_ADVISOR]` verbatim. Quando uma skill cita o análogo in-context, usa a MESMA lista que
  o hook usa (`/verify-work | /design-twice | /deep-research | /plan-feature`) — sem copiar o
  parágrafo inteiro do hook. Drift = bug.

- **G2 — INV5 (sem thresholds numéricos na prosa de skill):** o número `\d{3,}` (100+/500+) vive
  SÓ no regex do hook (Plano 01). A prosa das skills usa sinais **semânticos** ("codebase inteiro",
  "muitas rodadas de cross-review", "acima de ~5 ângulos"). O `~5 ângulos` do design-twice (fase-03)
  é o único "número" tolerado e é uma aproximação semântica do limite da skill (3-5 propostas), não
  um threshold de detecção — marcar como aproximado ("acima de ~5").

- **G3 — INV6 (prose-leak hardening, OBRIGATÓRIO em fase-01 e fase-02):** toda menção de workflow é
  **suggest-only**. O opt-in é o humano DIGITAR `workflow`/`ultracode`. Nenhuma frase pode ser lida
  como "a skill pode lançar o workflow por decisão própria". No `execute-plan` (fase-02) o cuidado é
  redobrado: o CC auto-aprova edições de arquivo assim que um workflow lança, então o callout NUNCA
  pode ler como "execute-plan delega uma fase sozinho". Marcadores literais ("não executa",
  "não lança", "opt-in do humano", "exige confirmação fresca") são verificados pela fase-06.

- **G4 — D7 (`/deep-research` "se disponível"):** onde o caso de uso de workflow é pesquisa/
  cross-check (relevante em verify-work fase-03 e nos docs fase-05), nomear `/deep-research`
  explicitamente com o hedge "se disponível". Não nomear genericamente.

- **G5 — Link-check do harness varre `skills/**/SKILL.md` (CONFIRMADO no código):**
  `scripts/harness-validate.ts` (`collectMarkdownFiles(root)` linha 166 → `checkMarkdownFiles`
  linhas 530-556) faz `fs.stat` em TODO link markdown relativo de QUALQUER `.md` do repo, incluindo
  os `SKILL.md`. O regex casa `[label](caminho-relativo)`. **Portanto:** se uma fase adicionar um
  link markdown real para `docs/WORKFLOWS.md` (ex.: `[docs/WORKFLOWS.md](../../docs/WORKFLOWS.md)`
  de um skill, ou `[WORKFLOWS.md](./WORKFLOWS.md)` de um doc em `docs/`), o validador tenta `fs.stat`
  no alvo. Como `docs/WORKFLOWS.md` só existe APÓS o Plano 01, um link verificado quebraria o
  `harness:validate` se este plano rodasse antes. **Escolha segura adotada em TODAS as fases:**
  referenciar `docs/WORKFLOWS.md` por **menção de caminho em texto** (backtick: `` `docs/WORKFLOWS.md` ``),
  NUNCA como link markdown `[..](..)`. Isso evita o `fs.stat` e é robusto à ordem de execução
  entre Planos 01 e 02. (Links absolutos `http(s)://` são ignorados pelo regex, mas não se aplicam aqui.)

- **G6 — `bun run lint` NÃO existe:** confirmado no Plano 01 (package.json sem script `lint`).
  Verificação = `bun run test` + `bun run typecheck` (`tsc --noEmit`) + opcional `bunx biome check`
  + `bun run harness:validate`. Onde o template `fase-template.md` pedir `bun run lint`, substituir.

- **G7 — Colisão do `## Workflow` em `docs/PLANS.md` (fase-05, VERIFICADO):** `docs/PLANS.md` JÁ tem
  uma seção `## Workflow` (linha 24) — mas é o **workflow de gestão de plano git** (criar plano com
  `bun run new-plan`, rastrear escopo, mover plano completo de active/→completed/). NÃO tem relação
  com dynamic workflows do Claude Code. A nota RF13 (escalação plano → dynamic workflow) vai
  **APÓS a lista de traits (linhas 3-9) e ANTES de `## Pre-Mutation Gate` (linha 10)** — longe da
  seção `## Workflow` existente. Para evitar ambiguidade, a nota usa o termo **"dynamic workflow"**
  (não só "workflow"), deixando claro que é outra coisa. NÃO editar nem renomear o `## Workflow`
  existente.

- **G8 — Teste de gate é NOVO, não estende o do Plano 01:** o `tests/e2e/workflow-advisor-directive.test.ts`
  do Plano 01 é **hook-scoped** (assere caminhos do `[WORKFLOW_ADVISOR]` no `user-prompt-gate.cjs`).
  O risco NOVO deste plano é **prose-leak em arquivos SKILL.md/doc**. São superfícies diferentes.
  A fase-06 cria um arquivo NOVO `tests/e2e/workflow-prose-leak.test.ts` (segue convenção `bun:test`
  de `tests/e2e/`) e RE-EXECUTA o do Plano 01 como parte do gate — sem mesclar os dois.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
