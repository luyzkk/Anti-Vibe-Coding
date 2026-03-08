---
name: lessons-learned
description: "Gestao de licoes aprendidas com filtro de qualidade senior. Use para adicionar, revisar ou podar licoes do projeto. Cada licao deve atender pelo menos 2 de 4 criterios de qualidade."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|review|prune [description]"
---

# Licoes Aprendidas — Anti-Vibe Coding

Gerencie o repositorio de conhecimento de nivel senior do projeto.

## Comandos

### `add` — Adicionar nova licao
Quando o desenvolvedor ou o hook de correcao detectar um erro significativo.

### `review` — Revisar licoes existentes
Listar e revisar todas as licoes, verificando relevancia.

### `prune` — Podar licoes obsoletas
Remover licoes que nao foram relevantes nas ultimas 10 sessoes ou que ja foram absorvidas em regras permanentes.

## Filtro de Qualidade Senior

Uma licao SO deve ser registrada se atender a PELO MENOS 2 destes criterios:

1. **Nao e deduzivel** — A IA nao conseguiria inferir essa regra apenas lendo a documentacao da stack
2. **E especifica deste projeto** — Se aplica ao nosso contexto, stack ou regras de negocio
3. **O custo do erro e alto** — Se repetido, causa retrabalho significativo, bug em producao, perda de dados
4. **E contra-intuitiva** — Vai contra o que a IA faria por padrao

## O que NUNCA adicionar

- Erros de sintaxe ou typos
- Bugs que os testes ja cobrem
- Coisas que a documentacao oficial ja explica
- Padroes genericos de clean code
- Qualquer coisa que a IA acertaria na segunda tentativa sem instrucao

## Formato das Entradas

```
### [Categoria] Titulo conciso da licao
**Regra:** [Uma frase imperativa, direta]
**Contexto:** [Por que essa regra existe — maximo 2 linhas]
```

### Categorias validas:
- `[Arquitetura]` — Decisoes estruturais que afetam multiplos modulos
- `[Integracao]` — Comportamentos especificos de APIs, servicos ou libs externas
- `[Performance]` — Otimizacoes no nosso contexto de escala
- `[Negocio]` — Regras de negocio que impactam como o codigo deve ser escrito
- `[Deploy]` — Particularidades do ambiente de producao
- `[Armadilha]` — Comportamentos inesperados que parecem certos mas estao errados

## Limite de Manutencao

- Maximo de **15 entradas**
- Se atingir 15: alguma licao ja foi absorvida nos padroes permanentes? Se sim, remova e incorpore na secao apropriada
- Se uma licao nao foi relevante nas ultimas 10 sessoes, provavelmente pode ser removida

## Fluxo de Trabalho

### Ao adicionar (`add`):
1. Leia o arquivo de licoes do projeto (`.claude/lessons.md` ou secao no CLAUDE.md)
2. Verifique se a licao ja existe ou e coberta por outra
3. Aplique o filtro de qualidade (>=2 criterios)
4. Se passar, adicione no formato correto
5. Se nao passar, explique por que nao qualifica

### Ao revisar (`review`):
1. Liste todas as licoes com numeracao
2. Para cada uma, indique se ainda e relevante

### Ao podar (`prune`):
1. Identifique licoes obsoletas ou ja absorvidas
2. Sugira remocao com justificativa
3. Espere aprovacao do desenvolvedor antes de remover

## Acao solicitada

$ARGUMENTS
