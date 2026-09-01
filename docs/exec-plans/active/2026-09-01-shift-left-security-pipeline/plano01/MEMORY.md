# Memoria: Plano 01 — Conhecimento (base das auditorias)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** concluido

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** `isHighEntropySecret` ganhou um **segundo eixo** (`longestSequentialRun`), alem
  do `hasMixedCharset` + limiar que a spec previa. Limiar `MAX_SEQUENTIAL_RUN = 6`.
  - Por que: sem ele a regra de entropia derruba um teste pre-existente (ver BUG-1). Escolhido pelo
    dev entre 3 opcoes; as outras duas (atualizar o teste antigo / supressor por allowlist) foram
    rejeitadas por afrouxar a suite e por tratar sintoma em vez de causa.
  - Impacto: **fase-02 herda os dois eixos.** Toda regra generica nova deve passar pelos dois.
    A margem medida e larga (monotonica 10-26 vs. secret real 1-2), entao 6 nao e valor critico.

- **DI-2 (fase-01):** ordem de escrita dos Passos 4 e 5 invertida — teste do step escrito ANTES da
  implementacao do step.
  - Por que: a spec apresentava GREEN-entao-teste para o step 03, o que quebra TDD estrito.
  - Impacto: nenhum no conteudo final; so a ordem de execucao. Spec das fases seguintes deve
    apresentar RED antes de GREEN tambem para os steps.

- **DI-3 (fase-02):** o guard de dois eixos da DI-1 **generalizou sem ajuste** para as 8 familias
  novas — GREEN fechou 29/29 na primeira tentativa.
  - Impacto: confirma que o eixo de corrida sequencial era a peca faltante certa, nao um remendo
    para o caso do `sk_test_`. Regra generica futura nao precisa de tratamento especial.

- **DI-4 (fase-02):** `ENTROPY_LINE_SUPPRESSORS` implementado como supressor **por linha** (nao por
  match), resolvendo `ssh-rsa` e SRI (`sha384-`).
  - Por que: o dado suprimido e entropia genuina; o que o desqualifica e o CONTEXTO da linha
    (chave publica, hash de integridade), nao a forma da string. Filtrar por match nao teria como
    saber disso.
  - Impacto: verificado — `scanSecrets('ssh-rsa AAAAB3Nza...')` agora retorna `[]`.

- **DI-5 (fase-03):** item de checklist "Findings de audit triados" em `## Supply Chain (A03:2025)`
  escrito **sem** link markdown para `skills/security/references/sca-triage.md` — Opcao (b) do Passo
  4c da spec da fase.
  - Por que: o arquivo ainda nao existe (fase-04 pendente, verificado com `ls` antes de escrever).
    Linkar agora quebraria `harness:validate` (link checker recursivo) assim que este PR abrisse antes
    da fase-04 mergear.
  - Impacto: fase-04 pode adicionar o link ao entregar `sca-triage.md`, sem depender de ordem de merge
    entre as duas fases.

- **Contagem do checklist (fase-05, Passo 1/6):** `## Checklist de Seguranca Minima` tinha **40**
  itens `- [ ]` antes da reorganizacao (piso da regra "nunca diminuir"). Apos aplicar a regua ASVS
  5.0.0 e adicionar as lacunas L1 verificadas: **54** itens (`comm -23 before after` vazio — zero
  perdas; `comm -13` = 14 adicoes, todas revisadas contra o CSV oficial do ASVS).

- **DI-6 (fase-05):** numeracao ASVS corrigida de 4.0.3 (rascunho da spec) para **5.0.0** (versao
  corrente, confirmada via curl em 2026-09-01). A 5.0.0 renumerou E reagrupou capitulos mais fundo do
  que "so o rotulo muda" — ex: V5 (Validation, Sanitization & Encoding) da 4.0.3 virou DOIS capitulos
  na 5.0 (V1 Encoding and Sanitization + V2 Validation and Business Logic); V10 (OAuth and OIDC) e um
  capitulo novo, destacado de Session Management. Mapa aplicado: V2->V6 Authentication, V3->V7 Session
  Management, V4->V8 Authorization, V5->V1 Encoding and Sanitization, V7->V16 Security Logging and
  Error Handling, V8->V14 Data Protection, V9->V12 Secure Communication, V12->V5 File Handling,
  V14->V13 Configuration, Criptografia->V11 Cryptography, Dependencias->V15 Secure Coding and
  Architecture (3rd-party component remediation, V15.1.1/V15.2.1).
- **DI-7 (fase-05):** item "Refresh token com rotacao; reuso detectado invalida a familia" do rascunho
  da spec estava sob "V3 Gestao de Sessao", mas o requisito real (**V10.4.5, L1**) vive no capitulo
  **V10 — OAuth and OIDC**, que o rascunho nem listava. Texto do requisito verificado como preciso: a
  frase completa de V10.4.5 ("refresh token rotation may be used... must invalidate the refresh token
  after usage, and revoke all refresh tokens for that authorization if an already used and invalidated
  refresh token is provided") cobre EXATAMENTE rotacao + revogacao-em-familia — so a localizacao de
  capitulo mudou, o conteudo do item ficou como estava.
- **DI-8 (fase-05):** item "Campos sensiveis excluidos das respostas de API" do rascunho estava sob
  "V4 Controle de Acesso", mas o L1 real e **V15.3.1** (Secure Coding and Architecture / Defensive
  Coding: "only returns the required subset of fields from a data object"), nao V4/V8 Authorization.
  Realocado para V15 no checklist final.
- **DI-9 (fase-05):** 3 dos 4 itens propostos para "V7 — Tratamento de Erro e Logging" (erro generico
  ao cliente, eventos de seguranca logados, nenhum log com dado sensivel) + o item "Modo debug
  desabilitado" (V13) sao **L2 no ASVS 5.0.0 real, nao L1** como o rascunho da spec assumia — o
  capitulo V16 (Security Logging and Error Handling) tem **ZERO requisitos L1** (contagem no CSV
  oficial, ver GT-7). Mantidos no checklist — a propria spec ja fixava os greps desses itens como
  criterio de aceite obrigatorio, e o conteudo fecha uma lacuna pratica real ligada a A10:2025 (Top
  10) — mas rotulados honestamente como L2 na nota de fechamento apos `</checklist>`, em vez de
  reivindicar L1 sem base.

---

## Premissas Validadas

- **Premissa #4 do PRD (licenca gitleaks) — CONFIRMADA em 2026-09-01 (fase-02).** `gitleaks/gitleaks`
  e **MIT**, Copyright 2019 Zachary Rice, verificado direto no `LICENSE` do repositorio. Portados os
  **conceitos/padroes** das familias, nao o TOML literal.
- **Premissa #5 do PRD (licenca OWASP) — CONFIRMADA em 2026-09-01 (fase-03), com correcao.** O PRD
  assumia CC BY-SA; a licenca real (rodape de `https://owasp.org/Top10/2025/`) e **CC BY 3.0 Unported**
  ("© Copyright 2021-2025 - OWASP Top 10 Team ... Creative Commons Attribution 3.0 Unported License") —
  Attribution, sem clausula ShareAlike. Nao restringe o port: a estrategia adotada (reescrita propria
  dos conceitos + atribuicao via `source_url` no frontmatter, sem copiar texto literal) satisfaz as
  duas licencas igualmente. Fase-05 nao precisa reconfirmar, mas deve citar a mesma URL.
- **Fonte verificada (fase-03, Passo 2).** curl (HTTP 200, rede nao bloqueada) em
  `https://owasp.org/Top10/2025/`, `.../A01_2025-Broken_Access_Control/` e
  `.../A03_2025-Software_Supply_Chain_Failures/`, em 2026-09-01. Lista A01..A10 2025 confirmada
  **identica** ao rascunho do Passo 3 (mesma ordem, mesmos nomes, os 3 renames e a categoria nova
  A10). A01 confirma absorcao de SSRF no proprio texto ("Notable CWEs included are ... CWE-918
  Server-Side Request Forgery (SSRF)"). CWEs de A03 (secao "List of Mapped CWEs" da pagina): 477,
  1035, 1104, 1329, 1357, 1395 (6 no total, bate com "CWEs Mapped: 6" da score table) — ver GT-5 sobre
  um typo na propria pagina OWASP nesse ponto.
- **Premissa #2 do PRD (endpoints EPSS e CISA KEV respondem) — CONFIRMADA em 2026-09-01 (fase-04).**
  Ambos HTTP 200 via curl. EPSS (`https://api.first.org/data/v1/epss?cve=CVE-2021-44228`): shape
  `{ data: [{ cve, epss, percentile, date }] }` — **`epss` e `percentile` vem como STRING**
  (`"0.999990000"`), nao numero; `parseFloat()` obrigatorio antes de comparar com limiar (ver GT-6).
  CISA KEV (`https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`):
  ~1.6 MB, 1687 entradas (`catalogVersion: "2026.08.31"`), campos por entrada incluem `cveID`,
  `dateAdded`, `dueDate`, `knownRansomwareCampaignUse` (`"Known"`/`"Unknown"`) e `cwes[]` — o campo
  `knownRansomwareCampaignUse` e sinal extra util, nao previsto no PRD original.
- **Versao do ASVS confirmada em 2026-09-01 (fase-05): 5.0.0.** Release LIVE desde Global AppSec EU
  Barcelona 2025, confirmado via curl (HTTP 200) em
  `https://owasp.org/www-project-application-security-verification-standard/` (texto da propria pagina:
  "5.0.0 is released LIVE..."; `latest-stable-version---500`). Numeracao dos 17 capitulos (V1..V17)
  extraida do CSV oficial em
  `https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv`
  (345 requisitos, coluna `L` = nivel 1/2/3 por requisito) — fonte estruturada, nao a pagina HTML
  solta, para nao repetir o erro de confiar em prosa nao-estruturada (mesmo espirito do GT-4/GT-5).
- **Licenca ASVS confirmada em 2026-09-01 (fase-05): CC BY-SA 4.0**
  (`https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/LICENSE.md`) — **diferente** da licenca do
  Top10 (CC BY 3.0, sem ShareAlike, confirmada na fase-03). Mesma organizacao (OWASP), sub-projetos
  distintos, licencas distintas. A Premissa #5 do PRD ("licencas OWASP CC BY-SA") estava certa para o
  ASVS especificamente, mas errada para o Top10 (que a fase-03 ja corrigiu para CC BY 3.0). Nao
  restringe o port: reescrita propria + atribuicao satisfaz ambas as licencas.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1 (fase-01):** a regra `high-entropy`, implementada **literalmente conforme a spec**, derruba
  o teste pre-existente `NAO confunde sk_test_ com sk_live_`.
  - Sintoma: `scanSecrets('STRIPE_TEST=sk_test_1234567890ABCDEFGHIJKLMN')` passou a retornar 1 match.
    Suite: 603 pass / 1 fail (baseline era 597/0).
  - Causa raiz: **entropia de Shannon mede DIVERSIDADE de caracteres, nao imprevisibilidade.**
    Sequencias monotonicas (`1234567890`, `ABCDEFGHIJKLMN`) maximizam diversidade sem serem
    aleatorias. Medicao no repo: `abc..xyz0123456789` (zero aleatoriedade) = **5.17 bits/char**,
    ACIMA do secret real aleatorio = **5.00**. Ou seja, o falso positivo pontua mais alto que o
    verdadeiro positivo — **nenhum ajuste de limiar separa os dois**.
  - Fix: guard de corrida sequencial como eixo independente (DI-1) + teste de regressao com um
    caso de charset misto (`abcdefghij0123456789ABCDEFGHIJ`, 4.91 bits/char) que so o guard barra.
  - Fase afetada: fase-01 (spec corrigida no proprio arquivo da fase).

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** teste de guarda pode passar pelo motivo errado. A primeira versao do teste de
  regressao do BUG-1 usava `abcdefghijklmnopqrstuvwxyz0123456789`, que passou de imediato — mas por
  falhar em `hasMixedCharset` (nao tem uppercase), nao pela corrida sequencial. Era um RED falso.
  - Impacto: ao testar um guard que e o **segundo** de varios filtros, a fixture precisa passar por
    todos os filtros anteriores, senao o teste e vacuo. Vale para todo supressor da fase-02.

- **GT-2 (fase-01):** `ssh-rsa AAAAB3Nza...` continua sinalizado como `high-entropy` mesmo com o
  guard — corretamente, do ponto de vista da metrica: e base64 de chave real, entropia genuina. Nao
  e falso positivo de *metrica*, e de *semantica* (chave PUBLICA nao e secret).
  - Impacto: confirma que a fase-02 precisa dos supressores por linha — o eixo entropia+sequencia
    nao resolve essa classe, por design.

- **GT-3 (fase-01):** a premissa GT-01 do README esta **desatualizada**. `bun run typecheck` retorna
  **exit 0, zero erros** — os erros pre-existentes em `lazy-import.test.ts` e `subagent-contract.ts`
  nao se manifestam mais. Fases seguintes podem exigir typecheck limpo em absoluto, nao so delta.
  - Reconfirmado na fase-02.

- **GT-4 (fase-02):** os greps de checklist escritos nas specs das fases **contam errado** neste
  arquivo. `grep -c "pattern:"` inclui a linha `readonly pattern: RegExp` do `type SecretRule`, e o
  grep de flag `g` do checklist nao tolera o sufixo ` },` de cada entrada do array.
  - Impacto: **nao confiar no numero do grep como criterio de aceite** sem conferir o que ele casa.
    Defeito pre-existente desde a fase-01, herdado pelas specs seguintes. Nas fases 03-06, validar o
    grep antes de usa-lo como gate (o mesmo espirito do GT-1: verificacao que passa pelo motivo
    errado nao e verificacao).

- **GT-5 (fase-03):** a propria pagina OWASP `A03_2025-Software_Supply_Chain_Failures` tem um typo na
  secao estruturada "List of Mapped CWEs" — mostra **CWE-447** rotulado como "Use of Obsolete
  Function", mas o paragrafo "Background" da mesma pagina cita corretamente **CWE-477** para essa
  descricao. Confirmado por consulta direta a `cwe.mitre.org`: CWE-477 = "Use of Obsolete Function";
  CWE-447 = "Unimplemented or Unsupported Feature in UI" (categoria nao relacionada).
  - Impacto: quem for citar CWEs de A03 textualmente (ex: fase-04 sca-triage, fase-06
    dependency-auditor) deve usar **477**, nao 447, e nao confiar cegamente na secao estruturada de
    "Mapped CWEs" do site sem checar a prosa/MITRE — mesma logica do GT-4, agora aplicada a fonte
    externa em vez de a um grep interno.

- **GT-6 (fase-04):** a API EPSS (`api.first.org/data/v1/epss`) retorna `data[0].epss` e
  `data[0].percentile` como **STRING JSON** (`"0.999990000"`), nao como numero nativo.
  - Impacto: qualquer consumidor (ex: fase-06 `dependency-auditor`) que compare direto com um
    limiar numerico (`epss >= 0.10`) sem `parseFloat()` corre risco de comparacao string-vs-numero
    silenciosamente errada. Documentado em `references/sca-triage.md` Passo 2. Mesmo espirito do
    GT-4/GT-5: verificar o shape real antes de assumir o tipo.

- **GT-7 (fase-05):** o capitulo **V16 (Security Logging and Error Handling)** do ASVS 5.0.0 tem
  **ZERO requisitos L1** — o capitulo inteiro e L2/L3. O mesmo vale para V17 (WebRTC). Confirmado por
  contagem programatica no CSV oficial (agrupando por `chapter_id` onde `L == "1"`), nao por leitura
  visual da pagina.
  - Impacto: quem for citar "isto e L1 do ASVS" para qualquer item de error-handling/logging (ou
    qualquer capitulo) deve contar no CSV estruturado antes de assumir a partir da existencia do
    capitulo ou de uma leitura parcial. Mesma familia de erro do GT-4/GT-5 — nao confiar em estrutura
    aparente sem validar contra os dados reais.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01):** spec da fase corrigida durante a execucao (adicao do `longestSequentialRun`).
  - Motivo: BUG-1. Seguiu a regra do `execute-plan` — plano errado se corrige NO PLANO, nao se
    improvisa no codigo. O arquivo `fase-01-*.md` tem o snippet corrigido e uma nota de correcao.
  - Aprovado pelo dev em sessao (escolha entre 3 opcoes).

- **DEV-2 (fase-01):** `hooks/hooks.json` e `plugin-manifest.json` ja apareciam como modificados
  ANTES desta execucao (estado inicial da sessao). Nao sao desta fase — nao atribuir.

- **DEV-3 (fase-04):** branch dedicada e commit da fase NAO foram feitos, apesar do Passo 1 da spec
  (`git checkout -b docs/sca-triage-reference`) e da G13 do plano (branch + PR por fase, mesmo em
  doc).
  - Motivo: instrucao explicita do prompt de execucao desta fase — "Branch ativa:
    feat/secrets-scanner-tracer — continue nela. NAO crie branch, NAO va para main" e "NAO commite".
    Instrucao do orquestrador tem precedencia sobre a spec da fase quando as duas divergem.
  - Impacto: as mudancas da fase-04 (`sca-triage.md` novo, pointer da secao 9 no `SKILL.md`,
    `plugin-manifest.json` regenerado, mais este MEMORY.md) ficam **nao commitadas** na working tree
    de `feat/secrets-scanner-tracer`, misturadas com o estado ja commitado das fases 01-03 nesse
    mesmo branch (`5276d33`, `1c2dc19`, `7a2a627`). Quem retomar o plano precisa decidir: commit
    separado so da fase-04, ou incorporar ao proximo commit da trilha. Conteudo em si esta completo
    e todas as verificacoes (Passo abaixo) passaram — o que falta e so o commit/PR.
  - **Resolvido:** confirmado em 2026-09-01 (inicio da fase-05) via `git log --oneline -- skills/security/references/sca-triage.md`
    que o commit `d2569a1 feat(security): adiciona procedimento de triagem SCA com EPSS e CISA KEV`
    incluiu todo o conteudo da fase-04 (working tree estava limpa ao iniciar a fase-05). O commit
    aconteceu apos este DEV-3 ter sido escrito.

- **DEV-4 (fase-05):** a tabela "rascunho" de capitulos da propria spec da fase (Passo 2) tinha 2
  imprecisoes alem da simples renumeracao 4.0.3->5.0.0: (1) o item de refresh-token-rotation pertence
  ao capitulo V10 OAuth and OIDC, que o rascunho nem listava (ver DI-7); (2) 4 dos itens propostos
  como "lacunas L1" (3 de error/logging + modo debug) sao L2 no ASVS 5.0.0 real, nao L1 (ver DI-9,
  GT-7). Corrigido durante a execucao com base em fonte estruturada (CSV oficial do ASVS), nao na
  pagina HTML solta que a spec citava. Nenhuma remocao de conteudo — apenas realocacao de capitulo e
  rotulagem honesta de nivel na nota apos `</checklist>`.
  - Aprovado implicitamente pela propria estrutura da fase (Passo 2 ja avisava "a numeracao pode
    divergir... confirmar na fonte"); nenhuma decisao humana adicional foi necessaria por estar dentro
    do escopo de verificacao que a fase pede.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 3 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Plano 01 FECHADO em 2026-09-01 — 6/6 fases. Branch `feat/secrets-scanner-tracer`, 9 commits.**

### Vocabulario OWASP — use este, o de 2021 esta morto (Plano 02 fase-01)

Edicao confirmada na fonte: **Top 10 2025**. A numeracao mudou de verdade, nao so de ordem:
`A01` Broken Access Control **inclui SSRF** (nao existe mais categoria propria de SSRF) ·
`A02` Security Misconfiguration · `A03` **Software Supply Chain Failures** (nova) ·
`A04` Cryptographic Failures · `A05` **Injection** (era #1 em 2021) · `A06` Insecure Design ·
`A07` Authentication Failures · `A08` Software or Data Integrity Failures ·
`A09` Security Logging and Alerting Failures · `A10` **Mishandling of Exceptional Conditions** (nova).

Os gatilhos de risco da secao "Ameacas & Dados" (Plano 02 fase-01) devem usar esses rotulos.
Atencao: **A10 e nova e mapeia direto para "caminho de excecao que ignora checagem de autorizacao"** —
e um caso de abuso obvio para o `Abuse-It` do Plano 02 fase-02.

### ASVS — a versao e 5.0.0, nao 4.0.3 (Plano 02 fase-03)

O rascunho do plano usava a numeracao 4.0.3. **A 5.0.0 reagrupou capitulos**, nao so renumerou
(o V5 da 4.0.3 virou V1+V2; OAuth/OIDC ganhou capitulo proprio). O checklist da `/security` ja esta
sob os 13 capitulos da 5.0.0. Qualquer criterio de aceite de seguranca por slice (Plano 02 fase-03)
deve citar a numeracao 5.0.0 — conferir contra o CSV oficial, que tem coluna de nivel; a pagina HTML
nao tem. **Quatro itens do checklist sao L2, nao L1, e estao rotulados como tal** — nao "promova"
para L1 sem conferir.

### dependency-auditor — contrato para o Plano 03 fase-02 ler

Agente: `agents/dependency-auditor.md`. `payload.domain_status` usa o enum
`"clean" | "vulnerabilities_found" | "critical_issues"`. Chave de config: `config.auditors.dependencies`
(em `config/verify-work.json`), e o relatorio do `verify-work` ja tem a linha `Dependencies:`.
O passe dinamico do Plano 03 deve seguir esse mesmo formato de linha no relatorio.

### secrets-scanner — parametros finais

`ENTROPY_MIN_BITS_PER_CHAR = 4.0`, `MAX_SEQUENTIAL_RUN = 6`, candidato `[A-Za-z0-9+/=_-]{20,}`.
15 regras no total. `high-entropy` e SEMPRE a ultima do array. Supressao em dois niveis:
`validate` por match (charset + corrida sequencial) e `ENTROPY_LINE_SUPPRESSORS` por linha
(`ssh-rsa`, SRI `sha384-`). **Regra generica nova precisa passar pelos dois eixos** — ver DI-1/BUG-1.

### Premissas do PRD — ambas fechadas, uma COM correcao

- **#4 gitleaks:** MIT confirmada (Copyright 2019 Zachary Rice). Port de conceito, nao de TOML.
- **#5 OWASP:** **CC BY 3.0, nao CC BY-SA** como o PRD supunha. A estrategia (reescrever + atribuir
  via `source_url`) satisfaz as duas, entao nada mudou na pratica — mas o PRD esta impreciso.

### Divida tecnica achada, NAO corrigida (fora de escopo — candidata a TODO)

- **ajv 6 vs 7 em `skills/lib/subagent-contract.ts`:** o codigo mapeia erros via `instancePath`
  (API ajv 7+), mas o runtime instalado e `ajv@6.15.0`, que expoe `dataPath`. Efeito: violacoes de
  schema **falham corretamente**, mas a mensagem final nao cita o nome do campo (`path: ''`).
  Afeta TODOS os contratos v2, nao so o fixture novo. Diagnostico confirmado inspecionando o ajv cru.
- **`skills/anti-vibe-review/SKILL.md`:** `generate:manifest` emite warning de frontmatter malformado.
  Pre-existente, nao tocado por este plano.

### Armadilha de metodo que custou tempo (vale para os dois planos seguintes)

`bun run test` roda em **2 lotes** (limite de linha de comando no Windows). O numero que aparece no
fim do output e **so o lote 2**. Total real: **1858 pass / 0 fail em 267 arquivos**. Ler so o ultimo
numero da uma leitura errada do baseline — capture os dois lotes.

E o **GT-4**: os greps escritos como criterio de aceite nas specs contam errado com frequencia.
Sempre confira O QUE o grep casa antes de aceita-lo como gate (mesmo espirito do GT-1: verificacao
que passa pelo motivo errado nao e verificacao).

---

<!-- Atualizado automaticamente durante execucao -->
