# Fase 01 — Update `skills/init/SKILL.md`: Merge do Template Akita

**Sizing:** ~1.5h  
**Arquivo a modificar:** `f:\Projetos\Claude code\anti-vibe-coding\skills\init\SKILL.md`  
**Estratégia:** ADIÇÃO pura — nenhuma linha existente removida

## Objetivo

Adicionar ao fluxo do `/init` a capacidade de incluir as seções Akita no CLAUDE.md do projeto durante o merge/criação. O template atual (linhas 82–132) define a estrutura do merge mas não especifica o conteúdo das seções Akita a adicionar.

A mudança adiciona:
1. Uma nova seção `## Template Akita — Conteúdo das Seções a Adicionar` que o modelo usa como fonte de conteúdo durante o merge do Passo 2
2. Referência a essa seção nas regras de merge existentes

## Análise do arquivo atual (lido em 2026-04-21)

O arquivo tem 430 linhas. O fluxo do Passo 2 (linhas 82–148) define as regras de merge mas não especifica o conteúdo das novas seções que o Anti-Vibe adiciona. O template de CLAUDE.md está implícito em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`.

O ponto de inserção correto é APÓS a seção `## Regras Importantes` (linha 418) e ANTES da seção `## Diretorio do projeto` (linha 427). Isso coloca o template Akita como referência no final do skill, disponível durante toda a execução.

## Diff a aplicar

### Inserção 1 — Referência ao template Akita nas regras de merge do Passo 2

**Localização:** Após linha 113 (após a tabela de regras de merge), antes de `#### Estrutura do Merge`

```
old_string:
#### Estrutura do Merge (ordem das secoes)

new_string:
> **Conteúdo das seções Akita a adicionar:** Ver seção `## Template Akita` ao final deste skill.

#### Estrutura do Merge (ordem das secoes)
```

### Inserção 2 — Bloco principal do template Akita

**Localização:** Entre `## Regras Importantes` (fim) e `## Diretorio do projeto`

Inserir após a linha que contém `- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui`:

```
old_string:
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**

## Diretorio do projeto

new_string:
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**

---

## Template Akita — Conteúdo das Seções a Adicionar

As seções abaixo compõem o bloco Akita que deve ser ADICIONADO ao CLAUDE.md do projeto durante o merge (Passo 2). Seguir as regras de merge: se seção equivalente já existe, COMBINAR; se não existe, ADICIONAR integralmente.

Posição na estrutura do merge: após `## Padrões Core` e antes de `## Workflow de Desenvolvimento`.

---

### Seção: Code Style for Agents

```markdown
## Code Style for Agents

Convenções obrigatórias para código gerado por IA:

- **Nomes grepáveis:** use nomes específicos ao domínio. NUNCA: `data`, `handler`, `process`, `item`, `info`, `result`, `value`, `temp`, `obj`
- **Funções ≤ 40 linhas:** se ultrapassar, extraia função com nome descritivo
- **Arquivos ≤ 500 linhas:** se ultrapassar, divida em módulos com responsabilidade única
- **SRP obrigatório:** uma função, uma responsabilidade. Side effects explícitos e isolados
- **Tipos explícitos:** sem `any`. Use `unknown` + type guard quando o tipo é incerto

<!-- TS/JS -->
// ERRADO
async function process(data: any) { ... }

// CERTO
async function chargeSubscriptionRenewal(invoice: InvoicePayload): Promise<ChargeResult> { ... }
```

```python
# Python
# ERRADO
def handle(data):
    ...

# CERTO
def send_overdue_payment_reminder(invoice: Invoice) -> NotificationResult:
    ...
```

```ruby
# Ruby
# ERRADO
def process(data)
  ...
end

# CERTO
def expire_unpaid_subscription(subscription:)
  ...
end
```
```

---

### Seção: Comments

```markdown
## Comments

**Escreva o WHY. Nunca o WHAT.**

**Comente quando:**
- Proveniência externa: `# via Stripe docs §3.2 — idempotency key obrigatório aqui`
- Decisão não óbvia: `# usar created_at em vez de updated_at — updated_at muda em reindexações`
- Workaround documentado: `# workaround: SDK retorna 200 em falha silenciosa (issue #4821)`
- Referência a bug: `# bug #1234: race condition se chamar sem lock`
- Constraint externo: `# limite da API: máx 100 itens por batch`
- Docstrings em funções públicas: sempre — parâmetros, retorno, exceções esperadas

**NUNCA comente:**
- O que o código já diz: `i += 1  # incrementa i`
- Nomes redundantes: `# calcula total` acima de `calculateTotal()`
- Código comentado (morto): delete, o git guarda o histórico

**Em refactor por IA:** não podar comentários do tipo WHY. Se um comentário explicar uma decisão ou workaround, ele sobrevive à refatoração mesmo que o código ao redor mude.
```

---

### Seção: Tests

```markdown
## Tests

Seguir **F.I.R.S.T:**
- **Fast:** testes unitários em < 50ms cada
- **Independent:** sem dependência de ordem ou estado compartilhado entre testes
- **Repeatable:** mesmo resultado em qualquer ambiente (sem clock real, sem rede real)
- **Self-validating:** passa ou falha — sem interpretação manual
- **Timely:** escrito ANTES do código de produção (TDD)

**Cobertura mínima:**
- Lógica de negócio: ≥ 95%
- Global: ≥ 80%
- Branch (condicionais): ≥ 70%

**Testes headless:** sem UI real, sem rede real, sem banco real. Use mocks/fakes para dependências externas.

**Nomes de teste:** verbo descritivo, sem "should". Ex: `returns 401 when token expired`, `charges invoice on first retry`.
```

---

### Seção: Dependencies

```markdown
## Dependencies

**Injeção de dependência via constructor/parameter — nunca instanciar internamente.**

```typescript
// ERRADO — acoplamento direto, impossível de testar
class InvoiceService {
  private stripe = new Stripe(process.env.STRIPE_KEY!)
}

// CERTO — DI via constructor
class InvoiceService {
  constructor(private readonly stripe: StripeClient) {}
}
```

```python
# Python — DI via parâmetro
# ERRADO
class InvoiceService:
    def __init__(self):
        self.stripe = Stripe(os.environ['STRIPE_KEY'])

# CERTO
class InvoiceService:
    def __init__(self, stripe: StripeClient):
        self.stripe = stripe
```

```ruby
# Ruby — DI via keyword argument
# ERRADO
class InvoiceService
  def initialize
    @stripe = Stripe::Client.new(ENV['STRIPE_KEY'])
  end
end

# CERTO
class InvoiceService
  def initialize(stripe:)
    @stripe = stripe
  end
end
```

Serviços externos (banco, APIs, filas) são sempre injetados — nunca instanciados dentro de classes de negócio.
```

---

### Seção: Logging

```markdown
## Logging

**JSON estruturado para debug/observabilidade; plain text apenas para CLI output.**

```typescript
// Debug/observabilidade — JSON estruturado
logger.info({ event: 'invoice.charged', invoiceId, customerId, amountCents, attempt })
logger.error({ event: 'stripe.charge.failed', invoiceId, error: err.message, code: err.code })

// CLI output — plain text legível
console.log(`Charged ${invoiceCount} invoices in ${elapsedMs}ms`)
```

```python
# Python — structlog ou logging com extra
import structlog
log = structlog.get_logger()
log.info("invoice.charged", invoice_id=invoice_id, customer_id=customer_id, amount_cents=amount_cents)
```

```ruby
# Ruby — structured hash
Rails.logger.info({ event: 'invoice.charged', invoice_id:, customer_id:, amount_cents: }.to_json)
```

**Campos obrigatórios em eventos de negócio:** `event` (nome do evento), entidade principal (id), resultado.  
**Nunca logar:** senhas, tokens, PII sem mascaramento, stack traces completas em produção.
```

---

## Checklist de Verificação (Fase 01)

- [ ] Ler o arquivo `skills/init/SKILL.md` antes de editar (reler sempre que >10 msgs na conversa)
- [ ] Confirmar que a Inserção 1 (referência ao template Akita) foi aplicada no Passo 2
- [ ] Confirmar que a Inserção 2 (bloco `## Template Akita`) foi adicionada antes de `## Diretorio do projeto`
- [ ] Verificar que nenhuma linha existente foi removida (diff deve ser puro `+`)
- [ ] Verificar que os blocos de código das 5 seções Akita estão dentro de triple backticks
- [ ] Verificar que os exemplos TS/JS + Python + Ruby estão presentes em cada seção
- [ ] Verificar que as 5 seções estão presentes: Code Style, Comments, Tests, Dependencies, Logging
- [ ] Contar linhas do arquivo final — deve ser ~580 linhas (430 original + ~150 adicionadas)
- [ ] Commit no repo `anti-vibe-coding/` (não no repo pai): `feat(init): add Akita template sections to CLAUDE.md merge`

## Gotchas críticos

- O bloco `## Template Akita` usa triple backticks aninhados dentro de backtick-fenced blocks — usar indentação de 4 espaços como alternativa se o parser não suportar backtick aninhado
- O `/init` usa `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md` como template fonte — este arquivo NÃO é modificado aqui. O que muda é a INSTRUÇÃO dada ao modelo sobre o que adicionar
- Manter a seção `## Diretorio do projeto\n\n$ARGUMENTS` como última linha do arquivo
- Não adicionar a seção Akita antes da filosofia Anti-Vibe — a ordem da estrutura de merge (item 4) já define onde essas seções entram

## Ordem de execução recomendada

1. Reler o arquivo completo (confirmar estado atual)
2. Aplicar Inserção 1 (referência no Passo 2)
3. Verificar aplicação da Inserção 1
4. Aplicar Inserção 2 (bloco Template Akita)
5. Verificar aplicação da Inserção 2
6. Reler o arquivo inteiro do final para confirmar integridade
7. Commit no repositório `anti-vibe-coding/`
