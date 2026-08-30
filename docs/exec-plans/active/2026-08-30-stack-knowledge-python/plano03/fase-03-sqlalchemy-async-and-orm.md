# Fase 03: Átomo `sqlalchemy-async-and-orm` (T2) — flagged audit humano D11

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 1 — independente das fases 01-02, 04-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/sqlalchemy-async-and-orm.md` — SQLAlchemy 2.0 async em
runtime (sessões, queries, pooling, locking, multi-tenancy), PT-BR, ≤200 linhas, **flagged
para audit humano** (`flagged_for_human_audit: true` — D11; o audit em si é Plano 04 fase-06).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/sqlalchemy-async-and-orm.md` | Create | Átomo T2 destilado do split 1/2 da fonte |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte:** `Infos/knowledge/Python/deep-research-report.md` — **split 1/2** (G14).

**Seções da fonte a usar (SOMENTE estas três):**

1. "Transações, pooling e multi-tenancy"
2. "ORM, consultas e performance"
3. "Lifecycle, dados especiais e NoSQL"

**Temas a cobrir dentro delas:**

- SQLAlchemy 2.0 style
- N+1 / `selectinload`
- asyncio e lazy loading / `MissingGreenlet`
- `pool_size` / `max_overflow`
- Deadlock retry
- RLS para multi-tenancy
- Read replicas
- Repository pattern — **conflito Percival vs Bayer marcado como CONTESTADO na fonte** (G3:
  vira nota em Critérios de decisão, nunca regra dura)
- Bulk ops
- Soft delete
- Optimistic locking
- JSONB
- Sessão e `StreamingResponse`

**FRONTEIRA DO SPLIT (G14 — declarar no prompt do extrator):** esta fase é **runtime ORM**.
A seção "Migrations, schema e modelagem" da MESMA fonte pertence à fase-04
(`migrations-and-schema-evolution`) — Alembic, zero-downtime, backfill, constraints e
polimorfismo NÃO entram aqui. Claim de evolução de schema neste átomo é defeito de wave.

**Dedup (G17):**
- `MissingGreenlet`/lazy loading: o piloto `async-and-concurrency` e a fase-07 (smells) também
  orbitam o tema — AQUI é o dono do diagnóstico ORM (por que acontece na sessão async e como
  carregar corretamente); referenciar o piloto para o modelo de event loop.
- PERF-DB (fase-09) mede N+1/pooling — aqui fica a correção ORM; lá, medição/orçamento.

---

## Frontmatter alvo

```yaml
---
topic: sqlalchemy-async-and-orm
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report.md
tier: 2
triggers: [sqlalchemy, orm, async session, MissingGreenlet, lazy loading, selectinload, N+1, pool_size, max_overflow, deadlock, RLS, multi-tenancy, read replica, repository, bulk, soft delete, optimistic locking, JSONB, StreamingResponse]
related_skills: [/api-design, /system-design]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
flagged_for_human_audit: true
---
```

`flagged_for_human_audit: true` passa no validador (G8 — campos desconhecidos são ignorados);
adicionar também nota no corpo ("Átomo marcado para audit humano — D11"). O audit acontece no
Plano 04 fase-06.

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código; branch `feat/stack-knowledge-python-plano03`.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 01-02 (Wave 1).

### Passo 3: Check estrutural + check de fronteira

Cap ≤200, 4 seções, frontmatter (incl. flag), zero placeholders. Check de fronteira G14:
`grep -iE "alembic|autogenerate|expand.?migrate.?contract|CONCURRENTLY|backfill" knowledge/python/atoms/sqlalchemy-async-and-orm.md`
→ zero matches (migração é fase-04).

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 1.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/sqlalchemy-async-and-orm.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/deep-research-report.md
  — USE SOMENTE as seções: "Transações, pooling e multi-tenancy" + "ORM, consultas e
  performance" + "Lifecycle, dados especiais e NoSQL".

FRONTEIRA DE SPLIT: esta é a metade RUNTIME ORM da fonte. A seção "Migrations, schema e
modelagem" pertence a OUTRO átomo (migrations-and-schema-evolution) — NÃO extraia nada de
Alembic, zero-downtime, backfill, constraints de schema ou polimorfismo de modelagem.

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
pela fase, INCLUINDO flagged_for_human_audit: true) + corpo ≤200 linhas com as 4 seções:
## Quando consultar / ## Padrões sênior / ## Anti-padrões / ## Critérios de decisão
(+ ## Referências externas). Inclua no corpo a nota "Átomo marcado para audit humano (D11)".

Temas: 2.0 style, N+1/selectinload, asyncio e lazy loading/MissingGreenlet,
pool_size/max_overflow, deadlock retry, RLS multi-tenancy, read replicas, repository pattern,
bulk ops, soft delete, optimistic locking, JSONB, sessão e StreamingResponse.

Regras específicas:
- O conflito do repository pattern (Percival vs Bayer) está marcado como CONTESTADO na fonte:
  ele NUNCA vira regra dura — apresente as duas posições como nota em Critérios de decisão,
  atribuindo à fonte a marcação de contestado.
- Demais claims "contestado" seguem a mesma regra (nota ou omissão).
- Versões FastAPI/SQLAlchemy inline no corpo, normalizadas para a mais recente citada.
- DEDUP: modelo de event loop pertence ao átomo async-and-concurrency (referencie); medição de
  N+1/pooling pertence ao átomo performance-and-profiling (aqui fica a correção ORM).
- Cap 200 hard: excedente relevante é LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G3 do plano (crítico aqui):** Percival vs Bayer é o caso-teste do filtro "contestado" —
  o verifier e o audit humano (Plano 04 fase-06) vão checar exatamente isso.
- **G8 do plano:** `flagged_for_human_audit` no frontmatter + validador segue verde.
- **G14 do plano (crítico aqui):** fronteira runtime vs schema — grep no Passo 3.
- **G7 do plano:** `updated:` com data real.
- **Local:** erro em ORM corrompe dados (razão do flag D11) — na dúvida entre incluir um
  padrão agressivo (ex: bulk ops sem sessão) ou omitir, omitir e listar para o TODO.md.

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido COM `flagged_for_human_audit: true` (G8)

### Checklist específico da fase

- [ ] Fronteira split (G14): grep Alembic/autogenerate/expand-contract/CONCURRENTLY/backfill = 0
- [ ] Repository pattern aparece como nota de conflito contestado (Percival vs Bayer) em
  Critérios de decisão — NÃO como padrão nem anti-padrão prescritivo
- [ ] Nota "audit humano (D11)" presente no corpo
- [ ] MissingGreenlet coberto pelo ângulo ORM; modelo de event loop referenciado ao piloto
- [ ] `sources:` = deep-research-report.md (path completo)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 1)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- Grep de fronteira (Passo 3) retorna zero

**Por humano:**
- Review da wave confirma tratamento do contestado e a fronteira do split
- Gate final: verifier refined fase-10 (≥80%) + audit humano no Plano 04 fase-06 (assinatura
  STATE.md — bloqueia aprovação do batch da feature se reprovar)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
