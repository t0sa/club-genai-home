#!/usr/bin/env node
/**
 * fetch-veille.js
 * Fetches RSS feeds from AI labs and trending GitHub AI repos,
 * then writes the merged result to src/data/veille.json.
 *
 * Requires Node.js 18+ (built-in fetch).
 * Uses fast-xml-parser (installed as project dependency).
 * GITHUB_TOKEN env var is optional but recommended.
 */

import { writeFileSync, renameSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const OUTPUT_PATH      = resolve(process.cwd(), 'src/data/veille.json');
const MAX_PER_SOURCE   = 5;
const MAX_TOTAL        = 18;
const FETCH_TIMEOUT_MS = 12_000;

// RSS sources — Anthropic has no official RSS, others are official feeds
const RSS_SOURCES = [
  { url: 'https://openai.com/news/rss.xml',                              source: 'OpenAI'       },
  { url: 'https://deepmind.google/blog/rss.xml',                         source: 'Google'       },
  { url: 'https://research.facebook.com/feed',                           source: 'Meta AI'      },
  { url: 'https://huggingface.co/blog/feed.xml',                         source: 'Hugging Face' },
  { url: 'https://blog.google/technology/ai/rss/',                       source: 'Google AI'    },
  { url: 'https://blogs.nvidia.com/feed/',                               source: 'Nvidia'       },
];

// ── URL validation ───────────────────────────────────────────────────────────

/**
 * Returns the URL if it uses http: or https:, otherwise returns ''.
 * Prevents javascript: and data: URIs from being stored as hrefs.
 */
export function safeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? raw : '';
  } catch { return ''; }
}

// ── RSS helpers ──────────────────────────────────────────────────────────────

export function cleanText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseISODate(raw) {
  if (!raw) return '';
  try { return new Date(raw).toISOString().split('T')[0]; }
  catch { return ''; }
}

async function fetchRSS(url, source) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'club-genai-veille-bot' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`  ⚠️  ${source}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(xml);

    // Support both RSS 2.0 (rss.channel.item) and Atom (feed.entry)
    const rawItems =
      doc?.rss?.channel?.item ??
      doc?.feed?.entry ??
      [];

    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items.slice(0, MAX_PER_SOURCE).map(item => {
      // Resolve URL: Atom uses <link href="..."/>, RSS 2.0 uses <link>text</link>.
      // guid may be a plain string or an object { '#text': '...', '@_isPermaLink': '...' }.
      // When a feed has multiple <link> elements (e.g. HuggingFace Atom: rel=alternate + rel=self),
      // fast-xml-parser returns an array. Pick rel="alternate" first, then fall back to [0].
      const linkNode = Array.isArray(item.link)
        ? (item.link.find(l => l['@_rel'] === 'alternate') ?? item.link[0])
        : item.link;
      const rawLink = typeof linkNode === 'object' ? linkNode['@_href'] : linkNode;
      const rawGuid = typeof item.guid === 'object' ? item.guid['#text'] : item.guid;
      const link = rawLink ?? rawGuid ?? '';

      return {
        title:   cleanText(item.title),
        url:     safeUrl(typeof link === 'object' ? '' : String(link)),
        source,
        date:    parseISODate(item.pubDate ?? item.published ?? item.updated),
        excerpt: cleanText(item.description ?? item.summary ?? item['content:encoded'] ?? '').slice(0, 200),
        type:    'article',
      };
    }).filter(i => i.title && i.url);

  } catch (err) {
    console.warn(`  ⚠️  ${source}: ${err.message}`);
    return [];
  }
}

// ── GitHub Trending AI repos (past 7 days) ───────────────────────────────────

async function fetchGitHubTrending() {
  try {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'club-genai-veille-bot',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const url =
      'https://api.github.com/search/repositories' +
      `?q=topic:generative-ai+topic:llm+created:>${since}+stars:>50` +
      '&sort=stars&order=desc&per_page=5';

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`  ⚠️  GitHub Trending: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.items ?? []).map(repo => ({
      title:   `${repo.full_name} — ${repo.description ?? 'Nouveau repo GenAI'}`,
      url:     safeUrl(repo.html_url),
      source:  'GitHub',
      date:    (repo.created_at ?? '').split('T')[0],
      excerpt: repo.description ?? '',
      type:    'repo',
    }));

  } catch (err) {
    console.warn(`  ⚠️  GitHub Trending: ${err.message}`);
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Fetching GenAI veille…');

  const [rssResults, githubRepos] = await Promise.all([
    Promise.all(RSS_SOURCES.map(s => fetchRSS(s.url, s.source))),
    fetchGitHubTrending(),
  ]);

  const items = [...rssResults.flat(), ...githubRepos]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, MAX_TOTAL);

  const output = {
    updated_at: new Date().toISOString().split('T')[0],
    items,
  };

  if (items.length === 0) {
    console.warn('⚠️  No veille items fetched from any source — skipping write to preserve existing data.');
    return;
  }

  const content = JSON.stringify(output, null, 2) + '\n';
  const tmpPath = OUTPUT_PATH + '.tmp';
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, OUTPUT_PATH);
  console.log(`✅ Wrote ${items.length} items to ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('❌ fetch-veille failed:', err.message);
    process.exit(1);
  });
}
