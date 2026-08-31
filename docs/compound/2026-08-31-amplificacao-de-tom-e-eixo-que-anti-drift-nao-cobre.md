---
title: "Amplificação de tom é um eixo de falha que a cláusula anti-drift não cobre — a claim está na fonte, o grau de certeza não"
category: processo
tags: [subagents, extractor, verifier, knowledge-atoms, source-fidelity, prompt-engineering, anti-drift, hedge]
created: 2026-08-31
---

## Problem

O batch T1 da matrix Python (5 átomos, Plano 02) passou **5/5 no verifier de rastreabilidade** —
25 claims amostradas, 25 rastreadas à fonte. Mesmo assim, **4 dos 5 átomos** carregavam um defeito
que o gate não pega: a substância estava na fonte, mas o **grau de certeza** foi inflado na
destilação.

As quatro ocorrências tomaram formas diferentes — o que descarta erro de formulação de um prompt
específico e sugere viés de destilação:

| Fonte diz | Átomo dizia |
|---|---|
| *Fluent Python*: herança para reuso "**can often be replaced** by composition" | "**troque por** composição" / "**não** herança/mixin" |
| `autospec` serve para "detectar mal uso de API" | "para o mock **falhar se a assinatura mudar**" (mecanismo mais específico que a fonte) |
| overhead `<1ms` **com ressalva** sobre serverless/Lambda | `<1ms` **sem** a ressalva |
| "aplicar por IP **e/ou** por conta" | "a fonte **recomenda**...; **combine as duas**" |

Note que nenhuma dessas é invenção. Todas passam num gate de rastreabilidade — a claim *está* lá.
A cláusula anti-drift existente (ver nota companheira) resolve **"não invente conteúdo"**; ela não
diz nada sobre **"preserve o grau de confiança do conteúdo que existe"**. São dois modos de falha
distintos: um fabrica, o outro endurece.

O custo é assimétrico e silencioso. Uma claim inventada soa estranha e o verifier pega. Uma claim
endurecida soa **melhor** — mais acionável, mais decidida — e é exatamente por isso que passa pela
revisão humana e pela máquina. Num átomo de knowledge, o efeito prático é entregar ao dev mais
certeza do que a evidência sustenta.

Um caso mostra a gravidade: o `<1ms` do Sentry sem a ressalva de serverless. O número está certo.
Falta a condição em que ele deixa de valer — que é justamente quando alguém iria consultar.

## Solution

Adicionar uma **cláusula de preservação de hedge** ao prompt do extrator, ao lado da anti-drift
(elas não se substituem):

> PRESERVAÇÃO DE HEDGE: preserve o GRAU DE CERTEZA da fonte, não só o conteúdo. Se a fonte diz
> "prefira", "geralmente", "pode frequentemente ser substituído", "e/ou" — o átomo NÃO pode dizer
> "sempre", "nunca", "combine os dois". Se a fonte anexa uma ressalva a um número ou a uma
> recomendação, a ressalva vem junto: número correto sem a condição que o acompanha também é
> infidelidade. Não especifique um mecanismo além do que a fonte descreve.

E manter no prompt do verifier uma checagem de amplificação de tom que **reporte como warn sem
contar no score X/5** — ela mede outro eixo, e misturá-la à rastreabilidade estragaria os dois
números.

Incidência medida em três batches consecutivos, com a cláusula entrando a partir do segundo:

| | Plano 02 (5 átomos) | Plano 03 (9) | Plano 04 (3) |
|---|---|---|---|
| Cláusula de hedge no prompt | não | **sim** | **sim** |
| Átomos com warn de tom | 4 (80%) | 2 (22%) | 0 (0%) |

Não é prova causal — batches, fontes e temas diferentes, e o terceiro tem só 3 átomos. Mas é o
sinal disponível, a direção é consistente em três medições, e o custo da cláusula é um parágrafo
por prompt.

## Prevention

1. **Anti-drift e hedge são cláusulas irmãs, não alternativas.** Todo prompt de extração
   source→artefato deve levar as duas. A primeira impede fabricar; a segunda impede endurecer.

2. **O gate de rastreabilidade não mede fidelidade de tom, e não deveria.** Um verifier que
   reprovasse por tom teria que julgar nuance, e o X/5 deixaria de significar "rastreável".
   Reporte tom como eixo separado.

3. **Número sem a sua condição é infidelidade, não concisão.** É a forma mais perigosa de
   amplificação porque o número confere: quem audita compara o valor, acha igual, e segue.
   Ao destilar qualquer quantidade, a ressalva anexa a ela viaja junto ou o número não entra.

4. **Não é drift sistemático de prompt.** No batch de 9, um átomo veio com **zero** warns e
   preservou o hedge nos 4 pontos que as fontes dele marcam como contestado — inclusive recusando
   explicitamente um enquadramento absoluto. A diferença plausível é que aquela fonte sinaliza os
   próprios hedges de forma mais explícita. Logo, a cláusula é **melhoria**, não conserto de causa
   raiz identificada: não vale reescrever o prompt inteiro por causa dela.

5. **Esta lição se aplica a:** destilação de docs técnicos, geração de ADRs a partir de discussão,
   runbooks a partir de post-mortem, resumo de pesquisa — qualquer pipeline em que um LLM comprime
   uma fonte e um gate downstream verifica só a presença do conteúdo.

## Affected files

- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano02/verifier-report-plano02.md` — onde o padrão foi identificado (4 de 5 átomos)
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano03/verifier-report-plano03.md` — primeira medição com a cláusula ativa
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano04/verifier-report-plano04.md` — terceira medição
- Nota companheira: [`2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`](2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md) — o eixo que esta nota complementa
- Nota companheira: [`2026-05-16-verifier-protocol-technical-sections-only.md`](2026-05-16-verifier-protocol-technical-sections-only.md) — o protocolo onde a checagem de tom foi acoplada
