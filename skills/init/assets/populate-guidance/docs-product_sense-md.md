# Guidance: docs/PRODUCT_SENSE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/PRODUCT_SENSE.md define o **framework de julgamento de produto** do projeto: quando questionar um requisito, como avaliar se uma feature vale o custo de implementacao, e quais metricas proxy indicam que o usuario recebeu valor real. NAO eh um spec tecnico — eh o conjunto de lentes atraves das quais decisoes de produto sao avaliadas.

O publico primario sao contribuidores (humanos e agentes) que precisam decidir se devem implementar algo diretamente ou primeiro questionar e entender melhor o requisito.

## Espirito do doc (tom esperado)

Reflexivo e ancorado em exemplos concretos do proprio projeto. "Quando o requisito tem menos de 3 exemplos de uso real, peca exemplos antes de codificar" eh bom. "Sempre pense no usuario" eh ruim — vago ao ponto de ser inutil. Cada principio deve ter um exemplo do tipo "isso aconteceu no projeto X e o resultado foi Y".

## Sinais a procurar no codebase

Este doc NAO eh derivado do codigo — eh sintese de valores do time. Os sinais abaixo ajudam a descobrir contexto historico:

- `TODO(product):` ou `XXX:` em comentarios — areas de incerteza historica que revelam onde o time ja teve duvidas de produto.
- Commits com mensagens vagas ("fix", "update", "misc") — sinal de requisito mal formado na origem.
- Issues ou PRs com titulos em forma de pergunta — perguntas abertas que nunca foram resolvidas.
- `docs/exec-plans/completed/` — planos concluidos que documentam decisoes de produto pasadas sao os melhores exemplos.

## Por H2 — o que escrever

### Push Back Criteria
Os sinais concretos que indicam que um requisito merece questionamento antes de implementacao. Inclui tanto sinais no requisito em si (vago, sem exemplo, assume usuario sem entrevista) quanto sinais no codigo (duplica logica existente, rompe uma invariante documentada em ARCHITECTURE.md). Cada criterio deve ser verificavel — alguem deve poder ler e decidir "sim, esse requisito tem esse sinal" sem interpretacao adicional.

**Cubra:** quando questionar o requisito, como enquadrar o questionamento de forma construtiva
**NAO escreva:** lista de quando dizer "nao" para o PM — o objetivo eh clareza, nao confronto

### Feature Evaluation
O framework de avaliacao de uma feature nova: quais perguntas fazer, como pesar valor para o usuario versus custo de engenharia, quais features historicas do projeto serviram como bons exemplos de avaliacao. Se o projeto tem um processo de discovery documentado, aponte para ele.

**Cubra:** checklist de criterios de avaliacao, como balancear valor vs custo
**NAO escreva:** framework generico de produto sem ancoragem no contexto especifico deste projeto

### User Value Metrics
Como o projeto mede que uma feature entregou valor real. Metricas proxy sao validas (uso de feature, retencao, NPS) mas devem ser explicitas — "aumentamos o engagement" sem definir engagement nao mede nada. Se o projeto ainda nao tem metricas definidas, deixe TODO explicito.

**Cubra:** metricas em uso, metricas proxy e o que elas aproximam, como interpretar quedas nas metricas
**NAO escreva:** framework de metricas universal sem aplicar ao produto especifico

### Anti-Patterns
Os erros de julgamento de produto mais comuns que ja ocorreram neste projeto ou que o time quer evitar. Over-engineering (construir para cenarios hipoteticos), feature-creep (adicionar escopo sem remover), e scope inflation (a task cresce durante a execucao sem re-aprovacao) sao candidatos universais, mas os mais valiosos sao os especificos do historico deste projeto.

**Cubra:** exemplos de over-engineering e feature-creep especificos do projeto, sinais de scope inflation
**NAO escreva:** lista generica de anti-patterns de produto sem exemplos concretos

## Links obrigatorios

`docs/PLANS.md` — planos ativos e concluidos sao a fonte primaria de decisoes de produto historicas. O link garante que um leitor de PRODUCT_SENSE.md possa checar se um principio foi aplicado (ou violado) em planos reais.

## Quando deixar TODO

Se o time ainda nao tem metricas de produto definidas, deixe `TODO(<metrics-definition needed>): metricas de valor nao definidas — discutir com responsavel de produto antes de popular User Value Metrics`. NAO invente metricas que nao sao coletadas.

## Anti-patterns

- NAO citar autores ou frameworks externos ("Marty Cagan diz...") — vira religiao em vez de pratica do time
- NAO transformar o doc em "como dizer nao para o PM" — o objetivo eh clareza de requisito, nao confronto
- NAO usar voz futura ("vamos medir...") — descritivo do estado atual; o que nao existe vai para TODO
- NAO listar features especificas do produto aqui — pertence a docs/PLANS.md ou ao backlog
