# LLM Anti-Patterns — Referencia para Skills

Material de referencia com exemplos concretos de erros comuns de LLMs ao codar.
Derivado das observacoes de Andrej Karpathy e PRs da comunidade karpathy-skills.

Referenciado por: `/learn`, `/consultant`, `/anti-vibe-review`, rules comportamentais.

---

## 1. Over-Engineering (Abstracoes Prematuras)

### O que LLMs fazem

Pedido: "Adicionar funcao de calcular desconto"

```typescript
// 150 linhas: Strategy pattern + DiscountConfig + DiscountCalculator + 3 subclasses
abstract class DiscountStrategy {
  abstract calculate(amount: number): number
}
class PercentageDiscount extends DiscountStrategy { ... }
class FixedDiscount extends DiscountStrategy { ... }
class DiscountCalculator {
  constructor(private config: DiscountConfig) {}
  apply(amount: number): number { ... }
}
```

### O que deveria acontecer

```typescript
function calculateDiscount(amount: number, percent: number): number {
  return amount * (percent / 100)
}
```

**Quando adicionar complexidade:** quando REALMENTE precisar de multiplos tipos de desconto. Nao antes.

---

## 2. Side-Effect Edits (Mudancas Ortogonais)

### O que LLMs fazem

Pedido: "Corrigir bug de email vazio no validador"

```diff
- def validate_user(user_data):
-     # Check email format
-     if not user_data.get('email'):
+ def validate_user(user_data: dict) -> bool:
+     """Validate user data."""
+     email = user_data.get('email', '').strip()
+     if not email:
          raise ValueError("Email required")
+     if len(username) < 3:
+         raise ValueError("Username too short")  # ninguem pediu isso
```

Problemas: adicionou type hints, docstring, validacao de username — nada disso foi pedido.

### O que deveria acontecer

```diff
  def validate_user(user_data):
      # Check email format
-     if not user_data.get('email'):
+     email = user_data.get('email', '')
+     if not email or not email.strip():
          raise ValueError("Email required")
```

Apenas as linhas que corrigem o bug reportado.

---

## 3. Silent Assumptions (Suposicoes Nao Declaradas)

### O que LLMs fazem

Pedido: "Adicionar feature de exportar dados de usuarios"

```typescript
// Assume formato JSON, exporta TODOS os usuarios, salva em arquivo local
export async function exportUsers() {
  const users = await db.user.findMany()
  await writeFile('users.json', JSON.stringify(users))
  return `Exported ${users.length} users`
}
```

Suposicoes silenciosas: formato JSON, todos os usuarios, arquivo local, sem paginacao, sem privacidade.

### O que deveria acontecer

```
Antes de implementar, preciso clarificar:

1. Escopo: Exportar todos os usuarios ou subconjunto filtrado? (implicacoes de privacidade)
2. Formato: JSON? CSV? Qual destino? (download no browser, arquivo no server, API?)
3. Campos: Quais campos incluir? (alguns podem ser sensiveis)
4. Volume: Quantos usuarios? (afeta abordagem — paginacao, streaming, background job)

Abordagem mais simples: endpoint API que retorna JSON paginado.
```

---

## 4. Sycophantic Compliance (Aceitar Premissa Errada)

### O que LLMs fazem

Pedido: "A funcao calculateTax na linha 42 usa taxa de 15%. Mude para 20%."

```typescript
// Muda direto sem verificar — aceita a afirmacao como fato
function calculateTax(amount: number): number {
  return amount * 0.20 // era 0.15, agora 0.20
}
```

### O que deveria acontecer

```
Verifiquei a linha 42. A funcao calculateTax usa taxa de 25% (0.25), nao 15%.

Antes de mudar para 20%, confirme:
1. Estamos falando da funcao certa? Existe tambem calculateVAT na linha 67.
2. A mudanca e 25% → 20% (diferente de 15% → 20%). Confirma?
```

---

## 5. Naive-First Violation (Otimizar Antes de Validar)

### O que LLMs fazem

Pedido: "Implementar busca de usuarios por nome"

```typescript
// Otimiza prematuramente: cache, index hints, fuzzy matching, debounce
class UserSearchService {
  private cache = new LRUCache({ max: 1000, ttl: 60000 })

  async search(query: string): Promise<User[]> {
    const cached = this.cache.get(query)
    if (cached) return cached
    const results = await db.$queryRaw`
      SELECT * FROM users
      WHERE name ILIKE ${`%${query}%`}
      ORDER BY similarity(name, ${query}) DESC
      LIMIT 20
    `
    this.cache.set(query, results)
    return results
  }
}
```

### O que deveria acontecer

```typescript
// Naive first — funciona, esta testado, otimiza depois SE necessario
async function searchUsers(query: string): Promise<User[]> {
  return db.user.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    take: 20,
  })
}
```

Cache e fuzzy matching so quando houver evidencia de necessidade (benchmark, metricas).

---

## 6. Document Sprawl (Proliferacao de Docs)

### O que LLMs fazem

Apos implementar feature, criam:
- SUMMARY.md (resumo do que foi feito)
- DECISIONS.md (decisoes tomadas)
- ARCHITECTURE.md (como a feature funciona)
- CHANGELOG-feature.md (historico de mudancas)

4 documentos que explicam a mesma coisa de formas diferentes. Nenhum e a fonte de verdade.

### O que deveria acontecer

O codigo e os commits sao a fonte de verdade. Se precisa de contexto:
- Adicione comentario inline no codigo (por que, nao como)
- Atualize o README existente
- Registre decisao no decisions.md DO PROJETO (nao crie novo)

"Se um documento existe APENAS para explicar outro documento, delete e corrija o original."

---

## Resumo

| Anti-Pattern | Sinal | Correcao |
|---|---|---|
| Over-engineering | Strategy pattern para 1 caso de uso | Funcao simples, refatore quando 3+ usos |
| Side-effect edits | Diff com type hints, docstrings nao pedidos | Cada linha rastreia ao pedido |
| Silent assumptions | Implementa sem perguntar escopo/formato | Declare suposicoes ou pergunte |
| Sycophantic compliance | Aceita premissa sem verificar | Leia o arquivo, corrija se errado |
| Naive-first violation | Cache/otimizacao antes de testes | Naive → teste → otimize com safety net |
| Document sprawl | 4 docs explicando a mesma coisa | Codigo e fonte de verdade |
