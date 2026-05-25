<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 02: Server Actions and Mutations atom (T1)

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** M (~2h)
**Depende de:** Plano 01 fase-03 (piloto + protocolos)
**Visual:** false (content-only)

---

## O que esta fase entrega

Atom T1 `knowledge/nextjs/atoms/server-actions-and-mutations.md` em EN, <=200 linhas, frontmatter com `sources:` apontando para SKILL.md V2 + deep-research que cobrem Server Actions. Mapeia para skill cross-stack `/api-design` (per D7).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/server-actions-and-mutations.md` | Create | Atom T1 destilado em EN — `'use server'`, validacao Zod, `revalidatePath`/`revalidateTag`, progressive enhancement, `useFormState`/`useFormStatus`, CSRF nativo |

---

## Implementacao

### Passo 1: Sources prioritarios

Verificar via Glob/ls em `Infos/knowledge/NextJS/`:
- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — server actions patterns)
- `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` (API Architecture in Next.js — Server Actions vs Route Handlers heuristics)
- `Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md` (Heuristicas de Estado — forms, mutations, useFormState/useFormStatus)
- `Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md` (Dados e Mutations — `revalidateTag`/`revalidatePath` em mutations)

### Passo 2: Frontmatter alvo (em EN)

```yaml
---
topic: server-actions-and-mutations
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
tier: 1
triggers: [server actions, use server, mutations, revalidatePath, revalidateTag, useFormState, useFormStatus, progressive enhancement, Zod validation, CSRF]
cross_stack_skills: [/api-design]
updated: 2026-05-24
---
```

### Passo 3: Conteudo alvo

- `'use server'` directive (file-level vs inline function)
- Validacao Zod no boundary da action (sempre antes do primeiro side effect)
- `revalidatePath(...)` e `revalidateTag(...)` apos mutation (NUNCA dentro de render)
- Progressive enhancement (form actions funcionam sem JS)
- `useFormState`/`useFormStatus` para feedback no client
- CSRF baseline do framework (POST-only, Origin/Host check, IDs nao-deterministicos) — mas auth/autorizacao por recurso continua responsabilidade da app
- `next-safe-action` quando ha 3+ server actions (referenciar como pattern senior)

### Passo 4: Prompt do subagente extrator

Subagente: `Agent` tool com `subagent_type=general-purpose`. Content-only, sem worktree.

**Prompt completo (cole tal qual):**

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie `knowledge/nextjs/atoms/server-actions-and-mutations.md` (T1, em EN, <=200 linhas) destilado dos sources abaixo, seguindo padrao do piloto `knowledge/nextjs/atoms/app-router-and-layouts.md` (Plano 01 fase-03).

## SOURCES (verifique via ls `Infos/knowledge/NextJS/` se preciso)

- `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md` (V2 — server actions)
- `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` (Server Actions vs Route Handlers)
- `Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md` (mutations + forms)

LIBERDADE: substitua/adicione se outro source cobrir o tema com mais profundidade. Registre em `sources:` o que usou.

## TARGET FRONTMATTER (em EN — D15)

```yaml
---
topic: server-actions-and-mutations
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
tier: 1
triggers: [server actions, use server, mutations, revalidatePath, revalidateTag, useFormState, useFormStatus, progressive enhancement, Zod validation, CSRF]
cross_stack_skills: [/api-design]
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — <=5 bullets
2. `## Senior patterns` — 3-5 patterns: Server Actions vs Route Handlers; Zod validation at boundary; revalidatePath/Tag after mutation; useFormState/useFormStatus; next-safe-action when 3+ actions
3. `## Anti-patterns` — 3-4: revalidate inside render; skip validation; Server Action without auth re-check; mixing data fetch with mutation in same action
4. `## Decision criteria` — tabela `| If... | Then... |`

Mais `## External references` (cross-stack + sources).

## HARD CAP

<=200 linhas TOTAL. Se ultrapassar: priorize Senior + Anti + Decision; encolha When + References.

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva o arquivo em `knowledge/nextjs/atoms/server-actions-and-mutations.md`. Retorne resumo: linhas totais, qtos patterns, qtos anti-patterns, qtos rows na tabela.

NAO escreva nada fora desse arquivo.
````

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** bloco verbatim ja incluido no prompt acima — nao editar.
- **G2 do plano (200 linhas):** Server Actions tem muitos sub-topicos (validation + revalidate + progressive enhancement + CSRF + useFormState). Risco de inflar. Cortar exemplos verbosos primeiro, manter padroes prescritivos.
- **G3 do plano (idioma EN):** todo o corpo em EN.
- **G6 do plano (verifier scope):** Senior + Anti + Decision auditados; When + External livres.
- **Local — CSRF + auth distincao:** framework provê baseline (POST-only, Origin/Host, IDs nao-deterministicos) mas auth/autorizacao por recurso e responsabilidade da app. Se source documentar essa distincao (deep-research.md sobre seguranca cobre), preserve a nuance — verifier vai checar.

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/server-actions-and-mutations.md`
- [ ] Frontmatter com campos obrigatorios (em EN)
- [ ] 4 secoes presentes em EN
- [ ] `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa
- [ ] Bloco anti-drift presente no prompt do extrator (auto-check antes de invocar)
- [ ] Sources sao paths reais

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/server-actions-and-mutations.md` retorna 0
- `wc -l knowledge/nextjs/atoms/server-actions-and-mutations.md | awk '{ exit ($1 > 200) }'` retorna 0
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/server-actions-and-mutations.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/server-actions-and-mutations.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/server-actions-and-mutations.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/server-actions-and-mutations.md` retorna 0

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
