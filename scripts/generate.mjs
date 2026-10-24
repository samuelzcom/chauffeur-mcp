import { mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collect } from './sources.mjs';
import { validateConfig, validateSources } from './validate.mjs';
import { render } from './render.mjs';

export async function generate({ root = fileURLToPath(new URL('../', import.meta.url)), ...options } = {}) {
  const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
  validateConfig(config);
  const data = await collect(config, options);
  validateSources(data);
  const outputs = render(data);
  // Finish rendering and validate every artifact before touching existing outputs.
  for (const [name, content] of Object.entries(outputs)) {
    if (!content.trim()) throw new Error(`Empty output: ${name}`);
    if (name.endsWith('.json')) JSON.parse(content);
  }
  const staging = await mkdtemp(join(tmpdir(), 'public-mcp-mirror-'));
  try {
    if ((await stat(staging)).dev !== (await stat(root)).dev) {
      throw new Error('TMPDIR must be outside the repository on the output filesystem for atomic renames');
    }
    for (const [name, content] of Object.entries(outputs)) await writeFile(join(staging, name), content);
    for (const name of Object.keys(outputs)) await rename(join(staging, name), join(root, name));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return outputs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  generate().then(outputs => console.log(`Generated ${Object.keys(outputs).join(', ')}`)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
