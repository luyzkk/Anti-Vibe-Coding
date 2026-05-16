# Plano 02: Use Crossing & Tolerance Cleanup (Should/Could)

**Feature:** v6.3.1 — Adaptive Coaching: Honesty & Wire-up ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** Plano 01 (snapshot rico + schema v2 + `parity-audit` script wire-up)
**Desbloqueia:** Nenhum (último plano da feature)

---

## O que este plano entrega

Cumprimentos atrasados das CAs da v6.3.0 que ficaram pendentes: uso real cruzado contra capabilities declaradas (CA-05/CA-08), warning silencioso de `capabilities.json` stale nas 6 skills profile-aware (CA-09) e migração de `/architecture` + `/detect-architecture` ao bloco canônico `<!-- profile-aware-preface:start -->` com remoção das 2 tolerâncias remanescentes em `harness-validate.ts` (CA-10/CA-11). Ao final, a v6.3.1 fecha 100% das divergências verify-work + cumpre todas as CAs herdadas da v6.3.0.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Schema `parity-gaps-v2.schema.json` (shape rico) | Plano 01 fase-04 | pronto após Plano 01 |
| `parity-gaps-writer.ts:computeParityGaps` com shape rico | Plano 01 fase-03/04 | pronto após Plano 01 |
| `skills/lib/stale-detector.ts:checkStale` (já existe) | v6.3.0 RF-SH-01 | pronto — wire-up only |
| `scripts/parity-audit.ts` executável | Plano 01 fase-03 | pronto após Plano 01 |
| 6 skills profile-aware migradas ao padrão `readPrefaceContext` | v6.3.0 Plano 04 fase-01 | pronto (referência: `skills/security/SKILL.md`) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Nenhum plano subsequente — é o fechamento da v6.3.1 | N/A |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 05 | fase-05-gap-rules-use-crossing.md | `gap-rules.crossCapabilitiesWithUsage` integrada em `computeParityGaps` (RF-SH-01, CA-08) | 1.5h | Plano 01 fase-04 (schema v2 + shape rico) |
| 06 | fase-06-stale-wireup-profile-aware-skills.md | Wire-up `isStale`/warning stderr nas 6 skills profile-aware (RF-SH-02, CA-09) | 1h | — (wire-up puro, independente das outras fases do plano) |
| 07 | fase-07-migrate-architecture-skills-remove-tolerances.md | Migrar `/architecture` + `/detect-architecture` ao bloco profile-aware-preface + remover 2 tolerâncias em `harness-validate.ts:618-636` (RF-CH-01, CA-10) | 1.5h | fase-06 (padrão estabelecido nas 6 skills serve de referência exata) |

---

## Grafo de Fases

```
fase-05 (use-crossing)       fase-06 (stale wire-up)
       |                            |
       |                            v
       |                       fase-07 (migrar architecture + remover tolerancias)
       |                            |
       +-------------- + -----------+
                       |
                       v
                 Gate Plano 02 + CHANGELOG [6.3.1] + ADR addendum
```

**Paralelismo possivel:** fase-05 e fase-06 são tecnicamente independentes (tocam arquivos diferentes — `gap-rules.ts` vs. 6 `SKILL.md`). Viável paralelizar em worktrees separadas se houver pressão. fase-07 é sequencial após fase-06 (espelha padrão estabelecido).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck && bun run harness:validate
```

**Tracer Bullet deste plano:** N/A (Tracer foi fase-01 do Plano 01 — `source: 'ast'` honesto via `@typescript-eslint/parser`).

---

## Gotchas Conhecidos

- **G1:** `crossCapabilitiesWithUsage` SÓ vale se Plano 01 fase-04 (schema v2) shipou — `handler` com line suffix (`app/api/foo/route.ts:42`) exige shape rico. Sem v2, regex de strip de linha quebra contra v1 fixture.
- **G2:** Stale warning NUNCA bloqueia execução — alinhado com docstring de `skills/lib/stale-detector.ts:8-10` ("NUNCA bloqueia execução de skill — apenas retorna isStale para o caller decidir"). Implementação na fase-06 usa `process.stderr.write` apenas, sem `process.exit` nem `throw`.
- **G3:** Remoção das tolerâncias em `scripts/harness-validate.ts:619-630` é o ÚLTIMO passo de fase-07 — só executar APÓS migração das 2 skills passar `harness:validate` 2× rodadas verdes. Se remover antes, harness quebra e bloqueia commit.
- **G4:** Fase 07 é Could Have (RF-CH-01 do PRD) — pode ser pushed para v6.3.2 se prazo apertar. Plano 01 + fases 05/06 já entregam todos os Should Have (RF-SH-01/02). Tolerâncias remanescentes são inofensivas até migração final.
- **G5:** CA-12 (regression do CA-09 da v6.3.0): `readPrefaceContext` em projeto sem `.anti-vibe-manifest.json` DEVE continuar retornando `{ profile: null, language: null, framework: null, confidence: null }`. NUNCA preencher slots `language`/`framework` em fase-07 — reservado v6.5/v6.6 conforme D2 do ADR-0020.
- **G6:** No wire-up de fase-06, `capabilities.json` ausente NÃO deve emitir warning falso. Helper `readCapabilitiesJson` NÃO existe — o snippet precisa fazer try/catch direto via `fs.readFileSync` e retornar `null` silenciosamente quando arquivo não existe (vs. quando existe e está stale).
- **G7:** `stale-detector.ts:checkStale` precisa de `storedChecksums: Record<string, string>` — `capabilities.json` shape atual NÃO inclui esse campo. Fase-06 simplifica para check de IDADE (`generated_at > 24h`) sem usar `checkStale` diretamente — alinhado com PRD CA-09 ("`generated_at` há 25h").
- **G8:** `skills/architecture/SKILL.md` JÁ tem `<!-- profile-aware-preface:start --> ... :end -->` (linhas 35-82) mas usa `readArchitectureProfile` (linha 43). Fase-07 NÃO cria o bloco — substitui o conteúdo dentro dele por `readPrefaceContext`, espelhando padrão de `skills/security/SKILL.md:11-29`.
- **G9:** `skills/detect-architecture/SKILL.md` tem bloco profile-aware-preface PROSA-ONLY (linhas 10-13, sem fenced code block). `harness-validate.ts:626` documenta: "Prosa-only preface: sem bloco de codigo executavel — skip". Fase-07 precisa decidir: (a) converter para bloco TS com `readPrefaceContext` ou (b) manter prosa e remover apenas a tolerância de `readArchitectureProfile`. PRD §Mecanismo 7 indica (a) — migrar de fato; a tolerância de prosa-only PERMANECE (não é a tolerância alvo).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
