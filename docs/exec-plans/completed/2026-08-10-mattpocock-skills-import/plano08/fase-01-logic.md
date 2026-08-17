---
fase: 01
plano: 08
status: planned
---

# Fase 01: Roteador de Ramo + LOGIC + Dogfood

**Plano:** 08 — `prototype`
**Sizing:** ~2.5h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** true — o dogfood termina num HTML aberto no navegador

**Decisoes:** DI-26 (os dois ramos) · DI-27 (model-invoked) · DI-28 (dogfood LOGIC)
**Invariantes:** INV-01 (modulo puro) · INV-02 (sem teste/abstracao/persistencia) · INV-05 (nao vai para main)

---

## O que esta fase entrega

O roteador de ramo, o ramo universal, e a prova de que ele funciona.

---

## Arquivos Afetados

**NOVOS**
- `skills/prototype/SKILL.md`
- `skills/prototype/LOGIC.md`

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md`

**GERADO (nao versionado na main — INV-05)**
- O prototipo do dogfood

**FORA do escopo**
- `UI.md` (fase-02) · ponteiros (fase-03)

---

## Implementacao

### Passo 1: frontmatter

`name: prototype` · `description` EN < 250 chars · `user-invocable: true` ·
`disable-model-invocation: false` (DI-27) · `allowed-tools: Read, Grep, Glob, Write, Bash`.

Branches: sanity-check de modelo de estado ou logica · explorar como uma tela deveria parecer.
Dois branches, dois triggers.

### Passo 2: o roteador de ramo — e ele e o passo mais importante

A pergunta decide a forma, e **errar o ramo desperdica o prototipo inteiro**.

- *"essa logica / esse modelo de estado parece certo?"* → LOGIC
- *"como isso deveria parecer?"* → UI

Se a pergunta e genuinamente ambigua e o usuario nao esta alcancavel: escolher pelo contexto do
codigo em volta (modulo de backend → logic; pagina ou componente → UI) e **declarar a suposicao no
topo do prototipo**. Suposicao declarada e verificavel; suposicao silenciosa nao.

### Passo 3: as 6 regras que valem para os dois ramos

Copia traduzida:

1. **Descartavel desde o dia um, e marcado como tal.** Fica perto de onde vai ser usado (contexto
   obvio), com nome que denuncia que e prototipo. Para rota descartavel, obedecer a convencao de
   roteamento que o projeto ja usa — nao inventar estrutura nova de topo
2. **Trivial de rodar.** Um comando do task runner do projeto, ou um HTML que se abre com dois
   cliques. Zero pensamento para comecar
3. **Sem persistencia por padrao.** Estado em memoria. Persistencia e o que o prototipo **checa**,
   nao do que ele depende. Se a pergunta for sobre banco, usar scratch DB com nome
   `PROTOTIPO — apagar`
4. **Sem polimento.** Sem teste, sem tratamento de erro alem do que o faz rodar, sem abstracao
5. **Expor o estado.** Depois de cada acao (logic) ou troca de variante (UI), mostrar o estado
   relevante inteiro
6. **Capturar quando acabar.** A decisao validada entra no codigo real; o prototipo vai para branch
   descartavel como **fonte primaria**, com ponteiro de contexto. A `main` fica so com a decisao

### Passo 4: `LOGIC.md`

O que o ramo entrega: **um HTML unico e compartilhavel** que qualquer um abre com dois cliques —
inclusive quem nao programa. Sem framework, sem bundler, sem servidor, tudo inline.

Estrutura da pagina, de cima para baixo:

1. **Titulo e uma linha** sobre o que este demo permite explorar — a pergunta do passo 1, **visivel
   na pagina**, nao em comentario
2. **Estado atual** — o estado relevante inteiro, como painel legivel com campos rotulados, nunca
   dump de JSON cru. Re-renderizado a cada clique, sinalizando o que mudou
3. **Botoes de free-play** — um por acao, sempre disponiveis, para poder cutucar em qualquer ordem
4. **Walkthroughs guiados** — cenarios em abas. Cada aba tem descricao em linguagem simples (a
   situacao e o que observar) e abaixo os botoes na ordem. Comecar um walkthrough **reseta para
   estado inicial conhecido**

Escolher cenarios que demonstram os casos **constrangedores** — o caminho feliz, uma borda espinhosa,
e uma tentativa de fazer algo que deveria ser ilegal.

### Passo 5: `LOGIC.md` — o modulo liftavel (INV-01)

A parte que da vida apos a morte ao prototipo.

A logica que responde a pergunta fica num `<script>` como **modulo pequeno e puro**, que poderia ser
recortado e colado no codebase real depois. A pagina em volta e descartavel; **este modulo nao e**.

A forma depende da pergunta — reducer puro `(state, action) => state` · maquina de estados explicita
(boa quando "quais acoes sao legais agora" faz parte da pergunta) · conjunto de funcoes puras sobre
um tipo · classe com superficie de metodos clara, quando a logica de fato possui estado interno.

Escolher pela pergunta, **nao pelo que e mais facil de ligar na pagina.**

Mantendo puro: sem DOM, sem `document`, sem handler de botao alcancando pra dentro. A pagina chama
o modulo; nada flui na direcao contraria.

### Passo 6: linguagem de dominio, nao de codigo

Escrever para nao-desenvolvedor. Cada rotulo em linguagem do negocio — botoes e estado leem como o
dominio, nao como o reducer.

Se o projeto tiver `docs/GLOSSARY.md` (plano05), usar o vocabulario de la. Se nao tiver, usar os
termos que o usuario usa falando. **Degradar, nao quebrar.**

### Passo 7: os anti-padroes

Copia direta — cada um mata uma forma de estragar o prototipo:

- **Sem teste.** Prototipo que precisa de teste deixou de ser prototipo
- **Sem banco real.** Estado em memoria, salvo se a pergunta for sobre persistencia
- **Sem generalizar.** Nada de "e se depois quisermos suportar X". Uma pergunta
- **Sem borrar logica e pagina.** Modulo puro referenciando DOM deixa de ser liftavel (INV-01)
- **Sem framework, bundler ou servidor.** Um arquivo que a pessoa abre com dois cliques
- **Sem mandar a casca HTML para producao.** O modulo de logica e o que vale guardar

### Passo 8: DOGFOOD — um prototipo LOGIC real (DI-28)

Rodar a skill de verdade neste repo.

Criterio de alvo: **modelo de estado com transicoes legais e ilegais**, em que "isso deveria ser
possivel?" e uma pergunta honesta.

**Candidato principal: o ciclo de vida do ADR** (`decision-registry`):
`PROPOSED → ACCEPTED → (SUPERSEDED por ADR-NNNN) ou DEPRECATED`.

Perguntas que parecem resolvidas no papel e nao estao: da para superseder um ADR `DEPRECATED`?
Um ADR pode ser superseded por outro que depois vira deprecated — o primeiro volta a valer? Da para
ir de `PROPOSED` direto a `DEPRECATED` sem passar por `ACCEPTED`?

**Alternativa:** os estados de fase de plano (`planned` / `in_progress` / `completed`), mais simples
e talvez sem transicao ilegal interessante — o que o tornaria alvo fraco.

Gerar, abrir no navegador, clicar. Registrar no MEMORY: o prototipo revelou alguma transicao que o
`decision-registry` nao trata? Se sim, e achado real e vale ADR (ou correcao da skill).

### Passo 9: passar a lente do plano01

Alvos: o roteador de ramo esta no topo e e inequivoco; INV-01 aparece como alvo positivo ("a pagina
chama o modulo") alem da proibicao ("sem DOM no modulo").

---

## Gotchas

- **G1** — Escrever o prototipo a mao em vez de gerar pela skill no dogfood. Invalida a fase.
- **G2** — A pergunta em comentario em vez de visivel na pagina. Quem abre o arquivo depois precisa
  saber o que estava sendo perguntado.
- **G3** — Modulo tocando DOM. INV-01 — e o que separa prototipo util de codigo jogado fora.
- **G4** — Fences aninhados: `LOGIC.md` carrega exemplo de HTML dentro de markdown. Quadruple
  backticks (compound `2026-04-21`).
- **G5** — Commitar o prototipo do dogfood na branch de trabalho. INV-05: branch descartavel, com
  ponteiro.
- **G6** — Alvo de dogfood sem transicao ilegal. Sem "isso deveria ser possivel?", o prototipo nao
  tem o que revelar.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `description` < 250 chars, 2 branches
- [ ] Roteador de ramo no topo, com a regra da suposicao declarada
- [ ] As 6 regras comuns presentes
- [ ] Estrutura da pagina LOGIC com os 4 blocos
- [ ] Modulo liftavel especificado, com as 4 formas e o criterio de escolha
- [ ] Os 6 anti-padroes presentes
- [ ] Degradacao sem glossario documentada (Passo 6)

### Dogfood (Passo 8)

- [ ] Alvo escolhido passa no criterio (transicao ilegal existe)
- [ ] Prototipo **gerado pela skill**, nao escrito a mao
- [ ] Aberto no navegador; free-play e walkthroughs funcionam
- [ ] Reset ao iniciar walkthrough funciona
- [ ] Modulo de logica confere: sem DOM, liftavel
- [ ] Achados registrados no MEMORY — inclusive "nao revelou nada", se for o caso

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- O HTML do dogfood abre sem servidor e sem console error
- `git status` na branch de trabalho nao mostra o prototipo (INV-05)

**Por humano:**
- Voce clicou pelos walkthroughs e entendeu o modelo de estado do ADR sem ler codigo
- Alguem que nao programa conseguiria dirigir o demo
- O modulo de logica dentro do arquivo poderia ser recortado e colado no repo real
