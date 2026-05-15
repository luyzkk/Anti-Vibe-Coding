# Fase 05: atualizar templates para nova estrutura

**Plano:** 01 — Nova estrutura (fundacao + tracer bullet)
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03 (precisa dos 3 SKILL.md no novo layout para referenciar caminhos reais nos templates)
**Visual:** false

---

## O que esta fase entrega

Atualiza os 5 templates versionados do plugin para refletir a nova estrutura de pastas datadas:

1. `write-prd/templates/prd-template.md` — adicionar frontmatter com `requires:` opcional (prepara RF8 do Plano 04) e atualizar campo `**Context:**` para caminho relativo
2. `plan-feature/templates/plan-overview-template.md` — ajustar campo `PRD:` para caminho relativo (`./PRD.md`)
3. `plan-feature/templates/plan-readme-template.md` — ajustar referencia ao PLAN overview para caminho relativo (`../PLAN.md`)
4. `plan-feature/templates/fase-template.md` — sem mudanca estrutural; apenas revisar exemplos de path se mencionarem `.planning/*` absoluto
5. `plan-feature/templates/memory-template.md` — sem mudanca estrutural; revisar tom e referencias

Esta eh a ultima fase do Plano 01: consolida o novo layout nos artefatos que futuras execucoes irao gerar. Atende parte de RF8 (frontmatter `requires:`) como preparacao para Plano 04.

Escopo NAO inclui:
- Geracao do template do MEMORY consolidado do PRD — Plano 03, fase-04 (ao arquivar)
- Template do SUMMARY.md — Plano 03, fase-03/04
- `state-template.md` (se existir) — ja opera via caminho relativo na fase-03, verificar e ajustar se precisar
- Atualizar `anti-vibe-coding/CLAUDE.md` secao "Estrutura hierarquica" — Plano 03, fase-05

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/templates/prd-template.md` | Modify | Adicionar frontmatter YAML com `requires:` opcional; atualizar campo Context para `./CONTEXT.md` |
| `anti-vibe-coding/skills/plan-feature/templates/plan-overview-template.md` | Modify | Atualizar linha `**PRD:**` para caminho relativo `./PRD.md` |
| `anti-vibe-coding/skills/plan-feature/templates/plan-readme-template.md` | Modify | Atualizar referencia ao PLAN overview para `../PLAN.md` |
| `anti-vibe-coding/skills/plan-feature/templates/fase-template.md` | Review | Verificar se nenhum exemplo usa caminho absoluto `.planning/*` — ajustar se necessario |
| `anti-vibe-coding/skills/plan-feature/templates/memory-template.md` | Review | Verificar consistencia; ajustar referencias se mencionarem paths antigos |
| `anti-vibe-coding/skills/plan-feature/templates/state-template.md` (se existir) | Modify | Referencia ao PLAN agora eh `./PLAN.md` relativo |

---

## Implementacao

### Passo 1: Atualizar `prd-template.md` — adicionar frontmatter

Arquivo `anti-vibe-coding/skills/write-prd/templates/prd-template.md`. Atualmente comeca direto com `# PRD: {Feature Name}`. Adicionar frontmatter YAML no topo:

```markdown
---
slug: {feature-kebab}
date: {YYYY-MM-DD}
status: draft
# requires: []   # OPCIONAL — lista de slugs de outros PRDs dependencia (Plano 04)
---

# PRD: {Feature Name}

**Status:** Draft
**Author:** {dev} + AI
**Date:** {YYYY-MM-DD}
**Context:** ./CONTEXT.md  (caminho relativo — CONTEXT vive na mesma pasta se /grill-me foi usado)

---
(resto do template inalterado)
```

Pontos chave:
- `requires:` eh comentado por default (nao obrigatorio). Plano 04 fase-01 implementa a logica que LE esse campo.
- `slug` e `date` sao redundantes com o nome da pasta, mas uteis para tooling futuro que pode ler apenas o PRD.md sem parsear nome da pasta.
- `status` inicia como `draft`; o Step 4 do write-prd ja muda para `approved` ao aprovar.

### Passo 2: Atualizar `plan-overview-template.md`

Arquivo `anti-vibe-coding/skills/plan-feature/templates/plan-overview-template.md`, linha 3:

```markdown
# Plan: {Feature Name}

**PRD:** ./PRD.md  (caminho relativo — PRD vive na mesma pasta)
**Planos:** {N} planos, {M} fases total
**Created:** {YYYY-MM-DD}
```

Antes: `**PRD:** {caminho do PRD usado como base}` — ambiguo, podia virar caminho absoluto feio.

### Passo 3: Atualizar `plan-readme-template.md`

Arquivo `anti-vibe-coding/skills/plan-feature/templates/plan-readme-template.md`, linha 3:

```markdown
# Plano {NN}: {Nome do Plano}

**Feature:** {nome da feature} ([PLAN overview](../PLAN.md))
**Fases:** {N}
**Sizing total:** ~{X}h
**Depende de:** {Plano NN ou "Nenhum (primeiro plano)"}
**Desbloqueia:** {Plano NN, Plano MM}
```

Antes: `**Feature:** {nome da feature (link ao PLAN overview)}` — texto instrucional, nao um path real.
Agora: link markdown explicito `../PLAN.md` (sobe um nivel da pasta `planoNN/` para a raiz da PASTA_ATIVA).

### Passo 4: Revisar `fase-template.md`

Arquivo `anti-vibe-coding/skills/plan-feature/templates/fase-template.md`. Ler completo e verificar:
- Nao menciona `.planning/PLAN-*.md` ou `.planning/plano01/` absolutos (hoje nao menciona — mas revisar).
- Campo "Arquivos Afetados" usa caminhos DO PROJETO (src/, api/), nao de `.planning/`. OK no template atual.
- Campo "Verificacao" menciona `bun run test` — sem mudanca.

Se nao houver mudanca necessaria, apenas adicionar rodape:

```markdown
<!-- Gerado por /plan-feature em {YYYY-MM-DD}. Pasta do PRD: `.planning/{YYYY-MM-DD-slug}/` -->
```

(rodape ja existe; apenas ajustar se for generico demais).

### Passo 5: Revisar `memory-template.md`

Arquivo `anti-vibe-coding/skills/plan-feature/templates/memory-template.md`. Verificar:
- Header usa `# Memoria: Plano {NN} — {Nome do Plano}` — ok.
- Nao menciona paths absolutos. Ok.
- Nao precisa de mudanca estrutural.

Confirmar e seguir.

### Passo 6: `state-template.md` (se existir)

Verificar se existe em `anti-vibe-coding/skills/plan-feature/templates/`. Se existir, atualizar a linha `**Plan:**` para `./PLAN.md` (relativo). Se nao existir, criar agora minimal:

```markdown
# State: {Feature Name}

**Plan:** ./PLAN.md
**Phase:** planned
**Current Plan:** 01/{N}
**Last Updated:** {YYYY-MM-DD}

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | {nome} | {N} | 0/{N} | pending |

## Progress Global

Fases done: 0/{total} (0%)

## Log

- {YYYY-MM-DD}: Plano criado via /plan-feature
```

(A fase-03 assume que o STATE eh criado a partir do overview — usar este template se nao existir.)

### Passo 7: Verificacao cruzada

Ler os 3 SKILL.md ja modificados (fases 01, 02, 03) e confirmar que as referencias a templates casam com os caminhos atualizados aqui:
- `write-prd/SKILL.md` Step 3 carrega `prd-template.md` — ok, caminho do plugin nao muda
- `plan-feature/SKILL.md` Step 6 carrega `plan-overview-template.md` — ok
- `plan-feature/SKILL.md` Step 9 carrega `plan-readme-template.md`, `fase-template.md`, `memory-template.md` — ok

Se algum SKILL.md tem exemplo hardcoded de campo (ex: "use `**PRD:** .planning/PRD-{feature}.md`"), atualizar para `./PRD.md`.

---

## Gotchas

- **G9 do plano (templates versionados):** Templates sao arquivos do plugin — estrategia `replace` no `/anti-vibe-coding:update`. Isso significa que ao atualizar o plugin em projetos ja instalados, estes templates SOBRESCREVEM qualquer customizacao local. Garantir que a mudanca de path relativo seja retrocompativel (caminho relativo funciona para TODA pasta datada sem excecao).
- **G1/G2 do plano:** Se alguem revisar os templates, nao re-introduzir prefixos (`PRD-{slug}.md`) nem paths absolutos. O REVIEWER DEVE BATER NISSO.
- **Local:** Frontmatter YAML no PRD template precisa ser SINTATICAMENTE VALIDO — espacos, aspas, etc. `requires:` comentado com `#` nao quebra parse YAML.
- **Local:** Caminhos relativos (`./PRD.md`, `../PLAN.md`) assumem que o leitor esta dentro da pasta datada. Se alguem copiar um desses arquivos para FORA da pasta, as referencias quebram. Trade-off aceito: pasta eh a unidade de trabalho, nao deve ser fragmentada.
- **Local:** `requires:` no frontmatter NAO tem logica alguma ainda — apenas CAMPO. Plano 04 fase-01 implementa o aviso nao-bloqueante. Adicionar como comentario no template deixa claro ao dev que o campo eh opcional e futuro.
- **Local:** O campo `date` no frontmatter pode ficar dessincronizado com o nome da pasta se o dev editar manualmente. Tratar como informacional, nao fonte de verdade (fonte de verdade = nome da pasta).

---

## Verificacao

### Dogfooding manual

- [ ] **Setup:** Garantir fases 01, 02, 03 aplicadas.
- [ ] **GREEN:** Aplicar mudancas nos 5 templates conforme Passos 1-6.
- [ ] **VERIFY 1 (fluxo limpo):** Rodar `/write-prd "teste-templates"`. Confirmar:
  - `PRD.md` gerado contem frontmatter YAML valido no topo
  - Campo `**Context:**` aponta para `./CONTEXT.md`
  - Se nao houve CONTEXT do grill-me, o campo pode aparecer ou ser omitido — sem referencia quebrada
- [ ] **VERIFY 2 (com CONTEXT):** Rodar `/grill-me "teste-templates-ctx"` + `/write-prd`. Confirmar:
  - PRD.md com frontmatter + `**Context:** ./CONTEXT.md`
  - Apos fase-04, `CONTEXT.md` de fato vive ao lado do PRD.md; o link relativo funciona
- [ ] **VERIFY 3 (plan-feature):** Apos PRD criado, rodar `/plan-feature`. Confirmar:
  - `PLAN.md` gerado contem `**PRD:** ./PRD.md`
  - `plano01/README.md` contem `**Feature:** ... ([PLAN overview](../PLAN.md))`
  - Clicar no link `../PLAN.md` num editor markdown abre o PLAN.md correto
- [ ] **VERIFY 4 (parse do frontmatter):** Abrir `PRD.md` em qualquer parser YAML (ou `grep -A2 '^---$'`). Confirmar que frontmatter eh valido e campo `requires:` aparece comentado.
- [ ] **Cleanup:** Deletar pastas de teste.

### Checklist

- [ ] `prd-template.md` tem frontmatter YAML com `slug`, `date`, `status`, `requires:` comentado
- [ ] `prd-template.md` campo `**Context:**` aponta para `./CONTEXT.md`
- [ ] `plan-overview-template.md` tem `**PRD:** ./PRD.md`
- [ ] `plan-readme-template.md` referencia `../PLAN.md` como link markdown valido
- [ ] `fase-template.md` revisado, sem paths absolutos legados
- [ ] `memory-template.md` revisado, sem mudanca necessaria
- [ ] `state-template.md` criado ou atualizado com `**Plan:** ./PLAN.md`
- [ ] SKILL.md das 3 skills nao tem mais references hardcoded a `.planning/PRD-*.md` / `PLAN-*.md` / `STATE-*.md` absolutos (contra-checagem com as fases 01-03)
- [ ] Geracao de PRD+PLAN+plano01 em pasta de teste produz links relativos funcionais

---

## Criterio de Aceite

**Por maquina / filesystem:**
- Apos rodar fluxo completo `/write-prd → /plan-feature` em pasta nova:
  - `grep '^---$' .planning/YYYY-MM-DD-x/PRD.md | wc -l` retorna `2` (abertura e fechamento do frontmatter)
  - `grep 'requires:' .planning/YYYY-MM-DD-x/PRD.md` retorna linha comentada `# requires: []` (ou similar)
  - `grep '^\*\*PRD:\*\*' .planning/YYYY-MM-DD-x/PLAN.md` retorna `**PRD:** ./PRD.md`
  - `grep 'PLAN overview' .planning/YYYY-MM-DD-x/plano01/README.md` retorna linha com `../PLAN.md`
- Nenhum dos templates contem mais strings `.planning/PRD-` ou `.planning/PLAN-` (paths absolutos legados).

**Por humano:**
- Dev abre `plano01/README.md` num editor markdown e consegue navegar ate `PLAN.md` via link relativo.
- Frontmatter do PRD eh legivel e campo `requires:` eh DOCUMENTADO como opcional/futuro.
- Templates internamente coerentes com o fluxo real das 3 skills pos-refactor.

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
