---
fase: 02
plano: 08
status: planned
---

# Fase 02: O Ramo UI

**Plano:** 08 — `prototype`
**Sizing:** ~2h
**Depende de:** fase-01 (o roteador de ramo precisa existir)
**Visual:** false — **e o problema desta fase; ver Cobertura**

**Decisoes:** DI-26 (os dois ramos)
**Invariantes:** INV-03 (variantes estruturais) · INV-04 (barra some em producao) · INV-05 (nao vai para main)

---

## O que esta fase entrega

O ramo que responde *"como isso deveria parecer?"* — N variantes na mesma rota, trocaveis por
`?variant=` e por uma barra flutuante.

---

## Cobertura: esta fase nao da para dogfoodar aqui

Este repo e plugin CLI. Sem rotas, sem framework de UI, sem pagina para hospedar variante.

**A fase-02 fica verificada so por leitura ate ser usada num projeto-alvo.** Declarado, nao omitido —
o compound `2026-05-12-skill-md-code-blocks-do-not-execute` registra o custo de declarar pronto com
integracao nunca testada.

Consequencia pratica: o primeiro uso real em projeto Next.js e o teste de verdade. Registrar no
MEMORY que essa divida existe.

---

## Arquivos Afetados

**NOVOS**
- `skills/prototype/UI.md`

**MODIFICADOS**
- `skills/prototype/SKILL.md` — o ramo UI passa a apontar para o satelite

**FORA do escopo**
- Ponteiros (fase-03)

---

## Implementacao

### Passo 1: as duas sub-formas, com a preferencia forte

**Sub-forma A — ajuste numa pagina existente (preferida).** A rota ja existe. Variantes renderizadas
**na mesma rota**, controladas por `?variant=`. Data fetching, params e auth existentes permanecem —
so a renderizacao troca.

Inclui o caso de algo que ainda nao tem pagina mas **viveria naturalmente dentro de uma** (secao nova
do dashboard, card novo na tela de configuracoes, passo novo num fluxo). Montar as variantes dentro
da pagina hospedeira.

**Sub-forma B — pagina nova (ultimo recurso).** So quando a coisa nao tem onde morar — superficie
inteiramente nova, ou fluxo que nao encaixa em lugar nenhum. Rota descartavel seguindo a convencao
de roteamento que o projeto ja usa, com nome que denuncia que e prototipo.

A razao da preferencia, que precisa estar escrita: **prototipo de UI e muito mais facil de julgar
encostado no resto do app** — header real, sidebar real, dados reais, densidade real. Rota isolada e
vacuo, e **toda variante parece boa no vacuo**.

Antes de escolher B, checar: nao ha mesmo pagina onde isso poderia ser embutido?

### Passo 2: N variantes, estruturalmente diferentes (INV-03)

Padrao **3**. Teto **5** — acima disso para de ser radicalmente diferente e vira ruido.

Escrever o plano numa linha, no local do prototipo ou em comentario de topo:

> "Tres variantes da tela de configuracoes, trocaveis por `?variant=`, na rota `/settings` existente."

Cada variante presa a: proposito da pagina e dados disponiveis · sistema de componentes do projeto
(Tailwind, shadcn, MUI, CSS puro — o que for) · nome de componente exportado claro.

E a regra que faz o ramo valer: **layout diferente, hierarquia de informacao diferente, affordance
primaria diferente** — nao cores diferentes. *Tres grades de card levemente ajustadas nao e
prototipo, e papel de parede.* Se duas sairem parecidas, refazer uma com instrucao explicita
("nao use grade de cards").

### Passo 3: a barra flutuante

Fixa embaixo, ao centro, com tres pecas: **seta esquerda** (cicla para tras, com wrap) · **rotulo**
(chave da variante e, se houver, o nome — `B — layout com sidebar`) · **seta direita**.

Comportamento:

- Clicar atualiza o search param **pelo router do framework** (`router.replace` no Next, `navigate`
  no React Router) — variante compartilhavel por URL e estavel no reload
- Teclado: `←` e `→` tambem ciclam. **Nao interceptar** quando `<input>`, `<textarea>` ou
  `[contenteditable]` estiver focado
- Visualmente distinta da pagina (pilula de alto contraste, sombra sutil), para nao ser confundida
  com o design sendo avaliado
- **Escondida em producao** (INV-04) — gate por `NODE_ENV` ou equivalente, para merge acidental nao
  mandar a barra ao usuario

Componente unico e compartilhado, para as duas sub-formas reusarem.

### Passo 4: os anti-padroes

- **Variantes que diferem so em cor ou copy.** Ajuste, nao prototipo (INV-03)
- **Compartilhar codigo demais.** Um `<Header>` compartilhado tudo bem; um `<Layout>` compartilhado
  anula o exercicio — cada variante precisa poder jogar o layout fora
- **Ligar variante a mutation real.** Somente leitura. Se precisar mutar, apontar para stub — a
  pergunta e "como deveria parecer", nao "o backend funciona"
- **Promover o prototipo direto para producao.** O codigo foi escrito sob restricao de prototipo
  (sem teste, tratamento de erro minimo). **Reescrever direito** ao dobrar para dentro

### Passo 5: a captura, por sub-forma (INV-05)

Vencida uma variante, capturar a resposta — qual e por que — e entao:

- **Sub-forma A** — dobrar a vencedora na pagina existente; tirar as perdedoras e a barra da `main`
- **Sub-forma B** — promover a vencedora a rota real; tirar a rota descartavel e a barra da `main`

O **conjunto completo de variantes** e fonte primaria: vai para a branch descartavel, nao para o
lixo. Variante e switcher deixados na `main` apodrecem rapido e confundem o proximo leitor.

### Passo 6: passar a lente do plano01

Alvo: `UI.md` tem 112 linhas na fonte e e o maior satelite do plano. Conferir que nada dele deveria
estar inline na `SKILL.md` — e que nada inline deveria ter descido para ca.

---

## Gotchas

- **G1** — Sub-forma B por preguica. Rota vazia esconde problema de design (Passo 1).
- **G2** — Variantes que sao a mesma coisa repintada (INV-03).
- **G3** — Barra vazando para producao (INV-04).
- **G4** — Interceptar seta em campo de texto. Quebra digitacao em formulario.
- **G5** — Fences aninhados: `UI.md` carrega pseudo-codigo TSX. Quadruple backticks.
- **G6** — Declarar a fase pronta como se tivesse sido testada. Nao foi — ver Cobertura.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] As duas sub-formas presentes, com a preferencia forte por A **e a razao**
- [ ] Padrao 3 / teto 5
- [ ] Regra de diferenca estrutural, com o remedio para variantes convergentes
- [ ] Barra: 3 pecas, router do framework, teclado com a excecao de campo focado, gate de producao
- [ ] Os 4 anti-padroes
- [ ] Captura por sub-forma, com o conjunto indo para branch descartavel
- [ ] `SKILL.md` aponta para o satelite, sem duplicar conteudo

### Divida declarada

- [ ] Registrado no MEMORY que este ramo **nao foi executado**, so revisado, e que o primeiro uso em
      projeto-alvo Next.js e o teste real

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- 1 arquivo novo, 1 modificado

**Por humano:**
- Ler o Passo 1 e saber, para uma tela concreta, se e sub-forma A ou B
- Ler INV-03 e conseguir dizer se duas variantes suas seriam aceitas ou rejeitadas
- A divida de cobertura esta escrita, nao subentendida
