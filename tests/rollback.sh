#!/bin/bash
# 2026-05-12 (Luiz/dev): teste de rollback para CA-36
# Roda contra HEAD assumindo que HEAD eh o release commit final do v6.0.0.
# Cria branch temporario, aplica revert, valida estado v5.3.x, retorna ao HEAD.

set -u

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PLUGIN_DIR" || exit 1

REPORT="$PLUGIN_DIR/tests/rollback-report.md"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD_SHA=$(git rev-parse HEAD)
INITIAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Determinar quantos commits voltar — 7 commits do release v6.0.0 (em ordem cronologica):
#   1) fase-01 chore(release): bump version to 6.0.0
#   2) fase-02 docs(changelog): add 6.0.0 section
#   3) fase-03 chore(manifest): regenerate plugin-manifest.json
#   4) fix(manifest): restore skills.todo-pick + test guard
#   5) fase-04 chore(sync): update sync-to-global.sh for 6.0.0
#   6) chore(release): finalize 6.0.0 release date (sed XX-XX)
#   7) test(release): add rollback validation + report (este commit)
# Override via REVERT_COUNT env var para hotfixes futuros.
REVERT_COUNT="${REVERT_COUNT:-7}"

# 2026-05-12 (Luiz/dev): branch temp para nao tocar em main
TEMP_BRANCH="release-test/rollback-v6.0.0-$$"

echo "# Rollback Test Report — v6.0.0" > "$REPORT"
echo "" >> "$REPORT"
echo "**Date:** $NOW" >> "$REPORT"
echo "**HEAD:** $HEAD_SHA" >> "$REPORT"
echo "**Initial branch:** $INITIAL_BRANCH" >> "$REPORT"
echo "**Revert count:** $REVERT_COUNT commits" >> "$REPORT"
echo "" >> "$REPORT"

fail() {
  echo "FAIL: $1" | tee -a "$REPORT"
  echo "" >> "$REPORT"
  git checkout "$INITIAL_BRANCH" 2>/dev/null
  git branch -D "$TEMP_BRANCH" 2>/dev/null
  exit 1
}

pass() {
  echo "PASS: $1" | tee -a "$REPORT"
}

# === SETUP: branch temp ===
git checkout -b "$TEMP_BRANCH" || fail "Cannot create temp branch"

# === LEVEL 1: Mecanico (git revert sem conflito) ===
echo "" >> "$REPORT"
echo "## Level 1: Mecanico (git revert)" >> "$REPORT"
echo "" >> "$REPORT"

# Reverter ultimos N commits em ordem reversa via range syntax (git >= 1.7.2).
# `git revert HEAD~N..HEAD` reverte cada commit do range em ordem reversa,
# criando N commits de revert individuais (mais limpo que loop `revert HEAD`
# que oscila entre revert/reapply).
if ! git revert --no-edit "HEAD~${REVERT_COUNT}..HEAD" 2>/dev/null; then
  fail "Level 1: conflito em revert HEAD~${REVERT_COUNT}..HEAD"
fi

pass "Level 1: revert dos $REVERT_COUNT commits sem conflito"

# === LEVEL 2: Estrutural (estado equivale a v5.3.x) ===
echo "" >> "$REPORT"
echo "## Level 2: Estrutural" >> "$REPORT"
echo "" >> "$REPORT"

# Helper: extrai .version de JSON via node (jq nao disponivel em Windows Git Bash)
get_json_version() {
  node -e "try { console.log(JSON.parse(require('fs').readFileSync('$1')).version || 'MISSING') } catch(e) { console.log('MISSING') }"
}

# 2.1 — package.json version voltou para 5.3.0
PKG_VER=$(get_json_version package.json)
if [ "$PKG_VER" = "5.3.0" ]; then
  pass "Level 2.1: package.json version = 5.3.0"
else
  fail "Level 2.1: package.json version = $PKG_VER (esperado 5.3.0)"
fi

# 2.2 — plugin-manifest.json version voltou para 5.3.0
MANIFEST_VER=$(get_json_version plugin-manifest.json)
if [ "$MANIFEST_VER" = "5.3.0" ]; then
  pass "Level 2.2: plugin-manifest.json version = 5.3.0"
else
  fail "Level 2.2: plugin-manifest.json version = $MANIFEST_VER (esperado 5.3.0)"
fi

# 2.3 — .claude-plugin/plugin.json version voltou
PLUGIN_VER=$(get_json_version .claude-plugin/plugin.json)
if [ "$PLUGIN_VER" = "5.3.0" ]; then
  pass "Level 2.3: .claude-plugin/plugin.json version = 5.3.0"
else
  fail "Level 2.3: .claude-plugin/plugin.json version = $PLUGIN_VER (esperado 5.3.0)"
fi

# 2.4 — CHANGELOG.md NAO tem secao 6.0.0
if grep -q "^## \[6.0.0\]" CHANGELOG.md; then
  fail "Level 2.4: CHANGELOG ainda tem secao 6.0.0 (revert nao removeu)"
else
  pass "Level 2.4: CHANGELOG sem secao 6.0.0"
fi

# 2.5 — sync-to-global.sh aponta para 5.x (nao 6.0.0)
if grep -q '6\.0\.0' scripts/sync-to-global.sh; then
  fail "Level 2.5: sync-to-global.sh ainda menciona 6.0.0"
else
  pass "Level 2.5: sync-to-global.sh sem referencia a 6.0.0"
fi

# === LEVEL 3: Funcional (fixture legacy-v5 ainda detectada) ===
echo "" >> "$REPORT"
echo "## Level 3: Funcional" >> "$REPORT"
echo "" >> "$REPORT"

# 2026-05-12 (Luiz/dev): Level 3 eh sanity check; valida que estado revertido tem ferramentas v5
# (skills, hooks). NAO roda /init real (nao executavel em CI). Apenas confirma que arquivos
# v5 essenciais estao presentes apos revert.

# 3.1 — skill init/SKILL.md existe (skills nao foram deletadas; sao trabalho permanente)
[ -f skills/init/SKILL.md ] && pass "Level 3.1: skills/init/SKILL.md presente" || fail "Level 3.1: skill /init perdida"

# 3.2 — fixture legacy-v5 ainda existe (criada em Plano 03 fase-07, deveria sobreviver ao revert
#       PORQUE Plano 03 foi committed ANTES dos 5 commits do release)
[ -d tests/fixtures/legacy-v5 ] && pass "Level 3.2: tests/fixtures/legacy-v5 presente" || fail "Level 3.2: fixture perdida"

# 3.3 — manifest do plugin tem entradas v5.3.0
ENTRY_VER=$(node -e "try { const m=JSON.parse(require('fs').readFileSync('plugin-manifest.json')); console.log((m.files && m.files['skills/init/SKILL.md'] && m.files['skills/init/SKILL.md'].version) || 'MISSING') } catch(e) { console.log('MISSING') }")
if [ "$ENTRY_VER" = "5.3.0" ]; then
  pass "Level 3.3: skill /init registrada como v5.3.0"
else
  fail "Level 3.3: skill /init com versao errada: $ENTRY_VER"
fi

# === CLEANUP: voltar para branch original ===
echo "" >> "$REPORT"
echo "## Cleanup" >> "$REPORT"
echo "" >> "$REPORT"

git checkout "$INITIAL_BRANCH" || fail "Cannot return to $INITIAL_BRANCH"
git branch -D "$TEMP_BRANCH" || echo "Warning: temp branch nao removido"

pass "Cleanup: branch temp removido, voltei para $INITIAL_BRANCH"

# === REPORT FINAL ===
echo "" >> "$REPORT"
echo "## Result" >> "$REPORT"
echo "" >> "$REPORT"
echo "**ALL CHECKPOINTS PASSED**" >> "$REPORT"
echo "" >> "$REPORT"
echo "Release v6.0.0 is reversible via \`git revert HEAD~$REVERT_COUNT..HEAD\`." >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "==============================="
echo "ROLLBACK TEST: ALL PASS"
echo "Report: $REPORT"
echo "==============================="
