---
title: "Bloco de codigo em SKILL.md pode ser exigido por validator — nao executar nao e nao carregar peso"
category: armadilha
tags: [skills, skill-md, validator, harness, code-block, subagente, auditoria]
created: 2026-08-11
---

## Problem

Na auditoria das 40 skills (plano01 fase-03 do import `mattpocock/skills`), um subagente propos
deletar os blocos ` ```typescript ` de `skills/decision-registry/SKILL.md:10-59`, citando
corretamente o compound `2026-05-12-skill-md-code-blocks-do-not-execute.md`: bloco de codigo em
`SKILL.md` e prompt, nao runtime.

Premissa certa, conclusao errada. `scripts/harness-validate.ts:637-660` **exige** o bloco
`profile-aware-preface`:

- falha se o bloco nao contiver um fenced code block
- falha se o bloco nao referenciar `readPrefaceContext`

Aplicar a proposta derrubaria `bun run harness:validate` em **9 skills** (`api-design`,
`architecture`, `compound-engineering`, `decision-registry`, `design-patterns`,
`detect-architecture`, `lessons-learned`, `security`, `system-design`).

O que torna a armadilha real: o sinal que o subagente usou — ausencia de gatilho em
`hooks/hooks.json` — e **identico para as tres classes de bloco**, e elas tem seguranca oposta.
Medido: 54.974 chars de blocos ` ```typescript ` nos `SKILL.md`, e
`grep -c "telemetry|preface|stale-capabilities" hooks/hooks.json` = 0.

| Classe | Skills | Guard | Removivel |
|---|---|---|---|
| `writeTelemetryStart/End` | 10 | `skills/lib/telemetry-utils.test.ts:192` | sim, junto com o teste |
| `profile-aware-preface` | 9 | `scripts/harness-validate.ts:643` | **nao** |
| `stale-capabilities-check` | 7 | 4x `__tests__/stack-aware-preface-wire.test.ts` (assertam ordem) | multi-arquivo |

## Solution

Antes de propor remocao de qualquer bloco em `SKILL.md`, buscar o marcador do bloco onde um
verificador o consumiria:

```bash
grep -rn "<marcador-do-bloco>" scripts/ tests/ skills/*/__tests__/
```

Se o marcador aparece em `scripts/harness-validate.ts` ou em qualquer `*.test.ts`, o bloco carrega
peso por **verificacao**, mesmo nunca executando. Um bloco em `SKILL.md` tem tres papeis possiveis:

1. **Runtime pretendido, que falhou** — telemetria. Morto de fato; o compound de 2026-05-12 documenta
   os 7 dias com zero metricas.
2. **Spec que o agente simula** — `profile-aware-preface`. O agente le o pseudo-codigo e executa a
   intencao descrita na prosa logo abaixo. `scripts/preface-simulate.ts` existe para exercitar isso.
3. **Contrato lido pelo harness** — o validator trata o texto do bloco como assercao estrutural.

So a classe 1 e deletavel, e mesmo ela leva o teste-guard junto na mesma fase.

## Prevention

**O compound anterior estava certo e foi generalizado demais.**
`2026-05-12-skill-md-code-blocks-do-not-execute.md` prova que blocos nao executam. A conclusao que
nao segue: *"logo sao decoracao e podem sair"*. As duas notas devem ser lidas juntas.

Regra: **nao-executa != nao-carrega-peso.** Num repo onde o proprio markdown e contrato (skills,
`AGENTS.md`, templates), o validator pode ser o consumidor do texto — e ele nao aparece em nenhum
grep por "gatilho".

Para auditoria delegada a subagente, isto vira item de brief: **toda proposta de delecao precisa
nomear o guard que foi procurado e nao encontrado.** Sem isso, o agente reporta ausencia de evidencia
como evidencia de ausencia.

Calibragem observada nesta fase: 8 afirmacoes de subagente de maior impacto foram reverificadas por
script antes de virar patch; 7 confirmaram e esta era falsa. Taxa de ~1 em 8 nas afirmacoes que
mudariam codigo — o custo da reverificacao se paga.

## Affected files

- `scripts/harness-validate.ts:637-660` — o gate que torna `profile-aware-preface` obrigatorio
- `skills/lib/telemetry-utils.test.ts:192` — guard da classe telemetria
- `skills/lib/__tests__/stale-warning.test.ts` — declara "SYNC OBRIGATORIO nas 6 SKILL.md"
- `docs/compound/2026-05-12-skill-md-code-blocks-do-not-execute.md` — a nota que esta refina
- `docs/exec-plans/completed/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md` — §Sistemico 2
