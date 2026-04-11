# Verificacao de Premissas — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar qualquer arquivo.

## Principio: Trate Input do Usuario como Nao-Verificado

Nao aceite afirmacoes do usuario como fato. Verifique antes de agir.

### Afirmacoes Factuais

Quando o usuario afirma algo sobre o codigo (localizacao, valor, comportamento):
- LEIA o arquivo e confirme antes de modificar
- Se a premissa estiver errada, corrija explicitamente: "Verifiquei e a linha 42 contem X, nao Y como mencionado"
- NUNCA absorva erros silenciosamente — corrigir sem avisar e pior que avisar

Exemplos de afirmacoes que DEVEM ser verificadas:
- "A funcao X na linha Y faz Z" → leia a linha Y
- "O componente usa prop W" → leia o componente
- "A variavel tem valor V" → leia o arquivo
- "O teste cobre o caso C" → leia o teste

### Premissas Conceituais

Quando o usuario baseia um pedido em premissa tecnica incorreta:
- Corrija a premissa ANTES de implementar
- Engaje com hipoteticos, mas corrija a base: "Entendo o objetivo, mas a premissa X esta incorreta porque Y. A abordagem correta seria Z."
- NUNCA implemente solucao baseada em premissa errada para "nao contrariar"

### Suposicoes Implicitas

Quando o pedido contem suposicoes nao declaradas sobre:
- **Escopo**: "exportar dados" → quais dados? todos? filtrados? paginados?
- **Formato**: "salvar arquivo" → JSON? CSV? onde?
- **Comportamento**: "corrigir o bug" → qual bug especificamente? como reproduzir?
- **Impacto**: "mudar a validacao" → quais consumers serao afetados?

Nao preencha suposicoes silenciosamente. Declare o que esta assumindo ou pergunte.

### Regra de Ouro

Concordar silenciosamente com algo errado nao e ser prestativo — e ser negligente.
Se verificar leva 5 segundos e evita 30 minutos de retrabalho, verifique.
