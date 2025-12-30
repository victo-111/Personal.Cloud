// Simple Vercel-compatible serverless function that proxies to an LLM.
// Environment variables expected:
// - OPENAI_API_KEY or LLM_API_KEY
// - OPENAI_MODEL (optional, default provided)

export default async function handler(req: any, res: any) {
  // Allow POST for normal requests and GET for simple streaming EventSource clients
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Accept prompt from body (POST) or query (GET EventSource)
  const { prompt: bodyPrompt } = req.body || {};
  const prompt = typeof bodyPrompt === 'string' && bodyPrompt
    ? bodyPrompt
    : (typeof req.query?.prompt === 'string' ? req.query.prompt : undefined);
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Basic safety filter: refuse obviously malicious prompts
  const blacklist = /(exploit|exploitative|attack|ddos|malicious|rootkit|payload|rack|hacking|bypass|unauthorized|phishing|sql injection|xss)/i;
  if (blacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt contains disallowed content. This assistant only provides defensive, lawful guidance.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const model = req.body?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : (process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.2);
  const endpoint = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const wantStream = !!(req.body?.stream || req.query?.stream);

  if (!apiKey) {
    res.status(500).json({ error: 'No LLM API key configured (OPENAI_API_KEY or LLM_API_KEY).' });
    return;
  }

  try {
    const systemMsg = {
      role: 'system',
      content:
        'You are Anon Ai, a defensive cybersecurity assistant. Provide high-level, lawful, ethical guidance only. Refuse to provide steps that enable illegal activity, exploitation, or unauthorized access. Provide tool recommendations and defensive best practices.'
    };

    if (wantStream) {
      // Stream via SSE to client
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('\n');

      const body = {
        model,
        messages: [systemMsg, { role: 'user', content: prompt }],
        temperature,
        stream: true,
      } as any;

      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!upstream.ok || !upstream.body) {
        const t = await upstream.text();
        res.write(`data: ${JSON.stringify({ error: 'Upstream error', details: t })}\n\n`);
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
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
              if (chunk) res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            } catch (e) {
              res.write(`data: ${JSON.stringify({ chunk: trimmed })}\n\n`);
            }
          }
        }
      }

      // finalize
      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // non-stream path
    const body = {
      model,
      messages: [systemMsg, { role: 'user', content: prompt }],
      max_tokens: 800,
      temperature,
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(502).json({ error: 'Upstream LLM error', details: text });
      return;
    }

    const data: unknown = await r.json();

    // Type guards to safely inspect the unknown JSON returned by the upstream LLM
    const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;
    const isString = (v: unknown): v is string => typeof v === 'string';

    let text = '';
    if (isObject(data)) {
      const choices = data.choices;
      if (Array.isArray(choices) && choices[0]) {
        const c = choices[0] as Record<string, any>;
        if (isObject(c.message) && isString(c.message.content)) {
          text = c.message.content;
        } else if (isString(c.text)) {
          text = c.text;
        } else if (isObject(c.delta) && isString(c.delta.content)) {
          text = c.delta.content;
        }
      } else if (isString(data.output) || isString(data.response)) {
        text = (data.output as string) || (data.response as string);
      } else {
        try {
          text = JSON.stringify(data);
        } catch {
          text = String(data);
        }
      }
    } else {
      text = String(data);
    }

    res.status(200).json({ text });
  } catch (err: any) {
    res.status(500).json({ error: 'Proxy failed', details: err?.message || String(err) });
  }
}
