# Plano 01: MH-1 Lista completa de docs (Tracer Bullet)

**Feature:** populate-plan-andre-port ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02, Plano 03, Plano 04

---

## O que este plano entrega

Estabelece a lista canonica de docs populaveis (>= 12 fases) e o gate "nunca diminuir" como teste
automatizado. Sem este plano, qualquer melhoria em templates / instrucoes / discovery cai em vazio
porque o gerador continua emitindo o subconjunto antigo.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| `populate-plan-generator.ts` v2 | Plano 03 fase-05 anterior | pronto |
| `stack-aware-input-paths.ts` ja exporta `CanonicalDoc` | Plano 03 fase-02 anterior | pronto |
| `TEMPLATE_MANIFEST` ja inclui README.md (linha 86) | feature anterior | pronto |
| Step 91 (`91-generate-populate-plan.ts`) ja chama generatePopulatePlanV2 | feature anterior | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `EXCLUDED_FROM_POPULATION_V2` reduzido (so COMPOUND_ENGINEERING) | Plano 02 (template renderer ve lista correta) |
| `CanonicalDoc` type estendido com PRODUCT_SENSE.md e README.md | Plano 03 (instrucoes imperativas por doc), Plano 04 (paths por doc) |
| `tests/e2e/populate-plan-parity.test.ts` (esqueleto) | Plano 02 fase-04, Plano 03 fase-03, Plano 04 fase-03 (sub-asserts incrementais) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-lista-completa-de-docs.md | EXCLUDED reduzido; CanonicalDoc estendido; TEMPLATE_MANIFEST confirmado para ARCHITECTURE/AGENTS/.claude/CLAUDE | 1.5h | — |
| 02 | fase-02-parity-test-minimo.md | `tests/e2e/populate-plan-parity.test.ts` com 2 asserts iniciais (phases.length >= 12; EXCLUDED nao contem PRODUCT_SENSE/README) | 1.5h | fase-01 |
| 03 | fase-03-fix-testes-existentes.md | `populate-plan-generator.test.ts` linhas 44-54 atualizado (flip: COMPOUND_ENGINEERING fora; PRODUCT_SENSE/README dentro) + suite verde | 1h | fase-01 |

---

## Grafo de Fases

```
fase-01 (lista-completa-de-docs)
    |
    +--------------------+
    |                    |
    v                    v
fase-02 (parity-test) fase-03 (fix-testes-existentes)
```

**Paralelismo possivel:** fase-02 e fase-03 sao independentes apos fase-01. Podem ser executadas
em paralelo (tocam arquivos disjuntos: tests/e2e/ vs skills/init/lib/populate-plan-generator.test.ts).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-01 + fase-02 combinados — fase-01 muda o codigo de producao
(lista de docs); fase-02 ancora a mudanca em teste E2E. fase-03 elimina o falso positivo no teste
unitario existente.

---

## Gotchas Conhecidos

- **G1 (Risco PRD alta prob):** Step 90 (`90-final-validation.ts`) tem check bloqueante em
  `.claude/knowledge/{stack}/INDEX.md` desde V6.6.0. Em ambiente de teste o cache global pode estar
  vazio e dispara AbortError code:1 ANTES do Step 91 rodar. Mitigacao em fase-02: pre-popular stub
  no fixture OU chamar `generatePopulatePlanV2()` direto sem o pipeline `/init` inteiro.
  Documentado no PRD secao Riscos.
- **G2 (D14 obsoleto):** Comentario na linha 59 de `populate-plan-generator.ts` diz "D14 do PRD
  mantem filosoficos sem populate". Esse D14 e do PRD ANTERIOR (Plano 03 antigo). O PRD ATUAL (D5)
  reverte: PRODUCT_SENSE.md e README.md voltam para populate; so COMPOUND_ENGINEERING.md fica de
  fora. fase-01 substitui o comentario com datacao 2026-05-19 anulando o anterior.
- **G3 (.claude/CLAUDE.md sem opt-out — D6 do PRD):** `.claude/CLAUDE.md` deve ser obrigatorio no
  plano. AGENTS.md e CLAUDE.md ja estao no `CanonicalDoc` union, mas precisam ter entry no
  `TEMPLATE_MANIFEST` apontando para `.claude/CLAUDE.md` (destino). fase-01 confirma e adiciona se
  faltar.
- **G4 (regressao no teste unitario existente):** O teste em `populate-plan-generator.test.ts`
  linha 44-54 hoje afirma que PRODUCT_SENSE e README ESTAO ausentes — assert vai virar verde por
  acidente apos fase-01 (a lista some), entao deve quebrar antes ou ser atualizado em fase-03. Para
  evitar dupla fonte de erro: fase-03 reescreve o teste para refletir o comportamento novo.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
