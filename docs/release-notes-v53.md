# Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Data de release:** 2026-05-12
**Compatibilidade:** v5.2 → v5.3 sem breaking changes (opt-in puro)

---

## O que mudou

A v5.3 introduz três capacidades complementares — todas **opt-in**, com comportamento v5.2 preservado quando a feature flag está desligada.

### 1. Architecture Detector

Nova skill `/anti-vibe-coding:detect-architecture` que classifica seu projeto em 1 de 5 perfis arquiteturais:

- **clean-architecture-ritual** — separação rigorosa por camadas (`src/application/`, `src/domain/`)
- **mvc-flat** — controllers/services/models em pastas top-level
- **vertical-slice** — features auto-contidas, agrupadas por domínio
- **nextjs-app-router** — convenções `app/` com route groups e server components
- **unknown-mixed** — estrutura ambígua, greenfield ou perfil ainda não modelado

Score de confiança 0-100%. Pede confirmação se < 80%.

### 2. Modo Dual nas skills estruturantes

5 skills (`architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work`) leem o perfil detectado **uma vez no início** e adaptam suas recomendações sem prescrever refactor. Filosofia "adaptativo > opinativo" do plugin.

Exemplo: em projeto vertical-slice, `plan-feature` organiza fases por feature vertical, não por camada.

### 3. Telemetria passiva (parcialmente entregue — ver "Known limitations")

Schema JSONL com 10 campos, rotação mensal `.claude/metrics/YYYY-MM.jsonl`, script CLI [`scripts/analyze-metrics.ts`](../scripts/analyze-metrics.ts) para agregação. **Tudo local. Nada sai do repo.**

---

## 5 Princípios universais integrados

Padrões transversais que não dependem de perfil arquitetural, integrados em prompts e templates:

- **10 Questions Test** (em `consultant`, `grill-me`)
- **Comment Provenance** (em templates de PRD e fase)
- **Declarative-first** — outcomes antes de mecanismo (em `write-prd`)
- **Fresh-context Review** (em `verify-work`)
- **YAGNI checklist** (em `consultant`)

Detalhes em [docs/universal-principles-v53.md](universal-principles-v53.md).

---

## Privacy-first (D7 — irreversível)

- Telemetria nunca sai do repo
- Sem network calls
- Sem upload remoto
- Sem coleta de conteúdo de código (apenas metadata: counts, durações, perfis)

---

## Para quem é

Plugin é **híbrido** (D1):
- Single-user (autor): evolui com disciplina de retrocompat
- Comunidade externa: adoção via feature flag opt-in, comportamento v5.2 preservado quando flag=false

---

## Known limitations — Onda 1

### Telemetria implementada, coleta não-funcional (BUG-02)

A função `writeTelemetryStart`/`writeTelemetryEnd` ([skills/lib/telemetry-utils.ts](../skills/lib/telemetry-utils.ts)) existe e é testada (224 testes verdes), mas os blocos TypeScript adicionados em cada `SKILL.md` são tratados como prompt markdown pelo agente Claude — não como runtime executável. Resultado: `.claude/metrics/YYYY-MM.jsonl` não é populado durante uso real de skills.

**Workaround na Onda 1:** nenhum. Esperar fix arquitetural na Onda 2.

**Fix planejado para Onda 2:** par de hooks `PreToolUse`+`PostToolUse` com matcher `Skill` que dispara o writer via Bun, correlacionando start e end por `tool_use_id`. Spec em [docs/baseline-v53-onda1.md](baseline-v53-onda1.md).

### Vite + React SPA cai em `unknown-mixed`

Carreirarte (Vite + React Router SPA, único piloto da Onda 1) foi classificado como `unknown-mixed` com confidence automática abaixo do threshold, exigindo override manual. Sinais nativos (`src/pages/` + `src/components/` + `src/services/`, sem `app/` Next, sem `pages/` flat-route) não casam com nenhum dos 5 perfis.

**Implicação para Onda 2:** avaliar perfil dedicado (`react-spa-flat` ou `vite-spa`). Decisão espera dados de N≥3 projetos similares.

---

## Open Questions — status

| OQ | Pergunta | Status pós-Onda 1 |
|----|----------|-------------------|
| OQ1 | Métricas exatas de sucesso por skill | **Em aberto** — dados insuficientes (BUG-02). Onda 2 reabre. |
| OQ3 | Threshold 80% do detector | **Parcialmente respondida** — problema parece ser falta de perfil dedicado para Vite+SPA, não o threshold em si. |
| OQ11 | Flag `telemetryEnabled` opt-out | **Em aberto** — sem dados de uso, sem sinal de demanda. Onda 2 decide. |

Detalhes empíricos em [docs/baseline-v53-onda1.md](baseline-v53-onda1.md).

---

## Compatibilidade e validação

- **Manifest pré-v5.3 não quebra:** campo `architectureProfile` é opcional (CA-10).
- **CA-04 cumprido:** com `architectureDetectorEnabled: false`, comportamento v5.2 está integralmente preservado (coberto por testes textuais em [skills/lib/read-architecture-profile.test.ts](../skills/lib/read-architecture-profile.test.ts)).
- **CA-05 cumprido empiricamente:** saída de `/architecture` em Carreirarte (modo dual ativo) difere claramente do v5.2 genérico — cita perfil detectado, muda tom para consultor caso-a-caso.
- **CA-12 cumprido por testes:** isolamento entre repos (flag desligada produz output v5.2 e telemetria `profile_arquitetura: "disabled"`) coberto por testes e fixture canônica.
- **CA-11 deferred:** ≥50 pares válidos não foi atingido por BUG-02. Reabre na Onda 2.

Baseline detalhado em [docs/baseline-v53-onda1.md](baseline-v53-onda1.md).

---

## O que vem na Onda 2

Pré-requisito bloqueante:

- **Fix BUG-02** — reescrever instrumentação via hooks `PreToolUse`+`PostToolUse`. Sem isso, CA-11 e tudo que depende de baseline real ficam parados.

Depois do fix:

- Token Tax audit (campo `tokens_aproximados_consumidos` já modelado)
- Comprehension Debt tracking
- Avaliação de perfis adicionais: `rails-mvc`, `react-spa-flat`/`vite-spa`, DDD strategic, Monorepo
- Skill `/dependency-graph` (depende de tooling AST/MCP)

---

## Como atualizar

Veja [docs/upgrade-v52-to-v53.md](upgrade-v52-to-v53.md).

TL;DR: opt-in puro. Sem ação, plugin se comporta como v5.2.

---

## Reconhecimentos

Plugin desenvolvido com Claude Code como pair programming. Filosofia "humano navega, agente pilota" aplicada ao próprio framework — o BUG-02 só foi descoberto porque o dogfooding empírico expôs algo que a suite de testes isolados não pegou.
