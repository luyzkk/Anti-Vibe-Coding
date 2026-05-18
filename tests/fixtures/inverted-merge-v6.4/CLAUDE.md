# CLAUDE.md
# (Fixture v6.4 inverted-merge - gerado por Plano 07 fase-02)
# 2026-05-18 (Luiz/dev): 287 linhas para CA-13 e CA-14

## Code Style (Akita)

Convencoes obrigatorias para codigo gerado por IA:

- Nomes grepaveis: use nomes especificos ao dominio. NUNCA: data, handler, process, item, info
- Funcoes <= 40 linhas: se ultrapassar, extraia funcao com nome descritivo
- Arquivos <= 500 linhas: se ultrapassar, divida em modulos com responsabilidade unica
- SRP obrigatorio: uma funcao, uma responsabilidade. Side effects explicitos e isolados
- Tipos explicitos: sem any. Use unknown + type guard quando o tipo e incerto

```typescript
// TS/JS
// ERRADO
async function process(data) { ... }

// CERTO
async function chargeSubscriptionRenewal(invoice) { ... }
```

```python
# Python
# ERRADO
def handle(data):
    pass

# CERTO
def send_overdue_payment_reminder(invoice):
    pass
```

```ruby
# Ruby
# ERRADO
def process(data)
  nil
end

# CERTO
def expire_unpaid_subscription(subscription:)
  nil
end
```

## Comments (Akita)

Escreva o WHY. Nunca o WHAT.

Comente quando:
- Proveniencia externa: via Stripe docs secao 3.2
- Decisao nao obvia: usar created_at em vez de updated_at
- Workaround documentado: SDK retorna 200 em falha silenciosa
- Referencia a bug: bug #1234: race condition sem lock
- Constraint externo: limite da API: max 100 itens por batch
- Docstrings em funcoes publicas: sempre - parametros, retorno, excecoes

NUNCA comente:
- O que o codigo ja diz: i += 1 (incrementa i)
- Nomes redundantes acima de funcao de nome identico
- Codigo comentado morto: delete, o git guarda o historico

Em refactor por IA: nao podar comentarios do tipo WHY.

## Tests (Akita)

Seguir F.I.R.S.T:
- Fast: testes unitarios em menos de 50ms cada
- Independent: sem dependencia de ordem ou estado compartilhado
- Repeatable: mesmo resultado em qualquer ambiente
- Self-validating: passa ou falha sem interpretacao manual
- Timely: escrito ANTES do codigo de producao (TDD)

Cobertura minima:
- Logica de negocio: >= 95%
- Global: >= 80%
- Branch (condicionais): >= 70%

Testes headless: sem UI real, sem rede real, sem banco real.
Use mocks/fakes para dependencias externas.

Nomes de teste: verbo descritivo, sem should.

## Dependencies (Akita)

Injecao de dependencia via constructor/parameter - nunca instanciar internamente.

```typescript
// ERRADO - acoplamento direto, impossivel de testar
class InvoiceService {
  private stripe = new Stripe(process.env.STRIPE_KEY_PLACEHOLDER)
}

// CERTO - DI via constructor
class InvoiceService {
  constructor(private readonly stripe) {}
}
```

```python
# Python - DI via parametro
# ERRADO
class InvoiceService:
    def __init__(self):
        self.stripe = Stripe(os.environ['STRIPE_KEY_PLACEHOLDER'])

# CERTO
class InvoiceService:
    def __init__(self, stripe):
        self.stripe = stripe
```

```ruby
# Ruby - DI via keyword argument
# ERRADO
class InvoiceService
  def initialize
    @stripe = Stripe::Client.new(ENV['STRIPE_KEY_PLACEHOLDER'])
  end
end

# CERTO
class InvoiceService
  def initialize(stripe:)
    @stripe = stripe
  end
end
```

Servicos externos (banco, APIs, filas) sao sempre injetados.

## Logging (Akita)

JSON estruturado para debug/observabilidade; plain text apenas para CLI output.

```typescript
// Debug/observabilidade - JSON estruturado
logger.info({ event: "invoice.charged", invoiceId, customerId, amountCents })
logger.error({ event: "stripe.charge.failed", invoiceId, error: err.message })

// CLI output - plain text legivel
console.log("Charged " + invoiceCount + " invoices")
```

```python
# Python - structlog ou logging com extra
import structlog
log = structlog.get_logger()
log.info("invoice.charged", invoice_id=invoice_id, customer_id=customer_id)
```

```ruby
# Ruby - structured hash
Rails.logger.info({ event: "invoice.charged", invoice_id: }.to_json)
```

Campos obrigatorios: event (nome do evento), entidade principal (id), resultado.
Nunca logar: senhas, tokens, PII sem mascaramento, stack traces em producao.

## Environment Variables

Toda variavel de ambiente deve ser lida uma unica vez, na inicializacao, e validada explicitamente.
Nunca ler process.env ou ENV dentro de funcoes de dominio - passe como parametro.
Nunca commitar valores reais - use placeholders descritivos no exemplo abaixo.

```typescript
// config/env.ts - unica fonte de verdade
interface AppConfig {
  databaseUrl: string;
  apiKey: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
}

function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.API_KEY;
  const port = process.env.PORT;
  const nodeEnv = process.env.NODE_ENV;

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!apiKey) throw new Error('API_KEY is required');

  return {
    databaseUrl,
    apiKey,
    port: port ? parseInt(port, 10) : 3000,
    nodeEnv: (nodeEnv as AppConfig['nodeEnv']) || 'development',
  };
}

export const config = loadConfig();
```

Exemplo de .env.example (nunca commitar .env real):

```
DATABASE_URL=<<DATABASE_URL>>
API_KEY=<<API_KEY>>
PORT=3000
NODE_ENV=development
STRIPE_PUBLISHABLE_KEY=<<STRIPE_PUBLISHABLE_KEY>>
REDIS_URL=<<REDIS_URL>>
JWT_SECRET=<<JWT_SECRET>>
```

Regras para variaveis de ambiente:
- Nomes em SCREAMING_SNAKE_CASE
- Valores sensiveis nunca no codigo-fonte - sempre via env
- Documente cada variavel no .env.example com placeholder <<NOME>>
- Valide presenca e formato na inicializacao - fail fast se ausente
- Use bibliotecas como zod para validacao de schema em producao
- Nunca exponha variaveis de ambiente em logs ou respostas de API
- Separe configs por ambiente: development, test, production
- Nunca use valores default para segredos - exija configuracao explicita

Hierarquia de precedencia:
1. Variaveis de sistema (CI/CD secrets, container env)
2. Arquivo .env.local (desenvolvimento local, gitignored)
3. Arquivo .env (defaults nao-sensiveis, pode ser commitado)
4. Valores hardcoded no codigo apenas para desenvolvimento

## Security Rules

Nunca commitar segredos, tokens, chaves privadas ou senhas no repositorio.
Nunca logar dados sensiveis: senhas, tokens de acesso, numeros de cartao, CPF/CNPJ.
Sempre validar e sanitizar inputs externos antes de processar.
Usar HTTPS em todas as comunicacoes externas - sem fallback para HTTP.
Manter dependencias atualizadas - checar vulnerabilidades com bun audit regularmente.
Implementar rate limiting em endpoints publicos para prevenir abuso.
Usar prepared statements ou ORMs - nunca concatenar SQL com input do usuario.
Nunca retornar stack traces completas em respostas de producao.
Revisar permissoes de arquivo: segredos nao devem ser legiveis por outros usuarios.
Usar variaveis de ambiente para credenciais - nunca hardcodar.
Implementar CSRF protection em formularios web.
Validar tipos e tamanhos de upload de arquivo antes de processar.

Autenticacao e autorizacao:
- Use tokens de sessao com expiracao curta para acesso humano
- Tokens de API devem ter escopo minimo necessario (principle of least privilege)
- Revogar tokens comprometidos imediatamente - ter fluxo de revogacao pronto
- Armazenar hashes de senha com bcrypt ou argon2 - nunca texto puro ou MD5/SHA1
- Implementar bloqueio de conta apos N tentativas de login falhas
- MFA obrigatorio para operacoes destrutivas ou acesso a dados sensiveis

Validacao de entrada:
- Validar content-type em uploads antes de processar o conteudo
- Limitar tamanho maximo de payload em endpoints REST
- Rejeitar caracteres especiais em nomes de arquivo recebidos via API
- Nunca usar eval() ou equivalente com dados de usuario
- Sanitizar HTML antes de renderizar conteudo gerado pelo usuario

Auditoria e rastreabilidade:
- Logar todas as acoes destrutivas com usuario, timestamp e IP
- Manter audit trail imutavel para operacoes sensiveis
- Alertar em acessos fora do padrao (horario, volume, geolocalizacao)
- Rotacionar chaves de API periodicamente - documentar processo de rotacao

Dependencias e supply chain:
- Revisar licencas antes de adicionar dependencias em producao
- Travar versoes exatas em package.json para builds reproduziveis
- Checar integridade de pacotes com lockfile commitado
- Evitar dependencias com historico de vulnerabilidades recorrentes
- Preferir dependencias com manutencao ativa e comunidade grande

Infraestrutura e deploy:
- Secrets em producao devem viver em secret managers (AWS Secrets Manager, Vault, etc.)
- Nunca commitar arquivos .env de producao - provisionar via pipeline de CI/CD
- Containers devem rodar como usuario nao-root sempre que possivel
- Health checks de aplicacao nao devem expor dados de configuracao ou versoes internas
- Desabilitar endpoints de debug e introspection em producao
- Configurar headers de seguranca HTTP: HSTS, CSP, X-Frame-Options
- Rotacionar credenciais de banco de dados periodicamente - automatizar quando possivel
- Revisar regras de firewall e grupos de seguranca a cada mudanca de arquitetura
- Habilitar logs de acesso no load balancer - retencao minima de 90 dias
- Manter imagens Docker atualizadas - checar CVEs antes de promover para producao

Controles de acesso:
- Principio do menor privilegio em permissoes de banco de dados por servico
- Separar credenciais de leitura e escrita para servicos que so precisam ler
- Revogar imediatamente acessos de colaboradores que saem do projeto
- Auditar permissoes de service accounts trimestralmente
- Usar roles em vez de usuarios diretamente em infraestrutura cloud
- IAM least-privilege: nenhum servico deve ter permissao AdministratorAccess

