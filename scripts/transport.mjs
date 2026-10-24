import { setTimeout as delay } from 'node:timers/promises';

export function parseSse(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n\n+/).flatMap(frame => {
    let event = 'message';
    const data = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      if (field === 'data') data.push(value);
    }
    return event === 'message' && data.length ? [JSON.parse(data.join('\n'))] : [];
  });
}

export function rpcResult(text, contentType, id) {
  const messages = contentType.includes('text/event-stream') ? parseSse(text) : [JSON.parse(text)];
  const reply = messages.find(message => message?.id === id && message.jsonrpc === '2.0');
  if (!reply || reply.error || !reply.result) throw new Error(`Invalid JSON-RPC response for id ${id}`);
  return reply.result;
}

export function transport({ fetchImpl = fetch, timeoutMs = 15000, retries = 2, retryDelayMs = 300 } = {}) {
  return async function request(url, options = {}, decode = JSON.parse, statuses = [200]) {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
        if (!statuses.includes(response.status)) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        return { data: decode(text, response.headers.get('content-type') ?? ''), headers: response.headers };
      } catch (error) {
        if (attempt >= retries) throw new Error(`Source failed: ${url}: ${error.message}`, { cause: error });
        await delay(retryDelayMs * (attempt + 1));
      }
    }
  };
}
