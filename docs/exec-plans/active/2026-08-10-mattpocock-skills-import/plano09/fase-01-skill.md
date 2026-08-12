---
fase: 01
plano: 09
status: planned
---

# Fase 01: A Skill

**Plano:** 09 — `resolving-merge-conflicts`
**Sizing:** ~1.5h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** false

**Decisoes:** DI-29 (skill separada, model-invoked) · DI-30 (os 3 compounds) · DI-31 (escape do abort)
**Invariantes:** INV-01..INV-04

---

## O que esta fase entrega

A skill inteira. E pequena — o porte da fonte tem 14 linhas; o que a engorda sao os tres compounds
deste repo, e eles entram **onde a decisao acontece**, nao num apendice.

---

## Arquivos Afetados

**NOVOS**
- `skills/resolving-merge-conflicts/SKILL.md`

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md`

**FORA do escopo**
- Ponteiro em `git-workflow-and-versioning` (fase-02)
- Alterar os compounds — sao **citados**, nao movidos

---

## Implementacao

### Passo 1: frontmatter

`name: resolving-merge-conflicts` · `description` EN < 200 chars · `user-invocable: true` ·
`disable-model-invocation: false` (DI-29) · `allowed-tools: Read, Grep, Glob, Bash, Edit`.

A description descreve um **estado**, nao um topico: ha merge ou rebase em andamento com conflito.
Isso e detectavel — `MERGE_HEAD` / `REBASE_HEAD` existindo, marcadores `<<<<<<<` nos arquivos — e e
o que torna a invocacao por modelo util aqui.

Um branch so, um trigger so. Description curta de verdade.

### Passo 2: os cinco passos

Copia traduzida, preservando a ordem e os criterios:

1. **Ver o estado real.** `git status`, `git log` dos dois lados, quais arquivos conflitam. Antes de
   abrir qualquer arquivo
2. **Achar as fontes primarias.** Por que cada mudanca foi feita, qual era a intencao — mensagens de
   commit, PRs, issues (INV-01). *Pronto quando:* voce consegue enunciar a intencao de cada lado
   sem olhar o diff
3. **Resolver hunk por hunk.** Preservar as duas intencoes onde der. Incompativeis → escolher a que
   casa com o objetivo declarado do merge, **anotando o trade-off**. Nao inventar comportamento novo
   (INV-02)
4. **Rodar os checks do projeto.** Descobrir quais sao (typecheck, testes, format) e rodar. Consertar
   o que o merge quebrou (INV-04)
5. **Terminar.** Stage, commit. Em rebase, continuar ate todos os commits estarem rebasados

O passo 2 e o mecanismo. Sem ele a skill vira "escolha um lado", e o passo 3 nao tem em que se
apoiar.

### Passo 3: a regra do abort, com escape (DI-31, INV-03)

**Sempre resolva.** Abortar nao faz o conflito sumir — adia, e joga fora o entendimento ja
construido. Ele volta identico na proxima tentativa.

**O escape:** se o *merge em si* estava errado — branch errada, base errada, direcao errada —
abortar e a resposta certa, e a skill diz isso.

Escrever a distincao como pergunta, para nao virar porta dos fundos: *o merge esta errado, ou a
resolucao esta dificil?* Dificuldade nao e motivo.

### Passo 4: compound de merge-vs-rebase, no passo 1

Onde a decisao acontece: voce descobre a divergencia e escolhe como integrar.

Se ha **tag anotado** apontando para um commit local, `pull --rebase` reescreve os SHAs e a tag passa
a apontar para commit orfao. `--no-rebase` cria merge commit e preserva.

Citar `docs/compound/2026-05-12-merge-not-rebase-after-tag.md` — nao copiar a tabela inteira. O
compound e a fonte; aqui fica o gatilho e a consequencia.

### Passo 5: compound de stash, tambem no passo 1

**Stash e o instinto de quem topa num conflito** — "deixa eu limpar isso e olhar direito".

`git stash` reverte edicoes em silencio quando outros processos estao mexendo nos arquivos. Neste
repo, edicoes em `agents/*.md` sumiram e so foram notadas dois planos depois.

Como aviso posicionado no momento do impulso, vale muito mais que numa lista de leituras. Citar
`docs/compound/2026-05-14-git-stash-parallel-processes.md`.

### Passo 6: compound de revert, no passo 5

Reverter e a saida quando a resolucao se mostra errada **depois** de commitada.

Loop de `git revert HEAD` oscila entre revert e reapply — o segundo revert desfaz o primeiro, e o
resultado depende da paridade de N. Usar sintaxe de range.

Citar `docs/compound/2026-05-12-git-revert-range-vs-loop.md`.

### Passo 7: passar a lente do plano01

Alvos: a skill deve ficar **curta** — se passar de ~90 linhas, os compounds foram copiados em vez de
citados. E conferir que os tres compounds estao **nos passos**, nao numa secao no fim (o modo de
falha registrado no README).

---

## Gotchas

- **G1** — Copiar o conteudo dos compounds em vez de citar. Duplicacao: o compound vira desatualizado
  e a skill vira a copia errada.
- **G2** — Compounds numa secao "leituras relacionadas". Ninguem le apendice no meio de um conflito.
- **G3** — Escape do abort largo demais (INV-03).
- **G4** — Description descrevendo topico ("conflitos de git") em vez de estado ("ha merge em
  andamento com conflito"). Estado e o que dispara na hora certa.
- **G5** — Marcadores de conflito (`<<<<<<<`) dentro de bloco de exemplo na `SKILL.md` podem confundir
  ferramenta que varre o repo procurando conflito real. Se usar exemplo, deixar claro que e
  ilustrativo.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `description` < 200 chars, descreve **estado**, um trigger so
- [ ] Os 5 passos presentes, com o criterio de pronto do passo 2
- [ ] Regra "sempre resolva" + escape estreito, escrito como pergunta
- [ ] Os 3 compounds **citados** (nao copiados), cada um no passo da decisao
- [ ] `SKILL.md` ≤ ~90 linhas
- [ ] Links para os compounds resolvem a partir de `skills/resolving-merge-conflicts/`
- [ ] `THIRD-PARTY-NOTICES.md` atualizado

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- `description` < 200 chars
- `SKILL.md` ≤ ~90 linhas
- Os 3 links de compound resolvem

**Por humano:**
- Ler o passo 2 e saber o que "achar a fonte primaria" exige na pratica
- Ler o escape do abort e saber dizer, num caso concreto, se ele se aplica
- Os compounds aparecem no momento em que a decisao e tomada, nao no fim
