<!--
Esta fase invoca helper de Plano 03 (migrate-lessons.ts). Codigo TS desse helper ja tem
provenance comments em Plano 03. Esta fase consome.
-->

# Fase 05: Dividir `lessons-learned.md` em compound notes individuais com frontmatter

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~1.5h
**Depende de:** fase-03 (`docs/compound/` existe). Paralela com fase-04, 06, 07.
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/lessons-learned.md` (77 linhas, 5 licoes) → **5 arquivos individuais** em `anti-vibe-coding/docs/compound/` com frontmatter `title/category/tags/created` (CA-29 contract) + secoes `## Problem`, `## Solution`, `## Prevention` (CA-14 contract).

Atende **CA-03** (lessons-learned.md → docs/compound/*.md com frontmatter).

---

## Arquivos Afetados

### Origem (READ)

`anti-vibe-coding/lessons-learned.md` — preservado em `.planning.v5-backup/lessons-learned.md.original` desde fase-01. Originais NAO deletados desta pasta nesta fase (delete em fase-08 apos validacao verde).

### Destinos (CREATE)

| Arquivo | Origem (secao em lessons-learned.md) | Frontmatter inferido |
|---------|--------------------------------------|----------------------|
| `anti-vibe-coding/docs/compound/2026-03-23-hooks-json-overwrite-bug.md` | `## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)` (L5-L57) | `category: bug-history`, `tags: [hooks, manifest, install, regression]`, `created: 2026-03-23` |
| `anti-vibe-coding/docs/compound/2026-04-21-grep-c-exit-1-quando-zero.md` | `### [Armadilha] grep -c retorna exit 1 quando count é zero` (L63-L65) | `category: armadilha`, `tags: [bash, grep, exit-code, scripts]`, `created: 2026-04-21` |
| `anti-vibe-coding/docs/compound/2026-04-21-anti-vibe-coding-git-independente.md` | `### [Arquitetura] anti-vibe-coding/ é repositório git independente` (L67-L69) | `category: architecture`, `tags: [git, monorepo, repo-structure]`, `created: 2026-04-21` |
| `anti-vibe-coding/docs/compound/2026-04-21-blocos-codigo-aninhados-skill-md.md` | `### [Armadilha] Blocos de código aninhados em SKILL.md precisam de quadruple backticks` (L71-L73) | `category: armadilha`, `tags: [skill-md, markdown, parser, fences]`, `created: 2026-04-21` |
| `anti-vibe-coding/docs/compound/2026-04-21-hooks-cjs-stdin-pattern.md` | `### [Arquitetura] Padrão de entrada de hooks .cjs difere por tipo de evento` (L75-L77) | `category: architecture`, `tags: [hooks, cjs, stdin, posttooluse, pretooluse]`, `created: 2026-04-21` |

---

## Implementacao

### Passo 1: Invocar `lib/migrate-lessons.ts` (de Plano 03)

```typescript
// Helper de Plano 03 fase-04
import { migrateLessons } from "../../anti-vibe-coding/scripts/lib/migrate-lessons"

const source = "f:/Projetos/Claude code/anti-vibe-coding/lessons-learned.md"
const target = "f:/Projetos/Claude code/anti-vibe-coding/docs/compound"

const result = await migrateLessons({
  sourcePath: source,
  targetDir: target,
  preserveOriginalLanguage: true,   // G4 do README — conteudo em PT preservado
  generateProblemSolutionPrevention: true,
})

console.log(`Migrated ${result.notesCreated} lessons`)
// Esperado: 5 arquivos criados
```

Helper deve:
1. Parsear cabecalhos H2 (`## 2026-MM-DD:`) E H3 (`### [Categoria]`) como delimitadores
2. Extrair categoria do tag `[Categoria]` ou do contexto
3. Inferir `created` da data no cabecalho (H2) ou do bloco "Licoes v5.2" (H3, herda `2026-04-21`)
4. Inferir tags por keyword matching no corpo
5. Reorganizar corpo em Problem/Solution/Prevention quando possivel

### Passo 2: Pos-processamento manual onde reorganizacao for ambigua

O bug history (item 1, hooks.json overwrite) ja tem secoes claras (Sintoma/Causa Raiz/Impacto/Fix Aplicado/Licao/Prevencao). Mapeamento:

- `Sintoma + Causa Raiz + Impacto` → `## Problem`
- `Fix Aplicado + Licao` → `## Solution`
- `Prevencao` → `## Prevention`

Para as 4 licoes v5.2 (formato `### [Tag] Titulo` + `**Regra:** ...` + `**Contexto:** ...`):

- `Contexto` → `## Problem` (o que aconteceu/quando)
- `Regra` → `## Solution` (o que fazer)
- `## Prevention` — **marcar `> _(extrapolated from rule)_`** se ausente (G6 do README)

Exemplo de arquivo gerado (item 1):

```markdown
---
title: "hooks.json overwrite bug during init"
category: bug-history
tags: [hooks, manifest, install, regression]
created: 2026-03-23
---

## Problem

Running `/anti-vibe-coding:init` in a project with customized hooks completely replaced the
project's `hooks.json`. Customized hooks (doc-enforcement.cjs, design-validator.cjs) lost their
configuration. Plugin's `.cjs` files were duplicated into the project's `.claude/hooks/`.

Root cause:
1. `plugin-manifest.json` had `hooks/hooks.json` with `updateStrategy: "replace"`
2. Manifest listed individual `.cjs` files (tdd-gate.cjs, user-prompt-gate.cjs) — they shouldn't be tracked
3. `skills/init/SKILL.md` didn't document how to merge hooks
4. Implementation copied files blindly without merging

Impact: Carreirarte project lost hook config; `doc-enforcement.cjs` stopped working.

## Solution

1. Changed `updateStrategy` of `hooks/hooks.json` to `"merge"` in manifest
2. Removed individual `.cjs` files from the manifest (they shouldn't be tracked)
3. Added Step 4 in init skill documenting hook merging
4. Created `skills/lib/hooks-merge-utils.md` with merge algorithm
5. Manually fixed `hooks.json` in Carreirarte
6. Removed duplicate `.cjs` files from Carreirarte project

Key insights:
- Plugin's `.cjs` hooks NEVER copy to projects (they live in `$CLAUDE_PLUGIN_ROOT/hooks/`)
- Project's customized hooks live in `.claude/hooks/*.cjs`
- `hooks.json` must merge BOTH: project's first, plugin's second; preserve matchers; backup first

## Prevention

- Document ALL installation steps in SKILL.md
- Test `init` in projects with existing customizations
- Validate that `updateStrategy` is correct per file type
- Files that MUST be merged: CLAUDE.md, rules/*.md, hooks/hooks.json
- Files that MUST be replaced: agents/*.md, skills/*.md, senior-principles.md
- Files that NEVER copy: hooks/*.cjs (from plugin)

## Affected files

- `plugin-manifest.json` (line 66-70)
- `skills/init/SKILL.md` (lines 288-337)
- `skills/lib/hooks-merge-utils.md` (new)
- Carreirarte project: `.claude/hooks/hooks.json` (manually corrected)
```

Idioma: Mantido em **portugues** o conteudo original (G4 do README — preservar idioma original). MAS o titulo e secoes principais em **ingles** para harmonia com o resto da estrutura v6.

**Excecao:** poderia traduzir tudo para EN, mas custa ~30min adicionais. Pre-decidido em G4: **preservar idioma original do corpo**. Apenas frontmatter e secoes (`## Problem` etc.) em EN.

### Passo 3: Validar com compound:check

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
bun scripts/compound-check.ts .
```

Esperado: exit 0 (cada compound note tem frontmatter completo + secoes obrigatorias). Se falhar:
- "Missing frontmatter field: tags" → conferir frontmatter manualmente
- "Missing section: ## Prevention" → conferir presenca da secao mesmo que com placeholder

### Passo 4: Commit

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add docs/compound/
git commit -m "feat(plano08-fase05): split lessons-learned.md into 5 compound notes (CA-03, CA-29)"
```

---

## Gotchas

- **G6 do README (frontmatter de 5 licoes):** Detalhamento explicito de category/tags/created por item — copiado verbatim aqui no quadro de Destinos.
- **G7 do README (slug collision):** As 5 licoes tem slugs distintos. Sem colisao. Verificar via `ls docs/compound/*.md | wc -l` == 5.
- **G9 do README (idempotencia):** Helper migrate-lessons skipa se arquivo ja existe. Rodar 2x = mesmo resultado.
- **G4 do README (idioma):** Corpo em PT, frontmatter+secoes em EN. Justifica em commit.
- **Local (`## Prevention` ausente nas licoes v5.2):** Forcar placeholder `> _(extrapolated from rule)_` quando ausente — G6 do README sub-item. Compound:check (Plano 04 fase-02) deve aceitar secao com qualquer conteudo, incluindo placeholder.
- **Local (bug history vs lesson rule):** Item 1 (bug history) tem MUITO mais conteudo (52 linhas) que os outros 4 (3 linhas cada). Esse desbalanco eh esperado; compound:check nao impoe minimo de linhas por secao.

---

## Verificacao

### Checklist

- [ ] `ls anti-vibe-coding/docs/compound/*.md | grep -v README | wc -l` retorna **5**
- [ ] Para cada arquivo: `grep -c '^---' file` == 2 (frontmatter delimitado)
- [ ] Para cada arquivo: `grep -c '^title:\|^category:\|^tags:\|^created:' file` == 4 (4 campos obrigatorios)
- [ ] Para cada arquivo: `grep -c '^## Problem$\|^## Solution$\|^## Prevention$' file` == 3
- [ ] `bun scripts/compound-check.ts anti-vibe-coding/` retorna exit 0
- [ ] `anti-vibe-coding/lessons-learned.md` original ainda existe (NAO deletado nesta fase — delete em fase-08)
- [ ] `.planning.v5-backup/lessons-learned.md.original` ainda existe (fase-01 criou)

---

## Criterio de Aceite

**Por maquina:**
- 5 arquivos `anti-vibe-coding/docs/compound/2026-*.md` existem
- `bun scripts/compound-check.ts anti-vibe-coding/` exit 0
- Cada compound note tem 4 frontmatter fields + 3 secoes Problem/Solution/Prevention

**Por humano:**
- Frontmatter `category` reflete tag original ([Armadilha]→armadilha, [Arquitetura]→architecture, bug→bug-history)
- Conteudo PT preservado, secoes em EN

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
