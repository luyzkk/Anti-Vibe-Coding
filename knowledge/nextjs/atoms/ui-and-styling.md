---
topic: ui-and-styling
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-a673671d (Infos/knowledge/NextJS/compass_artifact_wf-a673671d-4b23-4fb1-87cf-2d6d2da6284a_text_markdown.md)
tier: 2
triggers: [Tailwind, next/font, next/image, shadcn, CSS Modules, dark mode, responsive, layout shift, CLS, font optimization, image optimization]
cross_stack_skills: []
updated: 2026-05-25
---

# UI and Styling

## When to consult

- When adding fonts to an App Router project (`next/font/google` or `next/font/local`)
- When placing `<img>` tags in App Router code and considering `next/image`
- When configuring `images.remotePatterns` in `next.config`
- When setting up Tailwind CSS in an App Router project
- When deciding whether to add `suppressHydrationWarning` to the `<html>` element

## Senior patterns

### Pattern: `next/font` in root layout

- **Problem:** Loading fonts via `<link>` in `<head>` introduces a render-blocking request and can cause layout shift.
- **Pattern:** Import from `next/font/google` (or `next/font/local`) in `app/layout.tsx`. Apply the returned `className` to `<body>`.
  ```tsx
  // app/layout.tsx
  import { Inter } from 'next/font/google'

  const inter = Inter({ subsets: ['latin'] })

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }
  ```
- **When to use:** Any App Router project that loads external fonts.
- **When NOT to use:** When a font is not available through `next/font` — fall back to `next/font/local` with a local file.

---

### Pattern: `next/image` for raster images

- **Problem:** Raw `<img>` tags in App Router bypass Next.js image optimization, delivering unresized images and missing lazy-loading defaults.
- **Pattern:** Replace `<img src=...>` with `<Image>` from `next/image`. Declare explicit `width` and `height` or use `fill`. Set `priority` for above-the-fold images. Provide a `placeholder="blur"` with `blurDataURL` for perceived performance.
  ```tsx
  import Image from 'next/image'

  // Fixed dimensions
  <Image src="/hero.jpg" width={1200} height={600} alt="Hero" priority />

  // Fill parent container
  <div className="relative h-64">
    <Image src="/bg.jpg" fill alt="Background" sizes="100vw" />
  </div>
  ```
- **When to use:** Every raster image (`jpg`, `png`, `webp`) in App Router.
- **When NOT to use:** SVGs used as inline components (use SVGR instead); decorative images that should have `alt=""` and no intrinsic dimensions.

---

### Pattern: Safe `images.remotePatterns` allowlist

- **Problem:** `images.remotePatterns: [{ hostname: '**' }]` opens an SSRF vector via the `/_next/image` optimization endpoint.
- **Pattern:** List only the exact hostnames your app fetches images from.
  ```js
  // next.config.mjs
  export default {
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'cdn.example.com' },
      ],
    },
  }
  ```
- **When to use:** Whenever `next/image` loads images from an external URL.
- **When NOT to use:** There is no valid use case for `hostname: '**'` — always scope to known hosts.

---

### Pattern: Tailwind in App Router project setup

- **Problem:** Creating a Next.js project without a consistent styling approach leads to ad-hoc decisions later.
- **Pattern:** Bootstrap with `--tailwind` flag. Version the Tailwind LSP path in `.vscode/settings.json` alongside ESLint and TypeScript settings so all contributors get IntelliSense.
  ```bash
  pnpm create next-app@latest my-app --typescript --eslint --tailwind --app --src-dir
  ```
  ```jsonc
  // .vscode/settings.json (version this)
  {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "eslint.useFlatConfig": true,
    "typescript.tsdk": "node_modules/typescript/lib"
    // tailwind paths included alongside these
  }
  ```
- **When to use:** Greenfield App Router projects — Tailwind is the framework's most common styling default.

---

## Anti-patterns

### Anti-pattern: Raw `<img>` in App Router code

- **Symptom:** `<img src="/product.jpg" />` appears in a Server or Client Component.
- **Why it's bad:** Bypasses Next.js image optimization pipeline. No lazy loading, no format conversion, no size adaptation to viewport.
- **Fix:** Replace with `<Image>` from `next/image`. Declare `width`/`height` or use `fill` with a positioned parent container.

---

### Anti-pattern: `images.remotePatterns` with wildcard hostname

- **Symptom:** `remotePatterns: [{ hostname: '**' }]` or an overly broad pattern in `next.config`.
- **Why it's bad:** Creates an SSRF vector — any attacker can craft a URL that causes the Next.js image proxy to fetch internal or private resources.
- **Fix:** Enumerate only the exact external image hostnames the application needs.

---

### Anti-pattern: Skipping `priority` on above-fold images

- **Symptom:** Hero image or LCP candidate uses `<Image>` without `priority`.
- **Why it's bad:** `next/image` defaults to lazy loading (`loading="lazy"`). The largest above-fold image loads late, worsening LCP and CLS.
- **Fix:** Add `priority` prop to any image that is visible on initial page load without scrolling.

---

## Decision criteria

| If...                                                      | Then...                                                                         |
|------------------------------------------------------------|---------------------------------------------------------------------------------|
| Adding an external font to App Router                      | Use `next/font/google` in `app/layout.tsx`; apply `className` to `<body>`      |
| Rendering a raster image from a static path                | Use `next/image` with explicit `width`/`height`                                 |
| Rendering a raster image that fills its container          | Use `next/image` with `fill` and a `relative`-positioned parent                 |
| Image is the LCP element or visible above the fold         | Add `priority` prop to skip lazy loading                                        |
| Image source is an external CDN                            | Add exact hostname to `images.remotePatterns`; never use `hostname: '**'`      |
| Starting a new App Router project with Tailwind            | Use `--tailwind` flag at project creation; version `tailwind paths` in VS Code |
| Deciding CSS-in-JS vs Tailwind                             | Sources do not provide a comparison — consult project-specific constraints      |
