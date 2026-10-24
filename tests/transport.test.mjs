import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSse, rpcResult, transport } from '../scripts/transport.mjs';

test('SSE handles BOM, CRLF, comments, multiline data, other events and final frame', () => {
  const text = '\uFEFF: keepalive\r\nevent: ping\r\ndata: ignored\r\n\r\nevent: message\r\nid: 5\r\ndata: {"jsonrpc":"2.0",\r\ndata: "id":1,"result":{"ok":true}}\r\n\r\ndata: {"last":true}';
  assert.deepEqual(parseSse(text), [{ jsonrpc: '2.0', id: 1, result: { ok: true } }, { last: true }]);
  assert.throws(() => parseSse('data: invalid\n\n'));
});

test('JSON-RPC matches response id and rejects errors and empty SSE', () => {
  assert.deepEqual(rpcResult('data: {"method":"notice"}\n\ndata: {"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n\n', 'text/event-stream', 2), { tools: [] });
  for (const text of ['{}', '{"jsonrpc":"2.0","id":1,"error":{"code":-1}}', '{"jsonrpc":"2.0","id":2,"result":{}}']) {
    assert.throws(() => rpcResult(text, 'application/json', 1));
  }
  assert.throws(() => rpcResult(': heartbeat\n\n', 'text/event-stream', 1));
});

test('transport retries twice for non-200, invalid JSON and network failure', async () => {
  for (const respond of [() => new Response('{}', { status: 503 }), () => new Response('broken'), () => { throw new Error('offline'); }]) {
    let attempts = 0;
    const request = transport({ retryDelayMs: 0, fetchImpl: async () => { attempts++; return respond(); } });
    await assert.rejects(request('https://example.test'), /Source failed/);
    assert.equal(attempts, 3);
  }
});

test('timeout aborts every attempt, including body consumption', async () => {
  let attempts = 0;
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const request = transport({ timeoutMs: 5, retryDelayMs: 0, fetchImpl: async (_url, { signal }) => {
      attempts++;
      return { status: 200, headers: new Headers(), text: () => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }) };
    } });
    await assert.rejects(request('https://example.test'), /Source failed/);
    assert.equal(attempts, 3);
  } finally { clearInterval(keepAlive); }
});
