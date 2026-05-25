---
title: "Workflow de extração de stack knowledge validado em escala: parallel waves + anti-drift + verifier batch"
category: pattern
tags: [knowledge-atoms, subagents, source-fidelity, parallel-waves, verifier, stack-knowledge, anti-drift]
created: "2026-05-25"
---

## Problem

Ao extrair knowledge atoms de uma nova stack (Next.js + React — 15 atoms em 3 planos), surgiram duas tensões simultâneas:

1. **Subagentes inventam.** O LLM sabe verdades sobre a stack que não estão nos sources declarados. Sem guardrail explícito, insere claims corretas mas não-rastreáveis, que falham no verifier gate downstream.

2. **Verifier gera false-negatives.** Sem protocolo claro sobre *quais seções auditar*, o verifier amostrava seções editoriais (`When to consult`, `External references`) como se fossem claims técnicas do source — disparando rework loop sem solução real (ver `2026-05-16-verifier-protocol-technical-sections-only.md`).

Sem as duas cláusulas em combinação, o pipeline oscila entre "extrator inventa" e "verifier acusa sem razão" — rework circular.

## Solution

**Protocolo de três camadas aplicado verbatim a cada subagente extrator e verifier:**

### Camada 1 — Anti-drift clause no extrator (verbatim)

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier gate downstream marca como falha qualquer claim não-rastreável ao source."

Esta cláusula deve ser o **primeiro parágrafo** do prompt do extrator, não um bullet enterrado. O "mesmo que você saiba que é verdade" é a parte crítica — endereça diretamente o mecanismo de falha.

### Camada 2 — Verifier refined protocol (verbatim)

> "TECHNICAL CLAIMS live in: Senior patterns, Anti-patterns, Decision criteria. ATOM-STRUCTURAL METADATA lives in: When to consult and external references — DO NOT evaluate these for source traceability."

O verifier audita APENAS as 3 seções técnicas. Seções editoriais são template framing, não claims do source.

### Camada 3 — Parallel waves com isolamento de arquivos

- Cada wave usa 2–4 subagentes em paralelo, cada um escrevendo um único arquivo diferente
- Sem conflito de escrita pois cada subagente recebe um `topic` distinto com path de output fixo
- Wave size máxima: 3 subagentes simultâneos por wave (fases são maiores que tasks)

**Resultado em escala (Next.js + React, 3 planos):**
- 14 atoms extraídos (excluindo piloto): 94% rastreabilidade média
- 0 rework rounds após a primeira passada do verifier
- 6/6 APPROVE Plano 02, 8/8 APPROVE Plano 03 — todos na primeira execução

## Prevention

**Para extrair knowledge atoms de qualquer nova stack (Go, Elixir, etc.):**

1. **Nunca delegue o anti-drift como instrução implícita.** Cole o bloco verbatim acima como primeiro parágrafo do prompt de cada extrator. Instruções genéricas ("seja fiel ao source") não funcionam — o LLM interpreta "fiel" como "tecnicamente correto", não "rastreável".

2. **Nunca deixe o verifier sem escopo de seções.** Sem o bloco "DO NOT evaluate these sections", o verifier amostrea aleatoriamente e gera false-negatives em seções editoriais. Custo concreto: ~30min de rework por atom afetado.

3. **Omissão consciente é resultado correto.** Se um tópico está nos `triggers` mas não nos `sources` declarados, o extrator deve omiti-lo e registrar em MEMORY.md como "omitido por ausência no source" (não como falha). Exemplos desta feature: `useTransition` (não nos sources de react-hooks), `NextAuth/Clerk` (sources cobriam apenas Supabase), `RLS policy syntax` (não no SKILL.md de nextjs-supabase-auth).

4. **Triggers enganosos são um bug.** Se um trigger não tem cobertura no atom, remova-o. Um trigger que não leva a conteúdo útil é pior do que ausência — direciona o dev para o atom errado. (Lição do audit R3-B em `security-stack-specific.md`: `NextAuth, Clerk, auth.js` removidos dos triggers por ausência de cobertura.)

5. **Este workflow se aplica a qualquer extração estruturada de fonte declarada:** ADRs técnicos, playbooks de onboarding, checklists de segurança — qualquer situação onde o artefato deve permanecer rastreável ao source e um verifier gate valida isso.
