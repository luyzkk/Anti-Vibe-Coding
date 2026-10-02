---
mode: quick
created: 2026-10-02
owner: Luiz/dev
---

# Quick Plan: gates e pre-commit proporcionais ao risco

## Goal

Cortar o relógio parado que a medição do motor de automações da Comu achou, sem tirar nenhuma defesa
que funcione hoje. Três frentes:

- o pre-commit para de cobrar ~60 s por commit sem validar nada: ganha chave por projeto e passa a
  avisar, para o usuário, quando a suíte não termina;
- `risco` passa a marcar só o slice que **escreve ou muda** a defesa, e o orquestrador para de
  perguntar ao dono o que é procedimento;
- o Dashboard Comu desliga o pre-commit (a CI já roda Backend Tests e Frontend Tests) e ganha
  autorização permanente de PR + merge com CI verde nos casos de rotina.

Linha de base medida em 2026-10-02 sobre 32 sessões do motor (memória
`project_comu-motor-baseline-tempo`; extrator em `F:\tmp\medicao-tempo-comu\`):

| Medida | Hoje | Alvo |
|---|---|---|
| Commit no Comu (mediana) | ~65 s — a suíte leva ~155 s, o hook mata em 60 s e libera | < 10 s |
| Perguntas ao dono por ciclo RED/GREEN (Plano 03) | 1,31 — 98% respondidas com a opção recomendada | ≤ 0,5 (o Plano 02 teve 0,38) |
| Sub-fases `risco` no Plano 03 | 43 de 63, inclusive telas de UI | só as que escrevem a defesa |

## Scope

**Dentro (plugin):** `hooks/lib/precommit-decision.cjs`, `hooks/pre-commit-suite.cjs`,
`tests/hooks/precommit-decision.test.ts`, `skills/tdd-workflow/SKILL.md`,
`skills/plan-feature/SKILL.md`, `skills/execute-plan/SKILL.md` e
`tests/fase-template-tdd-contract.test.ts`.

**Dentro (Dashboard Comu, PR de docs próprio):** `.claude/settings.json` (env do pre-commit) e
`docs/MERGE_GATES.md` (autorização de merge — é ali, na linha 56, que a pergunta nasce, não no
plugin).

**Decidido pelo dono em 2026-10-02:**

- Pre-commit: chave por projeto (`ANTI_VIBE_PRECOMMIT=off`) com aviso de timeout; o default segue
  ligado. Alternativas descartadas: desligado por padrão, e só subir o timeout (no Comu, ~155 s por
  commit).
- Gates: risco pelo slice que escreve ou muda a defesa, e procedimento vira DI. Descartado: tirar o
  gate humano das fases de risco no Assistido.
- Merge no Comu: rotina sem perguntar, com CI verde; migration, env/compose/infra, flag do motor e
  auth continuam perguntando.

**Fora:**

- Pular a suíte em commit só de docs. Parecia o ganho óbvio (52% dos commits do Comu desde 10/09 são
  docs), mas o hook roda *antes* do comando inteiro: em `git add X && git commit`, o padrão dos
  agentes, `X` ainda não está no stage quando a decisão é tomada. A lista de staged mentiria.
- Rodar só os testes relacionados ao diff: depende do runner (vitest, pytest, bun). Outro plano, se a
  chave por projeto não bastar.
- Reclassificar as páginas já escritas do Plano 03 da Comu: há frentes ativas em worktree (fase-07,
  fase-09). Cada página é reclassificada pelo critério novo quando a fase abrir, na sessão da Comu.
- Comando de medição de tempo no plugin — próximo plano.
- A regra global de push do `~/.claude/CLAUDE.md`: a autorização vai no `MERGE_GATES.md` do projeto.

**Restrições do repo:**

- Hooks rodam do **CACHE** do plugin. A mudança só vale no Comu depois do merge, de
  `scripts/sync-to-global.sh` e de uma sessão nova.
- `tests/fase-template-tdd-contract.test.ts` é gate "nunca diminuir" (64 `expect` hoje): cresce,
  nunca encolhe.
- Branch e PR; nunca direto na `main`. Branch: `feat/gates-e-precommit-proporcionais`.
- Suíte com `bun run test`, nunca `bun test <diretório>`. Arquivo único pode.
- O desligamento por projeto aceita só o valor literal `off`: config truncado ou valor estranho não
  pode virar gate desligado em silêncio (mesma família do ADR-0023).

**Execução em três fases, com aprovação entre elas** (nenhuma toca mais de 5 arquivos).

## Execution Steps

### Fase A — pre-commit (3 arquivos)

1. **RED.** Em `tests/hooks/precommit-decision.test.ts`: (a) `precommitEnabled(config, env)` desliga
   com `ANTI_VIBE_PRECOMMIT=off` mesmo com o config global ligado; (b) só o literal `off` desliga —
   `0`, `false` e vazio mantêm ligado; (c) suíte morta por timeout devolve `allow` com um `notice`
   que diz que **nada foi validado** e nomeia a chave por projeto; (d) suíte ausente (script
   inexistente) não gera esse aviso — só o timeout gera.
   → **verify:** os quatro falham por assertion (stub-first), com a saída literal no Validation Log.

2. **GREEN + REFACTOR.** `precommitEnabled` e o `notice` de timeout em `precommit-decision.cjs` (a
   regra num lugar só); `pre-commit-suite.cjs` lê o env e, quando há `notice`, imprime em stdout o
   JSON com `systemMessage`. O stderr com exit 0 não chega a ninguém — foi assim que ~10 h sumiram em
   três semanas sem ninguém ver.
   → **verify:** os testes do passo 1 passam; RED-check por mutação (inverter a condição do env
   derruba (a); remover o `notice` derruba (c)); sonda: o hook alimentado por stdin num diretório com
   `"test": "sleep 70"` imprime o JSON do aviso. Se a sessão real não exibir o `systemMessage`,
   parar e registrar antes de seguir.

### Fase B — gates (4 arquivos)

3. **RED textual.** Novas assertions no gate de paridade: (a) o `tdd-workflow` define risco pelo
   slice que **escreve ou muda** a defesa de um dos seis gatilhos, e diz que consumir uma defesa que
   já existe (tela que chama API protegida, rota que reusa a auth do módulo) é `comportamento`;
   (b) a §Classificação de Risco do `plan-feature` aponta para essa definição em vez de repetir a
   lista; (c) o Step 4c do `execute-plan` separa o que vai ao dono (negócio e produto, irreversível,
   gate do contrato) do que o orquestrador decide sozinho e registra como DI com a recomendação
   (banco de teste, divisão de PR, ordem de sub-fases, mutação sobrevivente sem efeito de negócio).
   → **verify:** as assertions novas falham contra o texto atual; contagem 64 → 64 + N.

4. **Texto.** Escrever as três mudanças, com um exemplo de cada lado tirado do motor da Comu (risco:
   webhook Svix com verificação de assinatura, rota admin que decide quem vê PII; comportamento: tela
   de templates, primitivos de UI). A lista dos seis gatilhos passa a morar só no `tdd-workflow` e no
   template do PRD, que é modelo de ameaça e tem outro papel.
   → **verify:** as assertions do passo 3 passam; apagar cada frase nova derruba a assertion dela;
   `grep` acha a lista dos seis gatilhos fora do `tdd-workflow` só no template do PRD.
   → **desvios registrados durante a execução (2026-10-02):**
   - **DEV-1 — a regra de procedimento foi para §Regras Críticas, não para o Step 4c.** As perguntas
     nascem em três lugares: no 4c, no `needs_human` dos subagentes (4d) e na iniciativa do próprio
     orquestrador. Uma regra só no 4c deixaria as outras duas portas abertas.
   - **DEV-2 — `skills/plan-feature/templates/fase-template.md` entrou como quinto arquivo da Fase B.**
     O comentário do bloco `### Seguranca` repetia a lista como critério de slice; virou ponteiro. A
     lista segue no `write-prd` e no `grill-me`, que a usam no nível da feature, onde um SIM basta para
     pensar em ameaça. Os seis gatilhos dizem onde olhar; o slice é de risco quando escreve a defesa.
   - **DEV-3 — os exemplos do texto e as mensagens de teste não citam o projeto consumidor.** O plugin
     vai para o GitHub; os exemplos ficaram genéricos (IDOR, assinatura de webhook, tela que consome API
     protegida), e as mensagens dizem "medido num projeto real". O nome do projeto fica neste plano.

### Fase C — validação e efeito no Comu

5. **Validação do plugin e PR.** `bun run test`, `bun run harness:validate` e
   `bun run compound:check` (não existe script de lint neste repo); PR da branch.
   → **verify:** os três verdes; PR aberto com a linha de base no corpo.

6. **Comu, PR de docs.** `.claude/settings.json` com `env.ANTI_VIBE_PRECOMMIT=off` e
   `docs/MERGE_GATES.md` com a autorização permanente: push, PR e merge com CI verde sem perguntar,
   **exceto** quando o PR traz migration, mexe em env, compose ou infra, liga flag do motor
   (`AUTOMATIONS_ENABLED`, canais) ou toca auth — esses continuam perguntando.
   → **verify:** a regra antiga da linha 56 sai no mesmo diff (sem duas versões); PR do Comu aberto.
   → **registrado durante a execução (2026-10-02):**
   - **DI-1 — `.claude/settings.json` entrou com `git add -f`.** No Comu, `.claude/` inteiro é ignorado
     (`.gitignore:71`), e os arquivos que valem para o time (`.claude/CLAUDE.md`, `rules/`,
     `decisions.md`) já entram forçados. Descartado: trocar `.claude/` por `.claude/*` com negação,
     que mexe na regra da pasta inteira por um arquivo. Versionado, o arquivo chega às frentes em
     worktree quando a branch delas trouxer o `master`.
   - **DI-2 — o PR do Comu nasceu numa worktree temporária fora do repositório.** A árvore principal
     estava na branch da fase-07, possivelmente com uma sessão ativa; trocar de branch nela
     atropelaria essa sessão.
   - **GT-1 — o pre-commit roda a suíte no cwd da SESSÃO (`process.cwd()`), não no do comando.**
     Commit feito em outro repositório ou worktree a partir de uma sessão roda a suíte errada. Mesma
     família da issue #82, que `hooks/lib/bash-cwd.cjs` já resolve para o TDD Gate. Fora deste plano.

7. **Validação final no uso real** (depois do merge do plugin). `scripts/sync-to-global.sh`, comparar
   cache × checkout nos oito arquivos, sessão nova no Comu.
   → **método:** o tempo do commit se mede do `tool_use` ao `tool_result` no registro da sessão, como
   na linha de base. Medido com `date` de dentro do comando, ele não inclui o hook: o PreToolUse roda
   antes de o comando começar (tropeço de 2026-10-02 — um commit "de 4 s" com o hook ligado).
   → **verify:** diff cache × checkout vazio; o primeiro commit no Comu leva < 10 s, com o motivo no
   debug log (stderr de hook que sai com 0 não vai para o transcript — doc oficial dos hooks, conferida
   em 2026-10-02; só o `systemMessage` chega ao usuário); depois de 5 ciclos do Plano 03 com o critério novo, re-medir com o extrator e comparar
   perguntas por ciclo e horas ativas por ciclo com a linha de base.

## Validation Log

| Passo | Data | Comando | Saída literal |
|---|---|---|---|
| 1 RED | 2026-10-02 | `bun test tests/hooks/precommit-decision.test.ts` (stubs: `precommitEnabled` devolve `true`, `suiteTimedOut` devolve `false`) | `15 pass / 4 fail` — env off: `Expected: false, Received: true`; config off: idem; `suiteTimedOut`: `Expected: true, Received: false`; timeout: `Received value must be a string: undefined`. Nasceram verdes por construção: "só o literal off desliga" e "suíte ausente não gera aviso" — provados por mutação no passo 2 (M3, M4). |
| 2 GREEN | 2026-10-02 | idem | `19 pass / 0 fail` |
| 2 RED-check | 2026-10-02 | mutação a partir de backup (o GREEN não estava commitado) | M1 inverte a leitura do env → 2 fail (env off; só o literal); M2 remove o `notice` → 1 fail (timeout); M3 qualquer valor no env desliga → 1 fail (só o literal); M4 aviso em toda falha aberta → 1 fail (suíte ausente). Restaurado e conferido com `cmp`. |
| 2 sonda | 2026-10-02 | hook real por stdin num diretório com `"test"` que dorme 70 s | chave ligada: `exit=0 duracao=61s`, stdout `{"systemMessage":"[PRE-COMMIT] a suite nao terminou em 60s e foi interrompida: este commit nao foi validado. ..."}`. Com `ANTI_VIBE_PRECOMMIT=off`: `exit=0 duracao=0s`, stdout vazio. |
| 2 achado | 2026-10-02 | sonda com `ANTI_VIBE_PRECOMMIT=off` | o motivo dizia `pre-commit desligado em config/tdd-gate.json (precommit: off)` — falso quando quem desliga é o env. Mini-ciclo: assertion `toContain('ANTI_VIBE_PRECOMMIT=off')` → `18 pass / 1 fail` → mensagem nomeia as duas chaves → `19 pass / 0 fail`. |
| 2 suíte | 2026-10-02 | `bun run test` | `exit=1 199s` — lote 1: `1533 pass / 2 fail`; lote 2: `743 pass / 2 fail`. As quatro em ~5000 ms (limite do bun por teste): `collectSkillsIndex > usa o introduced...`, `CA-09: zero refs to deleted v6.7 step names`, `grep-deleted-steps > exits 0...`, `state-md-hook > regenerates STATE.md...`. Nenhuma toca os arquivos da Fase A. Isoladas: `14 pass`, `10 pass`, `1 pass`, `7 pass`. Estouro de tempo com a máquina carregada (sessões paralelas do Comu), não regressão. |
| 3 RED | 2026-10-02 | `bun test tests/fase-template-tdd-contract.test.ts` | `51 pass / 6 fail` — as seis novas. Conferido que as três seções lidas não vêm vazias (`### Abuse-It` 5617 chars, `### Classificacao de Risco do Slice` 2645, `## Regras Criticas` 592): a falha é por assertion, não por `section()` devolvendo `''`. |
| 4 GREEN | 2026-10-02 | idem | `57 pass / 0 fail` |
| 4 RED-check | 2026-10-02 | mutação a partir de backup | B1 volta o "toca" → 1 fail (define risco); B2 tira o lado negativo → 1 fail (consumir é comportamento); B3 tira o ponteiro → 1 fail (aponta); B4 devolve a cópia da lista → 1 fail (não carrega cópia); B5 tira só o `needs_human` → 1 fail (needs_human); B6 tira a regra 5 inteira → 2 fail (as duas da regra). Restaurado e conferido com `cmp`. |
| 4 suíte | 2026-10-02 | `bun run test`; `bun run harness:validate`; `bun run compound:check` | `exit=0 39s` — lote 1: `1541 pass / 0 fail`; lote 2: `745 pass / 0 fail`. `Harness validation passed (28 required files, 398 markdown files checked)`. `Compound check passed (76 compound notes validated)`. As quatro de antes passaram juntas: a rodada levou 39 s contra 199 s da anterior, o que confirma a carga. |
| 4 grep | 2026-10-02 | `input externo.{0,40}upload\|toca ao menos um\|seis gatilhos` em `skills/`, `agents/`, `docs/references`, `docs/design-docs` | lista de slice só em `tdd-workflow:410`; `plan-feature:445` aponta; `write-prd:198` e `grill-me:172,210` no nível da feature. |
| 5 PR | 2026-10-02 | `gh pr create` | [luyzkk/Anti-Vibe-Coding#90](https://github.com/luyzkk/Anti-Vibe-Coding/pull/90) — três commits: `1105c92` (pre-commit), `055005b` (skills), `50cc7fd` (plano). O repo não tem checks de CI. |
| 6 PR Comu | 2026-10-02 | `git grep` da regra antiga; `bun run harness:validate`; `gh pr create` | regra antiga: `nenhuma ocorrencia`. `Harness validation passed (25 required files, 428 markdown files checked)`. [comudaarte/plataforma-comu#302](https://github.com/comudaarte/plataforma-comu/pull/302), commit `fd2defff`. |

## Compound Opportunity

Duas lições candidatas, se a execução confirmar:

1. **Falha aberta por timeout é falha aberta muda.** O hook "funcionou" por três semanas cobrando um
   minuto por commit e validando nada; o diagnóstico ia para um stderr que ninguém lê.
2. **Gatilho amplo transforma gate em carimbo.** "Input externo" pegava todo body de requisição, então
   43 de 63 sub-fases viraram `risco`. Aceite de 98% da opção recomendada é o sinal de que a pergunta
   não precisava ser feita.

Ao fechar, pedir ao humano `/anti-vibe-coding:lessons-learned`.

## Lessons Captured

_Preencher ao fechar._

## Exit Criteria

- [ ] Suíte do plugin verde; gate de paridade cresceu, nenhuma assertion removida.
- [x] Projeto com a chave ligada e suíte lenta vê o aviso de timeout; projeto com `off` não roda a
      suíte e registra o motivo certo no debug log. (sonda do passo 2; falta a confirmação numa
      sessão real, no passo 7)
- [ ] Commit no Comu < 10 s em sessão nova.
- [x] `risco` definido em um lugar só, pelo slice que escreve ou muda a defesa. (passo 4)
- [ ] Re-medição depois de 5 ciclos do Plano 03 comparada à linha de base, com o resultado escrito
      aqui.
