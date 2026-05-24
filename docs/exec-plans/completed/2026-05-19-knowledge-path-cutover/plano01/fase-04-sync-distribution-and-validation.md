<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 04: Sync Distribution + Validacao Bloqueante

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~1h
**Depende de:** fase-01 (`knowledge/` existe na raiz), fase-03 (paths corretos em copy-knowledge.ts)
**Visual:** false

---

## O que esta fase entrega

`sync-to-global.sh` passa a copiar `knowledge/` para o cache global e valida que AMBAS as stacks
canonicas (`nodejs-typescript` E `rails`) estao presentes apos a copia — falhando com `exit 1` se
qualquer uma estiver ausente. CA-03, CA-04 e CA-16 verificados.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/sync-to-global.sh` | Modify | Adicionar `copy_dir_if_exists` para `knowledge/` + pos-sync sanity check |

---

## Implementacao

### Passo 1: Escrever teste de smoke para o sync (RED — CA-04)

O script bash nao e facilmente testavel via bun:test. Usar abordagem de smoke test manual
documentada no checklist. Para a verificacao automatizada, o teste RED/GREEN e feito via
observacao do comportamento do script.

Alternativa: criar um script de teste bash minimalista que simula o check:

```bash
# tests/smoke/sync-validation.sh
# 2026-05-20 (Luiz/dev): D4/AR-02 do PRD knowledge-path-cutover — verifica que o check
# pós-sync detecta ausência de stack e retorna exit 1.
# Rodar: bash tests/smoke/sync-validation.sh

set -e
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Simular cache global sem knowledge/rails/INDEX.md (apenas nodejs-typescript)
mkdir -p "$TMPDIR/knowledge/nodejs-typescript"
touch "$TMPDIR/knowledge/nodejs-typescript/INDEX.md"
# rails/ ausente propositalmente

# Executar o check do sync (extraido do script)
PLUGIN_GLOBAL="$TMPDIR"
KNOWLEDGE_STACKS=("nodejs-typescript" "rails")
SYNC_OK=true
for stack in "${KNOWLEDGE_STACKS[@]}"; do
  if [ ! -f "$PLUGIN_GLOBAL/knowledge/$stack/INDEX.md" ]; then
    echo "ERRO: Sync incompleto — knowledge/$stack/INDEX.md ausente no cache global."
    SYNC_OK=false
  fi
done

if [ "$SYNC_OK" = "false" ]; then
  echo "TEST PASSED: script detectou ausencia e reportaria exit 1"
  exit 0
else
  echo "TEST FAILED: script deveria ter detectado ausencia de rails"
  exit 1
fi
```

### Passo 2: Adicionar copy_dir_if_exists para knowledge/ no sync

No arquivo `scripts/sync-to-global.sh`, localizar o bloco de diretorios (linhas 71-84):

```bash
# --- Diretorios (existiam em v5; sempre presentes) ---
copy_dir_if_exists "$PLUGIN_DEV/skills"  "$PLUGIN_GLOBAL/skills"  "skills/"
copy_dir_if_exists "$PLUGIN_DEV/hooks"   "$PLUGIN_GLOBAL/hooks"   "hooks/"
copy_dir_if_exists "$PLUGIN_DEV/agents"  "$PLUGIN_GLOBAL/agents"  "agents/"
copy_dir_if_exists "$PLUGIN_DEV/rules"   "$PLUGIN_GLOBAL/rules"   "rules/"
copy_dir_if_exists "$PLUGIN_DEV/config"  "$PLUGIN_GLOBAL/config"  "config/"
copy_dir_if_exists "$PLUGIN_DEV/templates" "$PLUGIN_GLOBAL/templates" "templates/"

# --- Diretorios novos em v6 ---
# 2026-05-12: docs/ do plugin eh dog-food (D20), NAO eh distribuivel - NAO copiado (decisao 09-A3)
# 2026-05-12: scripts/ tem validators TS+bun que o usuario pode rodar...
copy_dir_if_exists "$PLUGIN_DEV/scripts" "$PLUGIN_GLOBAL/scripts" "scripts/"
copy_dir_if_exists "$PLUGIN_DEV/.github" "$PLUGIN_GLOBAL/.github" ".github/"
copy_dir_if_exists "$PLUGIN_DEV/tests/fixtures" "$PLUGIN_GLOBAL/tests/fixtures" "tests/fixtures/"
```

**Adicionar apos os diretorios novos em v6 (apos linha de tests/fixtures), ANTES do bloco de arquivos da raiz:**

```bash
# --- Runtime assets (v6.6.0+) ---
# 2026-05-20 (Luiz/dev): D1/D4 do PRD knowledge-path-cutover — knowledge/ e runtime asset
# consumido por /init (copy-knowledge.ts). NAO e dog-food: deve ser distribuido. docs/knowledge/
# foi o path original; agora vive em knowledge/ na raiz (git mv preservou linhagem).
copy_dir_if_exists "$PLUGIN_DEV/knowledge" "$PLUGIN_GLOBAL/knowledge" "knowledge/"
```

### Passo 3: Adicionar pos-sync sanity check (bloqueante — MH-03, AR-02)

Imediatamente apos o bloco de `copy_dir_if_exists`, antes do bloco de arquivos da raiz,
adicionar:

```bash
# --- Pos-sync sanity check: ambas stacks canonicas devem estar presentes ---
# 2026-05-20 (Luiz/dev): D4/AR-02 do PRD knowledge-path-cutover — CH-02 promovido para MH-03.
# Verifica AMBAS stacks (nodejs-typescript E rails) para detectar drift assimetrico.
# CA-04 (exit 1 se nodejs-typescript ausente) + CA-16 (exit 1 se rails ausente).
KNOWLEDGE_SYNC_OK=true
for _kstack in "nodejs-typescript" "rails"; do
  if [ ! -f "$PLUGIN_GLOBAL/knowledge/$_kstack/INDEX.md" ]; then
    echo "ERRO: Sync incompleto — knowledge/$_kstack/INDEX.md ausente no cache global."
    KNOWLEDGE_SYNC_OK=false
  fi
done

if [ "$KNOWLEDGE_SYNC_OK" = "false" ]; then
  echo "Sync abortado — corrija knowledge/ e re-execute sync-to-global.sh"
  exit 1
fi
```

**Posicionamento no arquivo:** O bloco deve ficar APOS `copy_dir_if_exists "$PLUGIN_DEV/knowledge" ...`
e ANTES do bloco de arquivos individuais da raiz (`copy_file_if_exists "$PLUGIN_DEV/CLAUDE.md" ...`).
O sync deve abortar antes de tentar copiar arquivos individuais se a knowledge ficar incompleta.

### Passo 4: Verificar estrutura final do sync

O bloco completo do sync (diretorios) deve ter esta forma:

```bash
# --- Diretorios (existiam em v5; sempre presentes) ---
copy_dir_if_exists "$PLUGIN_DEV/skills"    "$PLUGIN_GLOBAL/skills"    "skills/"
copy_dir_if_exists "$PLUGIN_DEV/hooks"     "$PLUGIN_GLOBAL/hooks"     "hooks/"
copy_dir_if_exists "$PLUGIN_DEV/agents"    "$PLUGIN_GLOBAL/agents"    "agents/"
copy_dir_if_exists "$PLUGIN_DEV/rules"     "$PLUGIN_GLOBAL/rules"     "rules/"
copy_dir_if_exists "$PLUGIN_DEV/config"    "$PLUGIN_GLOBAL/config"    "config/"
copy_dir_if_exists "$PLUGIN_DEV/templates" "$PLUGIN_GLOBAL/templates" "templates/"

# --- Diretorios novos em v6 ---
# docs/ NAO copiado (dog-food, decisao 09-A3)
copy_dir_if_exists "$PLUGIN_DEV/scripts"        "$PLUGIN_GLOBAL/scripts"        "scripts/"
copy_dir_if_exists "$PLUGIN_DEV/.github"        "$PLUGIN_GLOBAL/.github"        ".github/"
copy_dir_if_exists "$PLUGIN_DEV/tests/fixtures" "$PLUGIN_GLOBAL/tests/fixtures" "tests/fixtures/"

# --- Runtime assets (v6.6.0+) ---
# 2026-05-20 (Luiz/dev): D1/D4 do PRD knowledge-path-cutover — knowledge/ = runtime, distribuivel
copy_dir_if_exists "$PLUGIN_DEV/knowledge" "$PLUGIN_GLOBAL/knowledge" "knowledge/"

# --- Pos-sync sanity check ---
# [bloco do passo 3 acima]
```

### Passo 5: Testar o sync localmente (smoke test manual)

```bash
bash F:\Projetos\Anti-Vibe-Coding\scripts\sync-to-global.sh
```

Verificar no output:
- `  + knowledge/` aparece na lista de copies
- Nenhum `ERRO: Sync incompleto` (knowledge esta completa no dev)

Verificar que o cache global foi atualizado:

```bash
ls /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/
```

Resultado esperado: `nodejs-typescript  rails` (ou equivalente).

### Passo 6: Testar CA-04 (simular cache incompleto)

```bash
# Remover INDEX.md de nodejs-typescript do cache para testar exit 1
rm /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/nodejs-typescript/INDEX.md
# Re-rodar sync — deve falhar
bash F:\Projetos\Anti-Vibe-Coding\scripts\sync-to-global.sh
echo "Exit code: $?"
```

Resultado esperado: `ERRO: Sync incompleto — knowledge/nodejs-typescript/INDEX.md ausente` + `exit 1`.

Restaurar: re-rodar o sync normalmente.

### Passo 7: Commitar

```bash
git add scripts/sync-to-global.sh
git commit -m "feat: add knowledge/ distribution + blocking post-sync check for both canonical stacks"
```

---

## Gotchas

- **G7 do plano (AMBAS stacks, nao apenas nodejs-typescript):** O snippet original do PRD secao "Mecanismo 3" validava apenas `nodejs-typescript`. MH-03 (promovido de CH-02) exige AMBAS. O loop `for _kstack in "nodejs-typescript" "rails"` cobre isso. Se novas stacks forem adicionadas no futuro, atualizar o loop manualmente (ou usar CH-03: `.matrix-manifest.json` — fora de escopo deste plano).

- **Local (set -u no sync):** O script tem `set -u` (erro em var nao-definida). A variavel `KNOWLEDGE_SYNC_OK` deve ser inicializada antes do loop. O snippet acima ja inicializa com `true`.

- **Local (nao usar set -e no sync):** O script NAO usa `set -e` propositalmente ("queremos tolerar falhas de cp em paths opcionais" — comentario no topo). O check bloqueante usa `exit 1` explicito apos o loop, nao depende de `set -e`.

- **Local (posicionamento do check):** O check pos-sync deve ficar APOS o `copy_dir_if_exists knowledge` E ANTES dos `copy_file_if_exists`. Se colocado antes do copy, o check sempre falhara em execucao fresh.

---

## Verificacao

### TDD

- [ ] **RED (smoke test):** Script de smoke `tests/smoke/sync-validation.sh` falha quando `rails/INDEX.md` ausente (exit 1)
  - Comando: `bash tests/smoke/sync-validation.sh`
  - Resultado esperado: "TEST PASSED: script detectou ausencia e reportaria exit 1" (exit 0 do smoke test)

- [ ] **GREEN:** Sync completo funciona sem erros
  - Comando: `bash scripts/sync-to-global.sh`
  - Resultado esperado: `+ knowledge/` no output, sem `ERRO`, sem exit 1

### Checklist

- [ ] `grep "knowledge" scripts/sync-to-global.sh` mostra a nova linha `copy_dir_if_exists`
- [ ] `grep "KNOWLEDGE_SYNC_OK" scripts/sync-to-global.sh` mostra o loop de validacao
- [ ] `bash scripts/sync-to-global.sh` executa sem erro (CA-03)
- [ ] Cache global contem `knowledge/nodejs-typescript/INDEX.md` apos sync (CA-03)
- [ ] Cache global contem `knowledge/rails/INDEX.md` apos sync (CA-16)
- [ ] Remover `nodejs-typescript/INDEX.md` do cache + re-rodar sync → exit 1 com mensagem `ERRO: Sync incompleto` (CA-04)
- [ ] Remover `rails/INDEX.md` do cache + re-rodar sync → exit 1 mencionando `rails` (CA-16)
- [ ] Sync idempotente: rodar 2x produz mesmo resultado sem erros

---

## Criterio de Aceite

**CA-03 (sync distribuiu):**
```bash
ls /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/nodejs-typescript/INDEX.md
```
Arquivo existe (exit 0).

**CA-04 (sync valida bloqueante):**
```bash
# Simular cache incompleto
rm /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/nodejs-typescript/INDEX.md
bash scripts/sync-to-global.sh
echo "Exit: $?"
```
Output contem `ERRO: Sync incompleto` E exit code e 1.

**CA-16 (sync valida ambas stacks):**
```bash
# Simular apenas rails ausente
rm -rf /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.6.0/knowledge/rails
bash scripts/sync-to-global.sh
echo "Exit: $?"
```
Output contem `ERRO: Sync incompleto — knowledge/rails/INDEX.md ausente` E exit code e 1.

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
