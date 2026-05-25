<!--
Princípio universal #5 — Comment Provenance.
Esta fase cria estrutura nova (knowledge/nextjs/). Os arquivos markdown criados não exigem
provenance inline (não é código TS). Apenas o INDEX.md ganha um HTML comment de linhagem
no topo, igual ao molde [knowledge/rails/INDEX.md](../../../../knowledge/rails/INDEX.md):
`<!-- 2026-05-24 (Luiz/dev): INDEX skeleton mínimo Plano01 fase-01. INDEX final consolidado em Plano03 fase-06. D15 + D16 -->`
-->

# Fase 01: Scaffold `knowledge/nextjs/` + INDEX skeleton EN

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 1h
**Depende de:** Nenhuma (paralela a fase-00 em teoria; sequencial na prática para clareza)
**Visual:** false

---

## O que esta fase entrega

Diretório `knowledge/nextjs/` criado com `INDEX.md` skeleton EN (D15, D16) + diretório `atoms/` vazio (será populado em fase-03 e nos Planos 02/03). Cabeçalho canônico `# Next.js + React Knowledge — Index` (D16) + preâmbulo documentando heterogeneidade de idioma EN/PT-BR (D15).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/INDEX.md` | Create | Skeleton EN com cabeçalho D16 + preâmbulo heterogeneidade D15 + sections placeholder (`## By Cross-Stack Skill` vazia, `## By Tier` listando atoms já planejados, `## By keyword` vazia — populadas em Plano 03 fase-06) |
| `knowledge/nextjs/atoms/.gitkeep` | Create | Garante que o diretório `atoms/` é trackeado pelo git antes da fase-03 popular o piloto |

---

## Implementacao

### Passo 1: criar `knowledge/nextjs/atoms/` com `.gitkeep`

```bash
mkdir -p knowledge/nextjs/atoms
touch knowledge/nextjs/atoms/.gitkeep
```

`.gitkeep` é convenção para garantir que diretórios vazios entram no repo. Quando fase-03 popular `app-router-and-layouts.md`, o `.gitkeep` pode ser removido (mas pode ficar — convenção). Manter por consistência.

### Passo 2: criar `knowledge/nextjs/INDEX.md` skeleton

Conteúdo exato (≤80 linhas — espelha INDEX.md Rails de molde mas com placeholders preenchidos ao longo dos Planos 02/03):

```markdown
<!-- 2026-05-24 (Luiz/dev): INDEX skeleton Plano01 fase-01. INDEX final consolidado em Plano03 fase-06 (layout completo: ## By Cross-Stack Skill + ## By Tier + ## By keyword com mappings das 4 skills). Alinhado com RF-01 + D15 + D16 do PRD. -->

# Next.js + React Knowledge — Index

Senior knowledge for Next.js (App Router 13+/14/15) and React conceptual patterns (hooks, Suspense, Server Components). 15 atoms covering app router, RSC, server actions, middleware, data fetching, rendering strategies, security, performance, testing, UI/styling, error handling, React hooks/state, Suspense, Supabase integration, and Pages Router migration. Cross-stack skills consume this INDEX via `getStackKnowledgePreface()` before the generic body.

> **Language note (D15 of PRD):** atoms in this matrix folder are written in **English**, aligned with official Next.js/React docs and the global ecosystem vocabulary (server components, suspense boundary, server actions). Other matrix folders — `knowledge/rails/` and `knowledge/nodejs-typescript/` — remain in PT-BR. Heterogeneity is a conscious trade-off; cross-stack skill prefaces emitted to a Next.js project will mix PT-BR (skill wrapper text) with EN (atom citations).
>
> **Shared matrix (D6 of PRD):** this folder serves both Next.js projects and pure React (Vite) projects. The detector maps StackId `'react'` to this same matrix via `STACK_ID_TO_MATRIX_FOLDER['react'] = 'nextjs'`. React-conceptual atoms (hooks, Suspense, RSC) are leveraged in both contexts; Next-specific atoms (app router, middleware, server actions) are also present but filtered by consultation, not download.

---

## By Cross-Stack Skill

<!-- Populated in Plano 03 fase-06 with mappings to /security, /react-patterns, /api-design, /system-design.
     Each subsection (### For /<skill>) lists atoms (≥2 per skill per CA-09). -->

### For /security

_To be populated after Plano 03 fase-01 (security-stack-specific atom)._

### For /react-patterns

_To be populated after Plano 02 fase-01 (react-server-components) + Plano 03 fase-01 (react-hooks-and-state) + fase-04 (react-suspense-patterns)._

### For /api-design

_To be populated after Plano 02 fases 01-04 (server-actions, app-router, data-fetching)._

### For /system-design

_To be populated after Plano 02 fase-04 (data-fetching), fase-05 (rendering-strategies with PPR), and Plano 03 fase-02 (performance-and-turbopack)._

---

## By Tier

<!-- Atoms listed as planned in PRD Section "Lista canônica de atoms (15)".
     Status column reflects which plan delivers each atom. -->

### Tier 1 — Every Next.js / senior React dev needs (7 atoms)

- `app-router-and-layouts` — App Router fundamentals, route handlers, layouts, dynamic/parallel/intercepting routes _(Plano 01 fase-03 — pilot)_
- `react-server-components` — server vs client boundaries, props serialization, useState/useEffect proibidos em RSC _(Plano 02 fase-01)_
- `server-actions-and-mutations` — `'use server'`, Zod validation, revalidatePath/Tag, progressive enhancement _(Plano 02 fase-02)_
- `middleware-and-edge` — runtime constraints, cookie handling, NextAuth/Clerk/Supabase auth _(Plano 02 fase-03)_
- `data-fetching-and-cache` — `fetch()` cache options, Next cache layers, revalidate, tags _(Plano 02 fase-04)_
- `security-stack-specific` — middleware auth, CSRF, RSC leaks, secret handling _(Plano 03 fase-01)_
- `react-hooks-and-state` — useState/useReducer/useFormState/useOptimistic _(Plano 03 fase-01)_

### Tier 2 — Common in mid-to-large apps (6 atoms)

- `rendering-strategies` — SSG/SSR/ISR + PPR (Next 15+ via `next_versions: ['>=15']` per D13) _(Plano 02 fase-05)_
- `performance-and-turbopack` — bundle, RSC payload, edge cold start _(Plano 03 fase-02)_
- `testing-strategy` — Playwright, RTL, RSC tests _(Plano 03 fase-02)_
- `ui-and-styling` — Tailwind, fonts, images, shadcn _(Plano 03 fase-03)_
- `error-handling-observability` — error.tsx boundaries, OTel integration _(Plano 03 fase-03)_
- `react-suspense-patterns` — Suspense boundaries, streaming, loading.tsx _(Plano 03 fase-04)_

### Tier 3 — Deep-dive / legacy (2 atoms)

- `supabase-integration` — RLS via SSR, server vs client clients, signed URLs _(Plano 03 fase-05)_
- `pages-router-migration-tips` — Pages → App Router migration _(Plano 02 fase-06)_

---

## By keyword

<!-- Populated in Plano 03 fase-06. Top-N keywords extracted from all atom triggers,
     consumed by formatKnowledgePreview() parser per RF-11. -->

_To be populated after all 15 atoms exist._

---

## Status

- Pilot atom: pending (Plano 01 fase-03)
- Detector adjustment: pending (Plano 01 fase-04)
- Tracer bullet E2E: pending (Plano 01 fase-05)
- Feature-driven atoms (6): pending (Plano 02)
- Cross-cutting + React + Integrations + INDEX final: pending (Plano 03)
```

### Passo 3: validar com `harness:validate`

```bash
bun run harness:validate
```

Resultado esperado: `valid` (sem erros de schema). O INDEX.md skeleton não contém atoms ainda — apenas estrutura. Validator pode reclamar de seções `## By Cross-Stack Skill` vazias — se reclamar, considerar adicionar 1 atom placeholder (mas ideal é validator aceitar INDEX em estado inicial).

Se validator rejeitar o estado vazio (improvável — fixture Rails iniciou similarmente), discutir com dev: opções são (a) adicionar bullet placeholder `_To be populated_` para satisfazer linter (já feito acima) OU (b) marcar INDEX como `draft: true` no frontmatter (se schema aceitar). Preferir (a).

### Passo 4: commit fase-01

```bash
git add knowledge/nextjs/
git commit -m "$(cat <<'EOF'
docs(knowledge/nextjs): scaffold matrix folder + INDEX skeleton EN

Cria knowledge/nextjs/INDEX.md (D16: cabeçalho explícito
"Next.js + React Knowledge — Index") + atoms/.gitkeep.
Preâmbulo documenta heterogeneidade EN/PT-BR entre matrix folders
(D15 — atoms knowledge/nextjs/ nascem em EN; rails/nodejs-typescript
permanecem PT-BR).

Sections "## By Cross-Stack Skill" e "## By keyword" ficam vazias até
Plano 03 fase-06. "## By Tier" lista os 15 atoms planejados com
ponteiros para os planos que entregam cada um.

Plano 01 fase-01. Resolve RF-01 (parcial — INDEX skeleton; atoms vêm
depois). Alinhado com D6 (matrix compartilhada com React via Vite),
D15 (EN), D16 (cabeçalho explícito).
EOF
)"
```

---

## Gotchas

- **Local — INDEX.md skeleton é PROVISÓRIO até Plano 03 fase-06:** as seções "## By Cross-Stack Skill" e "## By keyword" ficam intencionalmente vazias (com placeholder `_To be populated_`). Plano 03 fase-06 substitui pelo INDEX final consolidado com mappings das 4 skills. Não tentar preencher antecipadamente — atoms não existem ainda.

- **Local — Preâmbulo é OBRIGATÓRIO (D15 trade-off documentado):** o bloco "> Language note (D15 of PRD)" é a forma de tornar a heterogeneidade EN/PT-BR explícita para devs que abrem o INDEX. Esse bloco NÃO é decorativo — é documentação arquitetural da feature. Se vier corrupted/removed em alguma edição posterior, é regressão direta do D15 (resolução de R7 do PRD).

- **Local — Linhas estimadas: ≤80:** o skeleton tem ~75 linhas. Quando Plano 03 fase-06 expandir, o INDEX final fica ≤100 (Review Checklist do PLAN.md). Se em Plano 03 fase-06 o INDEX inflar >100, refatorar movendo conteúdo para seções dedicadas ou cortar redundância.

- **Local — `harness:validate` pode aceitar estado vazio mas `compound:check` é mais estrito:** rodar AMBOS para garantir. Se `compound:check` reclamar, ver se pode passar flag/temporary skip — não inflar INDEX só para passar gate; documentar como TODO.

- **Local — `.gitkeep` vs `README.md` em atoms/:** alguns repos usam `README.md` placeholder em vez de `.gitkeep`. Aqui usar `.gitkeep` (mais leve, não polui index com 2 markdowns). Fase-03 vai criar `app-router-and-layouts.md`, então `.gitkeep` perde a utilidade — pode ser removido em fase-03 (`git rm`) ou mantido (não custa nada). Preferência: manter `.gitkeep` mesmo após primeiro atom (consistência com convenção).

---

## Verificacao

### TDD

Fase **content-only** (scaffold de markdown puro). Sem ciclo RED→GREEN. Usar checklist + validator harness.

### Checklist

- [ ] Diretório `knowledge/nextjs/` existe
- [ ] Diretório `knowledge/nextjs/atoms/` existe
- [ ] `knowledge/nextjs/atoms/.gitkeep` existe
- [ ] `knowledge/nextjs/INDEX.md` existe
- [ ] Primeira linha de conteúdo (após HTML comment de provenance) é `# Next.js + React Knowledge — Index` (D16)
- [ ] Preâmbulo contém bloco "> Language note (D15 of PRD)" e "> Shared matrix (D6 of PRD)"
- [ ] Section `## By Cross-Stack Skill` existe com 4 subsections (`### For /security`, `### For /react-patterns`, `### For /api-design`, `### For /system-design`), cada uma com placeholder `_To be populated_`
- [ ] Section `## By Tier` lista os 15 atoms agrupados em T1 (7), T2 (6), T3 (2) com ponteiros para os planos
- [ ] Section `## By keyword` existe com placeholder
- [ ] Section `## Status` existe listando status atual dos 5 milestones
- [ ] `bun run harness:validate` retorna `valid` (zero erros)
- [ ] `bun run compound:check` passa
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `ls knowledge/nextjs/` retorna `INDEX.md atoms/`
- `head -1 knowledge/nextjs/INDEX.md` retorna `<!-- 2026-05-24 (Luiz/dev): INDEX skeleton Plano01 fase-01...`
- `grep -c "^# Next.js + React Knowledge — Index" knowledge/nextjs/INDEX.md` retorna 1
- `grep -c "^## " knowledge/nextjs/INDEX.md` retorna ≥4 (By Cross-Stack Skill, By Tier, By keyword, Status)
- `bun run harness:validate` retorna `valid`

**Por humano:**
- Cabeçalho do INDEX é exatamente `# Next.js + React Knowledge — Index` (não "Next.js Knowledge" sozinho — D16 explícito)
- Preâmbulo justifica heterogeneidade EN/PT-BR em frase clara que dev consegue digerir em 5 segundos
- Section `## By Tier` lista os 15 atoms com nomes-de-arquivo corretos (sem `.md`, em kebab-case) e ponteiros para planos

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
