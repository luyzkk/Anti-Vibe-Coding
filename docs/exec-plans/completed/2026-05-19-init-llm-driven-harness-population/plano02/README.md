# Plano 02: Scaffold expandido + Backup pre-mutacao

**Feature:** init-llm-driven-harness-population ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Plano 01 (registry reordenado + Step 10 renomeado via `git mv`)
**Desbloqueia:** Plano 03 (gerador LLM-driven do PLAN populate — referencia CODE_STYLE.md como doc canonico)

---

## O que este plano entrega

Doc canonico novo `docs/CODE_STYLE.md` adicionado ao scaffold (separa code-style/Akita do
`DESIGN.md` visual — resolve Bug E), `AGENTS.md.tpl` linkando ambos os documentos, e Step 10
reduzido a backup leve (`copyFile` de `CLAUDE.md` raiz para `docs/_legacy/CLAUDE.md.bak`)
sem extracao Akita, sem regex de classificacao, sem transformacao destrutiva. Pipeline pronto
para o gerador LLM-driven do Plano 03 popular o Harness com verdade do projeto.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com Step 91 antes do Step 90 (Bug C resolvido) | Plano 01 fase-01 | pronto |
| Step 10 renomeado para `10-backup-pre-mutation.ts` via `git mv` | Plano 01 fase-04 | pronto |
| Steps 07/08/09/11 removidos do registry + arquivos deletados | Plano 01 fase-02/03 | pronto |
| `TEMPLATE_MANIFEST` exportado de `skills/init/lib/template-manifest.ts` | base | pronto |
| `AGENTS.md.tpl` existente em `skills/init/assets/templates/` | base | pronto |
| Snippets `akita-*.md` existentes em `skills/init/assets/snippets/` | base | pronto (preservados como input do Plano 03) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Doc canonico `docs/CODE_STYLE.md` no scaffold (TEMPLATE_MANIFEST entry) | Plano 03 fase-05 (1 fase do PLAN populate por doc canonico, incluindo CODE_STYLE.md) |
| `AGENTS.md.tpl` linkando `CODE_STYLE.md` ao lado de `DESIGN.md` | Plano 03 fase-03 (renderer cita ambos como destinos canonicos) |
| `10-backup-pre-mutation.ts` com logica leve (`copyFile` CLAUDE.md -> `docs/_legacy/CLAUDE.md.bak`) | Plano 04 fase-02 (backup completo `pre-6.5.0/` reusa primitivos de fs.copy) |
| Snippets `akita-*.md` preservados como inputs reais para sintetizar `CODE_STYLE.md` | Plano 03 fase-03 (instrucao LLM le esses snippets) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-code-style-template-e-manifest.md | Novo template `docs/CODE_STYLE.md.tpl` (scaffold vazio) + entry em `TEMPLATE_MANIFEST` | 1h | — |
| 02 | fase-02-agents-md-link-code-style.md | `AGENTS.md.tpl` lista `CODE_STYLE.md` ao lado de `DESIGN.md` | 0.5h | fase-01 |
| 03 | fase-03-backup-pre-mutation-impl.md | Logica leve do Step 10 (`copyFile` CLAUDE.md -> `docs/_legacy/CLAUDE.md.bak`) | 1.5h | fase-01 |

---

## Grafo de Fases

```
fase-01 (CODE_STYLE.md.tpl + TEMPLATE_MANIFEST entry)
    |
    +-------------+----------------+
    |                              |
    v                              v
fase-02 (AGENTS.md.tpl link)   fase-03 (Step 10 backup leve)
    |                              |
    +-------------+----------------+
                  |
                  v
      (entrega do Plano 02 — destrava Plano 03)
```

**Paralelismo possivel:** fase-02 e fase-03 podem rodar em paralelo apos fase-01 (tocam
arquivos independentes — `AGENTS.md.tpl` e `steps/10-backup-pre-mutation.ts`). Apenas a fase-01
precisa fechar antes pois introduz o template referenciado pelo bullet de fase-02 e habilita
o scaffold completo que fase-03 assume ja existir.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Tracer Bullet ja entregue no Plano 01 fase-01).

**Nota TDD especifica:**
- fase-01 tem ciclo TDD pleno: `scaffold-full-tree.test.ts` ganha assertion nova
  (`expect(files).toContain('docs/CODE_STYLE.md')`) que falha em RED ate o entry novo
  aparecer no `TEMPLATE_MANIFEST`.
- fase-02 e ajuste textual em template `.tpl` — golden test (se existir) atualizado;
  caso contrario assertion direta sobre o output scaffolded.
- fase-03 e o ciclo TDD mais denso do plano: 3 testes novos (greenfield sem CLAUDE.md,
  re-init com CLAUDE.md, dry-run respeitado). Implementacao antiga (`AKITA_HEADING_REGEX`,
  `extractAkitaBlocks`, `applyMergeDestructiveStep`) e substituida por export unico
  `backupPreMutationStep`. Comandos: `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts`.

---

## Gotchas Conhecidos

- **G1:** Categoria do `CODE_STYLE.md` no `TEMPLATE_MANIFEST` e `anti-vibe-extension`,
  NAO `canon-andre`. Razao: os 22 docs canonicos do Andre Prado sao imutaveis por DT-09
  (decisao do PRD do harness). `CODE_STYLE.md` e adicao do Anti-Vibe Coding para resolver
  Bug E (Akita-style misturado com DESIGN.md). Ausencia gera warning (nao erro) no validador.

- **G2:** NAO copiar conteudo dos snippets `akita-*.md` para dentro do `.tpl` na fase-01.
  O template e scaffold canonico VAZIO — populado pelo subagente do PLAN populate (Plano 03
  fase-03 instrui a LLM a sintetizar a partir dos snippets `akita-code-style.md`,
  `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`).
  Os snippets continuam em `skills/init/assets/snippets/` como inputs reais.

- **G3:** `createBackup` do helper `skills/init/lib/backup-anti-vibe.ts` produz backup
  com timestamp em `.anti-vibe/backup/{ts}/` e manifest JSON — esse helper continua valido
  para steps que precisam de backup completo (Plano 04 fase-02). NAO usar aqui:
  o destino do Step 10 e fixo (`docs/_legacy/CLAUDE.md.bak`) e a operacao e simples copia
  (`fs.copyFile`). Misturar os dois mecanismos confunde semantica.

- **G4:** Step 10 deve rodar ANTES de qualquer mkdir/scaffold do Step 01
  (`scaffold-full-tree`). A reordenacao em si ja foi feita no Plano 01 fase-04
  conceitualmente. Aqui apenas validar que `registry.ts` mantem a ordem correta (Step 10
  na posicao certa); se quebrou no Plano 01, sinalizar e ajustar.

- **G5:** Backup nao pode abortar init em caso de permission denied. Comportamento:
  emitir warning via `audit-log-writer` (se disponivel em ctx.flags['__auditLog']) e
  retornar `{ mutated: false, summary: 'init-backup: write failed — ...' }`. Init prossegue.

- **G6:** `docs/_legacy/` pode NAO existir ainda em projeto greenfield —
  `fs.mkdir(legacyDir, { recursive: true })` cobre. Em projetos com `docs/_legacy/`
  preexistente (de `/sync` ou backup anterior), arquivo `CLAUDE.md.bak` e sobrescrito
  (comportamento intencional — backup mais recente vence).

- **G7:** `assets/snippets/design-md-skeleton.md` pode ficar orfao apos fase-03 (so era
  consumido pelo Step 10 antigo). Verificar callers antes de deletar — se nenhum step
  ativo importa, registrar a possivel remocao em `MEMORY.md` Notas para Planos Seguintes
  (Plano 03 fase-03 pode confirmar se ha consumo via instrucao LLM e decidir o destino).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
