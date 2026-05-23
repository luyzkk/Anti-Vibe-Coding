<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Criar `docs/references/hooks-checklist.md`

**Plano:** 03 — Pipeline Compound -> Reference
**Sizing:** 0.75h (S)
**Depende de:** fase-01 (criterio de promocao documentado primeiro). Independente de fase-02 e fase-04 — pode rodar em paralelo.
**Visual:** false

---

## O que esta fase entrega

Reference operacional `docs/references/hooks-checklist.md` em formato checklist destilado de `docs/compound/2026-05-20-prompt-hook-includes-no-loop.md` + compound notes irmas listadas em `## Related`. Cobre parte de CA-05 e MH-05 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/references/hooks-checklist.md` | Create | Reference novo em formato checklist com header `> Origem:` citando compound notes-origem de hooks |

---

## Implementacao

### Passo 1: Reler `prompt-hook-includes-no-loop.md` e identificar compound notes irmas

A nota principal e `2026-05-20-prompt-hook-includes-no-loop.md`. Secao `## Related` cita:
- `docs/compound/2026-04-21-hooks-cjs-stdin-pattern.md` — stdin vs nextTick por evento
- `docs/compound/2026-03-23-hooks-json-overwrite-bug.md` — pitfall historico de hooks.json

Decisao: header `Origem` cita primariamente `prompt-hook-includes-no-loop` (e onde o conteudo do checklist e extraido); as 2 irmas sao citadas em "Referencias relacionadas" no fim do arquivo, NAO no header `Origem` (elas sao contexto, nao fonte direta do checklist). Isso evita "Origem" inflada com notas tangenciais.

### Passo 2: Criar `docs/references/hooks-checklist.md`

Snippet de referencia (escrever literalmente; ajustar redacao para clareza mantendo formato):

```markdown
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
```

### Passo 3: Verificar formato

Mesma checagem da fase-02 (header `Origem`, `>= 5` items `- [ ]`, `>= 40` linhas).

---

## Gotchas

- **G3 do plano (R-07):** Manter formato checklist. Se aparecer texto longo "por que" um check existe, mover para a compound-origem (la ja existe ou adicionar la — fora do escopo desta fase) e deixar a reference so com o "o que verificar".
- **G2 do plano (R-03):** Compound notes-origem nao tocadas nesta fase (so leitura). Frontmatter de `prompt-hook-includes-no-loop` sera tocado em fase-05 — as outras duas (`hooks-cjs-stdin-pattern`, `hooks-json-overwrite-bug`) NAO recebem `referenced-by:` nesta wave porque sao contexto/referencias relacionadas, nao "origem" direta do checklist. Decisao explicita registrada na fase-05.
- **Local — citacoes:** Compound notes irmas (`hooks-cjs-stdin-pattern`, `hooks-json-overwrite-bug`) sao citadas dentro do corpo do checklist quando o item ESPECIFICO usa material delas (Stdin pattern, Configuracao em hooks.json). Isso da trilha discoverability sem inflar o header `Origem`.
- **Local — links relativos:** Os links para `../compound/<file>.md` precisam ser validos. Confirmar que cada arquivo citado existe antes de comitar (manualmente: `test -f docs/compound/2026-04-21-hooks-cjs-stdin-pattern.md`). Se algum NAO existir, remover o item ou substituir por outra compound disponivel (registrar como DI no MEMORY).

---

## Verificacao

### TDD

- [ ] **RED:** Arquivo nao existe.
  - Comando: `test -f docs/references/hooks-checklist.md && echo "exists" || echo "missing"`
  - Resultado esperado: `missing`

- [ ] **GREEN:** Apos criar, arquivo existe e satisfaz formato.
  - Comando: `test -f docs/references/hooks-checklist.md && echo "exists"`
  - Resultado esperado: `exists`

### Checklist

- [ ] Arquivo criado: `test -f docs/references/hooks-checklist.md`
- [ ] Header H1 presente: `grep -E "^# hooks-checklist" docs/references/hooks-checklist.md` retorna match
- [ ] Header `Origem` presente: `grep -E "^> Origem:" docs/references/hooks-checklist.md` retorna match
- [ ] Cita compound-origem principal: `grep -E "prompt-hook-includes-no-loop" docs/references/hooks-checklist.md` retorna >=1 match
- [ ] Formato checklist (>=5 items): `grep -cE "^- \[ \]" docs/references/hooks-checklist.md` retorna `>= 5`
- [ ] Tamanho minimo (>=40 linhas): `wc -l docs/references/hooks-checklist.md` retorna `>= 40`
- [ ] Cita `stop_hook_active` (item crucial do checklist): `grep -E "stop_hook_active" docs/references/hooks-checklist.md` retorna match
- [ ] Cita `{ok, reason}` (schema oficial): `grep -E "ok.*reason|ok\".*reason" docs/references/hooks-checklist.md` retorna match
- [ ] Cita cap=8 (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` ou `cap.*8`): `grep -iE "STOP_HOOK_BLOCK_CAP|cap.*8" docs/references/hooks-checklist.md` retorna match
- [ ] Compound-origem NAO modificada: `git status docs/compound/2026-05-20-prompt-hook-includes-no-loop.md` nao mostra modificacao
- [ ] Harness verde: `bun run harness:validate` exit 0

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/references/hooks-checklist.md` exit 0
- `grep -c "^- \[ \]" docs/references/hooks-checklist.md` retorna `>= 5`
- `grep -c "^> Origem:" docs/references/hooks-checklist.md` retorna `1`
- `grep -c "stop_hook_active" docs/references/hooks-checklist.md` retorna `>= 1`
- `bun run harness:validate` exit 0

**Por humano:**
- Engenheiro lendo o arquivo entende em <2min QUAIS verificacoes rodar ao revisar PR de hook. Se algum item parecer ambiguo, reescrever.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
