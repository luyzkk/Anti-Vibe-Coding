<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Reescrita do `skills/init/SKILL.md` como manifest declarativo (CUTOVER)

**Plano:** 04 — Extracao de rationale + Akita + Cutover
**Sizing:** 2h
**Depende de:** fase-01 (init-rationale.md existe), fase-02 (akita-*.md existem)
**Visual:** false

---

## O que esta fase entrega

`skills/init/SKILL.md` reescrito como **manifest declarativo** com `<=200 linhas` (PRD CA-09,
MH-01). Estrutura nova:

1. **Frontmatter** (preservado igual ao atual).
2. **Intent header** (1 paragrafo).
3. **Bloco fenced unico** que invoca o dispatcher: `await runInit({ args: process.argv.slice(2), cwd: process.cwd() })`.
4. **Tabela de steps** (id / order / when / helper / args) — documentacao, nao fonte de verdade.
5. **Telemetry blocks** preservados (`<!-- TELEMETRY:* -->`).
6. **Referencias** para `docs/design-docs/init-rationale.md` e `assets/snippets/akita-*.md`.

**Cutover big-bang:** ~1100 linhas inline (HTML comments, blocos JS de step, apendice Akita) saem
de uma vez. Rollback = `git revert` deste commit. Pre-condicao: Planos 02/03 ja portaram os 17 steps
e o registry tem todas as entradas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Rewrite | Reescrito por completo: 1215 linhas -> `<=200 linhas`. Mantem frontmatter; substitui corpo. |
| `skills/init/lib/customize-architecture.ts` | (verificar) | Se hoje le secoes Akita do SKILL.md inline, atualizar para ler de `assets/snippets/akita-*.md`. **Se nao le, nao tocar.** |
| `skills/init/lib/scaffold-templates.ts` | (verificar) | Idem — verificar se referencia o apendice. |

---

## Implementacao

### Passo 1: Pre-flight checks (gate de seguranca)

Antes de tocar no SKILL.md, validar que todos os pre-requisitos estao prontos. Comandos:

```bash
# 2026-05-17 (Luiz/dev): pre-flight obrigatorio antes do cutover big-bang (G4 do plano).

# Check 1: dispatcher existe
test -f skills/init/lib/run-init.ts && echo "OK: dispatcher" || { echo "FAIL: dispatcher missing"; exit 1; }

# Check 2: registry tem >=17 entradas
entries=$(grep -cE 'Step$|Step,' skills/init/lib/registry.ts || true)
[ "$entries" -ge 17 ] && echo "OK: registry has $entries entries" || { echo "FAIL: registry has only $entries entries (need >=17)"; exit 1; }

# Check 3: init-rationale.md existe (fase-01 done)
test -f docs/design-docs/init-rationale.md && echo "OK: init-rationale" || { echo "FAIL: fase-01 not done"; exit 1; }

# Check 4: akita-*.md existem (fase-02 done)
for slug in code-style comments tests dependencies logging; do
  test -f "skills/init/assets/snippets/akita-$slug.md" || { echo "FAIL: akita-$slug missing"; exit 1; }
done
echo "OK: 5 akita snippets present"

# Check 5: SKILL.md ainda esta na versao 1215 linhas (nao foi tocado pelos Planos 01/02/03)
lines=$(wc -l < skills/init/SKILL.md)
[ "$lines" -ge 1000 ] && echo "OK: SKILL.md still inline ($lines linhas)" || { echo "WARN: SKILL.md ja parece editado ($lines linhas)"; }

# Check 6: testes verdes pre-cutover
bun run test || { echo "FAIL: pre-cutover tests already red"; exit 1; }
```

Se qualquer check falhar, **PARAR** — investigar o que falta e completar antes
de prosseguir. Cutover sem pre-flight verde = recipe for disaster (G4 do plano).

### Passo 2: Capturar baseline E2E para fase-04

A fase-04 vai comparar stdout pos-cutover contra um baseline gravado AGORA (pre-cutover).
Esta fase precisa **gerar os goldens** antes de mexer no SKILL.md:

```bash
# 2026-05-17 (Luiz/dev): goldens pre-cutover capturados para diff vs pos-cutover (G9 do plano).
mkdir -p tests/e2e/__golden__

# Greenfield baseline (fixture vazia em tests/e2e/__fixtures__/init-greenfield/)
# (a fixture eh criada na fase-04 — neste passo so reservamos os arquivos de golden)
echo "TBD: capturar stdout do /init contra fixture greenfield com SKILL.md atual" \
  > tests/e2e/__golden__/init-greenfield.stdout.txt

echo "TBD: capturar arvore de arquivos pos-init" \
  > tests/e2e/__golden__/init-greenfield.tree.json
```

> **Decisao DI-3-1 (escalada ao dev):** o protocolo de captura do golden eh:
> rodar o `runInit` do dispatcher (que ja existe apos Planos 02/03) ANTES de
> reescrever o SKILL.md. Como o dispatcher ja executa todos os steps portados e
> os steps copiam wording byte-identico do SKILL.md, o output do dispatcher
> **antes do cutover** deve casar com o output do SKILL.md atual. Validar essa
> premissa com um spot-check manual antes de fechar o golden.

### Passo 3: Reescrever `skills/init/SKILL.md`

Template do novo manifest (esqueleto — preencher com nomes reais do registry):

```markdown
---
name: init
description: "This skill should be used when the user asks to 'initialize anti-vibe', 'setup anti-vibe coding', 'add anti-vibe to project', 'configure anti-vibe', or wants to onboard a project into the Anti-Vibe Coding methodology. Handles first-time setup with intelligent CLAUDE.md merge, rules deployment, and decisions registry initialization."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)] [--dry-run] [--refresh] [--reuse-discovery]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicializa o Anti-Vibe Coding no projeto atual. Detecta o estado do projeto (greenfield ou
legacy v5.x), aplica migracao incremental quando necessario, gera estrutura `docs/`,
linka `CLAUDE.md` -> `AGENTS.md` (3 tiers com fallback Windows) e instala GH Actions + PR
template. Steps executam pelo dispatcher `lib/run-init.ts`; cada step esta em
`lib/steps/NN-{slug}.ts` registrado em `lib/registry.ts`.

## Como executar

```typescript
// 2026-05-17 (Luiz/dev): cutover Rails-style (PRD D1/D7) — orquestrador unico.
// DI-06/GT-04 (Windows): lazy-import centralizado no dispatcher.
import { runInit } from './lib/run-init'
await runInit({ args: process.argv.slice(2), cwd: process.cwd() })
```

## Fluxo de Steps (documentacao)

A tabela abaixo eh **documentacao gerada a mao**. A fonte de verdade do runtime eh
`lib/registry.ts` (consumido por `runInit`). Se divergirem, o registry vence (G7 do plano).

| # | ID | Quando roda | Helper(s) | Args/Flags |
|---|----|----|----|----|
| 1 | `detect-legacy` | sempre | `detect-v5-legacy.ts` | — |
| 2 | `reuse-discovery` | sempre | `parse-refresh-flag.ts` | `--refresh`, `--reuse-discovery` |
| 3 | `migrate-0-parse-dry-run` | se `--dry-run` em ARGS | inline parse | `--dry-run` |
| 4 | `migrate-all-orchestrate` | se `--dry-run` (early-exit) | `migrate-orchestrator.ts`, `dry-run-renderer.ts` | `--dry-run` |
| 5 | `migrate-1-backup` | se `detect-legacy.isLegacy` | `backup-planning.ts` | — |
| 6 | `migrate-2-planning` | apos backup OK | `migrate-planning.ts` | — |
| 7 | `migrate-3-lessons` | apos migrate-2 OK | `migrate-lessons.ts` | — |
| 8 | `migrate-4-decisions` | apos migrate-2 OK | `migrate-decisions.ts` | — |
| 9 | `scaffold-full-tree` | sempre | `scaffold-templates.ts`, `scaffold-full-tree.ts`, `scaffold-todo-md.ts` | — |
| 10 | `link-claude-agents` | sempre | `symlink-fallback.ts` (3 tiers) | — |
| 11 | `detect-stack-and-register` | sempre | `detect-stack.ts`, `state-md-init.ts` | — |
| 12 | `persist-stack-knowledge` | sempre (idempotente) | `run-stack-knowledge-init.ts` | `--refresh-knowledge` |
| 13 | `customize-architecture` | apos detect-stack | `customize-architecture.ts` | — |
| 14 | `install-gh-files` | sempre (D14) | `install-gh-files.ts` | — |
| 15 | `delivery-loop` | opcional opt-in (Step 6) | `inject-optional-section.ts` + `assets/snippets/delivery-loop.md` | resposta `y`/`N` |
| 16 | `capabilities-discovery` | soft-fail se profile ausente | `capabilities-writer.ts`, `read-architecture-profile.ts`, `audit-log.ts` | — |
| 17 | `final-validation` | sempre, ultimo | `scripts/harness-validate.ts` | — |

## Referencias

- **Rationale completo:** [`docs/design-docs/init-rationale.md`](../../docs/design-docs/init-rationale.md)
  (DI-XX / GT-XX / CA-XX / R-XX / M-XX / D-XX / gates).
- **Akita snippets** (mesclados no `CLAUDE.md` do projeto cliente):
  - [`akita-code-style.md`](./assets/snippets/akita-code-style.md)
  - [`akita-comments.md`](./assets/snippets/akita-comments.md)
  - [`akita-tests.md`](./assets/snippets/akita-tests.md)
  - [`akita-dependencies.md`](./assets/snippets/akita-dependencies.md)
  - [`akita-logging.md`](./assets/snippets/akita-logging.md)
- **Delivery Loop snippet** (opt-in via Step 6): [`delivery-loop.md`](./assets/snippets/delivery-loop.md)

## Regras Importantes (preservadas do SKILL.md inline)

- **NUNCA sobrescrever** informacoes do projeto sem aprovacao.
- **NUNCA remover** secoes existentes do CLAUDE.md original.
- **SEMPRE** criar backup antes de modificar.
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar.
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui.

## Diretorio do projeto

$ARGUMENTS

## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

> Plugin v6.x inicializado. Sugestao: rode `/anti-vibe-coding:detect-architecture` para
> classificar este projeto em 1 dos 5 perfis arquiteturais e ativar o Modo Dual nas skills
> estruturantes.

<!-- TELEMETRY:START -->
{preservar literal o bloco TELEMETRY:START..END existente no SKILL.md atual.
 Se houver mais de um bloco TELEMETRY, preservar todos.}
<!-- TELEMETRY:END -->
```

> **Decisao DI-3-2 (capturada como decisao do plano):** a tabela usa **markdown
> table** (legivel a olho nu) em vez de YAML frontmatter da tabela. Motivos:
> (a) ja existe convencao no projeto de tabelas markdown para documentacao
> humana; (b) frontmatter YAML duplo seria parseado pelo Claude Code skill
> loader como metadata da skill, gerando confusao; (c) a fonte de verdade do
> runtime eh `registry.ts` — a tabela eh **redundancia documentacional**
> intencional.

### Passo 4: Atualizar consumidores dos snippets Akita (se necessario)

Verificar quem hoje le o apendice Akita do SKILL.md:

```bash
# 2026-05-17 (Luiz/dev): localizar consumidores do apendice Akita.
grep -rln 'Template Akita\|Seção: Code Style\|Akita' skills/ scripts/ tests/ --include='*.ts' --include='*.md'
```

Se houver helpers que leem inline (provavelmente `customize-architecture.ts` ou
`scaffold-templates.ts`), atualizar para ler dos arquivos `assets/snippets/akita-*.md`.

> **G3 do plano (helper preservation) — excecao justificada aqui:** alterar um
> helper para apontar para um path novo eh permitido nesta fase APENAS se o
> helper ja le o apendice inline. Se nao le, nao tocar. Documentar a alteracao
> em MEMORY.md como `DEV-X`.

### Passo 5: Verificar budget `<=200 linhas`

```bash
lines=$(wc -l < skills/init/SKILL.md)
echo "SKILL.md: $lines linhas"
[ "$lines" -le 200 ] && echo "OK: dentro do budget CA-09" || { echo "FAIL: excede CA-09 ($lines > 200)"; exit 1; }
```

Se ultrapassar: cortar (a) detalhes redundantes da tabela; (b) paragrafos de
prosa que podem migrar para `init-rationale.md`; (c) blocos TELEMETRY se
excederem 20 linhas (escalar como decisao separada — DI-3-3).

### Passo 6: Smoke test do skill loader

Confirmar que o Claude Code skill loader consegue parsear o novo SKILL.md:

```bash
# 2026-05-17 (Luiz/dev): smoke test — frontmatter valido + 1 bloco fenced TS.
head -10 skills/init/SKILL.md  # deve mostrar frontmatter intacto
grep -c '^```typescript' skills/init/SKILL.md  # deve retornar 1 (G8 do plano)
```

---

## Gotchas

- **G4 do plano (big-bang cutover):** pre-flight obrigatorio no Passo 1 — se algum
  step do registry estiver faltando ou nao registrado, o `runInit` em runtime vai
  pular o step silenciosamente OU throwar `Cannot find module`. Sem pre-flight,
  bug entra em producao.

- **G1 do plano (wording byte-identico):** os steps portados nos Planos 02/03 ja
  preservam wording. Esta fase **nao introduz strings novas de log**. Se voce
  estiver tentado a adicionar um `console.log('Migrando...')` no novo SKILL.md
  ou no dispatcher, PARE — toda mensagem visivel ao usuario ja vem de um step.

- **G6 do plano (telemetry blocks):** se o SKILL.md atual tem `<!-- TELEMETRY:START -->`,
  preservar literal no novo manifest. Esses blocos sao consumidos por harness
  externo (nao parte deste refactor). Diff antes/depois de TELEMETRY tem que ser
  vazio.

- **G7 do plano (tabela vs registry):** a tabela do novo SKILL.md eh
  documentacao. Adicionar nota explicita no manifest ("A fonte de verdade do
  runtime eh `lib/registry.ts`. Se divergirem, o registry vence."). Sem essa
  nota, o proximo mantenedor vai editar a tabela achando que muda
  comportamento.

- **G8 do plano (unico bloco fenced):** o Claude Code skill loader executa o
  **primeiro** bloco fenced `typescript`/`javascript` que encontra. Garantir
  que o novo SKILL.md tem **um unico** bloco (a chamada `runInit`). Se a tabela
  ou as referencias tiverem outros blocos, o loader chama o errado. Convencao:
  tabela e referencias usam markdown puro.

- **G10 do plano (edge cases delegados):** os 4 edge cases CA-03/CA-06/CA-07/CA-08
  sao cobertos por fase-04, nao por esta. Esta fase so faz o cutover. Se algum
  edge case quebrar, a fase-04 detecta no E2E e a fase-05 itera fix.

- **Local — `$ARGUMENTS` placeholder no Claude Code:** o SKILL.md atual usa
  `$ARGUMENTS` (linha 1198). Preservar essa convencao no novo manifest — o
  loader injeta o conteudo de argumentos do usuario. Sem `$ARGUMENTS`, o
  `process.argv.slice(2)` no bloco fenced nao recebe a string esperada e a
  flag `--dry-run` nao chega aos steps.

- **Local — path relativo `./lib/run-init`:** o bloco fenced usa
  `import { runInit } from './lib/run-init'`. Em Claude Code, paths relativos
  ao SKILL.md funcionam (skill loader injeta `import.meta.dir` apropriado).
  Validar em smoke test executando `/anti-vibe-coding:init` num fixture
  greenfield e conferindo que o dispatcher rodou.

---

## Verificacao

### TDD

- [ ] **RED:** antes do rewrite, `wc -l skills/init/SKILL.md` retorna `1215`.
  - Comando: `wc -l < skills/init/SKILL.md`
  - Resultado esperado: numero `>= 1000` (versao inline ainda intacta)

- [ ] **GREEN:** apos rewrite, retorna `<= 200`.
  - Comando: `wc -l < skills/init/SKILL.md`
  - Resultado esperado: numero `<= 200`

### Checklist

- [ ] Pre-flight passou (6 checks no Passo 1).
- [ ] Goldens pre-cutover capturados em `tests/e2e/__golden__/init-greenfield.{stdout.txt,tree.json}` (placeholder ou real conforme DI-3-1).
- [ ] `skills/init/SKILL.md` reescrito: frontmatter preservado, corpo substituido.
- [ ] `wc -l skills/init/SKILL.md` retorna `<= 200`.
- [ ] `grep -c '^```typescript' skills/init/SKILL.md` retorna `1`.
- [ ] `grep -F '$ARGUMENTS' skills/init/SKILL.md` retorna `>= 1` (placeholder preservado).
- [ ] Helpers de `lib/*.ts` modificados SOMENTE se ja liam o apendice Akita inline (documentar em MEMORY.md).
- [ ] Apendice Akita REMOVIDO do SKILL.md (`grep -c 'Template Akita' skills/init/SKILL.md` retorna `0`).
- [ ] HTML comments de rationale REMOVIDOS (`grep -cE '<!-- DI-|<!-- GT-|<!-- CA-' skills/init/SKILL.md` retorna `0` — IDs viraram referencia ao init-rationale.md).
- [ ] `bun run test` exit 0 (todos os testes dos steps + harness ainda verdes — fase-04 ainda nao rodou, mas regression mantida).
- [ ] `bun run harness:validate` exit 0.
- [ ] `bun run typecheck` exit 0 (se o helper foi alterado).

---

## Criterio de Aceite

SKILL.md reescrito como manifest declarativo `<=200 linhas`, com 1 bloco fenced
chamando `runInit`, tabela de steps documentacional, referencias para
init-rationale.md + akita-*.md, telemetry blocks preservados.

**Por maquina:**
- `wc -l < skills/init/SKILL.md` retorna numero `<= 200`
- `grep -c '^```typescript' skills/init/SKILL.md` retorna `1`
- `grep -F 'runInit' skills/init/SKILL.md` retorna `>= 1`
- `grep -F 'docs/design-docs/init-rationale.md' skills/init/SKILL.md` retorna `>= 1`
- `grep -cF 'assets/snippets/akita-' skills/init/SKILL.md` retorna `>= 5`
- `grep -cE '<!-- DI-|<!-- GT-|<!-- CA-' skills/init/SKILL.md` retorna `0`
- `bun run test` exit 0
- `bun run harness:validate` exit 0

**Por humano:**
- Ler o novo SKILL.md de cima a baixo em menos de 2 minutos.
- Confirmar que para entender "como /init funciona" basta ler a tabela de
  steps + 1 paragrafo. Detalhe de cada step esta no helper TS / step module.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
