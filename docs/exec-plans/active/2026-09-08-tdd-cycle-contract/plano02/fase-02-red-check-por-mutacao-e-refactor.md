<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): default Assistido — PRD tdd-cycle-contract D2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: RED-check por mutacao nomeada e REFACTOR em commit proprio

**Plano:** 02 — O ciclo roda no execute-plan
**Sizing:** 1.5h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

Depois do GREEN, o orquestrador prova a defesa por mutacao: le `Defesa a mutar` e `Teste que deve cair` da
fase, muta, exige o teste cair, restaura com `git restore <arquivo>` e prova `git diff --stat` vazio;
teste que nao cai bloqueia a fase com DI. O REFACTOR vira o passo 2 do mesmo subagente GREEN, em commit
`refactor(...)` separado ou `refactor: none (motivo)`. As Regras Criticas dizem que mutar e restaurar e
verificacao do orquestrador, nao implementacao (RF-03 parte 2, D3, D4, CA-06, CA-07, CA-08, CA-09).

**DP aplicadas:** DP-1 (passos 4 completado e 5 novo), DP-7, DP-8, DP-9, DP-16.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Modify | Novo `describe` com 5 assercoes sobre o RED-check, o REFACTOR e as Regras Criticas |
| `skills/execute-plan/SKILL.md` | Modify | `### 4c`: passo 4 vira GREEN + REFACTOR, passo 5 RED-CHECK novo; `## Regras Criticas` item 1 (linha 806) ganha a frase de verificacao; `## Common Rationalizations` +1 linha; `## Red Flags` +1 linha. Nada acima da linha 344 (G17) |
| `plugin-manifest.json` | Modify | `bun run generate:manifest` — linha 1118 (G18) |

---

## Implementacao

### Passo 1: RED — assercoes novas no teste de paridade

Acrescentar ao final do mesmo arquivo. `step4c` e `section()` cru (G16); `## Regras Criticas` e lista
numerada em prosa — `section()` cru tambem serve (nao ha fence nem comentario HTML la, `SKILL.md:804-811`).

```typescript
// 2026-09-08 (Luiz/dev): RED-check por mutacao e REFACTOR no 4c — PRD tdd-cycle-contract §RF-03, D3, D4.
describe('execute-plan — Step 4c prova a defesa por mutacao e exige REFACTOR (RF-03 parte 2)', () => {
  const step4c = section(executePlan, '### 4c.')

  test('4c le Defesa a mutar e Teste que deve cair da fase (D6)', () => {
    expect(step4c, '[parity gate — CA-06] 4c nao le "Defesa a mutar"').toContain('Defesa a mutar')
    expect(step4c, '[parity gate — CA-06] 4c nao le "Teste que deve cair"').toContain('Teste que deve cair')
  })

  test('4c restaura com git restore e prova diff vazio (CA-06)', () => {
    expect(step4c, '[parity gate — CA-06] 4c nao restaura pelo git').toContain('git restore')
    expect(
      step4c,
      `[parity gate — CA-06] 4c nao exige "git diff --stat" vazio apos restaurar. Sem isso a mutacao ` +
        `pode deixar residuo no arquivo de producao e ninguem ve (PRD §Riscos).`,
    ).toContain('git diff --stat')
    expect(step4c, '[parity gate — CA-06] 4c nao registra red_check no STATE').toMatch(/red_check: pass/)
  })

  test('4c trata teste que nao cai como blocker com DI (CA-07)', () => {
    expect(step4c, '[parity gate — CA-07] 4c nao bloqueia a fase').toMatch(/red_check: fail/)
    expect(step4c, '[parity gate — CA-07] 4c nao marca a fase como blocked').toContain('blocked')
    expect(
      step4c,
      `[parity gate — CA-07] 4c nao registra a DI "teste nao prova a defesa". Um teste que continua ` +
        `verde com a defesa removida nao testa a defesa — e o plano nao pode avancar em cima dele.`,
    ).toContain('teste nao prova a defesa')
  })

  test('4c exige REFACTOR em commit proprio ou motivo (CA-08, D4)', () => {
    expect(step4c, '[parity gate — CA-08] 4c nao pede commit refactor(...) separado').toContain('refactor(')
    expect(step4c, '[parity gate — CA-08] 4c nao aceita "refactor: none (motivo)"').toMatch(/refactor: none/)
  })

  test('Regras Criticas: rodar teste, mutar e restaurar e verificacao do orquestrador, nao implementacao (D3)', () => {
    expect(
      section(executePlan, '## Regras Criticas'),
      `[parity gate — D3] "O orchestrador nao implementa" precisa dizer que o RED-check e verificacao. ` +
        `Sem a frase, a regra 1 e o passo 5 do 4c se contradizem e o orquestrador pula a mutacao.`,
    ).toContain('RED-check')
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts -t 'prova a defesa por mutacao|Regras Criticas'`;
5 falhas por `expect`; saida literal no MEMORY.

### Passo 2: GREEN (a) — 4c passos 4 e 5

Substituir o passo 4 deixado pela fase-01 e acrescentar o 5, dentro do mesmo bloco cercado, antes de
"Se a fase NAO tem bloco ### TDD":

```
4. GREEN + REFACTOR (um subagente, contexto isolado — PRD D4):
   - Recebe: APENAS os arquivos de teste do RED
   - NAO recebe: PRD, descricao da feature
   - Passo 1 — GREEN: codigo minimo que faz o teste passar; commit feat(...)
   - Anchor imutavel: NUNCA modifica testes
   - Passo 2 — REFACTOR: com os testes verdes, refatorar em commit `refactor(...)` SEPARADO do feat;
     se nao ha o que refatorar, reportar `refactor: none ({motivo})` no human_readable
   - Orquestrador registra no STATE log: `refactor: commit {hash}` se
     `git log --oneline {HEAD-antes}..HEAD` tem commit com prefixo `refactor(`;
     senao `refactor: none ({motivo do human_readable})`

5. RED-CHECK (orquestrador — verificacao, nao implementacao; PRD D3):
   Pre-condicao: GREEN e REFACTOR commitados; `git diff --stat` vazio ANTES de mutar
   - Ler `Defesa a mutar` e `Teste que deve cair` do bloco ### TDD da fase
     (se a fase nao nomeia, usar `fase-{NN}-defesa-implementada` do envelope do executor)
   - Aplicar a mutacao com Edit no arquivo de producao nomeado
   - Rodar SO o teste nomeado (ex.: `bun test {arquivo} -t '{Teste que deve cair}'`)
   - Exigir falha: exit != 0 E o teste nomeado aparece como fail
   - Restaurar: `git restore {arquivo}` (caminho explicito — nunca `git restore .`)
   - Exigir `git diff --stat` vazio
       vazio     → red_check: pass (defesa: {X}, teste: {Y})
       nao vazio → needs_human: residuo de mutacao — NUNCA commitar entre mutar e restaurar
   - Teste NAO caiu → restaurar mesmo assim; red_check: fail (defesa: {X}, teste: {Y});
       fase blocked; MEMORY do plano recebe DI "teste nao prova a defesa: {X} / {Y}";
       fases dependentes NAO iniciam; dev avisado no Step 5
   - Fase sem-comportamento: `Defesa a mutar` e o alvo textual, `Teste que deve cair` e o comando
       do gate — remover o alvo → gate cai → restaurar → mesmos campos no STATE log
```

### Passo 3: GREEN (b) — Regras Criticas, item 1

Linha 806 hoje: "**O orchestrador nao implementa** — escrever codigo e trabalho de subagente. O orchestrador
faz spawn, atualiza estado e roda a validacao pos-fase (Step 5)". Acrescentar ao final do item (so adicao):

```markdown
1. **O orchestrador nao implementa** — escrever codigo e trabalho de subagente. O orchestrador faz spawn, atualiza estado e roda a validacao pos-fase (Step 5). Rodar o teste do RED, aplicar a mutacao do RED-check e restaurar o arquivo (Step 4c, passos 2 e 5) e VERIFICACAO do orquestrador, nao implementacao — quem verifica nao e quem implementou (PRD tdd-cycle-contract D3)
```

### Passo 4: GREEN (c) — Common Rationalizations e Red Flags

Uma linha em cada (DP-16), so adicao:

```markdown
| "O teste ficou verde, a defesa existe" | So a mutacao prova. Teste que nasce verde pode estar afirmando true===true; remover a defesa nomeada e ver o teste cair e a unica evidencia de que ele testa o que diz testar (compound 2026-09-06). |
```

```markdown
- Fase avancou (ou fase dependente iniciou) com `red_check: fail` ou sem `red_check` no STATE log
```

### Passo 5: Manifest e commit

`bun run generate:manifest`; `git diff --stat plugin-manifest.json` → so a entrada 1118.
Commit: `feat(execute-plan): 4c prova a defesa por mutacao nomeada e exige REFACTOR (Plano 02 fase-02)`.
Commitar ANTES do RED-check (plano01 G8).

### Passo 6: REFACTOR

Se a fase-01 extraiu `mustContain`, reusar aqui; senao, avaliar se as duas fases juntas ja justificam o
helper. Commit `refactor(tests): ...` separado, ou `refactor: none (motivo)` no MEMORY.

---

## Gotchas

- **G14 — este e o passo que mais tropeça no guard:** o texto do 4c que voce esta ESCREVENDO contem
  `git restore .` (na frase "nunca `git restore .`"). Isso e conteudo de arquivo via Edit, nao comando Bash —
  passa. Mas NUNCA colar essa linha num `echo`/`grep` de verificacao: o guard casa o texto do comando.
- **G16:** `section(executePlan, '### 4c.')` cru, como na fase-01.
- **G17:** nada acima da linha 344.
- **plano01 G8 — ordem sagrada do RED-check desta propria fase:** commit do GREEN → mutar → rodar → restaurar
  → diff vazio → proxima mutacao. Nunca duas mutacoes ao mesmo tempo.
- **plano01 G9:** o RED-check abaixo nomeia defesa + teste; a mensagem que o bun imprime se registra, nao se preve.
- **DP-7:** `refactor:` sai do `git log`, nao do envelope. Se o executor reportar "refatorei" sem commit
  `refactor(`, o STATE grava `none` — e o dev ve a contradicao no Step 5. Nao "consertar" lendo o envelope.
- **Local — CA-09 (sem-comportamento):** a variante esta na ultima linha do passo 5. O teste de paridade cobre
  so a existencia do texto; a fase-04 nao exercita sem-comportamento (o fixture so tem comportamento e risco)
  — o primeiro dogfood real de CA-09 e a propria fase-04 deste plano, cujo gate e textual.
- **Local — `fase-{NN}-defesa-implementada`:** e o item que o Plano 01 fase-03 acrescentou ao envelope do
  executor (plano01 DP-3). Conferir o nome exato com `grep -n "defesa-implementada" agents/plan-executor.md`
  antes de escrever a linha do passo 5; se o nome divergir, usar o real e registrar DI.

---

## Verificacao

### TDD

**Tipo de fase:** comportamento

- [ ] **RED:** os 5 testes do Passo 1 FALHAM por assertion
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts -t 'prova a defesa por mutacao|Regras Criticas'`
  - Registrar a saida literal no MEMORY

- [ ] **GREEN:** Passos 2–4 aplicados; os 5 PASSAM; os da fase-01 e do Plano 01 continuam verdes
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`

- [ ] **RED-check do orquestrador:** com o GREEN commitado, uma mutacao por vez, `git restore skills/execute-plan/SKILL.md`
      e `git diff --stat` vazio entre elas:
  - Defesa a mutar: apagar a linha `- Exigir \`git diff --stat\` vazio` do passo 5 do 4c
    → Teste que deve cair: `4c restaura com git restore e prova diff vazio (CA-06)`
  - Defesa a mutar: trocar `refactor(...)` por `refactor` (sem parentese) nas duas ocorrencias do passo 4
    → Teste que deve cair: `4c exige REFACTOR em commit proprio ou motivo (CA-08, D4)`
  - Defesa a mutar: apagar a frase `MEMORY do plano recebe DI "teste nao prova a defesa: {X} / {Y}"` do passo 5
    → Teste que deve cair: `4c trata teste que nao cai como blocker com DI (CA-07)`
  - Defesa a mutar: apagar a frase acrescentada ao item 1 de `## Regras Criticas`
    → Teste que deve cair: `Regras Criticas: rodar teste, mutar e restaurar e verificacao do orquestrador, nao implementacao (D3)`

- [ ] **REFACTOR:** commit `refactor(...)` proprio, ou `refactor: none (motivo)` no MEMORY

### Checklist

- [ ] `git diff skills/execute-plan/SKILL.md` toca SO o bloco `### 4c` (passos 4 e 5), o item 1 de Regras Criticas, a tabela de Common Rationalizations e a lista de Red Flags
- [ ] Passos 0–3 do 4c identicos aos da fase-01 (`git diff HEAD~2 -- skills/execute-plan/SKILL.md` mostra so adicao nesses passos)
- [ ] `grep -c "git restore" skills/execute-plan/SKILL.md` → >= 1 e a ocorrencia no 4c e com `{arquivo}`, nao com `.`
- [ ] `grep -n "defesa-implementada" agents/plan-executor.md` nao-vazio e o nome bate com o do passo 5
- [ ] `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` verde (G17)
- [ ] `bun run generate:manifest` sem warning; `git diff --stat plugin-manifest.json` → 1 entrada (G18)
- [ ] `bun run harness:validate` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (plano01 G3)
- [ ] MEMORY.md: saida literal do RED, DIs (nome real de `defesa-implementada`), `refactor:` registrado; Metricas

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` → todos passam, incluindo os 5 novos
- Cada uma das 4 mutacoes do RED-check derruba exatamente o teste nomeado; `git diff --stat` vazio apos cada `git restore`
- `bun run harness:validate`, `bun run test`, `bun run typecheck`, preface e2e → verdes

**Por humano (se aplicavel):**
- Ler os passos 4 e 5 do 4c como se fosse o orquestrador: a sequencia "commit → mutar → rodar → restaurar → diff vazio" nao tem passo ambiguo nem ordem invertida

---

<!-- Gerado por /plan-feature em 2026-09-08 -->
