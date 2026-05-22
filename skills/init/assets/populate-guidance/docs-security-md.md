# Guidance: docs/SECURITY.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/SECURITY.md eh a **superficie de seguranca declarada** do projeto. Quem chega no projeto deve conseguir, em 5 minutos, entender como autenticacao funciona, onde secrets vivem, como inputs sao validados, e quais dependencias criticas sao monitoradas. NAO eh checklist OWASP. NAO eh relatorio de pentest. Eh um mapa minimalista que aponta para o codigo real.

O publico primario sao engenheiros adicionando funcionalidades que tocam em autenticacao, dados sensiveis ou inputs externos. O publico secundario sao revisores de seguranca avaliando a postura do projeto.

## Espirito do doc (tom esperado)

Descritivo, NUNCA aspiracional. "Usamos JWT com refresh em cookie HttpOnly, expirado em 15 minutos" eh bom. "Vamos implementar 2FA no Q3" eh ruim — pertence a docs/PLANS.md. Se voce nao encontrar como autenticacao funciona no codigo, escreva `TODO(<auth-flow needed>): provider e ciclo de sessao nao identificados` em vez de chutar. Seguranca falsa eh pior do que ausencia de documentacao.

## Sinais a procurar no codebase

- `process.env\.` — qualquer leitura de env var. Mapeia quais secrets existem e onde sao usados.
- `JWT_SECRET`, `SESSION_SECRET`, `*_KEY`, `*_TOKEN` — secrets concretos referenciados em codigo. Use o NOME, nao o valor.
- `cors(`, `helmet(`, `csurf(` — middlewares de hardening HTTP. Indica que CSP e headers de seguranca estao sendo configurados.
- `bcrypt`, `argon2`, `scrypt` — hashing de password. Aponta o provider de auth e o algoritmo.
- `passport.use(`, `next-auth`, `devise`, `omniauth` — provider de autenticacao declarado.

## Por H2 — o que escrever

### Auth Flow
Como autenticacao acontece end-to-end: provider, ciclo de sessao, estrategia de refresh. Esta secao deve ser especifica o suficiente para que um engenheiro saiba onde olhar no codigo quando um bug de autenticacao aparecer. Se o projeto nao tem autenticacao, esta secao deve dizer isso explicitamente — nao omitir.

**Cubra:** provider (next-auth/devise/passport/jose), tipo de sessao (cookie/JWT/server-side), refresh strategy (refresh token? sliding window?)
**NAO escreva:** comparativos com outros providers ("poderia ser Auth0 mas..."), implementacao step-by-step

### Secret Management
Onde secrets vivem em runtime e em desenvolvimento, como sao rotacionados, e quem tem acesso. A referencia base eh `.env.example` — todos os secrets usados devem ter entrada la. Inclui link para vault ou gestor de secrets se o projeto usa (AWS Secrets Manager, Doppler, etc.).

**Cubra:** onde estao os secrets (.env, vault, AWS SM), cobertura do .env.example, politica de rotacao
**NAO escreva:** valores reais de secrets, instrucoes de "como obter o token de producao" (pertence ao runbook interno)

### Input Validation
A estrategia de validacao de inputs externos: qual biblioteca (zod, joi, express-validator, Rails strong params, etc.), onde a validacao acontece (borda da API, service layer, ou ambos), e o que acontece quando a validacao falha. Se o projeto tem inputs multiplos (HTTP, eventos, jobs), descreve cada um.

**Cubra:** biblioteca ou abordagem de validacao, onde a validacao acontece na pilha, o que acontece em falha de validacao
**NAO escreva:** lista de todos os campos validados — o codigo faz isso melhor do que a documentacao

### Dependencies
Como o projeto monitora dependencias com vulnerabilidades conhecidas: qual scanner (Dependabot, `bun audit`, Snyk, `bundle-audit`), frequencia de execucao, e o processo de remediacao quando uma CVE alta eh detectada. Se nao ha scanner configurado, TODO obrigatorio.

**Cubra:** ferramenta de scanning de dependencias, politica de remediacao de CVE alto, frequencia de verificacao
**NAO escreva:** lista de dependencias e suas versoes — o lock file eh a fonte da verdade

### Headers and CSP
Quais headers de seguranca HTTP estao configurados (HSTS, X-Frame-Options, X-Content-Type-Options) e qual a politica de CSP em uso. Link para o arquivo de configuracao (next.config.ts, config/initializers/content_security_policy.rb, helmet setup). Se nao esta configurado, TODO.

**Cubra:** CSP policy (strict vs permissive), headers de seguranca listados, onde a configuracao vive
**NAO escreva:** tutorial de como configurar cada header — link para MDN ou documentacao do framework

## Stack-specific

### Rails
Devise para autenticacao, rack-attack para rate limiting, `config/initializers/content_security_policy.rb` para CSP. `bundle-audit` para scan de dependencias. `config/credentials.yml.enc` para secrets em producao.

### Next + React
`next-auth` como provider default. `middleware.ts` para guards de rota. Headers de seguranca em `next.config.ts` via `headers()`. `npm audit` ou `bun audit` para dependencias. `.env.local` para development, variaveis de ambiente no deploy para producao.

### Node + TypeScript
Passport ou jose para JWT manual. `helmet` middleware para headers de seguranca. `express-validator` ou zod para validacao de inputs. `dotenv-safe` para validacao de env vars obrigatorias na inicializacao.

## Links obrigatorios

`docs/MERGE_GATES.md` — o gate de security scan bloqueia merge se secrets vazarem ou se uma CVE alta for detectada. O link conecta a postura de seguranca com o enforcement automatico no CI.

`ARCHITECTURE.md` — auth e validacao se encaixam em componentes especificos do sistema. O link permite que o leitor de SECURITY.md entenda onde cada mecanismo de seguranca esta posicionado no mapa arquitetural.

## Quando deixar TODO

Se o provider de autenticacao nao for identificado apos grep de todos os signals, deixe `TODO(<auth-flow-needed>): provider e ciclo de sessao nao identificados — verificar com dev`. Este campo eh critico — chute eh perigoso. Seguranca documentada erroneamente cria falsa sensacao de protecao.

## Anti-patterns

- NAO copiar OWASP Top 10 inteiro aqui — eh checklist generico que envelhece; cite apenas o que foi verificado
- NAO escrever "se for hackeado, ligar para X" — isso pertence ao runbook de incidente
- NAO mencionar pentests historicos especificos — geralmente confidencial
- NAO usar voz futura ("vamos adicionar autenticacao de dois fatores...") — descritivo do estado atual apenas
