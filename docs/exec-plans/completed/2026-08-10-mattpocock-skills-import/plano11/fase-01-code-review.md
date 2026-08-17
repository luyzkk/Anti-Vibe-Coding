---
fase: 01
plano: 11
status: planned
---

# Fase 01: `code-review` — 8 Smells, Direcao Dupla, Ponto Fixo

**Plano:** 11 — Absorcoes Finais
**Sizing:** ~2.5h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** false

**Decisoes:** DI-35 (absorver, sem skill nova) · **TR-03** (o eixo Spec ja existia parcialmente)
**Invariantes:** INV-01 (sem skill nova) · INV-02 (os 5 smells nossos ficam)

---

## O que esta fase entrega

Tres cirurgias em tres arquivos. A maior delas torna visiveis dois smells que hoje **nao tem como
ser detectados** pela forma como o detector recebe input.

---

## Arquivos Afetados

**MODIFICADOS**
- `agents/code-smell-detector.md` — os 8 smells
- `agents/code-reviewer.md` — direcao dupla no eixo Spec
- `skills/verify-work/SKILL.md` — ponto fixo escolhido pelo usuario

**FORA do escopo**
- Criar skill `code-review` (INV-01)
- `anti-vibe-review` — consolidacao com `verify-work` e item antigo do `ANALYSIS.md`, nao desta fase

---

## Implementacao

### Passo 1: os 8 smells no `code-smell-detector`

Adicionar aos 9 existentes, mantendo os 5 que so temos (INV-02). Formato de cada um, seguindo o que
a fonte faz — **o que e** → **como corrigir**:

| Smell | O que e | Correcao |
|---|---|---|
| Mysterious Name | funcao, variavel ou tipo cujo nome nao revela o que faz ou guarda | renomear; se nao vier nome honesto, o design esta turvo |
| Repeated Switches | o mesmo `switch`/cascata de `if` sobre o mesmo tipo se repete | polimorfismo, ou um mapa compartilhado pelos dois lugares |
| **Shotgun Surgery** | uma mudanca logica forca edicoes espalhadas por muitos arquivos | juntar o que muda junto num modulo so |
| **Divergent Change** | um arquivo e editado por varias razoes nao relacionadas | separar, para cada modulo mudar por um motivo so |
| Speculative Generality | abstracao, parametro ou hook para necessidade que a spec nao tem | deletar; inline de volta ate aparecer necessidade real |
| Message Chains | navegacao longa `a.b().c().d()` que o caller nao deveria conhecer | esconder a caminhada atras de um metodo no primeiro objeto |
| Middle Man | classe ou funcao que so delega adiante | cortar; chamar o alvo direto |
| Refused Bequest | subclasse que ignora ou sobrescreve quase tudo que herda | trocar heranca por composicao |

E as duas regras que a fonte amarra junto:

- **O repo manda.** Standard documentado do projeto sempre vence; onde ele endossa algo que o
  baseline sinalizaria, suprimir
- **Sempre juizo, nunca violacao dura.** Cada smell e heuristica rotulada ("possivel Feature Envy").
  E pular o que a ferramenta ja garante

### Passo 2: os dois smells de diff exigem decisao de input

`Shotgun Surgery` e `Divergent Change` **nao sao detectaveis arquivo por arquivo** — o primeiro e
sobre espalhamento pelo conjunto de arquivos tocados, o segundo sobre pluralidade de razoes num
arquivo dentro de **uma** mudanca.

Hoje o detector recebe "arquivos modificados". Isso e suficiente para *Shotgun Surgery* (da para ver
o espalhamento) mas **nao** para *Divergent Change*, que precisa saber **o que mudou** em cada
arquivo, nao so que mudou.

Decidir e registrar como `DI-Plano11-fase01-diff-input`:

- passar o diff (`git diff <ponto-fixo>...HEAD`) alem da lista de arquivos, ou
- deixar `Divergent Change` fora ate o input mudar

**Adicionar a descricao sem mudar o input e adicionar linha morta** — e o modo de falha que o README
do plano nomeia.

### Passo 3: direcao dupla no `code-reviewer`

Hoje a linha 18 pergunta se o codigo faz o que a spec diz. Adicionar a direcao inversa:
**comportamento no diff que a spec nao pediu.**

Trés categorias, como a fonte separa:

1. requisitos que a spec pediu e estao **faltando ou parciais**  ← ja temos
2. comportamento no diff que **nao foi pedido** (scope creep)  ← **novo**
3. requisitos que parecem implementados mas a implementacao parece **errada**  ← ja temos parcialmente

Cada achado cita a linha da spec. Sem citacao, e opiniao sobre design, nao achado de conformidade.

A categoria 2 e onde `Speculative Generality` do passo 1 encontra o eixo Spec — abstracao que a spec
nao pediu aparece nos dois lugares, e e o mesmo problema visto de dois angulos.

### Passo 4: ponto fixo no `verify-work`

Hoje: `git diff --name-only HEAD~1` → staged → `git status`. Isso cobre "o que acabei de fazer".

Adicionar: **o usuario pode fornecer um ponto fixo** — commit, branch, tag, `main`, `HEAD~5`. Com
ele, o escopo passa a ser `git diff <ponto-fixo>...HEAD` (tres pontos, contra o merge-base) mais a
lista de commits via `git log <ponto-fixo>..HEAD --oneline`.

E a validacao antes de gastar subagente: **confirmar que a ref resolve** (`git rev-parse`) e que o
diff **nao esta vazio**. Ref ruim ou diff vazio tem que falhar ali, nao dentro de auditores
paralelos.

O default continua o de hoje — quem nao passa ponto fixo nao muda de comportamento.

### Passo 5: nao re-ranquear entre eixos

A fonte separa Standards e Spec em subagentes paralelos e **proibe re-ranquear entre eles**: um
codigo pode seguir todo standard e implementar a coisa errada, ou fazer exatamente o que a issue
pediu e quebrar toda convencao. Misturar deixa um eixo mascarar o outro.

Nao vamos separar em dois subagentes (INV-01). Mas a regra vale no **relatorio**: o pior achado de
conformidade com spec e o pior achado de qualidade sao reportados **lado a lado**, sem escolher um
vencedor entre eles.

Verificar se o formato de relatorio do `verify-work` ja faz isso ou se ranqueia tudo junto.

### Passo 6: passar a lente do plano01

Alvo: `code-smell-detector` sai de 9 para 17 smells. Conferir se a lista continua legivel ou se
pede agrupamento — 17 itens planos e um catalogo, e catalogo plano e arranjo legitimo, mas so se
cada item continuar afiado.

---

## Gotchas

- **G1** — Adicionar smell de diff sem mudar o input (Passo 2).
- **G2** — Remover algum dos 5 smells nossos por parecerem redundantes com a lista de Fowler. Nao
  sao (INV-02).
- **G3** — Transformar smell em violacao dura. Sao heuristicas rotuladas; o standard do repo vence.
- **G4** — Diff de dois pontos em vez de tres. Tres pontos compara contra o merge-base, que e o que
  se quer ao revisar branch.
- **G5** — Quebrar o default do `verify-work`. Quem nao passa ponto fixo nao pode mudar de
  comportamento.
- **G6** — Os agentes tem Output Contract validado (`bun run agents:contract`). Conferir se as
  mudancas afetam o contrato.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `bun run agents:contract` verde (G6)
- [ ] 17 smells no detector; os 5 nossos intactos
- [ ] As 2 regras (repo manda · sempre juizo) presentes
- [ ] `DI-Plano11-fase01-diff-input` registrado e resolvido
- [ ] Direcao dupla no `code-reviewer`, com as 3 categorias e exigencia de citar a linha da spec
- [ ] Ponto fixo opcional no `verify-work`, com validacao de ref e de diff vazio
- [ ] Default do `verify-work` inalterado
- [ ] Regra de nao re-ranquear entre eixos no relatorio

### Teste retroativo

- [ ] Pegar um PR real deste repo e rodar o detector com os 17 smells. **Algum dos 8 novos disparou?**
      Se nenhum disparar em nenhum PR, ou o repo e limpo nessas dimensoes, ou a descricao nao esta
      acionavel — registrar qual dos dois

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test && bun run agents:contract` exit 0
- Detector lista 17 smells
- `verify-work` com ponto fixo invalido falha **antes** de spawnar auditor

**Por humano:**
- Ler `Shotgun Surgery` e `Divergent Change` e saber com que input eles seriam detectaveis
- O relatorio nao escolhe vencedor entre conformidade e qualidade
- O teste retroativo rodou e o resultado esta registrado
