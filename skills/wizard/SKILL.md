---
name: wizard
description: "Generate an interactive bash wizard that walks a human through steps only they can take: provisioning infra, capturing credentials or CI secrets, navigating a third-party dashboard, a one-off migration. Steps the agent can run, just run."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Bash
argument-hint: "[procedimento que o humano precisa executar]"
---

# Wizard

Um **wizard** e um script bash que caminha o humano, estagio por estagio, por um procedimento
manual — tedioso de fazer na mao e tedioso de reexplicar a uma IA toda vez. Abre cada URL, diz o
que clicar e copiar, captura os valores, grava onde eles pertencem (`.env`, secret do GitHub),
confirma a cada etapa e mostra quantos estagios faltam.

A UX ja esta resolvida por [`template.sh`](./template.sh): progresso por estagio, gates de
confirmacao, abertura de URL cross-platform (inclusive WSL), entrada oculta de segredo, upsert
idempotente no `.env`, escrita via `gh secret`/`gh variable` e sumario final. **Seu trabalho e so
escopar o procedimento e escrever os estagios.** A biblioteca acima do marcador `STAGES` e identica
em todo wizard — essa consistencia e o produto.

**Quando isto ganha do `AskUserQuestion`:** os passos estao numa UI de terceiro, sao muitos, vao ser
repetidos por outra pessoa, ou acontecem fora da sessao. O agente pergunta e age; o wizard e um
artefato que o humano roda sozinho, possivelmente varias vezes, sem sessao ativa.

Wizard nasce efemero: um uso, gravado em scratch ou `scripts/`, apagado quando o trabalho acaba.
Vai para o repo so quando o humano quer um caminho de setup repetivel.

## Processo

### 1. Escopar o procedimento

Levantar todo passo manual e todo valor capturado no caminho. **Ler o repo antes de perguntar:**

- Setup: `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, config do framework e
  `.github/workflows/*` — toda referencia `secrets.*` / `vars.*` e um valor que o wizard tem que
  produzir.
- Migracao ou transicao: o estado atual, o estado alvo, e as acoes irreversiveis entre os dois.

Mostrar ao humano a lista ordenada de estagios com os valores que cada um produz, e confirmar — ele
pode adicionar, remover ou reordenar.

**Pronto quando:** todo estagio esta nomeado em ordem e, para cada valor, sabe-se (a) onde o humano
pega, (b) onde e gravado (`.env`, secret, ambos, ou lugar nenhum — alguns estagios sao acao pura) e
(c) se e secreto (entrada oculta) ou publico.

### 2. Mapear a jornada de cada estagio

Escrever o caminho preciso: qual URL abrir, o que fazer la, onde o valor aparece, qual variavel ele
preenche — ex.: "Dashboard → Developers → API keys → Reveal test key → copiar". Onde voce nao souber
a UI atual ou o comando exato, **dizer que nao sabe** e perguntar ao humano ou checar a doc. Passo de
UI inventado e falha, nao aproximacao: o humano trava numa tela que nao existe.

**Pronto quando:** todo estagio vira instrucao que um estranho consegue seguir.

### 3. Escrever o wizard

Copiar `template.sh` para o caminho alvo, trocar o estagio de exemplo por um `stage` por passo em
ordem de dependencia, e ajustar `TOTAL_STAGES`. Helpers disponiveis: `stage` · `say`/`step`/`note` ·
`open_url` · `ask`/`ask_secret` · `write_env` · `set_secret`/`set_var` · `pause`/`confirm`.

Segurar a barra que o template estabelece: abrir a URL antes de pedir o valor · `ask_secret` para
qualquer segredo · `write_env` em todo valor persistido · `set_secret` so no que o CI de fato precisa ·
`confirm` antes de acao irreversivel. Cada `stage` limpa a tela, entao mantenha um estagio numa
tarefa focada — o que o humano precisa nao pode rolar para fora do campo de visao.

A biblioteca acima do marcador fica como esta.

### 4. Verificar e entregar

- `bash -n <script>`; `shellcheck` se disponivel; `chmod +x <script>`.
- **Conferencia estatica, nao execucao.** Rodar end-to-end abre navegador e bloqueia em input
  humano. Tracar no papel: todo valor do passo 1 e capturado e cai onde o passo 1 disse, e todo
  `set_secret` casa exatamente com uma referencia `secrets.*` no CI.
- Dizer ao humano como rodar. Se for caminho de setup repetivel, commitar e linkar do README, para o
  proximo rodar o script em vez de pedir a uma IA.

## Correcoes nossas sobre o template original

Duas, ambas comentadas no `template.sh` — mexer nelas de volta reintroduz o defeito:

| O que | Por que |
|---|---|
| `_existing` remove o CR terminal | `.env` em CRLF fazia o valor viajar com `\r` invisivel ate `write_env` e `set_secret`. Secret do GitHub com `\r` so falha em runtime de CI. Normalizado na leitura, nao na escrita: `write_env` nao deve reescrever linha que o wizard nao tocou |
| `explorer.exe` tratado como sucesso | Ele sai com codigo 1 mesmo tendo aberto o navegador, entao todo `open_url` bem-sucedido imprimia "couldn't open a browser". A excecao e so desse ramo — os outros mantem o aviso real |

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Gero um wizard para deixar o passo registrado" | Passo que o agente executa e trabalho, nao documentacao. Execute e registre o resultado |
| "Ajusto a biblioteca para este caso" | A UX identica entre wizards e o produto. Caso especial vira estagio, nao mudanca de biblioteca |
| "Descrevo o painel de memoria para nao travar o fluxo" | UI inventada trava o humano numa tela inexistente. Perguntar custa uma mensagem |
| "Rodo para conferir que funciona" | Abre navegador e bloqueia em input. A conferencia e estatica |

## Red Flags

- Wizard cujos estagios o agente conseguiria executar sozinho.
- `TOTAL_STAGES` diferente do numero de `stage` escritos — o humano ve progresso mentindo.
- `ask` onde o valor e segredo: entrada visivel vaza para o histórico do terminal.
- `set_secret` com nome que nao aparece em nenhum `secrets.*` do CI.
- Biblioteca acima do marcador editada a mao.
