<!--
Principio universal #5 — Comment Provenance.
NAO aplicar em codigo de runtime do plugin.
-->

# Fase 05: Rendering Strategies atom (T2 — frontmatter next_versions: ['>=15'] per D13)

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** M (~2h)
**Depende de:** Plano 01 fase-03 (piloto + protocolos)
**Visual:** false (content-only)

---

## O que esta fase entrega

Atom T2 `knowledge/nextjs/atoms/rendering-strategies.md` em EN, <=200 linhas, frontmatter com campo `next_versions: ['>=15']` per D13. Cobertura: SSG/SSR/ISR + secao PPR (Partial Pre-Rendering) marcada com comentario HTML indicando que essa secao especificamente requer Next 15+. Mapeia para skills cross-stack `/react-patterns` + `/system-design` (per D7).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/rendering-strategies.md` | Create | Atom T2 destilado em EN — SSG/SSR/ISR trade-offs + secao PPR (Next 15+) com `experimental.ppr: true` + Suspense boundaries |

---

## Implementacao

### Passo 1: Sources prioritarios

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — rendering)
- `Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md` (Performance — streaming Suspense; rendering trade-offs)
- `Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md` (Modelo Execucao — Suspense + Transitions secoes 021-026)
- `Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md` (Deploy — Edge nao suporta ISR)

### Passo 2: Frontmatter alvo (D13 — next_versions no atom inteiro)

```yaml
---
topic: rendering-strategies
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
tier: 2
next_versions: ['>=15']
triggers: [SSG, SSR, ISR, PPR, Partial Pre-Rendering, Suspense, streaming, experimental.ppr, rendering, force-static, force-dynamic]
cross_stack_skills: [/react-patterns, /system-design]
updated: 2026-05-24
---
```

`next_versions: ['>=15']` no atom inteiro espelha `rails_versions: ['>=8.0']` do Rails wave (D13). Schema validator ja aceita esse padrao (Plano 01 fase-04 garantiu regression em validator). A secao PPR especificamente requer Next 15+; outras estrategias (SSG/SSR/ISR) funcionam em Next 13+, mas o frontmatter no atom marca esta versao porque o conteudo PPR contido aqui exige >=15.

### Passo 3: Conteudo alvo

- SSG (Static Site Generation) — build-time render; default para rotas sem dynamic APIs
- SSR (Server-Side Rendering) — request-time render; rota torna-se dynamic via cookies/headers/searchParams
- ISR (Incremental Static Regeneration) — `revalidate` no segment config; ressilva on-demand via `revalidateTag`/`revalidatePath`. NOTA: Edge runtime nao suporta ISR (cobertura source wf-c70ec330)
- Streaming + Suspense boundaries — `<Suspense fallback={...}>` para fragmentar TTFB; `loading.tsx` (route-level Suspense)
- **PPR (Partial Pre-Rendering) — Next 15+:** secao marcada com `<!-- next_versions: >=15 -->` no inicio. `experimental.ppr: true` em `next.config.js`. Combina shell estatico (build-time) com slots dinamicos (request-time) num unico response via Suspense boundaries
- Trade-offs: SSG=cache eterno+revalidate; SSR=fresh sempre+TTFB alto; ISR=fresh com janela; PPR=hybrid

### Passo 4: Estrutura do atom com marcacao PPR

```markdown
# Rendering Strategies — Next.js App Router

## When to consult
- ...

## Senior patterns

### Pattern: SSG default + opt-in dynamic
- ...

### Pattern: ISR with revalidate + on-demand revalidation
- ...

### Pattern: Streaming with Suspense for TTFB
- ...

<!-- next_versions: >=15 -->
### Pattern: Partial Pre-Rendering (PPR) for hybrid pages
- **Problem:** ...
- **Pattern:** `experimental.ppr: true` + Suspense boundaries delimit dynamic slots in otherwise static shell
- **When to use:** ...
- **When NOT to use:** Next <15 (PPR not stable)

## Anti-patterns
...

## Decision criteria
| If... | Then... |
|---|---|
```

### Passo 5: Prompt do subagente extrator

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie `knowledge/nextjs/atoms/rendering-strategies.md` (T2, em EN, <=200 linhas) destilado dos sources abaixo, seguindo padrao do piloto.

## SOURCES (verifique via ls `Infos/knowledge/NextJS/`)

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — rendering)
- `Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md` (streaming Suspense)
- `Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md` (Suspense + Transitions)
- `Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md` (Edge nao suporta ISR)

LIBERDADE: substituir/adicionar. Registre em `sources:`.

## TARGET FRONTMATTER (em EN — D13: next_versions no atom inteiro)

```yaml
---
topic: rendering-strategies
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
tier: 2
next_versions: ['>=15']
triggers: [SSG, SSR, ISR, PPR, Partial Pre-Rendering, Suspense, streaming, experimental.ppr, rendering, force-static, force-dynamic]
cross_stack_skills: [/react-patterns, /system-design]
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — <=5 bullets
2. `## Senior patterns` — 4 patterns:
   - SSG default + opt-in dynamic
   - ISR with revalidate + on-demand revalidation
   - Streaming with Suspense (Edge nao suporta ISR — registrar)
   - **Partial Pre-Rendering (PPR) for hybrid pages — MARCAR essa secao com comentario HTML `<!-- next_versions: >=15 -->` na linha ANTES do `### Pattern:` heading**
3. `## Anti-patterns` — 3-4: usar PPR em Next <15; SSR quando SSG basta; Edge + ISR
4. `## Decision criteria` — tabela

Mais `## External references` (cross-stack: /react-patterns, /system-design).

## MARCACAO PPR (per D13)

A unica secao com requisito de versao especifico e PPR. Adicione literalmente esta linha de comentario HTML ANTES do heading `### Pattern: Partial Pre-Rendering`:

```
<!-- next_versions: >=15 -->
### Pattern: Partial Pre-Rendering (PPR) for hybrid pages
```

Isso sinaliza ao leitor que aquele pattern especifico requer Next 15+, mesmo com o frontmatter ja marcando o atom como `next_versions: ['>=15']`. Outras secoes (SSG/SSR/ISR/Streaming) NAO levam o comentario — funcionam em versoes anteriores.

## HARD CAP

<=200 linhas TOTAL. Rendering tem 4 patterns + PPR sub-section + Suspense — riscocerto de inflar. Cortar prosa, manter tabelas.

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva em `knowledge/nextjs/atoms/rendering-strategies.md`. Retorne resumo + confirme comentario HTML PPR presente.

NAO escreva nada fora desse arquivo.
````

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** ja incluido — nao editar.
- **G2 do plano (200 linhas):** ALTO risco — 4 patterns + sub-secao PPR. Verifier rejeita.
- **G3 do plano (idioma EN):** corpo em EN.
- **G5 do plano (next_versions D13):** frontmatter usa lista `['>=15']` (entre aspas, lista YAML). Verificar que `harness:validate` aceita o campo (Plano 01 fase-04 garantiu regression).
- **G6 do plano (verifier scope):** auditado Senior + Anti + Decision. PPR sub-secao esta em Senior patterns — entra no audit.
- **Local — comentario HTML PPR e sinalizacao para leitor humano:** NAO substitui o frontmatter. E uma marca textual dentro do conteudo que ajuda leitor a entender qual sub-secao requer Next 15+ vs quais funcionam em versoes anteriores. Verifier nao parsa o comentario — e meta-content.
- **Local — Edge nao suporta ISR:** se SKILL.md V2 ou wf-c70ec330 documentar, registrar como anti-pattern explicito. Se nao documentar, NAO INVENTAR.

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/rendering-strategies.md`
- [ ] Frontmatter contem `next_versions: ['>=15']` per D13
- [ ] Comentario HTML `<!-- next_versions: >=15 -->` presente na linha ANTES de `### Pattern: Partial Pre-Rendering`
- [ ] 4 secoes presentes em EN
- [ ] `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa (aceita `next_versions` opcional)
- [ ] Bloco anti-drift presente no prompt do extrator

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/rendering-strategies.md` retorna 0
- `wc -l knowledge/nextjs/atoms/rendering-strategies.md | awk '{ exit ($1 > 200) }'` retorna 0
- `grep -q "next_versions: \['>=15'\]" knowledge/nextjs/atoms/rendering-strategies.md` retorna 0 (frontmatter)
- `grep -q "<!-- next_versions: >=15 -->" knowledge/nextjs/atoms/rendering-strategies.md` retorna 0 (marcacao PPR)
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/rendering-strategies.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/rendering-strategies.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/rendering-strategies.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/rendering-strategies.md` retorna 0

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
