# Memoria: Plano 03 — Pipeline Compound -> Reference

**Feature:** Agent-Skills Import — Wave 3
**Iniciado:** 2026-05-23
**Status:** completed (5/5 fases — PASS, fechado 2026-05-23)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano03-fase02-substituta-init-cascade-fix:** Compound note `2026-05-18-init-cascade-fix.md` NAO EXISTE no repo (confirmado durante planejamento — R-NEW-01 do PLAN). Substituta usada: `2026-05-18-detector-parser-narrow-happy-path.md` (mesma data, dominio init, foco em detector/parser estreito que tambem causou bugs no `/init`). Impacto: header da reference `init-step-contract.md` cita as 3 compound notes (init-self-protection + path-escape-cascade + detector-parser-narrow-happy-path) em vez das 3 originalmente listadas no PRD Item 3b. **Confirmado durante execucao: substituta funcionou, 4 links relativos na secao Referencias da reference, todos validos.**

- **DI-Plano03-fase02-untracked-compound-notes:** Subagente da fase-02 detectou que 3 compound notes-origem (`init-self-protection`, `path-escape-cascade`, `bash-env-var-scope-and`) estavam UNTRACKED no git desde sessao anterior. Nao impactou fase-02/03/04 (so leitura), mas IMPACTOU fase-05 (modifica frontmatter — diff incompleto para untracked). Resolucao: commit housekeeping separado `58349ca` antes de fase-05, adicionando as 3 + 1 nao usada por este plano (`bash-env-var-scope-and` veio junto por ser do mesmo lote 2026-05-18). Validado por `compound:check` (34 notes OK) antes do commit.

- **DI-Plano03-fase03-decisao-G2-irmas:** Decisao do plano G2 confirmada em fase-03: compound-irmas `2026-04-21-hooks-cjs-stdin-pattern.md` e `2026-03-23-hooks-json-overwrite-bug.md` foram citadas no CORPO do checklist de `hooks-checklist.md` mas NAO no header `> Origem:`. Razao: elas sao contexto/referencias relacionadas, nao fonte direta do checklist. Aplicado tambem em fase-05: NAO receberam `referenced-by:` (so a compound principal `prompt-hook-includes-no-loop` recebeu).

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Vazio no inicio do plano -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-Plano03-fase02-untracked-compound-notes:** Compound notes podem estar untracked entre sessoes. Antes de fases que tocam frontmatter de compound notes, RODAR `git status docs/compound/` — se untracked aparecer, fazer commit housekeeping separado primeiro para que diff de fase posterior fique auditavel (5 hunks +1 linha, nao misturado com "files added"). Promovido a regra geral em Notas para Planos Seguintes.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-Plano03-housekeeping-commit:** Adicionado commit nao previsto no PLAN (`58349ca`) entre fase-04 e fase-05 para resolver o GT-Plano03-fase02. Nao e desvio de escopo (commit so contem compound notes ja existentes no filesystem antes do plano comecar); e overhead de sessao para que fase-05 saia auditavel. Decisao do dev (Luiz): "Commit housekeeping primeiro, depois fase-05".

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits gerados | 6 (1 por fase + 1 housekeeping) |
| Arquivos criados | 3 (3 references) |
| Arquivos modificados | 6 (compound/README + 5 frontmatter) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 04) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Confirmacao das hipoteses iniciais (todas validadas):**

- ✅ `docs/references/` ganhou 3 arquivos novos: `init-step-contract.md` (91 linhas, 27 items), `hooks-checklist.md` (94 linhas, 27 items), `tdd-cycle-checklist.md` (88 linhas, 33 items).
- ✅ `docs/references/README.md` secao "Seeds Disponiveis" NAO foi atualizada (G8 do README — candidata a tech-debt explicita). **Plano 04 fase-04 pode opcionalmente atualizar essa secao para listar as 3 references novas; se nao atualizar, ficam descobriveis via `ls docs/references/`.**
- ✅ 5 compound notes-origem ganharam `referenced-by:` (3 → init-step-contract, 1 → hooks-checklist, 1 → tdd-cycle-checklist). Idempotente confirmado.
- ✅ `docs/compound/README.md` ganhou secao `## Quando promover para reference` (linhas 26-51) sem tocar nas 3 secoes pre-existentes.
- ✅ Nenhum arquivo em `skills/` ou `agents/` tocado.

**Para Plano 04 fase-04 (manifest final):**

- Plano 03 NAO regenerou manifest (so `docs/` tocado — `scripts/generate-manifest.js` exclui `docs/`). Plano 04 fase-04 pode confirmar via `bun run generate:manifest` que checksums de `skills/` e `agents/` permanecem iguais ao baseline (Wave 3 anterior, Plano 02).
- **Compound notes que ganharam frontmatter NAO sao rastreadas pelo manifest** (manifest cobre `skills/` + `agents/`). Plano 04 fase-04 nao precisa fazer nada especial pelas edicoes do Plano 03.

**Para Plano 04 fase-03 (flowchart AGENTS.md):**

- Pode opcionalmente citar `docs/references/` como destino de operational checklists (separado de `docs/compound/` que e reativo). Pipeline: compound (reativo) -> reference (proativo via criterio numerico fase-01) -> skills/agents usam.

**Housekeeping pendente (fora do escopo desta Wave):**

- Compound note `2026-05-18-bash-env-var-scope-and.md` foi commitada em `58349ca` mas NAO recebeu `referenced-by:` (nao e origem de nenhuma reference). Continua valida como compound autonoma. Se futuras references referenciarem-na, frontmatter pode ser atualizado em fase semelhante a esta fase-05.

**Para Plano 04 e qualquer plano seguinte: rodar `git status docs/compound/` antes de qualquer fase que toque frontmatter de compound note.** Lesson learned: untracked files quebram criterios humanos baseados em `git diff` (DI-Plano03-fase02-untracked-compound-notes).

---

<!-- Atualizado automaticamente durante execucao -->
