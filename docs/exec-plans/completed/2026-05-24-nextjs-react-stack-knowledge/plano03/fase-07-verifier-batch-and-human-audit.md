<!--
Princípio universal #5 — Comment Provenance.
Esta fase produz apenas markdown (verifier report + STATE.md update). Nao toca codigo .ts.
Provenance comment NAO se aplica em markdown — frontmatter `updated:` ou heading com data cumpre a funcao.
-->

# Fase 07: Verifier refined batch C + audit humano R3-B (3 atoms flagged)

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** S (~1h verifier batch + sessao sincrona com Luiz para audit humano dos 3 atoms flagged)
**Depende de:** fase-01..06 (8 atoms desta wave + INDEX final consolidado presentes; verifier le todos + INDEX para validar mapping)
**Visual:** false

---

## O que esta fase entrega

`verifier-report-plano03.md` (relatorio markdown auditando os 8 atoms desta wave: security-stack-specific, react-hooks-and-state, performance-and-turbopack, testing-strategy, ui-and-styling, error-handling-observability, react-suspense-patterns, supabase-integration) com decisao APPROVE/REWORK por atom. Meta >=80% rastreabilidade por atom em Senior patterns + Anti-patterns + Decision criteria.

E STATE.md global da feature atualizado com signature humana `Aprovado por Luiz em YYYY-MM-DD` nos 3 atoms flagged R3-B:
- `react-server-components` (do Plano 02 fase-01)
- `security-stack-specific` (do Plano 03 fase-01)
- `supabase-integration` (do Plano 03 fase-05)

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano03/verifier-report-plano03.md` | Create | Relatorio do verifier batch C (8 atoms, APPROVE/REWORK por atom) |
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` | Modify | Adicionar 3 linhas com signature humana `Aprovado por Luiz em YYYY-MM-DD` para os 3 atoms flagged R3-B |

---

## Implementacao

### Passo 1: Lancar verifier batch C (subagente)

Prompt do subagente verifier inclui:

1. **Bloco "VERIFIER PROTOCOL" VERBATIM** da compound lesson [`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`](../../../../docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md) (G6 — verifier audita APENAS Senior patterns + Anti-patterns + Decision criteria). NAO parafrasear.
2. Paths dos 8 atoms a auditar:
   - `knowledge/nextjs/atoms/security-stack-specific.md`
   - `knowledge/nextjs/atoms/react-hooks-and-state.md`
   - `knowledge/nextjs/atoms/performance-and-turbopack.md`
   - `knowledge/nextjs/atoms/testing-strategy.md`
   - `knowledge/nextjs/atoms/ui-and-styling.md`
   - `knowledge/nextjs/atoms/error-handling-observability.md`
   - `knowledge/nextjs/atoms/react-suspense-patterns.md`
   - `knowledge/nextjs/atoms/supabase-integration.md`
3. Para cada atom: ler frontmatter `sources:` -> ler cada source apontado -> amostrar >=5 claims tecnicas das 3 secoes auditaveis -> tentar rastrear cada claim para uma passagem do source.
4. Threshold: >=80% claims rastreaveis por atom = APPROVE; <80% = REWORK.
5. Output: markdown `verifier-report-plano03.md` com 1 secao por atom no formato:

```markdown
## {atom-name}
- **Decision:** APPROVE | REWORK
- **Claims sampled:** N
- **Claims traceable to source:** M (X%)
- **Untraceable claims (if any):**
  - "{quote da claim}" — esperado em {source path}, nao encontrado
  - ...
- **Notes:** {context adicional, anti-patterns observados, observacoes}
```

### Passo 2: Avaliar verifier report

Para cada atom marcado REWORK: voltar a fase correspondente do Plano 03 (ou Plano 02 se for atom de outra wave que nao deveria estar aqui — mas escopo desta fase e os 8 atoms desta wave + os 3 flagged do conjunto inteiro):

- security-stack-specific REWORK -> volta a fase-01 deste plano
- react-hooks-and-state REWORK -> volta a fase-01 deste plano
- performance-and-turbopack REWORK -> volta a fase-02
- testing-strategy REWORK -> volta a fase-02
- ui-and-styling REWORK -> volta a fase-03
- error-handling-observability REWORK -> volta a fase-03
- react-suspense-patterns REWORK -> volta a fase-04
- supabase-integration REWORK -> volta a fase-05

Subagente extrator re-roda com instrucao cirurgica do report ("ajustar claim X em Senior patterns para alinhar com fonte Y").

Apos rework, re-rodar verifier APENAS no atom afetado (nao re-auditar o batch inteiro).

Se REWORK iterar >2 vezes para o mesmo atom: BLOCKER — discutir com Luiz se conteudo cabe no source ou se source esta incompleto.

### Passo 3: Audit humano R3-B (sessao sincrona com Luiz)

Apos verifier batch APPROVE para todos os 8 atoms, agendar sessao sincrona com Luiz (estimativa: 30-45min).

**Instrucoes para Luiz (entregar no inicio da sessao):**

> Voce vai revisar 3 atoms flagged R3-B:
> 1. `knowledge/nextjs/atoms/react-server-components.md` (Plano 02 fase-01)
> 2. `knowledge/nextjs/atoms/security-stack-specific.md` (Plano 03 fase-01)
> 3. `knowledge/nextjs/atoms/supabase-integration.md` (Plano 03 fase-05)
>
> Foco: validar que claims tecnicas correspondem ao seu entendimento + ao material em `Infos/knowledge/NextJS/...`. Em particular:
> - **react-server-components:** props serialization, useState/useEffect proibidos em RSC, async components — esses sao os pontos contraintuitivos.
> - **security-stack-specific:** CSRF em Server Actions, middleware auth flow, RSC secret leak via `import 'server-only'`, auth.js v5 patterns.
> - **supabase-integration:** `@supabase/ssr` createServerClient vs createBrowserClient, RLS via `auth.uid()` no Postgres, signed URLs para storage.
>
> Para cada atom: leitura completa (5-10min cada), confirmar claims contra source declarado em frontmatter `sources:`. Se aprovar: assinar em STATE.md global da feature com linha `Aprovado por Luiz em YYYY-MM-DD`. Se REWORK: anotar claim especifica para correcao.

### Passo 4: Atualizar STATE.md global da feature

Apos aprovacao humana, abrir [`STATE.md`](../STATE.md) (raiz da pasta ativa) e adicionar bloco:

```markdown
## R3-B Human Audit (Plano 03 fase-07)

- [x] `knowledge/nextjs/atoms/react-server-components.md` — Aprovado por Luiz em YYYY-MM-DD
- [x] `knowledge/nextjs/atoms/security-stack-specific.md` — Aprovado por Luiz em YYYY-MM-DD
- [x] `knowledge/nextjs/atoms/supabase-integration.md` — Aprovado por Luiz em YYYY-MM-DD
```

Substituir `YYYY-MM-DD` pela data real da sessao (formato ISO).

Se um atom NAO foi aprovado (REWORK humano): NAO marcar checkbox e adicionar bullet com claim a corrigir; voltar a fase correspondente; repetir Passos 3-4 ate aprovacao.

### Passo 5: Cleanup do flag `flagged_for_human_audit` (opcional)

Apos aprovacao dos 3 atoms, opcionalmente remover `flagged_for_human_audit: true` do frontmatter dos 3 atoms ou marcar como `audited_by_human: 2026-05-24`. Decisao adiada para `/iterate` da feature inteira — nao bloquear esta fase com refatoracao de frontmatter.

---

## Gotchas

- **G1 do plano (anti-drift VERBATIM):** NAO se aplica a verifier (nao gera atom). Mas o protocolo do verifier (G6) cola compound lesson verbatim.
- **G6 do plano (verifier audita APENAS 3 secoes tecnicas):** prompt do verifier inclui bloco verbatim. Se verifier marca false-positive em "When to consult" (metadata editorial), ajustar prompt — heranca de bug observado em Plano 04 do Node-TS wave.
- **G7 do plano (Infos/ paths):** verifier le sources em `Infos/knowledge/NextJS/...` — paths nao precisam estar committados, audit trail textual.
- **Local (3 atoms flagged R3-B vem de planos diferentes):** `react-server-components` foi escrito no Plano 02 fase-01 — flag herdado via Plano 02 README G4 + MEMORY.md. Verifier batch C audita os 8 atoms da wave do Plano 03 SOMENTE (RSC ja foi auditado no verifier batch do Plano 02 fase-07). O audit HUMANO em Passo 3 cobre os 3 atoms flagged (1 do P02 + 2 do P03) — escopo expandido para fechar todos os R3-B juntos.
- **Local (REWORK humano vs REWORK verifier):** REWORK do verifier e baseado em rastreabilidade (claim X nao esta no source Y). REWORK humano de Luiz e baseado em entendimento real (claim X esta no source mas e enganosa/incompleta/desatualizada). Aceitar ambos como validos; se Luiz REWORK ao mesmo tempo que verifier APPROVE, prevalece o humano.
- **Local (signature em STATE.md global, NAO neste README/MEMORY):** signature humana vai em [`STATE.md`](../STATE.md) (raiz da pasta ativa) — visivel ao closeout `/iterate`. NAO duplicar em MEMORY.md ou README.md do Plano 03.

---

## Verificacao

### TDD

Atoms content-only e audits NAO usam ciclo TDD classico. Validacao por outputs auditaveis.

### Checklist

- [ ] `verifier-report-plano03.md` criado em `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano03/`
- [ ] Report contem 1 secao por atom (8 secoes total)
- [ ] Cada secao tem `Decision: APPROVE` ou `Decision: REWORK` claramente marcado
- [ ] Cada secao tem `Claims sampled: N` e `Claims traceable: M (X%)` numericamente
- [ ] Atoms com REWORK foram re-trabalhados; verifier re-rodou APENAS nos atoms afetados; STATE.md global da feature reflete (`verified` para todos)
- [ ] Sessao humana com Luiz aconteceu (30-45min)
- [ ] STATE.md global da feature recebe bloco `## R3-B Human Audit (Plano 03 fase-07)` com 3 checkboxes (1 por atom flagged), cada um com `Aprovado por Luiz em YYYY-MM-DD` (ou linha de REWORK se nao aprovado)
- [ ] Os 3 atoms flagged R3-B (`react-server-components`, `security-stack-specific`, `supabase-integration`) tem ckeckbox marcado em STATE.md
- [ ] `bun run compound:check` passa (verifica que verifier report tem estrutura esperada)

---

## Criterio de Aceite

**Por maquina:**
- `ls docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano03/verifier-report-plano03.md` retorna o arquivo
- `grep -c '^## ' docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano03/verifier-report-plano03.md` retorna `8` (1 secao por atom)
- `grep -c 'Decision: APPROVE' docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano03/verifier-report-plano03.md` >=`6` (>=75% dos atoms aprovados; >2 REWORK e sinal de problema sistemico)
- `grep -c 'Aprovado por Luiz em' docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` retorna `3` (1 por atom flagged R3-B)

**Por humano:**
- Luiz confirma que leu os 3 atoms flagged e assinou signature consciente
- Verifier report demonstra claims auditadas com rastreabilidade explicita (citar passagem do source para alegacoes nao-triviais)

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
