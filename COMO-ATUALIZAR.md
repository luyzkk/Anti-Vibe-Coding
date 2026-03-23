# Como Atualizar o Plugin — Guia Simples

**Versão:** v4.1.0
**Última atualização:** 23 Mar 2026

---

## 🎯 Resumo

Plugin instalado **globalmente** → Atualização **automática** via `/anti-vibe-coding:init`

---

## Para VOCÊ (Desenvolvedor do Plugin)

### Quando Fizer Mudanças no Plugin:

```bash
# 1. Editar arquivos do plugin
vim skills/security/SKILL.md
vim CLAUDE.md
# etc...

# 2. Regenerar manifest
node scripts/generate-manifest.js

# 3. Commit
git add .
git commit -m "feat: add new feature"

# 4. Push
git push origin main
```

**Pronto!** Todos os projetos podem atualizar agora.

---

## Para VOCÊ (Ao Usar um Projeto)

### Quando o Plugin Foi Atualizado:

**1. Abrir o projeto no Claude Code**

O hook detecta automaticamente:
```
⚠️ Plugin Anti-Vibe Coding atualizado!

Versão instalada: v4.0.0
Versão disponível: v4.1.0

✨ Para atualizar, execute:
/anti-vibe-coding:init
```

**2. Rodar `/anti-vibe-coding:init`**

```
/anti-vibe-coding:init
```

Sistema detecta automaticamente:
- Mostra lista de arquivos desatualizados
- Detecta se você modificou algo
- Faz merge inteligente
- Cria backup
- Atualiza manifest local

**3. Aprovar updates**

Escolher:
- [1] Atualizar tudo (recomendado)
- [2] Escolher arquivo por arquivo
- [3] Ver diff antes

**Pronto!** Projeto sincronizado.

---

## Para SEUS AMIGOS (Primeiro Uso)

### Instalação Inicial:

**1. Clonar o plugin globalmente** (uma vez só):

```bash
# Windows
git clone https://github.com/luyzkk/Anti-Vibe-Coding.git "%USERPROFILE%\.claude\plugins\anti-vibe-coding"

# Linux/Mac
git clone https://github.com/luyzkk/Anti-Vibe-Coding.git ~/.claude/plugins/anti-vibe-coding
```

**2. No projeto, rodar:**

```
/anti-vibe-coding:init
```

**Pronto!** Plugin instalado.

### Atualizações Futuras:

**1. Atualizar plugin global:**

```bash
# Windows
cd "%USERPROFILE%\.claude\plugins\anti-vibe-coding"
git pull

# Linux/Mac
cd ~/.claude/plugins/anti-vibe-coding
git pull
```

**2. No projeto, rodar:**

```
/anti-vibe-coding:init
```

**Pronto!** Projeto atualizado.

---

## 🔧 Comandos Úteis

### Verificar Status

```
/anti-vibe-coding:sync
```

Mostra:
- Versão do plugin global
- Versão instalada no projeto
- Se está sincronizado ou não

### Forçar Recarregamento

Se cache não invalidar automaticamente:

```
/anti-vibe-coding:sync
```

Depois:

```
/anti-vibe-coding:init
```

### Ver Mudanças Disponíveis

```
/anti-vibe-coding:update
```

Mostra lista de arquivos desatualizados sem aplicar nada.

---

## 🎬 Fluxo Completo (Exemplo)

### Cenário: Você Adicionou Nova Skill de "Database"

**1. Desenvolver:**
```bash
cd ~/.claude/plugins/anti-vibe-coding
mkdir skills/database
vim skills/database/SKILL.md
# ... escrever skill

node scripts/generate-manifest.js
git add .
git commit -m "feat: add database skill"
git push
```

**2. Atualizar em um projeto:**
```
# Abrir projeto no Claude Code
# Hook mostra: "⚠️ Plugin atualizado!"

/anti-vibe-coding:init

# Sistema mostra:
# ✓ skills/database/SKILL.md (novo)
# Estratégia: Criar

# Escolher [1] Atualizar tudo
# ✓ skills/database/SKILL.md criado
# ✓ Manifest atualizado

# Testar:
/anti-vibe-coding:database
```

**3. Outros projetos fazem o mesmo:**
Cada pessoa abre seu projeto, vê o aviso, roda `/init`. Pronto!

---

## ❓ FAQ

### P: Preciso rodar `/init` em todos os projetos sempre que atualizar o plugin?

**R:** Sim, mas só quando **quiser usar as novas features naquele projeto**.

- Se não rodar `/init`, projeto continua usando versão antiga (funciona normalmente)
- Hook avisa quando há atualização disponível
- Você escolhe quando atualizar cada projeto

### P: O que acontece se eu modificar CLAUDE.md do projeto?

**R:** Merge inteligente preserva suas modificações!

- Sistema detecta que você modificou
- Mostra diff do merge
- Preserva suas seções
- Adiciona novas seções do plugin
- Pede aprovação antes de aplicar

### P: E se eu não quiser atualizar agora?

**R:** Sem problema!

- Escolher opção [2] Não ou [4] Cancelar
- Hook continua avisando toda vez que abrir o projeto
- Projeto funciona normalmente com versão antiga

### P: Como desfazer uma atualização?

**R:** Backup automático em `.claude/backups/YYYY-MM-DD/`

```bash
# Restaurar CLAUDE.md
cp .claude/backups/2026-03-23/CLAUDE.md CLAUDE.md

# Rodar init novamente para atualizar manifest
/anti-vibe-coding:init
```

### P: Cache não invalida automaticamente?

**R:** Forçar com `/anti-vibe-coding:sync`

Mostra versões e força Claude Code a recarregar.

---

## 🚨 Troubleshooting

### Erro: "skill not found" mesmo após atualizar

**Solução:**
```
/anti-vibe-coding:sync
/anti-vibe-coding:init
# Reiniciar sessão do Claude Code
```

### Hook não mostra aviso de atualização

**Causa:** `hooks/version-check.cjs` pode não ter sido atualizado

**Solução:**
```bash
cd ~/.claude/plugins/anti-vibe-coding
git pull
# Reiniciar Claude Code
```

### Manifest corrompido

**Solução:**
```bash
rm .claude/.anti-vibe-manifest.json
/anti-vibe-coding:init
```

---

## 📚 Documentação Completa

- [CHANGELOG.md](CHANGELOG.md) — Histórico de versões
- [MUDANCAS-RECENTES.md](MUDANCAS-RECENTES.md) — Últimas 2 semanas
- [IMPLEMENTACAO-VERSIONAMENTO.md](IMPLEMENTACAO-VERSIONAMENTO.md) — Detalhes técnicos
- [docs/validation-checklist.md](docs/validation-checklist.md) — Checklist de validação

---

## ✅ Checklist Rápido

**Desenvolvedor do plugin:**
- [ ] Fazer mudanças
- [ ] Rodar `node scripts/generate-manifest.js`
- [ ] Commit + push

**Usuário do plugin:**
- [ ] Ver aviso do hook (automático)
- [ ] Rodar `/anti-vibe-coding:init`
- [ ] Aprovar updates

**Pronto!** Sistema funcionando.
