---
fase: 01
plano: 03
status: planned
---

# Fase 01: Porte da Skill + Template, com as 2 Correcoes

**Plano:** 03 — `wizard`
**Sizing:** ~2.5h
**Depende de:** plano01 fase-01 (escrever contra a lente)
**Visual:** false

**Decisoes:** DI-09 (bash unico + correcoes) · DI-10 (model-invoked) · DI-03 (corpo pt-BR, description EN)
**Invariantes:** INV-01..INV-04 do plano03

---

## O que esta fase entrega

A skill e a biblioteca. Depois desta fase o agente consegue gerar um wizard; se ele **deve** gerar,
e a fase-02 (ponteiros) que resolve, e se o wizard **funciona**, e a fase-03.

---

## Arquivos Afetados

**NOVOS**
- `skills/wizard/SKILL.md`
- `skills/wizard/template.sh`

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md` — atribuicao MIT (INV-04)

**FORA do escopo**
- `infrastructure` e `init` (fase-02)
- Gerar qualquer wizard real (fase-03)
- Variante PowerShell (DI-09)

---

## Implementacao

### Passo 1: `template.sh` — copia literal

Copiar as 204 linhas. A biblioteca acima do marcador `STAGES` nao e adaptada (INV-01): a
consistencia entre wizards e o produto.

Gravar em **LF** (INV-02) e `chmod +x`.

Helpers que vem junto: `banner` · `stage` · `say`/`step`/`note`/`warn` · `open_url` · `pause`/`confirm` ·
`ask`/`ask_secret` · `write_env` · `set_secret`/`set_var` · `finish`.

### Passo 2: corrigir D1 — CRLF

`_existing()` devolve `${line#*=}`, que carrega `\r` quando o `.env` esta em CRLF. O valor vai para
`write_env` e `set_secret` — secret do GitHub com `\r` invisivel, falha so em runtime de CI.

**Decidir e registrar** onde normalizar (o README do plano03 alerta contra aplicar as duas por
precaucao):

- **Na leitura** — strip de `\r` em `_existing`. Corrige o valor propagado; deixa o `.env` mixado.
- **Na escrita** — `write_env` normaliza o arquivo inteiro. Corrige o arquivo; muda linhas que o
  wizard nao tocou, o que pode sujar um diff que o humano nao esperava.

Registrar a escolha como `DI-Plano03-fase01-crlf` no MEMORY, com o motivo.

Teste que prova: `.env` fixture em CRLF, ler valor existente, conferir que nao ha `\r` no que sai.

### Passo 3: verificar D2 antes de corrigir

`explorer.exe` retornando exit ≠ 0 mesmo abrindo o navegador dispararia o `|| warn` a cada abertura.
**Nao esta confirmado.**

Verificar primeiro: rodar `explorer.exe` com uma URL e ler `$?`. Isso abre uma janela na maquina —
avisar antes.

- Reproduziu → tratar `explorer.exe` como sucesso incondicional no ramo dele, mantendo o `warn`
  para os outros. Comentar por que a excecao existe, ou alguem "conserta" de volta.
- Nao reproduziu → **nao mexer**. Registrar como nao-defeito no MEMORY.

### Passo 4: `SKILL.md` — frontmatter

`name: wizard` · `description` EN, front-loaded, **< 250 chars** · `user-invocable: true` ·
`disable-model-invocation: false` (DI-10) · `allowed-tools: Read, Grep, Glob, Write, Bash` ·
`argument-hint`.

A `description` carrega a **fronteira**, nao so o gatilho. Os branches: provisionar infra ·
credencial ou secret de CI · caminhar painel de terceiro · migracao ou cutover pontual. E a exclusao
explicita — passo que o agente executa sozinho nao e wizard.

Sem a exclusao no ponteiro, o modo de falha previsivel e gerar wizard para coisa automatizavel.

### Passo 5: `SKILL.md` — os 4 passos do processo

Copia traduzida, preservando os criterios de "done" de cada passo, que sao o que segura a qualidade:

1. **Escopar o procedimento** — ler o repo antes de perguntar (`.env*`, README, `docker-compose*`,
   config de framework, `.github/workflows/*` — toda referencia `secrets.*`/`vars.*` e um valor que
   o wizard tem que produzir). Mostrar a lista ordenada de estagios e confirmar.
   *Done:* todo estagio nomeado em ordem e, para cada valor, sabe-se (a) onde o humano pega,
   (b) onde e gravado, (c) se e secreto.
2. **Mapear a jornada de cada estagio** — o caminho preciso: qual URL, o que fazer la, onde o valor
   aparece, qual variavel preenche. Onde nao souber a UI atual, **dizer que nao sabe** e perguntar
   ou checar a doc — nunca inventar passo que pode nao existir.
   *Done:* todo estagio vira instrucao que um estranho consegue seguir.
3. **Escrever o wizard** — copiar o template, substituir o estagio de exemplo, ajustar
   `TOTAL_STAGES`. Abrir a URL antes de pedir o valor; `ask_secret` para segredo; `write_env` em
   todo valor persistido; `set_secret` so no que o CI precisa; `confirm` antes de acao irreversivel.
4. **Verificar e entregar** — `bash -n`, `shellcheck` se disponivel, `chmod +x`. **Nao rodar
   end-to-end** (INV-03): abre navegador e bloqueia em input. Conferencia estatica: todo valor do
   passo 1 e capturado e cai onde o passo 1 disse, e todo `set_secret` casa exatamente com uma
   referencia `secrets.*` no CI.

### Passo 6: efemero por padrao

Wizard nasce descartavel — um uso, gravado em scratch ou `scripts/`, apagado quando o trabalho
acaba. So vai para o repo quando o humano quer um caminho de setup repetivel; ai commita e linka do
README, para o proximo rodar o script em vez de pedir a uma IA.

### Passo 7: atribuicao MIT

`THIRD-PARTY-NOTICES.md`: fonte, commit `84fdeff`, licenca, e o que e derivado (`template.sh` quase
literal; `SKILL.md` traduzida) vs o que e nosso (as 2 correcoes).

### Passo 8: passar a lente do plano01

Rodar os 6 testes da `writing-for-agents` na `SKILL.md`. Alvo especifico: a fronteira "nao use para
o que o agente faz sozinho" esta como **alvo positivo** e nao so como proibicao — negacao pura
arrasta o comportamento proibido para o contexto.

---

## Gotchas

- **G1** — Editar a biblioteca acima do marcador. INV-01: e o que garante UX identica entre wizards.
  As 2 correcoes sao excecao consciente e vao documentadas no cabecalho.
- **G2** — `SKILL.md` com bloco de codigo shell parece executavel e nao e (compound
  `2026-05-12-skill-md-code-blocks-do-not-execute`). O codigo real mora no `.sh`; a `SKILL.md`
  descreve.
- **G3** — Fences aninhados: se algum exemplo na `SKILL.md` contiver triple backticks, o fence
  externo vai a quadruple (compound `2026-04-21`).
- **G4** — `template.sh` precisa de LF e bit de execucao. Git no Windows pode normalizar EOL na
  checagem — conferir `.gitattributes` antes de assumir.
- **G5** — Tentacao de "melhorar" a biblioteca alem das 2 correcoes. Fora de escopo; qualquer outra
  ideia vira item no MEMORY, nao commit.

---

## Verificacao

### TDD

O que da para testar sem rodar o wizard: a correcao do CRLF (fixture `.env` em CRLF → valor sem
`\r`) e a validade sintatica do template.

### Checklist

- [ ] `bash -n skills/wizard/template.sh` exit 0
- [ ] `shellcheck skills/wizard/template.sh` sem erro (warnings avaliados um a um)
- [ ] `template.sh` em LF, com bit de execucao
- [ ] D1 corrigido; escolha (leitura vs escrita) registrada no MEMORY com motivo
- [ ] D2 verificado; corrigido **ou** registrado como nao-defeito
- [ ] `description` < 250 chars e carrega a fronteira, nao so o gatilho
- [ ] Os 4 passos preservam seus criterios de "done"
- [ ] `THIRD-PARTY-NOTICES.md` atualizado
- [ ] `bun run harness:validate` verde

---

## Criterio de Aceite

**Por maquina:**
- `bash -n` exit 0; `harness:validate` exit 0
- `template.sh` em LF, executavel
- `description` < 250 chars
- Teste de CRLF verde

**Por humano:**
- Ler a `description` e saber dizer um caso em que **nao** se usa wizard
- Ler o passo 2 e entender que inventar um passo de UI e falha, nao aproximacao
- A biblioteca acima do marcador esta identica a origem, exceto as 2 correcoes — cada uma comentada
