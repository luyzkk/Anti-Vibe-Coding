# Plano 08: Dog-Fooding (POR ULTIMO — R4 mitigation)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 8
**Sizing total:** ~14.5h
**Depende de:** Plano 03 (helpers `lib/detect-v5-legacy.ts`, `lib/backup-planning.ts`, `lib/migrate-planning.ts`, `lib/migrate-lessons.ts`, `lib/migrate-decisions.ts`), Plano 04 (`scripts/harness-validate.ts`, `scripts/compound-check.ts`), Plano 05 (template harmonizado D18, `lib/path-resolver-v6.ts`), Plano 06 (`lib/state-md-generator.ts`, `lib/completion-signal.ts`, `lib/lessons-learned-crud.ts`, `lib/decision-registry-revoke.ts`), Plano 07 (skill `/todo-pick` + `lib/todo-utils.ts`)
**Desbloqueia:** Plano 09 (Release — release valida estrutura dog-foodada como evidencia de v6.0.0 GA)

---

## O que este plano entrega

**Aplica todo o harness D29/D20 no proprio repositorio `anti-vibe-coding/`.** Apos este plano, o plugin que ensina v6 esta ELE MESMO em v6: `AGENTS.md` ≤40 linhas em ingles, `ARCHITECTURE.md`, 8 docs institucionais em `docs/`, 6 planos historicos migrados para `docs/exec-plans/completed/` com as 10 secoes harmonizadas (D18), N compound notes individuais em `docs/compound/` com frontmatter, `docs/design-docs/core-beliefs.md` (ex-senior-principles.md), N `docs/design-docs/ADR-*.md` (ex-decisions.md), `bun run harness:validate && bun run compound:check` retornam exit 0. Prova viva (CA-01 ate CA-05 + CA-38).

**Por que e o ULTIMO plano antes do release (R4):** se algo no harness/migration/validator quebrar quando aplicado ao proprio plugin, o desenvolvimento do plugin trava — bug do validator impede commit, bug do `/init` impede atualizar projetos do usuario. Mitigacao: dog-food roda apos planos 01-07 estarem testados via fixtures `tests/fixtures/{empty,nextjs-new,rails-new,legacy-v5}` (Plano 03 fase-07). Cada fase deste plano comeca com **backup explicito + ponto de rollback** documentado.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `scripts/harness-validate.ts` minimal + advanced (rejeita AGENTS.md >40, planos orfaos, links quebrados) | Plano 01 fase-04 + Plano 04 fase-03 | pendente |
| `scripts/compound-check.ts` (valida frontmatter Problem/Solution/Prevention) | Plano 04 fase-02 | pendente |
| `lib/backup-planning.ts` (backup atomico idempotente) | Plano 03 fase-02 | pendente |
| `lib/migrate-planning.ts` (.planning/{date-slug}/* → docs/exec-plans/active/ + docs/product-specs/) | Plano 03 fase-03 | pendente |
| `lib/migrate-lessons.ts` (split lessons-learned.md em compound notes) | Plano 03 fase-04 | pendente |
| `lib/migrate-decisions.ts` (decisions.md → ADR-NNNN-*.md) | Plano 03 fase-05 | pendente |
| `lib/detect-v5-legacy.ts` (heuristica isLegacy) | Plano 03 fase-01 | pendente |
| Template harmonizado de exec-plans com 10 secoes D18 | Plano 05 fase-03 | pendente |
| `lib/path-resolver-v6.ts` (resolve `docs/compound/`, `docs/design-docs/`, `docs/exec-plans/`) | Plano 05 fase-01 | pendente |
| `lib/state-md-generator.ts` (regenera `docs/STATE.md`) | Plano 06 fase-03 | pendente |
| `lib/completion-signal.ts` (helper YAML) | Plano 06 fase-01 | pendente |
| `lib/lessons-learned-crud.ts`, `lib/decision-registry-revoke.ts` | Plano 06 fase-05/06 | pendente |
| `lib/todo-utils.ts` | Plano 06 fase-07 | pendente |
| Skill `/todo-pick` + TODO.md template | Plano 07 fase-01/03 | pendente |
| Hook `hooks/pre-mutation-gate.cjs` registrado em `hooks/hooks.json` | Plano 05 fase-07 | pendente |
| Hook `hooks/state-md-hook.cjs` registrado em `hooks/hooks.json` | Plano 06 fase-04 | pendente |
| 6 skills migradas emitindo completion signal | Plano 05 + Plano 06 fase-02 | pendente |
| **Repo real:** `anti-vibe-coding/CLAUDE.md` (346 linhas), `lessons-learned.md` (77 linhas, 5 licoes), `senior-principles.md` (76 linhas), `decisions.md` (80 linhas, 1 decisao) | repo atual | **pronto** |
| **Planos historicos:** `.planning/plano01..04/` (4 planos, 5 fases cada), `.planning/2026-04-21-anti-vibe-v52/` (PRD+CONTEXT+PLAN+6 planos), `.planning/2026-05-04-v53-plugin-adaptativo/` (PRD+CONTEXT+PLAN+5 planos) | repo atual | **pronto** |
| Tabela de Distribuicao D29 (PRD linhas 333-365 — 20 itens mapeados para 5 camadas) | `../PRD.md` | pronto |
| PRD com CA-01..CA-05, CA-38 (distribuicao D29), M11 (dog-food), R4 (mitigacao) | `../PRD.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| Evidencia executavel de que harness funciona em projeto real de 32 skills (n=1, mas mais convincente que fixture) | Plano 09 (Release) — CHANGELOG cita dog-food como "living proof" |
| `anti-vibe-coding/AGENTS.md` ≤40 linhas validado | CA-39 (todo projeto-alvo aponta para plugin AGENTS.md como referencia de bloco "Plugin Integration") |
| 4 compound notes existentes do plugin migradas (Plugin Development, Bash, Subagentes, Armadilha) | Futuro `/promote-lesson-to-pack` (v6.1+) — base de licoes "do plugin" para promover aos KP |
| Plugin com 5 hooks ativos (existentes) + 2 novos (pre-mutation-gate, state-md-hook) sincronizados | Plano 09 (release valida `hooks.json` final) |
| Backup `.planning.v5-backup/` no plugin (rollback rapido se v6 quebrar dev workflow) | Hot-fix de v6.0.x se necessario |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-clean-current-claude-md.md | Auditoria das 346 linhas de `anti-vibe-coding/CLAUDE.md`, aplicacao da Distribuicao D29, geracao dos arquivos de Camadas 2/3/5 (`docs/PIPELINE.md`, `docs/MODEL_PROFILES.md`, `docs/AGENTS_LIST.md`, `docs/UPGRADE.md`, `docs/design-docs/core-beliefs.md` stub) — CLAUDE.md original PRESERVADO em backup ate fase-02 confirmar AGENTS.md valido | ~3h | — (independente; pre-requisito de todas as demais) |
| 02 | fase-02-criar-agents-md-plugin.md | `anti-vibe-coding/AGENTS.md` ≤40 linhas em EN com bloco "Core Beliefs" + tabela "When to read what" + Compound Decision Gate rule (CA-01, CA-39 — modelo para projetos-alvo) | ~1.5h | fase-01 (consome auditoria + stubs de docs/) |
| 03 | fase-03-criar-docs-do-plugin.md | `anti-vibe-coding/ARCHITECTURE.md` + 8 docs institucionais (`docs/{DESIGN,FRONTEND,PLANS,PRODUCT_SENSE,QUALITY_SCORE,RELIABILITY,SECURITY,COMPOUND_ENGINEERING}.md`) + estrutura `docs/exec-plans/`, `docs/compound/`, `docs/review-checklists/`, `docs/smoke-flows/`, `docs/product-specs/`, `docs/references/`, `docs/generated/` (CA-01) | ~3h | fase-02 (AGENTS.md aponta para esses paths) |
| 04 | fase-04-migrar-planos-historicos.md | 6 planos historicos → `docs/exec-plans/completed/{date}-{slug}.md` com as 10 secoes D18 harmonizadas (Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria) (CA-02) | ~2.5h | fase-03 (estrutura existe) |
| 05 | fase-05-dividir-lessons-learned.md | `anti-vibe-coding/lessons-learned.md` (5 licoes inline) → 5 arquivos `docs/compound/{YYYY-MM-DD}-{slug}.md` com frontmatter `title/category/tags/created` + secoes Problem/Solution/Prevention (CA-03) | ~1.5h | fase-03 |
| 06 | fase-06-migrar-senior-principles.md | `anti-vibe-coding/senior-principles.md` (76 linhas, 8 secoes tematicas) → `anti-vibe-coding/docs/design-docs/core-beliefs.md` substituindo o stub de fase-01 (D29 item 4 + item 10) | ~1h | fase-03 |
| 07 | fase-07-decisions-para-adrs.md | `anti-vibe-coding/decisions.md` (1 decisao formal: Sistema de Versionamento) → `docs/design-docs/ADR-0001-manifest-checksums.md` com frontmatter `status: active` + secoes Context/Decision/Alternatives/Consequences/Reversibility | ~1h | fase-03 |
| 08 | fase-08-validar-dog-food.md | `bun run harness:validate && bun run compound:check` no plugin retornam exit 0; `lessons-learned.md` + `senior-principles.md` + `decisions.md` + `CLAUDE.md` originais arquivados em `.planning.v5-backup/`; `package.json` ganha scripts `harness:validate`, `compound:check`, `state:regenerate` (CA-04, CA-05) | ~1h | fase-04, 05, 06, 07 |

**Total:** 14.5h (alinhado com PLAN.md).

---

## Grafo de Fases

```
                fase-01 (clean current CLAUDE.md / D29 distribution)
                          |
                          v
                fase-02 (criar AGENTS.md plugin) ← ponto de rollback se >40 linhas
                          |
                          v
                fase-03 (criar docs/* do plugin)
                          |
       +----------+---------------+--------------+
       |          |               |              |
       v          v               v              v
   fase-04   fase-05          fase-06         fase-07
   (planos   (lessons         (senior-        (decisions
    histor.)  → compound)      principles      → ADRs)
                              → core-beliefs)
       |          |               |              |
       +----------+---------------+--------------+
                          |
                          v
                fase-08 (validar dog-food: harness:validate + compound:check exit 0)
                          |
                          v
                Plano 09 (Release)
```

**Paralelismo possivel:**
- **fase-04, 05, 06, 07 sao 100% paralelas** apos fase-03 (escrevem em sub-arvores disjuntas de `docs/`: `exec-plans/completed/`, `compound/`, `design-docs/`). Recomendado: lancar 4 sub-agentes em paralelo (CLAUDE.md global manda 5-8 arquivos por agente — cada uma destas fases toca 1-6 arquivos novos, perfeito para sub-agente unico).
- **fase-01, 02, 03 sao serializadas** — auditoria → AGENTS.md → docs/*. Nao paralelizam porque cada uma escreve em arquivos consumidos pela seguinte (fase-02 le tabela D29 produzida em fase-01; fase-03 le AGENTS.md para validar consistencia de links).
- **fase-08 serial no fim** — consome estado completo.

**Tempo de relogio com paralelismo:** ~3h (f1) + 1.5h (f2) + 3h (f3) + max(2.5, 1.5, 1, 1)h (f4-7 ‖) + 1h (f8) = **~11h reais** vs 14.5h serial. Em sessao isolada, recomendo **executar f1-f3 serial** (mudancas de alto risco, beneficiam de revisao humana entre fases) e **f4-f7 paralelo** (mecanico, baixo risco).

### Decisao de ordem: por que fase-01 e a primeira (auditoria antes de criar arquivos)

A Distribuicao D29 (PRD §300-365) e uma TABELA com 20 itens mapeando linhas-do-CLAUDE.md-atual → camada-alvo. Sem ela formalizada, fase-02 nao sabe **o que** colocar em AGENTS.md (Camada 4) vs **o que** mover para `docs/PIPELINE.md` (Camada 2) vs **o que** vira `docs/design-docs/core-beliefs.md` (Camada 5). Fase-01 NAO escreve arquivos finais — apenas:

1. Confirma a tabela linha-a-linha (audit) abrindo o CLAUDE.md atual.
2. Gera **stubs vazios** dos arquivos de destino para que fase-02 possa linkar sem erro 404 quando rodar `harness:validate`.
3. Faz o backup `anti-vibe-coding/CLAUDE.md` → `.planning.v5-backup/CLAUDE.md.original` ANTES de qualquer mutacao em fase-02.

Trade-off: sem fase-01, o desenvolvedor faria a auditoria mentalmente durante fase-02, gastando tempo e introduzindo viseis. Auditoria explicita = artefato versionavel.

---

## TDD Strategy

Este plano e **dog-food de mecanica ja testada nos planos 01-07**. NAO recriamos testes para as helpers — confiamos nos testes ja escritos nos planos anteriores (cada um com TDD proprio). Aqui o ciclo e:

```
Ciclo por fase:
1. EXECUTE: rodar helper/migration contra o repo plugin
2. VERIFY: rodar harness:validate + compound:check contra o estado parcial
3. ROLLBACK if fail: git reset --hard {snapshot anterior} e identificar regressao no helper
4. COMMIT: snapshot por fase para permitir bisect se algo quebrar no final
```

**TDD natural neste plano (delegado aos validadores):**

- **fase-01 (clean CLAUDE.md)** — EXECUTE: ler 346 linhas, gerar tabela D29 (ja existe no PRD, conferir item-a-item), criar stubs vazios em `docs/`. VERIFY: `ls anti-vibe-coding/docs/PIPELINE.md docs/MODEL_PROFILES.md docs/AGENTS_LIST.md docs/UPGRADE.md docs/design-docs/core-beliefs.md` todos existem (mesmo vazios) + `wc -l anti-vibe-coding/CLAUDE.md` ainda mostra 346 (nao toquei).
- **fase-02 (AGENTS.md)** — EXECUTE: redigir AGENTS.md em EN baseado na tabela. VERIFY: `wc -l anti-vibe-coding/AGENTS.md` ≤ 40 + `bun scripts/harness-validate.ts anti-vibe-coding/` nao reclama de AGENTS.md.
- **fase-03 (docs/)** — EXECUTE: criar 8 docs institucionais + estrutura de pastas. VERIFY: harness:validate aceita a arvore (todos arquivos obrigatorios existem) — ainda nao precisa estar com conteudo final, esqueletos sao OK por enquanto.
- **fase-04 (planos historicos)** — EXECUTE: invocar `migratePlanning(`.planning/2026-04-21-anti-vibe-v52/`, target='docs/exec-plans/completed/')` para cada um dos 6 planos. VERIFY: contar 6 arquivos em `docs/exec-plans/completed/` + cada um tem 10 secoes (`grep -c '^## ' {arquivo}` ≥ 10).
- **fase-05 (lessons-learned)** — EXECUTE: `migrateLessons('lessons-learned.md', target='docs/compound/')`. VERIFY: contar 5 arquivos em `docs/compound/` (1 bug history + 4 licoes v5.2) + `compound:check` exit 0.
- **fase-06 (senior-principles)** — EXECUTE: `cp lib equivalente` migra senior-principles.md → core-beliefs.md preservando 8 secoes. VERIFY: arquivo existe e tem secoes Verificacao de Premissas / Seguranca / Qualidade / Arquitetura de Dados / API Design / JavaScript / Infraestrutura / Design & SOLID.
- **fase-07 (decisions → ADR)** — EXECUTE: `migrateDecisions('decisions.md', target='docs/design-docs/')`. VERIFY: `ADR-0001-*.md` existe com frontmatter completo.
- **fase-08 (gating)** — EXECUTE: `bun run harness:validate && bun run compound:check`. VERIFY: exit 0 em ambos. Se falhar, identificar plano que regrediu via `git bisect` entre snapshots f1..f7.

**Tracer Bullet deste plano:** fase-08 (CA-04 + CA-05 verbatim — prova D20 funcionando contra repo real).

---

## Gotchas Conhecidos

- **G1 (R4 — dog-food bloqueia dev se quebrar):** Cada fase comeca com `git add -A && git commit -m "wip: pre-{fase}-snapshot"` (snapshot anonimo, sera squashed depois). Se fase quebrar, `git reset --hard HEAD~1` recupera. Ao fim do plano, `git rebase -i` consolida em 8 commits limpos (1 por fase) + 1 commit final do plano. Documentar isso explicitamente em fase-01.

- **G2 (CLAUDE.md plugin e LIVE durante migracao):** O proprio CLAUDE.md sendo migrado eh o arquivo que o Claude Code esta lendo nesta sessao. Se eu deletar/truncar CLAUDE.md em fase-02 sem antes confirmar que AGENTS.md tem conteudo equivalente, perco contexto MEUS PROPRIOS na proxima leitura de sessao. **Politica:** CLAUDE.md original PERMANECE em `anti-vibe-coding/` ate fase-08 confirmar tudo verde — apenas no fim, CLAUDE.md original move para `.planning.v5-backup/CLAUDE.md.original` e um symlink/copy aponta CLAUDE.md → AGENTS.md (igual templates dos projetos-alvo).

- **G3 (D16 + R1 — symlink CLAUDE.md no Windows):** Ao fim de fase-08, criar `CLAUDE.md` apontando para `AGENTS.md` no plugin via 3-tier fallback (`ln -s` → `mklink /H` → copy + hook). Plugin usa Windows 11 — `ln -s` provavelmente falha; `mklink /H` em NTFS funciona sem admin. Documentar comando exato.

- **G4 (provenance — D2 / EN vs PT):** AGENTS.md e docs/* sao gerados em **INGLES** (D2). MAS o conteudo das licoes/ADRs/planos historicos esta em **PORTUGUES** (idioma original). Politica herdada de Plano 03 G10: preservar idioma original do conteudo, apenas estrutura/frontmatter em EN. Validator `harness:validate` NAO checa idioma do corpo. Documentar em SKILL.md do `/init`. Excecao: o stub `core-beliefs.md` em fase-01 pode comecar em EN como esqueleto e ser sobrescrito por fase-06 em PT.

- **G5 (CA-02 — 10 secoes em planos historicos):** Os planos historicos atuais NAO seguem D18 (foram escritos antes do template harmonizado). Templates atuais tem ~6 secoes (Goal/Mapa de Fases/Grafo/TDD/Gotchas/Ambiguidades). Fase-04 precisa **enriquecer** o conteudo migrado: adicionar secoes ausentes (Assumptions, Risks, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria) com **placeholder reconstrutivo** baseado nos arquivos existentes (MEMORY.md de cada plano histórico tem bugs e decisoes ⇒ vira "Lessons Captured"; PLAN.md tem risk register ⇒ vira "Risks"). Onde nao houver fonte, marcar `> _(reconstructed from {arquivo}: section absent in original)_` para honestidade documental.

- **G6 (CA-03 — frontmatter de compound notes do `lessons-learned.md` atual):** Arquivo tem 5 licoes:
  1. `## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)` — formato bug-report (Sintoma/Causa/Impacto/Fix/Licao/Prevencao/Arquivos Afetados/Commit)
  2. `### [Armadilha] grep -c retorna exit 1 quando count é zero` — formato Regra/Contexto curto
  3. `### [Arquitetura] anti-vibe-coding/ é repositório git independente` — idem
  4. `### [Armadilha] Blocos de código aninhados em SKILL.md` — idem
  5. `### [Arquitetura] Padrão de entrada de hooks .cjs difere por tipo de evento` — idem

  Frontmatter a gerar:
  - Item 1: `category: bug-history`, `tags: [hooks, manifest, install, regression]`, `created: 2026-03-23`
  - Itens 2-5: `category: <traduzir tag [Armadilha]/[Arquitetura]>` (pattern → `pattern` / `architecture`), `tags: extraido das palavras-chave`, `created: 2026-04-21` (data do bloco "Licoes — Anti-Vibe Coding v5.2")

  Frontmatter pattern (CA-29):
  ```yaml
  ---
  title: "..."
  category: pattern | architecture | bug-history | armadilha
  tags: [hooks, bash, ...]
  created: 2026-03-23
  ---
  ```

  Body harmonizado para CA-29: cabecalhos `## Problem`, `## Solution`, `## Prevention`. Para licoes em formato Regra/Contexto, reconstruir:
  - `Problem` = Contexto (o que aconteceu/quando ocorre)
  - `Solution` = Regra (o que fazer)
  - `Prevention` = inferir/marcar `> _(extrapolated from rule)_` se ausente

- **G7 (CA-03 — slug collision):** Tres das 5 licoes tem tag `[Armadilha]` ou `[Arquitetura]`. Slugs por titulo: `grep-c-exit-1`, `anti-vibe-coding-git-independente`, `blocos-codigo-aninhados-skill-md`, `hooks-cjs-stdin-pattern`. Bug history fica `hooks-json-overwrite`. Sem colisao real, mas se reusarmos no futuro, sufixar com data conforme G5 do Plano 03.

- **G8 (CA-38 — D29 distribuicao validavel):** Apos plano completo, validar **mecanicamente** que distribuicao foi feita:
  1. `wc -l anti-vibe-coding/AGENTS.md` ≤ 40
  2. `test -f anti-vibe-coding/docs/PIPELINE.md`
  3. `test -f anti-vibe-coding/docs/MODEL_PROFILES.md`
  4. `test -f anti-vibe-coding/docs/AGENTS_LIST.md`
  5. `test -f anti-vibe-coding/docs/UPGRADE.md`
  6. `test -f anti-vibe-coding/docs/design-docs/core-beliefs.md`
  7. `find anti-vibe-coding/docs/compound/ -name "*.md" -not -name "README.md" | wc -l` ≥ 4 (≥4 licoes migradas; 5 esperadas mas 1 pode ser arquivada como historica)

  Fase-08 inclui esses 7 checks alem de harness:validate + compound:check.

- **G9 (idempotencia de fase-04 a fase-07):** Cada migracao precisa detectar "ja migrado" e ser no-op. Herdado de Plano 03 G2. Exemplo: rodar fase-05 2x nao duplica compound notes. Helpers `migrate-*.ts` ja devem ter essa logica de Plano 03; aqui apenas usamos.

- **G10 (G11 do Plano 03 — sizing ≤120s):** A migracao completa do plugin em fase-04+05+06+07 NAO deve passar de ~3min total (volume real: 6 planos historicos, 5 licoes, 1 decisao, 8 secoes de senior-principles). Sub-1min por fase usando `Promise.all`. Se passar de 5min algo esta errado — investigar antes de seguir.

- **G11 (provenance comments NAO aplicam):** Este plano nao gera codigo TS novo — apenas usa helpers ja existentes. Provenance comments (D5 / memo template) ficam nos planos 03-07 onde codigo foi escrito. AGENTS.md / docs/*.md sao artefatos de usuario final (D2 — ingles, conciso) e NAO levam provenance.

- **G12 (`.planning/` original do plugin permanece):** Os planos historicos ficam em `f:/Projetos/Claude code/.planning/plano01..04/` e `2026-04-21-anti-vibe-v52/` e `2026-05-04-v53-plugin-adaptativo/` — esses NAO sao "do plugin" no sentido estrito, sao do REPO PAI (Claude code) que CONTEM o plugin. Decisao: migrar para `anti-vibe-coding/docs/exec-plans/completed/` porque sao planos de desenvolvimento do plugin (M11 explicita). Politica em fase-04: ler dos paths acima, escrever em `anti-vibe-coding/docs/exec-plans/completed/`, **NAO** deletar os originais (sao historico do repo pai; v6.0.0 introduz duplicacao consciente). Documentar em fase-04 que rollback eh remover apenas o destino.

- **G13 (Ambiguity G-A3 do Plano 03 confirmada aqui):** Plano 03 G-A3 marcou senior-principles.md como caso especial (fora de `/init` generico). Este plano (fase-06) E o caso especial — entao herda a decisao "se existir, migrar para core-beliefs.md; se nao, skip". Plugin TEM senior-principles.md, entao fase-06 executa migracao.

- **G14 (Ambiguity 05-A1 do Plano 05 — `/grill-me` e outras skills nao-migradas):** Plano 05 A1 decidiu manter `/grill-me` escrevendo em `.planning/CONTEXT-*.md` mesmo em projeto v6. No plugin dog-food, NAO criamos novos `CONTEXT-*.md` (este plano nao gera artefatos pre-PRD). Politica para fase-04: planos historicos ja TEM CONTEXT-*.md no repo pai (`f:/Projetos/Claude code/.planning/CONTEXT-refatoracao-prd-folders.md` etc.) — migrar **junto com o plano relacionado** como anexo: `docs/exec-plans/completed/2026-MM-DD-{slug}-context.md`. Documentar em fase-04.

- **G15 (CA-46 + R15 hook STATE.md no plugin):** Apos fase-08, o `hooks/state-md-hook.cjs` (instalado em Plano 06 fase-04) comeca a regenerar `anti-vibe-coding/docs/STATE.md` automaticamente ao editar files do plugin. Verificar que hook esta com rate-limit 30s ativo (senao cada commit dispara regen). Validador fase-08 inclui: `cat ~/.claude/cache/state-md-last-run.json | jq '.["{path-do-plugin}"]'` retorna timestamp valido.

### Ambiguidades sinalizadas (decisao assumida — validar antes de executar)

- **08-A1 (sobreposicao com Plano 03 helpers):** Plano 03 fase-04 ja inclui migracao de `lessons-learned.md` (CA-09). Plano 08 fase-05 ALSO migra lessons-learned.md mas do plugin. **Decisao assumida:** fase-05 deste plano INVOCA `lib/migrate-lessons.ts` apontando para `anti-vibe-coding/lessons-learned.md` e destino `anti-vibe-coding/docs/compound/`. Helper eh agnostico de qual projeto migra — entao nao duplicamos logica. Se Plano 03 fixar a assinatura `migrateLessons(sourcePath, targetDir, options)`, esta fase chama com os paths do plugin. Mesmo padrao para fase-06/07.

- **08-A2 (escopo de planos historicos a migrar):** PRD CA-02 lista `.planning/plano01..04/` (4 planos) + `.planning/2026-04-21-anti-vibe-v52/` (1 PRD com 6 sub-planos) + `.planning/2026-05-04-v53-plugin-adaptativo/` (1 PRD com 5 sub-planos). Total: 4 planos soltos + 2 PRDs com sub-planos. **Decisao assumida em fase-04:** Migrar como 6 artefatos finais agrupados:
  1. `2026-04-15-refatoracao-prd-folders.md` (agrega plano01..04 do repo pai num exec-plan unico — descontinuado pelo redesign)
  2. `2026-04-21-anti-vibe-v52-fase1-file-size-guard.md`
  3. `2026-04-21-anti-vibe-v52-fase2-grepping-names.md`
  4. ... ou alternativamente: **um exec-plan por PRD (nao por plano interno)** — 3 arquivos totais: `2026-04-15-refatoracao-prd-folders.md`, `2026-04-21-anti-vibe-v52.md`, `2026-05-04-v53-plugin-adaptativo.md`.
  
  Recomendado: **3 arquivos (um por PRD)** porque o template D18 e por PRD (Goal, Scope, etc. ao nivel da feature). Cada arquivo pode ter secao "Phases History" com sub-secoes para os planos internos. Validar com user; se preferir granular (1 arquivo por plano interno = 15 arquivos), inverter. Sizing nao muda significativamente porque helper de migracao itera.

- **08-A3 (`.planning/CONTEXT-*.md` solto):** O repo pai tem `f:/Projetos/Claude code/.planning/CONTEXT-refatoracao-prd-folders.md` + `PRD-refatoracao-prd-folders.md` + `PLAN-` + `STATE-` + `SUMMARY-` (5 arquivos soltos do PRD antigo da refatoracao). **Decisao assumida em fase-04:** Esses 5 entram como **anexos** no arquivo unificado `2026-04-15-refatoracao-prd-folders.md` (sub-secao "Original artifacts (verbatim)"). Alternativa: ignorar (sao pre-v5, baixo valor historico). Recomendo agregar — preserva trail para auditoria.

- **08-A4 (TODO.md inicial no plugin):** Plano 07 cria `TODO.md` skeleton via `/init`. **Decisao assumida em fase-08:** rodar `bun -e "import {createTodoSkeleton} from '...'; await createTodoSkeleton('anti-vibe-coding/')"` ou similar — criar `anti-vibe-coding/TODO.md` inicial vazio (ou com 1-2 itens reais: "consolidar IMPLEMENTACAO-VERSIONAMENTO.md e MUDANCAS-RECENTES.md em docs/" + "deletar arquivos *.md soltos da raiz apos consolidacao"). Justifica: dog-food = projeto TEM TODO.md tambem.

- **08-A5 (arquivos *.md soltos da raiz do plugin — IMPLEMENTACAO-VERSIONAMENTO.md, MUDANCAS-RECENTES.md, INSTRUCOES-SINCRONIZACAO.md, COMO-ATUALIZAR.md):** Esses 4 arquivos (16-31KB cada) sao docs historicos misturados na raiz. **Decisao assumida em fase-03:** NAO migrar agressivamente neste plano — addicionar item em `TODO.md` "consolidar 4 arquivos *.md soltos em `docs/UPGRADE.md` e `docs/HISTORY.md`". Se migrarmos agora, balao de escopo. README.md e CHANGELOG.md permanecem na raiz (convencao).

- **08-A6 (`.github/workflows/harness.yml` do plugin):** PRD §463 (estrutura final do plugin) lista `.github/workflows/harness.yml`. Plano 02 fase-04 cria isso via template para projetos-alvo. **Decisao assumida em fase-08:** Reusar o template do Plano 02 e instalar em `anti-vibe-coding/.github/workflows/harness.yml` (CI roda `bun run harness:validate` em PRs do plugin). Se Plano 02 nao expoe API util-de-invocar (`/init` so via skill), copiar template manualmente. Documentar em fase-08.

- **08-A7 (`AGENTS.md` plugin vs project AGENTS.md):** Camada 2 (PRD D29 §305-315) diz "anti-vibe-coding/AGENTS.md" e a fonte do plugin (dog-food D20). Camada 4 diz "AGENTS.md no projeto-alvo" — quando usuario roda `/init` em outro projeto. Esses sao DOIS arquivos diferentes — o do plugin (fase-02 deste plano) e o template gerado por `/init` (Plano 02). **Confirmado em fase-02:** anti-vibe-coding/AGENTS.md eh GERADO MANUALMENTE neste plano (nao via `/init` rodando sobre o proprio plugin — isso seria circular). Apenas reusa o template de Plano 02 como referencia visual.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
