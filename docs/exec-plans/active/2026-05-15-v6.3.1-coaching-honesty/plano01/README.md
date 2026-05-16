# Plano 01: Honesty & Wire-up Core (Must Have)

**Feature:** v6.3.1 — Adaptive Coaching: Honesty & Wire-up ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~7.5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (snapshot rico + script wire-up + schema v2 são pré-requisitos para CA-05 use crossing, CA-08 stale wire-up e CA-11 tolerance cleanup)

---

## O que este plano entrega

Fecha os 4 defeitos PRD↔ship verificados em fresh-context na v6.3.0: AST honesty real, parser dual-field de agents, `/parity-audit` executável end-to-end (`bun run parity:audit`), e schema `parity-gaps-v2` alinhado ao runtime. Honestidade restaurada — auditores downstream podem confiar em `source: 'ast'` e `subagents[*].allowed_tools` não-vazios para agents reais.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| v6.3.0 Adaptive Coaching (completed) | `docs/exec-plans/completed/2026-05-14-v6.3.0-adaptive-coaching/SUMMARY.md` | pronto |
| `scripts/preface-simulate.ts` (template pure-fn DEC-4) | Plano 05 fase-03 da v6.3.0 | pronto |
| `skills/lib/tool-registry-inspector.ts` (snapshot composto) | Plano 03 fase-01 da v6.3.0 | pronto |
| `skills/lib/capabilities-writer.ts` (regex base a substituir) | Plano 02 fase-01 da v6.3.0 | pronto |
| `skills/parity-audit/lib/parity-gaps-writer.ts` (consumidor a migrar) | Plano 03 fase-02 da v6.3.0 | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Snapshot rico de `subagents[*].allowed_tools` (parser canônico) | Plano 02 fase-05 (`crossCapabilitiesWithUsage`) |
| `scripts/parity-audit.ts` executável | Plano 02 fases 05-07 (smoke tests CA-05) |
| Schema `parity-gaps-v2.schema.json` | Plano 02 fase-05 (validação contra v2) |
| AST writer honesto (source: 'ast' real) | Plano 02 fase-06 (stale warning lê `generated_at`) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-ast-real-capabilities-writer.md | AST real via `@typescript-eslint/parser` em `capabilities-writer.ts` (RF-MH-01) | 2h | — |
| 02 | fase-02-dual-field-parser-agents.md | `readSubagents` lê `tools:` (canônico) com fallback `allowed-tools:` + warning único (RF-MH-02) | 1.5h | — (independente técnica, ordem de PR após fase-01) |
| 03 | fase-03-parity-audit-script-wireup.md | `scripts/parity-audit.ts` pure-fn + entry `package.json` + SKILL.md ganha Bash (RF-MH-03) | 2h | fase-02 (snapshot rico via parser dual-field) |
| 04 | fase-04-schema-v2-parity-gaps.md | `parity-gaps-v2.schema.json` + writer migrado + v1 deprecated (RF-MH-04) | 2h | fase-03 (writer e script já usam shape rico) |

---

## Grafo de Fases

```
fase-01 (AST real)        fase-02 (dual-field parser)
    |                            |
    |                            v
    |                       fase-03 (script + SKILL.md)
    |                            |
    +-------------- + -----------+
                    |
                    v
              fase-04 (schema v2 + writer migration)
```

**Paralelismo possivel:** fase-01 e fase-02 são tecnicamente independentes (tocam arquivos diferentes — `capabilities-writer.ts` vs. `tool-registry-inspector.ts`). Em execução serial recomendada por ordem de PR, mas viável paralelizar em worktrees separadas se houver pressão de prazo.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-01 — prova que RF-MH-02 do PRD original v6.3.0 ("AST-first") é cumprível end-to-end. Capability com `source: 'ast', confidence: 1.0` torna-se honesta pela primeira vez.

---

## Gotchas Conhecidos

- **G1:** Enum `CapabilitySource = 'ast' | 'llm'` em `skills/lib/capabilities-writer.ts:4` é CONTRATO D4 do ADR-0020 (D1 do PRD v6.3.1) — NÃO expandir para `'regex'` ou similar. Auditores downstream filtram por `source === 'ast'`; bumping o enum quebraria semântica.
- **G2:** Deprecation warning em fase-02 DEVE ser cached em `Set<string>` (1× por agent). Sem cache, projeto com 13+ agents legacy poluiria stderr 13× por execução de `inspectToolRegistry`.
- **G3:** `import.meta.main` guard obrigatório em scripts (padrão DEC-4 de `scripts/preface-simulate.ts:92`). Pure-fn `audit()` exportada permite teste isolado sem `process.exit` colateral.
- **G4:** `discovery/parity-gaps.json` é gitignored (D8 da v6.3.0) — bump v1→v2 do schema é livre, sem migration automática em projetos cliente. Regen via `/init --refresh`.
- **G5:** `@typescript-eslint/parser` ^7.0.0 é a faixa compat com TS 5.4 (devDep atual em `package.json:22`). Bumps maiores podem requerer TS 5.5+. Pinar caret-range.
- **G6:** Convenção Claude Code oficial: agents=`tools:`, skills=`allowed-tools:` (ref `.claude/prd-v5/11-new-agents.md:31`). Confirmado em `agents/security-auditor.md:6` (campo `tools: Read, Grep, Glob`). Não inverter precedência.
- **G7:** `skills/lib/capabilities-types.ts` referenciado pelo prompt do plan-feature NÃO existe — os types (`CapabilitySource`, `Capability`, `CapabilitiesOutput`) vivem inline em `skills/lib/capabilities-writer.ts:4-22`. Toda referência a "capabilities-types.ts" nas fases deve apontar para `capabilities-writer.ts:4` em vez disso.
- **G8:** `package.json:5-17` é a lista canônica de scripts. Inserir `parity:audit` ALFABETICAMENTE entre `new-plan` (linha 12) e `preface:simulate` (linha 13). Linter/harness não força ordem, mas convenção do repo é alfabética.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
