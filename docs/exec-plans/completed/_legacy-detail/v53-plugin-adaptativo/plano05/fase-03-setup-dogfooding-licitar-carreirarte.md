# Fase 03: Setup do dogfooding em Licitar (flag=true) e Carreirarte (flag=false)

**Plano:** 05 — Análise & Dogfooding
**Sizing:** 1h
**Depende de:** fase-01 (script funcional), fase-02 (could-haves), Plano 04 todas (modo dual ativo nas 5 skills)
**Visual:** false

---

## O que esta fase entrega

Os dois projetos piloto configurados para coletar dados de produção:
- **Licitar** — v5.3 instalada com `architectureDetectorEnabled: true` e profile detectado via `/anti-vibe-coding:detect-architecture`
- **Carreirarte** — v5.3 instalada com `architectureDetectorEnabled: false` (espelha CA-12 — comportamento v5.2 preservado)

Esta fase é **operacional, não de código** — entrega comandos executados + arquivos de manifest validados, sem alterar plugin.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `<licitar>/.claude/.anti-vibe-manifest.json` | Modify | Setar `architectureDetectorEnabled: true`; popular `architectureProfile` via detector |
| `<licitar>/.claude/architecture-profile.md` | Create | Gerado automaticamente pelo detector (Plano 02 fase-04) |
| `<carreirarte>/.claude/.anti-vibe-manifest.json` | Modify | Garantir `architectureDetectorEnabled: false` (default já é false) |
| `.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md` | Modify | Registrar comandos exatos rodados, perfil detectado em Licitar, datas |

> Caminhos de Licitar e Carreirarte são externos a este repo. Convenção sugerida: `F:\Projetos\Licitar\` e `E:\Programas\Carreirarte - Novo Design\` (caminhos do `additionalWorkingDirectories` do env).

---

## Implementacao

### Passo 1: Verificar pré-condições

Antes de rodar comandos em Licitar/Carreirarte, validar:

- [ ] Plano 03 concluído (lib telemetry + 10 skills instrumentadas)
- [ ] Plano 04 concluído (5 skills estruturantes em modo dual + 5 universais integrados)
- [ ] Plano 02 concluído (detector funcional)
- [ ] `bun run test` no plugin retorna verde

### Passo 2: Instalar v5.3 em Licitar

Comandos exatos a rodar em `F:\Projetos\Licitar\`:

```bash
# 1. Atualizar o plugin (reuso do sistema /sync ou /update existente — D5)
# (forma exata depende de como o plugin é instalado; documentar aqui o método usado)

# 2. Confirmar manifest pré-existente
cat F:/Projetos/Licitar/.claude/.anti-vibe-manifest.json
# Esperado: presença de version >= "5.3.x" após update; campo architectureDetectorEnabled inicialmente false
```

### Passo 3: Ativar feature flag em Licitar

Edição manual do manifest (ou via skill `/sync` se houver flag toggle — não há na Onda 1):

```json
{
  "version": "5.3.0",
  "architectureDetectorEnabled": true
}
```

```bash
# Validar
cat F:/Projetos/Licitar/.claude/.anti-vibe-manifest.json | grep architectureDetectorEnabled
# Esperado: "architectureDetectorEnabled": true
```

### Passo 4: Rodar detector em Licitar

```
/anti-vibe-coding:detect-architecture
```

Fluxo esperado (Plano 02 fase-03):
1. Detector amostra `src/`
2. Computa score de confiança
3. Se < 80%, AskUserQuestion confirma
4. Persiste em `architectureProfile` do manifest + gera `architecture-profile.md`

Registrar em `MEMORY.md` deste plano:
- Perfil detectado (esperado: `nextjs-app-router` baseado na estrutura conhecida de Licitar)
- Confidence score
- Sinais usados
- Data/hora da detecção

### Passo 5: Validar Modo Dual ativo em Licitar

Smoke test manual: invoca uma skill estruturante e confirma adaptação:

```
/anti-vibe-coding:architecture
```

Esperado: recommendation table inclui linha específica do perfil detectado (CA-05 cumprido).

### Passo 6: Instalar v5.3 em Carreirarte

```bash
# 1. Mesmo método de update do passo 2, agora em E:\Programas\Carreirarte - Novo Design\

# 2. Confirmar manifest
cat "E:/Programas/Carreirarte - Novo Design/.claude/.anti-vibe-manifest.json"
# Esperado: "architectureDetectorEnabled": false (default)
```

**NÃO rodar `/anti-vibe-coding:detect-architecture` em Carreirarte.** Manter `architectureProfile` ausente do manifest (CA-10 — comportamento v5.2 sugerido pela skill se invocar).

### Passo 7: Smoke test em Carreirarte (CA-12 baseline)

```
/anti-vibe-coding:architecture
```

Esperado: output idêntico ao da v5.2. Salvar transcrição em `MEMORY.md` (DI-X) como baseline para comparação na fase-05.

### Passo 8: Configurar checkpoint diário (opcional)

Sugestão: rodar `bun run anti-vibe-coding/scripts/analyze-metrics.ts --projects "F:/Projetos/Licitar,E:/Programas/Carreirarte - Novo Design"` diariamente nos próximos 14 dias (5 min/dia). Não é obrigatório — baseline final é gerado na fase-04.

---

## Gotchas

- **G7 do plano:** A partir desta fase, o calendário de 2 semanas começa a correr. Documentar data exata de início em `MEMORY.md`.
- **G10 do plano:** Esta fase NÃO toca código do plugin. Apenas configura manifests e roda skills.
- **G11 do plano:** Em Carreirarte, telemetria continuará escrevendo em `.claude/metrics/` (Plano 03 G5 — telemetria ignora flag), mas com `profile_arquitetura: "disabled"`. fase-05 valida isso.
- **G15 do plano:** Datas sugeridas (início 2026-05-05, mid-checkpoint 2026-05-12, fim 2026-05-19). Usuário pode deslizar — registrar em MEMORY.md as datas reais.
- **Local:** Caso Licitar tenha estrutura ambígua e detector pedir confirmação, o Luiz é a única fonte de verdade. Decisão dele substitui o score automático.
- **Local:** Caso Licitar NÃO seja `nextjs-app-router` (premissa pode estar errada — projeto pode ter migrado), aceitar o que o detector classificar e registrar em MEMORY.md.

---

## Verificacao

### Checklist

- [ ] `cat <licitar>/.claude/.anti-vibe-manifest.json` mostra `"architectureDetectorEnabled": true`
- [ ] `<licitar>/.claude/.anti-vibe-manifest.json` contém objeto `architectureProfile` válido (com `profile`, `confidence`, `detectedAt`, `signals[]`, `schemaVersion`)
- [ ] `<licitar>/.claude/architecture-profile.md` existe e é legível
- [ ] `cat <carreirarte>/.claude/.anti-vibe-manifest.json` mostra `"architectureDetectorEnabled": false`
- [ ] `<carreirarte>/.claude/.anti-vibe-manifest.json` NÃO contém objeto `architectureProfile` (ou contém `null`)
- [ ] Smoke test em Licitar `/architecture` exibe recomendação adaptada ao perfil
- [ ] Smoke test em Carreirarte `/architecture` exibe output idêntico ao v5.2 (transcrição salva em MEMORY.md)
- [ ] MEMORY.md atualizado com: data de início, perfil detectado em Licitar, confidence score, comandos exatos rodados

### TDD

N/A — fase operacional. Sem código novo no plugin.

---

## Criterio de Aceite

**Por maquina:**
- `jq '.architectureDetectorEnabled' <licitar>/.claude/.anti-vibe-manifest.json` retorna `true`
- `jq '.architectureProfile.profile' <licitar>/.claude/.anti-vibe-manifest.json` retorna string válida (1 dos 5 perfis)
- `jq '.architectureDetectorEnabled' <carreirarte>/.claude/.anti-vibe-manifest.json` retorna `false`

**Por humano:**
- Smoke test em Licitar mostra adaptação visível na saída de `/architecture` (linha específica do perfil)
- Smoke test em Carreirarte mostra output idêntico ao v5.2 (sem nova mensagem, sem mudança de seções)
- `MEMORY.md` deste plano contém timestamp ISO da data/hora real do início do dogfooding

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
