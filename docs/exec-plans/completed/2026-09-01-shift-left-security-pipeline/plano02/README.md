# Plano 02: Pipeline (codigo nasce seguro)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~8h
**Depende de:** Plano 01 (dependencia **soft** — ver Bloqueadores)
**Desbloqueia:** nada dentro desta feature (Plano 03 e independente; roda em paralelo)

---

## O que este plano entrega

O nucleo do PRD: a seguranca deixa de ser saida de auditoria e vira **input** de spec, de plano e do
ciclo TDD. Um PRD de feature de risco carrega o modelo de ameaca antes de qualquer codigo; o plano
carrega criterio de aceite de seguranca por slice; e o RED do TDD carrega o teste de abuso antes da
defesa. As skills de design e de execucao fecham o fio: defaults seguros escolhidos no design, e o
contexto de ameaca chegando ao subagente que escreve a primeira linha.

Este plano e 100% **defensivo** — requisitos de seguranca, criterios de aceite e testes de defesa do
proprio projeto. Nenhum conteudo ofensivo, nenhuma ferramenta apontada para sistema de terceiro.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `bun run generate:manifest` funcional | ja no projeto (`scripts/generate-manifest.js`) | pronto |
| `bun run test` / `bun run harness:validate` verdes | ja no projeto | pronto |
| Teste que enumere secoes do `prd-template.md` | **nao existe** — verificado (ver G8) | N/A |
| Vocabulario OWASP 2025 / ASVS L1 | Plano 01 fases 03 e 05 | pendente — **nao bloqueia** |

**Sobre a dependencia do Plano 01 (soft, e por que e soft).** O PLAN.md marca `Plano 02 depende de
Plano 01`. Na pratica **nenhuma fase deste plano le arquivo produzido pelo Plano 01**: os seis
gatilhos de risco (auth · PII/sensivel · input externo · upload · pagamento · integracao terceira)
saem do PRD §Decisoes D2 e da secao `### Aprovacao Humana Necessaria` de `skills/security/SKILL.md`,
que **ja existe hoje** (linhas 97-109, os 7 gatilhos de aprovacao humana). O que o Plano 01 entrega e
vocabulario mais atual (OWASP 2025, ASVS L1) para as *auditorias* — util, nao pre-requisito.

Consequencia pratica: **este plano pode comecar antes do Plano 01 terminar**. Se o Plano 01 rodar
primeiro e renomear categorias OWASP, a unica coisa a reconciliar e prosa de exemplo — nenhuma
assercao de teste deste plano depende do nome de categoria OWASP.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Secao `## Ameacas & Dados` do `prd-template.md` (fonte dos casos de abuso `AB-*`) | fase-02 (RED), fase-03 (CA-SEC), fase-05 (contexto do executor) |
| Vocabulario unico dos 6 gatilhos de risco | fases 02, 03, 04, 05 — e Plano 03 (guardrail do passe dinamico) |
| `CA-SEC-*` como criterio de aceite first-class | fase-05 e todo plano futuro gerado pelo `/plan-feature` |
| `tests/write-prd-contract.test.ts` (gate novo) | manutencao futura do `write-prd` |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de | MoSCoW |
|------|---------|---------|--------|------------|--------|
| 01 | fase-01-prd-threat-section.md | Secao `## Ameacas & Dados` **condicional** no `prd-template.md` + triagem de risco no `write-prd/SKILL.md` + `tests/write-prd-contract.test.ts` (RF-04, CA-03) | 1.5h | — | **Must** |
| 02 | fase-02-tdd-abuse-red.md | `Abuse-It` — teste de abuso no RED para slice de risco no `tdd-workflow`, modelado sobre o `Prove-It` (RF-05, CA-05) | 2h | — | **Must** |
| 03 | fase-03-plan-feature-security-ac.md | Classificacao de risco do slice + `CA-SEC-*` no `plan-feature` + bloco condicional de seguranca no `fase-template.md` (RF-06) | 1.5h | — | **Must** |
| 04 | fase-04-grill-and-design-defaults.md | Ramos de abuso na semente `### SEGURANCA` do `grill-me` + defaults seguros no `architecture` e no `system-design` (RF-07 parcial) | 2h | fase-01 | Should |
| 05 | fase-05-execute-plan-security-context.md | Contexto de ameaca do slice chegando ao `plan-executor` via `execute-plan` (RF-07) | 1h | fase-02, fase-03 | Should |

---

## Grafo de Fases

```
fase-01 (PRD: Ameacas & Dados)   fase-02 (tdd: Abuse-It)   fase-03 (plan: CA-SEC)
        |                                |                        |
        v                                +-----------+------------+
fase-04 (grill-me + architecture                     |
         + system-design)                            v
                                            fase-05 (execute-plan +
                                                     plan-executor)
```

**Paralelismo possivel:** fases **01, 02 e 03 sao independentes entre si** e podem rodar em 3
branches simultaneas — nenhuma toca o arquivo da outra. fase-04 espera a 01 (herda o vocabulario dos
gatilhos); fase-05 espera 02 e 03 (referencia o `Abuse-It` e o `CA-SEC-*` pelos nomes que elas criam).

**Nao ha sobreposicao de arquivos entre fases** — cada fase edita um conjunto disjunto:

| Fase | Arquivos exclusivos desta fase |
|------|-------------------------------|
| 01 | `skills/write-prd/templates/prd-template.md`, `skills/write-prd/SKILL.md`, `tests/write-prd-contract.test.ts` |
| 02 | `skills/tdd-workflow/SKILL.md` |
| 03 | `skills/plan-feature/SKILL.md`, `skills/plan-feature/templates/fase-template.md` |
| 04 | `skills/grill-me/SKILL.md`, `skills/architecture/SKILL.md`, `skills/system-design/SKILL.md` |
| 05 | `skills/execute-plan/SKILL.md`, `agents/plan-executor.md` |

**O unico arquivo que TODAS tocam e o `plugin-manifest.json`** (via `bun run generate:manifest`).
Isso e conflito garantido entre branches paralelas — ver **G2**, que tem a receita.

---

## TDD Strategy

Este plano edita **skills e templates markdown**, nao codigo de runtime. Ha uma unica excecao com
TDD genuino.

```
Ciclo por fase de SKILL (02, 03, 04, 05) — TDD classico nao se aplica:
1. GREP-RED : rodar os greps de aceite ANTES da edicao; registrar que retornam 0
2. EDITAR   : aplicar a mudanca ADITIVA (nada do conteudo existente sai)
3. GREP-GREEN: os mesmos greps retornam o valor esperado
4. DIFF-GUARD: `git diff --stat` — o numero de linhas REMOVIDAS deve ser 0
               (ou justificado linha a linha na secao de desvios da MEMORY)
5. VERIFY   : bun run test && bun run harness:validate
6. MANIFEST : bun run generate:manifest
```

**Por que estas fases nao tem RED/GREEN.** Nao ha unidade de codigo para exercitar. Um teste que
afirme "o arquivo contem a string X" logo apos eu ter escrito a string X e tautologico no momento em
que nasce — ele nao pode discordar da edicao. O valor de um gate textual so aparece **depois**, como
guarda contra remocao silenciosa, e por isso ele se paga em conteudo que ja tem historico de sumir
(as 7 sementes do grill-me) ou que e estruturalmente fragil (secao condicional). Fora desses casos,
o gate estrutural do repo (`bun run harness:validate` — H1, frontmatter, links resolviveis) ja e a
verificacao, e o criterio de aceite verificavel por maquina vive nos greps.

```
Ciclo da fase 01 — TDD genuino (unica do plano):
1. RED   : escrever tests/write-prd-contract.test.ts; ele FALHA por assertion
           ("secao Ameacas & Dados ausente"), nao por erro de import
2. GREEN : editar prd-template.md + write-prd/SKILL.md; o teste passa
3. VERIFY: bun run test && bun run harness:validate
4. MANIFEST: bun run generate:manifest
```

**Por que a fase-01 ganha um gate e as outras nao.** A secao `## Ameacas & Dados` e **condicional por
design** (PRD §D2): ela e legitimamente ausente da maioria dos PRDs gerados. Conteudo condicional e
exatamente o que uma passada futura de "simplificacao" apaga sem que nada acuse — foi o modo de falha
que justificou o `tests/grill-me-contract.test.ts` (leia o cabecalho dele: a skill era o centro do
pipeline e tinha zero cobertura). O gate custa manutencao, e o preco esta pago com escopo: assere
**contrato** (a secao existe, tem os cinco blocos, e a skill conhece os seis gatilhos), nunca prosa.

**Tracer Bullet deste plano:** N/A — o tracer da feature inteira e a `fase-01` do Plano 01
(`secrets-scanner`), que ja prova o caminho arriscado (codigo rastreado + manifest + gates verdes).
A fase-01 **deste** plano e a mais proxima disso aqui: e a unica que cria um gate novo.

---

## Gotchas Conhecidos

- **G1 — Manifest inverte o veredito do `/update`.** Alterar arquivo rastreado sem rodar
  `bun run generate:manifest` no mesmo PR faz o `/update` reportar o arquivo como "modificado pelo
  usuario" e recusar a atualizacao. **Os 10 arquivos-alvo deste plano estao TODOS rastreados** —
  verificado por grep no `plugin-manifest.json`: `skills/write-prd/templates/prd-template.md`,
  `skills/write-prd/SKILL.md`, `skills/tdd-workflow/SKILL.md`, `skills/plan-feature/SKILL.md`,
  `skills/plan-feature/templates/fase-template.md`, `skills/grill-me/SKILL.md`,
  `skills/architecture/SKILL.md`, `skills/system-design/SKILL.md`, `skills/execute-plan/SKILL.md`,
  `agents/plan-executor.md`. Toda fase tem o passo no checklist.

- **G2 — Branches paralelas colidem no `plugin-manifest.json`, e o conflito NAO se resolve a mao.**
  Fases 01, 02 e 03 rodam em paralelo e cada uma regenera o manifest — os checksums batem no mesmo
  arquivo. Receita: no rebase, aceitar **qualquer** lado do hunk do manifest (ou `git checkout
  --theirs plugin-manifest.json`) e **rodar `bun run generate:manifest` de novo** apos o rebase; o
  arquivo e derivado, nunca fonte. Resolver hunk a hunk produz checksum invalido que passa no git e
  quebra o `/update`.

- **G3 — `bun run lint` NAO EXISTE neste repo.** O `fase-template.md` sugere esse comando no
  checklist; ignore-o ao escrever os checklists das fases. Scripts reais: `bun run test`,
  `bun run typecheck`, `bun run harness:validate`, `bun run generate:manifest`, `bun run parity:audit`,
  e `bun test <caminho>` para um arquivo so. Formatacao roda sozinha via hook PostToolUse
  (`bunx biome check --write`).
  **Cuidado com o falso positivo:** `skills/tdd-workflow/SKILL.md` menciona `bun run lint` no Step 7
  e na secao Verification. Isso e **conteudo da skill sobre o projeto-alvo do usuario**, nao sobre
  este repo — a fase-02 NAO corrige nem remove (regra "nunca diminuir", G4).

- **G4 — Regra "nunca diminuir": toda edicao deste plano e ADITIVA.** Nenhuma linha existente das
  skills pode ser removida. Quando uma linha precisa ganhar itens (ex: a regra do grill-me
  "SEGURANCA ramifica obrigatoriamente se detectar auth, dados sensiveis ou pagamentos"), os tokens
  originais **permanecem** e os novos entram ao lado. O guard mecanico e o passo DIFF-GUARD do TDD
  Strategy: `git diff --stat` com 0 linhas removidas.

- **G5 — `### SEGURANCA` do grill-me e token asserido por teste; renomear quebra o gate.**
  `tests/grill-me-contract.test.ts` roda `skill.includes('### ${SEED}')` para as 7 sementes
  (`ESCOPO`, `DADOS`, `UX`, `EDGE CASES`, `PERFORMANCE`, `SEGURANCA`, `INTEGRACAO`) e tambem
  `includes('## As 7 Sementes da Arvore')`. A fase-04 **estende** a semente SEGURANCA por baixo do
  heading — nunca renomeia, nunca move para outra secao, nunca vira "### SEGURANCA E ABUSO".

- **G6 — A `## Condicao de Parada` do grill-me proibe percentual.** Ha uma assercao que reprova
  qualquer match de `/\d{1,3}\s?%/` **dentro daquela secao**. A fase-04 nao encosta nela; se por
  algum motivo encostar, nao escrever "%" ali (nem em comentario explicando por que o limiar saiu —
  o teste escaneia o texto, nao o codigo).

- **G7 — `skills/lib/__tests__/universal-principles.test.ts` LE os dois templates deste plano.**
  Ele exige: (a) `prd-template.md` contem o literal `Comment Provenance`; (b) `prd-template.md` tem
  `Outcomes` e `indexOf('Outcomes') < indexOf('Mecanismo')` — **primeira ocorrencia de cada palavra
  no arquivo inteiro**; (c) `fase-template.md` contem `Comment Provenance` e um comentario no formato
  `// YYYY-MM-DD (autor):`.
  Consequencia dura para a fase-01: a secao nova entra **depois** de `## Requisitos Nao-Funcionais`
  (bem abaixo de Outcomes/Mecanismo) e **nao pode conter a palavra "Mecanismo"** se algum dia for
  movida para cima. Consequencia para a fase-03: o bloco novo do `fase-template.md` usa comentario
  HTML (`<!-- -->`), o que preserva o comentario `//` existente no topo — nao remover o cabecalho.

- **G8 — Nao existe teste que enumere secoes obrigatorias do `prd-template.md` (risco #1 do PRD:
  RESOLVIDO).** Verificado por busca em `tests/*.test.ts` e `skills/**/*.test.ts`. O unico gate de
  paridade do pipeline e o `tests/grill-me-contract.test.ts`, e ele assere **apenas**
  `skills/grill-me/SKILL.md`. O PRD estimava risco medio para "editar o template quebra o teste de
  secoes obrigatorias"; o risco real e **baixo**. A fase-01 ainda roda `bun run test` primeiro para
  estabelecer baseline verde, mas **nao ha teste de contrato existente a ajustar** — o unico teste
  que toca o template e o `universal-principles.test.ts` do G7.

- **G9 — `fase-template.md` e consumido por TODA fase gerada pelo `/plan-feature`.** Alcance
  altissimo: cada linha adicionada la aparece em centenas de fases futuras, inclusive nas triviais.
  Por isso o bloco de seguranca da fase-03 e **condicional e omitivel**, com comentario HTML dizendo
  quando omitir — mesmo padrao de `## Boundaries` e `## Fluxos UX por Ator` no prd-template.

- **G10 — Estilo obrigatorio de teste de contrato (se a fase-01 criar o gate).** Copiar a forma do
  `tests/grill-me-contract.test.ts`: (a) helper `section()` que **rastreia fences** ` ``` ` para nao
  cortar a secao num heading que vive dentro de bloco cercado; (b) normalizar CRLF com
  `.replace(/\r/g, '')` — repo Windows; (c) mensagem de falha no formato
  `[parity gate "nunca diminuir" — <ID>] <o que sumiu>. <por que importa>. Restaure X, nao remova
  esta assercao.`; (d) **ancorar no CONTEUDO, nao no token do heading** — o proprio arquivo avisa que
  `includes('## Passo 4.5')` casa com `## Passo 4.5 REMOVIDO` e passa vacuamente.

- **G11 — Todo exemplo de secret e sintetico.** PRD §Boundaries: "Nunca commitar secret real (mesmo
  revogado) em fixture ou doc". Nos exemplos de teste de abuso, usar placeholder obvio
  (`token-sintetico-de-teste`), nunca formato que pareca credencial viva.

- **G12 — Conteudo 100% defensivo (fronteira de escopo).** Os "testes de abuso" sao testes de defesa
  contra o **proprio** codigo do projeto, rodando na suite local. Escrever payloads canonicos
  minimos como fixture de validacao e legitimo; escrever catalogo de exploracao, tecnica de evasao ou
  qualquer coisa apontada para sistema de terceiro nao e — e nao e o que o PRD pede. Toda fase repete
  essa fronteira no texto que gera.

- **G13 — Nunca commitar na `main`.** Regra do repo: branch + PR por fase, mesmo em mudanca de doc.

- **G14 — Headings do `prd-template.md` sao ASCII sem acento.** `## Requisitos Nao-Funcionais`,
  `## Decisoes Tecnicas`, `## Solucao`. A secao nova segue: `## Ameacas & Dados`, nao
  `## Ameaças & Dados` (o PRD desta feature escreve com acento em prosa — ver DP-1 abaixo). O teste
  da fase-01 tolera os dois via `/Amea[cç]as & Dados/` para nao reprovar um "conserto" de acento.

- **G15 — Os greps de aceite rodam em Bash (Git Bash), nao em PowerShell.** `grep` nao existe no
  PowerShell; o equivalente e `Select-String`. As fases escrevem os comandos em sintaxe Bash — use a
  ferramenta Bash para executa-los.

- **GT-01 (pre-existente, nao desta feature).** `bun run typecheck` ja acusa erros em
  `lazy-import.test.ts` e `subagent-contract.ts`. Nao e regressao deste plano — comparar o **delta**,
  nao o valor absoluto.

---

## Decisoes de Planejamento (deste README, nao do PRD)

- **DP-1 — Heading ASCII.** A secao entra como `## Ameacas & Dados`, nao `## Ameaças & Dados`.
  Razao: todos os H2 do `prd-template.md` sao ASCII (G14), e o token asserido pelo teste precisa ser
  estavel. O nome com acento continua valido em prosa (PRD §RF-04).
- **DP-2 — A fase-01 CRIA `tests/write-prd-contract.test.ts`.** O briefing deixou a decisao em
  aberto. Decidido criar, pelo argumento do TDD Strategy acima (secao condicional e o que some sem
  ninguem notar), com escopo travado em contrato — 4 grupos de assercao, zero assercao de prosa.
  Efeito colateral bom: a fase-01 passa a ter RED/GREEN genuino num plano que, de resto, e todo
  edicao de markdown.
- **DP-3 — Vocabulario unico dos seis gatilhos.** `auth/authz` · `PII/sensivel` · `input externo` ·
  `upload` · `pagamento` · `integracao terceira`. As cinco fases usam **exatamente** esses termos, na
  mesma ordem, para que grep encontre o conjunto em qualquer arquivo do pipeline. Os sete gatilhos de
  **aprovacao humana** (`skills/security/SKILL.md` §Aprovacao Humana Necessaria) sao uma lista
  diferente e continuam com os sete itens originais — nao fundir as duas listas.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
