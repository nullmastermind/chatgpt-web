import { findIndex } from 'lodash';

const TIME_OUT_MS = 30000;
let TOKEN_TIMEOUT: any = -1;

export type ModelConfig = {
  model: string;
  temperature: number;
  max_tokens?: number;
  seed?: number;
};

const makeRequestParam = (
  path: APIPath,
  messages: Message[],
  options?: {
    filterBot?: boolean;
    stream?: boolean;
  },
): any => {
  if (path === 'v1/completions') {
    return {
      prompt: messages
        .map((v) => v.content)
        .join('\n\n')
        .trim(),
      stream: options?.stream,
    };
  }
  let sendMessages = messages.map((v) => ({
    role: v.role,
    content: v.content,
    name: v.name || undefined,
  }));

  if (options?.filterBot) {
    sendMessages = sendMessages.filter((m) => m.role !== 'assistant');
  }

  return {
    messages: sendMessages,
    stream: options?.stream,
  };
};

export type Message = any & {
  date?: string;
  streaming?: boolean;
  isError?: boolean;
  id?: number;
  name?: string;
};

export type APIPath = 'v1/chat/completions' | 'v1/completions';

export async function requestChatStream(
  path: APIPath,
  messages: Message[] | string[] | string,
  options?: {
    token?: string;
    filterBot?: boolean;
    modelConfig?: ModelConfig;
    onMessage: (message: string, done: boolean, model?: string) => void;
    onError: (error: Error, statusCode?: number) => void;
    onController?: (controller: AbortController) => void;
    insertModel?: boolean;
  },
) {
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  messages = messages.map((message) => {
    if (typeof message === 'string') {
      return {
        role: 'system',
        content: message,
      } as Message;
    }
    return message;
  }) as Message[];
  const req = {
    ...makeRequestParam(path, messages, {
      stream: true,
      filterBot: options?.filterBot,
    }),
    ...(options?.modelConfig || {}),
    insertModel: options?.insertModel,
  };

  console.log('[Request] ', req);

  const controller = new AbortController();
  const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);
  const tokens = (options?.token || '').split(',');
  let lastToken = localStorage.getItem(':latestToken');
  let lastTokenIndex = findIndex(tokens, (v) => v === lastToken);
  let currentToken = tokens[lastTokenIndex + 1];

  if (!currentToken) {
    currentToken = tokens[0];
  }

  localStorage.setItem(':latestToken', currentToken || '');
  clearTimeout(TOKEN_TIMEOUT);
  TOKEN_TIMEOUT = setTimeout(() => localStorage.removeItem(':latestToken'), 1000 * 60);

  Object.assign(req, {
    overrideBaseUrl: localStorage.getItem(':overrideBaseUrl'),
  });

  try {
    const res = await fetch('/api/chat-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'path': path || 'v1/chat/completions',
        'token': currentToken,
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(reqTimeoutId);

    let responseText = '';

    const finish = () => {
      options?.onMessage(
        responseText,
        true,
        res.headers.get('x-routed-model') || options?.modelConfig?.model || '',
      );
      controller.abort();
    };

    if (res.ok) {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      options?.onController?.(controller);

      while (true) {
        // handle time out, will stop if no response in 10 secs
        const resTimeoutId = setTimeout(() => finish(), TIME_OUT_MS);
        const content = await reader?.read();
        clearTimeout(resTimeoutId);
        const text = decoder.decode(content?.value);
        responseText += text;

        const done = !content || content.done;
        options?.onMessage(
          responseText,
          false,
          res.headers.get('x-routed-model') || options?.modelConfig?.model || '',
        );

        if (done) {
          break;
        }
      }

      finish();
    } else if (res.status === 401) {
      console.error('Unauthorized');
      options?.onError(new Error('Unauthorized'), res.status);
    } else {
      console.error('Stream Error', res.body);
      options?.onError(new Error('Stream Error'), res.status);
    }
  } catch (err) {
    console.error('NetWork Error', err);
    options?.onError(err as Error);
  }
}
