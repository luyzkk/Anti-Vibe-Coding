# Fase 03 — grill-me: Common Rationalizations + Padrão Hypothesis

## Objetivo

Duas mudanças em `skills/grill-me/SKILL.md` (346 linhas):

1. Adicionar `## Common Rationalizations` + `## Red Flags` (domínio: entrevista pré-implementação)
2. Inserir Passo 1.5 com padrão `HYPOTHESIS:` / `CONFIDENCE:` / `GUESS:`

## Arquivo Afetado

- `skills/grill-me/SKILL.md`

## Processo

### Pré-condição obrigatória

Reler o arquivo completo (346 linhas) antes de qualquer edição. Identificar:
- Localização do Passo 1 (início do fluxo)
- Localização do Passo 2
- Última seção do arquivo

```bash
grep -n "## Passo\|## Common Rationalizations\|## Red Flags\|HYPOTHESIS\|CONFIDENCE\|GUESS" skills/grill-me/SKILL.md
```

### Mudança 1 — Common Rationalizations + Red Flags

Inserir APÓS a última seção existente no arquivo:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Já entendo o suficiente para começar" | Assumir entendimento sem validar é a fonte mais comum de retrabalho. O custo de uma pergunta é zero; o custo de uma semana de código errado não é. |
| "O usuário sabe o que quer" | Usuários descrevem soluções, não problemas. O trabalho do entrevistador é escavar até o problema real por baixo da solução proposta. |
| "Fazer muitas perguntas vai irritar o dev" | Um dev irritado por perguntas prefere isso a um agente que entrega a coisa errada. Clareza é respeito. |
| "Posso inferir o contexto do nome do projeto" | Nomes de projeto são rótulos, não specs. Dois projetos com o mesmo nome podem ter arquiteturas e restrições completamente diferentes. |

## Red Flags

- Código sendo gerado durante o grill-me (entrevista não concluída)
- Perguntas genéricas sem referência ao codebase ou contexto específico do dev
- Aceitar "sei lá, você decide" sem forçar uma escolha com trade-offs explícitos
- Avançar para implementação com confiança < 70% sem registrar as incertezas
- Hipótese não declarada antes de fazer perguntas (modelo mental oculto)
- Perguntas que confirmam o que o agente já assumiu em vez de testarem a hipótese
```

### Mudança 2 — Inserir Passo 1.5

Localizar o Passo 1 e o Passo 2 no arquivo. Inserir o bloco do Passo 1.5 ENTRE eles.

Conteúdo a inserir:

```markdown
## Passo 1.5 — Formular Hipótese com Confiança

ANTES de fazer qualquer pergunta, declarar internamente (pode mostrar ao dev):

\`\`\`
HYPOTHESIS: {hipótese sobre o que o dev realmente quer — 1 frase}
CONFIDENCE: {N}% — {motivo da incerteza, o que falta saber}
\`\`\`

Regras:
- Começar com confiança HONESTA (normalmente 20-40% antes de perguntar)
- Se confiança > 70%, verificar: consegue predizer as respostas das próximas 3 perguntas? Se não, o número está inflado
- A hipótese força comprometimento com um modelo mental — as perguntas testam essa hipótese

Nas perguntas do Passo 3, adicionar GUESS ao final de cada uma:

\`\`\`
GUESS: {sua hipótese para a resposta desta pergunta específica, com razão}
\`\`\`

O GUESS expõe o modelo mental do entrevistador. Dev que discorda do GUESS ativa uma correção mais rica do que um simples "sim/não".
```

### Invariantes obrigatórios

- Passo 1 original: intacto, sem nenhuma alteração
- Passo 2 original: intacto, sem nenhuma alteração
- Passo 1.5: inserido entre Passo 1 e Passo 2 — não no final do arquivo
- O bloco GUESS é instrução de comportamento, não deve ser inserido inline nas perguntas existentes do Passo 3

### Verificação pós-edição

Reler o arquivo após editar. Confirmar:

```bash
grep -n "## Passo 1\|## Passo 1.5\|## Passo 2\|HYPOTHESIS\|CONFIDENCE\|GUESS\|## Common Rationalizations\|## Red Flags" skills/grill-me/SKILL.md
```

Output esperado: Passo 1 antes de Passo 1.5, Passo 1.5 antes de Passo 2, seções de Red Flags e Common Rationalizations no final.

```bash
bun run harness:validate
```

## Sizing

~1h

## Gotchas

- 346 linhas — não editar sem reler o arquivo completo primeiro
- O Passo 1.5 usa backticks triplos dentro de markdown: escapar com `\`` conforme necessário no arquivo real
- Não alterar nenhuma seção existente além do ponto de inserção
- MEMORY.md deve registrar a posição exata do Passo 1.5 (linha) após a edição, para referência futura

## Checklist de Conclusão

- [ ] `skills/grill-me/SKILL.md` contém `## Common Rationalizations` com conteúdo específico de entrevista pré-implementação
- [ ] `skills/grill-me/SKILL.md` contém `## Red Flags` com ≥5 itens específicos do domínio
- [ ] Passo 1.5 inserido entre Passo 1 e Passo 2 (não em outro lugar)
- [ ] Bloco `HYPOTHESIS:` + `CONFIDENCE:` presente no Passo 1.5
- [ ] Instrução `GUESS:` presente no Passo 1.5
- [ ] Passo 1 original intacto (grep para confirmar que seu conteúdo não mudou)
- [ ] Passo 2 original intacto
- [ ] `bun run harness:validate` verde
- [ ] Contagem final de linhas do arquivo > 346 (confirma que conteúdo foi adicionado, não substituído)
