import { useDebounce, useList, useMap, useMeasure, useMount, useSessionStorage, useSetState } from "react-use";
import { Avatar, Button, Checkbox, Container, ScrollArea, Textarea, Tooltip } from "@mantine/core";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { clone, debounce, find, findIndex, forEach, map, throttle } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism } from "@mantine/prism";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import { useOpenaiAPIKey } from "@/states/states";
import {
  convertToSupportLang,
  detectProgramLang,
  KeyValue,
  KeyValues,
  preprocessMessageContent,
} from "@/utility/utility";
import TypingBlinkCursor from "@/components/misc/TypingBlinkCursor";

export type MessageProps = {
  collection: any;
  prompt: {
    id: number;
    name: string;
    prompts: any[];
    temperature: number;
  };
};

type MessageItemType = {
  source: "assistant" | "user";
  content: string;
  checked: boolean;
  id: any;
};

// noinspection ES6ConvertVarToLetConst
var messageRefs: KeyValue = {};

const Message = ({ collection, prompt }: MessageProps) => {
  const { classes } = useStyles();
  const [containerRef, { height: containerHeight, width: containerWidth }] = useMeasure();
  const viewport = useRef<HTMLDivElement>(null);
  const [openaiAPIKey] = useOpenaiAPIKey();
  const [messages, { push: pushMessage, updateAt: updateMessage, removeAt: removeMessage, set: setMessages }] =
    useList<MessageItemType>(
      JSON.parse(
        localStorage.getItem(`:messages${collection}`) ||
          JSON.stringify([
            {
              source: "assistant",
              content: "Hello! How can I assist you today?",
              id: Date.now(),
            },
          ])
      )
    );
  const [isDone, { set: setIsDone, setAll: setAllIsDone }] = useMap<{
    [key: string]: boolean;
  }>({});
  const allDone = useMemo(() => {
    let temp = true;
    forEach(isDone, (value, key) => {
      if (!value) {
        temp = false;
        return false;
      }
    });
    return temp;
  }, [isDone]);
  const checkedMessages = useMemo(() => {
    return messages.filter(v => v.checked);
  }, [messages]);
  const boxRef = useRef<any>(null);

  const scrollToBottom = (smooth?: boolean) => {
    viewport.current?.scrollTo({
      top: viewport.current?.scrollHeight,
      // behavior: smooth ? "smooth" : "auto",
    });
  };
  const onSend = (content: string) => {
    if (content.length === 0) return;
    pushMessage({
      source: "user",
      content: content,
      checked: messages[messages.length - 1].checked,
      id: Date.now(),
    });
    setTimeout(() => scrollToBottom(true));
  };
  const isBottom = () => {
    if (!viewport.current) return false;
    const scrollHeight = viewport.current?.scrollHeight || 0;
    const clientHeight = viewport.current?.clientHeight || 0;
    const scrollTop = viewport.current?.scrollTop || 0;
    return scrollTop >= scrollHeight - clientHeight;
  };

  useMount(() => {
    messageRefs = {};
  });
  useDebounce(
    () => {
      if (messages.length === 0) return;
      if (messages[messages.length - 1].source !== "user") return;

      const userMessage = messages[messages.length - 1];
      const currentIndex = messages.length;
      const assistantPreMessage: MessageItemType = {
        source: "assistant",
        content: "...",
        checked: messages[messages.length - 1].checked,
        id: Date.now(),
      };

      pushMessage(assistantPreMessage);
      setIsDone(assistantPreMessage.id, false);
      setTimeout(() => scrollToBottom());

      const requestMessages: any[] = [];

      forEach(clone(prompt.prompts), prompt => {
        if (prompt === "your") {
          const userMessages = [
            ...checkedMessages.map(v => ({
              role: v.source,
              content: v.content,
            })),
          ];
          if (!messages[messages.length - 1].checked) {
            userMessages.push({
              role: "user",
              content: userMessage.content,
            });
          }
          forEach(userMessages, uMessage => {
            requestMessages.push({
              role: uMessage.role,
              content: uMessage.content,
            });
          });
        } else {
          requestMessages.push({
            role: prompt.role,
            content: prompt.prompt,
          });
        }
      });

      const saveMessagesFn = (message: string) => {
        const dbMessages = JSON.parse(localStorage.getItem(`:messages${collection}`) || "[]");
        const dbMsgIndex = findIndex(dbMessages, (v: any) => v.id === assistantPreMessage.id);
        if (dbMsgIndex >= 0) {
          dbMessages[dbMsgIndex].content = message;
          localStorage.setItem(`:messages${collection}`, JSON.stringify(dbMessages));
        }
      };
      const saveMessagesThr = throttle((message: string) => {
        saveMessagesFn(message);
      }, 1000);

      requestChatStream(requestMessages, {
        onMessage(message: string, done: boolean): void {
          saveMessagesThr(message);

          if (isBottom()) {
            setTimeout(() => scrollToBottom(), 13);
          }
          if (messageRefs[assistantPreMessage.id]) {
            messageRefs[assistantPreMessage.id].editMessage(message, done);
          }
          if (done) {
            saveMessagesFn(message);
            delete messageRefs[assistantPreMessage.id];
            setIsDone(assistantPreMessage.id, true);
          }
        },
        token: openaiAPIKey,
        modelConfig: {
          model: "gpt-3.5-turbo",
          temperature: prompt.temperature,
          max_tokens: 1000,
        },
        onController(controller: AbortController): void {},
        onError(error: Error, statusCode: number | undefined): void {
          console.log("error", error);
        },
      }).finally();
    },
    42,
    [messages, checkedMessages, viewport, collection]
  );
  useDebounce(
    () => {
      if (messages.length > 0) {
        localStorage.setItem(`:messages${collection}`, JSON.stringify(messages));
      }
    },
    42,
    [messages]
  );
  useEffect(() => {
    scrollToBottom();
  }, [containerHeight]);
  useDebounce(
    () => {
      if (Object.keys(isDone).length === 0) return;
      let canSave = true;
      forEach(isDone, value => {
        if (!value) {
          canSave = false;
          return false;
        }
      });
      if (canSave) {
        const saveMessages = messages.splice(-10);
        localStorage.setItem(`:messages${collection}`, JSON.stringify(saveMessages));
        setMessages(saveMessages);
        setAllIsDone({});
      }
    },
    42,
    [isDone, messages]
  );
  useEffect(() => {
    boxRef.current?.focus();
  }, [boxRef, messages]);

  return (
    <div className="h-full w-full flex flex-col gap-3">
      <div className="flex-grow relative" ref={containerRef as any}>
        {containerHeight > 0 && (
          <ScrollArea
            h={containerHeight}
            scrollHideDelay={0}
            scrollbarSize={10}
            viewportRef={viewport}
            offsetScrollbars={false}
          >
            <Container size="sm" className="mb-5 mt-5">
              {map(messages, (message, index) => {
                return (
                  <MessageItem
                    ref={instance => {
                      if (instance) messageRefs[message.id] = instance;
                    }}
                    key={[message.id, message.checked].join(":")}
                    messages={messages}
                    setMessages={setMessages}
                    message={message}
                    classes={classes}
                    index={index}
                  />
                );
              })}
            </Container>
          </ScrollArea>
        )}
      </div>
      <div className="flex flex-col gap-3 p-3 pt-0 m-auto w-full max-w-3xl">
        <div className="flex flex-row gap-3 items-center">
          <div>
            <b>{checkedMessages.length}</b> checked messages
          </div>
          <Button
            variant="gradient"
            size="xs"
            disabled={checkedMessages.length === 0 || !allDone}
            onClick={() => {
              boxRef.current?.focus();
              setMessages(
                clone(
                  messages.map(v => {
                    v.checked = false;
                    return v;
                  })
                )
              );
            }}
          >
            Uncheck all
          </Button>
          <Button
            variant="gradient"
            size="xs"
            onClick={() => {
              boxRef.current?.focus();
              const cloneMessages = clone(messages);
              for (let i = cloneMessages.length - 1; i >= 0; i--) {
                if (cloneMessages[i].checked) continue;
                cloneMessages[i].checked = true;
                if (cloneMessages[i].source === "user") {
                  break;
                }
              }
              setMessages(cloneMessages);
            }}
            disabled={!allDone}
          >
            Check previous
          </Button>
        </div>
        <TypeBox ref={boxRef} collection={collection} onSubmit={content => onSend(content)} messages={messages} />
      </div>
    </div>
  );
};

const MessageItem = forwardRef(
  (
    {
      classes,
      message: inputMessage,
      setMessages,
      index,
      messages,
    }: {
      classes: any;
      message: any;
      setMessages: any;
      index: any;
      messages: any;
    },
    ref
  ) => {
    const [message, setMessage] = useState(inputMessage);
    const [isTyping, setIsTyping] = useState(false);

    useImperativeHandle(ref, () => ({
      editMessage(newMessage: string, isDone: boolean) {
        messages[index].content = newMessage;
        setMessage({
          ...message,
          content: newMessage,
        });
        setIsTyping(!isDone);
      },
    }));

    return (
      <div
        className={classNames("flex flex-row gap-3 items-start p-3 rounded", {
          [classes.messageBotBg]: message.source === "assistant",
        })}
      >
        <Checkbox
          size="md"
          checked={message.checked}
          onChange={e => {
            messages[index].checked = e.target.checked;
            setMessages(clone(messages));
          }}
        />
        <Avatar src={message.source === "assistant" ? "/assets/bot.jpg" : undefined}>{message.source}</Avatar>
        <div
          className={classNames("flex-grow")}
          style={{
            maxWidth: "36rem",
          }}
        >
          <div className={classes.messageContent}>
            {message.content !== "..." && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    if (inline) {
                      return <code className={classes.inlineCode}>{String(children).replace(/\n$/, "")}</code>;
                    }
                    const match = /language-(\w+)/.exec(className || "");
                    let lang: any = "javascript";

                    if (!match) {
                      try {
                        lang = detectProgramLang(String(children).replace(/\n$/, ""));
                      } catch (e) {}
                    } else {
                      lang = match[1] as any;
                    }

                    return (
                      <Prism
                        children={String(children).replace(/\n$/, "")}
                        language={convertToSupportLang(lang)}
                        scrollAreaComponent={ScrollArea}
                        className="mb-1"
                      />
                    );
                  },
                }}
              >
                {preprocessMessageContent(message.content)}
              </ReactMarkdown>
            )}
            {(isTyping || message.content === "...") && <TypingBlinkCursor />}
          </div>
        </div>
      </div>
    );
  }
);

const TypeBox = forwardRef(
  (
    { collection, onSubmit, messages }: { collection: any; onSubmit: (content: string) => any; messages: any[] },
    ref
  ) => {
    const [messageContent, setMessageContent] = useSessionStorage<string>(`:messageBox${collection}`, "");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const onSend = () => {
      onSubmit(messageContent);
      setMessageContent("");
    };

    useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current?.focus();
      },
    }));

    return (
      <div className="flex flex-row items-baseline gap-3">
        <Textarea
          ref={inputRef}
          autoFocus
          placeholder="Send a message..."
          onChange={e => setMessageContent(e.target.value)}
          value={messageContent}
          autosize={true}
          maxRows={3}
          minRows={3}
          className="flex-grow"
          onKeyDown={e => {
            if (e.key === "ArrowUp" && !e.ctrlKey && !e.shiftKey) {
              let startScanIndex = messages.length - 1;
              if (messageContent) {
                startScanIndex = findIndex(messages, m => {
                  return m.source === "user" && m.content === messageContent;
                });
              }
              if (startScanIndex > 0) {
                for (let i = startScanIndex - 1; i >= 0; i--) {
                  if (messages[i].source === "user") {
                    e.preventDefault();
                    setMessageContent(messages[i].content);
                    break;
                  }
                }
              }
            }
            if (e.key === "ArrowDown" && !e.ctrlKey && !e.shiftKey) {
              let startScanIndex = 0;
              if (messageContent) {
                startScanIndex = findIndex(messages, m => {
                  return m.source === "user" && m.content === messageContent;
                });
              }
              if (startScanIndex < messages.length - 1) {
                for (let i = startScanIndex + 1; i < messages.length; i++) {
                  if (messages[i].source === "user") {
                    e.preventDefault();
                    setMessageContent(messages[i].content);
                    break;
                  }
                }
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              onSend();
              e.preventDefault();
              e.stopPropagation();
            }
            if (e.key === "Tab") {
              if (/[^a-zA-Z0-9]/.test(messageContent)) {
                e.preventDefault();
              }
            }
          }}
        />
        <Button
          onClick={() => {
            inputRef.current?.focus();
            onSend();
          }}
          variant="gradient"
        >
          Send
        </Button>
      </div>
    );
  }
);

export default Message;
