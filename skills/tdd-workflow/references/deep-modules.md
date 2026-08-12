# Deep Modules (Ousterhout)

Reference for tdd-workflow and anti-vibe-review. Source: "A Philosophy of Software Design" — John Ousterhout.

---

## Conceito Central

**Deep Module:** interface simples → implementacao rica.
Exemplo: `File.open(path)` — 1 parametro esconde filesystem, buffers, encoding, locks, permissoes.

**Shallow Module:** interface complexa → implementacao trivial.
Exemplo: classe com 15 metodos publicos onde cada um tem 3 linhas.

Profundidade tem dois eixos: **quanto** a interface esconde — medido pelos sinais abaixo — e **onde**
ela fica, o **seam**, com o **adapter** que a atravessa.

**Metrica informal:** a interface e quase tao complexa quanto a implementacao? Entao o modulo e raso.
Complexidade aqui e o que o caller precisa aprender, nunca contagem de linhas.

---

## Sinais de Shallow Module

1. Muitos getters/setters sem logica (expoe estado interno diretamente)
2. Classe "pass-through" — delega 100% sem adicionar valor
3. O caller aprende quase tanto quanto o modulo faz por ele — pouco **leverage**
4. Consumidor precisa coordenar 5+ modulos para fazer algo simples
5. Information leakage: detalhes internos visiveis na API (ex: expoe `userId` quando deveria expor `User`)

**Meca por leverage, nunca por volume.** O sinal 3 deste doc foi, ate 2026-08-12, um ratio bruto de
tamanho entre interface e implementacao. Ratio assim premia inchar o corpo do modulo — 500 linhas
redundantes "pontuam" mais fundo que 50 densas — e como esta referencia alimenta auditoria real
(`verify-work`, `anti-vibe-review`), o vies chegava ao veredito.

---

## Sinais de Deep Module

1. Interface com poucos parametros (1-3 e o ideal)
2. Esconde complexidade interna — o consumidor nao precisa saber como funciona
3. "Funciona como magica" para o consumidor
4. Mudancas internas nao quebram a API
5. Facil de usar corretamente, dificil de usar errado (pit of success)

---

## Interface e mais que assinatura

Interface e **tudo que o caller precisa saber para usar o modulo corretamente**: a assinatura de tipo,
mais invariantes, restricoes de ordem, modos de erro, configuracao obrigatoria e caracteristicas de
performance.

Um modulo de 1 parametro que exige `init()` antes, estoura em ordem errada e degrada acima de 10k
itens **nao e** deep: escondeu complexidade da assinatura, nao do caller. O que fica fora da
assinatura, o caller aprende por bug.

## Seam

Um **seam** (Feathers) e um lugar onde voce altera o comportamento sem editar naquele lugar — a
*localizacao* onde a interface do modulo mora. Onde por o seam e decisao propria, anterior ao que vai
atras dele: conteudo certo no seam errado obriga todo caller a atravessar a fronteira errada.

- **1 adapter = seam hipotetico. 2 adapters = seam real.** Introduza seam quando algo de fato varia;
  com um unico adapter voce tem indirecao.
- **Seams internos vs externos.** Um modulo deep pode ter seams internos, privados a implementacao e
  usados pelos proprios testes, sem expo-los na interface externa. Seam interno nao vira port.

## Adapter

Um **adapter** e a coisa concreta que satisfaz a interface num seam. Descreve **papel** — que slot
preenche — nao substancia. Adapter pequeno pode ter implementacao grande (repositorio Postgres);
adapter grande pode ter implementacao pequena (fake em memoria).

Distinto do Adapter do GoF, que converte uma interface incompativel na esperada
(`skills/design-patterns/references/gof-patterns.md` §6). La e pattern de conversao; aqui e papel num
seam — um adapter neste sentido pode nao converter nada.

## Leverage e Locality

Os dois retornos da profundidade. Sao distintos, e um refactor pode entregar um sem o outro:

- **Leverage** — o que o *caller* ganha: quanto comportamento ele exerce por unidade de interface que
  precisa aprender. Uma implementacao se paga em N call sites e M testes.
- **Locality** — o que o *mantenedor* ganha: mudanca, bug, conhecimento e verificacao concentram num
  lugar em vez de espalhar pelos callers. Conserta uma vez, conserta em todo lugar.

Wrapper de 1 caller da locality sem leverage — e por isso que ele parece util e nao se paga.

## Testes operacionais

- **Deletion test.** Imagine deletar o modulo e inline seu conteudo nos callers. A complexidade some?
  Era pass-through. Reaparece espalhada em N callers? O modulo estava se pagando.
- **A interface e a superficie de teste.** Callers e testes atravessam o mesmo seam. Se o teste
  precisa chegar *alem* da interface para verificar o resultado, o achado e a forma do modulo — o
  seam esta no lugar errado.

## Categorias de dependencia

A categoria da dependencia decide **como testar atraves do seam**:

| Categoria | O que e | Estrategia de teste |
|---|---|---|
| In-process | Computacao pura, estado em memoria, zero I/O | Sempre aprofundavel. Testa direto pela nova interface, sem adapter |
| Local-substituivel | Tem stand-in local (PGLite para Postgres, fs em memoria) | Aprofundavel se o stand-in existe. Seam interno; sem port na interface externa |
| Remota mas propria | Seus servicos atravessando rede | Define **port** no seam. Adapter HTTP em producao, adapter em memoria em teste |
| Externa real | Terceiros que voce nao controla (Stripe, Twilio) | Port injetado; teste com mock adapter |

**Replace, don't layer.** Teste antigo escrito contra o modulo shallow vira lixo quando ja existe
teste na interface aprofundada — **delete o antigo** em vez de empilhar os dois. Teste assevera
resultado observavel atraves da interface, nunca estado interno: se ele precisa mudar quando a
implementacao muda, esta testando alem da interface.

---

## Como Aplicar no TDD

**Fase RED (projetando a interface):**
- Escreva o teste como queria usar o modulo, nao como ele vai ser implementado
- Pergunta: "Que interface eu gostaria de chamar aqui?"
- Interface ideal do consumidor → interface do modulo

**Sinais de alerta durante TDD:**
- Se o teste precisa saber detalhes de implementacao → modulo shallow demais
- Se a interface muda a cada refactoring → information leakage
- Se o teste precisa mockar 5 dependencias → modulo nao e deep o suficiente
- Se o setup do teste e maior que o assert → interface errada

---

## Relacao com SOLID

| Principio | Conexao com Deep Modules |
|-----------|-------------------------|
| SRP | SRP = 1 responsabilidade. Deep = executa essa responsabilidade inteiramente. Nao sao contradicoes — SRP define o ESCOPO, Deep define a PROFUNDIDADE dentro do escopo |
| ISP | ISP diz "interfaces pequenas e focadas". Deep Modules diz "interface simples". Sao complementares: ISP garante foco, Deep garante que a interface nao vaza complexidade |
| DIP | Dependa de abstracoes. Deep Modules: prefira abstracoes que escondam complexidade real (nao abstracoes rasas que apenas renomeiam coisas) |

---

## Anti-padrao: "Classitis"

Sintoma: muitas classes pequenas que fazem quase nada individualmente.
Cada classe e "simples" mas o sistema e complexo porque o consumidor precisa orquestrar tudo.

Deep Modules corrige: menos modulos, cada um fazendo mais dentro do seu escopo.

---

## Exemplos Praticos

**Shallow (problema):**
```typescript
// 4 classes para criar um usuario
class UserValidator { validate(data: UserInput): ValidationResult { ... } }
class UserMapper    { toEntity(data: UserInput): UserEntity { ... } }
class UserRepository { save(entity: UserEntity): Promise<User> { ... } }
class UserService   {
  async create(data: UserInput) {
    const valid = this.validator.validate(data);     // consumidor precisa saber
    const entity = this.mapper.toEntity(data);       // da existencia de 3 deps
    return this.repository.save(entity);             // e da ordem de operacao
  }
}
```

**Deep (solucao):**
```typescript
// 1 modulo com interface simples, implementacao rica
class UserService {
  async create(data: UserInput): Promise<User> {
    // validacao, mapping, persistencia — tudo interno
    // interface: 1 metodo, 1 parametro
    // consumidor nao sabe e nao precisa saber o que acontece dentro
  }
}

// Uso:
const user = await userService.create({ name, email });
```

---

## Deep Module vs God Object

Confusao comum: "Deep Module vai virar um God Object?"

| Caracteristica | Deep Module | God Object |
|---------------|-------------|------------|
| Responsabilidades | 1 (SRP) | Muitas, desrelacionadas |
| Interface | Simples, coesa | Complexa, heterogenea |
| Tamanho | Pode ser grande | Geralmente grande |
| Testabilidade | Alta (1 preocupacao) | Baixa (muitos concerns) |

**Teste rapido:** se remover uma parte do modulo e ela nao fizer sentido isolada, pertence ao modulo (Deep). Se fizer sentido isolada e nao depende das outras partes, deveria ser extraida (God Object).

Complementa o deletion test, nao concorre: o deletion test pergunta se o **modulo inteiro** se paga;
este pergunta se **uma parte dele** pertence ali.
