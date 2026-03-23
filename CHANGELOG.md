# Changelog

Todas as mudanças notáveis do plugin Anti-Vibe Coding serão documentadas aqui.

## [4.0.0] - 2026-03-23

### ✨ Adicionado

#### Sistema de Versionamento Automático
- **`plugin-manifest.json`**: Manifest central com checksums SHA-256 de todos os arquivos gerenciados
- **`.claude/.anti-vibe-manifest.json`**: Manifest local no projeto do usuário para rastreamento de versões
- **Skill `/anti-vibe-coding:update`**: Detecta e aplica atualizações incrementais
- **Estratégias de atualização**:
  - `merge` para CLAUDE.md e rules (preserva modificações do usuário)
  - `replace` para hooks, agents e documentação oficial
  - `never` para arquivos do projeto (decisions.md)
- **Backup automático**: Todos os arquivos vão para `.claude/backups/YYYY-MM-DD/` antes de atualizar
- **Detecção de modificações**: Compara checksums para detectar se usuário modificou arquivos

#### Documentação
- **`skills/lib/manifest-utils.md`**: Biblioteca de utilitários para versionamento
- **`docs/versionamento-exemplo.md`**: Exemplos práticos de todos os cenários
- **Seção "Versionamento"** adicionada ao CLAUDE.md e README.md

#### Scripts
- **`scripts/generate-manifest.js`**: Gera plugin-manifest.json automaticamente

### 🔄 Modificado

#### Skill Init
- **Passo 0**: Detecta se `.claude/.anti-vibe-manifest.json` existe
  - Se existe: chama lógica de update
  - Se não existe: faz instalação inicial
- **Passo 5**: Cria manifest local após instalação
- **Resumo final**: Mostra que manifest foi criado e como atualizar no futuro

#### CLAUDE.md
- Adicionada seção "Versionamento e Atualizações"
- Adicionadas skills Init e Update na tabela

#### README.md
- Seção "Setup do Projeto-Alvo" expandida
- Adicionada "Instalação Inicial" e "Atualizações Incrementais"
- Adicionada seção "Versionamento" com exemplo de manifest

### 📊 Estatísticas

- **Total de arquivos rastreados**: 39
  - CLAUDE.md: merge
  - senior-principles.md: replace
  - 8 rules: merge
  - 17 skills: replace
  - 10 agents: replace
  - 2 hooks: replace
  - 1 hooks.json: replace

### 🎯 Impacto para Usuários

#### Primeira Instalação
Nenhuma mudança no fluxo. Continua usando `/anti-vibe-coding:init`.

#### Atualizações
Agora quando rodar `/anti-vibe-coding:init` em projeto existente:
1. Detecta automaticamente que já tem o plugin instalado
2. Mostra lista de arquivos desatualizados
3. Detecta se você modificou algum arquivo
4. Permite escolher o que atualizar
5. Cria backup automático
6. Aplica merge inteligente (preserva suas modificações)

#### Exemplo Prático
```bash
# Antes (v3.5.0)
$ /anti-vibe-coding:init
# Sobrescrevia tudo, perdia modificações

# Agora (v4.0.0)
$ /anti-vibe-coding:init
## Atualizações Disponíveis
Plugin: v3.5.0 → v4.0.0

✓ CLAUDE.md (modificado por você)
  → Merge: preserva suas seções + adiciona novas do plugin

✓ senior-principles.md (novo arquivo)
  → Criar

Escolha: [1] Atualizar tudo [2] Escolher [3] Ver diff
```

### 🔧 Breaking Changes

Nenhum. Sistema é retrocompatível.

Projetos sem `.anti-vibe-manifest.json` são tratados como primeira instalação.

### 📝 Notas de Migração

#### Para projetos existentes (v3.x → v4.0.0)

Ao rodar `/anti-vibe-coding:init`:
1. Sistema detectará que não há manifest local
2. Fará instalação inicial (merge do CLAUDE.md)
3. Criará manifest local
4. Próximas execuções serão incrementais

**Nenhuma ação manual necessária.**

---

## [3.5.0] - 2026-03-XX

### Adicionado
- Skill `infrastructure` com princípios de DNS, hosting, deploy, CDN, serverless
- Agent `infrastructure-auditor` para auditoria de infra
- Rule `infrastructure-patterns.md`

### Modificado
- CLAUDE.md: adicionada tabela de infrastructure skill

---

## [3.0.0] - 2026-03-XX

### Adicionado
- 60+ princípios técnicos extraídos de referências
- Arquivo `senior-principles.md`
- 9 skills técnicas: security, architecture, api-design, design-patterns, react-patterns, system-design
- 8 agents especializados: security-auditor, database-analyzer, api-auditor, solid-auditor, code-smell-detector, react-auditor
- 8 rules: typescript, testing, api, security, database, infrastructure, solid, code-quality

---

## [2.0.0] - 2026-02-XX

### Adicionado
- Skill `consultant` (Modo Consultor)
- Skill `tdd-workflow` (7 passos)
- Skill `lessons-learned` com filtro de qualidade sênior
- Skill `decision-registry`
- Skill `anti-vibe-review`
- Hook `user-prompt-gate.cjs` (classificador)
- Hook `tdd-gate.cjs` (bloqueia código sem testes)
- Agent `tdd-verifier`
- Agent `documentation-writer`
- Agent `lesson-evaluator`

---

## [1.0.0] - 2026-01-XX

### Adicionado
- Estrutura inicial do plugin
- CLAUDE.md base
- Hooks básicos
