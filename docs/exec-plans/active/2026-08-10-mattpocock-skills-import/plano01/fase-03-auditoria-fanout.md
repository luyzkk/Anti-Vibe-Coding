---
fase: 03
plano: 01
status: planned
---

# Fase 03: Auditoria das 39 Skills — Fan-out em 5 Subagentes

**Plano:** 01 — Porte da `writing-for-agents` + Auditoria
**Sizing:** ~1.5h
**Depende de:** fase-01 (a lente) + fase-02 (o baseline e o gate do tracer)
**Visual:** false

**Decisoes:** DI-02 · DI-04 (relatorio, nunca edicao)
**Invariantes:** INV-03 (zero edicao em skills existentes nesta fase)

---

## O que esta fase entrega

Um relatorio consolidado com achados ranqueados por delta mensuravel, cobrindo as 39 skills.
**Nenhum arquivo de skill e modificado aqui.** A fase-03 observa; a fase-04 muta, com aprovacao
por achado.

---

## Arquivos Afetados

**NOVOS**
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md`

**FORA do escopo**
- Toda e qualquer edicao em `skills/` (INV-03)

---

## Implementacao

### Passo 0: gate da fase-02

Confirmar que o achado do tracer bullet em `system-design` foi acionavel. Se nao foi, **parar** —
a fase-01 volta para revisao. Rodar 5 subagentes com uma lente cega multiplica ruido por 5.

### Passo 1: particionar as 39 skills em 5 lotes

Cap de 8 skills por subagente (CLAUDE.md global: 5-8 arquivos por agente). Particionar por
**tamanho de corpo**, nao alfabeticamente — um lote com `execute-plan` (925) + `plan-feature` (982)
+ `verify-work` (619) estoura contexto; distribuir os pesados entre lotes.

| Lote | Perfil |
|---|---|
| A | as 3 maiores (`plan-feature` 982, `execute-plan` 925, `verify-work` 619) + 5 pequenas |
| B–E | ~8 skills cada, mistura de tamanhos |

Registrar a particao exata no relatorio — reprodutibilidade.

### Passo 2: brief do subagente

Cada subagente recebe: a `SKILL.md` da fase-01 na integra, o recorte do baseline JSON das **suas**
skills, e o achado do tracer como exemplo do padrao esperado.

Instrucao central: **relatorio, nunca edicao** (DI-04, INV-03). Read-only.

Por skill, aplicar os 6 testes e reportar so o que tem consequencia:

| Eixo | O que procurar | Evidencia exigida |
|---|---|---|
| Ponteiro | triggers que sao sinonimos do mesmo branch | os triggers + o branch unico que representam |
| No-op | linha que o modelo ja obedeceria por padrao | a linha + por que o default ja cobre |
| Duplicacao | mesmo significado em dois lugares | os dois locais |
| Negacao | proibicao que vira alvo positivo | a linha + a reescrita positiva |
| Hierarquia | reference que so um branch alcanca, inline | a secao + o branch que a alcanca |
| Leading word | triade explicada em 3 sites que colapsa em 1 token | as 3 ocorrencias + a palavra proposta |
| Completude | step com bound vago convidando premature completion | o step + o bound afiado |

Cada achado carrega **delta projetado** (chars, ou "fecha 1 duplicacao"). Achado sem delta nao entra.

**Guardrail explicito no brief:** agentes mandados "enxugar" otimizam por comprimento, porque
comprimento e o que eles enxergam. O teste do no-op e comportamental — delete a linha e pergunte se
o comportamento mudou. Na duvida, **mantenha e sinalize como incerto**.

### Passo 3: consolidar

Deduplica achados repetidos entre lotes (padroes sistemicos aparecem em varias skills — viram **um**
achado com N ocorrencias, nao N achados).

Ranquear por delta mensuravel. Tres faixas:

- **Sistemico** — mesmo padrao em 5+ skills. Melhor ROI; um patch, muitos arquivos.
- **Alto** — delta > 300 chars ou fecha duplicacao com o hook `SessionStart`.
- **Pontual** — o resto.

### Passo 4: escrever `AUDIT-REPORT.md`

Secoes: particao usada · achados sistemicos · achados por skill · delta total projetado ·
**o que foi deixado de fora e por que** (silenciar truncamento le como cobertura completa) ·
recomendacao de escopo para a fase-04.

---

## Gotchas

- **G1** — Subagente que le "auditar" e comeca a editar. O brief precisa dizer read-only e o
  criterio de aceite checa `git status` limpo em `skills/`.
- **G2** — Achado bonito sem consequencia. Sem delta, nao entra.
- **G3** — 5 lotes produzem 5 vezes o mesmo achado sistemico. Deduplicar no passo 3 ou o relatorio
  vira parede.
- **G4** — Nossas skills de dominio (`security`, `system-design`, `api-design`) tem corpo longo
  **por design** — sao referencia consultavel, e um catalogo legitimamente plano nao e sprawl.
  O brief precisa dizer isso, ou o subagente reporta 500 linhas de conteudo valido como excesso.

---

## Verificacao

### Checklist

- [ ] 5 subagentes rodaram; nenhum retornou vazio
- [ ] `git status` limpo em `skills/` (INV-03)
- [ ] Todo achado tem evidencia citada + delta projetado
- [ ] Achados sistemicos deduplicados
- [ ] Secao "o que ficou de fora" preenchida
- [ ] Delta total projetado comparavel ao baseline da fase-02

---

## Criterio de Aceite

**Por maquina:**
- `AUDIT-REPORT.md` existe, cobre 39 skills, particao registrada
- `git diff --stat skills/` vazio
- `bun run harness:validate` verde

**Por humano:**
- Ler os 5 achados do topo e conseguir decidir sim/nao em cada um sem abrir a skill
- Nenhum achado do tipo "poderia ser mais conciso" sem dizer qual linha e por que
- As skills de dominio nao foram reportadas como sprawl so por serem longas
