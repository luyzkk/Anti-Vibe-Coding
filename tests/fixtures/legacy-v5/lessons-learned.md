# Lições

## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)

**Sintoma:** hooks customizados perdidos ao instalar plugin
**Causa Raiz:** updateStrategy: replace
**Fix Aplicado:** merge ao invés de replace
**Lição:** hooks .cjs do plugin nunca devem ser copiados
**Prevenção:** documentar todos os passos

## Lições — Anti-Vibe v5.2

### [Armadilha] grep -c retorna exit 1 quando count é zero
**Regra:** Em scripts que usam grep -c, tratar exit code 1 + output "0" como válido
**Contexto:** grep -c retorna exit 1 quando padrão não encontrado

### [Arquitetura] anti-vibe-coding é repositório git independente
**Regra:** Executar git add/commit de dentro de anti-vibe-coding/
**Contexto:** Tem próprio .git/
