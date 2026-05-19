# Plano 04: Reentrada + Validator allowlist + Audit Step 12

**Feature:** init-llm-driven-harness-population ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~6h
**Depende de:** Plano 03 (gerador LLM-driven do PLAN populate)
**Desbloqueia:** Plano 05 (E2E precisa reentry funcionando)

---

## O que este plano entrega

Init seguro contra re-execucao em projetos ja inicializados na v6.5.0+ (aborta com mensagem) e seguro para migrar projetos < 6.5.0 (backup completo + re-populate). Final-validation deixa de produzir 179 falsos positivos: passa a usar allowlist derivada do `TEMPLATE_MANIFEST`, agrupada por doc canonico, em modo warning (nao aborta init). Step 12 (`detect-drift-incremental`) e auditado contra a allowlist e removido/coexistido conforme sobreposicao.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| `TEMPLATE_MANIFEST` com >=10 docs (incluindo CODE_STYLE.md) | Plano 02 | pronto |
| Step 91 (`generate-populate-plan`) rodando ANTES do Step 90 | Plano 01 fase-01 + Plano 03 fase-04 | pronto |
| Helper `createBackup` disponivel para inspiracao | Plano 02 | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Reentry guard validando v6.5.0+ vs < 6.5.0 | Plano 05 (E2E exercita ambos cenarios) |
| Allowlist exportada de `validator-allowlist.ts` | Plano 05 (assertions de warning count) |
| Step 90 warning mode (nao aborta) | Plano 05 (CA-07: PLAN.md persistido apos warning) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-reentry-guard-step.md | Step `00_2-reentry-guard` antes do scaffold; aborta >=6.5.0, sinaliza re-populate < 6.5.0 | 1.5h | — |
| 02 | fase-02-pre-6_5_0-backup-completo.md | Step `00_3-backup-pre-6_5_0` copia `docs/` -> `docs/_legacy/pre-6.5.0/` quando reentry sinaliza re-populate | 1h | fase-01 |
| 03 | fase-03-validator-allowlist-de-template-manifest.md | Helper `buildAllowlistFromTemplateManifest()` + Step 90 emite warnings agrupados por doc canonico | 1.5h | — |
| 04 | fase-04-final-validation-warning-mode.md | Step 90 retorna `{ mutated:false, summary:'warnings: ...' }` em vez de lancar AbortError | 0.5h | fase-03 |
| 05 | fase-05-audit-step-12-detect-drift.md | Auditoria de Step 12 vs allowlist: remover do registry se sobreposto, documentar coexistencia se ortogonal | 1.5h | fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (reentry-guard)
    |
    v
fase-02 (backup pre-6.5.0)        fase-03 (validator allowlist)
                                          |
                                          v
                                  fase-04 (warning mode)
                                          |
                                          v
                                  fase-05 (audit Step 12)
```

**Paralelismo possivel:** fase-01+02 (sequencial entre si) podem rodar em paralelo com fase-03+04+05 (sequencial entre si). Ate o handoff para Plano 05 todas precisam estar verdes.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Plano 01 ja teve o tracer da feature; este plano integra ao pipeline existente).

---

## Gotchas Conhecidos

- **G1:** Manifest path correto e `.claude/.anti-vibe-manifest.json` (NAO raiz). `readManifest(targetDir)` em `manifest-writer.ts` ja resolve isso — reusar a funcao, nao reabrir arquivo.
- **G2:** `pluginVersion` ausente no manifest deve ser tratado como < 6.5.0 (re-popular). Manifest existente mas sem campo = projeto antigo.
- **G3:** Comparacao semver: `'6.4.10'` < `'6.4.9'` lexicograficamente — usar `Bun.semver.order` ou split numerico explicito (`a.split('.').map(Number)`).
- **G4:** Em greenfield (sem manifest), `readManifest` retorna `null`. NAO confundir com erro; e o caminho feliz.
- **G5:** `fs.cp(..., { recursive: true })` requer Node 18+ / Bun. Suportado no runtime alvo, mas precisa de teste explicito de idempotencia (segunda execucao com `docs/_legacy/pre-6.5.0/` pre-existente).
- **G6:** `docs/_legacy/pre-6.5.0/` esta DENTRO de `docs/`. Copia recursiva ingenua leva ao infinito. Excluir destino do walk (`filter: (src) => !src.includes('_legacy/pre-6.5.0')`).
- **G7:** Allowlist precisa cobrir tambem `docs/exec-plans/active/**/PLAN.md`, `STATE.md`, `plano-populate-harness/**`, `docs/compound/_imported/**` — paths gerados em runtime que nao constam de `TEMPLATE_MANIFEST`.
- **G8:** Step 90 atualmente lanca `AbortError` em `exitCode !== 0`. Wording byte-identico do PRD R1/G1 (Plano 01) era restricao do refactor antigo — pode ser RELAXADO aqui pois o output do validator novo e diferente.
- **G9:** Step 12 (`detect-drift-incremental`) so executa quando `ctx.flags['__initMode'] === 'already-initiated'`. Pos-fase-01, a flag relevante e `__reentryMode` (`greenfield | re-populate | abort`). Verificar callers antes de deletar.
- **G10:** Tracer-bullet tests podem importar `drift-detector.ts` indiretamente. Antes de deletar lib orfa, rodar grep por `drift-detector` em `tests/` e `skills/init/lib/`.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
