---
name: react-patterns
description: Consultor React - useEffect, Data Fetching, Memoization, State Management
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[React pattern or component to analyze]"
---

# React Patterns - Consultor Anti-Vibe Coding

Modo de operacao: **CONSULTOR**. Ensine o conceito, mostre o anti-pattern, apresente a solucao correta e forneca criterios de verificacao. Nao gere codigo completo -- use pseudo-exemplos para ilustrar.

---

## 1. useEffect: Quando NAO Usar

### 1.1 Estado Derivado

**Conceito:** Se um valor pode ser calculado a partir de state ou props existentes, ele NAO precisa de estado proprio nem de useEffect para sincroniza-lo. Calcule diretamente na renderizacao.

**Anti-pattern:**

```
// 3 useState + 2 useEffect sincronizando
const [items, setItems] = useState([])
const [filtered, setFiltered] = useState([])
const [total, setTotal] = useState(0)

useEffect(() => {
  setFiltered(items.filter(i => i.active))
}, [items])

useEffect(() => {
  setTotal(filtered.length)
}, [filtered])
```

Resultado: 3 renderizacoes em cascata. O componente renderiza com `items`, depois re-renderiza quando `filtered` atualiza, depois re-renderiza de novo quando `total` atualiza.

**Solucao:**

```
const [items, setItems] = useState([])
const filtered = items.filter(i => i.active)
const total = filtered.length
```

Resultado: 1 unica renderizacao. `filtered` e `total` sao recalculados automaticamente quando `items` muda.

**Verificacao:**
- Procure por `useEffect` que apenas transforma state/props em outro state
- Se o useEffect so faz `setSomething(calculo(outraCoisa))`, e estado derivado
- Regra: se voce consegue calcular durante a renderizacao, calcule durante a renderizacao

---

### 1.2 Calculos Pesados

**Conceito:** Para calculos custosos, use `useMemo` -- NAO useEffect + useState. O useMemo calcula durante a renderizacao sem causar re-render extra.

**Anti-pattern:**

```
const [data, setData] = useState([])
const [sorted, setSorted] = useState([])

useEffect(() => {
  setSorted(expensiveSort(data))  // re-render extra desnecessario
}, [data])
```

**Solucao:**

```
const sorted = useMemo(() => expensiveSort(data), [data])
```

**Quando usar useMemo:**
- MEDIR com React Profiler antes de otimizar
- Calculos que consistentemente levam > 1ms sao candidatos
- Calculos simples (filter, map em arrays pequenos) NAO precisam de useMemo
- O custo do useMemo (comparacao de deps) pode ser maior que o calculo em si

**Verificacao:**
- Abra React DevTools Profiler
- Identifique renderizacoes lentas (> 1ms)
- So entao aplique useMemo no calculo especifico
- Compare antes/depois com o Profiler

---

### 1.3 Cadeia de useEffects (Efeito Domino)

**Conceito:** Quando um useEffect seta estado que dispara outro useEffect, que seta outro estado, voce tem uma cadeia de efeitos. Quase sempre, tudo deveria ser calculos diretos.

**Anti-pattern:**

```
// 4 useState + 3 useEffect em cadeia
const [raw, setRaw] = useState(dados)
const [processed, setProcessed] = useState([])
const [grouped, setGrouped] = useState({})
const [summary, setSummary] = useState(null)

useEffect(() => { setProcessed(transform(raw)) }, [raw])
useEffect(() => { setGrouped(groupBy(processed)) }, [processed])
useEffect(() => { setSummary(summarize(grouped)) }, [grouped])
```

Resultado: 4 renderizacoes para algo que deveria ser 1.

**Solucao:**

```
const [raw, setRaw] = useState(dados)
const processed = transform(raw)
const grouped = groupBy(processed)
const summary = summarize(grouped)
```

**Verificacao:**
- Desenhe o fluxo: useEffect1 -> setState -> useEffect2 -> setState -> ...
- Se forma uma cadeia linear, substitua por calculos diretos
- Se algum passo e realmente pesado, envolva apenas esse passo em useMemo

---

## 2. Data Fetching: NUNCA Manualmente

### Os 3 Bugs Escondidos do useEffect + fetch

**Conceito:** Implementar fetch manualmente dentro de useEffect parece simples, mas esconde 3 bugs criticos que so aparecem em producao.

**Bug 1 - Race Condition:**

```
// Usuario clica rapido: perfil A -> perfil B
useEffect(() => {
  fetch(`/api/user/${id}`)
    .then(res => res.json())
    .then(data => setUser(data))  // Qual resposta chega primeiro?
}, [id])
```

Se a resposta de A chega depois de B, o usuario ve dados do usuario errado.

**Bug 2 - Memory Leak:**

```
// Componente desmonta enquanto fetch esta em andamento
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => setData(data))  // setState em componente desmontado
}, [])
```

React avisa no console, mas o comportamento e imprevisivel.

**Bug 3 - Estado Inconsistente:**

```
// Gerenciar loading/error/data manualmente
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState(null)

useEffect(() => {
  setLoading(true)
  setError(null)
  fetch('/api/data')
    .then(res => { setData(res); setLoading(false) })
    .catch(err => { setError(err); setLoading(false) })
}, [])
// E se loading=true E error!=null ao mesmo tempo?
```

### Solucao: TanStack Query ou SWR

```
// TanStack Query - resolve TODOS os 3 bugs
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
})
```

**O que voce ganha de graca:**
- Race conditions resolvidas (queries anteriores sao canceladas)
- Cleanup automatico (sem memory leak)
- Estados mutuamente exclusivos (loading XOR error XOR data)
- Cache automatico e invalidation
- Refetch em foco, reconexao, intervalo
- Retry automatico com backoff

**Verificacao:**
- Busque por `useEffect` + `fetch` ou `axios` no codebase
- Cada instancia e um bug em potencial
- Substitua por TanStack Query (`useQuery` para GET, `useMutation` para POST/PUT/DELETE)
- NUNCA implemente fetch manualmente no useEffect

---

## 3. Closure Stale

**Conceito:** Quando useEffect roda com `[]` como dependencias, ele captura as variaveis da primeira renderizacao e nunca atualiza. Isso cria "closures velhas" -- a funcao dentro do useEffect enxerga valores antigos para sempre.

**Anti-pattern:**

```
const [count, setCount] = useState(0)

useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1)  // count sempre sera 0 aqui
  }, 1000)
  return () => clearInterval(interval)
}, [])  // [] = captura count da 1a renderizacao
```

O contador nunca passa de 1. A cada segundo, `count` e 0 (valor capturado), entao `setCount(0 + 1)` roda infinitamente.

**Solucao: Updater Function**

```
setCount(prev => prev + 1)  // React fornece o valor mais recente
```

A updater function recebe o estado mais recente diretamente do React, independente de quando a closure foi criada.

**Outros cenarios de closure stale:**
- Event listeners adicionados em useEffect com `[]`
- Callbacks em setTimeout/setInterval
- Refs como alternativa quando updater function nao resolve

**Verificacao:**
- Procure por `useEffect(() => { ... }, [])` que referencia state/props
- Se usa `setState(valor)` dentro de interval/timeout, troque por `setState(prev => ...)`
- Linter do React (eslint-plugin-react-hooks) avisa sobre deps faltantes -- NAO ignore

---

## 4. Memoization (Usar com Parcimonia)

**Conceito:** Memoization em React (useMemo, useCallback, React.memo) e uma otimizacao. Otimizacao prematura e a raiz de todo mal. SEMPRE meça antes de otimizar.

### Regra de Ouro

```
1. Escreva o codigo sem memoization
2. Identifique lentidao real (usuario percebe)
3. Meça com React Profiler (> 1ms consistentemente)
4. Aplique memoization cirurgicamente
5. Meça de novo para confirmar melhoria
```

### Quando Usar Cada Um

**useMemo** -- Calculos pesados:

```
// SIM: ordenacao de 10.000 items
const sorted = useMemo(() => heavySort(bigList), [bigList])

// NAO: filtro simples de 20 items
const filtered = items.filter(i => i.active)  // useMemo desnecessario
```

**useCallback** -- Funcoes passadas como props:

```
// SIM: funcao passada para componente memoizado
const handleClick = useCallback(() => { ... }, [dep])
<MemoizedChild onClick={handleClick} />

// NAO: funcao usada apenas no proprio componente
const handleClick = () => { ... }  // useCallback desnecessario
```

**React.memo** -- Componentes com mesmas props:

```
// SIM: componente pesado que re-renderiza com mesmas props
const HeavyChart = React.memo(({ data }) => { ... })

// NAO: componente leve ou que quase sempre recebe props diferentes
const Button = ({ label }) => { ... }  // React.memo desnecessario
```

**Verificacao:**
- Voce mediu com Profiler antes de adicionar memoization?
- A melhoria e mensuravel (nao "parece mais rapido")?
- O componente realmente re-renderiza com as mesmas props?
- Removeu memoization que nao mostrou melhoria?

---

## 5. State Management

### Hierarquia de Decisao

Sempre comece pelo mais simples e suba conforme necessidade:

```
1. Estado Local (useState)
   -> Estado que pertence a UM componente
   -> Formularios, toggles, UI local

2. Estado Elevado (lifting state up)
   -> Estado compartilhado entre POUCOS componentes irmaos
   -> Eleve para o pai comum mais proximo

3. Context API
   -> Estado compartilhado entre componentes DISTANTES na arvore
   -> Poucos consumers (theme, auth, locale)
   -> CUIDADO: re-renderiza TODOS os consumers quando valor muda

4. Zustand (preferido) ou Redux
   -> Estado global complexo com muitas atualizacoes
   -> Zustand: menos boilerplate, mais simples
   -> Redux: quando ja existe no projeto ou equipe conhece

5. TanStack Query
   -> Server state (dados do backend)
   -> NAO misture com client state
   -> Cache, invalidation, sincronizacao automatica

6. URL State (useSearchParams)
   -> Filtros, paginacao, ordenacao
   -> Compartilhavel via link
   -> Sobrevive a refresh da pagina
```

### Anti-patterns Comuns

- **Duplicar server state no client state**: Use TanStack Query, nao useState para dados da API
- **Context para tudo**: Context re-renderiza todos os consumers; use Zustand para updates frequentes
- **Estado global para estado local**: Se so um componente usa, e useState
- **Sincronizar estados**: Se dois estados precisam estar sincronizados, provavelmente sao um so estado (ou estado derivado)

**Verificacao:**
- Quantos componentes consomem esse estado?
- O estado vem do servidor? -> TanStack Query
- O estado precisa sobreviver a navegacao? -> URL state
- O estado e derivado de outro? -> Calcule na renderizacao
- Menos de 3 consumers? -> Context ou lifting state

---

## 6. Performance React

### Re-renders Desnecessarios

**Diagnostico:**
1. React DevTools Profiler -> "Highlight updates when components render"
2. Identifique componentes que re-renderizam sem mudanca visual
3. Investigue a causa (prop nova, context, state do pai)

**Solucoes comuns:**
- Mova estado para baixo (mais perto de onde e usado)
- Extraia componente que muda do que nao muda (composition)
- React.memo + useCallback como ultimo recurso

### Virtualizacao

**Quando:** Listas com 1000+ items (ou 100+ items complexos)

```
// react-window ou @tanstack/react-virtual
// Renderiza apenas items visiveis no viewport
// 10.000 items -> ~20 renderizados de verdade
```

**Verificacao:** Se a lista inteira renderiza no DOM (inspecione Elements), precisa virtualizar.

### Code Splitting

**Quando:** Rotas ou features pesadas que nem todo usuario acessa

```
// lazy() + Suspense para rotas
const AdminPanel = lazy(() => import('./AdminPanel'))

<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

**Verificacao:** Analise o bundle com `@next/bundle-analyzer` ou similar. Chunks > 100KB que nao sao usados na rota inicial sao candidatos.

### Image Optimization

**Em Next.js:** Use `next/image` sempre (otimizacao automatica)
**Fora de Next.js:**
- Lazy loading: `loading="lazy"` no `<img>`
- Formatos modernos: WebP/AVIF
- Srcset para responsividade
- Placeholder blur enquanto carrega

**Verificacao:**
- Lighthouse Performance score
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 200ms

---

## Checklist Rapido de Code Review

Ao analisar codigo React, verifique nesta ordem:

```
[ ] useEffect que calcula estado derivado? -> Calcule na renderizacao
[ ] useEffect + fetch/axios? -> TanStack Query
[ ] Cadeia de useEffects? -> Calculos diretos
[ ] setInterval/setTimeout com state? -> Updater function
[ ] useMemo/useCallback sem medicao? -> Remova ou meça
[ ] Context com updates frequentes? -> Considere Zustand
[ ] Listas longas sem virtualizacao? -> react-window
[ ] Server state em useState? -> TanStack Query
[ ] Estado duplicado/sincronizado? -> Estado unico ou derivado
[ ] Bundle grande na rota inicial? -> Code splitting
```
