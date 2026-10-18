# Arquitetura — Guia completo (referência)

> **Este é o texto longo do guia, guardado como referência (D4 da 8.0).** O `SKILL.md` é o roteiro de
> perguntas; este arquivo só é lido quando o usuário pedir o texto completo ou o aprofundamento de um
> tópico. Os arquivos citados abaixo ficam na mesma pasta.

---

## 1. SOLID Principles

SOLID sao ALVOS de design, nao regras absolutas. Em projetos pequenos, aplicar tudo pode criar boilerplate desnecessario. A nota pragmatica ao lado de cada principio indica a forca com que deve ser seguido.

> **Referencia completa:** `solid-principles.md`

### Resumo Pragmatico

| Principio | Nota | Regra de Ouro |
|-----------|------|---------------|
| **S** — Single Responsibility | 7/10 | Definir "responsabilidade" no nivel do dominio, nao granularidade tecnica |
| **O** — Open/Closed | 8/10 | Aplicar quando `if/else` cresce a cada feature. NAO aplicar em MVPs |
| **L** — Liskov Substitution | 10/10 | INVIOLAVEL. Unico principio SOLID que e lei matematica |
| **I** — Interface Segregation | 5/10 | Aplicar em bibliotecas/SDKs publicos. Cuidado com fragmentacao |
| **D** — Dependency Inversion | 6.5/10 | Aplicar em boundaries arquiteturais. Pular em scripts simples |

### Arvore de Decisao

```
Devo aplicar SOLID aqui?
  Projeto pequeno / MVP / prototipo?
    SIM → Focar em SRP e LSP. Resto e prematura otimizacao
    NAO → Projeto em crescimento / producao?
      SIM → Aplicar todos com pragmatismo
            L (LSP) → SEMPRE, sem excecao
            O (OCP) → Quando switch/if cresce
            S (SRP) → Quando classe faz "coisas demais"
            D (DIP) → Em boundaries (infra vs dominio)
            I (ISP) → Em APIs publicas / bibliotecas
```

---

## 2. Monolito vs Microservicos

> **Referencia completa:** `monolith-vs-microservices.md`

### Pergunta Central

> "Por que fazer network requests em vez de chamadas de funcao?"

Se nao existe resposta CONCRETA, ficar no monolito.

### Arvore de Decisao

```
Precisa escalar?
  Monolito com load balancer resolve?
    SIM → Ficar no monolito
    NAO → Qual parte precisa escalar independentemente?
      Parte especifica → Extrair SO esse servico
      "Tudo" → Provavelmente nao mediu direito
```

### Quando Monolito

- Time pequeno (< 10 devs)
- Dominio ainda sendo descoberto
- Startup/MVP em validacao
- Um servidor Hetzner de 40/mes resolve mais que dezenas de servicos cloud

### Quando Microservicos

- Multiplos times tropecando no mesmo codigo
- Necessidade COMPROVADA de escala independente
- Observabilidade distribuida JA esta pronta
- Deploys independentes sao criticos para velocidade do time

### Alternativas ANTES de Migrar

1. Load balancers — escala horizontal do monolito
2. Bibliotecas compartilhadas — reuso sem rede
3. Modulos internos bem definidos — boundaries sem latencia
4. Modular monolith — boundaries de microservicos, deploy de monolito

---

## 3. CQRS & Event Sourcing

> **Referencia completa:** `cqrs-event-sourcing.md`

### Decisao de DOMINIO, nao tecnica

A pergunta nao e "CQRS e melhor tecnicamente?" mas sim "Meu dominio PRECISA de auditabilidade completa?"

### Arvore de Decisao

```
O dominio exige historico completo de mudancas?
  NAO → CRUD simples resolve. NAO usar CQRS/ES
  SIM → Regulacao exige audit trail?
    SIM → Event Sourcing (financeiro, saude, compliance)
    NAO → Valor de negocio em "como chegamos nesse estado?"
      SIM → Event Sourcing
      NAO → CQRS sem Event Sourcing pode bastar
            (read/write models separados, sem event store)
```

### Principios-Chave

1. **Eventos sao IMUTAVEIS** — nunca deletar ou alterar um evento
2. **Reversoes = novos eventos compensatorios** — `OrderCancelled` compensa `OrderPlaced`
3. **Projecoes** — read models construidos a partir dos eventos para consultas rapidas
4. **Eventual consistency** — read model pode estar alguns ms atras do write model

---

## 4. REST vs GraphQL

> **Referencia completa:** `api-architecture.md`

### Arvore de Decisao

```
Quantos front-ends consomem a API?
  1-2 → REST (com endpoints especializados se necessario)
  3+  → GraphQL PODE fazer sentido
        Time tem experiencia com GraphQL?
          NAO → REST + BFF (Backend for Frontend)
          SIM → Avaliar custo/beneficio
```

### Comparacao Rapida

| Aspecto | REST | GraphQL |
|---------|------|---------|
| Cache | HTTP nativo (CDN, ETags) | Requer solucao custom |
| Curva de aprendizado | Baixa | Media-alta |
| Overfetching | Endpoints especializados | Resolvido nativamente |
| Monitoramento | Maduro | Requer tooling especifico |
| Upload de arquivos | Nativo | Workaround necessario |
| Real-time | WebSockets/SSE | Subscriptions |

### Abordagem Hibrida

REST para a maioria dos endpoints + GraphQL para telas complexas que agregam muitos dados. Nao e tudo ou nada.

---

## 5. Escolha de Stack

> **Referencia completa:** `api-architecture.md` (secao Stack Selection)

### Processo de Decisao

```
1. ESCOPO     → Definir o problema com clareza
2. CORE       → Identificar as partes essenciais
3. PESQUISA   → Avaliar opcoes maduras para cada componente
4. PoC        → Prototipos para validar riscos tecnicos
5. ADR        → Documentar a decisao e justificativa
```

### Principios

- **Hype e irrelevante** — "Todo mundo esta usando X" nao e argumento
- **Dimensionar o problema ANTES** — "Precisamos de Kafka?" → "Qual o volume de mensagens?"
- **Maturidade > Modernidade** — ecossistema maduro = mais libs, mais respostas, mais candidatos
- **Boring technology** — tecnologia chata e comprovada reduz risco. Tokens de inovacao sao limitados

### Red Flags

- "Vamos usar porque e o que eu conheco" (sem avaliar alternativas)
- "Vamos usar porque e novo e moderno" (hype-driven)
- "E o padrao do mercado" (sem validar se resolve SEU problema)
- Nenhuma PoC antes de adotar tecnologia critica
- Ausencia de ADR para decisoes significativas

---

## 6. Design Principles

> **Referencia completa:** `design-principles.md`

### Resumo Rapido

| Principio | Regra | Exemplo |
|-----------|-------|---------|
| Lei de Demeter | Nao falar com estranhos | `order.shippingZip()` em vez de `order.customer.address.zip` |
| Tell-Don't-Ask | Dizer ao objeto O QUE fazer | `account.withdraw(amount)` em vez de checar balance antes |
| Composicao > Heranca | Preferir protocolos/interfaces | Compor comportamentos em vez de hierarquias profundas |
| Acoplamento Temporal | Gerenciar sequencia internamente | `processor.run()` em vez de `init()` → `validate()` → `execute()` |
| Pipe Operator | Modelar como transformacoes | `dados |> validar |> transformar |> persistir` |

---

## 7. Dependency Injection

> **Referencia completa:** `dependency-injection.md`

### DIP vs DI — Conceitos Distintos

| Conceito | Tipo | Pergunta que responde |
|----------|------|-----------------------|
| **DIP** (Dependency Inversion Principle) | Principio SOLID | "De QUEM meu codigo deve depender?" → abstracoes, nao detalhes |
| **DI** (Dependency Injection) | Tecnica / Pattern | "COMO fornecer essas dependencias?" → injecao externa |

DIP e o principio: modulos de alto nivel (core) dependem de abstracoes (interfaces), NAO de modulos de baixo nivel (SDKs, APIs externas). DI e a tecnica que fornece as implementacoes concretas externamente.

### Constructor Injection como Padrao

Dependencias recebidas como parametros do constructor. Usar SEMPRE como escolha padrao.

```
class OrderService {
  constructor(
    private readonly paymentProvider: IPaymentProvider,  // interface, nao concreto
    private readonly emailService: IEmailService
  ) {}
}
```

**Vantagens:** dependencias visiveis na assinatura, objeto sempre valido apos construcao, facil de testar (passar mocks), imutavel.

**Method injection:** quando a dependencia varia por CHAMADA, nao por instancia.
**Property injection:** EVITAR. Objeto pode existir em estado invalido.

### Arvore de Decisao

```
A classe depende de servico externo (API, banco, email, pagamento)?
  SIM → USAR DI + DIP (interface + injecao)
  NAO → Precisa ser testada com mocks?
    SIM → USAR DI (injetar concreta para substituir em testes)
    NAO → A dependencia pode mudar no futuro?
      SIM → USAR DI + DIP
      NAO → Instanciacao direta (new) esta OK
```

**Regra pragmatica:** Aplicar DI/DIP em **boundaries arquiteturais** (pagamento, email, storage, cache, auth). NAO em utils internas, helpers puros, value objects.

### IoC Container — Quando Vale

```
Quantas classes com dependencias?
  < 10 → DI manual (constructor injection)
  10-50 → DI manual funciona, container e opcional
  50+ → Container comecar a fazer sentido
    Framework com container nativo (NestJS, Spring, Angular)?
      SIM → Usar o container do framework
      NAO → Avaliar se a complexidade se justifica
```

### Anti-Patterns

| Anti-Pattern | Problema | Correcao |
|-------------|---------|----------|
| **Service Locator** | Dependencias OCULTAS — classe busca em registro global | Constructor injection — dependencias visiveis na assinatura |
| **DI para tudo** | Interface + implementacao para funcoes puras que NUNCA vao mudar | Se so existe UMA implementacao possivel, funcao direta. YAGNI |
| **Injecao circular** | A depende de B, B depende de A | SRP violado — extrair logica compartilhada para terceira classe |
| **Salvar detalhes externos no banco** | `productId` do Stripe no banco — banco acoplado ao Stripe | Salvar IDs do DOMINIO, mapeamento para IDs externos na camada de integracao |

**Seam** — decidir *onde* a fronteira de um modulo fica e decisao propria, anterior a decidir o que vai atras dela; e da a "DI para tudo" acima um teste contavel: 1 adapter = seam hipotetico, 2 = seam real ([deep-modules](../../tdd-workflow/references/deep-modules.md)).

---

## 8. Defaults Seguros no Design

<!-- 2026-09-01 (Luiz/dev): seguranca e decisao arquitetural, cai no design e nao na auditoria — PRD §RF-07 -->

Quatro decisoes de seguranca sao **arquiteturais**: trocar depois custa migracao, nao patch. Fechar
junto com as outras decisoes de design — nao no fim, quando o codigo ja assumiu uma delas em silencio.

| Decisao | Default seguro | Custo de adiar |
|---------|----------------|-----------------|
| **Modelo de authz** | Deny-by-default; checagem no servidor, por recurso (dono + role) — nunca "todo logado ve tudo" | Cada endpoint novo herda o buraco; o retrofit toca toda rota existente |
| **Gestao de secrets** | Fora do repo e fora do banco: env / secret manager, injetado no runtime | Secret em codigo vaza no historico do git — e historico nao se apaga, so se rotaciona a chave |
| **Dado em repouso** | Classificar antes de modelar (`publico` / `interno` / `PII` / `credencial` / `financeiro`). Credencial e **hasheada** (bcrypt/Argon2), nunca encriptada | Migracao de coluna com dado ja em producao |
| **Isolamento de tenant** | A fronteira do tenant fica na camada mais BAIXA possivel (RLS ou filtro no repositorio), nao repetida em cada handler | Um handler que esqueceu o `where tenant_id` vaza tudo — e a auditoria de codigo nao encontra o que nao esta escrito |

### Arvore de Decisao — onde a autorizacao mora

```
A checagem de "pode?" esta em quantos lugares?
  Repetida em cada handler/rota
    → um handler novo vai esquecer; e questao de tempo. Puxe a checagem para baixo.
  Numa camada unica (middleware / policy / repositorio)
    → o default e NEGAR quando nenhuma regra casa?
        SIM  → ok
        NAO  → allow-by-default disfarcado; e o mesmo buraco com menos linhas
  No banco (RLS)
    → mais forte. Confirme que os servicos internos NAO usam a conexao que ignora RLS
      (service_role / superuser) para operacao de usuario final
```

Consequencia no fluxo: cada default **aceito** aqui vira linha do mapa de ameacas (`## Ameaças &
Dados` do DESIGN.md); cada default **recusado** vira linha das `## Decisões` do mesmo DESIGN.md, com a
razao e a alternativa.
Seguranca recusada sem registro nao e trade-off — e esquecimento com aparencia de decisao.
Para consultoria de profundidade (OWASP, authn/authz, cripto): `/anti-vibe-coding:security`.

---

## Template de Analise Arquitetural

Ao analisar uma decisao arquitetural, seguir este template:

### 1. Contexto

- Qual o problema sendo resolvido?
- Qual o tamanho do time?
- Qual o prazo?
- Qual a maturidade do dominio?

### 2. Opcoes

Para cada opcao, avaliar:
- **Complexidade de implementacao** (1-5)
- **Complexidade operacional** (1-5)
- **Escalabilidade** (1-5)
- **Familiaridade do time** (1-5)
- **Maturidade do ecossistema** (1-5)

### 3. Recomendacao

- Opcao recomendada com justificativa
- Riscos e mitigacoes
- Proximos passos concretos

### 4. ADR

Documentar a decisao no formato:

```
# ADR-001: [Titulo da Decisao]
## Status: [Proposta | Aceita | Deprecada | Substituida]
## Contexto: [Qual problema estamos resolvendo?]
## Decisao: [O que decidimos fazer?]
## Alternativas Consideradas: [O que mais avaliamos e por que descartamos?]
## Consequencias: [Positivas e negativas da decisao]
## Data: YYYY-MM-DD
```

---

## Regras do Consultor

1. **Nunca recomendar sem contexto** — sempre perguntar sobre escopo, time e dominio antes
2. **Questionar premissas** — "Realmente PRECISA disso?" antes de "Como implementar isso?"
3. **Trade-offs explicitos** — toda decisao tem custos, deixar claros
4. **Boring technology primeiro** — provar que a solucao simples nao funciona antes de adotar complexidade
5. **Ensinar o raciocinio** — mais importante que a resposta e o processo de chegar nela
6. **Seguranca e decisao de design, nao revisao** — authz, secrets, dado em repouso e isolamento de tenant fecham junto com as outras decisoes (secao 8), nao na auditoria do fim
