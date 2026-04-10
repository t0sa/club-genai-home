#!/usr/bin/env node
/**
 * fetch-projects.js
 * Fetches all public repos from t0sa that start with "club-genai"
 * and writes the result to src/data/projects.json.
 *
 * Requires Node.js 18+ (built-in fetch).
 * GITHUB_TOKEN env var is optional but recommended to avoid rate limiting.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const GITHUB_USER      = 't0sa';
const REPO_PREFIX      = 'club-genai';
const OUTPUT_PATH      = resolve(process.cwd(), 'src/data/projects.json');
const MAX_REPOS        = 20;
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Returns the URL if it uses http: or https:, otherwise returns ''.
 * Prevents javascript: and data: URIs from being stored as hrefs.
 */
function safeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? raw : '';
  } catch { return ''; }
}

async function main() {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'club-genai-fetch-bot',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated&type=public`;
  console.log(`Fetching repos for ${GITHUB_USER}…`);

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const all = await res.json();

  const repos = all
    .filter(r => r.name.startsWith(REPO_PREFIX))
    .slice(0, MAX_REPOS)
    .map(r => ({
      name:        r.name,
      description: r.description ?? '',
      url:         safeUrl(r.html_url),
      stars:       r.stargazers_count,
      updated_at:  (r.updated_at ?? '').split('T')[0],
      topics:      r.topics ?? [],
    }));

  const output = {
    updated_at: new Date().toISOString().split('T')[0],
    repos,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`✅ Wrote ${repos.length} repos to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('❌ fetch-projects failed:', err.message);
  process.exit(1);
});
