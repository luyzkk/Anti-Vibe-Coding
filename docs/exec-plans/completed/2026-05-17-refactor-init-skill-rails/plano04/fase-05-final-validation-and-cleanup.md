<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Validacao final + cleanup + atualizacao de MEMORY/STATE

**Plano:** 04 — Extracao de rationale + Akita + Cutover
**Sizing:** 1h
**Depende de:** fase-03 (cutover) + fase-04 (E2E goldens)
**Visual:** false

---

## O que esta fase entrega

Execucao da bateria de validacao final (`bun run test && bun run typecheck &&
bun run harness:validate`), confirmacao de **CA-09** (`wc -l SKILL.md <= 200`),
confirmacao de **CA-10** (testes verdes), gate de **cross-reference grep**
(todo ID em `init-rationale.md` aparece `>=1x` em algum step OU no novo
SKILL.md — PRD R5), remocao de quaisquer fragmentos residuais que a fase-03
deixou no SKILL.md, atualizacao do `MEMORY.md` de cada plano (01..04) com
"Notas para Planos Seguintes" indicando cutover completo, e atualizacao do
`docs/STATE.md` global (fases concluidas, `last_updated`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | (verificar) | Limpeza final — remover residuals (HTML comments, blocos JS antigos) que a fase-03 pode ter deixado |
| `docs/exec-plans/active/2026-05-17-refactor-init-skill-rails/plano01/MEMORY.md` | Modify | Atualizar secao "Notas para Planos Seguintes" |
| `docs/exec-plans/active/2026-05-17-refactor-init-skill-rails/plano02/MEMORY.md` | Modify | Idem |
| `docs/exec-plans/active/2026-05-17-refactor-init-skill-rails/plano03/MEMORY.md` | Modify | Idem |
| `docs/exec-plans/active/2026-05-17-refactor-init-skill-rails/plano04/MEMORY.md` | Modify | Marcar status: concluido, decisoes finais (DI-3-1, DI-3-2, DI-4-1) |
| `docs/STATE.md` | Modify | Atualizar `last_updated` + status da feature `refactor-init-skill-rails` |

---

## Implementacao

### Passo 1: Bateria de validacao automatizada

```bash
# 2026-05-17 (Luiz/dev): bateria final — PRD CA-10, MH-03.
echo "== test =="
bun run test || { echo "FAIL: test red"; exit 1; }

echo "== typecheck =="
bun run typecheck || { echo "FAIL: typecheck red"; exit 1; }

echo "== harness:validate =="
bun run harness:validate || { echo "FAIL: harness red"; exit 1; }

echo "== compound:check =="
bun run compound:check || { echo "FAIL: compound red"; exit 1; }

echo "OK: bateria final verde"
```

**Nota:** o repo nao tem script `lint` em package.json (`scripts.lint` ausente),
entao o checklist substitui `bun run lint` por `bun run typecheck`. Se o dev
quiser adicionar lint depois, eh tech-debt separado.

### Passo 2: Validar CA-09 (`wc -l <= 200`)

```bash
lines=$(wc -l < skills/init/SKILL.md)
echo "SKILL.md: $lines linhas"
if [ "$lines" -gt 200 ]; then
  echo "FAIL CA-09: $lines > 200"
  exit 1
fi
echo "OK CA-09"
```

### Passo 3: Cross-reference grep (PRD R5 / G2 do plano)

```bash
# 2026-05-17 (Luiz/dev): cross-reference — todo ID em init-rationale.md aparece
# >=1x em algum step module OU no novo SKILL.md.
orphans=0
for id in $(grep -oE '^### [A-Z]+-?[0-9]+|^### gate:[a-z0-9-]+' docs/design-docs/init-rationale.md | awk '{print $2}'); do
  count=$(grep -RF "$id" skills/init/lib/steps/ skills/init/SKILL.md 2>/dev/null | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "ORPHAN: $id"
    orphans=$((orphans + 1))
  fi
done
if [ "$orphans" -gt 0 ]; then
  echo "FAIL R5: $orphans ID(s) orfaos em init-rationale.md"
  exit 1
fi
echo "OK R5: todos os IDs com >=1 consumidor"
```

Se algum ID for orfao, **decidir explicitamente** (e registrar em `MEMORY.md`
desta fase):

- (a) ID era ruido / historico — **remover** de `init-rationale.md`.
- (b) ID eh transversal / aplica-se a multiplos steps — **adicionar nota**
  ("Consumido transversalmente — sem citacao individual nos steps") e
  **excluir do gate**.
- (c) ID deveria estar citado mas o step esqueceu — **adicionar citacao**
  no step relevante (comentario JSDoc no helper OU no proprio step module).

### Passo 4: Cleanup residual no SKILL.md

Releitura do SKILL.md procurando residuos que a fase-03 pode ter deixado:

```bash
# 2026-05-17 (Luiz/dev): checks de cleanup — devem TODOS retornar 0.
echo "== HTML comments de rationale residuais =="
grep -cE '<!-- DI-|<!-- GT-|<!-- CA-|<!-- gating' skills/init/SKILL.md

echo "== blocos JS de step residuais (await import de helper) =="
grep -c "await import('./lib/" skills/init/SKILL.md

echo "== referencias diretas a process.exit no inline =="
grep -c 'process.exit' skills/init/SKILL.md

echo "== apendice Akita residual =="
grep -cE 'Template Akita|Seção: Code Style|Seção: Comments|Seção: Tests|Seção: Dependencies|Seção: Logging' skills/init/SKILL.md
```

Esperado: todos os contadores `0`. Se algum `> 0`, abrir Edit no SKILL.md e
remover linha-por-linha (preservando o bloco fenced unico do dispatcher,
tabela de steps, telemetria).

### Passo 5: Atualizar `MEMORY.md` de cada plano

Para `plano01/MEMORY.md`, `plano02/MEMORY.md`, `plano03/MEMORY.md`: adicionar
em "Notas para Planos Seguintes" (ou marcar status como `concluido` se ja
estava em andamento):

```markdown
## Notas para Planos Seguintes

- **2026-05-17 — cutover concluido pelo Plano 04:** os steps deste plano agora
  executam pelo dispatcher `skills/init/lib/run-init.ts`. `SKILL.md` reescrito
  como manifest (`<=200 linhas`). Rationale extraido para
  `docs/design-docs/init-rationale.md`. Snippets Akita em
  `skills/init/assets/snippets/akita-*.md`.
- E2E goldens em `tests/e2e/__golden__/init-{greenfield,legacy-v5}.{stdout.txt,tree.json}`.
```

Para `plano04/MEMORY.md`: atualizar status para `concluido`, registrar
decisoes finais (`DI-3-1`, `DI-3-2`, `DI-3-3` se aplicavel, `DI-4-1`) e
metricas:

```markdown
**Status:** concluido

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | {0 ou N} |
| Bugs encontrados | {N} |
| Linhas removidas do SKILL.md | {1215 - final} |
```

### Passo 6: Atualizar `docs/STATE.md` global

Adicionar/atualizar entrada referente a feature `refactor-init-skill-rails`:

```markdown
## refactor-init-skill-rails
- **status:** concluido
- **last_updated:** 2026-05-17
- **resultado:** SKILL.md de 1215 -> {N} linhas. Cutover Rails-style (PRD D1).
  17 steps modularizados em `skills/init/lib/steps/`. E2E verde.
- **rollback:** `git revert {hash-da-fase-03}` reverte ao SKILL.md inline.
```

> Se `STATE.md` ja tem estrutura diferente (tabela, etc), seguir o formato
> existente — nao reformatar.

### Passo 7: Sugerir captura de licao compound (Decision Gate do plugin CLAUDE.md)

Antes de declarar concluido, aplicar a regra do CLAUDE.md raiz:

> Before reporting completion: did this work teach the repo something durable?
> If yes, ask the human to run `/anti-vibe-coding:lessons-learned`.

Cutover Rails-style + extracao de rationale eh **durable lesson** — incluir
no relatorio final desta fase a sugestao explicita:

```text
Sugestao: rodar /anti-vibe-coding:lessons-learned para capturar:
- Padrao Rails-style (manifest + dispatcher) aplicado a SKILL.md
- Estrategia de cutover big-bang com goldens E2E pre-gravados
- Cross-reference grep como gate contra orfaos em rationale extraido
```

---

## Gotchas

- **G1 do plano (wording byte-identico):** se algum teste E2E em fase-04
  falhar nesta validacao final, eh sinal de regressao introduzida entre
  fase-03 e fase-05. Diagnose: foi a remocao de residuo (Passo 4) que mexeu
  acidentalmente em telemetria? Foi o Passo 4 que apagou o bloco fenced do
  dispatcher? Reler o diff.

- **G2 do plano (cross-reference):** se houver muitos orfaos (>5), pausar e
  decidir em batch (nao item-a-item) — provavelmente a fase-01 extraiu mais
  IDs do que o necessario. Remover IDs em batch eh permitido.

- **G4 do plano (big-bang cutover):** se a bateria do Passo 1 falhar, **nao
  iterar fix as cegas**. Re-rodar pre-flight da fase-03 — algum step pode
  estar quebrado. Se o problema for fundamental, considerar `git revert` da
  fase-03 e replanjear.

- **Local — `compound:check`:** se o `compound:check` falhar por causa do
  `init-rationale.md` (que NAO eh compound note, eh design-doc), validar que
  o checker ignora `docs/design-docs/` (deve ignorar, mas confirmar).

- **Local — `STATE.md` format drift:** se outras features ja editaram o
  STATE.md com formato novo, NAO sobrescrever — usar Edit para adicionar a
  entrada de `refactor-init-skill-rails` no formato existente.

- **Local — MEMORY.md timestamps:** as 4 MEMORY.md sao editadas hoje
  (2026-05-17). Manter consistencia com o `Iniciado:` original de cada
  plano (nao alterar). Apenas mudar `Status` e adicionar nota.

---

## Verificacao

### TDD

- [ ] **RED:** rodar bateria do Passo 1 ANTES de qualquer cleanup. Se algo
  ja estiver vermelho, esta fase nao deveria comecar (cutover quebrado).
  Caso ja verde, prosseguir.

- [ ] **GREEN:** apos cleanup do Passo 4 + edits de MEMORY/STATE, bateria
  permanece verde.
  - Comando: `bun run test && bun run typecheck && bun run harness:validate`
  - Resultado esperado: 3 exit 0 sequenciais.

### Checklist

- [ ] `bun run test` exit 0.
- [ ] `bun run typecheck` exit 0.
- [ ] `bun run harness:validate` exit 0.
- [ ] `bun run compound:check` exit 0.
- [ ] `wc -l < skills/init/SKILL.md` retorna numero `<= 200` (CA-09).
- [ ] Cross-reference grep do Passo 3 retorna `OK R5`.
- [ ] Cleanup checks do Passo 4 retornam 4 contadores `0`.
- [ ] `plano01/MEMORY.md`, `plano02/MEMORY.md`, `plano03/MEMORY.md`,
  `plano04/MEMORY.md` atualizados com "Notas para Planos Seguintes" + status.
- [ ] `docs/STATE.md` tem entrada `refactor-init-skill-rails: concluido` com
  `last_updated: 2026-05-17`.
- [ ] Sugestao de `/anti-vibe-coding:lessons-learned` apresentada ao dev
  no relatorio final.

---

## Criterio de Aceite

Feature `refactor-init-skill-rails` declarada **concluida**: SKILL.md
`<=200 linhas`, suite E2E verde, cross-reference grep verde, MEMORY/STATE
atualizados, sugestao de captura de licao apresentada.

**Por maquina:**
- `bun run test` exit 0
- `bun run typecheck` exit 0
- `bun run harness:validate` exit 0
- `bun run compound:check` exit 0
- `[ $(wc -l < skills/init/SKILL.md) -le 200 ]` exit 0
- Script de cross-reference (Passo 3) retorna `OK R5`
- `grep -c 'refactor-init-skill-rails' docs/STATE.md` retorna `>= 1`
- `grep -c 'cutover concluido pelo Plano 04' docs/exec-plans/active/2026-05-17-refactor-init-skill-rails/plano0*/MEMORY.md`
  retorna `>= 4`

**Por humano:**
- Inspecao do SKILL.md final: legivel em 2min, intent claro, tabela de
  steps casa com `registry.ts`.
- Rollback testado mentalmente: `git log --oneline | head -10` mostra o
  hash da fase-03 como ponto de revert seguro.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
