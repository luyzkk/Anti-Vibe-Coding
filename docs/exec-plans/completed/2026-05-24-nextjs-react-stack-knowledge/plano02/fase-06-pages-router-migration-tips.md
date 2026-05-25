<!--
Principio universal #5 — Comment Provenance.
NAO aplicar em codigo de runtime do plugin.
-->

# Fase 06: Pages Router Migration Tips atom (T3)

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** S (~1h)
**Depende de:** Plano 01 fase-03 (piloto + protocolos)
**Visual:** false (content-only)

---

## O que esta fase entrega

Atom T3 `knowledge/nextjs/atoms/pages-router-migration-tips.md` em EN, <=200 linhas, frontmatter com `sources:` apontando para deep-research files que cobrem Pages Router e migracao para App Router. NAO mapeia para skill cross-stack direta (T3 migration — consulta on-demand quando dev pede /init em projeto Next 13+ legacy).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/atoms/pages-router-migration-tips.md` | Create | Atom T3 destilado em EN — mapeamento Pages -> App, `_app.tsx` -> `layout.tsx`, `getServerSideProps`/`getStaticProps` -> fetch in RSC, `api/` -> route handlers, `next/router` -> `next/navigation`, `_document.tsx` -> `layout.tsx`, fluxo de migracao gradual, coexistencia |

---

## Implementacao

### Passo 1: Sources prioritarios

- `Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md` (Idiomatismos — Diferencas entre App Router e Pages Router secao 4)
- `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md` (Arquitetura — Pages Router so deve ser preservado em legado em migracao)
- `Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md` (Estado — Diferencas App vs Pages secao 2)
- `Infos/knowledge/NextJS/deep-research-report.md` (Catalogo smells — coexistencia App Router/Pages Router como fronteira semantica)

### Passo 2: Frontmatter alvo

```yaml
---
topic: pages-router-migration-tips
stack: nextjs
layer: both
sources:
  - research: wf-191ad75d (Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
  - research: nextjs-smells (Infos/knowledge/NextJS/deep-research-report.md)
tier: 3
triggers: [pages router, app router, migration, getServerSideProps, getStaticProps, _app, _document, next/router, next/navigation, route handlers, coexistence]
cross_stack_skills: []
updated: 2026-05-24
---
```

`cross_stack_skills: []` vazio: T3 migration tips nao alimenta preface de nenhuma skill cross-stack — e consultado on-demand por dev migrando.

### Passo 3: Conteudo alvo

- Mapping table Pages -> App:
  - `pages/_app.tsx` -> `app/layout.tsx`
  - `pages/_document.tsx` -> `app/layout.tsx` (parte HTML structure)
  - `getServerSideProps` -> async Server Component com `fetch()` (cache 'no-store')
  - `getStaticProps` -> async Server Component com `fetch()` (cache 'force-cache' ou default)
  - `getStaticPaths` -> `generateStaticParams`
  - `pages/api/*` -> `app/api/*/route.ts` (route handlers)
  - `next/router` -> `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`)
  - `pages/_error.tsx` -> `app/error.tsx`
  - `pages/404.tsx` -> `app/not-found.tsx`
- Coexistencia App + Pages na mesma app (segmentos roteados separadamente)
- Estrategia gradual: migrar rota por rota (route group ou path); manter Pages Router para rotas pesadas em `getServerSideProps` ate sintese refatorada para RSC
- Quebra de mental model: `useState` no top do Pages component != Client Component boundary em App Router (deep-research aponta como confusao recorrente)

### Passo 4: Prompt do subagente extrator

````
Voce e um subagente isolado encarregado de destilar 1 atom de conhecimento Next.js para o plugin Anti-Vibe-Coding.

## TASK

Crie `knowledge/nextjs/atoms/pages-router-migration-tips.md` (T3, em EN, <=200 linhas) destilado dos sources abaixo, seguindo padrao do piloto.

## SOURCES (verifique via ls `Infos/knowledge/NextJS/`)

- `Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md` (Idiomatismos — App vs Pages)
- `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md` (Arquitetura — Pages so legado)
- `Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md` (Estado — App vs Pages)
- `Infos/knowledge/NextJS/deep-research-report.md` (Smells — coexistencia)

LIBERDADE: substituir/adicionar. Registre em `sources:`.

## TARGET FRONTMATTER (em EN)

```yaml
---
topic: pages-router-migration-tips
stack: nextjs
layer: both
sources:
  - research: wf-191ad75d (Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
  - research: nextjs-smells (Infos/knowledge/NextJS/deep-research-report.md)
tier: 3
triggers: [pages router, app router, migration, getServerSideProps, getStaticProps, _app, _document, next/router, next/navigation, route handlers, coexistence]
cross_stack_skills: []
updated: 2026-05-24
---
```

## ESTRUTURA OBRIGATORIA (4 secoes em EN)

1. `## When to consult` — <=5 bullets (Next 13+ project com Pages Router em manutencao; planejando migracao gradual; encontrando Pages padroes em greenfield code)
2. `## Senior patterns` — 3-5 patterns:
   - Migration mapping (tabela Pages API -> App API)
   - Gradual route-by-route migration
   - Coexistence strategy
   - getServerSideProps -> async Server Component
3. `## Anti-patterns` — 3-4: greenfield em Pages Router; migrar tudo de uma vez; tentar useState diretamente no equivalente RSC; manter `next/router` em rotas App
4. `## Decision criteria` — tabela `| If (Pages API)... | Then (App equivalent)... |`

Mais `## External references` (sem cross-stack — `cross_stack_skills: []`).

## HARD CAP

<=200 linhas. T3 migration e geralmente compacto — provavel ficar <150.

## REGRA DE FIDELIDADE (cole VERBATIM da compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source)

REGRA DE FIDELIDADE: se uma afirmacao tecnica nao esta literalmente ou parafraseavelmente na fonte declarada em `sources:`, NAO escreva, mesmo que voce saiba que e verdade. O verifier gate downstream marca como falha qualquer claim nao-rastreavel ao source — e voce gastara tempo no retrabalho. Quando em duvida sobre se um detalhe esta no source: omita o detalhe ou re-leia o source para confirmar.

Em paralelo: voce tem liberdade explicita de NAO COBRIR TUDO do template se source nao fornece material. Exemplo: se source nao documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — nao estime numeros proprios.

Detalhes plausiveis (ex: "10% overhead", "p-memoize como singleflight") sao mais perigosos que erros obvios, porque humanos e modelos passam batido na revisao visual. So o verifier source-traceability pega. Subagente fresh-context tem acesso ao source MAS tambem a todo seu treinamento; sem instrucao explicita, mescla os dois. Source-only-mode requer prompt explicito. Voce esta em source-only-mode.

## OUTPUT

Escreva em `knowledge/nextjs/atoms/pages-router-migration-tips.md`. Retorne resumo.

NAO escreva nada fora desse arquivo.
````

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** ja incluido — nao editar.
- **G2 do plano (200 linhas):** baixo risco — T3 migration costuma ser compacto. Tabela mapping pode ser longa mas vale a pena (alta densidade informacional).
- **G3 do plano (idioma EN):** corpo em EN.
- **G6 do plano (verifier scope):** auditado Senior + Anti + Decision.
- **Local — quando NAO usar greenfield Pages Router:** se source documentar manutencao only desde Next 13, registrar como anti-pattern de greenfield. NAO mencionar versoes especificas alem do que source documenta.
- **Local — tabela mapping em Decision criteria:** dado a natureza T3 (lookup migration), Decision criteria pode ser uma tabela densa de equivalencias Pages -> App. Aceitavel desde que dentro do hard cap.

---

## Verificacao

### Checklist

- [ ] Atom criado em `knowledge/nextjs/atoms/pages-router-migration-tips.md`
- [ ] Frontmatter com campos obrigatorios (em EN), `cross_stack_skills: []` vazio
- [ ] 4 secoes presentes em EN
- [ ] `wc -l` retorna <=200
- [ ] `bun run harness:validate` passa
- [ ] Bloco anti-drift presente no prompt do extrator

---

## Criterio de Aceite

**Por maquina:**

- `test -f knowledge/nextjs/atoms/pages-router-migration-tips.md` retorna 0
- `wc -l knowledge/nextjs/atoms/pages-router-migration-tips.md | awk '{ exit ($1 > 200) }'` retorna 0
- `bun run harness:validate` retorna sem erros
- `grep -q "## When to consult" knowledge/nextjs/atoms/pages-router-migration-tips.md && grep -q "## Senior patterns" knowledge/nextjs/atoms/pages-router-migration-tips.md && grep -q "## Anti-patterns" knowledge/nextjs/atoms/pages-router-migration-tips.md && grep -q "## Decision criteria" knowledge/nextjs/atoms/pages-router-migration-tips.md` retorna 0

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
