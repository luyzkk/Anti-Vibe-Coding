<!--
Esta fase eh o GATING do plano 08 — valida tudo + faz delete final dos arquivos legacy.
Nao gera codigo novo; invoca validadores ja existentes (Plano 04).
-->

# Fase 08: Validar dog-food + delete final dos arquivos legacy

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~1h
**Depende de:** fase-04, 05, 06, 07 (todos completos)
**Visual:** false

---

## O que esta fase entrega

`bun run harness:validate && bun run compound:check` no plugin retornam **exit 0** (atende CA-04 e CA-05). Arquivos legacy (`CLAUDE.md` original 346 linhas, `lessons-learned.md`, `senior-principles.md`, `decisions.md`) **deletados da raiz** apos confirmacao verde, com originais permanecendo em `.planning.v5-backup/` (criados em fase-01). `package.json` ganha scripts `harness:validate`, `compound:check`, `state:regenerate`. Symlink/copy `CLAUDE.md → AGENTS.md` instalado via 3-tier fallback (D16/R1). TODO.md inicial criado.

**Tracer Bullet deste plano:** esta fase. Prova D20 (dog-food) end-to-end.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/package.json` | Modify | Adicionar scripts `harness:validate`, `compound:check`, `state:regenerate` |
| `anti-vibe-coding/CLAUDE.md` | **Delete original + Create symlink/copy** | Original (346 linhas) move para `.planning.v5-backup/CLAUDE.md.original` ja existe; raiz recebe symlink → AGENTS.md (ou copy + hook fallback) |
| `anti-vibe-coding/lessons-learned.md` | **Delete** | Backup em `.planning.v5-backup/lessons-learned.md.original` ja existe (fase-01); originais migrados em fase-05 |
| `anti-vibe-coding/senior-principles.md` | **Delete** | Backup ja existe; migrado em fase-06 |
| `anti-vibe-coding/decisions.md` | **Delete** | Backup ja existe; migrado em fase-07 |
| `anti-vibe-coding/.github/workflows/harness.yml` | Create | Copia do template de Plano 02 fase-04 — CI roda harness:validate em PRs |
| `anti-vibe-coding/.github/pull_request_template.md` | Create | Copia do template de Plano 02 fase-04 |
| `anti-vibe-coding/TODO.md` | Create | Skeleton via helper de Plano 07 + 2 itens iniciais (08-A4) |
| `anti-vibe-coding/docs/STATE.md` | Create (via generator) | Regenerado por `bun run state:regenerate` (helper de Plano 06 fase-03) |

---

## Implementacao

### Passo 1: Atualizar `package.json` com novos scripts

```json
{
  "name": "anti-vibe-coding",
  "version": "5.3.0",
  "type": "module",
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "harness:validate": "bun scripts/harness-validate.ts .",
    "compound:check": "bun scripts/compound-check.ts .",
    "state:regenerate": "bun scripts/state-md-regenerate.ts ."
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/bun": "latest"
  }
}
```

Nota: `version` ainda em 5.3.0 — bump para 6.0.0 acontece em **Plano 09 fase-01** (release). Plano 08 valida estrutura em v5.3.0+ infra.

### Passo 2: Rodar validadores ANTES de deletar legacy files

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Validacao 1: harness
bun run harness:validate
# Esperado: exit 0

# Validacao 2: compound
bun run compound:check
# Esperado: exit 0

# Se algum falhar, NAO deletar nada — rollback e investigar
```

**Politica de rollback nesta fase:** se qualquer validador exit !=0, **abortar fase-08**. NAO deletar arquivos legacy. Diagnosticar (qual fase regrediu?), `git bisect` entre snapshots de fases 04-07 se necessario, ajustar fase, re-rodar.

### Passo 3: Validacoes mecanicas adicionais (G8 do README)

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# G8.1 — AGENTS.md ≤40 linhas
[ "$(wc -l < AGENTS.md)" -le 40 ] && echo "G8.1 OK" || echo "G8.1 FAIL"

# G8.2-5 — 4 docs Camada 2 existem
for f in docs/PIPELINE.md docs/MODEL_PROFILES.md docs/AGENTS_LIST.md docs/UPGRADE.md; do
  [ -f "$f" ] && echo "G8.x OK $f" || echo "G8.x FAIL $f"
done

# G8.6 — core-beliefs.md existe e nao eh stub
[ -f docs/design-docs/core-beliefs.md ] && [ "$(wc -l < docs/design-docs/core-beliefs.md)" -gt 50 ] && echo "G8.6 OK" || echo "G8.6 FAIL"

# G8.7 — compound notes >= 4
[ "$(find docs/compound/ -name '*.md' -not -name 'README.md' | wc -l)" -ge 4 ] && echo "G8.7 OK" || echo "G8.7 FAIL"

# Extra — ADR-0001 existe
[ -f docs/design-docs/ADR-0001-manifest-checksums.md ] && echo "ADR OK" || echo "ADR FAIL"

# Extra — exec-plans/completed/ tem 3 PRDs migrados
[ "$(ls docs/exec-plans/completed/*.md 2>/dev/null | wc -l)" -eq 3 ] && echo "EXEC-PLANS OK" || echo "EXEC-PLANS FAIL"
```

**Se tudo OK**, prosseguir para Passo 4.
**Se algum FAIL**, abortar fase e diagnosticar.

### Passo 4: Delete dos arquivos legacy + symlink CLAUDE.md → AGENTS.md

Este eh o passo mais arriscado — **execute apos confirmacao de Passo 2 e 3 verdes**.

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Backup adicional via git antes do delete (paranoia justificada — G2 do README)
git add -A && git commit -m "wip(plano08-fase08): pre-delete-snapshot" --allow-empty

# Delete legacy files (backups em .planning.v5-backup/ desde fase-01)
rm lessons-learned.md
rm senior-principles.md
rm decisions.md
rm CLAUDE.md  # original 346 linhas; backup em .planning.v5-backup/CLAUDE.md.original

# Symlink CLAUDE.md → AGENTS.md com 3-tier fallback (D16 + R1 + CA-11)
# Tier 1: POSIX symlink
ln -s AGENTS.md CLAUDE.md 2>/dev/null && echo "Tier 1 (ln -s) OK" && exit 0

# Tier 2: Windows hard link (NTFS, no admin needed)
cmd.exe /c "mklink /H CLAUDE.md AGENTS.md" 2>/dev/null && echo "Tier 2 (mklink /H) OK" && exit 0

# Tier 3: copy + hook PostToolUse re-syncs on AGENTS.md edits
cp AGENTS.md CLAUDE.md && echo "Tier 3 (copy) OK — manual sync needed on AGENTS.md edits"
# Hook hooks/agents-md-sync.cjs (NAO criado nesta fase — defer ou Plano 02 fase-03 ja criou)
# Verificar se hook existe; se nao, escrever em TODO.md item
```

**No Windows 11 (env atual), Tier 1 falha tipicamente. Tier 2 (NTFS hard link) funciona sem admin.** Documentar resultado em commit.

### Passo 5: Criar TODO.md inicial (08-A4)

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

cat > TODO.md <<'EOF'
# TODO

- [ ] {2026-05-11} {file:anti-vibe-coding/IMPLEMENTACAO-VERSIONAMENTO.md} consolidate IMPLEMENTACAO-VERSIONAMENTO.md + MUDANCAS-RECENTES.md + INSTRUCOES-SINCRONIZACAO.md + COMO-ATUALIZAR.md into docs/UPGRADE.md and docs/HISTORY.md (08-A5)
- [ ] {2026-05-11} {feature:plugin} verify hooks/state-md-hook.cjs is firing correctly on docs/ edits (G15)
- [ ] {2026-05-11} {feature:plugin} v6.1 — implement hooks/pre-tool-use-destructive-guard.cjs (D29 item 7, deferred from plano08-fase01 audit)
EOF
```

### Passo 6: Criar `.github/workflows/harness.yml` + `.github/pull_request_template.md`

Copiar do template gerado por Plano 02 fase-04 (08-A6). Se template ainda nao existe (executando fora de ordem), criar minimo:

```bash
mkdir -p anti-vibe-coding/.github/workflows

cat > anti-vibe-coding/.github/workflows/harness.yml <<'EOF'
name: Harness Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run harness:validate
      - run: bun run compound:check
EOF

cat > anti-vibe-coding/.github/pull_request_template.md <<'EOF'
## Summary
- ...

## Validation
- [ ] `bun run test` passes
- [ ] `bun run harness:validate` exit 0
- [ ] `bun run compound:check` exit 0 (if compound notes touched)
- [ ] CHANGELOG.md entry added (for user-facing changes)
EOF
```

### Passo 7: Regenerar STATE.md inicial

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
bun run state:regenerate
# Helper de Plano 06 fase-03 le filesystem e gera docs/STATE.md
cat docs/STATE.md   # validacao manual: deve listar Resources/Recent Activity/Pending
```

### Passo 8: Validacao FINAL

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Re-rodar validadores apos delete (estado final)
bun run harness:validate && echo "FINAL harness:validate OK"
bun run compound:check && echo "FINAL compound:check OK"

# Verificar CLAUDE.md aponta para AGENTS.md
file CLAUDE.md   # esperado: symlink/hard link/file (3 tiers)
diff CLAUDE.md AGENTS.md   # esperado: vazio (mesmo conteudo se Tier 3, mesmo arquivo se Tier 1/2)

# Verificar legacy files realmente deletados
[ ! -f lessons-learned.md ] && echo "lessons-learned.md deleted OK"
[ ! -f senior-principles.md ] && echo "senior-principles.md deleted OK"
[ ! -f decisions.md ] && echo "decisions.md deleted OK"

# Verificar backups intactos
ls -la .planning.v5-backup/   # esperado: 4 arquivos .original
```

### Passo 9: Commit final

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

git add -A
git commit -m "feat(plano08): dog-food complete — anti-vibe-coding/ now uses v6 harness structure (CA-01..CA-05, D20)

- AGENTS.md (32 lines, EN) replaces CLAUDE.md as agent index
- CLAUDE.md is now symlink/hard link to AGENTS.md (D16, 3-tier fallback for Windows)
- 5 compound notes generated from lessons-learned.md (CA-03)
- senior-principles.md → docs/design-docs/core-beliefs.md (D29 #10)
- decisions.md → docs/design-docs/ADR-0001-manifest-checksums.md (CA-15)
- 3 historical PRDs migrated to docs/exec-plans/completed/ with D18 10 sections (CA-02)
- 8 institutional docs in docs/ (DESIGN, FRONTEND, PLANS, PRODUCT_SENSE, QUALITY_SCORE, RELIABILITY, SECURITY, COMPOUND_ENGINEERING)
- 4 plugin-doc files (PIPELINE, MODEL_PROFILES, AGENTS_LIST, UPGRADE)
- harness:validate + compound:check exit 0
- Backups preserved in .planning.v5-backup/

Closes plano08 of v6.0.0 PRD."
```

### Passo 10: Squash commits do plano (opcional, recomendado)

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
# Identificar quantos commits adicionados em plano08 (8 fases + alguns wip)
git log --oneline | grep -E 'plano08|wip' | wc -l

# Squash interativo se desejar consolidar
git rebase -i HEAD~{N}   # marcar todos exceto o primeiro como `s` (squash)
```

Opcional — pode manter granularidade para audit trail.

---

## Gotchas

- **G1 do README (R4 — backup):** Backups em `.planning.v5-backup/` desde fase-01 sao a rede de seguranca. Mesmo apos delete, recover via `cp .planning.v5-backup/CLAUDE.md.original CLAUDE.md`. Esta pasta esta em `.gitignore` (nao polui o repo do plugin).
- **G2 do README (CLAUDE.md live):** Apos Passo 4, sessoes Claude Code futuras leem CLAUDE.md = AGENTS.md (32 linhas), nao mais o monstro de 346 linhas. **Mudanca de comportamento real.** Documentar em CHANGELOG (Plano 09).
- **G3 do README (symlink Windows):** Em Windows 11 sem developer mode (env atual), Tier 1 (ln -s) provavelmente falha; Tier 2 (mklink /H) deve funcionar em NTFS. Documentar resultado real no MEMORY.md desta fase.
- **G15 do README (hook STATE.md):** Apos Passo 7, hook state-md-hook.cjs (instalado em Plano 06 fase-04) comeca a regenerar STATE.md automaticamente. Validar com timestamp do arquivo apos edits subsequentes.
- **Local (validacao antes de delete):** Critico. Passo 2 e 3 sao gates absolutos antes de Passo 4. NAO pular essa ordem.
- **Local (TODO.md initial — itens reais):** 3 itens propostos sao reais e acionaveis. Plano 07 fase-04 ensina `/execute-plan` a adicionar itens out-of-scope a TODO.md durante outras tasks — entao a TODO.md vai crescer organicamente.
- **Local (`.gitignore` ja inclui .planning.v5-backup/):** Adicionado em fase-01 Passo 2.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` exit 0
- [ ] `bun run compound:check` exit 0
- [ ] `[ ! -f anti-vibe-coding/lessons-learned.md ] && [ ! -f anti-vibe-coding/senior-principles.md ] && [ ! -f anti-vibe-coding/decisions.md ]` — 3 legacy files deletados
- [ ] `file anti-vibe-coding/CLAUDE.md` retorna symlink OU hard link OU regular file (3-tier)
- [ ] `diff anti-vibe-coding/CLAUDE.md anti-vibe-coding/AGENTS.md` retorna vazio (ou ambos sao o mesmo inode em Tier 1/2)
- [ ] `ls anti-vibe-coding/.planning.v5-backup/` lista 4 `.original` files (intactos)
- [ ] `cat anti-vibe-coding/package.json | grep -E 'harness:validate|compound:check|state:regenerate'` retorna 3 matches
- [ ] `test -f anti-vibe-coding/.github/workflows/harness.yml`
- [ ] `test -f anti-vibe-coding/TODO.md && [ "$(wc -l < anti-vibe-coding/TODO.md)" -ge 3 ]`
- [ ] `test -f anti-vibe-coding/docs/STATE.md && grep -c '^## ' anti-vibe-coding/docs/STATE.md` ≥ 3 (Resources/Recent Activity/Pending)
- [ ] `git log --oneline | head -3` mostra commits do plano08 limpos

---

## Criterio de Aceite

**Por maquina (gating do plano):**
- `bun run harness:validate` exit 0 (CA-04)
- `bun run compound:check` exit 0 (CA-05)
- Validacoes G8 (G8.1-G8.7 do README) todas passam
- `lessons-learned.md`, `senior-principles.md`, `decisions.md` removidos
- `CLAUDE.md` aponta para `AGENTS.md` (symlink/hard link/copy)
- Backups intactos em `.planning.v5-backup/`

**Por humano:**
- Sessao Claude Code aberta apos esta fase le `CLAUDE.md = AGENTS.md` (32 linhas) — contexto inicial reduz drasticamente
- Plano 09 (release) pode prosseguir com confianca que dog-food funciona

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
