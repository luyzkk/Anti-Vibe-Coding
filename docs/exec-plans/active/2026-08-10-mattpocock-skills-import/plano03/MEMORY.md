# Memory: Plano 03 — `wizard`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fases 01 e 02 executadas (2026-08-12) — fase 03 (dogfood) pendente
**Depende de:** plano01 fase-01 (a lente de escrita) — **satisfeita**, plano01 mergeado

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte da skill + template | **done** | 3/3 (+ `template.test.ts`, `.gitattributes`, manifest) |
| 02 | Ponteiros: infrastructure + init | **done** | 2/2 (+ manifest regerado) |
| 03 | Dogfood: wizard real | planned | 0/1 |

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

## Cobertura ausente desta fase

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
