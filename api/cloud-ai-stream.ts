// SSE streaming proxy to OpenAI (Chat Completions streaming)
export default async function handler(req: any, res: any) {
  console.debug('cloud-ai-stream: incoming request', { method: req.method, url: req.url });

  if (req.method !== 'GET' && req.method !== 'POST') {
    console.warn('cloud-ai-stream: method not allowed', req.method);
    res.status(405).end('Method not allowed');
    return;
  }

  const prompt = (req.query && (req.query.prompt || req.body?.prompt)) || '';
  const model = (req.query && req.query.model) || req.body?.model || process.env.OPENAI_MODEL || 'gpt-4o';
  const temperature = Number((req.query && req.query.temperature) || req.body?.temperature || 0.2);
  const sophistication = (req.query && req.query.sophistication) || req.body?.sophistication || 'very-high';

  console.debug('cloud-ai-stream: parsed params', { model, temperature, sophistication, promptLength: String(prompt).length });

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  const blacklist = /(exploit|ddos|malware|phishing|password cracking|unauthorized access|bypass)/i;
  if (blacklist.test(String(prompt))) {
    res.status(400).json({ error: 'Prompt contains disallowed content.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const endpoint = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    res.status(500).json({ error: 'No LLM API key configured.' });
    return;
  }

  // Set SSE headers and send an initial ping to reduce proxy buffering
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(': connected\n\n');
  try { res.flushHeaders?.(); } catch (e) { /* ignore if not supported */ }

  try {
    const body = {
      model,
      messages: [
        { role: 'system', content: `Sophistication:${sophistication}. You are CloudAi, a helpful assistant. Follow safety policies.` },
        { role: 'user', content: prompt },
      ],
      temperature: temperature || 0.2,
      stream: true,
    } as any;

    console.debug('cloud-ai-stream: fetching upstream', { endpoint, model });
    const openaiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.debug('cloud-ai-stream: upstream response', { status: openaiRes.status, ok: openaiRes.ok });

    if (!openaiRes.ok || !openaiRes.body) {
      const t = await openaiRes.text();
      console.error('cloud-ai-stream: upstream error', t);
      res.write(`data: ${JSON.stringify({ error: 'Upstream error', details: t })}\n\n`);
      res.end();
      return;
    }

    // Helper to send SSE data
    const sendData = (payload: any) => {
      try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (e) { /* ignore */ }
    };

    // Stream chunks from OpenAI to client as SSE `data: {chunk:...}` events
    const reader = (openaiRes.body as any).getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.replace(/^data:\s*/, '');
          if (!trimmed) continue;
          if (trimmed === '[DONE]') {
            res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            return;
          }
          try {
            const parsed = JSON.parse(trimmed);
            const chunk = parsed?.choices?.[0]?.delta?.content || parsed?.choices?.[0]?.text || '';
            if (chunk) {
              console.debug('cloud-ai-stream: sending chunk', { length: String(chunk).length });
              sendData({ chunk });
            }
          } catch (e) {
            console.debug('cloud-ai-stream: forwarding raw chunk');
            sendData({ chunk: trimmed });
          }
        }
      }
    }

    // finished
    res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('cloud-ai-stream: unexpected error', err);
    try { res.write(`data: ${JSON.stringify({ error: err?.message || String(err) })}\n\n`); } catch (e) {}
    res.end();
  }
}
