# Memoria: Plano 01 — Fundacao + Tracer Bullet (Next.js)

**Feature:** Matriz Rota x Middleware de Auth no Auditor
**Iniciado:** 2026-09-03
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

- **DI-0a (planejamento — confirmada pelo dev em 2026-09-03):** o `security-auditor` ganha `Bash`, em
  reconciliacao ADITIVA com a Decisao D6 do PRD shift-left.
  - Por que: `agents/dependency-auditor.md:120-121` diz que o `security-auditor` "permanece read-only
    sem Bash", citando D6. Mas D6 separava **SCA** do auditor de seguranca — e isso se preserva: o
    Bash novo invoca SO `skills/security/lib/route-auth-matrix.ts`, nunca `bun audit`. D6 continua
    verdadeira no que importa.
  - Impacto: a fase-01 acrescenta uma frase datada no `dependency-auditor.md` esclarecendo o escopo,
    sem apagar a original (regra "nunca diminuir"). O executor NAO deve re-perguntar isto ao dev.

- **DI-0b (planejamento — confirmada pelo dev em 2026-09-03):** a resolucao de
  `@typescript-eslint/parser` a partir do cache do plugin decide-se NA fase-04, por medicao — nao antes.
  - Por que: o cache (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/7.7.0/`) tem
    `package.json` mas NAO tem `node_modules/`. Ninguem verificou se o instalador do plugin roda
    `bun install`. Decidir agora seria por suposicao.
  - Impacto: o Passo 0 da fase-04 verifica a resolucao real a partir do cache e PARA com as tres opcoes
    na mesa (promover para `dependencies` / import dinamico + degradar para `indeterminada` / parser
    embutido). O executor deve parar e esperar o dev — nunca escolher sozinho. A mesma decisao vale
    para `skills/lib/capabilities-writer.ts`, que tem o mesmo defeito (tarefa separada ja registrada).

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

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

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

<!-- Exemplo:
- Tabela `notifications` criada com RLS — usar service_role para queries internas
- Tipo `Notification` exportado de `src/types/notifications.ts`
- Hook `useNotifications` disponivel em `src/hooks/use-notifications.ts`
-->

---

<!-- Atualizado automaticamente durante execucao -->
