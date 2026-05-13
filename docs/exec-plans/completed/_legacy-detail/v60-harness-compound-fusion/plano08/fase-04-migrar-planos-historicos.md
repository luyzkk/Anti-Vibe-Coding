<!--
Esta fase invoca helpers de Plano 03 (migrate-planning.ts) — codigo TS de Plano 03 ja tem
provenance comments. Esta fase opera sobre o repo PAI (`f:/Projetos/Claude code/.planning/`)
e escreve em `anti-vibe-coding/docs/exec-plans/completed/`.
-->

# Fase 04: Migrar planos historicos → `docs/exec-plans/completed/` com 10 secoes D18

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~2.5h
**Depende de:** fase-03 (estrutura `docs/exec-plans/completed/` existe). Paralela com fase-05, 06, 07.
**Visual:** false

---

## O que esta fase entrega

6 conjuntos de planos historicos migrados para `anti-vibe-coding/docs/exec-plans/completed/` com as 10 secoes harmonizadas (D18). Atende **CA-02** (planos historicos sob docs/exec-plans/completed/ com secoes harmonizadas).

**Decisao 08-A2 do README confirmada:** **3 arquivos finais** (um por PRD agregando seus planos internos), nao um arquivo por plano interno. Justifica: template D18 eh por FEATURE/PRD, sub-planos viram secoes dentro de "Phases History".

---

## Arquivos Afetados

### Origens (READ — repo pai `f:/Projetos/Claude code/.planning/`)

| Origem | Detalhes |
|--------|----------|
| `.planning/CONTEXT-refatoracao-prd-folders.md` + `PRD-` + `PLAN-` + `STATE-` + `SUMMARY-` | 5 arquivos soltos do primeiro PRD (refatoracao PRD folders) |
| `.planning/plano01/` ate `plano04/` | 4 sub-planos do PRD acima, cada um com README.md + MEMORY.md + 3-5 fases |
| `.planning/2026-04-21-anti-vibe-v52/` | PRD completo (CONTEXT/PRD/PLAN/STATE/SUMMARY) + 6 sub-planos (plano01..06) |
| `.planning/2026-05-04-v53-plugin-adaptativo/` | PRD completo (CONTEXT/PRD/PLAN/STATE) + 5 sub-planos (plano01..05) |

### Destinos (CREATE em `anti-vibe-coding/docs/exec-plans/completed/`)

| Arquivo | Origem agregada | Conteudo |
|---------|-----------------|----------|
| `2026-04-15-refatoracao-prd-folders.md` | `.planning/CONTEXT-/PRD-/PLAN-/STATE-/SUMMARY-refatoracao-prd-folders.md` + `.planning/plano01..04/` | PRD + 4 sub-planos consolidados em 10 secoes D18 |
| `2026-04-21-anti-vibe-v52.md` | `.planning/2026-04-21-anti-vibe-v52/` (PRD + 6 sub-planos) | PRD + 6 sub-planos em "Phases History" |
| `2026-05-04-v53-plugin-adaptativo.md` | `.planning/2026-05-04-v53-plugin-adaptativo/` (PRD + 5 sub-planos) | PRD + 5 sub-planos em "Phases History" |

### Originais (READ-ONLY — NAO deletar, sao do repo pai — G12 do README)

Manter `f:/Projetos/Claude code/.planning/` intacto. Plano 08 apenas COPIA conteudo para `anti-vibe-coding/docs/exec-plans/completed/` (duplicacao consciente — M11).

---

## Implementacao

### Passo 1: Invocar `lib/migrate-planning.ts` (de Plano 03) para cada PRD

Helper assinatura assumida (validar com Plano 03 fase-03 quando estiver pronto):

```typescript
// Helper de Plano 03 fase-03 — exemplo de uso aqui em fase-04 deste plano
import { migratePlanning } from "../../anti-vibe-coding/scripts/lib/migrate-planning"

const REPO_PAI = "f:/Projetos/Claude code/.planning"
const DOG_FOOD_TARGET = "f:/Projetos/Claude code/anti-vibe-coding/docs/exec-plans/completed"

// PRD 1: refatoracao-prd-folders (planos soltos sem pasta datada)
await migratePlanning({
  source: {
    contextPath: `${REPO_PAI}/CONTEXT-refatoracao-prd-folders.md`,
    prdPath: `${REPO_PAI}/PRD-refatoracao-prd-folders.md`,
    planPath: `${REPO_PAI}/PLAN-refatoracao-prd-folders.md`,
    summaryPath: `${REPO_PAI}/SUMMARY-refatoracao-prd-folders.md`,
    statePath: `${REPO_PAI}/STATE-refatoracao-prd-folders.md`,
    planoFolders: [
      `${REPO_PAI}/plano01`,
      `${REPO_PAI}/plano02`,
      `${REPO_PAI}/plano03`,
      `${REPO_PAI}/plano04`,
    ],
  },
  targetFile: `${DOG_FOOD_TARGET}/2026-04-15-refatoracao-prd-folders.md`,
  targetStatus: "completed",
  enrichToD18Sections: true,
})

// PRD 2: anti-vibe-v52
await migratePlanning({
  source: { folder: `${REPO_PAI}/2026-04-21-anti-vibe-v52` },
  targetFile: `${DOG_FOOD_TARGET}/2026-04-21-anti-vibe-v52.md`,
  targetStatus: "completed",
  enrichToD18Sections: true,
})

// PRD 3: v53-plugin-adaptativo
await migratePlanning({
  source: { folder: `${REPO_PAI}/2026-05-04-v53-plugin-adaptativo` },
  targetFile: `${DOG_FOOD_TARGET}/2026-05-04-v53-plugin-adaptativo.md`,
  targetStatus: "completed",
  enrichToD18Sections: true,
})
```

**Importante:** se a assinatura real do helper diferir, adaptar a chamada — mas a INTENCAO eh a mesma (consolidar PRD + sub-planos em UM arquivo destino com 10 secoes).

### Passo 2: Enriquecer com as 10 secoes D18

O helper `migratePlanning` com `enrichToD18Sections: true` (Plano 03 fase-03) deve produzir esqueleto com:

1. `## Goal` — extraido do "Problema/Objetivo" do PRD original
2. `## Scope` — extraido do "Solucao" / "Requisitos Funcionais" do PRD
3. `## Assumptions` — extraido do PRD (ou marca `> _(reconstructed: section absent in original)_`)
4. `## Risks` — extraido da tabela "Riscos" do PRD
5. `## Execution Steps` — consolida o "Mapa de Fases" de cada sub-plano (uma lista hierarquica)
6. `## Review Checklist` — marca `> _(reconstructed)_` se ausente
7. `## Validation Log` — extraido de STATE.md (campos `executed_at`, `result`) + `SUMMARY.md` se existir
8. `## Compound Opportunity` — marca `> _(reconstructed)_` em planos pre-v6
9. `## Lessons Captured` — extraido das `MEMORY.md` de cada sub-plano (bugs descobertos, gotchas)
10. `## Exit Criteria` — extraido dos Criterios de Aceite do PRD + status final do STATE.md

Se helper nao implementar `enrichToD18Sections` exatamente assim, esta fase faz pos-processamento manual (sub-passo abaixo).

### Passo 3: Pos-processamento manual onde helper for incompleto

Para cada arquivo gerado, verificar:

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding/docs/exec-plans/completed/"
for f in *.md; do
  echo "=== $f ==="
  grep -c '^## ' "$f"   # esperado: >= 10
done
```

Se contagem <10 em algum arquivo, adicionar manualmente as secoes faltantes com placeholder reconstrutivo (G5 do README):

```markdown
## Assumptions

> _(Reconstructed: this section was absent in the original PRD. Inferred from context.)_

- Plugin used Claude Code v1.x
- Single-user installation (no team sync via remote registry)
- ...
```

### Passo 4: Anexar artefatos originais como apendices verbatim (08-A3)

Em cada arquivo gerado, adicionar secao final:

```markdown
## Original artifacts (verbatim)

### CONTEXT.md (preserved for audit trail)

> _(Content of `f:/Projetos/Claude code/.planning/{folder}/CONTEXT.md` at migration time)_

\`\`\`markdown
{conteudo do CONTEXT.md}
\`\`\`

### PRD.md (preserved)

\`\`\`markdown
{conteudo do PRD.md}
\`\`\`

### Phases History (consolidated from plano01..N/)

#### plano01 — {nome}

{conteudo de plano01/README.md}

#### plano02 — {nome}

{conteudo de plano02/README.md}
```

Isso preserva o trail historico completo dentro de **1 arquivo** por PRD. Tamanho final por arquivo: 500-2000 linhas (aceitavel para "completed" — eh historico, nao consumido em sessao tipica).

### Passo 5: Commit

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add docs/exec-plans/completed/
git commit -m "feat(plano08-fase04): migrate 3 historical PRDs to docs/exec-plans/completed/ (D18 10-sections, CA-02)"
```

---

## Gotchas

- **G5 do README (10 secoes em planos historicos):** Critico nesta fase. Helper deve produzir 10 secoes; se sair menos, pos-processamento manual com placeholder reconstrutivo `> _(reconstructed: ...)_`.
- **G9 do README (idempotencia):** Rodar fase-04 2x nao deve duplicar arquivos. Helper de Plano 03 fase-03 ja implementa essa logica (skip se destino ja existe com mesmo slug). Validar com `ls -la docs/exec-plans/completed/` apos segunda execucao — contagem igual.
- **G10 do README (sizing ≤3min total):** 3 arquivos finais com volume real (~1000 linhas cada) = ~3000 linhas de markdown processadas. Helper usa stream IO; deveria rodar em <60s. Se passar 5min, investigar.
- **G12 do README (originais nao deletados):** `f:/Projetos/Claude code/.planning/` continua intacto. Esta fase apenas LE e COPIA. Documentar em commit.
- **G14 do README (CONTEXT-*.md soltos):** 5 arquivos soltos do PRD "refatoracao-prd-folders" entram como apendices em `2026-04-15-refatoracao-prd-folders.md` (08-A3 confirmado).
- **Local (validacao por secao apos pos-processamento):** Apos passo 3, conferir CADA arquivo manualmente:
  - `grep -c '^## Goal$' file` == 1
  - `grep -c '^## Scope$' file` == 1
  - ... ate Exit Criteria
- **Local (volume + atomicity):** Esta fase NAO se beneficia de paralelizar internamente (3 invocacoes ja sao rapidas). Mas pode rodar paralela com fase-05, 06, 07 (sub-arvores disjuntas de `docs/`).

---

## Verificacao

### Checklist

- [ ] `ls anti-vibe-coding/docs/exec-plans/completed/*.md | wc -l` retorna **3** (3 PRDs migrados)
- [ ] Para cada arquivo: `grep -c '^## ' anti-vibe-coding/docs/exec-plans/completed/{nome}.md` ≥ 10
- [ ] Cada arquivo tem secao `## Original artifacts (verbatim)` (apendice preservando trail)
- [ ] `grep -l 'reconstructed: section absent' anti-vibe-coding/docs/exec-plans/completed/*.md` — eh OK ter matches (sinalizado, nao silenciado)
- [ ] `bun scripts/harness-validate.ts anti-vibe-coding/` aceita `docs/exec-plans/completed/` (nao reclama de planos orfaos)
- [ ] `wc -l anti-vibe-coding/docs/exec-plans/completed/*.md` — cada um entre 200 e 3000 linhas
- [ ] Originais em `f:/Projetos/Claude code/.planning/{plano01..04,2026-04-21-*,2026-05-04-*}/` intactos (`git status` no repo pai mostra nada modificado)

---

## Criterio de Aceite

**Por maquina:**
- `[ "$(ls anti-vibe-coding/docs/exec-plans/completed/*.md | wc -l)" -eq 3 ]` exit 0
- Cada arquivo gerado contem as 10 secoes D18 (validavel via grep)
- `bun scripts/harness-validate.ts anti-vibe-coding/` exit 0 (ou apenas warnings sobre fase-05/06/07 ainda incompletas)

**Por humano:**
- Cada PRD migrado preserva trail historico (apendice "Original artifacts")
- Secoes reconstruidas sinalizam com placeholder (nao fingem ser originais)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
