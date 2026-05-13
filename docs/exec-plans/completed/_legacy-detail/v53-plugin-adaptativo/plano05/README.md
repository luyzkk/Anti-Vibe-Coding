# Plano 05: Análise & Dogfooding

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9h de trabalho ativo + 2 semanas de calendário (dogfooding passivo)
**Depende de:** Plano 03 (Telemetria Passiva), Plano 04 (Modo Dual + 5 Universais)
**Desbloqueia:** ninguém — plano final da Onda 1. Fecha a entrega da v5.3.

---

## O que este plano entrega

Script CLI `analyze-metrics.ts` que lê `.claude/metrics/*.jsonl` e gera relatório baseline em stdout (token médio por skill, perfil mais usado, taxa de abandono, tempo médio por fase do pipeline). Em paralelo, conduz 2 semanas de dogfooding em projeto piloto **Licitar** (flag = `true`) com **Carreirarte** instalado mas com flag = `false` para validar isolamento. Encerra Onda 1 com release notes, CHANGELOG e docs de upgrade. Fecha CA-08, CA-11 e CA-12.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Lib `telemetry-utils.md` produzindo `.claude/metrics/YYYY-MM.jsonl` | Plano 03, fase-01 | pendente |
| 10 skills instrumentadas (pipeline core + consultivas) | Plano 03, fases 02-03 | pendente |
| Schema documentado dos 10 campos (incluindo `evento`) | Plano 01, fase-02 (`telemetry-schema.md`) | pendente |
| Tipos `TelemetryEntry`, validador `parseTelemetryEntry` | Plano 01, fase-02 | pendente |
| Helper `readArchitectureProfile()` estável | Plano 04, fase-01 | pendente |
| 5 skills estruturantes em modo dual | Plano 04, fases 02-05 | pendente |
| Docs dos 5 perfis (`architecture-profiles.md`) | Plano 01, fase-05 | pendente |
| Skill `/anti-vibe-coding:detect-architecture` funcional | Plano 02, fase-03 | pendente |
| Manifest com flag `architectureDetectorEnabled` | Plano 01, fase-03 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Relatório baseline (stdout do script) | Onda 2 — input para Token Tax audit (OQ7) e Comprehension Debt (OQ8) |
| Validação empírica do threshold de 80% do detector | Onda 2 — confirma OQ3 |
| Dados de adoção real (% acertos do detector, distribuição de perfis) | Onda 2 — confirma OQ1 |
| Release notes v5.3 e docs de upgrade | Comunidade externa + Luiz para projetos próprios |
| Decisão sobre `telemetryEnabled` opt-out flag (OQ11) | Onda 1 mid-flight ou Onda 2 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-script-cli-analyze-metrics.md | Script CLI `analyze-metrics.ts` (Bun, sem deps) lê `.claude/metrics/*.jsonl`, agrega N projetos, output texto formatado | 2.5h | Plano 03 fase-01, Plano 01 fase-02 |
| 02 | fase-02-could-haves.md | RF12 (ASCII chart `--ascii`), RF13 (sugestão em /init), RF14 (override `--set <profile>`) | 1.5h | fase-01, Plano 02 fase-04 |
| 03 | fase-03-setup-dogfooding-licitar-carreirarte.md | Instala v5.3 em Licitar (flag=true) e Carreirarte (flag=false); roda `/detect-architecture` em Licitar; documenta comandos exatos | 1h | fase-01, fase-02, Plano 04 (todas) |
| 04 | fase-04-coleta-50-entradas-e-relatorio.md | 2 semanas de uso real em Licitar; checkpoint mid-flight; gera relatório final via script | 1h ativo + 14 dias calendário | fase-03 |
| 05 | fase-05-validacao-ca-12-isolamento-entre-repos.md | Confirma comportamento v5.2 em Carreirarte (flag=false) via inspeção de metrics + snapshot de skill | 1h | fase-04 |
| 06 | fase-06-release-notes-v53-e-docs-finais.md | `CHANGELOG.md` v5.3, `docs/upgrade-v52-to-v53.md`, `docs/release-notes-v53.md` | 2h | fase-04, fase-05 |

**Sizing ativo total:** 9h. **Calendário total:** ~2.5 semanas (dogfooding bloqueia fase-05 e fase-06).

---

## Grafo de Fases

```
fase-01 (script CLI core)
    |
    v
fase-02 (could-haves: ASCII + --set + sugestao /init)
    |
    v
fase-03 (setup dogfooding em Licitar + Carreirarte)
    |
    v
fase-04 (2 semanas de uso real + relatorio) [CALENDARIO BLOQUEANTE]
    |
    +-----------+
    |           |
    v           v
fase-05      (em paralelo com fase-06 inicio)
(CA-12 isolamento)
    |
    v
fase-06 (release notes + CHANGELOG + docs upgrade)
```

**Paralelismo possivel:**
- fase-01 e fase-02 podem ser desenvolvidas em paralelo se outro dev/agente cuidar dos could-haves enquanto o core do script é refinado. Recomendado serial pelo tamanho.
- fase-05 e o início do rascunho de fase-06 (CHANGELOG draft) podem rodar em paralelo após fase-04 concluir.
- **Bloqueio físico de calendário (G7):** fase-04 leva 2 semanas reais. Outras fases de outros planos NÃO devem estar pendentes nesse intervalo — Onda 1 fica congelada aguardando coleta.

---

## TDD Strategy

```
Ciclo por fase (aplicavel a fase-01 e fase-02):
1. RED: teste com fixture JSONL em tmp dir + assertion no output stdout
2. GREEN: implementação mínima (parse linha-a-linha, agregação, format)
3. REFACTOR: extrair funções puras (parseLine, aggregateBySkill, formatReport)
4. VERIFY: bun run test --grep '<fase>' && bun run lint && bun run typecheck
```

Estratégia específica:
- **Funções puras primeiro (fase-01):** `parseJsonlFile(content): TelemetryEntry[]`, `pairStartEnd(entries): PairedEntry[]`, `aggregateByDimension(entries, dim)`, `formatReport(agg)`. Cada uma testável sem I/O.
- **CLI shell (fase-01):** parsing manual de `--projects`, `--month`, `--ascii`, `--set` via slice de `process.argv`. Teste do shell com `Bun.spawn` em fixtures pré-populadas.
- **Could-haves (fase-02):** ASCII chart é função pura `renderAsciiBar(label, value, max, width)`. Override `--set` reusa lógica de Plano 02 fase-04 (`writeArchitectureProfile`). Sugestão em /init é edição de prompt em SKILL.md.
- **Fases operacionais (03-06):** TDD não se aplica diretamente — critério de aceite é checklist concreto (comandos rodaram, arquivos existem, conteúdo confere). Usar snapshots manuais para fase-05 (compara output v5.3 com v5.2 em Carreirarte).

**Tracer Bullet deste plano:** N/A — o tracer bullet do PRD vive em Plano 01 fase-06. Plano 05 é o consumidor terminal, não estabelece arquitetura nova.

---

## Gotchas Conhecidos

Indexados para referência cruzada nas fases. Cada fase cita o `Gx` aplicável.

- **G1: Script CLI é PURAMENTE leitor.** Nunca escreve em `.claude/metrics/`. Deletar/rotacionar metrics é responsabilidade da lib do Plano 03. Script abre arquivos em modo read-only. Aplicado em fase-01 e fase-02.
- **G2: JSONL pode ter linhas malformadas.** Telemetria silenciosa em erro (Plano 03 G2/CA-09) pode escrever truncado. Script DEVE skipar linhas inválidas com warning em stderr (`[analyze-warn] linha N malformada em <path>`), nunca crashar. Aplicado em fase-01.
- **G3: Tokens "aproximados".** Campo `tokens_aproximados_consumidos` é estimativa do agente (Plano 03 G6 — pode ser `0` quando não medido), não real. Relatório DEVE usar palavra "estimado" em todos os labels para não induzir falsa precisão. Aplicado em fase-01 e fase-06 (release notes).
- **G4: Pares start/end podem ficar incompletos.** Se skill abandonada sem fechar (Plano 03 G9), fica linha `start` órfã. Considerar entry "válida" apenas quando há ambos `evento: "start"` e `evento: "end"` para o mesmo `skill_invocada` em window temporal próxima (mesmo dia). Documentar critério exato em fase-01 e relatório.
- **G5: Agregação multi-projeto (`--projects`) NUNCA mistura paths.** Cada projeto é segregado, relatório mostra por-projeto antes de agregado total. Privacy-first (D7) — todos os paths devem ser locais. Aplicado em fase-01.
- **G6: CA-11 exige 50 entradas VÁLIDAS.** Não 50 linhas brutas. Script reporta count de "válidas" (pares completos) vs "incompletas" (start sem end). Se < 50 válidas após 2 semanas, estende dogfooding (Risco já aceito no PRD). Aplicado em fase-04.
- **G7: fase-03 e fase-04 são bloqueio FÍSICO de calendário.** 2 semanas reais não podem ser aceleradas. Outras fases podem ir em paralelo APENAS se forem de outros planos já concluídos (não há — Plano 05 é o último). Recomendação: usar essas 2 semanas para escrever DRAFT de release notes (fase-06) com placeholders para os números.
- **G8: Privacy-first absoluto (D7).** Script NUNCA faz network calls. NUNCA loga conteúdo de código. Apenas metadata (counts, durações, perfis). Validar em code review da fase-01 com grep manual por `fetch`, `http`, `axios`.
- **G9: stdout estruturado, NÃO JSON.** Output do script é texto formatado legível por humano (relatório com seções, tabelas ASCII). JSON seria input para outro tool — não é o caso da Onda 1. Decisão registrada na fase-01.
- **G10: fase-03 NÃO toca código do plugin.** Apenas configura `.anti-vibe-manifest.json` em Licitar (flag=true) e Carreirarte (flag=false). Use `/anti-vibe-coding:init` ou edição manual do JSON. Documentar comandos exatos em fase-03.
- **G11: fase-05 (CA-12) depende de fase-04 ter rodado.** Usa metrics reais de Carreirarte (não mock) para confirmar `profile_arquitetura: "disabled"` em todas as entradas (flag=false significa profile nunca lido — schema do Plano 01 fase-02 já contempla esse valor). Inspeciona também outputs de skills em Carreirarte (snapshot manual de UMA execução real comparando com baseline v5.2).
- **G12: fase-06 referencia decisões irreversíveis.** D1 (público híbrido) na release notes ("para quem é"), D7 (privacy-first) na CHANGELOG ("nada sai do repo"), OQ1-3 do PRD ("perguntas que serão decididas com a baseline coletada"). Sem essas referências, comunidade externa fica perdida.
- **G13: Override `--set` (RF14) reutiliza writer do Plano 02 fase-04.** NÃO reimplementar `writeArchitectureProfile`. Apenas chamar via import. Se sair do contrato (perfil inválido), retornar exit code 1 e mensagem clara. Aplicado em fase-02.
- **G14: Sugestão em /init (RF13) é texto, não execução automática.** Respeita feedback `feedback_suggest_dont_execute.md` da memória do user. /init oferece "rodar `/anti-vibe-coding:detect-architecture` agora?" — usuário decide. Nunca invoca automaticamente. Aplicado em fase-02.
- **G15: Datas do dogfooding são aproximadas.** Plano sugere início `2026-05-05`, mid-checkpoint `2026-05-12`, fim `2026-05-19`. Usuário pode deslizar conforme disponibilidade. fase-04 deve aceitar parametrização de datas, não hardcoded.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
