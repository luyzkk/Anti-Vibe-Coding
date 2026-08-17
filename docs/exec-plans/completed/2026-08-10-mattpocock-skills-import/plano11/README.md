# Plano 11: Absorcoes Finais — `code-review`, `tdd`, `grill-with-docs`

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~5h
**Depende de:** plano01 fase-01 (a lente) · plano02 fase-01 (fase-02) · plano05 (fase-03)
**Branch:** `feat/absorcoes-finais`

---

## O que este plano entrega

As tres ultimas absorcoes de valor real. Nenhuma vira skill nova — as tres sao cirurgias no que ja
existe (DI-35, DI-37) ou divergencia registrada (DI-36).

As tres fases sao **independentes entre si** e tem dependencias externas diferentes. Podem rodar
fora de ordem conforme os outros planos entregarem.

---

## Fase 01 — `code-review`: tres cirurgias

O gap foi corrigido no meio da analise (TR-03): o eixo Spec **existe** no agente `code-reviewer`
(linhas 18 e 35). Sobra menos do que a triagem dizia, e o que sobra e preciso.

### O achado com maior densidade: 8 smells de Fowler ausentes

| | Smells |
|---|---|
| So nossos (5) | Funcoes Longas · God Objects · Condicionais Gigantes · Numeros Magicos · Comentarios Inuteis |
| Comuns (4) | Feature Envy · Data Clumps · Primitive Obsession · Duplicated Code |
| **So dele (8)** | Mysterious Name · Repeated Switches · **Shotgun Surgery** · **Divergent Change** · **Speculative Generality** · Message Chains · Middle Man · Refused Bequest |

Dois deles valem mais que os outros seis juntos, por um motivo estrutural: **so sao detectaveis num
diff**. *Shotgun Surgery* e uma mudanca logica forcando edicoes espalhadas por muitos arquivos;
*Divergent Change* e um arquivo editado por varias razoes nao relacionadas. Nosso detector olha
arquivo por arquivo — **nao tem como ver nenhum dos dois.**

E *Speculative Generality* (abstracao adicionada para necessidade que a spec nao tem) conecta direto
com o eixo Spec.

### As outras duas cirurgias

**Direcao dupla no eixo Spec.** Hoje o `code-reviewer` pergunta se o codigo faz o que a spec diz —
faltante ou errado. Nunca se faz o que ela **nao pediu**. Scope creep e a direcao que falta, e e a
que pega over-engineering entrando no PR.

**Ponto fixo escolhido pelo usuario.** `verify-work` identifica arquivos por `git diff HEAD~1` /
staged / `git status`. A fonte pina um ponto fixo que o usuario fornece (commit, branch, tag,
merge-base), com diff de tres pontos. **Revisar uma branch inteira e outro escopo que revisar o
ultimo commit.**

---

## Fase 02 — `tdd`: uma afiacao, um gap, uma divergencia

**Tautologico, afiado (afiacao).** Nosso `tdd-verifier:82` ja pega tautologia — a versao trivial:
`expect(true).toBe(true)`, snapshot vazio. A da fonte e sobre **recomputacao**: a assertion
recalcula o valor esperado do mesmo jeito que o codigo faz — `expect(add(a,b)).toBe(a+b)` — entao
passa por construcao e **nunca pode discordar do codigo**. Valor esperado tem que vir de fonte
independente: literal conhecido, exemplo trabalhado, a spec.

Essa versao parece um teste de verdade e passa despercebida. E esta no lugar errado no nosso: o
verifier pega **depois**; a referencia da fonte e consultada **enquanto** se escreve.

**Seams pre-acordados (gap).** *Nenhum teste e escrito num seam nao confirmado.* Antes de escrever
teste, anotar os seams sob teste e confirmar com o usuario — e assim que o esforco de teste cai nos
caminhos criticos em vez de em toda borda.

**Refactoring fora do loop (divergencia — DI-36).** A fonte poe refactoring na etapa de review, nao
no ciclo. Nosso `tdd-workflow` e explicitamente RED-GREEN-REFACTOR. **Rejeitamos, e registramos por
que** — refatorar com teste verde na mao e a rede de seguranca que torna o refactor seguro; empurrar
para a review separa o momento em que voce entende o codigo do momento em que voce o melhora.

Registrar como divergencia consciente e importante: sem isso, o proximo que comparar as duas skills
vai achar que esquecemos.

---

## Fase 03 — `grill-with-docs`: 7 linhas que viram um ponteiro

O conteudo inteiro da skill e *"Run a `/grilling` session, using the `/domain-modeling` skill."*

Com plano04 (frontier no `grill-me`) e plano05 (`domain-modeling` model-invoked), a composicao ja
esta disponivel. Vira **um ponteiro no `grill-me`** (DI-37), nao uma skill: manter glossario e ADRs
atualizados inline quando a conversa produzir termo novo ou decisao dificil de reverter.

Assim a composicao acontece sem o humano precisar escolher um modo.

---

## Analise de Dependencias

| Fase | Depende de | Por que |
|---|---|---|
| 01 | plano01 fase-01 | so a lente |
| 02 | plano01 fase-01 + **plano02 fase-01** | "seams pre-acordados" precisa do vocabulario de `seam` |
| 03 | plano01 fase-01 + **plano05** | o ponteiro aponta para `domain-modeling`, que precisa existir |

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | Nenhuma skill nova neste plano | As tres sao cirurgias. Skill nova duplicaria `verify-work` (619 linhas) ou `tdd-workflow` (450) |
| INV-02 | Os 5 smells que sao so nossos permanecem | Nao existem na lista de Fowler que a fonte usa. Absorver nao e substituir |
| INV-03 | RED-GREEN-REFACTOR permanece (DI-36) | Divergencia consciente e registrada |
| INV-04 | Nao apontar para skill que ainda nao existe | A fase-03 so roda depois do plano05 |

---

## Como este plano pode falhar

**Os smells de diff entram como texto e nunca disparam.** *Shotgun Surgery* e *Divergent Change*
exigem que o detector **receba um diff**, nao uma lista de arquivos. Adicionar a descricao sem mudar
o input e adicionar linha morta. A fase-01 trata isso como decisao explicita, nao como detalhe.

**A divergencia do refactor vira omissao.** Se `tdd-workflow` so nao mencionar o assunto, o proximo
que comparar as duas skills vai achar que passou batido. Tem que estar escrito **que rejeitamos, e
por que**.

**O ponteiro do `grill-me` transforma toda entrevista em sessao de glossario.** Mitigacao: o gatilho
e termo novo ou decisao dificil de reverter — nao "toda vez".
