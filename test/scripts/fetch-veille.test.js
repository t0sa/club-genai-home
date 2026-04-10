import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, parseISODate, safeUrl } from '../../.github/scripts/fetch-veille.js';

// ── cleanText ────────────────────────────────────────────────────────────────

describe('cleanText', () => {
  it('strips HTML tags', () => {
    assert.equal(cleanText('<b>Hello</b>'), 'Hello');
  });

  it('decodes common HTML entities', () => {
    assert.equal(cleanText('Rock &amp; Roll'), 'Rock & Roll');
    assert.equal(cleanText('&lt;tag&gt;'), '<tag>');
    assert.equal(cleanText('&quot;quoted&quot;'), '"quoted"');
    assert.equal(cleanText('it&#039;s'), "it's");
  });

  it('collapses multiple whitespace', () => {
    assert.equal(cleanText('hello   world'), 'hello world');
  });

  it('returns empty string for empty input', () => {
    assert.equal(cleanText(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(cleanText(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.equal(cleanText(undefined), '');
  });

  it('leaves plain text unchanged', () => {
    assert.equal(cleanText('Plain text without markup'), 'Plain text without markup');
  });

  it('handles mixed tags and entities', () => {
    assert.equal(cleanText('<b>Rock &amp; Roll</b>'), 'Rock & Roll');
  });
});

// ── parseISODate ─────────────────────────────────────────────────────────────

describe('parseISODate', () => {
  it('parses an ISO 8601 timestamp', () => {
    assert.equal(parseISODate('2026-04-10T10:00:00Z'), '2026-04-10');
  });

  it('parses an RFC 2822 date (RSS pubDate)', () => {
    const result = parseISODate('Mon, 10 Apr 2026 10:00:00 GMT');
    assert.equal(result, '2026-04-10');
  });

  it('returns empty string for empty input', () => {
    assert.equal(parseISODate(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(parseISODate(null), '');
  });

  it('returns empty string for invalid date strings', () => {
    assert.equal(parseISODate('not a date'), '');
  });

  it('returns empty string for undefined', () => {
    assert.equal(parseISODate(undefined), '');
  });
});

// ── safeUrl ──────────────────────────────────────────────────────────────────

describe('safeUrl', () => {
  it('accepts https URLs', () => {
    assert.equal(safeUrl('https://example.com/path'), 'https://example.com/path');
  });

  it('accepts http URLs', () => {
    assert.equal(safeUrl('http://example.com'), 'http://example.com');
  });

  it('rejects javascript: URIs', () => {
    assert.equal(safeUrl('javascript:alert(1)'), '');
  });

  it('rejects javascript: URIs with mixed case (WHATWG normalizes)', () => {
    assert.equal(safeUrl('Javascript:alert(1)'), '');
  });

  it('rejects data: URIs', () => {
    assert.equal(safeUrl('data:text/html,<script>x</script>'), '');
  });

  it('rejects vbscript: URIs', () => {
    assert.equal(safeUrl('vbscript:msgbox(1)'), '');
  });

  it('rejects protocol-relative URLs (throws in new URL without base)', () => {
    assert.equal(safeUrl('//evil.example/path'), '');
  });

  it('rejects relative paths', () => {
    assert.equal(safeUrl('../admin'), '');
  });

  it('returns empty string for empty input', () => {
    assert.equal(safeUrl(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(safeUrl(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.equal(safeUrl(undefined), '');
  });
});
