---
type: reference
skill: tdd-workflow
---

# IA-TDD — Ciclo de 10 Passos

Referencia do ciclo completo com prompts por fase. Use este ciclo para features de complexidade
Media ou Alta. Para features simples, os 7 passos classicos sao suficientes.

---

## Passo 1 — Definir Requisitos

Entrada: descricao da feature em linguagem natural ou User Story.
Saida: lista de requisitos verificaveis (criterios de aceite).

Se vindo de um PRD (skill write-prd), importar diretamente.
Se nao: elicitar requisitos com perguntas: "O que deve acontecer quando X?" / "O que NAO deve acontecer?"

---

## Passo 2 — Validar Requisitos com IA

Prompt recomendado:
> "Dado estes requisitos: [lista]. Que edge cases ou cenarios criticos nao estao cobertos?
>  Liste o que pode dar errado, nao confirme que esta correto."

Principio: "Pergunte o que esta errado, nao se esta certo" — IA confirma vieses.
NAO perguntar "estes requisitos estao bons?" — resposta sempre sera sim.

---

## Passo 3 — Criar Esqueleto (NotImplemented)

Criar a interface publica do modulo com implementacoes stub:
- Metodos que lancam NotImplementedError / throw new Error('not implemented')
- Objetivo: definir a API antes de escrever testes
- Aplicar Deep Modules: "Que interface eu gostaria de usar?" (ver references/deep-modules.md)

---

## Passo 4 — Escrever Testes — Fase RED

Prompt recomendado:
> "Com base nos requisitos abaixo, escreva testes AAA (Arrange-Act-Assert).
>  Um teste por vez. Comece pelo happy path, depois edge cases.
>  Os testes devem falhar por assertion, nao por erro de compilacao."

Regras da fase RED:
- Um teste por ciclo (nao test-first com todos de uma vez)
- Os testes testam comportamento observavel, nao implementacao interna
- Se precisar mockar 3+ dependencias internas, redesenhar a interface (modulo shallow)

---

## Passo 5 — CONTEXT ISOLATION

Separacao obrigatoria entre quem escreveu os testes e quem vai implementar.

O subagente da fase GREEN NAO deve ter acesso aos requisitos em texto natural.
A unica fonte da verdade e o teste.

Como implementar:
- Em sessao interativa: abrir nova janela / novo contexto
- Em subagentes automatizados: Agent separado sem os requisitos no prompt

---

## Passo 6 — Implementar — Fase GREEN

Prompt recomendado:
> "Com base APENAS nos testes abaixo, implemente o codigo minimo para faze-los passar.
>  NAO leia os requisitos — os testes sao a especificacao.
>  Baby steps: um teste por vez.
>  Arquivos *.test.* e *.spec.* sao read-only."

Regras da fase GREEN:
- Codigo minimo (no gold plating)
- Arquivos de teste sao ancoras imutaveis
- Se um teste parece errado: reportar como `partial`, NAO editar o teste

---

## Passo 7 — Audit Critico

Prompt recomendado:
> "Liste os problemas encontrados nesta implementacao.
>  Considere: edge cases nao cobertos, violacoes de SOLID, problemas de performance,
>  riscos de seguranca, code smells."

NAO perguntar "esta bom?" — IA confirma vieses.
Perguntar "o que esta errado?" — IA critica.

---

## Passo 8 — Refatorar (mantendo testes verdes)

Aplicar melhorias do audit critico:
- Extrair logica complexa para modulos dedicados
- Aplicar principios Deep Modules (simplificar interface se ficou shallow)
- Executar `bun run test` apos cada mudanca — nenhum teste pode quebrar

---

## Passo 9 — Confirmar Todos os Testes Passam

Executar suite completa: `bun run test && bun run lint`
Incluir testes de modulos dependentes em monorepo.

---

## Passo 10 — Mutation Testing (Opcional)

Quando usar: feature critica (auth, financeiro, logica de negocio complexa).
Objetivo: verificar se os testes realmente detectam bugs.

Config: `config/tdd-gate.json → mutation_testing: true`

Aviso: mutation testing aumenta tempo de execucao significativamente.
Usar apenas quando o custo de um bug em producao supera o custo do teste.

---

## Resumo Visual

```
1. Definir requisitos
2. Validar: "O que esta errado?"
3. Criar esqueleto (NotImplemented)
4. Escrever testes (RED) — 1 por vez
       ↓
5. ══ CONTEXT ISOLATION ══
       ↓
6. Implementar (GREEN) — codigo minimo
7. Audit critico: "Liste os problemas"
8. Refatorar mantendo testes verdes
9. Confirmar testes passam
10. [Opcional] Mutation testing
```
