# Memory: Plano 08 — `prototype`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **concluido** — fases 01, 02 e 03 executadas (2026-08-13)
**Depende de:** plano01 fase-01 (a lente) — **entregue**. Auto-contido no resto.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Roteador de ramo + LOGIC + dogfood | **done** | 3/3 |
| 02 | O ramo UI | **done** (so leitura — ver Divida) | 2/2 |
| 03 | Ponteiros e captura | **done** | 3/3 |

Fase 03 depende so da fase-01.

## Decisoes de implementacao (DI)

Formato: `DI-Plano08-faseNN-<slug>: <o que mudou e por que>`.

### fase-01 (executada)

- `DI-Plano08-fase01-satelite-em-references`: o plano diz `skills/prototype/LOGIC.md`, irmao do
  `SKILL.md`, copiando o upstream. **Foi para `references/LOGIC.md`** — mesma razao medida no
  plano07 fase-02: `generate-manifest.js:180-202` nao indexa `.md` solto na raiz da skill, entao ele
  chegaria ao cache global sem checksum e fora da estrategia de update. A fase-02 deve criar
  `references/UI.md`, nao `UI.md`.
- `DI-Plano08-fase01-sem-ponteiro-para-UI`: o roteador nomeia os dois ramos, mas o link para `UI.md`
  **nao foi escrito** — `harness:validate` falha em link relativo quebrado, e foi o que aconteceu na
  primeira tentativa (2 erros `[broken-link]`). O ramo UI esta descrito na tabela do roteador, sem
  ponteiro. **A fase-02 adiciona os dois links** (na `SKILL.md` e na `references/LOGIC.md`, que hoje
  diz "o ramo e outro — o de **UI**"). Mesmo principio do INV-04 do plano07: nao prometer alvo que
  nao existe.
- `DI-Plano08-fase01-anti-padroes-no-positivo`: os 6 anti-padroes da fonte sao proibicoes
  ("Don't add tests"). Reescritos como **o que cada um mata** ("Teste. Prototipo que precisa de
  teste deixou de ser prototipo"), pela lente do plano01 — negacao arrasta o comportamento proibido
  para o contexto. O conteudo e o mesmo; o alvo positivo fica nomeado.
- `DI-Plano08-fase01-grep-document-falso-positivo`: o check de pureza do modulo (INV-01) acusou
  `document: 1`. Era **"documentação"** dentro de um comentario. Mesmo padrao do
  `DI-Plano03-fase01-meta-test-D4-sem-comentario`: grep de token em texto completo pega comentario.
  O modulo e puro — confirmado rodando ele headless.

### fase-02 (executada)

- `DI-Plano08-fase02-ponteiros-fechados`: os dois links adiados pela fase-01 foram escritos —
  `SKILL.md` -> `./references/UI.md` e `references/LOGIC.md` -> `./UI.md`. `harness:validate` passou
  a 371 md.
- `DI-Plano08-fase02-regra-estrutural-desce`: quando a fase-01 tirou o link, a regra do INV-03
  ("tres grades de card ajustadas nao sao tres variantes") foi parar na tabela do roteador para o
  ramo nao ficar oco. Com o satelite existindo, **ela desceu**: o roteador serve para *escolher o
  ramo*, e a regra estrutural guia a *execucao*. Ficou so a razao da preferencia por sub-forma A, que
  e o que ajuda a escolher.
- `DI-Plano08-fase02-rationalization-cortada`: a linha *"Faco tres variantes ajustando espacamento e
  cor"* saiu de `Common Rationalizations`. Era o anti-padrao 1 do `UI.md` escrito de novo, num
  arquivo **sempre carregado**, servindo a um branch que so se alcanca depois de abrir o satelite —
  quem esta fazendo variantes ja leu a regra la. Duplicacao de significado, pela lente do plano01.

### fase-03 (executada)

- `DI-Plano08-fase03-prefixo-nao-congelado`: a captura precisava de um nome de branch, e a
  convencao **diverge de si mesma neste repo**: `git-workflow-and-versioning:162` documenta
  `feature/<desc>`, mas os merges reais usam `feat/` (10x), `fix/` (7x), `docs/` (3x), `chore/` (3x),
  `release/` (1x) — medido em `git log --merges -40`. Alterar aquela skill esta **fora do escopo**
  desta fase. Solucao: a `prototype/SKILL.md` escreve o formato `<prefixo>/prototype-<slug>` e
  **aponta** para `git-workflow-and-versioning` em vez de congelar um prefixo. Ganha duas vezes —
  nao escolhe lado numa divergencia que nao e desta fase, e degrada certo em projeto-alvo com outra
  convencao. **Divida aberta:** `feature/` vs `feat/` na skill de git.
- `DI-Plano08-fase03-branch-do-dogfood-renomeada`: a branch criada na fase-01 era `proto/adr-lifecycle`
  — prefixo que nao existe em convencao nenhuma. Renomeada para **`feat/prototype-adr-lifecycle`**,
  que e o formato que a skill passou a escrever. Era local e nao pushada; renomear foi trivial.
- `DI-Plano08-fase03-ponteiro-passou-de-1-linha`: a checklist pede "no maximo 1 linha" por ponteiro.
  O do `design-twice` **e** 1 linha de tabela, mas carrega 3 de fronteira abaixo; o do `qa-visual`
  tem 2 frases. Mantidos: sem a fronteira o ponteiro do `design-twice` dispararia sempre (G1), e a
  segunda frase do `qa-visual` e o *porque* que o Passo 2 da fase manda escrever — comparar na mesma
  dimensao ser mais justo que impressao sequencial. Linha extra que muda comportamento nao e sprawl.
- `DI-Plano08-fase03-encaixe-no-step-8`: o ponteiro do `design-twice` entrou na tabela do
  **Step 8 — Sugerir Proximo Passo**, que ja e cenario -> sugestao. O encaixe resolve G1 por
  construcao: numa tabela de cenarios, o gatilho e condicional por forma, nao por redacao. E a
  fronteira que escrevi (tecnologia e schema nao se decidem clicando) cai exatamente sobre os
  **Dominios 2 e 3** da propria skill.

## Verificacao do gap (2026-08-10)

| Termo | Hits | O que eram |
|---|---|---|
| `prototip` | 7 | qualificadores de contexto ("em prototipos ou MVPs, SOLID nao se aplica") |
| `spike` | 4 | pico de trafego, e 1 mencao solta em `assumption-audit` |
| `throwaway` | 1 | comentario em `code-simplification` |
| `descartável` | 2 | cache SQLite e telemetria |

**Nenhuma skill constroi codigo descartavel para responder uma pergunta.** Gap confirmado por
conceito, nao por nome.

## Divida de cobertura declarada (fase-02) — CONFIRMADA na execucao

**O ramo UI nao da para dogfoodar neste repo** — plugin CLI, sem rotas, sem framework de UI, sem
pagina para hospedar variante.

**Foi assim que a fase-02 fechou, em 2026-08-13: `references/UI.md` esta verificada so por leitura.**
Nada nela foi executado. Especificamente **nao** exercitados:

| O que ficou sem prova | Onde |
|---|---|
| O switcher por `?variant=` funcionar com router de framework real | Passo 3 e 4 |
| O gate `NODE_ENV` de fato esconder a barra num build de producao (INV-04) | Passo 4 |
| As setas do teclado nao roubarem digitacao de `<input>`/`<textarea>` focado (G4) | Passo 4 |
| Tres variantes saírem estruturalmente diferentes na pratica (INV-03) | Passo 2 |

**O primeiro uso real em projeto-alvo Next.js e o teste de verdade.** Contraste com o ramo LOGIC, que
rodou end-to-end na fase-01 (prototipo gerado, aberto, clicado, modulo rodado headless).

Registrado por causa do compound `2026-05-12-skill-md-code-blocks-do-not-execute`: 224 testes
verdes, 10 skills "instrumentadas", 7 dias de uso e zero telemetria — porque a integracao nunca foi
testada end-to-end. E do `2026-08-13-suite-verde-nao-exercita-validador-distribuido`, que e o mesmo
buraco visto do outro lado.

## Dogfood do ramo LOGIC (fase-01 Passo 8)

Criterio de alvo: modelo de estado com transicoes **legais e ilegais**, em que "isso deveria ser
possivel?" e pergunta honesta.

**Candidato principal — ciclo de vida do ADR** (`decision-registry`):
`PROPOSED → ACCEPTED → (SUPERSEDED por ADR-NNNN) ou DEPRECATED`

Perguntas que parecem resolvidas no papel:

- da para superseder um ADR `DEPRECATED`?
- ADR superseded por outro que depois vira deprecated — o primeiro volta a valer?
- da para ir de `PROPOSED` direto a `DEPRECATED`, sem passar por `ACCEPTED`?

**Alternativa:** estados de fase de plano (`planned` / `in_progress` / `completed`). Mais simples, e
talvez sem transicao ilegal interessante — o que o tornaria alvo fraco.

### Resultado (executado 2026-08-13)

| Observacao | Resultado |
|---|---|
| Alvo escolhido, e por que | **Ciclo de vida do ADR.** Passou no criterio antes de gerar: `decision-registry-revoke.ts` nao tem guard nenhum de estado, entao transicoes ilegais sao alcancaveis de verdade — nao hipoteticas |
| O prototipo revelou transicao que o `decision-registry` nao trata? | **Sim, quatro achados.** Ver abaixo |
| Virou ADR, ou correcao da skill? | **Em aberto — decisao do humano.** A-1 e A-2 parecem correcao; A-3 e trivial; A-4 e decisao de design e merece ADR |

Prototipo gerado **pela skill**, aberto no navegador, clicado. O roteiro *"deveria ser ilegal:
ressuscitar"* produziu o estado que fecha o caso sozinho:

```
Situacao: Substituida por outra decisao
Motivo registrado: nao se aplica mais
```

### Os quatro achados, cada um medido no codigo

| # | Achado | Evidencia |
|---|---|---|
| **A-1** | **Nao ha guard de estado no `revoke`.** Da para "substituir" uma decisao `deprecated` — ela deixa de nao-se-aplicar e ganha substituta | `skills/lib/decision-registry-revoke.ts:35` so falha se o ADR nao existir; `:78` sobrescreve o status sem olhar o valor anterior |
| **A-2** | **O `revoke` grava valor fora do tipo.** `status` recebe a string `superseded-by: ADR-NNNN`, que nao e nenhum dos tres valores validos | `revoke.ts:78` contra `adr-writer.ts:11` (`type ADRStatus = 'active' \| 'superseded' \| 'deprecated'`) |
| **A-3** | **Duas grafias do mesmo campo.** O writer grava `status: "active"` com aspas (via `JSON.stringify`); o revoke grava `status: active` sem | `adr-writer.ts:51` contra `revoke.ts:64` |
| **A-4** | **A doc descreve um modelo de 4 estados que o codigo nao tem.** `PROPOSED -> ACCEPTED -> ...` — mas `ADRStatus` tem 3 valores e nenhum e `proposed`. Toda decisao nasce `active`: **a transicao "aceitar" nao existe** | `decision-registry/SKILL.md:131` contra `adr-writer.ts:11,51`. E `:163` lista uma terceira grafia (`active`/`superseded`/`deprecated`, minusculas) |

A-4 e o achado que so o prototipo produz: no papel `PROPOSED -> ACCEPTED` parece obvio, e ninguem
percebe que o sistema pula o estado inteiro. Parente da compound
`2026-08-13-artefato-gerado-decide-entre-duas-fontes`.

### Verificacao do INV-01

O modulo `ciclosDeVidaDaDecisao` (52 linhas) foi **recortado do HTML e rodado headless em `bun`**,
percorrendo os 4 cenarios. Rodou sem DOM: liftavel confirmado por execucao, nao por leitura.

## Arquivo tocado por tres planos

`skills/design-twice/SKILL.md` recebe:

| Plano | Fase | O que |
|---|---|---|
| 02 | fase-02 | ponteiro para o vocabulario de deep modules |
| 02 | fase-03 | Dominio 5 — interface de modulo |
| 08 | fase-03 | ponteiro para `prototype` |

**Reler antes de cada edicao.** Edit falha em silencio contra contexto desatualizado.

## Gates entre fases

- **fase-01 -> fase-02:** o roteador de ramo precisa existir antes do segundo ramo.
- **fase-01 -> fase-03:** os ponteiros apontam para uma skill que precisa existir.
