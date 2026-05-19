---
slug: init-llm-driven-harness-population
date: 2026-05-19
status: completed
completedAt: 2026-05-19
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Init LLM-Driven Harness Population (Trilha 2 — semantic N→M mapping)

**Status:** Approved (decisões assumidas confirmadas via /grill-me 2026-05-19)
**Author:** Luiz + AI
**Date:** 2026-05-19
**Context:** ./CONTEXT.md (gerado por /grill-me em segunda passada, refinando decisões assumidas)

**Substitui:** PRD `2026-05-19-init-harness-validation-fix` (obsoleto sob Trilha 2 — propunha mais heurística regex).

---

## Problema

A init atual produz Harness genérico que não reflete a verdade do projeto.

**Evidência empírica (A/B test em Carreirarte, 2026-05-18):**

| Métrica | Nossa init (heurística) | Harness do André (semântico) |
|---|---|---|
| `ARCHITECTURE.md` | 82 linhas, "Supabase backend" genérico | 155 linhas, 59 edge functions catalogadas por domínio |
| Inventário `_shared/` | ausente | 20 módulos descritos |
| Invariantes não-negociáveis | 0 | 18 extraídas de incidentes reais |
| Refs a migrations | 0 | ~100 referenciadas |

**Diferença causal:** o agente do André LEU o código e populou com a verdade do projeto. Nossa init copiou template e fez token-replacement (`{{PROJECT_NAME}}`), classificando blocos do `CLAUDE.md` original com regex (`AKITA_HEADING_REGEX`).

**Bugs concretos hoje:**

- **Bug A** (validator falsos positivos): denylist regex marca 179 arquivos legítimos como "drift" em Carreirarte.
- **Bug B** (link corruption): Step 11 corrompe 37 links ao mover docs (regex de rewrite incompleto).
- **Bug C** (Step 91 nunca roda): Step 90 (`final-validation`) aborta quando harness incompleto → Step 91 (`generate-populate-plan`) é gated por Step 90.
- **Bug D** (SKILL.md "Após init concluir") não menciona o plano populate gerado; sugere apenas `/detect-architecture`.
- **Bug E** (Akita → `DESIGN.md`): Step 10 extrai blocos de code-style do `CLAUDE.md` e escreve em `docs/DESIGN.md`. Mas o template do `DESIGN.md` é Design System visual (tokens, tipografia). Conflito de domínio.

**Impacto:** dev recebe Harness que parece pronto mas é genérico. Toda a promessa de "documentos governando disciplina do repo" cai porque os documentos não refletem o repo.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- A IA gera Harness canônico com conteúdo verificável contra o código real do projeto (cada doc canônico referencia ≥1 arquivo ou módulo existente).
- A IA mapeia semanticamente N documentos existentes (em `docs/`, `CLAUDE.md`, `.claude/progress.txt`) para M documentos canônicos do Harness, sem heurística regex de classificação.
- O dev recebe um plano de execução (`docs/exec-plans/active/.../plano-populate-harness/`) com 1 fase por doc canônico; cada fase lista inputs reais (docs candidatos + arquivos-chave do código) e a instrução para a LLM sintetizar.
- Re-rodar a init em projeto já inicializado é seguro e previsível: aborta se o manifest registra v ≥ 6.5.0; re-popula tudo (com backup) se manifest registra v anterior.
- Conhecimento legado (`.claude/progress.txt`, 140+ gotchas históricos) é preservado como entradas compound em `docs/compound/_imported/`, não perdido.
- Validação final emite warnings (não bloqueia); dev valida qualidade via PR review.

### Mecanismo (algorítmico — o COMO)

Init passa por dois modos sequenciais:

**Modo 1 — Scaffold (determinístico, sem LLM):**

1. Detect-legacy (existente) — identifica artefatos v5 / v6.x anterior.
2. Reuse-discovery (existente, opcional cache).
3. Secrets-scan (existente) — varre antes de qualquer write.
4. Detect-stack-and-register + persist-stack-knowledge (existentes).
5. Scaffold-full-tree (existente) — cria estrutura canônica do Harness vazia:
   - `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md` (mirror), `docs/DESIGN.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/PRODUCT_SENSE.md`, `docs/QUALITY_SCORE.md`, `docs/PLANS.md`, `docs/CORE_BELIEFS.md`, **`docs/CODE_STYLE.md` (novo — destino do Akita, ex-Bug E)**, `docs/compound/`, `docs/exec-plans/`, `docs/review-checklists/`.
6. Backup pré-mutação do `CLAUDE.md` original em `docs/_legacy/CLAUDE.md.bak`.
7. Link-claude-agents (existente).
8. Customize-architecture (existente, leve — só tokens de stack).
9. Install-gh-files (existente).

**Modo 2 — Generate Populate Plan (LLM-driven, Step 91 promovido):**

10. Discover-existing-docs (renomeado, simplificado): apenas lista todos os arquivos `*.md` em `docs/`, raiz e `.claude/` originais — **sem classificar nada**. Emite `discovery-manifest.json` com path + tamanho + 100 primeiras linhas.
11. **Generate-populate-plan** (coração da init): gera plano em `docs/exec-plans/active/{date}-init-populate-harness/PLAN.md` com 1 fase por doc canônico. Cada fase contém:
    - **Inputs (docs existentes candidatos):** sub-lista de paths do discovery-manifest que provavelmente alimentam este doc canônico. **A LLM faz essa associação ao gerar o plano** (não regex). Anotada como "candidato — confirmar ao executar".
    - **Inputs (código):** paths concretos derivados do stack detectado (ex: para Next.js + Supabase → `src/app/layout.tsx`, `supabase/migrations/`, `supabase/functions/`, `tailwind.config.ts`).
    - **Instrução para a LLM:** prompt focado, ex: "Leia os inputs. Sintetize a arquitetura real: domínios, módulos compartilhados, integrações externas. Cada afirmação deve apontar para um arquivo do repo. Zero placeholder genérico."
    - **Critério de done:** "humano lê e aprova via PR review" (sem gate automático bloqueante).
12. Capabilities-discovery (existente, soft-fail).
13. Final-validation (Step 90, simplificado — ver Decisão 3 abaixo).

**Ordem crítica (resolve Bug C):** Step 91 (`generate-populate-plan`) executa **antes** de Step 90 (`final-validation`). Plano populate é o output principal da init; validação é diagnóstico não-bloqueante.

**Execução do plano populate** é feita depois, pelo dev, via `/anti-vibe-coding:execute-plan` (subagent por fase). Não faz parte do escopo desta init.

### Decisões da entrevista resolvidas

| Q | Decisão |
|---|---|
| Q1 Granularidade | 1 fase por doc canônico (~10 fases incluindo CODE_STYLE.md) |
| Q2 Docs órfãos | LLM sugere consolidação no doc canônico mais próximo; humano confirma; sem destino óbvio → `docs/_legacy/` |
| Q3 Critério de done | Humano valida via PR review. Validador roda mas emite warnings, não bloqueia |
| Q4 Reentrada | Re-popular tudo (com backup) se `pluginVersion` no manifest < 6.5.0; abortar com mensagem (`use /sync ou /update`) se ≥ 6.5.0 |
| Q5 `progress.txt` | LLM parse `.claude/progress.txt` em entradas compound em `docs/compound/_imported/`. Princípios operacionais que emergem da síntese podem subir para `CORE_BELIEFS.md` durante a fase correspondente |

---

## Fluxos UX por Ator

### Dev rodando init pela primeira vez (greenfield ou projeto v5.x)

1. Dev roda `/anti-vibe-coding:init`.
2. Init detecta cwd válido (passa self-protection guard).
3. Init detecta legacy se houver (CLAUDE.md raiz, `.claude/` artifacts) e oferece backup automático em `docs/_legacy/`.
4. Init faz scaffold determinístico (Modo 1) — todos os docs canônicos criados vazios com headings padronizados.
5. Init gera plano populate em `docs/exec-plans/active/{date}-init-populate-harness/PLAN.md`.
6. Final-validation roda em modo warning (sem abortar).
7. Init imprime mensagem final:

   _"Harness scaffold criado. Próximo passo: rodar `/anti-vibe-coding:execute-plan docs/exec-plans/active/{date}-init-populate-harness/` para a IA popular cada doc canônico lendo o código real. Revise via PR antes de fechar a fase de cada doc."_

### Dev rodando init em projeto já inicializado (re-init)

1. Init lê `.claude/.anti-vibe-manifest.json`, extrai `pluginVersion`.
2. Se `pluginVersion >= 6.5.0`: aborta com mensagem _"Projeto já inicializado na versão atual. Use `/sync` para atualizar templates ou `/update` se houve bump de versão do plugin."_
3. Se `pluginVersion < 6.5.0` (init feita pelo modelo antigo heurístico):
   - Init informa: _"Manifest registra v{X}. Vou re-popular o Harness sob arquitetura nova (v6.5.0+). Backup completo será gerado."_
   - Init faz `cp -r docs/ docs/_legacy/pre-6.5.0/` (backup destrutivo-safe).
   - Init re-executa Modo 1 e Modo 2 inteiros.
4. Dev decide via PR quais partes do `_legacy/` migrar para o Harness novo (a IA pode ajudar ao popular cada fase).

### Dev consumindo o plano populate gerado

1. Dev roda `/anti-vibe-coding:execute-plan docs/exec-plans/active/{date}-init-populate-harness/`.
2. Execute-plan despacha subagent por fase (1 fase = 1 doc canônico).
3. Subagent lê os inputs declarados (docs candidatos + arquivos-chave), gera conteúdo do doc canônico, escreve.
4. Dev revisa via diff/PR. Approva ou rejeita por doc canônico.
5. Ao final, todos os docs canônicos populados com verdade do projeto.

**Copy relevante:**

- Confirmação re-init: _"Detectei plugin versão {old}. Vou re-popular sob arquitetura nova. Backup salvo em `docs/_legacy/pre-6.5.0/`. Confirma?"_
- Aviso órfãos: _"{path} não tem destino canônico óbvio. Sugiro arquivar em `docs/_legacy/`. Confirma ou indica outro destino?"_
- Mensagem final init: _"Plano populate em `docs/exec-plans/active/.../PLAN.md`. Rode `/execute-plan` quando estiver pronto. Cada fase é 1 doc canônico — revise via PR."_

---

## Requisitos Funcionais

### Must Have (máximo 40% do total)

- [ ] **MH-01** — Step 91 (`generate-populate-plan`) executa **antes** de Step 90 (`final-validation`) no `registry.ts` (resolve Bug C).
- [ ] **MH-02** — Step 91 gera plano com 1 fase por doc canônico. Cada fase contém 4 blocos obrigatórios: `Inputs (docs)`, `Inputs (código)`, `Instrução LLM`, `Critério done`.
- [ ] **MH-03** — Docs canônicos incluem o conjunto completo: `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md` mirror, `docs/DESIGN.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/PRODUCT_SENSE.md`, `docs/QUALITY_SCORE.md`, `docs/PLANS.md`, `docs/CORE_BELIEFS.md`, **`docs/CODE_STYLE.md` (novo)**.
- [ ] **MH-04** — Steps 07 (discover-existing-docs antigo), 08 (classify-blocks-hybrid), 09 (propose-merge-batch), 10 (apply-merge-destructive) e 11 (move-docs-with-stub) são **removidos** do `registry.ts`. Código relacionado é deletado dos arquivos correspondentes em `skills/init/lib/steps/`.
- [ ] **MH-05** — Step 10 reduzido a `backup-pre-mutation`: copia `CLAUDE.md` (e qualquer doc raiz) para `docs/_legacy/` antes de scaffold. Sem transformação destrutiva, sem classificação Akita.
- [ ] **MH-06** — Akita / code-style: destino é `docs/CODE_STYLE.md` (não `DESIGN.md`). `AGENTS.md` referencia ambos: `DESIGN.md` continua para Design System visual.
- [ ] **MH-07** — Reentrada lê `pluginVersion` do `.anti-vibe-manifest.json`; aborta se ≥ 6.5.0, re-popula com backup se < 6.5.0.
- [ ] **MH-08** — Final-validation (Step 90): substitui denylist regex por allowlist de scaffold canônico (resolve Bug A — 179 falsos positivos). Modo warning por padrão (não aborta).
- [ ] **MH-09** — SKILL.md da init atualiza mensagem final "Após init concluir" para apontar para o plano populate gerado e sugerir `/execute-plan` (resolve Bug D).
- [ ] **MH-10** — `.claude/progress.txt` (se existir) é parseado e cada gotcha vira entrada em `docs/compound/_imported/{nnnn}-{slug}.md` no formato compound existente.

### Should Have

- [ ] Step de discovery-manifest emite JSON estruturado consumível pelo Step 91 (paths + tamanho + primeiras 100 linhas por arquivo).
- [ ] Mensagem de re-init mostra diff entre versão registrada e versão atual.
- [ ] Quando órfão é detectado durante execução do plano populate (subagent encontra doc não-mapeado), subagent emite `needsUser` perguntando destino.
- [ ] Validador warning agrupa por doc canônico ("ARCHITECTURE.md: 0 refs a arquivos reais — considere expandir").
- [ ] Plano populate inclui referência ao stack detectado em cada fase (ex: "Next.js + Supabase detectados — inputs específicos abaixo").

### Could Have

- [ ] Detector de "doc canônico já populado manualmente" — se humano editou um doc canônico entre init e execute-plan, subagent oferece skip ou merge incremental.
- [ ] CLI `--dry-run` na geração do plano populate mostra os inputs candidatos sem escrever o PLAN.md.
- [ ] Sugestão pró-ativa: se `.claude/progress.txt` tem > 50 entradas, oferecer execução paralela do parser.

### Won't Have (desta versão)

- Auto-execução do plano populate dentro da init. **Razão:** init e populate são fases distintas; humano deve consumir o plano via `/execute-plan` deliberadamente para garantir revisão por fase.
- Gate automático bloqueante de "doc populado o suficiente". **Razão:** Q3 da entrevista — humano valida via PR review.
- Sync incremental cross-version além de v6.5.0. **Razão:** escopo de `/sync` e `/update`, não de `/init`.
- Migração automática de docs custom (não-canônicos) preexistentes. **Razão:** Q2 — LLM sugere, humano confirma, fora do automático.

---

## Requisitos Nao-Funcionais

- **Performance:** init completa cenário greenfield em < 10s wall-clock (sem LLM, só scaffold). Geração do PLAN.md inclui chamada LLM e pode levar 20-60s — aceitável dado o valor entregue.
- **Segurança:** secrets-scan (existente) roda antes de qualquer move/copy; self-protection guard (existente) bloqueia cwd = plugin cache; backup pré-mutação para `docs/_legacy/` em qualquer reentrada.
- **Acessibilidade:** N/A (CLI).
- **Observabilidade:** audit-log-writer (existente) registra cada step + flags. Telemetria de write-prd já ativa. Adicionar evento `populate_plan_generated` com contagem de fases.
- **Determinismo:** Modo 1 (scaffold) totalmente determinístico (mesmo input → mesmo output). Modo 2 (gerar PLAN.md) usa LLM e pode variar — aceitável porque PLAN.md é input humano-revisável, não output final.

---

## Decisoes Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| 1 | Quem faz o trabalho semântico de mapear docs N → M | LLM via plano populate executado por `/execute-plan` | Heurística regex em Step 08/09/10 | A/B test Carreirarte: heurística produz docs genéricos (82 linhas vs 155); LLM produz verdade verificável. PRD-4 era anti-padrão. |
| 2 | Quando gerar o plano populate | Step 91 dentro do `/init`, antes do Step 90 | Skill separada `/populate-harness` invocada manualmente | Reduz fricção: dev tem o plano pronto ao final da init. Bug C (Step 91 nunca rodava por gate) resolvido pela inversão de ordem. |
| 3 | Como o validador (Step 90) decide drift | Allowlist de scaffold canônico (lista explícita de paths esperados) | Denylist regex (detectar paths que "não deveriam estar lá") | Carreirarte teve 179 falsos positivos com denylist. Allowlist é narrowly-defined e estável. Modo warning evita bloquear init válida. |
| 4 | Onde Akita / code-style vai | `docs/CODE_STYLE.md` (novo doc canônico) | `docs/DESIGN.md` (estado atual, errado) | Template `DESIGN.md.tpl` é Design System visual (tokens, tipografia). Conflito de domínio. Bug E. Separar resolve. |
| 5 | Critério de re-init seguro | Comparar `pluginVersion` no manifest com versão atual; ≥ 6.5.0 aborta, < re-popula com backup | Sempre perguntar ao humano | `pluginVersion` é fonte de verdade — versões < 6.5.0 vieram do modelo antigo heurístico, devem ser regeneradas. ≥ 6.5.0 é estado atual; reuso ambíguo deve sair via `/sync` ou `/update`. |
| 6 | Onde `.claude/progress.txt` legado vai | `docs/compound/_imported/` (1 entrada por gotcha) | `CORE_BELIEFS.md` único arquivo consolidado | Q5 entrevista: gotchas são material compound, não princípios operacionais. Princípios que emergem da síntese podem subir para CORE_BELIEFS via fase correspondente, mas o repositório base é compound. |
| 7 | Granularidade do plano populate | 1 fase por doc canônico (~10 fases) | Agrupado por domínio (~4 fases) | Q1 entrevista: máxima granularidade facilita pause/resume e revisão por PR (1 doc = 1 PR potencial). Overhead aceitável. |
| 8 | Quem valida "doc canônico está pronto" | Humano via PR review | Gate automático (≥3 seções + ≥1 ref a arquivo real) | Q3 entrevista: gate automático é proxy frágil de qualidade semântica; PR review é o critério real. Validador continua existindo, mas como warning. |
| 9 | Destino de docs órfãos detectados durante populate | LLM sugere doc canônico mais próximo + humano confirma; sem destino → `docs/_legacy/` | Auto-arquivar sem perguntar / deixar in-place | Q2 entrevista: equilíbrio entre automação (LLM analisa) e controle (humano confirma destinos não-óbvios). |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado projeto greenfield (sem `.claude/`, sem `CLAUDE.md`), quando dev roda `/anti-vibe-coding:init`, então init cria todos os docs canônicos vazios (incluindo `docs/CODE_STYLE.md`), gera `docs/exec-plans/active/{date}-init-populate-harness/PLAN.md` com ≥ 10 fases (1 por doc canônico), e imprime mensagem final apontando para o plano.
- [ ] **CA-02:** Dado projeto Next.js + Supabase, quando init gera o PLAN.md, então cada fase de `ARCHITECTURE`, `FRONTEND`, `SECURITY` lista no mínimo 3 paths reais do código do projeto em `Inputs (código)` (verificável: cada path existe no FS).
- [ ] **CA-03:** Dado projeto com `.claude/.anti-vibe-manifest.json` registrando `pluginVersion: "6.4.1"`, quando dev roda init, então init detecta versão < 6.5.0, faz backup completo em `docs/_legacy/pre-6.5.0/` e re-popula todo o Harness.
- [ ] **CA-04:** Dado projeto com manifest registrando `pluginVersion: "6.5.0"` ou superior, quando dev roda init, então init aborta com mensagem indicando `/sync` ou `/update` e não modifica nenhum arquivo.
- [ ] **CA-05:** Dado projeto com `.claude/progress.txt` contendo N gotchas, quando init roda, então `docs/compound/_imported/` contém N arquivos no formato compound (1 por gotcha), cada um com link de proveniência (`source: .claude/progress.txt linha X`).
- [ ] **CA-06 (Bug A):** Dado projeto Carreirarte (real), quando validator Step 90 roda, então emite ≤ 5 warnings (não 179) e não aborta.
- [ ] **CA-07 (Bug C):** Dado registry com Step 90 falhando, quando init roda, então Step 91 já executou antes e PLAN.md existe (verificável: arquivo presente mesmo após Step 90 emitir warning).
- [ ] **CA-08 (Bug E):** Dado projeto com Akita-style blocks em `CLAUDE.md` original, quando init backup + scaffold completar, então conteúdo Akita está em `docs/CODE_STYLE.md` (não em `DESIGN.md`); `DESIGN.md` permanece com template de Design System visual.
- [ ] **CA-09 (edge case):** Dado dev rodando init duas vezes consecutivamente em greenfield (race), quando segunda execução roda, então detecta scaffold já existe, identifica como reentrada v6.5.0+, aborta sem corromper estado.
- [ ] **CA-10:** Dado registry com steps 07-11 removidos, quando `bun test skills/init` roda, então nenhum teste referencia esses steps; testes E2E (`tracer-bullet`) passam.
- [ ] **CA-11:** Dado SKILL.md atualizado, quando init completa em greenfield, então mensagem final menciona explicitamente: (a) caminho do PLAN.md gerado, (b) comando `/anti-vibe-coding:execute-plan {path}`, (c) que cada fase deve ser revisada via PR.

---

## Out of Scope

- Execução automática do plano populate (continua sendo passo deliberado via `/execute-plan`).
- Refatoração de skills downstream (`/plan-feature`, `/execute-plan`, `/verify-work`) — assumem o output do PLAN.md gerado mas não mudam contrato.
- Migração de docs custom não-canônicos (ex: `docs/api-spec.md` específico de cliente) para nada — ficam in-place a menos que humano peça via fase de órfãos.
- Suporte para múltiplos `CLAUDE.md` (monorepo com vários CLAUDE.md por package) — escopo de PRD futuro.
- Mudanças na detecção de stack (Step 03) — continua como está.
- Tradução do Harness para outras línguas — gerado em inglês por padrão (templates atuais).

---

## Dependencias

| Tipo | Dependência | Status |
|---|---|---|
| Step existente | `00-detect-legacy` | OK (preservado) |
| Step existente | `06-secrets-scan` | OK (preservado) |
| Step existente | `01-scaffold-full-tree` | OK (preservado, recebe novo doc canônico `CODE_STYLE.md`) |
| Step existente | `02-link-claude-agents` | OK (preservado) |
| Step existente | `03-detect-stack-and-register` | OK (preservado) |
| Step existente | `03_1-persist-stack-and-knowledge` | OK (preservado) |
| Step existente | `04-customize-architecture` | OK (preservado, simplificado se necessário) |
| Step existente | `05-install-gh-files` | OK (preservado) |
| Step existente | `90-final-validation` | **Modificado** (allowlist + warning mode) |
| Step existente | `91-generate-populate-plan` | **Promovido a core + reordenado antes do 90** |
| Step removido | `07-discover-existing-docs` | **Deletar arquivo** (substituído por discovery-manifest leve dentro do Step 91) |
| Step removido | `08-classify-blocks-hybrid` | **Deletar arquivo** |
| Step removido | `09-propose-merge-batch` | **Deletar arquivo** |
| Step removido | `10-apply-merge-destructive` | **Substituir por 10-backup-pre-mutation leve** |
| Step removido | `11-move-docs-with-stub` | **Deletar arquivo** |
| Template novo | `assets/templates/docs/CODE_STYLE.md.tpl` | A criar |
| Template atualizar | `assets/templates/AGENTS.md.tpl` | Adicionar link `CODE_STYLE.md` em "Read Before Major Changes" |
| Skill | `/anti-vibe-coding:execute-plan` | OK (consome PLAN.md output desta init) |
| Lib | `audit-log-writer-factory` | OK (existente, captura eventos novos) |
| Manifest | `.anti-vibe-manifest.json` campo `pluginVersion` | OK (já existe — verificar formato em `cross-upgrade-detector`) |

---

## Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Remover steps 07-11 quebra testes E2E (`tracer-bullet`) que dependiam do fluxo antigo | Alta | Médio | Auditar `tests/e2e/` antes de remover; reescrever testes para validar novo fluxo (scaffold → PLAN.md gerado → fase a fase manualmente em testes) |
| LLM gera PLAN.md com inputs inexistentes ("invente paths que parecem reais") | Média | Alto | Step 91 valida cada path candidato com `fs.access` antes de escrever no PLAN.md. Paths inexistentes são removidos com nota "candidato não encontrado". |
| Re-init em projeto v6.4.x destrutivo apaga edições humanas que ficaram em docs canônicos | Média | Alto | Backup `docs/_legacy/pre-6.5.0/` **completo** antes de qualquer write. Mensagem de confirmação explícita. Considerar `--dry-run` que mostra o que será sobrescrito. |
| `progress.txt` parser produz 140 arquivos compound poluindo `docs/compound/` | Alta | Médio | Subdir `_imported/` isola; índice `docs/compound/_imported/INDEX.md` lista origem. Dev pode podar depois. |
| Allowlist de scaffold canônico fica desatualizada quando templates mudam | Média | Médio | Allowlist derivada de `assets/templates/` via leitura dinâmica (não hardcoded). |
| Plano populate fica grande demais (1 fase por doc × cada fase com inputs extensos) | Baixa | Baixo | Cada fase é arquivo separado em `plano-populate-harness/fase-{NN}-{doc}.md`. PLAN.md raiz é índice. |
| Bug E refator quebra retrocompatibilidade: projetos antigos têm Akita em `DESIGN.md` | Média | Médio | Re-init v < 6.5.0 (CA-03) move Akita de `DESIGN.md` para `CODE_STYLE.md` automaticamente via fase do plano populate. |
| Dev não roda `/execute-plan` depois — PLAN.md fica orphan, Harness fica vazio | Alta | Médio | SKILL.md mensagem final + comando exato + nota "Harness está vazio até você rodar /execute-plan". Telemetria de PLAN.md gerado vs executado pode revelar gap. |
| `pluginVersion` ausente no manifest (init muito antiga) | Média | Baixo | Tratar como < 6.5.0 (re-popular). Documentar comportamento. |
| Step 91 chama LLM e falha em ambiente sem rede/sem credenciais | Baixa | Alto | Soft-fail: emite PLAN.md mínimo com headers das fases + nota "rodar manualmente"; init não aborta. |

---

<!-- Notas finais -->

**Resumo da mudança arquitetural:**

```
ANTES (heurística):
detect → secrets → discover-docs → classify(regex) → propose-merge → apply-merge(regex) → move-docs(regex) → scaffold → link → stack → customize → install-gh → final-validate(denylist) → 91-generate-plan(gated)

DEPOIS (LLM semantic):
detect → secrets → backup-pre-mutation → scaffold(inclui CODE_STYLE.md) → link → stack → persist-knowledge → customize → install-gh → 91-generate-populate-plan(LLM lê discovery+stack+progress.txt) → 90-final-validate(allowlist + warning) → mensagem final
```

**Princípio Norte:** A IA cria a estrutura canônica do Harness, lê os docs existentes + código, e mapeia semanticamente N → M, populando cada doc canônico com conteúdo verificável contra o código real. Sem heurística regex. Trabalho semântico delegado à LLM via plano de execução por fase.

