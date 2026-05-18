## Tests

Seguir **F.I.R.S.T:**
- **Fast:** testes unitários em < 50ms cada
- **Independent:** sem dependência de ordem ou estado compartilhado entre testes
- **Repeatable:** mesmo resultado em qualquer ambiente (sem clock real, sem rede real)
- **Self-validating:** passa ou falha — sem interpretação manual
- **Timely:** escrito ANTES do código de produção (TDD)

**Cobertura mínima:**
- Lógica de negócio: ≥ 95%
- Global: ≥ 80%
- Branch (condicionais): ≥ 70%

**Testes headless:** sem UI real, sem rede real, sem banco real. Use mocks/fakes para dependências externas.

**Nomes de teste:** verbo descritivo, sem "should". Ex: `returns 401 when token expired`, `charges invoice on first retry`.
