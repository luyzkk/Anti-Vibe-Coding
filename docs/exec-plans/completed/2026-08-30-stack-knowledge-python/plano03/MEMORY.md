# Memoria: Plano 03 — Atoms T2 (waves) + Verifier

**Feature:** Stack Knowledge Python
**Iniciado:** {YYYY-MM-DD — preencher no início da execução}
**Status:** nao iniciado

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Regra P2 de paginação omitida do api-design por cap
  - Por que: P0/P1 da fonte já ocupavam 190 linhas
  - Impacto: item registrado no TODO.md (política G5)
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 10 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do Plano 04 le este campo.

<!-- Preencher ao concluir a fase-10. Mínimo esperado:
- Confirmação: 9 átomos T2 commitados + verifier 9/9 ≥80% (link para verifier-report-plano03.md)
- `sqlalchemy-async-and-orm` flagged para audit humano (Plano 04 fase-06)
- Seções GraphQL/gRPC/tRPC do report3 permanecem intocadas para o Plano 04 fase-03 (G15)
- Excedentes de cap registrados no TODO.md (se houver)
- Ajustes de prompt do extrator/verifier feitos neste batch (o Plano 04 herda)
-->

---

<!-- Atualizado automaticamente durante execucao -->

---

## Resultado do Plano 03 (fase-10) — 2026-08-30

**9/9 atomos T2 em 5/5. Zero falhas de conteudo. G12 nao disparou. Zero ciclos v2.**
45 claims tecnicas amostradas, 45 rastreadas. Relatorio completo: `verifier-report-plano03.md`.

### A clausula de hedge pagou

| | Plano 02 (5 atomos) | Plano 03 (9 atomos) |
|---|---|---|
| Falhas de conteudo | 1 | **0** |
| Atomos com warn de tom | 4 de 5 (80%) | **2 de 9 (22%)** |

A clausula de preservacao de hedge foi introduzida nos prompts DESTE plano, a partir do achado do
Plano 02. Nao e prova causal (batches, fontes e temas diferentes), mas e o sinal disponivel e o
custo e um paragrafo por prompt. **Manter no Plano 04.**

### Decisoes de Implementacao

- **DI-Plano03-lacuna-constraints:** a subarea "constraints do banco vs validacao da aplicacao"
  (L260-296 do deep-research-report.md) nao estava em NENHUM dos dois atomos que dividem essa
  fonte. Alocada em `migrations-and-schema-evolution` e escrita pelo proprio extrator, que ainda
  tinha a fonte em contexto. Modo de falha tipico de fonte compartilhada: cada extrator assume que
  o outro pegou, e o plano nao atribuiu a subarea a ninguem.
- **DI-Plano03-add-column-tom:** warn de amplificacao de tom no pattern `ADD COLUMN` ACEITO sem
  alteracao. O atomo espelha a Justificativa tecnica da fonte (categorica) em vez do titulo da
  Regra (hedged) — ambos sao a fonte. A distincao que importa (default nao-volatil vs volatil)
  esta intacta, e suavizar deixaria a orientacao mais vaga sem deixa-la mais correta.
- **DI-Plano03-pool-nao-harmonizado:** divergencia entre a formula de pool do piloto (com
  "x replicas") e a da regra PERF-DB-02 (so "workers") NAO foi harmonizada. O verifier concluiu
  que sao compativeis, nao contraditorias. Harmonizar exigiria fazer um atomo afirmar o que a sua
  fonte nao diz.

### Correcao de plano aplicada

- **fase-03, rotulo do conflito de repository:** o plano dizia "Percival vs Bayer". A fonte atribui
  o lado "sessao direta" ao tutorial oficial do FastAPI (L1036/L1066), nao a Mike Bayer — que na
  fonte so aparece em contexto de Alembic (L51, L217), tema da fase-04. Corrigido para
  "Percival/Gregory vs tutorial oficial do FastAPI" nos 3 docs (6 ocorrencias) + nota na fase-03.
  Detectado pelo extrator, verificado por mim na fonte, reconfirmado pelo verifier de forma
  independente. Hipotese de origem: as fases 03 e 04 dividem a MESMA fonte, e o nome migrou da
  metade de migracoes para a de ORM durante o planejamento.

### Achado sobre escopo do plano

- **fase-08 sub-escopada:** secoes 11 e 17 da fonte compass 69fdecd5 sao tagueadas por ela como
  *previne incidente* (maior impacto) e nao estavam nas 18 secoes que o plano enumerou. Registrado
  no TODO.md para o Plano 04.

## Notas para o Plano 04

- **Prompt do extrator:** reusar como esta (anti-drift + hedge + aviso do link checker + fronteiras
  de dedup explicitas com os atomos irmaos JA existentes).
- **Prompt do verifier:** manter os checks calibrados por atomo. Um prompt generico nos 9 teria
  custado menos e verificado menos. E manter a distincao **conteudo por tras do ID** vs existencia
  do ID — foi ela que pegou a unica falha real do Plano 02.
- **SEIS atomos no teto do cap** (security 200, api-design 199, performance 199, code-smells ~198,
  deployment ~198, typing 197). Edicao neles exige remocao antes de adicao. Critico para os dois
  que passam pelo audit humano.
- **INDEX intacto (G11)** — nenhum dos 9 extratores tocou. A matrix esta com 15 atomos; faltam os
  3 T3 do Plano 04 para fechar 18.
- **Link checker vs generics PEP 695:** o aviso preventivo nos prompts funcionou — zero
  falso-positivo nesta wave, contra 3 iteracoes gastas no Plano 02. O defeito da ferramenta segue
  registrado no TODO.
