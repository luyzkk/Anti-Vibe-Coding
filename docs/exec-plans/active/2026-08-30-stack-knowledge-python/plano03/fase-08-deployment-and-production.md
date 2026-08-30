# Fase 08: Átomo `deployment-and-production` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 3 — independente das fases 01-07, 09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/deployment-and-production.md` — deploy e operação de FastAPI
em produção (servidores, Docker, CI, estratégias de release, secrets, health, observabilidade
de boot), PT-BR, ≤200 linhas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/deployment-and-production.md` | Create | Átomo T2 destilado da fonte abaixo |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte única:**
`Infos/knowledge/Python/compass_artifact_wf-69fdecd5-13b3-516b-86e7-7859d1c0c400_text_markdown.md`
(18 seções, com **tags de impacto inline** — aproveitá-las para priorizar sob o cap)

**Seções a cobrir:**

1. `--reload` em produção (anti-padrão)
2. Uvicorn workers vs Gunicorn + imagem tiangolo deprecada
3. Granian
4. pydantic-settings fail-fast
5. CI: `uv --locked` + cache por hash
6. Docker multi-stage com uv, non-root + tamanhos de imagem
7. Graceful shutdown: SIGTERM / preStop
8. Rolling / blue-green / canary
9. Migrations Alembic stage-gated + expand/contract (**só o gate de pipeline** — ver dedup)
10. Secrets managers + Trusted Publishing
11. Rollback
12. Health: liveness trivial vs readiness
13. structlog boot JSON
14. 12-factor
15. Cloud Run / Lambda-Mangum / Modal

**Dedup (G17 — declarar no prompt):**
- **Graceful shutdown / lifespan:** o MECANISMO (asyncio, lifespan handler) já está no piloto
  `async-and-concurrency` — AQUI fica o ângulo OPERACIONAL (SIGTERM, preStop hook, drain de
  conexões no orquestrador); referenciar o piloto para o mecanismo.
- **Migrations:** a mecânica detalhada (expand-migrate-contract, CONCURRENTLY, backfill) é da
  fase-04 (`migrations-and-schema-evolution`) — AQUI só o GATE de pipeline (migração
  stage-gated no deploy, ordem migração × rollout); referenciar a fase-04.
- **`uv --locked`/lockfile:** o contrato do lockfile é da fase-05
  (`dependencies-and-packaging-uv`) — aqui o uso em CI (cache por hash, `--locked` como
  verificação).

---

## Frontmatter alvo

```yaml
---
topic: deployment-and-production
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-69fdecd5-13b3-516b-86e7-7859d1c0c400_text_markdown.md
tier: 2
triggers: [deploy, produção, uvicorn, gunicorn, granian, workers, docker, multi-stage, non-root, pydantic-settings, graceful shutdown, SIGTERM, preStop, blue-green, canary, rollback, health check, liveness, readiness, structlog, 12-factor, Cloud Run, Lambda, Mangum, Modal, Trusted Publishing]
related_skills: [/infrastructure, /system-design]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código; Waves 1-2 commitadas. Ler piloto async e fases 04-05 commitadas para
anexar ao prompt o que NÃO repetir.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 07 e 09 (Wave 3).

### Passo 3: Check estrutural + check de dedup

Cap ≤200, 4 seções, frontmatter, zero placeholders. Dedup: mecânica de migração e mecanismo
de lifespan não re-explicados.

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 3.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/deployment-and-production.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/compass_artifact_wf-69fdecd5-13b3-516b-86e7-7859d1c0c400_text_markdown.md

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

Escopo: as 18 seções da fonte (--reload em prod, Uvicorn workers vs Gunicorn + imagem
tiangolo deprecada, Granian, pydantic-settings fail-fast, CI uv --locked + cache por hash,
Docker multi-stage uv non-root + tamanhos de imagem, graceful shutdown SIGTERM/preStop,
rolling/blue-green/canary, migrations Alembic stage-gated, secrets managers + Trusted
Publishing, rollback, health liveness trivial vs readiness, structlog boot JSON, 12-factor,
Cloud Run/Lambda-Mangum/Modal).

Regras específicas:
- A fonte tem TAGS DE IMPACTO inline — use-as para priorizar o que entra sob o cap 200 (maior
  impacto primeiro).
- DEDUP graceful shutdown: o MECANISMO (lifespan/asyncio) pertence ao átomo
  async-and-concurrency (anexo: patterns dele) — cubra AQUI só o ângulo operacional
  (SIGTERM, preStop, drain no orquestrador) e referencie o piloto.
- DEDUP migrations: a mecânica (expand-contract, CONCURRENTLY, backfill) pertence ao átomo
  migrations-and-schema-evolution — cubra AQUI só o gate de pipeline (stage-gated, ordem
  migração × rollout) e referencie.
- DEDUP lockfile: o contrato do uv.lock pertence ao átomo dependencies-and-packaging-uv —
  aqui só o uso em CI (cache por hash, --locked).
- Números de tamanho de imagem Docker: só os que a fonte traz.
- Claims "contestado" na fonte NUNCA viram regra dura.
- Versões inline no corpo, normalizadas para a mais recente citada.
- Cap 200 hard: excedente relevante LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G17 do plano (crítico aqui):** tripla fronteira — piloto async (mecanismo shutdown),
  fase-04 (mecânica de migração), fase-05 (contrato do lockfile). Anexar patterns commitados
  ao prompt no Passo 1.
- **G5 do plano:** 18 seções — usar as tags de impacto da própria fonte como critério de corte
  (espelho do P0-P3 da fase-02); excedente → TODO.md.
- **G7 do plano:** `updated:` com data real.
- **Local:** "imagem tiangolo deprecada" é claim datada — manter atribuída à fonte e com a
  versão/data que a fonte cita (anti-drift: não atualizar por conhecimento próprio).

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Dedup shutdown: só ângulo operacional; piloto async referenciado
- [ ] Dedup migrations: só gate de pipeline; `migrations-and-schema-evolution` referenciado
  (grep `CONCURRENTLY|backfill` no átomo = 0)
- [ ] Dedup lockfile: contrato em `dependencies-and-packaging-uv` referenciado
- [ ] Health liveness trivial vs readiness coberto (decisão frequente — candidato à tabela)
- [ ] Priorização visível pelas tags de impacto da fonte (spot-check)
- [ ] `sources:` = compass 69fdecd5 (path completo)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 3)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- `grep -icE "CONCURRENTLY|backfill" knowledge/python/atoms/deployment-and-production.md` = 0

**Por humano:**
- Review da wave confirma as três fronteiras de dedup
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
