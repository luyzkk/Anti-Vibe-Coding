<!--
Princípio universal #5 — Comment Provenance.
Esta fase NAO toca codigo .ts (apenas markdown). Provenance comment nao se aplica em frontmatter — `updated:` cumpre a funcao.
-->

# Fase 02: Performance & Turbopack + Testing strategy (2 atoms T2)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** M (~2h — 2 extracoes paralelas via subagente)
**Depende de:** Nenhuma (independente dentro do Plano 03; depende apenas dos protocolos do Plano 01 fase-03)
**Visual:** false

---

## O que esta fase entrega

2 atoms T2 em `knowledge/nextjs/atoms/`: `performance-and-turbopack.md` (bundle, RSC payload, edge cold start, Turbopack vs Webpack, build profile) + `testing-strategy.md` (Playwright E2E, React Testing Library para client components, async server components testing, Vitest+swc). Ambos em EN, <=200 linhas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/performance-and-turbopack.md` | Create | Atom T2 EN, ≤200 linhas |
| `knowledge/nextjs/atoms/testing-strategy.md` | Create | Atom T2 EN, ≤200 linhas |

---

## Implementacao

### Passo 1: Identificar sources para cada atom

**performance-and-turbopack.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-turbopack/SKILL.md` (Turbopack fundamentals)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (performance checklist)
- `Infos/knowledge/NextJS/compass_artifact_wf-*performance*.md` (busca local)

**testing-strategy.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (testing section)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-expert/SKILL.md` (RSC test patterns)
- `Infos/knowledge/NextJS/compass_artifact_wf-*test*.md` ou `deep-research-report-test*.md` (busca local)

Liste paths exatos antes de lancar (audit trail). Remover sources ausentes.

### Passo 2: Lancar 2 extratores em paralelo

Prompt de cada subagente extrator inclui:
1. Bloco "REGRA DE FIDELIDADE" VERBATIM da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (G1 — anti-drift)
2. Path do source
3. Frontmatter alvo (Passo 3)
4. Instrucao: markdown EN + 4 secoes obrigatorias + hard cap 200 linhas + use ONLY informacao do source

### Passo 3: Frontmatter alvo (template)

**performance-and-turbopack.md:**

```yaml
---
topic: performance-and-turbopack
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-turbopack (Infos/knowledge/NextJS/agent-skills-main/nextjs-turbopack/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 2
triggers: [Turbopack, bundle size, RSC payload, edge cold start, code splitting, dynamic import, next/dynamic, profile build]
related_skills: [/system-design]
updated: 2026-05-24
---
```

**testing-strategy.md:**

```yaml
---
topic: testing-strategy
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - skill: nextjs-expert (Infos/knowledge/NextJS/agent-skills-main/nextjs-expert/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/deep-research-report-test-<id>.md)
tier: 2
triggers: [Playwright, React Testing Library, Vitest, async server component test, msw, RSC test, integration test]
related_skills: []
updated: 2026-05-24
---
```

(Note: `testing-strategy.md` `related_skills: []` porque nenhuma das 4 skills cross-stack do PRD D7 e diretamente testing; aparece em "By Tier" mas nao em "By Cross-Stack Skill". Confirmar em fase-06 mapping.)

### Passo 4: Self-check pelo extrator

- [ ] Atom <=200 linhas (`wc -l`)
- [ ] 4 secoes obrigatorias presentes
- [ ] `sources:` aponta para paths reais em Infos/knowledge/NextJS/...
- [ ] Idioma EN
- [ ] Nenhuma claim plausivel-mas-inventada

---

## Gotchas

- **G1 do plano (anti-drift VERBATIM):** prompt do extrator inclui bloco da compound lesson.
- **G2 do plano (hard cap 200 linhas):** re-roda com instrucao de cortar se ultrapassar.
- **G3 do plano (idioma EN):** body completo em EN.
- **G5 do plano (next_versions NAO):** atoms cobrem Next 14+ universal. Turbopack e Vercel-deploy-agnostic; testing patterns idem. Se mencionar "Turbopack default in Next 15", marcar inline com `<!-- next_versions: >=15 -->` na claim especifica, NAO no frontmatter inteiro.
- **G7 do plano (Infos/ paths):** audit trail textual.
- **Local (sobreposicao com Node-TS):** `testing-strategy.md` existe em Node-TS (`testing-stack-specific.md`). Atom Next NAO referencia (R2-C — standalone). Conteudo Next-specific: async server components testing (Vitest com swc), Playwright E2E em Next App Router, msw para mock de fetch RSC. Excluir conteudo generico (Jest/Mocha basics).
- **Local (performance NAO inclui PPR):** PPR e parte de `rendering-strategies.md` (Plano 02 fase-05), nao de performance. Se source mencionar PPR de raspao, citar com link para `./rendering-strategies.md` (cross-link interno). Tradicional cache strategies de fetch ja sao em data-fetching-and-cache (Plano 02 fase-04) — performance foca em build/bundle/runtime profiling.

---

## Verificacao

### TDD

Content-only. Validacao por self-check + verifier batch fase-07.

### Checklist

- [ ] Ambos os atoms criados em `knowledge/nextjs/atoms/`
- [ ] Cada atom <=200 linhas
- [ ] 4 secoes obrigatorias em cada atom (`grep -E '^##\s+(When to consult|Senior patterns|Anti-patterns|Decision criteria)' knowledge/nextjs/atoms/performance-and-turbopack.md` retorna 4)
- [ ] `sources:` aponta para paths reais em `Infos/knowledge/NextJS/...`
- [ ] Frontmatter de testing-strategy.md tem `related_skills: []` (atom T2 cross-cutting sem skill cross-stack direta — aparecera apenas em "By Tier" no INDEX final)
- [ ] `bun run harness:validate` aceita os 2 novos atoms
- [ ] `bun run compound:check` passa

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/performance-and-turbopack.md` retorna `≤200`
- `wc -l knowledge/nextjs/atoms/testing-strategy.md` retorna `≤200`
- `bun run harness:validate` retorna `valid`

**Por humano (verifier batch fase-07):**
- Verifier batch confirma >=80% rastreabilidade em Senior patterns + Anti-patterns + Decision criteria para ambos os atoms

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
