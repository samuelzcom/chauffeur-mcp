import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generate } from '../scripts/generate.mjs';
import { clone, workspace, mockSources } from './helpers.mjs';

const outputs = ['README.md', 'server.json', 'mcp.json', 'LICENSE'];
test('generation is deterministic, discovers sessions, uses live links and latest registry', async t => {
  const data = clone();
  const root = await workspace(t, data);
  const first = await generate({ root, ...mockSources(data) });
  const second = await generate({ root, ...mockSources(data) });
  assert.deepEqual(first, second);
  for (const name of outputs) assert.equal(await readFile(join(root, name), 'utf8'), first[name]);
  assert.deepEqual(JSON.parse(first['server.json']), data.registry.servers[1].server);
  assert.equal(JSON.parse(first['mcp.json']).mcpServers[data.config.slug].url,
    `${data.config.apiBase}/mcp/${data.config.module}/${data.config.slug}`);
  const readme = first['README.md'];
  for (const area of data.services.serviceAreas) assert(readme.includes(area.label));
  for (const text of ['https://live.test/docs', 'https://live.test/logo.png', 'Live Directory', data.services.serviceAreas[1].timeZone, 'de, en']) {
    assert(readme.includes(text));
  }
  assert(readme.includes(data.initialize.instructions));
  assert(!readme.includes('Pending Directory'));
  assert(!readme.includes('https://fallback.test'));
  assert.match(readme, /\| Yes \|/);
  assert.match(readme, /\| No \|/);
  assert.match(readme, /current areas\.<br>No booking/);
  assert.equal((readme.match(/\| 2 \|/g) ?? []).length, data.config.endpointVariants.length);
  assert.deepEqual((await readdir(root)).sort(), ['config.json', ...outputs].sort());
});

const failures = {
  'OpenAPI HTTP failure': (_data, url) => url.endsWith('/openapi.json') ? new Response('{}', { status: 503 }) : undefined,
  'services invalid JSON': (_data, url) => url.endsWith('/services') ? new Response('invalid') : undefined,
  'registry unreachable': (_data, url) => { if (url.includes('registry.modelcontextprotocol.io')) throw new Error('offline'); },
  'MCP variant failure': (_data, url, _options, body) => url.endsWith('/info-only') && body?.method === 'tools/list'
    ? new Response('{}', { status: 500 }) : undefined,
  'empty tools': data => { data.tools = []; },
  'empty areas': data => { data.services.serviceAreas = []; },
  'empty title': data => { data.openapi.info.title = ' '; },
  'empty description': data => { data.openapi.info.description = ''; },
  'missing latest registry': data => { data.registry.servers = []; },
  'wrong registry name': data => { data.registry.servers[1].server.name = 'io.example/other'; },
};
for (const [label, failure] of Object.entries(failures)) {
  test(`fail-safe: ${label} neither creates nor overwrites any output`, async t => {
    for (const existing of [false, true]) {
      const data = clone();
      const root = await workspace(t, data);
      if (existing) for (const name of outputs) await writeFile(join(root, name), `original ${name}`);
      failure(data, '', {}, null);
      const mock = mockSources(data, (url, options, body) => failure(data, url, options, body));
      await assert.rejects(generate({ root, ...mock }));
      const files = (await readdir(root)).sort();
      assert.deepEqual(files, (existing ? ['config.json', ...outputs] : ['config.json']).sort());
      if (existing) for (const name of outputs) assert.equal(await readFile(join(root, name), 'utf8'), `original ${name}`);
    }
  });
}

test('optional distribution failure/invalid shape omits its section; rich fields and config fallback work', async t => {
  for (const value of [null, {}, { platforms: 'invalid' }]) {
    const data = clone();
    data.distribution = value;
    delete data.registry.servers[1].server.websiteUrl;
    delete data.registry.servers[1].server.icons;
    const root = await workspace(t, data);
    const result = await generate({ root, ...mockSources(data) });
    assert(!result['README.md'].includes('Where to find it'));
    assert(result['README.md'].includes(data.config.docsUrl));
    assert(result['README.md'].includes(data.config.logoUrl));
  }
  const data = clone();
  data.distribution.title = 'A new public title';
  data.distribution.description = 'A new public description';
  data.distribution.docsUrl = 'https://new.test/docs';
  const root = await workspace(t, data);
  const result = await generate({ root, ...mockSources(data, url => url.endsWith('/distribution') ? new Response('bad') : undefined) });
  assert(!result['README.md'].includes('Where to find it'));
  const rich = await generate({ root, ...mockSources(data) });
  assert(rich['README.md'].includes(data.distribution.title));
  assert(rich['README.md'].includes(data.distribution.description));
  assert(rich['README.md'].includes(data.distribution.docsUrl));
});
