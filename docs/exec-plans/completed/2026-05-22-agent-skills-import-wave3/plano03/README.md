# Plano 03: Pipeline Compound -> Reference

**Feature:** Agent-Skills Import — Wave 3 ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~3h
**Depende de:** Nenhum bloqueador formal (Plano 01 e Plano 02 nao tocam `docs/compound/` nem `docs/references/`; podem rodar em paralelo apos PRD aprovado).
**Desbloqueia:** Plano 04 fase-04 (manifest final NAO regenera checksums para arquivos em `docs/` — manifest cobre `skills/` e `agents/`; mas Exit Criteria da Wave referencia CA-05 e CA-06 que este plano fecha)

---

## O que este plano entrega

Pipeline de curadoria de knowledge: criterio numerico explicito para promover compound notes para references (documentado em `docs/compound/README.md`), 3 references operacionais novos em `docs/references/` (`init-step-contract.md`, `hooks-checklist.md`, `tdd-cycle-checklist.md`) destilados de 5 compound notes-origem em formato checklist, e frontmatter `referenced-by:` adicionado nas 5 compound notes-origem fechando o ciclo de descoberta. Cobre CA-05, CA-06, MH-04, MH-05 e SH-04 do PRD. Compound notes-origem permanecem intactas (R-03): references sao destilacao operacional, nao substituicao.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado | `../PRD.md` (status: approved) | pronto |
| Plano 01 | NAO bloqueia (arquivos diferentes — toca `anti-vibe-review` e `verify-work`) | pronto |
| Plano 02 | NAO bloqueia (arquivos diferentes — toca `tdd-verifier` e fixtures) | pronto |
| Wave 2 | NAO bloqueia (Wave 2 toca skills/agents; este plano so toca `docs/`) | pronto |
| Templates de fase/plano/memory | `skills/plan-feature/templates/` | pronto |
| Compound notes-origem (5 arquivos) | `docs/compound/` (verificadas — ver Gotchas G1) | pronto (4 confirmadas + 1 substituta) |
| `docs/references/README.md` + 3 seeds Wave 1 (security/accessibility/testing) | `docs/references/` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `docs/compound/README.md` com `## Quando promover para reference` (CA-06) | Plano 04 fase-04 (Exit Criteria audit) |
| `docs/references/{init-step-contract,hooks-checklist,tdd-cycle-checklist}.md` (CA-05) | Plano 04 fase-04 (Exit Criteria audit); skills/agents que linkarem em waves futuras |
| Compound notes-origem com `referenced-by:` no frontmatter (SH-04) | Discoverability futura — agentes que leem compound podem seguir para a reference |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-criterio-promocao-compound-readme.md` | Secao `## Quando promover para reference` adicionada em `docs/compound/README.md` com criterio numerico (>=3 OU >=2 OU obrigatorio) | 0.5h | — |
| 02 | `fase-02-criar-init-step-contract-reference.md` | `docs/references/init-step-contract.md` criado (checklist destilado de 3 compound notes init) | 1h | fase-01 |
| 03 | `fase-03-criar-hooks-checklist-reference.md` | `docs/references/hooks-checklist.md` criado (checklist destilado de `prompt-hook-includes-no-loop`) | 0.75h | fase-01 |
| 04 | `fase-04-criar-tdd-cycle-checklist-reference.md` | `docs/references/tdd-cycle-checklist.md` criado (checklist destilado de `tdd-gate-needs-stub-first`) | 0.75h | fase-01 |
| 05 | `fase-05-frontmatter-referenced-by-compound-notes.md` | Campo `referenced-by:` adicionado no frontmatter das 5 compound notes-origem (idempotente) | 0.5h | fase-02, fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (criterio promocao em compound/README.md)
    |
    +----------+----------+----------+
    |          |          |          |
    v          v          v          
fase-02    fase-03    fase-04
(init-     (hooks-    (tdd-cycle-
 step)      checklist) checklist)
    |          |          |
    +----------+----------+
               |
               v
        fase-05 (referenced-by frontmatter)
```

**Paralelismo possivel:** fases 02, 03 e 04 podem ser executadas em paralelo apos fase-01 estar concluida (cada uma cria UM reference novo independente). fase-05 PRECISA aguardar 02-04 todas concluidas — o frontmatter so cita references ja criados (verificar arquivo exista antes de citar). fase-01 e independente das demais e e o pre-requisito conceitual (DT-3 do PRD: criterio antes de promover).

---

## TDD Strategy

```
Ciclo por fase (markdown-only):
1. RED: grep do padrao esperado retorna 0 matches (secao/arquivo/frontmatter ausente)
2. GREEN: edicao cirurgica ou criacao do arquivo satisfaz grep
3. REFACTOR: nao aplicavel a markdown estatico
4. VERIFY: greps especificos + wc -l para references + idempotencia em fase-05
```

**Tracer Bullet deste plano:** N/A — tracer da Wave 3 e o Plano 01. Plano 03 e contribuicao paralela focada em curadoria de knowledge.

**Notas TDD por fase:**
- fase-01: RED = `grep -E "## Quando promover para reference" docs/compound/README.md` retorna 0 matches; GREEN = retorna 1 match + criterio numerico visivel.
- fase-02/03/04: RED = arquivo nao existe; GREEN = arquivo existe + `wc -l` >= 40 + grep header `^Origem:` retorna match + `grep -c "^- \[ \]"` retorna >= 5 (checklist real, nao prosa).
- fase-05: RED = `grep "^referenced-by:" <arquivo>.md` retorna 0 matches; GREEN = retorna 1 match. Idempotencia: rodar fase 2 vezes nao duplica linha (verificar antes de adicionar).

---

## Gotchas Conhecidos

- **G1 (R-NEW-01 PLAN/PRD):** Compound note `2026-05-18-init-cascade-fix.md` NAO EXISTE no repo. **Substituta CONFIRMADA:** `2026-05-18-detector-parser-narrow-happy-path.md` (mesmo dia, dominio init, padrao detector/parser estreito demais — extracao operacional para `init-step-contract` cobre o gap). Decisao registrada como DI no MEMORY desde o inicio do plano. Aplica-se a fase-02 e fase-05.
- **G2 (R-03 PRD):** Compound notes-origem NAO sao apagadas nem reescritas. References sao DESTILACAO operacional (checklist), com header "Origem: compound notes X, Y, Z". Narrativa permanece nas compound; reference e operacional. fase-02/03/04 verificam em checklist final: a compound note original ainda existe e nao foi modificada (apenas frontmatter sera tocado em fase-05).
- **G3 (R-07 PRD):** Reference NAO copia paragrafos narrativos das compound notes. Formato e checklist (`- [ ] verificacao especifica`), tabelas de erros vs causas, ou step-by-step. Citar compound-origem no topo do arquivo no formato `> Origem: docs/compound/<file1>.md + docs/compound/<file2>.md`.
- **G4 (DT-3 PRD):** Criterio de promocao e MANUAL com numero. NAO ha script automatizado. fase-01 documenta o criterio em prosa + bullet list; nao adiciona ferramenta de deteccao automatica (Won't-Have do PRD).
- **G5 (DT-5 PRD — adicao nao substituicao):** fase-01 ADICIONA secao nova em `docs/compound/README.md`. NAO reescreve o que ja existe (Naming Convention, Required Frontmatter, Required Sections permanecem intactos). Edit cirurgico inserindo apos a ultima secao existente.
- **G6 (idempotencia fase-05):** Re-rodar fase-05 nao deve duplicar `referenced-by:` no frontmatter. Implementacao: ler arquivo, regex `^referenced-by:` — se ja existe, skip; se nao, adicionar antes do `---` de fechamento do frontmatter.
- **G7 (R-NEW-03 PLAN — telemetria TS):** Este plano NAO toca `skills/` nem `agents/`. So `docs/compound/README.md` + `docs/references/*.md` + frontmatter de 5 compound notes. Nenhum bloco `typescript` de telemetria de skill esta em risco. Risco baixo — registrado apenas para completude.
- **G8:** `docs/references/README.md` lista seeds atuais em secao `## Seeds Disponiveis`. Este plano NAO atualiza esse README (escopo seria fase 6 fora do plano). Decisao: as 3 references novas ficam descobriveis via filesystem (`ls docs/references/`); secao `## Seeds Disponiveis` pode ser atualizada em uma fase de tech-debt posterior. Registrar como nota no MEMORY para evitar surpresa em audit.
- **G9 (sem regen de manifest):** `plugin-manifest.json` cobre checksums de `skills/` e `agents/`. Edicoes em `docs/` NAO requerem regeneracao de manifest. `bun run harness:validate` valida estrutura de docs (compound, exec-plans) mas nao checksums.

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-05 (3 references operacionais em `docs/references/`) | Integral | fases 02, 03, 04 |
| CA-06 (criterio de promocao documentado com numero) | Integral | fase-01 |

CAs 01, 02, 10 sao cobertos por Plano 01. CAs 03, 04 por Plano 02. CAs 07, 08, 09, 11 por Plano 04.

---

## MH/SH do PRD cobertos por este plano

| Item | Cobertura | Onde |
|------|-----------|------|
| MH-04 (compound/README com `## Quando promover para reference` + criterio explicito) | Integral | fase-01 |
| MH-05 (>=3 references operacionais criados em `docs/references/`) | Integral | fases 02, 03, 04 |
| SH-04 (compound notes-origem com `referenced-by:` no frontmatter) | Integral | fase-05 |

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
