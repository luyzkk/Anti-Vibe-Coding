# Limpeza Final com Ferramenta em CI (ZAP + Trivy) — Referencia Detalhada

> A ultima camada do shift-left: o que **ferramenta** confirma depois que o agente ja fez o grosso.
> O PRD decidiu (Decisao 1) que o agente faz analise white-box dirigida e a ferramenta fecha o fim —
> este documento e o "fim". Nao e paridade com ZAP full scan nem com Snyk, e nao tenta ser.

## A divisao de trabalho

O agente e a ferramenta erram em direcoes opostas, e e por isso que as duas camadas existem.

| | Agente (`/verify-work`) | Ferramenta (este documento) |
|---|---|---|
| Onde roda | dev server local, Step 2.5 | ambiente deployado + CI |
| Como decide | le o codigo, sabe onde atacar | banco de dados, cobertura exaustiva |
| Forte em | julgamento, reachability, contexto do diff | volume, CVE conhecida, regressao continua |
| Fraco em | nao tem banco de CVE, nao varre o que nao mudou | nao entende intencao, acha o que nao importa |

O agente nunca vai ter o banco de vulnerabilidade do Trivy. O Trivy nunca vai saber que aquele
endpoint especifico nao valida ownership. Rodar so um dos dois deixa um buraco previsivel.

## O que cada workflow cobre

Os dois templates ficam em `skills/init/assets/static/.github/workflows/`.

### `trivy.yml` — CVE de imagem base e IaC

Fecha exatamente a lacuna que a triagem SCA declara nao cobrir (ver `sca-triage.md`, secao
`## Limites honestos`: "Nao faz scanning de container ou IaC"). Dois jobs:

- **`iac`** — `scan-type: config` sobre o repo inteiro. Pega Dockerfile, Terraform, Kubernetes,
  CloudFormation. Roda em todo PR: e rapido e local, entao vale como gate de verdade.
- **`image`** — `scan-type: image` sobre a imagem publicada. **Pulado por padrao**: so liga quando a
  variavel de repo `TRIVY_IMAGE_REF` existe, porque a maioria dos projetos nao publica imagem.

Resultado sobe como SARIF para a aba Security (exige `security-events: write`). O `schedule` semanal
existe porque **CVE nova aparece sem o codigo mudar** — um scan que so roda em PR nao ve isso.

### `zap-baseline.yml` — passive scan contra o ambiente deployado

O Step 2.5 do `/verify-work` ja faz passive-scan-lite contra o dev server. Este workflow cobre o que
aquele nao alcanca: o ambiente real, com o edge, o CDN e os headers de producao no caminho.

**Nao roda em push nem em PR, de proposito.** Ver a proxima secao.

## A autorizacao, que nao e detalhe de config

O guardrail do Step 2.5 (CA-06, dealbreaker) so autoriza `localhost` e afins. Em CI o alvo e
necessariamente **externo**, ou seja, o workflow opera fora da allowlist que protege o passe local.
O contrato que substitui a allowlist:

1. O alvo mora na **variavel de repo `ZAP_TARGET_URL`**, nao no arquivo. So quem tem write no repo
   define variavel — a autorizacao vira uma acao com dono e trilha de auditoria.
2. Sem a variavel, o job **falha em vez de adivinhar**. Um scanner que escolhe alvo sozinho e o
   comportamento que o guardrail existe para impedir.
3. O disparo e `workflow_dispatch` ou `schedule`, nunca `push`/`pull_request`. Scan contra host
   externo e ato deliberado, nao efeito colateral de abrir PR.

Escanear host de terceiro sem autorizacao e ilegal em varias jurisdicoes, e o formato do arquivo nao
muda isso. A variavel de repo e onde a autorizacao humana fica registrada.

## Instalacao — opt-in, nao pelo `/init`

Os workflows **nao** entram no `FILES_TO_COPY` de `skills/init/lib/install-gh-files.ts`. Se
entrassem, todo projeto onboardado ganharia um ZAP que falha por nao ter alvo e um scan de imagem
sem imagem — e a primeira coisa que o time faria seria apagar os dois.

Instale com `scripts/security-tooling-wizard.sh`, que cuida dos passos que so o humano pode dar:
autorizar o alvo, capturar credencial de staging e de registry, e ligar o Code Scanning.

## De relatar para bloquear

Ambos os templates nascem **reportando**, nao bloqueando. Isso e uma escolha, e ela tem prazo.

| Arquivo | Default | Quando apertar |
|---|---|---|
| `zap-baseline.yml` | `fail_action: false` | depois de triar a primeira rodada e escrever `.zap/rules.tsv` |
| `trivy.yml` | `exit-code: '0'` | quando Code Scanning + branch protection estiverem ligados, ou vire `'1'` se nao houver GHAS |

Baseline sem tuning acusa muito alerta informativo: um gate que falha sempre e desligado na primeira
sexta-feira. Mas um gate que nunca falha tambem nao e gate — e teatro. Se ninguem apertou depois de
duas rodadas, o honesto e admitir que o scan e informativo e parar de chama-lo de gate.

## Limites honestos

- **Baseline nao e full scan.** Passive scan nao envia payload de ataque: nao acha SQLi, nao acha
  IDOR, nao acha logica de negocio quebrada. Spider exaustivo e active scan continuam fora.
- **Trivy acha CVE conhecida.** Vulnerabilidade no codigo do proprio projeto nao e problema dele —
  isso e o auditor de seguranca do `/verify-work`.
- **SARIF sem Code Scanning nao aparece.** Em repo privado sem GHAS, o upload falha silenciosamente
  como visibilidade; use `exit-code: '1'` para nao perder o achado.
- **`TRIVY_USERNAME`/`TRIVY_PASSWORD` valem para todo registry** que o scan encontrar, nao so o seu
  (doc do Trivy). Se a imagem puxar camada de outro registry, a credencial viaja junto.
- **Nada disto cobre o que nao mudou.** Estes workflows olham o repo inteiro, mas o `/verify-work`
  olha so o diff — vulnerabilidade pre-existente no codigo do projeto continua invisivel ate o
  full-sweep (RF-12) existir.

## Fontes

- OWASP ZAP Baseline Action — https://github.com/zaproxy/action-baseline
- Trivy Action — https://github.com/aquasecurity/trivy-action
- Trivy, autenticacao em registry privado — https://trivy.dev/latest/docs/advanced/private-registries/

Nota de rastreio: as `permissions` do job do ZAP (`issues: write`) sao **inferencia** a partir do
comportamento documentado da action (ela abre/atualiza issue), nao citacao — o README dela nao
declara permissions. Se voce usar `allow_issue_writing: false`, a permissao nao e necessaria.
