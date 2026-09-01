# Memoria: Plano 02 — Pipeline (codigo nasce seguro)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** concluido (5/5 fases)

---

## Decisoes de Implementacao
- **DI-1 (fase-01, orquestrador):** duas das 14 assercoes de `tests/write-prd-contract.test.ts`
  nasceram passando **vacuamente** e foram corrigidas antes do commit.
  - (a) O teste de condicionalidade usava `template.search(HEADING)`, que devolve `-1` quando a secao
    nao existe; `slice(0, -1)` virava o ARQUIVO INTEIRO, que ja contem `OPCIONAL`/`omitir` vindos de
    `## Boundaries`. Fix: guard explicito `toBeGreaterThan(-1)` antes de fatiar.
  - (b) O gatilho de auth usava `/auth|autoriza/i` contra o arquivo todo, casando com "Modelo de auth"
    do Step 2 (deteccao de stack), sem relacao com triagem. Fix: assercao ancorada na secao
    `### Triagem de risco` via o helper `section()`.
  - **Prova de que o gate morde:** removendo as duas secoes temporariamente, 13 dos 14 testes falham
    (antes eram 12). O 14o verifica algo fora da subsecao removida — passa legitimamente.

- **DI-2 (fase-02):** adicionada a linha `Excecao (A10:2025)` na tabela de exemplos do `Abuse-It`,
  ausente do texto verbatim da spec.
  - Por que: exigencia explicita do prompt de execucao, ancorada no vocabulario OWASP 2025 confirmado
    na fase-03 do Plano 01. Catch generico que pula a checagem de autorizacao e A10 — nao cobri-lo
    deixaria a categoria mais nova do Top 10 fora do unico lugar que a testaria.

- **DI-3 (fase-04):** a regra de ramificacao do `grill-me` foi **reescrita no lugar**, nao duplicada.
  Original (`auth, dados sensiveis ou pagamentos`) preservado verbatim, com os tres gatilhos que
  faltavam anexados. Sem isso, a lista do grill-me contradiria a dos outros quatro arquivos.

- **DI-4 (fase-05):** mesma classe — a linha `NAO RECEBE: PRD completo` do Step 4b do `execute-plan`
  foi reconciliada com clausula de excecao, em vez de deixada contradizendo o novo `RECEBE`.

- **DI-5 (fase-04, registro pedido pelo executor):** numeros finais das secoes novas —
  `skills/architecture/SKILL.md` termina em `## 8. Defaults Seguros no Design`;
  `skills/system-design/SKILL.md` em `## 12. Defaults Seguros de Plataforma`.


Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

Ja decidido no planejamento (ver `README.md` §Decisoes de Planejamento) — nao redecidir:

- **DP-1:** heading ASCII `## Ameacas & Dados` (nao `Ameaças`), por consistencia com os demais H2 do
  `prd-template.md` e para estabilizar o token asserido pelo teste.
- **DP-2:** a fase-01 cria `tests/write-prd-contract.test.ts` — secao condicional e o tipo de
  conteudo que some numa passada de simplificacao sem que nada acuse.
- **DP-3:** vocabulario unico dos 6 gatilhos de risco (`auth/authz` · `PII/sensivel` ·
  `input externo` · `upload` · `pagamento` · `integracao terceira`), identico nas 5 fases. Nao
  confundir com os 7 gatilhos de **aprovacao humana** de `skills/security/SKILL.md`.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

- **GT-1 (fase-01):** assercao de contrato pode nascer vacua. Um `search()`/`indexOf()` que devolve
  `-1` combinado com `slice` produz o arquivo inteiro — e o teste passa exatamente no cenario que
  deveria reprovar. **Ao escrever gate textual, remova o alvo e confirme que ele falha.** Mesma
  classe do GT-1 do Plano 01 (fixture que passava por falhar num filtro anterior).

- **GT-2 (fase-02):** o prompt de execucao de uma fase pode conter requisito **ausente** do arquivo
  `.md` da fase. Fases futuras devem conferir prompt + arquivo juntos, nao tratar so o arquivo como
  fonte unica.

- **GT-3 (fase-02):** o GT-4 do Plano 01 (grep de aceite conta errado) tambem vale para specs que
  fornecem conteudo **verbatim** — bold markdown quebrou a contiguidade de `deste projeto` e o grep
  do criterio nao casou o texto que a propria spec mandou colar.

- **GT-4 (orquestracao):** agente de background **nao sobrevive ao encerramento do processo**. As
  fases 04 e 05 rodavam em paralelo quando a sessao caiu: a 05 tinha gravado o trabalho em disco (e
  foi verificada e commitada), a 04 nao deixou rastro e precisou ser refeita do zero. **Antes de
  assumir que uma fase de background se perdeu, inspecione o working tree** — metade do trabalho
  estava la.

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

Os conhecidos antes de comecar estao indexados em `README.md` §Gotchas Conhecidos (G1..G15, GT-01).
Registrar aqui apenas o que aparecer **durante** a execucao.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

- **DEV-1 (fases 01-05):** nenhuma fase criou branch propria nem commitou, contrariando o Passo 0 e a
  G13 das specs. Decisao do orquestrador: as tres primeiras rodaram em paralelo no mesmo working
  tree, e commit por fase foi feito depois pelo orquestrador (com stash seletivo para manter o
  manifest coerente por commit). Resultado equivalente ao pedido pela G13: 5 commits separados.

- **DEV-2 (G2 aplicado):** nenhuma fase rodou `bun run generate:manifest`. O orquestrador regenerou
  uma vez por commit — regenerar em paralelo produziria checksums conflitantes, que e exatamente o
  que a G2 alerta.

- **DEV-3 (fase-04, forcado):** refeita do zero apos a perda do agente de background. Resultado
  identico ao planejado; nenhum conteudo divergente.

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

Atencao especial neste plano: qualquer **linha removida** de uma skill e desvio por definicao
(regra "nunca diminuir", G4). Se o `git diff --stat` de uma fase mostrar remocoes, elas vem
justificadas aqui, linha a linha, ou sao revertidas.

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 3 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

Pre-preenchido com o que ja se sabe do planejamento; atualizar com o que a execucao revelar.

- O **Plano 03** (teste dinamico white-box) reutiliza os 6 gatilhos de risco definidos aqui para
  decidir quando o passe dinamico e oferecido. Termos exatos em `README.md` §DP-3.
- O guardrail de autorizacao do Plano 03 (CA-06) tem precedente textual neste plano: a fronteira
  "o alvo e sempre o proprio projeto, em ambiente local" aparece na fase-02 (`Abuse-It`) e na
  fase-05 (`plan-executor`). Reusar a mesma formulacao, nao inventar outra.
- `tests/write-prd-contract.test.ts` passa a existir apos a fase-01 — qualquer plano futuro que
  edite `skills/write-prd/**` roda `bun test tests/write-prd-contract.test.ts` antes do PR.
- Se alguma fase precisou renumerar secoes de `architecture/SKILL.md` ou `system-design/SKILL.md`
  (ex: a secao 8 / 12 novas), registrar aqui o numero final — planos futuros referenciam por numero.

---

<!-- Atualizado automaticamente durante execucao -->
