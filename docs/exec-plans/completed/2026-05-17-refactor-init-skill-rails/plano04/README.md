# Plano 04: Extracao de rationale + Akita + Cutover

**Feature:** refactor-init-skill-rails ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~7h
**Depende de:** Plano 02 + Plano 03 (cutover so eh seguro quando o registry tem todas as ~17 entradas portadas)
**Desbloqueia:** ninguem — ultimo plano da feature

---

## O que este plano entrega

Extracao dos artefatos textuais (rationale extenso + apendice Akita) para arquivos dedicados,
reescrita do `skills/init/SKILL.md` como manifest declarativo `<=200 linhas` (PRD CA-09, MH-01),
testes E2E provando byte-idempotencia do `/init` greenfield + legacy v5 (PRD CA-01, CA-02) e
validacao final (test + typecheck + harness:validate). Apos este plano: `/anti-vibe-coding:init`
roda pelo dispatcher do Plano 01, SKILL.md so declara, rationale vive em
`docs/design-docs/init-rationale.md`, Akita vive em `skills/init/assets/snippets/akita-*.md`,
helpers continuam intactos.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Interface `Step` / `StepReport` / `StepContext` / `AbortError` | Plano 01 fase-01 (`skills/init/lib/steps/types.ts`, `abort-error.ts`) | pendente |
| Dispatcher `runInit` com flags + AbortError catch + needsUser + skipRemaining | Plano 01 fase-02 + Plano 03 fase-01/06 (`skills/init/lib/run-init.ts`) | pendente |
| Registry com >= 17 entradas (todos os steps portados) | Plano 02 fase-06 + Plano 03 fase-06 (`skills/init/lib/registry.ts`) | pendente |
| Padrao `lazyImport` centralizado | Plano 01 fase-04 (`skills/init/lib/lazy-import.ts`) | pendente |
| Padrao golden test (fixtures + `__golden__/`) | Plano 01 fase-03 / Plano 02 fase-01 | pendente |
| `skills/init/SKILL.md` na versao atual (1215 linhas) intocado | Plano 01/02/03 prometem nao tocar — confirmar via `git status` antes da fase-03 | pendente |
| Convencao de snippet `skills/init/assets/snippets/delivery-loop.md` | ja existe (formato single-section markdown) | pronto |
| Helpers `detectV5Legacy`, `backupPlanning`, `migratePlanning`, etc. (todos os 17 steps) | `skills/init/lib/*.ts` | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `docs/design-docs/init-rationale.md` indexado por DI/GT/CA/gates | nenhum plano — referencia futura para mantenedores |
| `skills/init/assets/snippets/akita-{code-style,comments,tests,dependencies,logging}.md` | Step `customizeArchitecture` / `scaffoldTemplates` (consumo via merge no `CLAUDE.md` do projeto cliente) |
| `skills/init/SKILL.md` reescrito como manifest `<=200 linhas` | runtime de `/anti-vibe-coding:init` |
| Goldens E2E em `tests/e2e/__golden__/` | proximos planos da feature (nenhum — feature termina aqui) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-extract-rationale.md | `docs/design-docs/init-rationale.md` indexado por DI-XX/GT-XX/CA-XX/gates (PRD SH-01) + grep cross-reference garantindo IDs nao orfaos | 1.5h | — (paralelo com fase-02) |
| 02 | fase-02-extract-akita-snippets.md | 5 arquivos `assets/snippets/akita-*.md` a partir do apendice atual (PRD SH-02) | 1h | — (paralelo com fase-01) |
| 03 | fase-03-rewrite-skill-md-manifest.md | SKILL.md reescrito como manifest declarativo (intent + bloco fenced unico + tabela de steps + referencias) `<=200 linhas` (PRD MH-01, CA-09) | 2h | fase-01, fase-02 |
| 04 | fase-04-e2e-byte-idempotence-tests.md | Testes E2E com fixtures greenfield + legacy-v5 comparando stdout + arvore de arquivos byte-a-byte (PRD CA-01, CA-02, SH-03) | 1.5h | fase-03 |
| 05 | fase-05-final-validation-and-cleanup.md | `bun run test && bun run typecheck && bun run harness:validate` verde + CA-09 validado + grep cross-reference verde + MEMORY.md + STATE.md atualizados | 1h | fase-04 |

---

## Grafo de Fases

```
fase-01 (rationale)      fase-02 (akita snippets)
        |                          |
        +------------ + -----------+
                      |
                      v
              fase-03 (cutover SKILL.md)
                      |
                      v
              fase-04 (E2E byte-idempotence)
                      |
                      v
              fase-05 (validation + cleanup)
```

**Paralelismo possivel:**
- fase-01 e fase-02 sao independentes (uma extrai HTML comments, outra extrai o apendice Akita).
  Podem rodar em paralelo. Nenhuma modifica `SKILL.md` ainda.
- fase-03 eh SERIAL — depende dos dois outputs anteriores (referencia ambos no novo manifest).
- fase-04 e fase-05 sao seriais apos fase-03 (testes E2E rodam contra o manifest cutoverizado).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste/assertion que falha por ausencia (arquivo nao existe, ID orfao,
   linha excede budget, stdout divergente).
2. GREEN: criar arquivo / extrair conteudo / reescrever manifest ate o teste/assertion verdejar.
3. REFACTOR: organizar headings, consolidar duplicacoes. Manter testes verdes.
4. VERIFY: bun run test && bun run typecheck && bun run harness:validate
```

**Tracer Bullet deste plano:** N/A — tracer da feature foi feito no Plano 01 fase-03. Este plano
fecha o ciclo. A propria fase-04 (E2E byte-idempotence) eh "tracer ao contrario": prova que o
cutover preservou comportamento.

---

## Decisoes do PRD aplicaveis

| Decisao | Aplicacao neste plano |
|---------|------------------------|
| D1 (Manifest + dispatcher Rails-style) | **Fase-03** materializa o cutover — o manifest declarativo entra em producao. |
| D5 (Rationale em `docs/design-docs/init-rationale.md`) | **Fase-01** cria o arquivo. **Fase-03** referencia. **Fase-05** valida cross-reference. |
| D6 (Akita em `skills/init/assets/snippets/akita-*.md`) | **Fase-02** cria os 5 arquivos. **Fase-03** referencia via paths relativos. |
| D7 (Cutover big-bang) | **Fase-03** executa cutover de uma vez (SKILL.md inline -> manifest). **Fase-04/05** validam. |

## Criterios de Aceite do PRD tangenciados

- **CA-01** (greenfield byte-identico): coberto por fase-04 com fixture `init-greenfield`.
- **CA-02** (legacy v5 byte-identico): coberto por fase-04 com fixture `init-legacy-v5`.
- **CA-09** (`wc -l skills/init/SKILL.md <= 200`): validado em fase-03 e re-validado em fase-05.
- **CA-10** (`bun run test` verde): validado em fase-05.
- **CA-03** (`--dry-run` sem mutacao): coberto por fase-04 (edge cases).
- **CA-06** (Step 7 soft-fail): coberto por fase-04 (edge cases).
- **CA-07** (backup gate aborta): coberto por fase-04 (edge cases).
- **CA-08** (Windows tier-3 copy-with-hook): coberto por fase-04 (edge cases).
- **SH-01** (rationale extraido): fase-01.
- **SH-02** (Akita extraido): fase-02.
- **SH-03** (E2E byte-idempotence): fase-04.
- **MH-01** (manifest `<=200 linhas`): fase-03 + fase-05.
- **MH-03** (comportamento byte-identico): fase-04.

---

## Gotchas Conhecidos

Gotchas herdados do PRD/Plano 01/02/03 + descobertos durante decomposicao deste plano:

- **G1 — Wording byte-identico (PRD R1 / R3):** O cutover (fase-03) substitui o bloco inline
  do SKILL.md por uma chamada a `runInit({ args, cwd })`. Os steps portados nos Planos 02/03
  ja preservaram o wording dos `console.log` byte-a-byte. **Esta fase nao deve introduzir
  novas strings de log** — apenas trocar a fonte (inline -> dispatcher). Scripts CI que fazem
  grep no stdout (ex: parsers humanos) quebram se o wording divergir. Validacao final em
  fase-04 compara stdout caractere a caractere contra goldens.

- **G2 — Cross-reference grep (PRD R5):** Todo ID extraido para `init-rationale.md` (DI-XX,
  GT-XX, CA-XX, R-XX, gates) deve aparecer `>= 1x` em algum arquivo `skills/init/lib/steps/*`
  OU no `SKILL.md` novo. ID orfao = rationale solto sem consumidor = candidato a remocao OU
  bug de extracao. **Fase-05** roda esse grep como gate. Se algum ID nao for citado em lugar
  nenhum, decidir explicitamente: (a) remover o ID do rationale (era ruido) ou (b) adicionar
  citacao no step relevante.

- **G3 — Helper preservation (PRD R7):** Mesmo padrao dos Planos 02/03: **nenhum** helper em
  `skills/init/lib/*.ts` pode ser modificado neste plano. A extracao de rationale opera SOMENTE
  em SKILL.md (fase-01 le HTML comments; fase-05 remove o que sobrou). A extracao de Akita
  opera SOMENTE no apendice do SKILL.md (linhas ~1004-1195). Se algum helper tem JSDoc com
  rationale que deveria virar entrada no `init-rationale.md`, ESCALAR como backlog separado.

- **G4 — Big-bang cutover (PRD R6):** A fase-03 substitui ~1100 linhas do SKILL.md de uma vez.
  Rollback = `git revert` da fase-03. **Pre-condicao obrigatoria:** Planos 02/03 100% verdes
  (todos os 17 steps portados e com goldens passando). Verificar com `git log --oneline` que
  todas as fases dos planos 02/03 ja entraram. Se um step ainda estiver pendente, a fase-03
  cria um manifest que aponta para algo que nao existe no registry -> /init quebra.

- **G5 — Snippets seguem convencao existente:** `skills/init/assets/snippets/delivery-loop.md`
  ja eh exemplo da convencao: arquivo markdown single-section, comecando com `## Heading`,
  pronto para ser concatenado/injetado. **Fase-02** segue identico: cada arquivo
  `akita-{slug}.md` comeca com `## {Heading}` (NAO `### `), conteudo byte-identico ao do
  apendice atual modulo o downgrade `### ` -> `## `. Validar diff char-a-char na fase-02.

- **G6 — Telemetry blocks no SKILL.md:** SKILL.md atual tem blocos de telemetria
  (`<!-- TELEMETRY:START -->...<!-- TELEMETRY:END -->`) ja curtos (`<20 linhas` cada).
  **Fase-03** preserva esses blocos intactos. O budget `<=200 linhas` inclui esses blocos.
  Verificar se o budget aguenta intent header + tabela de steps + telemetria + referencias.

- **G7 — Manifest table como documentacao, nao fonte de verdade:** A tabela de steps no novo
  SKILL.md eh para o humano ler. A **fonte de verdade do runtime** continua sendo
  `skills/init/lib/registry.ts` (consumido pelo `runInit`). Se a tabela e o registry
  divergirem, o runtime segue o registry. Documentar isso explicitamente no SKILL.md novo
  ("Esta tabela eh documentacao gerada a mao. A fonte de verdade do runtime eh
  `lib/registry.ts`.").

- **G8 — Linha de bloco fenced no SKILL.md:** O Claude Code skill loader executa o **primeiro
  bloco fenced** `javascript`/`typescript` que encontra no SKILL.md. Fase-03 precisa garantir
  que o manifest tenha UM unico bloco com `import { runInit } from './lib/run-init'; await
  runInit({ args: process.argv.slice(2), cwd: process.cwd() })`. Se houver blocos anteriores
  (ex: na tabela de steps mostrando exemplo), o loader chama o errado. Convencao: tabela de
  steps usa markdown puro (sem fenced blocks); o unico bloco fenced eh a chamada do
  dispatcher.

- **G9 — Goldens E2E pre-cutover vs pos-cutover:** Fase-04 compara stdout/arvore-de-arquivos
  do init NOVO contra um baseline gravado do init ATUAL. Pre-condicao operacional: o baseline
  precisa ser capturado ANTES da fase-03 (ex: rodar `/init` no fixture com SKILL.md atual,
  salvar stdout em `__golden__/init-greenfield.stdout.txt`). **Fase-04** documenta esse
  protocolo. Alternativa: usar commit hash anterior ao cutover como referencia (`git stash`
  ou rodar contra HEAD~1 com fixture clonada). A primeira opcao eh mais simples e
  reproduzivel.

- **G10 — Edge cases obrigatorios em fase-04:** Alem de greenfield + legacy-v5, a fase-04
  precisa cobrir 4 edge cases que correspondem a criterios de aceite do PRD: CA-03
  (`--dry-run`), CA-06 (Step 7 soft-fail), CA-07 (backup-fail gate), CA-08 (Windows tier-3
  copy-with-hook). Sem esses 4, a fase-04 nao satisfaz MH-03 / SH-03.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
