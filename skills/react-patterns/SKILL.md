---
name: react-patterns
description: "This skill should be used when the user asks about 'useEffect', 'React performance', 'data fetching in React', 'TanStack Query', 'state management', 'memoization', 'useMemo', 'useCallback', 'closure stale', 'React re-renders', 'virtualization', 'code splitting', or needs to analyze React component patterns and anti-patterns. Provides expert consultation on React/Next.js best practices."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[React pattern or component to analyze]"
---

# React Patterns - Consultor Anti-Vibe Coding

Modo de operacao: **CONSULTOR**. Ensinar o conceito, mostrar o anti-pattern, apresentar a solucao correta e fornecer criterios de verificacao. Nao gerar codigo completo -- usar pseudo-exemplos para ilustrar.

> Detalhes completos e exemplos extensivos estao em `references/`.

---

## 1. useEffect: Quando NAO Usar

> Referencia completa: `references/useeffect-patterns.md`

### Estado Derivado

Calcular estado derivado diretamente na renderizacao. Se um valor pode ser computado a partir de state ou props, ele NAO precisa de estado proprio nem de useEffect.

```
// ERRADO: useEffect sincronizando estado derivado (3 renderizacoes)
const [items, setItems] = useState([])
const [filtered, setFiltered] = useState([])
useEffect(() => { setFiltered(items.filter(i => i.active)) }, [items])

// CORRETO: calculo direto (1 renderizacao)
const [items, setItems] = useState([])
const filtered = items.filter(i => i.active)
```

**Regra:** Se o useEffect apenas faz `setSomething(calculo(outraCoisa))`, e estado derivado. Eliminar.

### Calculos Pesados

Usar `useMemo` para calculos custosos -- NAO useEffect + useState. O useMemo calcula durante a renderizacao sem re-render extra.

```
// ERRADO: useEffect + setState = re-render extra
useEffect(() => { setSorted(expensiveSort(data)) }, [data])

// CORRETO: useMemo = zero re-renders extras
const sorted = useMemo(() => expensiveSort(data), [data])
```

**Regra:** Medir com React Profiler antes de aplicar useMemo. Calculos < 1ms nao precisam de memoization.

### Cadeia de useEffects (Efeito Domino)

Substituir cadeias de useEffect por calculos diretos. Quando um useEffect seta estado que dispara outro useEffect, o resultado e uma cascata de renderizacoes desnecessarias.

```
// ERRADO: 3 useEffects em cadeia = 4 renderizacoes
useEffect(() => { setProcessed(transform(raw)) }, [raw])
useEffect(() => { setGrouped(groupBy(processed)) }, [processed])
useEffect(() => { setSummary(summarize(grouped)) }, [grouped])

// CORRETO: calculos diretos = 1 renderizacao
const processed = transform(raw)
const grouped = groupBy(processed)
const summary = summarize(grouped)
```

### Usos Legitimos de useEffect

Reservar useEffect exclusivamente para **side effects reais**:
- Sincronizar com sistemas externos (DOM, APIs de terceiros, WebSockets)
- Setup/cleanup de event listeners, timers, subscriptions
- Logging/analytics baseados em mudancas de estado

---

## 2. Data Fetching: NUNCA Manualmente

> Referencia completa: `references/data-fetching.md`

Implementar fetch dentro de useEffect esconde 3 bugs criticos:

| Bug | Problema | Quando aparece |
|-----|----------|----------------|
| Race Condition | Resposta antiga sobrescreve a nova | Navegacao rapida entre paginas |
| Memory Leak | setState em componente desmontado | Navegacao durante fetch |
| Estado Inconsistente | loading=true E error!=null simultaneamente | Tratamento manual de estados |

### Solucao: TanStack Query

```
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
})
```

Beneficios automaticos: cancelamento de race conditions, cleanup, estados mutuamente exclusivos, cache, retry com backoff, refetch em foco/reconexao.

**Regra:** Buscar por `useEffect` + `fetch`/`axios` no codebase. Cada instancia e um bug em potencial. Substituir por `useQuery` (GET) ou `useMutation` (POST/PUT/DELETE).

---

## 3. Closure Stale

Quando useEffect roda com `[]` como dependencias, ele captura variaveis da primeira renderizacao e nunca atualiza. Isso cria closures que enxergam valores antigos permanentemente.

```
// ERRADO: count sempre sera 0 dentro do interval
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1)  // closure stale: count = 0 para sempre
  }, 1000)
  return () => clearInterval(interval)
}, [])

// CORRETO: updater function recebe valor mais recente
setCount(prev => prev + 1)
```

**Cenarios comuns:** Event listeners em useEffect com `[]`, callbacks em setTimeout/setInterval, refs como alternativa quando updater function nao resolve.

**Regra:** NAO ignorar warnings do eslint-plugin-react-hooks sobre deps faltantes.

---

## 4. Memoization (Usar com Parcimonia)

> Referencia completa: `references/performance.md`

Memoization (useMemo, useCallback, React.memo) e otimizacao. SEMPRE medir antes de otimizar.

### Fluxo Correto

```
1. Escrever codigo sem memoization
2. Identificar lentidao real (usuario percebe)
3. Medir com React Profiler (> 1ms consistentemente)
4. Aplicar memoization cirurgicamente
5. Medir novamente para confirmar melhoria
```

### Quando Usar

| Ferramenta | Usar quando | NAO usar quando |
|------------|-------------|-----------------|
| `useMemo` | Calculos pesados (sort 10k items) | Filtros simples (20 items) |
| `useCallback` | Funcao passada para componente memoizado | Funcao usada no proprio componente |
| `React.memo` | Componente pesado com mesmas props frequentes | Componente leve ou props sempre diferentes |

---

## 5. State Management

> Referencia completa: `references/state-management.md`

### Hierarquia de Decisao

Sempre comecar pelo mais simples e subir conforme necessidade:

```
1. useState         -> Estado de UM componente (forms, toggles, UI local)
2. Lifting state    -> Estado entre POUCOS componentes irmaos
3. Context API      -> Componentes DISTANTES, poucos consumers (theme, auth)
4. Zustand          -> Estado global complexo, muitas atualizacoes
5. TanStack Query   -> Server state (dados do backend). NAO misturar com client state
6. URL State        -> Filtros, paginacao, ordenacao. Compartilhavel via link
```

### Anti-patterns

- Duplicar server state em useState: usar TanStack Query
- Context para updates frequentes: usar Zustand
- Estado global para estado local: se so um componente usa, e useState
- Sincronizar dois estados: provavelmente sao um so estado (ou derivado)

---

## Checklist Rapido de Code Review

Ao analisar codigo React, verificar nesta ordem:

```
[ ] useEffect que calcula estado derivado? -> Calcular na renderizacao
[ ] useEffect + fetch/axios? -> TanStack Query
[ ] Cadeia de useEffects? -> Calculos diretos
[ ] setInterval/setTimeout com state? -> Updater function
[ ] useMemo/useCallback sem medicao? -> Remover ou medir
[ ] Context com updates frequentes? -> Considerar Zustand
[ ] Listas longas sem virtualizacao? -> react-window / @tanstack/react-virtual
[ ] Server state em useState? -> TanStack Query
[ ] Estado duplicado/sincronizado? -> Estado unico ou derivado
[ ] Bundle grande na rota inicial? -> Code splitting
[ ] Imagens sem otimizacao? -> next/image ou lazy loading
[ ] Deps faltantes no useEffect? -> Corrigir (NAO ignorar linter)
```
