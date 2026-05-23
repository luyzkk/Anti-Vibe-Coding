<!--
Princípio universal #5 — Comment Provenance.
Esta fase regenera artefatos (manifest checksums) — nao modifica codigo de runtime
manualmente. Provenance nao se aplica.
-->

# Fase 04: Regenerar manifest final + gate harness verde (Wave 3 fechada)

**Plano:** 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final
**Sizing:** 0.5h
**Depende de:** fase-01, fase-02, fase-03 (desta plano) + Planos 01, 02, 03 (todas as Waves precisam ter merged seus arquivos para esta fase consolidar checksums)
**Visual:** false

---

## O que esta fase entrega

Checksums SHA-256 regenerados em `plugin-manifest.json` (e `.claude-plugin/plugin.json` se o
script o tocar) para todos os arquivos alterados nas Waves 1-3, gate
`bun run harness:validate && bun run test && bun run typecheck` retornando exit code 0, e
`STATE.md` da Wave 3 atualizado para `ready-for-iterate`. Atende CA-11 + SH-05 — fecha a Wave.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `plugin-manifest.json` | Modify | Regenerado via `bun scripts/generate-manifest.js` — checksums atualizados |
| `.claude-plugin/plugin.json` | Modify (condicional) | Regenerado SE o script de manifest o tocar (verificar diff) |
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/STATE.md` | Modify | Phase: `ready-for-iterate` (ou `completed`, conforme politica do repo). Last Updated: 2026-05-23 |

---

## Implementacao

### Passo 1: Auditoria pre-regen — listar arquivos tocados nas Waves

```bash
git status --porcelain skills/ agents/ AGENTS.md plugin-manifest.json .claude-plugin/plugin.json
```

Confirmar que pelo menos os seguintes arquivos aparecem como modificados (esperado das Waves
1-3):

- `agents/tdd-verifier.md` (Plano 02 — Prove-It Mode)
- `skills/anti-vibe-review/SKILL.md` (Plano 01 fase-02 — deprecation notice)
- `skills/verify-work/SKILL.md` (Plano 01 — consolidacao)
- `skills/tdd-workflow/SKILL.md` (Plano 04 fase-01)
- `skills/plan-feature/SKILL.md` (Plano 04 fase-02)
- `AGENTS.md` (Plano 04 fase-03)
- Compounds editados pelo Plano 03 em `docs/compound/`
- `compound/README.md` (Plano 03) — verificar caminho exato

Anotar a lista no MEMORY como DI-2 (audit log da regen).

### Passo 2: Validacao pre-regen — checksums devem estar STALE (RED)

```bash
bun run harness:validate
```

Resultado esperado: **falha** com mensagem de checksum mismatch para os arquivos alterados.
Isso confirma que o manifest precisa ser regenerado (RED genuino).

> Se `harness:validate` passar SEM regen, alguma Wave anterior nao foi merged nos arquivos
> esperados — INVESTIGAR antes de prosseguir.

### Passo 3: Regenerar manifest (G5)

Chamar o script DIRETO (nao ha `bun run generate:manifest` — registrado no MEMORY GT-1):

```bash
bun scripts/generate-manifest.js
```

Se falhar com erro de runtime tipo "bun: unknown global", tentar com node:

```bash
node scripts/generate-manifest.js
```

Verificar que algo mudou:

```bash
git diff --stat plugin-manifest.json .claude-plugin/plugin.json
```

Resultado esperado: ambos os arquivos (ou pelo menos `plugin-manifest.json`) aparecem com
linhas modificadas. Se NENHUM mudou e os passos 1/2 mostraram arquivos modificados, o script
nao esta detectando as mudancas — INVESTIGAR.

### Passo 4: Idempotencia — regen duas vezes nao gera diff (sanity)

```bash
bun scripts/generate-manifest.js
git diff --stat plugin-manifest.json .claude-plugin/plugin.json
```

Resultado esperado: **nenhum diff novo** (segunda chamada e idempotente). Se houver, ha
non-determinismo no script — bloquear e investigar.

### Passo 5: Gate verde-final (G6)

Substituir `bun run lint` por `bun run typecheck` (script lint nao existe — MEMORY GT-2):

```bash
bun run harness:validate && bun run test && bun run typecheck
```

Resultado esperado: exit code 0 em todos os tres. Em caso de falha em qualquer um, abrir
loop de fix DENTRO desta fase — NAO marcar como completa enquanto algum dos tres retornar
nao-zero. Registrar cada fix como DI-N no MEMORY.

### Passo 6: Atualizar STATE.md

Editar `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/STATE.md`:

- `Phase`: `ready-for-iterate` (ou `completed`, conforme convencao verificada via
  `grep "Phase" docs/STATE.md` global)
- `Last Updated`: `2026-05-23`
- Adicionar nota: "Wave 3 fechada. Manifest regenerado. Gate harness:validate + test + typecheck verde."

---

## Gotchas

- **G5 do plano (GT-1 do MEMORY):** Nao usar `bun run generate:manifest` — nao existe. Usar
  `bun scripts/generate-manifest.js` direto. Se falhar com bun, tentar `node`.
- **G6 do plano (GT-2 do MEMORY):** Nao usar `bun run lint` — nao existe. Usar
  `bun run typecheck` no gate final.
- **G8 do plano:** `harness:validate` falha pre-regen e isso e ESPERADO (Passo 2 e o RED).
  So mover para Passo 3 apos confirmar falha de checksum.
- **Local:** Se outras Waves nao tiverem merged seus arquivos (Plano 01/02/03 ainda pendentes),
  esta fase NAO pode fechar a Wave. Bloqueia ate todos os pre-reqs estarem merged.
- **Local:** Nunca chamar `git reset --hard` para "limpar" um regen ruim — usar
  `git checkout plugin-manifest.json` em arquivos especificos. (Guarda contra acidentes.)

---

## Verificacao

### TDD

- [ ] **RED:** Antes do regen, harness falha por checksum mismatch.
  - Comando: `bun run harness:validate`
  - Resultado esperado: exit code != 0, output mencionando checksum/sha256/mismatch

- [ ] **GREEN:** Apos regen, harness passa.
  - Comando: `bun run harness:validate`
  - Resultado esperado: exit code 0

- [ ] **Idempotencia:** Segunda regen nao gera diff.
  - Comando: `bun scripts/generate-manifest.js && git diff --quiet plugin-manifest.json`
  - Resultado esperado: exit code 0 (nenhum diff)

### Checklist

- [ ] `git diff plugin-manifest.json` mostra apenas mudancas de checksum (nao mudancas estruturais inesperadas)
- [ ] `bun scripts/generate-manifest.js` rodado uma segunda vez NAO gera diff
- [ ] `bun run harness:validate` exit code 0
- [ ] `bun run test` exit code 0
- [ ] `bun run typecheck` exit code 0
- [ ] `STATE.md` da Wave atualizado (Phase + Last Updated)
- [ ] Nenhum arquivo fora do escopo planejado foi tocado (`git status` so mostra os arquivos esperados)
- [ ] PLAN.md global atualizado se necessario (status da Wave 3)

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test && bun run typecheck` retorna exit code 0 em todos os tres
- `bun scripts/generate-manifest.js` em segunda execucao retorna sem modificar `plugin-manifest.json` (`git diff --quiet plugin-manifest.json` retorna 0)
- `git status STATE.md` mostra modificado e `grep "Phase" STATE.md` retorna `Phase: ready-for-iterate` (ou `completed`)

**Por humano:**
- STATE.md reflete Wave 3 fechada e proximos passos (verify-work + iterate) documentados.
- Diff de `plugin-manifest.json` revisado a olho — somente checksums atualizados, nada estrutural anomalo.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
