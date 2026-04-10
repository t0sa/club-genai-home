---
title: "Atom multi-link array silently drops all articles from HuggingFace feed"
date: 2026-04-10
category: docs/solutions/runtime-errors/
module: club-genai-home
problem_type: runtime_error
component: tooling
symptoms:
  - HuggingFace Atom feed added to RSS_SOURCES but no HuggingFace articles appear in veille.json
  - No error or warning emitted — fetchRSS() returns [] silently
  - Other RSS sources (OpenAI, DeepMind) continue to work normally
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - rss
  - atom
  - fast-xml-parser
  - silent-data-loss
  - feed-parsing
  - huggingface
---

# Atom multi-link array silently drops all articles from HuggingFace feed

## Problem

When `huggingface.co/blog/feed.xml` (an Atom feed) was added as a source in `fetch-veille.js`, all its articles were silently filtered out — `veille.json` contained zero HuggingFace items with no error or warning.

## Symptoms

- `source: "Hugging Face"` items absent from `src/data/veille.json` after a fetch run
- No `⚠️ Hugging Face:` warning in the script output (source fetched successfully)
- `npm test` continues to pass (pure functions unchanged)
- Other sources (OpenAI, DeepMind, Meta AI) unaffected

## What Didn't Work

The issue was not a network or HTTP problem — the feed returned 200 OK and valid XML. Adding `console.log(item.link)` reveals the root cause directly.

## Solution

HuggingFace Atom entries carry **two `<link>` elements** per entry: `rel="alternate"` (the article URL) and `rel="self"` (the feed URL for that entry). When fast-xml-parser encounters repeated sibling elements, it coerces them into an **array** instead of an object.

**Before (broken — handles single object, fails on array):**

```js
const rawLink = typeof item.link === 'object' ? item.link['@_href'] : item.link;
```

`Array.isArray(item.link)` is `true`, so `typeof item.link === 'object'` is also `true`. But `array['@_href']` returns `undefined`. `rawLink` is `undefined`, the guid fallback is a `tag:` URI, `safeUrl()` returns `''`, and `.filter(i => i.title && i.url)` removes the item.

**After (handles both single object and array):**

```js
// When a feed has multiple <link> elements (e.g. HuggingFace Atom: rel=alternate + rel=self),
// fast-xml-parser returns an array. Pick rel="alternate" first, then fall back to [0].
const linkNode = Array.isArray(item.link)
  ? (item.link.find(l => l['@_rel'] === 'alternate') ?? item.link[0])
  : item.link;
const rawLink = typeof linkNode === 'object' ? linkNode['@_href'] : linkNode;
```

**File:** `.github/scripts/fetch-veille.js` — the link resolution block in `fetchRSS()`.

## Why This Works

The WHATWG/Atom specification allows multiple `<link>` elements per entry. fast-xml-parser's behavior is consistent with the spec: repeated sibling elements become arrays. The original code assumed `item.link` was always either a string (RSS 2.0) or a single object (Atom) — it never handled the array case.

The fix:
1. Detects array via `Array.isArray()` before the existing `typeof` check
2. Prefers the `rel="alternate"` entry (the canonical human-readable URL)
3. Falls back to `[0]` if no `alternate` rel is present (defensive)
4. Preserves the existing string-path for RSS 2.0 feeds

## Prevention

**Any Atom feed may produce multi-link arrays.** fast-xml-parser always returns arrays for repeated sibling elements. The pattern is not HuggingFace-specific — it applies to any Atom source with `<link rel="alternate">` + `<link rel="self">` pairs.

When adding a new Atom RSS source to `RSS_SOURCES`, verify with a quick smoke test:

```bash
# Fetch the feed and inspect item.link structure
node -e "
  import { XMLParser } from 'fast-xml-parser';
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const res = await fetch('https://example.com/blog/feed.xml');
  const doc = parser.parse(await res.text());
  const items = doc?.feed?.entry ?? doc?.rss?.channel?.item ?? [];
  const first = Array.isArray(items) ? items[0] : items;
  console.log('link type:', typeof first?.link, Array.isArray(first?.link) ? '(array)' : '');
  console.log('link value:', JSON.stringify(first?.link, null, 2));
" --input-type=module
```

A unit test fixture with an Atom multi-link entry would also catch regressions:

```js
// test: fetchRSS should extract URL from Atom entry with array-valued link
// fixture: item.link = [{ '@_href': 'https://example.com/post', '@_rel': 'alternate' },
//                        { '@_href': 'https://example.com/post.atom', '@_rel': 'self' }]
// expected: url = 'https://example.com/post'
```

## Related

- `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` — `safeUrl()` is the final URL validation layer; this fix ensures the URL reaches `safeUrl()` rather than being `undefined`
