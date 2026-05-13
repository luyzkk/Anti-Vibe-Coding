# Memoria: Plano 02 — Full Scaffold (14+ docs + GH Actions + Delivery Loop + Stack Detection)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12
**Status:** **CONCLUIDO** — todas 6 fases done (01, 02, 03, 04, 05, 06)
**Concluido:** 2026-05-12

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Ambiguidades G-A1 e G-A2 confirmadas conforme planejado.
  - G-A1: `tech-debt-tracker.md.tpl` incluido (15o arquivo de docs/).
  - G-A2: `FRONTEND.md.tpl` e `db-schema.md.tpl` criados como placeholders N/A.
  - Impacto: manifest tem 25 entradas exatas; nenhuma ambiguidade pendente para fase-02.

- **DI-2 (fase-02):** `Promise.all` em `scaffoldFullTree` com `mkdir({recursive:true})` paralelo eh seguro.
  - Por que: `mkdirat` no kernel garante atomicidade — multiplas entries no mesmo diretorio nao colidem.
  - Impacto: documentado inline em `scaffold-full-tree.ts`. Performance <200ms em fixture SSD.

- **DI-3 (fase-06):** `as object` em `readJsonSafe` aceito com JSDoc.
  - Por que: `JSON.parse` retorna `unknown`; spread de `Record<string, unknown>` exige cast minimo. Alternativa (`isRecord` guard) inflacionaria sem ganho.
  - Impacto: CLAUDE.md global proibe `as` indiscriminado; aqui esta documentado por que o uso eh local + justificado.

- **DI-4 (fase-06):** `detectedStack` adicionado como campo OPCIONAL em `ScaffoldFullTreeOptions`.
  - Por que: nao quebrar chamadas existentes do `SKILL.md` Step 1 (que ainda passa `stack='unknown'` hardcoded antes de fase-03 customizar).
  - Impacto: fase-03 pode passar valor real sem mudar contrato.

- **DI-5 (fase-06):** Entry 26 do manifest inserida antes de `TODO.md.tpl`.
  - Por que: agrupamento tematico "state snapshot" (STATE.md + TODO.md ficam juntos).
  - Impacto: ordem do manifest documentada para fases futuras.

- **DI-6 (fase-04):** Step 4 v6.0.0 inserido como comentario HTML placeholder no SKILL.md (entre Step 3 e Step 5).
  - Por que: fase-04 entrega Step 5; fase-03 (a rodar depois) entrega Step 4 (Customize ARCHITECTURE). Placeholder evita conflito de ordem.
  - Impacto: fase-03 substitui o comentario por conteudo real do Step 4.

- **DI-7 (fase-04):** SKILL.md Step 5 mantem bloco bash `bun run -e "..."` conforme spec verbatim (apesar de DI-06 do Plano 01 preferir import direto).
  - Por que: spec da fase eh canon; revisao de padrao SKILL.md fica para fase de hardening futura (cross-cutting refactor).
  - Impacto: tres Steps (1, 2, 3, 5) agora usam bash `bun run -e` — consistencia entre eles. Refactor coletivo possivel em Plano 04/05.

- **DI-8 (fase-05):** `## Conditional Reads` do harness do Andre omitida do AGENTS.md.tpl expandido.
  - Por que: economia de 6 linhas para preservar CA-27 (limite 40 com Delivery Loop injetado).
  - Impacto: se Plano futuro precisar de "Conditional Reads" pattern, decidir entre cortar outras secoes ou abrir excecao no validator.

- **DI-9 (fase-05):** Snippet `delivery-loop.md` condensado de ~8 para 5 linhas.
  - Por que: versao original com bullets espacados resultava em 43 split apos injecao (viola CA-27). Compactado preservando semantica (Loom + Linear + Ready-for-Review).
  - Impacto: snippet eh canon — mudancas futuras devem respeitar orcamento de linhas.

- **DI-10 (fase-03):** Marker `<!-- INIT:STACK_BLOCK -->` adicionado logo apos `# Architecture` (em vez de "apos Project: {{PROJECT_NAME}} e antes de ## Boundaries" como a spec idealizada sugeria).
  - Por que: o template real `ARCHITECTURE.md.tpl` (gerado em fase-01 do Plano 01) tem `## Overview`, nao `## Boundaries`. A posicao funcional eh equivalente — marker eh substituido pelo `customizeArchitecture` independentemente do conteudo ao redor.
  - Impacto: documentado. Se Plano 04 fase-3 alterar a estrutura do ARCHITECTURE.md.tpl, garantir que o marker permanece em local visivel (apos H1) para narrativa de leitura.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** `anti-vibe-coding/` e um submódulo git dentro do repo raiz.
  - Descoberto ao: tentar `git add` com path absoluto a partir do repo raiz (retornou "Pathspec is in submodule").
  - Fix: sempre rodar `git add` e `git commit` com `cd anti-vibe-coding/` primeiro.
  - Impacto para fases seguintes: idem — commits devem ser feitos de dentro do submódulo.

- **GT-2 (fase-06):** `template-manifest.test.ts` tem um teste `every required template ships in EN` que varre diacriticos PT-BR no corpo de TODOS os templates.
  - Descoberto ao: revisar criterios do `STATE.md.tpl` antes de mergear.
  - Impacto para fases seguintes: qualquer template `.tpl` novo (fase-04 `harness.yml`, fase-05 Delivery Loop section) precisa estar 100% EN. Erro typo "Configuracao" → quebra silenciosa.
  - Fix: rodar `grep -P '[ãâáàçéêíóôõú]' assets/templates/` antes do commit.

- **GT-3 (fase-05):** `bun run -e "..."` retorna menu de ajuda em vez de executar quando o bash do Windows interpreta o quoting de forma estranha.
  - Descoberto ao: tentar rodar o Step 6 v6.0.0 do SKILL.md em teste manual durante fase-05.
  - Workaround: usar `bun --eval` (alias) ou script file temporario. Documentado previamente como GT-04 do Plano 01.
  - Impacto: Fases futuras que documentam codigo `bun run -e` em SKILL.md devem testar empiricamente em Windows + bash. Refactor coletivo (Plano 04 ou 05) substituindo por runner que importa libs direto resolve o problema.

- **GT-4 (fase-05):** `grep -P` no Git Bash Windows retorna warning "supports only unibyte and UTF-8 locales" mas ainda funciona para o caso de zero matches.
  - Descoberto ao: rodar verificacao EN-only nos assets novos.
  - Impacto: nao bloqueador. Pode trocar por regex POSIX se quiser silenciar o warning (`grep -E "[\x{e3}\x{e2}...]"` nao funciona em POSIX; preferir ferramenta como `rg` no validador).

- **GT-5 (fase-03):** Spec da fase-03 referencia "Project: {{PROJECT_NAME}}" e "## Boundaries" em ARCHITECTURE.md.tpl que NAO existem no template real (fase-01 do Plano 01 gerou `# Architecture` + `## Overview`).
  - Descoberto ao: tentar localizar a posicao exata do marker `<!-- INIT:STACK_BLOCK -->`.
  - Impacto: specs idealizadas (escritas antes da implementacao real) podem divergir do estado real. Mitigacao: subagentes devem inspecionar o estado real ANTES de seguir a spec literalmente. Marker funciona em qualquer posicao apos H1.
  - Fix: posicao do marker padronizada como "primeira linha apos H1 # Architecture". Plano 04 (validators) deve cobrir.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-05):** AGENTS.md.tpl expandido com `## Required Working Rules` (regras 1-6) e `## Pre-Mutation Gate` que nao existiam no template original do Plano 01.
  - Motivo: fase-05 ancora o marker `<!-- INIT:DELIVERY_LOOP_SLOT -->` entre essas duas secoes. Sem elas, o marker nao tem onde existir.
  - Forma: expansao fiel ao harness do Andre, adaptada para `bun` (D13). Total wc-l: 31 (sem opt-in) / 39 (com opt-in) — ambos ≤40 (CA-27 OK).
  - Impacto: AGENTS.md.tpl agora tem estrutura real (regras + gate) em vez de placeholder generico. Validador (Plano 04) deve cobrir essas secoes.

- **DEV-2 (fase-05):** Snippet `delivery-loop.md` final tem 5 linhas (spec do Passo 1 mencionava "5 linhas de instrucao + 1 frase de exclusao" = ~6, mas a versao com bullets espacados ficava em 9 wc-l).
  - Motivo: caber em CA-27 (limite 40) apos injecao em AGENTS.md (que ja tem 31 linhas).
  - Forma: bullets contiguos sem linha em branco entre eles; texto preservado.
  - Impacto: snippet eh canon. Mudancas futuras devem checar orcamento de linhas via tracer bullet.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 1 (fase-05: DEV-1 + DEV-2) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits | 6 (53c0070, 1ed7bc9, f137533, 78d4823, fd506b5, 045e617) |
| Suite final | 267 pass / 2 fail (baseline preservado) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Apos fase-01 (para fase-02)

- `TEMPLATE_MANIFEST: ReadonlyArray<TemplateEntry>` exportado de `skills/init/lib/template-manifest.ts` — fase-02 itera sobre ele para gerar a arvore completa.
- `TEMPLATES_ROOT` exportado do mesmo modulo — resolve `assets/templates/` via `path.join(import.meta.dir, '..', 'assets', 'templates')`.
- 25 entradas no manifest, todas `required: true`. Nenhuma entrada opcional ainda.
- Placeholder `{{TODAY}}` introduzido em `TODO.md.tpl` — fase-02 deve adicionar substituicao em `scaffoldTemplates` com `new Date().toISOString().slice(0, 10)`.
- Submódulo git: commits sempre de dentro de `anti-vibe-coding/` (ver GT-1 acima).
- Baseline testes: 237 pass / 2 fail (os 2 fails sao pre-existentes em `profile-md-generator.test.ts` — nao corrigir).

### Apos fase-06 (para fase-03, fase-04, fase-05)

- `detectStack(targetDir)` em `skills/init/lib/detect-stack.ts` retorna `DetectedStack { id, signalSource }`. `id` eh union `'nextjs' | 'node-ts' | 'rails' | 'laravel' | 'python' | 'unknown'`.
- Ordem dos probes (importa — G6): `[nextjs, node-ts, rails, laravel, python]`. Primeiro match vence. Monorepo com next + rails = nextjs.
- Erros de I/O sao ENGOLIDOS (corrupted JSON → unknown). Heuristica nunca quebra `/init`.
- `writeStackToStateMd(targetDir, stack)` em `skills/init/lib/state-md-init.ts` cria ou atualiza `docs/STATE.md` idempotentemente. Retorna `{status: 'created'|'updated', path}`.
- Template `docs/STATE.md.tpl` agora existe — entry 26 do manifest. Tem placeholders `{{DETECTED_STACK}}` e `{{TODAY}}`.
- `scaffoldFullTree` aceita `detectedStack?: string` opcional (default `'unknown'`). Para **fase-03 (customizacao)**: passe o resultado de `detectStack()` antes de chamar `scaffoldFullTree`, ou execute `writeStackToStateMd` pos-scaffold (helper eh idempotente).
- SKILL.md tem agora Step 1 → Step 2 → Step 3 (v6.0.0) antes do Passo 0 legado. Fase-03 estende para Step 4 (customize ARCHITECTURE).
- **D37 confirmado**: NENHUMA pasta `docs/knowledge/` eh criada. Teste explicito guarda isso — quebra se alguem ceder a tentacao.
- Tracer bullet agora valida 28 arquivos (27 + STATE.md). Suite total: **254 pass / 2 fail** (baseline preservado).

### Apos fase-02 (para fase-03 e fase-06)

- `scaffoldFullTree` em `skills/init/lib/scaffold-full-tree.ts` materializa 25 arquivos do `TEMPLATE_MANIFEST` em paralelo. Aceita `{targetDir, projectName, stack}` e retorna `{filesWritten, durationMs}`.
- Substitui `{{PROJECT_NAME}}`, `{{STACK}}`, `{{TODAY}}` (sem `{{ONE_LINE_DESCRIPTION}}`/`{{RUNTIME}}`/`{{FRAMEWORK}}`/`{{DATABASE}}` — esses ficam em `scaffoldTemplates` para AGENTS/ARCHITECTURE).
- Para **fase-03 (customizacao ARCHITECTURE)**: voce vai precisar refinar `stack` recebido (`unknown` por default) com o resultado de `detectStack()` da fase-06. ARCHITECTURE.md.tpl tem 4 placeholders ainda em "TBD" — sobrescreva via `scaffoldTemplates` ou helper de customizacao.
- Para **fase-06 (stack-detection)**: o consumidor de `DetectedStack` eh o Step 1 do SKILL.md (hoje hardcoded `stack='unknown'`) e fase-03. Padronize a interface antes de fase-03 rodar.
- Tracer bullet agora assume `filesWritten + treeFilesWritten >= 27` — qualquer adicao futura de template aumenta esse limite.
- Suite total: **241 pass / 2 fail** (baseline ainda os 2 de `profile-md-generator.test.ts`).

---

## Notas para Plano 03 (Migration v5→v6) — Plano 02 CONCLUIDO

Plano 02 entregou o scaffold completo do harness. Plano 03 (Migration v5→v6) vai reusar tudo isto:

### Helpers disponiveis em `anti-vibe-coding/skills/init/lib/`

| Helper | Assinatura | Uso para Plano 03 |
|--------|------------|-------------------|
| `scaffoldTemplates(opts)` | `{targetDir, projectName, stack}` | Materializa AGENTS.md + ARCHITECTURE.md + scripts/. Plano 03 usa quando migracao precisar regenerar arquivos base. |
| `scaffoldFullTree(opts)` | `{targetDir, projectName, stack, detectedStack?}` | Materializa 25 arquivos do TEMPLATE_MANIFEST. Idempotente (mkdir recursive). |
| `linkClaudeToAgents(targetDir)` | retorna `{tier, status}` | Symlink/hardlink fallback. Plano 03 pode chamar para projetos v5 que so tem CLAUDE.md sem AGENTS.md. |
| `detectStack(targetDir)` | retorna `DetectedStack` | Heuristica nextjs/node-ts/rails/laravel/python/unknown. |
| `writeStackToStateMd(targetDir, stack)` | retorna `{status, path}` | Cria/atualiza `docs/STATE.md`. Idempotente. |
| `customizeArchitecture(opts)` | `{targetDir, stack, generatedAt?}` | Substitui marker `<!-- INIT:STACK_BLOCK -->` com secao "Detected Stack". Idempotente (no-op se marker ausente). |
| `installGhFiles(targetDir)` | retorna `{filesWritten}` | Copia `.github/workflows/harness.yml` + PR template. Sempre instalado (D14). |
| `injectOptionalSection(opts)` | `{filePath, marker, body}` retorna status | Generic — injeta bloco markdown apos marker. Idempotente. Reusavel para Compound Gate (Plano 05 fase-06). |

### Estado do SKILL.md de `/init` apos Plano 02

Steps v6.0.0 na ordem: 1 (scaffoldTemplates) → 2 (linkClaudeToAgents) → 3 (detectStack + writeStackToStateMd) → 4 (customizeArchitecture) → 5 (installGhFiles) → 6 (Delivery Loop opt-in). Passos legacy v5.x continuam abaixo (backward compat).

### Estado dos templates apos Plano 02

- AGENTS.md.tpl: 31 wc-l sem opt-in / 39 com opt-in. Contem `## Required Working Rules` (6 regras), marker `<!-- INIT:DELIVERY_LOOP_SLOT -->`, `## Pre-Mutation Gate` (DEV-1).
- ARCHITECTURE.md.tpl: marker `<!-- INIT:STACK_BLOCK -->` logo apos H1 (DI-10).
- 25 templates `.tpl` em EN no manifest. Static asset `.github/workflows/harness.yml` + PR template em `assets/static/.github/`.
- Snippet `assets/snippets/delivery-loop.md` (5 linhas EN).

### Decisoes de design relevantes para Plano 03

- **D37 / CA-19 ABSOLUTO:** v6.0.0 NUNCA cria `docs/knowledge/`. Plano 03 (migration) tambem nao pode — registrar como invariante.
- **`grep -P` no Windows:** warning de locale, mas funciona. Validador (Plano 04) deve usar `rg` ou abordagem cross-platform (GT-4).
- **`bun run -e` em SKILL.md:** consistente entre todos os Steps v6.0.0, mas tem caveat em Windows bash (GT-3). Refactor coletivo possivel em Plano 04/05 — substituir por runner unico que importa libs.
- **template-manifest.test.ts:** varre diacriticos em todos `.tpl`. Plano 03 templates novos devem passar nesse guard.
- **Submódulo git:** TODOS os commits do plugin sao DENTRO de `anti-vibe-coding/`. Plano 03 segue mesma convencao.

### Tracer bullet expandido apos Plano 02

`/init` em fixture vazia agora gera:
- 2 arquivos base (scaffoldTemplates: AGENTS.md, ARCHITECTURE.md, scripts/, package.json — ja eram 2 antes; depois fase-04 do P01 adicionou 2 = 4)
- 25 arquivos full-tree (scaffoldFullTree)
- 2 arquivos `.github/` (installGhFiles)
- ARCHITECTURE.md customizado com stack (fase-03 customize)
- STATE.md gerado (fase-06 writeStackToStateMd)
- AGENTS.md possivelmente com Delivery Loop (se opt-in)
- Total >= 30 arquivos esperados. Tracer bullet test deve ser atualizado no Plano 03 (ou Plano 04 — validators full).

### Suite final do Plano 02

**267 pass / 2 fail** (baseline preservado). Plano 03 comeca dessa base.

---

<!-- Atualizado automaticamente durante execucao -->
