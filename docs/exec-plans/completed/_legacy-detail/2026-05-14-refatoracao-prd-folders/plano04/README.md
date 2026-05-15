# Plano 04: Extras (Could Have — cortavel)

**Feature:** Refatoracao da Estrutura de Pastas por PRD ([PLAN overview](../PLAN-refatoracao-prd-folders.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Plano 01 (nova estrutura existir); Plano 03 fase-03 (para rastreio via `_archive/` na fase-03)
**Desbloqueia:** —

---

## O que este plano entrega

Funcionalidades opcionais que agregam valor mas nao sao bloqueantes do core. Entrega: (a) suporte
a `requires:` no frontmatter do `PRD.md` com aviso nao-bloqueante em `execute-plan` quando PRD
dependido nao esta `completed` (RF8 + CA-11); (b) deteccao de ciclo em `requires:` via DFS com aviso
nao-bloqueante (RF11 + R3); (c) `/lessons-learned add` rastreia origem do PRD mais recente em
`_archive/` quando aplicavel (RF10 + D12). Plano inteiramente **Could Have** — pode ser adiado ou
cortado sem perder o core da refatoracao.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Estrutura canonica `YYYY-MM-DD-{slug}/` com `PRD.md` nu | Plano 01, fase-01 | pendente |
| `execute-plan` lendo `STATE.md` local por pasta | Plano 01, fase-03 | pendente |
| `plan-feature` lendo `PRD.md` da pasta | Plano 01, fase-02 | pendente |
| Enumeracao de pastas datadas em `.planning/` (reusavel da descoberta) | Plano 03, fase-01 | pendente (dependencia leve) |
| `_archive/` existe como destino de PRDs arquivados (para fase-03) | Plano 03, fase-03 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Nenhum — Plano 04 eh folha do grafo | — |

Este plano eh Could Have e terminal. Pode rodar em paralelo com Planos 02 e 03 apos Plano 01 concluir,
exceto a fase-03 que precisa de `_archive/` populavel (Plano 03 fase-03).

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-requires-frontmatter-e-aviso.md | `PRD.md` aceita campo opcional `requires: [slug-ou-pasta]` (string ou array); `plan-feature` parseia; `execute-plan` verifica status das dependencias via `STATE.md` e AVISA sem bloquear se alguma nao estiver `completed` | 1.5h | — |
| 02 | fase-02-deteccao-ciclos-requires.md | `plan-feature` roda DFS sobre o grafo de `requires:` enumerando todos os PRDs nao arquivados; detecta ciclo (inclui auto-referencia) e mostra caminho ao dev com AVISO nao-bloqueante | 1h | fase-01 |
| 03 | fase-03-lessons-learned-rastreia-origem.md | `/lessons-learned add` infere PRD de origem via ordenacao por data do mais recente em `.planning/_archive/`; adiciona linha `Origem: .planning/_archive/{pasta}/SUMMARY.md` na licao registrada | 0.5h | — (independente) |

**Soma:** 1.5 + 1 + 0.5 = 3h

---

## Grafo de Fases

```
fase-01 (requires + aviso em execute-plan)
    |
    v
fase-02 (deteccao de ciclos em plan-feature)

fase-03 (lessons-learned rastreia origem) — ISOLADA
```

**Paralelismo possivel:**
- `fase-01` eh a base — introduz o campo `requires:` no frontmatter do PRD e o parser.
- `fase-02` depende de `fase-01` (precisa do campo existir para detectar ciclos sobre ele).
- `fase-03` eh INDEPENDENTE das outras duas — toca em skill diferente (`lessons-learned/SKILL.md`)
  e nao depende de `requires:`. Pode rodar em paralelo com fase-01 e fase-02.

---

## TDD Strategy

Este projeto (plugin anti-vibe-coding) NAO tem test framework — nao ha `bun run test`.
"Verificacao" = **dogfooding manual** (padrao Plano 01/02/03):

```
Ciclo por fase:
1. RED manual: preparar fixture em .planning-test/ com estado especifico
   (ex: PRD-A concluido + PRD-B com requires: [PRD-A] mas A incomplete;
    ou PRD-A requires: PRD-B e PRD-B requires: PRD-A para ciclo)
2. GREEN: editar a SKILL.md ou o template conforme a fase
3. VERIFY: rodar skill contra fixture, confirmar comportamento (aviso, ciclo, origem)
4. ROLLBACK: deletar fixture apos validar
```

Checklist padrao de cada fase:
- [ ] Criar fixture em `.planning-test/` com estado especifico da fase
- [ ] Simular fluxo da skill manualmente
- [ ] Confirmar comportamento esperado (aviso, deteccao de ciclo, rastreio)
- [ ] Confirmar que avisos sao NAO-BLOQUEANTES (skill prossegue)
- [ ] Confirmar que artefatos fora de `.planning/` NUNCA sao tocados
- [ ] Limpar fixture apos validar

**Tracer Bullet deste plano:** N/A (tracer foi no Plano 01). O "minimum valuable path" aqui eh
a fase-01: sem o campo `requires:` parseavel, as outras duas fases nao tem sobre o que operar.

---

## Gotchas Conhecidos

Herdados do PRD, CONTEXT (D11, D12, R3) e descobertos ao ler `lessons-learned/SKILL.md` e
`prd-template.md`:

- **G1 (D11 — `requires:` opcional):** Campo `requires:` eh OPCIONAL. PRDs simples nao precisam.
  Se ausente, nenhum aviso — comportamento default preservado.

- **G2 (flexibilidade YAML):** `requires:` aceita STRING ou ARRAY. Parser tem que normalizar:
  `requires: auth` (string unica) e `requires: [auth, billing]` (array) sao equivalentes. Sempre
  tratar internamente como lista. Uso de array vazio (`requires: []`) eh valido mas nao dispara aviso.

- **G3 (slug OU pasta):** `requires:` aceita tanto slug curto (`auth`) quanto nome completo de pasta
  (`2026-04-20-auth`). Resolucao: se o valor NAO bate com uma pasta exata, buscar pasta que termine
  em `-{valor}` (procura por slug dentro das pastas datadas). Se ambiguo (2 pastas com mesmo slug),
  AVISAR que ambiguidade existe e pedir para dev usar nome completo.

- **G4 (leitura de STATE.md de cada dependencia):** `execute-plan` precisa enumerar pastas datadas
  e ler `STATE.md` de cada dependencia listada em `requires:`. Reusar logica do Plano 03 fase-01
  (descoberta interativa) — a enumeracao de `YYYY-MM-DD-*` ja eh implementada la. Nao duplicar.

- **G5 (R3 — auto-referencia):** `requires: [ele-mesmo]` conta como ciclo de tamanho 1. DFS deve
  detectar caminho `A → A`. Tratar exatamente igual a ciclo maior.

- **G6 (R3 — ciclo nao bloqueia):** Conforme PRD/PRD Riscos R3, ciclo eh AVISO, nao erro. Dev pode
  ter contexto que justifica (ex: dependencia bidirecional valida em milestone composto). Nunca
  abortar execucao por causa de ciclo.

- **G7 (ciclo alem de direto):** DFS deve capturar ciclos indiretos: `A → B → C → A` tambem eh
  ciclo. Nao eh suficiente checar so pares `A requires B, B requires A`. Algoritmo padrao: DFS com
  3 cores (branco/cinza/preto) — se chegar em cinza, encontrou ciclo.

- **G8 (escopo pequeno de `.planning/`):** `.planning/` raramente tem mais que 10 PRDs. DFS simples
  sobre lista O(V+E) basta — nao precisa otimizacao. Nao implementar algoritmo sofisticado.

- **G9 (referencia dangling):** Se `requires: [foo]` aponta para pasta que nao existe, mostrar AVISO
  especifico ("PRD foo nao encontrado"). Nao confundir com ciclo. Nao bloquear.

- **G10 (D12 — `/lessons-learned` sem parametro de path):** A skill atual (`lessons-learned/SKILL.md`)
  recebe apenas `add|review|prune [description]` via `$ARGUMENTS`. NAO tem parametro de PRD path.
  Fase-03 deve INFERIR o PRD de origem automaticamente: listar `.planning/_archive/YYYY-MM-DD-*/`,
  ordenar por data (descendente — mais recente primeiro), pegar o topo. Se `_archive/` vazio ou
  inexistente, NAO adicionar linha de origem (comportamento atual preservado).

- **G11 (`prd-template.md` sem frontmatter YAML):** O template atual do PRD (`write-prd/templates/prd-template.md`)
  NAO tem frontmatter YAML no topo. Comeca direto com `# PRD: {Feature Name}` e metadados como
  `**Status:**`, `**Author:**`, `**Date:**`, `**Context:**` em negrito no topo. A fase-01 precisa
  ADICIONAR um bloco frontmatter YAML (`---\nrequires: []\n---`) no topo e atualizar os parsers das
  skills. Considerar que projetos legacy podem ter PRDs SEM esse frontmatter — parser deve tratar
  ausencia como `requires: []`.

- **G12 (linha `Origem:` na licao):** A licao em `/lessons-learned` tem formato:
  ```
  ### [Categoria] Titulo conciso
  **Regra:** ...
  **Contexto:** ...
  ```
  Adicionar linha `**Origem:** .planning/_archive/{pasta}/SUMMARY.md` como TERCEIRO campo, apos
  `**Contexto:**`. Nao alterar categorias nem regra do filtro de qualidade.

- **G13 (arquivo de licoes legacy):** `lessons-learned/SKILL.md` menciona `.claude/lessons.md OU
  secao no CLAUDE.md`. Fase-03 deve manter compatibilidade com ambos — so adiciona a linha
  `Origem:` no bloco recem-criado, nao altera formato global do arquivo.

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
