---
name: lessons-learned
description: "This skill should be used when the user asks to 'add a lesson learned', 'register a lesson', 'review lessons', 'prune obsolete lessons', or when a significant error pattern is detected that should be recorded for future sessions. Manages project-specific senior knowledge with quality filters."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|review|prune [description]"
---

# Licoes Aprendidas — Anti-Vibe Coding

Gerenciar o repositorio de conhecimento de nivel senior do projeto.

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
2. **E especifica deste projeto** — Se aplica ao contexto, stack ou regras de negocio do projeto
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
- `[Performance]` — Otimizacoes no contexto de escala do projeto
- `[Negocio]` — Regras de negocio que impactam como o codigo deve ser escrito
- `[Deploy]` — Particularidades do ambiente de producao
- `[Armadilha]` — Comportamentos inesperados que parecem certos mas estao errados

## Limite de Manutencao

- Maximo de **15 entradas**
- Se atingir 15: verificar se alguma licao ja foi absorvida nos padroes permanentes. Se sim, remover e incorporar na secao apropriada
- Se uma licao nao foi relevante nas ultimas 10 sessoes, provavelmente pode ser removida

## Fluxo de Trabalho

### Ao adicionar (`add`):
1. Ler o arquivo de licoes do projeto (`.claude/lessons.md` ou secao no CLAUDE.md)
2. Verificar se a licao ja existe ou e coberta por outra
3. Aplicar o filtro de qualidade (>=2 criterios)
4. Se passar, adicionar no formato correto
5. Se nao passar, explicar por que nao qualifica
6. **Avaliar promocao a senior-principles:** perguntar ao usuario se a licao atende aos 4 criterios de promocao (ver abaixo). Se o usuario confirmar, adicionar ao `senior-principles.md` na secao apropriada

### Ao revisar (`review`):
1. Listar todas as licoes com numeracao
2. Para cada uma, indicar se ainda e relevante

### Ao podar (`prune`):
1. Identificar licoes obsoletas ou ja absorvidas
2. Sugerir remocao com justificativa
3. Esperar aprovacao do desenvolvedor antes de remover

## Promocao a Senior Principles

Apos registrar uma licao aprovada, avaliar se ela merece ser promovida ao `senior-principles.md`. Perguntar ao usuario:

> "Esta licao parece [universal/nao-obvia/etc]. Ela atende os criterios para ir ao senior-principles.md?"

### Criterios de promocao (TODOS devem ser atendidos):

| Criterio | Pergunta-chave |
|----------|---------------|
| **Universal** | Aplica em qualquer projeto, nao so neste? |
| **Nao-obvia** | Um junior erraria isso sem saber? |
| **Provada por falha** | Foi aprendida por um erro real, nao teoria? |
| **Prevencao de dano** | O erro causa bug silencioso, vulnerabilidade ou perda de dados? |

Se falhar em qualquer um, a licao fica apenas nas lessons do projeto.

### Ao promover:
1. Identificar a secao correta no `senior-principles.md` (Seguranca, Qualidade, API Design, etc.)
2. Adicionar no formato existente: regra concisa + justificativa apos o travessao
3. Se nenhuma secao existente se aplica, criar uma nova secao
4. Confirmar com o usuario o texto final antes de salvar

## Acao solicitada

$ARGUMENTS
