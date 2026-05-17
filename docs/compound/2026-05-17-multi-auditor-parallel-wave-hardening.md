---
title: "Multi-auditor paralelo → wave-grouping por independência: pattern de hardening cirúrgico"
category: processo
tags: [auditing, parallelization, hardening, plan-executor, post-feature, dependency-graph]
created: "2026-05-17"
---

## Problem

Após v6.3.2 (Stack Knowledge Layer) ser declarada COMPLETED + tagged como release-ready, 2 rodadas de auditoria foram executadas:

- **1ª rodada** (4 commits): security-auditor + code-smell-detector. Detectaram 8 findings (5 vulns + 4 smells).
- **2ª rodada** (8 commits): solid-auditor + api-auditor + database-analyzer + infrastructure-auditor. Detectaram 29 findings (4 + 10 + 6 + 9, com sobreposição).

Sem disciplina, isso vira ou (a) feature-creep contínuo travando o release ou (b) backlog ignorado que vira débito permanente. O risco real era execução sequencial fix-por-fix em loop, gerando 12-15 commits dispersos sem coesão semântica.

## What Worked

O pattern aplicado teve 4 etapas que se mostraram robustas:

### 1. Spawnar TODOS os auditores aplicáveis em paralelo (6 calls em 1 message)

Cada auditor recebeu **o mesmo escopo de arquivos** (helpers TS + tests + SKILL.md wires + atomos) e instruções específicas pelo seu domínio. Custo de contexto: 1 message, 4-6 subagentes. Latência: max-of-N (~3min wall-clock) em vez de sum-of-N (~18min sequencial).

**Por que funciona:** auditores são read-only, não competem por filesystem locks; cada um tem prompt especializado; resultados independentes não precisam de merge complexo.

### 2. Consolidar findings em waves agrupadas por independência

29 findings → **6 waves**:

| Wave | Tipo | Findings | Dependências |
|---|---|---|---|
| H1 | infra HIGH | 4 (CI gate + env var + test path + harness check) | Nenhuma |
| H2 | api HIGH | 3 (schema_version + MatrixFolder derived + telemetry guards) | Nenhuma |
| M1 | quality MEDIUM | 5 (async parse + export guards + extract helper + sanitize + pid-tmp) | Nenhuma |
| M2 | infra+docs | 6 (ESM snippet + UPGRADE + TELEMETRY + opt-out + Go msg + rollback) | Nenhuma |
| L-quick | LOW | 5 (ISP ctx + warnSink + clamp + content check + .gitignore + JSDoc) | Nenhuma |
| L-skill | LOW | 1 (5 `bun -e` blocks → `await import`) | Nenhuma |

**Regra de agrupamento:** se 2 fixes tocam o mesmo arquivo OU dependem de tipos compartilhados, ficam na mesma wave. Senão, paralelizar.

### 3. Spawnar 4-6 plan-executor subagentes EM PARALELO, 1 por wave

Cada plan-executor recebeu:
- Lista de findings da wave (file:line, descrição, fix proposto)
- Acceptance criteria mecânica (`grep -c`, test counts, harness exit code)
- Guard rails (não tocar fora do escopo da wave)
- Commit message sugerido

**Resultado:** 4 commits criados em ~10min wall-clock para Waves H1+H2+M1+M2 paralelas (commits `d2cc042`, `2921455`, `2d04750`, `825f270`). Outros 2 commits para L-quick + L-skill em paralelo subsequente (commits `ffadd9c`, `bd50bb5`).

### 4. Detectar e fixar regressão de typecheck antes de fechar

Wave H2 estreitou `MatrixFolder` de `string` para union literal. Test files (`copy-knowledge.test.ts`, `atoms-rf11-audit.test.ts`) que usavam `'test-stack'` literal pararam de typechecker. **Sinal:** typecheck saiu de baseline 2 → 7 errors.

**Fix surgical:** sed substituindo `'test-stack'` por `'nodejs-typescript'` + optional chaining em regex match — commit `622bbd0`. Baseline restaurado.

**Lição embutida:** quando uma wave envolve **type narrowing**, sempre rodar `bun run typecheck` antes do final commit. Test files são consumers do tipo público — eles quebram primeiro.

## Anti-patterns Avoided

Coisas que **não fizemos** (e que teriam quebrado o ritmo):

- ❌ **Sequencial 1-fix-1-commit** — 29 commits dispersos, sem coesão semântica, impossível revertir wave inteira se necessário.
- ❌ **Bundle gigante "fix all"** — 1 commit com 29 mudanças, impossível bisect, code review impraticável.
- ❌ **Skip dos LOWs** — usuario explicitamente pediu "100% sem débito"; LOWs em produção viram MEDIUMs em 6 meses.
- ❌ **Fixar tudo no main thread (sem subagentes)** — context inflation; auditor + executor + verifier no mesmo contexto perde coerência após 15-20 mensagens.

## Reusable Heuristic

```
Trigger: Feature COMPLETED + tests passing + auditor flags > 5 issues
↓
Step 1: Spawn TODOS auditores aplicáveis em paralelo (1 message, N subagentes)
Step 2: Consolidar findings em tabela (severity × file × dependency)
Step 3: Agrupar em waves por independência (mesmo arquivo OU mesmo tipo compartilhado = mesma wave)
Step 4: Spawn plan-executor por wave em paralelo (1 message, M subagentes onde M = waves independentes)
Step 5: Verificar baseline typecheck/tests após cada batch — fix regressões antes de avançar
Step 6: Documentar WONTFIX explicitamente (com rationale) para findings deliberadamente ignorados
Step 7: SUMMARY com tabela commit × wave × findings (referência única para futuro)
```

**Custo total v6.3.2 hardening:** ~3h wall-clock para 2ª rodada (29 findings → 8 commits) usando esse pattern. Estimativa sequencial: ~10-12h.

## When NOT to Use

- **Features triviais:** 1-2 findings — overhead de spawnar 4 subagentes não compensa.
- **Findings interdependentes:** se 90% das fixes tocam o mesmo arquivo, paralelizar quebra a coesão (waves se canibalizam em git merge).
- **Findings que mudam interface pública:** se uma fix muda o schema de `StackJson`, todas as consumers precisam atualizar — sequencial é mais seguro.

## References

- v6.3.2 1ª rodada hardening commits: `524308e` (security), `2925e2d` (types), `047c54a` (extract), `013e10b` (consistency)
- v6.3.2 2ª rodada hardening commits: `d2cc042` (H1), `2921455` (H2), `825f270` (M2), `2d04750` (M1), `ffadd9c` (L-quick), `bd50bb5` (L-skill), `622bbd0` (regression fix), `d30fb90` (SUMMARY)
- SUMMARY com tabela completa wave × commit × findings: `docs/exec-plans/completed/2026-05-16-stack-knowledge-nodejs-typescript/SUMMARY.md`
- Compound lesson preexistente reforçada: `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` (pattern de auditor especializado)
