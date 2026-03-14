# useEffect: Anti-Patterns e Padroes Corretos

Referencia detalhada para o skill `react-patterns`. Este documento cobre os anti-patterns mais comuns de useEffect e seus equivalentes corretos.

---

## 1. Estado Derivado

### O Problema

Usar useEffect + useState para calcular valores que podem ser derivados diretamente de state/props existentes. Cada `setState` dentro do useEffect causa um re-render extra, criando cascatas de renderizacao desnecessarias.

### Antes (Anti-pattern)

```tsx
const [items, setItems] = useState<Item[]>([])
const [filtered, setFiltered] = useState<Item[]>([])
const [total, setTotal] = useState(0)
const [hasExpensive, setHasExpensive] = useState(false)

// 3 useEffects sincronizando estado derivado
useEffect(() => {
  setFiltered(items.filter(i => i.active))
}, [items])

useEffect(() => {
  setTotal(filtered.length)
}, [filtered])

useEffect(() => {
  setHasExpensive(filtered.some(i => i.price > 100))
}, [filtered])
```

**Resultado:** 4 renderizacoes para cada mudanca em `items`:
1. `items` atualiza -> renderiza
2. `filtered` atualiza -> renderiza
3. `total` atualiza -> renderiza
4. `hasExpensive` atualiza -> renderiza

### Depois (Correto)

```tsx
const [items, setItems] = useState<Item[]>([])

// Calculos diretos na renderizacao
const filtered = items.filter(i => i.active)
const total = filtered.length
const hasExpensive = filtered.some(i => i.price > 100)
```

**Resultado:** 1 unica renderizacao. Todos os valores derivados sao recalculados automaticamente.

### Como Identificar

Procurar por useEffect que segue o padrao:

```tsx
useEffect(() => {
  setSomething(calculo(outraCoisa))
}, [outraCoisa])
```

Se o corpo do useEffect e apenas uma chamada `setState` com uma transformacao de dados, e estado derivado. Eliminar o useState e o useEffect, calcular diretamente.

---

## 2. Calculos Pesados

### O Problema

Usar useEffect + useState para calculos custosos quando `useMemo` resolve sem re-render extra.

### Antes (Anti-pattern)

```tsx
const [data, setData] = useState<number[]>([])
const [sorted, setSorted] = useState<number[]>([])
const [stats, setStats] = useState<Stats | null>(null)

useEffect(() => {
  // Ordenacao pesada - O(n log n)
  setSorted([...data].sort((a, b) => complexCompare(a, b)))
}, [data])

useEffect(() => {
  // Calculo estatistico pesado
  setStats(computeStatistics(sorted))
}, [sorted])
```

**Problema duplo:** re-render extra + cadeia de efeitos.

### Depois (Correto)

```tsx
const [data, setData] = useState<number[]>([])

// useMemo para calculo pesado - sem re-render extra
const sorted = useMemo(
  () => [...data].sort((a, b) => complexCompare(a, b)),
  [data]
)

// Segundo calculo pode ser direto ou useMemo se tambem for pesado
const stats = useMemo(() => computeStatistics(sorted), [sorted])
```

### Quando useMemo e Necessario vs Desnecessario

```tsx
// NECESSARIO: ordenacao de 10.000+ items
const sorted = useMemo(() => heavySort(bigList), [bigList])

// DESNECESSARIO: filtro simples de array pequeno
const filtered = items.filter(i => i.active)  // calculo trivial, sem useMemo

// NECESSARIO: criacao de objeto complexo usado como dep de outro hook
const config = useMemo(() => ({
  columns: buildColumns(schema),
  filters: buildFilters(criteria),
}), [schema, criteria])

// DESNECESSARIO: string simples
const fullName = `${firstName} ${lastName}`  // sem useMemo
```

### Fluxo de Decisao

```
O valor pode ser calculado de state/props?
  |
  +-> SIM: calcular diretamente na renderizacao
  |     |
  |     +-> O calculo e pesado (> 1ms no Profiler)?
  |           |
  |           +-> SIM: envolver em useMemo
  |           +-> NAO: manter calculo direto
  |
  +-> NAO: avaliar se e side effect real (ver secao 4)
```

---

## 3. Cadeia de useEffects (Efeito Domino)

### O Problema

Multiplos useEffects onde cada um seta estado que dispara o proximo, formando uma cadeia. O numero de renderizacoes e N+1 (onde N e o numero de useEffects na cadeia).

### Antes (Anti-pattern)

```tsx
const [rawData, setRawData] = useState(initialData)
const [cleaned, setCleaned] = useState([])
const [normalized, setNormalized] = useState([])
const [grouped, setGrouped] = useState({})
const [summary, setSummary] = useState(null)
const [chartData, setChartData] = useState(null)

// Cadeia de 5 useEffects = 6 renderizacoes
useEffect(() => { setCleaned(removeNulls(rawData)) }, [rawData])
useEffect(() => { setNormalized(normalizeValues(cleaned)) }, [cleaned])
useEffect(() => { setGrouped(groupByCategory(normalized)) }, [normalized])
useEffect(() => { setSummary(calculateSummary(grouped)) }, [grouped])
useEffect(() => { setChartData(formatForChart(summary)) }, [summary])
```

### Depois (Correto)

```tsx
const [rawData, setRawData] = useState(initialData)

// Pipeline de transformacao direto
const cleaned = removeNulls(rawData)
const normalized = normalizeValues(cleaned)
const grouped = groupByCategory(normalized)
const summary = calculateSummary(grouped)
const chartData = formatForChart(summary)
```

**Resultado:** 1 renderizacao em vez de 6.

### Variante: Pipeline Parcialmente Pesado

Se apenas um passo e pesado, envolver apenas esse passo em useMemo:

```tsx
const [rawData, setRawData] = useState(initialData)

const cleaned = removeNulls(rawData)
// Apenas a normalizacao e pesada -> useMemo
const normalized = useMemo(() => normalizeValues(cleaned), [cleaned])
const grouped = groupByCategory(normalized)
const summary = calculateSummary(grouped)
```

### Como Desenhar o Fluxo

Ao encontrar multiplos useEffects, desenhar o grafo de dependencias:

```
useEffect1 -> setState(A) -> useEffect2 -> setState(B) -> useEffect3
```

Se forma uma cadeia linear, substituir por calculos diretos. Se ha bifurcacoes (um useEffect dispara dois caminhos independentes), cada caminho pode ser simplificado separadamente.

---

## 4. Usos Legitimos de useEffect

useEffect existe para **side effects reais** -- operacoes que interagem com o mundo fora do React.

### Sincronizacao com APIs externas

```tsx
// Sincronizar com API do navegador
useEffect(() => {
  const observer = new IntersectionObserver(callback, options)
  observer.observe(elementRef.current)
  return () => observer.disconnect()
}, [])
```

### Event listeners

```tsx
// Listener global (window, document)
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [onClose])
```

### Timers com cleanup

```tsx
useEffect(() => {
  const timer = setTimeout(() => setVisible(false), 3000)
  return () => clearTimeout(timer)
}, [])
```

### WebSocket/SSE

```tsx
useEffect(() => {
  const ws = new WebSocket(url)
  ws.onmessage = (event) => dispatch(JSON.parse(event.data))
  return () => ws.close()
}, [url])
```

### Analytics/Logging

```tsx
useEffect(() => {
  analytics.track('page_view', { page: pathname })
}, [pathname])
```

### Regra de Identificacao

Perguntar: "Este efeito interage com algo **fora do React** (DOM, rede, timer, API externa)?"
- **SIM** -> useEffect legitimo. Garantir cleanup no return.
- **NAO** -> Provavelmente e estado derivado ou calculo. Eliminar o useEffect.

---

## 5. Verificacao Sistematica

Ao revisar useEffect em um componente:

```
1. O useEffect apenas transforma dados (state/props -> outro state)?
   -> Eliminar: calcular diretamente na renderizacao

2. O useEffect faz calculo pesado?
   -> Substituir por useMemo

3. Multiplos useEffects formam cadeia?
   -> Substituir por pipeline de calculos diretos

4. O useEffect sincroniza com sistema externo?
   -> MANTER. Verificar se tem cleanup no return

5. O useEffect tem [] mas referencia state/props?
   -> Verificar closure stale. Usar updater function ou adicionar deps

6. O linter avisa sobre deps faltantes?
   -> CORRIGIR, nao suprimir. Deps faltantes = bugs silenciosos
```
