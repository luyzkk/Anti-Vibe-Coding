---
title: "Reavaliar um numero nao-medido com outro nao-medido — a correcao parece verificacao e nao e"
category: armadilha
tags: [premissas, medicao, regex, redos, seguranca, auditor, backlog, complexidade]
created: 2026-08-18
---

## Problem

O `TODO.md` carregava desde 2026-05-19 um item vindo do security-auditor: regex `[\s\S]*?` lazy em
`atoms-frontmatter-validator.ts` sem closing delimiter guard, rotulada **"ReDoS teorico"**.

Passando por esse arquivo em outro trabalho (a correcao de CRLF), olhei a regex e reavaliei:
quantificador lazy unico, ancora literal, sem alternancia nem quantificador aninhado — **"o pior caso
e quadratico, nao exponencial"**. Escrevi isso no item, no corpo do PR e no relatorio pro dev,
apresentando como correcao de um exagero do auditor.

Quando finalmente fui refatorar, **medi**:

| Input patologico | 256 KB | 1 MB | 4 MB |
|---|---|---|---|
| abre `---` e nunca fecha | 0,7 ms | 2,3 ms | 8,7 ms |

| Input adversarial | 78 KB | 313 KB | 1,25 MB |
|---|---|---|---|
| 320 mil quase-fechamentos `\n--x` + `\r?` ativo em cada posicao | 0,4 ms | 0,8 ms | 3,3 ms |

**Linear nos dois.** Nem ReDoS, nem quadratico. O V8 resolve o quantificador lazy com varredura
linear pra frente porque a ancora de fechamento e literal.

As duas afirmacoes eram do mesmo tipo: **raciocinio sobre complexidade apresentado como fato.** A
minha nao era melhor que a do auditor — era o mesmo erro com um numero diferente. E foi pior num
aspecto: por vir embrulhada como *correcao* ("o rotulo honesto e O(n²)"), soou como se tivesse
havido verificacao. Um numero errado com cara de auditoria dura mais que um numero errado com cara
de suspeita.

O custo aqui foi baixo porque o refactor tinha outra justificativa que se sustentava sozinha (trocar
parser hand-rolled por `js-yaml`). Mas o item ficou tres meses com prioridade de seguranca que nao
tinha, e por dois PRs eu propaguei um numero inventado como se fosse medicao.

Isto **nao** e o mesmo que `docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md`.
La o numero estava certo quando foi escrito e envelheceu. Aqui nada envelheceu: a afirmacao nasceu
errada, na hora, produzida por mim, e o gatilho de re-medicao nao disparou justamente porque **eu era
a fonte** — nao havia doc velho de quem desconfiar.

## Solution

Medir. O benchmark levou menos de um minuto: gerar o input patologico, rodar as duas versoes,
imprimir os tempos. A resposta foi inequivoca na primeira execucao.

O que tornou obvio que valia medir foi a hora: eu estava **prestes a editar o codigo por causa
daquela afirmacao**. Foi esse o gatilho, nao a desconfianca — a afirmacao ja estava escrita em dois
lugares havia dias.

Para complexidade de regex especificamente, a medicao e trivial e o raciocinio e traicoeiro: o
comportamento real depende do motor (V8, PCRE, RE2 divergem), de otimizacoes de ancora, e de qual
input adversarial voce consegue imaginar. Nao da pra derivar de olho.

## Prevention

- **Rotulo de complexidade so entra no registro com o comando que o mediu junto.** "ReDoS",
  "O(n²)", "lento em arquivo grande" sem benchmark ao lado sao hipoteses, e devem ser escritas como
  hipotese.
- **Corrigir um numero de outra pessoa exige a mesma medicao que produzi-lo.** Substituir "ReDoS"
  por "quadratico" nao e verificacao — e uma segunda aposta, com a agravante de parecer resolvida.
  Se voce nao mediu, o texto honesto e "o rotulo esta nao-verificado", nao um rotulo novo.
- **A afirmacao mais perigosa e a que voce mesmo acabou de escrever.** O gatilho de re-medicao
  existente (`2026-08-17-doc-de-planejamento-e-hipotese`) dispara contra doc antigo de outro autor.
  Contra o proprio raciocinio de cinco minutos atras, nao dispara — nao ha nada que "pareca velho".
- **Antes de editar codigo por causa de uma afirmacao, medir a afirmacao.** Esse e o instante em que
  ela sai de conversa e vira acao; e o ultimo ponto barato de verificacao.
- **Refactor que sobrevive a queda da premissa deve ser rejustificado no registro, nao mantido em
  silencio.** Aqui a migracao para `js-yaml` valia por conta propria (block arrays, erro de YAML
  legivel, ~35 linhas a menos) — e o item foi fechado dizendo isso, nao o motivo falso original.

## Affected files

- `skills/init/lib/atoms-frontmatter-validator.ts` — a regex medida, hoje substituida por `indexOf` + `js-yaml`
- `TODO.md` — item #3, fechado com a medicao e com as duas premissas falsas registradas
- `docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md` — o caso de numero que envelhece, distinto deste
- `docs/compound/2026-08-18-item-de-backlog-nomeia-o-site-que-gritou.md` — o outro jeito de o item nascer errado
- PR #48 — o fechamento
