#!/bin/bash

# Script para sincronizar desenvolvimento → plugin global durante desenvolvimento
# Uso: ./scripts/sync-to-global.sh

PLUGIN_DEV="f:/Projetos/Claude code/anti-vibe-coding"
PLUGIN_GLOBAL="/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/5.2.0"

echo "========================================="
echo "Sincronizando Plugin para Cache Global"
echo "========================================="
echo ""
echo "Dev:    $PLUGIN_DEV"
echo "Global: $PLUGIN_GLOBAL"
echo ""

# Verificar se diretórios existem
if [ ! -d "$PLUGIN_DEV" ]; then
  echo "❌ Diretório de desenvolvimento não encontrado!"
  exit 1
fi

if [ ! -d "$PLUGIN_GLOBAL" ]; then
  echo "❌ Cache global não encontrado!"
  echo "   Plugin precisa estar instalado primeiro no Claude Code"
  exit 1
fi

# Copiar arquivos (exceto .git e node_modules)
echo "Copiando arquivos..."

# Skills
cp -r "$PLUGIN_DEV/skills"/* "$PLUGIN_GLOBAL/skills/" && echo "✓ Skills"

# Hooks
cp -r "$PLUGIN_DEV/hooks"/* "$PLUGIN_GLOBAL/hooks/" && echo "✓ Hooks"

# Agents
cp -r "$PLUGIN_DEV/agents"/* "$PLUGIN_GLOBAL/agents/" && echo "✓ Agents"

# Rules
cp -r "$PLUGIN_DEV/rules"/* "$PLUGIN_GLOBAL/rules/" && echo "✓ Rules"

# Root files
cp "$PLUGIN_DEV/CLAUDE.md" "$PLUGIN_GLOBAL/" && echo "✓ CLAUDE.md"
cp "$PLUGIN_DEV/senior-principles.md" "$PLUGIN_GLOBAL/" && echo "✓ senior-principles.md"
cp "$PLUGIN_DEV/plugin-manifest.json" "$PLUGIN_GLOBAL/" && echo "✓ plugin-manifest.json"
cp "$PLUGIN_DEV/.claude-plugin/plugin.json" "$PLUGIN_GLOBAL/.claude-plugin/" && echo "✓ plugin.json"

echo ""
echo "✅ Sincronização completa!"
echo ""
echo "⚠️  IMPORTANTE: Reinicie o Claude Code para carregar as mudanças"
