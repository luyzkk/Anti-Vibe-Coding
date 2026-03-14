# Data Fetching: Os 3 Bugs do useEffect+fetch e a Solucao

Referencia detalhada para o skill `react-patterns`. Este documento cobre os problemas criticos de data fetching manual e como resolve-los com TanStack Query.

---

## 1. Os 3 Bugs Escondidos do useEffect + fetch

Implementar fetch dentro de useEffect parece simples, mas esconde 3 bugs que so aparecem em producao com usuarios reais.

---

### Bug 1: Race Condition

**Cenario:** Usuario navega rapidamente entre perfis (A -> B).

```tsx
useEffect(() => {
  fetch(`/api/user/${id}`)
    .then(res => res.json())
    .then(data => setUser(data))  // Qual resposta chega primeiro?
}, [id])
```

**O que acontece:**
1. Usuario clica no perfil A -> fetch A inicia
2. Usuario clica no perfil B -> fetch B inicia
3. Fetch B retorna primeiro -> `setUser(B)` -> tela mostra B
4. Fetch A retorna depois -> `setUser(A)` -> tela mostra A (ERRADO)

O usuario esta na pagina B mas ve dados de A. Este bug e intermitente -- depende da latencia de rede e so aparece sob carga real.

### Fix Manual (Complexo)

```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setUser(data))
    .catch(err => {
      if (err.name !== 'AbortError') setError(err)
    })

  return () => controller.abort()  // Cancela fetch anterior
}, [id])
```

Funciona, mas precisa ser implementado em CADA fetch do projeto. Facil esquecer.

---

### Bug 2: Memory Leak

**Cenario:** Componente desmonta enquanto fetch esta em andamento.

```tsx
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => setData(data))  // Componente ja desmontou!
}, [])
```

**O que acontece:**
1. Componente monta -> fetch inicia
2. Usuario navega para outra pagina -> componente desmonta
3. Fetch retorna -> `setData()` tenta atualizar componente inexistente
4. React emite warning: "Can't perform a React state update on an unmounted component"

### Fix Manual (Complexo)

```tsx
useEffect(() => {
  let cancelled = false
  const controller = new AbortController()

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      if (!cancelled) setData(data)  // Guard contra unmount
    })
    .catch(err => {
      if (!cancelled && err.name !== 'AbortError') setError(err)
    })

  return () => {
    cancelled = true
    controller.abort()
  }
}, [])
```

Boilerplate significativo para cada chamada. E a flag `cancelled` precisa ser combinada com AbortController para cancelamento real da request.

---

### Bug 3: Estado Inconsistente

**Cenario:** Gerenciar loading/error/data manualmente permite estados impossiveis.

```tsx
const [loading, setLoading] = useState(false)
const [error, setError] = useState<Error | null>(null)
const [data, setData] = useState<User | null>(null)

useEffect(() => {
  setLoading(true)
  setError(null)
  fetch('/api/data')
    .then(res => {
      if (!res.ok) throw new Error('Fetch failed')
      return res.json()
    })
    .then(data => {
      setData(data)
      setLoading(false)
    })
    .catch(err => {
      setError(err)
      setLoading(false)
    })
}, [])
```

**Estados impossiveis que podem ocorrer:**
- `loading=true` + `error!=null` (carregando e com erro ao mesmo tempo)
- `data!=null` + `error!=null` (dados e erro ao mesmo tempo -- dados stale)
- `loading=false` + `data=null` + `error=null` (nenhum estado -- estado inicial vazio)

Cada `setState` causa re-render separado, e a ordem de atualizacao pode criar frames onde o estado e inconsistente.

---

## 2. Solucao: TanStack Query

TanStack Query resolve TODOS os 3 bugs com uma API declarativa:

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
})
```

### O que TanStack Query resolve automaticamente

| Problema | Solucao TanStack Query |
|----------|----------------------|
| Race conditions | Queries anteriores sao canceladas automaticamente quando a key muda |
| Memory leaks | Cleanup automatico no unmount, sem AbortController manual |
| Estados inconsistentes | Estados mutuamente exclusivos: `isLoading` XOR `error` XOR `data` |
| Cache | Resultados cacheados por queryKey, configurable por query |
| Retry | Retry automatico com exponential backoff (3 tentativas padrao) |
| Refetch | Refetch automatico em window focus, reconexao de rede |
| Stale data | Mostra dados stale enquanto revalida em background |
| Deduplication | Multiplos componentes usando mesma queryKey fazem 1 request |

### Configuracao Base

```tsx
// app/providers.tsx (ou equivalente)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutos ate considerar stale
      gcTime: 10 * 60 * 1000,       // 10 minutos em cache apos unmount
      retry: 3,                      // 3 tentativas em caso de erro
      refetchOnWindowFocus: true,    // refetch ao voltar para a aba
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Padroes Comuns

**GET - useQuery:**

```tsx
// Busca simples
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => api.getUser(userId),
  enabled: !!userId,  // So executa se userId existir
})

// Busca com transformacao
const { data: activeUsers } = useQuery({
  queryKey: ['users', 'active'],
  queryFn: () => api.getUsers(),
  select: (users) => users.filter(u => u.active),  // Transformar no client
})
```

**POST/PUT/DELETE - useMutation:**

```tsx
const mutation = useMutation({
  mutationFn: (newUser: CreateUserInput) => api.createUser(newUser),
  onSuccess: () => {
    // Invalidar cache para refetch automatico
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
  onError: (error) => {
    toast.error(`Erro ao criar usuario: ${error.message}`)
  },
})

// Uso
mutation.mutate({ name: 'Joao', email: 'joao@email.com' })
```

**Invalidacao de Cache:**

```tsx
// Invalidar uma query especifica
queryClient.invalidateQueries({ queryKey: ['user', userId] })

// Invalidar todas as queries de users
queryClient.invalidateQueries({ queryKey: ['users'] })

// Invalidar tudo
queryClient.invalidateQueries()
```

---

## 3. AbortController para Casos Especiais

Mesmo com TanStack Query, entender AbortController e importante para:
- Cancelamento manual de requests longas
- Upload de arquivos com botao "Cancelar"
- Debounce de busca com cancelamento

```tsx
// TanStack Query passa signal automaticamente
const { data } = useQuery({
  queryKey: ['search', term],
  queryFn: ({ signal }) => {
    return fetch(`/api/search?q=${term}`, { signal }).then(r => r.json())
  },
})

// Cancelamento manual com useMutation
const mutation = useMutation({
  mutationFn: async (file: File) => {
    const controller = new AbortController()
    controllerRef.current = controller
    return uploadFile(file, { signal: controller.signal })
  },
})

// Botao cancelar
const handleCancel = () => controllerRef.current?.abort()
```

---

## 4. Migracao: useEffect+fetch -> TanStack Query

### Passo a Passo

```
1. Instalar: bun add @tanstack/react-query
2. Configurar QueryClientProvider no root da app
3. Buscar por useEffect + fetch/axios no codebase (grep)
4. Para cada instancia:
   a. Extrair a funcao de fetch para arquivo separado (api/)
   b. Substituir useEffect+useState por useQuery ou useMutation
   c. Remover estados manuais (loading, error, data)
   d. Configurar queryKey unica e descritiva
5. Testar: navegacao rapida, unmount durante fetch, reconexao
```

### Antes vs Depois

```tsx
// ANTES: 15 linhas, 3 bugs escondidos
const [user, setUser] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  let cancelled = false
  setLoading(true)
  fetch(`/api/user/${id}`)
    .then(r => r.json())
    .then(data => { if (!cancelled) { setUser(data); setLoading(false) } })
    .catch(err => { if (!cancelled) { setError(err); setLoading(false) } })
  return () => { cancelled = true }
}, [id])

// DEPOIS: 4 linhas, 0 bugs
const { data: user, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
})
```

---

## 5. Verificacao Sistematica

Ao auditar data fetching em um projeto:

```
1. Buscar por useEffect + fetch/axios/api no codebase
   -> Cada instancia e candidata a migracao para TanStack Query

2. Verificar se ha AbortController ou flag cancelled
   -> Se NAO: race condition e memory leak confirmados

3. Verificar gerenciamento manual de loading/error/data
   -> Se SIM: estados inconsistentes possiveis

4. Verificar se queryKeys sao unicas e descritivas
   -> queryKey deve refletir exatamente os parametros da query

5. Verificar invalidacao apos mutations
   -> Apos POST/PUT/DELETE, invalidar queries relacionadas

6. Verificar staleTime/gcTime
   -> Configurar de acordo com frequencia de atualizacao dos dados
```
