import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../scripts/generate.mjs';
import { clone, workspace, mockSources } from './helpers.mjs';

const reply = (id, result) => new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
  headers: { 'content-type': 'application/json' },
});

test('tools/list follows pagination separately for every variant', async t => {
  const data = clone();
  const root = await workspace(t, data);
  const pages = [];
  const mock = mockSources(data, (url, _options, body) => {
    if (body?.method !== 'tools/list') return;
    pages.push({ url, cursor: body.params.cursor });
    return body.params.cursor
      ? reply(body.id, { tools: [data.tools[1]] })
      : reply(body.id, { tools: [data.tools[0]], nextCursor: 'page-two' });
  });
  const result = await generate({ root, ...mock });
  assert.equal(pages.length, data.config.endpointVariants.length * 2);
  assert.equal((result['README.md'].match(/\| 2 \|/g) ?? []).length, data.config.endpointVariants.length);
});

test('pagination cycle fails closed instead of hanging', async t => {
  const data = clone();
  const root = await workspace(t, data);
  const mock = mockSources(data, (_url, _options, body) => body?.method === 'tools/list'
    ? reply(body.id, { tools: data.tools, nextCursor: 'same-cursor' }) : undefined);
  await assert.rejects(generate({ root, ...mock }), /Invalid tool cursor/);
});

test('stateless MCP supports plain JSON initialize, sends initialized and omits session header', async t => {
  const data = clone();
  const root = await workspace(t, data);
  const mock = mockSources(data, (_url, options, body) => {
    if (!body) return;
    assert.equal(options.headers['Mcp-Session-Id'], undefined);
    if (body.method === 'initialize') return reply(body.id, data.initialize);
    assert.equal(options.headers['MCP-Protocol-Version'], data.initialize.protocolVersion);
    if (body.method === 'notifications/initialized') return new Response(null, { status: 204 });
    return reply(body.id, { tools: data.tools });
  });
  await generate({ root, ...mock });
  assert.equal(mock.calls.filter(call => call.body?.method === 'notifications/initialized').length,
    data.config.endpointVariants.length);
});

test('config alone selects a different tenant, module and endpoint profile', async t => {
  const data = clone();
  data.config.module = 'another-module';
  data.config.slug = 'another-tenant';
  data.config.endpointVariants = [{ id: 'discovery', path: '/discovery' }];
  const root = await workspace(t, data);
  const mock = mockSources(data);
  const output = await generate({ root, ...mock });
  assert(mock.calls.some(call => call.url.endsWith('/mcp/another-module/another-tenant/discovery')));
  assert(output['README.md'].includes('/public/another-module/another-tenant/openapi.json'));
  assert.equal(Object.keys(JSON.parse(output['mcp.json']).mcpServers)[0], data.config.slug);
});
