# Fase 01 — Política de Comentários + Thresholds de Tamanho em `code-quality.md`

## Objetivo

Atualizar `rules/code-quality.md` com:
1. Threshold de função: 100L → 40L (Akita)
2. Limite de arquivo: >500 linhas → sinal de split (alinhado com hook RF-01)
3. Item "8. Comentarios Inuteis": tornar mais preciso com a distinção WHY/WHAT
4. Nova seção "Política de Comentários" com a política D3 completa

## Arquivo a Modificar

`f:\Projetos\Claude code\anti-vibe-coding\rules\code-quality.md`

**OBRIGATÓRIO:** Releia o arquivo imediatamente antes de editar. A leitura feita durante planejamento pode estar desatualizada.

---

## Edição 1 — Threshold de Função 100L → 40L

### old_string (exato, linha 7–10):
```
### 1. Funcoes Longas (> 100 linhas)
- Extrair em funcoes menores com nomes descritivos
- Cada funcao com UMA responsabilidade clara
- Se precisou de comentario para explicar bloco, extraia em funcao
```

### new_string:
```
### 1. Funcoes Longas (> 40 linhas)
- Extrair em funcoes menores com nomes descritivos
- Cada funcao com UMA responsabilidade clara
- Se precisou de comentario para explicar bloco, extraia em funcao
- Arquivo com >500 linhas é sinal de split — identifique responsabilidades distintas
```

**Razão:** Akita usa 40L como threshold real em projetos com 274+ commits. O 100L era permissivo demais para código de qualidade.

---

## Edição 2 — Item "8. Comentarios Inuteis" → Política D3 Precisa

### old_string (exato, linhas 42–45):
```
### 8. Comentarios Inuteis
- Codigo autoexplicativo via nomenclatura
- Comentarios explicam PORQUÊ, nunca COMO
- Se precisa comentario → renomear variavel/funcao
```

### new_string:
```
### 8. Comentarios Inuteis (WHAT comments)
- WHAT comments são proibidos: `// incrementa i` acima de `i++` — o código já diz isso
- Código autoexplicativo via nomenclatura elimina WHAT comments
- Se um bloco precisa de comentário WHAT → extraia em função com nome descritivo
- NUNCA remova WHY comments ao refatorar — eles carregam intenção que o código não captura
```

**Razão:** A regra anterior dizia "comentários explicam PORQUÊ, nunca COMO" — correto mas incompleto. A política D3 é mais nuançada: WHY é obrigatório preservar, WHAT é proibido. A distinção explícita é necessária para o agente não podar comentários de intenção ao refatorar.

---

## Edição 3 — Nova Seção "Política de Comentários" após item 9

Adicionar após a linha `- Validacao na ENTRADA, tipo no SISTEMA, conversao na SAIDA` (fim do item 9), antes da seção `## Tratamento de Erros`:

### old_string (exato):
```
## Tratamento de Erros
```

### new_string:
```
## Política de Comentários (D3)

### WHY comments — sempre permitidos e preservados

Comentários que capturam contexto que o código não pode expressar:

- **Proveniência:** `// workaround para bug do Safari 16.4 — https://bugs.webkit.org/123`
- **Decisão arquitetural:** `// não usamos cache aqui por causa de invalidação eventual`
- **Constraint externa:** `// limite da API: max 100 items por request`
- **Bug ref:** `// FIXME: remover após migração de schema em v2.3`
- **Intenção não óbvia:** `// ordenamos antes de deduplicar para preservar o primeiro occurrence`

Regra: **NUNCA remova WHY comments ao refatorar.** Eles são contexto de primeira classe para o próximo agente ou dev.

### WHAT comments — proibidos

Comentários que apenas descrevem o que o código já diz:

```ts
// Ruim — redundante:
// incrementa contador
i++

// Ruim — código autoexplicativo não precisa de legenda:
// retorna null se usuário não encontrado
return user ?? null
```

Se um bloco precisa de WHAT comment para ser compreendido → extraia em função com nome descritivo.

### Docstrings em funções públicas

Funções públicas (exportadas, de API pública) devem ter docstring com:
1. Uma linha de intenção (o que ela garante, não como)
2. Um exemplo de uso

```ts
/**
 * Normaliza email para comparação case-insensitive.
 * Exemplo: normalizeEmail("User@EXAMPLE.com") → "user@example.com"
 */
export function normalizeEmail(raw: string): string { ... }
```

### Ratio de Referência (não enforçado)

Evidência empírica de 274 commits reais (Akita): ratio saudável de comentários é 15–25% do código.
Abaixo de 10%: provável ausência de WHY comments importantes.
Acima de 40%: provável excesso de WHAT comments.

## Tratamento de Erros
```

---

## Checklist de Verificação

Após aplicar as edições, confirme cada item:

```bash
# 1. Threshold de função atualizado para 40L
grep "40 linhas" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: ### 1. Funcoes Longas (> 40 linhas)

# 2. Limite de arquivo presente
grep "500 linhas" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: - Arquivo com >500 linhas é sinal de split

# 3. Item 8 atualizado com distinção WHAT/WHY
grep "WHAT comments" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: ### 8. Comentarios Inuteis (WHAT comments)

# 4. Seção D3 presente
grep "Política de Comentários" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: ## Política de Comentários (D3)

# 5. WHY comments documentados
grep "Proveniência" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: linha com o item de proveniência

# 6. Docstrings documentadas
grep "Docstrings" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: ### Docstrings em funções públicas

# 7. Arquivo não quebrou — seção de Tratamento de Erros ainda presente
grep "## Tratamento de Erros" "f:/Projetos/Claude code/anti-vibe-coding/rules/code-quality.md"
# Esperado: encontrar a seção
```

## Commit

Repo: `f:\Projetos\Claude code\anti-vibe-coding\`

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add rules/code-quality.md
git commit -m "feat(rules): política de comentários D3 + threshold função 40L"
```

## Gotchas desta Fase

- O old_string da Edição 3 é apenas `## Tratamento de Erros` — mas esse texto pode aparecer em outros lugares do arquivo. Use contexto suficiente ao aplicar o Edit para garantir unicidade
- NÃO apague o item 8 — apenas atualize seu conteúdo
- A nova seção usa blocos de código TypeScript dentro de Markdown — confirme que a indentação ficou correta após editar
- O threshold 40L substitui 100L apenas no item 1 — não há outras ocorrências de "100 linhas" no arquivo (mas confirme com grep antes de editar)
