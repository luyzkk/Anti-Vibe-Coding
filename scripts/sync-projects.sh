#!/bin/bash

# Script de sincronização do plugin Anti-Vibe Coding para projetos existentes
# Uso: ./scripts/sync-projects.sh

set -e

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_LOG="$PLUGIN_DIR/.sync-log-$(date +%Y%m%d-%H%M%S).txt"

echo "==================================="
echo "Anti-Vibe Coding - Sync Projects"
echo "==================================="
echo ""
echo "Plugin dir: $PLUGIN_DIR"
echo "Log file: $SYNC_LOG"
echo ""

# Lista de projetos (EDITE ESTE ARRAY)
PROJECTS=(
  # Exemplo:
  # "/caminho/completo/projeto1"
  # "/caminho/completo/projeto2"
  # "/caminho/completo/projeto3"
)

# Se a lista estiver vazia, tentar ler de arquivo
if [ ${#PROJECTS[@]} -eq 0 ]; then
  if [ -f "$PLUGIN_DIR/.projects-to-sync.txt" ]; then
    echo "Lendo projetos de .projects-to-sync.txt..."
    while IFS= read -r line; do
      # Ignorar comentários e linhas vazias
      [[ "$line" =~ ^#.*$ ]] && continue
      [[ -z "$line" ]] && continue
      PROJECTS+=("$line")
    done < "$PLUGIN_DIR/.projects-to-sync.txt"
  fi
fi

if [ ${#PROJECTS[@]} -eq 0 ]; then
  echo "❌ Nenhum projeto configurado!"
  echo ""
  echo "Edite este script e adicione os caminhos em PROJECTS=() ou crie:"
  echo "  .projects-to-sync.txt"
  echo ""
  echo "Formato do arquivo (um projeto por linha):"
  echo "  /caminho/projeto1"
  echo "  /caminho/projeto2"
  echo "  # Comentários começam com #"
  exit 1
fi

echo "Projetos a sincronizar: ${#PROJECTS[@]}"
echo ""

# Contador
TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

# Função de sync
sync_project() {
  local PROJECT=$1
  local PROJECT_NAME=$(basename "$PROJECT")

  echo "=== [$((++TOTAL))/${#PROJECTS[@]}] $PROJECT_NAME ===" | tee -a "$SYNC_LOG"
  echo "Path: $PROJECT" | tee -a "$SYNC_LOG"

  # Verificar se o diretório existe
  if [ ! -d "$PROJECT" ]; then
    echo "⚠️  SKIP: Diretório não existe" | tee -a "$SYNC_LOG"
    ((SKIPPED++))
    echo "" | tee -a "$SYNC_LOG"
    return
  fi

  # Verificar se tem .claude
  if [ ! -d "$PROJECT/.claude" ]; then
    echo "⚠️  SKIP: Não tem .claude/ (plugin não instalado)" | tee -a "$SYNC_LOG"
    ((SKIPPED++))
    echo "" | tee -a "$SYNC_LOG"
    return
  fi

  # Detectar versão instalada (se tiver manifest)
  if [ -f "$PROJECT/.claude/.anti-vibe-manifest.json" ]; then
    INSTALLED_VERSION=$(grep -o '"pluginVersion": "[^"]*"' "$PROJECT/.claude/.anti-vibe-manifest.json" | cut -d'"' -f4)
    echo "Versão instalada: $INSTALLED_VERSION" | tee -a "$SYNC_LOG"
  else
    echo "Versão instalada: desconhecida (sem manifest)" | tee -a "$SYNC_LOG"
  fi

  # Criar backup
  BACKUP_DIR="$PROJECT/.claude/backups/sync-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  echo "Criando backup em: $BACKUP_DIR" | tee -a "$SYNC_LOG"

  # Backup de arquivos críticos
  [ -f "$PROJECT/CLAUDE.md" ] && cp "$PROJECT/CLAUDE.md" "$BACKUP_DIR/" 2>/dev/null
  [ -f "$PROJECT/.claude/.anti-vibe-manifest.json" ] && cp "$PROJECT/.claude/.anti-vibe-manifest.json" "$BACKUP_DIR/" 2>/dev/null
  [ -d "$PROJECT/.claude/rules" ] && cp -r "$PROJECT/.claude/rules" "$BACKUP_DIR/" 2>/dev/null

  # Sincronizar arquivos
  echo "Sincronizando arquivos do plugin..." | tee -a "$SYNC_LOG"

  # Copiar senior-principles.md se não existir
  if [ ! -f "$PROJECT/senior-principles.md" ]; then
    echo "  ✓ Copiando senior-principles.md" | tee -a "$SYNC_LOG"
    cp "$PLUGIN_DIR/senior-principles.md" "$PROJECT/" 2>/dev/null || echo "  ✗ Erro ao copiar senior-principles.md" | tee -a "$SYNC_LOG"
  fi

  # Criar marker para rodar init
  touch "$PROJECT/.claude/.needs-plugin-update"
  echo "  ✓ Marcador .needs-plugin-update criado" | tee -a "$SYNC_LOG"

  # Criar arquivo de instruções
  cat > "$PROJECT/.claude/.UPDATE-INSTRUCTIONS.md" <<EOF
# Atualização do Plugin Anti-Vibe Coding

O plugin foi atualizado de v3.x para v4.1.0.

## Mudanças principais:
- Sistema de versionamento automático
- Senior Principles (60+ conceitos técnicos)
- Progressive Disclosure (44 references)
- 3 novas skills: learn, infrastructure, enhance-prompt
- Extração automática de progress.txt

## AÇÃO NECESSÁRIA:

Abra este projeto no Claude Code e execute:

\`\`\`
/anti-vibe-coding:init
\`\`\`

Isso irá:
1. Detectar que você já tem o plugin instalado
2. Mostrar lista de atualizações disponíveis
3. Fazer merge inteligente (preserva suas modificações)
4. Criar .claude/.anti-vibe-manifest.json
5. Criar backup automático

## Backup:

Backup dos arquivos anteriores em:
$BACKUP_DIR

## Validação:

Após rodar /init, verificar:
- [ ] .claude/.anti-vibe-manifest.json foi criado
- [ ] senior-principles.md existe
- [ ] /anti-vibe-coding:update mostra "atualizado"
- [ ] /anti-vibe-coding:learn funciona
EOF

  echo "  ✓ Instruções criadas em .UPDATE-INSTRUCTIONS.md" | tee -a "$SYNC_LOG"

  ((SUCCESS++))
  echo "✓ $PROJECT_NAME sincronizado" | tee -a "$SYNC_LOG"
  echo "" | tee -a "$SYNC_LOG"
}

# Processar cada projeto
for PROJECT in "${PROJECTS[@]}"; do
  sync_project "$PROJECT"
done

# Resumo
echo "===================================" | tee -a "$SYNC_LOG"
echo "RESUMO DA SINCRONIZAÇÃO" | tee -a "$SYNC_LOG"
echo "===================================" | tee -a "$SYNC_LOG"
echo "Total: $TOTAL" | tee -a "$SYNC_LOG"
echo "Sucesso: $SUCCESS" | tee -a "$SYNC_LOG"
echo "Pulados: $SKIPPED" | tee -a "$SYNC_LOG"
echo "Falhas: $FAILED" | tee -a "$SYNC_LOG"
echo "" | tee -a "$SYNC_LOG"

if [ $SUCCESS -gt 0 ]; then
  echo "PRÓXIMOS PASSOS:" | tee -a "$SYNC_LOG"
  echo "1. Abrir cada projeto no Claude Code" | tee -a "$SYNC_LOG"
  echo "2. Executar: /anti-vibe-coding:init" | tee -a "$SYNC_LOG"
  echo "3. Aprovar merge de CLAUDE.md" | tee -a "$SYNC_LOG"
  echo "4. Validar que manifest foi criado" | tee -a "$SYNC_LOG"
  echo "" | tee -a "$SYNC_LOG"
fi

echo "Log completo: $SYNC_LOG"
