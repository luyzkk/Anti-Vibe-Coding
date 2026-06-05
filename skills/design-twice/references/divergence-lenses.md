# Catalogo de Divergence Lenses

Referencia operacional para o `## Divergence Lenses` do `design-twice/SKILL.md`.
Cada framework e mapeado para "como vira uma restricao de subagente" — o catalogo e operacional, nao apenas teorico.

---

## As 7 Lentes (Quick Reference)

| Lente | Provocacao | Restricao para subagente |
|-------|-----------|--------------------------|
| Inversion | E se fizermos o oposto? | "Inverta a abordagem padrao. O que seria radicalmente diferente?" |
| Constraint-removal | E se budget/tempo/tech nao fossem fatores? | "Ignore restricoes praticas. Qual seria a solucao ideal?" |
| Audience-shift | E se fosse para outro usuario? | "Projete para um perfil oposto ao atual." |
| Combination | E se combinarmos com [adjacente]? | "Combine com [ideia adjacente]. O que emerge?" |
| Simplification | A versao 10x mais simples? | "Elimine 90% da complexidade. O que resolve o core?" |
| 10x | A versao em escala massiva? | "Projete para 10x volume/usuarios. O que muda fundamentalmente?" |
| Expert-lens | O que um especialista acharia obvio? | "Aplique perspectiva de especialista senior em [dominio]." |

---

## Frameworks Detalhados

### SCAMPER

Framework de geracao de ideias por transformacao sistematica de um conceito existente.

**Melhor para:** features onde ha uma solucao "padrao" e queremos variacoes genuinas.

| Operacao | Pergunta | Exemplo de restricao de subagente |
|----------|---------|-----------------------------------|
| **S**ubstitute | O que podemos substituir? | "Substitua [componente central] por [alternativa]. Como isso muda a arquitetura?" |
| **C**ombine | O que podemos combinar? | "Combine esta feature com [X existente]. O que emerge sem duplicar?" |
| **A**dapt | O que podemos adaptar de outro dominio? | "Adapte o padrao de [outro dominio]. Como se aplica aqui?" |
| **M**odify/Magnify | O que podemos amplificar? | "Leve [atributo] ao extremo. O que muda?" |
| **P**ut to other uses | Outro uso para componentes existentes? | "Use [componente existente] para resolver isso sem nova infraestrutura." |
| **E**liminate | O que podemos remover? | "Elimine [elemento considerado obrigatorio]. O sistema ainda funciona?" |
| **R**everse/Rearrange | O que podemos inverter? | "Inverta o fluxo padrao (ex: push vs pull, sincrono vs assincrono)." |

**Como vira restricao de subagente:** escolher 1-2 operacoes SCAMPER e formular como restricao explicita. Ex: "Aplique Eliminate + Substitute: remova o banco relacional da solucao e substitua por armazenamento no cliente."

---

### Pre-mortem

Tecnica de antecipacao de falhas: imaginar que o projeto JA falhou e trabalhar de tras para frente.

**Melhor para:** decisoes de alta reversibilidade ou quando ha otimismo excessivo na sala.

**Como usar em design-twice:**
1. Para cada proposta candidata, perguntar: "Imaginem que daqui a 6 meses esta proposta falhou catastroficamente. Por que falhou?"
2. As falhas antecipadas viram restricoes para o subagente divergente.

**Como vira restricao de subagente:** "Projete assumindo que [risco X identificado] vai se materializar. Qual arquitetura sobrevive a esse cenario?"

Exemplo: "Projete assumindo que o volume de dados vai ser 100x maior do que o esperado em 3 meses. Qual estrutura de dados e consultas sobrevivem sem refatoracao destrutiva?"

---

### First Principles Thinking

Decompo o problema em verdades fundamentais e reconstroi a solucao do zero, sem assumir as convencoes do dominio.

**Melhor para:** quando o "jeito padrao" parece limitante mas nao ha clareza sobre por que.

**Processo:**
1. Identifique todas as suposicoes embarcadas na solucao convencional.
2. Questione cada uma: "Isso e necessariamente verdade ou e convencao?"
3. Reconstrua partindo apenas do que e inegociavelmente verdadeiro.

**Como vira restricao de subagente:** "Ignore as convencoes do dominio. Partindo apenas de [verdade fundamental 1] e [verdade fundamental 2], qual seria a solucao minima viavel?"

Exemplo: "Ignore o padrao REST. Partindo apenas de 'cliente precisa de dados atualizados' e 'servidor tem estado', qual seria o protocolo minimo?"

---

### Jobs to Be Done (JTBD)

Foco no trabalho que o usuario esta tentando realizar, nao na feature em si. A feature e apenas um meio — o "job" e o objetivo real.

**Melhor para:** quando ha suspeita de que estamos construindo a feature errada para o problema certo.

**Formato do Job Statement:** "Quando [situacao], quero [motivacao], para [resultado esperado]."

**Como vira restricao de subagente:** "Ignore a solucao proposta. Projete para o job: '{job statement completo}'. Qual seria a feature mais direta para esse job?"

Exemplo: "Job: 'Quando preciso saber se meu time entregou, quero visibilidade instantanea, para nao precisar perguntar em reuniao.' Projete para isso — pode ser um dashboard, um alert, ou algo que ainda nao imaginamos."

---

### Constraint-Based Ideation

Restricoes artificiais forcam criatividade e eliminam solucoes que dependem de recursos que podem nao estar disponiveis.

**Melhor para:** quando as propostas ficam todas parecidas porque o espaco de busca e amplo demais.

**Tipos de restricao artificial:**
- **Zero-dep:** sem novas dependencias — usar apenas o que ja esta no projeto
- **Zero-infra:** sem nova infraestrutura — rodar no que ja existe
- **1-arquivo:** toda a feature em um unico arquivo
- **Prazo:** implementavel em 1 dia por 1 desenvolvedor
- **Custo-zero:** sem custos adicionais de servicos externos

**Como vira restricao de subagente:** formular a restricao artificial como premissa inegociavel. Ex: "Implemente sem adicionar nenhuma dependencia nova ao package.json. Apenas o que ja esta disponivel."

---

### Analogous Inspiration

Buscar solucoes em dominios completamente diferentes e adaptar os principios para o problema atual.

**Melhor para:** quando o espaco de solucoes no dominio tecnico parece esgotado ou quando todas as propostas usam os mesmos padroes.

**Processo:**
1. Identificar o problema abstrato (ex: "como garantir consistencia entre partes independentes?")
2. Encontrar como outros dominios resolvem o problema abstrato (ex: contratos legais, protocolos de aviacao, sistemas biologicos)
3. Adaptar o principio para o contexto tecnico

**Como vira restricao de subagente:** "Inspire-se em como [dominio analogico] resolve [problema abstrato]. Adapte o principio para nossa stack. Nao copie a implementacao — adapte a logica."

Exemplo: "Inspire-se em como contratos legais garantem acordos entre partes independentes (escrow, testemunhas, notarizacao). Como esse principio se aplica para garantir consistencia entre dois microservicos?"

---

## Selecao de Framework por Tipo de Problema

| Tipo de problema | Framework recomendado |
|------------------|-----------------------|
| "Ha muitas opcoes, nao sabemos por onde comecar" | SCAMPER (systematic exploration) |
| "Estamos muito otimistas com a abordagem" | Pre-mortem (failure anticipation) |
| "O jeito padrao parece errado mas nao sabemos por que" | First Principles |
| "Pode ser que estejamos construindo a feature errada" | JTBD |
| "As propostas ficaram todas parecidas" | Constraint-Based Ideation |
| "Nao temos ideias novas no dominio tecnico" | Analogous Inspiration |
| "Queremos validar variacoes de uma ideia existente" | SCAMPER |
