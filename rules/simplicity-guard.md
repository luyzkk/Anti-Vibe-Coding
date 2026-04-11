# Simplicity Guard — Anti-Vibe Coding

Estas regras carregam automaticamente ao criar ou editar qualquer arquivo.

## Principio: Codigo Minimo que Resolve o Problema. Nada Especulativo.

Derivado das observacoes de Andrej Karpathy: LLMs implementam 1000 linhas onde 100 bastam, bloat abstracoes e adicionam features que ninguem pediu.

### Antes de Criar Abstracao

Pergunte:
1. Esta abstracao sera usada em mais de 1 lugar AGORA? (nao "talvez no futuro")
2. Sem ela, o codigo ficaria duplicado 3+ vezes?
3. O usuario pediu isso ou estou antecipando?

Se a resposta for "nao" para qualquer uma: nao crie a abstracao. Codigo direto e repetido e melhor que abstracao prematura.

### O que NAO adicionar

- Features alem do pedido
- Flexibilidade ou configurabilidade nao solicitada
- Error handling para cenarios impossiveis
- Tipos genericos onde tipo concreto resolve
- Builder/Factory/Strategy para uso unico
- Camadas de indireção sem beneficio claro
- Cache, retry, fallback sem evidencia de necessidade

### Teste do Senior

Apos escrever, pergunte: "Um engenheiro senior diria que isso e overcomplicado?"
Se sim, simplifique. Se escreveu 200 linhas e poderiam ser 50, reescreva.

### Naive First

Ao implementar logica nova:
1. Escreva a versao mais direta e naive que funciona
2. Valide com testes que esta correta
3. SO ENTAO otimize se houver evidencia de necessidade (benchmark, profile, requisito)

Codigo feio que funciona e esta testado e melhor que codigo elegante nao validado.

### Complexidade Justificada

Complexidade so e aceitavel quando:
- O usuario pediu explicitamente
- E requisito tecnico comprovado (performance medida, compliance documentado)
- A alternativa simples foi tentada e falhou

"Adicionar complexidade e facil. Remover complexidade e caro."
