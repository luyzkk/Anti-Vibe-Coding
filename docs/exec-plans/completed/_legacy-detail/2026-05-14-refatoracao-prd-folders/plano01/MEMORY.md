# Memoria: Plano 01 — Nova estrutura (fundacao + tracer bullet)

**Feature:** Refatoracao da Estrutura de Pastas por PRD
**Iniciado:** 2026-04-20
**Concluido:** 2026-04-20
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### DI-1 (fase-01) — Bloco legacy mantido como comentario HTML

Em vez de apagar o bloco legacy "atualizar ou criar v2?" (linhas ~174-179 da versao antiga do SKILL.md), foi deixado um comentario HTML marcador:

```html
<!-- path legacy (PRD-*.md solto + pergunta "atualizar ou v2?") — Plano 02 trata migracao -->
```

**Por que:** Serve de sinalizador para o Plano 02 (deteccao de legacy). Remover sem deixar pista faria a proxima pessoa reinventar a roda.
**Impacto:** Plano 02 deve remover este marcador quando completar a migracao on-detect.

### DI-2 (fase-04) — Sub-step 5.5 como secao ### dentro do Step 5

A movimentacao de CONTEXT foi colocada como `### 5.5` DENTRO do Step 5, nao como Step 6 separado.

**Por que:** mantem a numeracao dos Steps existentes intacta (Step 6 Learn Point, Step 7 Proximo Passo) e deixa claro que 5.5 eh condicional ao sucesso do passo 4 do Step 5 (criacao da pasta + PRD.md).
**Impacto:** futuras fases que referenciarem "Step 5" devem saber que inclui 5.5.

### DI-3 (fase-04) — Auditoria de output fora do bloco de codigo

O bloco de mensagens "PRD salvo em... CONTEXT movido de..." ficou como texto markdown normal (fora de backticks).

**Por que:** aparece renderizado no output da skill — mais legivel ao dev.
**Impacto:** nenhum negativo.

### DI-4 (fase-03) — Step 2-FLAT preservado sem edicao dos sub-steps

O bloco "Detalhamento do fluxo flat" (Steps 2-FLAT ate 6-FLAT) nao foi editado porque os sub-steps nao mencionam caminhos absolutos — herdam PASTA_ATIVA do contexto ja estabelecido no Step 1.

**Por que:** edicao teria sido ruido; backward compat preservado sem tocar logica interna.
**Impacto:** se fluxo FLAT precisar evoluir no futuro, sub-steps continuam genericos e herdam pasta correta.

### DI-5 (fase-03) — Instrucao ao subagente sobre separacao de codigo/artefatos

No Step 4b, instrucao explicita foi inserida como DIRETIVA POSITIVA (nao como item "NAO RECEBE"): "Commits de CODIGO vao para o repo do projeto, NAO dentro de PASTA_ATIVA. PASTA_ATIVA eh apenas para artefatos de planejamento."

**Por que:** eh mais facil seguir uma diretiva positiva do que uma negacao.
**Impacto:** reduz risco de subagentes fazerem commits errados dentro de `.planning/`.

### DI-6 (fase-05) — `plan-template.md` nao tocado

Template nao listado na fase mas existe. Contem apenas placeholder `{caminho do PRD usado como base}`, sem path absoluto hardcoded. Preservado.

**Por que:** fase instruia "nao tocar a menos que tenha caminho absoluto". Nao tinha.
**Impacto:** nenhum.

---

## Bugs Descobertos

Nenhum bug encontrado durante o Plano 01.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

### GT-1 (fase-01) — anti-vibe-coding/ e repositorio git separado

O diretorio `f:\Projetos\Claude code\anti-vibe-coding\` tem seu proprio `.git/`, NAO eh submodulo nem parte do repo pai `f:\Projetos\Claude code\`.

**Por que importa:** todos os commits de fases que mexem em arquivos do plugin precisam ser feitos com CWD em `anti-vibe-coding/`. Git porcelain na raiz pode parecer "sem staging" quando, na verdade, o commit foi no repo filho.

**Impacto para Plano 02-04:** qualquer script/subagente que rode `git add/commit/status` em fases futuras precisa saber disso. Cada README de plano futuro deve mencionar.

### GT-2 (fase-04) — NOTAs de skill devem ficar dentro de blocos de codigo

Instrucoes dentro do SKILL.md que sao parte da "logica executavel" da skill devem ficar DENTRO de blocos de codigo (backticks). NOTAs fora do bloco podem ser tratadas como prosa decorativa pelo modelo e ignoradas na execucao.

**Por que importa:** se voce quer que o modelo EXECUTE algo, fica no bloco. Se eh so contexto para humanos, fica fora.

**Impacto:** fase-05 e Plano 03 fase-05 (atualizar CLAUDE.md do plugin) precisam respeitar essa convencao.

### GT-3 (fase-05) — `skills/lib/state-utils.md` tem referencia legacy

Durante fase-05 o subagente descobriu que `anti-vibe-coding/skills/lib/state-utils.md` ainda contem `STATE-{featureName}.md` no formato antigo (prefixo solto).

**Por que importa:** eh documentacao compartilhada pelas skills. Embora fora do escopo da fase-05 (que cobria apenas templates), nao migra-lo deixa uma fonte de verdade divergente — quem ler `state-utils.md` pode reintroduzir o padrao antigo.

**Impacto:** Plano 02 (migracao legacy) deve incluir varredura de `skills/lib/` e ajustar referencias de path antigas. Alternativa: incluir mini-task de hygiene no inicio do Plano 02.

### GT-4 (geral) — Line endings CRLF/LF em Windows

Durante commits no `anti-vibe-coding/` em Windows, Git avisa repetidamente "LF will be replaced by CRLF the next time Git touches it". Nao eh erro, mas poluir o log de commits.

**Por que importa:** ao revisar diffs, nao confundir mudancas de line ending com mudancas reais.

**Impacto para Plano 02-04:** sem acao imediata necessaria, mas se o projeto ja teve problema de line ending mixto historico, vale um `.gitattributes` explicito em algum momento (nao neste refactor).

---

## Desvios do Plano

Nenhum desvio estrutural. Todas as 5 fases seguiram o plano literalmente.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits no repo anti-vibe-coding | 5 (0c73cd3, 6a030b1, 6d4cb11, 2c13b66, af96598) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### CRITICOS para Plano 02 (deteccao legacy e migracao)

- **GT-1:** `anti-vibe-coding/` e repo git independente. Commits dentro dessa pasta.
- **DI-1 marker:** o comentario HTML `<!-- path legacy ... Plano 02 trata migracao -->` em `skills/write-prd/SKILL.md` linha ~180 DEVE ser removido quando Plano 02 implementar a migracao on-detect.
- **GT-3:** `skills/lib/state-utils.md` ainda contem `STATE-{featureName}.md` legacy. Plano 02 deve varrer `skills/lib/` e corrigir referencias remanescentes.
- **Caminho canonico da PASTA_ATIVA:** `.planning/YYYY-MM-DD-{slug-kebab}/`. A migracao do Plano 02 deve gerar pastas neste formato ao detectar legacy.
- **Heuristica de deteccao legacy:** ha 2 sinais validos (A: `PRD-*.md` solto na raiz; B: `plano*/` solto com `fase-*.md` dentro). Sinal C isolado (`PLAN.md` solto sem PRD nem planoNN) NAO e legacy — pode ser projeto em transicao. Ver G-PLAN-6 no PLAN overview.

### CRITICOS para Plano 03 (multi-PRD, ciclo de vida)

- **GT-2:** instrucoes executaveis em SKILL.md dentro de blocos de codigo; NOTAs decorativas fora. Aplicar ao atualizar `anti-vibe-coding/CLAUDE.md` (fase-05 do Plano 03).
- **Estrutura canonica pronta:** PASTA_ATIVA tem PRD.md, PLAN.md, STATE.md, SUMMARY.md (gerado ao finalizar) e subpastas planoNN/ com README.md + MEMORY.md + fase-*.md. Arquivamento move a PASTA_ATIVA inteira para `.planning/_archive/`.
- **STATE.md ja tem referencia relativa** `**Plan:** ./PLAN.md` — a pasta eh movel (incluindo mover para `_archive/`).
- **Descoberta multi-PRD:** o Step 1a de `plan-feature` e `execute-plan` ja lista pastas quando ha mais de 1 match — a listagem robusta (filtros, status resumido) eh Plano 03 fase-01.

### CRITICOS para Plano 04 (extras)

- **Frontmatter YAML ja existe no PRD template** (`prd-template.md`) com `requires: []` COMENTADO. Plano 04 fase-01 precisa:
  1. Descomentar o default `requires: []`
  2. Implementar parser que le o campo (tolerante a ausencia em PRDs legacy pre-refactor)
  3. Avisos nao-bloqueantes em `execute-plan` quando dependencias nao estao satisfeitas
- **Plano 04 fase-03 (`/lessons-learned` rastreia origem):** precisa inferir origem via glob + sort lexicografico em `_archive/` (YYYY-MM-DD no nome da pasta permite isso). NAO ha parametro de path em `lessons-learned`.

### Estado final apos Plano 01

- `/write-prd`: cria pasta datada + PRD.md + move CONTEXT.md para dentro
- `/plan-feature`: le PRD.md da pasta, salva PLAN.md/STATE.md/planoNN/ dentro
- `/execute-plan`: le STATE.md local, navega planoNN/ local, passa PASTA_ATIVA absoluta aos subagentes
- Templates: prd-template com frontmatter YAML; paths relativos em plan-overview-template e plan-readme-template; state-template criado
- Fluxo FLAT (backward compat v1) preservado; roda dentro de PASTA_ATIVA se o dev usar plano unico
- PRDs em `_archive/` sao recusados por leitura (salvaguarda de arquivamento futuro)

---

<!-- Atualizado automaticamente durante execucao -->
