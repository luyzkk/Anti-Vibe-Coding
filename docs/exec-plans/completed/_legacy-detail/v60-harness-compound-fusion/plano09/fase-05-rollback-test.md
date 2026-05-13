<!--
Princípio universal #5 — Comment Provenance.
Provenance comments aplicaveis nos checkpoints do teste de rollback que tomam decisoes
nao-obvias sobre tolerancia/escopo do revert.
-->

# Fase 05: Rollback Test + Tag `v6.0.0`

**Plano:** 09 — Versioning & Release
**Sizing:** 1.5h
**Depende de:** fase-01 + fase-02 + fase-03 + fase-04 (precisa de TODOS os commits do release para reverter como bloco)
**Visual:** false

---

## O que esta fase entrega

Validacao automatica de CA-36 ("`git revert` do release commit retorna o repo a estado v5.3.x funcional") via 3 niveis de teste (mecanico, estrutural, funcional). Substituicao da data `2026-XX-XX` por data real do release. Tag git anotada `v6.0.0` criada **apenas se** todos os checkpoints passarem. Gera relatorio `tests/rollback-report.md` com PASS/FAIL por checkpoint.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/tests/rollback.sh` | Create | Script bash que executa o teste de rollback em 3 niveis. Reutilizavel para hot-fixes v6.0.x. |
| `anti-vibe-coding/tests/rollback-report.md` | Create | Relatorio gerado por `rollback.sh` com PASS/FAIL por checkpoint, timestamp, SHA do commit testado. |
| `anti-vibe-coding/CHANGELOG.md` | Modify | Substituir `2026-XX-XX` no header da secao 6.0.0 por data real (`date +%Y-%m-%d`). |
| `anti-vibe-coding/scripts/sync-to-global.sh` | Modify | Substituir `2026-XX-XX` no comentario de provenance (fase-04) por data real. |
| (git) | New tag | Tag anotada `v6.0.0` no commit final do release, criada APENAS apos rollback test PASS. |

---

## Implementacao

### Passo 1: Validar pre-condicoes (gates de fase-05)

Antes de qualquer teste, confirmar que **todo o release esta pronto**:

```bash
cd anti-vibe-coding

# 1. Plano 08 completou (dog-food) — validators rodam contra o proprio plugin
bun run harness:validate
# Esperado: exit 0. Se falhar, ABORTAR — release nao pode ir com plugin internamente quebrado (G7 do README).

bun run compound:check
# Esperado: exit 0.

# 2. Testes existentes passam
bun test
# Esperado: exit 0.

# 3. Type-check
bun run typecheck
# Esperado: exit 0.

# 4. Versao em 3 arquivos eh 6.0.0
test "$(jq -r .version package.json)" = "6.0.0" && \
test "$(jq -r .version plugin-manifest.json)" = "6.0.0" && \
test "$(jq -r .version .claude-plugin/plugin.json)" = "6.0.0" && \
echo "Versions consistent"

# 5. CHANGELOG tem secao 6.0.0
grep -q "^## \[6.0.0\]" CHANGELOG.md && echo "CHANGELOG OK"

# 6. Manifest tem novas entradas
jq -e '.files["skills/todo-pick/SKILL.md"]' plugin-manifest.json > /dev/null && echo "Manifest has /todo-pick"

# 7. Sync script aponta para 6.0.0
grep -q '6\.0\.0' scripts/sync-to-global.sh && echo "Sync points to 6.0.0"

# 8. Fixture legacy-v5 existe (Plano 03 fase-07)
[ -d tests/fixtures/legacy-v5 ] && echo "Fixture legacy-v5 OK"
```

Se QUALQUER check falhar, parar a fase e voltar para a fase correspondente.

### Passo 2: Substituir data placeholder

Apenas apos pre-condicoes OK:

```bash
RELEASE_DATE="$(date +%Y-%m-%d)"
echo "Release date: $RELEASE_DATE"

# CHANGELOG
sed -i "s/## \[6.0.0\] - 2026-XX-XX/## [6.0.0] - ${RELEASE_DATE}/" anti-vibe-coding/CHANGELOG.md

# sync-to-global.sh (provenance comment)
sed -i "s/2026-XX-XX (Luiz\/dev)/${RELEASE_DATE} (Luiz\/dev)/" anti-vibe-coding/scripts/sync-to-global.sh

# Verificar
grep "## \[6.0.0\]" anti-vibe-coding/CHANGELOG.md
# Esperado: ## [6.0.0] - 2026-MM-DD (data real)

grep "(Luiz/dev)" anti-vibe-coding/scripts/sync-to-global.sh | head -1
# Esperado: data real, nao XX-XX
```

NOTA Windows/Git Bash: `sed -i` precisa de `-i ''` em macOS BSD; em GNU/Linux e Git Bash funciona como acima. Se quebrar, usar fallback:

```bash
sed "s/.../.../" file > file.new && mv file.new file
```

### Passo 3: Escrever `tests/rollback.sh`

Script bash que executa os 3 niveis de teste:

```bash
#!/bin/bash
# 2026-XX-XX (Luiz/dev): teste de rollback para CA-36
# Roda contra HEAD assumindo que HEAD eh o release commit final do v6.0.0.
# Cria branch temporario, aplica revert, valida estado v5.3.x, retorna ao HEAD.

set -u

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PLUGIN_DIR" || exit 1

REPORT="$PLUGIN_DIR/tests/rollback-report.md"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD_SHA=$(git rev-parse HEAD)
INITIAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Determinar quantos commits voltar — 5 commits do release (fase 01-05)
# NOTA: fase-05 ainda nao foi committed quando este script roda em modo PROVA;
# em modo real, commit de fase-05 acontece DEPOIS do tag. Para o teste, voltamos 4 commits (fase 01-04)
# E validamos que voltamos a estado pre-release.
REVERT_COUNT="${REVERT_COUNT:-4}"

# 2026-XX-XX (Luiz/dev): branch temp para nao tocar em main
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

# Reverter ultimos N commits em ordem reversa (--no-edit usa default message)
for i in $(seq 0 $((REVERT_COUNT - 1))); do
  if ! git revert --no-edit HEAD~"$i" 2>/dev/null; then
    fail "Level 1: conflito em revert HEAD~$i"
  fi
done

pass "Level 1: revert dos $REVERT_COUNT commits sem conflito"

# === LEVEL 2: Estrutural (estado equivale a v5.3.x) ===
echo "" >> "$REPORT"
echo "## Level 2: Estrutural" >> "$REPORT"
echo "" >> "$REPORT"

# 2.1 — package.json version voltou para 5.3.0
PKG_VER=$(jq -r .version package.json 2>/dev/null || echo "MISSING")
if [ "$PKG_VER" = "5.3.0" ]; then
  pass "Level 2.1: package.json version = 5.3.0"
else
  fail "Level 2.1: package.json version = $PKG_VER (esperado 5.3.0)"
fi

# 2.2 — plugin-manifest.json version voltou para 5.3.0
MANIFEST_VER=$(jq -r .version plugin-manifest.json 2>/dev/null || echo "MISSING")
if [ "$MANIFEST_VER" = "5.3.0" ]; then
  pass "Level 2.2: plugin-manifest.json version = 5.3.0"
else
  fail "Level 2.2: plugin-manifest.json version = $MANIFEST_VER (esperado 5.3.0)"
fi

# 2.3 — .claude-plugin/plugin.json version voltou
PLUGIN_VER=$(jq -r .version .claude-plugin/plugin.json 2>/dev/null || echo "MISSING")
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

# 2026-XX-XX (Luiz/dev): Level 3 eh sanity check; valida que estado revertido tem ferramentas v5
# (skills, hooks). NAO roda /init real (nao executavel em CI). Apenas confirma que arquivos
# v5 essenciais estao presentes apos revert.

# 3.1 — skill init/SKILL.md existe (skills nao foram deletadas; sao trabalho permanente)
[ -f skills/init/SKILL.md ] && pass "Level 3.1: skills/init/SKILL.md presente" || fail "Level 3.1: skill /init perdida"

# 3.2 — fixture legacy-v5 ainda existe (criada em Plano 03 fase-07, deveria sobreviver ao revert
#       PORQUE Plano 03 foi committed ANTES dos 4 commits do release)
[ -d tests/fixtures/legacy-v5 ] && pass "Level 3.2: tests/fixtures/legacy-v5 presente" || fail "Level 3.2: fixture perdida"

# 3.3 — manifest do plugin tem entradas v5.3.0
ENTRY_VER=$(jq -r '.files["skills/init/SKILL.md"].version // "MISSING"' plugin-manifest.json)
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
```

Salvar em `anti-vibe-coding/tests/rollback.sh` + `chmod +x`.

### Passo 4: Rodar o teste

```bash
cd anti-vibe-coding
bash tests/rollback.sh
echo "Exit code: $?"
```

Esperado: exit 0, mensagem "ALL PASS", arquivo `tests/rollback-report.md` gerado.

Se FAIL, **investigar antes de prosseguir**:
- Conflito de revert: provavelmente fase-03 (manifest) tocou linhas que fase-04 (sync) tambem mexeu. Fix: revert ordem manual, depois commit unico em vez de granular. Considerar lock no plano.
- Versao errada apos revert: alguma das mudancas das fases 01-04 nao foi committed cleanly. Investigar `git log --oneline -5`.
- Fixture ausente: Plano 03 fase-07 nao concluiu corretamente — bloquear release.

### Passo 5: Commit do rollback test

```bash
git add anti-vibe-coding/tests/rollback.sh anti-vibe-coding/tests/rollback-report.md
git diff --staged --stat
git commit -m "test(release): add rollback validation against legacy-v5 fixture"
```

NOTA: este commit eh **parte do release** — entao se outro usuario quiser reverter, o `git revert HEAD~5..HEAD` precisa cobrir este commit tambem. Atualizar `REVERT_COUNT` no script de 4 para 5 se quiser reusar — porem fica circular (script reverte a si mesmo). Politica recomendada: REVERT_COUNT eh **dinamico** (env var, default 4). Para hotfixes futuros, override.

### Passo 6: Tambem commitar mudancas de data placeholder

```bash
git add anti-vibe-coding/CHANGELOG.md anti-vibe-coding/scripts/sync-to-global.sh
git diff --staged
# Esperado: apenas linhas com data XX-XX → data real
git commit --amend --no-edit
# (Amend no commit do test, OU commit separado:)
# git commit -m "chore(release): finalize 6.0.0 release date"
```

Decisao recomendada: **commit separado** `chore(release): finalize 6.0.0 release date` — mantem semantica clara, granularidade preservada. Atualizar `REVERT_COUNT` em fase-05 documentation para 6 se necessario, OU re-rodar `rollback.sh` apos commit para confirmar que ainda passa.

### Passo 7: Tag git anotada

APENAS se Passo 4 retornou PASS:

```bash
RELEASE_DATE=$(date +%Y-%m-%d)

git tag -a v6.0.0 -m "v6.0.0 - ${RELEASE_DATE} - Harness + Compound Engineering Fusion

Major release introducing AGENTS.md + docs/* institutional layout,
TypeScript+bun validators (harness:validate, compound:check),
new /todo-pick skill, and full v5→v6 migration via /init.

Rollback validated: see tests/rollback-report.md
CHANGELOG: see CHANGELOG.md#600
"

# Verificar
git tag -l v6.0.0
git show v6.0.0 --no-patch
```

### Passo 8: Push (CONDITIONAL — depende de instrucao do user)

PRD diz "v6.0.0 GA". MAS regra global do CLAUDE.md: "Nunca faca push a um repositorio compartilhado a menos que explicitamente instruido."

**Politica desta fase:** NAO fazer push automatico. Documentar que apos PASS, o ULTIMO passo (push da tag + branch) eh manual:

```bash
# Quando user autorizar:
# git push origin master  # ou main
# git push origin v6.0.0   # push da tag
```

Imprimir mensagem clara no fim do script:

```
============================================
v6.0.0 RELEASE COMPLETO LOCALMENTE
============================================
Tag criada: v6.0.0
Rollback test: PASS

PROXIMO PASSO (manual, conforme autorizacao do user):
  git push origin master
  git push origin v6.0.0

ROLLBACK (se necessario):
  bash tests/rollback.sh
  # ou manualmente: git reset --hard v5.3.0
============================================
```

---

## Gotchas

- **G7 do plano (rollback parcial scope):** Level 3 do teste valida que estado revertido tem **infraestrutura v5.3.x** (skills, hooks, manifest version). NAO valida que `docs/` do plugin foi removido (eh dog-food, parte de Plano 08 — comitted ANTES das fases 01-04 deste plano; revert nao toca). Documentar explicitamente no `rollback-report.md`.

- **G9 do plano (commit granularity):** Para `git revert HEAD~N..HEAD` funcionar limpo, cada fase teve 1 commit isolado. Verificar pre-Passo-1 via `git log --oneline -10`:
  - HEAD-3: fase-04 sync
  - HEAD-2: fase-03 manifest
  - HEAD-1: fase-02 changelog
  - HEAD: fase-01 bump
  Se forem squash/amend de algum commit, REVERT_COUNT muda.

- **G8 do plano (CA-37 fora de escopo deste plano):** CA-37 (testes de fixture com 4 stacks) eh GATE adicional verificado em Passo 1 ("Plano 08 completou" + "harness:validate exit 0"). Se CA-37 falhar, abortar antes do test de rollback.

- **G3 do plano (data placeholder):** Substituicao via `sed` deve ser ATOMICA antes do tag. Se `sed -i` deixar arquivo intermediario, tag git captura estado intermediario — quebra.

- **Local: tag git anotada vs lightweight:** `git tag -a` (annotated) inclui data + autor + msg. Lightweight (`git tag v6.0.0`) eh apenas pointer. Preferir anotada — Github usa annotated para renderizar release page.

- **Local: assinar tag com GPG:** Regra global "Never bypass signing (--no-gpg-sign) unless user explicitly asks." Se user tem GPG configurado, `git tag -a` ja assina. Se nao, deixa sem assinatura — nao forcar `--no-gpg-sign`.

- **Local: fixture legacy-v5 sobrevive ao revert?:** Sim — fixture foi criada em Plano 03 fase-07, committed muito antes dos 4 commits do release. Revert dos commits do release nao toca a fixture. Validado em Level 3.2.

- **Local: o proprio `tests/rollback.sh` e committed em fase-05. Se `REVERT_COUNT=4` cobre apenas fases 01-04, o commit do `rollback.sh` em si nao eh revertido pelo teste. Para validar release END-TO-END com `REVERT_COUNT=5` (incluindo o commit do teste), seria preciso rodar o teste APOS commit, com o teste reverter a si mesmo. Decisao: testar com REVERT_COUNT=4 (cobre as 4 fases substantivas), aceitar que o test infrastructure (rollback.sh + rollback-report.md) ficar pos-revert eh trivial (sao apenas arquivos novos em `tests/`, nao quebram nada).

- **Local: hash determinismo do report:** `rollback-report.md` contem timestamp ISO + SHA — nao deterministico entre runs. NAO usar `diff` contra baseline. Apenas grep por "ALL CHECKPOINTS PASSED".

---

## Verificacao

### TDD

Esta fase **eh** o teste (Passo 4 do Implementacao roda `bash tests/rollback.sh`). Sem RED/GREEN classico — eh teste de integracao para o release inteiro.

### Checklist

- [ ] **Pre-Passo 1 (gates):**
  - [ ] `bun run harness:validate` exit 0 no plugin
  - [ ] `bun run compound:check` exit 0 no plugin
  - [ ] `bun test` exit 0
  - [ ] `bun run typecheck` exit 0
  - [ ] Versao 6.0.0 em 3 arquivos
  - [ ] CHANGELOG tem secao 6.0.0
  - [ ] Manifest tem skill /todo-pick
  - [ ] Sync script aponta para 6.0.0
  - [ ] Fixture legacy-v5 existe

- [ ] **Passo 2 (data):**
  - [ ] CHANGELOG.md header eh `## [6.0.0] - {date}` (nao mais XX-XX)
  - [ ] sync-to-global.sh provenance comment tem data real

- [ ] **Passo 3-4 (rollback test):**
  - [ ] `tests/rollback.sh` criado e executavel
  - [ ] Script roda com exit 0
  - [ ] `tests/rollback-report.md` gerado com "ALL CHECKPOINTS PASSED"
  - [ ] Apos o teste, branch original restaurada (`git rev-parse HEAD` = SHA esperado)
  - [ ] Branch temp removida (`git branch -l "release-test/*"` vazio)

- [ ] **Passo 5-6 (commits):**
  - [ ] Commit: `test(release): add rollback validation against legacy-v5 fixture`
  - [ ] Commit: `chore(release): finalize 6.0.0 release date`

- [ ] **Passo 7 (tag):**
  - [ ] Tag `v6.0.0` existe: `git tag -l v6.0.0` retorna `v6.0.0`
  - [ ] Tag eh annotated: `git cat-file -t v6.0.0` retorna `tag`
  - [ ] Mensagem da tag inclui "Harness + Compound" + data + ref ao CHANGELOG

- [ ] **Passo 8 (push):**
  - [ ] **NAO** rodar push automatico — apenas imprimir instrucao
  - [ ] User autorizou push antes de executar `git push origin v6.0.0`?

---

## Criterio de Aceite

**Por maquina (CA-36 verbatim):**

```bash
cd anti-vibe-coding

# Rollback test passa
bash tests/rollback.sh
test $? -eq 0 && \

# Relatorio contem PASS
grep -q "ALL CHECKPOINTS PASSED" tests/rollback-report.md && \

# Tag existe
git tag -l v6.0.0 | grep -q v6.0.0 && \

# Tag eh annotated
test "$(git cat-file -t v6.0.0)" = "tag" && \

# Estado atual eh release (HEAD = commit final de fase-05)
git diff v6.0.0..HEAD --quiet && \

echo "PASS — v6.0.0 GA"
```

Esperado: `PASS — v6.0.0 GA`.

**Por humano:**
- Ler `tests/rollback-report.md` — todos os 3 niveis listam PASS?
- Inspecionar `git log --oneline -10` — release tem 5 commits limpos (fases 01-05)?
- Tag mostra-se em `git tag -n5 v6.0.0` com mensagem rica?

**Referencia ao CA:**
- **CA-36 (PRD §440):** "Dado projeto migrado para v6 e usuario insatisfeito, quando rodar `git revert {migration-commit}`, entao projeto retorna ao estado v5.x intacto (validar com fixture `legacy-v5`)."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
