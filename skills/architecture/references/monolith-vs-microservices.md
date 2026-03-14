# Monolito vs Microservicos — Referencia Detalhada

A pergunta central que justifica microservicos: **"Por que fazer network requests em vez de chamadas de funcao?"** Se nao existe resposta concreta, ficar no monolito.

---

## Monolito

**Definicao:** Aplicacao unificada onde todos os componentes estao na mesma codebase, deployada como um unico servico.

**Vantagens:**
- Simplicidade de desenvolvimento e debugging
- Deploy simples (um artefato)
- Chamadas de funcao em vez de network requests
- Um unico banco de dados
- Transacoes ACID triviais
- Observabilidade direta (stack trace completo)

**Quando usar:**
- Time pequeno (< 10 devs)
- Dominio ainda sendo descoberto
- Startup/MVP em validacao
- Um servidor Hetzner de 40 euros/mes resolve o problema

---

## Microservicos

**Definicao:** Arquitetura onde cada responsabilidade e um servico independente com codebase, deploy, servidor e banco proprios, comunicando-se via rede (HTTP, gRPC).

**Complexidades adicionadas:**
- Autenticacao entre servicos (cada request precisa ser autenticado)
- Observabilidade distribuida (onde esta o erro quando recebo 500?)
- Latencia de rede (cada chamada entre servicos adiciona tempo)
- Multiplos bancos de dados para gerenciar
- CI/CD independente para cada servico
- Consistencia eventual entre servicos
- Debugging distribuido (tracing, correlation IDs)

**Quando usar:**
- Multiplos times tropecando no mesmo codigo
- Necessidade COMPROVADA de escala independente
- Observabilidade distribuida JA esta pronta
- Deploys independentes sao criticos para velocidade do time

---

## Motivos Legitimos para Microservicos

1. **Mismatch de infraestrutura:** Servico de IA precisa de GPU; o resto nao. Hardware diferente = servico separado faz sentido.
2. **Spikes assimetricos de trafego:** 95% dos endpoints tem trafego constante; 5% tem picos extremos. Lambdas para os picos, servidor fixo para o resto.
3. **Escala real comprovada:** Bilhoes de usuarios — monolito nao funciona nessa escala.

---

## Motivos Questionaveis (com Alternativas)

| Motivo alegado | Alternativa mais simples |
|----------------|--------------------------|
| Times tropecando uns nos outros | Melhor organizacao, modulos internos bem definidos |
| Muitos conflitos de merge | Extrair libs compartilhadas |
| Deploy muito frequente | Deploys agendados (1-2x por dia) |
| Performance/load | Load balancer + cluster de servidores identicos |
| Dificil identificar bugs | Melhor observabilidade no monolito |

---

## Alternativas ANTES de Migrar

### 1. Load Balancers
Escala horizontal do monolito. Multiplas instancias identicas atras de um load balancer resolvem a maioria dos problemas de carga.

### 2. Bibliotecas Compartilhadas
Reuso de codigo sem rede. Extrair logica comum em pacotes internos resolve problemas de organizacao sem adicionar latencia de rede.

### 3. Modulos Internos Bem Definidos
Boundaries claros dentro do monolito. Cada modulo com sua responsabilidade, contratos definidos entre eles, sem a complexidade de rede.

### 4. Modular Monolith
Boundaries de microservicos com deploy de monolito. Cada modulo e isolado logicamente (com seu proprio schema no banco, interfaces bem definidas), mas o deploy e unico. Migrar para microservicos se torna trivial quando necessario.

---

## Lei de Conway

> "A arquitetura de um sistema reflete a estrutura da organizacao que o construiu."

A maioria das migracoes monolito → microservicos acontece porque times crescem e tropecam uns nos outros, nao por necessidade tecnica. A arquitetura acaba refletindo a organizacao.

**Implicacao pratica:** Se ha 2 squads, havera 2 servicos — independente de ser a melhor decisao tecnica.

---

## Anti-patterns

### Adotar microservicos porque "as Big Tech fazem"
Blogs de FAANG mostram solucoes para problemas de 3 bilhoes de usuarios. Questionar: "minha empresa tem esse problema de escala?"

### Cada servico com seu proprio banco de dados (sem necessidade)
Complexidade explosiva na gestao de dados, consistencia, migracoes. Banco compartilhado e aceitavel para 99% das empresas.

### Ignorar o custo de observabilidade distribuida
Impossivel debugar erros — 500 na cara do usuario sem saber qual servico causou. ANTES de migrar, ter infraestrutura de observabilidade pronta (tracing distribuido, correlation IDs, centralizacao de logs).

### Microservicos como primeira opcao
Nenhum produto nasce como microservico. Criar o monolito, validar o produto, e migrar apenas quando houver necessidade comprovada.

---

## Checklist de Verificacao

```
[ ] Existe necessidade REAL de escala independente? (medido, nao suposto)
[ ] Alternativas mais simples foram avaliadas? (load balancer, modular monolith)
[ ] Observabilidade distribuida esta pronta ANTES da migracao?
[ ] A decisao e tecnica ou organizacional? (Lei de Conway)
[ ] O custo de latencia de rede entre servicos foi considerado?
[ ] A complexidade de CI/CD independente por servico foi avaliada?
[ ] A consistencia de dados entre servicos foi planejada?
```
