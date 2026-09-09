---
mode: quick
created: 2026-09-09
owner: Luiz/dev
---

# Quick Plan: honestidade de config no TDD Gate

## Goal

Executar as seis decisões do [ADR-0023](../../design-docs/ADR-0023-honestidade-config-tdd-gate.md)
mais as duas transversais, de modo que nenhum arquivo do plugin continue documentando enforcement
que não roda. O AI Judge sai; a âncora imutável passa a ser armada de verdade; as chaves sem
mecanismo somem; e os dois defeitos reais (mensagem que ensina o desvio, falha aberta muda) são
corrigidos com teste antes.

## Scope

**Dentro:** `config/tdd-gate.json`, `config/verify-work.json`, `hooks/tdd-gate.cjs`,
`hooks/tdd-gate-bash.cjs`, `hooks/lib/` (helper novo), `hooks/hooks.json`,
`skills/tdd-workflow/SKILL.md`, `skills/execute-plan/SKILL.md`, `docs/PIPELINE.md`,
`tests/hooks/` e `tests/fase-template-tdd-contract.test.ts`.

**Fora:** segundo hook blindando o arquivo da âncora (rejeitado no ADR como especulativo), contador
de testes por ciclo (rejeitado: o hook vê arquivos, não testes), e o bug do
`generate-manifest.js` que sobrescreve `introduced` (outro problema, outra nota).

**Restrições do repo:**

- Hooks e libs rodam do **CACHE** do plugin, não do checkout. Mudança em hook só vale em sessão nova
  depois de `scripts/sync-to-global.sh`. Comparar cache contra checkout antes de confiar.
- `tests/fase-template-tdd-contract.test.ts` é gate "nunca diminuir", hoje com 43 assertions. Pode
  crescer, nunca encolher.
- Branch e PR sempre; nunca direto na `main`. Branch desta rodada: `feat/honestidade-de-config`.
- O texto novo descreve a âncora como algo que **torna o desvio visível**, nunca como enforcement
  que impede.
- Lição da issue #82: quando a plataforma é parâmetro da função, a expectativa do teste tem de ser
  **literal**. Usar o helper do host nos dois lados faz o teste concordar consigo mesmo.

**Execução em três fases, com aprovação entre elas** (nenhuma toca mais de 5 arquivos).

## Execution Steps

### Fase A — remoção (não muda comportamento de quem usa)

1. Remover de `config/tdd-gate.json` e dos defaults de `hooks/tdd-gate.cjs` as chaves
   `judge_model`, `suggest_ai_judge_threshold`, `max_tests_per_cycle`,
   `require_assertion_failure` e `approach`, mais o ramo `if (config.mode === 'ai-judge')`.
   → **verify:** `grep -rn` pelas cinco chaves em `hooks/` e `config/` retorna zero;
   `bun test tests/hooks/` continua verde.

2. Remover a seção `## AI Judge — Quando Sugerir` de `skills/tdd-workflow/SKILL.md`, a linha de
   constraint que manda sugerir o AI Judge, e a linha correspondente de `docs/PIPELINE.md`.
   → **verify:** `grep -rin "ai judge"` em `skills/` e `docs/PIPELINE.md` retorna zero; o gate de
   paridade segue com as 43 assertions passando.
   → **achado durante a execução (2026-09-09):** a mesma skill afirmava, fora da seção do AI Judge,
   que `max_tests_per_cycle: 1` dava "bloqueio real via hook". Era a sétima promessa falsa, não
   estava no levantamento, e foi corrigida no mesmo passo: o texto agora diz que a regra vive no
   prompt e explica por que o hook não consegue cumpri-la.

### Fase B — comportamento do hook, com teste antes

3. **RED.** Escrever em `tests/hooks/` os testes que falham hoje: (a) a mensagem de bloqueio da
   âncora não pode instruir a editar `.claude/.tdd-phase.json`; (b) erro inesperado no hook emite
   diagnóstico em stderr antes de permitir; (c) a raiz do projeto é resolvida pelo caminho do
   arquivo, não pelo cwd da sessão — expectativa **literal**, sem `path.resolve` do host.
   → **verify:** os três falham por assertion, não por erro de import. Registrar a mensagem real,
   não a prevista.

4. **GREEN + REFACTOR.** Implementar T-1 (mensagem manda pedir ao orquestrador), T-2 (`catch` final
   emite antes de permitir) e o helper de raiz de projeto em `hooks/lib/`, consumido pelo caminho
   `Write|Edit` e pelo `hooks/tdd-gate-bash.cjs`, seguindo o princípio já escrito em
   `hooks/lib/tdd-decision.cjs` de que a regra vive num lugar só.
   → **verify:** os três testes passam; RED-check por mutação em cada um, apagando a defesa e vendo
   o teste cair; `bun test tests/hooks/` verde.

### Fase C — orquestrador e config restante

5. Fazer o Step 4c de `skills/execute-plan/SKILL.md` armar `.claude/.tdd-phase.json` antes do GREEN
   e apagá-lo depois, **no mesmo passo**, com lista explícita em `immutable_tests`; varrer âncora
   velha no início de qualquer fase; e conferir, depois do GREEN, que a âncora sobreviveu. Estender
   o gate de paridade com assertions que falham se qualquer uma dessas instruções sair.
   → **verify:** o gate cresce de 43 para N assertions e cada nova falha ao remover a instrução que
   guarda; contar as ocorrências do token na seção antes de confiar em `toContain`.

6. Fazer o pre-commit de `hooks/hooks.json` ler **stdin** em vez de `process.env.CLAUDE_TOOL_INPUT`
   e consultar a âncora para liberar o commit RED sem rodar a suíte. Somar `"code_review": true` em
   `auditors` de `config/verify-work.json`.
   → **verify:** o pre-commit bloqueia com suíte quebrada fora da fase RED e libera dentro dela,
   provado nas duas direções; `config.auditors.code_review` presente.

7. **Validação final.** `bun run test`, `bun run typecheck`, `bun run harness:validate`, depois
   `scripts/sync-to-global.sh` e prova por mutação de que o hook **do cache** exerce o comportamento
   novo.
   → **verify:** suíte verde com o total igual ou maior que 2204, typecheck com saída zero, harness
   passa, e `git diff --no-index` vazio entre cache e checkout nos arquivos tocados.
   → **nota (2026-09-09):** este repo **não tem** script `lint`; os scripts de verificação são `test`,
   `typecheck`, `harness:validate` e `compound:check`. Não prometer lint que não existe.

## Validation Log

| Passo | Data | Resultado | Evidência |
|---|---|---|---|
| 1 | 2026-09-09 | passou | 4 chaves com 0 ocorrências em `hooks/` e `config/`; `approach` com 0 em `tdd-gate.cjs` e no config; ramo `ai-judge` removido; 65 testes de hook + 30 do guard verdes |
| 2 | 2026-09-09 | passou | `grep -rin "ai judge\|ai-judge"` retorna 0 em `skills/`, `config/`, `hooks/` e `docs/PIPELINE.md`; gate de paridade 43/43; harness 28 obrigatórios e 398 markdowns |
| 3 | 2026-09-09 | RED genuíno | `tests/hooks/tdd-gate-anchor-and-root.test.ts`: 4 pass, 7 fail, todas por assertion e com a mensagem real registrada, não a prevista. Stub em `project-root.cjs` garantiu falha por assertion e não por import |
| 4 | 2026-09-09 | GREEN + mutação | 11/11 no arquivo; 6 mutações derrubaram exatamente o teste nomeado (mensagem, palavra `orquestrador`, catch do Write\|Edit, catch do Bash, raiz no gate, walk-up da lib), restauração provada por `diff` em cada uma. Suíte 2215 pass / 0 fail na re-rodada; typecheck zero |
| 5 | 2026-09-09 | passou, com achado | Gate de paridade de 43 para 51 assertions. RED com as 8 novas falhando. A varredura linha a linha do 4c (GT-5) pegou uma assertion **vacua minha**: `/ARMAR ANCORA/` casa dentro de `DESARMAR ANCORA`, então apagar a linha do armar deixava o gate verde. Corrigida para `/- ARMAR ANCORA/` e provada por mutação: apagar a linha derruba o teste, restauração conferida |
| 6 | 2026-09-09 | passou, com achado | Pre-commit reescrito em `hooks/pre-commit-suite.cjs` com a decisão em `lib/precommit-decision.cjs` (4 testes RED → 6 verdes). Provado nas duas direções por payload real: fase RED libera em 0,13s sem rodar a suíte; sem âncora roda a suíte e sai 0 em 31s; com a suíte quebrada sai 2 nomeando o teste que caiu. **Achado:** o hook chamava `bun run lint`, script inexistente — se ele tivesse voltado a funcionar como estava, todo commit do repo passaria a ser bloqueado. Chave `code_review` somada ao verify-work |
| 7 | | | |

## Compound Opportunity

Candidata forte, a registrar via `/anti-vibe-coding:lessons-learned` ao fechar: **config morta é
mentira que falha abrindo, e por isso nunca é descoberta pelo uso.** Os seis itens conviveram com
gate de paridade, dogfood e três releases sem aparecer, porque nenhum deles quebra nada — apenas
deixam de fazer o que o texto promete. O sinal detectável é barato e generalizável: uma chave de
config que aparece **uma única vez** no código, dentro do objeto de defaults, nunca é lida.

Segunda candidata: o gate ensinava o próprio desvio na mensagem de bloqueio. Vale a regra de que
mensagem de erro de um mecanismo de disciplina não pode conter a instrução que o desarma.

## Lessons Captured

_A preencher ao fechar o plano._

## Exit Criteria

- [ ] Nenhuma chave de `config/tdd-gate.json` aparece uma única vez no código (teste de fumaça:
      toda chave tem leitor real).
- [ ] `grep -rin "ai judge"` retorna zero em `skills/`, `config/`, `hooks/` e `docs/PIPELINE.md`.
- [ ] A âncora é armada e desarmada pelo Step 4c, e o gate de paridade falha se a instrução sair.
- [ ] A mensagem de bloqueio não contém instrução de editar o arquivo da âncora.
- [ ] Erro inesperado no hook emite diagnóstico antes de permitir.
- [ ] O pre-commit foi provado nas duas direções: bloqueia fora do RED, libera dentro.
- [ ] Suíte verde, typecheck zero, harness válido, cache sincronizado e provado por mutação.
- [ ] Documentação descreve a âncora como algo que torna o desvio visível, nunca como enforcement.
