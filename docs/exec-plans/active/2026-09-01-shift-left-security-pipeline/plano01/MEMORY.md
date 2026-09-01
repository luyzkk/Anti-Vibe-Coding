# Memoria: Plano 01 — Conhecimento (base das auditorias)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** em andamento

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

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 4 |
| Fases com desvio | 2 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Preencher ao fechar o plano. O que o Plano 02 e o Plano 03 esperam encontrar aqui:
- Edicao e numeracao do OWASP Top 10 efetivamente confirmadas na fase-03 (o Plano 02 fase-01 usa
  esse vocabulario nos gatilhos de risco da secao "Ameacas & Dados")
- Versao do ASVS confirmada na fase-05 (4.0.3 vs 5.0) e o mapa categoria -> capitulo aplicado
- Nome final e enum de `payload.domain_status` do dependency-auditor (o Plano 03 fase-02 le esse
  status no relatorio do verify-work)
- Limiar de entropia e lista final de supressores do secrets-scanner (referencia para qualquer
  regra nova futura)
- Se as premissas #4 (licenca gitleaks MIT) e #5 (licencas OWASP CC BY-SA) foram confirmadas ou
  se alguma restringiu o port
-->

---

<!-- Atualizado automaticamente durante execucao -->
