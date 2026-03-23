# Versionamento — Exemplo Prático

Este documento mostra o fluxo completo de versionamento do plugin Anti-Vibe Coding.

## Cenário 1: Instalação Inicial

### Situação
Projeto novo, sem Anti-Vibe Coding instalado.

### Comando
```bash
/anti-vibe-coding:init
```

### O que acontece

**1. Detecção:**
```
Verificando instalação existente...
✗ .claude/.anti-vibe-manifest.json não encontrado

→ Modo: Instalação inicial
```

**2. Merge do CLAUDE.md:**
```
Seu CLAUDE.md contém configurações específicas do projeto.
Vou fazer merge com o template Anti-Vibe Coding.

Seções preservadas do seu CLAUDE.md:
- Instruções Gerais (stack: Next.js, Supabase, TypeScript)
- Variáveis de Ambiente (.env.local com Stripe keys)
- Workflow Git (conventional commits)

Seções adicionadas do Anti-Vibe:
- Filosofia de Trabalho (Anti-Vibe Coding)
- Workflow de Desenvolvimento (7 passos TDD)
- Modo Consultor
- Tabela de Skills (15 skills)
- Tabela de Agents (10 agents)

Aprovar merge? [1] Sim [2] Ver diff [3] Ajustar
```

**3. Instalação de Rules:**
```
Instalando rules...
✓ .claude/rules/typescript-standards.md (criado)
✓ .claude/rules/testing-standards.md (criado)
✓ .claude/rules/api-standards.md (criado)
✓ .claude/rules/security-patterns.md (criado)
✓ .claude/rules/database-patterns.md (criado)
✓ .claude/rules/infrastructure-patterns.md (criado)
✓ .claude/rules/solid-patterns.md (criado)
✓ .claude/rules/code-quality.md (criado)
```

**4. Criação do Manifest:**
```
Criando rastreamento de versões...
✓ .claude/.anti-vibe-manifest.json criado

Arquivos rastreados:
- CLAUDE.md (v4.0.0, checksum: ff1b3e...)
- senior-principles.md (v4.0.0, checksum: 3f7803...)
- 8 rules
- 10 agents
- 2 hooks

Total: 22 arquivos
```

**5. Resumo:**
```
## Anti-Vibe Coding — Setup Concluído

### Arquivos criados:
✓ CLAUDE.md (mesclado)
✓ senior-principles.md
✓ .claude/rules/ (8 arquivos)
✓ .claude/decisions.md
✓ .claude/.anti-vibe-manifest.json

### Próximos passos:
1. Revisar o CLAUDE.md mesclado
2. Iniciar nova sessão
3. Usar /anti-vibe-coding:consultant para próxima feature
```

---

## Cenário 2: Atualização com Arquivos Modificados

### Situação
Projeto já tem Anti-Vibe v3.5.0 instalado. Plugin foi atualizado para v4.0.0.

Usuário modificou:
- `CLAUDE.md` (adicionou seção "Padrões de CI/CD")
- `rules/typescript-standards.md` (adicionou regra customizada)

### Comando
```bash
/anti-vibe-coding:init
```

### O que acontece

**1. Detecção:**
```
Verificando instalação existente...
✓ .claude/.anti-vibe-manifest.json encontrado

→ Modo: Atualização incremental

Versão instalada: v3.5.0
Versão do plugin: v4.0.0
```

**2. Análise de Mudanças:**
```
Analisando arquivos...

Comparando versões:
✓ CLAUDE.md: v3.5.0 → v4.0.0 (modificado pelo usuário)
✓ senior-principles.md: novo arquivo
✓ rules/security-patterns.md: v3.5.0 → v4.0.0
✓ rules/typescript-standards.md: v3.5.0 (modificado pelo usuário, versão atual)
✓ agents/infrastructure-auditor.md: novo arquivo
○ hooks/tdd-gate.cjs: v4.0.0 (atualizado)
```

**3. Apresentação de Updates:**
```
## Atualizações Disponíveis do Anti-Vibe Coding

Plugin: v3.5.0 → v4.0.0

### Arquivos para atualizar (4):

✓ CLAUDE.md (v3.5.0 → v4.0.0)
  Status: Desatualizado
  ⚠️ Modificado pelo usuário
  Estratégia: Merge inteligente
  Preview: Adicionou seção "Conhecimento Sênior" e "Versionamento"

✓ senior-principles.md (novo)
  Status: Novo arquivo
  Estratégia: Criar
  Preview: Documento com 60+ princípios técnicos extraídos de referências

✓ rules/security-patterns.md (v3.5.0 → v4.0.0)
  Status: Desatualizado
  Modificado pelo usuário: Não
  Estratégia: Merge
  Preview: Adicionou validação HMAC webhooks e constant-time comparisons

✓ agents/infrastructure-auditor.md (novo)
  Status: Novo arquivo
  Estratégia: Criar
  Preview: Agent para auditoria de infra (DNS, Docker, health checks)

### Arquivos sem mudanças (18):

○ rules/typescript-standards.md (modificado por você, mas versão atual)
○ hooks/tdd-gate.cjs (já atualizado)
... (16 mais)

Escolha:
[1] Atualizar tudo
[2] Escolher arquivo por arquivo
[3] Ver diff de cada arquivo
[4] Cancelar
```

**4. Usuário escolhe [3] Ver diff:**
```
## CLAUDE.md — Diff

=== Suas modificações preservadas ===
+ Seção "Padrões de CI/CD" (suas)
+ Configuração de GitHub Actions (suas)

=== Adicionadas do plugin v4.0.0 ===
+ Seção "Conhecimento Sênior"
+ Seção "Versionamento e Atualizações"
+ Skills: Init, Update
+ Agent: infrastructure-auditor

Aplicar este merge? [S/n]
```

**5. Backup Automático:**
```
Criando backups...
✓ .claude/backups/2026-03-23/CLAUDE.md
✓ .claude/backups/2026-03-23/rules_security-patterns.md

Backups criados: 2 arquivos
```

**6. Aplicação:**
```
Aplicando atualizações...

✓ CLAUDE.md — merge aplicado
  Preservadas: suas seções customizadas
  Adicionadas: Conhecimento Sênior, Versionamento, 2 skills

✓ senior-principles.md — criado

✓ rules/security-patterns.md — merge aplicado
  Adicionadas: HMAC validation, constant-time comparisons

✓ agents/infrastructure-auditor.md — criado
```

**7. Atualização do Manifest:**
```
Atualizando .claude/.anti-vibe-manifest.json...

Arquivos atualizados:
- CLAUDE.md: v3.5.0 → v4.0.0 (checksum: novo)
- senior-principles.md: - → v4.0.0 (novo)
- rules/security-patterns.md: v3.5.0 → v4.0.0 (checksum: novo)
- agents/infrastructure-auditor.md: - → v4.0.0 (novo)

✓ Manifest atualizado
```

**8. Resumo:**
```
## Atualização Concluída

Versão: v3.5.0 → v4.0.0

### Atualizados (4 arquivos):
✓ CLAUDE.md (merge — suas modificações preservadas)
✓ senior-principles.md (novo)
✓ rules/security-patterns.md (merge)
✓ agents/infrastructure-auditor.md (novo)

### Preservados (1 arquivo):
○ rules/typescript-standards.md (suas modificações mantidas)

### Backups criados em:
.claude/backups/2026-03-23/

### Próximos passos:
1. Revisar CLAUDE.md atualizado
2. Ler senior-principles.md (novos princípios)
3. Iniciar nova sessão
```

---

## Cenário 3: Verificação de Status (Sem Atualizações)

### Comando
```bash
/anti-vibe-coding:update
```

### Saída
```
Verificando atualizações...

✓ Plugin Anti-Vibe Coding está atualizado!

Versão instalada: v4.0.0
Versão do plugin: v4.0.0

Arquivos rastreados: 22
Arquivos modificados por você: 2
  - CLAUDE.md
  - rules/typescript-standards.md

Nenhuma atualização disponível.
```

---

## Cenário 4: Escolha Seletiva de Arquivos

### Situação
3 arquivos disponíveis para atualização. Usuário quer escolher.

### Escolha: [2] Escolher arquivo por arquivo

**Arquivo 1:**
```
1/3 — CLAUDE.md (v3.5.0 → v4.0.0)

Status: Desatualizado
Modificado por você: Sim
Estratégia: Merge inteligente
Preview: Adicionou seção "Conhecimento Sênior"

Atualizar este arquivo? [S/n]
```

Usuário: `S`

**Arquivo 2:**
```
2/3 — senior-principles.md (novo)

Status: Novo arquivo
Estratégia: Criar
Preview: Documento com 60+ princípios técnicos

Criar este arquivo? [S/n]
```

Usuário: `n` (não quer agora)

**Arquivo 3:**
```
3/3 — agents/infrastructure-auditor.md (novo)

Status: Novo arquivo
Estratégia: Criar
Preview: Agent para auditoria de infra

Criar este arquivo? [S/n]
```

Usuário: `S`

**Resumo da seleção:**
```
Arquivos selecionados para atualização:
✓ CLAUDE.md
✓ agents/infrastructure-auditor.md

Arquivos ignorados:
○ senior-principles.md (você pode instalar depois)

Aplicar atualizações? [S/n]
```

---

## Estrutura de Arquivos Após Instalação

```
meu-projeto/
├── CLAUDE.md                       # Mesclado (projeto + plugin)
├── senior-principles.md            # Do plugin (read-only)
└── .claude/
    ├── .anti-vibe-manifest.json   # Rastreamento de versões
    ├── decisions.md                # Seu (never touched)
    ├── backups/                    # Backups automáticos
    │   └── 2026-03-23/
    │       ├── CLAUDE.md
    │       └── rules_security-patterns.md
    └── rules/                      # Rules do plugin (merged)
        ├── typescript-standards.md
        ├── testing-standards.md
        ├── api-standards.md
        ├── security-patterns.md
        ├── database-patterns.md
        ├── infrastructure-patterns.md
        ├── solid-patterns.md
        └── code-quality.md
```

---

## Manifest Local (Exemplo Real)

Arquivo: `.claude/.anti-vibe-manifest.json`

```json
{
  "pluginVersion": "4.0.0",
  "installedAt": "2026-03-23T15:30:00.000Z",
  "files": {
    "CLAUDE.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "a3f2e8d9c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1",
      "lastUpdated": "2026-03-23",
      "userModified": true
    },
    "senior-principles.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "3f780395aa9827c1f251f9f27b8af398c7c3736f229b9110c703b1a5fb071d45",
      "lastUpdated": "2026-03-23",
      "userModified": false
    },
    "rules/typescript-standards.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "b8e7f6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7",
      "lastUpdated": "2026-03-23",
      "userModified": true
    },
    "rules/security-patterns.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "ab58af497a987747ed6a34d15b3ae6f3a2b6038d3606a3ffe12eb9491030fd09",
      "lastUpdated": "2026-03-23",
      "userModified": false
    }
    // ... mais 18 arquivos
  }
}
```

### Campos do Manifest

| Campo | Descrição |
|-------|-----------|
| `pluginVersion` | Versão do plugin instalada |
| `installedAt` | Data/hora da instalação inicial |
| `sourceVersion` | Versão do arquivo no plugin quando foi instalado |
| `installedChecksum` | SHA-256 do arquivo APÓS instalação/merge |
| `lastUpdated` | Data da última atualização deste arquivo |
| `userModified` | `true` se checksum atual ≠ checksum instalado |

---

## Comandos Úteis

### Verificar Status
```bash
/anti-vibe-coding:update
```

### Forçar Atualização
```bash
/anti-vibe-coding:init
```

### Ver Qual Versão Está Instalada
Ler `.claude/.anti-vibe-manifest.json`:
```bash
cat .claude/.anti-vibe-manifest.json | grep pluginVersion
```

### Ver Arquivos Modificados Por Você
```bash
# Manualmente comparar checksums
cat .claude/.anti-vibe-manifest.json
```

Ou usar a skill:
```bash
/anti-vibe-coding:update
```

### Restaurar Backup
```bash
cp .claude/backups/2026-03-23/CLAUDE.md CLAUDE.md
```

Depois rodar `/anti-vibe-coding:init` novamente para atualizar o manifest.
