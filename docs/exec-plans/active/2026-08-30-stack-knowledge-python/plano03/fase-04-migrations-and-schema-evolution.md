# Fase 04: Átomo `migrations-and-schema-evolution` (T2)

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1h)
**Depende de:** Plano 02 completo (Wave 2 — independente das fases 01-03, 05-09 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/migrations-and-schema-evolution.md` — evolução de schema com
Alembic e zero-downtime (split 2/2 do report.md), PT-BR, ≤200 linhas, com nota explícita de
que a fonte assume PostgreSQL.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/migrations-and-schema-evolution.md` | Create | Átomo T2 destilado do split 2/2 da fonte |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte:** `Infos/knowledge/Python/deep-research-report.md` — **split 2/2** (G14).

**Seção da fonte a usar (SOMENTE esta):** "Migrations, schema e modelagem"

**Temas a cobrir:**

- Alembic autogenerate + `alembic check`
- Zero-downtime: rename / drop / mudança de tipo
- Expand-migrate-contract
- `CREATE INDEX CONCURRENTLY`
- Backfill em larga escala
- Constraints no DB vs validação na app
- Defaults
- Polimorfismo (modelagem)

**FRONTEIRA DO SPLIT (G14 — declarar no prompt do extrator):** esta fase é **evolução de
schema**. As seções de runtime ORM da MESMA fonte ("Transações, pooling e multi-tenancy",
"ORM, consultas e performance", "Lifecycle, dados especiais e NoSQL") pertencem à fase-03
(`sqlalchemy-async-and-orm`) — sessões, pooling, N+1, locking e afins NÃO entram aqui.

**Nota PostgreSQL (obrigatória):** a fonte declara PostgreSQL como escolha — o átomo carrega
nota explícita ("padrões assumem PostgreSQL, conforme a fonte"), em vez de generalizar para
qualquer banco.

**Dedup (G17):** o gate de migrations no pipeline de deploy (stage-gated) pertence à fase-08
(`deployment-and-production`) — aqui fica a mecânica de migração em si; referenciar.

---

## Frontmatter alvo

```yaml
---
topic: migrations-and-schema-evolution
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report.md
tier: 2
triggers: [alembic, migration, autogenerate, alembic check, zero downtime, expand contract, rename column, drop column, CREATE INDEX CONCURRENTLY, backfill, constraint, default, polimorfismo, schema]
related_skills: [/system-design, /architecture]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código; Wave 1 commitada (commit 1) e `harness:validate` verde.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 05-06 (Wave 2).

### Passo 3: Check estrutural + check de fronteira

Cap ≤200, 4 seções, frontmatter, zero placeholders. Check de fronteira G14 (espelho inverso da
fase-03):
`grep -iE "MissingGreenlet|selectinload|pool_size|max_overflow|optimistic locking|StreamingResponse" knowledge/python/atoms/migrations-and-schema-evolution.md`
→ zero matches (runtime ORM é fase-03).

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 2.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/migrations-and-schema-evolution.md` em PT-BR, destilado EXCLUSIVAMENTE
de:
  Infos/knowledge/Python/deep-research-report.md
  — USE SOMENTE a seção "Migrations, schema e modelagem".

FRONTEIRA DE SPLIT: esta é a metade EVOLUÇÃO DE SCHEMA da fonte. As seções de runtime ORM
(transações/pooling/multi-tenancy, consultas/performance, lifecycle/dados especiais) pertencem
a OUTRO átomo (sqlalchemy-async-and-orm) — NÃO extraia sessões, pooling, N+1, locking, JSONB
runtime ou streaming.

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

Temas: Alembic autogenerate + alembic check, zero-downtime rename/drop/tipo,
expand-migrate-contract, CREATE INDEX CONCURRENTLY, backfill em larga escala, constraints DB
vs validação app, defaults, polimorfismo.

Regras específicas:
- Inclua nota explícita: os padrões assumem PostgreSQL — é a escolha declarada da fonte.
- Claims "contestado" na fonte NUNCA viram regra dura (nota ou omissão).
- DEDUP: o gate de migração no pipeline de deploy pertence ao átomo deployment-and-production
  — aqui só a mecânica de migração; referencie.
- Cap 200 hard: excedente relevante LISTADO ao final da resposta (fora do átomo) p/ TODO.md.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G14 do plano (crítico aqui):** fronteira schema vs runtime — grep espelho no Passo 3;
  fase-03 e fase-04 juntas devem cobrir a fonte sem sobreposição.
- **G17 do plano:** gate de pipeline → fase-08; mecânica de migração fica aqui.
- **G7 do plano:** `updated:` com data real.
- **Local:** "constraints DB vs validação app" tem paralelo no átomo Rails
  (active-record-fundamentals, dupla camada) — NÃO importar o paralelo; extrair apenas o que a
  fonte Python diz (anti-drift).

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] Fronteira split (G14): grep runtime ORM (Passo 3) = 0
- [ ] Nota PostgreSQL presente no corpo
- [ ] Expand-migrate-contract coberto como padrão central (é o coração da seção-fonte)
- [ ] Referências externas apontam `sqlalchemy-async-and-orm` (runtime) e
  `deployment-and-production` (gate de pipeline)
- [ ] `sources:` = deep-research-report.md (path completo)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 2)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- Grep de fronteira (Passo 3) retorna zero

**Por humano:**
- Review da wave confirma: fase-03 + fase-04 particionam a fonte sem sobreposição nem buraco
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
