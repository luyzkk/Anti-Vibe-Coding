# Baseline v5.3 — Onda 1

**Período planejado:** 2026-05-05 → 2026-05-19 (14 dias)
**Período efetivo:** 2026-05-05 → 2026-05-12 (7 dias — encerrada antecipadamente)
**Projeto piloto:** Carreirarte (`architectureDetectorEnabled: true`)
**Status:** baseline empírica não obtida — CA-11 movido para Onda 2

---

## Resumo executivo

A janela de dogfooding foi encerrada no mid-checkpoint (Day 7) ao descobrir-se um bug arquitetural crítico (BUG-02) que torna a instrumentação de telemetria não-funcional em produção. Esperar os 7 dias restantes não produziria dados — o problema é estrutural, não de volume de uso.

O dogfooding cumpriu seu propósito real: **expor um bug que testes textuais isolados não pegariam.**

---

## Números observados

| Métrica | Valor |
|---------|-------|
| Pares válidos (start+end) coletados | 0 |
| Linhas brutas escritas | 0 |
| Linhas malformadas | 0 |
| `.claude/metrics/2026-05.jsonl` em Carreirarte | não existe (nunca foi criado) |
| Skills do plugin invocadas no período | múltiplas (no próprio repo do plugin durante desenvolvimento da Onda 1) |
| Skills que geraram telemetria | nenhuma |

---

## BUG-02 — Causa raiz

A "instrumentação" do Plano 03 consistia em blocos TypeScript no topo e fim das 10 `SKILL.md` chamando `writeTelemetryStart()` e `writeTelemetryEnd()`.

`SKILL.md` é **prompt markdown** consumido pelo agente Claude, não runtime executável. Não há:

- Hook `PostToolUse` ou `Stop` em [hooks/hooks.json](../hooks/hooks.json) que dispare a escrita
- Wrapper externo que invoque skills via Bun
- Instrução em prosa pedindo ao agente para rodar `bun -e '...'` no início/fim

Os 224 testes da suite verificam o writer em isolamento via Bun e ficam verdes, mas o mecanismo nunca executa durante uso real de skills.

---

## Open Questions — status pós-Onda 1

| OQ | Pergunta | Status |
|----|----------|--------|
| OQ1 | Métricas exatas de sucesso (tempo médio por skill, taxa de abandono, etc.) | **Em aberto** — dados insuficientes. Onda 2 reabre após fix BUG-02. |
| OQ3 | Threshold 80% do detector é o número certo? | **Parcialmente respondida** — Carreirarte (Vite+SPA) caiu em fallback `unknown-mixed` com confidence < 80% e exigiu override manual. Sugere que o problema não é o threshold, é falta de perfil dedicado (`react-spa-flat`/`vite-spa`). Onda 2 valida com N≥3 projetos. |
| OQ11 | Adicionar flag `telemetryEnabled` opt-out? | **Em aberto** — sem dados de uso, não há sinal de demanda por opt-out. Onda 2 decide com baseline real. |

---

## CA-12 — Isolamento entre repos (cobertura)

Apesar da fase-05 ter sido marcada `obsolete` (DEV-07), CA-12 fica coberto por:

1. **Testes textuais** [skills/lib/read-architecture-profile.test.ts](../skills/lib/read-architecture-profile.test.ts) — `readArchitectureProfile()` retorna `null` quando flag=false.
2. **Regression tests** [skills/lib/telemetry-utils.test.ts](../skills/lib/telemetry-utils.test.ts) — telemetria escreve `profile_arquitetura: "disabled"` independentemente da flag.
3. **Fixture canônica** [skills/lib/__fixtures__/manifests/flag-disabled.json](../skills/lib/__fixtures__/manifests/flag-disabled.json).

Cobertura por testes é completa; ausência de validação empírica em projeto controle (Licitar virou Rails, saiu do escopo — DEV-03) não invalida a garantia.

---

## CA-05 — Saída adaptativa (cumprido empiricamente)

Único critério de aceite empírico cumprido na Onda 1 (DEV-10, 2026-05-05):

- `/anti-vibe-coding:detect-architecture` em Carreirarte → perfil `unknown-mixed` com override manual a 100% confidence
- `/anti-vibe-coding:architecture` em modo dual ativo produziu saída **diferente do v5.2 genérico**: citou perfil detectado, mudou tom para consultor caso-a-caso, mencionou explicitamente que skills estruturantes vão "tratar caso a caso, sem assumir padrões de pasta"

Transcrição em [exec-plans/completed/_legacy-detail/v53-plugin-adaptativo/plano05/MEMORY.md](./exec-plans/completed/_legacy-detail/v53-plugin-adaptativo/plano05/MEMORY.md) seção "Smoke Carreirarte".

---

## Recomendação para Onda 2 — Fix BUG-02

Pré-requisito para reabrir CA-11. Approach recomendado (1b — par `PreToolUse`/`PostToolUse`):

1. Adicionar em [hooks/hooks.json](../hooks/hooks.json):
   - `PreToolUse` com `matcher: "Skill"` → grava `start` com `tool_use_id` como chave em `.claude/metrics/.pending-starts.json`
   - `PostToolUse` com `matcher: "Skill"` → lê `tool_use_id`, calcula `duracao_ms`, grava `end` em `.claude/metrics/YYYY-MM.jsonl`
2. Aceitar órfãos `start` quando sessão crasha entre Pre e Post (já modelado em [scripts/analyze-metrics.ts](../scripts/analyze-metrics.ts) via `Starts orfaos`).
3. Validação: rodar qualquer skill instrumentada e verificar que o JSONL ganha 2 linhas. Sem isso, CA-11 continua bloqueado.

Custo estimado: 4-6h impl + regression para CA-09 silent-fail e isolamento entre sessões paralelas.

---

## Conclusão

Onda 1 entregou 4 das 5 capacidades planejadas (Architecture Detector, Modo Dual, Telemetria *implementação*, 5 Princípios Universais). A quinta capacidade — *coleta efetiva* de telemetria em produção — depende de fix arquitetural na Onda 2. Não há regressão funcional: o comportamento v5.2 está preservado integralmente quando a flag opt-in está desligada (CA-04).

<!-- Gerado em 2026-05-12 após mid-checkpoint da fase-04 (Plano 05) -->
