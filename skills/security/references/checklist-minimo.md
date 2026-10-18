# Segurança — Checklist de segurança mínima (ASVS L1)

> Usado na auditoria de um projeto em produção. É o checklist do guia antigo, em arquivo próprio para ser
> lido sozinho. O roteiro de decisão está em `SKILL.md`.

Checklist obrigatoria para auditar qualquer projeto em producao.
Organizada sob a regua **OWASP ASVS 5.0.0** — Level 1 (L1) e o piso aplicavel a toda aplicacao;
os capitulos numerados dao cobertura sistematica em vez de tematica (nota de escopo ao final do bloco).

<checklist>
### V1 — Codificacao e Sanitizacao
- [ ] ORM/prepared statements (nao SQL raw com interpolacao)
- [ ] Inputs sanitizados em TODAS as camadas
- [ ] Nenhuma regex com quantificadores nesteados

### V4 — API e Servicos Web
- [ ] HMAC signature validada com timingSafeEqual
- [ ] Requests sem assinatura rejeitados (401/403)
- [ ] Idempotencia em operacoes financeiras

### V5 — Manuseio de Arquivos
- [ ] Uploads validam allowlist de MIME + tamanho maximo + magic bytes

### V6 — Autenticacao
- [ ] 2FA disponivel (TOTP preferivel, nao apenas SMS)
- [ ] Senha minima de 12 caracteres, sem max restritivo
- [ ] Rate limiting em login (5 tentativas/minuto)

### V7 — Gestao de Sessao
- [ ] Tokens de sessao com TTL e rotacao
- [ ] Logout invalida a sessao/token no SERVIDOR (nao apenas remove do client)

### V8 — Autorizacao
- [ ] UUIDs para IDs publicos (nao sequenciais)
- [ ] Negar por padrao: rota sem regra explicita e inacessivel, nao publica
- [ ] Autorizacao verificada no servidor em TODO recurso (nunca so escondendo a UI)
- [ ] RLS habilitado em TODAS as tabelas publicas
- [ ] Nenhuma politica com `USING (true)` para role `anon` em tabelas sensiveis
- [ ] Politicas owner-based: `auth.uid() = user_id` para dados de usuario
- [ ] Edge Functions validam Authorization header explicitamente
- [ ] RPCs sensiveis com REVOKE para `anon` + GRANT apenas para `authenticated`
- [ ] Auditoria via `pg_policies`: nenhuma politica aberta para `anon` involuntariamente
- [ ] Teste com anon key confirma que tabelas sensiveis retornam 401 ou `[]`

### V10 — OAuth e OIDC
- [ ] Refresh token com rotacao; reuso detectado invalida todos os tokens da mesma autorizacao

### V11 — Criptografia
- [ ] Senhas hasheadas com bcrypt (rounds >= 12) ou Argon2id
- [ ] NENHUM uso de MD5/SHA1 para seguranca
- [ ] Base64 nao usado como "encriptacao"
- [ ] AES-GCM para encriptacao simetrica (nao ECB, nao CBC sem HMAC)
- [ ] SSH com Ed25519 (nao RSA 2048/DSA)

### V12 — Comunicacao Segura
- [ ] TLS com Forward Secrecy (ECDHE)

### V13 — Configuracao
- [ ] Secrets em `.env` + `.gitignore` (nao hardcoded)
- [ ] CORS restritivo (dominios explicitos, nao `*`)
- [ ] Cookies com HttpOnly + Secure + SameSite
- [ ] CSP headers configurados
- [ ] Security headers presentes (HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy) alem de CSP
- [ ] Rate limiting em todos endpoints publicos
- [ ] Modo debug/verbose desabilitado em producao
- [ ] Endpoints e features nao usados removidos (superficie minima)

### V14 — Protecao de Dados
- [ ] S3/storage privado + presigned URLs
- [ ] Database em rede privada (VPC)
- [ ] Menor privilegio para service accounts e DB users
- [ ] Dados sensiveis (API keys, tokens de sessao) nunca na URL ou query string — apenas body ou headers
- [ ] Dados de sessao autenticada limpos do armazenamento client-side apos logout ou expiracao

### V15 — Codificacao Segura e Dependencias
- [ ] Campos sensiveis excluidos das respostas de API (passwordHash, resetToken, etc.)
- [ ] `npm audit` (ou equivalente da stack) sem criticos/highs nao-triados
- [ ] Findings criticos/highs seguem o procedimento de triagem EPSS/KEV/reachability: `sca-triage.md`
- [ ] Findings adiados documentados com razao + data de revisao

### V16 — Tratamento de Erro e Logging
- [ ] Erro ao cliente e generico; stack trace, SQL e caminho de arquivo nunca vazam
- [ ] Eventos de seguranca logados: login falho, falha de autorizacao, mudanca de privilegio
- [ ] Nenhum log contem senha, token, secret ou PII
- [ ] Caminho de excecao nao contorna a checagem de autorizacao (fail-closed)
- [ ] Logs de auditoria para operacoes sensiveis

### Infraestrutura Pessoal e Operacional (fora do escopo do ASVS)
- [ ] FDE ativado em todos os dispositivos
- [ ] Backups offsite testados (regra 3-2-1)
- [ ] VPN obrigatoria para acesso remoto
</checklist>

O ASVS e um padrao de seguranca de **aplicacao** — por isso os tres itens acima (disco, backup, VPN)
nao tem capitulo correspondente; sao higiene pessoal/operacional que este checklist sempre cobrou e que
esta reorganizacao decidiu manter. L1 e o piso obrigatorio para toda aplicacao em
producao, **nao o teto**: projetos com dados regulados ou financeiros devem subir a regua para L2/L3 —
ver `https://owasp.org/www-project-application-security-verification-standard/` (licenca CC BY-SA 4.0;
o conteudo abaixo e reescrita propria com atribuicao, nunca copia literal dos requisitos). A secao
V16 e o item sobre desabilitar depuracao em producao (V13) citam controles que o ASVS 5.0.0 classifica
como L2, nao L1 — mantidos aqui porque fecham uma lacuna pratica real (ligada a A10:2025 do Top 10, ver
Red Flags), e o piso L1 sozinho nao cobre erro/log.
