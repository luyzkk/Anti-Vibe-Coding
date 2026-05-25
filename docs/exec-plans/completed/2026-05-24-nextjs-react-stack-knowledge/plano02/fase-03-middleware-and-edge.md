<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu, quando, por que.
NAO aplicar em codigo de runtime do plugin.
-->

# Fase 03: Middleware and Edge atom (T1)

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** S (~1.5h)
**Depende de:** Plano 01 fase-03 (piloto + protocolos)
**Visual:** false (content-only)

---

## O que esta fase entrega

Atom T1 `knowledge/nextjs/atoms/middleware-and-edge.md` em EN, <=200 linhas, frontmatter com `sources:` apontando para SKILL.md V2 + deep-research que cobrem middleware/edge runtime. Mapeia para skill cross-stack `/security` (per D7).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/middleware-and-edge.md` | Create | Atom T1 destilado em EN — runtime constraints (no Node APIs em edge), cookie handling, NextAuth/Clerk/Supabase auth patterns, matcher config, redirect/rewrite/next |

---

## Implementacao

### Passo 1: Sources prioritarios

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — middleware section)
- `Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md` (V2 — middleware auth patterns Supabase)
- `Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md` (Build/Deploy/Edge — Edge runtime apenas para Middleware/Proxy)
- `Infos/knowledge/NextJS/deep-research-report.md` (Seguranca — middleware bypass historico de advisories; auth NAO apenas em middleware)

### Passo 2: Frontmatter alvo

```yaml
---
topic: middleware-and-edge
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
  - research: nextjs-security (Infos/knowledge/NextJS/deep-research-report.md)
tier: 1
triggers: [middleware, edge runtime, proxy, NextAuth, Clerk, Supabase auth, matcher, redirect, rewrite, cookies, runtime constraints]
cross_stack_skills: [/security]
updated: 2026-05-24
---
```

### Passo 3: Conteudo alvo

- Edge runtime constraints (sem Node APIs nativas: fs, native crypto, Prisma direto; usar Web Crypto via `crypto.subtle` ou `jose`)
- Cookie handling (read/write apenas em Server Actions/Route Handlers/middleware — RSC nao escreve cookies)
- Matcher config (`config.matcher` define quais rotas passam por middleware; otimizacao para nao rodar em tudo)
- Auth patterns: NextAuth/Clerk/Supabase — middleware faz session refresh + redirect cedo, mas auth/autorizacao por recurso continua na rota (deep-research aponta middleware-only auth como anti-pattern com historico de bypass advisories)
- `redirect()`/`rewrite()`/`next()` semantica + casos onde usar cada um
- Next 16: rename `middleware` -> `proxy` (registrar nuance se SKILL.md V2 ou deep-research cobrir)

### Passo 4: Prompt do subagente extrator

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie `knowledge/nextjs/atoms/middleware-and-edge.md` (T1, em EN, <=200 linhas) destilado dos sources abaixo, seguindo padrao do piloto.

## SOURCES (verifique via ls `Infos/knowledge/NextJS/` se preciso)

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — middleware)
- `Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md` (V2 — Supabase auth via middleware)
- `Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md` (Edge runtime constraints)
- `Infos/knowledge/NextJS/deep-research-report.md` (Seguranca — middleware-only auth como anti-pattern)

LIBERDADE: trocar/adicionar se outro source cobrir com mais profundidade. Registre em `sources:`.

## TARGET FRONTMATTER (em EN)

```yaml
---
topic: middleware-and-edge
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
  - research: nextjs-security (Infos/knowledge/NextJS/deep-research-report.md)
tier: 1
triggers: [middleware, edge runtime, proxy, NextAuth, Clerk, Supabase auth, matcher, redirect, rewrite, cookies, runtime constraints]
cross_stack_skills: [/security]
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — <=5 bullets
2. `## Senior patterns` — 3-5 patterns: matcher config; edge runtime selection; cookie refresh in middleware + auth re-check in route; redirect vs rewrite
3. `## Anti-patterns` — 3-4: auth ONLY in middleware (advisory bypass historico); Node APIs in edge; missing matcher (runs em tudo); writing cookies from RSC
4. `## Decision criteria` — tabela `| If... | Then... |`

Mais `## External references`.

## HARD CAP

<=200 linhas.

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva em `knowledge/nextjs/atoms/middleware-and-edge.md`. Retorne resumo.

NAO escreva nada fora desse arquivo.
````

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** ja incluido no prompt — nao editar.
- **G2 do plano (200 linhas):** ok provavel — middleware/edge tem menos sub-topicos que server actions.
- **G3 do plano (idioma EN):** corpo em EN.
- **G6 do plano (verifier scope):** Senior + Anti + Decision auditados.
- **G7 do plano (sources):** `Infos/` no .gitignore, paths sao audit trail textual.
- **Local — middleware-only auth e o anti-pattern critico:** deep-research aponta historico de bypass advisories. Se source documenta CVEs ou advisories especificos, NAO inventar numeros — citar qualitativamente como source ("documented bypass advisories in 2025"). Cross-link com `/security` skill no External references.
- **Local — proxy rename Next 16:** se SKILL.md V2 nao mencionar, NAO mencione (anti-drift). Se mencionar como rename de `middleware` para `proxy`, incluir como nota.

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/middleware-and-edge.md`
- [ ] Frontmatter com campos obrigatorios (em EN)
- [ ] 4 secoes presentes em EN
- [ ] `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa
- [ ] Bloco anti-drift presente no prompt do extrator

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/middleware-and-edge.md` retorna 0
- `wc -l knowledge/nextjs/atoms/middleware-and-edge.md | awk '{ exit ($1 > 200) }'` retorna 0
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/middleware-and-edge.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/middleware-and-edge.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/middleware-and-edge.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/middleware-and-edge.md` retorna 0

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
