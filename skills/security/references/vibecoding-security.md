# Seguranca em VibeCoding — Referencia Detalhada

> Baseado em pesquisa empirica: "1 Hacker vs 4 VibeCoders" (YuriRDev).
> 4 desenvolvedores criaram apps com zero linhas de codigo (apenas prompts). Um hacker executou pentests em cada sistema.

---

## O Problema Central: IA Gera Codigo Funcional, Nao Seguro

Plataformas de VibeCoding (Lovable, Bolt, Cursor, v0, Claude) geram aplicacoes completas em minutos. Mas o codigo gerado herda as vulnerabilidades que a IA nao sabe prevenir:

1. **IA nao conhece o modelo de autorizacao** — nao sabe que usuario A nao pode ver dados do usuario B
2. **IA nao cruza dominios logicos** — modulo de compras vs. afiliados vs. reembolsos sao tratados isoladamente
3. **IA prioriza funcionalidade** — faz o sistema funcionar, nao faz o sistema ser seguro
4. **IA hardcoda secrets ao falhar no deploy** — em tentativas de "consertar", pode expor credenciais
5. **Desenvolvedor perde controle ao aceitar fixes cegamente** — IA sobrescreve codigo sem revisao

---

## Vulnerabilidades Comprovadas em Apps VibeCoding

### 1. Race Conditions Financeiras (CRITICO)

**Como acontece:** Atacante dispara multiplas requisicoes simultaneas de compra.

| Cenario | Resultado |
|---------|-----------|
| Comprar o MESMO item 4x simultaneamente | Geralmente bloqueado (unicidade no banco) |
| Comprar 3 itens DIFERENTES simultaneamente com saldo para 1 | Compra 2-3 itens, debita saldo de apenas 1 |
| Pedir reembolso dos itens "extras" | Saldo aumenta acima do original |

**O problema de IA:** Ela trata cada compra como transacao independente. Nao implementa locks atomicos entre itens diferentes.

**Protecao:**
- Operacoes financeiras SEMPRE com `SELECT ... FOR UPDATE` (lock de linha)
- Transacoes ACID para qualquer operacao que envolva saldo
- Idempotency keys para prevenir requests duplicados
- Verificar saldo DENTRO da transacao, nao antes dela

**Prompt defensivo:**
```
Implemente operacoes de compra com transacoes atomicas.
Use SELECT ... FOR UPDATE para lockar o saldo do usuario.
Verifique saldo DENTRO da transacao. Multiplas compras
simultaneas devem ser serializadas, nao paralelas.
```

---

### 2. Vazamento de Secrets no Source Control (CRITICO)

**Como acontece:** A IA falha ao fazer deploy. Em tentativas de "consertar", ela hardcoda API keys, DB passwords e tokens JWT diretamente no codigo-fonte. Se commitado, fica no historico do Git para sempre.

**Protecao:**
- Secrets SEMPRE em `.env` + `.gitignore`
- Pre-commit hooks com `gitleaks` ou `git-secrets`
- Revisar diffs antes de commitar (nao aceitar mudancas cegas da IA)
- Ao dar deploy, especificar: "Use variaveis de ambiente, NUNCA hardcode secrets"

**Prompt defensivo:**
```
NUNCA escreva secrets, API keys, tokens ou senhas diretamente
no codigo. Use process.env.VARIABLE_NAME para todas as
credenciais. Se o deploy falhar, NAO tente consertar
hardcodando valores.
```

---

### 3. Injecao de Tracker via URL de Imagem Externa (MEDIO)

**Como acontece:** Campo de "URL de imagem" no perfil aceita qualquer dominio. Atacante insere URL de servidor proprio. Quando outros usuarios visualizam o perfil, seus browsers fazem GET nessa URL, vazando IP, User-Agent, e outros headers.

**Protecao:**
- Whitelist de dominios permitidos para imagens externas (ex: so CDN proprio)
- Download e re-hospedagem: ao receber URL externa, fazer download da imagem e armazenar localmente
- Content Security Policy (CSP) com `img-src` restritivo
- Proxy de imagens: servir imagens externas atraves de um proxy proprio (esconde o IP do usuario)

---

### 4. Ausencia de Limite de Input / DoS por Poluicao de Banco (MEDIO)

**Como acontece:** Rotas da API aceitam payloads de tamanho ilimitado. Atacante envia campos com megabytes de texto, exaurindo storage do banco.

**Protecao:**
- Limitar tamanho de body em TODAS as rotas (ex: `express.json({ limit: '1mb' })`)
- Limitar comprimento de campos individuais no schema (ex: `varchar(500)`, nao `text` irrestrito)
- Rate limiting por IP/usuario
- Validacao de tamanho no backend, nao apenas no frontend

---

### 5. Falha de Logica de Negocios entre Modulos (CRITICO)

**Como acontece:** IA trata cada modulo isoladamente. Exemplo real:
- Modulo de afiliados: saque instantaneo de comissao
- Modulo de compras: reembolso em ate 30 minutos
- Atacante: compra com link de afiliado proprio → saca comissao → pede reembolso → lucro

**Por que IA erra:** Ela nao "vê" a interdependencia temporal entre modulos. Cada modulo funciona corretamente isolado.

**Protecao:**
- Janelas de retencao: comissoes so liberadas apos prazo de reembolso
- Cancelamento em cascata: reembolso cancela comissoes associadas
- Vincular entidades: `purchases.id → commissions.purchase_id`
- No prompt, SEMPRE descrever fluxos cross-module explicitamente

**Prompt defensivo:**
```
O sistema tem modulo de compras, afiliados e reembolsos.
REGRAS CRITICAS:
1. Comissoes de afiliados so podem ser sacadas apos 30 dias
   (prazo de reembolso)
2. Se uma compra for reembolsada, a comissao associada
   deve ser cancelada automaticamente
3. Um usuario NAO pode ser afiliado de si mesmo
```

---

## Defesas Comprovadas Eficazes

### Defesa #1: TDD via IA (ZERO vulnerabilidades encontradas)

O participante senior (M Junior) usou uma metodologia que resultou em **zero vulnerabilidades** no pentest:

1. Quebrar cada feature em etapas micro
2. Para cada etapa, pedir a IA para gerar **testes de seguranca ANTES do codigo**
3. Implementar o codigo que passa nos testes
4. Qualquer regressao de seguranca futura reprova o build

**Prompt de TDD defensivo:**
```
Antes de implementar, gere testes de integracao que verificam:
- Acesso nao autenticado retorna 401
- Usuario A nao pode acessar dados do usuario B
- Race conditions em operacoes concorrentes
- Inputs maliciosos (SQLi, XSS, payloads gigantes) sao rejeitados
Somente apos os testes existirem, implemente a funcionalidade.
```

### Defesa #2: Defense in Depth no Prompt Inicial

O participante pleno (Jean) incluiu no prompt:
- Aviso de que o sistema sofreria pentest profissional
- Exigencia de Argon2 para senhas
- Anti-enumeracao: erros genericos ("credenciais invalidas", nunca "email nao encontrado")
- Rate limiting com lockouts dinamicos
- Honeypots: endpoints falsos que retornam JSON fake para despistar scanners
- Sanitizacao: defesa contra SQLi, XSS, validacao de MIME Type e Magic Bytes em uploads

### Defesa #3: AI Red Teaming

O red teamer (Aviator) usou a propria IA para atacar o codigo gerado:
- Apos gerar cada modulo, pedir a IA para revisar buscando vulnerabilidades
- Listar categorias especificas: Race Conditions, IDOR, Mass Assignment, logica de negocios
- Corrigir antes de publicar

---

## Prompt Arquitetural de Seguranca (Template)

Baseado nas melhores praticas dos 4 participantes:

```
Atue como um desenvolvedor focado em seguranca.
Este sistema sofrera um pentest profissional.

REGRAS INVIOLAVEIS:
1. Defesa em profundidade: cada camada independentemente segura
2. NUNCA confie em inputs do cliente — sanitize TUDO no backend
3. NUNCA hardcode secrets — use variaveis de ambiente
4. Operacoes financeiras: transacoes ACID com locks atomicos
5. Erros genericos: "credenciais invalidas" (nunca "email nao encontrado")
6. Rate limiting em login e endpoints criticos
7. Validacao de MIME Type + Magic Bytes em uploads
8. RLS habilitado em todas as tabelas (se Supabase)
9. Testes de seguranca ANTES da implementacao (TDD)
10. Apos gerar cada modulo, revisar buscando Race Conditions,
    IDOR, Mass Assignment e falhas de logica de negocios
```

---

## Ranking de Eficacia das Defesas

| Posicao | Estrategia | Vulns Encontradas |
|---------|-----------|-------------------|
| 1 | TDD com testes de seguranca via IA (M Junior) | **0** |
| 2 | RLS + operacoes atomicas + AI Red Teaming (Aviator) | 2 (logica de negocio + query string) |
| 3 | Mega-prompt defensivo + honeypots (Jean) | 2 (tracker + secrets no git) |
| 4 | Prompts curtos sem foco em seguranca (Scull) | 2 (race condition financeira + DoS) |

**Conclusao empirica:** TDD com testes de seguranca gerados pela IA ANTES da implementacao e a estrategia mais eficaz. Nenhuma outra abordagem zerou vulnerabilidades.
