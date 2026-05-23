# Memoria: Plano 02 — Prove-It Mode no tdd-verifier

**Feature:** Agent-Skills Import — Wave 3
**Iniciado:** 2026-05-23
**Status:** em andamento

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** Wave 2 ja merged no momento da execucao (commit `000a1b6` "feat(agents): bump tdd-verifier to contract v2.0.0"). STATE.md global da Wave 3 (linha 25) afirmava "Wave 2 nao mergeada (contract_version atual = 1.0), fase-01 planejada para pausar" — informacao stale. Verificacao no codigo invalidou o gotcha G1/G2 do README.
  - Por que: feedback `feedback_verify_memory_vs_code.md` — sempre verificar codigo antes de prosseguir entre planos. STATE/MEMORY pode estar desatualizado.
  - Impacto: fase-01 resolveu PROSSEGUIR. fase-02 e fase-03 desbloqueadas sem intervencao humana.

- **DI-2 (fase-01):** Os "5 patterns" do PRD Wave 2 (Item 1) NAO sao 5 secoes H2 separadas. Sao 3 secoes H2 (`## Output Contract`, `## Anti-Degeneration Rules`, `## Composition`) + 2 campos dentro de Output Contract (`payload.positive_observations`, `payload.verdict`). Todos presentes em `agents/tdd-verifier.md`.
  - Por que: TBD-1/TBD-2 do spec da fase-01 sugeriam 5 secoes H2 — leitura do PRD Wave 2 (localizado em `docs/exec-plans/completed/2026-05-22-agent-skills-import-wave2/PRD.md`) corrigiu a interpretacao.
  - Impacto: audit-tdd-verifier.md tabela Secao B reflete a estrutura real (3 secoes + 2 campos). Sem necessidade de procurar secoes H2 ausentes que nunca existiriam.

---

## Bugs Descobertos

<!-- (preenchido durante execucao) -->

---

## Gotchas

- **GT-1 (fase-01 — meta-gotcha):** STATE.md global da feature pode estar dessincronizado do estado real do repo entre execucoes de planos. Quando o STATE menciona "X nao mergeada", verificar via `git log` + grep antes de aceitar como bloqueio. README do plano herdou a info stale do STATE.

---

## Desvios do Plano

- **DEV-01 (fase-02):** Passo 4 grep 8 usa pattern `'"mode": "prove-it"'` (aspas duplas literais), mas o texto inserido documenta o campo via backticks markdown (`` `mode: "prove-it"` ``). O criterio de aceite final usa regex laxo `"mode.*prove-it"` que passa (6 matches). O texto foi copiado literalmente do spec — sem desvio de conteudo. Apenas inconsistencia entre o grep do Passo 4 e o conteudo real. Nao impactou resultado final.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 2 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

- **Arquivo modificado (fase-02):** `agents/tdd-verifier.md` — checksum mudou (144 linhas -> 250 linhas). Plano 04 fase-04 deve regenerar manifest com novo checksum.
- **Convencao decidida (G7 — fase-02):** `mode: "prove-it"` e campo top-level no input do agente (ao lado de `"files"` e `"scope"`). Nao e parte do campo `scope`. Fixtures de fase-03 devem usar `"mode": "prove-it"` como campo top-level em `input.json`.
- **Comentario HTML de linhagem adicionado:** `<!-- 2026-05-23 (Luiz/dev): prove-it mode — PRD Wave 3 Item 2, MH-03, CA-03 + CA-04, DC-7 -->` na linha 143 (antes da secao Prove-It Mode).
- **DEV-01 (fase-02):** grep `'"mode": "prove-it"'` (Passo 4, item 8) retornou 0 — o texto documenta o campo com backticks markdown, nao como JSON literal. Criterio de aceite final usa `"mode.*prove-it"` (retorna 6 matches) e PASSA. Sem acao necessaria.

---

<!-- Atualizado automaticamente durante execucao -->
