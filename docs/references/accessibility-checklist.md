---
title: "Accessibility Checklist"
source_url: "https://www.w3.org/WAI/WCAG21/quickref/"
last_verified: "2026-05-22"
---

# Accessibility Checklist

Quick reference for WCAG 2.0 AA compliance. Use before shipping any UI feature or reviewing frontend PRs.

## Table of Contents

- [Essential Checks](#essential-checks)
- [Common HTML Patterns](#common-html-patterns)
- [Testing Tools](#testing-tools)
- [ARIA Live Regions](#aria-live-regions)
- [Common Anti-Patterns](#common-anti-patterns)

## Essential Checks

### Keyboard Navigation

- [ ] All interactive elements focusable via Tab key
- [ ] Focus order follows visual/logical order
- [ ] Focus is visible (outline/ring on focused elements — never `outline: none` without a replacement)
- [ ] Custom widgets have keyboard support (Enter to activate, Escape to close)
- [ ] No keyboard traps (user can always Tab away from any component)
- [ ] Skip-to-content link at top of page, visible on keyboard focus
- [ ] Modals trap focus while open and return focus on close

### Screen Readers

- [ ] All images have `alt` text (or `alt=""` for decorative images)
- [ ] All form inputs have associated labels (`<label>` or `aria-label`)
- [ ] Buttons and links have descriptive text (not "Click here" or "Read more")
- [ ] Icon-only buttons have `aria-label`
- [ ] Page has exactly one `<h1>` and headings do not skip levels
- [ ] Dynamic content changes announced via `aria-live` regions
- [ ] Tables have `<th>` headers with `scope` attribute

### Visual

- [ ] Text contrast ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, 18px+ or 14px+ bold)
- [ ] UI components (borders, icons) contrast ≥ 3:1 against background
- [ ] Color is not the only way to convey information (add icons, text, or patterns)
- [ ] Text resizable to 200% without breaking layout
- [ ] No content that flashes more than 3 times per second

### Forms

- [ ] Every input has a visible label
- [ ] Required fields indicated by more than color alone
- [ ] Error messages specific and associated with the field (`aria-describedby`)
- [ ] Error state visible by more than color (icon, text, border change)
- [ ] Form submission errors summarized and focusable
- [ ] Known fields use `autocomplete` attribute (`type="email" autocomplete="email"`)

### Content

- [ ] Language declared on `<html>` element (`<html lang="pt-BR">`)
- [ ] Page has a descriptive `<title>` unique per route
- [ ] Links distinguishable from surrounding text (not by color alone)
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Meaningful empty states (not blank screens)

## Common HTML Patterns

### Buttons vs. Links

```html
<!-- Use <button> for actions -->
<button onClick={handleDelete}>Delete Task</button>

<!-- Use <a> for navigation -->
<a href="/tasks/123">View Task</a>

<!-- NEVER use div/span as interactive elements -->
<div onClick={handleDelete}>Delete</div>  <!-- BAD: not focusable, no keyboard support -->
```

### Form Labels

```html
<!-- Explicit label association -->
<label htmlFor="email">Email address</label>
<input id="email" type="email" required />

<!-- Implicit wrapping -->
<label>
  Email address
  <input type="email" required />
</label>

<!-- Hidden label (visible label always preferred) -->
<input type="search" aria-label="Search tasks" />
```

### ARIA Roles

```html
<!-- Navigation landmarks -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Footer links">...</nav>

<!-- Status messages (polite — does not interrupt) -->
<div role="status" aria-live="polite">Task saved</div>

<!-- Alert messages (assertive — interrupts immediately) -->
<div role="alert">Error: Title is required</div>

<!-- Modal dialogs -->
<dialog aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
  ...
</dialog>

<!-- Loading states -->
<div aria-busy="true" aria-label="Loading tasks">
  <Spinner />
</div>
```

## Testing Tools

```bash
# Automated audit
npx axe-core          # Programmatic accessibility testing
npx pa11y             # CLI accessibility checker

# In browser
# Chrome DevTools → Lighthouse → Accessibility
# Chrome DevTools → Elements → Accessibility tree

# Screen reader testing
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (free) or JAWS
# Linux: Orca
```

## ARIA Live Regions

| Value | Behavior | Use For |
|-------|----------|---------|
| `aria-live="polite"` | Announced at next pause | Status updates, save confirmations |
| `aria-live="assertive"` | Announced immediately | Errors, time-sensitive alerts |
| `role="status"` | Same as `polite` | Status messages |
| `role="alert"` | Same as `assertive` | Error messages |

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `div` as button | Not focusable, no keyboard support | Use `<button>` |
| Missing `alt` text | Images invisible to screen readers | Add descriptive `alt` |
| Color-only states | Invisible to color-blind users | Add icons, text, or patterns |
| Autoplaying media | Disorienting, user cannot stop it | Add controls, do not autoplay |
| Custom dropdown with no ARIA | Unusable by keyboard/screen reader | Use native `<select>` or proper ARIA listbox |
| Removing focus outlines | Users cannot see where they are | Style outlines, never remove them |
| Empty links/buttons | "Link" announced with no description | Add text or `aria-label` |
| `tabindex > 0` | Breaks natural tab order | Use `tabindex="0"` or `-1` only |
