---
title: "Subagente extrator injeta 'verdades conhecidas' não-presentes no source"
category: processo
tags: [subagents, extractor, knowledge-atoms, source-fidelity, prompt-engineering, anti-drift]
created: "2026-05-16"
---

## Problem

Em Plano 04 (Atom Batch A — extração de 5 átomos de conhecimento Node+TS de fontes deep-research), 2 de 5 subagentes extratores (`plan-executor` spawnados em paralelo) **injetaram detalhes técnicos plausíveis mas não-presentes na fonte declarada**:

| Atomo | Claim injetado | Source não cobre |
|---|---|---|
| state-and-caching (fase-04) | `AsyncLocalStorage tem ~10% overhead em hot path` | Source diz apenas "significant optimizations"; Node 24+ AsyncContextFrame — sem número quantitativo |
| state-and-caching (fase-04) | `p-memoize como singleflight local` | Source usa `Map<key, Promise<T>>` manual; p-memoize **não é mencionado** |
| code-smells-catalog (fase-05) | `enum: IIFE emitido, reverse mapping, não tree-shakes, incompatível com isolatedModules/esbuild` | Source só cobre `--erasableSyntaxOnly` (TS 5.8) e `--experimental-strip-types` (Node) |
| code-smells-catalog (fase-05) | `"Smell é sinal de risco, não erro confirmado" como anti-pattern` | Source usa categorias quick-win/strategic/defer com ~8% defer; não articula essa distinção editorial |

Todos esses claims são **factualmente corretos** (verdades aceitas na comunidade Node+TS), mas **não aparecem na fonte que o frontmatter `sources:` declara como ground truth**. O verifier subagente (que checa rastreabilidade ao source) marca como "não encontrada" — corretamente sob o protocolo.

**Custo:** rework cirúrgico em 2 atoms + 2 ciclos de verifier extras (~30min adicionais em sizing planejado de 1.5h para fase-06).

**Causa raiz:** prompt do extrator dizia "leia source, escreva atom seguindo template piloto". Subagente, sendo capaz, enriquece o atom com detalhes "óbvios para senior Node+TS" que ele sabe que são verdade — sem perceber que o gate downstream (verifier) exige source-traceability literal.

## Solution

**Adicionar instrução anti-drift explícita ao prompt do extrator subagente.** Antes da invocação, incluir:

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na fonte declarada em `sources:`, **NÃO escreva**, mesmo que você saiba que é verdade. O verifier gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia o source para confirmar."

Em paralelo, no prompt: dar ao subagente **liberdade explícita de não cobrir tudo do template** se source não fornece material. Exemplo: "se source não documenta o overhead quantitativo de uma API, descreva a API qualitativamente (como a fonte faz) — não estime números próprios."

Em Plano 04 esta instrução foi descoberta tarde (em MEMORY.md como GT-1 + DEV-2). Para Plano 05/06 (próximos batches), o prompt já é construído com a instrução desde a invocação inicial.

## Prevention

1. **Anti-drift como cláusula padrão de prompts de extração:** qualquer subagente que faça "leia source X, produza artefato Y derivado" deve receber a regra de fidelidade no prompt. Não é opcional — é gate de qualidade.

2. **Detectar plausibilidade ≠ fidelidade:** detalhes plausíveis (ex: "10% overhead") são **mais perigosos** que erros óbvios, porque humanos e modelos passam batido na revisão visual. Só o verifier source-traceability pega.

3. **Esta lição se aplica a:** extração de docs técnicos para skills, geração de ADRs a partir de discussões, criação de runbooks a partir de incident reports, knowledge atoms (Planos 05 e 06 herdam), qualquer pipeline LLM→artefato→verifier-gate.

4. **Acionador de captura:** quando o verifier marcar ≥2 claims como "não encontrada" em runs paralelos do mesmo batch, suspeitar de drift de extrator (não de bug pontual em 1 atom). Se confirmado, ajustar prompt do extrator antes do próximo batch — não só rework dos atoms afetados.

5. **Anti-pattern relacionado:** "subagente fresh-context é equivalente a senior engineer com source aberta" — não é. Subagente fresh-context tem acesso ao source MAS também a todo seu treinamento; sem instrução explícita, ele mescla os dois. Source-only-mode requer prompt explícito.

6. **Companion lesson:** [`2026-05-16-verifier-protocol-technical-sections-only.md`](2026-05-16-verifier-protocol-technical-sections-only.md) — o verifier subagente também precisou de refinamento de protocolo neste mesmo plano. Os dois subagentes (extrator + verifier) formam um par de gate; ajustar só um deixa o outro descalibrado.
