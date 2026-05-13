# Instruções de Sincronização — v4.1.0

**Data:** 23 Mar 2026
**Commit:** `e53a94b`
**Tag:** `v4.1.0`
**Status:** ✅ Commitado e publicado

---

## 🎯 O que Foi Feito

### 1. ✅ Sistema de Versionamento Implementado

- `plugin-manifest.json` — 39 arquivos rastreados
- `skills/update/SKILL.md` — Skill de atualização
- `skills/init/SKILL.md` — Atualizado com detecção de manifest
- Documentação completa (4 arquivos)

### 2. ✅ Scripts de Sincronização Criados

- `scripts/sync-projects.sh` — Sincronização em batch
- `scripts/generate-manifest.js` — Geração de checksums
- `.projects-to-sync.txt.example` — Template de configuração

### 3. ✅ Checklist de Validação

- `docs/validation-checklist.md` — 8 fases de validação

### 4. ✅ Commit e Push Realizados

```bash
Commit: e53a94b
Tag: v4.1.0
Branch: main
Remote: https://github.com/luyzkk/Anti-Vibe-Coding.git
```

---

## 📋 Próximos Passos

### Passo 1: Identificar Projetos

Crie o arquivo `.projects-to-sync.txt` com a lista de projetos:

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
cp .projects-to-sync.txt.example .projects-to-sync.txt
```

Edite `.projects-to-sync.txt` e adicione seus projetos (um por linha):

```
/caminho/completo/projeto1
/caminho/completo/projeto2
C:\Users\nome\projetos\projeto3
```

**Como encontrar projetos que usam o plugin:**

```bash
# Windows (PowerShell)
Get-ChildItem -Path C:\Users\nome\projetos -Recurse -Filter ".anti-vibe-manifest.json" -ErrorAction SilentlyContinue

# Ou buscar por CLAUDE.md que menciona "Anti-Vibe"
Get-ChildItem -Path C:\Users\nome\projetos -Recurse -Filter "CLAUDE.md" | Select-String "Anti-Vibe"

# Linux/Mac
find ~/projetos -name ".anti-vibe-manifest.json" 2>/dev/null
find ~/projetos -name "CLAUDE.md" -exec grep -l "Anti-Vibe" {} \;
```

---

### Passo 2: Executar Sincronização em Batch

**Opção A: Usando o script (recomendado)**

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

# Dar permissão de execução (Linux/Mac)
chmod +x scripts/sync-projects.sh

# Executar
bash scripts/sync-projects.sh

# Ou no Windows com Git Bash
./scripts/sync-projects.sh
```

**O script vai:**
1. Ler `.projects-to-sync.txt`
2. Para cada projeto:
   - Verificar se tem `.claude/`
   - Criar backup em `.claude/backups/sync-YYYYMMDD/`
   - Copiar `senior-principles.md` se não existir
   - Criar marker `.claude/.needs-plugin-update`
   - Criar instruções `.claude/.UPDATE-INSTRUCTIONS.md`
3. Gerar log em `.sync-log-YYYYMMDD-HHMMSS.txt`

**Opção B: Manual (um projeto por vez)**

```bash
# Variáveis
PLUGIN_DIR="f:/Projetos/Claude code/anti-vibe-coding"
PROJECT_DIR="/caminho/do/projeto"

# Criar backup
mkdir -p "$PROJECT_DIR/.claude/backups/manual-$(date +%Y%m%d)"
cp -r "$PROJECT_DIR/CLAUDE.md" "$PROJECT_DIR/.claude/backups/manual-$(date +%Y%m%d)/" 2>/dev/null

# Copiar senior-principles.md
[ ! -f "$PROJECT_DIR/senior-principles.md" ] && cp "$PLUGIN_DIR/senior-principles.md" "$PROJECT_DIR/"

# Criar marker
touch "$PROJECT_DIR/.claude/.needs-plugin-update"
```

---

### Passo 3: Atualizar Cada Projeto

Para **cada projeto** na lista:

1. **Abrir no Claude Code:**
   ```
   code /caminho/do/projeto
   ```

2. **Ler instruções:**
   ```
   cat .claude/.UPDATE-INSTRUCTIONS.md
   ```

3. **Executar init:**
   ```
   /anti-vibe-coding:init
   ```

4. **Seguir o fluxo interativo:**
   - Sistema detecta instalação existente
   - Mostra lista de atualizações
   - Escolher opção (recomendado: [1] Atualizar tudo)
   - Aprovar merge

5. **Validar:**
   - Verificar que `.claude/.anti-vibe-manifest.json` foi criado
   - Rodar `/anti-vibe-coding:update` (deve mostrar "atualizado")
   - Testar `/anti-vibe-coding:learn security`

6. **Usar checklist:**
   - Abrir `docs/validation-checklist.md` do plugin
   - Marcar cada item da checklist
   - Anotar problemas encontrados

---

### Passo 4: Validação

Para cada projeto, rodar estas verificações:

```bash
cd /caminho/do/projeto

# 1. Verificar manifest criado
test -f .claude/.anti-vibe-manifest.json && echo "✓ Manifest OK" || echo "✗ Manifest MISSING"

# 2. Verificar versão instalada
grep pluginVersion .claude/.anti-vibe-manifest.json

# 3. Verificar senior-principles
test -f senior-principles.md && echo "✓ Senior Principles OK" || echo "✗ Senior Principles MISSING"

# 4. Contar arquivos rastreados
grep -o '"[^"]*":' .claude/.anti-vibe-manifest.json | wc -l

# 5. Verificar backups
ls -la .claude/backups/
```

**No Claude Code:**

```
/anti-vibe-coding:update
```

Saída esperada:
```
✓ Plugin Anti-Vibe Coding está atualizado!
Versão instalada: v4.1.0
Nenhuma atualização disponível.
```

---

### Passo 5: Cleanup

Após validar TODOS os projetos:

```bash
# Deletar markers temporários
find /caminho/dos/projetos -name ".needs-plugin-update" -delete
find /caminho/dos/projetos -name ".UPDATE-INSTRUCTIONS.md" -delete

# Ou manualmente em cada projeto:
cd /projeto1 && rm .claude/.needs-plugin-update .claude/.UPDATE-INSTRUCTIONS.md
cd /projeto2 && rm .claude/.needs-plugin-update .claude/.UPDATE-INSTRUCTIONS.md
```

---

## 📊 Template de Tracking

Crie uma planilha ou arquivo para rastrear progresso:

```markdown
# Tracking de Sincronização — Anti-Vibe Coding v4.1.0

| Projeto | Path | Status | Data | Versão | Observações |
|---------|------|--------|------|--------|-------------|
| projeto1 | /path/projeto1 | ✅ OK | 23/03 | v4.1.0 | - |
| projeto2 | /path/projeto2 | ⏳ Pendente | - | - | - |
| projeto3 | /path/projeto3 | ⚠️ Parcial | 23/03 | v4.1.0 | Erro na skill learn |
| projeto4 | /path/projeto4 | ❌ Falhou | 23/03 | - | References não copiadas |

**Legenda:**
- ✅ OK: Atualizado e validado
- ⏳ Pendente: Aguardando atualização
- ⚠️ Parcial: Atualizado com problemas
- ❌ Falhou: Erro durante atualização
- ⏸️ Skip: Não precisa atualizar

**Estatísticas:**
- Total: 4 projetos
- Atualizados: 1
- Pendentes: 1
- Parciais: 1
- Falhas: 1
```

---

## 🔍 Verificação de Integridade

Execute este script para verificar integridade de TODOS os projetos:

```bash
#!/bin/bash

echo "=== Verificação de Integridade ==="
echo ""

while IFS= read -r PROJECT; do
  [[ "$PROJECT" =~ ^#.*$ ]] && continue
  [[ -z "$PROJECT" ]] && continue

  echo "Projeto: $(basename "$PROJECT")"

  # Manifest
  if [ -f "$PROJECT/.claude/.anti-vibe-manifest.json" ]; then
    VERSION=$(grep -o '"pluginVersion": "[^"]*"' "$PROJECT/.claude/.anti-vibe-manifest.json" | cut -d'"' -f4)
    FILES=$(grep -c '"[^"]*": {' "$PROJECT/.claude/.anti-vibe-manifest.json")
    echo "  ✓ Manifest: v$VERSION ($FILES arquivos)"
  else
    echo "  ✗ Manifest: NÃO ENCONTRADO"
  fi

  # Senior Principles
  if [ -f "$PROJECT/senior-principles.md" ]; then
    echo "  ✓ Senior Principles: OK"
  else
    echo "  ✗ Senior Principles: MISSING"
  fi

  # CLAUDE.md
  if grep -q "Versionamento e Atualizações" "$PROJECT/CLAUDE.md" 2>/dev/null; then
    echo "  ✓ CLAUDE.md: Atualizado"
  else
    echo "  ⚠️  CLAUDE.md: Não tem seção de versionamento"
  fi

  echo ""
done < .projects-to-sync.txt

echo "=== Fim da Verificação ==="
```

Salve como `scripts/check-integrity.sh` e rode:

```bash
bash scripts/check-integrity.sh
```

---

## 🚨 Troubleshooting

### Problema: Script sync-projects.sh não executa

**Windows:**
```bash
# Usar Git Bash
"C:\Program Files\Git\bin\bash.exe" scripts/sync-projects.sh

# Ou WSL
wsl bash scripts/sync-projects.sh
```

**Permissões (Linux/Mac):**
```bash
chmod +x scripts/sync-projects.sh
./scripts/sync-projects.sh
```

---

### Problema: .projects-to-sync.txt não encontrado

```bash
cp .projects-to-sync.txt.example .projects-to-sync.txt
nano .projects-to-sync.txt  # ou vim, code, etc.
```

---

### Problema: /anti-vibe-coding:init não reconhece atualização

**Causa:** Skill init não foi atualizada no projeto

**Solução:**
```bash
# Copiar skill init atualizada do plugin
cp "f:/Projetos/Claude code/anti-vibe-coding/skills/init/SKILL.md" \
   "/projeto/.claude/plugins/anti-vibe-coding/skills/init/SKILL.md"

# Rodar novamente
/anti-vibe-coding:init
```

---

### Problema: References não encontradas

**Sintoma:** Erro ao invocar skills técnicas

**Solução:**
```bash
# Copiar TODAS as skills do plugin
rsync -av "f:/Projetos/Claude code/anti-vibe-coding/skills/" \
         "/projeto/.claude/plugins/anti-vibe-coding/skills/"

# Ou manualmente
cp -r "f:/Projetos/Claude code/anti-vibe-coding/skills/security/references" \
      "/projeto/.claude/plugins/anti-vibe-coding/skills/security/"
```

---

## 📞 Suporte e Recursos

### Documentação:

- [CHANGELOG.md](CHANGELOG.md) — Histórico de mudanças
- [MUDANCAS-RECENTES.md](MUDANCAS-RECENTES.md) — Análise dos últimos 9 dias
- [IMPLEMENTACAO-VERSIONAMENTO.md](IMPLEMENTACAO-VERSIONAMENTO.md) — Documentação técnica
- [docs/versionamento-exemplo.md](docs/versionamento-exemplo.md) — Exemplos práticos
- [docs/versionamento-resumo.md](docs/versionamento-resumo.md) — Resumo executivo
- [docs/validation-checklist.md](docs/validation-checklist.md) — Checklist de validação

### Scripts:

- [scripts/generate-manifest.js](scripts/generate-manifest.js) — Gera checksums
- [scripts/sync-projects.sh](scripts/sync-projects.sh) — Sincronização em batch

### Arquivos de Configuração:

- `.projects-to-sync.txt` — Lista de projetos (você cria)
- `plugin-manifest.json` — Manifest do plugin (gerado automaticamente)

---

## ✅ Checklist Rápido

Antes de começar:
- [ ] Commit e push do plugin feitos (e53a94b)
- [ ] Tag v4.1.0 criada
- [ ] `.projects-to-sync.txt` criado com lista de projetos

Durante sincronização:
- [ ] Script executado sem erros
- [ ] Logs gerados em `.sync-log-*.txt`
- [ ] Backups criados em cada projeto

Pós-sincronização:
- [ ] Cada projeto: `/anti-vibe-coding:init` executado
- [ ] Cada projeto: manifest criado
- [ ] Cada projeto: validação completa (checklist)
- [ ] Tracking atualizado (planilha)
- [ ] Cleanup feito (markers removidos)

---

## 🎉 Conclusão

Sistema de versionamento **implementado**, **commitado** e **publicado**.

**Próximo:** Sincronizar todos os seus projetos seguindo os passos acima.

**Tempo estimado:** 5-10 minutos por projeto (incluindo validação)

Boa sincronização! 🚀
