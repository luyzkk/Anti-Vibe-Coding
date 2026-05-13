# Fase 03 — Exemplos Multi-Linguagem nas Rules (Python + Ruby)

**Arquivos:**
- `f:\Projetos\Claude code\anti-vibe-coding\rules\code-quality.md`
- `f:\Projetos\Claude code\anti-vibe-coding\rules\testing-standards.md`

**Sizing:** ~1.5h  
**Decisao PRD:** D14

## Contexto

Ambos os arquivos de rules têm exemplos exclusivamente em TypeScript/JavaScript. D14 define cobertura mínima de TS/JS + Python + Ruby. A adição deve ser **concisa** (3-5 linhas por snippet) — o objetivo é mostrar o equivalente idiomático, não escrever um tutorial.

## Nota sobre Plano 02

O Plano 02 fase-01 modifica `code-quality.md` (threshold 40L e política D3 para funções longas). Esta fase usa âncoras que estão no arquivo atual e que **não mudam com Plano 02** (seções de Logging, JavaScript/TypeScript, Anti-Patterns). Se Plano 02 for executado antes desta fase, verificar se as âncoras ainda existem antes de editar.

---

## Arquivo 1: `code-quality.md`

### Alteracao 1A — Secao Logging: adicionar Python e Ruby

**Contexto:** A seção Logging atualmente menciona apenas Pino (Node). Adicionar equivalentes Python (structlog/logging.json) e Ruby (semantic_logger).

**old_string:**
```
## Logging

- Wide Events: UM evento rico por request (nao 17 linhas)
- Campos obrigatorios: request_id, user_id, status, latency
- Nomes padronizados (user_id, nao userId/user/usuario)
- Console.log e SINCRONO → bloqueia event loop
- Usar Pino ou Node Streams (assincronos) em producao
- NUNCA console.log de dados sensiveis
```

**new_string:**
```
## Logging

- Wide Events: UM evento rico por request (nao 17 linhas)
- Campos obrigatorios: request_id, user_id, status, latency
- Nomes padronizados (user_id, nao userId/user/usuario)
- Console.log e SINCRONO → bloqueia event loop
- Usar Pino ou Node Streams (assincronos) em producao
- NUNCA console.log de dados sensiveis

### Logging por Linguagem

**TypeScript/JavaScript** — Pino (JSON estruturado, assincrono):
```ts
logger.info({ request_id, user_id, status, latency_ms }, 'request completed')
```

**Python** — structlog (JSON estruturado):
```python
log.info("request_completed", request_id=rid, user_id=uid, status=200, latency_ms=42)
```

**Ruby** — semantic_logger (JSON estruturado):
```ruby
logger.info "request_completed", request_id: rid, user_id: uid, status: 200, latency_ms: 42
```
```

### Alteracao 1B — Secao JavaScript/TypeScript: renomear e adicionar Python e Ruby

**Contexto:** A seção "JavaScript/TypeScript" tem regras específicas de JS. Adicionar equivalentes para Python e Ruby como subsecoes.

**old_string:**
```
## JavaScript/TypeScript

- `const` > `let` >> NUNCA `var`
- `Promise.all` para operacoes independentes (nao await sequencial)
- SEMPRE `.catch()` ou try/catch em promises
- Closures: extrair minimo necessario, WeakMap para caches
- Remover timers/listeners quando nao mais necessarios (cleanup)
- Map/Filter/Reduce > for-loops quando mais expressivo
```

**new_string:**
```
## Por Linguagem

### JavaScript/TypeScript

- `const` > `let` >> NUNCA `var`
- `Promise.all` para operacoes independentes (nao await sequencial)
- SEMPRE `.catch()` ou try/catch em promises
- Closures: extrair minimo necessario, WeakMap para caches
- Remover timers/listeners quando nao mais necessarios (cleanup)
- Map/Filter/Reduce > for-loops quando mais expressivo
- Formatador: prettier (JS/TS), biome como alternativa
- Tipos explicitos: TypeScript strict mode, sem `any`

### Python

- Imutabilidade: prefira tuples sobre listas quando nao vai mudar
- List comprehensions > map/filter quando mais legivel
- `with` para recursos (arquivos, conexoes) — garante cleanup
- Type hints obrigatorios: `def process(user_id: int) -> Result`
- Formatador: black (zero configuracao)

```python
# Correto
result = [transform(x) for x in items if x.is_valid()]

# Errado
result = list(map(lambda x: transform(x), filter(lambda x: x.is_valid(), items)))
```

### Ruby

- Prefira `map`, `select`, `reduce` sobre loops imperativos
- `freeze` constantes: `TIMEOUT = 30.freeze`
- Type hints via RBS quando aplicavel (Ruby 3+)
- Formatador: rubocop
- Evite `method_missing` — dificulta grep e debugabilidade

```ruby
# Correto
valid_users = users.select(&:active?).map { |u| UserPresenter.new(u) }
```
```

---

## Arquivo 2: `testing-standards.md`

### Alteracao 2A — Secao Estrutura: adicionar equivalentes Python (pytest) e Ruby (rspec)

**Contexto:** A seção "Estrutura" tem apenas o snippet TypeScript. Adicionar equivalentes idiomáticos.

**old_string:**
```
## Estrutura

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('returns expected value when given valid input', () => {
      // Arrange
      const input = createValidInput()

      // Act
      const result = functionName(input)

      // Assert
      expect(result).toEqual(expectedValue)
    })

    it('throws ValidationError when input is invalid', () => {
      expect(() => functionName(invalidInput)).toThrow(ValidationError)
    })
  })
})
```
```

**new_string:**
```
## Estrutura

**TypeScript** (jest / vitest):

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('returns expected value when given valid input', () => {
      // Arrange
      const input = createValidInput()

      // Act
      const result = functionName(input)

      // Assert
      expect(result).toEqual(expectedValue)
    })

    it('throws ValidationError when input is invalid', () => {
      expect(() => functionName(invalidInput)).toThrow(ValidationError)
    })
  })
})
```

**Python** (pytest):

```python
class TestFunctionName:
    def returns_expected_value_when_given_valid_input(self):
        result = function_name(create_valid_input())
        assert result == expected_value

    def raises_validation_error_when_input_is_invalid(self):
        with pytest.raises(ValidationError):
            function_name(invalid_input)
```

**Ruby** (rspec):

```ruby
RSpec.describe ModuleName do
  describe '#function_name' do
    it 'returns expected value when given valid input' do
      expect(function_name(valid_input)).to eq(expected_value)
    end

    it 'raises ValidationError when input is invalid' do
      expect { function_name(invalid_input) }.to raise_error(ValidationError)
    end
  end
end
```
```

### Alteracao 2B — Adicionar secao de comandos por linguagem apos "O que NAO testar"

**Contexto:** O arquivo termina em "O que NAO testar" sem informar como rodar testes. Adicionar secao de comandos por linguagem (D14).

**old_string:**
```
## O que NÃO testar

- Implementação interna (private methods)
- Getters/setters triviais
- Código de terceiros (frameworks, libs)
- UI estática sem lógica
```

**new_string:**
```
## O que NÃO testar

- Implementação interna (private methods)
- Getters/setters triviais
- Código de terceiros (frameworks, libs)
- UI estática sem lógica

## Comandos por Linguagem

| Linguagem | Rodar testes | Watch mode |
|-----------|-------------|------------|
| TypeScript/JS | `bun run test` (vitest) ou `jest` | `vitest --watch` |
| Python | `pytest` | `pytest-watch` ou `ptw` |
| Ruby | `rspec` | `guard-rspec` |
```

---

## Checklist de Execucao

### code-quality.md
- [ ] Leu o arquivo antes de editar
- [ ] Aplicou Alteracao 1A (Logging multi-lang) com old_string/new_string exatos
- [ ] Releu para confirmar que blocos de codigo estao corretamente fechados (triple backtick)
- [ ] Aplicou Alteracao 1B (secao Por Linguagem) com old_string/new_string exatos
- [ ] Releu o arquivo completo — verificar que nenhuma secao foi deslocada ou duplicada
- [ ] Commit: `feat(rules): add Python and Ruby examples to code-quality.md (D14)`

### testing-standards.md
- [ ] Leu o arquivo antes de editar
- [ ] Aplicou Alteracao 2A (Estrutura multi-lang) com old_string/new_string exatos
- [ ] Verificou que os tres blocos de codigo (TS, Python, Ruby) estao corretamente fechados
- [ ] Aplicou Alteracao 2B (tabela de comandos) com old_string/new_string exatos
- [ ] Releu o arquivo completo
- [ ] Commit: `feat(rules): add Python and Ruby testing examples and commands (D14)`

## Notas

- Snippets devem ter 3-8 linhas — nao expandir para tutoriais
- Os backticks dentro dos new_string devem ser escapados corretamente na ferramenta Edit
- Se Plano 02 foi executado antes: verificar se a secao "JavaScript/TypeScript" existe com exatamente esse nome. Se foi renomeada pelo Plano 02, ajustar a âncora da Alteracao 1B antes de aplicar.
- Os commits podem ser agrupados em um unico commit se as duas alteracoes de um arquivo forem feitas em sequencia: `feat(rules): add Python and Ruby multi-lang examples (D14)`
