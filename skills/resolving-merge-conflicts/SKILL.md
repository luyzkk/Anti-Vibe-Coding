---
name: resolving-merge-conflicts
description: "Use when a git merge or rebase is in progress and conflicted — MERGE_HEAD or REBASE_HEAD exists, git reports unmerged paths, or files carry conflict markers."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Edit
argument-hint: "[opcional: o objetivo do merge]"
---

# Resolving Merge Conflicts

Resolver conflito por **intencao rastreada a fonte** — por que cada lado escreveu aquilo — e nao por
leitura do diff. Ler so o diff mostra *o que* diverge e esconde *por que*, e e ai que a resolucao
vira chute com aparencia de escolha.

**Sempre resolva.** Abortar nao faz o conflito sumir: adia, e joga fora o entendimento que voce
acabou de construir. Ele volta identico na proxima tentativa, e voce paga de novo.

## 1. Ver o estado real

Antes de abrir qualquer arquivo: `git status` para os unmerged paths, e `git log` dos **dois** lados
para saber o que cada um trouxe.

**A pergunta que decide se vale continuar:** *o merge esta errado, ou a resolucao esta dificil?*
Branch errada, base errada, direcao errada — abortar e a resposta certa, e quanto antes melhor.
Dificuldade **nao** e motivo: essa e a parte do trabalho.

Duas armadilhas que moram exatamente aqui:

- **Ha tag anotado apontando para um commit local?** Entao `pull --rebase` reescreve os SHAs e a tag
  passa a apontar para commit orfao; `--no-rebase` cria merge commit e preserva.
  [compound 2026-05-12](../../docs/compound/2026-05-12-merge-not-rebase-after-tag.md)
- **O impulso de "limpar com `stash` para olhar direito".** Com outros processos mexendo nos mesmos
  arquivos — subagentes em paralelo, por exemplo — `git stash` reverte edicoes **em silencio**. Neste
  repo, edicoes em `agents/*.md` sumiram e so foram notadas dois planos depois. Use `git diff <arquivo>`
  ou uma worktree separada.
  [compound 2026-05-14](../../docs/compound/2026-05-14-git-stash-parallel-processes.md)

## 2. Achar as fontes primarias

Para cada lado do conflito, descobrir **por que** a mudanca foi feita e qual era a intencao: mensagem
de commit, PR, issue, o codigo em volta.

**Pronto quando** voce consegue enunciar a intencao de cada lado **sem olhar o diff**. Se so consegue
dizer "esse lado mudou a linha X", a fonte ainda nao foi encontrada — e o passo 3 nao tem em que se
apoiar.

Este passo e o mecanismo da skill. Sem ele o resto vira "escolha um lado".

## 3. Resolver hunk por hunk

Um hunk de cada vez, com as duas intencoes na mao:

- **Compativeis** — preservar as duas. E o caso mais comum, e o mais perdido por pressa.
- **Incompativeis** — escolher a que casa com o **objetivo declarado do merge**, e anotar o
  trade-off junto da resolucao. Quem revisar precisa ver o que foi abandonado.

A resolucao usa o que os dois lados escreveram. Conflito e o pior lugar para estrear comportamento
que nenhum dos lados pediu: ninguem revisa aquilo, porque o diff do merge ja parece ruido.

## 4. Rodar os checks do projeto

Descobrir quais existem — typecheck, testes, formatador — e rodar, **antes** de finalizar.

Cada lado compilava sozinho; a combinacao e codigo que nunca existiu antes. Quebrar no meio e o caso
comum, nao o excepcional — e consertar isso faz parte da resolucao.

## 5. Terminar

Stage e commit. Em rebase, `--continue` ate todos os commits estarem rebasados.

**Se a resolucao se mostrar errada depois de commitada**, reverter tem uma pegadinha: loop de
`git revert HEAD` oscila entre reverter e reaplicar — o segundo revert desfaz o primeiro, e o
resultado final depende da paridade de N. Use sintaxe de range: `git revert --no-edit "HEAD~N..HEAD"`.
[compound 2026-05-12](../../docs/compound/2026-05-12-git-revert-range-vs-loop.md)

## Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "Aborto e refaco com calma" | O conflito volta identico, e o entendimento construido nao. Refazer custa o mesmo mais uma vez |
| "Pego o lado deles, que e mais novo" | Recencia nao e intencao. O lado novo pode nao saber o que o antigo protegia |
| "Os dois querem coisas opostas, escolho um" | Antes de decidir que sao opostos, enuncie as duas intencoes. Boa parte do que parece incompativel diverge so na forma |
| "Aproveito para arrumar isso aqui tambem" | Resolucao e o unico diff que ninguem revisa de verdade. Codigo novo entra em commit proprio |
| "Rodo os testes depois de fechar o merge" | O merge fechado esconde qual lado quebrou. Rodar antes mantem a informacao |

## Red Flags

- Resolucao escolhida sem que a intencao dos dois lados tenha sido enunciada.
- Hunk resolvido com codigo que nao veio de nenhum dos lados.
- Trade-off decidido e nao escrito em lugar nenhum.
- `stash` usado para "limpar e olhar" com outros processos ativos.
- Merge finalizado antes de rodar typecheck e testes.
- `--abort` alcancado porque a resolucao estava dificil, nao porque o merge estava errado.
