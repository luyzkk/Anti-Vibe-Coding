# Memoria: Plano 05 — Polish: Idempotência + Fixtures + AGENTS.md

**Feature:** /init Migration Mode
**Iniciado:** 2026-05-14
**Status:** fase-03 concluída (plano completo)

---

## Decisoes de Implementacao

- `shouldSkipFile` é `async` (G3 do README) — normaliza separadores com `replace(/\\/g, '/')` antes de lookup no manifest
- `checksumOfFile` é uma função local privada (não importada de manifest-writer para evitar dependência circular)
- `regenerateDiscovery` usa `fs.unlink`, não truncate (G2 do README)
- Integração em SKILL.md: `regenerateDiscovery` chamada ANTES de `checkIdempotency` (G4 do README)

---

## Bugs Descobertos

_Nenhum._

---

## Gotchas

_Ver README.md G1-G6 para gotchas conhecidos._

---

## Desvios do Plano

_Nenhum — implementação seguiu o spec exatamente._

---

- fase-02 concluída: 5 fixtures em `skills/init/__fixtures__/`, 13 testes PASS. Detalhe importante: `greenfield/README.md` existia no disco (não commitado) e foi deletado antes de criar o fixture-manifest.json — o teste exige 0 arquivos .md nesse diretório. `dense-architecture/docs/architecture-notes.md` = 1268 linhas (>1200 OK). `single-design-file/docs/ARCHITECTURE.md` = 465 linhas (>400 OK). Commit 66fb9b8.
- fase-03 concluída: `AGENTS.md.tpl` estendido com seção `## Anti-Vibe Extensions` (4 links DT-10); `AGENTS_REQUIRED_LINKS` em harness-validate.ts expandido para 7 links (3 originais + 4 novos); `tests/agents-md-template.test.ts` criado (5 testes TDD RED→GREEN). G4 aplicado: repo AGENTS.md atualizado como dogfood — links integrados na tabela `## When to Read What` para manter ≤40 linhas (split('\n').length = 40, exatamente no limite). tsc limpo.

---

## Metricas

| Fases planejadas | 3 |
|---|---|
| Fases concluidas | 3 |
| Arquivos criados | 20 (idempotency.ts, idempotency.test.ts, fixtures.test.ts, 16 fixture files, agents-md-template.test.ts) |
| Arquivos modificados | 4 (SKILL.md, AGENTS.md.tpl, harness-validate.ts, AGENTS.md) |
| Testes adicionados | 29 (11 idempotency + 13 fixtures + 5 agents-md-template) |
| Testes passando | 29 |

---

## Notas para Planos Seguintes

- fase-03 (AGENTS.md.tpl) é a última fase — estende o template com 4 links anti-vibe e valida ≤40 linhas

<!-- Atualizado automaticamente durante execucao -->
