---
slug: init-harness-validation-fix
date: 2026-05-19
status: obsolete
superseded-by: 2026-05-19-init-llm-driven-harness-population
requires: []
---

> **OBSOLETO sob Trilha 2 (2026-05-19).** Este PRD propunha 4 fixes heurísticos
> (rewriter regex de links, allowlist como ajuste, ordem Step 91, mensagem SKILL.md).
> A análise empírica posterior (A/B test Carreirarte vs Harness do André) mostrou
> que o problema raiz era a abordagem heurística inteira. Sob Trilha 2 a LLM faz o
> trabalho semântico (N→M mapping), e os fixes propostos aqui foram absorvidos ou
> reescritos no PRD substituto:
>
> - **Bug A (validator denylist):** absorvido como MH-08 do novo PRD (allowlist + warning mode).
> - **Bug B (link corruption Step 11):** **resolvido por remoção** — Steps 07-11 (toda heurística de merge) são deletados em MH-04.
> - **Bug C (Step 91 gated):** absorvido como MH-01 (reordenar Step 91 antes de Step 90).
> - **Bug D (SKILL.md mensagem final):** absorvido como MH-09.
> - **Bug E (Akita → DESIGN.md):** absorvido como MH-06 (Akita vai para `docs/CODE_STYLE.md` novo; DESIGN.md continua Design System visual).
>
> **Sucessor:** `docs/exec-plans/completed/2026-05-19-init-llm-driven-harness-population/PRD.md` (a mover para active assim que /plan-feature for executado).
> **Histórico preservado abaixo para auditoria.**

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que.
Exemplo: `// 2026-05-19 (Luiz/dev): allowlist harness-owned — PRD CA-04`
-->

# PRD: Init Harness Validation Fix — link fidelity, scope-aware validator, plan decoupling, completion messaging

**Status:** Draft
**Author:** Luiz/dev + AI
**Date:** 2026-05-19
**Context:** (sem CONTEXT.md prévio — diagnóstico feito ao vivo na conversa precedente; ver `docs/compound/2026-05-18-init-self-protection.md` para incidente correlato)

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.

  Teste: Se mover de Must para Should, a feature ainda resolve o problema core? Se sim, nao era Must.
-->

## Problema

O fluxo `/anti-vibe-coding:init` v6.5.0 entrega um harness **silenciosamente quebrado** em projetos com docs pré-existentes. Diagnóstico feito no projeto Carreirarte (run real em 2026-05-19) capturou 4 falhas encadeadas:

| Bug | Sintoma | Linhas | Severidade |
|---|---|---|---|
| **B — Step 11 corrompe links** | Arquivos movidos para `docs/references/` mantêm links relativos antigos que passam a escapar o repo root (`../../../../docs/references/X.md`). 37 ocorrências reais no Carreirarte. | `skills/init/lib/steps/11-move-docs-with-stub.ts` | **Alta** — init corrompe arquivos do próprio usuário |
| **A — Validador strict demais** | `harness-validate.ts.tpl` usa denylist `SKIP_DIRS` (Set literal) que não cobre pastas legadas (`docs_guru/`, `Pagar.me LLM/`, `Segurança/`, `.rollback-trash-*/`). 179 falsos positivos no Carreirarte. | `skills/init/assets/templates/scripts/harness-validate.ts.tpl:63` | **Alta** — qualquer doc legado quebra validação |
| **C — Step 91 refém de Step 90** | Geração do `PLAN.md` de populate fica gated por exit code do validador. Qualquer falha aborta o pipeline e o PLAN.md nunca é criado. | `skills/init/lib/steps/90-final-validation.ts:31-38` + `registry.ts:68-71` | **Média** — mascara entrega incompleta |
| **D — SKILL.md omite next-step** | "Apos init concluir" só sugere `/detect-architecture`. Não menciona PLAN.md de populate gerado pelo Step 91 → usuário não sabe que existe trabalho pendente. | `skills/init/SKILL.md:78-87` | **Média** — entrega invisível |

**Impacto real observado:** screenshot da run no Carreirarte mostrou "Init v6.5.0 aplicado com sucesso (modo destrutivo)" + 6 bullets de mutações, MAS:
- Step 91 nunca rodou (validação abortou com 219 falhas).
- `docs/exec-plans/active/2026-05-19-populate-harness/PLAN.md` não existe.
- 37 arquivos em `docs/references/` ficaram com links inválidos.
- Usuário foi direcionado para `/detect-architecture`, que vai falhar contra harness parcial.

**Por que importa:** init é a porta de entrada do plugin. Cada um dos 4 bugs é frágil isoladamente; combinados produzem um anti-padrão: pipeline aborta silenciosamente, mensagem final mente, e o usuário não consegue distinguir sucesso de falha.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- Init que move arquivos para `docs/references/` mantém todos os links relativos internos resolvendo corretamente (zero links escapando repo root como side-effect de moves).
- `harness-validate` valida apenas paths que o harness possui; docs legados do usuário não interferem na validação.
- Pipeline do init gera `PLAN.md` de populate em **toda run que conseguiu scaffoldar o harness**, independente de warns de validação em arquivos não-harness.
- Mensagem final do init informa explicitamente **dois** próximos passos: rodar `/execute-plan` no PLAN.md gerado, e `/detect-architecture` para perfil arquitetural.
- Projeto que tem docs legados ruins (Carreirarte é o tracer bullet) consegue rodar init e ver o PLAN.md criado, sem nenhuma alteração no projeto além do init em si.

### Mecanismo (algorítmico — o COMO)

**Bug B — Link rewrite no Step 11:**
- `moveDocsWithStub` ganha fase pós-move que reescreve links relativos: para cada `[texto](rel/path)` no conteúdo movido, recalcular o path a partir da nova localização. Implementação: regex de links + `path.relative(newDir, path.resolve(oldDir, target))`.
- Stub mantido como hoje (compatibilidade).
- Restrição (Q4 constraint): contrato externo de Step 11 inalterado — adicionar comportamento interno, sem mudar assinatura.

**Bug A — Validador com allowlist + flag de fallback:**
- Substituir `SKIP_DIRS` (denylist) por `HARNESS_OWNED_PATHS` (allowlist explícita): apenas paths que o init escreveu/conhece são validados (`AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `README.md`, `docs/**/*.md` exceto pastas user-owned descobertas, `.github/**`, `scripts/**`).
- Allowlist construída a partir do `template-manifest.ts` + paths gerados pelos steps de move.
- Flag `--legacy-validator` no script para fallback ao comportamento atual (denylist) — para casos em que o usuário quer validar tudo.
- Reporte separa `errors` (harness-owned) de `warnings` (fora do harness). Apenas errors disparam exit code 1.

**Bug C — Decouple Step 91:**
- Mover `generatePopulatePlanStep` para ANTES de `finalValidationStep` no registry, OU mudar Step 91 para tolerar exit code não-zero do Step 90.
- Decisão: mover Step 91 para antes — é estruturalmente mais correto (a geração do plano não depende de validação de links).
- Step 90 continua sendo último, mas falhas dele tornam-se warning não-fatal quando errors são todos fora de paths harness-owned.

**Bug D — Mensagem final atualizada:**
- `skills/init/SKILL.md` "Apos init concluir" passa a listar 2 next-steps em ordem: (1) `/execute-plan` no PLAN.md gerado, (2) `/detect-architecture` para perfil.
- Adicionar nota explicativa: "Sem o passo 1, STATE.md/DESIGN.md/COMPOUND_ENGINEERING.md ficam como esqueleto."

---

## Fluxos UX por Ator

### Dev rodando `/anti-vibe-coding:init` em projeto pré-existente

**Antes (estado atual, bug):**
1. Dev roda `/anti-vibe-coding:init`.
2. Init scaffolda harness, move docs.
3. Step 90 valida → encontra 179+ falhas em pastas legadas + 37 reais → exit 1.
4. Step 91 NUNCA roda → PLAN.md não existe.
5. Mensagem ao dev: "Init aplicado com sucesso" + sugere `/detect-architecture`.
6. Dev roda `/detect-architecture` → falha contra harness parcial → frustração.

**Depois (com fix):**
1. Dev roda `/anti-vibe-coding:init`.
2. Init scaffolda harness, move docs (com link-rewrite — Bug B).
3. Step 91 (agora antes de validação) gera `docs/exec-plans/active/{date}-populate-harness/PLAN.md`.
4. Step 90 valida só paths harness-owned (Bug A) → 0 errors em projeto recém-inicializado, eventualmente warnings em docs legados não-harness.
5. Mensagem ao dev (Bug D):
   > Init v6.5.0 aplicado. **Dois próximos passos sugeridos:**
   > 1. **Popular o harness:** `/anti-vibe-coding:execute-plan` em `docs/exec-plans/active/{date}-populate-harness/PLAN.md`. Sem isso, STATE.md/DESIGN.md ficam como esqueleto.
   > 2. **Classificar perfil arquitetural:** `/anti-vibe-coding:detect-architecture`.
6. Dev roda `/execute-plan` → harness populado → roda `/detect-architecture` → sucesso.

**Copy relevante:**
- Próximo passo (linha 1): _"Popular o harness com análise do repo: /anti-vibe-coding:execute-plan"_
- Próximo passo (linha 2): _"Classificar perfil arquitetural: /anti-vibe-coding:detect-architecture"_
- Warning não-fatal: _"WARN: links quebrados em {N} arquivos fora do harness scope (não-bloqueante; veja docs/exec-plans/active/{date}-populate-harness/PLAN.md task de cleanup opcional)"_

---

## Requisitos Funcionais

### Must Have (full fix B+A+C+D — Q3 user-approved)
- [ ] **MH-01 (Bug B):** Step 11 `moveDocsWithStub` reescreve links relativos no conteúdo movido. Após mover `X.md` de `A/` para `B/`, todo `[t](../foo)` em X.md aponta para o resolveable real a partir de `B/`.
- [ ] **MH-02 (Bug A):** `harness-validate.ts.tpl` valida apenas paths harness-owned construídos a partir de template-manifest + move-actions emitidas pelos steps. Docs em pastas user-owned (não-harness) viram warnings, não errors.
- [ ] **MH-03 (Bug A — flag):** Script aceita flag `--legacy-validator` que restaura comportamento denylist atual (Q5 constraint user-approved).
- [ ] **MH-04 (Bug C):** `generatePopulatePlanStep` roda em **toda** run de init que passou pelos steps de scaffold, independente do exit code do `finalValidationStep`.
- [ ] **MH-05 (Bug D):** `skills/init/SKILL.md` "Apos init concluir" lista os 2 next-steps em ordem: `/execute-plan` no PLAN.md gerado + `/detect-architecture`.

### Should Have
- [ ] **SH-01:** Mensagem warning não-fatal no console quando validador encontra issues fora do harness scope (visibilidade sem bloquear).
- [ ] **SH-02:** Audit log entry de Step 11 registra rewrite-count (quantos links foram reescritos por move-action).
- [ ] **SH-03:** Step 91 (que agora roda antes de Step 90) registra em audit log a contagem de tasks emitidas no PLAN.md.

### Could Have
- [ ] **CH-01:** Quick fix script `bun run anti-vibe:rebuild-links` standalone para corrigir links quebrados em projetos já afetados (NOTA: viola Q4 "Out of Scope" — só implementar se sobrar tempo extra).
- [ ] **CH-02:** Telemetria adicional capturando paths harness-owned vs user-owned a cada run (para análise futura de drift).

### Won't Have (desta versao — Q4 user-approved)
- **Migração retroativa de projetos já afetados.** Projeto Carreirarte (e qualquer outro com init v6.5.0 já rodado) NÃO é alvo. Workflow esperado: rodar `/anti-vibe-coding:init --rollback` + re-init após release com fix.

---

## Requisitos Nao-Funcionais

- **Performance:** harness-validate continua rodando em <2s para projetos típicos (<500 .md files). Walk recursivo otimizado por allowlist explícita (não precisa entrar em dirs não-harness).
- **Seguranca:** secrets-scan (Step 06) continua intocado — link-rewrite NÃO escaneia conteúdo de arquivos `.env` ou similares (pula via extensão).
- **Acessibilidade:** N/A (feature de CLI, sem UI).
- **Observabilidade:** audit log entries para Step 11 (rewrite-count) + Step 91 (positioning change) + Step 90 (errors vs warnings ratio).
- **Backwards-compat (Q5):** Projetos com `.claude/.anti-vibe-manifest.json` versão v6.5.0 continuam funcionando — nenhuma migração de manifest necessária. Próximo release bumpa para v6.5.1 (patch).
- **Testes existentes (Q5):** Suíte completa (`bun test`) verde — incluindo `harness-validate-*.test.ts`, `run-init.test.ts`, `migrate-orchestrator.test.ts`, e os testes de fixtures em `tests/fixtures/`.
- **TDD (Q5):** Todo MH implementado test-first (Red → Green → Refactor).

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Validador: denylist vs allowlist | **Allowlist** de paths harness-owned (`HARNESS_OWNED_PATHS`) | Estender `SKIP_DIRS` com regex/glob | Allowlist é estruturalmente correta — não importa quantas pastas legadas o usuário adicionar no futuro, não há novo trabalho de manutenção. Denylist é band-aid que cresce indefinidamente. |
| 2 | Step 91 posicionamento | **Mover Step 91 para ANTES de Step 90** no registry | Step 91 tolera exit code não-zero do Step 90 | Mover é mais simples e expressa a verdade do contrato: geração do plano não depende de validade de links. Alterar Step 91 para checar exit code do anterior introduz acoplamento implícito que reaparece no próximo refactor. |
| 3 | Step 11 link-rewrite onde? | **Fase pós-move dentro do próprio Step 11** | Novo step separado (12.5-rewrite-links) | Manter no Step 11 preserva o invariant "move + integridade de links é uma operação atômica". Step separado abre risco de move sem rewrite se ordem do registry quebrar. |
| 4 | Feature flag `--legacy-validator` | **Implementar** (Q5 user-marked) | Não implementar | Usuário explicitamente marcou como restrição. Confirma escape-hatch para usuários que precisam validar todo o repo (uso fora do default). |
| 5 | Allowlist é estática ou dinâmica? | **Híbrida**: paths fixos (`AGENTS.md`, `CLAUDE.md`, etc.) + paths dinâmicos derivados de move-actions emitidas pelos steps do init | Hardcoded list pura | Move-actions são variáveis por projeto (depende de quais docs existiam pré-init). Allowlist puramente estática perderia docs movidos para `docs/references/`. |

---

## Criterios de Aceite

- [ ] **CA-01 (Bug B happy path):** Dado um projeto com `OLD/foo.md` contendo `[bar](./bar.md)` e `OLD/bar.md`, quando init move ambos para `docs/references/`, então `docs/references/foo.md` contém `[bar](./bar.md)` ainda apontando para `docs/references/bar.md` (resolveable).
- [ ] **CA-02 (Bug B edge — link pra fora do batch):** Dado `OLD/foo.md` com `[lib](../src/lib.ts)` e init move só `foo.md`, então `docs/references/foo.md` contém path reescrito (`../../src/lib.ts` ou equivalente) que resolve para `src/lib.ts`.
- [ ] **CA-03 (Bug B edge — link absoluto não muda):** Dado `OLD/foo.md` com `[external](https://example.com)` ou `[anchor](#section)`, quando init move `foo.md`, então o link permanece intacto.
- [ ] **CA-04 (Bug A happy path):** Dado projeto recém-inicializado sem docs legados, quando `bun run scripts/harness-validate.ts` roda, então exit code 0 e zero warnings.
- [ ] **CA-05 (Bug A — docs legados não bloqueiam):** Dado projeto com pasta `docs_guru/` (50 .md com links quebrados) que não é harness-owned, quando harness-validate roda em modo default, então exit code 0 e warnings reportam `docs_guru/` sem falhar.
- [ ] **CA-06 (Bug A — `--legacy-validator` flag):** Dado o mesmo projeto do CA-05, quando harness-validate roda com flag `--legacy-validator`, então comportamento atual é preservado (exit 1 se algum link quebrado).
- [ ] **CA-07 (Bug C — PLAN.md sempre gerado):** Dado init rodando em projeto qualquer (incluindo Carreirarte-like com docs legados ruins), quando o scaffold do harness completou, então `docs/exec-plans/active/{date}-populate-harness/PLAN.md` existe no disco ao final do run, independente de warnings/errors do validador.
- [ ] **CA-08 (Bug C — Step 91 não bloqueia em validador):** Dado finalValidationStep retornando errors em paths harness-owned, quando o registry executa, então Step 91 ainda assim rodou (porque agora vem antes) — verificado por logs ou audit.
- [ ] **CA-09 (Bug D — SKILL.md menciona ambos):** Dado o conteúdo de `skills/init/SKILL.md`, quando inspecionado, então a seção "Apos init concluir" contém literalmente as strings `/anti-vibe-coding:execute-plan` E `/anti-vibe-coding:detect-architecture`, e referencia o path `docs/exec-plans/active/.../populate-harness/PLAN.md`.
- [ ] **CA-10 (regression — suíte verde):** Dado o estado pós-fix, quando `bun test` roda, então todos os testes existentes passam (regressão zero). Em específico: `tests/harness-validate-*.test.ts`, `skills/init/lib/run-init.test.ts`, `skills/init/lib/steps/11-move-docs-with-stub.test.ts` (se existir; senão criar).
- [ ] **CA-11 (TDD verificável):** Dado o histórico de commits do plano de execução, quando inspecionado, então cada MH-XX possui um commit RED (test falhando) precedendo o commit GREEN (test passando).

---

## Out of Scope

- **Migração retroativa de projetos já afetados** (Q4 user-confirmed). Carreirarte e outros projetos onde init v6.5.0 corrompeu links permanecem corrompidos até o usuário rodar `/init --rollback` + re-init manualmente. Razão: complexidade alta + baixa frequência (poucos projetos afetados antes do release com fix).
- **Sync automático do `scripts/harness-validate.ts` dogfood (711 linhas) com o `.tpl`** (Q4 implicit). Mudar só o .tpl é mais seguro; sync dogfood vira PR separado depois.
- **E2E tracer-bullet completo com fixture inteira de projeto-like Carreirarte** (Q4 implicit). Usar fixtures mínimas focadas por test. Cobertura E2E maior fica para fase posterior se necessário.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Step adjacente | `Step 11 moveDocsWithStub` em `skills/init/lib/steps/11-move-docs-with-stub.ts` | Existente — mexer interno |
| Step adjacente | `Step 90 finalValidationStep` em `skills/init/lib/steps/90-final-validation.ts` | Existente — apenas trocar posição no registry |
| Step adjacente | `Step 91 generatePopulatePlanStep` em `skills/init/lib/steps/91-generate-populate-plan.ts` | Existente — apenas trocar posição no registry |
| Asset | `skills/init/assets/templates/scripts/harness-validate.ts.tpl` | Existente — reescrever validador |
| Skill doc | `skills/init/SKILL.md` (seção "Apos init concluir") | Existente — atualizar wording |
| Lib externa | Nenhuma — usar `node:path` e regex nativo | N/A |
| Fixtures | `tests/fixtures/*` para casos de move + validador | Algumas existentes; adicionar conforme necessário |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Link-rewrite quebra arquivos com sintaxe markdown não-canônica (HTML embedded, links com title attribute) | Média | Médio | Adicionar fixtures cobrindo: `[t](path "title")`, `<a href="path">`, links em fenced code blocks (devem ser preservados). CA-03 cobre links HTTP/anchor. |
| Allowlist perde paths user-customizados que deveriam ser harness | Baixa | Alto | Validador imprime no início "Validating N paths: ..." (visibilidade). Audit log captura allowlist usada. |
| Mover Step 91 para antes do Step 90 quebra suposição implícita em algum teste | Média | Baixo | TDD: rodar `bun test skills/init/lib/run-init.test.ts` e ver registry-order assertions. Atualizar fixtures conforme. |
| Feature flag `--legacy-validator` cria divergência de comportamento difícil de debugar | Baixa | Médio | Documentar em SKILL.md + audit log entry explícito quando flag está ativa. |
| Implementar B+A+C+D em uma só feature gera PR grande demais | Alta | Médio | `/anti-vibe-coding:plan-feature` vai quebrar em vertical slices (1 slice por bug). Ship faseado, cada slice mergeável. |
| Regression em algum dos 30+ testes da suite atual | Média | Alto | Q5 constraint explícita: rodar `bun test` a cada slice. Não mergear slice se algum teste antigo virar vermelho. |

---

## Telemetria & Lessons Captured

- **Telemetria sugerida:** Step 11 emite contagem de links reescritos por run. Validador emite contagem warnings-vs-errors. Step 91 confirma criação do PLAN.md.
- **Lessons Captured (a popular após execução):** se durante a implementação aparecer surpresa (ex: link-rewrite quebra caso não-canônico previsto), capturar em `docs/compound/2026-MM-DD-{slug}.md` via `/anti-vibe-coding:lessons-learned`.
