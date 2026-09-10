---
id: 23
title: "Honestidade de config no TDD Gate: âncora armada, AI Judge removido"
status: "active"
created: 2026-09-09
---

# ADR-0023: Honestidade de config no TDD Gate: âncora armada, AI Judge removido

## Context

Seis lugares do plugin documentavam enforcement que não roda. Todos falhavam **abrindo**, então
nada quebrava e ninguém percebia: a disciplina que o texto prometia simplesmente não acontecia.

O levantamento (main, 7.8.0) encontrou:

1. `config/tdd-gate.json` declara `mode: "ai-judge"`, `judge_model` e `suggest_ai_judge_threshold`.
   O ramo correspondente em `hooks/tdd-gate.cjs` é um bloco vazio com `TODO` que cai em regex sem
   avisar. A skill `tdd-workflow` manda o agente oferecer o recurso ao dev; `docs/PIPELINE.md` repete.
2. `hooks/tdd-gate.cjs` lê `.claude/.tdd-phase.json`, mas **nenhum código escreve esse arquivo** —
   só texto de prompt no `execute-plan`. Como o arquivo nunca existe, `isImmutableTest` retorna
   `false` na primeira linha e leva junto `block_test_modification_in_green` e
   `immutable_test_patterns`: a proteção do teste durante o GREEN estava desligada por inteiro.
3. `max_tests_per_cycle`, `require_assertion_failure` e `approach` aparecem uma vez cada, só nos
   defaults do hook.
4. O pre-commit de `hooks/hooks.json` lê `process.env.CLAUDE_TOOL_INPUT`, que o Claude Code nunca
   preenche (o payload chega por stdin). Sai com 0 sempre, sem rodar teste nem lint.
5. `skills/verify-work/SKILL.md` promete `auditors.code_review` com default `true`, e a chave não
   existe em `config/verify-work.json`.
6. O caminho `Write|Edit` de `hooks/tdd-gate.cjs` procura o teste-irmão a partir do `cwd` da sessão,
   não da raiz do projeto a que o arquivo pertence.

O PRD `2026-09-08-tdd-cycle-contract` adiou esse conjunto explicitamente, como "outro problema
(honestidade de config)".

**Evidência medida, não deduzida.** Quatro sondas de hook responderam a premissa que travava a
decisão da âncora:

| Sonda | Caminho | Resultado |
|---|---|---|
| Write do agente principal, produção sem teste | `needsTest` | bloqueada |
| Write de subagente, idem | `needsTest` | bloqueada |
| Edit do agente principal em teste, âncora armada | âncora | bloqueada |
| Edit de subagente em teste, âncora armada | âncora | bloqueada |

O hook dispara **dentro do subagente**, que é exatamente quem edita durante o GREEN, acha a âncora
pelo diretório do projeto e bloqueia com a mensagem certa. O mecanismo estava inteiro; faltava o
gatilho.

Para o AI Judge a medição foi na direção oposta: o subprocesso `claude -p` levou **27 segundos só
para falhar autenticação**, contra 10 segundos de orçamento do hook e 5 do safety timeout interno.

## Decision

Tratar os seis itens como um pacote de honestidade, decidindo item a item entre **implementar** ou
**admitir** — sem resposta única para todos.

- **D-HC-1 — AI Judge sai.** Removidos o modo `ai-judge`, `judge_model`,
  `suggest_ai_judge_threshold`, a seção "AI Judge — Quando Sugerir" da skill `tdd-workflow` e a
  linha correspondente de `docs/PIPELINE.md`.
- **D-HC-2 — Âncora é armada.** O orquestrador do `execute-plan` (Step 4c) escreve
  `.claude/.tdd-phase.json` antes do GREEN e o apaga depois, **no mesmo passo**, com lista explícita
  em `immutable_tests`. Qualquer passo que inicia fase varre âncora velha antes de começar.
- **D-HC-3 — Chaves sem mecanismo saem:** `max_tests_per_cycle`, `require_assertion_failure` e
  `approach`.
- **D-HC-4 — Pre-commit passa a ser consciente de fase**, lendo a mesma âncora para liberar o commit
  RED sem rodar a suíte.
- **D-HC-5 — `auditors.code_review` entra** em `config/verify-work.json`.
- **D-HC-6 — A raiz do projeto passa a ser resolvida pelo caminho do arquivo**, subindo até um
  marcador, em helper compartilhado com o caminho Bash.

Duas decisões transversais de desenho:

- **T-1 — A mensagem de bloqueio para de ensinar o desvio.** Hoje ela instrui o agente bloqueado a
  editar o arquivo da âncora para voltar ao RED, ou seja, o gate explica ao restringido como se
  soltar. Passa a mandar pedir ao orquestrador.
- **T-2 — A falha aberta passa a ser ruidosa.** O `catch { allow(); }` continua permitindo, porque
  hook quebrado não pode travar o trabalho, mas para de ser mudo.

## Alternatives

### AI Judge — Opção A: chamada direta à API Anthropic via `fetch` no hook
- **Pros:** `fetch` é nativo no Node 24; latência de Haiku com prompt curto caberia no orçamento.
- **Cons:** não há `ANTHROPIC_API_KEY` no ambiente, então cada pessoa que instala o plugin precisaria
  de chave paga própria, fora da assinatura. O hook dispara a cada `Write` e `Edit`, o que dá 10 a 20
  chamadas por ciclo. O preview do arquivo editado entra no prompt, abrindo prompt injection.
- **Rejeitada porque:** transfere custo e credencial para o usuário do plugin em troca de um gate que
  precisa ser fail-open de qualquer forma.

### AI Judge — Opção B: stdout advisory, o agente principal decide
- **Pros:** zero dependência, zero credencial.
- **Cons:** não é enforcement; é prompt pedindo colaboração de quem está sendo fiscalizado.
- **Rejeitada porque:** é exatamente a classe de promessa que este ADR existe para eliminar.

### AI Judge — Opção C: subprocesso `claude -p`
- **Pros:** o CLI está no PATH; `--print` e `--model` existem.
- **Cons:** medido em 27 segundos apenas para falhar autenticação, contra 10 de orçamento. O startup
  sozinho estoura o limite, e a sessão não-interativa nem autentica.
- **Rejeitada porque:** inviável por medição, não por opinião.

### Âncora — glob `*.test.*` em vez de lista explícita
- **Pros:** zero trabalho no orquestrador; já é o fallback do hook.
- **Cons:** congela **todo** arquivo de teste do repositório durante o GREEN de uma fase, e não só os
  testes daquela fase.
- **Rejeitada porque:** bloqueio falso é o que treina o dev a burlar o gate.

### Âncora — TTL dentro do hook para desarme automático
- **Pros:** sobrevive a crash sem depender do orquestrador.
- **Cons:** coloca lógica de relógio dentro do gate e desprotege em silêncio quando o prazo vence.
- **Rejeitada porque:** o hook deve continuar burro; a varredura de âncora velha no início da fase
  resolve o crash com dono único.

### Âncora — segundo hook blindando o próprio arquivo contra escrita e deleção
- **Pros:** fecharia a auto-remoção via Bash.
- **Cons:** complexidade nova para um adversário que não existe.
- **Rejeitada porque:** o adversário aqui é o próprio agente com pressa, não um atacante. Atrito com
  testemunha basta, e o orquestrador conferir que a âncora sobreviveu ao GREEN custa zero.

### `max_tests_per_cycle` — implementar contador na âncora
- **Pros:** com a âncora real, passaria a ser tecnicamente possível.
- **Cons:** o hook vê **arquivos**, não testes; um arquivo carrega N casos.
- **Rejeitada porque:** contar escritas e chamar isso de "testes por ciclo" seria mentira nova, mais
  difícil de perceber que a atual.

### Pre-commit — apagar, ou mover para pre-push
- **Pros:** elimina de vez o conflito com o commit RED que o contrato exige.
- **Cons:** perde o ponto de verificação mais próximo de quem escreve.
- **Rejeitada porque:** com a âncora real, a versão consciente de fase deixa de ser gambiarra e passa
  a ler a mesma fonte que o gate.

## Consequences

- **Positivo:** o pacote **remove mais do que adiciona** — saem seis chaves e uma seção inteira de
  skill; entram um armar, um desarmar e uma chave. A proteção do teste durante o GREEN passa a
  existir de fato, e o `verify-work` volta a rodar o auditor que a doc já prometia.
- **Negativo:** a âncora é o **único** mecanismo do conjunto que falha **fechando**. Âncora esquecida
  armada bloqueia trabalho legítimo depois, inclusive edição de teste numa fase RED seguinte. Em
  troca, o erro aparece na hora, ao contrário dos seis defeitos que este ADR corrige.
- **Risco aceito (D-HC-4):** quem forja a fase pula a suíte no commit. Aceito porque a CI continua
  sendo o portão de verdade e o pre-commit é conveniência. **Se a CI parar de rodar a suíte, esta
  decisão azeda.**
- **Restrição sobre a própria documentação:** a âncora deve ser descrita como algo que **torna o
  desvio visível**, nunca como enforcement que impede. Descrevê-la como controle recriaria em uma
  linha o defeito que este trabalho corrige.
