# Checklist de Validação — Atualização do Plugin

Use este checklist para validar que cada projeto foi atualizado corretamente para v4.1.0.

---

## 📋 Para Cada Projeto

### Projeto: ___________________________

**Data da atualização:** ___/___/______

---

## Fase 1: Pré-Atualização

- [ ] Projeto tem `.claude/` na raiz
- [ ] Backup criado em `.claude/backups/sync-YYYYMMDD-HHMMSS/`
- [ ] Arquivo `.claude/.UPDATE-INSTRUCTIONS.md` criado
- [ ] Arquivo `.claude/.needs-plugin-update` existe

**Notas:**
```
_______________________________________________
_______________________________________________
```

---

## Fase 2: Execução do /init

### Executar no Claude Code:

```
/anti-vibe-coding:init
```

### Verificações Durante:

- [ ] Sistema detectou instalação existente
- [ ] Mostrou mensagem "Modo: Atualização incremental"
- [ ] Listou arquivos desatualizados
- [ ] Detectou modificações do usuário (se houver)

**Lista de arquivos para atualizar (anotar):**
```
_______________________________________________
_______________________________________________
_______________________________________________
```

### Escolha de Atualização:

- [ ] Opção escolhida: [ 1 ] Atualizar tudo  [ 2 ] Escolher  [ 3 ] Ver diff  [ 4 ] Cancelar

**Se escolheu "Ver diff":**
- [ ] Diff do CLAUDE.md mostrou preservação de seções customizadas
- [ ] Diff mostrou novas seções do plugin (Versionamento, Skills)

**Se escolheu "Escolher arquivo por arquivo":**
- [ ] Aprovado: _________________________________
- [ ] Recusado: _________________________________

---

## Fase 3: Pós-Atualização

### Arquivos Criados/Atualizados:

- [ ] `.claude/.anti-vibe-manifest.json` foi criado
- [ ] `senior-principles.md` existe na raiz
- [ ] `CLAUDE.md` foi atualizado (tem seção "Versionamento e Atualizações")
- [ ] `.claude/backups/YYYY-MM-DD/` contém backups

### Validar Manifest:

```bash
cat .claude/.anti-vibe-manifest.json | grep pluginVersion
```

**Versão esperada:** "4.1.0" (ou "4.0.0" se não atualizou tag)

- [ ] `pluginVersion` está correto
- [ ] `installedAt` tem timestamp recente
- [ ] Seção `files` contém pelo menos 20 arquivos

**Total de arquivos rastreados:** _______

---

## Fase 4: Testes Funcionais

### 1. Verificar Status de Atualização:

```
/anti-vibe-coding:update
```

**Saída esperada:**
```
✓ Plugin Anti-Vibe Coding está atualizado!
Versão instalada: v4.1.0
Nenhuma atualização disponível.
```

- [ ] Comando funcionou sem erros
- [ ] Mostrou "está atualizado"
- [ ] Versão mostrada: __________

---

### 2. Testar Skill Learn (Nova):

```
/anti-vibe-coding:learn security básico
```

**Saída esperada:**
- Explicação adaptada ao nível básico
- Referências ao senior-principles.md

- [ ] Comando funcionou sem erros
- [ ] Conteúdo educativo foi retornado
- [ ] Referências corretas ao knowledge base

---

### 3. Testar Skill Infrastructure (Nova):

```
/anti-vibe-coding:infrastructure
```

**Saída esperada:**
- Resumo de infraestrutura (DNS, CDN, load balancer, etc.)
- Opção de aprofundar em tópicos

- [ ] Comando funcionou sem erros
- [ ] Mostrou resumo de infraestrutura
- [ ] References carregadas corretamente

---

### 4. Testar Progressive Disclosure:

Invocar qualquer skill técnica e verificar se references são acessíveis:

```
/anti-vibe-coding:security
```

- [ ] Skill carregou sem erros de "file not found"
- [ ] Mostrou resumo
- [ ] Ofereceu opção de aprofundar em tópicos

**Tópico aprofundado (se testado):** __________________

- [ ] Reference foi carregada sem erros
- [ ] Conteúdo técnico detalhado foi exibido

---

### 5. Verificar Senior Principles:

```bash
cat senior-principles.md | head -20
```

- [ ] Arquivo existe
- [ ] Contém seção "Segurança (Obrigatório)"
- [ ] Contém seção "Qualidade de Código"
- [ ] Tem pelo menos 60 linhas

---

### 6. Testar Extração de progress.txt (Se Aplicável):

Se o projeto tem `progress.txt` ou arquivos similares:

**Arquivos de conhecimento no projeto:**
- [ ] `progress.txt`
- [ ] `PROGRESS.md`
- [ ] `.claude/memory/*.md`
- [ ] `notes.md`
- [ ] `gotchas.md`
- [ ] Outros: _________________________________

**Durante /init, foi perguntado sobre extração?**
- [ ] Sim → Aprovei extração
- [ ] Sim → Recusei extração
- [ ] Não foi perguntado (arquivos não encontrados)

**Se extraiu conhecimento:**
- [ ] Lições adicionadas ao CLAUDE.md
- [ ] Decisões adicionadas a `.claude/decisions.md`
- [ ] Originais arquivados em `.claude/archive/`

---

## Fase 5: Validação de Modificações do Usuário

### Se o projeto tinha customizações no CLAUDE.md:

**Seções customizadas (anotar):**
```
_______________________________________________
_______________________________________________
```

**Após merge:**
- [ ] Seções customizadas foram preservadas
- [ ] Novas seções do plugin foram adicionadas
- [ ] Não houve perda de informação

### Se o projeto tinha customizações em rules:

**Rules customizadas:**
- [ ] `typescript-standards.md` (modificada: SIM / NÃO)
- [ ] `testing-standards.md` (modificada: SIM / NÃO)
- [ ] `api-standards.md` (modificada: SIM / NÃO)
- [ ] Outras: _________________________________

**Após merge:**
- [ ] Customizações preservadas
- [ ] Novas regras do plugin adicionadas

---

## Fase 6: Backup e Reversão

### Verificar Backup:

```bash
ls -la .claude/backups/
```

- [ ] Diretório de backup existe
- [ ] Backup contém `CLAUDE.md` (se foi modificado)
- [ ] Backup contém arquivos de rules (se foram modificados)

**Path do backup:** `.claude/backups/___________________`

### Teste de Reversão (Opcional):

Se quiser testar a reversão:

```bash
# Copiar backup
cp .claude/backups/YYYY-MM-DD/CLAUDE.md CLAUDE.md.test-restore

# Verificar conteúdo
diff CLAUDE.md CLAUDE.md.test-restore

# Limpar teste
rm CLAUDE.md.test-restore
```

- [ ] Backup está íntegro
- [ ] Reversão funciona (se testado)

---

## Fase 7: Estrutura de Arquivos

### Verificar estrutura completa:

```bash
tree .claude -L 2
```

**Estrutura esperada:**
```
.claude/
├── .anti-vibe-manifest.json
├── .needs-plugin-update (pode deletar após validação)
├── .UPDATE-INSTRUCTIONS.md (pode deletar após validação)
├── backups/
│   └── YYYY-MM-DD/
├── decisions.md
└── rules/
    ├── api-standards.md
    ├── code-quality.md
    ├── database-patterns.md
    ├── infrastructure-patterns.md
    ├── security-patterns.md
    ├── solid-patterns.md
    ├── testing-standards.md
    └── typescript-standards.md
```

- [ ] Estrutura corresponde ao esperado
- [ ] Todos os arquivos críticos existem

---

## Fase 8: Cleanup

Após validação completa:

```bash
# Deletar markers temporários
rm .claude/.needs-plugin-update
rm .claude/.UPDATE-INSTRUCTIONS.md

# Commit das mudanças (se usar git)
git status
git add .
git commit -m "chore: update anti-vibe-coding plugin to v4.1.0"
```

- [ ] Markers temporários removidos
- [ ] Mudanças commitadas (se aplicável)

---

## ✅ Status Final

### Resumo:

- **Atualização:** [ ] ✅ Sucesso  [ ] ⚠️ Parcial  [ ] ❌ Falhou
- **Testes:** _____ de 6 passaram
- **Backup:** [ ] Criado e validado
- **Modificações preservadas:** [ ] Sim  [ ] Não aplicável

### Problemas Encontrados:

```
_______________________________________________
_______________________________________________
_______________________________________________
```

### Ações Necessárias:

```
_______________________________________________
_______________________________________________
_______________________________________________
```

### Data de conclusão: ___/___/______

---

## 📊 Template de Relatório

Copie e preencha para documentar:

```markdown
## Projeto: [NOME]

**Data:** [DATA]
**Versão anterior:** [VERSÃO]
**Versão atual:** v4.1.0
**Status:** ✅ Sucesso / ⚠️ Parcial / ❌ Falhou

**Arquivos atualizados:** [NÚMERO]
**Modificações preservadas:** [SIM/NÃO]
**Testes funcionais:** [X/6 passaram]

**Observações:**
- [Observação 1]
- [Observação 2]
```

---

## 🔧 Troubleshooting

### Problema: Manifest não foi criado

**Solução:**
1. Verificar que rodou `/anti-vibe-coding:init` (não `/init`)
2. Verificar se skill `init` foi atualizada
3. Rodar novamente e observar erros

---

### Problema: Skills novas não funcionam

**Sintoma:** `/anti-vibe-coding:learn` retorna "skill not found"

**Solução:**
1. Verificar que sincronizou arquivos do plugin
2. Verificar que `skills/learn/SKILL.md` existe
3. Reiniciar sessão do Claude Code

---

### Problema: References não encontradas

**Sintoma:** Erro "File not found: skills/security/references/..."

**Solução:**
1. Verificar que `skills/*/references/*.md` foram copiados
2. Sincronizar novamente com rsync/cp
3. Verificar permissões de leitura

---

### Problema: Merge perdeu customizações

**Solução:**
1. Restaurar do backup: `cp .claude/backups/YYYY-MM-DD/CLAUDE.md CLAUDE.md`
2. Revisar o diff antes de aprovar
3. Escolher opção "Ajustar antes de aplicar"

---

## 📞 Suporte

Se encontrar problemas não documentados:
1. Verificar `.sync-log-*.txt` no diretório do plugin
2. Verificar logs do Claude Code
3. Criar issue no repositório do plugin
