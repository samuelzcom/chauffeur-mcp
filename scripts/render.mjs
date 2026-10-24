const md = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/([\\`*_[\]{}|#])/g, '\\$1').replace(/\r?\n/g, '<br>');
const url = (...values) => values.find(value => {
  try { return typeof value === 'string' && /^https?:$/.test(new URL(value).protocol); } catch { return false; }
});
const link = (label, value) => `[${md(label)}](<${value}>)`;
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const json = value => `${JSON.stringify(sorted(value), null, 2)}\n`;
const code = (language, value) => `\n\`\`\`${language}\n${value.trimEnd()}\n\`\`\`\n`;

export function render(data) {
  const { config, urls, openapi, services, server, distribution, endpoints } = data;
  const richer = distribution && !Array.isArray(distribution) ? distribution : {};
  const text = (...values) => values.find(value => typeof value === 'string' && value.trim());
  const title = text(richer.title, richer.name, openapi.info.title);
  const description = text(richer.description, openapi.info.description);
  const website = url(server.websiteUrl, richer.websiteUrl, config.websiteUrl);
  const docs = url(richer.docsUrl, openapi.externalDocs?.url, server.websiteUrl, config.docsUrl);
  const logo = url(server.icons?.find(icon => url(icon.src))?.src, richer.logoUrl, config.logoUrl);
  const primary = endpoints.find(endpoint => endpoint.path === '') ?? endpoints[0];
  const client = { mcpServers: { [config.slug]: { url: primary.url } } };
  const remote = { mcpServers: { [config.slug]: { command: 'npx', args: ['-y', 'mcp-remote', primary.url] } } };
  const vscode = { servers: { [config.slug]: { type: 'http', url: primary.url } } };
  const sections = [
    `![${md(title)} logo](<${logo}>)\n\n# ${md(title)}`,
    '> Auto-generated from Business-OS (single source of truth) by a daily GitHub Action. Do not edit by hand.',
    md(description),
    `${link('Website', website)} · ${link('Documentation', docs)} · ${link('Repository', `https://github.com/${config.repo}`)}`,
    '## Endpoints\n\nAll endpoints use MCP Streamable HTTP. Tool counts and server versions come from live discovery.\n\n' +
      '| Variant | URL | Server | Version | Tools |\n| --- | --- | --- | --- | ---: |\n' + endpoints.map(endpoint =>
        `| ${md(endpoint.id)} | ${link(endpoint.url, endpoint.url)} | ${md(endpoint.serverInfo.name)} | ${md(endpoint.serverInfo.version)} | ${endpoint.tools.length} |`).join('\n'),
    '## Tools per endpoint',
  ];
  for (const endpoint of endpoints) {
    sections.push(`### ${md(endpoint.id)}\n\n| Tool | Description | Read-only |\n| --- | --- | --- |\n` +
      [...endpoint.tools].sort((a, b) => a.name.localeCompare(b.name, 'en')).map(tool => {
        const readonly = tool.annotations?.readOnlyHint;
        return `| ${md(tool.name)}${tool.title ? ` (${md(tool.title)})` : ''} | ${md(tool.description)} | ${readonly === undefined ? 'Not declared' : readonly ? 'Yes' : 'No'} |`;
      }).join('\n'));
  }
  const zones = new Set([services.timeZone]);
  const areaRows = services.serviceAreas.map(area => {
    const zone = area.timeZone || services.timeZone;
    zones.add(zone);
    const children = area.areas.map(child => {
      if (child.timeZone) zones.add(child.timeZone);
      return `${md(child.label)}${child.timeZone ? ` (${md(child.timeZone)})` : ''}`;
    });
    return `| ${md(area.label)} | ${children.join('; ')} | ${md(zone)} |`;
  });
  sections.push('## Published services, areas and languages\n\n' +
    `Provider: ${md(services.provider)}.\n\n` +
    `Services: ${services.services.map(service => md(service.key)).join(', ')}.\n\n` +
    `Languages: ${services.languages.map(md).join(', ')}.\n\n` +
    `Time zones: ${[...zones].map(md).join(', ')}.\n\n` +
    '| Published area | Included areas | Time zone |\n| --- | --- | --- |\n' + areaRows.join('\n'));
  sections.push('## Install\n\nExamples use the default endpoint. Substitute any URL from the endpoints table to choose another variant.',
    '### Claude Code\n' + code('sh', `claude mcp add --transport http '${config.slug.replace(/'/g, "'\\''")}' '${primary.url.replace(/'/g, "'\\''")}'`) +
      '\n[Client documentation](https://code.claude.com/docs/en/mcp).',
    '### Claude Desktop and other stdio clients\n\nAdd to your client’s MCP configuration. This bridge requires Node.js and downloads `mcp-remote` on the client.\n' + code('json', json(remote)),
    '### Cursor\n\nSave as `.cursor/mcp.json` (also provided in [mcp.json](mcp.json)).\n' + code('json', json(client)) +
      '\n[Client documentation](https://cursor.com/docs/context/mcp).',
    '### VS Code\n\nSave as `.vscode/mcp.json`.\n' + code('json', json(vscode)) +
      '\n[Client documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers).',
    `### ChatGPT / Grok\n\nFor clients/accounts that support custom remote MCP connectors, use this URL in the custom connector setup:\n\n${link(primary.url, primary.url)}`);
  sections.push('## OpenAPI and registry\n\n' +
    `${link('OpenAPI specification', `${urls.publicBase}/openapi.json`)} — ${md(openapi.info.title)}, version ${md(openapi.info.version)}.\n\n` +
    `Registry name: ${md(server.name)}. Latest registry version: ${md(server.version)}.\n\n` +
    `${link('Official MCP Registry', urls.registry)}. [server.json](server.json) mirrors the latest entry’s server object.`);
  sections.push('## Safety and server instructions\n\nThe following instructions are published by each live server. Read-only flags above are the server’s tool annotations.');
  for (const endpoint of endpoints) sections.push(`### ${md(endpoint.id)}\n\n> ${md(endpoint.instructions)}`);
  const platforms = Array.isArray(richer.platforms) ? richer.platforms.filter(platform =>
    platform?.status === 'live' && typeof platform.name === 'string' && platform.name.trim()) : [];
  if (platforms.length) sections.push('## Where to find it\n\n' + platforms.map(platform =>
    `- ${url(platform.evidence_url) ? link(platform.name, platform.evidence_url) : md(platform.name)}`).join('\n'));
  sections.push('## Maintenance\n\nTo change content, change Business-OS (or config.json), not README.\n\n' +
    'The generator uses Node.js 20+ built-ins only; no dependency installation is needed.\n' +
    code('sh', 'node --test tests/*.test.mjs\nnode scripts/generate.mjs') +
    '\nThe daily GitHub Action runs at `04:17 UTC` and commits only changed outputs. It can also be run manually. ' +
    'Required sources must all pass validation before any output is replaced; an unavailable or invalid optional distribution source is omitted. ' +
    'Requests have a 15-second timeout and two retries. Temporary files are staged outside the repository on the same filesystem ' +
    '(set `TMPDIR` if necessary). No per-run timestamps are emitted.\n\n' +
    'Reuse this mirror for another tenant or industry by changing only [config.json](config.json). ' +
    'Endpoint variants and all tenant-specific fallback links live there. LICENSE is rendered from that configuration.',
    `## License\n\n[${md(config.license)}](LICENSE) for this repository’s content. The remote service is operated by ${md(services.provider)}.`);
  return { 'README.md': `${sections.join('\n\n')}\n`, 'server.json': json(server), 'mcp.json': json(client),
    LICENSE: mit(config.copyrightHolder) };
}

function mit(holder) {
  return `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
