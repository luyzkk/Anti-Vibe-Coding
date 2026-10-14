# Desenho: {Nome da feature}

**Página:** ./PRD.md

<!-- Entra quando o sistema pede: dado novo no banco, partes que conversam entre si (fila, webhook,
     tarefa agendada) ou dinheiro mudando de estado. Obrigatório no nível dinheiro, saúde ou dados.
     Escrito para quem vai construir e revisar; o que o usuário aprova continua sendo a página. -->

## Partes

{O que já existe e o que passa a existir, e quem conversa com quem. Serviço externo entra aqui, com o
que falta configurar.}

## Dados

| Dado | Onde vive | Novo? | Quem pode ver |
|---|---|---|---|
| {ex: status do pagamento} | tabela `orders`, coluna `payment_status` | sim | dono do pedido e admin |

## Mecanismo

{O fluxo passo a passo, alinhado à stack e aos padrões do projeto. Se veio do /design-twice:
"Baseado na Proposta {letra} — {filosofia}".}

{- structure-snippet -}

## Decisões

<!-- Só decisões com alternativa real. O usuário vê as opções com prós e contras em português simples. -->

| # | Decisão | Opções | Escolha | Por quê |
|---|---|---|---|---|
| 1 | {ex: como confirmar o pagamento} | {webhook / consulta periódica} | {webhook} | {razão} |

## Telas e mensagens (opcional)

<!-- Feature com tela e mais de um tipo de usuário: fluxo numerado por ator e o texto exato das
     mensagens (confirmação, aviso, erro, notificação para outro ator). -->

## Observabilidade

{O que registrar e medir para saber, em produção, que está funcionando, e o alerta quando não está.}

<!-- 2026-09-01 (Luiz/dev): modelo de ameaça entra na spec, não na auditoria — PRD §RF-04, §Decisões D2 -->
<!-- OBRIGATÓRIA no nível dinheiro, saúde ou dados. Nos outros níveis, só se a feature dispara um dos
     seis gatilhos: autenticação/autorização · dados sensíveis ou PII · input externo (body, query,
     webhook, arquivo importado) · upload de arquivo · pagamento/financeiro · integração com terceiro. -->
## Ameaças & Dados

**Gatilhos disparados:** {listar os que se aplicam}

### Classificação do dado

| Dado que a feature toca | Classe | Onde vive |
|---|---|---|
| {ex: email do aluno} | PII | tabela `users`, coluna `email` |
| {ex: token do provider} | credencial | secret manager / env — nunca no banco, nunca no repo |

Classes: `publico` · `interno` · `PII` · `credencial` · `financeiro`. Classificar ANTES de modelar: a
classe decide criptografia, retenção, log e quem enxerga.

### Fronteiras de confiança

Onde input NÃO-confiável entra no sistema. Cada fronteira tem validação **no boundary**, não "mais pra
frente":

- {ex: body de `POST /api/enrollments` — vem do browser; nada aqui é confiável}
- {ex: webhook do gateway — validar a assinatura ANTES de parsear o corpo}
- {ex: CSV importado pelo admin — admin confiável não torna o arquivo confiável}

### Superfície nova

O que passa a existir e antes não existia (rota, endpoint, campo de formulário, job, handler):

- {ex: `POST /api/uploads` — primeiro handler de arquivo do projeto}

### Casos de abuso

São os AB-* dos Cenários da página, que o usuário aprovou. Não copiar a lista aqui: anotar só onde mora
a defesa de cada um quando não for óbvio (ex.: "AB-1 — checagem de dono em `src/orders.ts`").

### Gatilhos de aprovação humana

Cada item marcado exige **diff apresentado e confirmação do humano** antes de aplicar, nunca
auto-aplicar (`skills/security/SKILL.md` §Aprovacao Humana Necessaria):

- [ ] Novo fluxo de autenticação ou alteração de lógica de auth existente
- [ ] Armazenar nova categoria de PII ou dados de pagamento
- [ ] Nova integração com serviço terceiro (OAuth provider, webhook externo, SDK de pagamento)
- [ ] Mudança na configuração de CORS (ampliar origens ou métodos permitidos)
- [ ] Novo handler de upload de arquivos
- [ ] Conceder roles ou permissões elevadas
- [ ] Alterar configuração de rate limiting (afrouxar limites ou desabilitar)
