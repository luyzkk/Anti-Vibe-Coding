# Sistema de Versionamento — Resumo Executivo

## O Problema

Antes da v4.0.0:
- Rodar `/anti-vibe-coding:init` sobrescrevia arquivos do projeto
- Impossível saber se o plugin foi atualizado
- Perdia modificações customizadas do usuário
- Nenhum rastreamento de versões

## A Solução

Sistema de **versionamento automático** com checksums SHA-256.

### Componentes

1. **`plugin-manifest.json`** (no plugin)
   - Lista de TODOS os arquivos gerenciados
   - Versão, checksum e estratégia de cada arquivo
   - Gerado automaticamente via `scripts/generate-manifest.js`

2. **`.claude/.anti-vibe-manifest.json`** (no projeto do usuário)
   - Versão do plugin instalada
   - Checksum de cada arquivo APÓS instalação
   - Flag `userModified` para detectar modificações

3. **Skill `/anti-vibe-coding:update`**
   - Compara plugin-manifest vs local-manifest
   - Detecta arquivos desatualizados
   - Detecta modificações do usuário
   - Aplica updates com estratégias inteligentes

4. **Skill `/anti-vibe-coding:init` atualizada**
   - Detecta se manifest existe
   - Se existe: chama lógica de update
   - Se não existe: instalação inicial

### Estratégias de Atualização

| Arquivo | Estratégia | Por quê |
|---------|------------|---------|
| CLAUDE.md | **Merge** | Preserva seções do projeto + adiciona princípios do plugin |
| Rules (*.md) | **Merge** | Preserva customizações + adiciona novas regras |
| Hooks (*.cjs) | **Replace** | Lógica crítica do plugin, deve substituir |
| Agents (*.md) | **Replace** | Prompts oficiais do plugin |
| senior-principles.md | **Replace** | Documentação oficial |
| decisions.md | **Never** | É do projeto, nunca tocar |

### Fluxo de Atualização

```
1. Usuário roda /anti-vibe-coding:init
2. Sistema detecta .anti-vibe-manifest.json
3. Compara versões (v3.5.0 → v4.0.0)
4. Detecta 4 arquivos desatualizados
5. Detecta 1 arquivo modificado pelo usuário
6. Apresenta lista interativa
7. Usuário escolhe o que atualizar
8. Cria backup em .claude/backups/YYYY-MM-DD/
9. Aplica merge/replace conforme estratégia
10. Atualiza manifest local
11. Mostra resumo
```

## Benefícios

### Para o Usuário

✅ **Preserva modificações**: Merge inteligente mantém suas customizações
✅ **Backup automático**: Sempre pode reverter
✅ **Escolha seletiva**: Decide o que atualizar
✅ **Transparência**: Vê exatamente o que vai mudar
✅ **Zero configuração**: Funciona automaticamente

### Para o Desenvolvedor do Plugin

✅ **Versionamento automático**: `generate-manifest.js` cria checksums
✅ **Compatibilidade**: Projetos antigos funcionam (primeira instalação)
✅ **Rastreabilidade**: Sabe exatamente o que está instalado em cada projeto
✅ **Confiança**: Pode atualizar o plugin sem medo de quebrar projetos

## Exemplo Real

### Antes (v3.x)
```bash
$ /anti-vibe-coding:init
# Sobrescrevia CLAUDE.md inteiro
# Perdia seção "CI/CD Pipeline" que você tinha escrito
```

### Agora (v4.0.0)
```bash
$ /anti-vibe-coding:init

## Atualizações Disponíveis
Plugin: v3.5.0 → v4.0.0

✓ CLAUDE.md (v3.5.0 → v4.0.0)
  ⚠️ Modificado por você
  Estratégia: Merge inteligente
  Preview: Adicionou "Conhecimento Sênior"

  Suas seções preservadas:
  - CI/CD Pipeline
  - Deploy em Vercel

  Novas seções do plugin:
  - Versionamento e Atualizações
  - Skills Init/Update

Atualizar? [1] Sim [2] Ver diff [3] Cancelar
```

## Arquivos Criados/Modificados

### Novos Arquivos

```
anti-vibe-coding/
├── plugin-manifest.json              # Manifest do plugin
├── CHANGELOG.md                       # Histórico de mudanças
├── scripts/
│   └── generate-manifest.js          # Gerador de checksums
├── skills/
│   ├── update/
│   │   └── skill.md                  # Skill de update
│   └── lib/
│       └── manifest-utils.md         # Utilitários de versionamento
└── docs/
    ├── versionamento-exemplo.md      # Exemplos práticos
    └── versionamento-resumo.md       # Este arquivo
```

### Arquivos Modificados

```
anti-vibe-coding/
├── CLAUDE.md                         # + seção "Versionamento"
├── README.md                         # + seção "Setup" e "Versionamento"
└── skills/
    └── init/
        └── skill.md                  # + Passo 0 (detecção) e Passo 5 (manifest)
```

### Arquivos no Projeto do Usuário (criados pelo init)

```
meu-projeto/
└── .claude/
    ├── .anti-vibe-manifest.json     # Rastreamento de versões
    └── backups/                      # Backups automáticos
        └── 2026-03-23/
            ├── CLAUDE.md
            └── rules_security-patterns.md
```

## Comandos

### Instalar/Atualizar
```bash
/anti-vibe-coding:init
```

### Verificar Status
```bash
/anti-vibe-coding:update
```

### Gerar Manifest (dev do plugin)
```bash
node scripts/generate-manifest.js
```

## FAQ

### O que acontece com projetos antigos (v3.x)?

Funcionam normalmente. Primeira vez que rodar `/anti-vibe-coding:init` em v4.0.0:
1. Sistema detecta que não há manifest
2. Faz instalação inicial (merge inteligente)
3. Cria manifest
4. Próximas execuções serão incrementais

### Posso reverter uma atualização?

Sim. Backups estão em `.claude/backups/YYYY-MM-DD/`:

```bash
cp .claude/backups/2026-03-23/CLAUDE.md CLAUDE.md
```

Depois rode `/anti-vibe-coding:init` novamente para atualizar o manifest.

### E se eu deletar o manifest local?

Sistema tratará como primeira instalação. Fará merge do CLAUDE.md e recriará o manifest.

### Como sei quais arquivos eu modifiquei?

```bash
/anti-vibe-coding:update
```

Mostra lista de arquivos com flag `userModified: true`.

### Posso pular algum arquivo na atualização?

Sim. Escolha opção [2] "Escolher arquivo por arquivo".

### O manifest rastreia TODOS os arquivos do projeto?

Não. Apenas arquivos gerenciados pelo plugin:
- CLAUDE.md
- senior-principles.md
- .claude/rules/*.md
- .claude/agents/*.md (se copiados)
- .claude/hooks/*.cjs (se instalados)
- Skills instaladas

Seus arquivos de código não são rastreados.

## Estatísticas

- **Total de arquivos rastreados**: 39
- **Estratégia Merge**: 9 arquivos
- **Estratégia Replace**: 30 arquivos
- **Tamanho do plugin-manifest.json**: ~3KB
- **Tamanho médio do manifest local**: ~2KB

## Próximos Passos

1. ✅ Sistema de versionamento implementado
2. ⏳ Testar em projeto real
3. ⏳ Adicionar command `/anti-vibe-coding:rollback` para reverter updates
4. ⏳ Dashboard de versões (mostrar changelog ao atualizar)
5. ⏳ Notificação automática quando nova versão disponível
