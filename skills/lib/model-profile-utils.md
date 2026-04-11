# Model Profile Utils — Resolução de Modelo por Agente

Utilitário de referência para skills que invocam agentes. Define o algoritmo canônico de resolução de modelo.

**Regra:** Ao invocar um agente, não implemente este algoritmo inline. Delegue para este documento — siga o algoritmo abaixo exatamente.

---

## Algoritmo de Resolução (4 níveis, em ordem de prioridade)

```
1. OVERRIDE DE INVOCAÇÃO
   Checar se a mensagem do usuário contém instrução explícita de modelo.
   Formas canônicas reconhecidas:
     - "use opus", "use sonnet", "use haiku"
     - "com modelo opus/sonnet/haiku"
     - "--model opus/sonnet/haiku"
     - "quero que rode em opus/sonnet/haiku"
   → Se detectado: usar o modelo especificado. Parar aqui.

2. CONFIG FILE
   Ler config/model-profiles.json relativo à raiz do plugin.
   → Se não existir ou for inválido: ir para nível 4.

   Identificar perfil ativo:
     a. Se usuário especificou perfil (ex: "perfil quality", "--profile budget"): usar esse
     b. Caso contrário: usar campo "default" do config

   Buscar modelo do agente:
     profiles[perfil_ativo].agents[nome_do_agente]
   → Se encontrado: usar esse modelo. Parar aqui.
   → Se agente não encontrado no perfil: ir para nível 3.

3. FALLBACK DE AGENTE NÃO MAPEADO
   O agente não está no perfil (forward compat — novo agente adicionado após o config).
   → Usar "sonnet". Parar aqui.

4. FALLBACK FINAL
   Config não existe ou é inválido (backward compat — projetos sem v5).
   → Usar "sonnet". Nunca falhar por ausência de config.
```

---

## Como uma skill deve usar este algoritmo

### Antes de invocar o Agent tool:

```
1. Executar o algoritmo de resolução acima para o agente desejado
2. Armazenar o modelo resolvido
3. Passar como parâmetro model ao invocar o Agent tool

Exemplo de instrução em uma skill:
  "Resolva o modelo para security-auditor seguindo model-profile-utils.md.
   Invoque o agente com model: [modelo resolvido]."
```

### Exemplo prático — skill invocando security-auditor:

```
Passo 1 — Resolver modelo:
  - Usuário disse "use opus"? → opus
  - Caso contrário: ler config/model-profiles.json
    - Perfil "balanced" (default): security-auditor → "sonnet"
  - Modelo resolvido: sonnet

Passo 2 — Invocar agente:
  Agent tool com subagent_type: "anti-vibe-coding:security-auditor"
             model: "sonnet"  ← parâmetro resolvido no passo 1
```

---

## Como o dev customiza

| Escopo | Ação |
|--------|------|
| **Por invocação** | Dizer "use opus" ou "--model opus" na mensagem |
| **Por perfil ativo** | Mudar `"default"` em config/model-profiles.json |
| **Por agente específico** | Editar o mapeamento no perfil ativo |
| **Por projeto** | Usar o campo `"overrides"` no config para sobrescrever agentes específicos sem alterar perfis |

### Campo `overrides` (prioridade entre config e fallback):

```json
{
  "profiles": { ... },
  "default": "balanced",
  "overrides": {
    "security-auditor": "opus"
  }
}
```

Overrides aplicam-se independente do perfil ativo. Ordem de prioridade completa:

```
override de invocação > overrides do config > perfil ativo > fallback sonnet
```

---

## Backward Compatibility

- Se `config/model-profiles.json` não existir → todos os agentes usam `sonnet`
- Se um agente não está no perfil → usa `sonnet` (suporte a agentes futuros)
- Se `overrides` não existir no config → ignorar silenciosamente
- **Nunca lançar erro por ausência de config** — fail-open sempre

---

## Referência: Modelos Disponíveis

| Alias | Modelo real | Uso recomendado |
|-------|-------------|-----------------|
| `opus` | claude-opus-4-6 | Raciocínio crítico, segurança, decisões arquiteturais |
| `sonnet` | claude-sonnet-4-6 | Qualidade/custo balanceado — padrão seguro |
| `haiku` | claude-haiku-4-5-20251001 | Tarefas de baixa criticidade, custo mínimo |
