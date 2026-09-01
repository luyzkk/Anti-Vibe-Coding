# Plan: Shift-Left Security no Pipeline Anti-Vibe-Coding

**PRD:** ./PRD.md
**Planos:** 3 planos, 13 fases total
**Created:** 2026-09-01

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Conhecimento (base das auditorias) | 6 | ~10h | — |
| 02 | Pipeline (código nasce seguro) | 5 | ~8h | Plano 01 |
| 03 | Teste dinâmico white-box | 2 | ~3.5h | Plano 01 |

Planos 02 e 03 são **mergeáveis de forma independente** (PRD §Mecanismo) e podem rodar em paralelo após o 01. A dependência do 01 é *soft*: ambos consomem o vocabulário/conhecimento atualizado, mas não quebram se rodarem antes.

---

## Grafo de Dependencias

```
Plano 01 (Conhecimento)
    |
    v
Plano 02 (Pipeline)     Plano 03 (Teste dinâmico)
    |                          |
    +------------+-------------+
                 |
                 v
        (feature completa — limpeza final com ZAP/Trivy fora deste escopo)
```

**Paralelismo possivel:** Plano 02 e Plano 03 em paralelo após o Plano 01. Dentro do Plano 01, fase-03/04/05 (docs puras) são paralelizáveis entre si; fase-01/02 (secrets-scanner) são sequenciais (mesmo arquivo).

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-secrets-scanner-tracer
**Descricao:** A fatia mais fina que prova o caminho técnico mais arriscado do plano — tocar código **rastreado** (`secrets-scanner.ts`), regenerar o manifest e manter os gates de paridade verdes. Adiciona 1 regra derivada do gitleaks (token GitHub `ghp_`) + 1 check de entropia, estendendo o escopo de markdown-only para arquivos de código, com teste TDD. Se este caminho fecha (código + `bun generate:manifest` + `bun test` verdes), todo o resto do Plano 01 é aditivo de baixo risco.

---

## Resumo por Plano

### Plano 01: Conhecimento (base das auditorias)
> Torna as auditorias mais assertivas **hoje**, antes de qualquer mudança no pipeline. Atualiza a base de conhecimento (OWASP 2025, ASVS L1, triagem SCA com EPSS/KEV), amplia o scanner de secrets e adiciona o auditor de dependências. Fases de docs são aditivas; o risco real concentra-se no scanner (código rastreado).

Fases:
- fase-01-secrets-scanner-tracer: **[TRACER]** 1 regra gitleaks (`ghp_`) + entropia + escopo de código, TDD, manifest+gates verdes (RF-02 parcial)
- fase-02-secrets-scanner-full-rules: completar port das regras gitleaks (AWS/GCP/Azure/Slack/chave privada/connection string) sobre a fundação da fase-01 (RF-02)
- fase-03-owasp-2025-checklist: atualizar `security-checklist.md` para Top 10 2025 (A03 Supply Chain, SSRF→A01) + red flags da skill (RF-01)
- fase-04-sca-triage-reference: nova `references/sca-triage.md` com procedimento EPSS+KEV+reachability (RF-03)
- fase-05-asvs-l1-checklist: reorganizar o checklist mínimo da `/security` sob a régua ASVS L1 (RF-15)
- fase-06-dependency-auditor-agent: novo agente `dependency-auditor` (contrato v2.0.0, Bash+WebFetch) + wire no `verify-work` (RF-10)

### Plano 02: Pipeline (código nasce seguro)
> O núcleo do PRD. Costura segurança nas skills onde o código nasce — spec → slice → teste de abuso no RED. Trio crítico (fase-01/02/03) é **Must**; as skills de design e execução (fase-04/05) são **Should** na mesma fase (entram se o trio validar).

Fases:
- fase-01-prd-threat-section: seção "Ameaças & Dados" **condicional** em `prd-template.md` + gatilhos no `write-prd` SKILL.md + verificar gates de paridade (RF-04) — **Must**
- fase-02-tdd-abuse-red: passo de teste de abuso no **RED** para slice de risco no `tdd-workflow` (RF-05) — **Must**
- fase-03-plan-feature-security-ac: critério de aceite de segurança por slice de risco no `plan-feature` (RF-06) — **Must**
- fase-04-grill-and-design-defaults: perguntas de abuso no `grill-me` + defaults seguros em `architecture`/`system-design` (RF-07 parcial) — **Should**
- fase-05-execute-plan-security-context: injeção do contexto de segurança do slice no `plan-executor` via `execute-plan` (RF-07) — **Should**

### Plano 03: Teste dinâmico white-box
> A camada dinâmica dirigida. Passive-scan-lite determinístico + ataque dirigido guiado pela análise estática, com guardrail de autorização como dealbreaker. ZAP full scan permanece limpeza final (fora deste escopo).

Fases:
- fase-01-dynamic-testing-reference: nova `references/dynamic-testing.md` (passive-scan-lite + ataque dirigido + guardrail de autorização) (RF-08)
- fase-02-verify-work-dynamic-wire: `verify-work` oferece o passe dinâmico quando há dev server; degrada para só-estático se ausente (RF-09)

---

## Risks

- **Adicionar seção ao `prd-template.md` pode tocar gate de paridade (RF-04).** Sondagem inicial: não encontrei teste que enumere seções obrigatórias do PRD-template (o teste de "seções obrigatórias" conhecido é do PLAN.md/exec-plan, não do prd-template). Risco provavelmente BAIXO, mas fase-01 do Plano 02 deve **validar com `bun test` antes** e ajustar o teste de contrato se existir.
  - Mitigação: primeira ação da fase é rodar a suíte para estabelecer o baseline verde.
- **Esquecer `bun generate:manifest` inverte o veredito do `/update`.** Toda fase que toca arquivo rastreado (secrets-scanner, prd-template, agents, skills) precisa regenerar o manifest no mesmo commit.
  - Mitigação: checklist de verificação de cada fase inclui o passo de manifest explicitamente.
- **Teste dinâmico ativo atinge alvo indevido.** Guardrail de autorização é dealbreaker (CA-06).
  - Mitigação: fase-01 do Plano 03 escreve o guardrail antes de qualquer procedimento de ataque; default é só-passivo se dev server não confirmado.
- **fase-04 do Plano 02 agrupa 4 skills (grill-me/architecture/system-design/execute-plan) — sinal de fase "L" escondida.** Já dividida em fase-04 (grill + design) e fase-05 (execute-plan). Se ainda estourar 2h, subdividir na execução.
- **Legacy solto `.planning/plano08-audit-D29.md`** — artefato v4 não relacionado a esta feature; deixado intocado (modo greenfield). Não bloqueia; migração fica a critério do dev em outra sessão.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1: White-box dirigido, não paridade ZAP | Plano 03 (todo) |
| D2: Seção de segurança condicional a risco | Plano 02, fase-01 |
| D3: Trio crítico como Must, resto Should | Plano 02 (fase-01/02/03 Must; fase-04/05 Should) |
| D4: Fonte de CVE em feeds abertos (OSV/EPSS/KEV) | Plano 01, fase-04 e fase-06 |
| D5: Portar gitleaks (MIT) + entropia | Plano 01, fase-01 e fase-02 |
| D6: Novo `dependency-auditor`, preservar auditor read-only | Plano 01, fase-06 |

---

<!-- Gerado por /plan-feature em 2026-09-01 -->
