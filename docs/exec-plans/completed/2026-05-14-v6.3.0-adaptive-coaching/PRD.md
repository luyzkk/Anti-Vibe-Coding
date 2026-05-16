---
slug: v6.3.0-adaptive-coaching
date: 2026-05-14
status: draft
requires: [v6.1.0-subagent-contract]
unblocks: [v6.5.0-language-knowledge-node-ts, v6.6.0-language-knowledge-rails]
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-14 (Luiz/dev): profile-aware-preface estendido — alinhado com PRD v6.3.0 §Decisão #1`
-->

# PRD: Adaptive Coaching (v6.3.0) — Eixo 2 Agent-Native

**Status:** Draft
**Author:** Luiz + AI
**Date:** 2026-05-14
**Context:** sessão `/learn` 2026-05-14 sobre 5 princípios do Eixo 2 (Every guide) aplicados ao plugin
**Reference:** Every guide — "Agent-native Architectures" (Eixo 2: princípios adaptativos no projeto do usuário)
**Predecessor:** `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md` (Eixo 1 — contrato interno)
**Sucessores planejados:** v6.5.0 (Node+TS), v6.6.0 (Rails) — adicionam camada `language` ao framework adaptativo desta versão

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.
-->

## Problema

O plugin v6.0–v6.2 trata todos os projetos do usuário como **genéricos**. Hoje:

1. **Skills entregam o mesmo prompt independente da arquitetura do projeto.** `/architecture` é o único caso que adapta via `profile-aware-preface` (ver `skills/architecture/SKILL.md:35-82`), mas as outras ~21 skills ignoram o `architecture-profile.md` que o detector produz. O sinal existe; o consumo não.
2. **Skills de domínio redescobrem o projeto a cada invocação.** `/api-design`, `/security`, `/architecture` cada uma faz Grep ad-hoc pra entender rotas, módulos, dependências. N skills × M projetos × cada uma reinventando enumeração = anti-pattern Every: *"defensive tool design — strict inputs, redundant lookups"*.
3. **Não há inventário runtime das capabilities do agente.** Quando um usuário pede "/security audit este projeto Stripe", o agente não sabe se tem (ou não) MCP/tool pra inspecionar Stripe. Tenta best-effort, falha silenciosamente, ou sugere coisa genérica. Não existe **parity audit** que diga "pra essa task type, faltam X capabilities — vai sair best-effort".
4. **Profile detector subutilizado.** [skills/lib/architecture-detector/](../../../../skills/lib/architecture-detector/) retorna 5 profiles (`clean-architecture-ritual`, `mvc-flat`, `vertical-slice`, `nextjs-app-router`, `unknown-mixed`) com confidence e signals. Investimento já feito. Só `/architecture` lê.
5. **Roadmap de linguagem (v6.5/v6.6) depende do framework adaptativo existir antes.** Adicionar conhecimento de Node+TS ou Rails sem framework de composição (`PrefaceContext { profile, language, framework }`) vira gambiarra de string concatenada.

v6.3.0 destrava o consumo do sinal já produzido, padroniza inventário de capabilities (projeto + agente) e prepara composição pra linguagens futuras — **sem assumir que esses conhecimentos chegaram**.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- Qualquer skill priorizada lê o `architecture-profile.md` e ajusta o prompt **automaticamente** — sem cada skill reinventar como ler.
- Skills de domínio consultam **uma fonte única** de capabilities do projeto (rotas, mutations, jobs, CLI) em vez de Grep ad-hoc.
- Antes de prometer ajuda em uma task type, o agente sabe **se tem ferramenta pra isso** e avisa explicitamente quando há gap.
- O contrato de adaptação compõe **profile × language × framework** desde já — v6.5/v6.6 plugam sem refactor.
- Cobertura inicial honesta: **2 profiles** (`nextjs-app-router` + `mvc-flat`) cobrem o caso real. Resto cai em best-effort transparente.

### Mecanismo (algorítmico — o COMO)

**Três peças independentes em arquivos versionados:**

1. **PrefaceContext + helper de leitura** (`skills/lib/preface-context.ts`):
   ```typescript
   type PrefaceContext = {
     profile: Profile | null            // do architecture-profile.md
     language: LanguageHint | null       // null em v6.3.0; preenchido em v6.5/v6.6
     framework: FrameworkHint | null     // null em v6.3.0; preenchido em v6.6+
     confidence: number                  // 0..100
   }
   readPrefaceContext(projectRoot: string): PrefaceContext
   ```
   Helper único. Skills consomem; não leem `architecture-profile.md` direto.

2. **capabilities.json** (produzido pelo `/init`, consumido por skills de domínio):
   ```json
   {
     "capabilities": [
       { "kind": "route", "method": "POST", "path": "/api/checkout",
         "handler": "app/api/checkout/route.ts:14", "owner_path": "app/api/checkout/",
         "confidence": 1.0, "source": "ast" }
     ],
     "coverage_gaps": ["app/api/legacy/** — parsing falhou, revisar manual"],
     "generated_at": "2026-05-14T10:00:00Z",
     "profile_at_generation": "nextjs-app-router",
     "schema_version": "1.0"
   }
   ```
   AST-first, LLM-fallback marcado `source: "llm"` + `confidence < 1.0`. **Gitignored por default.**

3. **parity-gaps.json + skill `/parity-audit`** (skill nova; lib compartilhada com `qa-visual`):
   ```json
   {
     "gaps": [
       { "gap_id": "stripe-mcp", "task_type": "payment-debug",
         "missing_capability": "Stripe MCP server",
         "severity": "critical|important|nice",
         "suggestion": "Instalar mcp-stripe ou pular tasks de debug Stripe" }
     ],
     "tool_registry_snapshot": { "mcps": [...], "builtin_tools": [...], "subagents": [...] },
     "generated_at": "...", "schema_version": "1.0"
   }
   ```

**Pipeline de adaptação em runtime de skill:**

```
1. Skill é invocada
2. readPrefaceContext() → { profile: 'nextjs-app-router', language: null, framework: null }
3. Lookup table de preface: SKILL_PREFACE_BY_CONTEXT[skill_name][profile] → string
4. Skill emite [preface composto] + [corpo da skill] como prompt final
5. Quando skill precisa de capabilities, lê discovery/capabilities.json (cached)
6. Quando skill é task-type-specific (debug payment, etc), lê discovery/parity-gaps.json
   para avisar usuário ANTES de tentar
```

**Migração em 4 ondas:**

1. **Onda 1 — Fundamentos:** `PrefaceContext`, `readPrefaceContext`, `tool-registry-inspector`, schemas JSON de `capabilities.json` + `parity-gaps.json` (ADR + doc canônico). Sem refactor de skill ainda.
2. **Onda 2 — CRUD audit + `/init` produz `capabilities.json`:** AST parsers pra `nextjs-app-router` (rotas via `app/**/route.ts`) e `mvc-flat` (rotas via convenção do framework detectado). LLM fallback marcado. `/init` ganha fase nova.
3. **Onda 3 — `/parity-audit` skill nova:** Lib `tool-registry-inspector.ts` enumera MCPs/tools/subagentes. Skill produz `parity-gaps.json` ranqueado por severity. `qa-visual` migra pra usar a mesma lib (sem mudar UX).
4. **Onda 4 — Expansão de profile-aware-preface:** 4-6 skills priorizadas ganham preface adaptativo (`/security`, `/api-design`, `/system-design`, `/design-patterns`, mais 1-2 a definir). Pattern já está provado em `/architecture`.

Ondas 2-4 são paralelizáveis dentro do mesmo branch — não dependem entre si depois da Onda 1. Onda 1 é blocker das outras três.

---

## Fluxos por Ator

### Skill consumidora (caso típico — `/security` rodando em projeto Next.js)

1. Invocada por humano: `/anti-vibe-coding:security`.
2. `readPrefaceContext()` → `{ profile: 'nextjs-app-router', language: null, framework: null, confidence: 92 }`.
3. Lookup `SECURITY_PREFACE[nextjs-app-router]` → preface focado em rotas API, middleware, CSRF tokens em Server Actions.
4. Lê `discovery/capabilities.json` → lista de rotas POST/PUT/DELETE → highlight pra agente focar.
5. Lê `discovery/parity-gaps.json` → se houver gap CRITICAL no task_type "security-audit", **avisa usuário antes de prometer análise completa**.
6. Emite prompt final: `[preface] + [corpo de /security] + [contexto capabilities]`.

### Operador (humano)

1. Roda `/init` (ou `/init --refresh`) → discovery completo + `capabilities.json` + `parity-gaps.json` gerados.
2. Roda `/parity-audit` standalone quando quer revisar capabilities do agente vs roadmap do projeto.
3. Recebe relatório com gaps priorizados — decide instalar MCPs ou aceitar best-effort.

### Autor de skill nova

1. Importa `readPrefaceContext` em vez de reinventar leitura.
2. Declara em `SKILL.md` qual `PrefaceContext` shape consome (`profile-only` / `profile+language` / etc).
3. Adiciona entrada em `SKILL_PREFACE_BY_CONTEXT` lookup table — uma linha por profile suportado.
4. Skills sem profile suportado caem em prompt genérico (atual) — fallback default.

---

## Requisitos Funcionais

### Must Have (5/14 = 36%)

- [ ] **RF-MH-01:** `skills/lib/preface-context.ts` exporta `PrefaceContext` (profile + language + framework + confidence) e helper `readPrefaceContext(projectRoot): PrefaceContext`. Skills consomem via helper; não leem `architecture-profile.md` direto.
- [ ] **RF-MH-02:** `/init` produz `discovery/capabilities.json` (cobertura inicial: `nextjs-app-router` via AST + `mvc-flat` via LLM-fallback). Schema validado contra `discovery/_schemas/capabilities-v1.schema.json`. Gitignored por default.
- [ ] **RF-MH-03:** Skill nova `/anti-vibe-coding:parity-audit` produz `discovery/parity-gaps.json` com gaps ranqueados por `severity: 'critical|important|nice'`. Skill é `kind: "audit"` no contrato v6.1.0.
- [ ] **RF-MH-04:** `skills/lib/tool-registry-inspector.ts` enumera `{ mcps: [...], builtin_tools: [...], subagents: [...] }` em runtime. `qa-visual` migra pra consumir (sem mudança de UX visível ao usuário). `/parity-audit` consome.
- [ ] **RF-MH-05:** 4 skills priorizadas (`/security`, `/api-design`, `/system-design`, `/design-patterns`) ganham bloco `<!-- profile-aware-preface:start --> ... <!-- profile-aware-preface:end -->` consumindo `readPrefaceContext`. Skills sem profile no contexto caem em prompt genérico (fallback default).

### Should Have

- [ ] **RF-SH-01:** Stale detection via checksum: skills emitem warning quando `discovery/capabilities.json` foi gerado contra `src/` cujo checksum atual não bate. Sem bloqueio — só aviso "considere `/init --refresh`".
- [ ] **RF-SH-02:** Doc canônico `docs/design-docs/adaptive-coaching-framework.md` cobrindo: `PrefaceContext` shape, padrão `profile-aware-preface`, schemas `capabilities-v1` e `parity-gaps-v1`, migration guide pra autores de skill.
- [ ] **RF-SH-03:** ADR `docs/design-docs/ADR-NNNN-adaptive-coaching.md` documentando alternativas rejeitadas (runtime discovery, extend qa-visual, mobile checkpointing dedicado).
- [ ] **RF-SH-04:** Fixtures de regressão: 1 fixture por profile suportado em `skills/lib/__fixtures__/preface-context-{profile}.expected.json`. Mais 1 fixture de `capabilities.json` por profile coberto na Onda 2.
- [ ] **RF-SH-05:** 2 skills adicionais ganham preface adaptativo (escolha aberta — candidatos: `/decision-registry`, `/lessons-learned`, `/architecture` já tem). Totaliza 6 skills com preface no fim de v6.3.0.
- [ ] **RF-SH-06:** `harness-validate.mjs` valida que skills com `<!-- profile-aware-preface:start -->` têm também `<!-- profile-aware-preface:end -->` e o bloco referencia `readPrefaceContext`.

### Could Have

- [ ] **RF-CH-01:** Flag `--refresh` em `/init` regenera apenas `capabilities.json` + `parity-gaps.json` sem refazer Fases 0-1 caso `<24h` (reusa otimização do PRD do `/init` §RF-CH-02).
- [ ] **RF-CH-02:** Threshold de confidence configurável em `config/adaptive-coaching.json` — usuário pode desligar adaptação se `profile.confidence < 70` (default).
- [ ] **RF-CH-03:** CLI debug `bun run preface:simulate {skill-name}` mostra preface composto que seria injetado, sem invocar a skill.

### Won't Have (desta versão)

- **Runtime discovery puro.** Capabilities continuam build-time via `/init`. Razão: token cost por invocação de skill = mudança de UX. Stale detection + warning cobre o caso real.
- **Mobile checkpointing dedicado** (Expo/RN). Profile detector não cobre mobile; nenhum caso real demanda. Padrão genérico de checkpoint já existe (STATE.md, discovery/, waves). Reavaliar em v6.4+ se Expo/RN aparecer em projetos do usuário.
- **Language hints preenchidos.** v6.3.0 só define `language: null` no `PrefaceContext` e reserva slot. v6.5 (Node+TS) e v6.6 (Rails) preenchem.
- **Framework hints preenchidos.** Mesmo motivo — `framework: null` em v6.3.0; v6.6+ preenche.
- **Cobertura de profiles além de `nextjs-app-router` + `mvc-flat`** na Onda 2 (CRUD audit). `clean-architecture-ritual`, `vertical-slice`, `unknown-mixed` caem em LLM-fallback best-effort. AST coverage adicional fica pra v6.4.
- **Discovery cross-projeto (monorepo).** `/init` opera 1×/sub-projeto (alinhado com /init PRD §Won't Have "Multi-tenant migration").
- **UI/dashboard de inspeção de parity gaps.** `parity-gaps.json` é lido por humano em editor. Sem visualização.

---

## Requisitos Nao-Funcionais

- **Performance:** `readPrefaceContext()` em <50ms (read+parse de 2 arquivos pequenos). Leitura de `capabilities.json` em <100ms (typical 50-200 routes). Sem impacto na latência de skills.
- **Custo:** Adaptação não aumenta token budget — preface adiciona ~50-200 tokens; capabilities.json substitui Grep ad-hoc que custa mais. **Saldo provável: economia** em projetos médios.
- **Confiabilidade:** AST parsers determinísticos pra `nextjs-app-router` + `mvc-flat`. LLM-fallback marcado `source: "llm"` + `confidence < 1.0` — consumidores sabem distinguir. Stale checksum evita decisão baseada em info envelhecida.
- **Observabilidade:** Cada geração de `capabilities.json` ou `parity-gaps.json` registra entry em `discovery/agents-log.json` (audit log existente do /init PRD).
- **Seguranca:** `capabilities.json` gitignored por default — pode vazar endpoints internos. Operador opt-in via flag pra commitar. `parity-gaps.json` também gitignored (revela MCPs instalados, info sensível em contexto de pentest).
- **Idempotência:** Mesmo `src/` + mesmo profile → mesmo `capabilities.json` (AST determinístico) ou diff mínimo (LLM fallback parts).
- **Acessibilidade:** N/A nesta versão (sem UI nova; tudo arquivo + skill prompts).

---

## Decisoes Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Forma de adaptação | `profile-aware-preface` (bloco marcado em `SKILL.md`) + `readPrefaceContext` helper | Skill dinâmica gerada / Lookup table TS centralizada / Re-prompt em runtime | Padrão já provado em `/architecture`; replicação é cosmética. Bloco marcado permite harness validar. Sem geração dinâmica que vira mágica difícil de debugar. |
| 2 | Shape do contexto adaptativo | `PrefaceContext { profile, language, framework, confidence }` composto desde já | Só `profile` agora, expandir depois / String monolítica concatenada / Map livre | Custo zero hoje (campos `null`), evita refactor em v6.5/v6.6. Shape composto força composabilidade no design das skills. |
| 3 | Cobertura de profiles para CRUD audit v1 | `nextjs-app-router` (AST) + `mvc-flat` (LLM-fallback) | Todos os 5 profiles / Só nextjs / Sem cobertura, deixar pro usuário | Cobre os dois casos mais comuns hoje. Outros caem em best-effort transparente com confidence baixo. Expansão incremental sem big-bang. |
| 4 | Estratégia de extração de capabilities | AST-first com LLM-fallback marcado | Só AST / Só LLM / Heurística regex | Determinismo onde possível (AST), expressividade onde precisa (LLM). Campo `source` + `confidence` permite consumidor decidir. |
| 5 | `parity-audit`: skill nova vs extender `qa-visual` | **Skill nova `/parity-audit`** + lib compartilhada | Flag `--parity` em qa-visual / Hook automático no /init / Sub-skill de qa-visual | Escopo plugin-wide ≠ UI-only do qa-visual. Gatilho per-project ≠ per-feature. Outputs com schemas conflitantes. Lib compartilhada (`tool-registry-inspector`) evita duplicação. |
| 6 | Discovery: runtime vs build-time | Build-time default + stale checksum + warning | Runtime puro / Lazy discovery / Híbrido por skill | Token cost previsível, debug fácil (arquivo inspecionável). Stale warning cobre cache envelhecido sem bloqueio que vire fricção. |
| 7 | Localização dos artefatos | `discovery/capabilities.json` + `discovery/parity-gaps.json` + `discovery/_schemas/*.json` | Misturar com `inventory.json` / Em `.claude/` / Em config TS | Reusa convenção `discovery/` já estabelecida no /init PRD. Schemas próximos pra validação automática. |
| 8 | Política de gitignore | Tudo em `discovery/*.json` gitignored por default; flag opt-in pra commitar | Tudo committed / Gitignored sem opt-in / Por arquivo manual | Endpoints/MCPs podem ser sensíveis. Default seguro; usuário avançado opta. |
| 9 | Migração de `qa-visual` pra lib compartilhada | Refactor incluso em Onda 3, sem mudança de UX visível | Deixar qa-visual como está / Reescrever qa-visual / Deprecar qa-visual | Evita duplicação imediata da tool enumeration. Sem mudança visível ao usuário = baixo risco. Habilita futuras integrações. |
| 10 | Stale detection threshold | Checksum por path-chave (`package.json`, top-level `src/`, `routes/` se existe). Warning silencioso se diferente. | Tempo absoluto / Hash do repo inteiro / Sem stale check | Pragmático: paths chave cobrem 95% dos casos. Hash repo inteiro custa I/O. Sem check = decisão errada silenciosa. |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado um projeto com `architecture-profile.md: nextjs-app-router (92%)`, quando `/security` é invocada, então `readPrefaceContext()` retorna `{ profile: 'nextjs-app-router', language: null, framework: null, confidence: 92 }` e o prompt final contém o bloco preface específico de Next.js (rotas API, middleware, CSRF).
- [ ] **CA-02:** Dado um projeto **sem** `architecture-profile.md`, quando qualquer skill adaptada é invocada, então `readPrefaceContext()` retorna `{ profile: null, ..., confidence: 0 }` e o prompt final cai no fallback genérico (comportamento v6.2 preservado).
- [ ] **CA-03:** Dado um projeto Next.js com 23 rotas em `app/**/route.ts`, quando `/init` roda, então `discovery/capabilities.json` contém 23 entries com `kind: "route"`, `source: "ast"`, `confidence: 1.0`.
- [ ] **CA-04:** Dado um projeto `unknown-mixed`, quando `/init` roda, então `capabilities.json` contém entries com `source: "llm"` e `confidence < 1.0`; consumidores recebem warning "best-effort coverage".
- [ ] **CA-05:** Dado `/parity-audit` rodando em projeto com Stripe webhook mas sem MCP Stripe instalado, então `parity-gaps.json` contém gap com `task_type: "payment-debug"`, `severity: "critical"`, `suggestion` apontando MCP a instalar.
- [ ] **CA-06:** Dado `qa-visual` migrado, quando invocado, então usa `tool-registry-inspector.ts` para confirmar Playwright disponível (em vez de listar tools hardcoded no `allowed-tools`). Comportamento UX idêntico ao v6.2.
- [ ] **CA-07:** Dado uma skill nova `/foo` adicionada com `<!-- profile-aware-preface:start -->...<!-- profile-aware-preface:end -->` consumindo `readPrefaceContext`, então `harness-validate.mjs` valida o bloco e nenhum código de skill repete leitura de `architecture-profile.md`.
- [ ] **CA-08:** Dado `capabilities.json` gerado há 2 dias contra `src/` que mudou (checksum diferente), quando skill consumidora lê, então emite warning "considere `/init --refresh`" sem bloquear execução.
- [ ] **CA-09:** Dado `PrefaceContext` shape `{ profile, language, framework, confidence }`, então v6.5/v6.6 adicionando `language: 'node-ts'` ou `framework: 'rails'` não exige mudança em `readPrefaceContext` ou nas 6 skills adaptadas — só adição em lookup tables.
- [ ] **CA-10:** Dado o doc canônico `docs/design-docs/adaptive-coaching-framework.md`, então contém: shape do `PrefaceContext`, schemas de `capabilities.json` e `parity-gaps.json`, migration guide pra autor de skill (<30min pra portar skill existente).
- [ ] **CA-11:** Dado `harness-validate.mjs` rodando após Onda 4, então valida que pelo menos 5 skills (4 RF-MH-05 + `/architecture` existente) têm bloco profile-aware-preface bem-formado.

---

## Out of Scope

- **Knowledge de linguagem** (Node+TS, Rails, etc) — v6.5.0+ via campos `language`/`framework` reservados no `PrefaceContext`.
- **Mobile checkpointing dedicado.** Padrão genérico de checkpoint já existe (STATE.md/discovery/). Mobile-specific só se Expo/RN aparecer em projetos reais.
- **Runtime discovery puro.** Continua build-time. Híbrido fica fora.
- **Cobertura AST de profiles além de `nextjs-app-router` + `mvc-flat`.** v6.4+ expande.
- **Refactor de skills sem profile-aware-preface relevante** (ex: `/quick-plan`, `/lessons-learned` se decisão for não adaptar). Continuam genéricas.
- **Multi-tenant discovery em monorepo.** 1×/sub-projeto.
- **UI/dashboard de visualização de gaps ou capabilities.** Arquivos JSON lidos por humano.

---

## Dependencias

| Tipo | Dependência | Status |
|------|-------------|--------|
| **Hard prerequisite (frontmatter `requires`)** | **v6.1.0 — Contrato de Subagentes v1** | bloqueia — `/parity-audit` e CRUD auditor são `kind: "audit"` no contrato v1; sem v6.1.0 mergeada, v6.3.0 não inicia. |
| Skill desbloqueada por esta versão | **v6.5.0 — Node+TS language knowledge** | aguarda framework adaptativo desta versão; `language` slot reservado |
| Skill desbloqueada por esta versão | **v6.6.0 — Rails language knowledge** | mesmo — slot `language` + `framework` |
| Soft dep (não bloqueia) | `/init` v6.2 produzindo `capabilities.json` | se /init derrapar, v6.3.0 entrega `/parity-audit` + emergent coaching primeiro; CRUD audit (Onda 2) condicional. |
| Skill existente | `/anti-vibe-coding:architecture` (referência do padrão profile-aware-preface) | mantida — serve de template |
| Lib existente | `skills/lib/architecture-detector/` | mantida; consumida via `readArchitectureProfile` (já existe) |
| Lib existente | `skills/lib/read-architecture-profile.ts` | mantida; será **wrapped** por `readPrefaceContext` |
| Lib nova | `skills/lib/preface-context.ts` (helper composto) | a criar |
| Lib nova | `skills/lib/tool-registry-inspector.ts` (enum MCPs/tools/subagentes) | a criar |
| Schema novo | `discovery/_schemas/capabilities-v1.schema.json` | a criar |
| Schema novo | `discovery/_schemas/parity-gaps-v1.schema.json` | a criar |
| Doc novo | `docs/design-docs/adaptive-coaching-framework.md` | a criar |
| ADR novo | `docs/design-docs/ADR-NNNN-adaptive-coaching.md` | a criar |
| Skill nova | `skills/parity-audit/SKILL.md` | a criar |
| Script existente | `scripts/harness-validate.ts` | extensão para checar blocos `profile-aware-preface` em mais skills |
| Skill existente | `qa-visual` | refactor pra usar `tool-registry-inspector` (sem mudança UX) |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| v6.1.0 (contrato) atrasa e bloqueia v6.3.0 | média | alto | `requires` explícito. Ondas 1, 3, 4 não dependem do contrato; só CRUD/parity auditors precisam de `kind: "audit"`. Se v6.1.0 derrapar, entregar Ondas 1+4 (PrefaceContext + 4 skills adaptadas) num release intermediário sem subagentes novos. |
| AST parser de rotas Next.js cobre só `app/**/route.ts`, ignora padrões customizados | alta | médio | LLM-fallback marcado com `confidence < 1.0` cobre o gap. `coverage_gaps` no JSON declara o que falhou. Compound note se padrão comum emergir. |
| `PrefaceContext` composto vira over-engineering — `language`/`framework` ficam `null` para sempre | baixa | baixo | Custo zero hoje (campos null, código não usa). v6.5/v6.6 já estão no roadmap. Se cancelarem, slot vira docs histórico. |
| Profile com baixa confidence (60%) vira ruído nas skills adaptadas | média | médio | Threshold default em 70% (configurável via `config/adaptive-coaching.json`). Abaixo cai em fallback genérico. RF-CH-02. |
| `capabilities.json` expõe endpoints internos se commitado por descuido | média | alto | Gitignored por default (Decisão #8). Doc canônico alerta. Validator de pre-commit detecta tentativa de commit do path. |
| `parity-gaps.json` revela MCPs instalados — info sensível em pentests | baixa | médio | Gitignored por default. Doc alerta sobre contexto pentest. |
| Stale detection (checksum) falha-negativa silencia recomendação errada | média | médio | Checksum em paths-chave (`package.json`, top-level `src/`). Conservador: prefere falso-positivo (warning desnecessário) a falso-negativo. |
| Skills migradas pra preface adaptativo regridem em projetos sem profile (`unknown-mixed`) | média | alto | CA-02 obriga fallback genérico preservar comportamento v6.2. Fixtures cobrem caso `profile: null`. |
| Refactor de `qa-visual` quebra fluxo já validado pelo usuário | baixa | alto | Lib `tool-registry-inspector` é wrapper transparente — qa-visual passa a chamar lib em vez de ter lista hardcoded; comportamento idêntico. Smoke test antes de mergear. |
| Expansão pra 6 skills (RF-MH-05 + RF-SH-05) consome mais tempo que estimado | alta | baixo | Pattern já provado em `/architecture`. Aplicação é mecânica. Onda 4 pode shippar com 4 skills (Must) e adicionar 2 (Should) em release patch v6.3.1. |

---

## Critérios de Encerramento (Definition of Done)

- [ ] ADR aprovado e commitado.
- [ ] Documento canônico publicado em `docs/design-docs/adaptive-coaching-framework.md`.
- [ ] Schemas JSON em `discovery/_schemas/capabilities-v1.schema.json` e `parity-gaps-v1.schema.json`.
- [ ] `skills/lib/preface-context.ts` + `skills/lib/tool-registry-inspector.ts` com testes verdes.
- [ ] `/init` produz `discovery/capabilities.json` para projetos `nextjs-app-router` e `mvc-flat`.
- [ ] Skill `/anti-vibe-coding:parity-audit` produz `discovery/parity-gaps.json` com gaps ranqueados.
- [ ] 4 skills priorizadas (`/security`, `/api-design`, `/system-design`, `/design-patterns`) com bloco `profile-aware-preface` consumindo `readPrefaceContext`.
- [ ] `qa-visual` refatorada pra usar `tool-registry-inspector` (sem mudança de UX).
- [ ] `harness-validate.mjs` valida blocos profile-aware-preface bem-formados.
- [ ] Fixtures em `skills/lib/__fixtures__/` cobrem 5 profiles para `PrefaceContext` e 2 profiles para `capabilities.json`.
- [ ] **Branch isolado durante Ondas 1-3; merge to main só depois da Onda 4 verde** (todas as skills migradas + fixtures). Sem release intermediário público.
- [ ] `CHANGELOG.md` entrada para v6.3.0 com link pro ADR.
- [ ] Lesson compound em `docs/compound/` se migração revelar padrão durável (ex: "skills sem profile-aware-preface se beneficiam menos que esperado — critério de seleção pra Onda 4 importa").
