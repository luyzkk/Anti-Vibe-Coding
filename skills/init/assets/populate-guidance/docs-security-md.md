# Guidance: docs/SECURITY.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/SECURITY.md eh a **superficie de seguranca declarada** do projeto. Quem chega no projeto deve conseguir entender como autenticacao funciona, onde secrets vivem, como inputs sao validados, e quais dependencias criticas sao monitoradas. Eh um mapa que aponta para o codigo real e para as decisoes operacionais — quao detalhado depende do que o codigo sustenta.

O publico primario sao engenheiros adicionando funcionalidades que tocam em autenticacao, dados sensiveis ou inputs externos. O publico secundario sao revisores de seguranca avaliando a postura do projeto.

## Espirito do doc (tom esperado)

Descritivo, nao aspiracional. "Usamos JWT com refresh em cookie HttpOnly, expirado em 15 minutos" eh bom. "Vamos implementar 2FA no Q3" pertence a docs/PLANS.md, nao aqui. Cada afirmacao deve ser verificavel no codebase ou explicitamente marcada como `TODO(<owner/context needed>): ...` quando faltar evidencia. Seguranca documentada erroneamente cria falsa sensacao de protecao — quando nao houver certeza, declare a incerteza.

Profundidade segue o projeto: se o codigo implementa compliance especifica (LGPD, PCI DSS, HIPAA), retencao de dados, fingerprinting de device, ou recovery flows nao-triviais, documente. Se o projeto eh simples e usa auth de prateleira sem extensoes, descreva com a mesma honestidade — sem inflar.

## Documentos existentes a inspecionar (ANTES de grepar codigo)

LLM sennior nao reinventa o que ja existe. Antes de qualquer grep em codigo, escaneie estes artefatos do repo — eles ja contem o conhecimento que o documento final precisa. Cada achado vira citacao ou base de uma secao em SECURITY.md.

**Auditorias e relatorios existentes:**
- `docs/SECURITY_AUDIT*.md`, `docs/security-audit-*.md`, `*SECURITY_AUDIT*.md` — relatorios de auditoria com findings CRITICAL/HIGH/MEDIUM/LOW. Cada item endereçado vira linha em uma secao "Auditoria — Status de Enderecamento" no doc final.
- `docs/SECURITY_COMPLIANCE.md`, `docs/COMPLIANCE.md`, `docs/PCI*.md`, `docs/LGPD*.md`, `docs/HIPAA*.md`, `docs/GDPR*.md` — compliance pre-existente; copiar postura para "Compliance" no doc final.
- `docs/PENTEST*.md`, `docs/pentest-*.md` — manter findings nao-corrigidos confidenciais; mencionar apenas a existencia + posture.

**Convencoes de seguranca curadas:**
- `.claude/rules/security-patterns.md` — padroes ja documentados; promover ao "Critical Invariants" do doc final quando forem regras nao-negociaveis.
- `.claude/progress.txt` — gotchas numerados (procurar "gotcha", "CWE-", "security", "auth", "JWT", "RLS", "webhook"); transformar gotchas estaveis em invariants.
- `.claude/senior-principles.md` — postura senior consolidada; absorver na introducao do doc final.

**Decisoes arquiteturais relacionadas:**
- `docs/DECISIONS.md`, `.claude/decisions.md` — buscar ADRs que toquem auth/secrets/criptografia/webhook/RLS. Referenciar inline ("decidido em ADR-X").
- `docs/design-docs/ADR-*.md` — idem, formato individual.

**Compound notes:**
- `docs/compound/*.md` — buscar notas com `category: security` ou que mencionem CWE, OWASP, incidente, vulnerabilidade. Sumarizar como "Lessons learned" inline ou em secao dedicada.

**Bugs e debitos pendentes:**
- `docs/BUGS_ATIVOS.md` — bugs com tag "security" ou que tocam auth/PII viram TODO ou "Pendencias Conhecidas".
- `docs/DEBITOS_TECNICOS.md` — secao "Seguranca" ou itens com risco LGPD viram contexto de "Pendencias".

**Runbooks / Playbooks existentes:**
- `docs/RUNBOOK*.md`, `docs/PLAYBOOK*.md`, `docs/INCIDENT*.md` — se ja existem, copiar/referenciar para "Playbooks de Incident Response" no doc final.

**Regra**: cada secao do SECURITY.md final deve idealmente ser informada por pelo menos UM destes artefatos quando ele existir. Se artefato nao existe, marcar `TODO(<artifact needed>): ...` em vez de inventar.

## Sinais de codigo a procurar (depois dos documentos)

- `process.env\.` — qualquer leitura de env var. Mapeia quais secrets existem e onde sao usados.
- `JWT_SECRET`, `SESSION_SECRET`, `*_KEY`, `*_TOKEN` — secrets concretos referenciados em codigo. Use o NOME, nao o valor.
- `cors(`, `helmet(`, `csurf(` — middlewares de hardening HTTP. Indica que CSP e headers de seguranca estao sendo configurados.
- `bcrypt`, `argon2`, `scrypt` — hashing de password. Aponta o provider de auth e o algoritmo.
- `passport.use(`, `next-auth`, `devise`, `omniauth` — provider de autenticacao declarado.
- Migrations ou triggers em SQL com mencao a `pii`, `redact`, `crypto`, `encrypt` — indica criptografia de dados sensiveis em repouso.
- `rate_limit`, `throttle`, `lockout` — politicas de protecao contra abuso.

## Por H2 — o que escrever

### Auth Flow
Como autenticacao acontece end-to-end no projeto: provider, ciclo de sessao, estrategia de refresh, e qualquer extensao relevante (MFA, step-up auth, device fingerprinting, recovery flow). A profundidade segue o que o projeto implementa. Para um app SaaS com checkout e dados financeiros, espera-se mais detalhe do que para uma ferramenta interna sem PII. Se o projeto nao tem autenticacao, esta secao diz isso explicitamente.

**Espera-se cobrir, na profundidade que o codigo sustenta:** provider e biblioteca usados, tipo de sessao (cookie/JWT/server-side), refresh strategy, MFA/2FA quando existir, recovery flow quando nao-trivial, integracoes especiais (step-up, device fingerprinting, scanner-safe links).

### Secret Management
Onde secrets vivem em runtime e em desenvolvimento, como sao rotacionados, e quem tem acesso. A referencia base eh `.env.example` — todos os secrets usados deveriam ter entrada la. Inclui link para vault ou gestor de secrets se o projeto usa (AWS Secrets Manager, Doppler, Supabase secrets, etc.).

**Espera-se cobrir, na profundidade que o codigo sustenta:** onde estao os secrets (.env, vault, AWS SM, Supabase secrets), cobertura do `.env.example`, politica de rotacao, separacao entre dev/staging/prod, criptografia em repouso quando aplicavel.

### Input Validation
A estrategia de validacao de inputs externos: qual biblioteca (zod, joi, express-validator, Rails strong params, etc.), onde a validacao acontece (borda da API, service layer, ou ambos), e o que acontece quando a validacao falha. Se o projeto tem inputs multiplos (HTTP, eventos, jobs, webhooks), descreve cada um. Webhooks merecem detalhe se houver verificacao de assinatura HMAC e protecao anti-replay.

**Espera-se cobrir, na profundidade que o codigo sustenta:** biblioteca ou abordagem de validacao por borda (HTTP/events/jobs), onde a validacao acontece na pilha, comportamento em falha, verificacao de assinatura em webhooks quando aplicavel.

### Dependencies
Como o projeto monitora dependencias com vulnerabilidades conhecidas: qual scanner (Dependabot, `bun audit`, `npm audit`, Snyk, `bundle-audit`), frequencia de execucao, e o processo de remediacao quando uma CVE alta eh detectada. Se nao ha scanner configurado, marcar com TODO em vez de inventar processo.

**Espera-se cobrir, na profundidade que o codigo sustenta:** ferramenta de scanning, politica de remediacao de CVE alto/medio, frequencia de verificacao, integracao com CI/PR review.

### Headers and CSP
Quais headers de seguranca HTTP estao configurados (HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy) e qual a politica de CSP em uso. Link para o arquivo de configuracao (next.config.ts, config/initializers/content_security_policy.rb, helmet setup, Cloudflare Workers headers). Se nao esta configurado, marcar com TODO.

**Espera-se cobrir, na profundidade que o codigo sustenta:** CSP policy (strict/permissive/report-only), headers de seguranca configurados, onde a configuracao vive, edge cases conhecidos (PWA service worker, iframe embeds).

## Compliance, retencao e ameacas (quando aplicavel)

Se o projeto opera sob requisitos regulatorios concretos (LGPD, PCI DSS, HIPAA, BCB, GDPR, SOC2), documente o escopo de aplicacao e onde cada requisito eh cumprido no codigo. Tabelas com dados pessoais coletados / base legal / retencao / criptografia ajudam mais do que prosa generica. Threat model em uma pagina (atacantes prioritarios + vetores) eh valioso se o projeto for sensivel.

Estes topicos nao tem H2 fixo no template — adicione H2 proprios quando o codigo sustenta o nivel de detalhe (ex: `## Compliance`, `## Threat Model`, `## Data Retention`).

## Stack-specific

### Rails
Devise para autenticacao, rack-attack para rate limiting, `config/initializers/content_security_policy.rb` para CSP. `bundle-audit` ou Dependabot para scan de dependencias. `config/credentials.yml.enc` para secrets em producao.

### Next + React
`next-auth` ou Clerk como provider tipico. `middleware.ts` para guards de rota. Headers de seguranca em `next.config.ts` via `headers()`. `npm audit` ou `bun audit` para dependencias. `.env.local` para development, variaveis de ambiente no deploy para producao.

### Node + TypeScript
Passport ou jose para JWT manual. `helmet` middleware para headers de seguranca. `express-validator` ou zod para validacao de inputs. `dotenv-safe` para validacao de env vars obrigatorias na inicializacao. Edge Functions em Deno/Supabase tem padroes proprios — documente onde aplicavel.

## Links obrigatorios

`docs/MERGE_GATES.md` — o gate de security scan bloqueia merge se secrets vazarem ou se uma CVE alta for detectada. O link conecta a postura de seguranca com o enforcement automatico no CI.

`ARCHITECTURE.md` — auth e validacao se encaixam em componentes especificos do sistema. O link permite que o leitor de SECURITY.md entenda onde cada mecanismo de seguranca esta posicionado no mapa arquitetural.

## Quando deixar TODO

Se o provider de autenticacao nao for identificado apos grep dos signals, deixe `TODO(<auth-flow-needed>): provider e ciclo de sessao nao identificados — verificar com dev`. Este campo eh critico — chute eh perigoso. Seguranca documentada erroneamente cria falsa sensacao de protecao.

O mesmo vale para qualquer afirmacao que nao tenha respaldo direto no codigo. Prefira `TODO(<owner/context needed>): ...` a afirmar algo que voce nao consegue rastrear.

## O que evitar

- Voz futura ("vamos adicionar autenticacao de dois fatores...") — descritivo do estado atual; planos vivem em docs/PLANS.md
- Detalhes operacionais que envelhecem rapido (procedimentos exatos de oncall, contatos pessoais) — pertencem ao runbook interno
- Pentests historicos especificos com vulnerabilidades nao-corrigidas — geralmente confidencial; resumir postura sim, listar findings nao

Estas sao orientacoes para qualidade da documentacao, nao restricoes de profundidade. Liste OWASP coverage, compliance details, recovery flows passo-a-passo, ou device fingerprinting quando o codigo sustentar — sao informacoes que ajudam um engenheiro novo a navegar a postura de seguranca real do projeto.
