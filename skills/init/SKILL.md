---
name: init
description: "Inicializa o Anti-Vibe Coding num projeto. Se já existir CLAUDE.md, faz merge inteligente preservando informações do projeto e adicionando a filosofia Anti-Vibe. Sempre pede aprovação antes de aplicar."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicialize o Anti-Vibe Coding no projeto atual. Este skill detecta o estado do projeto e adapta o setup.

## Fluxo de Execução

### Passo 1 — Detectar Estado do Projeto

Verifique a existência destes arquivos no projeto:
- `CLAUDE.md` na raiz
- `.claude/rules/` com rules existentes
- `.claude/decisions.md`

### Passo 2 — Setup do CLAUDE.md

#### Cenário A: Projeto SEM CLAUDE.md

1. Leia o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`
2. Apresente ao usuário o conteúdo que será criado
3. Pergunte: "Este CLAUDE.md será criado na raiz do projeto. Aprovar?"
4. Se aprovado, crie o arquivo

#### Cenário B: Projeto COM CLAUDE.md existente (MERGE)

Este é o cenário mais importante. Siga EXATAMENTE:

1. **Leia** o CLAUDE.md existente do projeto (o "original")
2. **Leia** o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md` (o "template")
3. **Analise** o original e identifique:
   - Seções específicas do projeto (stack, configs, variáveis de ambiente, regras de negócio, etc.)
   - Padrões já definidos que podem conflitar com o Anti-Vibe
   - Informações que DEVEM ser preservadas
4. **Faça o merge** seguindo estas regras de prioridade:

#### Regras de Merge

| Situação | Ação |
|----------|------|
| Seção existe SÓ no original | **PRESERVAR** integralmente |
| Seção existe SÓ no template Anti-Vibe | **ADICIONAR** ao resultado |
| Seção existe em AMBOS sem conflito | **COMBINAR** (original + Anti-Vibe) |
| Seção existe em AMBOS COM conflito | **PRESERVAR o original**, adicionar nota do Anti-Vibe como complemento |
| Informações do projeto (stack, env vars, configs) | **SEMPRE preservar** do original |
| Filosofia Anti-Vibe Coding | **SEMPRE adicionar** no topo |
| Workflow de desenvolvimento | **Adicionar** se não existir workflow equivalente |
| Tabelas de skills/commands do Anti-Vibe | **SEMPRE adicionar** ao final |

#### Estrutura do Merge (ordem das seções)

```
1. Filosofia Anti-Vibe Coding (do template — SEMPRE no topo)
2. Instruções Gerais (merge: original + template)
3. [Seções específicas do projeto original — TODAS preservadas na ordem original]
4. Padrões Core (do template, se o original não tiver equivalente)
5. Workflow de Desenvolvimento (do template, se o original não tiver equivalente)
6. Modo Consultor (do template — resumo com link para skill)
7. Modelo de Permissões (merge: original + template)
8. Auto-Correção e Aprendizado (do template)
9. Anti-Patterns (merge: original + template)
10. [Mais seções específicas do original, se houver]
11. Plugin Anti-Vibe Coding (tabelas de skills/agents — SEMPRE ao final)
12. Git Workflow (merge: original + template)
13. Lições Aprendidas (do template, se não existir)
14. Decisões Arquiteturais (do template, se não existir)
```

5. **Apresente o resultado** ao usuário mostrando:
   - O CLAUDE.md mesclado completo
   - Um resumo das mudanças:
     - Seções adicionadas do Anti-Vibe
     - Seções preservadas do original
     - Seções mescladas (indicando o que veio de cada lado)
     - Conflitos resolvidos (e como foram resolvidos)

6. **Peça aprovação** usando AskUserQuestion:
   - Opção 1: "Aprovar e aplicar"
   - Opção 2: "Ver diff detalhado" (mostra antes/depois lado a lado)
   - Opção 3: "Ajustar antes de aplicar" (permite o usuário dar feedback para modificar)

7. Se o usuário escolher "Ajustar", aplique as modificações pedidas e apresente novamente

8. Se aprovado, **crie backup** do original como `CLAUDE.md.backup` e aplique o merge

### Passo 3 — Setup das Rules

1. Verifique se `.claude/rules/` existe
2. Para cada rule do Anti-Vibe (typescript, testing, api):
   - Se a rule NÃO existe no projeto: copie do template
   - Se a rule JÁ existe: apresente as diferenças e pergunte se quer mesclar
3. Copie as rules aprovadas

As rules do template estão em: `${CLAUDE_PLUGIN_ROOT}/rules/`

### Passo 4 — Setup do Decisions Registry

1. Se `.claude/decisions.md` não existe, crie com template vazio
2. Se já existe, não toque

### Passo 5 — Resumo Final

Apresente um resumo do que foi feito:

```
## Anti-Vibe Coding — Setup Concluído

### Arquivos criados/modificados:
- [✅/🔀/⏭️] CLAUDE.md — [criado/mesclado/já existia]
- [✅/⏭️] .claude/rules/typescript-standards.md
- [✅/⏭️] .claude/rules/testing-standards.md
- [✅/⏭️] .claude/rules/api-standards.md
- [✅/⏭️] .claude/decisions.md

### Próximos passos:
1. Revise o CLAUDE.md mesclado
2. Inicie uma nova sessão para os hooks ativarem
3. Use `/anti-vibe-coding:consultant` para sua próxima feature
```

## Regras Importantes

- **NUNCA sobrescreva** informações do projeto sem aprovação
- **NUNCA remova** seções existentes do CLAUDE.md original
- **SEMPRE** crie backup antes de modificar
- **SEMPRE** mostre ao usuário o que será alterado antes de alterar
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, não substitui
- Se não tiver certeza sobre um conflito, **pergunte ao usuário**

## Diretório do projeto

$ARGUMENTS
