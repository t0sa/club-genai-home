---
title: "fix: reliability, tests, and docs — remaining code review work"
type: fix
status: active
date: 2026-04-10
---

# fix: reliability, tests, and docs — remaining code review work

## Overview

Four items remain from the post-build code review of the Club GenAI Home site. Two are reliability fixes to the GitHub Actions data pipeline scripts (atomic writes, empty-result guard). One is a refactor (consolidate hardcoded values into `config.json`). One is test infrastructure (node:test). One is operational documentation (CLAUDE.md).

All items are independent and can be landed in any order. The recommended order — reliability first, then config consolidation, then tests, then docs — ensures tests exercise the final script behavior.

## Problem Frame

The data pipeline scripts (`fetch-projects.js`, `fetch-veille.js`) write JSON files directly without two standard safeguards: (a) an atomic write pattern that prevents truncated-file corruption if the process dies mid-write, and (b) a guard that prevents a successful-but-empty API response from silently overwriting valid cached data. Separately, the codebase has no unit tests, the GitHub username and repo prefix are hardcoded in four locations rather than driven by `config.json`, and there is no documentation for operating the site.

## Requirements Trace

- R1. A process crash during file write must not corrupt the output JSON (non-atomic write → atomic tmp+rename pattern)
- R2. A rate-limited or empty API response must not overwrite a previously valid JSON file
- R3. Core data pipeline functions must have unit test coverage
- R4. Agents and contributors must have a single document describing how to operate the site
- R5. `t0sa` and `club-genai` must appear in `config.json` once; components must derive them from there

## Scope Boundaries

- No new features — these are maintenance and reliability fixes only
- No database or server changes — static site, no backend
- No changes to the Astro build output or deployment workflow
- Tests cover pure functions in the scripts only (no integration tests against live APIs)

### Deferred to Separate Tasks

- npm audit integration in CI: related but separate from this plan
- CSP headers via CDN: requires hosting migration (separate decision)
- GitHub Actions retry logic: could add later, not in scope here

## Context & Research

### Relevant Code and Patterns

- `.github/scripts/fetch-projects.js:73` — `writeFileSync(OUTPUT_PATH, ...)` — non-atomic direct write
- `.github/scripts/fetch-veille.js:175` — `writeFileSync(OUTPUT_PATH, ...)` — same issue
- `fetch-projects.js:14–15` — `GITHUB_USER = 't0sa'`, `REPO_PREFIX = 'club-genai'` (hardcoded constants)
- `src/components/Nav.astro:31` — `href="https://github.com/t0sa"` (hardcoded)
- `src/components/Footer.astro:23` — `href="https://github.com/t0sa"` (hardcoded)
- `src/components/ProjectList.astro:23` — `href="https://github.com/t0sa?tab=repositories&q=club-genai"` (hardcoded, both constants)
- `src/data/config.json` — already has `meetup_url`, `meetup_label`, `meetup_date`, `meetup_location`
- `src/pages/index.astro` — imports `config.json`, passes props to all components
- `package.json` — no `test` script, no devDependencies; Node 20 pinned in CI workflows

### Institutional Learnings

- `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` — unrelated (XSS fix, already applied)

### External References

- `fs.renameSync()` — POSIX-guaranteed atomic on same filesystem; standard Node.js, no deps
- `node:test` — built-in to Node 18+, available without install; `node --test` discovers `test/**/*.test.js` pattern

## Key Technical Decisions

- **Atomic write target directory**: Tmp file goes to the same directory as the output (`OUTPUT_PATH + '.tmp'`), not `os.tmpdir()`. This guarantees same-filesystem rename and true atomicity. Cross-filesystem rename is not atomic.
- **Empty result guard**: Skip the write and log a warning when the fetch returned 0 results after a successful HTTP call. Do not exit with error — the workflow should continue and commit nothing rather than failing loudly. The skip leaves `updated_at` unchanged so the next scheduled run retries normally.
- **Config reading in scripts**: `JSON.parse(fs.readFileSync('src/data/config.json', 'utf8'))` — no JSON import assertion syntax, works in Node 18+ ESM without flags.
- **Test framework**: `node:test` built-in, zero new dependencies. Test files in `test/scripts/`. Discovery: `node --test test/**/*.test.js`.
- **Component prop name**: `githubUser` (camelCase) passed from `index.astro` to Nav, Footer, ProjectList. Consistent with existing `meetupUrl` convention.

## Open Questions

### Resolved During Planning

- **Should we guard `veille.json` too?** Yes — same logic as projects. All-sources-fail produces an empty `items` array, which should not overwrite the previous week's articles.
- **Minimum result threshold vs zero?** Zero. A threshold (e.g., `< 3`) risks false positives for genuinely small result sets. The guard protects against the empty-result failure mode, not low-result modes.
- **Should tests mock `fs`?** No — tests target pure functions (`cleanText`, `parseISODate`, `safeUrl`). File I/O functions (`main`, `fetchRSS`, `fetchGitHubTrending`) are not unit-testable without mocking `fetch` and `fs`. Mock-free pure function coverage is the right scope here.

### Deferred to Implementation

- Exact line numbers for insertion in the scripts (read during implementation)
- Whether `node --test test/**/*.test.js` needs the `--experimental-vm-modules` flag in this version (verify at implementation time)

## Implementation Units

- [ ] **Unit 1: Atomic writes + empty-result guards in fetch scripts**

**Goal:** Prevent truncated-JSON corruption on crash; prevent empty API responses from overwriting valid cached data.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `.github/scripts/fetch-projects.js`
- Modify: `.github/scripts/fetch-veille.js`

**Approach:**
- Replace the single `writeFileSync(OUTPUT_PATH, content)` call in each script with the tmp+rename pattern:
  - Compute `tmpPath = OUTPUT_PATH + '.tmp'`
  - `writeFileSync(tmpPath, content)`
  - `renameSync(tmpPath, OUTPUT_PATH)` — atomic on same filesystem
  - Import `renameSync` from `'fs'` alongside existing `writeFileSync`
- Add empty-result guard **before** the write in each script's `main()`:
  - `fetch-projects.js`: if `repos.length === 0` after a successful fetch, `console.warn(...)` and `return` without writing
  - `fetch-veille.js`: if `items.length === 0` after all sources are attempted, same guard

**Patterns to follow:**
- Existing import style: `import { writeFileSync } from 'fs'` → extend to `import { writeFileSync, renameSync } from 'fs'`
- Existing warning style: `console.warn('⚠️  ...')` pattern already used in `fetchRSS` source failure handlers

**Test scenarios:**
- Happy path: script fetches N > 0 results → output file exists with correct JSON, no `.tmp` leftover
- Edge case: API returns 0 results for the prefix filter → output file not modified (pre-existing content preserved), `.tmp` not created, warning emitted
- Edge case: verify output file matches what was written (content round-trips through JSON.parse)

**Verification:**
- Run `node .github/scripts/fetch-projects.js` locally with `GITHUB_TOKEN` set → `src/data/projects.json` updated, no `.tmp` file left behind
- Temporarily set `REPO_PREFIX = 'zzz-nonexistent'` and run → existing `projects.json` is not modified, warning message appears

---

- [ ] **Unit 2: Consolidate `github_user` and `github_repo_prefix` into `config.json`**

**Goal:** Replace four hardcoded occurrences of `t0sa` and two of `club-genai` with values driven from `src/data/config.json`.

**Requirements:** R5

**Dependencies:** None (independent of Unit 1)

**Files:**
- Modify: `src/data/config.json`
- Modify: `.github/scripts/fetch-projects.js`
- Modify: `src/pages/index.astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/components/ProjectList.astro`

**Approach:**
- Add to `src/data/config.json`:
  ```json
  "github_user": "t0sa",
  "github_repo_prefix": "club-genai"
  ```
- In `fetch-projects.js`: replace the `GITHUB_USER` and `REPO_PREFIX` constants with values read at startup via `JSON.parse(fs.readFileSync(resolve(cwd, 'src/data/config.json'), 'utf8'))`. Import `readFileSync` from `'fs'`.
- In `index.astro`: pass `githubUser={config.github_user}` to `Nav`, `Footer`, and `ProjectList`.
- In `Nav.astro`: add `githubUser: string` to `Props`; replace hardcoded GitHub URL with `` `https://github.com/${githubUser}` ``.
- In `Footer.astro`: same as Nav.
- In `ProjectList.astro`: add `githubUser: string` to `Props`; replace hardcoded Voir-tout URL with `` `https://github.com/${githubUser}?tab=repositories&q=${repoPrefix}` ``. Also add `repoPrefix: string` to Props and pass `config.github_repo_prefix` from `index.astro`.

**Patterns to follow:**
- Existing prop pattern in `Nav.astro` (already has `meetupUrl: string` in Props interface)
- Existing `import config from '../data/config.json'` in `index.astro`

**Test scenarios:**
- Happy path: site builds (`npm run build`) without error after the change
- Happy path: rendered `index.html` contains `https://github.com/t0sa` (derived from config, not hardcoded) — verify with grep on dist/index.html

**Verification:**
- `npm run build` passes with no type errors
- `grep "github.com/t0sa" dist/index.html` finds the expected links
- Changing `github_user` in `config.json` to a different value and rebuilding reflects in all four link locations

---

- [ ] **Unit 3: Unit tests for core data pipeline functions**

**Goal:** Add `node:test` coverage for the pure functions in both fetch scripts. No new dependencies.

**Requirements:** R3

**Dependencies:** Unit 1 (tests should exercise the final script behavior, including the empty-result guard)

**Files:**
- Create: `test/scripts/fetch-projects.test.js`
- Create: `test/scripts/fetch-veille.test.js`
- Modify: `package.json` — add `"test": "node --test test/**/*.test.js"` to scripts

**Approach:**
- Both scripts are ES modules (`type: "module"` in `package.json`). Test files use the same ESM syntax.
- Import only the pure exported functions from each script. If functions are not currently exported, refactor them to named exports and call them from `main()`. (Implementation decision: whether to add `export` to existing function declarations or create a separate module — defer to implementer.)
- Use `node:test` (`import { describe, it } from 'node:test'`) and `node:assert` for assertions.
- No file I/O in tests — test only the pure functions: `cleanText`, `parseISODate`, `safeUrl`.

**Test scenarios:**
- `cleanText()`:
  - Happy path: `cleanText('<b>Hello</b> &amp; world')` → `'Hello & world'`
  - Happy path: `cleanText('Plain text')` → `'Plain text'`
  - Edge case: `cleanText('')` → `''`
  - Edge case: `cleanText(null)` → `''`
  - Edge case: `cleanText(undefined)` → `''`
  - Edge case: string with multiple whitespace after tag removal → trimmed and collapsed
- `parseISODate()`:
  - Happy path: `parseISODate('Mon, 10 Apr 2026 10:00:00 GMT')` → `'2026-04-10'`
  - Happy path: `parseISODate('2026-04-10T10:00:00Z')` → `'2026-04-10'`
  - Edge case: `parseISODate('')` → `''`
  - Error path: `parseISODate('not a date')` → `''` (invalid date gracefully returns empty)
- `safeUrl()`:
  - Happy path: `safeUrl('https://example.com/path')` → `'https://example.com/path'`
  - Happy path: `safeUrl('http://example.com')` → `'http://example.com'`
  - Error path: `safeUrl('javascript:alert(1)')` → `''`
  - Error path: `safeUrl('data:text/html,<script>x</script>')` → `''`
  - Error path: `safeUrl('vbscript:msgbox(1)')` → `''`
  - Edge case: `safeUrl('//example.com')` → `''` (protocol-relative — no base provided to `new URL()`)
  - Edge case: `safeUrl('../admin')` → `''` (relative path)
  - Edge case: `safeUrl('')` → `''`
  - Edge case: `safeUrl(null)` → `''`

**Verification:**
- `npm test` exits 0 with all test cases passing
- No external network calls during test run (pure functions only)

---

- [ ] **Unit 4: CLAUDE.md — operational documentation**

**Goal:** Give agents and contributors a single file that documents how to operate the site. Satisfies the agent-native gap identified in code review.

**Requirements:** R4

**Dependencies:** Unit 2 (document the post-consolidation config.json contract)

**Files:**
- Create: `CLAUDE.md` at repo root

**Approach:**
Document in this order:
1. **Architecture** (3-4 sentences): Astro 4 static site, GitHub Pages, GitHub Actions data pipeline, JSON data layer
2. **config.json contract** (table): each field, its type, effect, and example value. Include `github_user`, `github_repo_prefix`, `meetup_url`, `meetup_label`, `meetup_date` (YYYY-MM-DD or `""`), `meetup_location`.
3. **Update meetup link** (1 paragraph): edit `src/data/config.json`, commit to main, rebuild triggers automatically
4. **Manual data refresh** (1 paragraph): `gh workflow run update-data.yml` — note the idempotency guard (skips if already ran today)
5. **Deploy** (1 sentence): push to main triggers `deploy.yml`; also triggerable via `gh workflow run deploy.yml`
6. **Run scripts locally** (code block): `GITHUB_TOKEN=<token> node .github/scripts/fetch-projects.js` — note the token is required for the GitHub API write-scope to work without rate limits
7. **DST / cron note** (2-3 sentences): two crons (`0 5 * * 1` and `0 6 * * 1` UTC) cover 7h00 French time in both winter (CET=UTC+1) and summer (CEST=UTC+2); idempotency guard prevents double-run

**Patterns to follow:**
- Tone: informational, not imperative — describe behavior rather than instructing
- Match density of the site's README style (concise, no hand-holding)

**Test scenarios:**
- Test expectation: none — documentation file, no behavioral change

**Verification:**
- File exists at repo root as `CLAUDE.md`
- An agent reading only `CLAUDE.md` would know: (a) how to update the meetup link, (b) how to trigger a data refresh, (c) what fields `config.json` accepts, (d) how to run the scripts locally

## System-Wide Impact

- **Error propagation:** Empty-result guards cause `main()` to `return` early (not throw), so the GitHub Actions step exits 0. The commit step then finds no staged changes and skips the push. This is intentional — a quiet skip is preferable to a noisy failure when the upstream API is rate-limited.
- **Unchanged invariants:** The Astro build, the deploy workflow, the `update-data.yml` DST cron logic, and the idempotency check are all unchanged by this plan.
- **API surface parity:** Unit 2 adds two new `Props` fields (`githubUser`, `repoPrefix`) to `ProjectList.astro`. Any future caller of that component must supply these props — the existing single caller (`index.astro`) is updated in the same unit.
- **Integration coverage:** Unit 2 verification (`npm run build`) is the integration check — it confirms all components receive the required props and the rendered HTML contains the correct derived URLs.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `renameSync` fails if tmp and output are on different mounts (unlikely in CI) | Tmp path is always `OUTPUT_PATH + '.tmp'`, same directory, same mount |
| Pure functions in scripts are not currently exported — requires minor refactor to make them importable by tests | Implementer may add `export` to function declarations or extract to a shared module; defer the exact approach to implementation |
| `node --test` glob syntax may vary by Node version | Use `node --test 'test/**/*.test.js'` with quotes to let Node handle glob expansion; fallback to listing files explicitly if needed |
| Config read in `fetch-projects.js` will fail if the script is run from a directory other than the repo root | Scripts are always run via `node .github/scripts/fetch-projects.js` from repo root in CI; document this constraint in CLAUDE.md |

## Sources & References

- Code review findings: `.context/compound-engineering/ce-review/20260410-204040-f54fe71c/reliability.json`, `correctness.json`, `maintainability.json`, `agent-native.json`
- Institutional learning: `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` (context only)
- `fs.renameSync` atomicity: Node.js docs — POSIX rename(2) is atomic on same filesystem
- `node:test`: https://nodejs.org/api/test.html (built-in Node 18+, no install)
