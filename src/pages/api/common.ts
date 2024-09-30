import { NextRequest } from 'next/server';

const OPENAI_URL = 'api.openai.com';
const CLAUDE_URL = 'api.anthropic.com';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;

export async function requestOpenai(req: NextRequest) {
  const clonedReq = req.clone();
  const reqBody = await clonedReq.json();
  const apiKey = req.headers.get('token') || process.env.TRIAL_OPENAI_KEY;
  let openaiPath = req.headers.get('path');
  let baseUrl = (reqBody.overrideBaseUrl || BASE_URL).replace('https://', '');
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  console.log('[Proxy] ', openaiPath);

  if (!reqBody.overrideBaseUrl) {
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
        const systems = messages.filter((v) => v.role === 'system').map((v) => v.content);

        // Process messages to ensure alternating roles
        const processedMessages = messages
          .filter((v) => v.role !== 'system')
          .reduce((acc: any[], message, index) => {
            if (index === 0 || message.role !== acc[acc.length - 1].role) {
              acc.push(message);
            } else {
              acc[acc.length - 1].content += '\n\n' + message.content;
            }
            return acc;
          }, []);

        reqBody.messages = processedMessages.map((v) => ({
          role: v.role,
          content: v.content,
        }));

        if (systems.length) {
          reqBody.system = systems.join('\n\n');
        }

        if (!reqBody.max_tokens) {
          reqBody.max_tokens = 4096;
        }
      }
    } catch (error) {
      console.error('Error processing request:', error);
    }
  }

  delete reqBody.overrideBaseUrl;
  delete reqBody.insertModel;

  return fetch(`${PROTOCOL}://${baseUrl}/${openaiPath}`, {
    headers,
    method: req.method,
    body: JSON.stringify(reqBody),
  });
}
