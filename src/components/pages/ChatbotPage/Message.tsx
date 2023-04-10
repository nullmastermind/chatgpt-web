import { useDebounce, useList, useMap, useMeasure, useSessionStorage, useSetState } from "react-use";
import { Avatar, Button, Checkbox, ScrollArea, Textarea, Tooltip } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { clone, find, findIndex, forEach, map } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism } from "@mantine/prism";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import { useOpenaiAPIKey } from "@/states/states";
import { convertToSupportLang, detectProgramLang, preprocessMessageContent } from "@/utility/utility";

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

      requestChatStream(requestMessages, {
        onMessage(message: string, done: boolean): void {
          updateMessage(currentIndex, {
            source: "assistant",
            content: message,
            checked: assistantPreMessage.checked,
            id: assistantPreMessage.id,
          });
          scrollToBottom();
          if (done) {
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
    [messages, checkedMessages]
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
      forEach(isDone, (value, key) => {
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
            {map(messages, (message, index) => {
              return (
                <div
                  key={index + message.source}
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
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="h-5" />
          </ScrollArea>
        )}
      </div>
      <div className={"flex flex-col gap-3"}>
        <div className="flex flex-row gap-3 items-center">
          <div>
            <b>{checkedMessages.length}</b> checked messages
          </div>
          <Button
            variant="gradient"
            size="xs"
            disabled={checkedMessages.length === 0 || !allDone}
            onClick={() => {
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
        <TypeBox collection={collection} onSubmit={content => onSend(content)} />
      </div>
    </div>
  );
};

const TypeBox = ({ collection, onSubmit }: { collection: any; onSubmit: (content: string) => any }) => {
  const [messageContent, setMessageContent] = useSessionStorage<string>(`:messageBox${collection}`, "");

  const onSend = () => {
    onSubmit(messageContent);
    setMessageContent("");
  };

  return (
    <div className="flex flex-row items-baseline gap-3">
      <Textarea
        placeholder="Send a message..."
        onChange={e => setMessageContent(e.target.value)}
        value={messageContent}
        autosize={true}
        maxRows={3}
        minRows={3}
        className="flex-grow"
        onKeyDown={e => {
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
      <Button onClick={() => onSend()} variant="gradient">
        Send
      </Button>
    </div>
  );
};

export default Message;
