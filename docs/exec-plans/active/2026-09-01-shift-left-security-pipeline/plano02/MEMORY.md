# Memoria: Plano 02 — Pipeline (codigo nasce seguro)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** em andamento

---

## Decisoes de Implementacao

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
| Fases concluidas | 0 |
| Fases com desvio | 0 |
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
