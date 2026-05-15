# Plan: /init `--reuse-discovery` flag (FRESH_THRESHOLD <24h cache)

**PRD:** ./PRD.md
**Planos:** 1 plano, 4 fases total
**Created:** 2026-05-15

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Reuse-Discovery Helper & SKILL Integration | 4 | ~4h | — |

---

## Grafo de Dependencias

```
Plano 01 (Reuse-Discovery Helper & SKILL Integration)
   |
   v
(unico plano — sem dependencias externas)
```

**Paralelismo possivel:** Dentro do Plano 01, fase-02 e fase-03 podem ser executadas em paralelo apos fase-01 (tocam pontos diferentes do mesmo modulo). fase-04 (Could Have) depende de fase-03.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-helpers-and-skill-step
**Descricao:** Helpers puros (`parseReuseDiscoveryFlag`, `readLastInitTimestamp`, `shouldReuseDiscovery`, `FRESH_THRESHOLD_MS`) + `Step reuse-discovery.0` em `skills/init/SKILL.md` com branching minimo (fresh -> skip para Step 7; stale/absent -> warn + fluxo normal, sem audit ainda). Prova end-to-end que o atalho funciona antes de investir em observabilidade.

---

## Resumo por Plano

### Plano 01: Reuse-Discovery Helper & SKILL Integration
> Implementa o modulo `skills/init/lib/reuse-discovery.ts` (helpers + constante FRESH_THRESHOLD_MS) e insere `Step reuse-discovery.0` em `skills/init/SKILL.md` para que `/init --reuse-discovery` pule fases caras quando o cache esta fresh (<24h). Cobre RF-MH-01..04 + RF-SH-01..02 + RF-CH-01 (opcional).

Fases:
- fase-01-helpers-and-skill-step: Tracer bullet — modulo + Step reuse-discovery.0 minimo + tests happy path (~2h)
- fase-02-audit-and-distinct-messages: Audit entry `subagent_id: 'reuse-discovery'` + mensagens stale vs absent (RF-SH-01, RF-SH-02; CA-02, CA-05) (~1h)
- fase-03-backward-compat-and-edge-cases: CA-04 (JSON corrompido), CA-06 (byte-identical sem flag), CA-07 (contrato de export estavel para plano05/fase-01) (~45min)
- fase-04-env-var-override-couldhave: RF-CH-01 — `ANTI_VIBE_FRESH_HOURS` override (Could Have, ship opcional) (~30min)

---

## Risks

- SKILL.md tem edit-fragility — inserir Step reuse-discovery.0 no lugar errado quebra outros steps.
  - Mitigacao: rodar `bun run harness:validate` antes do commit; insercao isolada antes de `Passo 0 — Detectar Modo de Inicializacao` (linha 450 da SKILL.md atual).
- Pattern `bun -e` quebra em Windows com paths absolutos (GT-04 do PRD do /init original).
  - Mitigacao: espelhar EXATO o pattern de `Step migrate.0` (linhas 47-53 da SKILL.md) — usa `await import` em JS block.
- Semantica de `agents-log.json.started_at` pode driftar (hoje e "quando AuditLogWriter foi instanciado", pode nao corresponder a "quando /init comecou").
  - Mitigacao: fase-01 inclui teste explicito do shape esperado; helper isolado permite ajuste sem mudar API publica.
- Plano05/fase-01 do PRD v6.3.0 consome `shouldReuseDiscovery + FRESH_THRESHOLD_MS` — drift de contrato bloqueia o consumer.
  - Mitigacao: CA-07 explicita o contrato; fase-03 inclui export check.
- Audit entry duplicado se o append falha apos parcial sucesso.
  - Mitigacao: append e a ULTIMA operacao do fluxo fresh; se falhar antes, nao ha entry.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (flag `--reuse-discovery`) | Plano 01, fase-01 |
| D2 (source: `discovery/agents-log.json.started_at`) | Plano 01, fase-01 |
| D3 (hardcoded `FRESH_THRESHOLD_MS = 24h`, nao configuravel) | Plano 01, fase-01 |
| D4 (posicao do step: antes do `Passo 0 — Detectar Modo de Inicializacao`) | Plano 01, fase-01 |
| D5 (stale = warn + fluxo normal, nao erro hard) | Plano 01, fase-02 |

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
