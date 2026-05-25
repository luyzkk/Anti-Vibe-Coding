<!--
Princípio universal #5 — Comment Provenance.
Esta fase NAO toca codigo .ts (apenas markdown). Provenance comment nao se aplica em frontmatter.
-->

# Fase 04: React Suspense patterns (1 atom T2)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** S (~1.5h — 1 extracao via subagente)
**Depende de:** Nenhuma (independente dentro do Plano 03)
**Visual:** false

---

## O que esta fase entrega

1 atom T2 em `knowledge/nextjs/atoms/`: `react-suspense-patterns.md` (Suspense boundaries para streaming SSR, `loading.tsx` per-route como Suspense convention, error.tsx + suspense.tsx interplay, `use()` hook with promises, parallel data fetching pattern). EN, <=200 linhas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/react-suspense-patterns.md` | Create | Atom T2 EN, ≤200 linhas |

---

## Implementacao

### Passo 1: Identificar sources

**react-suspense-patterns.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md` (Suspense + loading.tsx)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (streaming patterns)
- `Infos/knowledge/NextJS/compass_artifact_wf-*react*.md` ou `*suspense*.md` (busca local)

Pode reusar sources de `react-hooks-and-state.md` (Plano 03 fase-01) se cobrirem Suspense. Confirmar antes de lancar.

### Passo 2: Lancar 1 extrator

Prompt do subagente extrator inclui:
1. Bloco "REGRA DE FIDELIDADE" VERBATIM da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (G1)
2. Path do source
3. Frontmatter alvo (Passo 3)
4. Instrucao: markdown EN + 4 secoes + hard cap 200 + use ONLY source

### Passo 3: Frontmatter alvo

```yaml
---
topic: react-suspense-patterns
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-app-router-patterns V2 (Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 2
triggers: [Suspense, suspense boundary, loading.tsx, streaming SSR, use() hook, React.lazy, parallel fetch, waterfall]
related_skills: [/react-patterns]
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
- **G2 do plano (hard cap 200 linhas):** Suspense pode inflar com exemplos — re-roda com instrucao de cortar se necessario.
- **G3 do plano (idioma EN):** body completo em EN.
- **G5 do plano (next_versions NAO):** Suspense + `loading.tsx` existem desde Next 13.4. `use()` hook estabilizou em React 19 (Next 15+). Se mencionar `use()`, marcar `<!-- next_versions: >=15 -->` na claim especifica, NAO no frontmatter inteiro.
- **G7 do plano (Infos/ paths):** audit trail textual.
- **Local (cross-link com RSC):** Suspense em RSC = streaming SSR. Atom referencia `./react-server-components.md` (Plano 02 fase-01) como cross-link para "When to consult" quando RSC + Suspense aparecem juntos (use case: streaming dashboards). Cross-link interno OK (mesma matrix folder).
- **Local (NAO duplicar RSC content):** padroes especificos de RSC vao em `react-server-components.md`. Atom Suspense foca em: como definir boundary, onde colocar `loading.tsx`, interplay com `error.tsx`, evitar waterfall com parallel fetch. NAO repetir "RSC vs client" — apenas cross-link.

---

## Verificacao

### TDD

Content-only. Validacao por self-check + verifier batch fase-07.

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/react-suspense-patterns.md`
- [ ] Atom <=200 linhas
- [ ] 4 secoes obrigatorias presentes (`grep -E '^##\s+(When to consult|Senior patterns|Anti-patterns|Decision criteria)' knowledge/nextjs/atoms/react-suspense-patterns.md` retorna 4)
- [ ] `sources:` aponta para paths reais em `Infos/knowledge/NextJS/...`
- [ ] Frontmatter tem `related_skills: [/react-patterns]` (entra em ## By Cross-Stack Skill -> ### For /react-patterns no INDEX final fase-06)
- [ ] `bun run harness:validate` aceita o novo atom
- [ ] `bun run compound:check` passa

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/react-suspense-patterns.md` retorna `≤200`
- `bun run harness:validate` retorna `valid`

**Por humano (verifier batch fase-07):**
- Verifier batch confirma >=80% rastreabilidade em Senior patterns + Anti-patterns + Decision criteria

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
