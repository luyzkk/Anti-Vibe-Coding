# Fase 02 — Coverage Thresholds em `testing-standards.md`

## Objetivo

Adicionar seção "Coverage Thresholds" ao final de `rules/testing-standards.md` com os valores hardcoded da decisão D7.

## Arquivo a Modificar

`f:\Projetos\Claude code\anti-vibe-coding\rules\testing-standards.md`

**OBRIGATÓRIO:** Releia o arquivo imediatamente antes de editar. O conteúdo lido durante planejamento pode divergir do estado atual.

---

## Estado Atual do Arquivo

O arquivo termina na linha 69, com:

```
## O que NÃO testar

- Implementação interna (private methods)
- Getters/setters triviais
- Código de terceiros (frameworks, libs)
- UI estática sem lógica
```

Não existe seção de coverage thresholds.

---

## Edição 1 — Adicionar Seção de Coverage Thresholds

### Estratégia

Adicionar ao final do arquivo (após a última linha). Usar old_string = o bloco final atual para garantir posicionamento exato.

### old_string (exato — últimas linhas do arquivo):
```
## O que NÃO testar

- Implementação interna (private methods)
- Getters/setters triviais
- Código de terceiros (frameworks, libs)
- UI estática sem lógica
```

### new_string:
```
## O que NÃO testar

- Implementação interna (private methods)
- Getters/setters triviais
- Código de terceiros (frameworks, libs)
- UI estática sem lógica

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
```

---

## Checklist de Verificação

Após aplicar a edição, confirme cada item:

```bash
# 1. Seção Coverage Thresholds presente
grep "Coverage Thresholds" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: ## Coverage Thresholds (D7)

# 2. Threshold de business logic 95%
grep "95%" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: linha com ≥95%

# 3. Threshold global 80%
grep "80%" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: linha com ≥80%

# 4. Branch coverage 70%
grep "70%" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: linha com ≥70%

# 5. Menção à evidência empírica de Akita
grep "274 commits" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: linha com "274 commits reais"

# 6. Seção anterior "O que NÃO testar" ainda presente e intacta
grep "O que NÃO testar" "f:/Projetos/Claude code/anti-vibe-coding/rules/testing-standards.md"
# Esperado: encontrar a seção
```

## Commit

Repo: `f:\Projetos\Claude code\anti-vibe-coding\`

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add rules/testing-standards.md
git commit -m "feat(rules): coverage thresholds D7 hardcoded (95/80/70)"
```

## Gotchas desta Fase

- Esta fase não tem dependência de fase 01 — pode rodar em paralelo, mas ambas fazem commit no mesmo repo. Verificar `git diff --staged` antes de cada commit para confirmar atomicidade
- O old_string inclui o bloco completo "O que NÃO testar" para posicionamento exato — se o arquivo foi editado por outra fase primeiro, reler e ajustar o old_string
- Os blocos de código TypeScript dentro da seção têm triple backticks — confirmar que o Markdown renderizou corretamente após editar
- A nota sobre 95% não ser enforçado automaticamente é intencional — o threshold 80% global é o que vai no config do runner
