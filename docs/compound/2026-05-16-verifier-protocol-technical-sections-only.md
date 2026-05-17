---
title: "Verifier subagente em batches de conteúdo deve auditar APENAS seções técnicas"
category: processo
tags: [subagents, verifier, knowledge-atoms, false-negatives, protocol-refinement, source-fidelity]
created: "2026-05-16"
---

## Problem

Plano 04 (Atom Batch A — 5 átomos de conhecimento Node+TS extraídos de fontes deep-research) usou o pattern verifier subagente para validar fidelidade ao source: cada verifier seleciona 5 claims do átomo e tenta rastrear cada uma para passagem específica da fonte. Threshold: ≥80% rastreáveis.

A primeira rodada falhou em 2 de 5 átomos (fase-04 state-and-caching: 3/5; fase-05 code-smells-catalog: 3/5). Após rework cirúrgico dos claims problemáticos, a re-verificação (v2) do fase-05 **continuou falhando 3/5**. As 2 claims corrigidas agora passavam, mas o verifier amostrou seções diferentes na v2 e marcou como "não encontrada":

1. Bullets da seção **"Quando consultar"** ("code review em PR que toca boundary", "onboarding de junior", etc.)
2. Citação a skill `/design-patterns` na seção **"Referências externas"**

Esses bullets são **atom-structural metadata** herdada do template piloto (use-case framing + cross-skill linking), não claims técnicas extraídas da fonte. O verifier estava aplicando o protocolo de source-traceability a editorial scaffolding — gerando false-negatives que disparavam rework loop sem solução real.

**Custo concreto:** Plano 04 fase-06 perdeu ~30min em ciclos v2 desnecessários antes de identificar a raiz. Sem o gate G3 do README do plano ("se ≥2 átomos falharem v1, revisar prompt"), poderia ter entrado em loop indefinido.

## Solution

**Refinar o protocolo do verifier para auditar exclusivamente as 3 seções técnicas** dos átomos de conhecimento:
- `Padrões sênior` (patterns com Problema/Padrão/Quando usar/Quando NÃO usar — conteúdo técnico extraído do source)
- `Anti-padrões` (armadilhas com correção — conteúdo técnico)
- `Critérios de decisão` (tabelas "se X, então Y" — conteúdo técnico)

E **excluir explicitamente** as 2 seções editoriais:
- `Quando consultar` (use-case framing — quando ler este átomo; metadata interna do átomo, não do source)
- `Referências externas` (cross-skill linking + audit trail do source path — meta-content sobre o átomo)

No Plano 04 fase-05 v3, com prompt refinado, o verifier passou 5/5 (todas as 5 claims técnicas rastreáveis ao source 98973791).

## Prevention

**Para qualquer skill ou batch que use verifier subagente sobre artefatos com seções editoriais + técnicas mistas:**

1. **Documentar o split editorial/técnico no template do artefato** antes de criar o verifier. O piloto define qual seção é meta-content e qual é claim técnica rastreável ao source.

2. **Prompt do verifier deve nomear explicitamente as seções auditáveis**, não confiar em "selecione 5 claims aleatórias". Exemplo do prompt v3 do Plano 04:

   > "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Padrões sênior, Anti-padrões, Critérios de decisão. ATOM-STRUCTURAL METADATA lives in: Quando consultar (use-case framing) and Referências externas (cross-skill linking) — DO NOT evaluate these sections for source traceability."

3. **Acionador de revisão do prompt:** se ≥2 artefatos do batch falharem v1, parar e revisar o prompt do verifier antes de rodar v2. Não entrar em loop de rework cego (gate explícito em README do plano).

4. **Esta lição se aplica a:** stack-knowledge batches (Planos 05 e 06 herdam o protocolo refinado), audit de ADRs, audit de documentação técnica em geral, e qualquer extração assistida por IA com verifier gate.

5. **Anti-pattern relacionado:** confundir "verifier deve auditar tudo no artefato" com "verifier deve auditar todo conteúdo que veio do source". Editorial framing não vem do source — vem do template.
