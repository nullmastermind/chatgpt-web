import { useDebounce, useList, useMap, useMeasure, useMount, useSessionStorage, useUnmount } from "react-use";
import { Avatar, Button, Checkbox, Container, Divider, ScrollArea, Textarea } from "@mantine/core";
import { forwardRef, MutableRefObject, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { clone, cloneDeep, findIndex, forEach, map, throttle } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism } from "@mantine/prism";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import { useCollections, useCurrentCollection, useOpenaiAPIKey } from "@/states/states";
import { convertToSupportLang, detectProgramLang, KeyValue, preprocessMessageContent } from "@/utility/utility";
import TypingBlinkCursor from "@/components/misc/TypingBlinkCursor";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useHotkeys } from "@mantine/hooks";

export type MessageProps = {
  collection: any;
  prompt: {
    id: number;
    name: string;
    prompts: any[];
    temperature: number;
    wrapSingleLine: boolean;
  };
};

type MessageItemType = {
  source: "assistant" | "user";
  content: string;
  checked: boolean;
  id: any;
};

const messageRefs = { current: {} as KeyValue };
const autoScrollIds = { current: {} as KeyValue };

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
  const [doScroll, setDoScroll] = useState(false);

  const scrollToBottom = (offset: number = 0) => {
    const scrollHeight = viewport.current?.scrollHeight || 0;
    const clientHeight = viewport.current?.clientHeight || 0;
    viewport.current?.scrollTo({
      top: scrollHeight - clientHeight - offset,
    });
  };
  const onSend = (content: string) => {
    if (content.length === 0) return;

    if (prompt.wrapSingleLine && !content.includes("\n")) {
      if (!/^".*?"$/.test(content) && !/^'.*?'$/.test(content)) {
        content = `"${content}"`;
      }
    }

    pushMessage(
      {
        source: "user",
        content: content,
        checked: checkedMessages.length > 0,
        id: Date.now() - 1,
      },
      {
        source: "assistant",
        content: "...",
        checked: checkedMessages.length > 0,
        id: Date.now(),
      }
    );
    setDoScroll(true);
  };
  const isBottom = () => {
    if (!viewport.current) return false;
    const scrollHeight = viewport.current?.scrollHeight || 0;
    const clientHeight = viewport.current?.clientHeight || 0;
    const scrollTop = viewport.current?.scrollTop || 0;
    return scrollTop >= scrollHeight - clientHeight;
  };
  const reduceChecked = () => {
    const cloneMessages = clone(messages);
    for (let i = 0; i < cloneMessages.length; i++) {
      if (!cloneMessages[i].checked) continue;
      cloneMessages[i].checked = false;
      if (cloneMessages[i].source === "assistant") {
        break;
      }
    }
    setMessages(cloneMessages);
  };
  const addChecked = () => {
    const cloneMessages = clone(messages);
    for (let i = cloneMessages.length - 1; i >= 0; i--) {
      if (cloneMessages[i].checked) continue;
      cloneMessages[i].checked = true;
      if (cloneMessages[i].source === "user") {
        break;
      }
    }
    setMessages(cloneMessages);
  };
  const checkAll = () => {
    setMessages(
      cloneDeep(messages).map(v => {
        v.checked = true;
        return v;
      })
    );
  };
  const uncheckAll = () => {
    setMessages(
      cloneDeep(messages).map(v => {
        v.checked = false;
        return v;
      })
    );
  };
  const toggleAll = () => {
    if (checkedMessages.length === 0) {
      checkAll();
    } else {
      uncheckAll();
    }
  };

  useUnmount(() => {
    messageRefs.current = {};
    autoScrollIds.current = {};
  });
  useDebounce(
    () => {
      if (messages.length === 0) return;
      if (messages[messages.length - 1].content !== "..." || messages[messages.length - 1].source !== "assistant")
        return;

      const userMessage = messages[messages.length - 2];
      const assistantPreMessage: MessageItemType = messages[messages.length - 1];

      setDoScroll(true);
      setIsDone(assistantPreMessage.id, false);

      const requestMessages: any[] = [];

      forEach(clone(prompt.prompts), prompt => {
        if (prompt === "your") {
          const userMessages = [
            ...checkedMessages.map(v => ({
              role: v.source,
              content: v.content,
            })),
          ];
          if (!messages[messages.length - 2].checked) {
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

      requestChatStream(
        requestMessages.filter(v => {
          return !(v.role === "assistant" && v.content === "...");
        }),
        {
          onMessage(message: string, done: boolean): void {
            saveMessagesThr(message);

            if (messageRefs.current[assistantPreMessage.id]) {
              messageRefs.current[assistantPreMessage.id].editMessage(message, done);
            }
            if (done) {
              saveMessagesFn(message);
              delete messageRefs.current[assistantPreMessage.id];
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
        }
      ).finally();
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
        const maxMessages = parseInt(localStorage.getItem(":maxMessages") || "10");
        const saveMessages = messages.splice(-maxMessages);
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
  useEffect(() => {
    if (doScroll) {
      scrollToBottom();
      setDoScroll(false);
    }
  }, [doScroll]);

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
                      if (instance) messageRefs.current[message.id] = instance;
                    }}
                    key={[message.id, message.checked].join(":")}
                    messages={messages}
                    setMessages={setMessages}
                    message={message}
                    classes={classes}
                    index={index}
                    isBottom={isBottom}
                    scrollToBottom={scrollToBottom}
                    autoScrollIds={autoScrollIds}
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
            className="w-28"
            onClick={() => {
              boxRef.current?.focus();
              toggleAll();
            }}
          >
            {checkedMessages.length === 0 ? "Check all" : "Uncheck all"}
          </Button>
          <Button
            variant="gradient"
            size="xs"
            onClick={() => {
              boxRef.current?.focus();
              addChecked();
            }}
          >
            <IconPlus size="1rem" />
          </Button>
          <Button
            variant="gradient"
            size="xs"
            onClick={() => {
              boxRef.current?.focus();
              reduceChecked();
            }}
          >
            <IconMinus size="1rem" />
          </Button>
          <Divider orientation="vertical" variant="dashed" />
          <FollowScroll
            isBottom={isBottom}
            scrollToBottom={scrollToBottom}
            viewport={viewport}
            focus={() => {
              boxRef.current?.focus();
            }}
          />
        </div>
        <TypeBox
          ref={boxRef}
          collection={collection}
          onSubmit={content => onSend(content)}
          messages={messages}
          addChecked={addChecked}
          reduceChecked={reduceChecked}
          checkAll={checkAll}
          uncheckAll={uncheckAll}
        />
      </div>
    </div>
  );
};

const FollowScroll = ({
  isBottom,
  scrollToBottom,
  viewport,
  focus,
}: {
  isBottom: () => any;
  scrollToBottom: (offset?: number) => any;
  viewport: any;
  focus: () => any;
}) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isCurrentBottom = false;
    const t = setInterval(() => {
      let temp = isBottom();

      if (temp !== isCurrentBottom) {
        isCurrentBottom = temp;
        setChecked(temp);
      }
    }, 42);
    return () => {
      clearInterval(t);
    };
  }, [viewport]);

  return (
    <Checkbox
      color="gradient"
      label="Auto scroll"
      checked={checked}
      onClick={() => {
        if (checked) {
          scrollToBottom(1);
        } else {
          scrollToBottom();
        }
        focus();
      }}
    />
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
      isBottom,
      scrollToBottom,
      autoScrollIds,
    }: {
      classes: any;
      message: any;
      setMessages: any;
      index: any;
      messages: any;
      isBottom: () => boolean;
      scrollToBottom: () => any;
      autoScrollIds: MutableRefObject<KeyValue>;
    },
    ref
  ) => {
    const [message, setMessage] = useState(inputMessage);
    const [isTyping, setIsTyping] = useState(false);
    const [doScrollToBottom, setDoScrollToBottom] = useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      editMessage(newMessage: string, isDone: boolean) {
        messages[index].content = newMessage;
        setMessage({
          ...message,
          content: newMessage,
        });
        setIsTyping(!isDone);
        if (isBottom()) {
          setDoScrollToBottom(true);
        }
      },
    }));
    useEffect(() => {
      if (doScrollToBottom) {
        setDoScrollToBottom(false);
        scrollToBottom();
      }
    }, [doScrollToBottom]);
    useMount(() => {
      if (message.source === "user" && !autoScrollIds.current[message.id]) {
        scrollToBottom();
        autoScrollIds.current[message.id] = true;
      }
    });

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
                        className={classNames("mb-1", classes.codeWrap)}
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
    {
      collection,
      onSubmit,
      messages,
      addChecked,
      reduceChecked,
      checkAll,
      uncheckAll,
    }: {
      collection: any;
      onSubmit: (content: string) => any;
      messages: any[];
      addChecked: () => any;
      reduceChecked: () => any;
      checkAll: () => any;
      uncheckAll: () => any;
    },
    ref
  ) => {
    const [messageContent, setMessageContent] = useSessionStorage<string>(`:messageBox${collection}`, "");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [collections, setCollections] = useCollections();
    const [, setCurrentCollection] = useCurrentCollection();
    const [isFocus, setIsFocus] = useState(false);

    useHotkeys([
      [
        "Enter",
        () => {
          if (!isFocus) {
            inputRef.current?.focus();
          }
        },
      ],
    ]);

    const onSend = () => {
      onSubmit(messageContent);
      setMessageContent("");
    };

    useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.placeholder = [
          isFocus
            ? "Send a message... (Enter = submit, Shift+Enter = \\n, ↑↓ to take previous message)"
            : "Press the {Enter} key to start entering text.",
          "⌘+↑ to add previous messages, and ⌘+↓ to decrease",
          "⌘+shift+↑ / ⌘+shift+↓ to check/uncheck all",
        ].join("\n");
      }
    }, [inputRef, isFocus]);

    return (
      <div className="flex flex-row items-baseline gap-3">
        <Textarea
          ref={inputRef}
          spellCheck={true}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          autoFocus
          placeholder="Send a message..."
          onChange={e => setMessageContent(e.target.value)}
          value={messageContent}
          autosize={true}
          maxRows={3}
          minRows={3}
          className="flex-grow"
          onKeyDown={(e: any) => {
            const isMod = e.ctrlKey || e.metaKey;
            const isCursorEnd = e.target.selectionStart === e.target.value.length;

            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              setMessageContent(messageContent.substring(0, start) + "\t" + messageContent.substring(end));
              e.target.selectionStart = e.target.selectionEnd = start + 1;
            }
            if (e.key === "ArrowUp" && isMod && e.shiftKey) {
              checkAll();
            }
            if (e.key === "ArrowDown" && isMod && e.shiftKey) {
              uncheckAll();
            }
            if (e.key === "ArrowUp" && isMod && !e.shiftKey) {
              addChecked();
            }
            if (e.key === "ArrowDown" && isMod && !e.shiftKey) {
              reduceChecked();
            }
            if (isMod && +e.key >= 1 && +e.key <= 9) {
              e.preventDefault();
              const index = +e.key - 1;
              if (index <= collections.length - 1) {
                setCurrentCollection(collections[index].key);
              }
            }
            if (e.key === "ArrowUp" && !isMod && !e.shiftKey && isCursorEnd) {
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
            if (e.key === "ArrowDown" && !isMod && !e.shiftKey && isCursorEnd) {
              let startScanIndex = 0;
              if (messageContent) {
                startScanIndex = findIndex(messages, m => {
                  return m.source === "user" && m.content === messageContent;
                });
              }
              if (startScanIndex < messages.length - 1 && startScanIndex >= 0) {
                if (messageContent.length > 0) {
                  startScanIndex += 1;
                }
                for (let i = startScanIndex; i < messages.length; i++) {
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
