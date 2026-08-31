---
topic: security-fastapi-owasp
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md
tier: 1
triggers: [OWASP, segurança, SQL injection, SQLAlchemy text, NoSQL injection, command injection, SSTI, JWT, RFC 8725, algorithms, argon2, argon2id, bcrypt, CSRF, sessão, XSS, Jinja2, nh3, CORS, docs em produção, SecretStr, upload, SSRF, rate limiting, CSP, HSTS, CVE, slopsquatting, código de IA inseguro]
related_skills: [/security, /api-design, /infrastructure]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Segurança em FastAPI — OWASP

## Quando consultar

- Ao escrever queries SQL cruas (`text()`) ou montar queries NoSQL a partir de entrada externa
- Ao implementar login, decodificar JWT ou fazer hash de senha
- Ao configurar CORS, sessão/cookies, CSRF ou decidir se `/docs` fica exposto em produção
- Ao aceitar HTML rico do usuário, checar ownership de um recurso (IDOR) ou desenhar um model de criação/atualização
- Ao aceitar upload de arquivo, buscar uma URL fornecida pelo usuário (SSRF) ou expor endpoint sem rate limit
- Ao revisar código gerado por agente de IA antes de mergear — segurança é uma avaliação que o modelo pula por default

## Padrões sênior

### Pattern: SQL injection — bind params em `text()`, nunca interpolação

- **Problema:** `text(f"SELECT * FROM users WHERE id = {user_id}")` funde o valor na string ANTES do SQLAlchemy processar — um valor como `"shipped' OR '1'='1"` reescreve o `WHERE`. É a fonte nº 1 de SQLi em bases SQLAlchemy; o ORM parametriza sozinho, o risco é o *escape hatch* para SQL cru (regra 1.1).
- **Padrão:** use parâmetros nomeados — `text("... WHERE id = :uid").bindparams(uid=user_id)` ou `db.execute(text("..."), {"uid": user_id})`.
- **Quando usar:** sempre que `text()` receber qualquer valor vindo de fora (path param, body, query string).
- **Quando NÃO usar bind param:** para identificadores dinâmicos (nome de tabela/coluna, direção de `ORDER BY`) — placeholders só vinculam valores; valide esses identificadores contra uma allowlist.

### Pattern: Injeção fora de SQL — comando de sistema e NoSQL

- **Problema:** `subprocess.run(f"ping {host}", shell=True)`/`os.system()` executam metacaracteres de shell (`;`, `|`, `` ` ``, `$()`) como comando arbitrário (regra 1.2); em Mongo/motor/beanie, passar um dict de query construído com entrada bruta permite operadores (`$ne`, `$gt`, `$where`) que bypassam autenticação, ex. `{"password": {"$ne": null}}` (regra 1.3).
- **Padrão:** para comando de sistema, passe lista de argumentos sem shell (`subprocess.run([...], shell=False)`); para NoSQL, valide/coaja a entrada com modelo Pydantic tipado ANTES de montar a query, garantindo valores escalares.
- **Quando usar:** sempre que dado externo alimenta um comando de shell ou uma query Mongo/motor/beanie.
- **Quando NÃO usar:** não há exceção documentada na fonte — ambas são regras duras.

### Pattern: SSTI — nunca renderize template a partir de string do usuário

- **Problema:** `Template(user_input).render()` ou `env.from_string(user_input)` habilita Server-Side Template Injection no Jinja2 — cadeias como `{{ ''.__class__.__mro__ }}` alcançam `os` e viram RCE (regra 1.4).
- **Padrão:** templates vêm sempre de arquivos estáticos; dados do usuário entram só como contexto (variáveis), nunca como corpo do template.
- **Quando usar:** todo fluxo que renderiza Jinja2 a partir de conteúdo vindo de uma request.
- **Quando NÃO usar:** nunca compor o próprio template com `user_input` — a fonte não cita caso legítimo.

### Pattern: JWT — PyJWT em vez de python-jose, `algorithms` pinado e claims validadas

- **Problema:** python-jose acumulou CVEs de algorithm confusion (CVE-2024-33663) e JWT bomb (CVE-2024-33664) (regra 2.1); `jwt.decode(token, key)` sem `algorithms` explícito é vulnerável a `alg=none` e à troca RS256→HS256 (RFC 8725 §2.1) — a doc do PyJWT alerta para nunca derivar `algorithms` do próprio token (regra 2.2).
- **Padrão:** migre para PyJWT — as docs do FastAPI foram atualizadas para recomendá-la (Authlib segue como alternativa ativa quando o fluxo exige OAuth/OIDC completo); sempre fixe `algorithms=[...]`, `audience`, `issuer` e `options={"require": [...], "verify_exp": True}` no decode.
- **Quando usar:** todo `jwt.decode` — RFC 8725 (BCP 225) §3.1 exige que cada chave seja usada com exatamente um algoritmo.
- **Quando NÃO usar:** nunca decode sem `algorithms` fixo, nem mesmo em protótipo — é o item 2 dos padrões recorrentes em código de IA (regras 2.2, 19.1).

```python
jwt.decode(
    token, key,
    algorithms=["RS256"],
    audience="my-api",
    issuer="https://issuer.example",
    options={"require": ["exp", "aud", "iss"], "verify_exp": True},
)
```

### Pattern: Comparação de segredos em tempo constante

- **Problema:** `if token == expected` usa `==`, que é curto-circuitada e vaza tempo por caractere — um timing attack recupera o segredo byte a byte (regra 2.3).
- **Padrão:** compare com `secrets.compare_digest(token, expected)`, que roda em tempo constante.
- **Quando usar:** qualquer comparação de token, API key ou segredo vindo de fora.
- **Quando NÃO usar:** não é necessário fora de comparação de segredos — a proteção existe especificamente contra o vazamento de tempo em dados sensíveis (token, API key).

### Pattern: Hash de senha — argon2id como default; bcrypt com o limite de 72 bytes

- **Problema:** bcrypt ignora tudo além de 72 bytes (silenciosamente em várias versões; ≥4/5 lança `ValueError`); com multibyte (emoji, cirílico) o corte pode cair no meio de um caractere. `passlib` 1.7.4 está sem manutenção e quebra com bcrypt 5.0.0 (regra 2.4).
- **Padrão:** use argon2id como default em sistemas novos (`CryptContext(schemes=["argon2"])` ou `argon2-cffi`/`pwdlib` direto); se precisar manter bcrypt, use `bcrypt_sha256` (pré-hash SHA-256) para neutralizar o limite de 72 bytes.
- **Quando usar argon2id:** todo sistema novo — é o default recomendado por OWASP e RFC 9106.
- **Quando bcrypt ainda é aceitável:** bem configurado (cost ≥10) continua aceito pelo OWASP; migração de hash legado tem custo de portabilidade — avalie caso a caso.

### Pattern: Autorização por objeto, não só autenticação — IDOR/BOLA

- **Problema:** `Depends(get_current_user)` confirma quem é o usuário, não se ele pode ver ESTE recurso — `GET /orders/{id}` que só checa login permite IDOR (usuário A lê pedido de B trocando o id); é a API1:2023 do OWASP API Security Top 10 (regra 3.1).
- **Padrão:** após buscar o objeto, cheque ownership explicitamente: `if obj.owner_id != current_user.id: raise HTTPException(403)`.
- **Quando usar:** todo endpoint que recebe um id de recurso via path/query e o busca via dependency injection.
- **Quando NÃO usar checagem simples:** RBAC/ABAC não trivial (múltiplos papéis, políticas cruzadas) — centralize com `Security(dep, scopes=[...])` do FastAPI ou policy objects (Oso, Casbin) em vez de `if role == "admin"` espalhado (regra 3.2).

### Pattern: Sessão — assinada, não criptografada; configure flags de cookie

- **Problema:** `SessionMiddleware` serializa em JSON, faz Base64 e assina com `itsdangerous` — o conteúdo continua legível, só a integridade é garantida; o signer usa SHA-1 por default, o que causa exceção em builds FIPS (Starlette Discussion #2982) (regra 4.1); sem `https_only`/`same_site`, o cookie trafega em claro e fica exposto a CSRF (regra 4.2).
- **Padrão:** guarde só um id de sessão opaco (dado sensível fica no servidor, ex. Redis); configure `https_only=True, same_site="lax", max_age=...` explicitamente no `SessionMiddleware`.
- **Quando usar `same_site="strict"`:** quando não há necessidade de navegação cross-site autenticada.
- **Quando NÃO usar `strict`:** se o fluxo depende de seguir link externo já logado — quebra esse caso; `lax` é o equilíbrio comum.

### Pattern: CSRF explícito quando a autenticação é por cookie

- **Problema:** FastAPI/Starlette não trazem proteção CSRF nativa; `SameSite=Lax` reduz mas não elimina o risco (GET com efeito colateral, subdomínios, browsers antigos) (regra 5.1).
- **Padrão:** implemente double-submit cookie via `fastapi-csrf-protect` em toda rota de mutação (POST/PUT/DELETE/PATCH) que autentica por cookie — atenção: é possível injetar a dependency e esquecer de chamar a validação, criando falsa sensação de segurança.
- **Quando usar:** autenticação por cookie de sessão junto de qualquer endpoint de mutação.
- **Quando NÃO usar:** API stateless com Bearer token em header — o token não é enviado automaticamente pelo browser, então não sofre CSRF clássico.

### Pattern: XSS — confie no autoescape do Jinja2Templates, sanitize HTML rico com nh3

- **Problema:** Jinja2 puro tem `autoescape=False` por default; `|safe`/`Markup()` desligam o escape daquele valor; `HTMLResponse(f"<div>{user_comment}</div>")` ignora o template engine e reintroduz XSS direto (regra 6.1). Validação Pydantic não sanitiza HTML.
- **Padrão:** `Jinja2Templates` do Starlette liga autoescape por default desde a 1.0 (fev/2026) — deixe-o agir e passe dados via contexto; para HTML rico que precisa ser preservado, sanitize com `nh3` (bleach está arquivado) (regra 6.2).
- **Quando usar `|safe`:** nunca em dado do usuário — só em conteúdo estático controlado pelo próprio time.
- **Quando NÃO usar `HTMLResponse` com f-string:** sempre que o valor interpolado vier de input externo — use o template engine.

### Pattern: CORS — nunca `allow_origins=["*"]` junto de `allow_credentials=True`

- **Problema:** a combinação é bloqueada pelos browsers e, se contornada, permite que qualquer site faça requisição autenticada em nome do usuário logado; é o item 3 dos padrões recorrentes em código de IA (regras 7.1, 19.1).
- **Padrão:** especifique origens exatas ou `allow_origin_regex`: `CORSMiddleware(allow_origins=["https://app.example.com"], allow_credentials=True)`.
- **Quando usar credentials:** apenas com lista explícita de origens confiáveis.
- **Quando NÃO usar `["*"]`:** sempre que `allow_credentials=True` estiver setado — o FastAPI já rejeita a combinação, mas o design deve prevenir, não descobrir isso em runtime.

### Pattern: Desabilitar docs interativos em produção

- **Problema:** `/docs`, `/redoc` e `/openapi.json` expostos por default revelam toda a superfície da API (schemas, endpoints, exemplos) a qualquer anônimo, facilitando reconhecimento (regra 7.2).
- **Padrão:** `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` em produção, ou proteja atrás de autenticação/VPN.
- **Quando usar docs abertas:** ambiente de desenvolvimento/staging sem exposição externa.
- **Quando NÃO usar:** produção pública sem autenticação na frente — times internos também devem colocá-las atrás de auth/rede privada.

### Pattern: Segredos — `pydantic-settings` + `SecretStr`, nunca hardcode

- **Problema:** `SECRET_KEY = "..."` no código é a base do item 4 dos padrões recorrentes em código de IA (regras 8.1, 19.1); segredos hardcoded cresceram +34% YoY em commits públicos do GitHub (GitGuardian, 2026). `SecretStr` mascara `repr()`/`str()`, mas NÃO protege logs se você chamar `.get_secret_value()` ou logar o body cru — e `model_dump_json()` variou entre versões do Pydantic 2.x quanto a revelar o valor.
- **Padrão:** carregue segredos via `pydantic_settings.BaseSettings` com campos `SecretStr`, lidos de env/`.env`; para serializar mascarado, use `@field_serializer(..., when_used='json')` ou `Field(repr=False)`.
- **Quando usar:** todo campo de configuração que é segredo (chaves de API, `SECRET_KEY`, credenciais de banco).
- **Quando NÃO usar como única defesa:** não presuma que `SecretStr` basta — combine com scanning de segredos no CI (gitleaks/trufflehog, regra 8.2) e nunca logue body cru de endpoints de auth (regra 14.1).

### Pattern: Mass assignment — models separados para create/update com `extra="forbid"`

- **Problema:** reusar o mesmo model Pydantic entre entrada e ORM (`User(**payload.model_dump())`) deixa o usuário injetar campos privilegiados como `is_admin=True` direto no JSON — é o item 7 dos padrões recorrentes em código de IA (regras 11.2, 19.1).
- **Padrão:** o model de entrada expõe só os campos editáveis pelo usuário e usa `model_config = ConfigDict(extra="forbid")` para rejeitar campos extras.
- **Quando usar:** todo endpoint de criação/atualização que popula um model ORM a partir de payload externo.
- **Quando NÃO usar `**model.dict()` cego:** nunca no ORM a partir de um model que também é usado para leitura/edição — mantenha um model de entrada dedicado por operação.

```python
class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: EmailStr   # sem is_admin/role
```

### Pattern: Upload de arquivos — limite de tamanho, magic bytes e nome próprio

- **Problema:** FastAPI não limita tamanho de upload por default — DoS por exaustão de memória/disco, a mesma classe das CVEs de multipart que levaram o Starlette a adicionar `max_part_size` (CVE-2024-47874) (regra 10.1); `Content-Type` é forjável pelo cliente e o `filename` do usuário pode conter `../` (path traversal) (regra 10.2).
- **Padrão:** imponha limite no proxy reverso E na aplicação (`max_part_size`/`max_body_size` do Starlette); valide o tipo real por magic bytes (`python-magic`); gere um nome próprio (UUID) em vez do nome do usuário; salve fora da raiz servida por `StaticFiles`.
- **Quando usar:** todo endpoint que aceita `UploadFile`.
- **Quando NÃO usar `content_type` do cliente como fonte de verdade:** nunca — é só um header enviado pelo cliente, não uma checagem real do conteúdo.

### Pattern: Validar URLs de saída contra SSRF

- **Problema:** `httpx.get(user_url)` ou webhooks com URL fornecida pelo usuário podem alcançar o endpoint de metadados de cloud (`169.254.169.254`) e serviços internos (regra 12.1).
- **Padrão:** valide esquema (só `http`/`https`) e host; resolva o DNS e bloqueie ranges privados (`10/8`, `172.16/12`, `192.168/16`, `127/8`, link-local); revalide o IP após a resolução ou fixe o IP resolvido na conexão para evitar DNS rebinding.
- **Quando usar:** todo fetch de URL fornecida por request (webhook, "importar de URL", proxy).
- **Quando NÃO usar validação de host isolada:** sem revalidar após a resolução DNS — o host pode passar na validação e depois resolver para um IP interno.

### Pattern: Rate limiting e resposta de tempo/forma constante contra enumeração

- **Problema:** login sem limite de tentativas permite brute force/credential stuffing (regra 13.1); mensagens distintas para "usuário não existe" vs "senha errada" (ou pular o hash quando o usuário não existe) vazam quais contas existem (regra 13.2).
- **Padrão:** aplique `slowapi`/`fastapi-limiter` (Redis-backed para múltiplos workers) em login e endpoints sensíveis; calcule o hash mesmo quando o usuário não existe (dummy hash de custo equivalente) e retorne mensagem genérica.
- **Quando usar backend compartilhado:** múltiplos workers — rate limit em memória não funciona entre processos.
- **Quando NÃO usar:** rate limit isolado numa única dimensão — a fonte orienta aplicar por IP e/ou por conta.

### Pattern: Headers de segurança HTTP

- **Problema:** ausência de CSP, HSTS, `X-Content-Type-Options` e `Referrer-Policy` deixa a resposta sem mitigação extra contra XSS, SSL stripping e MIME sniffing (regra 15.1).
- **Padrão:** adicione os headers via middleware custom ou lib `secure`; CSP restringe origens de script, HSTS força HTTPS, `nosniff` previne MIME sniffing.
- **Quando usar CSP estrita:** apps que não dependem de assets externos via CDN.
- **Quando NÃO usar CSP genérica sem ajuste:** se o Swagger UI (`/docs`) estiver ativo — ele carrega assets de CDN externo e uma CSP restritiva quebra a página; sirva os assets localmente se precisar de CSP estrita com docs ativas.

## Anti-padrões

### Aceitar código de IA sem revisão de segurança dedicada

- **Sintoma:** o agente de coding reproduz os mesmos padrões inseguros nesta stack (regra 19.1): `text(f"...")` em vez de bind params (1.1); `python-jose` importado (2.1); `algorithms` omitido ou derivado do próprio token (2.2); ausência de checagem de ownership → IDOR (3.1); `allow_origins=["*"]` com `allow_credentials=True` (7.1); `SECRET_KEY` hardcoded (8.1); reuso de model entre create/update → mass assignment (11.2); pacote alucinado instalado sem checar (18.2).
- **Correção:** trate segurança como avaliação separada da tarefa de satisfazer o prompt — revise todo código de IA contra os padrões acima antes de mergear; o Veracode 2025 GenAI Code Security Report mediu vulnerabilidade introduzida em 45% dos casos gerados por IA, com XSS falhando em 86–88% das amostras.

### Deserializar dado externo com pickle/yaml.load

- **Sintoma:** `pickle.loads(data)` executa `__reduce__` arbitrário e `yaml.load(data)` sem `SafeLoader` instancia objetos Python a partir de dado não confiável → RCE (regra 12.2).
- **Correção:** use `yaml.safe_load(data)`; nunca faça unpickle de dado externo; para "class pollution" (equivalente Python do prototype pollution), evite `setattr` recursivo a partir de chaves controladas pelo usuário.

### Instalar dependência sugerida por IA sem verificar (slopsquatting)

- **Sintoma:** `pip install`/`uv add` de um nome de pacote que a IA recomendou sem existir — o estudo Spracklen et al. (USENIX Security 2025) mediu 19,7% dos pacotes recomendados por LLMs como alucinações, e 43% dos nomes alucinados se repetem em 10 execuções do mesmo prompt (regra 18.2).
- **Correção:** verifique existência real, popularidade/downloads, repositório e mantenedores antes de instalar; aprofundamento de supply chain (lockfile com hash, SBOM) fica no átomo `dependencies-and-packaging-uv`.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Biblioteca para JWT | PyJWT — mantida ativamente; Authlib é alternativa quando o fluxo exige OAuth/OIDC completo |
| Hash de senha em sistema novo | argon2id |
| bcrypt legado que corta senha em 72 bytes | `bcrypt_sha256` (pré-hash) ou migrar para argon2id |
| Comparar token/API key recebido | `secrets.compare_digest` — nunca `==` |
| CORS com cookies/credentials | Lista explícita de origens — nunca `["*"]` |
| Documentação interativa (`/docs`, `/redoc`) | Desabilitada ou atrás de auth em produção |
| Buffer de upload/multipart sem limite (CVE-2024-47874, CVE-2025-54121) | Impor teto de tamanho explícito; I/O de disco síncrono vai para worker, não para o event loop |
| Parsing de Content-Type com regex (CVE-2024-24762) | Regex de complexidade linear + validar tamanho antes do parse |
| Boundary malformado processado byte a byte (CVE-2024-53981) | Evitar processamento/log por byte em loop guiado por entrada externa; agregar o tratamento de excesso de bytes |
| Deserializar dado externo | `yaml.safe_load`; nunca `pickle.loads` ou `yaml.load` sem `SafeLoader` |
| Dependência nova sugerida por agente de IA | Verificar existência real, downloads e mantenedores antes de instalar |
| Rate limiting com múltiplos workers | Backend compartilhado (Redis) — não em memória |
| Cookie de sessão com navegação cross-site legítima | `same_site="lax"` — `"strict"` quebra esse fluxo |
| Autorização RBAC/ABAC com múltiplos papéis | `Security(scopes=[...])` do FastAPI ou policy object (Oso/Casbin) |

## Referências externas

- Skill: `/security` — checklist de revisão de segurança aplicável cross-stack
- Skill: `/api-design` — validação de entrada e contratos que alimentam estas regras
- Skill: `/infrastructure` — hardening de produção, CORS, proxy reverso e headers HTTP
- Source path (audit trail): Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md
