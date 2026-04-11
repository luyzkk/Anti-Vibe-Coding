# Surgical Changes — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar qualquer arquivo.

## Principio: Toque Apenas no que Deve. Limpe Apenas a Sua Bagunca.

Derivado das observacoes de Andrej Karpathy: LLMs frequentemente "melhoram" codigo adjacente, mudam comentarios e estilo de forma ortogonal a task.

### Rastreabilidade

Cada linha mudada deve rastrear diretamente ao pedido do usuario.
Se nao consegue justificar uma mudanca com "o usuario pediu X e isso requer Y", nao faca.

### O que NAO fazer ao editar

- Nao mude comentarios que nao sao seus (mesmo que "melhores")
- Nao reformate whitespace ou estilo de aspas adjacente
- Nao adicione type hints, docstrings ou anotacoes nao solicitadas
- Nao refatore codigo que nao esta quebrado
- Nao renomeie variaveis fora do escopo da mudanca
- Nao "melhore" imports adjacentes (ordenar, agrupar)

### Estilo Existente

Match o estilo do codigo existente, mesmo que faria diferente:
- Se o arquivo usa aspas simples, use aspas simples
- Se o arquivo usa tabs, use tabs
- Se o arquivo nao tem ponto-e-virgula, nao adicione
- Se o arquivo usa nomes em ingles, nao mude para portugues (e vice-versa)

### Dead Code

Quando suas mudancas criam orfaos:
- REMOVA imports, variaveis e funcoes que SUAS mudancas tornaram unused
- NAO remova dead code pre-existente — mencione se relevante, mas nao delete

Quando notar dead code pre-existente:
- Mencione: "Notei que {X} parece nao ser usado. Quer que eu remova?"
- NAO delete sem perguntar

### Teste de Cirurgiao

Antes de salvar, revise o diff mentalmente:
"Todas as linhas mudadas rastreiam ao pedido original?"
Se alguma linha e uma "melhoria por oportunidade", remova do diff.
