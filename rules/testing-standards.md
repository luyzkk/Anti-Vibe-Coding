# Testing Standards — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos `.test.*`, `.spec.*` e em `tests/`.

## Ciclo TDD (Obrigatório)

1. **Red** — Escreva o teste. Ele DEVE falhar. Não escreva código de produção.
2. **Green** — Escreva o código MÍNIMO para o teste passar. Nada mais.
3. **Refactor** — Otimize mantendo testes verdes.

NUNCA gere código de produção e testes ao mesmo tempo.

## Princípios

- Teste **comportamento**, não implementação
- Escreva um teste para cada bug corrigido (previne reincidência)
- Cada teste deve ser independente e isolado
- Testes devem ser determinísticos (sem dependência de estado externo)

## Naming

- Use verbos em terceira pessoa: `returns`, `throws`, `creates`, `updates`
- NÃO use "should": `returnsErrorWhenInvalidInput` não `shouldReturnError`
- Organize com blocos `describe` por módulo/funcionalidade

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

## Mocking

- Mock apenas dependências externas (APIs, banco, file system)
- NUNCA mock a unidade sendo testada
- Prefira stubs sobre mocks quando possível
- Reset mocks entre testes

## O que testar

- Happy path (cenário principal)
- Edge cases (valores limites, null, undefined, arrays vazios)
- Error handling (exceções esperadas)
- Integração entre módulos (se aplicável)

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

## Coverage Thresholds (D7)

Valores hardcoded baseados em evidência empírica de 274 commits reais (Fabio Akita).
Não são configuráveis — eliminar bikeshedding sobre números.

### Thresholds Obrigatórios

| Escopo | Métrica | Mínimo |
|--------|---------|--------|
| Business logic (services, models, domain) | Line coverage | ≥95% |
| Global (todo o projeto, incluindo integrações mockadas) | Line coverage | ≥80% |
| Global | Branch coverage | ≥70% |

**Business logic** = qualquer módulo em `services/`, `models/`, `domain/`, `use-cases/`, ou equivalente no projeto.

### Ratio Teste/Código (referência, não enforçado)

1.2x–1.5x linhas de teste por linha de código de produção.
Abaixo de 1.0x: testes insuficientes ou superficiais.
Acima de 2.0x: possível over-testing de implementação (rever o que está sendo testado).

### Como Verificar

```bash
# Vitest
bunx vitest run --coverage

# Jest
bunx jest --coverage

# Verificar se thresholds estão configurados no vitest.config.ts / jest.config.ts:
# coverage: { thresholds: { lines: 80, branches: 70 } }
```

### Configurar em vitest.config.ts

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        branches: 70,
        // Business logic: configurar por glob se necessário
      },
    },
  },
})
```

**Nota:** Os 95% de business logic não são enforçados automaticamente pelo runner padrão — são uma meta que o TDD workflow deve perseguir ao escrever testes para services/models/domain.
