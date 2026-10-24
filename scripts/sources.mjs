import { transport, rpcResult } from './transport.mjs';

export function sourceUrls(config) {
  const api = config.apiBase.replace(/\/$/, '');
  const scope = `${encodeURIComponent(config.module)}/${encodeURIComponent(config.slug)}`;
  const publicBase = `${api}/public/${scope}`;
  return {
    publicBase,
    registry: `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(config.registryName)}`,
    endpoints: config.endpointVariants.map(variant => ({ ...variant, url: `${api}/mcp/${scope}${variant.path}` })),
  };
}

async function mcp(request, endpoint) {
  let id = 0;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const call = async (method, params = {}) => {
    const currentId = ++id;
    return request(endpoint.url, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: currentId, method, params }),
    }, (text, type) => rpcResult(text, type, currentId));
  };
  const initialized = await call('initialize', {
    protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'public-readme-mirror', version: '1.0.0' },
  });
  const session = initialized.headers.get('mcp-session-id');
  if (session) headers['Mcp-Session-Id'] = session;
  headers['MCP-Protocol-Version'] = initialized.data.protocolVersion;
  await request(endpoint.url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }, () => null, [200, 202, 204]);
  const tools = [];
  const cursors = new Set();
  let cursor;
  do {
    const page = (await call('tools/list', cursor ? { cursor } : {})).data;
    if (!Array.isArray(page.tools)) throw new Error(`Invalid tools/list: ${endpoint.id}`);
    tools.push(...page.tools);
    cursor = page.nextCursor;
    if (cursor && (typeof cursor !== 'string' || cursors.has(cursor))) throw new Error('Invalid tool cursor');
    cursors.add(cursor);
  } while (cursor);
  return { ...endpoint, ...initialized.data, tools };
}

export async function collect(config, options) {
  const urls = sourceUrls(config);
  const request = transport(options);
  const get = async url => (await request(url)).data;
  // Await every source, including failures, before validation or publication.
  const results = await Promise.allSettled([
    get(`${urls.publicBase}/openapi.json`), get(`${urls.publicBase}/services`),
    get(urls.registry), get(`${urls.publicBase}/distribution`).catch(() => null),
    ...urls.endpoints.map(endpoint => mcp(request, endpoint)),
  ]);
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  const [openapi, services, registry, distribution, ...endpoints] = results.map(result => result.value);
  const entries = registry?.servers?.filter(entry => entry.server?.name === config.registryName &&
    entry._meta?.['io.modelcontextprotocol.registry/official']?.isLatest === true);
  if (entries?.length !== 1) throw new Error('Registry must return exactly one latest entry for registryName');
  return { config, urls, openapi, services, server: entries[0].server, distribution, endpoints };
}
