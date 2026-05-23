# tdd-cycle-checklist

> Origem: docs/compound/2026-05-19-tdd-gate-needs-stub-first.md
>
> Reference operacional para o ciclo RED -> GREEN -> REFACTOR sob o hook
> `tdd-gate.cjs`. Narrativa esta na compound-origem; aqui sao verificacoes.

Checklist para qualquer fase TDD do `/plan-executor` ou `/execute-plan` com instrucao
"RED commit antes do GREEN commit". O hook reforca em runtime, mas a expectativa
comeca no plano.

## RED stub obrigatorio (ordem nao-negociavel)

- [ ] Passo 1: criar `parser.test.ts` com assertions REAIS (nao `expect(true).toBe(true)`)
- [ ] Passo 2: criar `parser.ts` como STUB minimo — `throw new Error('not implemented')`
      em CADA export que o teste importa
- [ ] Passo 3: rodar `bun test <arquivo>` — confirmar erro = `Error: not implemented`
      (assertion-driven), NAO `Cannot find module` (module-not-found)
- [ ] Passo 4: commit RED com mensagem `test(...): RED — <descricao>`
- [ ] Passo 5: implementar GREEN (substituir stub por logica real)
- [ ] Passo 6: commit GREEN com mensagem `feat(...): GREEN — <descricao>`
- [ ] Passo 7 (opcional): REFACTOR com testes verdes; commit `refactor(...): ...`

## Sinal `Cannot find module` no RED genuino — abortar

- [ ] Se `bun test` em RED commit mostra `Cannot find module` ou `Cannot resolve
      import` -> falta o stub. RED NAO e valido. Voltar ao Passo 2 e criar o stub
- [ ] Se `bun test` em RED commit mostra `Error: not implemented` (ou equivalente
      lancado pelo stub) -> RED valido, prosseguir para GREEN
- [ ] Diferenca conceitual: teste deve falhar POR AUSENCIA DE COMPORTAMENTO
      (assertion-driven), nao POR AUSENCIA DE MODULO (file-system error)

## Ordem dos commits (obrigatoria)

- [ ] Commit RED PRIMEIRO (teste + stub que throws) — visivel no `git log`
- [ ] Commit GREEN SEGUNDO (substitui stub por logica real) — visivel no `git log`
- [ ] PR review pode validar a sequencia: `git log --oneline -2` mostra
      `feat(...): GREEN` apos `test(...): RED`
- [ ] Squash de RED + GREEN em commit unico DESTROI a auditabilidade do ciclo —
      preferir merge commit ou rebase preservando os 2 commits separados

## Distincao TDD vs test-after

- [ ] TDD genuino: teste escrito ANTES da implementacao real (stub e a unica coisa
      que existe quando teste e escrito)
- [ ] Test-after: teste escrito DEPOIS — sempre verde no primeiro run, nao prova
      que captura o comportamento de fato
- [ ] Red flag em PR review: commit unico contendo teste + implementacao final ->
      provavelmente test-after disfarcado de TDD; pedir auditoria
- [ ] Hook `tdd-gate.cjs` mitiga test-after bloqueando criacao de impl sem teste;
      nao previne test-after se desenvolvedor desabilita o hook

## Stub minimo: o que escrever

- [ ] Stub e UMA linha por export — `throw new Error('not implemented')`
- [ ] Tipo de retorno do stub: `never` (TypeScript) para o compilador entender que
      a funcao nao retorna valor — `export function fn(): never { throw ... }`
- [ ] Se a funcao tem assinatura complexa (generics, overloads), stub mantem a
      assinatura mas body so faz `throw` — nao tenta retornar valor placeholder
- [ ] Custo do stub: 1 linha de codigo. Beneficio: RED auditavel, nao module-not-found

## Exemplo completo (reproduzir antes de iniciar fase TDD nova)

- [ ] Criar `parser.test.ts` com pelo menos 1 assertion
- [ ] Criar `parser.ts` com `export function parseProgressTxt(_content: string): never
      { throw new Error('not implemented') }`
- [ ] Rodar `bun test parser.test.ts` — observar `Error: not implemented`
- [ ] Commit: `test(parser): RED — parseProgressTxt heading com category`
- [ ] Implementar `parseProgressTxt` retornando array com 1 elemento para entrada
      `### [bug] x`
- [ ] Rodar `bun test parser.test.ts` — observar verde
- [ ] Commit: `feat(parser): GREEN — parseProgressTxt heading com category`

## Anti-padroes comuns

- [ ] NAO: assertion vazia (`expect(true).toBe(true)`) — passa sempre, nao prova nada
- [ ] NAO: commit unico com teste + impl real — destroi a auditabilidade do ciclo
- [ ] NAO: pular o stub e contar com `Cannot find module` como RED — falha por
      motivo errado
- [ ] NAO: desabilitar `tdd-gate.cjs` para "ir mais rapido" — o hook existe porque
      o pipeline confia no ciclo RED -> GREEN auditavel

## Referencias

- Compound: [tdd-gate-needs-stub-first](../compound/2026-05-19-tdd-gate-needs-stub-first.md) — incidente fonte
- Hook: `hooks/tdd-gate.cjs` — PreToolUse que bloqueia impl sem teste
- Skill: `skills/tdd-workflow/SKILL.md` — workflow TDD completo (esta reference cobre
  apenas o gate RED stub-first; ciclo completo na skill)
