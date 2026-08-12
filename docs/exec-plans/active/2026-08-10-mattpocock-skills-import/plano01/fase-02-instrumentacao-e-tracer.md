---
fase: 02
plano: 01
status: planned
---

# Fase 02: Instrumentacao + Tracer Bullet

**Plano:** 01 — Porte da `writing-for-agents` + Auditoria
**Sizing:** ~2h
**Depende de:** fase-01 (a skill precisa existir para ser aplicada)
**Visual:** false

**Decisoes:** DI-02 (escopo inclui auditoria) · DI-04 (relatorio, nunca edicao)
**Invariantes:** INV-03 (zero edicao em skills existentes)

---

## O que esta fase entrega

Duas coisas que juntas decidem se a fase-03 acontece:

1. **Um script que mede** o que da para medir sem julgamento, gravando baseline em JSON. Sem isso a
   auditoria vira opiniao; com isso tem antes/depois.
2. **O tracer bullet** — a skill portada aplicada a **uma** skill real (`system-design`, o pior
   ofensor medido) precisa produzir um achado acionavel. Se nao produzir, a fase-03 nao roda: o
   problema esta na skill, nao na escala.

---

## Arquivos Afetados

**NOVOS**
- `scripts/audit-skill-docs.ts`
- `scripts/audit-skill-docs.test.ts`

**GERADOS (nao versionados como fonte)**
- `docs/generated/skill-audit-baseline.json`

**FORA do escopo**
- Nenhuma edicao em `skills/*/SKILL.md` (INV-03) — inclusive `system-design`, que e **lido** no
  tracer, nunca escrito

---

## Implementacao

### Passo 1: RED — `audit-skill-docs.test.ts`

Testes contra fixture em tmpdir, nao contra o repo real (o repo muda; o teste nao pode).

Casos:
- conta chars de `description` corretamente com frontmatter valido
- retorna `0` triggers para description sem lista de gatilhos
- detecta negacoes (`nunca|nao|jamais|never|don't|do not`) e devolve a contagem com as linhas
- detecta description duplicada entre frontmatter e um payload de hook fornecido
- ignora arquivo sem frontmatter em vez de estourar
- lida com CRLF sem falso negativo (compound 2026-05-19)

Nomes sem "should" — verbos descritivos.

### Passo 2: GREEN — `audit-skill-docs.ts`

Metricas **objetivas apenas**. Julgamento (no-op, sprawl, leading word desperdicada) e trabalho de
subagente na fase-03, nao de regex.

| Metrica | Como | Serve para |
|---|---|---|
| `descriptionChars` | len da linha `description:` | context load direto |
| `triggerCount` | itens entre aspas / separados por virgula na description | densidade de branch |
| `bodyLines` | linhas apos o frontmatter | candidato a sprawl |
| `negations` | regex + numero da linha | material para o passo "prompt o positivo" |
| `hookDuplication` | description presente no payload do `SessionStart` | duplicacao medida |
| `satelliteFiles` | arquivos irmaos alcancados por ponteiro | uso de progressive disclosure |

Saida: JSON com um registro por skill + agregados. Escreve em `docs/generated/`.

Nada de score composto. Um numero unico esconde qual eixo esta ruim.

### Passo 3: baseline

Rodar contra as 39 skills. Confirmar contra os numeros ja medidos no CONTEXT (15.149 chars,
36/39 model-invoked, `system-design` em 1.497). **Divergencia aqui e bug no script**, nao descoberta.

### Passo 4: TRACER BULLET — aplicar a skill a `system-design`

Carregar a `writing-for-agents` da fase-01 e aplicar os 6 testes a `skills/system-design/SKILL.md`
(528 linhas, description de 1.497 chars). Produzir um achado escrito com:

- qual dos 6 conceitos foi violado
- a evidencia (linha citada)
- o delta mensuravel projetado (chars economizados, duplicacoes fechadas)
- o patch **proposto** — nao aplicado (DI-04, INV-03)

**Gate:** se o achado for generico ("a description e longa") em vez de acionavel ("estes 47 dos ~90
triggers sao sinonimos renomeando 6 branches; colapsar para 6 corta ~900 chars"), a fase-01 volta
para revisao. A fase-03 nao roda com a lente cega.

---

## Gotchas

- **G1** — Nao medir o repo real dentro do teste. Fixture em tmpdir.
- **G2** — O parser de frontmatter precisa aguentar CRLF *e* description multi-linha (varias das
  nossas usam aspas com quebra).
- **G3** — `docs/generated/` nao e distribuido por `sync-to-global.sh`. Correto para baseline
  (metadocumentacao), errado se algum dia virar runtime asset.
- **G4** — A tentacao de deixar o script "sugerir cortes". Ele mede; quem julga e a fase-03.
  Regex nao roda o teste do no-op, que e comportamental.

---

## Verificacao

### TDD

RED (passo 1) -> GREEN (passo 2). Cada teste falha por motivo certo antes de passar.

### Checklist

- [ ] `bun test scripts/audit-skill-docs.test.ts` verde
- [ ] `bun run typecheck` verde
- [ ] Baseline gerado e bate com os numeros do CONTEXT
- [ ] Achado do tracer e acionavel, com delta numerico
- [ ] `git status` mostra zero modificacao em `skills/*/SKILL.md`

---

## Criterio de Aceite

**Por maquina:**
- `bun test scripts/audit-skill-docs.test.ts && bun run typecheck` exit 0
- `docs/generated/skill-audit-baseline.json` existe com 39 registros
- Agregado bate com o CONTEXT (±2% de tolerancia de parsing)
- Zero diff em `skills/`

**Por humano:**
- O achado do tracer em `system-design` nomeia o conceito violado, cita linha e projeta numero
- Voce leria esse achado e saberia exatamente o que mudar
