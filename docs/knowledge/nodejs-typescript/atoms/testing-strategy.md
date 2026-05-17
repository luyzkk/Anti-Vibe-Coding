---
topic: testing-strategy
stack: nodejs-typescript
layer: both
sources:
  - research: ab2553f8
tier: 2
triggers: [vitest, jest, node:test, mock, fast-check, pact, stryker, mutation testing]
related_skills: [/tdd-workflow]
updated: 2026-05-16
---

# Testing Strategy — Node.js + TypeScript

## Quando consultar

- Escolher entre Vitest, Jest e `node:test` para um projeto novo ou migração.
- Decidir entre pirâmide clássica, Trophy ou Honeycomb para um serviço.
- Definir qual tipo de test double usar em uma fronteira (repositório, gateway HTTP).
- Adicionar property-based tests com `fast-check` para funções puras com domínio amplo.
- Avaliar contract testing com Pact em sistemas com múltiplos serviços.
- Auditar qualidade da suíte com mutation testing (StrykerJS).

## Padrões sênior

### Pattern: Vitest vs Jest vs `node:test` (escolha do runner)

- **Problema:** projetos novos herdam configuração pesada de `ts-jest` ou `@swc/jest`; migração sem critério claro gera atrito sem retorno.
- **Padrão:** Vitest para projetos novos (ESM-first, TypeScript via esbuild sem `ts-jest`, watch HMR, API compatível com Jest); Jest para bases CJS legadas ou React Native onde migração custaria mais que a economia; `node:test` para bibliotecas publicadas que precisam de zero dependências externas (combine com `tsx` ou type stripping nativo no Node 22.6+ e Borp para coverage via c8).
- **Quando usar Vitest:** greenfield, monorepo TS, projeto com sofrimento de CI em Jest+TypeScript, ESM obrigatório.
- **Quando usar Jest:** codebase existente com milhares de `jest.mock()` factory + closures; plugins específicos (`jest-image-snapshot`); React Native.
- **Quando usar `node:test`:** biblioteca pequena/média sem dependência de DOM, onde zero npm deps é requisito.

---

### Pattern: Pirâmide vs Trophy vs Honeycomb (shape da suíte)

- **Problema:** equipes aplicam pirâmide clássica em serviços que principalmente orquestram I/O — unit tests verificam implementação, não comportamento, resultando em suíte frágil com baixa confiança.
- **Padrão:** pirâmide clássica (muito unit, alguns integration, pouquíssimos E2E) para libs e kernels de domínio puro; Honeycomb (poucos unit, muitos integration, poucos E2E) para microserviços e workers orientados a I/O; Trophy (static + unit + muita integration + E2E crítico) para fullstack/SPA. Sustente integration tests com Testcontainers (Postgres, Redis, Kafka) para dependências reais.
- **Quando usar Honeycomb:** service que principalmente chama outros services — o valor está nas integrações, não na lógica pura.
- **Quando NÃO usar Honeycomb:** módulo com algoritmos densos ou regras de negócio complexas — pirâmide classica maximiza velocidade de feedback aqui.

---

### Pattern: Test doubles — fake > stub > mock > spy (hierarquia)

- **Problema:** overmocking — testes verificam que `sendEmail` foi chamado, mas não que o sistema funcionou; qualquer refactor interno quebra o teste sem bug real.
- **Padrão (taxonomia Meszaros/Fowler):** Fake (implementação funcional simplificada — ex: `InMemoryUserRepo implements IUserRepo`) para fronteiras de domínio (repositórios, gateways); Stub (`vi.fn().mockReturnValue(...)`) para queries onde o retorno é o que importa; Spy/Mock para commands (envio de email, publicação em fila — verificar que interação ocorreu). Princípio CQS de Khorikov: queries → stubs; commands → mocks/spies.
- **Quando usar Fake:** qualquer fronteira I/O de domínio; fakes validados por contract tests contra a implementação real.
- **Quando NÃO usar Mock:** lógica pura — teste real é mais barato e mais confiável que mock de função pura.

---

### Pattern: Property-based testing com `fast-check`

- **Problema:** testes baseados em exemplos manuais não cobrem edge cases do espaço de entrada; bugs aparecem em produção com inputs que ninguém imaginou.
- **Padrão:** `fast-check` gera inputs aleatórios e verifica propriedades invariantes — ex: `parse(stringify(x))` deve retornar `x` equivalente; `sort(arr).length === arr.length`; validador idempotente (`validate(validate(x)) === validate(x)`).
- **Quando usar:** parsers, serializers, algoritmos de ordenação/filtragem, validações com domínio amplo, funções com inversa demonstrável.
- **Quando NÃO usar:** lógica com side-effects ou que depende de estado externo — a propriedade fica difícil de expressar e o teste perde clareza.

---

### Pattern: Contract testing com Pact (consumer-driven)

- **Problema:** em sistemas com múltiplos serviços, mudanças de contrato de API quebram consumers silenciosamente — CI do provider passa, consumer explode em produção.
- **Padrão:** consumer escreve teste contra mock do provider e gera pact file; provider verifica o pact no seu CI. Pact suporta HTTP e messaging (AMQP, Kafka).
- **Quando usar:** monorepo polyglot ou microservices mantidos por times diferentes; quando há ≥ 3 serviços se comunicando por HTTP/messaging.
- **Quando NÃO usar:** monorepo TypeScript com tRPC ou contratos compartilhados via package — type safety em compile time já garante o contrato; adicionar Pact é custo sem benefício adicional.

---

### Pattern: Mutation testing com StrykerJS

- **Problema:** coverage % é métrica fraca — 90% de line coverage não garante que os testes detectam bugs; um teste sem assertion pode elevar coverage sem verificar nada.
- **Padrão:** StrykerJS introduz mutações no código (inverte condicionais, substitui operadores) e verifica se algum teste falha. Mutation score mede a proporção de mutantes mortos. Alvo: ≥ 80% em código de domínio crítico.
- **Quando usar:** módulo crítico (auth, billing, dados sensíveis); auditorias trimestrais da suíte; antes de reduzir cobertura mínima configurada.
- **Quando NÃO usar:** codebase inteiro em todo CI (overhead alto); módulos de boilerplate (DTOs, types, configs) — foque nos módulos onde um bug tem consequência real.

---

### Pattern: Fake timers para lógica time-dependent

- **Problema:** testes com `Date.now()`, `setTimeout`, `setInterval` ou `new Date()` são flaky por depender do clock real; outputs variam entre runs e ambientes.
- **Padrão:** `vi.useFakeTimers()` (Vitest) / `jest.useFakeTimers()` / `mock.timers.enable()` (`node:test`) — controla o clock deterministicamente. Avance o tempo explicitamente com `vi.advanceTimersByTime(ms)`.
- **Quando usar:** qualquer lógica com TTL, retry backoff, expiração de sessão, agendamento, debounce/throttle.
- **Quando NÃO usar:** testes de integração que precisam verificar comportamento com tempo real (ex: timeout de conexão real com Testcontainers) — use fake somente na camada unit/integration leve.

---

## Anti-padrões

- **Overmocking (mock de tudo):** teste verifica que função X foi chamada, mas não que o resultado está correto. Qualquer renomeação de método interno quebra o teste sem bug real. Correção: usar `Fake` (implementação simplificada in-memory) ou teste de integration com DB ephemeral (Testcontainers).

- **Flakiness por dependência de tempo ou rede real:** `Date.now()` sem fake, fetch HTTP sem interceptor, timer real em teste unit. Correção: fake timers (`vi.useFakeTimers()`) + MSW para HTTP externo.

- **Cobertura como meta:** perseguir linha de coverage gera testes triviais de getters/setters e assertions sem semântica. Correção: usar guideline qualitativa (Google Testing Blog: 60% aceitável, 75% commendable, 90% exemplar) + mutation score em módulos críticos; ignorar coverage em boilerplate (DTOs, types).

- **Snapshot tests gigantes:** snapshots de 50KB+ de JSON — qualquer mudança não-relacionada quebra; ninguém revisa o diff com cuidado. Correção: snapshot apenas do subset relevante do output, ou substituir por property-based test (verificar estrutura, não valor exato).

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Projeto novo, ESM, monorepo TS | Vitest |
| Codebase existente já em Jest | Continuar Jest (não migrar sem ROI claro) |
| Lib publicada, zero dependências externas | `node:test` (Node 20+) + Borp |
| Microserviço orientado a I/O | Honeycomb (muita integration com Testcontainers) |
| Lib ou módulo com lógica de domínio densa | Pirâmide (muita unit) |
| Função pura com invariante verificável | `fast-check` property test |
| Microservices polyglot, times diferentes | Pact contract testing |
| Módulo crítico (auth, billing) | StrykerJS mutation testing |
| Lógica com TTL, retry, expiração | Fake timers (`vi.useFakeTimers()`) |
| Fronteira de domínio (repositório, gateway) | Fake in-memory + contract test |

---

## Referências externas

- Skill: `/tdd-workflow` — ciclo RED→GREEN→REFACTOR, naive-first, vertical slices, princípios gerais de TDD (não duplicado aqui)
- Research: `ab2553f8` — `claude-code/knowledge/Nodejs/compass_artifact_wf-ab2553f8-3ae8-4b5e-b194-a134c0c0e36c_text_markdown.md`
