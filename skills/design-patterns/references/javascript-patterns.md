# JavaScript/TypeScript Avancado

Referencia detalhada para padroes avancados de JS/TS: hoisting, closures, event loop, promises, garbage collection, recursao e transformacoes de dados.

---

## 1. Hoisting e Declaracoes

**Conceito:** `var` sofre hoisting (declaracao sobe pro topo do escopo), criando bugs sutis. `let` e `const` tem escopo de bloco e entram na "temporal dead zone" antes da declaracao.

**Hierarquia:** `const` > `let` >> NUNCA `var`

**Anti-pattern:**
```
console.log(x)  // undefined (nao erro!)
var x = 10

// Com const/let:
console.log(y)  // ReferenceError (bom! erro explicito)
const y = 10
```

**Por que `var` e perigoso:**
- Hoisting move a declaracao, nao a atribuicao
- Escopo de funcao, nao de bloco -- vaza de loops e ifs
- Permite redeclaracao silenciosa

**Verificacao:** Usar `Grep` para buscar `var ` no codebase. Todas as ocorrencias devem ser migradas para `const` ou `let`.

---

## 2. Closures e Memoria

**Conceito:** Closures capturam variaveis do escopo externo. Isso e poderoso, mas pode causar memory leaks se a closure mantiver referencias a objetos grandes.

**Anti-pattern:**
```
funcao criarHandler():
    dadosGigantes = carregarTudo()  // 500MB
    retornar funcao():
        // Usa so dadosGigantes.nome, mas segura 500MB na memoria
        retornar dadosGigantes.nome
```

**Direcao:**
- Extrair o minimo necessario ANTES de criar a closure:
```
funcao criarHandler():
    dadosGigantes = carregarTudo()
    nome = dadosGigantes.nome  // Extrai so o necessario
    dadosGigantes = nulo       // Libera para GC
    retornar funcao():
        retornar nome  // Segura so uma string
```

- Usar **WeakMap** para caches que permitem garbage collection:
```
cache = novo WeakMap()
// Quando o objeto-chave e coletado, a entrada some automaticamente
```

- Em React: **cleanup em useEffect** para evitar closures stale:
```
useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()  // Cleanup!
}, [])
```

---

## 3. Event Loop

**Conceito:** O Event Loop do JavaScript tem filas com prioridades diferentes:

```
1. Call Stack (sincrono -- executa primeiro)
2. Microtask Queue (Promises, queueMicrotask -- prioridade alta)
3. Macrotask Queue (setTimeout, setInterval, I/O -- prioridade baixa)
```

**Regra:** Microtasks SEMPRE executam antes de macrotasks.

**Exemplo de ordem de execucao:**
```
console.log("1 - sincrono")                          // 1o
setTimeout(() => console.log("4 - timeout"), 0)       // 4o (macrotask)
Promise.resolve().then(() => console.log("3 - promise"))  // 3o (microtask)
console.log("2 - sincrono")                          // 2o

// Saida: 1, 2, 3, 4
```

**Implicacoes praticas:**
- Microtasks podem "starvar" macrotasks se criarem mais microtasks em loop
- `process.nextTick` no Node.js tem prioridade sobre Promise (usar com cuidado)
- I/O callbacks estao na macrotask queue -- nao bloqueiam, mas esperam

---

## 4. Promises

**Principios fundamentais:**

### SEMPRE ter tratamento de erro
```
// RUIM: Promise sem catch -- erro silencioso
buscarDados().then(processar)

// BOM: catch explicito
buscarDados().then(processar).catch(tratar)

// BOM: try/catch com await
tentar:
    dados = await buscarDados()
    processar(dados)
capturar erro:
    tratar(erro)
```

### Paralelizar operacoes independentes
```
// RUIM: sequencial desnecessario
a = await buscarA()
b = await buscarB()  // Nao depende de A! Desperdicou tempo

// BOM: paralelo
[a, b] = await Promise.all([buscarA(), buscarB()])
```

### Promise.allSettled para tolerancia a falha
```
// Quando quer resultados de TODAS, mesmo com falhas
resultados = await Promise.allSettled([
    buscarA(),
    buscarB(),
    buscarC(),
])
// Cada resultado tem { status: "fulfilled"|"rejected", value|reason }
```

### NUNCA misturar callbacks com Promises
```
// RUIM: callback dentro de async
funcao async processar():
    fs.readFile("dados.json", (err, data) => {
        // Erro aqui nao e capturado pelo try/catch externo!
    })

// BOM: promisificar
funcao async processar():
    data = await fs.promises.readFile("dados.json")
```

---

## 5. Garbage Collection e Memory Leaks

**Conceito:** O GC do JavaScript usa mark-and-sweep. Objetos sao coletados quando ninguem mais referencia eles.

### Fontes comuns de memory leak

**Closures segurando referencias grandes:**
- Funcoes internas capturam todo o escopo externo
- Extrair apenas o necessario antes de criar closures

**Event listeners nao removidos:**
```
// RUIM
elemento.addEventListener("click", handler)
// Nunca removido -- leak!

// BOM
elemento.addEventListener("click", handler)
// Na limpeza:
elemento.removeEventListener("click", handler)
```

**setInterval sem clearInterval:**
```
// RUIM
setInterval(verificar, 1000)
// Nunca parado -- roda para sempre

// BOM
id = setInterval(verificar, 1000)
// Na limpeza:
clearInterval(id)
```

**Variaveis globais acumulando dados:**
```
// RUIM
global.cache = []
// Nunca limpo -- cresce infinitamente

// BOM: usar TTL ou tamanho maximo
cache = novo LRUCache({ maxSize: 1000 })
```

**React: useEffect sem cleanup:**
```
// RUIM
useEffect(() => {
    window.addEventListener("resize", handler)
}, [])
// Listener acumula a cada re-mount

// BOM
useEffect(() => {
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
}, [])
```

### Verificacao
Buscar por `addEventListener` sem `removeEventListener`, `setInterval` sem `clearInterval`, e `useEffect` sem funcao de cleanup.

---

## 6. Recursao vs Iteracao

**Conceito:** JavaScript NAO tem Tail Call Optimization (TCO) na pratica (apenas Safari/JavaScriptCore). Recursao profunda causa stack overflow.

**Regra:** Para iteracoes potencialmente longas, usar loops. Reservar recursao para estruturas naturalmente recursivas (arvores) com profundidade conhecida.

**Tail Call:** A chamada recursiva e a ULTIMA instrucao da funcao (sem operacao depois). Mesmo assim, sem TCO no V8, usar loop.

```
// RUIM: recursao para lista grande
funcao somar(lista, i=0):
    se i >= lista.length: retornar 0
    retornar lista[i] + somar(lista, i+1)  // Stack overflow em lista grande

// BOM: loop
funcao somar(lista):
    total = 0
    para cada item em lista:
        total += item
    retornar total
```

**Quando recursao e aceitavel:**
- Arvores com profundidade limitada (DOM, AST, filesystem)
- Algoritmos divide-and-conquer (quicksort, mergesort)
- Profundidade maxima conhecida e pequena (< 1000 frames)

---

## 7. Map, Filter, Reduce

**Conceito:** Tres operacoes fundamentais para transformacao de dados sem mutacao.

### map -- Transforma cada item (1:1)
Entrada: N items. Saida: N items transformados.
```
nomes = usuarios.map(u => u.nome)
// [usuario1, usuario2, usuario3] -> ["Ana", "Bob", "Carlos"]
```

### filter -- Seleciona items que passam num teste
Entrada: N items. Saida: 0 a N items que passaram.
```
ativos = usuarios.filter(u => u.ativo)
// [ativo, inativo, ativo] -> [ativo, ativo]
```

### reduce -- Agrega todos items em um valor
Entrada: N items. Saida: 1 valor.
```
total = pedidos.reduce((soma, p) => soma + p.valor, 0)
// [100, 200, 50] -> 350
```

### Anti-pattern: forEach com push manual
```
// RUIM
nomes = []
usuarios.forEach(u => {
    nomes.push(u.nome)
})

// BOM: map
nomes = usuarios.map(u => u.nome)
```

### Anti-pattern: reduce ilegivel
```
// RUIM: reduce quando filter + map e mais claro
resultado = usuarios.reduce((acc, u) => {
    se u.ativo:
        acc.push(u.nome)
    retornar acc
}, [])

// BOM: encadeamento legivel
resultado = usuarios
    .filter(u => u.ativo)
    .map(u => u.nome)
```

### Direcao: Preferir encadeamento legivel
```
resultado = usuarios
    .filter(u => u.ativo)
    .map(u => u.nome)
    .sort()
```

Usar `reduce` apenas quando realmente precisa agregar em um valor unico (soma, contagem, agrupamento).
