#!/usr/bin/env node
/**
 * fetch-projects.js
 * Fetches all public repos from the configured github_user that start with
 * github_repo_prefix and writes the result to src/data/projects.json.
 *
 * Requires Node.js 18+ (built-in fetch).
 * GITHUB_TOKEN env var is optional but recommended to avoid rate limiting.
 * Must be run from the repository root.
 */

import { writeFileSync, renameSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const CONFIG       = JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/config.json'), 'utf8'));
const GITHUB_USER  = CONFIG.github_user;
const REPO_PREFIX  = CONFIG.github_repo_prefix;
const OUTPUT_PATH  = resolve(process.cwd(), 'src/data/projects.json');
const MAX_REPOS    = 20;
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Returns the URL if it uses http: or https:, otherwise returns ''.
 * Prevents javascript: and data: URIs from being stored as hrefs.
 */
export function safeUrl(raw) {
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

  if (repos.length === 0) {
    console.warn(`⚠️  No repos found matching prefix "${REPO_PREFIX}" — skipping write to preserve existing data.`);
    return;
  }

  const output = {
    updated_at: new Date().toISOString().split('T')[0],
    repos,
  };

  const content = JSON.stringify(output, null, 2) + '\n';
  const tmpPath = OUTPUT_PATH + '.tmp';
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, OUTPUT_PATH);
  console.log(`✅ Wrote ${repos.length} repos to ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('❌ fetch-projects failed:', err.message);
    process.exit(1);
  });
}
