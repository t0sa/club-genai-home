import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl } from '../../.github/scripts/fetch-projects.js';

// ── safeUrl (fetch-projects version) ─────────────────────────────────────────
// Both scripts define safeUrl independently; this tests the projects variant.

describe('safeUrl (fetch-projects)', () => {
  it('accepts https URLs', () => {
    assert.equal(safeUrl('https://github.com/t0sa/club-genai-home'), 'https://github.com/t0sa/club-genai-home');
  });

  it('accepts http URLs', () => {
    assert.equal(safeUrl('http://example.com'), 'http://example.com');
  });

  it('rejects javascript: URIs', () => {
    assert.equal(safeUrl('javascript:alert(1)'), '');
  });

  it('rejects data: URIs', () => {
    assert.equal(safeUrl('data:text/html,x'), '');
  });

  it('rejects protocol-relative URLs', () => {
    assert.equal(safeUrl('//evil.example/'), '');
  });

  it('rejects relative paths', () => {
    assert.equal(safeUrl('/etc/passwd'), '');
  });

  it('returns empty string for empty input', () => {
    assert.equal(safeUrl(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(safeUrl(null), '');
  });
});
