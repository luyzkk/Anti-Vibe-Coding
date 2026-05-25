<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-24 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 01: React Server Components atom (T1) — flagged R3-B

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** M (~2h)
**Depende de:** Plano 01 fase-03 (piloto `app-router-and-layouts.md` estabelece molde + anti-drift clause + verifier refined protocol como regression)
**Visual:** false (content-only — markdown puro)

---

## O que esta fase entrega

Atom T1 `knowledge/nextjs/atoms/react-server-components.md` em EN, <=200 linhas, frontmatter completo com `sources:` apontando para SKILL.md V2 + 1-2 deep-research files que cobrem RSC. **Flagged R3-B** (audit humano Luiz em Plano 03 fase-07): RSC e o conceito mais novo/contraintuitivo do Next — gate humano adicional alem do verifier automatico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/react-server-components.md` | Create | Atom T1 destilado em EN — server vs client boundaries, `'use client'`, props serialization, useState/useEffect/refs proibidos em RSC, async components, streaming |
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` | Modify | Adicionar entrada `pending audit humano Luiz: react-server-components.md` (sera resolvida em Plano 03 fase-07) — ANOTAR APENAS, nao tocar outros campos |

---

## Implementacao

### Passo 1: Identificar fontes relevantes em Infos/knowledge/NextJS/

Use Glob para listar arquivos no diretorio de fontes; selecione 2-3 que cobrem RSC explicitamente.

```bash
# verificar nomes reais (subagente extrator faz isso ao inicio)
ls "Infos/knowledge/NextJS/"
ls "Infos/knowledge/NextJS/agent-skills-main/skills/" # ou onde os SKILL.md V2 vivem
```

**Sources prioritarios (LIBERTE A LLM DO EXTRATOR para validar e escolher entre o material disponivel — verificar nome em `Infos/knowledge/NextJS/agent-skills-main/skills/`):**
- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 do agent-skills-main — cobre RSC patterns)
- `Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md` (Modelo de Execucao, Concorrencia e React Concurrent Features — secoes Server Components 009-015)
- `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md` (Arquitetura e Organizacao — boundary server/client e a regra estrutural mais importante)
- `Infos/knowledge/NextJS/deep-research-report.md` (Catalogo de smells — fronteiras server/client violations)

### Passo 2: Frontmatter alvo (em EN — D15)

```yaml
---
topic: react-server-components
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
tier: 1
triggers: [server components, client components, use client, RSC, props serialization, async components, streaming, boundaries]
cross_stack_skills: [/react-patterns]
updated: 2026-05-24
---
```

`stack: nextjs` segue padrao `stack: rails`/`stack: nodejs-typescript` dos atoms existentes. `cross_stack_skills` mapeia para a skill cross-stack consumidora (per D7 — RSC alimenta `/react-patterns`). `triggers` em EN.

### Passo 3: Estrutura do atom (4 secoes obrigatorias em EN)

Espelhar formato `knowledge/rails/atoms/rails-conventions-and-magic.md` adaptado para EN:

```markdown
# React Server Components — Next.js App Router

## When to consult

- {use-case framing — when to read this atom; <=5 bullets}

## Senior patterns

### Pattern: {nome}
- **Problem:** ...
- **Pattern:** ...
- **When to use:** ...
- **When NOT to use:** ...

(repetir 3-5 patterns — props serialization, async components, composition, boundaries)

## Anti-patterns

### Anti-pattern: {nome}
- **Symptom:** ...
- **Why it's bad:** ...
- **Fix:** ...

(repetir 3-4 anti-patterns — useState in RSC, importing client-only in RSC, fetching in client component when server does it)

## Decision criteria

| If... | Then... |
|---|---|
| ... | ... |

## External references

- Cross-stack skills: /react-patterns
- Source paths (audit trail):
  - {paths reais listados no frontmatter sources:}
```

### Passo 4: Prompt do subagente extrator (cole VERBATIM o bloco anti-drift)

Subagente recomendado: `Agent` tool com `subagent_type=general-purpose` (sem worktree — content-only, sem mutacao de codigo). Isolamento opcional: lancar com contexto limpo do plugin (sem historia de outras fases).

**Prompt completo (cole tal qual no Agent tool):**

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie o arquivo `knowledge/nextjs/atoms/react-server-components.md` (T1, em EN, <=200 linhas) destilado dos sources listados abaixo, seguindo o padrao do piloto `knowledge/nextjs/atoms/app-router-and-layouts.md` (Plano 01 fase-03).

## SOURCES (audit trail textual — Infos/ esta no .gitignore mas voce tem acesso local)

Verifique nome real via ls `Infos/knowledge/NextJS/agent-skills-main/skills/`:

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — RSC patterns)
- `Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md` (secoes Server Components 009-015)
- `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md` (boundary server/client)

LIBERDADE: se outro arquivo disponivel cobrir RSC com mais profundidade, troque/adicione. Mas registre no `sources:` o que efetivamente usou.

## TARGET FRONTMATTER (em EN — D15)

```yaml
---
topic: react-server-components
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
tier: 1
triggers: [server components, client components, use client, RSC, props serialization, async components, streaming, boundaries]
cross_stack_skills: [/react-patterns]
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — use-case framing, <=5 bullets
2. `## Senior patterns` — 3-5 patterns no formato `### Pattern: {nome}` com Problem/Pattern/When to use/When NOT to use
3. `## Anti-patterns` — 3-4 no formato `### Anti-pattern: {nome}` com Symptom/Why it's bad/Fix
4. `## Decision criteria` — tabela `| If... | Then... |`

Mais 1 secao final `## External references` (cross-stack skills + source paths audit trail).

## CONTEUDO ALVO (conceitos chave RSC — extrair do source)

- Server vs Client boundaries (`'use client'` directive; default = server)
- Props serialization (apenas tipos serializaveis cruzam o boundary; Date/Map/Set/funcoes nao serializam)
- Hooks proibidos em RSC: useState/useEffect/useRef/useContext (qualquer hook com state ou DOM)
- Async components (server components podem ser `async function`; client components nao)
- Streaming + Suspense boundaries
- Composition pattern: passar Server Component como children para Client Component (preserva server tree)
- `server-only` package como guardiao do boundary (impede import acidental em client)
- DAL (Data Access Layer) co-locada com server tree

## HARD CAP

- <=200 linhas TOTAL (frontmatter + corpo + footer)
- Se ultrapassar, priorize: Senior patterns + Anti-patterns + Decision criteria (essas tres sao auditadas pelo verifier)
- Encolha When to consult (max 5 bullets) e External references (so cross-stack + sources)
- Conteudo excedente NAO entra no atom — voce nao precisa cobrir tudo. Conteudo cortado vira backlog `TODO.md` (que voce NAO escreve nesta fase)

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva o arquivo em `knowledge/nextjs/atoms/react-server-components.md` (path absoluto). Retorne resumo curto: linhas totais, qtos patterns, qtos anti-patterns, qtos rows na tabela Decision criteria.

NAO escreva nada fora desse arquivo. NAO toque outros arquivos do plugin.
````

### Passo 5: Anotar STATE.md global como pending audit humano

Apos extrator completar com sucesso, anotar em `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` (NAO sobrescrever, apenas adicionar):

```markdown
## Audit humano pending (R3-B)

- [ ] `knowledge/nextjs/atoms/react-server-components.md` — flagged em Plano 02 fase-01; audit em Plano 03 fase-07 (Luiz)
```

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** o prompt acima ja inclui o bloco verbatim — NAO editar, NAO resumir. Se voce abrir o prompt e o bloco "REGRA DE FIDELIDADE" estiver ausente ou parafraseado, RECUAR e re-aplicar o bloco da compound lesson antes de invocar o subagente.
- **G2 do plano (200 linhas):** RSC e tema denso (boundaries + serializacao + async + composition + DAL guard) — risco real de extrator entregar 220+ linhas. Re-rodar com instrucao cirurgica de cortar; nao "aceitar com nota".
- **G3 do plano (idioma EN):** todo o corpo em EN. Se extrator gerou PT-BR (acidente de contexto do plugin), rejeitar e re-rodar especificando EN no inicio do prompt.
- **G4 do plano (flagged R3-B):** ESTA fase e flagged — anotar em STATE.md global e NAO esquecer. Plano 03 fase-07 precisa da entrada.
- **G6 do plano (verifier scope):** o verifier na fase-07 audita apenas Senior patterns + Anti-patterns + Decision criteria. When to consult e External references nao entram no audit — voce pode usar framing editorial nelas sem medo de false-negative.
- **G7 do plano (sources audit trail):** `Infos/` esta no `.gitignore`. Paths no frontmatter `sources:` funcionam como audit trail textual. Verifier confirma que o conteudo das 3 secoes tecnicas tem rastreabilidade aos paths listados — o arquivo nao precisa estar committado no repo.
- **Local — props serialization:** Date/Map/Set/funcoes NAO serializam entre server e client em RSC. Se source nao listar exatamente quais tipos sao bloqueados, NAO INVENTE lista — descreva qualitativamente como source faz (ex: "non-serializable types like functions and class instances are rejected at the boundary").

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/react-server-components.md` (path exato)
- [ ] Frontmatter contem campos obrigatorios: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `cross_stack_skills`, `updated` (em EN)
- [ ] 4 secoes presentes (em EN): `## When to consult`, `## Senior patterns`, `## Anti-patterns`, `## Decision criteria`
- [ ] Hard cap: `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa sobre o novo atom (NFR pre-existente; schema ja aceita frontmatter Rails-style)
- [ ] STATE.md global da feature atualizado com entrada `pending audit humano: react-server-components.md` (R3-B)
- [ ] Bloco anti-drift verbatim presente no prompt do extrator (auto-check antes de invocar — git log do prompt se preservado)
- [ ] Sources listados no frontmatter sao paths reais em `Infos/knowledge/NextJS/...` (extrator confirmou ao gerar)

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/react-server-components.md` retorna 0
- `wc -l knowledge/nextjs/atoms/react-server-components.md | awk '{ exit ($1 > 200) }'` retorna 0
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/react-server-components.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/react-server-components.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/react-server-components.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/react-server-components.md` retorna 0
- `grep -q "react-server-components.md" docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` retorna 0 (entry de pending audit anotada)

**Por humano:**
- N/A nesta fase (audit humano e diferido para Plano 03 fase-07; fase-07 do Plano 02 e verifier automatico)

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
