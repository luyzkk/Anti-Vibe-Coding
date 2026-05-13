<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): EN default — alinhado com D2 do PRD v6.0.0`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Templates Base (AGENTS.md + ARCHITECTURE.md em ingles)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Templates minimos AGENTS.md e ARCHITECTURE.md em ingles (D2), prontos para serem copiados pelo `/init` na fase-02. AGENTS.md fica em ≤32 linhas (margem para CA-27 que exige ≤40).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/AGENTS.md.tpl` | Create | Template AGENTS.md em EN, ≤32 linhas, com placeholders `{{PROJECT_NAME}}` e `{{STACK}}` |
| `anti-vibe-coding/skills/init/assets/templates/ARCHITECTURE.md.tpl` | Create | Template ARCHITECTURE.md em EN com secoes: Overview, Stack, Folder Layout, Conventions |
| `anti-vibe-coding/skills/init/assets/templates/README.md` | Create | Index dos templates (o que cada um cobre, quando o `/init` usa) |

---

## Implementacao

### Passo 1: Criar AGENTS.md.tpl em ingles

Conteudo alvo (28-32 linhas, deixando margem para CA-27 que rejeita >40):

```markdown
# Agent Instructions

This file is the single source of truth for working in this repository.
Read it fully before any non-trivial change.

## Working philosophy

- The human is the navigator. The agent is the pilot.
- Discipline beats speed. Tests come before production code.
- Never invent context. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

## Required reading before changes

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack, folders, conventions
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) — current quality bar
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) — product north star

## Before reporting completion

Run the Compound Decision Gate: did this work teach the repo something
durable? If yes, capture in `docs/compound/`. If no, log why in the
exec-plan's "Lessons Captured" section.

## Standards

- Use `bun`, not `npm`.
- TypeScript strict. No `any`. Type guards over `as`.
- Tests first. `bun run test && bun run lint` before any commit.

## Project context

- Name: {{PROJECT_NAME}}
- Stack: {{STACK}}
```

Observacoes:
- Linhas em branco contam (G2 — D2): manter contagem com `wc -l` ou equivalente em bun.
- Placeholders `{{PROJECT_NAME}}` e `{{STACK}}` sao substituidos no `/init` (fase-02). Mantemos sintaxe `{{X}}` simples — sem dependencia de template engine.
- Links **devem** apontar para `./ARCHITECTURE.md`, `./docs/QUALITY_SCORE.md` e `./docs/PRODUCT_SENSE.md` — sao validados pelo `harness-validate.ts` original (linhas 46-54 do .mjs do Andre). Mesmo no tracer bullet, manter os 3 links para nao falsear o tracer.

### Passo 2: Criar ARCHITECTURE.md.tpl em ingles

```markdown
# Architecture

## Overview

{{PROJECT_NAME}} — {{ONE_LINE_DESCRIPTION}}

## Stack

- Runtime: {{RUNTIME}}
- Framework: {{FRAMEWORK}}
- Database: {{DATABASE}}

## Folder layout

```
{{PROJECT_NAME}}/
├── AGENTS.md           # source of truth for agents
├── CLAUDE.md           # symlink/hardlink/copy of AGENTS.md
├── ARCHITECTURE.md     # this file
├── docs/
│   ├── PLANS.md
│   ├── QUALITY_SCORE.md
│   ├── PRODUCT_SENSE.md
│   ├── exec-plans/
│   ├── compound/
│   └── design-docs/
└── scripts/
    └── harness-validate.ts
```

## Conventions

- File naming: kebab-case
- TS strict mode, no `any`
- Tests collocated with source: `foo.ts` + `foo.test.ts`
```

Observacoes:
- Placeholders adicionais (`{{ONE_LINE_DESCRIPTION}}`, `{{RUNTIME}}`, `{{FRAMEWORK}}`, `{{DATABASE}}`) sao opcionais no tracer — `/init` da fase-02 pode preencher com defaults (`"TBD"`) e o Plano 02 fase-03 faz customizacao real.
- O bloco "Folder layout" eh ASCII art puro — nao tentamos validar links aqui (eh codigo fenced, nao link markdown).

### Passo 3: Criar templates/README.md (index)

```markdown
# Templates

Used by `/init` to scaffold a new project (or to fill the harness shell).

| File | Used by | Purpose |
|------|---------|---------|
| `AGENTS.md.tpl` | fase-02 of plano01 | Source of truth for agents. Symlinked as CLAUDE.md by fase-03. |
| `ARCHITECTURE.md.tpl` | fase-02 of plano01 | Stack + folder layout. Customized by Plano 02 fase-03. |

Placeholders use double-brace syntax: `{{PROJECT_NAME}}`, `{{STACK}}`, etc.
`/init` performs straight string replacement — no template engine.
```

---

## Gotchas

- **G2 do plano (D2 EN):** Linhas em branco contam para o limite de 40. Use `wc -l` (ou equivalente bun) para validar **antes de commitar**. Template alvo: 28-32 linhas, deixando 8-12 de margem para customizacao em planos seguintes.
- **G4 do plano (cross-platform):** Os templates referenciam paths com `./` e `/` em links markdown — eh padrao markdown e funciona em todos OS. Nao traduzir para `\` no Windows.
- **Local — placeholder collision:** `{{X}}` eh sintaxe simples mas pode colidir com codigo handlebars em projetos futuros. Sentinel proposto: prefixo `__INIT__` (ex: `{{__INIT__PROJECT_NAME}}`). Decisao adiada para Plano 02 — neste plano fica `{{PROJECT_NAME}}` mesmo (zero risco em fixture vazia).

---

## Verificacao

### TDD

Esta fase eh "estrutural" (cria arquivos texto) — TDD via assertion direta no conteudo:

- [ ] **RED:** Teste que abre `templates/AGENTS.md.tpl` e conta linhas, espera ≤40. Sem arquivo → fail por `ENOENT`.
  - Comando: `bun run test -- --grep 'AGENTS template line count'`
  - Resultado esperado: `ENOENT: no such file or directory`

- [ ] **GREEN:** Arquivo criado com 28-32 linhas, teste PASSA.
  - Comando: `bun run test -- --grep 'AGENTS template line count'`
  - Resultado esperado: `1 passed, 0 failed`

### Checklist

- [ ] `anti-vibe-coding/skills/init/assets/templates/AGENTS.md.tpl` existe e tem ≤32 linhas (contadas via `bun -e "console.log(require('fs').readFileSync('AGENTS.md.tpl','utf8').split('\n').length)"`)
- [ ] AGENTS.md.tpl contem os 3 links exigidos pelo validator original do Andre: `[ARCHITECTURE.md](./ARCHITECTURE.md)`, `[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)`, `[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)`
- [ ] AGENTS.md.tpl esta 100% em ingles — `grep -P '[ãâáàçéêíóôõú]' AGENTS.md.tpl` retorna vazio (sem caracteres acentuados de PT)
- [ ] `ARCHITECTURE.md.tpl` existe e comeca com `# ` (H1) — exigido pelo validator (linha 67-69 do .mjs original)
- [ ] Placeholders `{{PROJECT_NAME}}` e `{{STACK}}` aparecem em AGENTS.md.tpl (validado por grep)
- [ ] `templates/README.md` lista ambos os arquivos
- [ ] Lint limpo: `bun run lint` (templates .tpl podem precisar de exclusao no linter — registrar em `.eslintignore`)

---

## Criterio de Aceite

**Por maquina:**
- `bun run scripts/check-template-line-count.ts` retorna exit 0 com mensagem `"AGENTS template within limit: 32/40"`
- `grep -c '\[ARCHITECTURE.md\](\./ARCHITECTURE.md)' anti-vibe-coding/skills/init/assets/templates/AGENTS.md.tpl` retorna `1`
- Nenhum caractere PT (acentos) detectado nos `.tpl`: `! grep -P '[ãâáàçéêíóôõú]' AGENTS.md.tpl ARCHITECTURE.md.tpl`

**Por humano:**
- Reler AGENTS.md.tpl como se fosse um agente novo lendo o projeto: o texto deve parecer ter sido escrito por um dev humano experiente em ingles, sem traducoes literais ou frases robotizadas.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
