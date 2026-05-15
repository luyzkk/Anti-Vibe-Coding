# Plano 01: Reuse-Discovery Helper & SKILL Integration

**Feature:** /init `--reuse-discovery` flag — FRESH_THRESHOLD <24h cache ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4h
**Depende de:** Nenhum (primeiro e unico plano)
**Desbloqueia:** PRD v6.3.0-adaptive-coaching / plano05/fase-01 (`/init --refresh`) — atualmente em status paused

---

## O que este plano entrega

Modulo publico `skills/init/lib/reuse-discovery.ts` (helpers puros + `FRESH_THRESHOLD_MS`) e o branch `Step reuse-discovery.0` inserido em `skills/init/SKILL.md`. Resultado: `/init --reuse-discovery` pula Fases 0-1 quando o cache esta fresh (<24h) e cai no Step 7 (Capabilities Discovery) com overhead <500ms; quando stale ou ausente, warn distinto + fluxo normal. Comportamento sem a flag fica byte-identical ao v6.2.x.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `AuditLogWriter`, `AgentsLog`, `started_at` em `discovery/agents-log.json` | `skills/init/lib/audit-log.ts:32` | pronto |
| Pattern `parseDryRunFlag` (mirror para `parseReuseDiscoveryFlag`) | `skills/init/SKILL.md` linhas 42-53 (`Step migrate.0`) | pronto |
| Step 7 (Capabilities Discovery) | `skills/init/SKILL.md` linhas 386-446 | pronto |
| Local de insercao do Step reuse-discovery.0 | `skills/init/SKILL.md` linha 450 (`Passo 0 — Detectar Modo de Inicializacao`) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `shouldReuseDiscovery(cachedAt)` + `FRESH_THRESHOLD_MS` (exports estaveis) | PRD v6.3.0-adaptive-coaching / plano05/fase-01-init-refresh-flag (paused) |
| `parseReuseDiscoveryFlag` + `readLastInitTimestamp` | Step reuse-discovery.0 do proprio /init |
| Audit entry com `subagent_id: 'reuse-discovery'` | Auditoria/diagnostico pos-fato |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-helpers-and-skill-step.md | Modulo `reuse-discovery.ts` + `Step reuse-discovery.0` minimo + tests happy path. Cobre RF-MH-01..04, CA-01, CA-03. | 2h | — |
| 02 | fase-02-audit-and-distinct-messages.md | Audit entry `reuse-discovery` no fresh path + mensagens distintas stale vs absent. Cobre RF-SH-01, RF-SH-02, CA-02, CA-05. | 1h | fase-01 |
| 03 | fase-03-backward-compat-and-edge-cases.md | JSON corrompido -> null, byte-identical sem flag, export-contract test. Cobre CA-04, CA-06, CA-07. | 0.5h | fase-01 |
| 04 | fase-04-env-var-override-couldhave.md | `ANTI_VIBE_FRESH_HOURS` override via dependency injection. Could Have, ship opcional. Cobre RF-CH-01. | 0.5h | fase-03 |

---

## Grafo de Fases

```
fase-01 (helpers + Step reuse-discovery.0 minimo)
    |
    +----------+
    |          |
    v          v
fase-02     fase-03
(audit +    (edge cases +
mensagens)  contrato)
               |
               v
           fase-04
           (env override — opcional)
```

**Paralelismo possivel:** fase-02 e fase-03 podem rodar em paralelo apos fase-01 (tocam pontos diferentes do mesmo modulo — fase-02 mexe em SKILL.md + audit; fase-03 mexe em tests de robustez + snapshot). fase-04 depende de fase-03 (precisa do `shouldReuseDiscovery` aceitar override).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test skills/init/lib/reuse-discovery.test.ts && bun run lint && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-01-helpers-and-skill-step

Justificativa do tracer: prova end-to-end que helpers + branch SKILL.md funcionam juntos para o happy path antes de investir em observabilidade (fase-02) ou robustez (fase-03). Se fase-01 quebrar a edicao de SKILL.md (G2), todo o resto eh bloqueado.

---

## Gotchas Conhecidos

- **G1 (Windows + bun -e, GT-04 do PRD do /init):** `bun -e` com paths absolutos quebra no Windows. ESPELHAR EXATO o pattern de `Step migrate.0` (linhas 47-53 de `skills/init/SKILL.md`) que usa `await import` em JS block. Aplica a fase-01 (insercao do Step reuse-discovery.0).
- **G2 (SKILL.md edit-fragility):** insercao no lugar errado quebra outros steps. Rodar `bun run harness:validate` antes do commit. Aplica a fase-01 e fase-02.
- **G3 (semantica de `started_at`):** hoje eh "quando AuditLogWriter foi instanciado" (`skills/init/lib/audit-log.ts:32`), pode ou nao corresponder a "quando /init comecou". Helper deve ser tolerante e testar shape explicitamente. Aplica a fase-01 e fase-03.
- **G4 (idempotencia):** Step reuse-discovery.0 NUNCA deve duplicar entries de `capabilities-discovery` ao chamar Step 7 — Step 7 ja chama `AuditLogWriter` para `capabilities-discovery`. O audit entry novo do `reuse-discovery` eh ADICIONAL, nao substitui. Aplica a fase-02 (CA-05).
- **G5 (Comment Provenance):** todo comentario inline em codigo gerado deve ter linhagem `// 2026-05-15 (Luiz/dev): {motivo} — alinhado com PRD §{secao}`. Aplicar em TS gerado, NAO em SKILL.md.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
