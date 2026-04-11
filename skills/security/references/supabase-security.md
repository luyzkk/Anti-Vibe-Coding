# Supabase Security — Referencia Detalhada

> Baseado em pesquisa de seguranca real sobre vulnerabilidades de aplicacoes VibeCoding/Lovable.
> Fonte: "ChupaBase — Extraindo dados de aplicacoes adoraveis" (Hacking Club, Thiago Bispo et al.)

---

## O Problema Central: BaaS muda o modelo de ameaca

Em arquiteturas tradicionais, o backend e a linha de defesa. Em BaaS (Backend as a Service) como Supabase:

```
[Tradicional]
Usuario → Frontend → Backend → Banco
                      ↑
               Validacoes aqui

[Supabase BaaS]
Usuario → Frontend → Supabase/PostgREST
Atacante → ─────────→ Supabase/PostgREST (acesso direto!)
```

**O banco de dados deixa de ser um componente e passa a ser a primeira e ultima linha de defesa.**

O Supabase expoe tabelas Postgres via REST API (PostgREST) automaticamente. Qualquer pessoa com a URL e a chave correta pode consultar o banco diretamente, **sem passar pelo fluxo normal do aplicativo**.

---

## Superficie de Ataque Supabase

### 1. PostgREST (Tabelas via REST API)
- Endpoint: `https://[project].supabase.co/rest/v1/[table]`
- Expoe TODAS as tabelas publicas por padrao
- Aceita GET, POST, PATCH, DELETE com filtros via query params

### 2. RPC (Remote Procedure Calls)
- Endpoint: `https://[project].supabase.co/rest/v1/rpc/[function]`
- Funcoes customizadas executadas no banco
- Podem expor logica de negocio sensivel

### 3. Edge Functions
- Endpoint: `https://[project].supabase.co/functions/v1/[function]`
- Serverless functions (similar a Lambda)
- **NAO validam JWT por padrao** — requerem validacao explicita

---

## Como o Ataque Funciona

### Passo 1: Extrair a Anon Key do Frontend

O Supabase gera uma `anon key` (JWT com role `anonymous`) que e **obrigatoriamente exposta no frontend**. Sem ela, o app nao funciona. O problema e quando as tabelas aceitam essa chave sem restricao.

**Onde encontrar:**
- Abrir DevTools → Sources/Assets → `index-[hash].js`
- Buscar `eyJ` (prefixo base64 de JWT) ou `SUPABASE_ANON_KEY`
- A URL do projeto tambem esta no mesmo arquivo

```javascript
// O que o atacante encontra no bundle JavaScript
const supabaseUrl = 'https://xyzabc123.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // JWT role: anon
```

Decodificando o JWT (sem verificacao de assinatura), o atacante ve:
```json
{
  "iss": "supabase",
  "ref": "xyzabc123",
  "role": "anon"
}
```

### Passo 2: Mapear os Endpoints

**Via Service Worker (sw.js) — muito facil:**

Apps Vite React frequentemente criam um `sw.js` na raiz que funciona como um mapa de todas as rotas. O atacante consulta `https://app.com/sw.js` e ve todos os endpoints listados.

**Via bundle JavaScript — necessario mas viavel:**

Sem Service Worker, o atacante busca no `index.js` minificado por padroes como:
- `/rest/v1/` para tabelas
- `/rpc/` para funcoes

### Passo 3: Acessar o Banco Diretamente

```bash
# Listar todos os usuarios (sem autenticacao!)
curl "https://xyzabc123.supabase.co/rest/v1/users" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"

# Dump de dados financeiros
curl "https://xyzabc123.supabase.co/rest/v1/invoices" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

**Resultado sem RLS configurado:** dump completo de todas as tabelas, incluindo dados pessoais (nome, email, endereco, telefone), dados financeiros, progresso de usuarios, etc.

---

## A Vulnerabilidade: RLS Ausente ou Mal Configurado

**RLS = Row Level Security** — politica que define quais linhas cada usuario pode acessar.

### Estados possiveis de uma tabela Supabase:

| Estado | Comportamento | Risco |
|--------|--------------|-------|
| RLS desabilitado | Todos podem ler/escrever tudo | CRITICO |
| RLS habilitado, sem politicas | Nenhum acesso (deny all) | Seguro |
| RLS com `USING (true)` para `anon` | Anonimo le tudo | CRITICO |
| RLS com `USING (auth.uid() = user_id)` | Usuario ve apenas seus dados | Seguro |

**O erro comum gerado por IA/VibeCoding:**

```sql
-- VULNERAVEL: permite leitura anonima de TUDO
CREATE POLICY "public_read" ON invoices
  FOR SELECT USING (true);

-- VULNERAVEL: permite insercao anonima
CREATE POLICY "public_insert" ON orders
  FOR INSERT WITH CHECK (true);
```

**Por que IA gera isso?** A IA nao sabe quem pode acessar o que. Se voce nao especificar no prompt "somente o proprio usuario pode ver seus dados", ela cria politicas abertas.

---

## Protecao: Como Configurar Supabase com Seguranca

### Regra #1: Habilitar RLS em TODAS as tabelas

```sql
-- Executar para CADA tabela
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... e todas as outras tabelas
```

Habilitar RLS sem criar politicas = deny all para anonimos por padrao. E o estado mais seguro.

### Regra #2: Politicas baseadas em propriedade (owner-based)

```sql
-- Somente o proprio usuario pode ler seus dados
CREATE POLICY "users_own_data_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Somente o proprio usuario pode atualizar seus dados
CREATE POLICY "users_own_data_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Regra #3: Tabelas publicas precisam de politica explicita e consciente

```sql
-- Apenas se a tabela PRECISA ser publica (ex: catalogo de produtos)
CREATE POLICY "public_catalog_read" ON products
  FOR SELECT
  TO anon, authenticated  -- explicitar roles
  USING (is_published = true);  -- restricao adicional
```

**Nunca usar `USING (true)` sem uma restricao de condicao.**

### Regra #4: Negar acesso anonimo a dados sensiveis

```sql
-- Garantir que role anon NUNCA acessa dados financeiros
-- (basta habilitar RLS e NAO criar politica para anon)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Politica apenas para authenticated, nunca para anon
CREATE POLICY "owner_invoices" ON invoices
  FOR ALL
  TO authenticated  -- SEM 'anon' aqui
  USING (auth.uid() = user_id);
```

### Regra #5: Seguranca em RPCs (funcoes)

```sql
-- Funcao com controle de acesso
CREATE FUNCTION get_user_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- executa com privilegios do owner
AS $$
BEGIN
  -- Verificar que o usuario autenticado e o dono
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- ... logica da funcao
END;
$$;

-- Revogar acesso da role anonima
REVOKE EXECUTE ON FUNCTION get_user_stats FROM anon;
GRANT EXECUTE ON FUNCTION get_user_stats TO authenticated;
```

### Regra #6: Edge Functions com validacao de JWT

```typescript
// Edge Function — SEMPRE validar autorizacao
Deno.serve(async (req) => {
  // Verificar Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Criar cliente Supabase com JWT do usuario
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Verificar usuario autenticado
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ... logica da funcao com usuario verificado
});
```

---

## Modelo de Ameaca: Atacante vs. Aplicacao Supabase

```
[Atacante]
  1. Abre app no browser
  2. DevTools → busca 'eyJ' no index.js → encontra ANON KEY + URL
  3. Verifica sw.js ou index.js → mapeia todas as rotas
  4. curl direto no PostgREST com ANON KEY
  5. Se RLS ausente/mal configurado → DUMP de todas as tabelas
```

**O atacante NAO precisa:**
- Criar conta no app
- Fazer login
- Passar pelo fluxo normal
- Conhecer a aplicacao

**O que o atacante SEMPRE tem:**
- A URL do Supabase (exposta no JS)
- A Anon Key (exposta no JS — por design, nao pode ser ocultada)

---

## Auditoria de Seguranca Supabase

### Verificar tabelas sem RLS

```sql
-- No Supabase SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Resultado ideal: 0 linhas
```

### Verificar politicas abertas para anonimos

```sql
-- Buscar politicas usando 'true' sem restricao de role
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND roles @> ARRAY['anon'];
-- Resultado ideal: apenas tabelas intencionalmente publicas
```

### Verificar exposicao via curl (teste manual)

```bash
# Testar se tabela sensivel e acessivel sem autenticacao
curl "https://[project].supabase.co/rest/v1/users?select=*&limit=1" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"

# Esperado: 401 ou array vazio []
# Se retornar dados: VULNERABILIDADE CRITICA
```

---

## Erros Comuns de IA ao Gerar Codigo Supabase

| Erro de IA | Impacto | Correcao |
|-----------|---------|----------|
| RLS desabilitado (nao menciona) | Dump completo | Habilitar RLS em todas as tabelas |
| `USING (true)` sem restricao | Leitura anonima | Restringir a `authenticated` e adicionar filtro |
| `WITH CHECK (true)` para anon | Insercao anonima | Remover politica ou restringir |
| Edge Function sem auth check | Qualquer um chama | Validar `Authorization` header |
| RPC sem `REVOKE` para anon | Funcao publica | Revogar acesso de `anon` explicitamente |
| Politicas duplicadas/conflitantes | Permissoes inesperadas | Auditar com `SELECT * FROM pg_policies` |

**Regra de ouro:** Ao usar IA para gerar esquemas Supabase, sempre especificar no prompt:
- Quem pode ler o que (ex: "usuario so ve seus proprios dados")
- Quais tabelas sao publicas (ex: "catalogo de produtos e publico")
- Quais operacoes sao permitidas por role

E **sempre auditar as RLS geradas** antes de publicar.

---

## Supabase Storage: Validacao de URLs e Uploads

> Fonte: Experimento "1 Hacker vs 4 VibeCoders" (YuriRDev) — Participante 4 (Aviator, Red Teamer)

### Bypass de validacao por query string

Quando a aplicacao valida que a URL de upload pertence ao dominio do Supabase, o atacante pode:

```
# URL valida — passa na validacao de dominio
https://xyzabc123.supabase.co/storage/v1/object/public/images/foto.jpg

# Bypass — dominio correto, mas query string gigantesca
https://xyzabc123.supabase.co/storage/v1/object/public/images/foto.jpg?a=AAAA...AAAA (megabytes)
```

**Impacto:** Exaustao de storage, possivel DoS no banco ao armazenar URLs enormes.

**Protecao:**
```sql
-- RLS com validacao de tamanho
CREATE POLICY "validate_url_length" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (length(image_url) <= 2048);
```

Alem da RLS, validar no backend/Edge Function:
- Tamanho total da URL (max 2048 chars)
- Truncar ou rejeitar query strings excessivas
- Validar que a URL aponta para um objeto real (HEAD request)

### Autenticacao delegada ao Supabase Auth

**Pratica segura (Participante 4):** Delegar autenticacao para o modulo nativo `supabase.auth` em vez de pedir para a IA criar autenticacao do zero.

**Por que:** Reduz superficie de ataque. Supabase Auth ja implementa:
- Hashing seguro de senhas (bcrypt)
- Tokens JWT assinados com secret do projeto
- Refresh token rotation
- Rate limiting em login
- Confirmacao de email

**Anti-pattern:** Pedir para a IA criar autenticacao customizada em cima do Supabase.

---

## Supabase e Race Conditions Financeiras

### O problema: operacoes atomicas em BaaS

Em sistemas com transacoes financeiras (compras, afiliados, comissoes), o atacante pode:
1. Comprar via link de afiliado proprio → recebe comissao
2. Solicitar saque da comissao (instantaneo)
3. Solicitar reembolso da compra (dentro do prazo)
4. Resultado: atacante lucra a comissao sem custo

**Protecao com Supabase:**

```sql
-- Operacao atomica: compra + debito de saldo em uma transacao
CREATE FUNCTION purchase_course(p_user_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price numeric;
  v_balance numeric;
BEGIN
  -- Lock na linha do usuario para evitar race condition
  SELECT balance INTO v_balance FROM wallets
    WHERE user_id = p_user_id FOR UPDATE;

  SELECT price INTO v_price FROM courses
    WHERE id = p_course_id;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Debitar e registrar compra atomicamente
  UPDATE wallets SET balance = balance - v_price
    WHERE user_id = p_user_id;

  INSERT INTO purchases (user_id, course_id, amount, status)
    VALUES (p_user_id, p_course_id, v_price, 'completed');
END;
$$;
```

**Janela de retencao para comissoes:**

```sql
-- Comissoes so liberadas apos periodo de reembolso expirar
CREATE POLICY "affiliate_withdraw" ON commissions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = affiliate_id
    AND status = 'pending'
    AND created_at < now() - interval '30 days'  -- janela de retencao
  );
```

**Regra critica:** IA nao cruza dominios logicos diferentes (compras vs. afiliados vs. reembolsos). Sempre especificar no prompt:
- "Comissoes de afiliados so podem ser sacadas apos o prazo de reembolso expirar"
- "Se uma compra for reembolsada, a comissao associada deve ser cancelada automaticamente"

---

## Red Teaming com IA no Supabase

Pratica comprovada eficaz (Participante 4, Aviator):

Apos gerar codigo/RLS com IA, executar um segundo prompt de revisao:

```
Revise este codigo especificamente procurando por:
1. Race Conditions em operacoes financeiras
2. IDOR (Insecure Direct Object Reference)
3. Mass Assignment em inserts/updates
4. Falhas de logica de negocios entre modulos (compras vs afiliados vs reembolsos)
5. Politicas RLS com USING(true) para role anon
6. Edge Functions sem validacao de Authorization header
```

Este passo de "AI Red Teaming" reduziu significativamente as vulnerabilidades encontradas em pentests reais.

---

## Checklist de Seguranca Supabase

```
[ ] RLS habilitado em TODAS as tabelas publicas
[ ] Nenhuma tabela com `USING (true)` para role `anon` sem intencao explicita
[ ] Politicas owner-based: `auth.uid() = user_id` para dados de usuario
[ ] Edge Functions validam Authorization header antes de qualquer operacao
[ ] RPCs sensiveis com REVOKE para `anon` + GRANT apenas para `authenticated`
[ ] Tabelas publicas com condicao adicional (ex: `is_published = true`)
[ ] Auditoria periodica via `pg_policies` para politicas abertas
[ ] Teste manual com ANON KEY para verificar exposicao real
[ ] Service Worker auditado (nao expoe mapa completo de rotas em prod)
[ ] Dados sensiveis (financeiros, pessoais) em schema separado (nao `public`)
[ ] Autenticacao delegada ao Supabase Auth (nao customizada pela IA)
[ ] Operacoes financeiras atomicas com SELECT ... FOR UPDATE
[ ] Janela de retencao para comissoes/afiliados (reembolso expira antes do saque)
[ ] Validacao de tamanho de URLs em campos de upload (max 2048 chars)
[ ] AI Red Teaming: revisao de seguranca com IA apos cada modulo gerado
[ ] Cancelamento automatico de comissao quando compra associada e reembolsada
```

---

## Contexto: Por Que VibeCoding Amplifica Este Risco

Plataformas como Lovable, Bolt, v0 geram aplicacoes completas com Supabase em minutos. O problema:

1. **IA nao conhece o modelo de autorizacao** — ela nao sabe que "usuario A nao pode ver dados do usuario B"
2. **Velocidade > seguranca por padrao** — o prompt tipico e "crie um app de X", sem mencionar seguranca
3. **RLS e optional no Supabase** — nao e obrigatorio, entao IA frequentemente nao ativa
4. **Aplicacoes chegam a producao sem audit** — o desenvolvedor ve o front funcionando e considera pronto

**Impacto real observado:** aplicacoes com dados de usuarios expostos publicamente, incluindo nome completo, email, telefone, endereco, dados de pagamento — acessiveis por qualquer pessoa com conhecimento minimo de HTTP.
