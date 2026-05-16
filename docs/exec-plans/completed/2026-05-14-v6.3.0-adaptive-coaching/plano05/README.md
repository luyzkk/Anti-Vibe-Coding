# Plano 05: Polish & DX (Could Haves)

**Feature:** Adaptive Coaching v6.3.0 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3.5h
**Depende de:** Planos 01, 02, 04 (com nuances por fase — ver Análise de Dependências)
**Desbloqueia:** Nada direto — encerra o release v6.3.0 com DX polish
**Target:** v6.3.0 ou v6.3.1 (defer-friendly — cada fase é independente)

---

## O que este plano entrega

Agrupa os 3 itens Could Have do PRD em um único plano onde **cada fase é independente e deferable**. Cobre:

1. Flag `--refresh` em `/init` para regenerar apenas os artefatos `discovery/*.json` sem refazer Fases 0-1 do init quando `<24h` desde a última geração (RF-CH-01).
2. Threshold de confidence configurável em `config/adaptive-coaching.json` — quando `profile.confidence < threshold` (default 70), `readPrefaceContext` retorna `profile: null` para desligar a adaptação em projetos cuja detecção é incerta (RF-CH-02).
3. CLI debug `bun run preface:simulate {skill-name}` que printa o preface composto que SERIA injetado em uma skill, sem invocá-la — útil para debug e validação manual (RF-CH-03).

A pedra angular do design deste plano é a **deferability**: nenhuma fase bloqueia outra, e cada fase declara explicitamente seu critério de defer-to-v6.3.1.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status | Critério de defer |
|-------|-------------|--------|-------------------|
| `discovery/capabilities.json` produzido pelo `/init` | Plano 02 fase-03 | pendente — necessário para fase-01 | Se Plano 02 não estiver verde OU se a otimização <24h do PRD do `/init` (§RF-CH-02 desse PRD) não estiver mergeada, fase-01 vira v6.3.1. |
| `discovery/parity-gaps.json` produzido pelo `/parity-audit` | Plano 03 fase-02 | pendente — necessário para fase-01 (refresh inclui parity-gaps) | Se Plano 03 não estiver verde, fase-01 ainda funciona mas refresh só toca `capabilities.json` (degraded gracefully — warning informa). |
| `skills/lib/preface-context.ts` exportando `readPrefaceContext()` | Plano 01 fase-01 | pendente — necessário para fase-02 | Bloqueador hard. Sem o helper, não há threshold para aplicar. |
| `skills/lib/preface-context.ts` exportando o tipo `PrefaceContext` | Plano 01 fase-01 | pendente — necessário para fase-03 | Bloqueador hard. CLI precisa do tipo para tipar a saída. |
| Pelo menos 1 skill com bloco `<!-- profile-aware-preface:start -->` | Plano 04 fase-01 | pendente — necessário para fase-03 testar caso real | Soft — fase-03 tem fallback (printa preface default + warning "no preface-enabled skills found yet") se nenhuma skill estiver mergeada. |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Flag `--refresh` em `/init` | Humano via `/init --refresh` — atalho para `/parity-audit` + regeneração de `capabilities.json` quando a fase 0-1 está fresca |
| `config/adaptive-coaching.json` (schema novo) | `readPrefaceContext` (extensão); humanos editando o threshold |
| `scripts/preface-simulate.ts` | Humano via `bun run preface:simulate {skill-name}` — debug ad-hoc; CI eventual para snapshot de prefaces compostos |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de | Defer-OK? |
|------|---------|---------|--------|------------|-----------|
| 01 | [fase-01-init-refresh-flag.md](fase-01-init-refresh-flag.md) | Flag `--refresh` em `/init` regenera apenas `discovery/*.json` se `<24h` (RF-CH-01) | ~1.5h | Plano 02 fase-03 verde; idealmente Plano 03 fase-02 também (graceful degradation OK) | **Sim** — vira v6.3.1 se Plano 02 derrapar ou se otimização <24h do /init não estiver mergeada |
| 02 | [fase-02-confidence-threshold-config.md](fase-02-confidence-threshold-config.md) | `config/adaptive-coaching.json` (schema v1) + threshold default 70 desliga adaptação abaixo (RF-CH-02) | ~1h | Plano 01 fase-01 verde (readPrefaceContext existe) | **Sim** — Plano 01 sozinho garante CA-09; threshold é polish, não bloqueia release |
| 03 | [fase-03-preface-simulate-cli.md](fase-03-preface-simulate-cli.md) | `scripts/preface-simulate.ts` + `bun run preface:simulate {skill}` (RF-CH-03) | ~1h | Plano 01 fase-01 verde + Plano 04 fase-01 (≥1 skill com preface — fallback se ausente) | **Sim** — CLI de debug; nenhum critério de aceite do release depende disso |

---

## Grafo de Fases

```
Plano 01 fase-01 (readPrefaceContext)  ← BLOQUEADOR EXTERNO (hard)
        |
        +---------------------+-------------------+
        |                     |                   |
        v                     v                   v
   (Plano 02 fase-03)     fase-02            (Plano 04 fase-01)
   (Plano 03 fase-02)   (threshold)               |
        |                                         |
        v                                         v
     fase-01                                  fase-03
   (--refresh)                          (preface:simulate)


Paralelismo possivel: as 3 fases sao independentes apos seus bloqueadores
externos resolverem. Podem rodar em paralelo. fase-04 NAO existe — plano fecha em 03.
```

**Defer-friendly:** se qualquer bloqueador externo derrapar, a fase correspondente vira v6.3.1 sem afetar as outras duas. O plano como um todo nunca trava o release v6.3.0.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-02 (confidence threshold config)

Razão da escolha: é a fase com menor dependência externa (só Plano 01 fase-01) e maior densidade de testes (4 edge cases de threshold: 50/70/71/100). Provando que `readPrefaceContext` lê `config/adaptive-coaching.json` e respeita o threshold, as outras duas fases viram exercício mecânico de I/O + CLI scripting.

Framework: `bun:test` (consistente com Planos 01-04). Testes ficam em:
- `skills/lib/preface-context.test.ts` (estender o teste existente do Plano 01 com casos de threshold)
- `scripts/preface-simulate.test.ts` (CLI tem 1-2 testes de integração)
- `skills/init/lib/refresh-flag.test.ts` (parse + branching da flag)

---

## Gotchas Conhecidos

- **G1 — Defer-friendly é decisão explícita, não acidental:** Cada fase deste plano DEVE declarar no header `**Defer to v6.3.1: OK**` com critério específico ("se Plano X não estiver pronto OU se time-box estourar"). Isso elimina o risco de Could Have travar release. NÃO trate este plano como obrigatório para v6.3.0 — trate como "shippa se houver tempo, vira patch caso contrário".
- **G2 — fase-03 depende de Plano 04 fase-01 mas tem fallback:** A CLI `preface:simulate` precisa de uma skill com bloco `<!-- profile-aware-preface:start -->` para mostrar o preface real. Se nenhuma skill foi migrada ainda, a CLI deve printar o preface default + warning explícito (`no preface-enabled skills found yet — showing default fallback`). Isso permite que fase-03 rode e gere valor mesmo sem dependência forte.
- **G3 — Reuso da otimização <24h do PRD do /init:** RF-CH-01 reusa a otimização `cache fresh < 24h` do PRD do `/init` (§RF-CH-02 daquele PRD, não deste). Se aquela otimização não foi mergeada, fase-01 NÃO pode shippar — fica deferida com nota explícita em MEMORY.md. Validar via `grep -rn "<24h\|FRESH_THRESHOLD" skills/init/lib/` antes de iniciar fase-01.
- **G4 — Schema novo `config/adaptive-coaching.json` precisa de fixture:** O schema é novo (`config/_schemas/adaptive-coaching-v1.schema.json` não existe ainda). Criar fixture válida + 2 fixtures inválidas (threshold fora de [0..100], threshold ausente) em `config/__fixtures__/`. Sem fixtures, edge cases viram falso-positivo.
- **G5 — `process.env` parsing na CLI é frágil:** A CLI `preface:simulate {skill-name}` recebe argumento posicional. Validar via `process.argv[2]` E imprimir usage helpful quando ausente (não `undefined` no output). Mirror do pattern em `scripts/new-plan.ts` se aplicável.
- **G6 — `config/adaptive-coaching.json` deve ser opcional (não-existir é default ON):** Se o arquivo não existe, `readPrefaceContext` usa threshold = 70 (default). NÃO falhar com `ENOENT` — comportamento v6.2 preservado (CA-02). Teste explicitamente o caminho "arquivo ausente → threshold 70".
- **G7 — Sem AST/TypeScript parser disponível (herda Planos 03 G9 e 04 G7):** `package.json` tem só `gray-matter` + `js-yaml`. fase-02 valida o schema via JSON nativo (`JSON.parse` + checagens manuais) ou usa biblioteca leve se aceita. Aceitar tradeoff: validação manual > AJV pesado.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
