const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function validateConfig(config) {
  for (const key of ['apiBase', 'module', 'slug', 'registryName', 'websiteUrl', 'docsUrl', 'logoUrl', 'repo', 'copyrightHolder']) {
    requireValue(nonempty(config[key]), `Missing config: ${key}`);
  }
  for (const key of ['apiBase', 'websiteUrl', 'docsUrl', 'logoUrl']) {
    requireValue(/^https?:$/.test(new URL(config[key]).protocol), `Invalid config URL: ${key}`);
  }
  requireValue(config.license === 'MIT', 'Only the MIT license template is supported');
  requireValue(Array.isArray(config.endpointVariants) && config.endpointVariants.length > 0, 'Missing endpoint variants');
  const ids = new Set();
  for (const { id, path } of config.endpointVariants) {
    requireValue(nonempty(id) && !ids.has(id), 'Invalid or duplicate variant id');
    requireValue(typeof path === 'string' && (path === '' || /^\/[\w/-]+$/.test(path)), 'Invalid variant path');
    ids.add(id);
  }
}
export function validateSources({ openapi, services, server, endpoints }) {
  requireValue(nonempty(openapi?.info?.title) && nonempty(openapi?.info?.description) &&
    nonempty(openapi.info.version) && nonempty(openapi.openapi) && object(openapi.paths) &&
    Object.keys(openapi.paths).length > 0 && openapi.servers?.some(item => nonempty(item.url)), 'Invalid OpenAPI');
  requireValue(nonempty(services?.provider) && nonempty(services.timeZone) &&
    Array.isArray(services.languages) && services.languages.length > 0 && services.languages.every(nonempty) &&
    services.services?.length > 0 && services.services.every(item => nonempty(item.key)), 'Invalid services');
  requireValue(services.serviceAreas?.length > 0 && services.serviceAreas.every(area =>
    nonempty(area.label) && Array.isArray(area.areas) && area.areas.every(child => nonempty(child.label))),
  'Missing or invalid published service areas');
  requireValue(nonempty(server?.name) && nonempty(server.title) && nonempty(server.description) &&
    nonempty(server.version), 'Invalid latest registry server');
  for (const endpoint of endpoints) {
    requireValue(nonempty(endpoint.serverInfo?.name) && nonempty(endpoint.serverInfo?.version) &&
      nonempty(endpoint.instructions) && nonempty(endpoint.protocolVersion), `Invalid initialize: ${endpoint.id}`);
    requireValue(endpoint.tools.length > 0 && endpoint.tools.every(tool =>
      nonempty(tool.name) && nonempty(tool.description) &&
      (tool.annotations?.readOnlyHint === undefined || typeof tool.annotations.readOnlyHint === 'boolean')),
    `Missing or invalid tools: ${endpoint.id}`);
    requireValue(new Set(endpoint.tools.map(tool => tool.name)).size === endpoint.tools.length, 'Duplicate tool names');
  }
}
