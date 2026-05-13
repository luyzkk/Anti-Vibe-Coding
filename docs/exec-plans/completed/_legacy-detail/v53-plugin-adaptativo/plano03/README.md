# Plano 03: Telemetria Passiva

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1) ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6h
**Depende de:** Plano 01 (Foundation) — fase-02 (schema JSONL) e fase-03 (feature flag, consumida indiretamente)
**Desbloqueia:** Plano 05 (Análise & Dogfooding) — script CLI lê o que esta lib produz

---

## O que este plano entrega

Lib reutilizável de instrumentação (`writeTelemetryStart`, `writeTelemetryEnd`) aplicada nas 10 skills selecionadas (D13). Garante append-only, rotação mensal `YYYY-MM.jsonl`, falha silenciosa em I/O (CA-09). Após este plano, qualquer invocação das 10 skills produz 2 linhas JSONL em `.claude/metrics/YYYY-MM.jsonl` sem alterar comportamento existente das skills.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Tipos `TelemetryStart`, `TelemetryEnd`, `TelemetryEntry` | Plano 01, fase-02 (`telemetry-types.ts`) | pendente |
| Validador `parseTelemetryEntry` (usado em testes para sanity check do output) | Plano 01, fase-02 (`telemetry-schema.ts`) | pendente |
| Documentação dos 10 campos (`telemetry-schema.md`) | Plano 01, fase-02 | pendente |
| Helper `isFeatureEnabled(flag)` — NÃO consumido aqui (telemetria ignora flag, G5) | Plano 01, fase-03 | pendente (referência) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Funções `writeTelemetryStart(entry)` / `writeTelemetryEnd(entry)` | Plano 04 (skills estruturantes vão chamar via novo wrapper de profile, opcional) |
| `.claude/metrics/YYYY-MM.jsonl` populado em projeto piloto | Plano 05 fase-01 (script CLI `analyze-metrics.ts`) e Plano 05 fase-04 (coleta de 50+ entradas) |
| Convenção de fase do pipeline na lib (helper `inferFasePipeline(skillName)`) | Plano 05 fase-01 (agregação por fase) |
| 10 skills instrumentadas (D13) | Plano 05 fases 03-04 (dogfooding em Licitar) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-lib-telemetry-utils.md | Helper `anti-vibe-coding/skills/lib/telemetry-utils.md` com `writeStart`, `writeEnd`, `appendJsonlLine`, falha silenciosa | 2h | Plano 01 fase-02 |
| 02 | fase-02-instrumentar-pipeline-core.md | 5 skills do pipeline core (`grill-me`, `write-prd`, `plan-feature`, `execute-plan`, `verify-work`) com 2 chamadas cada | 1.5h | fase-01 |
| 03 | fase-03-instrumentar-iterate-e-consultivas.md | 5 skills consultivas (`iterate`, `consultant`, `architecture`, `design-twice`, `quick-plan`) com mesmo padrão | 1.5h | fase-01 |
| 04 | fase-04-rotacao-mensal-falha-silenciosa.md | Confirma rotação `YYYY-MM`, CA-09 explícito (regression test de I/O com path inválido), edge case de skill que crash em meio à execução | 1h | fase-01 a 03 |

---

## Grafo de Fases

```
fase-01 (lib telemetry-utils)
    |
    +----------+----------+
    |                     |
    v                     v
fase-02 (5 skills)    fase-03 (5 skills)
    |                     |
    +----------+----------+
               |
               v
       fase-04 (rotação + CA-09)
```

**Paralelismo possivel:** fase-02 e fase-03 podem rodar concorrentes após fase-01 concluída (cada uma toca 5 skills independentes; nenhuma compartilha código com a outra além da lib).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste com path em tmp dir + assertion no conteúdo do JSONL gerado
2. GREEN: implementação mínima (appendFileSync + ensureDir + try/catch)
3. REFACTOR: extrair helpers puros (computeMonthlyPath, serializeEntry)
4. VERIFY: bun run test --grep '<fase>' && bun run lint && bun run typecheck
```

Estratégia específica:
- **Funções puras primeiro (fase-01):** `serializeEntry(entry): string` e `computeMonthlyPath(now: Date): string` testáveis sem IO. `appendJsonlLine(path, line)` testado com path em `os.tmpdir()`.
- **Instrumentação (fase-02 e fase-03):** smoke test — invocar bloco de código da skill, conferir que `.claude/metrics/YYYY-MM.jsonl` recebeu 2 linhas com `evento: "start"` e `evento: "end"` válidas via `parseTelemetryEntry`.
- **Edge cases (fase-04):** simular `EACCES` / dir inexistente sem permissão de criar; confirmar que skill termina sem throw e stderr recebe `[telemetry-warn]`.

**Tracer Bullet deste plano:** N/A — o tracer bullet do PRD vive em Plano 01 fase-06. Plano 03 é o primeiro consumidor real do schema JSONL definido em Plano 01 fase-02.

---

## Gotchas Conhecidos

Indexados para referência cruzada nas fases. Cada fase cita o `Gx` aplicável.

- **G1: JSONL é append-only.** Nunca abrir em modo `w` (write/truncate). Sempre `a` (append). Uma linha por evento, terminada com `\n`. Não envolver em array JSON. Aplicado em fase-01.
- **G2: Falha silenciosa de I/O (CA-09).** `try { fs.appendFileSync(...) } catch (e) { console.error('[telemetry-warn]', e.message) }`. JAMAIS lançar para o caller. Skill continua mesmo se telemetria falhar. Aplicado em fase-01 e validado em fase-04.
- **G3: Path do arquivo computa mês corrente NA ESCRITA.** `.claude/metrics/YYYY-MM.jsonl` onde `YYYY-MM = new Date().toISOString().slice(0, 7)`. NÃO cachear path em variável global — uma skill que rodou 30s antes da virada de mês pode escrever `start` em um arquivo e `end` em outro. Comportamento aceito (raro), registrado em MEMORY.md.
- **G4: Diretório `.claude/metrics/` pode não existir.** Helper `ensureDir(path.dirname(file))` antes do append (`mkdirSync` com `recursive: true`). Se `mkdir` falhar (permissão), também cai no catch silencioso. Aplicado em fase-01.
- **G5: Telemetria NÃO é gated pela feature flag `architectureDetectorEnabled`.** Telemetria sempre ativa por default (PRD: "Telemetria passiva ignora a flag — sempre ativa"). Apenas o campo `profile_arquitetura` recebe valor `"disabled"` quando a flag = false (a fase-02 do Plano 01 já documenta este valor no schema). Aplicado em fase-02 e fase-03 ao escolher o valor de `profile_arquitetura` no `start`.
- **G6: Tokens aproximados.** Não temos contador real exato — usar heurística do contexto OU deixar `0` quando não disponível. Decisão emergente sugerida: aceitar `0` como "não medido" e registrar em MEMORY.md. Aplicado em fase-01 (default `0` em campos numéricos).
- **G7: 10 skills instrumentadas (D13).** Não adicionar/remover sem registrar em MEMORY.md. Lista exata: `grill-me`, `write-prd`, `plan-feature`, `execute-plan`, `verify-work`, `iterate`, `consultant`, `architecture`, `design-twice`, `quick-plan`. Pipeline core (5) na fase-02; consultivas (5) na fase-03.
- **G8: Skills SÃO markdown executável (lição do CLAUDE.md raiz).** Helpers em `anti-vibe-coding/skills/lib/<nome>.md` com lógica TS dentro de blocos de código triple-backtick. Instrumentação em SKILL.md das 10 skills via blocos de código também. Texto fora de blocos é ignorado pelo modelo durante execução.
- **G9: Atomicidade do par start/end.** Se a skill crashar entre `writeStart` e `writeEnd`, ficará linha `start` órfã. Aceitar — script de análise no Plano 05 lida com isso (marca como abandonada). Não tentar `process.on('exit')` para forçar `end` — comportamento de hook em skills markdown não é confiável.
- **G10: Performance < 500ms (RNF do PRD).** Append síncrono (`appendFileSync`) é OK — uma linha por evento, ~200 bytes. NÃO usar async/await dentro do bloco da skill para evitar race em skills sem await chain estabelecida. Síncrono também garante que o `start` realmente é gravado antes da skill começar (CA-03).

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
