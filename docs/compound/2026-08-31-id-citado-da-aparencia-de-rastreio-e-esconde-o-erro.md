---
title: "ID de regra citado dá aparência de rastreio: conferir que o ID existe não é conferir que a regra sustenta a claim"
category: armadilha
tags: [verifier, source-fidelity, knowledge-atoms, rastreabilidade, seguranca, citacao, false-confidence]
created: 2026-08-31
---

## Problem

Fontes de pesquisa com regras numeradas (`Regra 2.2`, `CVE-2024-...`, `PERF-CACHE-02`) permitem
que o átomo destilado **cite o ID** junto da claim. Isso parece a melhor forma de rastreabilidade
possível: em vez de o verifier procurar a passagem, ele confere o ID.

Foi assim que a **única falha de conteúdo de todo o projeto** (18 átomos, 4 batches, 90+ claims
amostradas) passou por três camadas e quase chegou ao fim.

No átomo `security-fastapi-owasp`, a tabela de Critérios de decisão trazia:

```
| Parsing de header/boundary com regex (CVE-2024-24762, CVE-2024-53981) | Regex de complexidade linear + validar tamanho antes do parse |
```

Os dois IDs **existem** na fonte. A primeira CVE é de fato sobre backtracking de regex. A segunda
**não é**: a fonte a atribui a *"bytes antes do primeiro boundary são processados 1 byte por vez,
emitindo um log a cada byte → CPU alta e stall do event loop"*. Logging em loop apertado guiado por
entrada externa — nada a ver com regex.

O resultado é um átomo de **segurança** que prescreve a correção errada para uma CVE real, com
aparência de rastreio impecável. Um audit que conferisse "o ID existe na fonte?" retornaria verde
nas duas.

O que torna esse modo de falha específico: a citação é o mecanismo de confiança **e** o
esconderijo. Sem o ID, a claim seria prosa solta e alguém iria procurar a passagem. Com o ID, a
verificação parece já ter sido feita.

## Solution

No prompt do verifier, separar explicitamente os dois níveis, e nomear o modo de falha para que
ele seja procurado ativamente:

> O átomo cita IDs de regra no formato "(regra N.N)". **Use o ID como atalho de rastreio: confirme
> que o ID existe na fonte E que o conteúdo da claim corresponde ao conteúdo daquela regra.** Um ID
> que existe mas cuja regra não sustenta a claim é NÃO ENCONTRADA — esse é o modo de falha mais
> perigoso aqui, porque o ID dá aparência de rastreio.

A divisão de trabalho que funcionou: **existência de ID é checagem barata e mecânica** — feita pelo
orquestrador por comparação de conjuntos, fora do subagente. **Conteúdo por trás do ID é a checagem
cara** — é o trabalho do verifier, e é onde o token vale a pena.

No átomo `performance-and-profiling`, que cita 24 IDs `PERF-*`, isso ficou explícito: confirmei por
`comm` que os 24 IDs do átomo e os 24 da fonte têm interseção perfeita (zero inventado, zero
perdido) e passei essa checagem como **já feita** ao verifier, pedindo que ele gastasse a amostra
no conteúdo — com foco nos 5 patterns que combinam **dois** IDs num bloco, onde o risco de um dos
dois não sustentar a frase é maior.

## Prevention

1. **Citação não é verificação.** Sempre que um artefato citar identificadores da fonte, o gate
   precisa de dois passos distintos: o ID resolve? e a coisa apontada diz o que a claim afirma?
   Parar no primeiro é auditar a bibliografia, não o texto.

2. **Divida por custo:** existência de ID é `grep`/comparação de conjuntos e roda em segundos no
   orquestrador. Conteúdo exige ler as duas passagens. Não gaste amostra de verifier no que um
   comando resolve — e diga a ele que já foi feito, senão ele refaz o barato e economiza no caro.

3. **Agrupamento de IDs concentra risco.** Uma linha que cita dois IDs sob uma única correção é
   onde o erro cabe: basta que a correção sirva a um deles. Ao comprimir para caber num cap,
   agrupar itens que compartilham *sintoma* mas não *causa-raiz* é o erro fácil — foi exatamente
   isso aqui (duas CVEs de multipart, causas diferentes).

4. **Sinal para o audit humano:** ao apresentar um átomo com IDs a um revisor, aponte primeiro as
   linhas que agrupam mais de um ID. É onde a máquina é mais cega e o humano mais útil.

5. **Esta lição se aplica a:** qualquer artefato que cite RFCs, CVEs, ADRs, números de issue,
   seções de norma ou regras numeradas — code review que cita linha, doc que cita spec, laudo que
   cita cláusula.

## Affected files

- `knowledge/python/atoms/security-fastapi-owasp.md` — onde a falha estava (linha da tabela, corrigida em duas)
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano02/verifier-report-plano02.md` — registro da falha e do rework
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano04/verifier-report-plano04.md` — a divisão barato/caro aplicada nos IDs `PERF-*`
- Nota companheira: [`2026-05-16-verifier-protocol-technical-sections-only.md`](2026-05-16-verifier-protocol-technical-sections-only.md)
