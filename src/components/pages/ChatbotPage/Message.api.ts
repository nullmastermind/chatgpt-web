import { ChatCompletionResponseMessage } from "openai";
import { findIndex } from "lodash";

const TIME_OUT_MS = 30000;

export type ModelConfig = {
  model: string;
  temperature: number;
  max_tokens: number;
};

const makeRequestParam = (
  messages: Message[],
  options?: {
    filterBot?: boolean;
    stream?: boolean;
  }
): any => {
  let sendMessages = messages.map(v => ({
    role: v.role,
    content: v.content,
  }));

  if (options?.filterBot) {
    sendMessages = sendMessages.filter(m => m.role !== "assistant");
  }

  return {
    messages: sendMessages,
    stream: options?.stream,
  };
};

export type Message = ChatCompletionResponseMessage & {
  date?: string;
  streaming?: boolean;
  isError?: boolean;
  id?: number;
};

export async function requestChatStream(
  messages: Message[],
  options?: {
    token?: string;
    filterBot?: boolean;
    modelConfig?: ModelConfig;
    onMessage: (message: string, done: boolean) => void;
    onError: (error: Error, statusCode?: number) => void;
    onController?: (controller: AbortController) => void;
  }
) {
  const req = {
    ...makeRequestParam(messages, {
      stream: true,
      filterBot: options?.filterBot,
    }),
    ...(options?.modelConfig || {}),
  };

  console.log("[Request] ", req);

  const controller = new AbortController();
  const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);
  const tokens = (options?.token || "").split(",");
  let lastToken = localStorage.getItem(":latestToken");
  let lastTokenIndex = findIndex(tokens, v => v === lastToken);
  let currentToken = tokens[lastTokenIndex + 1];

  if (!currentToken) {
    currentToken = tokens[0];
  }

  try {
    const res = await fetch("/api/chat-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        path: "v1/chat/completions",
        token: currentToken,
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(reqTimeoutId);

    let responseText = "";

    const finish = () => {
      options?.onMessage(responseText, true);
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
        options?.onMessage(responseText, false);

        if (done) {
          break;
        }
      }

      finish();
    } else if (res.status === 401) {
      console.error("Anauthorized");
      options?.onError(new Error("Anauthorized"), res.status);
    } else {
      console.error("Stream Error", res.body);
      options?.onError(new Error("Stream Error"), res.status);
    }
  } catch (err) {
    console.error("NetWork Error", err);
    options?.onError(err as Error);
  }
}
