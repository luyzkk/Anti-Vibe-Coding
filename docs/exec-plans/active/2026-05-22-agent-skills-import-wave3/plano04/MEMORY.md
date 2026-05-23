# Memoria: Plano 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final

**Feature:** agent-skills-import-wave3
**Iniciado:** 2026-05-23
**Status:** planejado

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Preencher durante execucao. Exemplo:
- **DI-1:** ...
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preencher durante execucao. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.

- **GT-1:** `bun run generate:manifest` NAO EXISTE em `package.json`. Scripts disponiveis:
  `harness:validate`, `test`, `typecheck`, `compound:check`, `parity:audit`. Para regenerar o
  manifest, chamar DIRETO: `bun scripts/generate-manifest.js` (ou `node scripts/generate-manifest.js`
  se o script for node-only — verificar a primeira linha do arquivo).
  - Descoberto em: planejamento do Plano 04
  - Impacto: fase-04 invoca o script direto; checklist da Wave nao deve referenciar `bun run generate:manifest`.

- **GT-2:** `bun run lint` NAO EXISTE em `package.json`. PRD/PLAN da Wave 3 cita `bun run lint`
  no CA-11 mas nao ha esse script. Substituicao adotada: `bun run typecheck` (que existe).
  - Descoberto em: planejamento do Plano 04
  - Impacto: fase-04 checklist e Exit Criteria da Wave usam o trio:
    `bun run harness:validate && bun run test && bun run typecheck`.
    Quando/se um script lint for adicionado ao repo, atualizar Exit Criteria e este gotcha.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Preencher durante execucao. -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Wave 3 fechada apos este plano — `STATE.md` global atualiza Phase para `ready-for-iterate`
(ou `completed`, conforme politica do repo). Proximo passo sugerido para o orquestrador humano:

1. Executar `/anti-vibe-coding:verify-work` para validar o trabalho consolidado.
2. Executar `/anti-vibe-coding:iterate` para abrir ciclo pos-deploy (regression tests,
   hardening, follow-up issues).

Artefatos que o proximo ciclo herda:
- `tdd-workflow/SKILL.md` com Test Sizes / DAMP vs DRY / Test-Doubles Reference (referencia
  durante futuras decisoes TDD).
- `plan-feature/SKILL.md` com Task Sizing / Dependency Graph (ASCII) — usado por toda
  /plan-feature subsequente.
- Flowchart em `AGENTS.md` como ponto de entrada canonico.
- Manifest regenerado — checksums batem com arquivos no commit final da Wave.

---

<!-- Atualizado automaticamente durante execucao -->
