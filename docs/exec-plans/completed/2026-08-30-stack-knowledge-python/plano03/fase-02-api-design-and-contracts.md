# Fase 02: Átomo `api-design-and-contracts` (T2) — R4: cap vigiado

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 1 — independente das fases 01, 03-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/api-design-and-contracts.md` — design, versionamento e
contratos de APIs REST em FastAPI, PT-BR, ≤200 linhas, destilado de 39 regras priorizadas
(P0-P3) do report3 + pilares do report2, SEM as seções GraphQL/gRPC/tRPC (D6/G15).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/api-design-and-contracts.md` | Create | Átomo T2 destilado das fontes abaixo |
| `TODO.md` (raiz) | Modify (provável) | Excedente de cap registrado como backlog (política G5) |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte PRIMÁRIA:** `Infos/knowledge/Python/deep-research-report3.md`
("design, versionamento e contratos de APIs" — 39 regras com prefixo de domínio e priorização
P0-P3)

**Fonte complementar:** `Infos/knowledge/Python/deep-research-report2.md`
(pilares routing / `response_model` / OpenAPI; mudanças de `include_router` na 0.137)

**Temas a cobrir (do report3, guiado por P0-P3):**

- REST resource design
- Evolução aditiva de contratos
- Paginação: cursor vs offset
- Idempotency keys com claim atômico
- RFC 9457 (Problem Details) + `RequestValidationError`
- ETag / `If-Match`
- OpenAPI: `operationId` estável
- Schema-first vs code-first
- Webhooks: assinatura sobre raw body + dedupe
- LROs (long-running operations) com 202
- Auth como dependency
- JWT: validação completa
- Rate limiting / SlowAPI

**EXCLUSÃO EXPLÍCITA (D6/G15):** as seções **GraphQL, gRPC/Protobuf e tRPC** do report3 NÃO
entram neste átomo — são o átomo T3 dedicado `graphql-grpc-contracts` (Plano 04 fase-03).
Deixá-las intocadas na fonte.

**Gestão do cap (R4/G5):** 39 regras não cabem em 200 linhas. Usar a priorização P0-P3 DA
PRÓPRIA FONTE como critério de sobrevivência: P0/P1 entram; P2 entram se couber; P3 só se
sobrar espaço ou como linha na tabela de Critérios de decisão. Todo excedente relevante é
listado pelo extrator e registrado no `TODO.md` — nunca espremido nem descartado em silêncio.

**Dedup (G17):** WebSockets/SSE/streaming já foram absorvidos pelo piloto
`async-and-concurrency` (decisão D4 do CONTEXT) — se o report3 tocar nesses temas, referenciar
o piloto em vez de duplicar.

---

## Frontmatter alvo

```yaml
---
topic: api-design-and-contracts
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report3.md
  - Infos/knowledge/Python/deep-research-report2.md
tier: 2
triggers: [api design, REST, versionamento, contrato, paginação, cursor, offset, idempotency, RFC 9457, problem details, ETag, If-Match, OpenAPI, operationId, webhook, assinatura, 202, LRO, JWT, rate limiting, SlowAPI, response_model, include_router]
related_skills: [/api-design, /security]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

Versões FastAPI (ex: include_router 0.137) inline no corpo — D9, G4 (se as fontes divergirem
de versão, normalizar para a mais recente citada).

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código (`ls knowledge/python/atoms/` — 6 T1 presentes; branch correta).

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 01 e 03 (Wave 1).

### Passo 3: Check estrutural + grep de exclusão

Cap ≤200, 4 seções, frontmatter, zero placeholders. Grep obrigatório:
`grep -iE "graphql|grpc|protobuf|trpc|strawberry" knowledge/python/atoms/api-design-and-contracts.md`
→ zero matches (aceita-se no máximo uma referência de encaminhamento ao átomo T3, sem conteúdo).

### Passo 4: Registrar excedente no TODO.md

Se o extrator reportou regras que não couberam, adicionar ao `TODO.md` da raiz com prefixo
`[stack-knowledge-python][api-design]` e o ID/prefixo de domínio da regra na fonte.

### Passo 5: harness:validate na wave

`bun run harness:validate` verde antes do commit 1.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/api-design-and-contracts.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  PRIMÁRIA:     Infos/knowledge/Python/deep-research-report3.md
  COMPLEMENTAR: Infos/knowledge/Python/deep-research-report2.md

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
pela fase) + corpo ≤200 linhas com as 4 seções obrigatórias:
## Quando consultar / ## Padrões sênior / ## Anti-padrões / ## Critérios de decisão
(+ ## Referências externas ao final).

Escopo: as 39 regras do report3 (REST resource design, evolução aditiva, paginação cursor vs
offset, idempotency keys com claim atômico, RFC 9457 + RequestValidationError, ETag/If-Match,
OpenAPI/operationId estável, schema-first vs code-first, webhooks assinatura sobre raw body +
dedupe, LROs 202, auth como dependency, JWT validação completa, rate limiting/SlowAPI) +
pilares routing/response_model/OpenAPI do report2 (incl. mudanças de include_router na 0.137).

Regras específicas:
- EXCLUSÃO OBRIGATÓRIA: NÃO extraia as seções GraphQL, gRPC/Protobuf e tRPC do report3 — elas
  pertencem a outro átomo (graphql-grpc-contracts, plano futuro). Zero conteúdo desses temas.
- CAP VIGIADO: 39 regras > 200 linhas. Use a priorização P0-P3 DA FONTE: P0/P1 entram; P2 se
  couber; P3 vira linha de tabela ou sai. LISTE ao final da sua resposta (fora do átomo) toda
  regra relevante que não coube, com o prefixo de domínio/prioridade da fonte, para o TODO.md.
- Claims marcadas "contestado" na fonte NUNCA viram regra dura.
- Versões FastAPI inline no corpo; divergência entre report2/report3 → mais recente citada.
- DEDUP: WebSockets/SSE/streaming pertencem ao átomo async-and-concurrency — referencie-o.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido no prompt.
- **G5 do plano (crítico aqui — R4):** este é o átomo com maior risco de estouro do plano
  inteiro. A priorização P0-P3 é a ferramenta de corte; o TODO.md é a válvula.
- **G15 do plano:** exclusão GraphQL/gRPC/tRPC — grep de conferência no Passo 3 e na fase-10.
- **G4 do plano:** report2 e report3 podem divergir em versão de FastAPI — normalizar.
- **G7 do plano:** `updated:` com data real.
- **Local:** duas fontes → o verifier rastreará claims contra AMBAS; manter a ordem
  primária/complementar no `sources:` como está no frontmatter alvo.

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Grep GraphQL/gRPC/tRPC/Strawberry/Protobuf = zero conteúdo (exclusão D6 respeitada)
- [ ] Sinal visível do uso de P0-P3: os padrões do átomo correspondem majoritariamente a
  regras P0/P1 da fonte (spot-check de 3 padrões contra a fonte)
- [ ] Excedente de cap registrado no `TODO.md` com prefixo `[stack-knowledge-python][api-design]`
  (ou nota explícita de que tudo coube)
- [ ] `sources:` com os 2 paths na ordem primária → complementar
- [ ] WebSockets/SSE apenas como referência ao piloto async (sem duplicação)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 1)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- `grep -icE "graphql|grpc|trpc" knowledge/python/atoms/api-design-and-contracts.md` = 0
  (tolerada 1 linha de encaminhamento ao átomo T3, validada por humano)

**Por humano:**
- Review da wave confirma corte por P0-P3 e excedente no TODO.md
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
