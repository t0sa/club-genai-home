---
title: "javascript: URI XSS via Unvalidated RSS Feed URLs"
date: 2026-04-10
category: docs/solutions/security-issues/
module: club-genai-home
problem_type: security_issue
component: tooling
severity: high
symptoms:
  - RSS feed <link> values extracted as raw strings and written to veille.json with no scheme check
  - GitHub API html_url values written verbatim to projects.json with no scheme check
  - A malicious or compromised feed/API response can inject a javascript: URI into any JSON data file
  - Astro HTML-escapes attribute values but does NOT block javascript: URI execution on click
  - No build error or warning — the pipeline succeeds silently with a malicious href in the output
root_cause: missing_validation
resolution_type: code_fix
related_components:
  - astro-static-renderer
  - github-actions-pipeline
tags:
  - xss
  - javascript-uri
  - rss-feed
  - url-validation
  - astro
  - github-actions
  - static-site
  - href-injection
---

# javascript: URI XSS via Unvalidated RSS Feed URLs

## Problem

The GitHub Actions script `.github/scripts/fetch-veille.js` fetches RSS feeds from external sources (OpenAI, Google DeepMind, Meta AI), parses them with `fast-xml-parser`, and writes article URLs verbatim to `src/data/veille.json`. Astro renders those URLs as `href={item.url}` in the static page. Astro's JSX-style templating auto-escapes HTML-special characters — preventing classic HTML injection — but does **not** prevent `javascript:` URIs, because `javascript:alert(1)` contains no HTML-special characters and is a syntactically valid `href` value. A browser executes the URI payload when the user clicks the link.

Because the data file is committed to the repository by the workflow and the site is rebuilt automatically on push, the XSS payload travels from an upstream RSS feed all the way to a statically served `href` clicked by a site visitor.

## Symptoms

- An article card navigates to a `javascript:` execution context instead of an external article when clicked.
- In browser DevTools the rendered anchor shows a literal `href="javascript:..."` value in the DOM.
- `src/data/veille.json` contains an entry whose `url` field begins with `javascript:` (or `data:`, `vbscript:`, etc.) rather than `https://`.
- No build error is produced: Astro and the GitHub Actions workflow succeed without warning.

## What Didn't Work

**Relying on Astro's auto-escaping.** Astro HTML-encodes `<>&"` in attribute values, which stops injected HTML tags. It does not stop `javascript:` because those characters require no encoding. HTML encoding and URI scheme validation are orthogonal concerns.

**Content Security Policy headers.** GitHub Pages serves static files and does not support custom HTTP response headers. Without a CDN layer, a `Content-Security-Policy` or `script-src` directive cannot be delivered to the browser. Client-side defences are structurally unavailable in this deployment model.

**Ad-hoc string prefix checks.** Filtering with `startsWith('http')` or `!url.startsWith('javascript:')` is fragile — mixed-case schemes (`Javascript:`), encoded colons, and protocol-relative URLs (`//evil.example/`) can all bypass naive string matching.

## Solution

Add a `safeUrl()` function at the ingestion boundary and apply it to every URL field before writing to `veille.json`.

**Before — raw strings, no scheme validation (both pipelines):**

```js
// .github/scripts/fetch-veille.js (vulnerable)
const link =
  (typeof item.link === 'object' ? item.link['@_href'] : item.link) ??
  item.guid ??
  '';
return {
  url: typeof link === 'object' ? '' : String(link),  // ← raw string, no check
};

// GitHub Trending in fetch-veille.js (vulnerable)
return (data.items ?? []).map(repo => ({
  url: repo.html_url,  // ← also unvalidated
}));

// .github/scripts/fetch-projects.js (vulnerable)
// repo.html_url written directly → read as href={repo.url} in ProjectList.astro
url: r.html_url,
```

**After — shared `safeUrl()` function applied at every URL ingestion point:**

```js
/**
 * Returns the URL if it uses http: or https:, otherwise returns ''.
 * Prevents javascript: and data: URIs from being stored as hrefs.
 * Added to BOTH fetch-veille.js and fetch-projects.js.
 */
function safeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? raw : '';
  } catch { return ''; }
}

// fetch-veille.js — RSS/Atom link resolution (also fixes guid-as-object edge case):
const rawLink = typeof item.link === 'object' ? item.link['@_href'] : item.link;
const rawGuid = typeof item.guid === 'object' ? item.guid['#text'] : item.guid;
const link    = rawLink ?? rawGuid ?? '';
return {
  url: safeUrl(typeof link === 'object' ? '' : String(link)),
};

// fetch-veille.js — GitHub Trending:
return (data.items ?? []).map(repo => ({
  url: safeUrl(repo.html_url),
}));

// fetch-projects.js — GitHub API repo list:
url: safeUrl(r.html_url),
```

No changes are required to `VeilleGenAI.astro` or `ProjectList.astro`. The fix is entirely at the data write boundary in the pipeline scripts.

## Why This Works

`new URL(raw)` is the WHATWG URL parser built into Node.js 18+. It performs strict, standards-compliant parsing that handles all legal variations of scheme encoding the same way a browser would. After parsing, `u.protocol` is always the normalized lowercase scheme string including the trailing colon.

The allowlist `u.protocol === 'https:' || u.protocol === 'http:'` is a closed set. Every scheme not explicitly listed — `javascript:`, `data:`, `vbscript:`, `blob:` — returns empty string. Protocol-relative URLs (`//example.com`) and relative paths (`../admin`) throw inside `new URL()` and are caught by the `catch`, also returning empty string.

The empty string is falsy and is subsequently removed by the existing `.filter(i => i.title && i.url)` guard. Items with invalid URLs are discarded before `veille.json` is written. No broken or malicious link reaches the rendered page.

## Prevention

**Validate URL schemes at the data ingestion boundary, not at render time.** The render layer (Astro, React, Vue) handles HTML encoding; it does not handle URI semantics. Neither substitutes for the other.

**Use `new URL()` with a protocol allowlist as the standard pattern for any externally-sourced URL.** The function is ~7 lines, dependency-free, and available in Node.js 18+ without imports:

```js
function safeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? raw : '';
  } catch { return ''; }
}
```

Apply it to every field that originates from an external source and will be rendered as an `href` or `src` attribute.

**Test these inputs explicitly when reviewing URL-handling code:**

```js
// All of these should return '' from safeUrl()
safeUrl('javascript:alert(1)')          // → ''
safeUrl('Javascript:alert(1)')          // → '' (case insensitive via WHATWG parser)
safeUrl('data:text/html,<script>x</script>') // → ''
safeUrl('vbscript:msgbox(1)')           // → ''
safeUrl('//evil.example/path')          // → '' (relative URL throws in new URL)
safeUrl('../admin')                     // → '' (relative URL throws in new URL)
safeUrl('https://valid.example/path')   // → 'https://valid.example/path'
```

**Apply `safeUrl()` consistently across all data pipeline scripts, not just one.** In this project both `fetch-veille.js` and `fetch-projects.js` write URLs that are later rendered as `href` attributes. Adding the validation to only one script leaves the other pipeline vulnerable. Define `safeUrl()` once per script file — or extract to a shared module — and call it on every URL field before writing to JSON.

**For GitHub Pages deployments:** Custom HTTP response headers — including `Content-Security-Policy` — are not available without a CDN layer. The only reliable mitigation for URI scheme injection in this deployment model is validation at write time, before the data file is committed to the repository. A future CDN migration (Cloudflare Pages, Netlify, Vercel) would enable header-based defence-in-depth, but validation at ingestion should remain regardless.

**Review the full data-to-href path** when auditing any CI pipeline that fetches external content and renders it as links: `external source → pipeline script → JSON file → build-time import → href attribute`. The vulnerability exists at the script step, but it only matters because of the full chain. Tracing the chain during review prevents gaps like the `fetch-projects.js` oversight above.

## Related Issues

- [ce-review finding SEC-001] — original detection in `.context/compound-engineering/ce-review/20260410-204040-f54fe71c/security.json`
