# Auditoria de Premissas — Rubrica Completa

Referencia detalhada para o bloco `## Auditoria de Premissas` do `consultant/SKILL.md`.

---

## Os 3 Tiers

### Must Be True (Dealbreakers)

Premissas que, se falsas, tornam a decisao ou a feature inviavel. Sao o nucleo de risco.

**Criterio de classificacao:** perguntar "se essa premissa for falsa, a decisao ainda faz sentido?". Se nao: Must.

**Acao obrigatoria:** validar ANTES de construir. Nao prosseguir para implementacao sem evidencia de que a premissa e verdadeira — mesmo que isso exija um spike, entrevista com usuario ou prova-de-conceito.

Exemplos:
- "A API do parceiro suporta o volume de requisicoes que precisamos" — se nao, arquitetura inteira muda.
- "O banco de dados atual aguenta o modelo de dados proposto sem migracao destrutiva" — se nao, feature depende de refatoracao estrutural antes.
- "Usuarios vao adotar autenticacao por passkey se oferecermos" — se adocao for zero, o investimento nao faz sentido.

### Should Be True (Importantes)

Premissas cujas consequencias sao significativas, mas nao fatais. Se falsas, a abordagem precisa ser ajustada — a feature em si sobrevive.

**Acao recomendada:** validar no inicio do primeiro ciclo de implementacao, antes de comprometer recursos maiores.

Exemplos:
- "A equipe consegue absorver a curva de aprendizado da nova lib em 1 sprint" — se nao, o prazo desliza, mas a decisao tecnica permanece valida.
- "O design atual do banco permite adicionar a nova coluna sem downtime" — se nao, precisamos de uma janela de manutencao, mas o schema continua correto.

### Might Be True (Nice to have)

Premissas que afetam otimizacoes, qualidade de vida ou metricas secundarias. Falsa = ajuste fino, nao mudanca de rota.

**Acao:** nao investir em validacao ate o core estar funcionando.

Exemplos:
- "Usuarios vao preferir o novo fluxo ao antigo" — pode ser A/B testado depois do lançamento.
- "Cache vai reduzir latencia em >50%" — mede em producao, ajusta conforme dados reais.

---

## A Premissa Mais Arriscada Primeiro

Na hora de priorizar o que validar, identificar a premissa Must com maior **impacto x incerteza**:

> A premissa mais arriscada primeiro — nao a mais facil de validar.

**Criterio de ordenacao:**
1. Must > Should > Might (por tier)
2. Dentro do mesmo tier: maior incerteza x maior impacto primeiro
3. Se duas premissas Must tiverem impacto similar, validar a mais barata de testar primeiro (reduz custo de invalidar cedo)

**Aplicacao pratica:** ao montar um MVP ou spike, a primeira historia de usuario deve atacar a premissa Must mais arriscada — nao a mais confortavel.

---

## Composicao com o 10-Questions Test

Os Tiers se encaixam diretamente em duas perguntas do `## Princípio universal #1`:

| Pergunta | Tier correspondente |
|----------|---------------------|
| Q7 — pior cenario se a decisao estiver errada | Mapeia todas as premissas Must (sao elas que determinam o pior cenario) |
| Q8 — quao reversivel e a decisao | Se uma premissa Must for falsa e a decisao for irreversivel, esse e o sinal mais critico para pausar |

---

## Formato de Registro (uso interno na consulta)

Ao documentar premissas durante a consulta, usar:

```
| # | Premissa | Tier | Validada? | Como validar |
|---|----------|------|-----------|--------------|
| 1 | {premissa} | Must | Nao | {experimento ou evidencia necessaria} |
| 2 | {premissa} | Should | Parcial | {o que ainda falta} |
```

Premissas Must nao validadas devem aparecer como risco explicito no Relatorio de Decisoes
(ver `## Passo 3 — Protocolo de Execucao`, item 4).
