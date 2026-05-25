# Memoria: Plano 03 — Cross-cutting + React + Integrations + INDEX final + audit humano

**Feature:** Next.js + React Stack Knowledge
**Iniciado:** 2026-05-24
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Para `supabase-integration.md`, secao "Server vs client clients" precede "RLS via SSR"
  - Por que: nextjs-supabase-auth/SKILL.md organiza assim; alinhamento melhora rastreabilidade
  - Impacto: ordem das sections diverge do compass artifact (nao bloqueia verifier)
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** parseTopKeywords retorna [] para INDEX EN apos ajuste de regex
  - Causa: lookahead `(?=\n##\s|$)` parou no preambulo "## Heterogeneity note" em vez de avancar
  - Fix: ajustar regex para `(?=\n## (?!Heterogeneity)|$)` OU remover preambulo "## Heterogeneity note" do INDEX final (deixar como paragrafo simples)
  - Fase afetada: fase-06
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** `hasSupabaseSignal()` retorna true apenas se pasta `supabase/` tiver pelo menos 1 arquivo (fs.stat em dir vazio pode falhar em algumas plataformas Windows)
  - Descoberto em: fase-05
  - Impacto: fixture supabase deve ter `supabase/.gitkeep` (1 byte) E `@supabase/ssr` em deps; nao confiar apenas em pasta vazia
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-05 quebrou em fase-05a (atom) + fase-05b (fixture + E2E) por extrator + RED-GREEN nao caberem em 2h
  - Motivo: subagente extrator levou 1h sozinho; fixture+E2E precisaram outras 1.5h
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Atoms entregues | 0 / 8 |
| Atoms acima do hard cap 200 linhas (pre-rework) | 0 |
| Verifier rework rounds (fase-07) | 0 |
| Atoms flagged R3-B aprovados por humano | 0 / 3 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Plano 03 e o ULTIMO plano da feature — apos closeout, NAO ha proximo plano.
     Informacoes uteis para /iterate (CHANGELOG + cutover para completed/):
- 15 atoms commitados em knowledge/nextjs/atoms/
- INDEX final em knowledge/nextjs/INDEX.md (EN, By Cross-Stack Skill + By Tier + By keyword)
- 3 atoms com signature humana em STATE.md global da feature (linha "Aprovado por Luiz em YYYY-MM-DD"):
    - react-server-components
    - security-stack-specific
    - supabase-integration
- THIRD-PARTY-NOTICES.md no repo (Plano 01 fase-02)
- 2 fixtures em tests/fixtures/: nextjs-app-router-fixture (Plano 01) + nextjs-supabase-fixture (Plano 03)
- 2 E2E tracers em tests/e2e/: init-v7-nextjs-tracer-bullet.test.ts + init-v7-nextjs-supabase.test.ts
- Parser format-knowledge-preview.ts atualizado para aceitar `Por|By keyword` (RF-11)
- Compound opportunity para /iterate: anti-drift + verifier refined como regression desde piloto
  validados ao longo de 14 atoms + audit humano em 3 — capturar como pattern reusavel para proximas
  stacks (Go, Elixir?).
-->

---

<!-- Atualizado automaticamente durante execucao -->
