# CDN (Content Delivery Network) — Referencia Detalhada

## O que e CDN

Rede de servidores distribuidos geograficamente que cacheia e serve conteudo estatico a partir do servidor mais PROXIMO do usuario, reduzindo latencia.

## Arquitetura CDN

```
Servidor Central (Origin)
    |
    ├── POP Sao Paulo (Edge Servers)
    │   ├── Edge Server 1
    │   ├── Edge Server 2
    │   └── Edge Server 3
    |
    ├── POP Nova York (Edge Servers)
    │   └── ...
    |
    └── POP Toquio (Edge Servers)
        └── ...
```

### Componentes

- **Origin Server:** Servidor central com os arquivos originais
- **Edge Server (Servidor de Borda):** Cache proximo ao usuario. Serve conteudo sem consultar origin
- **POP (Point of Presence):** Data center regional com multiplos edge servers
- **Anycast:** Tecnica de roteamento que mapeia UM IP para VARIOS servidores. DNS redireciona para o mais proximo

## Fluxo de Requisicao

```
1. Usuario digita dominio
2. DNS resolve para IP da CDN (via Anycast)
3. Anycast roteia para Edge Server mais proximo
4. Cache HIT? → Responde imediatamente (rapido)
   Cache MISS? → Edge busca no Origin → cacheia → responde
5. Proximas requisicoes ao mesmo conteudo = cache HIT
```

## Cache Hit vs Cache Miss

| Cenario | Latencia | Origem |
|---------|----------|--------|
| Cache HIT | Muito baixa (~10-50ms) | Edge server local |
| Cache MISS | Alta (~200-500ms) | Edge busca no Origin, cacheia, responde |

**Paginas frequentes** (home, landing) = alto cache hit rate
**Paginas raras** (contato, termos) = mais cache misses

## Decision Tree: Quando Usar CDN

```
Conteudo e estatico (HTML, CSS, JS, imagens, videos)?
├─ SIM → CDN ✓ (beneficio imediato)
├─ NAO (conteudo dinamico)
│   ├─ Personalizavel por usuario?
│   │   ├─ SIM → NAO cachear no CDN (ou cache por segment)
│   │   ├─ NAO → CDN com TTL curto (cache de API responses)
│   ├─ Muda frequentemente?
│   │   ├─ SIM → CDN com TTL curto (segundos a minutos)
│   │   ├─ NAO → CDN com TTL longo (horas a dias)

Usuarios em MULTIPLAS regioes geograficas?
├─ SIM → CDN e ESSENCIAL (latencia varia muito sem CDN)
├─ NAO → CDN ainda ajuda (offload do origin server)
```

## TTL (Time-To-Live) Strategy

| Tipo de conteudo | TTL recomendado |
|-----------------|-----------------|
| Assets imutaveis (hashed filenames) | 1 ano (immutable) |
| CSS/JS com versioning | 1 semana - 1 mes |
| Imagens | 1 dia - 1 semana |
| HTML pages | 1 hora - 1 dia |
| API responses (se cacheaveis) | Segundos - minutos |

**Cache invalidation:** Quando deploy novo, invalidar cache do CDN:
- **Purge:** Deletar cache de URLs especificas
- **Versioned filenames:** `app.abc123.js` → novo deploy = `app.def456.js` (cache busting automatico)

## Performance e SEO

- Google considera tempo de carregamento para ranking
- CDN pode reduzir TTFB (Time To First Byte) drasticamente
- Core Web Vitals (LCP, FID, CLS) melhoram com CDN

## Providers Comuns

| Provider | Foco | Nota |
|----------|------|------|
| Cloudflare | CDN + WAF + DNS | Free tier generoso, facil de configurar |
| AWS CloudFront | CDN integrado AWS | Bom com S3 e EC2 |
| Vercel/Netlify | CDN para frontend | Deploy + CDN integrado para Next.js/static |
| Fastly | CDN programavel | Edge compute, instant purge |

## Anti-patterns

- **Servir conteudo dinamico personalizado via CDN sem segmentacao** — cada usuario recebe cache do outro
- **TTL muito longo para conteudo que muda** — usuarios veem versao desatualizada
- **Nao invalidar cache apos deploy** — novo codigo nao chega aos usuarios
- **CDN sem HTTPS** — dados em transito expostos
- **Ignorar CDN para assets estaticos** — origin server sob carga desnecessaria

## Checklist CDN

- [ ] Assets estaticos servidos via CDN (HTML, CSS, JS, imagens)
- [ ] TTL configurado por tipo de conteudo
- [ ] Cache invalidation no pipeline de deploy
- [ ] HTTPS obrigatorio na CDN
- [ ] Versioned filenames para cache busting
- [ ] Compression (gzip/brotli) habilitada
- [ ] Origin server protegido (nao acessivel diretamente)
