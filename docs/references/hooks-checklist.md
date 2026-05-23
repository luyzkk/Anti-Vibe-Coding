# hooks-checklist

> Origem: docs/compound/2026-05-20-prompt-hook-includes-no-loop.md
>
> Reference operacional para criar/modificar hooks em `hooks/hooks.json` e scripts
> `hooks/*.cjs`. Narrativa do incidente esta na compound-origem; aqui sao verificacoes.

Checklist para qualquer hook novo ou edicao em hook existente. Use em PR review
de mudancas em `hooks/`.

## Escolher prompt-type vs command-type

- [ ] Decisao explicita registrada no PR: `type: "command"` (preferencia default) OU
      `type: "prompt"` (apenas se houver justificativa)
- [ ] Doc oficial em `code.claude.com/docs/en/hooks` recomenda `command` para
      producao; `prompt-based` agent hooks sao marcados experimental
- [ ] Para decisoes binarias com sinais lexicais claros (corrections, completions,
      compile errors) — preferir `command` + regex sobre `transcript_path` ou stdin
- [ ] Se escolher `prompt`, lembrar que o parser interno faz `response.includes("no")`
      literal no texto bruto — qualquer prosa contendo "no" / "Notification" /
      "notion" / "no correction" dispara `decision: "block"` falsamente

## Schema oficial do retorno (prompt-type)

- [ ] Retornar `{"ok": true}` ou `{"ok": false, "reason": "..."}` — schema oficial
      em `code.claude.com/docs/en/hooks#prompt-based-hooks`
- [ ] NAO inventar campos (`{"decision": "yes"}`, `{"decision": "block"}`,
      `{"action": "allow"}`) — parser ignora esses; troca de schema interno NAO
      resolve o bug do substring "no"
- [ ] Se prosa for inevitavel antes do JSON, JSON na ULTIMA linha NAO ajuda (parser
      grep sobre o texto inteiro) — migrar para command-type e a fix real

## Comportamento sob loop (Stop hooks)

- [ ] Stop hook command-type SEMPRE checa `stop_hook_active === true` no INICIO do
      script — se true, `exit 0` imediato (quebra qualquer loop residual)
- [ ] Documentado em `/en/hooks-guide#stop-hook-hits-the-block-cap` — valvula de
      escape oficial contra loops
- [ ] Sem essa checagem, hook entra em loop ate bater `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`
      (default 8) em conversas normais

## Cap padrao de 8 blocks consecutivos

- [ ] `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` default = 8 — apos 8 bloqueios consecutivos,
      o harness encerra o loop e o hook e ignorado
- [ ] Hook em producao NAO deve depender de bloquear mais que 1-2 vezes em sequencia;
      se bloqueia repetidamente, e sinal de regex/parser estreito demais (false positive)
- [ ] Telemetria: registrar contagem de blocks por sessao em `.anti-vibe/hook-log.jsonl`
      para diagnostico

## Stdin pattern em hooks cjs

- [ ] Ler input JSON via stdin (`process.stdin`), nao via arg
- [ ] Pattern correto: `process.stdin.on('data', chunk => buffer += chunk)` +
      `process.stdin.on('end', () => parse(buffer))` — NAO usar `process.nextTick`
- [ ] Compound-irma: `docs/compound/2026-04-21-hooks-cjs-stdin-pattern.md` documenta
      a diferenca entre stdin vs nextTick por evento
- [ ] Sair com `exit 0` (sucesso) ou `exit 1` (erro inesperado); NUNCA usar codigos
      custom (1=block etc) — sinal de decisao vem do JSON em stdout, nao do exit code

## Regex heuristica para sinais lexicais

- [ ] Para Stop hook detectar CORRECTION/COMPLETED: regex em PT-BR e EN cobrindo
      formas standalone (`reverta`, `nao era isso`, `you broke`, `undo`,
      `ship it`, `pode commitar`, `pronto`, `done`)
- [ ] Match em palavra-inteira preferivel (`\bundo\b`) — evita falso positivo em
      `undoing`, `understood`
- [ ] Sem match: `exit 0` silencioso (decisao default = permitir Stop natural)
- [ ] Com match: emit `{"decision":"block","reason":"<sinal detectado>"}` em stdout

## Configuracao em hooks/hooks.json

- [ ] Hook novo declara `type`, `event`, `command` (se command-type) ou `prompt`
      (se prompt-type) — schema validado em `bun run harness:validate`
- [ ] Compound-irma: `docs/compound/2026-03-23-hooks-json-overwrite-bug.md` documenta
      pitfall historico de hooks.json (multiplos hooks para mesmo evento)
- [ ] Edit em hooks.json DEVE ser cirurgico (preservar hooks existentes) — overwrite
      acidental quebra todos os outros eventos

## Testes de hook

- [ ] Hook command-type tem `<name>.test.cjs` cobrindo fixtures de input:
      CORRECTION, COMPLETED, NOTHING + caso anti-regressao da substring "no"
- [ ] Test inclui fixture com texto contendo "no" em palavras como "Notification" /
      "no correction detected" para garantir que regex em palavra-inteira nao da
      falso positivo
- [ ] CI roda `bun run hooks:test` (ou equivalente)

## Referencias

- Compound: [prompt-hook-includes-no-loop](../compound/2026-05-20-prompt-hook-includes-no-loop.md) — incidente fonte (loop por substring "no")
- Compound relacionada: [hooks-cjs-stdin-pattern](../compound/2026-04-21-hooks-cjs-stdin-pattern.md) — stdin vs nextTick
- Compound relacionada: [hooks-json-overwrite-bug](../compound/2026-03-23-hooks-json-overwrite-bug.md) — pitfall historico
- Doc oficial: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) — schema oficial e prompt-based vs command-based
