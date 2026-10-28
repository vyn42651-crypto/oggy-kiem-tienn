import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson, originAllowed, rateLimit } from '../functions/_shared/security.js';

test('readJson accepts valid JSON object', async () => {
  const req = new Request('https://oggy.test/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'xin chào' })
  });
  const result = await readJson(req);
  assert.deepEqual(result.value, { message: 'xin chào' });
});

test('readJson rejects wrong content type', async () => {
  const req = new Request('https://oggy.test/api/chat', { method: 'POST', body: 'message=hi' });
  const result = await readJson(req);
  assert.equal(result.status, 415);
});

test('readJson rejects arrays', async () => {
  const req = new Request('https://oggy.test/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '[1,2]'
  });
  const result = await readJson(req);
  assert.equal(result.status, 400);
});

test('readJson rejects oversized body', async () => {
  const req = new Request('https://oggy.test/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(100) })
  });
  const result = await readJson(req, 20);
  assert.equal(result.status, 413);
});

test('originAllowed permits same-origin and rejects foreign origin', () => {
  assert.equal(originAllowed(new Request('https://oggy.test/api/chat', { headers: { Origin: 'https://oggy.test' } }), {}), true);
  assert.equal(originAllowed(new Request('https://oggy.test/api/chat', { headers: { Origin: 'https://evil.test' } }), {}), false);
});

test('rateLimit remains usable in local demo mode without D1', async () => {
  const result = await rateLimit(new Request('https://oggy.test/api/chat'), {}, 'chat', 12);
  assert.equal(result.allowed, true);
  assert.equal(result.configured, false);
});
