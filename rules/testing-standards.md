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
