# Memoria: Plano 01 — Reuse-Discovery Helper & SKILL Integration

**Feature:** /init `--reuse-discovery` flag (FRESH_THRESHOLD <24h cache)
**Iniciado:** 2026-05-15
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-01 (fase-03):** Todos os testes CA-04 (edge cases) foram direto GREEN — o `try/catch`
  + type guard `typeof parsed.started_at === 'string'` ja cobriam JSON corrompido, campo ausente
  e campo nao-string. Nenhum ajuste em `reuse-discovery.ts` foi necessario.

- **DI-02 (fase-03):** CA-06 stricter (snapshot byte-identical de agents-log.json) deferido
  para smoke test manual — cobertura estrutural via `parseReuseDiscoveryFlag([]) === false` eh
  suficiente para PR. Para verificacao manual: rodar `/init` sem flag e fazer `git diff` em
  `discovery/agents-log.json` contra versao v6.2.x.

- **DI-03 (fase-03):** Contagem final de testes = 19 (nao 20 como estimado nas instrucoes)
  porque o primeiro teste CA-06 (`parseReuseDiscoveryFlag([]) === false`) ja existia desde
  fase-01/fase-02 (linha 39 do arquivo de teste). Apenas o segundo CA-06 (`['--dry-run',
  '--verbose']`) foi adicionado como teste novo.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- preencher durante execucao -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-01 (fase-01):** Script `lint` nao existe em `package.json` deste projeto. Fases futuras
  devem usar `bun run typecheck` como substituto de typecheck/lint. `bun run harness:validate`
  cobre validacao estrutural de markdown/SKILL.md.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- preencher durante execucao -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Assinaturas finais de exports (validadas por testes em fase-04):**

- `parseReuseDiscoveryFlag(args: string[]): { reuseDiscovery: boolean }`
- `readLastInitTimestamp(projectRoot: string): Promise<string | null>`
- `shouldReuseDiscovery(cachedAt: string | null, thresholdMs?: number): boolean`
- `formatStaleMessage(cachedAt: string | null): string`
- `resolveThresholdMs(envValue: string | undefined): number`
- `FRESH_THRESHOLD_MS: number` (= 24 * 60 * 60 * 1000 = 86400000ms)

Todos exportados de `skills/init/lib/reuse-discovery.ts`.
Consumidor: PRD v6.3.0-adaptive-coaching / plano05/fase-01-init-refresh-flag (paused).

**CA-06 stricter (snapshot byte-identical):** nao automatizado — requer smoke test manual
rodando `/init` sem flag e verificando `git diff` em `discovery/agents-log.json` contra
versao v6.2.x.

**RF-CH-01 (Could Have — env override):** Entregue em fase-04. `ANTI_VIBE_FRESH_HOURS` env var
sobrescreve `FRESH_THRESHOLD_MS` via DI (`thresholdMs` parametro opcional em `shouldReuseDiscovery`).
Verificacao humana: `ANTI_VIBE_FRESH_HOURS=1` + projeto com `started_at` ha 2h → mensagem stale.

<!-- SHA dos commits fase-04: e56bba0 (RED tests), e718cf3 (GREEN impl) -->

---

<!-- Atualizado automaticamente durante execucao -->
