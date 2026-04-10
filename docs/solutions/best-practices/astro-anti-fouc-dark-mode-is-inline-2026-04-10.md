---
title: "Astro: use is:inline to prevent FOUC in dark-mode theme scripts"
date: 2026-04-10
category: docs/solutions/best-practices/
module: club-genai-home
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Adding dark mode to an Astro site that persists theme preference in localStorage
  - Any synchronous script must run before CSS is applied during HTML parsing
  - Output mode is static (output: 'static') — the issue applies equally to SSR
  - The project uses Tailwind CSS darkMode: 'class' requiring an early classList.add('dark')
tags:
  - astro
  - dark-mode
  - fouc
  - is-inline
  - tailwind
  - localStorage
  - accessibility
  - script-loading
---

# Astro: use is:inline to prevent FOUC in dark-mode theme scripts

## Context

When adding dark mode to a static Astro 4 site, the anti-FOUC (Flash Of Unstyled Content prevention) script must run synchronously in `<head>` **before** stylesheets render. It reads a theme preference from `localStorage` and adds a CSS class to `<html>` before the browser performs its first paint.

The natural instinct — adding a `<script>` tag to `<head>` in `Base.astro` — silently fails. Astro processes all `<script>` tags in `.astro` component templates:

- Converts them to `type="module"`
- Bundles and deduplicates them
- Emits them as separate files with content-hashed filenames

`type="module"` is **deferred by the HTML specification**: module scripts run only after the DOM is fully parsed and all stylesheets have been applied. The anti-FOUC script arrives too late, CSS renders first, and dark-mode users see a white flash on every page load.

**Stack context:** Astro 4.16.18, `output: 'static'`, `@astrojs/tailwind` 5.1.3, Tailwind CSS v3.4.17, deployed to GitHub Pages.

## Guidance

### Anti-FOUC script — use `is:inline` + place BEFORE stylesheets

The `is:inline` directive on a `<script>` tag tells Astro to emit it verbatim into the HTML output. No bundling, no `type="module"` conversion, no deduplication. The script runs synchronously as the HTML parser encounters it.

```astro
<!-- src/layouts/Base.astro — BEFORE <link> stylesheet tags -->
<head>
  <meta charset="UTF-8" />
  <!-- Anti-FOUC: runs synchronously before CSS — must use is:inline -->
  <script is:inline>
    (function () {
      try {
        if (localStorage.getItem('theme') === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        // localStorage unavailable (private browsing, policy) — default to light
      }
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="..." />
</head>
```

**Requirements:**
- `is:inline` must be present — omitting it causes silent FOUC regression
- Script must appear **before** all `<link rel="stylesheet">` tags — after means CSS loads first
- IIFE wrapper prevents global scope pollution
- `localStorage` access wrapped in `try/catch` — throws in private browsing or under restrictive policies

**Verification:** After `astro build`, open `dist/index.html` and confirm the IIFE appears verbatim inline, before all `<link>` tags.

---

### Toggle handler — do NOT use `is:inline`

Interactive handlers (click, focus) should run after the DOM is ready. Astro's default deferred module behavior is correct for these:

```astro
<!-- ThemeToggle.astro — normal <script> (no is:inline), correct for interaction handlers -->
<script>
  function updateLabels(isDark) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', isDark ? 'Passer en mode clair' : 'Passer en mode sombre');
    });
  }

  // Sync aria-label at load time.
  // The anti-FOUC script may have set dark mode before this deferred script runs.
  // The SSG-baked aria-label in the HTML may therefore be stale — correct it here.
  updateLabels(document.documentElement.classList.contains('dark'));

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
      updateLabels(isDark);
    });
  });
</script>
```

Note `updateLabels` is called at load — not with `is:inline` — to correct the SSG-baked `aria-label` that would otherwise be stale when the page loads in dark mode.

## Why This Matters

**The failure mode is silent.** A developer writes the anti-FOUC script, tests it in `astro dev` (which serves files differently than the build), and observes it working. In production after `astro build`, the FOUC reappears. The root cause is not visible in source: Astro's script transformation is a build-step concern, and `type="module"` deferral is a subtle HTML spec behavior — not an explicit `defer` attribute that would catch attention.

**Common dead ends:**

| Attempt | Why it fails |
|---------|-------------|
| `<script>` in `<head>` without `is:inline` | Astro converts to `type="module"` → deferred → FOUC persists |
| `<script async>` | Async does not guarantee pre-CSS execution |
| Placing script in component body | Same outcome — processed and deferred by Astro |
| Adding explicit `defer` | Deferred execution is already the problem, not the solution |

**The cost:** Dark-mode users see a white flash on every page load. On slow connections or with large stylesheets the flash is prolonged. Contrast shifts mid-render affect users with visual sensitivities and create unpredictable layout shifts.

**Secondary issue: stale SSG aria-label.** When Astro generates static HTML, it bakes a fixed `aria-label` into toggle buttons. If the anti-FOUC script activates dark mode before the deferred toggle script runs, screen-reader users hear the wrong label until they interact. Fix: call `updateLabels(classList.contains('dark'))` at toggle-script load time (before wiring click handlers), using the same deferred script — no `is:inline` needed for this correction.

## When to Apply

**Use `is:inline` when:**
- The script must execute before CSS is applied (theme detection, font preference, reduced-motion)
- The script does not import other modules (inline scripts cannot use ES `import`)
- The content is small — inline scripts inflate every HTML response, not cached separately

**Do NOT use `is:inline` when:**
- The script handles user interaction (click, focus) — use default deferred behavior
- The script imports from node_modules or other local modules
- The script is large or shared across many pages
- You want Astro to deduplicate the script across component instances

## Examples

### Before: FOUC not prevented

```astro
<!-- src/layouts/Base.astro — missing is:inline -->
<head>
  <script>
    <!-- Astro converts this to type="module" → deferred → FOUC -->
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  </script>
  <link rel="stylesheet" ... />
</head>
```

Astro emits in `dist/index.html`:
```html
<head>
  <!-- Script extracted, bundled, deferred -->
  <script type="module" src="/_astro/index.BxK3m9aQ.js"></script>
  <link rel="stylesheet" ... />
</head>
```
CSS loads first → dark class applied too late → white flash visible.

### After: FOUC prevented

```astro
<!-- src/layouts/Base.astro — is:inline + before stylesheets -->
<head>
  <script is:inline>
    (function () {
      try {
        if (localStorage.getItem('theme') === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" ... />
</head>
```

Astro emits in `dist/index.html`:
```html
<head>
  <script>
    (function () {
      try {
        if (localStorage.getItem('theme') === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" ... />
</head>
```
IIFE executes synchronously → `dark` class on `<html>` before stylesheets parsed → Tailwind `dark:` variants apply from first paint → no flash.

## Related

- Astro docs — `is:inline` directive: https://docs.astro.build/en/reference/directives-reference/#isinline
- Tailwind CSS v3 — `darkMode: 'class'`: https://tailwindcss.com/docs/dark-mode
- `docs/plans/2026-04-10-002-feat-dark-mode-plan.md` — implementation plan referencing this pattern
