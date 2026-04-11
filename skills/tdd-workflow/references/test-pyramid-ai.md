---
type: reference
skill: tdd-workflow
---

# Piramide de Testes com IA — Referencia

A piramide classica foi projetada para times humanos. Com IA, o ROI por camada inverte.
Este documento guia onde investir esforco de testes em projetos com IA.

---

## Piramide Classica (sem IA)

```
     /\
    /E2E\        <- poucos (lentos, frageis, caros)
   /------\
  /Component\   <- medio
 /------------\
/  Unit Tests  \ <- muitos (rapidos, baratos, confiaveis)
```

Logica classica: quanto mais alto na piramide, mais caro e mais fragil.
Faz sentido para times humanos onde escrever testes e tempo do dev.

---

## Piramide com IA (Produtividade Real)

```
/  E2E Tests  \ <- IA brilha — melhor ROI
/--------------\
/ Component     \ <- IA funciona bem
/----------------\
/  Unit — infra   \ <- IA gera, questionar valor
/------------------\
/ Unit — negocio    \ <- HUMANO define, IA implementa
```

A inversao nao e sobre quantidade — e sobre QUEM LIDA COM CADA CAMADA melhor.

---

## Recomendacoes por Camada

### Unit Tests — Regras de Negocio (Critico)

**Quem escreve:** Humano especifica via testes
**Quem implementa:** IA

Por que humano especifica: regras de negocio encapsulam decisoes do dominio que IA
nao consegue inferir corretamente sem especificacao explicita.

Exemplo: "desconto de 10% para clientes com mais de 2 anos" — IA pode implementar,
mas a regra em si deve vir do humano como criterio de aceite no teste.

**Sintoma de problema:** IA escrevendo testes de regra de negocio autonomamente.
Isso e test-first sem especificacao — os testes "aprovam" o que a IA inventou.

### Unit Tests — Infra / Utils (Baixo valor)

**Quem escreve:** IA pode gerar

**Questionar antes de escrever:** "Se este codigo mudar, um teste aqui vai detectar
um bug real, ou vai apenas tornar o refactoring mais trabalhoso?"

Exemplos de baixo valor: getters triviais, formatadores simples, wrappers de biblioteca.

### Component Tests (Bom ROI)

**Quem escreve:** IA funciona bem com DSLs legiveis

Usar protocolo-based: testar comportamento do componente via interface publica,
nao via estado interno. DSLs como React Testing Library favorecem isso.

### E2E Tests — Melhor ROI com IA

**Quem escreve:** IA via Gherkin — excelente ROI

**Fluxo recomendado:**
```
User Story → Example Mapping → Gherkin → E2E automatizado
```

**Por que IA brilha em E2E:**
- Traduz User Story em Gherkin com alta fidelidade
- Example Mapping captura edge cases do stakeholder antes de escrever codigo
- Gherkin e legivel por nao-tecnicos — stakeholder pode validar

**Exemplo de fluxo:**

User Story:
> "Como usuario autenticado, quero criar uma tarefa com prazo para que eu nao esqueça."

Example Mapping:
- Happy path: usuario cria tarefa com prazo valido → aparece na listagem
- Edge case: prazo no passado → erro de validacao com mensagem clara
- Edge case: sem autenticacao → redirect para login

Gherkin gerado:
```gherkin
Feature: Criar tarefa com prazo
  Scenario: Usuario autenticado cria tarefa valida
    Given usuario esta autenticado
    When cria tarefa com titulo "Reuniao" e prazo "amanha"
    Then tarefa aparece na listagem com prazo correto

  Scenario: Prazo no passado e rejeitado
    Given usuario esta autenticado
    When cria tarefa com prazo "ontem"
    Then erro "Prazo deve ser uma data futura" e exibido
```

---

## Quando Comecar pelo E2E (Outside-in TDD)

Considerar comecar pelo E2E quando:
- Feature envolve fluxo de usuario completo (login, checkout, onboarding)
- Stakeholder precisa validar o fluxo antes da implementacao
- Incerteza sobre a interface (o E2E define o contrato de UX)

Fluxo outside-in:
1. Escrever E2E que falha (Red externo)
2. Escrever unit tests que fazem o E2E passar (Red interno)
3. Implementar codigo minimo (Green)
4. Refatorar

Quando NAO comecar pelo E2E:
- Logica pura de negocio sem UI (algoritmos, calculos, regras)
- Performance critica onde E2E seria muito lento como feedback loop

---

## Resumo de Decisao

| Situacao | Camada recomendada | Quem lidera |
|----------|-------------------|-------------|
| Regra de negocio nova | Unit | Humano define, IA implementa |
| Fluxo de usuario | E2E via Gherkin | IA gera Gherkin, humano valida |
| Componente UI isolado | Component | IA com DSL legivel |
| Wrapper de biblioteca | Unit (questionar ROI) | IA se decidir testar |
| Bug de regressao | Unit ou E2E (depende do scope) | Humano define cenario exato |
