import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
export const fixture = JSON.parse(await readFile(new URL('./fixtures/sources.json', import.meta.url), 'utf8'));
export const clone = () => structuredClone(fixture);
export async function workspace(t, data) {
  const root = await mkdtemp(join(tmpdir(), 'mirror-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'config.json'), JSON.stringify(data.config));
  return root;
}
export function mockSources(data, override = () => undefined) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, options, body });
    const replacement = override(url, options, body);
    if (replacement !== undefined) return replacement;
    const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
    if (!body) {
      const key = url.includes('registry.modelcontextprotocol.io') ? 'registry' : url.split('/').at(-1).replace('.json', '');
      return json(data[key]);
    }
    if (body.method === 'initialize') {
      assert.equal(options.headers['Mcp-Session-Id'], undefined);
      return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: body.id, result: data.initialize })}\n\n`, {
        headers: { 'content-type': 'text/event-stream', 'Mcp-Session-Id': `session-${url}` },
      });
    }
    assert.equal(options.headers['Mcp-Session-Id'], `session-${url}`);
    assert.equal(options.headers['MCP-Protocol-Version'], data.initialize.protocolVersion);
    if (body.method === 'notifications/initialized') {
      assert.equal(body.id, undefined);
      return new Response(null, { status: 202 });
    }
    assert.equal(body.method, 'tools/list');
    assert(calls.some(call => call.url === url && call.body?.method === 'notifications/initialized'));
    return json({ jsonrpc: '2.0', id: body.id, result: { tools: data.tools } });
  };
  return { fetchImpl, calls, retryDelayMs: 0 };
}
