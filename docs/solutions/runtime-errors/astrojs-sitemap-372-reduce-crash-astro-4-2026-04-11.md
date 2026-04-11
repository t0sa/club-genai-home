---
title: "@astrojs/sitemap 3.7.2 crashes at build:done with 'reduce' TypeError on Astro 4.16"
date: 2026-04-11
category: docs/solutions/runtime-errors/
module: club-genai-home
problem_type: runtime_error
component: tooling
symptoms:
  - "Build fails at astro:build:done with: Cannot read properties of undefined (reading 'reduce')"
  - "Error originates inside @astrojs/sitemap/dist/index.js:85 when invoked via npx astro add sitemap"
  - "No sitemap files are generated in dist/"
root_cause: wrong_api
resolution_type: dependency_update
severity: high
tags:
  - astro
  - sitemap
  - astrojs-sitemap
  - build-error
  - version-incompatibility
  - astro-4
---

# @astrojs/sitemap 3.7.2 crashes at build:done with 'reduce' TypeError on Astro 4.16

## Problem

`@astrojs/sitemap@3.7.2` crashes during Astro 4.16 builds because it calls `.reduce()` on the `routes` property of the `build:done` hook payload, which is `undefined` in Astro 4.16 due to an internal API change. No sitemap files are generated and the build exits with a non-zero code.

## Symptoms

```
Cannot read properties of undefined (reading 'reduce')
  Location:
    node_modules/@astrojs/sitemap/dist/index.js:85:37
  Stack trace:
    at astro:build:done (...)
    at async AstroBuilder.build (...)
```

- Error appears regardless of site configuration or page count
- Occurs after all pages are built (late in the build pipeline)
- Triggered purely by the `@astrojs/sitemap` version — not by project content

## What Didn't Work

- Installing `@astrojs/sitemap` via `npx astro add sitemap` — this resolves to `@astrojs/sitemap@3.7.2` (latest at the time) and crashes immediately on first `astro build`.

## Solution

Pin to `@astrojs/sitemap@3.1.6`, the last version verified compatible with Astro 4.x:

```bash
npm install @astrojs/sitemap@3.1.6 --save-exact
```

No special sitemap configuration is required. The standard integration setup works:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://your-domain.github.io',  // required for sitemap URL generation
  base: '/your-repo/',                    // respected automatically by the integration
  integrations: [tailwind(), sitemap()],
  output: 'static',
});
```

The `site` field in `astro.config.mjs` is **mandatory** — if absent, `@astrojs/sitemap` silently skips generation (no error, no files).

## Why This Works

`@astrojs/sitemap@3.7.2` accesses a `routes` (or equivalent) property from Astro's `build:done` hook payload in a way incompatible with the hook API shape that Astro 4.16 exposes. The property is `undefined` at that hook stage in Astro 4.16, causing the crash before any sitemap logic runs.

`@astrojs/sitemap@3.1.6` was authored against the Astro 4.x `build:done` hook contract that Astro 4.16 still satisfies, so its hook integration completes without hitting the undefined property.

## Prevention

- **Do not use `npx astro add sitemap` on Astro 4.x projects without pinning.** The command resolves to the latest version, which may target Astro 5.x internal APIs.
- **Pin with `--save-exact`**: `npm install @astrojs/sitemap@3.1.6 --save-exact` — prevents accidental upgrades via `npm update`.
- **Check the changelog before upgrading** `@astrojs/sitemap`: any bump that touches `build:done` hook consumption is a potential breaking change on older Astro minor versions.
- **Verify sitemap generation after any Astro minor upgrade** by checking for `sitemap-index.xml` and `sitemap-0.xml` in `dist/` after build.

## Related Issues

- Related best practice: `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md` — another Astro integration pattern where version-sensitive lifecycle hooks matter
