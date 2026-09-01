# Plano 03: Teste dinamico white-box

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding ([PLAN overview](../PLAN.md))
**Fases:** 2
**Sizing total:** ~3.5h
**Depende de:** Plano 01 (dependencia **soft** — ver Bloqueadores)
**Desbloqueia:** nada dentro desta feature (e a ultima camada; a limpeza final com ZAP/Trivy esta fora do PRD)

---

## O que este plano entrega

A verificacao de seguranca deixa de parar na leitura do codigo e passa a **confirmar no app rodando
que a defesa realmente segura**. Duas coisas nascem: um procedimento escrito
(`skills/security/references/dynamic-testing.md`) com o guardrail de autorizacao na frente de tudo,
um passe passivo determinista sobre as respostas HTTP, e um passe dirigido que confirma — canario
por canario — a suspeita que a analise estatica levantou; e o wire no `verify-work`, que **oferece**
esse passe quando existe dev server e **segue normalmente sem ele**.

Enquadramento honesto: isto e auditoria defensiva do **proprio** projeto do dev, em dev/staging — o
equivalente a rodar um baseline scan contra o proprio app antes do deploy. O criterio de sucesso de
cada teste e **"a defesa REJEITOU"**, nunca "consegui extrair dado". O guardrail de autorizacao
(CA-06, dealbreaker do PRD) e o que mantem esse enquadramento verdadeiro na pratica, e por isso e a
primeira secao do documento e o unico item deste plano coberto por teste de contrato.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `bun run generate:manifest` funcional | ja no projeto (`scripts/generate-manifest.js`) | pronto |
| `bun run test` / `bun run harness:validate` verdes | ja no projeto | pronto |
| Precedente de pre-check + limites de seguranca em skill | `skills/qa-visual/SKILL.md` (ja existe) | pronto |
| Ancoras reais do `verify-work` (Steps 1-5, template do relatorio) | `skills/verify-work/SKILL.md` (ja existe) | pronto |
| Vocabulario de severidade / contrato v2.0.0 dos auditores | Plano 01 | pendente — **nao bloqueia** |
| Licencas OWASP (CC BY-SA) confirmadas | PRD §Premissas #5 — **validar na fase-01** | pendente |

**Sobre a dependencia do Plano 01 (soft, e por que e soft).** Nenhuma fase deste plano **le** arquivo
produzido pelo Plano 01. O que se consome e vocabulario: as severidades (`CRITICO`/`ALTO`/`MEDIO`) ja
existem hoje no `## Step 3` do `verify-work`, e o contrato v2.0.0 ja e o formato dos auditores atuais.
Se o Plano 01 mergear primeiro, o unico efeito e prosa mais atual (OWASP 2025) nos exemplos — nenhuma
assercao deste plano depende de nome de categoria OWASP.

Consequencia pratica: **este plano pode comecar antes do Plano 01 terminar**, e roda em paralelo com
o Plano 02 (PLAN §Grafo de Dependencias).

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/security/references/dynamic-testing.md` | fase-02 (aponta para ele), consultas de `/security`, e o `/wizard` quando configurar o ZAP da limpeza final |
| Chave `config.auditors.dynamic` em `config/verify-work.json` | fase-02 e qualquer futuro passe que precise de app rodando |
| `tests/dynamic-testing-guardrail.test.ts` | manutencao futura — trava a existencia do guardrail (CA-06) |
| `## Step 2.5` do `verify-work` (slot para verificacao que exige app rodando) | trabalho futuro fora deste PRD (ZAP baseline, smoke de contrato) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de | MoSCoW |
|------|---------|---------|--------|------------|--------|
| 01 | fase-01-dynamic-testing-reference.md | `skills/security/references/dynamic-testing.md` (guardrail primeiro + passive-scan-lite + teste dirigido + limites) e `tests/dynamic-testing-guardrail.test.ts` (RF-08, CA-06) | 2h | — | Should |
| 02 | fase-02-verify-work-dynamic-wire.md | `## Step 2.5` no `verify-work` + `config.auditors.dynamic` + linha no relatorio + ponteiro na `/security` (RF-09) | 1.5h | fase-01 | Should |

---

## Grafo de Fases

```
fase-01 (referencia + gate do guardrail)
    |
    |  produz: o procedimento, o vocabulario dos dois passes,
    |          e o teste que trava o guardrail
    v
fase-02 (wire no verify-work + config + ponteiro na /security)
```

**Paralelismo possivel:** nenhum **dentro** deste plano — a fase-02 aponta para o arquivo que a
fase-01 cria (link quebrado no `harness:validate` se inverter a ordem). O plano inteiro, porem, roda
em paralelo com o Plano 02.

**Arquivos por fase (disjuntos entre si):**

| Fase | Arquivos |
|------|----------|
| 01 | `skills/security/references/dynamic-testing.md` (Create), `tests/dynamic-testing-guardrail.test.ts` (Create) |
| 02 | `skills/verify-work/SKILL.md`, `config/verify-work.json`, `skills/security/SKILL.md` (Modify) |

**O unico arquivo que as duas tocam e o `plugin-manifest.json`** (via `bun run generate:manifest`) —
mas como as fases sao sequenciais aqui, o conflito so aparece contra branches do Plano 01/02. Ver **G2**.

---

## TDD Strategy

Este plano entrega **um documento de referencia e edicoes de skill em markdown** — nao ha unidade de
codigo de runtime para exercitar. O ciclo padrao e de verificacao de conteudo:

```
Ciclo padrao (fase-01 conteudo, fase-02 inteira):
1. GREP-RED  : rodar os greps de aceite ANTES da edicao; registrar que retornam 0 / valor errado
2. EDITAR    : aplicar a mudanca ADITIVA (nada do conteudo existente sai)
3. GREP-GREEN: os mesmos greps retornam o valor esperado
4. DIFF-GUARD: `git diff --stat` nos arquivos MODIFICADOS — linhas removidas = 0
               (ou justificadas linha a linha na secao de desvios da MEMORY)
5. VERIFY    : bun run test && bun run harness:validate
6. MANIFEST  : bun run generate:manifest
```

**Por que nao ha TDD classico.** Um teste que afirme "o arquivo contem a string X", escrito logo
depois de eu escrever X, e tautologico no momento em que nasce — ele nao consegue discordar da
edicao. O gate estrutural do repo (`bun run harness:validate`: H1, frontmatter, links resolviveis) ja
e a verificacao mecanica dessas fases, e o criterio de aceite verificavel por maquina vive nos greps.

**A excecao deliberada — o guardrail ganha teste de contrato (DP-1).** O valor de um gate textual nao
esta no dia em que ele nasce; esta **depois**, como guarda contra remocao silenciosa. Ele se paga em
conteudo que (a) tem historico de sumir em passadas de "enxugar doc" e (b) cuja ausencia nao produz
sintoma. A secao de autorizacao e os dois casos ao mesmo tempo: se ela sumir, o passe **continua
rodando** — so que sem validar o alvo. O sintoma so aparece no dia em que o request sai para um host
que nao era o alvo. E dealbreaker declarado do PRD (CA-06), e o unico item deste plano que merece o
custo de manutencao de um gate.

```
Ciclo da fase-01 — TDD genuino (unico do plano):
1. RED   : escrever tests/dynamic-testing-guardrail.test.ts ANTES do documento; ele FALHA por
           ASSERTION ("referencia de teste dinamico ausente"), nao por excecao de modulo — leitura
           defensiva do arquivo (G13)
2. GREEN : escrever skills/security/references/dynamic-testing.md; as 6 assercoes passam
3. VERIFY: bun run test && bun run harness:validate
4. MANIFEST: bun run generate:manifest
```

Escopo do gate travado em **contrato**, nunca prosa: existencia do documento, o guardrail como
primeira secao, o vocabulario de host permitido, a recusa explicita, o criterio de sucesso invertido
("a defesa rejeitou" + a regra de parada) e as cinco classes de limite. Zero assercao sobre a
qualidade do texto.

**Tracer Bullet deste plano:** N/A — o tracer da feature inteira e a `fase-01` do Plano 01
(`secrets-scanner`), que ja prova o caminho arriscado (codigo rastreado + manifest + gates verdes).

---

## Gotchas Conhecidos

- **G1 — Manifest inverte o veredito do `/update`.** Alterar arquivo rastreado sem rodar
  `bun run generate:manifest` no mesmo PR faz o `/update` reportar o arquivo como "modificado pelo
  usuario" e recusar a atualizacao. **Verificado por grep no `plugin-manifest.json`:** os oito
  irmaos de `skills/security/references/*.md` **estao** rastreados (linhas ~2552-2594), logo o
  `dynamic-testing.md` novo tambem sera; `skills/security/SKILL.md`, `skills/verify-work/SKILL.md` e
  `config/verify-work.json` **estao** rastreados. **`tests/` NAO e rastreado** (`grep -c '"tests/'`
  retorna 0) — o teste de contrato sozinho nao exigiria manifest, mas a fase-01 cria o reference,
  entao roda mesmo assim.

- **G2 — Conflito no `plugin-manifest.json` NAO se resolve a mao.** Este plano roda em paralelo com
  o Plano 02, e ambos regeneram o manifest. Receita: no rebase, aceitar **qualquer** lado do hunk do
  manifest (ou `git checkout --theirs plugin-manifest.json`) e **rodar `bun run generate:manifest` de
  novo** apos o rebase. O arquivo e derivado, nunca fonte — resolver hunk a hunk produz checksum
  invalido que passa no git e quebra o `/update`.

- **G3 — `bun run lint` NAO EXISTE neste repo.** O `fase-template.md` sugere esse comando; ignore-o.
  Scripts reais: `bun run test`, `bun run typecheck`, `bun run harness:validate`,
  `bun run generate:manifest`, `bun run parity:audit`, e `bun test <caminho>` para um arquivo so.
  Formatacao roda sozinha via hook PostToolUse (`bunx biome check --write`).
  **Falso positivo perigoso na fase-02:** `skills/verify-work/SKILL.md` linha 64 manda
  "RODAR lint: `bun run lint`". Isso e **conteudo da skill sobre o projeto-alvo do usuario**, nao
  sobre este repo. A fase-02 **nao corrige e nao remove** (regra "nunca diminuir", G4).

- **G4 — Regra "nunca diminuir": toda edicao da fase-02 e ADITIVA.** Nenhuma linha existente do
  `verify-work/SKILL.md`, do `security/SKILL.md` ou do `config/verify-work.json` sai. O guard
  mecanico e o passo DIFF-GUARD: `git diff --stat` com 0 linhas removidas nos arquivos modificados.

- **G5 — References de `skills/security/` NAO tem frontmatter.** Os oito irmaos comecam direto em
  `# Titulo — Referencia Detalhada` (verificado: `head -1 application-security.md`). Nao introduzir
  frontmatter no `dynamic-testing.md`; a atribuicao de fontes (CC BY-SA, PRD §Premissa 5) vai numa
  secao `## Fontes` no rodape, com a data de verificacao escrita em prosa. O padrao com frontmatter
  `source_url`/`last_verified` e do `docs/references/`, outro diretorio, outra convencao.

- **G6 — `harness:validate` exige H1 em todo `.md` que nao seja `SKILL.md`/`commands/`.** O
  `dynamic-testing.md` **tem** que comecar com `# ` na primeira linha (nao com `---`, nao com
  comentario HTML), senao a regra `markdown-heading` falha. Ver `scripts/harness-validate.ts:513`.

- **G7 — Este plano e o QUARTO editor do `skills/security/SKILL.md` nesta feature.** Plano 01 fase-03
  (secao 3 + Red Flags), fase-04 (ponteiro da secao 9), fase-05 (`## Checklist de Seguranca Minima`)
  e agora a fase-02 daqui. Regioes sao disjuntas, mas ha adjacencia textual real: o ponteiro novo
  entra **entre a secao 9 e `## Dependency Discipline`**, colado na regiao da fase-04 do Plano 01.
  Diferente do manifest (G2), este conflito **e** resolvivel a mao — sao insercoes adjacentes em
  markdown. `git pull --rebase` antes de abrir o PR e conferir que as duas insercoes sobreviveram.

- **G8 — `config/verify-work.json` e lido UMA vez no Step 1 e a chave nova pode nao existir.** A
  Regra 8 do `verify-work` diz "config e lida uma vez no inicio — nao reler em cada step", e o Step 1
  ja tem o fallback "se nao existir → usar defaults". A chave `auditors.dynamic` **ausente** tem que
  significar `false` (nao `undefined` truthy, nao erro). Projetos instalados antes desta feature tem
  o JSON antigo — compatibilidade retroativa nao e opcional.

- **G9 — `curl` no PowerShell nao e o `curl` real.** No PowerShell, `curl` e alias de
  `Invoke-WebRequest`, com flags incompativeis (`-D`, `-sS`, `--max-time` nao existem). Todo comando
  do reference roda em **Bash (Git Bash)** ou com `curl.exe` explicito. O documento diz isso uma vez,
  no topo do passe passivo; as fases usam a ferramenta Bash para os greps de aceite.

- **G10 — `.claude/launch.json` NAO existe neste repo.** Verificado. A deteccao de dev server da
  fase-02 le esse arquivo quando ele existe no **projeto do usuario** — aqui, o caminho de ausencia e
  o unico exercitavel. Consequencia: o criterio de aceite da fase-02 e **grep sobre o texto da
  skill**, nunca execucao do fluxo de deteccao. Nao inventar um `launch.json` neste repo so para
  testar.

- **G11 — Host de canario usa TLD reservado, e isso e proposital.** Origens e destinos de teste no
  reference usam `.invalid` (RFC 2606 / RFC 6761): esse TLD **nunca resolve**, entao um erro de
  digitacao nao consegue alcancar terceiro. Nao "consertar" para `example.com` — `example.com` e um
  host real e alcancavel. Vale para o `Origin:` do preflight de CORS e para o canario de open
  redirect.

- **G12 — Severidade no dev server nao e severidade em producao.** HSTS ausente num dev server HTTP
  em `localhost` e o **comportamento esperado**, nao finding. Se o passe reportar isso como ALTO, ele
  vira ruido e o dev aprende a ignorar o bloco inteiro — perdendo junto os findings que importam.
  Cada check do passe passivo carrega duas colunas: o que vale no dev server e o que so se conclui
  em producao.

- **G13 — RED por assertion, nao por excecao de modulo.** `fs.readFileSync` num arquivo que ainda nao
  existe lanca `ENOENT` no carregamento do modulo — isso e erro de import, nao RED valido (convencao
  dos Planos 01 e 02). O teste da fase-01 le com `fs.existsSync(...) ? readFileSync(...) : ''`, para
  que a primeira assercao falhe com a mensagem do parity gate.

- **G14 — Ancorar assercao no CONTEUDO, nao no token do heading.** Herdado do
  `tests/grill-me-contract.test.ts` (e do G10 do Plano 02): `includes('## Autorizacao')` casa com
  `## Autorizacao REMOVIDA` e passa vacuamente. As assercoes olham o **corpo** da secao (helper
  `section()` com rastreio de fences ` ``` `) e a posicao relativa dela no documento.

- **G15 — CRLF quebra regex ancorada.** Repo Windows; compound `2026-05-19-crlf-breaks-frontmatter-regex.md`.
  O teste normaliza com `.replace(/\r/g, '')` antes de qualquer match, como o `grill-me-contract`.

- **G16 — Conteudo 100% defensivo (fronteira de escopo, PRD §Boundaries).** O reference descreve como
  **verificar que o proprio app rejeita** entrada maliciosa. Canario minimo de verificacao e
  legitimo; catalogo de exploracao, tecnica de evasao, escalada apos uma defesa falhar, ou qualquer
  coisa apontada para sistema de terceiro nao e — e nao e o que o PRD pede. A regra de parada
  ("a defesa nao segurou → PARE e reporte, nao aprofunde") e parte do entregavel, nao um aviso legal
  no rodape.

- **G17 — Nunca commitar na `main`.** Regra do repo: branch + PR por fase, mesmo em mudanca de doc.

- **GT-01 (pre-existente, nao desta feature).** `bun run typecheck` ja acusa erros em
  `lazy-import.test.ts` e `subagent-contract.ts`. Nao e regressao deste plano — comparar o **delta**,
  nao o valor absoluto.

---

## Decisoes de Planejamento (deste README, nao do PRD)

- **DP-1 — A fase-01 CRIA `tests/dynamic-testing-guardrail.test.ts`.** O briefing deixou a decisao em
  aberto ("vale um teste de contrato travando a presenca do guardrail?"). **Decidido criar**, com o
  argumento do TDD Strategy acima: e o unico item da feature cuja remocao nao produz sintoma
  imediato, e o dealbreaker declarado do PRD (CA-06). Escopo travado em contrato — 6 assercoes,
  zero prosa. Precedente direto: `DP-2` do Plano 02, que criou gate pela mesma razao (conteudo
  condicional some sem ninguem notar).

- **DP-2 — O passe dinamico entra como `## Step 2.5`, entre o Step 2 e o Step 3.** As tres opcoes
  eram `### 2g` dentro do Step 2, `## Step 2.5`, ou opcional dentro do Step 4.
  - `### 2g` esta **errado por dois motivos**: o `### 2f — Coletar Resultados` consolida saidas do
    contrato v2.0.0 via `invokeAndConsolidate` de subagentes spawnados; o passe dinamico nao e um
    Agent — e um procedimento `curl` que a propria skill executa via Bash, e nao emite o JSON do
    contrato. Enfia-lo ali obrigaria a inventar um agente falso. Alem disso, o `### 2b` e a lista de
    **auditores fixos ("sempre rodam")** — semantica oposta a de um passe que exige app rodando.
  - Dentro do **Step 4** esta errado porque o Step 4 e onde o dev **decide** sobre findings. Finding
    do passe dinamico precisa estar **no relatorio que o dev le**, nao aparecer depois dele.
  - `## Step 2.5` acerta os tres requisitos: roda **depois** do Step 2 (e por isso ja tem as suspeitas
    da analise estatica, que sao a entrada obrigatoria do teste dirigido), **antes** do Step 3 (e por
    isso o resultado tem lugar no template do relatorio), e e um **Step inteiro**, que pode ser
    pulado como unidade com um resultado declarado — coisa que um item dentro da lista de auditores
    fixos nao pode.

- **DP-3 — `config.auditors.dynamic` default `false` (opt-in), mas com oferta ativa.** Tres razoes:
  (a) e o unico item do pipeline que faz **requisicao de rede a um processo rodando** — todo o resto
  e analise read-only de arquivo; ligado por default, todo `/verify-work` de todo projeto passaria a
  procurar dev server, o que e comportamento surpreendente para uma skill de verificacao;
  (b) na maioria das invocacoes nao havera dev server, e uma linha "skipped" em **todo** relatorio
  para sempre e ruido que treina o dev a ignorar a linha;
  (c) PRD §Riscos: "default e so-passivo se dev server nao confirmado".
  A reconciliacao com o RF-09 ("`verify-work` **sabe oferecer** o passe quando ha dev server") e que
  `false` significa **nao roda sozinho**, nao "nao existe": com dev server detectado *e* uma suspeita
  de seguranca que o passe poderia confirmar, a skill **oferece uma vez** via `AskUserQuestion` e
  espera. Isso e literalmente o `feedback_suggest_dont_execute` do repo — a IA sugere, nunca invoca
  automaticamente.

- **DP-4 — Ordem de resolucao do alvo preserva o Passo 0 do `qa-visual` e insere `launch.json` no
  meio.** Fica: (1) argumento explicito → (2) campo `qa_url`/`dev_url`/`app_url` no CLAUDE.md do
  projeto → (3) `.claude/launch.json` → (4) perguntar. O briefing pedia "ordem do qa-visual +
  `.claude/launch.json`"; colocar o `launch.json` **antes** do CLAUDE.md teria reordenado a ordem
  existente. A escolha mantem a ordem do `qa-visual` intacta e trata o `launch.json` como fonte
  adicional: o CLAUDE.md diz o que o dev **declarou como alvo de QA**, o `launch.json` diz o que a
  maquina **consegue subir** — declaracao explicita ganha de inferencia. Depois da resolucao, e
  **sempre**, roda a validacao de host do guardrail.

- **DP-5 — O passe dinamico NAO vira um agente novo.** Poderia ser um `dynamic-tester` no molde do
  `dependency-auditor` da fase-06 do Plano 01. Nao vira, por tres razoes: (a) exigiria os 4 pontos
  de registro do G11 do Plano 01 (`model-profiles.json`, `verify-work.json`, `docs/AGENTS_LIST.md`,
  fixture + `FIXTURE_NAMES`) — custo alto para uma fase Should de 1.5h; (b) um subagente com Bash
  apontando para rede e uma superficie de permissao que o PRD nao pediu e que o guardrail teria que
  defender **de dentro** de um contexto isolado; (c) o procedimento e curto e determinista — cabe em
  um Step da skill, lendo o reference. Se um dia virar agente, o `## Step 2.5` ja e o ponto de
  encaixe.

- **DP-6 — O ponteiro na `/security` entra como secao numerada `## 10`.** O arquivo numera as secoes
  de conhecimento de 1 a 9 e depois passa para secoes de processo (`## Dependency Discipline`,
  `## Checklist...`). Uma `## 10. Verificacao Dinamica no Dev Server Proprio` curta (bloco
  `<constraints>` + ponteiro) segue o idioma do arquivo e ocupa um numero que ninguem mais usa —
  nenhum teste conta secoes do `security/SKILL.md` (verificado: o unico teste que le esse arquivo e
  o `stack-knowledge-tracer-bullet.test.ts`, que checa o bloco `stack-aware-preface`). Ver G7 para a
  adjacencia com o Plano 01.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
