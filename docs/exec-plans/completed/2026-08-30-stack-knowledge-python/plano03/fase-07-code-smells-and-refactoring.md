# Fase 07: Átomo `code-smells-and-refactoring` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 3 — independente das fases 01-06, 08-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/code-smells-and-refactoring.md` — smells Python/FastAPI e
refatorações canônicas passo-a-passo, PT-BR, ≤200 linhas, com dedup explícito contra o piloto
async e a fase-01 (arquitetura).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/code-smells-and-refactoring.md` | Create | Átomo T2 destilado da fonte abaixo |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte única:**
`Infos/knowledge/Python/compass_artifact_wf-7673ee63-9153-5e08-ac11-504af621c743_text_markdown.md`
(15 seções)

**Seções a cobrir:**

1. Smells de async/event loop
2. `MissingGreenlet` / lazy loading (ângulo de smell — ver dedup)
3. `response_model` como filtro de segurança
4. Lógica na rota (fat route)
5. `Depends` com `yield`
6. Refatorações canônicas passo-a-passo: `on_event`→`lifespan` / defaults→`Annotated` /
   `bump-pydantic`
7. Refactor seguro vs perigoso sem teste
8. Strangler fig com `WSGIMiddleware`
9. import-linter no CI (ângulo de métrica/refactor — ver dedup)
10. radon/xenon: complexidade × churn
11. Smells de código gerado por IA

**Dedup (G17 — declarar no prompt):**
- **Bloqueio de event loop e threadpool:** o dono é o piloto
  `knowledge/python/atoms/async-and-concurrency.md` — aqui os temas entram como SMELL
  (sintoma + rota de refactor), referenciando o piloto para o mecanismo. Não re-explicar o
  event loop.
- **import-linter:** também na fase-01 (`architecture-and-di-fastapi`). Divisão: fase-01 =
  arquitetura/contratos de camada; AQUI = métrica de débito e mecânica de refactor
  (import-linter no CI como trava de progresso do strangler/refactor).
- **MissingGreenlet:** diagnóstico ORM é da fase-03 (`sqlalchemy-async-and-orm`); aqui entra
  como smell reconhecível com encaminhamento.

---

## Frontmatter alvo

```yaml
---
topic: code-smells-and-refactoring
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-7673ee63-9153-5e08-ac11-504af621c743_text_markdown.md
tier: 2
triggers: [code smell, refactoring, fat route, on_event, lifespan, Annotated, bump-pydantic, strangler fig, WSGIMiddleware, import-linter, radon, xenon, complexidade, churn, código de IA, response_model, Depends yield]
related_skills: [/design-patterns, /architecture]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código; Waves 1-2 commitadas (commits 1-2) e `harness:validate` verde. Ler o
piloto `async-and-concurrency.md` e a fase-01 commitada para anexar ao prompt o que NÃO
repetir.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 08-09 (Wave 3).

### Passo 3: Check estrutural + check de dedup

Cap ≤200, 4 seções, frontmatter, zero placeholders. Dedup: o átomo não re-explica event
loop/threadpool nem contratos de camada — referencia.

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 3.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/code-smells-and-refactoring.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/compass_artifact_wf-7673ee63-9153-5e08-ac11-504af621c743_text_markdown.md

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

Formato: siga knowledge/rails/atoms/active-record-fundamentals.md — frontmatter (fornecido
pela fase) + corpo ≤200 linhas com as 4 seções obrigatórias + Referências externas.

Escopo: as 15 seções da fonte (smells async/event loop, MissingGreenlet/lazy loading,
response_model como filtro de segurança, lógica na rota, Depends com yield, refatorações
canônicas on_event→lifespan / defaults→Annotated / bump-pydantic, refactor seguro vs perigoso
sem teste, strangler fig WSGIMiddleware, import-linter no CI, radon/xenon complexidade ×
churn, smells de código de IA).

Regras específicas:
- DEDUP: bloqueio de event loop e threadpool JÁ estão no átomo async-and-concurrency (anexo:
  lista dos patterns dele) — trate-os como SMELL com encaminhamento e referencie o átomo; não
  re-explique o mecanismo. MissingGreenlet: diagnóstico ORM pertence a
  sqlalchemy-async-and-orm — aqui só o reconhecimento do smell.
- DEDUP import-linter: o átomo architecture-and-di-fastapi cobre contratos de camada; AQUI
  cubra o ângulo de métrica de débito e trava de refactor no CI. Não repita a configuração de
  camadas.
- As refatorações canônicas passo-a-passo (on_event→lifespan, defaults→Annotated,
  bump-pydantic) são o coração deste átomo — preserve o passo-a-passo da fonte.
- Claims "contestado" na fonte NUNCA viram regra dura.
- Versões (FastAPI, Pydantic) inline no corpo, normalizadas para a mais recente citada.
- Cap 200 hard: excedente relevante LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G17 do plano (crítico aqui):** dupla fronteira — piloto async (mecanismo) e fase-01
  (contratos de camada). O Passo 1 anexa os patterns já commitados ao prompt.
- **G7 do plano:** `updated:` com data real.
- **Local:** "smells de código de IA" conversa com a tese do plugin — bom candidato a
  Critérios de decisão; manter rastreável à fonte (não importar opinião do plugin — anti-drift).
- **Local:** radon/xenon trazem números (thresholds de complexidade) — só citar números que a
  fonte traz.

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Dedup async: mecanismo de event loop não re-explicado; piloto referenciado
- [ ] Dedup import-linter: sem configuração de camadas (fase-01); ângulo métrica/trava de CI
  presente
- [ ] As 3 refatorações canônicas (on_event→lifespan, defaults→Annotated, bump-pydantic)
  presentes com passo-a-passo
- [ ] Referências externas citam `async-and-concurrency`, `architecture-and-di-fastapi` e
  `sqlalchemy-async-and-orm`
- [ ] `sources:` = compass 7673ee63 (path completo)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 3)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`

**Por humano:**
- Review da wave confirma as duas fronteiras de dedup e o passo-a-passo das refatorações
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
