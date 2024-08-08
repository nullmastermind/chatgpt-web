import { NextRequest } from 'next/server';

const OPENAI_URL = 'api.openai.com';
const CLAUDE_URL = 'api.anthropic.com';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;

export async function requestOpenai(req: NextRequest) {
  const apiKey = req.headers.get('token') || process.env.TRIAL_OPENAI_KEY;
  let openaiPath = req.headers.get('path');
  let baseUrl = BASE_URL;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  console.log('[Proxy] ', openaiPath);

  const clonedReq = req.clone();
  const reqBody = await clonedReq.json();

  try {
    if (reqBody.model.startsWith('claude-')) {
      baseUrl = CLAUDE_URL;
      openaiPath = 'v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': `${apiKey}`,
        'anthropic-version': '2023-06-01',
      };
      const messages: any[] = reqBody.messages || [];
      reqBody.messages = messages
        .filter((v) => v.role !== 'system')
        .map((v) => ({
          role: v.role,
          content: v.content,
        }));
      const systems = messages.filter((v) => v.role === 'system').map((v) => v.content);

      if (systems.length) {
        reqBody.system = systems.join('\n\n');
      }

      if (!reqBody.max_tokens) {
        reqBody.max_tokens = 4096;
      }
    }
  } catch {}

  return fetch(`${PROTOCOL}://${baseUrl}/${openaiPath}`, {
    headers,
    method: req.method,
    body: JSON.stringify(reqBody),
  });
}
