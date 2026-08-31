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

---

## Audit Humano D11 (fase-06) — 2026-08-31

**3/3 aprovados, ZERO fixes pedidos.** Interativo, um átomo por vez, ordem D11.

| # | Átomo | Fixes | Resultado | Corpo pós-selagem |
|---|---|---|---|---|
| 1 | `security-fastapi-owasp` | 0 | APROVADO | 199/200 (era 200 — a selagem liberou 1 linha) |
| 2 | `sqlalchemy-async-and-orm` | 0 | APROVADO | 178/200 |
| 3 | `debugging-pdb-debugpy` | 0 | APROVADO | 192/200 |

Selagem por átomo: remoção de `flagged_for_human_audit: true` do frontmatter + da nota D11 do
corpo, seguida de `validateAtomFrontmatter` (todos `{valid: true, errors: []}`).

### O que foi apresentado ao dev em cada átomo

Não apresentei só o arquivo — apresentei os pontos que o verifier marcou como borderline, para o
olho humano ir primeiro onde o gate de máquina é mais fraco:

- **security:** a correção da CVE-2024-53981 (única falha de conteúdo dos 3 batches, onde o ID
  existia e escondia o erro); a mitigação de "class pollution" apresentada com a mesma força das
  regras de consenso, embora a fonte a liste em Lacunas declaradas — limite do formato do átomo,
  que não tem gradiente de confiança.
- **sqlalchemy:** `pool_pre_ping` explicado a partir de um bloco de código da fonte, sem
  justificativa textual — a fronteira mais fina do projeto entre "ler o exemplo" e "adicionar
  conhecimento próprio"; a versão 0.118.0 perdida no `StreamingResponse`; a atribuição do conflito
  de repository que o plano tinha errado.
- **debugging:** que o risco real é a generalização inventar comportamento, não a limpeza de
  nomes (grep pega nomes, não pega generalização fabricada); o descarte do pitfall 8 por falta de
  equivalente genérico na fonte; a escolha entre as duas variantes de fix do `ptrace_scope`.

### Nota de método

O gate de máquina (verifier ≥80%) e o audit humano cobrem coisas diferentes. O verifier prova
rastreabilidade — que a claim está na fonte. Ele não julga se a claim **deveria** estar lá, se o
grau de confiança sobreviveu ao formato, ou se um corte editorial custou algo útil. Por isso o
material apresentado ao dev foi a lista de pontos borderline, não o átomo cru: o humano é caro e
deve olhar onde a máquina é cega.
