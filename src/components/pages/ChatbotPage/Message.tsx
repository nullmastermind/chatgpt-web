import { useCopyToClipboard, useDebounce, useList, useMap, useMeasure, useMount, useUnmount } from "react-use";
import { ActionIcon, Avatar, Badge, Button, Container, Modal, ScrollArea, Text, Tooltip } from "@mantine/core";
import React, { forwardRef, MutableRefObject, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { clone, cloneDeep, find, findIndex, forEach, map, throttle, uniqBy, uniqueId } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism } from "@mantine/prism";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import { useCollections, useCurrentCollection, useModel, useOpenaiAPIKey } from "@/states/states";
import {
  convertToSupportLang,
  detectProgramLang,
  doc2ChatContent,
  Docs,
  filterDocs,
  KeyValue,
  Node,
  postprocessAnswer,
  preprocessMessageContent,
  unWrapRawContent,
  wrapRawContent,
} from "@/utility/utility";
import TypingBlinkCursor from "@/components/misc/TypingBlinkCursor";
import { IconCopy } from "@tabler/icons-react";
import ReplyItem from "@/components/pages/ChatbotPage/ReplyItem";
import { TypeBox } from "@/components/pages/ChatbotPage/TypeBox";
import DateInfo from "@/components/pages/ChatbotPage/DateInfo";
import { useDisclosure, useIdle } from "@mantine/hooks";
import axios from "axios";
import { indexerHost } from "@/config";

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

export type MessageItemType = {
  source: "assistant" | "user";
  content: string;
  checked: boolean;
  id: any;
  date: any;
  isChild: boolean;
  scrollToBottom: boolean;
  tokens: number;
  docId?: string;
  docs?: string[];
};

const messageRefs = { current: {} as KeyValue };
const autoScrollIds = { current: {} as KeyValue };
const doneMessages = { current: {} as KeyValue };

const Message = ({ collection, prompt }: MessageProps) => {
  const { classes } = useStyles();
  const [containerRef, { height: containerHeight }] = useMeasure();
  const viewport = useRef<HTMLDivElement>(null);
  const [openaiAPIKey] = useOpenaiAPIKey();
  const [messages, { push: pushMessage, set: setMessages, insertAt: insertMessage }] = useList<MessageItemType>(
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
  const checkedMessages = useMemo(() => {
    return messages.filter(v => v.checked);
  }, [messages]);
  const boxRef = useRef<any>(null);
  const [doScroll, setDoScroll] = useState(false);
  const [streamMessageIndex, setStreamMessageIndex] = useState(-1);
  const [includes, setIncludes] = useState<MessageItemType[]>([]);
  const [model] = useModel();
  const isIdle = useIdle(60000);
  const messagesList = useMemo<MessageItemType[][]>(() => {
    const result: any[] = [];
    let replyMessages0: any[] = [];
    forEach(messages, (message, index) => {
      let isChild = false;
      if ((index > 0 && message.source === "assistant") || message.isChild) {
        isChild = true;
      }
      const showReplyBox = !isChild && index > 0;

      message.isChild = isChild;

      if (index === messages.length - 1) {
        replyMessages0.push(message);
      }

      if (showReplyBox || index === messages.length - 1) {
        if (replyMessages0.length > 0) {
          replyMessages0[0].isChild = false;
        }
        result.push(clone(replyMessages0));
      }

      if (showReplyBox) {
        replyMessages0 = [];
      }

      replyMessages0.push(message);
    });

    return result;
  }, [messages]);

  const scrollToBottom = (offset: number = 0) => {
    const scrollHeight = viewport.current?.scrollHeight || 0;
    const clientHeight = viewport.current?.clientHeight || 0;
    viewport.current?.scrollTo({
      top: scrollHeight - clientHeight - offset,
    });
  };
  const onSend = async (
    content: string,
    index?: number,
    includeMessages?: MessageItemType[],
    tokens?: number,
    docId?: string
  ) => {
    if (content.length === 0) return;

    if (docId === "Choose document" || docId === "") docId = undefined;

    const userMessage: MessageItemType = {
      source: "user",
      content: content,
      checked: checkedMessages.length > 0,
      id: Date.now() - 1,
      date: new Date(),
      isChild: false,
      scrollToBottom: true,
      tokens: tokens || 0,
      docId: docId,
    };
    const assistantMessage: MessageItemType = {
      source: "assistant",
      content: "...",
      checked: checkedMessages.length > 0,
      id: Date.now(),
      date: new Date(),
      isChild: true,
      scrollToBottom: true,
      tokens: tokens || 0,
    };

    if (index !== undefined && index >= 0) {
      userMessage.isChild = true;

      if (index < messages.length) {
        userMessage.scrollToBottom = false;
        assistantMessage.scrollToBottom = false;
      }

      insertMessage(index, assistantMessage);
      insertMessage(index, userMessage);
      setStreamMessageIndex(index + 1);
      setIncludes(includeMessages || []);
    } else {
      pushMessage(userMessage, assistantMessage);
      setStreamMessageIndex(-1);
      setDoScroll(true);
      setIncludes([]);
    }
  };
  const isBottom = () => {
    if (!viewport.current) return false;
    const scrollHeight = viewport.current?.scrollHeight || 0;
    const clientHeight = viewport.current?.clientHeight || 0;
    const scrollTop = viewport.current?.scrollTop || 0;
    return scrollTop >= scrollHeight - clientHeight;
  };
  const focusTextBox = () => {
    boxRef.current?.focus();
  };
  const saveSplitMessages = () => {
    doneMessages.current = {};

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
  };

  useUnmount(() => {
    messageRefs.current = {};
    autoScrollIds.current = {};
    saveSplitMessages();
  });
  useDebounce(
    async () => {
      if (messages.length === 0) return;

      let streamIndex = streamMessageIndex === -1 ? messages.length : streamMessageIndex + 1;

      if (streamIndex > messages.length) {
        streamIndex = messages.length;
      }

      if (messages[streamIndex - 1].content !== "..." || messages[streamIndex - 1].source !== "assistant") return;

      const userMessage = messages[streamIndex - 2];
      const assistantPreMessage: MessageItemType = messages[streamIndex - 1];

      if (userMessage.docId) {
        try {
          const {
            data: query,
          }: {
            data: Docs;
          } = await axios.post(`${indexerHost}/api/query`, {
            doc_id: userMessage.docId,
            query: userMessage.content,
            apiKey: openaiAPIKey.split(",")[0],
            // maxScore: includes.length > 0 ? 0.4 : 0.45,
            k: includes.length > 0 ? 3 : 5,
          });

          messages[streamIndex - 2].docs = map(filterDocs(query.data, 0.05), value => {
            return doc2ChatContent(value[0]);
          });
          userMessage.docs = messages[streamIndex - 2].docs;
        } catch (e) {}

        messages[streamIndex - 2].docId = undefined;
        userMessage.docId = undefined;
      }

      if (streamIndex === messages.length) {
        setDoScroll(true);
      }

      setIsDone(assistantPreMessage.id, false);

      const requestMessages: any[] = [];

      forEach(clone(prompt.prompts), prompt => {
        if (prompt === "your") {
          const userMessages = [
            ...map(includes, v => {
              const rs = [
                {
                  role: v.source,
                  content: v.content,
                },
              ] as any[];
              if (Array.isArray(v.docs) && v.docs.length) {
                rs.unshift(
                  ...map(v.docs, doc => {
                    return {
                      role: "system",
                      content: doc,
                    };
                  })
                );
              }
              return rs;
            }).flat(),
            ...checkedMessages.map(v => ({
              role: v.source,
              content: v.content,
            })),
            ...map(userMessage.docs, doc => {
              return {
                role: "system",
                content: doc,
              };
            }),
          ];
          if (!messages[streamIndex - 2].checked) {
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

      // choose model
      let autoModel = model;
      if (autoModel.startsWith("auto")) {
        const { data: reqTokens } = await axios.post("/api/tokens", {
          content: requestMessages.map(v => v.content).join(""),
        });
        const countTokens = +reqTokens.data;
        const [, model1, model2, switchValue] = autoModel.split("|");

        if (countTokens > +switchValue) {
          autoModel = model2;
        } else {
          autoModel = model1;
        }
      }

      const apiMessages = requestMessages
        .filter(v => {
          return !(v.role === "assistant" && v.content === "...");
        })
        .map(v => {
          if (v.role === "user") {
            // if (prompt.wrapSingleLine && !content.includes("\n")) {
            if (prompt.wrapSingleLine) {
              // if (!/^".*?"$/.test(v.content) && !/^'.*?'$/.test(v.content)) {
              //   v.content = `"${v.content.replace(/"/g, '\\"')}"`;
              //   // content = JSON.stringify(content);
              // }
              v.content = wrapRawContent(v.content);
            }
          }
          return v;
        });

      requestChatStream(
        "v1/chat/completions",
        uniqBy(apiMessages, v => {
          const b = v.role === "system" ? v.role : uniqueId("apiMessages");
          return [v.content, b].join(":");
        }),
        {
          onMessage(message: string, done: boolean): void {
            if (done) {
              message = postprocessAnswer(message, done);
              if (prompt.wrapSingleLine) {
                message = unWrapRawContent(message);
              }
            }

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
            model: autoModel,
            temperature: prompt.temperature,
          },
          onController(): void {},
          onError(error: Error): void {
            console.log("error", error);
          },
        }
      ).finally();
    },
    42,
    [messages, checkedMessages, viewport, collection, streamMessageIndex, includes, model]
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
      if (!isIdle) return;
      saveSplitMessages();
    },
    60000,
    [isDone, messages, isIdle]
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
    <div className="h-full w-full flex flex-col">
      <div className="flex-grow relative" ref={containerRef as any}>
        {containerHeight > 0 && (
          <ScrollArea
            h={containerHeight}
            scrollHideDelay={0}
            scrollbarSize={10}
            viewportRef={viewport}
            offsetScrollbars={false}
          >
            <Container size="sm" className="mb-10 mt-5 p-0">
              {map(messagesList, (messages, i0) => {
                const position = messagesList
                  .filter((v, i) => i <= i0)
                  .map(v => v.length)
                  .reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                  }, 0);

                return (
                  <>
                    {map(messages, (message, index) => {
                      const isChild = message.isChild;

                      return (
                        <>
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
                            focusTextBox={focusTextBox}
                            isChild={isChild}
                          />
                        </>
                      );
                    })}
                    <ReplyItem
                      includeMessages={messages}
                      viewport={viewport}
                      messages={messages}
                      key={[JSON.stringify(messages), i0].join(":")}
                      position={position}
                      onSend={onSend}
                      exId={i0}
                    />
                  </>
                );
              })}
            </Container>
          </ScrollArea>
        )}
      </div>
      <div className={classes.divider1}>
        <Container size={"sm"} className={classNames("flex flex-col gap-3 p-3 m-auto w-full px-0")}>
          <TypeBox
            ref={boxRef}
            collection={collection}
            onSubmit={(content, tokens, docId) => onSend(content, undefined, [], tokens, docId)}
            messages={messages}
            includeMessages={[]}
          />
        </Container>
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
      isBottom,
      scrollToBottom,
      autoScrollIds,
      focusTextBox,
      isChild,
    }: {
      classes: any;
      message: any;
      setMessages: any;
      index: any;
      messages: any;
      isBottom: () => boolean;
      scrollToBottom: () => any;
      focusTextBox: () => any;
      autoScrollIds: MutableRefObject<KeyValue>;
      isChild: boolean;
    },
    ref
  ) => {
    const [message, setMessage] = useState<MessageItemType>(inputMessage);
    const [isTyping, setIsTyping] = useState(false);
    const [doScrollToBottom, setDoScrollToBottom] = useState<boolean>(true);
    const [, setCopyText] = useCopyToClipboard();
    const [isCopied, setIsCopied] = useState(false);
    const updateIsCopied = useMemo(() => {
      let timeoutId: any;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsCopied(false);
        }, 2000);
        setIsCopied(true);
      };
    }, []);
    const [isEffect, setIsEffect] = useState(false);
    const [collectionId] = useCurrentCollection();
    const [collections] = useCollections();
    const collection = useMemo(() => {
      return find(collections, v => v.key === collectionId);
    }, [collectionId, collections]);
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const hasDocs = useMemo(() => {
      return Array.isArray(message.docs) && message.docs.length > 0;
    }, [message]);
    const [isShowDocs, { open: showDocs, close: closeDocs }] = useDisclosure(false);

    useImperativeHandle(ref, () => ({
      editMessage(newMessage: string, isDone: boolean) {
        messages[index].content = newMessage;
        setMessage({
          ...message,
          content: newMessage,
        });
        setIsTyping(!isDone);
        if (isDone || !isBottom()) {
          setDoScrollToBottom(false);
        } else if (isBottom() && !doScrollToBottom) {
          setDoScrollToBottom(true);
        }

        if (isDone) {
          doneMessages.current[message.id] = true;
          if (!isBottom()) {
            scrollElementRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "start" });
          }
        }
      },
    }));
    useEffect(() => {
      if (!isTyping) return;
      if (doScrollToBottom) {
        scrollToBottom();
      }
    }, [doScrollToBottom, message.content, isTyping]);
    useMount(() => {
      if (message.source === "user" && !autoScrollIds.current[message.id]) {
        if (message.scrollToBottom) {
          scrollToBottom();
        }
        autoScrollIds.current[message.id] = true;
      }
    });
    useEffect(() => {
      if (isTyping && !isEffect) {
        setIsEffect(true);
      } else if (!isTyping && isEffect) {
        setTimeout(() => {
          setIsEffect(false);
        }, 500);
      }
    }, [isTyping, isEffect]);
    useUnmount(() => {
      doneMessages.current[message.id] = false;
    });

    return (
      <>
        <Modal
          opened={isShowDocs}
          onClose={closeDocs}
          title="Documents"
          centered
          scrollAreaComponent={ScrollArea.Autosize}
          size={"lg"}
        >
          {isShowDocs &&
            map(message.docs, (doc, index) => {
              return (
                <div key={index} className={"text-xs"}>
                  <ReactMarkdown
                    linkTarget="_blank"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      code({ node: rawNode, inline, className, children, ...props }) {
                        const node = rawNode as Node;

                        const rawContent = String(children);
                        let codeContent = postprocessAnswer(rawContent.replace(/\n$/, ""), true);

                        if (inline && !message.content.includes("```" + rawContent + "```")) {
                          if (node.position.end.offset - rawContent.length - node.position.start.offset === 2) {
                            return <code className={classes.inlineCode}>{codeContent}</code>;
                          }
                        }

                        const match = /language-(\w+)/.exec(className || "");
                        let lang: any = "javascript";

                        if (!match) {
                          try {
                            lang = detectProgramLang(codeContent);
                          } catch (e) {}
                        } else {
                          lang = match[1] as any;
                        }

                        return (
                          <Prism
                            children={codeContent}
                            language={convertToSupportLang(lang)}
                            scrollAreaComponent={ScrollArea}
                            className={classNames("mb-1", classes.codeWrap)}
                          />
                        );
                      },
                    }}
                  >
                    {preprocessMessageContent(doc)}
                  </ReactMarkdown>
                </div>
              );
            })}
        </Modal>
        {!isChild && <div className={"h-10"} />}
        <div
          className={classNames(
            "flex gap-2 items-start p-3 relative",
            {
              [classes.messageBotBg]: !isChild,
              [classes.rootBorders]: !isChild,
              [classes.childBorders]: isChild,
              "flex-col": !isChild,
              "flex-row": isChild,
              [classes.streamDone]: doneMessages.current[message.id],
            },
            classes.messageBotContainer
          )}
        >
          <div
            ref={scrollElementRef}
            className={"absolute"}
            style={{
              left: 0,
              bottom: 0,
            }}
          />
          {isChild && <div className={classes.childLine} />}
          <Tooltip label="Copied" opened={isCopied}>
            <div
              className="absolute right-1 bottom-2 la-copy"
              onMouseLeave={() => {
                setTimeout(() => setIsCopied(false), 200);
              }}
            >
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => {
                  setCopyText(message.content);
                  updateIsCopied();
                }}
                style={{ zIndex: 100 }}
              >
                <IconCopy />
              </ActionIcon>
            </div>
          </Tooltip>
          <div style={{ position: isChild ? "sticky" : undefined }} className="top-3">
            <div className={"flex flex-row items-center gap-3"}>
              <div className={"relative"}>
                <Avatar
                  size="md"
                  src={message.source === "assistant" ? "/assets/bot1.png" : "/assets/chill.png"}
                  className={classNames({
                    [classes.userAvatar]: message.source !== "assistant",
                    [classes.assistantAvatar]: message.source === "assistant" && !isEffect,
                    [classes.assistantAvatar2]: message.source === "assistant" && isEffect,
                  })}
                >
                  {collection?.emoji}
                </Avatar>
              </div>
              {!isChild && (
                <div className={"flex flex-row gap-2 items-center"}>
                  <Text className={"font-bold"}>
                    {message.source === "assistant" ? (
                      <>
                        {collection?.emoji} {collection?.label}
                      </>
                    ) : (
                      "You"
                    )}
                  </Text>
                  <DateInfo message={message} />
                </div>
              )}
            </div>
          </div>
          <div className={classNames("flex-grow w-full")}>
            {isChild && (
              <div
                className={"flex flex-row gap-2 items-center mb-2"}
                style={{
                  height: 34,
                }}
              >
                <Text className={"font-bold"}>
                  {message.source === "assistant" ? (
                    <>
                      {collection?.emoji} {collection?.label}
                    </>
                  ) : (
                    "You"
                  )}
                </Text>
                <DateInfo message={message} />
              </div>
            )}
            <div className={classNames(classes.messageContent)}>
              {message.content !== "..." && (
                <ReactMarkdown
                  linkTarget="_blank"
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ node: rawNode, inline, className, children, ...props }) {
                      const node = rawNode as Node;

                      const rawContent = String(children);
                      let codeContent = postprocessAnswer(rawContent.replace(/\n$/, ""), true);

                      if (inline && !message.content.includes("```" + rawContent + "```")) {
                        if (node.position.end.offset - rawContent.length - node.position.start.offset === 2) {
                          return <code className={classes.inlineCode}>{codeContent}</code>;
                        }
                      }

                      const match = /language-(\w+)/.exec(className || "");
                      let lang: any = "javascript";

                      if (!match) {
                        try {
                          lang = detectProgramLang(codeContent);
                        } catch (e) {}
                      } else {
                        lang = match[1] as any;
                      }

                      return (
                        <Prism
                          children={codeContent}
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
            <div className={"pt-2"}>
              {hasDocs && (
                <Badge
                  onClick={showDocs}
                  className={"cursor-pointer"}
                  size={"xs"}
                  leftSection={<Text>{message.docs?.length}</Text>}
                >
                  Documents
                </Badge>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
);

export default Message;
