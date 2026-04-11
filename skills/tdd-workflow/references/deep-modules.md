# Deep Modules (Ousterhout)

Reference for tdd-workflow and anti-vibe-review. Source: "A Philosophy of Software Design" — John Ousterhout.

---

## Conceito Central

**Deep Module:** interface simples → implementacao rica.
Exemplo: `File.open(path)` — 1 parametro esconde filesystem, buffers, encoding, locks, permissoes.

**Shallow Module:** interface complexa → implementacao trivial.
Exemplo: classe com 15 metodos publicos onde cada um tem 3 linhas.

**Metrica informal:** Se a interface e quase tao complexa quanto a implementacao, o modulo e raso.

---

## Sinais de Shallow Module

1. Muitos getters/setters sem logica (expoe estado interno diretamente)
2. Classe "pass-through" — delega 100% sem adicionar valor
3. Interface tem mais linhas que a implementacao
4. Consumidor precisa coordenar 5+ modulos para fazer algo simples
5. Information leakage: detalhes internos visiveis na API (ex: expoe `userId` quando deveria expor `User`)

---

## Sinais de Deep Module

1. Interface com poucos parametros (1-3 e o ideal)
2. Esconde complexidade interna — o consumidor nao precisa saber como funciona
3. "Funciona como magica" para o consumidor
4. Mudancas internas nao quebram a API
5. Facil de usar corretamente, dificil de usar errado (pit of success)

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
