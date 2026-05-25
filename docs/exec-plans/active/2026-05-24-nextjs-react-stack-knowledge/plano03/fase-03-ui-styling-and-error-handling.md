<!--
Princípio universal #5 — Comment Provenance.
Esta fase NAO toca codigo .ts (apenas markdown). Provenance comment nao se aplica em frontmatter.
-->

# Fase 03: UI & Styling + Error handling & observability (2 atoms T2)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** M (~2h — 2 extracoes paralelas via subagente)
**Depende de:** Nenhuma (independente dentro do Plano 03)
**Visual:** false

---

## O que esta fase entrega

2 atoms T2 em `knowledge/nextjs/atoms/`: `ui-and-styling.md` (Tailwind config no App Router, next/font, next/image, shadcn/ui patterns, CSS Modules vs Tailwind tradeoffs) + `error-handling-observability.md` (`error.tsx` boundaries, `global-error.tsx`, `not-found.tsx`, OTel integration com `@vercel/otel`, Sentry para Next 14+). Ambos em EN, <=200 linhas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/ui-and-styling.md` | Create | Atom T2 EN, ≤200 linhas |
| `knowledge/nextjs/atoms/error-handling-observability.md` | Create | Atom T2 EN, ≤200 linhas |

---

## Implementacao

### Passo 1: Identificar sources para cada atom

**ui-and-styling.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (styling section)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md` (next/image, next/font usage)
- `Infos/knowledge/NextJS/compass_artifact_wf-*ui*.md` ou `*styling*.md` (busca local)

**error-handling-observability.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md` (error.tsx boundaries)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (observability section)
- `Infos/knowledge/NextJS/compass_artifact_wf-*observability*.md` ou `*error*.md` (busca local)

Liste paths exatos antes de lancar (audit trail). Remover sources ausentes.

### Passo 2: Lancar 2 extratores em paralelo

Prompt de cada subagente extrator inclui:
1. Bloco "REGRA DE FIDELIDADE" VERBATIM da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (G1)
2. Path do source
3. Frontmatter alvo (Passo 3)
4. Instrucao: markdown EN + 4 secoes + hard cap 200 + use ONLY source

### Passo 3: Frontmatter alvo (template)

**ui-and-styling.md:**

```yaml
---
topic: ui-and-styling
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - skill: nextjs-app-router-patterns V2 (Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 2
triggers: [Tailwind, next/font, next/image, shadcn, CSS Modules, dark mode, responsive, layout shift, CLS]
related_skills: []
updated: 2026-05-24
---
```

(Note: `related_skills: []` — UI/styling nao mapeia diretamente em /security, /react-patterns, /api-design, /system-design por D7 do PRD. Aparece apenas em "By Tier" no INDEX final.)

**error-handling-observability.md:**

```yaml
---
topic: error-handling-observability
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-app-router-patterns V2 (Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 2
triggers: [error.tsx, global-error.tsx, not-found.tsx, ErrorBoundary, OpenTelemetry, OTel, Sentry, @vercel/otel, logging]
related_skills: [/system-design]
updated: 2026-05-24
---
```

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
- **G5 do plano (next_versions NAO):** ambos cobrem Next 14+ universal. `error.tsx` existe desde Next 13.4; OTel `@vercel/otel` desde Next 14.
- **G7 do plano (Infos/ paths):** audit trail textual.
- **Local (sobreposicao com Node-TS):** `error-handling-observability.md` existe em Node-TS (`error-handling-observability.md`). Atom Next NAO referencia (R2-C — standalone). Conteudo Next-specific: `error.tsx` per-route boundaries (vs React Error Boundary HOC), `global-error.tsx` substitui root layout em erro fatal, integracao OTel via `instrumentation.ts` (entry point Next-specific). Excluir conteudo Node generico (Pino, structured logs sem `instrumentation.ts`).
- **Local (ui-and-styling NAO inclui design system completo):** atom cobre Tailwind/next/font/next/image/shadcn como padroes — NAO uma walkthrough de criar design system. Hard cap 200 linhas forca foco em decisao + anti-pattern. Bibliotecas especificas (Radix, MUI, Chakra) entram apenas como exemplos quando o source as cita.

---

## Verificacao

### TDD

Content-only. Validacao por self-check + verifier batch fase-07.

### Checklist

- [ ] Ambos os atoms criados em `knowledge/nextjs/atoms/`
- [ ] Cada atom <=200 linhas
- [ ] 4 secoes obrigatorias em cada atom
- [ ] `sources:` aponta para paths reais em `Infos/knowledge/NextJS/...`
- [ ] Frontmatter de ui-and-styling.md tem `related_skills: []` (sem skill cross-stack direta — D7)
- [ ] Frontmatter de error-handling-observability.md tem `related_skills: [/system-design]` (entra em ## By Cross-Stack Skill -> ### For /system-design no INDEX final fase-06)
- [ ] `bun run harness:validate` aceita os 2 novos atoms
- [ ] `bun run compound:check` passa

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/ui-and-styling.md` retorna `≤200`
- `wc -l knowledge/nextjs/atoms/error-handling-observability.md` retorna `≤200`
- `bun run harness:validate` retorna `valid`

**Por humano (verifier batch fase-07):**
- Verifier batch confirma >=80% rastreabilidade em Senior patterns + Anti-patterns + Decision criteria para ambos os atoms

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
