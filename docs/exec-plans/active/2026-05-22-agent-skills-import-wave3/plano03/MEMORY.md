# Memoria: Plano 03 — Pipeline Compound -> Reference

**Feature:** Agent-Skills Import — Wave 3
**Iniciado:** 2026-05-23
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano03-fase02-substituta-init-cascade-fix:** Compound note `2026-05-18-init-cascade-fix.md` NAO EXISTE no repo (confirmado durante planejamento — R-NEW-01 do PLAN). Substituta usada: `2026-05-18-detector-parser-narrow-happy-path.md` (mesma data, dominio init, foco em detector/parser estreito que tambem causou bugs no `/init`). Impacto: header da reference `init-step-contract.md` cita as 3 compound notes (init-self-protection + path-escape-cascade + detector-parser-narrow-happy-path) em vez das 3 originalmente listadas no PRD Item 3b.

<!-- Demais DIs serao registradas durante execucao das fases -->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Vazio no inicio do plano -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Vazio no inicio do plano -->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Vazio no inicio do plano -->

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

Informacoes que o proximo plano (Plano 04) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- A preencher no fechamento do Plano 03. Hipoteses iniciais:
- `docs/references/` ganha 3 arquivos novos: init-step-contract.md, hooks-checklist.md, tdd-cycle-checklist.md.
- `docs/references/README.md` secao "Seeds Disponiveis" NAO foi atualizada nesta wave (G8 do README) — candidata a tech-debt.
- 5 compound notes-origem ganharam linha `referenced-by:` no frontmatter; demais compound notes nao foram tocadas.
- `docs/compound/README.md` ganhou secao `## Quando promover para reference` ao final (apos secoes existentes).
- Nenhum arquivo em `skills/` ou `agents/` tocado — manifest NAO precisa ser regenerado por este plano.
-->

---

<!-- Atualizado automaticamente durante execucao -->
