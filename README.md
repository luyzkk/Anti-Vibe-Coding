# Anti-Vibe Coding Plugin

Plugin Claude Code para desenvolvimento disciplinado baseado na metodologia Anti-Vibe Coding (Fabio Akita / XP).

Automatiza TDD, modo consultor, lições aprendidas e decisões arquiteturais — sem ser burocrático.

## Instalação

```bash
claude --plugin-dir ./anti-vibe-coding
```

Ou adicione ao seu `settings.json`:

```json
{
  "plugins": ["./path/to/anti-vibe-coding"]
}
```

## O que o plugin faz

### Hooks (automáticos, custo zero de contexto)

| Hook | Evento | Função |
|------|--------|--------|
| Classificador | `UserPromptSubmit` | Classifica mensagens: QUICK_FIX, BUG_FIX, NEW_FEATURE, ARCHITECTURE, QUESTION |
| TDD Gate | `PreToolUse` (Write/Edit) | Bloqueia código de produção sem testes |
| Detector de Correção | `Stop` | Detecta correções e features completadas |
| Context Injection | `SessionStart` | Injeta princípios Anti-Vibe no início da sessão |

### Skills (workflows invocáveis)

| Skill | Comando | Auto? |
|-------|---------|-------|
| Consultor | `/anti-vibe-coding:consultant` | Sim (quando detecta incerteza) |
| TDD Workflow | `/anti-vibe-coding:tdd-workflow` | Não |
| Lições Aprendidas | `/anti-vibe-coding:lessons-learned` | Não (sugerido pelo Stop hook) |
| Decisões | `/anti-vibe-coding:decision-registry` | Não |
| Revisão | `/anti-vibe-coding:anti-vibe-review` | Não |

### Agents (executores isolados)

| Agent | Model | Função |
|-------|-------|--------|
| tdd-verifier | Haiku | Verifica compliance TDD (read-only) |
| documentation-writer | Sonnet | Cria/atualiza documentação |
| lesson-evaluator | Haiku | Avalia qualidade de lições |

## Filosofia

> **Disciplina > Velocidade**

- Humano = Navegador (decide)
- IA = Piloto (executa com disciplina)
- Testes vêm ANTES do código
- Incerteza → Consultoria ANTES de implementação

## Fluxo de Trabalho

```
Mensagem do usuário
    ↓
[Classificador] → Classifica complexidade
    ↓
┌── Incerteza? → /consultant (ensina antes de codar)
├── Feature/Bug? → /tdd-workflow (7 passos TDD)
└── Quick fix? → Corrige direto (TDD gate leniente)
    ↓
[TDD Gate] → Bloqueia código sem testes
    ↓
[Stop hook] → Detecta correções/conclusões
    ↓
┌── Correção? → Sugere /lessons-learned add
└── Feature completa? → Sugere /anti-vibe-review
```

## Setup do Projeto-Alvo

### Instalação Inicial

Execute no projeto que deseja configurar:

```bash
/anti-vibe-coding:init
```

Isso irá:
1. Fazer merge inteligente do `CLAUDE.md` (preserva suas configurações)
2. Instalar `.claude/rules/` (TypeScript, Testing, API, Security, etc.)
3. Criar `.claude/decisions.md`
4. Criar `.claude/.anti-vibe-manifest.json` (rastreamento de versões)
5. Copiar `senior-principles.md` (60+ princípios técnicos)

### Atualizações Incrementais

Quando o plugin for atualizado, execute novamente:

```bash
/anti-vibe-coding:init
```

O sistema detecta automaticamente que você já tem o plugin instalado e:
- Mostra quais arquivos estão desatualizados
- Detecta se você modificou algum arquivo
- Aplica merge inteligente (preserva suas modificações)
- Cria backup automático em `.claude/backups/`

**Estratégias de atualização:**
- **CLAUDE.md**: Merge (preserva + adiciona novos princípios)
- **Rules**: Merge (preserva customizações + adiciona novas)
- **Hooks/Agents**: Replace (lógica do plugin)
- **senior-principles.md**: Replace (documentação oficial)
- **decisions.md**: Never (é seu)

### Verificar Status

Para ver o status da sua instalação:

```bash
/anti-vibe-coding:update
```

Isso mostra:
- Versão instalada vs versão do plugin
- Arquivos desatualizados
- Arquivos modificados por você
- Preview das mudanças

## Versionamento

O plugin rastreia automaticamente a versão de todos os arquivos instalados usando checksums SHA-256.

**Arquivos rastreados:**
- `CLAUDE.md`
- `senior-principles.md`
- `.claude/rules/*.md` (8 rules)
- `.claude/agents/*.md` (10 agents)
- `.claude/hooks/*.cjs` (2 hooks)
- Skills instaladas

**Manifest local:** `.claude/.anti-vibe-manifest.json`

Exemplo:
```json
{
  "pluginVersion": "4.0.0",
  "installedAt": "2026-03-23T10:30:00Z",
  "files": {
    "CLAUDE.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "ff1b3e...",
      "lastUpdated": "2026-03-22",
      "userModified": false
    }
  }
}
```

**Backups:** Tudo vai para `.claude/backups/YYYY-MM-DD/` antes de ser modificado.

## Custo

~3 chamadas Haiku por mensagem (~$0.0003/mensagem). O plugin é invisível para tarefas simples.

## Princípios

Baseado em:
- Extreme Programming (XP) — Pair Programming adaptado
- Vídeo "Anti-Vibe Coding" do Fabio Akita
- TDD estrito (Red-Green-Refactor)
- Lições aprendidas com filtro de qualidade sênior
