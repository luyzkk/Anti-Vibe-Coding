<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de SKILL.md, não código de runtime. Sem comentários inline de código.
Provenance da decisão: PRD RF6; CONTEXT INV2/INV5; PLAN R2.
-->

# Fase 04: quick-plan — Degrau de Baixo da Escada

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente das demais fases; só LÊ `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

`skills/quick-plan/SKILL.md` ganha 1 linha na lista "Quando NÃO Usar (sugerir pipeline completo)" e
uma sibling no Step 3, fechando a escada de escala `quick-plan → plan-feature → [workflow]` a partir
do degrau mais baixo: quem está numa task leve passa a saber que existe um degrau de escala muito
acima, referenciando `docs/WORKFLOWS.md`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/quick-plan/SKILL.md` | Modify | "Quando NÃO Usar (sugerir pipeline completo)" (~linhas 53-57): +1 linha sobre escala-workflow. "Step 3 — Confirmar com o Dev" (~linhas 95-104): sibling na lista de opções. |

> **Ground truth confirmado (Read 2026-05-29):** a seção "## Quando NAO Usar (sugerir pipeline
> completo)" está nas linhas 53-57 (3 bullets: 6+ arquivos→`/plan-feature`; ambíguo→`/grill-me`;
> complexo→`/write-prd`). O "## Step 3 — Confirmar com o Dev" (linha 95) tem a lista de opções nas
> linhas 101-104, incluindo "Pipeline completo" → `/plan-feature` ou `/grill-me`.

---

## Implementacao

### Passo 1 — "Quando NÃO Usar": +1 linha de escala-workflow

A lista hoje (linhas 55-57) escala para `/plan-feature`, `/grill-me`, `/write-prd`. Adicionar um
quarto bullet que aponta o degrau de ESCALA (não de complexidade) — o topo da escada. Prosa PT-BR
proposta (adicionar após a linha 57):

```text
- Escala que estoura uma conversa (varredura do codebase inteiro, migracao em massa, pesquisa
  cross-checada em varias fontes) → isto e ESCALA, nao complexidade: considere um dynamic workflow.
  Ver `docs/WORKFLOWS.md` para a escada quick-plan → plan-feature → workflow. (Pesquisa: /deep-research,
  se disponivel.)
```

Regras:
- **INV5:** sem número. "Codebase inteiro", "em massa", "varias fontes" — semântico.
- **INV2:** posiciona workflow como o degrau ACIMA, não substituto — implícito pela escada.
- **G4 (D7):** `/deep-research` com "se disponível" no item de pesquisa.
- **G1/G5:** `` `docs/WORKFLOWS.md` `` por menção de caminho.

### Passo 2 — Step 3: sibling na lista de opções

A lista de opções do Step 3 (linhas 101-104) tem "Pipeline completo" → `/plan-feature` ou `/grill-me`.
Adicionar um marcador condicional para o caso de a task ter cheiro de escala. Prosa PT-BR proposta
(adicionar após a linha 104, dentro do bloco de opções):

```text
- (SE a task tem cheiro de escala — codebase inteiro, migracao em massa) "Isto parece escala de
  workflow" → explicar que o caminho e um dynamic workflow (o dev opta digitando `workflow`), apontar
  `docs/WORKFLOWS.md`. O quick-plan NAO lanca workflow — apenas sinaliza o degrau acima.
```

Regras:
- **INV6 (leve):** "O quick-plan NAO lanca workflow — apenas sinaliza" (marcador suggest-only).
- **Condicional:** só quando há cheiro de escala — não poluir o fluxo de task leve normal.
- **G1/G5:** menção de caminho.

### Passo 3 — Não tocar telemetria

Bloco de telemetria (linhas 10-33, 190-209) e a seção "O que Este Skill NAO Faz" (linhas 182-188)
NÃO são tocados. As inserções são apenas as duas linhas acima.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** ambas as inserções REFERENCIAM `` `docs/WORKFLOWS.md` `` —
  não reproduzem a tabela nem a mensagem do hook.
- **G2 do plano (INV5):** zero thresholds numéricos — quick-plan é o degrau de baixo, descreve
  escala por sinais semânticos.
- **G4 do plano (D7):** `/deep-research` com "se disponível" no item de pesquisa.
- **G5 do plano (link-check):** menção de caminho, nunca link markdown.
- **Local — fase pequena (0.5h):** duas linhas. Não expandir além do escopo do degrau-de-escada.

---

## Verificacao

### TDD

- [ ] **RED:** a asserção da fase-06 para `quick-plan/SKILL.md` FALHA antes desta fase (marcador da
  escada `quick-plan → plan-feature → workflow` ausente).
  - Comando: `bun run test -- --test-name-pattern "quick-plan"` (após fase-06)
  - Resultado esperado: assertion failure

- [ ] **GREEN:** após as inserções, a asserção PASSA.
  - Comando: `bun run test -- --test-name-pattern "quick-plan"`
  - Resultado esperado: passed

### Checklist

- [ ] "Quando NÃO Usar" tem o bullet de escala-workflow com a escada `quick-plan → plan-feature → workflow`.
- [ ] Step 3 tem a sibling condicional com "NAO lanca workflow — apenas sinaliza".
- [ ] Sem threshold numérico (INV5).
- [ ] `/deep-research` com "se disponível" no item de pesquisa (D7).
- [ ] `docs/WORKFLOWS.md` por menção de caminho; zero links markdown novos.
- [ ] `bun run harness:validate` verde.
- [ ] `bun run typecheck` sem novos erros.
- [ ] `bunx biome check skills/quick-plan/SKILL.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde para o caso `quick-plan` (fase-06).
- `bun run harness:validate` exit 0.
- Grep em `skills/quick-plan/SKILL.md` por `Workflow(` e `decision:block` retorna ZERO ocorrências.

**Por humano:**
- Leitura fresca: a escada de escala fica visível desde o degrau mais baixo; nenhuma frase sugere que
  o quick-plan lança workflow.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
