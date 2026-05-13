---
slug: v53-plugin-adaptativo
date: 2026-05-04
status: draft
requires: []
---

# PRD: Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Status:** Draft
**Author:** Luiz Felipe + AI
**Date:** 2026-05-04
**Context:** ./CONTEXT.md

---

## Problema

O framework Anti-Vibe Coding v5.2 prescreve padrões arquiteturais (SOLID com notas pragmáticas, sugestões de Clean Architecture clássica) sem considerar **a arquitetura real do projeto** em que opera. Quando o usuário invoca `/architecture` ou `/plan-feature` num projeto Clean Architecture ritual, o plugin pode gerar conselhos que conflitam com a estrutura existente; quando o projeto é vertical-slice ou MVC-flat, o plugin não otimiza recomendações para esse estilo.

**Por que isso importa em 2026:** a síntese de 6 documentos sobre arquitetura na era da IA agêntica (em `melhoria/`) converge numa tese unificadora: o gargalo do desenvolvimento migrou de **"gerar código"** (2023) para **"manter contexto durante geração em escala"** (2026). Janelas de contexto maiores não resolvem o problema — saliência navegacional, custo de tokens por feature, e dispersão estrutural viraram primeiros cidadãos de qualidade arquitetural.

**Impacto de não resolver:** o framework continua dando conselhos genéricos. Conselho prescritivo sobre Clean Architecture em projeto vertical-slice gera ruído. Falta de telemetria passiva impede decisões empíricas sobre evoluções futuras (Token Tax, Comprehension Debt). Em múltiplos projetos do usuário (Licitar, Carreirarte) com arquiteturas distintas, o framework opera em modo "tamanho único" quando deveria adaptar.

---

## Solução

A v5.3 introduz três capacidades complementares:

1. **Architecture Detector** (skill manual `/anti-vibe-coding:detect-architecture`) — classifica o projeto em 1 de 5 perfis (`clean-architecture-ritual`, `mvc-flat`, `vertical-slice`, `nextjs-app-router`, `unknown-mixed`) com base em heurística de pastas + amostragem de imports. Persiste resultado em `.claude/.anti-vibe-manifest.json` (raw) e `.claude/architecture-profile.md` (legível).

2. **Modo Dual nas Skills Estruturantes** — `architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work` leem o profile detectado e adaptam recomendações. Modo "Greenfield" (vertical-slice + bounded contexts opinados) ativa apenas quando perfil = `unknown-mixed` E pasta vazia. Modo "Adaptativo" é o default.

3. **Telemetria Passiva** — 10 skills (pipeline core + consultivas) emitem 2 linhas JSONL por invocação (início+fim) em `.claude/metrics/YYYY-MM.jsonl`. Local-only, privacy-first. Script CLI de análise gera relatório baseline (token médio, perfil mais usado, taxa de abandono) que alimenta decisões de Onda 2 (Token Tax audit, Comprehension Debt tracking).

5 princípios universais (1, 5, 7, 9, 10) entram como ajustes de prompts/templates. 2 universais (3 Token Tax, 8 Comprehension Debt) ficam para Onda 2 — dependem de baseline coletada pela telemetria.

Rollout via **feature flag opt-in por repo** (`architectureDetectorEnabled: false` por default). Telemetria passiva ativa por default sem impacto comportamental.

**Alinhamento com stack:** TypeScript + Bun (stack do framework). Compatível com sistema de versionamento existente (`/init`, `/update`, `/sync`). Sem dependências externas obrigatórias na Onda 1.

---

## Requisitos Funcionais

### Must Have (7 itens — 35% do total)

- [ ] **RF1 — Architecture Detector skill manual.** Comando `/anti-vibe-coding:detect-architecture` que analisa o projeto, classifica em 1 dos 5 perfis, atribui score de confiança (0-100%), confirma com usuário se confiança < 80%.
- [ ] **RF2 — Schema do `architectureProfile`** em `.claude/.anti-vibe-manifest.json` com campos: `profile`, `confidence`, `detectedAt`, `signals[]`, `schemaVersion`. Versionado para evolução futura.
- [ ] **RF3 — Heurística de detecção (pastas + imports).** Lê árvore `src/`, classifica por padrões nominais, amostra 5-10 arquivos para confirmar via análise de imports cruzando camadas.
- [ ] **RF4 — Telemetria passiva instrumentada em 10 skills:** `grill-me`, `write-prd`, `plan-feature`, `execute-plan`, `verify-work`, `iterate`, `consultant`, `architecture`, `design-twice`, `quick-plan`. 2 linhas JSONL por invocação (início + fim) com 10 campos.
- [ ] **RF5 — Schema JSONL da telemetria** em `.claude/metrics/YYYY-MM.jsonl` (rotação mensal automática) com campos: `skill_invocada`, `timestamp_inicio`, `timestamp_fim`, `duracao_ms`, `profile_arquitetura`, `tokens_aproximados_consumidos`, `arquivos_lidos`, `arquivos_modificados`, `fase_pipeline`, `sucesso`.
- [ ] **RF6 — Feature flag `architectureDetectorEnabled`** em `.anti-vibe-manifest.json` (default `false`). Quando `false`, comportamento v5.2 preservado em todas skills estruturantes. Telemetria passiva ignora a flag (sempre ativa).
- [ ] **RF7 — Modo Dual em 5 skills estruturantes:** cada skill lê profile UMA vez no início (sem branching profundo) e adapta saída ao perfil detectado. Comportamento Greenfield ativa apenas quando `profile === 'unknown-mixed'` E pasta `src/` vazia/quase-vazia.

### Should Have (4 itens)

- [ ] **RF8 — Script CLI de análise** (`anti-vibe-coding/scripts/analyze-metrics.ts`) que lê `.claude/metrics/*.jsonl`, agrega N projetos opcionalmente, gera relatório baseline em stdout: token médio por skill, perfil mais usado, taxa de abandono, tempo médio por fase do pipeline.
- [ ] **RF9 — Markdown gerado `.claude/architecture-profile.md`** com resumo legível: perfil detectado, confiança, sinais usados, recomendação de revisão manual, link para documentação do perfil.
- [ ] **RF10 — Documentação dos 5 perfis** em `anti-vibe-coding/docs/architecture-profiles.md`: características, como detector classifica, como cada skill se adapta, exemplos de projeto canônicos.
- [ ] **RF11 — 5 princípios universais integrados em prompts/templates:**
  - **#1** — 10 Questions Test em `consultant`/`grill-me`
  - **#5** — Comment Provenance em templates de PRD/plan
  - **#7** — Declarative-first specs em `write-prd`
  - **#9** — Fresh-context review como fase em `verify-work`
  - **#10** — YAGNI checklist em `consultant`

### Could Have (3 itens)

- [ ] **RF12 — ASCII chart no script CLI** mostrando distribuição de uso por skill (visualização nice-to-have).
- [ ] **RF13 — Sugestão de detecção em `/init`** quando projeto novo: oferece rodar detector ao final do init.
- [ ] **RF14 — Override manual do profile** via comando `/anti-vibe-coding:detect-architecture --set vertical-slice`.

### Won't Have (Onda 1 — adiados ou rejeitados)

- **Token Tax audit como skill** — depende de baseline da telemetria. Vai para Onda 2.
- **Comprehension Debt tracking** — depende de design dedicado. Vai para Onda 2/3.
- **Skill `/dependency-graph` standalone** — depende de tooling AST/MCP. Vai para Onda 2 (D12).
- **Greenfield aggressive defaults** (Vertical Slice como default global, Encapsulation-first em design-patterns) — depende de evidência empírica. Vai para Onda 3.
- **Suporte a DDD strategic e Monorepo multi-arch** — perfis adiados para Onda 2/3 (D4).
- **Upload remoto/centralizado da telemetria** — decisão irreversível (D7) de privacy-first.
- **Retrocompatibilidade automática de planos em curso** — backfill é opcional via comando manual (D5).

---

## Requisitos Não-Funcionais

- **Performance:** detector + telemetria não devem adicionar > 500ms ao tempo total de invocação de skill. Rotação mensal de telemetria evita arquivos > 10MB.
- **Privacidade:** dados de telemetria nunca saem do repo (D7). Sem network calls obrigatórios. Sem coleta de conteúdo de código (apenas metadata: contagem de arquivos, tokens estimados).
- **Compatibilidade:**
  - `.anti-vibe-manifest.json` parseável por implementações v5.2 (campo `architectureProfile` é opcional).
  - Repos rodando v5.2 que receberem `/update` para v5.3 não quebram.
  - Comportamento v5.2 preservado integralmente quando feature flag = `false`.
- **Reversibilidade:** todas as mudanças da Onda 1 são reversíveis ou opt-in. Desativar feature flag = comportamento v5.2.
- **Observabilidade:** telemetria é o próprio mecanismo de observabilidade. Erros de instrumentação são silenciosos (não derrubam skill) mas registrados como `sucesso: false` com `error_message`.
- **Documentação:** cada novo artefato (`architecture-profile.md`, schema JSONL, schema do manifest) tem documentação versionada em `anti-vibe-coding/docs/`.
- **Manutenibilidade:** skill estruturante lê profile UMA vez no início; adapta saída via 1 lookup. Sem branching profundo (`if profile === 'A' && condition && ...`).

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| 1 | Público-alvo | Híbrido (single-user + plugin público) | Single-dev sem retrocompat / Comunidade ampla conservadora | Framework já tem versionamento; híbrido permite evolução com disciplina |
| 2 | Escopo Onda 1 | 5 universais + telemetria passiva | 7 universais juntos / 3 mínimos | Telemetria substitui design especulativo de Token Tax/Comprehension Debt |
| 3 | Storage profile | JSON (manifest) + Markdown (legível) | Apenas JSON / Apenas markdown | Espelha padrão de `decisions.md`; humano + máquina |
| 4 | Perfis suportados | 5 (clean/mvc/vertical/nextjs/unknown) | 3 / 7 (DDD strategic + monorepo) | Cobre casos canônicos; DDD/monorepo são Onda 2 quando aparecer caso real |
| 5 | Compat com `.planning/` legacy | Backfill opcional via comando | Skip total / Backfill agressivo | Opt-in puro; respeita trabalho em andamento |
| 6 | Granularidade telemetria | ~10 campos | 5 campos / 15 campos com subjetivos | Suficiente p/ Token Tax; sem ruído de campos vagos |
| 7 | Storage telemetria | Local-only `.claude/metrics/YYYY-MM.jsonl` | Upload opt-in / Endpoint configurável | Privacy-first elimina barreira de adoção |
| 8 | Trigger telemetria | Início + fim de skill | Apenas pós-skill / Eventos granulares | Detecta abandono; overhead aceitável |
| 9 | Heurística detector | Pastas + amostragem de imports | Apenas pastas / + package.json | Equilíbrio robustez vs lock-in com frameworks |
| 10 | Baixa confiança detector | Confirma com user se < 80% | Decide sempre / Sempre `unknown-mixed` quando incerto | Aproveita humano-no-loop sem virar interrogatório |
| 11 | Modo dual | Todas 5 skills estruturantes | Apenas planejamento / + correções proativas | Coerência ao longo do pipeline; sem prescrição |
| 12 | Item 6 (Graph nav) | Skill standalone Onda 2 | Some / Opcional dentro execute-plan | Honest; não bloqueia v5.3, sem dependência MCP |
| 13 | Skills instrumentadas | 10 (pipeline + consultivas) | 6 (apenas pipeline) / 30 (todas) | Cobre ciclo de decisão; skills referência geram ruído |
| 14 | Critério aceite | Funcional + dogfooding 2sem + 50+ entradas + script de análise | Apenas funcional / Funcional+dogfooding sem script | Fecha o loop com D2 |
| 15 | Rollout | Feature flag opt-in por repo | Big bang / Gradual em 3 releases | Alinha com `feedback_suggest_dont_execute.md` |
| 16 | Ambiguidades restantes | Documentar como open questions, decidir mid-flight | Resolver tudo agora / Resolver críticas + adiar resto | Flexibilidade > spec rigorosa (escolha do dev) |

> **Decisões 1, 2, 7, 11, 15** registradas em `.claude/decisions.md` por terem impacto irreversível ou semi-irreversível.

---

## Critérios de Aceite

- [ ] **CA-01 — Detector classifica corretamente.** Dado um repo com estrutura `src/application/use-cases/` + `src/domain/aggregates/`, quando rodar `/anti-vibe-coding:detect-architecture`, então o profile resultante é `clean-architecture-ritual` com confiança ≥ 80%.
- [ ] **CA-02 — Detector confirma quando incerto.** Dado um repo com estrutura ambígua (mix de padrões), quando rodar o detector e a confiança calculada for < 80%, então o detector apresenta a classificação preliminar e pergunta ao usuário se confirma ou escolhe manualmente.
- [ ] **CA-03 — Telemetria registra início e fim.** Dado o usuário invoca qualquer das 10 skills instrumentadas, quando a skill inicia, então 1 linha JSONL é appendada em `.claude/metrics/YYYY-MM.jsonl` com `evento: "start"`; quando a skill termina (sucesso ou erro), então outra linha é appendada com `evento: "end"` e `sucesso: true|false`.
- [ ] **CA-04 — Feature flag desligada preserva v5.2.** Dado `architectureDetectorEnabled: false` em `.anti-vibe-manifest.json`, quando o usuário invoca `/anti-vibe-coding:plan-feature`, então o output é idêntico ao gerado pela v5.2 (sem leitura de profile, sem adaptação).
- [ ] **CA-05 — Modo Dual adapta saída.** Dado `architectureDetectorEnabled: true` e `profile: vertical-slice`, quando o usuário invoca `/anti-vibe-coding:plan-feature`, então o plano gerado organiza fases por feature vertical (não por camada).
- [ ] **CA-06 — Greenfield mode em pasta vazia.** Dado um projeto com `src/` vazio e `profile: unknown-mixed`, quando o usuário invoca `/anti-vibe-coding:architecture`, então a recomendação default sugere vertical-slice + bounded contexts.
- [ ] **CA-07 — Backfill em projeto legacy é opcional.** Dado um projeto v5.2 com `.planning/plano02/` em estrutura layered, quando o usuário recebe `/update` para v5.3, então nenhum plano em curso é modificado e a feature flag fica `false` por default.
- [ ] **CA-08 — Script CLI de análise.** Dado `.claude/metrics/*.jsonl` com ≥ 50 entradas, quando o usuário roda o script de análise, então o output em stdout inclui: token médio por skill, perfil mais usado, taxa de abandono, tempo médio por fase do pipeline.
- [ ] **CA-09 (edge case) — Telemetria silenciosa em erro.** Dado um erro de I/O ao escrever em `.claude/metrics/YYYY-MM.jsonl`, quando uma skill instrumentada termina, então o erro é silencioso (não derruba a skill) mas é exposto via stderr com prefixo `[telemetry-warn]`.
- [ ] **CA-10 (edge case) — Manifest pré-v5.3 não quebra.** Dado um `.anti-vibe-manifest.json` sem campo `architectureProfile`, quando uma skill estruturante é invocada com flag = true, então a skill detecta a ausência, sugere rodar `/detect-architecture`, e degrada para comportamento v5.2 sem erro.
- [ ] **CA-11 (dogfooding) — 50+ entradas em produção no piloto.** Após 2 semanas de uso real em **Licitar** (projeto piloto, flag = `true`), `.claude/metrics/*.jsonl` em Licitar contém ≥ 50 entradas válidas (com ambos `start` e `end`), confirmando que a instrumentação funciona em uso real, não só em testes.
- [ ] **CA-12 (isolamento entre repos) — Carreirarte intocado durante o piloto.** Dado v5.3 instalada em Licitar (flag = `true`) E em Carreirarte (flag = `false`), quando o usuário invocar qualquer skill estruturante em Carreirarte durante as 2 semanas de dogfooding, então o comportamento observado é idêntico ao v5.2 (sem leitura de profile, sem mensagens novas, sem mudanças de output). Telemetria passiva pode rodar em Carreirarte sem afetar comportamento das skills.

---

## Out of Scope

- **Onda 2:** Token Tax audit, Comprehension Debt tracking, skill `/dependency-graph`, perfis DDD strategic e Monorepo. Dependem de evidência empírica da Onda 1.
- **Onda 3:** Greenfield defaults agressivos (vertical slice como default global, encapsulation-first em design-patterns). Quebram retrocompat e exigem dados.
- **Migração automática de planos legacy** — apenas backfill opcional via comando manual.
- **Dashboard remoto de telemetria** — privacy-first impede (D7 irreversível).
- **Suporte a múltiplos perfis no mesmo repo** — monorepo fica para Onda 2.
- **Refatoração das skills consultivas** (`system-design`, `react-patterns`, etc) — escopo limitado às 5 estruturantes.

---

## Dependências

| Tipo | Dependência | Status |
|---|---|---|
| Infra interna | `.anti-vibe-manifest.json` (sistema de versionamento existente) | Já no projeto |
| Infra interna | Skills `/init`, `/update`, `/sync` (rollout) | Já no projeto |
| Infra interna | Template `prd-template.md`, `plan-template.md` (para integrar princípio #5 e #7) | Já no projeto |
| Skill | `consultant` (para integrar princípios #1 e #10) | Já existe |
| Skill | `verify-work` (para integrar princípio #9) | Já existe |
| Skill | `write-prd` (para integrar princípio #7) | Já existe |
| Lib/runtime | Bun + TypeScript | Já no projeto |
| Projeto piloto | **Licitar** para dogfooding 2 semanas (flag = `true`). Carreirarte recebe v5.3 instalada mas com flag = `false` — ativa apenas após validação no piloto. | Disponível |
| Sem dependência | Nenhuma lib externa nova | — |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Detector classifica errado e Luiz não percebe | Média | Médio | D10 (confirmação se < 80%) + edição manual em `architecture-profile.md` (D3) |
| Telemetria gera arquivo gigante | Baixa | Baixo | Rotação mensal `YYYY-MM.jsonl` + JSONL append-only |
| Decisões emergentes (D16) contradizem decisões registradas | Média | Médio | MEMORY.md por plano registra mudanças mid-flight; `decision-registry` consultado antes de novas decisões |
| Modo dual gera complexidade interna nas skills | Média | Médio | Princípio "lê profile UMA vez no início, adapta saída"; sem branching profundo |
| Dogfooding 2 semanas atrasa entrega | Alta | Baixo | Risco aceito; sem dogfooding, v5.3 pode quebrar projetos reais |
| Comunidade não adota feature flag | Alta | Baixo | Risco aceito (D1=C); primary user é Luiz |
| Item 6 (graph nav) nunca acontece como skill standalone | Média | Baixo | Princípios universais já dão ganho mensurável; graph é bonus |
| Telemetria de erro de I/O degrada UX | Baixa | Baixo | Falhas silenciosas (CA-09); nunca derruba skill |
| Manifest pré-v5.3 quebra ao parsear v5.3 | Baixa | Alto | Schema versionado + campo `architectureProfile` opcional (CA-10) |
| 50 entradas de dogfooding insuficientes para baseline | Média | Médio | Threshold conservador; se necessário, estende dogfooding antes de fechar Onda 1 |

---

## Open Questions (D16 — resolver durante implementação)

Não bloqueiam o início do `/plan-feature`. Devem ser resolvidas mid-flight com registro em `MEMORY.md` do plano correspondente.

| OQ | Pergunta | Decidir em |
|---|---|---|
| OQ1 | Métricas exatas de sucesso da v5.3 (threshold de adoção, % acertos do detector) | Após primeiro mês de telemetria |
| OQ2 | Política detalhada para repos rodando v5.2 + skills v5.3 simultaneamente (mid-update) | Durante implementação de `/update` para v5.3 |
| OQ3 | Threshold de confiança do detector (80%) — confirmar empiricamente | Após coleta de 50+ detecções reais |
| OQ4 | Formato exato do `architecture-profile.md` (seções, dados, lista de razões da detecção) | Durante `/plan-feature` |
| OQ5 | Esquema JSON do `architectureProfile` no manifest (campos opcionais, schemaVersion) | Durante `/plan-feature` |
| OQ6 | Tooling do `/dependency-graph` (AST nativo? MCP? tree-sitter?) | Onda 2 |
| OQ7 | Critérios para Token Tax audit (thresholds, formato de output) | Onda 2, após análise da telemetria |
| OQ8 | Critérios para Comprehension Debt tracking (trigger, captura) | Onda 2/3 |
| OQ9 | Onda 3 — Greenfield defaults agressivos: quando entrar, com que sinais empíricos? | Após Onda 2 |
| OQ10 | Comportamento em monorepo (sinalizar gracefully se detector encontrar `packages/`) | Durante implementação do detector |
| OQ11 | Adicionar flag `telemetryEnabled` (opt-out de telemetria por repo)? Hoje: telemetria sempre ligada por default | Durante `/plan-feature` ou Onda 1 mid-flight |

---

## Próximo Passo

`/anti-vibe-coding:plan-feature .planning/2026-05-04-v53-plugin-adaptativo/PRD.md`

Recomendação para o `/plan-feature`: gerar **3-5 planos sequenciais** (não monolítico) dada a complexidade. Sugestão de decomposição:

1. **plano01 — Foundation** — schema do manifest (RF2), schema JSONL (RF5), feature flag (RF6), markdown legível (RF9), docs dos perfis (RF10)
2. **plano02 — Architecture Detector** — heurística (RF3) + skill `/detect-architecture` (RF1)
3. **plano03 — Telemetria Passiva** — instrumentação das 10 skills (RF4)
4. **plano04 — Modo Dual** — adaptação das 5 skills estruturantes (RF7) + 5 princípios universais (RF11)
5. **plano05 — Análise & Dogfooding** — script CLI (RF8) + 2 semanas de uso real + relatório baseline (CA-08, CA-11)

Decisão final de decomposição cabe ao `/plan-feature` (que tem análise de complexidade própria).
