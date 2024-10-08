import { createParser } from 'eventsource-parser';
import { NextRequest } from 'next/server';

import { requestOpenai } from '../common';

async function createStream(req: NextRequest) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await requestOpenai(req);

  const contentType = res.headers.get('Content-Type') ?? '';
  if (!contentType.includes('stream')) {
    const content = (await res.text()).replace(/provided:.*. You/, 'provided: ***. You');
    console.log('[Stream] error ', content);
    return { body: '```json\n' + content + '```', model: res.headers.get('x-routed-model') };
  }

  return {
    body: new ReadableStream({
      async start(controller) {
        function onParse(event: any) {
          if (event.type === 'event') {
            const data = event.data;
            let json: Record<any, any> = {};

            try {
              json = JSON.parse(data);
            } catch {}

            // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
            if (data === '[DONE]' || json.type === 'message_stop') {
              controller.close();
              return;
            }
            try {
              const text =
                json.choices?.[0]?.text ||
                json.choices?.[0]?.delta?.content ||
                json.delta?.text ||
                '';
              const queue = encoder.encode(text);
              controller.enqueue(queue);
            } catch (e) {
              controller.error(e);
            }
          }
        }

        const parser = createParser(onParse);
        for await (const chunk of res.body as any) {
          parser.feed(decoder.decode(chunk));
        }
      },
    }),
    model: res.headers.get('x-routed-model'),
  };
}

export default async function POST(req: NextRequest) {
  try {
    const { body: stream, model } = await createStream(req);
    const response = new Response(stream);
    response.headers.set('x-routed-model', model || ''); // Adding the "hello" header
    return response;
  } catch (error) {
    console.error('[Chat Stream]', error);
    return new Response(['```json\n', JSON.stringify(error, null, '  '), '\n```'].join(''));
  }
}

export const config = {
  runtime: 'edge',
  regions: ['iad1', 'hnd1'],
  maxDuration: 60,
};
