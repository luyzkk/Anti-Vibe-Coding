# Code Quality Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos `.ts`, `.tsx`, `.js` e `.jsx`.

## 9 Code Smells (Detectar e Corrigir)

### 1. Funcoes Longas (> 100 linhas)
- Extrair em funcoes menores com nomes descritivos
- Cada funcao com UMA responsabilidade clara
- Se precisou de comentario para explicar bloco, extraia em funcao

### 2. God Objects
- Classe com multiplas responsabilidades → composicao + servicos separados
- Injetar dependencias em vez de instanciar internamente
- Cada servico independente e substituivel

### 3. Violacao DRY
- Abstrair SÓ com 3+ duplicacoes (2 pode ser aceitavel)
- NUNCA abstrair prematuramente (esperar padrao emergir)
- URLs e configuracoes em variaveis de ambiente

### 4. Condicionais Gigantes
- if-elif-else aninhados → HashMaps/dicionarios
- Polimorfismo ou Strategy Pattern para logica complexa
- 100% coverage em testes para cada branch

### 5. Numeros Magicos
- Extrair para constantes nomeadas do dominio
- Ex: `LEGAL_DRINKING_AGE_BR = 18` (nao `if age >= 18`)
- Nome especifico do contexto (nao generico como `LIMIT`)

### 6. Feature Envy
- Classe acessando dados profundos de outra → mover logica
- `order.items.product.price` → encapsular em metodo da classe dona
- Respeitar Lei de Demeter (max 1 nivel de navegacao)

### 7. Grupos de Dados
- Parametros sempre juntos → data class/struct/type
- Ex: `createUser(name, email, age)` → `createUser(userData: UserInput)`
- Facilita adicao de novos campos

### 8. Comentarios Inuteis
- Codigo autoexplicativo via nomenclatura
- Comentarios explicam PORQUÊ, nunca COMO
- Se precisa comentario → renomear variavel/funcao

### 9. Tipos Primitivos vs Tipos de Dominio
- Email como string → `class Email { constructor(v) { validate(v) } }`
- Dinheiro como number → `class Money { currency, amount }`
- Validacao na ENTRADA, tipo no SISTEMA, conversao na SAIDA

## Tratamento de Erros

- Preferir Result Pattern `(error, value)` sobre try/catch generico
- Try/catch: CONFINAR a funcao que pode falhar
- NUNCA engolir erros silenciosamente (catch vazio)
- Relancar erros desconhecidos
- Custom Error classes para problemas diferentes
- NUNCA retornar valores em `finally` (substitui return anterior)

## Logging

- Wide Events: UM evento rico por request (nao 17 linhas)
- Campos obrigatorios: request_id, user_id, status, latency
- Nomes padronizados (user_id, nao userId/user/usuario)
- Console.log e SINCRONO → bloqueia event loop
- Usar Pino ou Node Streams (assincronos) em producao
- NUNCA console.log de dados sensiveis

## JavaScript/TypeScript

- `const` > `let` >> NUNCA `var`
- `Promise.all` para operacoes independentes (nao await sequencial)
- SEMPRE `.catch()` ou try/catch em promises
- Closures: extrair minimo necessario, WeakMap para caches
- Remover timers/listeners quando nao mais necessarios (cleanup)
- Map/Filter/Reduce > for-loops quando mais expressivo

## Anti-Patterns

- try/catch englobando bloco grande (confine ao minimo)
- Promises sem .catch() (bomba-relogio)
- Closure referenciando array inteiro quando precisa de .length
- setInterval sem clearInterval correspondente
- Await sequencial quando operacoes sao independentes
