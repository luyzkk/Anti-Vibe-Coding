# Fase 01: Átomo `architecture-and-di-fastapi` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 1 — independente das fases 02-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/architecture-and-di-fastapi.md` — arquitetura e organização de
projetos FastAPI (pastas, camadas, DI, enforcement por tooling), PT-BR, ≤200 linhas, 4 seções
obrigatórias, rastreável ao compass 24cad57e.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/architecture-and-di-fastapi.md` | Create | Átomo T2 destilado da fonte abaixo |

Nenhum outro arquivo. NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte única:**
`Infos/knowledge/Python/compass_artifact_wf-24cad57e-dcd9-5717-bc61-b184f420ce5e_text_markdown.md`
("Arquitetura e Organização", 13 seções)

**Seções a cobrir:**

1. Estrutura de pastas por domínio vs por tipo
2. src layout
3. Camadas router/service/data
4. DI com `Annotated`, dependencies com `yield`, cache por request
5. Convention-over-configuration
6. `APIRouter`, `lifespan`, uv workspaces
7. Repository/Unit-of-Work — e quando NÃO criar
8. Fat routers (anti-padrão)
9. Enforcement de camadas por tooling: import-linter, tach, Ruff TID251-252
10. Adapters para SDKs de terceiros
11. ADRs (Nygard/MADR)
12. §12 — tells de dev vindo de Django/Spring/Flask/Node (**ver filtro abaixo**)

**Filtro obrigatório na §12 (tells):** a própria fonte marca parte dos itens como fracos
("parcialmente atestado", "ilustrativo"). O extrator DEVE pular os itens fracos ou rebaixá-los a
nota explícita ("a fonte marca como ilustrativo") — nunca promovê-los a padrão/anti-padrão
prescritivo. Mesmo espírito do G3 (contestado nunca vira regra dura).

**Dedup (G17):**
- import-linter/tach/Ruff TID: AQUI entra o ângulo de **arquitetura** (contratos de camada,
  enforcement de fronteiras). A fase-07 (smells) cobre o ângulo de **métrica de débito e
  mecânica de refactor** — não antecipar esse conteúdo aqui.
- Mecânica de `lifespan` (startup/shutdown async): o dono é o piloto
  `knowledge/python/atoms/async-and-concurrency.md` — aqui só o papel arquitetural do lifespan
  na composição da app; referenciar o piloto em Referências externas.

---

## Frontmatter alvo

```yaml
---
topic: architecture-and-di-fastapi
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-24cad57e-dcd9-5717-bc61-b184f420ce5e_text_markdown.md
tier: 2
triggers: [arquitetura, estrutura de pastas, src layout, camadas, router, service, repository, unit of work, dependency injection, Annotated, Depends, yield, APIRouter, lifespan, import-linter, tach, ADR, fat router]
related_skills: [/architecture, /design-patterns]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

Versões FastAPI citadas pela fonte ficam inline no corpo (ex: "desde 0.118") — D9, G4.

---

## Implementacao

### Passo 1: Pré-flight da wave

Confirmar precondições no código (não no MEMORY): `ls knowledge/python/atoms/` mostra os 6 T1;
`git log --oneline -5` na branch `feat/stack-knowledge-python-plano03`.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Preencher o prompt abaixo e spawnar o extrator (paralelo com fases 02-03 na Wave 1).

### Passo 3: Check estrutural (por máquina, nesta fase)

Cap ≤200 linhas de corpo, 4 seções obrigatórias presentes, frontmatter completo, zero
placeholders `[A DEFINIR]`, §12 sem tells fracos como regra.

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 1 (junto com fases 02-03).

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/architecture-and-di-fastapi.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/compass_artifact_wf-24cad57e-dcd9-5717-bc61-b184f420ce5e_text_markdown.md

REGRA DE FIDELIDADE (compound lesson
docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md — verbatim):
"REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier gate
downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo no
retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia o
source para confirmar."

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
"Se source não documenta o overhead quantitativo de uma API, descreva a API qualitativamente
(como a fonte faz) — não estime números próprios."

Formato: siga o formato de referência knowledge/rails/atoms/active-record-fundamentals.md —
frontmatter (fornecido pela fase) + corpo ≤200 linhas com EXATAMENTE estas 4 seções:
## Quando consultar / ## Padrões sênior / ## Anti-padrões / ## Critérios de decisão
(+ ## Referências externas ao final, com related skills e audit trail dos sources).

Escopo: as 13 seções de "Arquitetura e Organização" listadas na fase (pastas domínio vs tipo,
src layout, camadas router/service/data, DI Annotated/yield/cache por request,
convention-over-configuration, APIRouter/lifespan/uv workspaces, repository/UoW e quando NÃO
criar, fat routers, enforcement import-linter/tach/Ruff TID251-252, adapters p/ SDKs,
ADRs Nygard/MADR, tells §12).

Regras específicas:
- §12 (tells Django/Spring/Flask/Node): itens que o PRÓPRIO autor marca como "parcialmente
  atestado" ou "ilustrativo" devem ser PULADOS ou rebaixados a nota explícita — nunca virar
  padrão/anti-padrão prescritivo.
- Claims marcadas "contestado" na fonte NUNCA viram regra dura — viram nota em Critérios de
  decisão ou são omitidas.
- Versões FastAPI: inline no corpo ("desde 0.x") — nunca em campo de frontmatter.
- DEDUP: mecânica de lifespan pertence ao átomo async-and-concurrency (referencie-o); aqui só
  o papel arquitetural. Enforcement por tooling: cubra o ângulo de contratos de camada; o
  ângulo de métrica de débito/refactor pertence ao átomo code-smells-and-refactoring.
- Cap 200 é hard: se material relevante não couber, LISTE o excedente ao final da sua resposta
  (fora do átomo) para registro no TODO.md — não esprema nem corte silenciosamente.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim no prompt — já embutido acima; não parafrasear.
- **G3 do plano:** contestado/fraco (§12) nunca vira regra dura.
- **G5 do plano:** cap 200 hard; excedente → TODO.md.
- **G7 do plano:** `updated:` com a data real da execução.
- **G17 do plano:** dedup lifespan → piloto async; import-linter dividido com fase-07.
- **Local:** a fonte é densa em enforcement por tooling — resistir a virar um átomo "de
  ferramentas"; o centro do átomo é a decisão arquitetural (camadas, DI, quando NÃO abstrair).

---

## Verificacao

### Gate de conteúdo (substitui RED/GREEN — ver TDD Strategy do README)

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido: `bun test atoms-frontmatter-validator` segue verde com o novo átomo

### Checklist específico da fase

- [ ] §12: nenhum tell marcado "parcialmente atestado"/"ilustrativo" aparece como padrão ou
  anti-padrão — apenas como nota (ou omitido)
- [ ] Repository/UoW inclui o "quando NÃO criar" da fonte (não só o pattern)
- [ ] Referências externas citam `async-and-concurrency` (lifespan) e apontam a divisão com
  `code-smells-and-refactoring` (tooling de fronteira)
- [ ] `sources:` aponta exatamente o compass 24cad57e (path completo `Infos/knowledge/Python/...`)
- [ ] Nenhuma versão de FastAPI em campo de frontmatter (inline apenas — D9)
- [ ] `bun run harness:validate` verde (rodado na wave, antes do commit 1)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo `knowledge/python/atoms/architecture-and-di-fastapi.md` existe, ≤200 linhas de corpo,
  passa `validateAtomFrontmatter` e `bun run harness:validate`
- `grep -iE "parcialmente atestado|ilustrativo" knowledge/python/atoms/architecture-and-di-fastapi.md`
  só retorna ocorrências em contexto de nota (ou nada)

**Por humano:**
- Review da wave confirma: escopo respeitado, dedup aplicado, sem conteúdo fora da fonte
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
