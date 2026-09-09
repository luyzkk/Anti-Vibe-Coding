# Summary: Shift-Left Security no Pipeline Anti-Vibe-Coding

**Completed:** 2026-09-01
**Planos:** 3 (3 completed, 0 skipped)
**Fases:** 13 (13 done, 0 skipped, 0 blocked)
**Branches:** `feat/secrets-scanner-tracer` (Plano 01) → `feat/shift-left-pipeline` (Planos 02 e 03, empilhada sobre a primeira)

---

## O que foi construido

**Plano 01 — Conhecimento (6 fases).** As auditorias ficaram mais assertivas sem tocar no pipeline.
O `secrets-scanner` saiu de 5 regexes sobre markdown para as familias do gitleaks (MIT, licenca
confirmada) mais entropia de dois eixos, varrendo codigo. A base de conhecimento saiu do OWASP 2021
congelado para a edicao 2025, ganhou a regua ASVS 5.0.0 no checklist minimo e um procedimento
operacional de triagem de CVE ancorado em feeds vivos (EPSS + CISA KEV, ambos verificados ao vivo).
Nasceu o `dependency-auditor`, com Bash read-only sob allowlist explicita, sem afrouxar o
`security-auditor`.

**Plano 02 — Pipeline (5 fases).** O nucleo: seguranca deixou de ser saida de auditoria e virou
**input** de spec, de plano e do ciclo TDD. O PRD carrega `## Ameacas & Dados` (condicional aos seis
gatilhos) com casos de abuso `AB-*`; o plano marca o slice `[RISCO: ...]` e carrega `CA-SEC-*` como
criterio de aceite first-class; o TDD ganhou o `Abuse-It` — teste do ataque antes da defesa,
modelado sobre o `Prove-It` que ja existia. O `grill-me` ramifica em abuso, `architecture` e
`system-design` fixam defaults seguros no design, e o contexto de ameaca chega recortado ao
`plan-executor`.

**Plano 03 — Teste dinamico (2 fases).** A verificacao passou a confirmar no app rodando que a
defesa segura. Guardrail de autorizacao primeiro e nao-negociavel, passe passivo determinista, passe
dirigido com canario minimo, e wire opt-in no `verify-work` com degradacao graciosa.

---

## O fio, ponta a ponta

```
grill-me (ramos de abuso)
   -> write-prd (## Ameacas & Dados -> AB-*)
      -> architecture / system-design (defaults seguros no design)
         -> plan-feature (slice [RISCO] -> CA-SEC-*)
            -> tdd-workflow (Abuse-It: teste do ataque no RED)
               -> execute-plan -> plan-executor (recorte da ameaca + CA-SEC)
                  -> verify-work (auditor + SCA + Step 2.5 dinamico)
                     -> [limpeza final, fora deste PRD: ZAP full scan, Trivy]
```

Os `AB-*` do PRD viram `CA-SEC-*` no plano e teste de abuso no RED. E traducao, nao invencao — e se
o slice e de risco mas o PRD nao tem a secao, o pipeline manda **avisar o dev**, nao remendar.

---

## Correcoes de fato feitas contra a fonte durante a execucao

O plano previa "atualizar conhecimento"; a execucao mostrou que **quatro premissas do proprio PRD
estavam erradas** — todas encontradas por verificar a fonte antes de escrever:

| Premissa do PRD | Realidade verificada |
|---|---|
| OWASP Top 10 na numeracao 2021 | Edicao **2025**: injection caiu de #1 para A05, SSRF absorvido em A01, A03 Supply Chain e A10 Mishandling sao novas |
| ASVS 4.0.3 | **5.0.0** — reagrupou capitulos, nao so renumerou; 4 itens propostos como L1 sao L2 |
| Licenca OWASP CC BY-SA | **CC BY 3.0** |
| EPSS devolve numero | Devolve **string** — exige `parseFloat` |

---

## Bugs e gotchas generalizaveis

- **BUG-1 (Plano 01):** entropia de Shannon mede **diversidade de caracteres, nao imprevisibilidade**.
  Medido neste repo: a string monotonica `abc..xyz0123456789` (zero aleatoriedade) pontua **5.17
  bits/char**, ACIMA de um secret real aleatorio (**5.00**). O falso positivo pontua mais alto que o
  verdadeiro positivo — **nenhum ajuste de limiar separa os dois**. Resolvido com um segundo eixo
  (corrida sequencial), nao com tuning.

- **Verificacao que passa pelo motivo errado nao e verificacao.** Apareceu tres vezes, em formas
  diferentes: fixture que passava por falhar num filtro anterior (Plano 01), `search()` devolvendo
  `-1` e fazendo `slice` cobrir o arquivo inteiro (Plano 02), e grep com ponto nao escapado casando
  palavras em portugues (Plano 03). **Gate textual so vale se voce remover o alvo e ver falhar** —
  foi feito nos tres gates novos.

- **Agente de background nao sobrevive ao fim do processo, mas o disco sim.** Duas fases se perderam
  em voo; uma tinha gravado tudo e foi recuperada da working tree, a outra foi refeita. Inspecionar
  antes de assumir perda economizou metade do trabalho.

- **`bun run test` roda em 2 lotes** e so o segundo aparece no fim do output. Baseline real do repo e
  ~1883 pass, nao ~623.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Planos | 3 |
| Fases | 13 |
| Commits | 22 |
| Testes: inicio -> fim | 1858 -> 1883 pass, 0 fail |
| Gates de contrato novos | 3 (write-prd, dynamic-testing guardrail, dependency-auditor fixture) |
| Bugs encontrados | 1 (BUG-1, resolvido) |
| Premissas do PRD corrigidas | 4 |
| Retries necessarios | 0 |

---

## Divida conhecida (todos os tres itens resolvidos em 2026-09-02/03)

- ~~`skills/lib/subagent-contract.ts` usa `instancePath` (ajv 7+) com runtime `ajv@6.15.0`
  (`dataPath`)~~ — **resolvido** (PR #63). `ajvErrorPath()` le as duas majors e normaliza para JSON
  Pointer. O impacto era maior que o registrado aqui: o `?? ''` zerava o caminho e matava TODO o
  dispatch por caminho, entao `INVALID_KIND` e `INVALID_CONTRACT_VERSION` nunca disparavam.
- ~~Warning de frontmatter em `skills/anti-vibe-review/SKILL.md` no `generate:manifest`~~ —
  **resolvido**. O arquivo abria com comentario HTML e o regex `/^---/` ancora no inicio do arquivo
  (sem flag `m`), entao a skill entrava no indice com `description` vazia. Nao era cosmetico.
- ~~Artefato v4 solto em `.planning/plano08-audit-D29.md`~~ — **resolvido**. Movido com `git mv`
  (linhagem preservada) para `docs/exec-plans/completed/_legacy-detail/v60-harness-compound-fusion/plano08/audit-D29.md`,
  junto das fases que o produziram. `.planning/` deixou de existir.

---

## Fronteira honesta — o que NAO foi construido

Paridade com ZAP full scan (fuzzing em escala), monitoramento de CVE em tempo real, DB proprietario
de pacote malicioso e scan de container. Tudo isso permanece **limpeza final com ferramenta**, por
decisao explicita do PRD (D1). O agente faz o grosso — white-box: reachability, descoberta de rotas,
passe passivo, triagem com julgamento; a ferramenta confirma no fim.
