# Prototipo LOGIC

Alcancado pelo roteador de ramo da [SKILL.md](../SKILL.md) quando a pergunta e sobre **logica de
negocio, transicao de estado ou forma do dado** — o tipo de coisa que parece razoavel no papel e so
revela o problema quando alguem empurra casos reais por ela.

O que sai daqui e **um HTML unico e auto-contido**: um demo compartilhavel que qualquer um dirige
clicando. Como nao tem nada para instalar, ele vai para a mao de quem nao programa — designer, PM,
domain expert — e essa pessoa sente o modelo por conta propria. Por isso ele fala a lingua dela, nao
a do codigo.

## Quando esta e a forma certa

- *"nao sei se essa maquina de estados cobre o caso em que X e depois Y."*
- *"esse modelo de dados consegue representar a situacao em que…?"*
- *"quero sentir como a API deveria ser antes de escrever."*
- Qualquer coisa em que alguem queira **apertar botao e ver o estado mudar**.

Quando a pergunta e *"como isso deveria parecer?"*, o ramo e outro: [UI.md](./UI.md).

## 1. Enunciar a pergunta

Antes de escrever codigo, escrever **qual modelo de estado** e **qual pergunta** estao sendo
prototipados. Um paragrafo, no topo do demo, numa introducao **visivel na pagina**.

Prototipo que responde a pergunta errada e desperdicio inteiro. A pergunta escrita e o que permite
conferir isso depois — inclusive por quem abrir o arquivo semanas adiante, sem ninguem por perto
para explicar.

## 2. Isolar a logica num modulo liftavel

A logica que responde a pergunta vai num `<script>`, escrita como **modulo pequeno e puro**, que
poderia ser recortado e colado no codebase real. A pagina em volta e descartavel; **este modulo nao
e** — e o que da vida ao prototipo depois que ele morre.

A forma vem da pergunta:

| Forma | Quando serve |
|---|---|
| **Reducer puro** — `(state, action) => state` | Acoes sao eventos discretos e o estado e um valor so |
| **Maquina de estados** explicita | *"quais acoes sao legais agora"* faz parte da pergunta |
| **Conjunto de funcoes puras** sobre um tipo | Nao ha estado corrente implicito — so transformacoes |
| **Classe ou modulo com superficie de metodos** | A logica de fato possui estado interno continuo |

Escolher pela pergunta, **nao** pelo que e mais facil de ligar na pagina.

Manter puro tem uma direcao: **a pagina chama o modulo, e nada volta**. Sem DOM, sem `document`, sem
handler alcancando pra dentro. Respondida a pergunta, o reducer ou a maquina validada sobe sozinho
para o modulo real.

## 3. Construir o HTML compartilhavel

Um arquivo, HTML/CSS/JS puro, tudo inline — abre com dois cliques e sobrevive a ser mandado por
e-mail. Escrito para quem nao programa: cada rotulo em linguagem de dominio, e a explicacao em
palavras simples.

De cima para baixo:

1. **Titulo e uma linha** dizendo o que este demo permite explorar — a pergunta do passo 1.
2. **Estado atual** — o estado relevante **inteiro**, como painel legivel de campos rotulados, nunca
   dump de JSON cru. Re-renderizado a cada clique, sinalizando o que acabou de mudar.
3. **Botoes de free-play** — um por acao, sempre disponiveis, para cutucar o modelo em qualquer
   ordem. Cada clique despacha a acao e re-renderiza.
4. **Walkthroughs guiados** — cenarios, um por aba. Cada aba carrega uma descricao curta em
   linguagem simples (a situacao que arma e o que observar) e, embaixo, os **botoes na ordem**. Cada
   passo e um botao de verdade: clicar executa a acao e avanca. **Comecar um walkthrough reseta para
   o estado inicial conhecido**, para o cenario correr igual toda vez.

Escolher cenarios que demonstrem os casos **constrangedores**: o caminho feliz, uma borda espinhosa,
e uma tentativa de fazer algo que **deveria ser ilegal**. Sao os que ninguem consegue simular de
cabeca.

Bonito e contido: tipografia limpa, espaco generoso, uma cor de acento. Nada que compita com o estado
e os botoes.

## 4. Entregar

Mandar o arquivo, ou abrir para a pessoa. Ela clica pelos walkthroughs e pelo free-play quando puder.

Os momentos que valem sao *"peraí, isso não deveria ser possível"* e *"eu achava que X fosse
diferente"* — sao bugs **na ideia**, que e o motivo de o prototipo existir. Pediu acao nova ou
cenario novo? Adicionar. Prototipo evolui.

## 5. Capturar

Respondida a pergunta, capturar pelas regras da [SKILL.md](../SKILL.md). O mapeamento especifico
deste ramo: o **reducer / maquina / conjunto de funcoes validado sobe para o modulo real** — a
decisao, absorvida; a **casca HTML segue para a branch descartavel**, que guarda o prototipo como
fonte primaria. Sendo um arquivo so, ele continua trivialmente re-rodavel de la.

## Anti-padroes

Cada um mata uma forma distinta de estragar o prototipo:

- **Teste.** Prototipo que precisa de teste deixou de ser prototipo.
- **Banco real.** Estado em memoria, salvo se a pergunta for sobre persistencia.
- **Generalizacao.** Nada de *"e se depois quisermos suportar X"*. Uma pergunta.
- **Logica borrada com a pagina.** Modulo puro que referencia DOM, `document` ou handler deixou de
  ser liftavel — e a casca fina sobre modulo puro era o unico ativo aqui.
- **Framework, bundler ou servidor.** Um arquivo que a pessoa abre com dois cliques; app React ou dev
  server derruba o "compartilhavel".
- **Casca HTML em producao.** A pagina foi feita para ser clicada a mao. O que vale guardar e o
  modulo atras dela.
