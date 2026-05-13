# Fase 02 — Advisor Hook: Tabela Faz Bem / Faz Mal (Akita)

**Arquivo:** `f:\Projetos\Claude code\anti-vibe-coding\hooks\hooks.json`  
**Sizing:** ~1h  
**Decisao PRD:** D12

## Contexto

O hook `SessionStart` exibe ao modelo uma lista de skills disponíveis e instrui o advisor a recomendar a skill certa para cada domínio. A tabela Akita complementa isso com uma distinção fundamental: **em quais domínios o agente faz bem vs. mal**. Isso instrui o advisor a escalar para skills específicas (`/consultant`, `/architecture`, `/security`) quando detectar pedidos nos domínios onde o modelo tende a errar.

O hook é puramente **instructional** — texto que o modelo lê como contexto. Não executa lógica condicional. A tabela é educativa: informa o modelo sobre seus próprios limites para que ele os respeite.

## Estrutura do Arquivo

O `hooks.json` tem o SessionStart com dois hooks:
1. Hook 0: `node -e ...version-check.cjs...` (timeout 5)
2. Hook 1: `printf '...'` com a mensagem longa do advisor

A edição afeta apenas o hook 1 (o `printf`). O arquivo não deve ser reformatado.

## Onde Inserir

A tabela Akita entra **ao final** do `printf`, antes do caractere de fechamento `'` da string, após o bloco "Quando NAO sugerir skill".

## Diff Exato

**AVISO:** O `printf` é uma única linha longa. Use as âncoras abaixo para localizar o ponto de inserção com precisão. A âncora é os últimos ~80 chars da string antes do fechamento.

**old_string** (fim da string do printf, incluindo o fechamento):
```
- Usuario disse: prosseguir, sem skill, skip\\n'"
```

**new_string:**
```
- Usuario disse: prosseguir, sem skill, skip\\n\\nTabela Akita — Limites do Agente:\\nFaz BEM (delegar ao agente):\\n- Boilerplate e scaffolding\\n- Testes (estrutura e cobertura)\\n- Refactoring mecanico (rename, extract, inline)\\n- Pesquisa contextual (docs, exemplos, alternativas)\\n- Consistencia de padroes no codebase\\nFaz MAL (escalar para skill especializada):\\n- Decisoes de arquitetura → use /anti-vibe-coding:consultant ou /anti-vibe-coding:architecture\\n- Conhecimento de dominio do negocio → pergunte ao dev\\n- Opiniao/preferencia pessoal → nao assuma, pergunte\\n- Seguranca proativa (auth, crypto, secrets) → use /anti-vibe-coding:security\\n- Priorizacao de features → nao e sua decisao\\nQuando detectar pedido nos dominios Faz MAL: sinalize o risco e sugira a skill antes de prosseguir.\\n'"
```

## Resultado Esperado

Após a edição, o printf termina com:

```
...Usuario disse: prosseguir, sem skill, skip\n
\n
Tabela Akita — Limites do Agente:\n
Faz BEM (delegar ao agente):\n
- Boilerplate e scaffolding\n
- Testes (estrutura e cobertura)\n
- Refactoring mecanico (rename, extract, inline)\n
- Pesquisa contextual (docs, exemplos, alternativas)\n
- Consistencia de padroes no codebase\n
Faz MAL (escalar para skill especializada):\n
- Decisoes de arquitetura → use /anti-vibe-coding:consultant ou /anti-vibe-coding:architecture\n
- Conhecimento de dominio do negocio → pergunte ao dev\n
- Opiniao/preferencia pessoal → nao assuma, pergunte\n
- Seguranca proativa (auth, crypto, secrets) → use /anti-vibe-coding:security\n
- Priorizacao de features → nao e sua decisao\n
Quando detectar pedido nos dominios Faz MAL: sinalize o risco e sugira a skill antes de prosseguir.\n
'
```

## Checklist de Execucao

- [ ] Leu o arquivo `hooks/hooks.json` antes de editar
- [ ] Identificou o hook SessionStart[0].hooks[1] (o `printf`)
- [ ] Localizou a âncora: `- Usuario disse: prosseguir, sem skill, skip\\n'"`
- [ ] Aplicou o diff usando old_string/new_string exatos acima
- [ ] Verificou que o JSON continua válido após edição (sem quebra de aspas ou vírgulas)
- [ ] Releu o arquivo após edição — `hooks.json` deve parsear sem erro
- [ ] Rodou `node -e "require('./hooks/hooks.json')"` de dentro de `anti-vibe-coding/` para validar JSON
- [ ] Commit: `feat(hooks): add Akita faz-bem/faz-mal table to advisor hook (D12)`

## Validacao JSON

Após editar, rodar dentro de `f:\Projetos\Claude code\anti-vibe-coding\`:

```bash
node -e "const d = require('./hooks/hooks.json'); console.log('OK', Object.keys(d.hooks))"
```

Esperado: `OK [ 'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop' ]`

## Notas

- Usar `\\n` (duas barras) dentro da string JSON para representar newlines no printf
- O `→` nos bullets é um caractere Unicode — se o editor não suportar, substituir por `->`
- Não alterar nenhum outro hook (UserPromptSubmit, PreToolUse, PostToolUse, Stop)
- Não reformatar o arquivo inteiro — manter a linha longa como está
