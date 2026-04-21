# Code Quality Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos `.ts`, `.tsx`, `.js` e `.jsx`.

## 9 Code Smells (Detectar e Corrigir)

### 1. Funcoes Longas (> 40 linhas)
- Extrair em funcoes menores com nomes descritivos
- Cada funcao com UMA responsabilidade clara
- Se precisou de comentario para explicar bloco, extraia em funcao
- Arquivo com >500 linhas é sinal de split — identifique responsabilidades distintas

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

### 8. Comentarios Inuteis (WHAT comments)
- WHAT comments são proibidos: `// incrementa i` acima de `i++` — o código já diz isso
- Código autoexplicativo via nomenclatura elimina WHAT comments
- Se um bloco precisa de comentário WHAT → extraia em função com nome descritivo
- NUNCA remova WHY comments ao refatorar — eles carregam intenção que o código não captura

### 9. Tipos Primitivos vs Tipos de Dominio
- Email como string → `class Email { constructor(v) { validate(v) } }`
- Dinheiro como number → `class Money { currency, amount }`
- Validacao na ENTRADA, tipo no SISTEMA, conversao na SAIDA

## Política de Comentários (D3)

### WHY comments — sempre permitidos e preservados

Comentários que capturam contexto que o código não pode expressar:

- **Proveniência:** `// workaround para bug do Safari 16.4 — https://bugs.webkit.org/123`
- **Decisão arquitetural:** `// não usamos cache aqui por causa de invalidação eventual`
- **Constraint externa:** `// limite da API: max 100 items por request`
- **Bug ref:** `// FIXME: remover após migração de schema em v2.3`
- **Intenção não óbvia:** `// ordenamos antes de deduplicar para preservar o primeiro occurrence`

Regra: **NUNCA remova WHY comments ao refatorar.** Eles são contexto de primeira classe para o próximo agente ou dev.

### WHAT comments — proibidos

Comentários que apenas descrevem o que o código já diz:

```ts
// Ruim — redundante:
// incrementa contador
i++

// Ruim — código autoexplicativo não precisa de legenda:
// retorna null se usuário não encontrado
return user ?? null
```

Se um bloco precisa de WHAT comment para ser compreendido → extraia em função com nome descritivo.

### Docstrings em funções públicas

Funções públicas (exportadas, de API pública) devem ter docstring com:
1. Uma linha de intenção (o que ela garante, não como)
2. Um exemplo de uso

```ts
/**
 * Normaliza email para comparação case-insensitive.
 * Exemplo: normalizeEmail("User@EXAMPLE.com") → "user@example.com"
 */
export function normalizeEmail(raw: string): string { ... }
```

### Ratio de Referência (não enforçado)

Evidência empírica de 274 commits reais (Akita): ratio saudável de comentários é 15–25% do código.
Abaixo de 10%: provável ausência de WHY comments importantes.
Acima de 40%: provável excesso de WHAT comments.

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
