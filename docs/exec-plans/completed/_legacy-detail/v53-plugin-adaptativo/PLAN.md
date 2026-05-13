# Plan: Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**PRD:** ./PRD.md
**Planos:** 5 planos, 27 fases total
**Created:** 2026-05-04

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Foundation (schemas + flag + tracer bullet) | 6 | ~6h | — |
| 02 | Architecture Detector | 5 | ~7.5h | Plano 01 |
| 03 | Telemetria Passiva | 4 | ~6h | Plano 01 |
| 04 | Modo Dual + 5 Princípios Universais | 6 | ~9h | Plano 01, 02 |
| 05 | Análise & Dogfooding | 6 | ~9h + 2 semanas | Plano 03, 04 |

---

## Grafo de Dependencias

```
Plano 01 (Foundation)
    |
    +----------+----------+
    |                     |
    v                     v
Plano 02 (Detector)   Plano 03 (Telemetria)
    |                     |
    +----------+----------+
               |
               v
       Plano 04 (Modo Dual)
               |
               v
       Plano 05 (Análise & Dogfooding)
```

**Paralelismo possivel:** Plano 02 e Plano 03 podem ser executados em paralelo após Plano 01 concluído (ambos só dependem de Foundation, e tocam áreas independentes).

**Caminho crítico:** Plano 01 → (02 ou 03) → 04 → 05. ~37h serial; ~30h se paralelizar 02 e 03.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-06-tracer-bullet-modo-dual
**Descricao:** Skill `/anti-vibe-coding:architecture` lê `architectureProfile` do manifest (perfil mock hardcoded `vertical-slice`) e adapta UMA mensagem de output do recommendation table. Prova arquitetura end-to-end (manifest → leitura → adaptação visível) sem detector real, sem telemetria, sem refatorar todas as 5 skills. ~1h.

---

## Resumo por Plano

### Plano 01: Foundation
> Estabelece infraestrutura compartilhada que todos os outros planos consomem: schemas do manifest e do JSONL de telemetria, feature flag, gerador de markdown legível, docs dos 5 perfis. Termina com Tracer Bullet provando a arquitetura end-to-end.

Fases:
- fase-01-schema-architecture-profile: campo `architectureProfile` em `.anti-vibe-manifest.json` com schemaVersion
- fase-02-schema-telemetry-jsonl: schema do `.claude/metrics/YYYY-MM.jsonl` (10 campos, evento start/end)
- fase-03-feature-flag: campo `architectureDetectorEnabled` (default `false`) no manifest
- fase-04-architecture-profile-md-generator: gerador do markdown legível `.claude/architecture-profile.md`
- fase-05-docs-perfis-arquiteturais: documentação dos 5 perfis em `anti-vibe-coding/docs/architecture-profiles.md`
- fase-06-tracer-bullet-modo-dual: skill `architecture` lê profile mock e adapta 1 mensagem (E2E proof)

### Plano 02: Architecture Detector
> Implementa a heurística de detecção (pastas + amostragem de imports) e expõe via skill manual `/anti-vibe-coding:detect-architecture` com confirmação do usuário quando confiança < 80%.

Fases:
- fase-01-heuristica-pastas-classificacao-preliminar: lê árvore `src/`, classifica preliminarmente nos 5 perfis
- fase-02-heuristica-amostragem-imports-confidence-score: amostra 5-10 arquivos, ajusta classificação, computa score 0-100%
- fase-03-skill-detect-architecture-cli: comando + flow + AskUserQuestion para confidence < 80%
- fase-04-persistencia-manifest-e-markdown: grava em manifest (JSON) + gera architecture-profile.md
- fase-05-cobertura-5-perfis-e2e: testes E2E para cada perfil (clean-arch-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed)

### Plano 03: Telemetria Passiva
> Cria lib reutilizável de instrumentação e a aplica nas 10 skills selecionadas. Garante append-only, rotação mensal, falha silenciosa.

Fases:
- fase-01-lib-telemetry-utils: helper compartilhado em `anti-vibe-coding/skills/lib/telemetry-utils.md` (write start/end, 10 campos, falha silenciosa)
- fase-02-instrumentar-pipeline-core: 5 skills (grill-me, write-prd, plan-feature, execute-plan, verify-work)
- fase-03-instrumentar-iterate-e-consultivas: 5 skills (iterate, consultant, architecture, design-twice, quick-plan)
- fase-04-rotacao-mensal-falha-silenciosa: rotação `YYYY-MM.jsonl` + tratamento de erros I/O sem derrubar skill (CA-09)

### Plano 04: Modo Dual + 5 Princípios Universais
> Adapta as 5 skills estruturantes ao perfil detectado (lê profile UMA vez no início, sem branching profundo) e integra os 5 princípios universais nos prompts/templates relevantes.

Fases:
- fase-01-helper-read-architecture-profile: utilitário `readArchitectureProfile()` reutilizado por todas skills
- fase-02-adaptar-architecture-skill: recommendation table adaptada por perfil (5 perfis × output)
- fase-03-adaptar-plan-feature: geração de fases adaptada (vertical-slice = 1 fase = 1 feature; layered = 1 fase = 1 camada)
- fase-04-adaptar-write-prd-templates-por-perfil: templates de PRD com snippets adaptados
- fase-05-adaptar-execute-plan-e-verify-work: execute-plan respeita perfil; verify-work mede aderência sem prescrever
- fase-06-integrar-5-principios-universais: #1 (10 Questions Test em consultant/grill-me), #5 (Comment Provenance em templates), #7 (Declarative-first em write-prd), #9 (Fresh-context review em verify-work), #10 (YAGNI checklist em consultant)

### Plano 05: Análise & Dogfooding
> Entrega script CLI de análise da telemetria e roda 2 semanas de uso real em projeto piloto (Licitar com flag=true, Carreirarte com flag=false). Fecha critérios CA-08, CA-11, CA-12.

Fases:
- fase-01-script-cli-analyze-metrics: `anti-vibe-coding/scripts/analyze-metrics.ts` lê `.claude/metrics/*.jsonl`, agrega N projetos opcionalmente, gera relatório baseline
- fase-02-could-haves: ASCII chart no script CLI (RF12) + override manual `--set` (RF14) + sugestão em /init (RF13)
- fase-03-setup-dogfooding-licitar-carreirarte: ativa flag=true em Licitar; instala v5.3 em Carreirarte com flag=false
- fase-04-coleta-50-entradas-e-relatorio: 2 semanas de uso, coleta ≥ 50 entradas, gera relatório baseline
- fase-05-validacao-ca-12-isolamento-entre-repos: confirma que Carreirarte se comporta como v5.2 (CA-12)
- fase-06-release-notes-v53-e-docs-finais: CHANGELOG, docs de upgrade, marketing/release notes

---

## Risks

- Detector classifica errado e Luiz não percebe
  - Mitigacao: confirmação se confiança < 80% (D10) + edição manual em `architecture-profile.md` (D3)
- Inconsistência na instrumentação de 10 skills (Plano 03)
  - Mitigacao: lib compartilhada `telemetry-utils.md` reutilizada por todas
- Explosão combinatória 5 perfis × 5 skills no Modo Dual (Plano 04)
  - Mitigacao: princípio "lê profile UMA vez no início, adapta saída via lookup table" — sem branching profundo
- Dogfooding 2 semanas pode coletar < 50 entradas
  - Mitigacao: começar dogfooding já durante Plano 04 em finalização (uso real concorrente)
- Decisões emergentes (D16 / 11 OQs) contradizem decisões registradas
  - Mitigacao: MEMORY.md por plano registra mudanças; consultar `decision-registry` antes de novas decisões
- Modo dual gera complexidade interna nas skills
  - Mitigacao: princípio "lê profile UMA vez", lookup table em vez de branching
- Telemetria gera arquivo gigante
  - Mitigacao: rotação mensal `YYYY-MM.jsonl` + JSONL append-only

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (público-alvo híbrido) | Plano 04 fase-06 (universais aplicáveis a comunidade), Plano 05 fase-06 (release notes) |
| D2 (5 universais + telemetria) | Plano 03 (telemetria), Plano 04 fase-06 (universais) |
| D3 (storage profile JSON+MD) | Plano 01 fase-01 (manifest), fase-04 (markdown) |
| D4 (5 perfis) | Plano 02 fase-05 (cobertura E2E), Plano 01 fase-05 (docs) |
| D5 (backfill opcional) | Plano 02 fase-03 (skill manual) — sem invocação automática |
| D6 (10 campos telemetria) | Plano 01 fase-02 (schema), Plano 03 fase-01 (lib) |
| D7 (telemetria local-only) | Plano 03 fase-01 (write local), Plano 05 fase-01 (script reads local) |
| D8 (trigger início + fim) | Plano 03 fase-01 (lib emite 2 linhas) |
| D9 (heurística pastas + imports) | Plano 02 fase-01 + fase-02 |
| D10 (confirmação se < 80%) | Plano 02 fase-03 (AskUserQuestion) |
| D11 (modo dual em 5 skills estruturantes) | Plano 04 fases 02-05 |
| D12 (graph navigation Onda 2) | Não aplicável — fora do escopo (Won't Have) |
| D13 (10 skills instrumentadas) | Plano 03 fase-02 + fase-03 |
| D14 (critério aceite com dogfooding) | Plano 05 fases 03-05 |
| D15 (feature flag opt-in) | Plano 01 fase-03 (flag) + Plano 05 fase-03 (rollout) |
| D16 (open questions resolvidas mid-flight) | MEMORY.md por plano |

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
