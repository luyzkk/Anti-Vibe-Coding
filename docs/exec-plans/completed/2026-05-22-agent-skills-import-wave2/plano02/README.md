# Plano 02: Refinar 12 Agentes Restantes (Waves A/B/C)

**Feature:** Agent-Skills Import — Wave 2 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6h
**Depende de:** Plano 01 (gold standard `agents/security-auditor.md` + schema v2.0.0 + migration guide + validator anti-generico)
**Desbloqueia:** Plano 04 (manifest com checksums dos 13 agentes refinados)

---

## O que este plano entrega

Replicacao do gold standard (`agents/security-auditor.md` refinado no Plano 01 fase-03) nos 12 agentes restantes via 3 waves de 4 subagentes paralelos cada. Ao final: 13/13 agentes com `## Output Contract (additions)`, `## Anti-Degeneration Rules` (>=2 genericas + >=2 especificas), `## Composition`, triad PoC/Impact/Fix em issues critical/high, e `contract_version: "2.0.0"`. Fase-04 valida tudo via grep batch e confirma CA-11 (verify-work intocado) + CA-12 (clean state retorna positive + verdict "approve").

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Gold standard `agents/security-auditor.md` refinado (5 patterns aplicados) | Plano 01 fase-03 | pendente |
| Schema v2.0.0 documentado em `docs/design-docs/subagent-contract-v1.md` + migration guide | Plano 01 fase-02 | pendente |
| Validator anti-generico de `positive_observations` (regex blacklist + 4 testes CA-02) | Plano 01 fase-04 | pendente |
| Audit map de consumidores do contract (`audit-consumers.md`) | Plano 01 fase-01 | pendente |
| PRD aprovado | `../PRD.md` (status: approved) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 13 agentes refinados (5 patterns + contract 2.0.0 uniformes) | Plano 04 (manifest com checksums regenerados) |
| Relatorio de grep batch confirmando >=52 anti-degen catalogadas | Plano 04 (validacao final + Exit Criteria do PLAN) |
| Confirmacao de CA-11 (verify-work nao tocado) e CA-12 (clean retorna positive) | Plano 04 fase-02 (validacao consolidada do PRD) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-wave-a-refinar-4-agentes.md` | `react-auditor`, `api-auditor`, `database-analyzer`, `tdd-verifier` refinados (5 patterns) | 1.5h | Plano 01 (todos) |
| 02 | `fase-02-wave-b-refinar-4-agentes.md` | `code-smell-detector`, `solid-auditor`, `infrastructure-auditor`, `design-explorer` refinados | 1.5h | Plano 01 (todos) |
| 03 | `fase-03-wave-c-refinar-4-agentes.md` | `documentation-writer`, `lesson-evaluator`, `plan-executor`, `plan-verifier` refinados | 1.5h | Plano 01 (todos) |
| 04 | `fase-04-validacao-consolidada-grep-batch.md` | Grep batch dos 13 agentes + verificacao CA-11/CA-12 + relatorio final | 1h | fase-01, 02, 03 |

---

## Grafo de Fases

```
            Plano 01 (gold standard + schema + validator)
                        |
        +---------------+---------------+
        v               v               v
   fase-01          fase-02          fase-03
   (Wave A)         (Wave B)         (Wave C)
        +---------------+---------------+
                        |
                        v
                   fase-04
                   (validacao consolidada)
```

**Paralelismo possivel:** As 3 Waves (fase-01, 02, 03) sao INDEPENDENTES entre si — cada uma le o mesmo gold standard e edita conjuntos disjuntos de 4 agentes. Em teoria podem rodar em paralelo. **Decisao do plano:** serializar A -> B -> C para revisao incremental do dev (~22min por agente paralelizado dentro da wave; entre waves, dev ve diff acumulado de 4 agentes antes da proxima). Se o dev quiser paralelizar Waves, basta lancar 3 sessoes /execute-plan apontando para fases diferentes.

DENTRO de cada wave, os 4 agentes SAO refinados em paralelo via 4 subagentes Fork (cache-otimizado, contexto pai compartilhado).

---

## TDD Strategy

```
Ciclo por wave (fases 01/02/03):
1. RED: grep -c "## Output Contract (additions)" agents/{nome}.md == 0 (antes do refinamento)
2. GREEN: subagente edita o agente; grep -c retorna >=1
3. REFACTOR: ajustar consistencia com gold standard (heading capitalization, ordem das secoes)
4. VERIFY: bun run harness:validate verde + grep batch dos 4 agentes da wave verde

Ciclo fase-04 (validacao consolidada):
1. Script de grep batch itera pelos 13 agentes
2. Conta regras anti-degen (espera >=52 total)
3. Confirma ausencia de "contract_version": "1.0" em qualquer agente
4. Confirma CA-11 (skills/verify-work/SKILL.md nao foi modificado)
5. Confirma CA-12 (cenario clean retorna positive + verdict "approve")
```

**Tracer Bullet deste plano:** N/A — o TB da Wave 2 foi feito no Plano 01 fase-03 (`security-auditor.md` como prova do template canonico). Plano 02 replica o template ja validado em produc/o.

**Notas TDD por fase:**
- fase-01/02/03: TDD por grep (RED antes do edit, GREEN apos). Sem testes runtime novos — gold standard ja foi validado no Plano 01 fase-04 com fixture/validator.
- fase-04: validacao programatica via bash script (grep batch) + verificacao manual do diff por amostragem.

---

## Gotchas Conhecidos

- **G1:** O gold standard `agents/security-auditor.md` deve ser passado VERBATIM aos subagentes. Qualquer parafrase, sumarizacao ou reordenamento de secoes propaga inconsistencia em 12 agentes. Cada subagente recebe o arquivo inteiro como contexto + nome do agente alvo. (Herda G6 do Plano 01.)
- **G2:** Anti-degeneration ESPECIFICA varia por dominio do agente — nao copiar literalmente as regras do `security-auditor` (CORS, CSRF, auth) para o `database-analyzer` ou `documentation-writer`. O subagente LE o agente alvo, identifica seu dominio, e gera 2+ regras concretas. Ver CA-10 do PRD para exemplos por dominio.
- **G3:** O bump `contract_version` 1.0 -> 2.0.0 deve ser ATOMICO por agente: dentro do mesmo edit, troca a versao literal no JSON e atualiza a descricao textual ("sempre `1.0`" -> "sempre `2.0.0`"). Edit parcial deixa o agente em estado inconsistente (validator anti-generico do Plano 01 fase-04 reprova).
- **G4:** Validator anti-generico do Plano 01 fase-04 aplica-se a `positive_observations` — subagentes devem garantir que os exemplos no contrato (se houver placeholder no agente) NAO usem strings tautologicas ("no issues found", "tudo limpo"). A regra escrita basta — exemplos sao opcionais.
- **G5:** Paralelismo intra-wave usa **subagentes Fork** (herdam contexto pai cache-otimizado, NAO worktree). Cada subagente edita 1 unico arquivo `agents/{nome}.md`. Subagentes NAO leem `agents/_contract/` nem mexem em libs/skills externas. Escopo restrito.
- **G6:** `## Composition` deve documentar 3 blocos: "Invoke directly when", "Invoke via", "Do not invoke from another persona". O ultimo bloco e constraint de plataforma (subagentes nao invocam outros subagentes) — texto literal mantido em todos os 13.
- **G7:** O fase-04 confirma CA-11: `git diff --stat HEAD~N skills/verify-work/SKILL.md` deve ser vazio. Se algum subagente acidentalmente editou outro arquivo, fase-04 falha o gate.

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-01 (template 5 patterns aplicado) | Integral pos-Plano 02 (12/12 agentes restantes refinados + 1 do Plano 01) | fase-01, 02, 03 |
| CA-02 (positive obs nao-generico) | Integral (replicado em 12 agentes; validator do Plano 01 fase-04 garante) | fase-01, 02, 03, 04 |
| CA-03 (verdict canonico approve/request_changes/block) | Integral | fase-01, 02, 03 |
| CA-04 (triad PoC/Impact/Fix em critical/high) | Integral (replicado em todos os 13) | fase-01, 02, 03 + grep fase-04 |
| CA-09 (contract_version 2.0.0 uniforme) | Integral (13/13 agentes com 2.0.0; zero com 1.0) | fase-04 (grep batch) |
| CA-10 (>=52 regras anti-degen catalogadas) | Integral (13 × >=4 = >=52) | fase-04 (script de contagem) |
| CA-11 (refactor nao quebra callers) | Verificado (verify-work nao tocado nesta wave) | fase-04 (git diff stat) |
| CA-12 (agente sem issues retorna positive) | Verificado (cenario clean) | fase-04 (descricao + fixture conceitual) |

CAs 05, 06, 07 (3 skills novas) e CA-08 (decision-registry pedagogia) ficam para Planos 03 e 04.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
