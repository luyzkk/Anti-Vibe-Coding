# Memory: Plano 03 — `wizard`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **concluido** — 3 de 3 fases executadas em 2026-08-12
**Depende de:** plano01 fase-01 (a lente de escrita) — **satisfeita**, plano01 mergeado

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte da skill + template | **done** | 3/3 (+ `template.test.ts`, `.gitattributes`, manifest) |
| 02 | Ponteiros: infrastructure + init | **done** | 2/2 (+ manifest regerado) |
| 03 | Dogfood: wizard real | **done** | 1/1 (`scripts/setup-new-machine.sh`) |

## Decisoes de implementacao (DI)

Formato: `DI-Plano03-faseNN-<slug>: <o que mudou e por que>`.

- **DI-Plano03-fase01-crlf** (a obrigatoria): normalizar **na leitura**, em `_existing`. O defeito e
  o *valor* viajando com `\r` ate `write_env`/`set_secret` — nao o arquivo estar mixado. Normalizar
  na escrita faria `write_env` reescrever linhas que o wizard nunca tocou, num arquivo que pertence
  ao humano e costuma estar em `.gitignore` (diff nao revisavel). E o `.env` fica mixado de todo
  jeito, porque `write_env` ja grava LF nas linhas novas. Uma so, como o README exige.
- **DI-Plano03-fase01-D1-nao-verificavel-em-runtime-aqui**: a fase pedia *"teste que prova: `.env`
  fixture em CRLF, ler valor existente, conferir que nao ha `\r` no que sai"*. **Impossivel nesta
  plataforma.** Quatro camadas independentes comem o CR antes de qualquer assercao, cada uma medida
  com `od -c` (nao inferida):

  | # | Onde | Evidencia |
  |---|---|---|
  | 1 | `grep` GNU 3.0 (MSYS2) abre em modo texto | arquivo tem `FOO=bar\r\n`, grep devolve `FOO=bar\n` |
  | 2 | `tail -n1` remove o CR de novo | stub emitiu `FOO=bar\r\n`, saiu `FOO=bar` |
  | 3 | **o proprio bash do MSYS2**, na substituicao de comando | `$(printf 'a\r\n')` devolve `a`; CR no meio sobrevive (`a\rb`) |
  | 4 | `spawnSync` do bun remove CR do stdout no Windows | `printf "a\rb"` volta `"ab"` |

  A camada 3 e decisiva: `_existing` usa `line=$(...)`, entao **nenhum stub de utilitario alcanca o
  caso**. A 4 e a mais traicoeira: torna `expect(v).not.toContain('\r')` **vacuo** — passa com ou
  sem correcao. Escrevi 3 versoes do teste que davam verde por esse motivo antes de medir.

  Resolvido assim: a guarda contra remocao da correcao e **sobre a fonte** do `template.sh` (regex
  no corpo de `_existing`), com controle positivo — removi a linha da correcao e a suite foi para
  5 pass / 1 fail; restaurei e voltou 6/0. Os testes de runtime ficaram provando o que eles de fato
  conseguem provar (o valor certo sai), com a saida em base64 para os bytes atravessarem a captura.
  Em POSIX nenhuma das 4 camadas ocorre e o defeito e real — e o template e cross-platform
  (`open_url` tem ramos wslview/xdg-open/open).
- **DI-Plano03-fase01-D2-reproduziu**: `explorer.exe "https://example.com"` retornou **exit 1** com
  o navegador aberto, e a estrutura `{ ... } >/dev/null 2>&1 || warn` do template disparou o aviso.
  Corrigido com `|| true` **so no ramo do `explorer.exe`** — os outros mantem o aviso real. O
  comentario diz por que a excecao existe, senao alguem "conserta" de volta (G1).
- **DI-Plano03-fase01-gitattributes-sh** (decisao do usuario): `.gitattributes` nao cobria `*.sh`, e
  `scripts/sync-to-global.sh` **ja estava com `#!/bin/bash^M` no disco** — o bug "bad interpreter"
  vivo no repo, o mesmo motivo pelo qual a regra `.husky/*` existe. Sem regra, INV-02 valeria so
  nesta maquina hoje: o `template.sh` nasceria LF e viraria CRLF no proximo checkout. Adicionado
  `*.sh text eol=lf` (escopo amplo, escolhido pelo usuario), o que tambem conserta o `sync-to-global.sh`.
- **DI-Plano03-fase01-copiar-do-blob**: o clone efemero sobreviveu num scratchpad de sessao anterior,
  no commit certo (`84fdeff`), mas o `template.sh` **no disco estava em CRLF** (8.800 bytes contra
  8.596 do blob — 204 CRs do checkout Windows). Copiado de `git show HEAD:<path>`, nao do disco.
- **DI-Plano03-fase01-openai-yaml-fora**: a fonte tem `agents/openai.yaml` (99 bytes) que a fase nao
  menciona. Nao portado — e manifesto de display especifico da OpenAI, sem contrapartida no nosso
  modelo de frontmatter. Registrado no `THIRD-PARTY-NOTICES.md`.
- **DI-Plano03-fase01-shellcheck-ausente**: o checklist pede `shellcheck`; **nao esta instalado nesta
  maquina**. `bash -n` passou e esta no teste automatizado. Cobertura ausente declarada, nao
  silenciada — se for instalado, vale rodar antes da fase-03.

### fase-02

- **DI-Plano03-fase02-buraco-confirmado**: a alegacao do README (426 linhas de `infrastructure`, zero
  ocorrencias de `dashboard`/`console`/`painel`/`manualmente`/`acesse`/`credencia`) foi **verificada**,
  nao assumida: os 6 termos dao 0, com controle positivo (`DNS` = 25) provando que o grep enxerga o
  arquivo. Regra de `docs/compound/2026-08-12-grep-negativo-exige-controle-positivo.md`.
- **DI-Plano03-fase02-ancoras**: os dois ponteiros foram colados onde a skill **ja narra** o passo
  manual, nao numa secao de referencias. `infrastructure` → logo apos *"e comum comprar no
  registrador e apontar nameservers para Cloudflare ou Route 53"* (`### Registrador vs Provedor
  DNS`), que e literalmente a acao que o agente nao consegue executar; a mesma secao ja nomeia
  Hostinger, o registrador do cenario de teste. `init` → dentro de `## Regras Importantes`, na
  sequencia da regra *"se nao tiver certeza sobre um conflito, perguntar ao usuario"*, que e a linha
  com a qual a distincao wizard-vs-`AskUserQuestion` precisa conversar (G3).
- **DI-Plano03-fase02-askuserquestion-so-no-frontmatter**: a fase supoe que o `/init` "ja usa
  `AskUserQuestion`". Ele aparece **so em `allowed-tools`** (`skills/init/SKILL.md:5`) — o corpo
  nunca descreve o uso. Isso nao muda o ponteiro, mas muda o motivo: ele nao esta desambiguando um
  uso documentado, esta escrevendo a fronteira pela primeira vez. Se alguem documentar
  `AskUserQuestion` no corpo do `init` depois, as duas linhas precisam ser lidas juntas.
- **DI-Plano03-fase02-verbo-oferecer**: os dois dizem **ofereca**, nunca "gere". Regra registrada do
  usuario (`feedback_suggest_dont_execute`), e o proprio `init` ja fecha com *"NAO invocar ...
  automaticamente"* — os ponteiros ficam consistentes com a convencao que a skill hospedeira ja tem.

### Passo 3 — cenarios de disparo conferidos

| Skill | Cenario | Por que dispara |
|---|---|---|
| `infrastructure` | "preciso apontar meu dominio na Hostinger para a Vercel" | A consulta desce para `## 1. DNS & Domain Management` → `### Registrador vs Provedor DNS`, secao que **nomeia Hostinger**. O ponteiro esta no paragrafo seguinte e lista "apontar nameserver no registrador" como primeiro item |
| `init` | "o projeto precisa de `DATABASE_URL` e de um secret de deploy no GitHub Actions" | Os dois valores estao **literalmente nomeados** no ponteiro, dentro das regras que governam o fluxo inteiro do init |

### fase-03 — dogfood

**Alvo escolhido: `README §Instalacao` — instalar o plugin numa maquina nova.**
Wizard gerado em `scripts/setup-new-machine.sh`, 4 estagios.

| Criterio | Como passa |
|---|---|
| 1. Genuinamente manual | Os passos 2-4 do README sao `/plugin marketplace add`, `/plugin install` e `/anti-vibe-coding:sync` — **slash commands digitados na UI do Claude Code**. Nenhum agente digita ali. O system prompt desta sessao confirma o caso analogo: comandos de dialogo de terminal "are not available in this session" |
| 2. Repetido | Toda maquina nova; e o README existe para outra pessoa repetir |
| 3. Multi-estagio | 4 |
| 4. Real | `README.md:23-56` (lido) + `sync-to-global.sh:11` com `PLUGIN_DEV` default da maquina do autor, que uma segunda maquina precisa sobrescrever |

**Candidato principal do plano (processo de release) foi descartado no criterio 1.** O proprio plano
ja avisava, e esta sessao confirmou empiricamente: mergeei os PRs #17 e #18 via `gh pr merge`. O que
sobrava de humano-only era fino demais.

**Onde a skill hesitou** (achado de primeira ordem, passo 2 da skill proibe inventar UI): os 3 MCP
servers sem autenticacao (`cloudflare`, `stripe`, `vercel`) seriam um 5o estagio com criterio-1
perfeito — o proprio harness declara que o agente nao roda o fluxo OAuth. **Nao entrou** porque eu
nao sei o caminho exato da UI de conectores do claude.ai, e inventar tela e falha, nao aproximacao.
Fica como estagio candidato se alguem confirmar o caminho.

**Auto-correcao durante a geracao:** a primeira versao nao usava `open_url` em estagio nenhum, o que
tornaria **impossivel verificar D2 em execucao real** — justamente um item do passo 4. Adicionado no
estagio 1 (abrir a pagina do repo antes de pedir o caminho do clone), que e uso genuino, nao
decorativo. Tambem corrigi uma `note` que dizia so "sync-to-global.sh le PLUGIN_DEV": induzia a
achar que gravar no `.env` conectava as duas coisas. Ele le do **ambiente**; o estagio 4 passa inline.

**Verificacao estatica (passo 3), toda verde:**

| Check | Resultado |
|---|---|
| `bash -n` | exit 0 |
| `TOTAL_STAGES` vs `stage()` | 4 == 4 |
| Biblioteca acima do marcador identica a origem (INV-01) | `diff` vazio |
| `write_env` idempotente | 2x `FOO` produziu **1** linha, com o valor atualizado |
| `shellcheck` | **nao rodou** — ausente na maquina |

**Helpers exercitados:** `banner` `stage` `say` `step` `note` `warn` `open_url` `ask` `write_env`
`pause` `confirm` `finish`.

### Passo 4 — executado em 2026-08-12

**Excecao consciente ao INV-03, a pedido do usuario.** O humano rodou ate o estagio 4 e pediu que o
agente rodasse o restante para capturar tudo. INV-03 existe porque o wizard bloqueia em input humano
— nao por proibicao de principio. Registrado como desvio, nao como cumprimento.

Metodo: **Run A** com stdin controlado (`printf '\n\n\n\n7.5.0\n' | bash ...`), e **Run B** forcando o
ramo tty da biblioteca com `_clear` instrumentado, porque `script`/pty nao existe nesta maquina e
`[[ -t 1 ]]` desliga cor e limpeza quando stdout e pipe.

| Item | Resultado | Como foi provado |
|---|---|---|
| Tela limpa entre estagios | ✅ | Run B: `_clear` disparou no `banner`, em **cada** `stage` e no `finish` |
| Contador de progresso | ✅ | Run A `1/4→4/4`; Run B `1/2→2/2` |
| `open_url` abre **sem aviso espurio** | ✅ **D2 confirmado no fluxo real** | Run A imprimiu `↗ opening https://...` e **nenhum** `⚠ couldn't open a browser`. Antes so o exit code do `explorer.exe` isolado tinha sido medido |
| `ask_secret` esconde entrada | ❌ nao exercitado | wizard nao captura segredo (G5) |
| `write_env` idempotente | ✅ real | apos 3 execucoes, `grep -c '^PLUGIN_DEV=' .env` = **1**, valor preservado |
| Re-run oferece default, Enter mantem | ✅ | Run A mostrou `[Enter keeps current]` e manteve o valor com Enter vazio |
| Sumario do `finish` | ✅ | `✓ Setup complete` + `wrote 1 value(s) to .env: PLUGIN_DEV`, exit **0** |
| Sem `\r` em valor gravado | ⚠️ sentido fraco | `od -c .env` termina em `\n`, sem `\r`. Mas esta plataforma remove CR em 4 camadas — **ausencia de CR aqui nao prova a correcao D1**, so prova que nada quebrou |

**O "encerramento no estagio 4" relatado pelo humano nao reproduziu.** Levantei a hipotese de que
`finish` morria sob `set -e` por causa de `(( ${#WRITTEN_SECRET[@]} ))` com array vazio; **testei e a
hipotese e falsa** — `finish` completa com exit 0 e array vazio. Run A tambem chegou ao fim. Sem
defeito identificado; a leitura mais provavel e que o prompt estava aguardando quando a tela foi
copiada.

**2 defeitos do wizard corrigidos durante o proprio dogfood** (nenhum e do template — G3 preservado):

1. **Nenhum estagio usava `open_url`**, o que tornaria D2 inverificavel em execucao real. Adicionado
   no estagio 1 como uso genuino.
2. **O exemplo de caminho induzia ao formato errado.** O prompt sugeria `/f/Projetos/...` (Git Bash),
   mas quem esta no Windows digita `F:\Projetos\...` — que e justamente a forma que o
   `/plugin marketplace add` precisa, porque o Claude Code e app Windows. As duas funcionam **por
   sorte**: o MSYS2 traduz, verificado nos 3 pontos de uso (`[[ -d ]]`, `grep` de path concatenado,
   `cd`). Se o wizard manipulasse a string do caminho, o backslash morderia. Prompt reescrito com os
   dois formatos e o criterio de escolha.

**Nao virou defeito:** em pipe, o prompt e a saida seguinte compartilham linha (o `ask` nao emite
newline apos o `read`; num terminal real o Enter do humano fornece). Artefato da captura.

## Cobertura ausente

Silenciar o que nao foi testado le como cobertura completa. O que **nao** foi exercitado:

- **`set_secret` e `set_var`** — este repo nao tem secret de CI. Verificado, nao assumido: os 2
  workflows dao 0 para `secrets.` e `vars.`, com controle positivo (`runs-on` presente nos dois).
  Previsto por G4 do plano.
- **`ask_secret`** — o alvo escolhido nao captura nada secreto (um caminho e uma string de versao).
  Consequencia de G5, que proibe credencial de verdade num wizard descartavel. Para exercitar,
  precisaria de um alvo com segredo real, e ai o wizard deixa de ser descartavel.
- **`shellcheck`** — ausente nesta maquina. `bash -n` cobre sintaxe, nao lint.
- **D1 em runtime** — sem verificacao nesta plataforma (ver DI da fase-01: 4 camadas mascaram).
  O passo 4 pode confirmar D1 so no sentido fraco: valor gravado sem `\r` visivel.

## Achado lateral (fora do escopo, nao corrigido)

**`.env` nao esta no `.gitignore` deste repo.** O wizard grava `PLUGIN_DEV` em `.env` na CWD; rodado
da raiz, cria um arquivo untracked que pode ser commitado sem querer. Nao e defeito do template nem
da skill — e do repo. Nao corrigido aqui por G3 (nao consertar coisa no meio do teste); vira item
proprio. O wizard nao grava segredo, entao o risco atual e sujeira, nao vazamento.

## Cobertura ausente da fase-01

- `shellcheck` nao rodou (ausente na maquina).
- D1 nao tem verificacao de runtime nesta plataforma — so guarda de fonte. Verificacao real exigiria
  POSIX (WSL, container ou CI Linux). **Nao** transformei isso em dependencia da suite: quebraria
  para quem nao tem WSL.

## Ambiente verificado (2026-08-10)

Git Bash 5.2.37 no Windows 11:

| Dependencia | Estado |
|---|---|
| `explorer.exe` | presente — e o ramo que `open_url` vai usar aqui |
| `tput` | presente |
| `mktemp` | presente |
| `gh` | presente |
| `wslview` / `xdg-open` / `open` | ausentes (esperado em Git Bash nativo) |

**Dependencia presente nao e fluxo funcionando** — e por isso que a fase-03 existe.

## Os 2 defeitos

| ID | Defeito | Estado |
|---|---|---|
| D1 | CRLF no `.env` faz `_existing` devolver valor com `\r`, que propaga para `write_env` e `set_secret` | **deterministico por leitura de codigo.** Corrigir na fase-01, verificar em execucao real na fase-03 |
| D2 | `explorer.exe` pode retornar exit ≠ 0 mesmo abrindo o navegador, disparando `warn` espurio | **nao confirmado.** Verificar antes de mexer. Se nao reproduzir, registrar como nao-defeito |

## Dogfood — selecao do alvo (fase-03)

Candidatos levantados, com a ressalva de cada um:

| Candidato | Evidencia | Ressalva |
|---|---|---|
| Processo de release | 2 commits de fixup no log (`9af127c`, `cbe59b3`) | Boa parte e agente-executavel; morde o criterio 1 |
| Setup do plugin em maquina nova | `sync-to-global.sh` tem `PLUGIN_DEV` com default especifico da maquina | Passa mais limpo no criterio 1 |

**Fato apurado:** este repo **nao tem secret de CI** — os 2 workflows em `.github/workflows/` nao
referenciam `secrets.*` nem `vars.*`. Logo `set_secret` nao sera exercitado pelo dogfood, e isso
entra no relatorio como cobertura ausente.

## Gates entre fases

- **fase-01 -> fase-02 e fase-03:** a skill e o template precisam existir. Fases 02 e 03 sao
  independentes entre si.
- **dentro da fase-03:** se nenhum candidato passar nos 4 criterios de selecao, trocar o alvo —
  inclusive para fora deste repo. Nao afrouxar o criterio.
