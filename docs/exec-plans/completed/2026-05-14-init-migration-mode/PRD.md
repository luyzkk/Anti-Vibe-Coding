---
slug: init-migration-mode
date: 2026-05-14
status: draft
requires: [v6.1.0-subagent-contract]
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): cap 6 subagentes — alinhado com PRD §Decisões Técnicas #1`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: /init Migration Mode — Pipeline LLM-First Ancorado no Canon do André Prado

**Status:** Draft
**Author:** Luiz + AI
**Date:** 2026-05-14
**Context:** ./CONTEXT.md (a ser gerado se necessário; conversa-fonte preservada no histórico do chat)

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.
-->

## Problema

A skill `/init` atual (`skills/init/SKILL.md` + `skills/init/lib/template-manifest.ts`) só sabe rodar em duas circunstâncias bem definidas:

1. **Greenfield (sem CLAUDE.md, sem `docs/`, sem `.claude/`):** scaffolda os 26 templates direto, comportamento OK.
2. **Migração v5.x→v6.0 (com `.planning/`):** detecta e converte determinísticamente.

Mas existe um **terceiro estado crítico não-coberto**: repositório que **já tem documentação institucional pré-existente** (READMEs densos, ADRs soltos, design notes espalhados, arquivos `*-architecture.md` de mil linhas) mas **nunca passou pelo Anti-Vibe Coding**. Hoje o `/init` nesse cenário ou recusa (colisão de arquivos) ou sobrescreve trabalho humano se forçado. Resultado: o operador (humano) é deixado com a decisão de fazer manualmente o mapeamento doc-existente → 26 slots canônicos do template, tarefa que demanda leitura semântica de arquivos densos e julgamento sobre consolidação/divisão.

O impacto de não resolver isso: o plugin **não consegue dogfood** (não roda no próprio repo do Anti-Vibe-Coding, que tem `ARCHITECTURE.md`, `docs/PIPELINE.md`, `docs/MODEL_PROFILES.md`, `docs/AGENTS_LIST.md`, `docs/UPGRADE.md`, `docs/design-docs/ADR-*.md`, `docs/compound/*` — todos institucionais e valiosos). E mais grave: **adoção em projetos maduros fica bloqueada**, porque ninguém com 1000 linhas de doc legada quer apagar tudo pra rodar o template.

A doutrina anti-vibe diz: documentação é o mapa que orienta a IA em sessões futuras. Doc denso, mal organizado ou disperso obriga a IA a ler 1000 linhas por consulta. Doc bem dividida (1 slot canônico = 1 responsabilidade) deixa a IA pular pra arquivo certo em ~50 linhas. Investir tokens **agora** em reorganizar doc paga juros compostos **depois** em toda sessão de coding.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- O operador consegue rodar `/init` em qualquer repositório (greenfield, migração v5→v6, **ou populado com doc própria**) e o comando se adapta ao estado encontrado.
- Quando `/init` detecta documentação pré-existente, ele **lê cada arquivo (até arquivos densos de 1000+ linhas) sem ocupar o contexto principal** e produz um plano de migração por slot canônico em `docs/exec-plans/active/`.
- O operador consegue rodar `/init` no próprio repositório do plugin Anti-Vibe-Coding (dogfood) e receber plans concretos sobre como evoluir `ARCHITECTURE.md`, `docs/PIPELINE.md`, `docs/MODEL_PROFILES.md`, `docs/AGENTS_LIST.md`, `docs/UPGRADE.md` em direção ao canon de 22 do André + 4 extensões anti-vibe.
- A estrutura final de documentação **honra o canon de 22 artefatos do harness do André Prado** (`claude-code/V6.0.0/package/skills/harness-engineering/assets/harness-template/`) sem desvio (hipótese a testar: imutabilidade dos 22).
- As 4 extensões anti-vibe (`docs/MERGE_GATES.md`, `docs/COMPOUND_ENGINEERING.md`, `docs/review-checklists/*`, `docs/smoke-flows/`) são **referenciadas explicitamente em `AGENTS.md`** dentro do limite ≤40 linhas validado pelo `harness-validate.mjs`.
- O sistema é **idempotente**: rodar `/init` duas vezes no mesmo repo produz o mesmo conjunto de plans, sem sobrescrever edições humanas.
- O sistema é **observável**: cada subagente deixa transcript em `discovery/agents-log.json` para debug futuro (sem PII).
- A migração tem **estado vivo no manifest**: `initMode: "migration" | "fresh" | "completed"`. `harness-validate.mjs` adapta strictness ao estado.

### Mecanismo (algorítmico — o COMO)

Pipeline em **5 fases**, ancorado no esqueleto canônico do harness do André (lido em `f:\Projetos\Anti-Vibe-Coding\claude-code\V6.0.0\package\skills\harness-engineering\`).

**Fase 0 — Inventário mecânico (TS determinístico em `skills/init/lib/discovery.ts`)**
- Walk em `docs/**`, `*.md` da raiz, `.claude/**`, `scripts/**`, `.github/**`.
- Por arquivo: extrair `{path, size_bytes, size_lines, mtime, h1_h2_headings[], first_500_chars}`.
- Output: `discovery/inventory.json`.
- Zero classificação semântica nesta fase — só matéria-prima.

**Fase 1 — Leitura semântica paralela (LLM, subagente `Explorer` × até 6 paralelos)**
- Hard cap **6 subagentes** paralelos (Decisão Técnica #1). Repos com >18 arquivos rodam em batches sequenciais de 6.
- Cada subagente recebe 3-5 arquivos do inventário + prompt em `skills/init/lib/prompts/explorer.md`.
- Subagente lê arquivo **inteiro** (mesmo 1000+ linhas — agente principal nunca toca). Devolve struct:
  ```
  { path, semantic_topic, slot_match: 'docs/DESIGN.md' | ..., confidence: 0.0-1.0,
    sections: [{heading, lines, purpose, mergeable_into_slot: bool}],
    suggested_destiny: 'consolidate-into-canon' | 'split-across-canon' | 'move-to-references' | 'deprecate-after-merge',
    density_score: 'thin' | 'normal' | 'dense' (dense = >500 linhas)
  }
  ```
- Output: `discovery/semantic-inventory.json`. Agente principal nunca recebe os arquivos crus, só essa estrutura.
- **Tratamento de falha** (Decisão Técnica #3): retry 1× com prompt menor (menos arquivos por subagente); se falhar de novo, `/init` aborta com relatório de arquivos não-processados.

**Fase 2 — Reconciliação por slot canônico (LLM, agente principal `Reconciler`)**
- Itera nos 26 slots do `TEMPLATE_MANIFEST` (22 canon-andre + 4 anti-vibe-extension, distinguidos por novo campo `category`).
- Para cada slot, cruza com `semantic-inventory.json` filtrando matches relevantes.
- Decisão: `empty` / `equivalent` / `divergent` / `consolidate-N-into-1` / `split-1-into-N`.
- Emite migration plan em `docs/exec-plans/active/2026-MM-DD-NNNN-{slot-slug}-migration.md` com **shape EXATO do `new-plan.mjs` do André** (10 seções: Goal / Scope / Assumptions / Risks / Execution Steps / Review Checklist / Validation Log / Compound Opportunity / Lessons Captured / Exit Criteria).
- Execution Steps são granulares e auditáveis. Exemplo gerado: *"1. Ler `docs/PIPELINE.md` (847 linhas). 2. Extrair seção 'Skill orchestration' (linhas 120-280) → `docs/DESIGN.md` §Mechanism. 3. Extrair seção 'Subagent topology' (linhas 281-440) → `ARCHITECTURE.md` §Recommended Layers. 4. Marcar `docs/PIPELINE.md` como `<!-- DEPRECATED: see migration plan {plan-id} -->`. 5. Rodar `npm run harness:validate`. 6. Mover plan para `docs/exec-plans/completed/`."*

**Fase 3 — Compound notes (LLM, agente principal)**
- Revisa `semantic-inventory.json` + decisões da Fase 2.
- Emite `docs/compound/2026-MM-DD-{topic}.md` para cada: padrão preservado idiossincrático (ex: "PIPELINE.md fora do canon — preservado como references"), arquivo denso que precisou ser quebrado, anti-pattern detectado, decisão de mapeamento não-trivial.
- Cada compound note segue contrato CA-29 (frontmatter `title`/`category`/`tags`/`created`).

**Fase 4 — Manifesto + Orchestrator (TS determinístico)**
- Escreve `.claude/.anti-vibe-manifest.json`:
  ```
  {
    pluginVersion: "...",
    initMode: "migration",
    installedAt: "ISO",
    files: { ...checksums },
    migrationPlans: [
      { id, slot, path, status: "active" }
    ]
  }
  ```
- Escreve `docs/exec-plans/active/_INIT_ORCHESTRATOR.md` com plans em **ordem topológica** (design-docs antes de exec-plans; AGENTS.md por último porque referencia tudo).
- Estende `scripts/harness-validate.mjs` (ou cria wrapper): quando `initMode === "migration"`, ausência dos 26 vira `warning` (não `error`); exige consistência (todo slot ausente tem plan ativo correspondente).
- **Auto-flip** (Decisão Técnica #5): após cada commit que move plan para `completed/`, hook verifica se `migrationPlans` ativos é vazio → flippa `initMode: "completed"` automaticamente; `harness-validate` volta strict. Warning visual na próxima sessão: *"Migration concluded — strict mode re-engaged."*

**Fase 5 — First-Use Customization (LLM, opcional, espelhada das linhas 148-194 do `harness-engineering/SKILL.md`)**
- Depois dos placeholders criados + plans escritos, LLM lê código real do projeto (`package.json`, framework detectado, `apps/**`, `packages/**`).
- Substitui linguagem genérica dos templates por verdade do projeto.
- Deixa `TODO(<owner/context-needed>): ...` onde não soube.
- Comportamento idêntico ao "First Use Customization" do André, apenas operando **após** a Fase 2 ter criado os plans (ordem inversa do harness: lá o template é só copiado, customização é responsabilidade humana posterior; aqui o template é guiado por plans que já existem).

---

## Fluxos UX por Ator

### Operador (humano que roda `/init`)

**Cenário 1 — Greenfield (estado atual preservado):**
1. Roda `/init` em diretório vazio ou só com README genérico.
2. Pipeline detecta `inventory.json` vazio → vai direto pra scaffold (comportamento atual).
3. Recebe os 26 arquivos + manifest com `initMode: "fresh"`.

**Cenário 2 — Migração v5.x→v6.0 (estado atual preservado):**
1. Roda `/init` em repo com `.planning/`.
2. Detect v5 legacy → backup → migrate-orchestrator (já existe). Manifest `initMode: "fresh"` ao final.

**Cenário 3 — Repo populado com doc própria (FLUXO NOVO):**
1. Operador roda `/init` em repo com `docs/ARCHITECTURE.md`, `docs/PIPELINE.md`, `docs/design-notes-2024.md`, `ADR-001.md`, etc.
2. Sistema detecta: sem manifest + N arquivos `.md` em `docs/` + sem `.planning/` → **migration mode**.
3. Mensagem: *"Detectei 14 arquivos de documentação pré-existente. Vou ler cada um e gerar plans de migração para o canon de 22 do harness + 4 extensões anti-vibe. Estimativa: ~6 subagentes paralelos, 2-4 min, ~150K tokens. Confirma?"*
4. Confirmação humana via `AskUserQuestion` (RF Must Have #6).
5. Sistema roda Fases 0-4. Output:
   - `discovery/inventory.json` (mecânico)
   - `discovery/semantic-inventory.json` (LLM)
   - `discovery/agents-log.json` (audit, gitignored)
   - N migration plans em `docs/exec-plans/active/`
   - M compound notes em `docs/compound/`
   - `.claude/.anti-vibe-manifest.json` com `initMode: "migration"`
   - `docs/exec-plans/active/_INIT_ORCHESTRATOR.md`
6. Mensagem final: *"Migração mapeada. {N} plans em active/, {M} compound notes. Rode `/anti-vibe-coding:execute-plan` para iniciar consolidação, ou edite plans manualmente. Strict validation retornará quando último plan virar completed/."*

**Cenário 4 — Re-run em modo migration:**
1. Operador editou plans manualmente, rodou `/init` de novo (intencional ou por engano).
2. Sistema detecta `initMode: "migration"` + manifest existente → full re-run (Decisão Técnica #2).
3. Apaga `discovery/*`, regenera. Plans em `active/` **preservados** (não sobrescreve trabalho humano).
4. Arquivos canônicos com checksum diferente do manifest (= editado pelo humano) → skip + warn: *"`AGENTS.md` foi editado, mantendo versão atual."*

**Copy relevante:**
- Confirmação migration: *"Encontrei 14 arquivos de doc. Estimativa de custo: ~150K tokens (6 subagentes em paralelo). Prosseguir?"*
- Falha de subagente: *"Subagente Explorer #3 falhou (timeout). Tentando novamente com prompt reduzido. Se falhar, abortarei e reportarei arquivos não-processados."*
- Final OK: *"Migration mapped. 9 plans active, 4 compound notes. Strict mode re-engages when last plan moves to completed/."*
- Final falha: *"Migration aborted: 2 subagentes falharam após retry. Arquivos não-processados: [...]. Investigar e re-rodar."*

---

## Requisitos Funcionais

### Must Have (maximo 40% do total — 7 de ~18 = 39%)

- [ ] **RF-MH-01:** `/init` detecta automaticamente o estado do repo no início (greenfield / v5-legacy / populado-sem-anti-vibe / já-iniciado) e roteia para o branch correto. Branching baseado em: existência de `.claude/.anti-vibe-manifest.json`, existência de `.planning/`, contagem de `*.md` em `docs/` e raiz.
- [ ] **RF-MH-02:** Pipeline em modo migration tem **5 fases sequenciais com gates**: Fase N+1 só roda se Fase N retornou sucesso. Fase 0 (Discovery TS), Fase 1 (Explorer LLM paralelo), Fase 2 (Reconciler LLM principal), Fase 3 (Compound LLM principal), Fase 4 (Manifesto + Orchestrator TS).
- [ ] **RF-MH-03:** Cap de **6 subagentes** Explorer paralelos. Repos com mais arquivos rodam em batches sequenciais.
- [ ] **RF-MH-04:** Migration plans usam **shape EXATO do `new-plan.mjs` do André** (10 seções obrigatórias). Validador rejeita plans com seções faltando.
- [ ] **RF-MH-05:** `TEMPLATE_MANIFEST` ganha campo `category: 'canon-andre' | 'anti-vibe-extension'`. Cada entrada é classificada. Validator trata diferente (canon ausente = error, extension ausente = warning configurável).
- [ ] **RF-MH-06:** Confirmação humana via `AskUserQuestion` **antes** de disparar Fase 1 (que consome tokens). Mostra estimativa de subagentes + tokens.
- [ ] **RF-MH-07:** `AGENTS.md` template (canon-andre) é estendido para referenciar as 4 extensões anti-vibe agrupadas, mantendo ≤40 linhas (39 estimadas).

### Should Have

- [ ] **RF-SH-01:** Idempotência full re-run: rodar `/init` duas vezes em modo migration regenera `discovery/*` mas preserva plans em `active/` e arquivos com checksum modificado.
- [ ] **RF-SH-02:** Auto-flip `initMode: "migration" → "completed"` quando último plan-migration move para `completed/`. Hook git ou check no início de cada `/init`.
- [ ] **RF-SH-03:** Audit log em `discovery/agents-log.json` (gitignored): input + output JSON estruturado por subagente. Sem PII.
- [ ] **RF-SH-04:** `harness-validate.mjs` estendido com modo migration (ausência dos 26 vira warning enquanto `initMode === "migration"`; volta strict em `"completed"`).
- [ ] **RF-SH-05:** Prompts dos subagentes em arquivos separados (`skills/init/lib/prompts/{explorer,reconciler,compound}.md`), versionados via manifest, com checksum.
- [ ] **RF-SH-06:** Fixtures de teste em `skills/init/__fixtures__/` (repos-mock pré-fabricados): greenfield, single-design-file, scattered-adrs, dense-architecture, dogfood-anti-vibe-plugin.
- [ ] **RF-SH-07:** Compound notes seguem contrato CA-29 (frontmatter `title`/`category`/`tags`/`created`) e passam `bun run compound:check`.

### Could Have

- [ ] **RF-CH-01:** Flag `--dry-run` em modo migration (espelhando v5→v6): roda Fase 0-3 sem escrever nada, mostra preview dos plans que seriam criados.
- [ ] **RF-CH-02:** Flag `--reuse-discovery` permite pular Fase 0-1 se `semantic-inventory.json` < 24h (Decisão Técnica #2 oferece full re-run como default; flag inverte).
- [ ] **RF-CH-03:** Subcomando `/init finalize` que valida e flippa `initMode → "completed"` manualmente (Auto-flip é o default; manual é fallback).
- [ ] **RF-CH-04:** Fase 5 (First-Use Customization) ativável via flag `--customize` (default off — só roda quando explicitamente pedida pra evitar surpresa).

### Won't Have (desta versão)

- **Custom slot creation:** operador não pode adicionar slots novos ao `TEMPLATE_MANIFEST` via `/init`. Slots são canon imutável (André) + extensões versionadas (anti-vibe). Adição passa por PR no plugin.
- **Multi-tenant migration:** `/init` não suporta migrar múltiplos sub-projetos de um monorepo numa única invocação. Operador roda 1×/projeto.
- **Rollback automático:** se Fase 2 falhar após Fase 1 ter consumido tokens, não há "rewind" — `discovery/*` fica como evidência, operador investiga e re-roda. Rollback automático é over-engineering pra primeira versão.
- **Mecânica de invocação (`Task` tool / `isolation: "fork"`):** continua como hoje — esta versão não muda como invocamos, só como subagentes respondem. **Contrato de saída dos subagentes** (status lifecycle, reasoning, payload por kind) **é hard requirement** via `requires: [v6.1.0-subagent-contract]` no frontmatter. Reconciler/Explorer/Compound nascem já emitindo contrato v1. Ver `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md`.
- **Detecção de stack para customizar prompts:** prompts são genéricos por enquanto. Detecção de stack para tunar prompt do Explorer (ex: prompt diferente pra repos Rust vs Next.js) entra em v6.2+.

---

## Requisitos Nao-Funcionais

- **Performance:** Fase 0 (TS) executa em <2s para repos com até 500 arquivos. Fase 1 (LLM) executa em <4min para repos com até 30 arquivos `.md` (cap 6 paralelos = 5 batches sequenciais máximo). Fase 2-4 executam em <2min combinadas. Total: <8min para o caso médio.
- **Custo (token budget):** Estimativa de ~150K tokens para repo com 15 arquivos densos (1000 linhas média). Sistema avisa ao operador antes de Fase 1. Sem cap automático (decisão do operador).
- **Seguranca:** Subagentes leem arquivos do repo do operador — operador pode ter secrets em `.env` ou similar. Fase 0 deve **excluir** paths comuns de secrets (`.env*`, `*.pem`, `*.key`, `node_modules/`, `.git/`, `dist/`, `build/`). Audit log não deve incluir conteúdo de arquivo, só metadata (path, size, slot_match, decision).
- **Acessibilidade:** Não aplicável (CLI tool, sem UI). Mensagens humanas em pt-br/en consistente com resto do plugin.
- **Observabilidade:** `discovery/agents-log.json` com estrutura `{run_id, timestamp, subagent_id, input_paths, output_struct, duration_ms, retry_count, error?}`. Telemetria de skill já existe (linhas 10-33 do `write-prd/SKILL.md` mostram padrão) — `init` deve emitir start/end com mesma estrutura.
- **Idempotência:** Operação `/init` em modo migration produz o mesmo conjunto de plans se rodado em sequência sem edições humanas intervenientes. Não-determinismo do LLM é mitigado por: (a) baixa temperatura nos prompts; (b) prompts estruturados com schema JSON estrito; (c) audit log permite diff entre runs.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Budget de subagentes paralelos | Hard cap 6 | Cap 12 / Sem cap / Configurável | Custo controlado, latência previsível, alinha com limite usual do Task tool. Configurável fica como CH futuro. |
| 2 | Política de re-execução | Full re-run (regenera discovery, preserva plans+edits) | Reuse discovery / Abort se manifest existe / Incremental | Reprodutibilidade > velocidade. Operador raramente re-roda; quando re-roda, quer estado limpo. Plans em `active/` são trabalho humano, intocáveis. |
| 3 | Falha de subagente | Retry 1× com prompt reduzido, depois abort | Retry 2×+ skip / Fail fast / Fallback heurístico | Equilíbrio: 1 retry cobre flakes transientes; abort força investigação em caso real (fail-fast em flakes era ruidoso demais). Fallback heurístico contradiria o mandato LLM-first. |
| 4 | Escopo do walk Fase 0 | `docs/**` + `*.md` raiz + `.claude/**` + `scripts/**` + `.github/**` | Só `docs/**` / Tudo | Pega doc institucional + memória de sessão + maquinário sem arrastar `node_modules` ou código de runtime. |
| 5 | Detecção "migration completa" | Auto-flip quando último plan vai pra `completed/` + warning visual | Manual / Hook por commit / Auto sem warning | Reduz fricção (manual é cerimônia desnecessária), mantém transparência (warning visual previne surpresa). |
| 6 | Política de overwrite em re-run | Skip + warn se checksum mudou desde último run | Sempre skip / Sempre regenera placeholders / Perguntar arquivo-a-arquivo | Respeita edits humanos sem ficar perguntando. Checksum é fonte de verdade objetiva. |
| 7 | Audit log | `discovery/agents-log.json` sempre (sem PII) | Só com --debug / Só métricas / Sem log | Custo mínimo (gitignored), valor alto para debug. Sem PII garante segurança. |
| 8 | Localização dos prompts | Arquivos separados em `skills/init/lib/prompts/*.md`, versionados via manifest | Inline no SKILL.md / Template strings TS | SKILL.md já é denso; prompts longos sufocam legibilidade. Arquivos separados permitem diff/test/version trivial. |
| 9 | Canon imutabilidade | 22 do André como imutáveis (hipótese a testar) | Editar limites (ex: AGENTS.md ≤60) | Testar conclusão do André antes de divergir. Reversível depois. |
| 10 | Posicionamento das 4 extensões anti-vibe | Mantidas, marcadas com `category: 'anti-vibe-extension'`, referenciadas em AGENTS.md agrupadas | Enxugar pros 22 puros / Espalhar sem referência | Extensões agregam valor (operacionalizam conceitos abstratos do André) e devem ser navegáveis a partir do roteador (AGENTS.md). |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado um repositório vazio (greenfield), quando o operador roda `/init`, então o sistema scaffolda os 26 templates e grava manifest com `initMode: "fresh"`. (Preserva comportamento atual.)
- [ ] **CA-02:** Dado um repositório com `.planning/` (v5 legacy), quando o operador roda `/init`, então o sistema executa migração v5→v6 existente e grava `initMode: "fresh"`. (Preserva comportamento atual.)
- [ ] **CA-03:** Dado um repositório com 5+ arquivos `.md` em `docs/` e sem manifest, quando o operador roda `/init`, então o sistema entra em **migration mode**, mostra estimativa de subagentes/tokens, pede confirmação, e ao confirmar executa Fases 0-4.
- [ ] **CA-04:** Dado o repositório do plugin Anti-Vibe-Coding rodando `/init` em migration mode, então o sistema gera ≥3 migration plans cobrindo `docs/PIPELINE.md`, `docs/MODEL_PROFILES.md`, `docs/AGENTS_LIST.md` (mapeados para references ou consolidados em slots canon), e ≥1 compound note documentando a decisão de preservação.
- [ ] **CA-05:** Dado um arquivo de 1200 linhas em `docs/architecture-notes-2024.md`, quando a Fase 1 processa, então o agente principal nunca recebe o conteúdo cru — só recebe a struct semântica retornada pelo subagente Explorer.
- [ ] **CA-06:** Dado um repositório com 30 arquivos `.md`, quando a Fase 1 executa, então no máximo 6 subagentes rodam em paralelo; arquivos restantes em batches sequenciais de 6.
- [ ] **CA-07 (edge case):** Dado um subagente Explorer que falha (timeout ou parse error), quando o sistema detecta a falha, então tenta 1× com prompt menor (menos arquivos); se falhar de novo, `/init` aborta e reporta arquivos não-processados ao operador, sem flippar manifest.
- [ ] **CA-08:** Dado um migration plan gerado, então ele contém as 10 seções do `new-plan.mjs` do André exatamente (Goal/Scope/Assumptions/Risks/Execution Steps/Review Checklist/Validation Log/Compound Opportunity/Lessons Captured/Exit Criteria). Validator rejeita plans com seção faltando.
- [ ] **CA-09:** Dado `initMode: "migration"`, quando `harness-validate` roda, então ausência dos 26 vira warning (não error), e exige consistência (todo slot ausente tem migration plan ativo). Quando último plan move para `completed/`, auto-flip para `initMode: "completed"` e validação volta strict.
- [ ] **CA-10:** Dado operador rodando `/init` 2× em sequência no mesmo repo em migration mode, então: `discovery/*` é regenerado; plans em `active/` são preservados; arquivos com checksum diferente do manifest emitem warning "X foi editado, pulando regen".
- [ ] **CA-11:** Dado `AGENTS.md` final do template, então ele tem ≤40 linhas (validado por `harness-validate.mjs:55-57`) e referencia as 4 extensões anti-vibe agrupadas.
- [ ] **CA-12:** Dado um arquivo em `.env` ou `*.pem` no repo, então Fase 0 NÃO o inclui no inventário (lista de exclusão de paths sensíveis aplicada antes do walk).
- [ ] **CA-13 (audit):** Dado uma execução de `/init` em migration mode, então `discovery/agents-log.json` contém 1 entry por subagente Explorer + entries do Reconciler e Compound, com `run_id` único, sem conteúdo de arquivo, com duration e retry_count.

---

## Out of Scope

- **Refator da skill `/update`:** apesar de declararmos que `/update` será subset do `/init`, a unificação efetiva (mesmo engine, branching por estado) entra em ticket separado pós-v6.x. `/update` continua funcionando standalone.
- **Detecção de stack para tunar prompts:** Fase 1 usa prompt genérico. Detecção de stack (Rust vs Next.js vs Python) para customizar prompt do Explorer fica em v6.2+.
- **UI/dashboard para visualizar plans gerados:** plans são markdown puro. Visualização web fica fora.
- **Migração reversa (de `initMode: "completed"` → `"migration"`):** se operador quiser re-migrar (ex: adicionou nova doc legada depois), terá que apagar manifest manualmente. Caso de uso raro.
- **Internacionalização das mensagens dos prompts:** prompts em inglês conforme padrão do plugin. Mensagens de UX ao operador podem ser pt-br/en.

---

## Dependencias

### Dependencia: Contrato de Subagentes v1

Os 3 subagentes novos do /init (`reconciler`, `explorer`, `compound-writer`)
declaram `kind` no frontmatter e emitem envelope conforme `subagent-contract-v1`.
Referencia: [docs/design-docs/subagent-contract-v1.md](../../../design-docs/subagent-contract-v1.md)
e [ADR-0002](../../../design-docs/ADR-0002-subagent-contract.md).

Mapeamento de kind por agent do /init:
- `reconciler` -> `kind: "verification"` (compara estado existente vs canon, emite `payload.checks[]`)
- `explorer` -> `kind: "proposal"` (sugere estrutura de docs para repo desconhecido, emite `payload.proposal` + `human_readable`)
- `compound-writer` -> `kind: "mutation"` (cria/edita compound notes; usa `payload.mutation` stub conforme reservation v6.2)

Fixtures correspondentes serao adicionadas em `agents/__fixtures__/{nome}/`
seguindo o template do Plano 03 fase-05 deste feature predecessor.

| Tipo | Dependencia | Status |
|------|------------|--------|
| Feature pre-requisito | `Task` tool com `isolation: "fork"` (subagentes) | já disponível |
| Feature pre-requisito | `AskUserQuestion` tool (Step de confirmação humana) | já disponível (deferred, carregado via ToolSearch) |
| **Hard prerequisite (frontmatter `requires`)** | **v6.1.0 — Contrato de Subagentes v1** (`docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md`) | **bloqueia** — Reconciler/Explorer/Compound nascem emitindo contrato v1 (status lifecycle, reasoning ≥20 chars, payload por kind). Sem v6.1.0 mergeada na branch, `/init` não inicia migração. |
| Script existente | `scripts/harness-validate.mjs` (lido em `assets/templates/`) | precisa extensão para suportar `initMode: "migration"` |
| Script existente | `scripts/new-plan.ts.tpl` (porta do `new-plan.mjs` do André) | shape do migration plan deve casar |
| Lib existente | `skills/init/lib/scaffold-full-tree.ts` + `scaffold-templates.ts` | continuam usadas no branch greenfield |
| Lib existente | `skills/init/lib/migrate-orchestrator.ts` | continua usado no branch v5-legacy |
| Lib nova | `skills/init/lib/discovery.ts` (Fase 0) | A criar |
| Lib nova | `skills/init/lib/migration-planner.ts` (orquestra Fases 1-4) | A criar |
| Lib nova | `skills/init/lib/category-classifier.ts` (atualiza `TEMPLATE_MANIFEST` com `category`) | A criar |
| Prompts novos | `skills/init/lib/prompts/{explorer,reconciler,compound}.md` | A criar |
| Fixtures | `skills/init/__fixtures__/` (repos-mock) | A criar |
| Doutrina | `claude-code/V6.0.0/package/skills/harness-engineering/` (canon do André, read-only) | já versionado no monorepo |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Custo de tokens estoura orçamento do operador em repos densos (50+ arquivos × 1000 linhas) | média | médio | Confirmação humana antes de Fase 1 com estimativa visível. Cap 6 paralelos limita pico. Operador pode abortar com Ctrl+C. |
| Subagentes geram structs JSON malformadas (LLM não-determinismo) | média | alto | Prompts com schema JSON estrito + parser tolerante na lib TS. Retry 1× com prompt reduzido. Audit log permite debug. |
| Plans gerados são genéricos/insuficientes (não contextualizam o projeto) | média | alto | Prompts referenciam `package.json` e estrutura real. Fase 5 (First-Use Customization) opcional refina. Fixtures de teste validam contra repos reais (dogfood do plugin é caso de aceite). |
| `AGENTS.md` estendido com 4 extensões ultrapassa ≤40 linhas | baixa | médio | Agrupamento já planejado (39 linhas estimadas). Test em fixtures valida. Se passar, considerar relaxar validator (mas isso fura imutabilidade — preferir agrupar mais). |
| Operador roda `/init` em produção sem entender o que vai acontecer e gera centenas de plans não-revisados | baixa | médio | Confirmação humana obrigatória antes de Fase 1. Mensagem clara sobre N subagentes + estimativa. Documentação no `SKILL.md`. |
| Migração v5-legacy detector falha-negativa e roteia repo v5 para migration mode | baixa | alto | Ordem de detecção fixa: v5-legacy detect ANTES de migration mode check. Testes de regressão dos detectores. |
| v6.1.0 (contrato de subagentes) atrasa e bloqueia `/init` | média | alto | `requires: [v6.1.0-subagent-contract]` torna a dependência explícita. Mitigações: (a) v6.1.0 tem escopo finito (13 agentes + 4 orquestradores, 2-3 dias focados); (b) Reconciler/Explorer/Compound prompts ficam em `skills/init/lib/prompts/*.md` separados — escrever o prompt em paralelo com v6.1.0 é seguro, só não dá pra integrar antes do contrato. (c) Se v6.1.0 derrapar, `/init` pode entregar a parte non-subagent (Discovery TS + Manifesto + Orchestrator) num release intermediário. |
| Imutabilidade dos 22 canon do André prova-se errada na prática (ex: AGENTS.md ≤40 é apertado demais) | média | baixo | Hipótese declarada e testável. Após dogfood + 2-3 projetos reais, revisar. Reversível: relaxar limite no validator + atualizar template. |
| Compound check (`bun run compound:check`) rejeita notes geradas por LLM por frontmatter inválido | média | médio | Prompts compound impõem schema explícito. Lib TS valida ANTES de escrever; se inválido, retry com schema reforçado. |
| Audit log cresce indefinidamente em re-runs | baixa | baixo | Gitignored. Cap por tamanho (rotate quando >10MB). Documentar em `.gitignore` do template. |

