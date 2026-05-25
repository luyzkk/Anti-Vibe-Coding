<!--
Princípio universal #5 — Comment Provenance.
Esta fase cria o piloto `knowledge/nextjs/atoms/app-router-and-layouts.md` via subagente
extrator + subagente verifier. O ATOM em si não tem comments inline (markdown puro). Mas o
prompt do extrator e do verifier DEVEM conter os blocos verbatim das compound lessons,
estabelecendo o protocolo de regression para todos os atoms subsequentes (Plano 02/03).

Esta fase ESTABELECE o protocolo. Anti-drift clause + verifier refined são REGRESSION desde aqui.
-->

# Fase 03: Atom piloto `app-router-and-layouts.md` (T1) + anti-drift regression desde aqui

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 3h
**Depende de:** fase-01 (`knowledge/nextjs/atoms/` existe — `.gitkeep` opcional pode ser removido após este atom existir)
**Visual:** false

---

## O que esta fase entrega

`knowledge/nextjs/atoms/app-router-and-layouts.md` — primeiro atom T1 destilado em EN seguindo padrão Rails/Node-TS (frontmatter completo, 4 seções obrigatórias, ≤200 linhas hard cap). **Anti-drift clause OBRIGATÓRIA no prompt do subagente extrator** (regression desde aqui, R3-A). **Verifier refined protocol OBRIGATÓRIO no prompt do subagente verifier** (audita APENAS Senior patterns + Anti-patterns + Decision criteria, meta ≥80% claims rastreáveis a `sources:`). Edge case R5 (monorepo Next+Vite) documentado em seção dedicada do atom. Estabelece o protocolo de qualidade reusado em Plano 02/03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/app-router-and-layouts.md` | Create | Piloto T1 em EN, frontmatter completo, ≤200 linhas, 4 seções obrigatórias + seção dedicada para R5 edge case |
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/verifier-report-fase03.md` | Create | Markdown report do verifier refined com tabela de claims auditadas + taxa de rastreabilidade (meta ≥80%) |
| `knowledge/nextjs/atoms/.gitkeep` | Optional Remove | `.gitkeep` da fase-01 pode ser removido (atom existe) — opcional, manter por consistência também aceito |

---

## Implementacao

### Passo 1: identificar fontes para o piloto

Listar fontes em `Infos/knowledge/NextJS/` que cobrem App Router fundamentos:

```bash
ls Infos/knowledge/NextJS/ | grep -E "(compass_artifact|deep-research|app-router)"
ls Infos/knowledge/NextJS/agent-skills-main/ | grep -i "app-router"
```

Resultado esperado:
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V1/SKILL.md` — fonte primária (skill V2 mais recente de App Router)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md` — fonte primária (versão mais nova ou complementar)
- 2-3 compass_artifact files que cobrem App Router (subagente identifica via `head -30 compass_artifact_wf-*.md`)

Subagente extrator deve listar e escolher fontes primárias + complementares. Se nenhum compass cobre, fonte primária é APENAS as duas skill packages.

### Passo 2: invocar subagente extrator com prompt anti-drift VERBATIM

Invocar subagente via Task tool (executar plan-executor ou equivalente). **Prompt OBRIGATÓRIO contém os blocos abaixo verbatim — não parafrasear, não resumir, não simplificar:**

```text
TAREFA: extrair piloto T1 `app-router-and-layouts.md` para Plano01 fase-03 da feature
Next.js + React Stack Knowledge (PRD: docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/PRD.md).

ESCOPO DO ATOM (D5 do PRD — feature-driven, App Router fundamentals):
- Topic: app-router-and-layouts
- Stack: nextjs (matrix compartilhada com `react` via D6)
- Layer: both (server + client patterns covered)
- Tier: 1 (T1 — todo dev Next/React precisa conhecer)
- Coverage: App Router fundamentals (Next 13+/14/15), layouts, route handlers, dynamic routes,
  parallel routes, intercepting routes, loading.tsx, error.tsx interplay (high-level — atom
  dedicated to react-suspense-patterns/error-handling vai detalhar)

IDIOMA: ENGLISH (D15 do PRD — atoms em knowledge/nextjs/ nascem em EN; rails/nodejs-typescript
permanecem PT-BR; trade-off documentado em preambulo do INDEX.md).

FONTES (ler ANTES de escrever — NAO escrever de memoria):
- Skill packages canonicas: Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns/SKILL.md
  E Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md
- Compass artifacts complementares (escolher 1-2 que cobrem app-router/layouts/routes):
  - Infos/knowledge/NextJS/compass_artifact_wf-*.md (listar e selecionar via head -30)
- Outros: nenhum (este atom é App Router fundamentos, não cobre RSC details nem server actions
  — esses sao atoms separados no Plano 02 fase-01 e 02)

FRONTMATTER OBRIGATORIO (formato espelho Rails/Node-TS, adaptado para EN):
---
tier: 1
title: "App Router & Layouts"
cross_stack_skills: ["/api-design", "/react-patterns", "/system-design"]
triggers: ["app router", "layout", "route handler", "dynamic route", "parallel route", "intercepting route", "page.tsx", "layout.tsx"]
next_versions: ["13.x", "14.x", "15.x"]
sources:
  - "Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns/SKILL.md"
  - "Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md"
  - "Infos/knowledge/NextJS/compass_artifact_wf-<id>_text_markdown.md"  # subagente preenche com id real
last_reviewed: "2026-05-24"
---

SKELETON OBRIGATORIO DO CORPO (em EN, ≤200 linhas total incluindo frontmatter):

# App Router & Layouts

## When to consult

(3-5 bullets de cenarios — when does the agent read this atom?)

## Senior patterns

(3-7 patterns. Cada um:)
### Pattern: <name>
- **Problem:** ...
- **Pattern:** ... (com snippet TS curto: route.ts, page.tsx, layout.tsx)
- **When to use:** ...
- **When NOT to use:** ...

## Anti-patterns

(2-5 anti-padroes com correcao)
### Anti-pattern: <name>
- **Symptom:** ...
- **Why it's bad:** ...
- **Fix:** ...

## Decision criteria

(table "if X, then Y" cobrindo decisoes frequentes — App Router vs Pages Router,
layout vs template, route handlers vs server actions, dynamic vs static rendering)

## Edge cases

(seçao dedicada para R5 — monorepo Next+Vite. Documenta que `detectStack` em projeto
com `package.json#next` E `vite.config.ts` retorna `primary: 'nextjs'` E
`secondary: ['react']` — comportamento esperado, NAO bug. Telemetria captura ruido
antes de codar fix. Espelha texto da seção `## Riscos` R5 do PRD.)

================================================================================
REGRESSION ANTI-DRIFT (compound lesson 2026-05-16):
================================================================================

Voce NAO PODE inventar fatos que nao estao nas fontes listadas em `sources:`.
Toda claim em "Senior patterns" + "Anti-patterns" + "Decision criteria" deve ser
rastreavel a uma fonte. Se voce nao tem certeza, OMITA. E melhor um atom com 10
claims solidas do que 20 claims com 5 inventadas.
Linhas maximas: 200. Excedente vai para TODO.md (backlog).

> "REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou
> parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que
> voce saiba que e verdade. O verifier gate downstream marca como falha qualquer
> claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em
> duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source
> para confirmar."

Liberdade explicita: se source nao documenta um topico do skeleton (ex: source
nao fala de "intercepting routes"), descreva apenas o que esta no source. NAO
complete com "verdade conhecida na comunidade Next/React". Se source nao fornece
overhead quantitativo de uma feature, descreva qualitativamente (como a fonte faz).
NAO estime numeros proprios.

================================================================================
HARD CAPS (verifier rejeita se ultrapassa):
================================================================================
- Corpo do atom (incluindo frontmatter): ≤200 linhas
- Frontmatter: 7 campos listados acima, nessa ordem
- Zero placeholders [A DEFINIR], TODO, FIXME no corpo (TODO.md externo aceito)
- Cada claim tecnica em "Senior patterns", "Anti-patterns", "Decision criteria"
  deve ser rastreavel a uma passagem especifica das fontes em `sources:`
- Snippets TS devem ser curtos (≤10 linhas) e idiomaticos Next 14+

================================================================================
ENTREGAVEIS:
================================================================================
1. knowledge/nextjs/atoms/app-router-and-layouts.md (atom completo, em EN, ≤200 linhas)
2. Confirmacao em STATE.md de quais sources foram consumidos (lista de paths absolutos)
3. NAO criar verifier-report — isso e Passo 4 desta fase, executado pelo subagente verifier
```

### Passo 3: contar linhas e validar frontmatter

```bash
wc -l knowledge/nextjs/atoms/app-router-and-layouts.md
```

Resultado esperado: ≤200. Se >200, NÃO prosseguir para verifier — re-rodar extrator com instrução de cortar (priorizar Senior patterns + Anti-patterns + Decision criteria; encolher When to consult + Edge cases).

Se >200 mas <215 e o excesso é evidentemente um padrão muito valioso, considerar mover esse padrão específico para `TODO.md` no diretório do plano (`docs/exec-plans/active/.../plano01/TODO.md`) e re-rodar extrator com a parte removida. Não inflar atom — hard cap é absoluto (R3-C).

Validar frontmatter com `harness:validate`:

```bash
bun run harness:validate
```

Resultado esperado: `valid`. Se rejeitar, abrir arquivo e ver erro — provavelmente `cross_stack_skills` ou `next_versions` em formato errado. Frontmatter `next_versions` é opcional mas padrão (igual `rails_versions`).

### Passo 4: invocar subagente verifier com protocolo refined VERBATIM

Invocar subagente via Task tool. **Prompt OBRIGATÓRIO contém os blocos abaixo verbatim:**

```text
TAREFA: validar fidelidade ao source do piloto `app-router-and-layouts.md`
(Plano01 fase-03, feature Next.js + React Stack Knowledge).

ARQUIVO A AUDITAR:
knowledge/nextjs/atoms/app-router-and-layouts.md

FONTES DE GROUND TRUTH (declaradas no frontmatter `sources:` do atom):
{listar paths absolutos das fontes — copiar do frontmatter do atom}

================================================================================
VERIFIER REFINED PROTOCOL (compound lesson 2026-05-16):
================================================================================

Audit APENAS tres secoes tecnicas: "Senior patterns" + "Anti-patterns" + "Decision criteria".
Para cada claim, marque: RASTREAVEL (link para source) ou INFUNDADA (sem source).
Meta: ≥80% rastreaveis. Abaixo disso = REJECTED, voltar ao extrator.

> "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in:
> Senior patterns, Anti-patterns, Decision criteria.
>
> ATOM-STRUCTURAL METADATA lives in: When to consult (use-case framing) and
> Edge cases (cross-skill linking / known telemetry behaviors) — DO NOT evaluate
> these sections for source traceability."

INSTRUCOES OPERACIONAIS:

1. Ler o atom INTEIRO.
2. Identificar as 3 secoes tecnicas: `## Senior patterns`, `## Anti-patterns`, `## Decision criteria`.
3. Extrair de cada uma TODAS as claims tecnicas concretas (nomes de APIs Next/React,
   versoes, libs especificas, regras "use X when Y", snippets TS).
4. Para CADA claim, abrir as fontes em `sources:` e procurar passagem que suporte
   literalmente ou parafraseavelmente o claim.
5. Marcar cada claim como:
   - RASTREAVEL (cita passagem da fonte com linha aproximada)
   - INFUNDADA (claim factualmente plausivel mas ausente da fonte)
6. NAO auditar `## When to consult` nem `## Edge cases` — sao editorial scaffolding
   (use-case framing + known behaviors documented from PRD section, not from sources).

ENTREGAVEIS:

Markdown report salvo em `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/verifier-report-fase03.md`
com formato:

# Verifier Report — app-router-and-layouts.md

**Date:** 2026-05-24
**Protocol:** refined (only Senior patterns + Anti-patterns + Decision criteria audited)

## Claims auditadas

| # | Section | Claim | Status | Source | Passage |
|---|---|---|---|---|---|
| 1 | Senior patterns | "Server Components are the default in App Router" | RASTREAVEL | nextjs-app-router-patterns V2/SKILL.md line ~34 | "By default, all components in app/ are Server Components..." |
| 2 | Anti-patterns | "useEffect in page.tsx for data fetching" | RASTREAVEL | nextjs-app-router-patterns/SKILL.md line ~78 | "Avoid useEffect for initial data; use async server components" |
| 3 | Decision criteria | "Use route handlers when you need REST endpoints" | INFUNDADA | — | claim plausivel mas nao aparece nas sources |
| ... | ... | ... | ... | ... | ... |

## Summary

- Total de claims auditadas: N
- Rastreaveis: M
- Infundadas: K
- Taxa de fidelidade: M/N = X%
- Meta: ≥80%
- Status: APROVADO / REPROVADO

## Recommendations (if rejected)

- Claim #3: REMOVE or re-extract based on alternative source
- ...

================================================================================
GATE DE BLOQUEIO:
================================================================================
Se taxa < 80%, REPROVAR — fase-03 nao avanca para Plano 01 fase-04 ate piloto ser
corrigido em rework cirurgico (re-invocar extrator com claims especificas que falharam,
NAO re-extrair do zero).
Se ≥80%, APROVAR e produzir relatorio para STATE.md.
```

Verifier entrega report. Salvar em `STATE.md` da feature (ver Passo 6).

Se REPROVADO: **PARAR fase-03**, re-invocar extrator com instrução cirúrgica:
> "O verifier marcou os seguintes claims como INFUNDADOS — remover do atom OU re-extrair de source alternativa. Lista: claim 3, claim 7, claim 9."

Não re-extrair do zero — apenas cirurgia nos claims marcados.

### Passo 5: validar checksum final

```bash
# 1. Linhas ≤200
wc -l knowledge/nextjs/atoms/app-router-and-layouts.md  # esperado: ≤200

# 2. 4 seções obrigatórias (mais Edge cases = 5 total) — grep ## headers
grep -c "^## " knowledge/nextjs/atoms/app-router-and-layouts.md  # esperado: 5 (When to consult, Senior patterns, Anti-patterns, Decision criteria, Edge cases)

# 3. Frontmatter completo
head -15 knowledge/nextjs/atoms/app-router-and-layouts.md  # confirmar 7 campos

# 4. Zero placeholders
grep -E "\[A DEFINIR\]|TODO|FIXME" knowledge/nextjs/atoms/app-router-and-layouts.md  # esperado: vazio

# 5. Harness valida
bun run harness:validate  # esperado: valid
```

Todos verdes? Prosseguir. Algum falha? Investigar e corrigir antes de commitar.

### Passo 6: registrar fontes consumidas em STATE.md

Adicionar bloco no `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md`:

```markdown
## Plano 01 fase-03 — piloto app-router-and-layouts.md extraído (2026-05-24)

- **Atom:** `knowledge/nextjs/atoms/app-router-and-layouts.md`
- **Lines:** N (≤200 confirmed)
- **Sources consumed:**
  - `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns/SKILL.md`
  - `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md`
  - `Infos/knowledge/NextJS/compass_artifact_wf-<id>_text_markdown.md`
- **Anti-drift clause applied in extractor prompt:** YES (verbatim from compound lesson 2026-05-16)
- **Verifier refined protocol applied:** YES (verbatim from compound lesson 2026-05-16)
- **Verifier report:** `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/verifier-report-fase03.md`
- **Traceability rate:** X% (meta ≥80%) — APROVADO
- **Next step:** fase-04 (detector atomic changes)
```

### Passo 7: commit fase-03

```bash
git add knowledge/nextjs/atoms/app-router-and-layouts.md
git add docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/verifier-report-fase03.md
git add docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md
git commit -m "$(cat <<'EOF'
docs(knowledge/nextjs/atoms): pilot atom app-router-and-layouts (T1, EN)

Primeiro atom Next.js destilado em EN seguindo padrão Rails/Node-TS.
Frontmatter completo (7 campos), 4 seções obrigatórias + edge cases
R5 (monorepo Next+Vite), ≤200 linhas hard cap.

Extrator subagente recebeu anti-drift clause OBRIGATÓRIA verbatim do
compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md.
Verifier subagente aplicou refined protocol verbatim do compound lesson
2026-05-16-verifier-protocol-technical-sections-only.md.

Taxa de rastreabilidade: X% (meta ≥80% — APROVADO).

Estabelece anti-drift + verifier refined como REGRESSION desde aqui — Plano 02/03
reusam os blocos verbatim em todos os prompts de extratores/verifiers.

Plano 01 fase-03. RF-01 (atom T1), R3-A (regression protocol), D15 (EN), D6 (matrix
compartilhada), R5 (edge case monorepo).
EOF
)"
```

---

## Gotchas

- **G1 do plano (anti-drift é REGRESSION desde aqui):** o prompt do extrator DEVE conter os blocos "REGRA DE FIDELIDADE" e "Liberdade explícita" colados verbatim. Não parafrasear, não resumir. Se subagente entrega atom com claims plausíveis mas não-rastreáveis, blocker em Passo 4 (verifier rejeita) — re-rodar com prompt reforçado. Esta fase ESTABELECE o protocolo — Plano 02/03 herdam.

- **G2 do plano (hard cap 200 linhas é absoluto, R3-C):** se subagente entrega 230 linhas, NÃO "aceitar com nota". Re-rodar com instrução de cortar. Verifier conta linhas e rejeita >200. Excedente vai para `TODO.md` futuro do plano.

- **G4 do plano (R5 edge case OBRIGATÓRIO em seção dedicada):** o atom deve ter `## Edge cases` documentando que `detectStack` em monorepo Next+Vite retorna `primary: 'nextjs'` E `secondary: ['react']` — comportamento esperado, não-bug. Texto espelha o R5 do PRD. Sem essa seção, dev de monorepo lê o atom e procura "fix" no plugin — ruído sem fundamento.

- **Local — `cross_stack_skills` no frontmatter deve referenciar skills REAIS:** `/api-design`, `/react-patterns`, `/system-design` existem em `skills/`. NÃO inventar `/app-router-patterns` ou similar. Lista verificada contra `ls skills/` antes de commitar.

- **Local — `next_versions` é opcional MAS recomendado neste piloto:** padrão `["13.x", "14.x", "15.x"]` cobre todo App Router. Quando atoms futuros cobrem features Next 15+ apenas (ex: PPR em rendering-strategies — Plano 02 fase-05), usar `[">=15"]` per D13.

- **Local — Snippets TS devem ser idiomáticos Next 14+:** preferir `async function Page()` (server component) sobre `function Page()`. `'use server'` em snippets de server actions (mas server actions é atom separado — Plano 02 fase-02; aqui apenas route handlers e layouts). Mostrar `app/page.tsx`, `app/layout.tsx`, `app/api/route.ts` como nomes canônicos.

- **Local — fase-03 estabelece o tom de TODOS os atoms subsequentes:** se este piloto sair raso/inflado/com claims fora do source, Plano 02/03 herdarão o problema. Investir tempo aqui — re-rodar até atom estar excelente. NÃO "aceitar com nota". Custo de re-extração é baixo (subagente) — custo de drift propagado é alto.

- **Local — `Infos/` está no .gitignore:** subagente extrator tem acesso local aos arquivos `Infos/knowledge/NextJS/agent-skills-main/...`. Os paths no frontmatter `sources:` são audit trail textual — não precisa do arquivo no repo para a referência funcionar. Verifier também tem acesso local. Devs externos vendo o atom no GitHub verão referências a arquivos não-commitados — isso é INTENCIONAL e CORRETO (feedback_git_repo_scope_2026-05-24).

---

## Verificacao

### TDD

Fase **content-only** (markdown puro + verifier subagente). Sem ciclo RED→GREEN clássico. Usar checklist + verifier report.

### Checklist

- [ ] `knowledge/nextjs/atoms/app-router-and-layouts.md` existe
- [ ] Frontmatter contém: `tier`, `title`, `cross_stack_skills`, `triggers`, `next_versions`, `sources`, `last_reviewed` (7 campos)
- [ ] `tier: 1`, `title: "App Router & Layouts"`
- [ ] `cross_stack_skills` contém apenas skills reais: `["/api-design", "/react-patterns", "/system-design"]`
- [ ] `next_versions: ["13.x", "14.x", "15.x"]` (cobre App Router 13+)
- [ ] `sources:` lista paths absolutos das 2 SKILL.md V2 + 1-2 compass artifacts
- [ ] `last_reviewed: "2026-05-24"`
- [ ] Body em EN (D15)
- [ ] 5 seções H2: `## When to consult`, `## Senior patterns`, `## Anti-patterns`, `## Decision criteria`, `## Edge cases`
- [ ] `## Edge cases` documenta R5 (monorepo Next+Vite — comportamento esperado)
- [ ] Zero placeholders `[A DEFINIR]`, `TODO`, `FIXME`
- [ ] `wc -l` reporta ≤200 linhas
- [ ] `bun run harness:validate` aceita
- [ ] `verifier-report-fase03.md` criado com taxa ≥80%
- [ ] STATE.md atualizado com bloco "Plano 01 fase-03 — piloto extraído"
- [ ] Prompt do extrator (em transcripts ou anexado ao STATE.md) confirmou anti-drift clause verbatim
- [ ] Prompt do verifier confirmou verifier refined protocol verbatim
- [ ] Lint limpo: `bun run lint`
- [ ] `bun test` global EXIT=0 (atom criado não deve afetar testes)

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/app-router-and-layouts.md` retorna ≤200
- `grep -c "^## " knowledge/nextjs/atoms/app-router-and-layouts.md` retorna 5 (5 seções H2 obrigatórias)
- `grep -E "^(tier|title|cross_stack_skills|triggers|next_versions|sources|last_reviewed):" knowledge/nextjs/atoms/app-router-and-layouts.md` retorna 7 linhas
- `grep -c "Edge cases" knowledge/nextjs/atoms/app-router-and-layouts.md` retorna ≥1 (R5 doc)
- `bun run harness:validate` retorna `valid`

**Por humano:**
- Conteúdo do piloto NÃO contém detalhes técnicos (números, libs, comandos) que não apareçam nas fontes listadas em `sources:` — humano faz spot-check de 2-3 claims rastreando para o source antes de aprovar
- Linguagem é assertiva ("Use server components as default"), não vaga ("Consider using server components")
- Snippets TS (se presentes) são idiomáticos Next 14+ (async/await, server components, `app/` directory)
- Verifier report mostra taxa ≥80% (idealmente >90% — o Rails wave atingiu ~100%)

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
