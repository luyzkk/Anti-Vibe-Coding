# Modelos de Autorizacao — Referencia Detalhada

## Autorizacao vs Autenticacao

Autenticacao verifica QUEM o usuario e. Autorizacao determina O QUE o usuario pode fazer.

- Autenticacao = identidade (login, JWT, OAuth2)
- Autorizacao = permissoes (RBAC, ABAC, ACL)
- Sao processos DISTINTOS e SEQUENCIAIS: autenticacao primeiro, autorizacao depois
- Tokens (JWT, Bearer) sao MECANISMOS DE TRANSPORTE, nao modelos de autorizacao

**Anti-patterns:**
- Verificar apenas se o usuario esta logado sem controlar o que pode fazer
- Confundir JWT com modelo de autorizacao (JWT carrega claims, RBAC/ABAC define permissoes)

---

## RBAC (Role-Based Access Control)

Modelo mais COMUM. Usuarios recebem roles, cada role tem permissoes predefinidas.

### Quando usar

- Maioria das aplicacoes web com roles bem definidos (admin, editor, viewer)
- Dashboards, CMS, team management tools
- Quantidade limitada de roles (<20)

### Roles tipicos

| Role | Permissoes |
|------|-----------|
| Admin | CRUD completo + gerenciar usuarios e roles |
| Editor | Criar, ler, atualizar conteudo (sem deletar, sem gerenciar usuarios) |
| Viewer | Somente leitura |

### Implementacao

```typescript
// Middleware RBAC
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Uso
app.delete('/users/:id', requireRole('admin'), deleteUser);
app.put('/posts/:id', requireRole('admin', 'editor'), updatePost);
app.get('/posts', requireRole('admin', 'editor', 'viewer'), listPosts);
```

### Anti-patterns

- **Role explosion:** Criar roles demais para casos especificos. Se >20 roles, considere ABAC
- **Permission creep:** Acumular permissoes sem revisao periodica
- **Hardcoded role checks:** `if (user.role === 'admin')` espalhado pelo codigo. Centralizar em middleware
- **Sem role hierarchy:** Admin tambem e editor e viewer — nao duplicar permissoes

### Como verificar

```bash
# Buscar role checks hardcoded espalhados
grep -rn "role.*===\|role.*==" --include="*.ts" --include="*.js"
# Deve estar centralizado em middleware, nao em cada handler
```

---

## ABAC (Attribute-Based Access Control)

Vai ALEM de roles. Usa atributos do usuario, recurso e ambiente para definir politicas.

### Quando usar

- Sistemas multi-tenant complexos
- Controle granular baseado em contexto (horario, localizacao, departamento)
- Quando RBAC nao e suficiente (muitas combinacoes de permissoes)

### Tres tipos de atributos

| Tipo | Exemplos |
|------|----------|
| User attributes | departamento, cargo, clearance level, idade |
| Resource attributes | owner, confidencialidade, classificacao, tipo |
| Environment | horario do dia, localizacao, tipo de dispositivo, IP |

### Exemplo de politica

```
ALLOW IF:
  user.department == 'HR'
  AND resource.classification == 'internal'
  AND environment.time BETWEEN '09:00' AND '18:00'
  AND environment.device_type == 'corporate'
```

### Anti-patterns

- **Conflitos de politicas:** Multiplas condicoes com intersecoes nao previstas
- **Over-engineering:** Usar ABAC quando RBAC e suficiente
- **Sem testes de politicas:** Politicas complexas sem test suite que valide edge cases
- **Performance:** Avaliar 10+ atributos por request sem cache

### Recomendacao

Comece com RBAC. Migre para ABAC apenas quando:
- Role explosion (>20 roles)
- Necessidade de atributos ambientais (horario, localizacao)
- Regras que dependem do recurso alem do role do usuario

---

## ACL (Access Control List)

Cada RECURSO individual tem sua propria lista de permissoes por usuario.

### Quando usar

- Controle granular por recurso individual (Google Drive, Dropbox)
- Compartilhamento seletivo ("Alice tem read, Bob tem write neste documento")
- Quando permissoes variam por objeto, nao por tipo

### Estrutura tipica

```typescript
type ACLEntry = {
  resourceId: string;
  userId: string;
  permissions: ('read' | 'write' | 'delete' | 'share')[];
};
```

### Anti-patterns

- **Escala sem planejamento:** Milhoes de usuarios × milhoes de recursos = bilhoes de ACL entries
- **Sem heranca:** Cada subrecurso requer ACL manual (pastas/subpastas)
- **Performance:** Query de ACL em cada request sem cache ou denormalizacao

### Recomendacao

ACL funciona bem COMBINADO com RBAC:
- RBAC para permissoes gerais (quem pode acessar o sistema)
- ACL para permissoes especificas por recurso (quem pode ver este documento)

---

## Decision Tree: Qual Modelo Usar

```
Precisa de controle por recurso individual?
├─ SIM → ACL (possivelmente combinado com RBAC)
├─ NAO
│   ├─ Precisa de atributos alem de roles?
│   │   ├─ SIM → ABAC
│   │   ├─ NAO → RBAC ✓ (padrao para maioria)
```

**Regra geral:** Comece com RBAC. Adicione ACL para recursos compartilhaveis. Migre para ABAC apenas com necessidade comprovada.

---

## OAuth2 e JWT como Mecanismos de Enforcement

OAuth2 e JWT NAO sao modelos de autorizacao. Sao mecanismos que TRANSPORTAM informacoes para aplicar modelos.

### OAuth2 (Delegated Authorization)

Permite que um servico acesse recursos de outro em nome do usuario SEM receber credenciais.

**Fluxo Authorization Code (PKCE):**
1. App redireciona para consent screen do provider
2. Usuario autoriza → provider retorna authorization code
3. App troca code por access token (+ code verifier para PKCE)
4. App acessa recursos com access token

**Quando usar:**
- "Login com Google/GitHub" → usar OpenID Connect (autenticacao SOBRE OAuth2)
- Terceiros acessando recursos do usuario → OAuth2 puro (autorizacao)

**Anti-patterns:**
- Usar access token do OAuth2 para identificar o usuario (access token = autorizacao, NAO identidade)
- Para identidade, usar ID token do OpenID Connect

### JWT Claims para Autorizacao

JWT carrega claims que alimentam o modelo de autorizacao:

```json
{
  "sub": "user-uuid-123",
  "role": "editor",
  "permissions": ["posts:read", "posts:write"],
  "department": "engineering",
  "exp": 1700000000
}
```

O servidor usa essas claims para aplicar RBAC (`role`), ABAC (`department`), ou ACL (lookup por `sub`).

**Anti-patterns:**
- JWT sem expiracao (`exp`)
- Armazenar permissoes demais no JWT (token gigante, cache stale)
- Nao validar `iss` (issuer) e `aud` (audience)

---

## IDOR (Insecure Direct Object Reference)

Vulnerabilidade onde o usuario acessa recursos de OUTROS usuarios manipulando IDs na URL.

### O problema

```
GET /api/orders/123  → retorna pedido 123 (do usuario A)
GET /api/orders/124  → retorna pedido 124 (do usuario B!) ← IDOR
```

### Prevencao

```typescript
// VULNERAVEL
app.get('/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order); // retorna qualquer pedido
});

// SEGURO
app.get('/orders/:id', async (req, res) => {
  const order = await db.orders.findOne({
    id: req.params.id,
    userId: req.user.id // SEMPRE filtrar pelo usuario autenticado
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

### Como verificar

```bash
# Buscar queries sem filtro de usuario
grep -rn "findById\|findOne\|findUnique" --include="*.ts" --include="*.js"
# Verificar se cada uma inclui filtro de userId/ownerId
```

**Regra:** TODA query que retorna dados de um usuario DEVE filtrar pelo userId do token autenticado.

---

## Checklist de Autorizacao

- [ ] Modelo definido (RBAC, ABAC ou ACL) e documentado
- [ ] Middleware centralizado (nao role checks espalhados)
- [ ] IDOR prevenido (queries filtram por userId)
- [ ] Endpoints sensíveis protegidos (admin, delete, financeiro)
- [ ] Menor privilegio aplicado (roles minimos necessarios)
- [ ] JWT claims validados (iss, aud, exp)
- [ ] OAuth2 scopes definidos para terceiros
- [ ] Testes de autorizacao cobrindo cenarios de negacao
