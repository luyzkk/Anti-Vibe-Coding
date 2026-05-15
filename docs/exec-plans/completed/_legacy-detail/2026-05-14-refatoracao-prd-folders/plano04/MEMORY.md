# Memoria: Plano 04 — Extras (Could Have — cortavel)

**Feature:** Refatoracao da Estrutura de Pastas por PRD
**Iniciado:** {preencher ao iniciar execucao}
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1:** `prd-template.md` já tinha frontmatter YAML com campos `slug`, `date`, `status` (G-PLAN-13 estava desatualizado). Solução: adicionar `requires: []` ao frontmatter existente em vez de criar novo bloco `---`. Decisão conservadora — evita frontmatter duplicado.
  - Por que: bloco `---` duplo quebraria parsers YAML
  - Impacto: template final tem frontmatter completo com slug + date + status + requires

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

_(nenhum bug encontrado)_

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** Ciclo entre PRDs nao bloqueia, mas repetir aviso em cada `/execute-plan` cansa o dev
  - Descoberto em: fase-02
  - Impacto: considerar flag de "silenciar" na proxima iteracao
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1:** fase-01 e fase-03 rodaram em paralelo mas seus commits ficaram bundlados em c8d5520 (DI-2 risk realizado). A atomicidade por fase não foi mantida — ambas compartilham o mesmo commit.
  - Motivo: subagentes paralelos sem coordenação de staging; fase-01 commitou antes de fase-03 concluir mas incluiu mudanças de fase-03 já staged
  - Impacto: histórico menos granular, mas funcionalidade correta

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Plano 04 eh o ultimo. Nao ha planos seguintes.
     Se durante execucao surgir conhecimento valioso que deveria virar licao global,
     alimentar `/lessons-learned add` ao final do PRD (via fase-03 deste proprio plano). -->

---

<!-- Atualizado automaticamente durante execucao -->
