---
fase: 01
plano: 02
status: planned
---

# Fase 01: Expandir `deep-modules.md` — Seam, Adapter, Leverage, Deepening

**Plano:** 02 — Vocabulario de Seam
**Sizing:** ~2h
**Depende de:** plano01 fase-01 (escrever contra a lente)
**Visual:** false

**Decisoes:** DI-06 (expande, nao cria skill) · DI-07 (DEEPENING como secao) · DI-03 (termos-ancora EN)
**Conflitos:** CF-01 (metrica de ratio-de-linhas)
**Invariantes:** INV-01..INV-04 do plano02

---

## O que esta fase entrega

A referencia passa de ~118 para no maximo 200 linhas, ganhando o eixo de **localizacao** da
interface e a disciplina de deepening. E perde a metrica que premia inchar implementacao.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/tdd-workflow/references/deep-modules.md`

**FORA do escopo**
- Mover o arquivo (INV-02)
- Tocar os 3 ponteiros existentes — eles continuam resolvendo (fase-02 apenas *adiciona* outros)
- `design-twice` (fase-03)

---

## Implementacao

### Passo 1: corrigir CF-01 — a metrica

Em `## Sinais de Shallow Module`, o sinal 3 (`Interface tem mais linhas que a implementacao`) sai.
Motivo escrito no proprio doc, porque um leitor futuro vai querer re-adicionar: ratio de linhas
**premia inchar a implementacao** — 500 linhas redundantes "pontuam" mais profundo que 50 densas.

Entra no lugar: **depth-as-leverage** — quanto comportamento um caller (ou um teste) consegue
exercer por unidade de interface que precisa aprender.

Ajustar tambem a "Metrica informal" do topo para a formulacao qualitativa (a interface e quase tao
complexa quanto a implementacao?), que sobrevive a critica; e o que sai e o ratio bruto.

### Passo 2: `## Seam` — o conceito ausente

Zero ocorrencias de `seam` no plugin hoje. Definir (Feathers): lugar onde voce altera comportamento
**sem editar naquele lugar**; a *localizacao* onde a interface do modulo mora.

A frase que carrega o conceito: **onde por o seam e uma decisao de design propria, distinta de o
que vai atras dele.** Nossa referencia atual so trata a segunda metade.

Nao usar `costura` (INV-01) — a palavra ja aparece em `messaging-reliability.md` com sentido comum.

Regras operacionais (nao so definicao):

- **1 adapter = seam hipotetico. 2 adapters = seam real.** Nao introduza seam a menos que algo de
  fato varie. Seam de um adapter so e indirecao.
- **Seams internos vs externos.** Um modulo deep pode ter seams internos, privados a implementacao
  e usados pelos proprios testes, sem expo-los na interface.

### Passo 3: `## Adapter`

Coisa concreta que satisfaz uma interface num seam. Descreve **papel** (que slot preenche), nao
substancia (o que tem dentro). Um adapter pequeno pode ter implementacao grande (repo Postgres);
um adapter grande pode ter implementacao pequena (fake em memoria).

Nota de nao-colisao: `design-patterns/references/gof-patterns.md` ja tem o Adapter do GoF, que e
outra coisa — pattern de conversao de interface incompativel. Aqui e papel num seam. Cruzar
referencia explicitamente para o leitor nao confundir.

### Passo 4: `## Leverage e Locality`

Os dois retornos **distintos** da profundidade:

- **Leverage** — o que o *caller* ganha: mais capacidade por unidade de interface aprendida. Uma
  implementacao se paga em N call sites e M testes.
- **Locality** — o que o *mantenedor* ganha: mudanca, bug, conhecimento e verificacao concentram
  num lugar em vez de espalhar pelos callers. Conserta uma vez, conserta em todo lugar.

Separar os dois importa porque um refactor pode entregar um e nao o outro — e o nosso material
atual so argumenta o lado do caller.

### Passo 5: `## Testes operacionais`

Termo sem teste e vocabulario decorativo. Os dois que faltam:

- **Deletion test** — imagine deletar o modulo. Complexidade some? Era pass-through. Complexidade
  reaparece espalhada em N callers? Estava se pagando.
- **A interface e a superficie de teste** — callers e testes cruzam o mesmo seam. Se voce quer
  testar *alem* da interface, o modulo provavelmente tem a forma errada.

O segundo conecta direto com o que a referencia ja diz sobre a fase RED, e reforca sem duplicar.

### Passo 6: `## Interface e mais que assinatura`

Interface = **tudo que um caller precisa saber para usar o modulo corretamente**: a assinatura de
tipo, mais invariantes, restricoes de ordem, modos de erro, configuracao obrigatoria e
caracteristicas de performance.

Consequencia pratica que justifica a secao: um modulo com assinatura de 1 parametro mas que exige
`init()` antes, estoura em ordem errada e degrada acima de 10k itens **nao e** deep — so escondeu
a complexidade da assinatura, nao do caller.

### Passo 7: `## Categorias de dependencia` (DI-07)

Do `DEEPENING.md`. A categoria determina **como testar atraves do seam**:

| Categoria | O que e | Estrategia de teste |
|---|---|---|
| In-process | Computacao pura, estado em memoria, zero I/O | Sempre aprofundavel. Testa direto pela nova interface, sem adapter |
| Local-substituivel | Tem stand-in local (PGLite p/ Postgres, fs em memoria) | Aprofundavel se o stand-in existe. Seam interno; sem port na interface externa |
| Remota mas propria | Seus servicos atravessando rede | Define **port** no seam. Adapter HTTP em producao, adapter em memoria em teste |
| Externa real | Terceiros que voce nao controla (Stripe, Twilio) | Port injetado; teste com mock adapter |

Mais a regra **replace, don't layer**: teste antigo em modulo shallow vira lixo quando existe teste
na interface aprofundada — **delete**, nao empilhe. Testes asseveram resultado observavel atraves
da interface, nao estado interno; se um teste precisa mudar quando a implementacao muda, ele esta
testando alem da interface.

### Passo 8: preservar o que e nosso (INV-03)

Relacao com SOLID (SRP/ISP/DIP), classitis, e a tabela Deep Module vs God Object **nao existem no
repo-fonte**. Ficam. O "teste rapido" do God Object e complementar ao deletion test, nao concorrente
— deixar a diferenca explicita para nao parecerem duas versoes da mesma coisa.

### Passo 9: passar a lente do plano01

Rodar os 6 testes da `writing-for-agents` no arquivo resultante. Alvo especifico: nenhum termo novo
sem teste operacional; nada dito duas vezes entre a secao nova de seam e a secao antiga de sinais.

---

## Gotchas

- **G1** — `adapter` colide com o Adapter do GoF em `design-patterns/references/gof-patterns.md`.
  Papel num seam ≠ pattern de conversao. Cruzar referencia.
- **G2** — `costura` ja e usada com sentido comum em `messaging-reliability.md`. INV-01 existe por isso.
- **G3** — Tentacao de reescrever o arquivo inteiro. Ele tem conteudo bom e 3 consumidores. Expandir
  e corrigir; nao substituir.
- **G4** — Teto de ~200 linhas. Estourar significa que material devia estar atras de ponteiro — e a
  fase-01 do plano01 existe justamente para tomar essa decisao.
- **G5** — CF-01 muda o veredito de auditoria. Nao e efeito colateral: e o ponto. Mas precisa ser
  observado e registrado (ver Verificacao).

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Arquivo ≤ 200 linhas
- [ ] Sinal de ratio-de-linhas removido; substituicao por leverage presente e justificada no texto
- [ ] `seam`, `adapter`, `leverage`, `locality` definidos, cada um com teste ou regra operacional
- [ ] 4 categorias de dependencia presentes com estrategia de teste
- [ ] "replace, don't layer" presente
- [ ] SOLID / classitis / God Object preservados (INV-03)
- [ ] Arquivo no mesmo caminho; 3 ponteiros originais ainda resolvem (INV-02)
- [ ] Cruzamento de referencia com o Adapter do GoF feito (G1)

### Observacao de CF-01 (G5)

- [ ] Escolher um modulo real do repo, rodar o pre-check de deep modules do `verify-work` **antes**
      da mudanca, registrar o veredito
- [ ] Rodar **depois**, registrar
- [ ] Se o veredito mudou, escrever no MEMORY do plano por que a nova leitura e a correta

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run typecheck` exit 0
- `grep -c "linhas que a implementacao"` retorna 0 no arquivo
- `grep -i "seam"` retorna > 5 ocorrencias
- Arquivo ≤ 200 linhas, mesmo caminho

**Por humano:**
- Ler a secao de seam e conseguir dizer, para um modulo do proprio repo, onde o seam esta hoje e se
  ele deveria estar em outro lugar
- Nenhum termo novo aparece so como definicao — todos tem teste ou regra junto
- O veredito antes/depois do pre-check esta registrado, mesmo que nao tenha mudado
