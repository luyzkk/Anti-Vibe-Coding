# Memory: Plano 07 — `improve-codebase-architecture`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-01 executada (2026-08-13)
**Depende de:** plano01 fase-01 (a lente) · **plano02 fase-01** (vocabulario — dura). **Ambas
entregues** — a tabela de bloqueadores do README e o estado de quando o plano foi escrito.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Escopar, varrer, detectar conflito | **done** | 5/5 |
| 02 | O relatorio HTML | planned | 0/2 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano07-faseNN-<slug>: <o que mudou e por que>`.

### fase-01 (executada)

- `DI-Plano07-fase01-sem-depth`: o README e o INV-01 pedem "vocabulario do plano02, exato" e citam
  **`depth`** — que tem **zero ocorrencias** em `deep-modules.md`. O que existe la e `Deep Module` /
  `Shallow Module` como termos e `profundidade` no corpo, por DI-03 (corpo em pt-BR). A skill usa
  **`deep`/`shallow`** como leading words e `profundidade` em prosa. Usar `depth` seria deriva na
  direcao oposta a que o INV-01 quer. (`design-twice:106` usa `depth` como valor de
  `tradeoffs[].axis` — campo de schema, nao prosa; contexto diferente, fica como esta.)
- `DI-Plano07-fase01-falso-positivo-sem-numeros`: o Passo 5 da fase manda avisar sobre
  `security` 598 / `system-design` 528 / `api-design` 437. **Nao foram escritos na skill.** Dois
  motivos: (a) a skill e distribuida para projetos-alvo, onde essas skills nao existem — citar seria
  falso la; (b) numero em doc e cache de lookup barato que envelhece calado. No lugar entrou a regra
  generica ("catalogo consultavel nao e atrito; tamanho nao e sinal"), que e mais forte e nao
  envelhece. Ver a verificacao abaixo — ela pegou os dois maiores arquivos do repo, que **nao**
  estavam na lista do plano.
- `DI-Plano07-fase01-ponteiro-e-a-skill`: o Passo 8 manda atualizar `plano06/fase-03-saida.md`. O
  ponteiro **vivo** e `skills/incident-response/SKILL.md` §`Autopsia Pos-Fix`; o doc de fase e
  registro historico do que foi executado, e reescreve-lo falsificaria o registro. A skill foi
  atualizada; os dois docs do plano06 (fase-03-saida + MEMORY) receberam **nota de resolucao** com o
  texto original preservado.
- `DI-Plano07-fase01-recomendar-nao-invocar`: a skill e `disable-model-invocation: true`, entao
  **nao e alcancavel por outra skill** (mesma mecanica de DI-10). O ponteiro do `incident-response`
  precisou ser redigido como *"recomende ao dev rodar"*, nao como encaminhamento por invocacao —
  senao o agente tenta invocar e falha em silencio. Os dois destinos originais (`architecture`,
  `code-simplification`) continuam: sao model-invocable e resolvem **agora**, dentro da sessao; o
  branch novo e a varredura **periodica**, que e do humano. Branches distintos, nao sinonimos.
- `DI-Plano07-fase01-linha-zero-callers`: a tabela do deletion test ganhou uma **4a linha** que o
  plano nao previa — *"nao ha caller nenhum fora dos testes"*. Descoberta rodando o Passo 9: tres
  modulos deste repo caem ai, e nenhum tem deletion test, porque ja estao deletados na pratica.
  Sem a linha, a varredura os classificaria como `pass-through` e a leitura sairia errada.
- `DI-Plano07-fase01-notices-linha-138`: `THIRD-PARTY-NOTICES.md:138` listava o hand-off para
  `improve-codebase-architecture` sob **"Not ported"** do `incident-response`. Ficou falso no
  instante em que a skill entrou — corrigido na mesma fase.

### Obrigatorias na fase-02
- `DI-Plano07-fase02-tmpdir`: qual ordem de resolucao do temp dir? `$TMPDIR` nao existe em Git Bash;
  `$TEMP`/`$TMP` existem com caminho Windows; `/tmp` existe e mapeia para o temp do MSYS. Escolher
  uma e escrever.
- `DI-Plano07-fase02-offline`: Mermaid vem de CDN. Sem rede os diagramas nao renderizam. Fallback
  textual visivel, ou aceitar? O card nao pode parecer completo com buraco no lugar do diagrama.

## O que esta skill e, e nao e

**Primeira skill proativa e periodica do plugin.** Todo o resto e reativo a uma mudanca recem-feita:

| Skill | Gatilho |
|---|---|
| `verify-work` | executei um plano |
| `anti-vibe-review` | implementei |
| `code-simplification` | este arquivo esta complexo |
| `detect-architecture` | classificar o projeto (one-shot) |

E a honestidade da fonte que entra no porte: **levantamento, nao resgate.** Num codebase velho ela
acha candidatos reais, mas nao desemaranha a lama.

## Armadilhas do Windows (fase-02)

Esta fase concentra os problemas de plataforma do plano inteiro:

| Problema | Realidade em Git Bash |
|---|---|
| `start <arquivo>` | **nao existe** — e builtin do `cmd`. Usar `explorer.exe` ou `cmd //c start "" ...` |
| Caminho | `/c/Users/...` nao e entendido por `explorer.exe`. Converter com `cygpath -w` |
| `$TMPDIR` | geralmente ausente. `$TEMP`/`$TMP` existem, estilo Windows |

Parente do defeito D2 do plano03 (`explorer.exe` e exit code). **Nao consolidar preventivamente** —
so quando houver dois call sites reais ("1 adapter = seam hipotetico, 2 = real", plano02).

## Pendencia resolvida por este plano

`plano06/fase-03` encaminha o post-mortem arquitetural para `architecture`/`code-simplification`,
com nota de que o destino muda quando esta skill existir. A fase-01 daqui atualiza aquele ponteiro.

## Adiado (DI-25)

O **loop de grilling** sobre o candidato escolhido, com efeitos colaterais inline (atualizar
glossario, oferecer ADR). Esta entrega para em "qual voce quer explorar?" e encaminha para
`/design-twice` (Dominio 5).

**A premissa do adiamento caducou — decidido de novo em 2026-08-13, na fase-01.** O adiamento
original era por dependencia: plano04 (frontier) e plano05 (`domain-modeling`) nao existiam.
**Existem os dois**, e `grill-me`, `domain-modeling`, `design-twice` e `decision-registry` sao todos
`disable-model-invocation: false` — ou seja, alcancaveis a partir daqui. Nao ha barreira tecnica.

**Segue adiado, por razao nova:** parar em *"qual voce quer explorar?"* e o **design** (INV-03), nao
a limitacao — e `/design-twice` Dominio 5 ja entrega tres interfaces divergentes, que e onde o loop
desembocaria. Somar um 6o passo antes de a fase-02 existir tambem inverteria a ordem de construcao:
o relatorio e o artefato sobre o qual o loop opera.

**Reavaliar depois da fase-02**, com o relatorio na mao — o sinal a observar e se o humano volta
pedindo o loop, ou se o encaminhamento para `/design-twice` basta.

## Degradacao sem glossario

`docs/GLOSSARY.md` **nao existe neste repo**, e o plano05 nao o criou: o que ele entregou foi
`skills/init/assets/templates/docs/GLOSSARY.md.tpl`, o template que o `/init` scaffolda **no
projeto-alvo**. A nota vale integralmente e continua valendo aqui — onde nao houver glossario, os
cards usam o vocabulario de arquitetura (plano02) e os nomes que o codigo ja usa.
**Degradar, nao quebrar.**

## Resultados da execucao real (fase-01 Passo 9, 2026-08-13)

Rodada **inline**, sem despachar o subagente do Passo 2 — o brief de subagente nao foi exercitado.
Todo o resto (escopo, filtro de catalogo, deletion test, conferencia de ADR) rodou de verdade.

| Observacao | Resultado |
|---|---|
| Hot spots do `git log` batem com o atrito percebido? | **Depois de um ajuste.** O ranking cru sai dominado por `plugin-manifest.json` (44) e `SKILL.md` — prosa e artefato gerado, que nao tem interface de modulo. Filtrando para `*.ts` nao-teste, os hot spots viram `skills/init/lib/` e `skills/compound-engineering/lib/` — que **batem exatamente** com onde o atrito e sentido (o init-refactor-v7 inteiro morou ali) |
| Falso positivo de arquivo longo aconteceu? | **Nao — o filtro pegou.** Os dois maiores arquivos de codigo sao `populate-instructions-table.ts` (713 linhas, **2 funcoes, 1 branch**) e `stack-aware-input-paths.ts` (564, 4 funcoes, 7 branches): tabelas de dados, catalogo pela regra do Passo 2. Sao os primeiros que qualquer varredura por tamanho acha, e **nao estavam na lista do plano** |
| Profundidade do historico (G6) | 835 commits — sem truncamento, ranking confiavel |

### Achados reais (o levantamento que a skill produziu neste repo)

Nao entram no escopo desta fase; ficam registrados porque sao a prova de que a varredura funciona.

| Achado | Medicao | Leitura |
|---|---|---|
| `skills/init/lib/snippet-resolver.ts` | 0 callers fora do proprio teste | Codigo morto (linha 1 da tabela do Passo 3) |
| `skills/compound-engineering/lib/compound-engineering-prefaces.ts` | 0 callers fora do teste | Idem |
| `skills/compound-engineering/lib/checker.ts` (`runCompoundCheck`) | 0 callers; 18 linhas envolvendo `Bun.spawn` | Wrapper sem leverage — `deep-modules.md:88` |
| `compound-files-collector.ts` vs `listCompoundFilesLocal` | `scripts/compound-check.ts:33-34` **confessa** a copia, e nao importa a lib | Duas fontes de verdade; parente direto de `docs/compound/2026-08-13-suite-verde-nao-exercita-validador-distribuido.md` |

**Correcao de um fato do MEMORY do projeto:** ele lista `snippet-resolver.ts` **e**
`backup-anti-vibe.ts` como "libs orfas candidatas a delete". Medido hoje: `snippet-resolver` e orfa,
`backup-anti-vibe` **nao** — `skills/init/lib/rollback.ts:11` importa dela. O grep que achou o caller
de uma serviu de controle positivo para o zero da outra.

## Gates entre fases

- **plano02 fase-01 -> fase-01:** dependencia dura. Sem o vocabulario, todo card diria "componente"
  e "boundary" — exatamente o que o vocabulario existe para evitar.
- **fase-01 -> fase-02:** candidatos precisam existir para serem renderizados.
