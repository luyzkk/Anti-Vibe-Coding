---
slug: shift-left-security-pipeline
date: 2026-09-01
status: approved
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Ex: `// 2026-09-01 (Luiz/dev): default 30s — alinhado com PRD §Decisões D3`
-->

# PRD: Shift-Left Security no Pipeline Anti-Vibe-Coding

**Status:** Approved
**Author:** Luiz + AI
**Date:** 2026-09-01
**Context:** conversation (auditoria de segurança do plugin vs. Snyk/OWASP ZAP)

---

## Problema

A segurança no plugin hoje vive **só no fim** do pipeline: `verify-work` invoca o `security-auditor`
sobre o diff. Consequências:

1. **Retrabalho.** Código nasce inseguro e vulnerabilidades são caçadas depois — custa tempo consertar
   o que poderia ter sido prevenido no design e na primeira linha de código.
2. **Conhecimento congelado e desatualizado.** O `security-checklist.md` está na edição **OWASP Top 10 2021**;
   a skill `/security` não conhece OWASP 2025 (A03 Supply Chain), ASVS, nem procedimento de triagem
   de CVE com dados de exploração (EPSS/KEV).
3. **Falsa sensação de cobertura.** O `secrets-scanner.ts` tem **5 regexes e varre só markdown**;
   o `security-auditor` só olha o **diff** (vulnerabilidade pré-existente nunca aparece); nenhum teste
   dinâmico contra a aplicação rodando existe.

O problema importa porque o público-alvo do plugin constrói com IA — e "segurança é uma avaliação que o
modelo pula por default" (já documentado no atom `security-fastapi-owasp.md`). Sem shift-left, cada feature
gerada acumula dívida de segurança invisível até um pentest (ou incidente) tardio.

**Escopo da ambição (calibrado, honesto):** NÃO buscamos paridade total com ZAP full scan ou Snyk. A
divisão é **inteligência vs. volume**: o agente (white-box, tem o código) faz o *grosso* — achar onde
atacar, disparar o payload certo, triar CVE com julgamento; as ferramentas externas (ZAP full scan, Trivy,
gitleaks no histórico completo) rodam só na **limpeza final**, confirmando em vez de reconstruir.

---

## Solução

### Outcomes (o QUE, declarativo)

- O sistema torna a segurança um **input** de design e código, não uma saída de auditoria.
- Um PRD/plano de feature de risco carrega requisitos de segurança **antes** de qualquer código.
- Testes de abuso existem no **RED** (antes da implementação) para features de risco.
- As auditorias do plugin ficam **mais assertivas** porque a base de conhecimento reflete OWASP 2025,
  ASVS, gitleaks e triagem com EPSS/KEV.
- O agente executa autonomamente o *grosso* do trabalho de SCA e teste dinâmico white-box; ferramentas
  externas ficam para a limpeza final.

### Mecanismo (o COMO) — entrega em 3 fases

Cada fase entrega valor sozinha e é mergeável de forma independente (branch + PR por fase).

**Fase 1 — Conhecimento (torna auditorias melhores hoje).**
Alvos: `skills/security/SKILL.md`, `skills/security/references/`, `agents/security-auditor.md`,
`docs/references/security-checklist.md`, `skills/init/lib/secrets-scanner.ts`.
- Atualizar Top 10 2021 → **2025** (A03 Software Supply Chain Failures; Mishandling of Exceptional
  Conditions; SSRF absorvido em A01) no `security-checklist.md` e nas red flags da skill.
- Nova referência `references/sca-triage.md`: procedimento audit → enriquecer com **EPSS** (FIRST.org)
  e **CISA KEV** via `WebFetch` → análise de reachability → decisão documentada. Eleva a atual seção 9 a
  procedimento operacional (replica o Priority Score do Snyk com julgamento).
- Ampliar `secrets-scanner.ts`: portar regras do **gitleaks** (MIT) — AWS/GCP/Azure/GitHub/Slack/chaves
  privadas/connection strings — + heurística de **entropia**; estender escopo de markdown-only para código.
- Introduzir **ASVS L1** como régua sistemática do checklist mínimo.

**Fase 2 — Pipeline (o núcleo: código nasce seguro). Trio crítico primeiro.**
Must: `write-prd`, `plan-feature`, `tdd-workflow` (spec → slice → teste de abuso no RED).
Should (mesma fase, se o trio validar): `grill-me`, `architecture`, `system-design`, `execute-plan`.
- `write-prd`: nova seção **"Ameaças & Dados"** no template, **condicional** a gatilhos de risco.
- `plan-feature`: cada vertical slice de risco carrega **critérios de aceite de segurança** first-class.
- `tdd-workflow`: passo explícito de **teste de abuso no RED** para slice de risco.
- (Should) `grill-me` perguntas hostis; `architecture`/`system-design` defaults seguros no design;
  `execute-plan` injeta o contexto de segurança do slice no `plan-executor`.

**Fase 3 — Teste dinâmico white-box dirigido.**
Alvo: `skills/security/references/dynamic-testing.md` (nova) + wire no `verify-work`.
- **passive-scan-lite** (determinístico, seguro): headers de segurança, flags de cookie, CORS real via
  preflight, vazamento de stack trace — via `curl` contra o dev server. Regras derivadas das docs de
  passive rules do ZAP + OWASP Secure Headers.
- **ataque dirigido** (white-box): onde a análise estática suspeitou, dispara o payload canário específico
  (SQLi/XSS/SSTI) no ponto exato, no dev server local. NÃO é fuzzing em escala.
- **Guardrail de autorização** (dealbreaker): só executa contra app do próprio projeto, em dev/staging,
  nunca contra host externo. ZAP full scan permanece como limpeza final.

---

## Requisitos Funcionais

### Must Have

- [ ] RF-01 (F1): `security-checklist.md` reflete OWASP Top 10 **2025** (categorias, renames, A03, SSRF→A01).
- [ ] RF-02 (F1): `secrets-scanner.ts` detecta ao menos os tipos do gitleaks default (AWS, GCP, GitHub,
      Slack, chave privada, connection string) **e** aplica check de entropia, varrendo arquivos de código.
- [ ] RF-03 (F1): existe `references/sca-triage.md` com procedimento EPSS+KEV+reachability e decisão documentada.
- [ ] RF-04 (F2): `prd-template.md` tem seção "Ameaças & Dados" **condicional** a gatilhos de risco
      (auth, PII/sensível, input externo, upload, pagamento, integração terceira).
- [ ] RF-05 (F2): `tdd-workflow` exige teste de abuso no **RED** para slice classificado como de risco.
- [ ] RF-06 (F2): `plan-feature` produz critério de aceite de segurança por slice de risco.

### Should Have

- [ ] RF-07 (F2): `grill-me` inclui perguntas de abuso; `architecture`/`system-design` fixam defaults
      seguros no design; `execute-plan` repassa contexto de segurança ao `plan-executor`.
- [ ] RF-08 (F3): `references/dynamic-testing.md` com passive-scan-lite + ataque dirigido + guardrail de autorização.
- [ ] RF-09 (F3): `verify-work` sabe oferecer o passe dinâmico white-box quando há dev server.
- [ ] RF-10 (F1): novo agente `dependency-auditor` dedicado (Bash para `bun audit`/`osv-scanner` + WebFetch
      para EPSS/KEV), preservando o `security-auditor` read-only (ver D6).
- [ ] RF-15 (F1): checklist mínimo da skill `/security` reorganizado sob a régua **ASVS L1** (cobertura
      sistemática em vez de ad-hoc).

### Could Have

- [ ] RF-11: check estático de **matriz rota × middleware de auth** no auditor (substitui spider do ZAP com vantagem white-box).
- [ ] RF-12: modo **full-sweep** (workflow) auditando o codebase inteiro, não só o diff.
- [ ] RF-13: **agendamento semanal** do audit de dependências (encolhe o gap de monitoramento contínuo do Snyk).
- [ ] RF-14: portar padrões do registry Semgrep como novos checks estáticos do auditor.

### Won't Have (desta versão)

- Paridade com ZAP full scan (fuzzing em escala) — permanece limpeza final, por design.
- DB proprietário de pacotes maliciosos, container/IaC scanning — ficam para Trivy/Snyk.
- Monitoramento de CVE em tempo real (só semanal via RF-13).

---

## Requisitos Não-Funcionais

- **Compatibilidade:** mudanças no template do PRD e nas skills NÃO podem quebrar gates de paridade
  ("nunca diminuir") nem os testes de "seções obrigatórias". Seção nova exige atualizar o teste de contrato junto.
- **Manifest:** todo arquivo rastreado alterado exige `bun generate:manifest` no mesmo PR (gotcha conhecida:
  PR sem regenerar manifest inverte o veredito do `/update`).
- **Degradação graciosa:** EPSS/KEV via rede — auditoria funciona offline (marca "não verificado", não falha).
- **Segurança do próprio teste dinâmico:** guardrail de autorização é dealbreaker (só app próprio, dev/staging).
- **Filosofia preservada:** PRD continua cabendo em 1-2 páginas — seção de segurança é condicional, não sempre-on.

---

## Boundaries (feature de risco: secrets / deps / conteúdo de terceiros)

- **Sempre:** fixtures de teste do `secrets-scanner` usam secrets **sintéticos** (formato válido, valor falso —
  ex: `AKIA` + sufixo inventado); rodar parity tests + `bun generate:manifest` em todo PR que toca arquivo rastreado;
  conteúdo derivado de fontes OWASP (CC BY-SA) mantém atribuição via frontmatter `source_url` (padrão já usado
  em `docs/references/security-checklist.md`).
- **Perguntar antes:** adicionar dependência de runtime nova ao plugin (osv-scanner é CLI externo opcional,
  não dependência); alterar o contrato JSON v2.0.0 dos auditores.
- **Nunca:** commitar secret real (mesmo revogado) em fixture ou doc; afrouxar o validator do subagent-contract;
  executar ataque dirigido fora do dev server local/staging do próprio projeto.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Escopo da ambição dinâmica | White-box dirigido + ferramenta na limpeza | Paridade total com ZAP no agente | Fuzzing em escala é lento, caro em tokens e não-determinístico onde cobertura exaustiva importa |
| 2 | Gatilho da seção de segurança no PRD | Condicional a risco | Sempre obrigatória | Preserva "PRD cabe em 1-2 páginas"; feature trivial não paga atrito |
| 3 | Ordem da Fase 2 | Trio crítico (write-prd/plan-feature/tdd) como Must | As 7 skills de uma vez | Menor risco nos gates de paridade; trio é onde código nasce |
| 4 | Fonte de CVE | OSV.dev / `bun audit` + EPSS/KEV | Depender de conhecimento congelado do LLM | Feeds abertos e vivos; LLM não tem feed de CVE atual |
| 5 | Regras de secrets | Portar gitleaks (MIT) + entropia | Manter as 5 regexes markdown-only | MIT permite port direto; 100+ regras > 5, e entropia pega o genérico |
| 6 | Onde vive a capacidade SCA | Novo `dependency-auditor` com Bash+WebFetch | Dar Bash ao `security-auditor` | Preserva o auditor read-only; segue o precedente do `database-analyzer` (já tem Bash) |

---

## Premissas a Validar

| # | Premissa | Tier | Como validar |
|---|---|---|---|
| 1 | Adicionar seção condicional ao PRD não quebra o teste de "seções obrigatórias" | Must | Rodar `bun test` nos parity tests após editar o template; ajustar o teste de contrato se ele enumera seções fixas |
| 2 | `WebFetch` alcança FIRST.org (EPSS) e CISA KEV de dentro da skill | Should | Fetch de teste dos dois endpoints; se bloqueado, cair no modo "não verificado" |
| 3 | O ambiente de dev do projeto-alvo sobe um dev server acessível ao agente | Should | `.claude/launch.json` ou preview_start; se ausente, Fase 3 degrada para só-estático |
| 4 | Licença gitleaks (MIT) permite portar as regras para o plugin | Must | Confirmar LICENSE do repo gitleaks antes do port |
| 5 | Conteúdo derivado de WSTG/ASVS/ZAP docs (CC BY-SA) é compatível com o repo mantendo atribuição | Must | Confirmar licenças; usar frontmatter `source_url` + reescrita própria (conceitos, não texto literal) |

---

## Critérios de Aceite

- [ ] CA-01: Dado o `security-checklist.md`, quando lido, então a tabela Top 10 reflete a edição 2025
      (inclui A03 Supply Chain e SSRF sob A01) — verificável linha a linha.
- [ ] CA-02: Dado um arquivo **de código** (`.ts`) com uma chave GitHub (`ghp_...`) e um token genérico de alta
      entropia, quando `secrets-scanner` roda, então ambos são detectados (hoje: escopo markdown-only, nenhum
      dos dois tipos coberto pelas 5 regexes atuais).
- [ ] CA-03: Dado um PRD de feature que toca auth, quando gerado via `/write-prd`, então a seção "Ameaças & Dados"
      está presente e preenchida; dado um PRD de ajuste de UI trivial, então a seção é omitida com justificativa de 1 linha.
- [ ] CA-04 (edge): Dado que EPSS/KEV estão inacessíveis (offline), quando a triagem de SCA roda, então ela
      completa marcando os itens como "exploração não verificada" — sem falhar a auditoria.
- [ ] CA-05: Dado um slice de risco no `tdd-workflow`, quando o ciclo entra no RED, então existe ao menos um
      teste de abuso escrito antes do código de produção.
- [ ] CA-06 (guardrail): Dado o passe dinâmico da Fase 3, quando o alvo não é o dev server local do próprio
      projeto, então o ataque dirigido não é executado.

---

## Out of Scope

- Reescrever o motor de auditoria — as mudanças são aditivas ao `security-auditor` existente.
- Integrar SDK comercial (Snyk API paga) — usamos apenas feeds abertos.
- UI/dashboard de segurança — findings continuam no contrato JSON v2.0.0 atual.

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Fonte externa | OSV.dev / `bun audit` | disponível |
| Fonte externa | EPSS (FIRST.org), CISA KEV (JSON) | disponível via WebFetch |
| Referência aberta | gitleaks.toml (MIT), OWASP WSTG/ASVS, ZAP alert docs | disponível |
| Ferramenta (F3, limpeza final) | ZAP baseline/full scan | a configurar via /wizard (fora deste PRD) |
| Infra do plugin | `bun generate:manifest`, gates de paridade | já no projeto |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Editar template do PRD quebra teste de "seções obrigatórias" | média | médio | Atualizar o teste de contrato no mesmo PR; validar com `bun test` antes de commitar |
| Esquecer de regenerar o manifest inverte veredito do `/update` | média | alto | Passo obrigatório `bun generate:manifest` no checklist de cada fase |
| Teste dinâmico ativo atinge alvo indevido | baixa | alto | Guardrail de autorização como dealbreaker (CA-06); default é só-passivo se dev server não confirmado |
| Conhecimento de CVE volta a congelar | alta (com o tempo) | médio | Procedimento ancora em feeds vivos (WebFetch), não em texto embutido |
| Fase 2 nas 7 skills de uma vez estoura escopo | mitigada | — | Decisão D3: trio como Must, resto Should |
