# Plano 01: Fundação Adaptativa

**Feature:** Adaptive Coaching v6.3.0 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4.5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02, Plano 03, Plano 04

---

## O que este plano entrega

Cria as peças de infraestrutura que todos os outros planos dependem: o helper `readPrefaceContext` que encapsula a leitura do architecture profile, os schemas JSON versionados para `capabilities.json` e `parity-gaps.json`, a documentação canônica do framework adaptativo, e os fixtures de regressão para os 5 profiles + a lógica de stale detection.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

Nenhum — este é o primeiro plano.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/lib/preface-context.ts` — `readPrefaceContext()` + `PrefaceContext` type | Plano 02 (capabilities-discovery), Plano 03 (parity-audit), Plano 04 (4-6 skills) |
| `discovery/_schemas/capabilities-v1.schema.json` | Plano 02 (valida output do AST parser e LLM-fallback) |
| `discovery/_schemas/parity-gaps-v1.schema.json` | Plano 03 (valida output de /parity-audit) |
| `skills/lib/stale-detector.ts` | Plano 02 (checksum ao gerar capabilities.json) |
| `docs/design-docs/adaptive-coaching-framework.md` | Plano 04 (migration guide para autores de skill) |
| `docs/design-docs/ADR-0020-adaptive-coaching.md` | Referência arquitetural para todos os planos |
| Fixtures `__fixtures__/preface-context-{profile}.expected.json` | Plano 04 (testes de regressão pós-integração) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | [fase-01-preface-context-helper.md](fase-01-preface-context-helper.md) | `PrefaceContext` type + `readPrefaceContext()` + testes [TRACER BULLET] | ~1h | Nenhuma |
| 02 | [fase-02-json-schemas-discovery-folder.md](fase-02-json-schemas-discovery-folder.md) | Schemas JSON versionados + `discovery/` folder + `.gitignore` | ~1h | Nenhuma |
| 03 | [fase-03-adr-doc-canonico.md](fase-03-adr-doc-canonico.md) | ADR-0020 + `adaptive-coaching-framework.md` | ~1.5h | fase-01, fase-02 |
| 04 | [fase-04-fixtures-stale-detection.md](fase-04-fixtures-stale-detection.md) | Fixtures 5 profiles + `stale-detector.ts` (RF-SH-01) | ~1h | fase-01 |

---

## Grafo de Fases

```
fase-01 (preface-context-helper) [TRACER BULLET]
│
├─→ fase-02 (json-schemas-discovery-folder) — paralelo com fase-01
│
├─→ fase-03 (adr-doc-canonico) — requer fase-01 + fase-02
│
└─→ fase-04 (fixtures-stale-detection) — requer fase-01
```

**Paralelismo possível:** fase-01 e fase-02 podem rodar em paralelo (sem dependência entre si). fase-03 e fase-04 aguardam fase-01 concluída. fase-03 também aguarda fase-02.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, não compilation error)
2. GREEN: código mínimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-01-preface-context-helper

Objetivo do tracer bullet: provar de ponta a ponta que o helper lê `architecture-profile.md` via `readArchitectureProfile()` existente e retorna o shape `{ profile, language, framework, confidence }` correto — fundação que todos os outros planos consomem.

---

## Gotchas Conhecidos

- `readPrefaceContext` DEVE ser wrapper de `readArchitectureProfile` — não duplicar lógica de leitura de arquivo. `readArchitectureProfile` já faz guard de feature flag, IO graceful e parse+validate.
- `language` e `framework` são SEMPRE `null` em v6.3.0. Não hardcode lógica de preenchimento — slots reservados para v6.5/v6.6 (PRD Decisão #2).
- `discovery/` folder não existe ainda — criar em fase-02 com `.gitkeep`. Apenas `discovery/*.json` é gitignored (não `_schemas/` nem `.gitkeep`).
- ADR já existem dois no projeto: `ADR-0001-manifest-checksums.md` e `ADR-0002-subagent-contract.md`. O próximo é `ADR-0020` (gap intencional — PRD usa esse número).
- `readArchitectureProfile` lê do manifest `.anti-vibe-manifest.json`, não de um `architecture-profile.md`. O nome do arquivo no PRD é enganoso — a fonte real é o manifest. Confirmar isso antes de implementar fase-01.
- Stale detection (fase-04) só emite WARNING — nunca bloqueia execução de skill (RF-SH-01).
- Shape do `PrefaceContext` deve permanecer estável quando v6.5 adicionar `language`/`framework` — não usar posicional, sempre named fields (CA-09).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
