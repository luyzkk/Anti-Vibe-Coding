# Fase 09: Átomo `performance-and-profiling` (T2) — IDs `PERF-*` preservados

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** S (~1.5h)
**Depende de:** Plano 02 completo (Wave 3 — independente das fases 01-08 deste plano)
**Visual:** false

---

## O que esta fase entrega

Átomo T2 `knowledge/python/atoms/performance-and-profiling.md` — performance e profiling de
serviços Python/FastAPI (medição, memória, boot, GC, serialização, sizing, cache), PT-BR,
≤200 linhas, PRESERVANDO os IDs canônicos `PERF-<CATEGORIA>-<NN>` da fonte (G16).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/performance-and-profiling.md` | Create | Átomo T2 destilado da fonte abaixo |

NÃO tocar `INDEX.md` (G11).

---

## Fonte e Escopo de Extração

**Fonte única:** `Infos/knowledge/Python/deep-research-report (1).md`
(24 regras com IDs canônicos `PERF-<CATEGORIA>-<NN>`)

**Categorias/temas a cobrir:**

- **PERF-PROFILE** — py-spy / cProfile / `perf -X perf_jit`
- **PERF-MEM** — tracemalloc vs Memray
- **PERF-BOOT** — `importtime`
- **PERF-GC** — `gc.freeze` / COW
- **PERF-JSON / PERF-STREAM / PERF-COMPRESS** — serialização, streaming, compressão
- **PERF-SERVER** — sizing por benchmark, não CPU×N
- **PERF-CACHE** — stampede + stale-while-revalidate
- **PERF-DB** — ver dedup abaixo
- Mapa canônico de ferramentas: pergunta → ferramenta

**PRESERVAÇÃO DE IDs (G16 — regra central da fase):** os padrões destilados PRESERVAM o ID
canônico de origem (ex: "**PERF-CACHE-02** — stampede..."). Os IDs são a chave de
rastreabilidade do verifier e o link de volta à fonte — removê-los ou renumerá-los é defeito.

**Dedup (G17 — declarar no prompt):** **PERF-DB** toca N+1/pooling, que são da fase-03
(`sqlalchemy-async-and-orm`). Divisão: AQUI fica o ângulo de **medição e orçamento**
(como detectar, como orçar); a **correção ORM** (selectinload, pool sizing) fica lá —
referenciar.

---

## Frontmatter alvo

```yaml
---
topic: performance-and-profiling
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report (1).md
tier: 2
triggers: [performance, profiling, py-spy, cProfile, perf_jit, tracemalloc, memray, importtime, gc.freeze, COW, serialização, orjson, streaming, compressão, sizing, benchmark, cache stampede, stale-while-revalidate, PERF, orçamento de latência]
related_skills: [/system-design, /infrastructure]
updated: { data real de execução — G7 }
python_versions: ['>=3.11']
---
```

Atenção ao path com espaço e parênteses — `deep-research-report (1).md` — copiar exato no
`sources:` (é assim que o arquivo se chama em `Infos/knowledge/Python/`).

---

## Implementacao

### Passo 1: Pré-flight da wave

Precondições no código; Waves 1-2 commitadas. Ler `sqlalchemy-async-and-orm.md` commitado
(Wave 1) para anexar ao prompt o que o PERF-DB não deve repetir.

### Passo 2: Invocar subagente extrator com o prompt-esqueleto

Paralelo com fases 07-08 (Wave 3).

### Passo 3: Check estrutural + check de IDs

Cap ≤200, 4 seções, frontmatter, zero placeholders. Check de IDs:
`grep -oE "PERF-[A-Z]+-[0-9]+" knowledge/python/atoms/performance-and-profiling.md | sort -u`
→ IDs presentes e idênticos aos da fonte (spot-check contra a fonte; nenhum ID inventado).

### Passo 4: harness:validate na wave

`bun run harness:validate` verde antes do commit 3.

---

## Prompt-esqueleto do extrator

```text
Você é um extrator de knowledge atoms. Escreva o átomo
`knowledge/python/atoms/performance-and-profiling.md` em PT-BR, destilado EXCLUSIVAMENTE de:
  Infos/knowledge/Python/deep-research-report (1).md

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

Escopo: as 24 regras com IDs PERF-<CATEGORIA>-<NN> (PERF-PROFILE py-spy/cProfile/perf -X
perf_jit; PERF-MEM tracemalloc vs Memray; PERF-BOOT importtime; PERF-GC gc.freeze/COW;
PERF-JSON/STREAM/COMPRESS; PERF-SERVER sizing por benchmark não CPU×N; PERF-CACHE stampede +
stale-while-revalidate; PERF-DB) + o mapa canônico de ferramentas pergunta→ferramenta.

Regras específicas:
- PRESERVE os IDs canônicos PERF-* da fonte em cada padrão destilado (ex: "PERF-CACHE-02 —
  ..."). NÃO renumere, NÃO invente IDs, NÃO omita o ID de um padrão que entra no átomo.
- DEDUP PERF-DB: N+1/pooling têm correção ORM no átomo sqlalchemy-async-and-orm (anexo:
  patterns dele) — cubra AQUI o ângulo de MEDIÇÃO e ORÇAMENTO (detectar/orçar) e referencie o
  átomo ORM para a correção.
- O mapa pergunta→ferramenta é candidato natural à seção Critérios de decisão (tabela).
- Números quantitativos: só os que a fonte traz.
- Claims "contestado" na fonte NUNCA viram regra dura.
- Cap 200 hard: se nem todas as 24 regras couberem, priorize por categoria coberta (nenhuma
  categoria PERF-* pode ficar sem representação) e LISTE o excedente ao final da resposta
  (fora do átomo) p/ TODO.md, com os IDs das regras cortadas.
- NÃO tocar INDEX.md nem qualquer outro arquivo.
```

---

## Gotchas

- **G2 do plano:** anti-drift verbatim — embutido.
- **G16 do plano (crítico aqui):** IDs `PERF-*` preservados — check por grep no Passo 3;
  a fase-10 re-checa por amostragem contra a fonte.
- **G17 do plano:** PERF-DB = medição/orçamento aqui, correção ORM na fase-03.
- **G5 do plano:** 24 regras sob cap 200 — cortar por regra (mantendo toda categoria
  representada), nunca cortar os IDs das que ficam; excedente com IDs no TODO.md.
- **G7 do plano:** `updated:` com data real.
- **Local:** o path da fonte tem espaço + parênteses — `deep-research-report (1).md` — atenção
  ao copiar para `sources:` e para comandos shell (quoting).

---

## Verificacao

### Gate de conteúdo

- [ ] Check estrutural: corpo ≤200 linhas, 4 seções obrigatórias, zero `[A DEFINIR]`
- [ ] Frontmatter válido (`bun test atoms-frontmatter-validator` verde)

### Checklist específico da fase

- [ ] IDs `PERF-*` presentes nos padrões destilados; spot-check de 3 IDs contra a fonte
  (mesmo ID, mesma regra); nenhum ID inventado/renumerado
- [ ] Toda categoria PERF-* da fonte tem ≥1 representação no átomo (ou excedente justificado
  no TODO.md com IDs)
- [ ] PERF-DB: só medição/orçamento; `sqlalchemy-async-and-orm` referenciado
- [ ] Mapa pergunta→ferramenta representado em Critérios de decisão
- [ ] `sources:` = `Infos/knowledge/Python/deep-research-report (1).md` (path exato, com
  espaço e parênteses)
- [ ] `bun run harness:validate` verde (na wave, antes do commit 3)

---

## Criterio de Aceite

**Por maquina:**
- Arquivo existe, ≤200 linhas de corpo, passa `validateAtomFrontmatter` e `harness:validate`
- `grep -cE "PERF-[A-Z]+-[0-9]+" knowledge/python/atoms/performance-and-profiling.md` ≥ 8
  (padrões destilados carregam seus IDs)

**Por humano:**
- Review da wave confirma preservação de IDs e a fronteira PERF-DB
- Gate final de fidelidade: verifier refined na fase-10 (≥80%)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
