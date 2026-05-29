<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de docs (PIPELINE.md, PLANS.md), não código de runtime. Sem comentários inline.
Provenance da decisão: PRD RF12 + RF13; CONTEXT INV2/INV5/D7; PLAN R2.
-->

# Fase 05: Docs — PIPELINE.md (entry point) + PLANS.md (escalação)

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 1h
**Depende de:** Nenhuma (independente das demais fases; só LÊ/aponta para `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

Os dois docs de navegação ganham a consciência de workflow: `docs/PIPELINE.md` ganha 1 bullet em
"Alternative Entry Points" (workflow como porta de escala), e `docs/PLANS.md` ganha uma nota de
escalação (plano → dynamic workflow) logo após a lista de traits — escrita para NÃO colidir com a
seção `## Workflow` (gestão de plano git) que o arquivo já tem.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/PIPELINE.md` | Modify | RF12 — 1 bullet na seção "## Alternative Entry Points" (~linha 50, lista linhas 52-57). |
| `docs/PLANS.md` | Modify | RF13 — nota de escalação APÓS a lista de traits (linhas 3-9) e ANTES de "## Pre-Mutation Gate" (linha 10). NÃO tocar o "## Workflow" existente (linha 24). |

> **Ground truth confirmado (Read 2026-05-29):**
> - PIPELINE.md: "## Alternative Entry Points" na linha 50; lista de bullets nas linhas 52-57
>   (`/grill-me`, `/design-twice`, `/consultant`, `/tdd-workflow`, `/learn`, `/init`).
> - PLANS.md: lista de traits nas linhas 3-9; "## Pre-Mutation Gate" na linha 10; "## Workflow" na
>   linha 24. **VERIFICADO — o `## Workflow` (linhas 24-29) é o workflow de GESTÃO DE PLANO git**
>   (criar com `bun run new-plan`, rastrear escopo, mover active→completed). NÃO tem relação com
>   dynamic workflows do Claude Code. (Ver G7 do README.) AMBOS os arquivos estão em `REQUIRED_FILES`
>   do harness — link-check ativo.

---

## Implementacao

### Passo 1 — PIPELINE.md: 1 bullet em "Alternative Entry Points" (RF12)

A lista (linhas 52-57) enumera pontos de entrada alternativos. Adicionar um bullet que apresenta o
dynamic workflow como a porta de ESCALA — sempre suggest-only. Prosa proposta (adicionar após a
linha 57, mantendo o estilo dos bullets existentes; o doc está em inglês):

```text
- `dynamic workflow` (Claude Code) → the scale rung ABOVE `/plan-feature`. Suggested (never launched
  by the plugin) when a task's signal is scale, not complexity — whole-codebase sweep, mass migration,
  cross-checked research (`/deep-research`, if available). The dev opts in by typing `workflow`. See
  `docs/WORKFLOWS.md`.
```

Regras:
- **Idioma:** PIPELINE.md está em inglês — manter inglês neste bullet (consistência do arquivo).
- **INV2:** "the scale rung ABOVE `/plan-feature`" + "never launched by the plugin" (marcadores).
- **INV5:** sem número — "scale, not complexity", "whole-codebase".
- **G4 (D7):** `/deep-research` com "if available".
- **G1/G5:** `` `docs/WORKFLOWS.md` `` por **menção de caminho em backtick**, NUNCA link markdown
  `[..](./WORKFLOWS.md)` — PIPELINE.md está em REQUIRED_FILES e o link-check faria `fs.stat`; o doc
  só existe após o Plano 01.

### Passo 2 — PLANS.md: nota de escalação após os traits (RF13), SEM colidir com `## Workflow`

A nota vai entre a lista de traits (que fecha na linha 9) e "## Pre-Mutation Gate" (linha 10).
**Crítico:** o arquivo já tem `## Workflow` (linha 24) sobre gestão de plano git. Para não colidir
nem confundir, a nota (a) NÃO usa o heading `## Workflow`; (b) usa o termo "dynamic workflow"
explicitamente, deixando claro que é OUTRA coisa. Prosa proposta (inserir após a linha 9, como
parágrafo solto antes de `## Pre-Mutation Gate`; o doc está em inglês):

```text
> **Scale escalation (plan → dynamic workflow):** the traits above mean "open a plan." A small set of
> tasks goes one rung higher — not because they are more *complex*, but because their *scale* exceeds
> what a single conversation coordinates (whole-codebase sweep, mass migration of many files,
> cross-checked research across sources). For those, consider suggesting a Claude Code **dynamic
> workflow** (distinct from the plan-management Workflow section below). The plugin never launches it —
> the dev opts in by typing `workflow` (research path: `/deep-research`, if available). See
> `docs/WORKFLOWS.md`.
```

Regras:
- **G7 (colisão — verificado):** a nota é um blockquote, NÃO um heading; cita "(distinct from the
  plan-management Workflow section below)" para desambiguar do `## Workflow` existente. NÃO editar
  nem renomear o `## Workflow` (linhas 24-29).
- **Idioma:** PLANS.md está em inglês — manter inglês.
- **INV2:** "one rung higher" + "never launches it" (marcadores).
- **INV5:** sem número — "scale exceeds what a single conversation coordinates".
- **G4 (D7):** `/deep-research` com "if available".
- **G1/G5:** `` `docs/WORKFLOWS.md` `` por menção de caminho, nunca link markdown (PLANS.md está em
  REQUIRED_FILES; link verificado quebraria antes do Plano 01).

### Passo 3 — Conferir que o `## Workflow` git permanece intacto

Reler `docs/PLANS.md` linhas 24-29 após a edição e confirmar byte-a-byte que a seção de gestão de
plano git NÃO foi alterada. A nota RF13 vive ACIMA, na zona de traits.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** ambos os docs REFERENCIAM `` `docs/WORKFLOWS.md` `` — não
  reproduzem a tabela comparativa nem a mensagem do hook.
- **G5 do plano (link-check — crítico aqui):** PIPELINE.md e PLANS.md estão em `REQUIRED_FILES`; o
  `checkMarkdownFiles` faz `fs.stat` em todo link relativo. Como `docs/WORKFLOWS.md` só existe após o
  Plano 01, usar **menção de caminho em backtick**, NUNCA link markdown. (Confirmado no código:
  `scripts/harness-validate.ts` linhas 166 + 530-556.)
- **G7 do plano (colisão `## Workflow` em PLANS.md — verificado):** o `## Workflow` existente é git/
  plano. A nota RF13 é blockquote, usa "dynamic workflow", e desambigua explicitamente. NÃO tocar a
  seção existente.
- **Local — idioma:** ambos os docs estão em inglês; as inserções seguem em inglês (a prosa das
  skills é PT-BR; a dos docs PIPELINE/PLANS é EN — respeitar o idioma de cada arquivo).

---

## Verificacao

### TDD

- [ ] **RED:** as asserções da fase-06 para `docs/PIPELINE.md` e `docs/PLANS.md` FALHAM antes desta
  fase (marcadores "dynamic workflow"/"scale rung"/"Scale escalation" ausentes).
  - Comando: `bun run test -- --test-name-pattern "PIPELINE|PLANS"` (após fase-06)
  - Resultado esperado: assertion failure

- [ ] **GREEN:** após as inserções, as asserções PASSAM.
  - Comando: `bun run test -- --test-name-pattern "PIPELINE|PLANS"`
  - Resultado esperado: passed

### Checklist

- [ ] PIPELINE.md: bullet de `dynamic workflow` em "Alternative Entry Points" com "ABOVE `/plan-feature`" + "never launched by the plugin".
- [ ] PLANS.md: nota de escalação (blockquote) entre traits (L9) e `## Pre-Mutation Gate` (L10), usando o termo "dynamic workflow" e desambiguando do `## Workflow` existente.
- [ ] `## Workflow` de PLANS.md (L24-29) INTACTO byte-a-byte.
- [ ] Sem threshold numérico nos dois (INV5); `/deep-research` "if available" em ambos os itens de pesquisa (D7).
- [ ] `docs/WORKFLOWS.md` por menção de caminho nos dois; ZERO links markdown novos (G5 — crítico, ambos em REQUIRED_FILES).
- [ ] `bun run harness:validate` verde (sem `broken-link`; H1 dos dois docs preservado; ambos seguem como required-files).
- [ ] `bun run typecheck` sem novos erros.
- [ ] `bunx biome check docs/PIPELINE.md docs/PLANS.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde para os casos `PIPELINE` e `PLANS` (fase-06).
- `bun run harness:validate` exit 0 (prova que nenhum link novo quebrou — G5).
- Grep em PLANS.md confirma que `## Workflow` (linha original) permanece e a nova nota usa "dynamic workflow".

**Por humano:**
- Leitura fresca: a nota de PLANS.md não se confunde com a seção `## Workflow` de gestão de plano; o
  bullet de PIPELINE.md posiciona workflow como degrau de escala suggest-only.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
