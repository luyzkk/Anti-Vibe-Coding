# Guidance: docs/QUALITY_SCORE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/QUALITY_SCORE.md define o **rubrico de avaliacao qualitativa** usado em code review. Diferente dos merge gates (que sao binarios — passa ou nao passa), o quality score eh uma pontuacao ponderada que captura julgamento humano sobre dimensoes como corretude, seguranca, manutenibilidade e performance. O documento responde: "como saber se um PR eh bom o suficiente para mergear?"

O publico primario sao revisores de PR — humanos e agentes — que precisam de um criterio compartilhado para avaliacao consistente.

## Espirito do doc (tom esperado)

Objetivo e ancorado em exemplos concretos. Uma dimensao de scoring sem exemplos de 1/5 e 5/5 eh subjetiva demais para ser util. "Alta manutenibilidade" nao significa nada sem "Alta manutenibilidade = funcao de menos de 30 linhas, nome de variavel autoexplicativo, zero `any` em TypeScript". O tom deve ser de um guia de calibracao, nao de uma aspiracao.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `review:` em issues ou PRs no historico — indica que o projeto ja tem um processo de revisao com criterios implicitos. Esses criterios devem tornar-se explicitos aqui.
- `checklist` em templates de PR — qualquer checklist existente deve informar as dimensoes de scoring.
- `score` ou `rubric` em documentacao existente — indica que o projeto ja tem um esboço de rubrico.
- `threshold` em configuracoes de CI — thresholds de cobertura ou complexidade ja definidos informam os pesos.

## Por H2 — o que escrever

### Scoring Dimensions
Lista as dimensoes avaliadas em cada revisao, com descricao de 1-2 sentencas por dimensao explicando o que ela captura. As dimensoes minimas esperadas sao corretude (faz o que prometeu?), seguranca (introduz vulnerabilidade?), e manutenibilidade (um colega consegue modificar daqui a 6 meses?). Se o projeto tem requisitos de performance critica, adicione performance como dimensao com metricas especificas.

**Cubra:** corretude, seguranca, manutenibilidade como minimo — adicione dimensoes especificas do projeto
**NAO escreva:** definicoes filosoficas abstratas sem ancoragem em pratica do dia-a-dia

### Weights
Cada dimensao tem um peso que reflete a prioridade do projeto. Os pesos devem somar 100%. A distribuicao nao eh universal — um projeto fintech da mais peso a seguranca, um prototipo interno da mais peso a velocidade. Documente o raciocinio por tras da distribuicao escolhida.

**Cubra:** peso numerico por dimensao, soma de 100%, justificativa da distribuicao
**NAO escreva:** lista de pesos sem justificativa (vira arbitraria com o tempo)

### Merge Threshold
O numero de pontos ponderados acima do qual um PR pode ser mergeado. Deve ser um numero — "7.5/10 ou acima" — nao uma faixa vaga. Tambem documente o processo de excecao: quem pode aprovar um PR abaixo do threshold e sob quais condicoes.

**Cubra:** threshold numerico, processo de excecao, quem tem autoridade para excecao
**NAO escreva:** "o PR deve ser bom" — qualifique e quantifique

### Score Examples
Dois ou tres exemplos concretos de PRs hipoteticos com a pontuacao derivada dimensao por dimensao. Um exemplo de PR bom (proximo do limite superior) e um de PR que nao mergearia (abaixo do threshold). Exemplos ancoram o rubrico e previnem deriva subjetiva ao longo do tempo.

**Cubra:** exemplo de PR bom (score alto), exemplo de PR que nao passaria, calculo dimensao por dimensao visivel
**NAO escreva:** exemplos hipoteticos vagos sem calculo explicito

## Links obrigatorios

`docs/MERGE_GATES.md` complementa o quality score com os gates binarios que bloqueiam merge independentemente da pontuacao. O leitor deve entender a diferenca entre "gate binario" e "score ponderado". O link ajuda a evitar confusao entre os dois mecanismos.

`docs/CODE_STYLE.md` alimenta a dimensao de manutenibilidade. Regras de estilo podem ser citadas como exemplos de criterios de avaliacao.

## Quando deixar TODO

Se o time ainda nao discutiu pesos de dimensao, deixe `TODO(<weights-decision needed>): distribuicao de pesos nao decidida — verificar com o time antes de publicar`. NAO preencha com valores arbitrarios — um rubrico com pesos errados calibra o time no sentido errado.

## Anti-patterns

- NAO criar dimensoes que nao tem como medir objetivamente — dimensao sem exemplo eh dimensao inutil
- NAO copiar rubricas de outros projetos sem adaptar ao contexto — pesos refletem prioridades especificas
- NAO misturar gates binarios (passou/falhou) com scores ponderados na mesma secao
- NAO deixar threshold como "depende do contexto" — isso elimina o valor do documento inteiro
