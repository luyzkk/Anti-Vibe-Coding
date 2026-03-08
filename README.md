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

Após instalar o plugin, configure seu projeto:

1. Copie o `CLAUDE.md` otimizado para a raiz do projeto
2. Crie `.claude/rules/` com as rules templates:
   - `typescript-standards.md` (carrega ao editar .ts/.tsx)
   - `testing-standards.md` (carrega ao editar .test.*)
   - `api-standards.md` (carrega ao editar api/*)
3. Crie `.claude/decisions.md` (vazio, será preenchido pelo plugin)

## Custo

~3 chamadas Haiku por mensagem (~$0.0003/mensagem). O plugin é invisível para tarefas simples.

## Princípios

Baseado em:
- Extreme Programming (XP) — Pair Programming adaptado
- Vídeo "Anti-Vibe Coding" do Fabio Akita
- TDD estrito (Red-Green-Refactor)
- Lições aprendidas com filtro de qualidade sênior
