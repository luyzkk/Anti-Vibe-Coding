<!--
Princípio universal #5 — Comment Provenance.
Esta fase NAO toca codigo .ts (apenas markdown). Provenance comment nao se aplica.
Comentarios inline em frontmatter YAML/markdown NAO requerem provenance — `updated:` no frontmatter cumpre a funcao.
-->

# Fase 01: Security stack-specific + React hooks & state (2 atoms T1)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** M (~2h — 2 extracoes paralelas via subagente)
**Depende de:** Nenhuma (independente dentro do Plano 03; depende apenas dos protocolos do Plano 01 fase-03 e atoms do Plano 02)
**Visual:** false

---

## O que esta fase entrega

2 atoms T1 em `knowledge/nextjs/atoms/`: `security-stack-specific.md` (cobre middleware auth, CSRF, RSC secret leaks, auth.js patterns — **flagged R3-B** para audit humano na fase-07) + `react-hooks-and-state.md` (cobre useState/useReducer/useFormState/useOptimistic + interplay com Server Actions). Ambos em EN, <=200 linhas, frontmatter completo com `sources:` apontando para `Infos/knowledge/NextJS/...`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/security-stack-specific.md` | Create | Atom T1 EN, ≤200 linhas, **flagged R3-B** |
| `knowledge/nextjs/atoms/react-hooks-and-state.md` | Create | Atom T1 EN, ≤200 linhas |

---

## Implementacao

### Passo 1: Confirmar prerequisites do Plano 01

Antes de lancar extratores, verificar que:
- Matrix folder `knowledge/nextjs/` existe (Plano 01 fase-01) — `ls knowledge/nextjs/atoms/`
- Piloto `app-router-and-layouts.md` existe e tem verifier report >=80% rastreabilidade (Plano 01 fase-03)
- Compound lessons estao em `docs/compound/` (`2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` + `2026-05-16-verifier-protocol-technical-sections-only.md`)

Se algum falhar, BLOCKER — voltar ao Plano 01.

### Passo 2: Identificar sources para cada atom

Sources canonicas (paths em `Infos/knowledge/NextJS/`):

**security-stack-specific.md (flagged R3-B):**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md` (auth patterns)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (security checklist)
- `Infos/knowledge/NextJS/compass_artifact_wf-*security*.md` (busque pelo prefixo relevante — deep-research files no diretorio Infos/knowledge/NextJS/)
- Optional cross-ref: [knowledge/nodejs-typescript/atoms/security-stack-specific.md](../../../../knowledge/nodejs-typescript/atoms/security-stack-specific.md) (referencia para distinguir Next-specific de Node-TS generico — Next-specific entra; generico fica fora)

**react-hooks-and-state.md:**
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md` (hooks em RSC vs client)
- `Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md` (useFormState + useOptimistic com server actions)
- `Infos/knowledge/NextJS/compass_artifact_wf-*react*.md` ou `deep-research-report*react*.md` (busque os arquivos correspondentes localmente)

Liste os paths exatos antes de lancar o subagente (audit trail). Se um path nao existir, removelo e ajustar.

### Passo 3: Lancar 2 extratores em paralelo

Cada subagente extrator recebe prompt com:

1. **Bloco "REGRA DE FIDELIDADE" VERBATIM** da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (G1 — anti-drift). NAO parafrasear.
2. Path do source (1 atom -> 1 subagente; cada um isolado).
3. Frontmatter alvo (ver Passo 4).
4. Instrucao: "Produza markdown com frontmatter + 4 secoes obrigatorias (When to consult / Senior patterns / Anti-patterns / Decision criteria). Idioma: EN (D15 do PRD). Hard cap: 200 linhas total (frontmatter + body). Se ultrapassar, priorizar Senior patterns + Anti-patterns + Decision criteria e encolher When to consult."
5. Instrucao "use ONLY information present in the source(s) listed in frontmatter `sources:`. Se algo for senior pattern conhecido MAS nao estiver no source, OMITIR (R3-A regra de ouro)."

### Passo 4: Frontmatter alvo (template)

**security-stack-specific.md:**

```yaml
---
topic: security-stack-specific
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/compass_artifact_wf-<id>.md)
tier: 1
triggers: [middleware auth, CSRF, RSC secret leak, NextAuth, Clerk, auth.js, secure cookies, server-only]
related_skills: [/security]
updated: 2026-05-24
flagged_for_human_audit: true  # R3-B — resolvido em Plano 03 fase-07
---
```

**react-hooks-and-state.md:**

```yaml
---
topic: react-hooks-and-state
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md)
  - skill: nextjs-app-router-patterns V2 (Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md)
  - research: <wf-id> (Infos/knowledge/NextJS/deep-research-report-react-<id>.md)
tier: 1
triggers: [useState, useReducer, useFormState, useOptimistic, useTransition, useEffect, client component, "use client"]
related_skills: [/react-patterns]
updated: 2026-05-24
---
```

### Passo 5: Self-check pelo extrator

Cada subagente confirma antes de retornar:
- [ ] Atom <=200 linhas total (`wc -l`)
- [ ] 4 secoes obrigatorias presentes (When to consult / Senior patterns / Anti-patterns / Decision criteria)
- [ ] `sources:` aponta para paths reais em Infos/knowledge/NextJS/...
- [ ] Idioma EN consistente (sem misturar PT-BR no body)
- [ ] Nenhuma claim plausivel-mas-inventada (R3-A — releitura final do extrator antes de entregar)

### Passo 6: Flagging R3-B em STATE.md

Apos `security-stack-specific.md` ser entregue, anotar em `STATE.md` global da feature (raiz da pasta ativa):

```
- [ ] R3-B audit humano: `knowledge/nextjs/atoms/security-stack-specific.md` (flagged em Plano 03 fase-01) — resolvido em Plano 03 fase-07
```

(NAO anotar para `react-hooks-and-state.md` — apenas security e R3-B nesta fase.)

---

## Gotchas

- **G1 do plano (anti-drift VERBATIM):** prompt do extrator INCLUI bloco "REGRA DE FIDELIDADE" verbatim da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`. Nao parafrasear.
- **G2 do plano (hard cap 200 linhas):** se extrator entrega >200, re-rodar com instrucao de cortar. Conteudo excedente vira backlog em `TODO.md`.
- **G3 do plano (idioma EN):** body completo em EN. Frontmatter keys em EN tambem (`triggers`, `topic`, `related_skills` — padrao herdado).
- **G4 do plano (R3-B flagging):** security-stack-specific entra em STATE.md como pending audit humano fase-07.
- **G5 do plano (next_versions NAO):** nem security nem react-hooks tem claims Next 15-only. Se algum claim aparecer (improvavel), marcar com `<!-- next_versions: >=15 -->` inline, NAO no frontmatter.
- **G7 do plano (Infos/ paths):** `sources:` aponta para Infos/... mesmo com .gitignore — audit trail textual. Verifier audita rastreabilidade durante fase-07.
- **Local (sobreposicao com Node-TS):** `security-stack-specific.md` existe em `knowledge/nodejs-typescript/atoms/` tambem. **Atom Next NAO referencia Node-TS via link** (R2-C — atoms standalone, drift como custo aceito). Apenas o conteudo Next-specific entra: middleware auth, RSC secret leaks (`import 'server-only'`), Server Actions CSRF, cookies httpOnly+SameSite + NextAuth/Clerk/Supabase auth patterns. NAO incluir prototype pollution, npm audit, helmet — isso e Node-TS generico.
- **Local (audit humano R3-B):** security-stack-specific cobre area broad com vocabulario consagrado (CSRF, middleware) onde claims faceis de inventar. Audit humano Luiz em fase-07 confere que cada pattern (ex.: "auth.js v5 usa middleware nativo") corresponde a uma passagem real no source.

---

## Verificacao

### TDD

Atoms content-only NAO usam ciclo RED-GREEN-REFACTOR classico. Validacao por self-check + verifier batch fase-07.

### Checklist

- [ ] Ambos os atoms criados em `knowledge/nextjs/atoms/`
- [ ] Cada atom <=200 linhas (verifique com `wc -l knowledge/nextjs/atoms/security-stack-specific.md knowledge/nextjs/atoms/react-hooks-and-state.md`)
- [ ] Ambos os atoms tem as 4 secoes obrigatorias (`grep -E '^##\s+(When to consult|Senior patterns|Anti-patterns|Decision criteria)' knowledge/nextjs/atoms/security-stack-specific.md` retorna 4 linhas; idem para react-hooks-and-state)
- [ ] `sources:` no frontmatter de ambos os atoms aponta para paths reais em `Infos/knowledge/NextJS/...` (audit trail textual — paths nao precisam estar committados)
- [ ] `flagged_for_human_audit: true` presente no frontmatter de `security-stack-specific.md` (nao em react-hooks-and-state.md)
- [ ] STATE.md global da feature recebe linha registrando `security-stack-specific.md` como pending audit humano fase-07
- [ ] `bun run harness:validate` aceita os 2 novos atoms (assertion: nenhum erro de schema)
- [ ] `bun run compound:check` passa (nada quebrado pelas adicoes markdown)

---

## Criterio de Aceite

**Por maquina:**
- `wc -l knowledge/nextjs/atoms/security-stack-specific.md` retorna `≤200`
- `wc -l knowledge/nextjs/atoms/react-hooks-and-state.md` retorna `≤200`
- `bun run harness:validate` retorna `valid` sem erros
- `grep -c 'flagged_for_human_audit: true' knowledge/nextjs/atoms/security-stack-specific.md` retorna `1`

**Por humano (verifier batch fase-07 + audit humano Luiz):**
- Verifier batch confirma >=80% rastreabilidade em Senior patterns + Anti-patterns + Decision criteria para ambos os atoms
- Luiz aprova `security-stack-specific.md` em fase-07 com signature `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
