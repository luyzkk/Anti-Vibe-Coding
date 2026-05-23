<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Criar `docs/references/tdd-cycle-checklist.md`

**Plano:** 03 — Pipeline Compound -> Reference
**Sizing:** 0.75h (S)
**Depende de:** fase-01 (criterio de promocao documentado primeiro). Independente de fase-02 e fase-03 — pode rodar em paralelo.
**Visual:** false

---

## O que esta fase entrega

Reference operacional `docs/references/tdd-cycle-checklist.md` em formato checklist destilado de `docs/compound/2026-05-19-tdd-gate-needs-stub-first.md`. Cobre parte de CA-05 e MH-05 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/references/tdd-cycle-checklist.md` | Create | Reference novo em formato checklist com header `> Origem:` citando a compound-origem |

---

## Implementacao

### Passo 1: Reler `tdd-gate-needs-stub-first.md`

Conteudo cobre:
- Hook `tdd-gate.cjs` bloqueia `Write`/`Edit` em implementacao sem teste
- RED falso por `Cannot find module` (ausencia de arquivo, nao de comportamento)
- Solucao: stub minimo (`throw new Error('not implemented')`) ANTES do teste
- Ordem obrigatoria de 5 passos (test -> stub -> RED commit -> impl -> GREEN commit)
- Sinal de alerta: `Cannot find module` em RED commit = abortar

### Passo 2: Criar `docs/references/tdd-cycle-checklist.md`

Snippet de referencia:

```markdown
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
```

### Passo 3: Verificar formato

Mesma checagem das fases anteriores (header `Origem`, `>= 5` items `- [ ]`, `>= 40` linhas).

---

## Gotchas

- **G3 do plano (R-07):** Formato checklist, nao prosa. A compound-origem ja tem snippet de codigo detalhado — na reference, manter snippet curto inline (`throw new Error('not implemented')`) e linkar a compound para versao completa.
- **G2 do plano (R-03):** Compound `tdd-gate-needs-stub-first.md` nao modificada nesta fase. Frontmatter sera tocado em fase-05.
- **Local — escopo da reference:** Esta reference cobre ESPECIFICAMENTE o problema "RED genuino exige stub minimo primeiro". NAO duplicar o conteudo de `skills/tdd-workflow/SKILL.md` (que cobre ciclo TDD completo, Test Sizes, DAMP, etc — refatoracao prevista em Plano 04 fase-01). Esta reference e o gate de UM aspecto critico — manter foco.

---

## Verificacao

### TDD

- [ ] **RED:** Arquivo nao existe.
  - Comando: `test -f docs/references/tdd-cycle-checklist.md && echo "exists" || echo "missing"`
  - Resultado esperado: `missing`

- [ ] **GREEN:** Apos criar, arquivo existe e satisfaz formato.
  - Comando: `test -f docs/references/tdd-cycle-checklist.md && echo "exists"`
  - Resultado esperado: `exists`

### Checklist

- [ ] Arquivo criado: `test -f docs/references/tdd-cycle-checklist.md`
- [ ] Header H1 presente: `grep -E "^# tdd-cycle-checklist" docs/references/tdd-cycle-checklist.md` retorna match
- [ ] Header `Origem` presente: `grep -E "^> Origem:" docs/references/tdd-cycle-checklist.md` retorna match
- [ ] Cita compound-origem: `grep -E "tdd-gate-needs-stub-first" docs/references/tdd-cycle-checklist.md` retorna >=1 match
- [ ] Formato checklist (>=5 items): `grep -cE "^- \[ \]" docs/references/tdd-cycle-checklist.md` retorna `>= 5`
- [ ] Tamanho minimo (>=40 linhas): `wc -l docs/references/tdd-cycle-checklist.md` retorna `>= 40`
- [ ] Cita `Cannot find module` (sinal de RED falso): `grep -E "Cannot find module" docs/references/tdd-cycle-checklist.md` retorna match
- [ ] Cita `not implemented` (stub minimo): `grep -E "not implemented" docs/references/tdd-cycle-checklist.md` retorna match
- [ ] Cita ordem dos commits (RED -> GREEN): `grep -iE "RED.*GREEN|commit RED" docs/references/tdd-cycle-checklist.md` retorna >=1 match
- [ ] Compound-origem NAO modificada: `git status docs/compound/2026-05-19-tdd-gate-needs-stub-first.md` nao mostra modificacao
- [ ] Harness verde: `bun run harness:validate` exit 0

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/references/tdd-cycle-checklist.md` exit 0
- `grep -c "^- \[ \]" docs/references/tdd-cycle-checklist.md` retorna `>= 5`
- `grep -c "^> Origem:" docs/references/tdd-cycle-checklist.md` retorna `1`
- `grep -c "Cannot find module" docs/references/tdd-cycle-checklist.md` retorna `>= 1`
- `grep -c "not implemented" docs/references/tdd-cycle-checklist.md` retorna `>= 1`
- `bun run harness:validate` exit 0

**Por humano:**
- Engenheiro lendo o arquivo entende em <2min: (a) por que stub e necessario, (b) qual sinal indica RED falso, (c) ordem dos commits. Se algum item parecer ambiguo, reescrever.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
