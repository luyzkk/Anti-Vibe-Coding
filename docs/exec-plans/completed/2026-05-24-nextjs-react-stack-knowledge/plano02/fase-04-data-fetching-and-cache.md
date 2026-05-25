<!--
Principio universal #5 — Comment Provenance.
NAO aplicar em codigo de runtime do plugin.
-->

# Fase 04: Data Fetching and Cache atom (T1)

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** M (~2h)
**Depende de:** Plano 01 fase-03 (piloto + protocolos)
**Visual:** false (content-only)

---

## O que esta fase entrega

Atom T1 `knowledge/nextjs/atoms/data-fetching-and-cache.md` em EN, <=200 linhas, frontmatter com `sources:` apontando para SKILL.md V2 + deep-research que cobrem cache layers. Mapeia para skills cross-stack `/api-design` + `/system-design` (per D7).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/data-fetching-and-cache.md` | Create | Atom T1 destilado em EN — `fetch()` com cache options ('force-cache'/'no-store'), Next cache layers (Data Cache + Full Route Cache + Router Cache + Request Memoization), `revalidate`, `tags`, `unstable_cache`, segment config (`export const dynamic`) |

---

## Implementacao

### Passo 1: Sources prioritarios

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — caching patterns)
- `Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md` (V2 — best practices cache)
- `Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md` (Dados — `unstable_cache`/`'use cache'`, `revalidateTag`/`revalidatePath` em mutations)
- `Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md` (Performance — caching corretamente como 80% dos ganhos; `x-nextjs-cache` debug header)
- `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` (Next 15 — GET Route Handlers uncached by default)

### Passo 2: Frontmatter alvo

```yaml
---
topic: data-fetching-and-cache
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-3d54ffa8 (Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
tier: 1
triggers: [fetch, cache, force-cache, no-store, revalidate, revalidateTag, revalidatePath, unstable_cache, Data Cache, Full Route Cache, Router Cache, Request Memoization, segment config, dynamic]
cross_stack_skills: [/api-design, /system-design]
updated: 2026-05-24
---
```

### Passo 3: Conteudo alvo

- 4 cache layers do Next App Router: Request Memoization (intra-render), Data Cache (cross-request), Full Route Cache (build/ISR), Router Cache (client navigation)
- `fetch()` cache options: `'force-cache'` (default ate Next 14) vs `'no-store'` (default Next 15 GET handlers); `next: { revalidate: 60, tags: ['foo'] }`
- `unstable_cache(...)` para wrap de funcoes nao-fetch (db queries diretos)
- `revalidateTag(tag)`/`revalidatePath(path)` SEMPRE em mutations (Server Action ou Route Handler); NUNCA em render
- Segment config: `export const dynamic = 'force-dynamic' | 'force-static' | 'auto'`; `export const revalidate = N`; `export const fetchCache = ...`
- Debug: `x-nextjs-cache` header (HIT/MISS/STALE)
- `React.cache()` para deduplicacao intra-render de funcoes nao-fetch

### Passo 4: Prompt do subagente extrator

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie `knowledge/nextjs/atoms/data-fetching-and-cache.md` (T1, em EN, <=200 linhas) destilado dos sources abaixo, seguindo padrao do piloto.

## SOURCES (verifique via ls `Infos/knowledge/NextJS/`)

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — caching)
- `Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md` (V2 — best practices)
- `Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md` (Dados — `unstable_cache`/`'use cache'`)
- `Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md` (Performance — caching ganhos)
- `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` (Next 15 default uncached)

LIBERDADE: substituir/adicionar. Registre em `sources:`.

## TARGET FRONTMATTER (em EN)

```yaml
---
topic: data-fetching-and-cache
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-3d54ffa8 (Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
tier: 1
triggers: [fetch, cache, force-cache, no-store, revalidate, revalidateTag, revalidatePath, unstable_cache, Data Cache, Full Route Cache, Router Cache, Request Memoization, segment config, dynamic]
cross_stack_skills: [/api-design, /system-design]
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — <=5 bullets
2. `## Senior patterns` — 3-5 patterns: 4 cache layers mental model; fetch() com cache option e revalidate/tags; unstable_cache wrap em db queries; revalidateTag em mutation; segment config para rotas dinamicas/estaticas
3. `## Anti-patterns` — 3-4: revalidate dentro de render; assumir Next 14 defaults em Next 15 (GET Route Handlers uncached); confundir Data Cache com Router Cache (browser side); fetch sem cache option
4. `## Decision criteria` — tabela `| If... | Then... |`

Mais `## External references` (cross-stack: /api-design, /system-design).

## HARD CAP

<=200 linhas. 4 cache layers podem inflar — encolher exemplos.

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva em `knowledge/nextjs/atoms/data-fetching-and-cache.md`. Retorne resumo.

NAO escreva nada fora desse arquivo.
````

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** ja incluido — nao editar.
- **G2 do plano (200 linhas):** 4 cache layers + segment config + revalidate API e MUITO. Riscoreal de >200. Manter mental model compacto; usar tabela em Decision criteria para evitar prosa.
- **G3 do plano (idioma EN):** corpo em EN.
- **G6 do plano (verifier scope):** Senior + Anti + Decision auditados.
- **Local — Next 14 vs Next 15 default change:** Next 15 mudou GET Route Handlers para uncached by default (per source wf-dbd12769). Se atom faz claim sobre defaults, especificar versao. NAO INVENTE versoes — citar so o que source documenta.
- **Local — `'use cache'` directive (Next 15+):** se SKILL.md V2 ou deep-research mencionar, incluir como pattern senior. Se nao mencionar, NAO incluir (anti-drift).

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/data-fetching-and-cache.md`
- [ ] Frontmatter com campos obrigatorios (em EN)
- [ ] 4 secoes presentes em EN
- [ ] `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa
- [ ] Bloco anti-drift presente no prompt do extrator

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/data-fetching-and-cache.md` retorna 0
- `wc -l knowledge/nextjs/atoms/data-fetching-and-cache.md | awk '{ exit ($1 > 200) }'` retorna 0
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/data-fetching-and-cache.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/data-fetching-and-cache.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/data-fetching-and-cache.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/data-fetching-and-cache.md` retorna 0

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
