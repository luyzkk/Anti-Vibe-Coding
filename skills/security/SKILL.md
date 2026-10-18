---
name: security
description: "Roteiro de decisão de segurança: faz até 3 perguntas que só o usuário sabe, mostra 2 ou 3 opções com prós, contras e custo, recomenda e registra a escolha; também audita um projeto existente. Use ao decidir ou revisar login e senha, autorização (RBAC, ABAC, RLS), segredos, webhooks, upload, dados pessoais, rate limit e CORS, Supabase/BaaS, dependências com vulnerabilidade e teste dinâmico — por conceito ou por nome (OWASP, JWT, OAuth2, PKCE, bcrypt, HMAC, CSRF, IDOR)."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch, AskUserQuestion
argument-hint: "[decisão de segurança ou módulo a auditar]"
---

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 01 fase-04 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G4 do plano: este bloco é template verbatim para as 6 skills cross-stack restantes (Plano 03).
// G2 do plano: path fixo .claude/knowledge/INDEX.md — init garantiu o stack certo (D13).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.
// 2026-05-16 (Luiz/dev): verify-work HIGH #4 — extraído para helper testável (lib/stack-aware-preface.ts).
// Tests no helper exercitam diretamente; E2E importa a mesma função.

import { getStackKnowledgePreface } from './lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta. Se vazio, ignore — a skill segue sem mudança (CA-09).
<!-- stack-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# Segurança — Roteiro de Decisão

Decidir como proteger o sistema e o dado de quem o usa. A skill **conduz a decisão**: pergunta o que só o usuário sabe (quem acessa o quê, que dado é sensível, o que acontece se vazar), mostra as opções com prós e contras em português simples e registra a escolha. Também **audita** um projeto existente. Não escreve código de produção; para implementar depois, direcione para `/anti-vibe-coding:tdd-workflow`.

## Como Operar

1. **Diga a decisão em uma frase**, sem jargão: "Vamos decidir quem pode ver os dados de cada aluno."
2. **Leia o projeto antes de perguntar** (`Grep`, `Read`): o que o código já responde (RLS ligado? token em `localStorage`? rota sem checagem?) não se pergunta. Depois **faça até 3 perguntas numa tela só** (`AskUserQuestion`, uma pergunta por item), só do que o usuário sabe: quem usa, que dado é sensível, quanto custa se vazar.
3. **Mostre 2 ou 3 opções**, cada uma com: o que é (uma linha), prós, contras, custo (tempo de manutenção, atrito para o usuário) e quando seria a escolha errada.
4. **Recomende uma**, ligando a recomendação às respostas dele: "Recomendo B porque você disse que esse dado é de saúde."
5. **Se o usuário não souber responder**, use o padrão de um sênior para aquela decisão (catálogo abaixo) e diga qual usou e o que mudaria a resposta.
6. **Registre a escolha** (seção Registro). Se ela cair numa das mudanças da lista de aprovação humana, apresente o diff e espere a confirmação antes de qualquer aplicação.

Pedido de explicação completa ou de aprofundamento ("me explica de verdade", "quero o texto completo"): leia `references/guia-completo.md`, e o arquivo do tópico quando houver. Esse texto longo só é lido quando o usuário pedir; o roteiro não depende dele.

### Aprovacao Humana Necessaria

Antes de sugerir implementação das mudanças abaixo, **sinalizar para aprovação humana — nunca auto-aplicar**:

1. Novo fluxo de autenticação ou alteração de lógica de auth existente
2. Armazenar nova categoria de PII ou dados de pagamento
3. Nova integração com serviço terceiro (OAuth provider, webhook externo, SDK de pagamento)
4. Mudança na configuração de CORS (ampliar origens ou métodos permitidos)
5. Novo handler de upload de arquivos
6. Conceder roles ou permissões elevadas (admin, superuser, service account privilegiada)
7. Alterar configuração de rate limiting (afrouxar limites ou desabilitar)

IA sugere, nunca invoca automaticamente: apresente o diff e aguarde a confirmação do humano antes de qualquer ação destrutiva ou de acesso ampliado.

## Auditoria

Para auditar um projeto em produção, percorra `references/checklist-minimo.md` (ASVS L1, capítulos V1 a V16) e relate cada achado com gravidade. As buscas de verificação de cada tópico (`grep` de `localStorage`, `findById` sem dono, `createHash('md5')`) estão em `references/guia-completo.md`. L1 é o piso; projeto com dado regulado ou financeiro sobe a régua. As perguntas do roteiro entram só onde o código não responde.

## Catálogo de decisões

Cada bloco diz o que perguntar, as opções, o padrão de um sênior e quando ele erra. Use o bloco da decisão em discussão; não percorra todos.

### Login — como o usuário entra
- **Perguntas:** (1) Quem usa: cliente final, equipe interna ou outro sistema? (2) O usuário já tem conta Google ou Apple que usaria para entrar? (3) Se alguém entrar na conta de outra pessoa, o que vê ou faz (dado pessoal, compra, dinheiro)?
- **Opções:** A) Sessão no servidor (cookie, Redis), para app web tradicional. B) Token curto (JWT) mais refresh token em cookie `httpOnly`, para API e app mobile. C) Login social (OpenID Connect): menos senha para guardar.
- **Padrão:** web: sessão com cookie `httpOnly` + `Secure` + `SameSite`. API sem estado: token de 15 min a 1 h, refresh com rotação (reuso invalida todos); PKCE em SPA e mobile. Máquina a máquina: OAuth2 client credentials. Ferramenta interna: API key com expiração e hash no banco.
- **Errada quando:** token em `localStorage` (XSS rouba); JWT sem expiração; fluxo implícito (`response_type=token`, obsoleto).
- **Referência:** `references/authentication.md`, `references/auth-methods.md`

### Senha e segundo fator
- **Perguntas:** (1) A conta protege dinheiro, dado de saúde ou dado pessoal sensível? (2) Se a senha vazar, quem sofre: só o usuário ou a empresa? (3) O público consegue usar um app autenticador?
- **Opções:** A) Senha forte com limite de tentativas. B) Senha mais 2FA por app autenticador (TOTP). C) Sem senha (link mágico ou login social).
- **Padrão:** mínimo de 12 caracteres, sem máximo restritivo; hash com Argon2id ou bcrypt (rounds 12+), nunca encriptação; no máximo 5 tentativas por minuto com bloqueio progressivo; TOTP para conta que move dinheiro ou dado sensível, SMS só como reserva.
- **Errada quando:** encriptar senha (AES é reversível); MD5 ou SHA1; SMS como único 2FA em conta de dinheiro.
- **Referência:** `references/cryptography.md`, `references/authentication.md`

### Quem pode ver e fazer o quê (autorização)
- **Perguntas:** (1) Que tipos de pessoa usam o sistema e o que cada uma pode ver? (2) Um usuário pode ver dado de outro (o gestor vê os alunos, o admin vê tudo)? (3) A regra muda por registro ("só os meus pedidos") ou só por papel?
- **Opções:** A) Papéis (admin, editor, leitor): RBAC. B) Papéis mais dono do registro (ACL). C) Regras por atributos (ABAC), ex.: "só da própria turma".
- **Padrão:** RBAC com checagem centralizada (`requireRole()`); toda consulta filtra pelo dono vindo do token autenticado; negar por padrão (rota sem regra é inacessível); admin não é padrão, leitor é; checar no servidor, nunca só esconder o botão.
- **Errada quando:** `findById(id)` sem filtrar pelo dono (IDOR, o erro mais comum e crítico); `if (role === 'admin')` espalhado pelo código; mais de 20 papéis sem ABAC.
- **Referência:** `references/authorization-models.md`

### Segredos e chaves
- **Perguntas:** (1) Que chaves o sistema usa (pagamento, banco, WhatsApp, IA) e o que cada uma faz se vazar? (2) Quem tem acesso ao repositório e ao ambiente de produção? (3) Alguma chave já foi colada num chat, print ou commit?
- **Opções:** A) Variáveis de ambiente (`.env` fora do git; segredo do provedor em produção). B) Gerenciador de segredos (Vault, Secrets Manager). C) Revogar e trocar agora, porque já vazou.
- **Padrão:** `.env` mais `.gitignore`; scanner de segredo no pre-commit (gitleaks); chave com escopo mínimo; chave que vazou se revoga e se troca, apagar do histórico não basta.
- **Errada quando:** chave secreta no bundle do frontend (a anon key do Supabase é pública por design, e a proteção dela é o RLS); a IA "consertando" um deploy com o segredo escrito no código.
- **Referência:** `references/application-security.md`, `references/vibecoding-security.md`

### Webhooks — receber aviso de outro sistema
- **Perguntas:** (1) Quem manda o aviso (Stripe, Meta, banco) e o que ele dispara (liberar acesso, marcar como pago)? (2) O mesmo aviso pode chegar duas vezes? (3) O provedor assina o aviso?
- **Opções:** A) Validar a assinatura e processar na hora. B) Validar, gravar o id do evento e responder 200; processar depois (fila). C) Não receber webhook: consultar o provedor periodicamente.
- **Padrão:** B. Assinatura (HMAC) calculada sobre o corpo cru, comparada com `timingSafeEqual`; sem assinatura válida, 401 ou 403 e nada é processado; id do evento único no banco para não processar duas vezes.
- **Errada quando:** processar "por via das dúvidas"; comparar assinatura com `===`; confiar no IP de origem.
- **Referência:** `references/webhook-security.md` (e `/anti-vibe-coding:api-design` para idempotência)

### Upload de arquivo
- **Perguntas:** (1) Quem pode enviar arquivo: qualquer visitante ou só quem está logado? (2) Que tipos precisa aceitar de verdade (foto, PDF)? (3) Quem baixa depois: só o dono ou outras pessoas?
- **Opções:** A) Não aceitar upload. B) Aceitar com lista de tipos permitidos, tamanho máximo e conferência dos bytes reais do arquivo. C) Upload direto ao storage com URL assinada de curta duração.
- **Padrão:** B ou C. Storage sempre privado; download por URL assinada com validade curta; nunca confiar na extensão nem no tipo que o cliente declara.
- **Errada quando:** lista de tipos proibidos em vez de permitidos; sem limite de tamanho (derruba por disco); bucket público.
- **Referência:** `references/application-security.md`, `references/vibecoding-security.md`

### Dados pessoais e sensíveis
- **Perguntas:** (1) Que dados pessoais o sistema guarda (CPF, telefone, saúde, foto) e precisa mesmo de cada um? (2) Quem pode ver cada um? (3) Por quanto tempo precisa guardar?
- **Opções:** A) Não guardar (pedir só quando precisar e descartar). B) Guardar com acesso restrito e banco em rede privada. C) Guardar o mínimo, com o campo sensível criptografado na aplicação.
- **Padrão:** guardar o mínimo; classificar antes de modelar (público, interno, PII, credencial, financeiro); campo sensível nunca em log, URL ou resposta de API (`passwordHash`, `resetToken` ficam de fora); AES-GCM para criptografia simétrica; Base64 não é criptografia.
- **Errada quando:** coletar "porque pode servir"; PII em log; token ou senha na query string.
- **Referência:** `references/cryptography.md`, `references/application-security.md`

### Proteger a API — limites, origem e ataques comuns
- **Perguntas:** (1) A API é pública, só do seu app ou interna? (2) Que rotas custam dinheiro ou dado se alguém abusar (login, envio de WhatsApp, IA)? (3) De que domínios o frontend chama?
- **Opções:** A) Limite de uso (rate limit) por rota, por usuário/IP e global, mais CORS com domínios explícitos. B) A mais WAF ou CDN na frente (Cloudflare, AWS WAF). C) API interna atrás de VPN, sem exposição pública.
- **Padrão:** A sempre; B quando é pública e tem rota cara; C para admin e painel interno. Sessão em cookie leva token CSRF mais `SameSite`; consulta com ORM ou prepared statement, nunca texto concatenado; tudo que vai para HTML é escapado, com CSP como camada extra.
- **Errada quando:** CORS `*` numa API com dado sensível; rate limit só global; endpoint de admin ou debug aberto.
- **Referência:** `references/application-security.md`

### Supabase e BaaS — banco exposto ao navegador
- **Perguntas:** (1) Que tabelas guardam dado pessoal ou financeiro? (2) Cada linha pertence a um usuário ou é compartilhada (turma, empresa)? (3) Existe função de banco (RPC) ou Edge Function que faz algo sensível?
- **Opções:** A) RLS por dono em toda tabela (`auth.uid() = user_id`). B) RLS por grupo, com tabela de pertencimento. C) Tabela acessada só pelo servidor (service role), sem acesso direto do navegador.
- **Padrão:** RLS ligado em todas as tabelas públicas; nenhuma política `USING (true)` para `anon` em tabela sensível; RPC sensível com `REVOKE` de `anon` e `GRANT` a `authenticated`; Edge Function valida o JWT explicitamente; teste com a anon key deve voltar 401 ou `[]`.
- **Errada quando:** tabela sem RLS (quem tem a anon key despeja tudo); política gerada pela IA sem revisão (ela não conhece o seu modelo de autorização); lock de dinheiro sem transação ACID.
- **Referência:** `references/supabase-security.md`, `references/vibecoding-security.md`

### Dependências — adotar ou atualizar
- **Perguntas:** (1) Precisa mesmo de uma biblioteca nova, ou o que o projeto já tem resolve? (2) Se é vulnerabilidade: a função vulnerável é usada no seu código, e a biblioteca vai para produção ou é só de desenvolvimento? (3) Quanto tempo a correção pode esperar?
- **Opções:** A) Não adotar: usar o que já existe. B) Adotar depois de cinco checagens: a stack atual já resolve? tamanho do bundle? manutenção ativa (último ano)? vulnerabilidades conhecidas? licença compatível? C) Atualizar agora, ou adiar registrando motivo e data de revisão.
- **Padrão:** crítico ou alto e alcançável em produção: atualizar agora. Só desenvolvimento ou inalcançável: atualizar em breve, sem bloquear release. Adiar sempre com motivo e data. Toda dependência é um passivo: quem propõe justifica.
- **Errada quando:** `npm audit fix` automático tratado como triagem; adicionar pacote sem atualizar o lockfile no mesmo commit; ignorar alerta sem registrar.
- **Referência:** `references/sca-triage.md`, `references/ci-security-tooling.md`

### Erros e logs
- **Perguntas:** (1) O que você precisa descobrir quando alguém ataca (login falho, acesso negado)? (2) Quem lê os logs? (3) Há dado pessoal que não pode aparecer neles?
- **Opções:** A) Log mínimo de erro. B) Eventos de segurança registrados (login falho, falha de autorização, mudança de privilégio), sem senha, token nem PII. C) B mais trilha de auditoria das operações sensíveis.
- **Padrão:** erro para o cliente é genérico (sem stack trace, SQL ou caminho de arquivo); exceção nunca contorna a checagem de autorização (falha fechando); debug desligado em produção.
- **Errada quando:** `catch` vazio depois de falha de autorização; `console.log(password)`.
- **Referência:** `references/checklist-minimo.md` (V16)

### Teste de segurança no servidor de desenvolvimento
- **Perguntas:** (1) Qual é o endereço do servidor de desenvolvimento do projeto (nunca produção)? (2) Ele pode ficar indisponível por um instante e ter dados de teste alterados?
- **Opções:** A) Não rodar teste dinâmico. B) Passe curto no servidor local, só confirmando que as defesas rejeitam. C) Varredura completa (ZAP, Trivy) na integração contínua.
- **Padrão:** só `localhost` ou o servidor de desenvolvimento declarado no projeto; o critério de sucesso é "a defesa rejeitou", e canário que passa significa parar e reportar. Opt-in: o `/anti-vibe-coding:verify-work` dispara, com `config.auditors.dynamic` desligado por padrão.
- **Errada quando:** contra produção; fuzzing em escala, enumeração de usuários ou teste de carga.
- **Referência:** `references/dynamic-testing.md`, `references/ci-security-tooling.md`

## Registro

Depois que o usuário escolher, registre numa destas duas:

- **Há uma feature em andamento** (`docs/exec-plans/active/<pasta>/DESIGN.md`; se houver mais de uma, pergunte qual): padrão aceito vira linha de `## Ameaças & Dados`; escolha entre opções, ou padrão recusado, vira linha da tabela `## Decisões` — `| N | decisão | opções | escolha | por quê |`. Escreva o "por quê" com as respostas do usuário.
- **A decisão vale para o projeto inteiro** (modelo de login, onde ficam os segredos) **ou não há feature em andamento:** crie um ADR com `/anti-vibe-coding:decision-registry`.

Segurança recusada sem registro não é decisão, é esquecimento com aparência de decisão.

## Sinais de alerta

- `localStorage.setItem('token', ...)`; `console.log` de senha ou token; JWT sem `expiresIn`.
- CORS `*` em endpoint autenticado; `eval()` com input do usuário; SQL montado com texto concatenado.
- Segredo escrito no código ou em arquivo que o `.gitignore` não cobre.
- `catch` vazio, ou que segue o fluxo feliz depois de falha de autorização.
- Dependência nova sem o lockfile atualizado no mesmo commit.
- "É rede interna, não precisa de autenticação forte" e "valido no frontend, basta": nenhum dos dois é defesa.

$ARGUMENTS
