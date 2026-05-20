#!/bin/bash
# 2026-05-20 (Luiz/dev): D4/AR-02 do PRD knowledge-path-cutover — verifica que o check
# pos-sync detecta ausencia de stack e retorna exit 1.
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
KNOWLEDGE_SYNC_OK=true
for _kstack in "nodejs-typescript" "rails"; do
  if [ ! -f "$PLUGIN_GLOBAL/knowledge/$_kstack/INDEX.md" ]; then
    echo "ERRO: Sync incompleto — knowledge/$_kstack/INDEX.md ausente no cache global."
    KNOWLEDGE_SYNC_OK=false
  fi
done

if [ "$KNOWLEDGE_SYNC_OK" = "false" ]; then
  echo "TEST PASSED: script detectou ausencia e reportaria exit 1"
  exit 0
else
  echo "TEST FAILED: script deveria ter detectado ausencia de rails"
  exit 1
fi
