# Triagem de Vulnerabilidades de Dependencias (SCA) — Referencia Detalhada

> Procedimento operacional. A secao 9 da skill `/security` da a arvore de decisao; este documento
> da os comandos, os campos e o formato do registro — o que fazer entre rodar o audit e escrever a
> decisao final.

## Quando usar

Sempre que `bun audit` (ou equivalente da stack) apontar um finding novo, antes de decidir
atualizar, adiar ou ignorar. Serve tambem como checklist de revisao periodica dos findings ja
adiados (campo `revisar em` do Passo 5).

Nao serve para: avaliar se vale a pena adotar uma dependencia nova — isso e o `## Dependency
Discipline` da skill `/security`. Nem para scanning de container ou IaC — ver `## Limites honestos`.

---

## Passo 1 — Inventario: rodar o audit da stack

Comando por stack, sempre com saida em JSON — o consumidor deste procedimento (o agente
`dependency-auditor`, ou voce mesmo lendo o output) precisa parsear campos, nao ler texto solto:

```bash
bun audit --json                      # Bun (padrao deste projeto)
npm audit --json                      # Node/npm
pnpm audit --json                     # pnpm
pip-audit -f json                     # Python
bundle audit check --update           # Ruby (saida texto; sem --json nativo)
osv-scanner --format json -r .        # multi-stack, CLI externo OPCIONAL — ver Limites honestos
```

Para cada finding, registrar:

- pacote e versao instalada
- identificador (CVE e/ou GHSA — audits do ecossistema JS as vezes so trazem GHSA; nem todo GHSA
  tem CVE espelhado)
- severidade declarada pelo audit (low / moderate / high / critical)
- versao com fix disponivel, se houver
- **runtime vs dev-only**: `bun pm ls --prod` lista so o que vai pra producao — se o pacote nao
  aparece ali, e dev-only. Alguns audits (`npm audit --json`) tambem expoem isso direto no campo
  `via[].dependency` cruzado com `devDependencies` do `package.json`.

---

## Passo 2 — Enriquecer: EPSS e CISA KEV

O audit sozinho da a severidade CVSS — o quanto o problema DOI, na teoria. Isso nao diz se alguem
esta de fato explorando. Dois feeds abertos cobrem essa lacuna, e sao o motivo pelo qual este passo
substitui boa parte do que um produto pago (Snyk) cobra:

**EPSS — probabilidade de exploracao nos proximos 30 dias:**

```bash
curl "https://api.first.org/data/v1/epss?cve=CVE-2021-44228"
```

Endpoint verificado em 2026-09-01 (HTTP 200). Shape real da resposta:

```json
{
  "status": "OK", "status-code": 200, "version": "1.0", "access": "public",
  "total": 1, "offset": 0, "limit": 100,
  "data": [
    { "cve": "CVE-2021-44228", "epss": "0.999990000", "percentile": "1.000000000", "date": "2026-09-01" }
  ]
}
```

Ler `data[0].epss` (0..1) e `data[0].percentile` (posicao relativa no universo de CVEs com score).
**Atencao ao tipo:** os dois campos vem como STRING (`"0.999990000"`), nao numero — aplicar
`parseFloat()` antes de comparar com qualquer limiar. `total: 0` significa que o CVE ainda nao tem
score EPSS (comum em CVEs muito recentes) — tratar como dado ausente, nunca como score zero.

**CISA KEV — exploracao ATIVA confirmada, nao previsao:**

```bash
curl -o kev.json "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
grep -A13 '"cveID": "CVE-2021-44228"' kev.json
```

Endpoint verificado em 2026-09-01 (HTTP 200). **O feed e grande** (~1.6 MB, 1687 entradas nesta
data — campo `count` no topo do JSON) — baixar para arquivo e buscar o CVE especifico com `grep`;
nunca carregar o JSON inteiro no contexto do agente nem colar no relatorio. Shape real (topo do
arquivo + uma entrada completa, a mesma usada como exemplo acima):

```json
{
  "catalogVersion": "2026.08.31",
  "dateReleased": "2026-08-31T14:55:13.3856Z",
  "count": 1687,
  "vulnerabilities": [
    {
      "cveID": "CVE-2021-44228",
      "vendorProject": "Apache",
      "product": "Log4j2",
      "vulnerabilityName": "Apache Log4j2 Remote Code Execution Vulnerability",
      "dateAdded": "2021-12-10",
      "dueDate": "2021-12-24",
      "knownRansomwareCampaignUse": "Known",
      "cwes": ["CWE-20", "CWE-400", "CWE-502", "..."]
    }
  ]
}
```

Se o CVE aparece em `vulnerabilities[].cveID`, esta no KEV — motivo suficiente para tratar como
urgente, independente do CVSS (ver matriz do Passo 4). `knownRansomwareCampaignUse: "Known"` (em vez
de `"Unknown"`) e um sinal ainda mais forte: alem de explorado, ja documentado em campanha de
ransomware — isso reforca o prazo, nao muda a decisao em si.

A distincao que importa, porque e onde a triagem manual costuma errar:
**CVSS mede o quanto doeria; EPSS estima a chance de acontecer; KEV afirma que ja esta acontecendo.**
Um CVSS 9.8 com EPSS 0.0004 e fora do code path e menos urgente que um CVSS 6.5 no KEV.

Se qualquer um dos dois endpoints estiver inacessivel neste momento, nao interromper a triagem:
marcar a linha como `exploracao nao verificada` no registro do Passo 5 e seguir — ver `## Modo
offline` abaixo.

---

## Passo 3 — Reachability: a funcao vulneravel e chamada?

Tres perguntas, nesta ordem — e onde o agente supera o scanner puro, porque um scanner le manifest
de dependencias, nao codigo:

```bash
# 1. O pacote e importado?
grep -rn "from ['\"]<pacote>['\"]\|require(['\"]<pacote>['\"])" --include="*.ts" --include="*.js" src/

# 2. A funcao/modulo citado no advisory e usado?
grep -rn "<simbolo do advisory>" src/

# 3. O call path chega a entrada externa?
#    Tracar do uso ate um handler de rota / job / CLI. Se so aparece em teste ou script de build,
#    e dev-only na pratica — mesmo que o audit tenha classificado o pacote como runtime dependency.
```

Classificar em `reachable` / `not-reachable` / `unknown`. **`unknown` e resposta valida** — melhor
declarar reachability desconhecida do que afirmar `not-reachable` sem ter tracado o call path ate o
fim. Uma vulnerabilidade em codigo morto (nunca importado, ou importado mas nunca chamado no path
que recebe input externo) tem risco real zero — mas so depois de confirmar que e mesmo morto.

---

## Passo 4 — Matriz de decisao

| KEV | EPSS | Reachability | Escopo | Acao | Prazo |
|---|---|---|---|---|---|
| sim | qualquer | qualquer | runtime | Corrigir agora — bloqueia release | < 24h |
| sim | qualquer | qualquer | dev-only | Corrigir no ciclo — nao bloqueia release | < 7d |
| nao | alto (>= 0.10 ou percentil >= 0.90) | reachable | runtime | Prioridade alta — bloqueia release | < 72h |
| nao | alto | not-reachable / unknown | runtime | Proximo release | < 30d |
| nao | alto | qualquer | dev-only | Backlog com data de revisao | < 30d |
| nao | baixo (< 0.01) | reachable | runtime | Proximo release | < 30d |
| nao | baixo | not-reachable | dev-only | Backlog com data de revisao | < 90d |
| **nao verificado** (offline) | — | reachable | runtime | Tratar como alto — fail-safe para cima | < 72h |
| **nao verificado** (offline) | — | not-reachable / unknown | qualquer | Backlog + reavaliar quando houver rede | < 30d |

Sem fix disponivel em qualquer linha da tabela: a acao vira **deferral documentado** (Passo 5),
nunca dismissal silencioso.

`EPSS >= 0.10` (10% de chance de exploracao em 30 dias) e o corte operacional usual, aproximadamente
o top 5% do universo de CVEs com score. Isso e **heuristica configuravel, nao lei fisica** — a
triagem registra qual limiar usou (Passo 5) em vez de fingir uma precisao que o dado nao tem.

O fail-safe das duas ultimas linhas e sempre para CIMA: ausencia de dado (offline) em item runtime +
reachable nunca vira "baixo risco" por omissao — e o unico jeito de honrar o modo offline sem virar
falso-negativo silencioso.

---

## Passo 5 — Registrar a decisao

Um bloco por finding. Este e o mesmo conjunto de campos que o agente `dependency-auditor` emite
dentro de `payload.issues[]`:

```
pacote@versao — CVE-XXXX-YYYYY
  severidade declarada: high
  EPSS: 0.0042 (percentil 0.74)        [offline: "nao verificado"]
  KEV: nao                             [offline: "nao verificado"]
  exploracao: verificada               [offline: "nao verificada" — nunca "nao explorada"]
  reachability: not-reachable (importado so em scripts/build.ts)
  escopo: dev-only
  decisao: backlog
  razao: nao alcancavel de codigo de producao; fix exige major bump do bundler
  revisar em: 2026-12-01
```

`revisar em` e obrigatorio em toda decisao que nao seja "corrigir agora" — sem data de revisao, o
finding vira divida invisivel (a regra ja existe na secao 9 da skill `/security`; aqui ela vira
campo obrigatorio do registro).

---

## Modo offline (degradacao graciosa)

Sem acesso a FIRST.org ou a CISA, a triagem **completa mesmo assim**. Regras:

1. Marcar cada item como `exploracao nao verificada` — nunca `nao explorado`. A ausencia de dado
   NAO e evidencia de ausencia de exploracao, e so ausencia de dado.
2. Nunca falhar a auditoria por indisponibilidade de rede — a triagem sempre produz uma decisao,
   mesmo que conservadora.
3. Aplicar as duas ultimas linhas da matriz do Passo 4: fail-safe para cima em item runtime +
   reachable (tratar como alto risco); backlog + reavaliar para o resto.
4. Registrar a data da tentativa (campo `revisar em`) e reavaliar assim que houver rede de novo.

---

## Limites honestos

Este procedimento NAO substitui um scanner comercial (Snyk, Trivy) nem pretende igualar a cobertura
deles. Especificamente:

- Nao tem banco proprio de pacotes maliciosos ou typosquatting — depende do que o audit da stack ja
  cataloga.
- Nao faz scanning de container ou IaC (Dockerfile, Terraform) — escopo e dependencias de aplicacao.
- A analise de reachability e por grep + leitura humana/agente, **nao e call graph estatico** — pode
  errar em code paths dinamicos (`require(variavel)`, reflection, plugins carregados por config).
  `unknown` existe exatamente para esses casos.
- EPSS e estimativa estatistica, nao garantia — score baixo nao e prova de seguranca, so reduz
  prioridade relativa.

---

## Fontes

- EPSS — FIRST.org: https://www.first.org/epss/ (API: https://api.first.org/data/v1/epss)
- CISA Known Exploited Vulnerabilities Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OSV.dev: https://osv.dev/
- OWASP Top 10 2025, A03 Software Supply Chain Failures — ver `docs/references/security-checklist.md`

Verificado em: 2026-09-01.
