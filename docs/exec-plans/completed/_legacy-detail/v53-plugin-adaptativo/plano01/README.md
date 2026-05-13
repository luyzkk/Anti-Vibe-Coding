# Plano 01 — Foundation

**PRD:** `../PRD.md`
**Sizing total:** ~6h (6 fases)
**Dependências:** nenhuma — é o primeiro plano da Onda 1.

---

## Objetivo

Estabelecer a infraestrutura compartilhada que os planos 02 (Detector), 03 (Telemetria), 04 (Modo Dual) e 05 (Análise & Dogfooding) consomem. Foundation entrega schemas versionados, feature flag de rollout, gerador de markdown legível e documentação dos 5 perfis arquiteturais. Termina com um Tracer Bullet provando a arquitetura end-to-end (manifest → leitura → output adaptado) sem detector real e sem instrumentação completa.

A entrega deste plano é deliberadamente "magra": não há heurística, não há lib de telemetria, não há adaptação de skills. Apenas o esqueleto que torna possível trabalho paralelo nos planos 02 e 03 e cria o ponto de integração que o plano 04 vai expandir.

---

## Fases

| # | Nome | Sizing | Dependência |
|---|------|--------|-------------|
| 01 | schema-architecture-profile | ~1h | — |
| 02 | schema-telemetry-jsonl | ~1h | — (independente de 01) |
| 03 | feature-flag | ~0.5h | fase-01 (mesmo manifest) |
| 04 | architecture-profile-md-generator | ~1h | fase-01 |
| 05 | docs-perfis-arquiteturais | ~1.5h | — (doc, sem código) |
| 06 | tracer-bullet-modo-dual | ~1h | fase-01, fase-03, fase-04 |

Paralelismo possível: 01, 02 e 05 podem rodar concorrentes (não compartilham código). 03 depende de 01 (mesmo manifest), 04 depende de 01 (consome o schema), 06 depende de 01/03/04.

---

## Saída Esperada (ao final do plano)

1. `.anti-vibe-manifest.json` ganhou dois campos opcionais novos com schema documentado:
   - `architectureProfile` (objeto com `profile`, `confidence`, `detectedAt`, `signals[]`, `schemaVersion`)
   - `architectureDetectorEnabled` (boolean, default `false`)
2. Schema do `.claude/metrics/YYYY-MM.jsonl` definido e documentado em `anti-vibe-coding/docs/telemetry-schema.md` (10 campos, evento `start` e `end`).
3. Helper `isFeatureEnabled(flag: string): boolean` disponível e testado (sem chamadas reais ainda — consumido por planos 02-05).
4. Função geradora de `.claude/architecture-profile.md` a partir do JSON do manifest, determinística e testada.
5. Documentação completa dos 5 perfis em `anti-vibe-coding/docs/architecture-profiles.md`.
6. Skill `architecture` adapta UMA mensagem visível por perfil (Tracer Bullet) com profile mock `vertical-slice` no manifest, provando o caminho ponta a ponta.

---

## Critérios de Aceite do PRD Cobertos

- **CA-04 — Feature flag desligada preserva v5.2.** Coberto pela fase-03 (flag default `false`) + fase-06 (Tracer Bullet só ativa output adaptado quando flag = `true`).
- **CA-05 (preview) — Modo Dual adapta saída.** Coberto parcialmente pela fase-06 (prova de conceito com 1 mensagem; expansão completa ocorre no plano 04).
- **CA-10 — Manifest pré-v5.3 não quebra.** Coberto pela fase-01 (campos novos opcionais + teste explícito de parsing de manifest pré-v5.3).

---

## Notas para o Orchestrador

- Foundation NÃO implementa heurística de detecção (plano 02) nem grava telemetria de verdade (plano 03). Esta restrição é proposital: a "Foundation" deste plano é a infraestrutura de tipos/schemas/flags, não comportamento.
- Tracer Bullet (fase-06) usa profile **hardcoded** no manifest. Não invocar plano 02 antes desta fase.
- Perfil mock recomendado para o tracer bullet: `vertical-slice` (gera output mais distintivo do default v5.2 que `clean-architecture-ritual`).
