# Memoria: Plano 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full

**Feature:** Stack Knowledge Python
**Iniciado:** {YYYY-MM-DD}
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
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

<!-- RF14 e could-have: se for cortado, registrar aqui como DEV-N com motivo (G26). -->

---

## Avaliacao de Tier — graphql-grpc-contracts (RF16)

Preenchido ao fim da fase-03: manter T3 ou propor promocao a T2, com justificativa baseada
no conteudo real extraido (densidade, aplicabilidade). Flag sem custo de re-extracao (G25);
a decisao de promover e do dev.

<!--
- Veredito do executor: {manter T3 / propor T2}
- Justificativa: {...}
- Decisao do dev (se houve): {...}
-->

---

## Audit Humano (RF5 / CA-08 / D11)

Registro operacional da fase-06 (as assinaturas canonicas vivem no STATE.md da feature).

<!--
| Atomo | Fixes pedidos | Resultado | Data |
|---|---|---|---|
| security-fastapi-owasp | {N} | APROVADO/REPROVADO | {YYYY-MM-DD} |
| sqlalchemy-async-and-orm | {N} | APROVADO/REPROVADO | {YYYY-MM-DD} |
| debugging-pdb-debugpy | {N} | APROVADO/REPROVADO | {YYYY-MM-DD} |
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | {N} |
| Fases com desvio | {N} |
| Bugs encontrados | {N} |
| Ciclos extras de verifier | {N} |
| Fixes de audit humano | {N} |

---

## Notas para o Closeout

Informacoes que a fase-07 PRECISA consolidar antes do PR final (Exit Criteria do PLAN.md).

<!-- Exemplo:
- Excedentes de cap registrados no TODO.md: {lista}
- Resultado do rastreio ECC (Plano 02) citado no PR: {resumo}
- RF14 entregue ou cortado: {qual}
-->

---

<!-- Atualizado automaticamente durante execucao -->
