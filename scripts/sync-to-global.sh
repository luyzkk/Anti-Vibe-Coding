#!/bin/bash
# 2026-05-12 (Luiz/dev): atualizado para v6.0.0 — adicionados paths AGENTS.md, ARCHITECTURE.md, scripts/, .github/, tests/fixtures/
# 2026-05-18 (Luiz/dev): defaults sincronizados com layout atual — PLUGIN_DEV aponta para
# Anti-Vibe-Coding (era "Claude code/anti-vibe-coding" pre-flatten); PLUGIN_GLOBAL deriva
# a versao do plugin-manifest.json em vez de pinar em 6.0.0.
# Idempotente: rodar 2x produz mesmo resultado.
# POSIX-compatible: testado em Git Bash Windows + macOS + Linux.

set -u  # erro em var nao-definida; mas NAO -e (queremos tolerar falhas de cp em paths opcionais)

PLUGIN_DEV="${PLUGIN_DEV:-/f/Projetos/Anti-Vibe-Coding}"

# 2026-08-18 (Luiz/dev): checagem do dev movida para ANTES da derivacao da versao. Antes ela vinha
# depois do banner, entao um PLUGIN_DEV errado imprimia primeiro uma versao chutada e so depois o
# erro real — foi assim que apareceu "Global: .../6.7.0" ao rodar via WSL bash, que nao enxerga
# /f/ (la o caminho seria /mnt/f/). Falhar na causa, nao no sintoma.
if [ ! -d "$PLUGIN_DEV" ]; then
  echo "ERRO: Diretorio de desenvolvimento nao encontrado: $PLUGIN_DEV" >&2
  echo "      No PowerShell, 'bash' costuma resolver para o WSL, que nao enxerga /f/." >&2
  echo "      Use o Git Bash:  & \"C:\\Program Files\\Git\\bin\\bash.exe\" scripts/sync-to-global.sh" >&2
  echo "      Ou aponte o caminho:  PLUGIN_DEV=/mnt/f/Projetos/Anti-Vibe-Coding bash scripts/sync-to-global.sh" >&2
  exit 1
fi

# Deriva versao do manifest do dev para evitar drift (era hard-coded em 6.0.0).
#
# 2026-08-18 (Luiz/dev): o fallback `${PLUGIN_VERSION:-6.7.0}` foi REMOVIDO. Ele existia para o
# caso de a derivacao falhar, mas o efeito era pior que a falha: manifest ausente ou com formato
# diferente produzia sync para uma pasta 6.7.0 e repontava o installed_plugins.json para la —
# downgrade silencioso de 8 versoes, com "Sincronizacao completa" no fim. Isso recria exatamente o
# bug que o pin (mais abaixo, L~150) foi criado para corrigir em 2026-05-19, por outro caminho.
# Versao errada aqui e pior que nao sincronizar: aborta.
PLUGIN_GLOBAL_OVERRIDE="${PLUGIN_GLOBAL:-}"

if [ -z "${PLUGIN_GLOBAL:-}" ]; then
  MANIFEST="$PLUGIN_DEV/plugin-manifest.json"

  if [ ! -f "$MANIFEST" ]; then
    echo "ERRO: manifest nao encontrado: $MANIFEST" >&2
    echo "      Rode 'bun run generate:manifest', ou passe PLUGIN_VERSION=x.y.z / PLUGIN_GLOBAL=<path>." >&2
    exit 1
  fi

  PLUGIN_VERSION="${PLUGIN_VERSION:-$(grep -m1 '"version"' "$MANIFEST" | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')}"

  if ! printf '%s' "$PLUGIN_VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "ERRO: versao invalida derivada de $MANIFEST: '$PLUGIN_VERSION'" >&2
    echo "      Esperado semver (ex: 7.6.1). Abortando em vez de chutar uma versao." >&2
    exit 1
  fi

  PLUGIN_GLOBAL="/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/$PLUGIN_VERSION"
fi

echo "========================================="
echo "Sincronizando Plugin para Cache Global"
echo "========================================="
echo ""
echo "Dev:    $PLUGIN_DEV"
echo "Global: $PLUGIN_GLOBAL"
echo ""

# (a existencia de $PLUGIN_DEV ja foi verificada antes da derivacao da versao)

# Criar destino se nao existir (idempotente)
if [ ! -d "$PLUGIN_GLOBAL" ]; then
  echo "Cache global nao existe - criando: $PLUGIN_GLOBAL"
  mkdir -p "$PLUGIN_GLOBAL" || { echo "ERRO ao criar $PLUGIN_GLOBAL"; exit 1; }
fi

echo "Copiando arquivos..."

# --- Funcao auxiliar: copia diretorio se origem existe ---
# 2026-05-12 (Luiz/dev): cp -r em vez de rsync - rsync nao garantido em Git Bash Windows nativo
copy_dir_if_exists() {
  local src="$1"
  local dst="$2"
  local label="$3"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    cp -r "$src"/* "$dst"/ 2>/dev/null && echo "  + $label" || echo "  ! $label (cp warning - destino pode ter arquivos protegidos)"
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
# 2026-05-12: docs/ do plugin eh dog-food (D20), NAO eh distribuivel - NAO copiado (decisao 09-A3)
# 2026-05-12: scripts/ tem validators TS+bun que o usuario pode rodar contra o proprio cache se quiser auditar
copy_dir_if_exists "$PLUGIN_DEV/scripts" "$PLUGIN_GLOBAL/scripts" "scripts/"
copy_dir_if_exists "$PLUGIN_DEV/.github" "$PLUGIN_GLOBAL/.github" ".github/"
copy_dir_if_exists "$PLUGIN_DEV/tests/fixtures" "$PLUGIN_GLOBAL/tests/fixtures" "tests/fixtures/"

# --- Runtime assets (v6.6.0+) ---
# 2026-05-20 (Luiz/dev): D1/D4 do PRD knowledge-path-cutover — knowledge/ e runtime asset
# consumido por /init (copy-knowledge.ts). NAO e dog-food: deve ser distribuido. docs/knowledge/
# foi o path original; agora vive em knowledge/ na raiz (git mv preservou linhagem).
copy_dir_if_exists "$PLUGIN_DEV/knowledge" "$PLUGIN_GLOBAL/knowledge" "knowledge/"

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

# --- CLAUDE.md -> AGENTS.md symlink (v6) ---
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
      echo "  + CLAUDE.md (copy fallback - Windows sem dev mode)"
    fi
  fi
  cd - > /dev/null || true
fi

echo ""

# 2026-05-19 (Luiz/dev): pin do installed_plugins.json — evita Claude Code carregar versao
# antiga quando o installPath registrado nao corresponde a versao recem-sincronizada.
# Bug observado: cache tinha 6.5.0 e 6.5.1, mas installed_plugins.json apontava para 6.4.1
# (pasta inexistente); Claude Code fez fallback para 6.5.0 em vez da nova 6.5.1.
#
# 2026-08-18 (Luiz/dev): quando PLUGIN_GLOBAL vem sobrescrito por env, o destino e customizado
# (teste, sandbox, outra maquina) e NAO deve repontar o registro global — alem disso PLUGIN_VERSION
# nem chega a ser derivado nesse caminho, e o `set -u` matava o script aqui com "unbound variable",
# depois de ja ter copiado tudo. Bug pre-existente, exposto ao testar o override.
INSTALLED_PLUGINS="/c/Users/luizf/.claude/plugins/installed_plugins.json"
if [ -n "${PLUGIN_GLOBAL_OVERRIDE:-}" ]; then
  echo "Destino customizado via PLUGIN_GLOBAL — pin do installed_plugins.json ignorado."
elif [ -f "$INSTALLED_PLUGINS" ]; then
  # Detectar versao atualmente pinada para anti-vibe-coding@local-plugins
  PINNED_VERSION=$(grep -A4 '"anti-vibe-coding@local-plugins"' "$INSTALLED_PLUGINS" \
    | grep '"version"' | head -1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
  if [ "$PINNED_VERSION" != "$PLUGIN_VERSION" ]; then
    echo "Pinando installed_plugins.json: $PINNED_VERSION -> $PLUGIN_VERSION"
    # Substitui SOMENTE no bloco anti-vibe-coding (linhas com installPath e version logo apos a chave)
    # Usa Python para edicao precisa do JSON (evita sed frageis com paths Windows-style).
    if command -v python >/dev/null 2>&1; then
      # 2026-05-20 (Luiz/dev): Patch 6.6.1 — Python on Windows doesn't resolve POSIX paths
      # like /c/Users/...; convert to Windows path via cygpath when available, else fallback.
      if command -v cygpath >/dev/null 2>&1; then
        INSTALLED_PLUGINS_WIN=$(cygpath -w "$INSTALLED_PLUGINS")
        CACHE_DIR_WIN=$(cygpath -w "$PLUGIN_GLOBAL")
      else
        INSTALLED_PLUGINS_WIN="$INSTALLED_PLUGINS"
        CACHE_DIR_WIN="$PLUGIN_GLOBAL"
      fi
      # Export for python subshell to read via os.environ (avoids string escaping bugs).
      export INSTALLED_PLUGINS_WIN CACHE_DIR_WIN PLUGIN_VERSION
      python -c "
import json, os
from datetime import datetime, timezone
p = os.environ['INSTALLED_PLUGINS_WIN']
with open(p, 'r', encoding='utf-8') as f:
    data = json.load(f)
entry = data['plugins'].get('anti-vibe-coding@local-plugins', [])
if entry:
    entry[0]['installPath'] = os.environ['CACHE_DIR_WIN']
    entry[0]['version'] = os.environ['PLUGIN_VERSION']
    entry[0]['lastUpdated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
with open(p, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
print('  + installed_plugins.json pinned to', os.environ['PLUGIN_VERSION'])
"
    else
      echo "  ! python nao disponivel — pin manual necessario em $INSTALLED_PLUGINS"
    fi
  else
    echo "installed_plugins.json ja pinado em $PLUGIN_VERSION (skip)"
  fi
else
  echo "  - installed_plugins.json nao encontrado (skip pin)"
fi

echo ""
echo "Sincronizacao completa."
echo ""
echo "IMPORTANTE: Reinicie o Claude Code para carregar as mudancas"
