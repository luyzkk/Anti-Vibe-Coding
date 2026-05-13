<!--
Princípio universal #5 — Comment Provenance.
WHY comments OK no script bash quando uma decisao nao-obvia precisa de justificativa
(ex: por que `cp -r` em vez de `rsync`).
-->

# Fase 04: Atualizar `sync-to-global.sh` para Cache 6.0.0

**Plano:** 09 — Versioning & Release
**Sizing:** 1h
**Depende de:** fase-01 (path do cache contem `6.0.0`) + fase-03 (manifest novo eh um dos arquivos copiados)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/scripts/sync-to-global.sh` atualizado: variavel `PLUGIN_GLOBAL` aponta para `~/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.0.0/`, lista de paths copiados estendida para incluir os novos artefatos do v6 (`AGENTS.md`, `ARCHITECTURE.md`, `scripts/`, `.github/`, `tests/fixtures/`), script eh **idempotente** (rodar 2x produz mesmo resultado) e **POSIX-compatible** (testado em Git Bash Windows nativo), preserva symlink `CLAUDE.md → AGENTS.md` se existir.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/scripts/sync-to-global.sh` | Modify | Atualizar variavel `PLUGIN_GLOBAL` para path 6.0.0; estender array de paths copiados para artefatos v6; adicionar checagem de existencia + criacao idempotente de diretorios destino. |

---

## Implementacao

### Passo 1: Backup do script atual

```bash
mkdir -p anti-vibe-coding/.release-backup/v5.3.0/
cp anti-vibe-coding/scripts/sync-to-global.sh anti-vibe-coding/.release-backup/v5.3.0/sync-to-global.sh.original
```

### Passo 2: Auditar script atual

Estado atual (54 linhas):

```bash
#!/bin/bash
PLUGIN_DEV="f:/Projetos/Claude code/anti-vibe-coding"
PLUGIN_GLOBAL="/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/5.2.0"
# ... copia skills, hooks, agents, rules, CLAUDE.md, senior-principles.md, plugin-manifest.json, plugin.json
```

**Notar:** path atual eh `5.2.0` (drift do dev local 5.3.0 — bug latente; resolvido aqui ao migrar para 6.0.0).

### Passo 3: Reescrever para v6.0.0

Substituir o conteudo do script. Novo conteudo:

```bash
#!/bin/bash
# 2026-XX-XX (Luiz/dev): atualizado para v6.0.0 — adicionados paths docs/, AGENTS.md, ARCHITECTURE.md, scripts/, .github/, tests/fixtures/
# Idempotente: rodar 2x produz mesmo resultado.
# POSIX-compatible: testado em Git Bash Windows + macOS + Linux.

set -u  # erro em var nao-definida; mas NAO -e (queremos tolerar falhas de cp em paths opcionais)

PLUGIN_DEV="${PLUGIN_DEV:-f:/Projetos/Claude code/anti-vibe-coding}"
PLUGIN_GLOBAL="${PLUGIN_GLOBAL:-/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.0.0}"

echo "========================================="
echo "Sincronizando Plugin para Cache Global"
echo "========================================="
echo ""
echo "Dev:    $PLUGIN_DEV"
echo "Global: $PLUGIN_GLOBAL"
echo ""

# Verificar dev existe
if [ ! -d "$PLUGIN_DEV" ]; then
  echo "ERRO: Diretorio de desenvolvimento nao encontrado: $PLUGIN_DEV"
  exit 1
fi

# Criar destino se nao existir (idempotente)
if [ ! -d "$PLUGIN_GLOBAL" ]; then
  echo "Cache global nao existe — criando: $PLUGIN_GLOBAL"
  mkdir -p "$PLUGIN_GLOBAL" || { echo "ERRO ao criar $PLUGIN_GLOBAL"; exit 1; }
fi

echo "Copiando arquivos..."

# --- Funcao auxiliar: copia diretorio se origem existe ---
# 2026-XX-XX (Luiz/dev): cp -r em vez de rsync — rsync nao garantido em Git Bash Windows nativo
copy_dir_if_exists() {
  local src="$1"
  local dst="$2"
  local label="$3"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    cp -r "$src"/* "$dst"/ 2>/dev/null && echo "  + $label" || echo "  ! $label (cp warning — destino pode ter arquivos protegidos)"
  else
    echo "  - $label (origem ausente; skip)"
  fi
}

# --- Funcao auxiliar: copia arquivo se origem existe ---
copy_file_if_exists() {
  local src="$1"
  local dst="$2"
  local label="$3"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst" && echo "  + $label" || echo "  ! $label (cp falhou)"
  else
    echo "  - $label (origem ausente; skip)"
  fi
}

# --- Diretorios (existiam em v5; sempre presentes) ---
copy_dir_if_exists "$PLUGIN_DEV/skills"  "$PLUGIN_GLOBAL/skills"  "skills/"
copy_dir_if_exists "$PLUGIN_DEV/hooks"   "$PLUGIN_GLOBAL/hooks"   "hooks/"
copy_dir_if_exists "$PLUGIN_DEV/agents"  "$PLUGIN_GLOBAL/agents"  "agents/"
copy_dir_if_exists "$PLUGIN_DEV/rules"   "$PLUGIN_GLOBAL/rules"   "rules/"
copy_dir_if_exists "$PLUGIN_DEV/config"  "$PLUGIN_GLOBAL/config"  "config/"
copy_dir_if_exists "$PLUGIN_DEV/templates" "$PLUGIN_GLOBAL/templates" "templates/"

# --- Diretorios novos em v6 ---
# 2026-XX-XX: docs/ do plugin eh dog-food (D20), NAO eh distribuivel — NAO copiado (decisao 09-A3)
# 2026-XX-XX: scripts/ tem validators TS+bun que o usuario pode rodar contra o proprio cache se quiser auditar
copy_dir_if_exists "$PLUGIN_DEV/scripts" "$PLUGIN_GLOBAL/scripts" "scripts/"
copy_dir_if_exists "$PLUGIN_DEV/.github" "$PLUGIN_GLOBAL/.github" ".github/"
copy_dir_if_exists "$PLUGIN_DEV/tests/fixtures" "$PLUGIN_GLOBAL/tests/fixtures" "tests/fixtures/"

# --- Arquivos da raiz (v5 + v6) ---
copy_file_if_exists "$PLUGIN_DEV/CLAUDE.md"             "$PLUGIN_GLOBAL/CLAUDE.md"             "CLAUDE.md"
copy_file_if_exists "$PLUGIN_DEV/senior-principles.md"  "$PLUGIN_GLOBAL/senior-principles.md"  "senior-principles.md (legacy shim)"
copy_file_if_exists "$PLUGIN_DEV/plugin-manifest.json"  "$PLUGIN_GLOBAL/plugin-manifest.json"  "plugin-manifest.json"
copy_file_if_exists "$PLUGIN_DEV/package.json"          "$PLUGIN_GLOBAL/package.json"          "package.json"
copy_file_if_exists "$PLUGIN_DEV/CHANGELOG.md"          "$PLUGIN_GLOBAL/CHANGELOG.md"          "CHANGELOG.md"
copy_file_if_exists "$PLUGIN_DEV/README.md"             "$PLUGIN_GLOBAL/README.md"             "README.md"

# .claude-plugin/plugin.json (subdir)
mkdir -p "$PLUGIN_GLOBAL/.claude-plugin"
copy_file_if_exists "$PLUGIN_DEV/.claude-plugin/plugin.json" "$PLUGIN_GLOBAL/.claude-plugin/plugin.json" ".claude-plugin/plugin.json"

# --- Arquivos novos em v6 (raiz) ---
copy_file_if_exists "$PLUGIN_DEV/AGENTS.md"        "$PLUGIN_GLOBAL/AGENTS.md"        "AGENTS.md (v6)"
copy_file_if_exists "$PLUGIN_DEV/ARCHITECTURE.md"  "$PLUGIN_GLOBAL/ARCHITECTURE.md"  "ARCHITECTURE.md (v6)"
copy_file_if_exists "$PLUGIN_DEV/tsconfig.json"    "$PLUGIN_GLOBAL/tsconfig.json"    "tsconfig.json"

# --- CLAUDE.md → AGENTS.md symlink (v6) ---
# Se AGENTS.md existe no destino e CLAUDE.md eh arquivo regular (nao symlink), o cp acima ja sobrescreveu.
# Aqui restauramos o symlink. 3-tier fallback (alinhado com Plano 01 fase-03 do mesmo PRD).
if [ -f "$PLUGIN_GLOBAL/AGENTS.md" ]; then
  cd "$PLUGIN_GLOBAL" || exit 1
  # Se CLAUDE.md eh arquivo (sobrescrito pelo cp), tentar symlink:
  if [ -e "CLAUDE.md" ] && [ ! -L "CLAUDE.md" ]; then
    rm "CLAUDE.md"
    # Tier 1: POSIX symlink
    if ln -s "AGENTS.md" "CLAUDE.md" 2>/dev/null; then
      echo "  + CLAUDE.md -> AGENTS.md (symlink)"
    else
      # Tier 3 (Git Bash on Windows nao tem mklink direto, e ln -s pode silenciosamente copiar):
      cp "AGENTS.md" "CLAUDE.md"
      echo "  + CLAUDE.md (copy fallback — Windows sem dev mode)"
    fi
  fi
  cd - > /dev/null || true
fi

echo ""
echo "Sincronizacao completa."
echo ""
echo "IMPORTANTE: Reinicie o Claude Code para carregar as mudancas"
```

### Passo 4: Escrever o novo script

Use ferramenta Write para sobrescrever (mudancas extensas — Edit teria muitos passos):

```
file_path: f:/Projetos/Claude code/anti-vibe-coding/scripts/sync-to-global.sh
content: {conteudo do Passo 3, com a primeira linha do comentario de provenance contendo a data real do release substituida posteriormente em fase-05}
```

Manter permissoes executaveis:

```bash
chmod +x anti-vibe-coding/scripts/sync-to-global.sh
```

### Passo 5: Teste de idempotencia (sem efeito real — usar fixture sandbox)

Em vez de rodar contra o cache real (efeito colateral), criar fixture:

```bash
# Sandbox fixture
TMPDIR=$(mktemp -d)
PLUGIN_DEV_TEST=$(mktemp -d)
PLUGIN_GLOBAL_TEST="$TMPDIR/global"

# Popular fixture com estrutura minima
mkdir -p "$PLUGIN_DEV_TEST"/{skills,hooks,agents,rules,scripts,.github,.claude-plugin}
echo "test" > "$PLUGIN_DEV_TEST/AGENTS.md"
echo "test" > "$PLUGIN_DEV_TEST/ARCHITECTURE.md"
echo "test" > "$PLUGIN_DEV_TEST/CLAUDE.md"
echo '{"version":"6.0.0"}' > "$PLUGIN_DEV_TEST/package.json"
echo '{"version":"6.0.0"}' > "$PLUGIN_DEV_TEST/plugin-manifest.json"
echo '{"version":"6.0.0"}' > "$PLUGIN_DEV_TEST/.claude-plugin/plugin.json"
echo "test skill" > "$PLUGIN_DEV_TEST/skills/test.md"

# Rodar sync 1x
PLUGIN_DEV="$PLUGIN_DEV_TEST" PLUGIN_GLOBAL="$PLUGIN_GLOBAL_TEST" \
  bash anti-vibe-coding/scripts/sync-to-global.sh > /tmp/sync-run1.log

# Hash da arvore destino
hash1=$(find "$PLUGIN_GLOBAL_TEST" -type f -exec sha256sum {} \; | sort | sha256sum)

# Rodar sync 2x (idempotencia)
PLUGIN_DEV="$PLUGIN_DEV_TEST" PLUGIN_GLOBAL="$PLUGIN_GLOBAL_TEST" \
  bash anti-vibe-coding/scripts/sync-to-global.sh > /tmp/sync-run2.log

hash2=$(find "$PLUGIN_GLOBAL_TEST" -type f -exec sha256sum {} \; | sort | sha256sum)

# Comparar
if [ "$hash1" = "$hash2" ]; then
  echo "PASS: idempotente (hash identico apos 2 runs)"
else
  echo "FAIL: nao idempotente"
  diff /tmp/sync-run1.log /tmp/sync-run2.log
fi

# Cleanup
rm -rf "$TMPDIR" "$PLUGIN_DEV_TEST"
```

### Passo 6: Teste de tolerancia a paths ausentes

Verificar que script nao crasha quando origem nao tem todos os diretorios (e.g., `.github/` so foi criado em Plano 02):

```bash
# Fixture sem .github/ e sem AGENTS.md
PLUGIN_DEV_TEST2=$(mktemp -d)
PLUGIN_GLOBAL_TEST2=$(mktemp -d)
mkdir -p "$PLUGIN_DEV_TEST2"/skills
echo "test" > "$PLUGIN_DEV_TEST2/skills/foo.md"
# NAO criar AGENTS.md, .github, etc.

PLUGIN_DEV="$PLUGIN_DEV_TEST2" PLUGIN_GLOBAL="$PLUGIN_GLOBAL_TEST2" \
  bash anti-vibe-coding/scripts/sync-to-global.sh

# Esperado: exit 0, mensagens "skip" para origens ausentes, nada copiado para diretorios inexistentes
# Validar:
[ -d "$PLUGIN_GLOBAL_TEST2/skills" ] && echo "skills copiado OK"
[ ! -d "$PLUGIN_GLOBAL_TEST2/.github" ] && echo ".github skipado OK"

rm -rf "$PLUGIN_DEV_TEST2" "$PLUGIN_GLOBAL_TEST2"
```

### Passo 7: Atualizar provenance comment com data real

A primeira linha de comentario WHY no script tem `2026-XX-XX` — substituida em fase-05 imediatamente antes da tag. Por agora, fica como placeholder.

### Passo 8: Commit isolado

```bash
git add anti-vibe-coding/scripts/sync-to-global.sh
git diff --staged anti-vibe-coding/scripts/sync-to-global.sh | head -50
git commit -m "chore(sync): update sync-to-global.sh for 6.0.0 path"
```

---

## Gotchas

- **G4 do plano (Windows + Git Bash):** NAO usar `realpath`, `readlink -f`, `rsync`. Manter `cp -r`, `mkdir -p`, `[ -d ]`, `[ -f ]`. Testado em Git Bash nativo Windows.

- **G10 do plano (cache global path Windows):** Path eh hardcoded mas overridable via env var (`PLUGIN_GLOBAL`). Documentar isso em comentario inicial. Outros desenvolvedores precisam ajustar `PLUGIN_GLOBAL` exportando antes de rodar.

- **G7 do plano (rollback parcial — `docs/` do plugin):** Decisao 09-A3 — `anti-vibe-coding/docs/` eh dog-food, NAO copiado. Documentar inline no script ("docs/ do plugin eh dog-food (D20), NAO eh distribuivel"). Se essa decisao for revertida (usuario quer ter os docs no cache para referencia), adicionar `copy_dir_if_exists "$PLUGIN_DEV/docs" "$PLUGIN_GLOBAL/docs" "docs/ (dogfood)"`.

- **G9 do plano (commit granularity):** 1 commit isolado.

- **Local: `set -e` removido conscientemente:** Script atual nao usa; novo tambem nao. Razao: paths opcionais (e.g., `tsconfig.json` pode nao existir em v5.3.x e o `cp` falhar). Tolerancia via `cp ... || echo "warning"`. Senao, exit precoce abortaria sync legitimo.

- **Local: `set -u` adicionado para flags var nao-definidas:** Reduz risco de typo silencioso (`$PLUGIN_GLOBL` em vez de `$PLUGIN_GLOBAL`). Compativel com defaulting `${VAR:-default}`.

- **Local: idempotencia de symlink CLAUDE.md → AGENTS.md:** Cuidado — `cp` em CLAUDE.md sobrescreve um symlink existente com arquivo regular. Logica do Passo 3 deteca isso (`[ ! -L "CLAUDE.md" ]`) e re-cria symlink. Em Windows com Git Bash, `ln -s` pode silenciosamente copiar — tier-3 fallback (cp) eh aceitavel; usuario precisa rodar hook PostToolUse para re-sync se editar AGENTS.md.

- **Local: nao copiar `.git/`, `node_modules/`, `.release-backup/`:** Script atual nao copia (nao estao nos paths listados). Conferir.

- **Local: nao copiar `.planning/` ou `.planning.v5-backup/`:** Idem — esses sao do repo, nao do plugin distribuivel.

---

## Verificacao

### TDD

Tecnicamente, Passos 5 e 6 sao testes de integracao (sandbox fixture). Roda-los como gate:

```bash
# Adicionar a um teste script reutilizavel em tests/sync-test.sh (opcional — fora de escopo se nao houver time)
```

Sem necessidade de teste TS — bash test eh adequado.

### Checklist

- [ ] Backup: `anti-vibe-coding/.release-backup/v5.3.0/sync-to-global.sh.original`
- [ ] `head -5 anti-vibe-coding/scripts/sync-to-global.sh` mostra shebang `#!/bin/bash` + comentario de provenance v6
- [ ] `grep "PLUGIN_GLOBAL" anti-vibe-coding/scripts/sync-to-global.sh | head -1` mostra path com `6.0.0`
- [ ] `grep -c "AGENTS.md" anti-vibe-coding/scripts/sync-to-global.sh` >= 2 (declaracao + symlink)
- [ ] `grep -c "ARCHITECTURE.md" anti-vibe-coding/scripts/sync-to-global.sh` >= 1
- [ ] `grep -c "scripts/" anti-vibe-coding/scripts/sync-to-global.sh` >= 1 (copia o proprio diretorio scripts)
- [ ] `grep -c ".github" anti-vibe-coding/scripts/sync-to-global.sh` >= 1
- [ ] `grep -c "tests/fixtures" anti-vibe-coding/scripts/sync-to-global.sh` >= 1
- [ ] Script NAO contem `rsync`, `realpath`, `readlink -f` (POSIX-portable check)
- [ ] Script tem `set -u` mas NAO `set -e` (tolerancia a paths ausentes)
- [ ] Permissoes executaveis: `[ -x anti-vibe-coding/scripts/sync-to-global.sh ]`
- [ ] Idempotencia validada (Passo 5): hash apos 2 runs identico
- [ ] Tolerancia a paths ausentes validada (Passo 6): exit 0 sem `.github` no source
- [ ] Commit criado: `chore(sync): update sync-to-global.sh for 6.0.0 path`

---

## Criterio de Aceite

**Por maquina:**

```bash
# Path 6.0.0
grep -q '6\.0\.0' anti-vibe-coding/scripts/sync-to-global.sh && \
# Novos paths v6
grep -q 'AGENTS.md' anti-vibe-coding/scripts/sync-to-global.sh && \
grep -q 'ARCHITECTURE.md' anti-vibe-coding/scripts/sync-to-global.sh && \
grep -q 'tests/fixtures' anti-vibe-coding/scripts/sync-to-global.sh && \
# POSIX-pure (sem rsync, realpath, readlink -f)
! grep -qE 'rsync|realpath|readlink -f' anti-vibe-coding/scripts/sync-to-global.sh && \
# Executavel
[ -x anti-vibe-coding/scripts/sync-to-global.sh ] && \
echo "PASS"
```

**Por humano:**
- Rodar script com `PLUGIN_DEV=/tmp/fake PLUGIN_GLOBAL=/tmp/test bash anti-vibe-coding/scripts/sync-to-global.sh` 2x; verificar idempotencia visualmente.

**Referencia ao CA:**
- **PRD §661 (estrategia de rollout):** "Versionamento (semana 5): Bump 5.3.0 → 6.0.0, CHANGELOG, sync para diretorios de skills globais."
- Suporta CA-34 indiretamente (cache global precisa refletir version dev).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
