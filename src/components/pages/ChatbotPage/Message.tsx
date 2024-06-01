import { useDebounce, useList, useMap, useMeasure, useMount, useUnmount } from "react-use";
import { ActionIcon, Badge, Container, Loader, Modal, ScrollArea, Text, Tooltip, Transition } from "@mantine/core";
import React, {
  forwardRef,
  Fragment,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { clone, cloneDeep, find, findIndex, findLastIndex, forEach, map, throttle, uniqBy, uniqueId } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import { useCollections, useCurrentCollection, useModel, useOpenaiAPIKey } from "@/states/states";
import {
  countTokens,
  doc2ChatContent,
  Docs,
  filterDocs,
  htmlEncode,
  KeyValue,
  postprocessAnswer,
  processTaggedMessage,
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
import { PromptSaveData } from "@/components/pages/ChatbotPage/AddPrompt";
import MemoizedReactMarkdown from "@/components/pages/ChatbotPage/MemoizedReactMarkdown";
import { isMobile } from "react-device-detect";

export type MessageProps = {
  collection: any;
  prompt: {
    id: number;
    prompts: any[];
  } & PromptSaveData;
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
  docHashes?: string[];
};

const messageRefs = { current: {} as KeyValue };
const autoScrollIds = { current: {} as KeyValue };
const doneMessages = { current: {} as KeyValue };
const needRefreshMessageIds = {
  current: {} as Record<string, any>,
};

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

    if (!docId) {
      const disabledDocId = localStorage.getItem(":docId");
      const docQueries: string[] = [];

      if (disabledDocId) {
        content.replace(/`@(.*?)`/g, (_substring: any, args: string) => {
          if (args.trim()) {
            docQueries.push(args);
          }
          return args;
        });
        if (docQueries.length) {
          docId = disabledDocId;
        }
      }
    }

    if (docId) {
      // notifyIndexerVersionError();
    }

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
          const ignoreHashes: string[] = [];

          forEach(includes, m => {
            if (Array.isArray(m.docHashes)) {
              ignoreHashes.push(...m.docHashes);
            }
          });

          let lastAssistantMessage = undefined;

          if (userMessage.isChild) {
            lastAssistantMessage =
              messages[
                findIndex(messages, value => {
                  return value.id === userMessage.id;
                }) - 1
              ];
          }

          const {
            data: query,
          }: {
            data: Docs;
          } = await axios.post(`${indexerHost}/api/query`, {
            doc_id: userMessage.docId,
            query: [
              ...includes.filter(v => v.source === "user").map(v => v.content),
              lastAssistantMessage?.content,
              userMessage.content,
            ]
              .filter(v => typeof v === "string" && v.length > 0)
              .join("\n"),
            apiKey: openaiAPIKey.split(",")[0], // maxScore: includes.length > 0 ? 0.4 : 0.45,
            maxScore: 0.6,
            k: includes.length > 0 ? 1 : 5,
            includeAllIfKLessThanScore: 0.3,
            ignoreHashes,
          });

          const filteredDocs = filterDocs(query.data, 0.06);

          messages[streamIndex - 2].docHashes = filteredDocs.map(v => v[0].metadata.hash);
          messages[streamIndex - 2].docs = map(filteredDocs, value => {
            return doc2ChatContent(value[0], 1.0 - value[1]);
          });
          userMessage.docHashes = messages[streamIndex - 2].docHashes;
          userMessage.docs = messages[streamIndex - 2].docs;
        } catch (e) {}

        messages[streamIndex - 2].docId = undefined;
        userMessage.docId = undefined;
        needRefreshMessageIds.current[userMessage.id] = userMessage;
        localStorage.setItem(`:messages${collection}`, JSON.stringify(messages));
        setMessages(clone(messages));
        return;
      }

      if (streamIndex === messages.length) {
        setDoScroll(true);
      }

      setIsDone(assistantPreMessage.id, false);

      const requestMessages: any[] = [];
      const allDocs = [];

      forEach(includes, includedMessage => {
        allDocs.push(...(includedMessage.docs || []));
      });

      allDocs.push(...(userMessage.docs || []));

      forEach(clone(prompt.prompts), prompt => {
        if (prompt === "your") {
          const userMessages = [
            ...map(includes, v => {
              return [
                {
                  role: v.source,
                  content: v.content,
                },
              ] as any[];
            }).flat(),
            ...checkedMessages.map(v => ({
              role: v.source,
              content: v.content,
            })), // If you want to insert before the last user message
            // ...map(userMessage.docs, doc => {
            //   return {
            //     role: "system",
            //     content: doc,
            //   };
            // }),
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

      const apiMessages = requestMessages
        .filter(v => {
          return !(v.role === "assistant" && v.content === "...");
        })
        .map(v => {
          if (v.role === "user" && !userMessage.isChild) {
            // if (prompt.wrapSingleLine && !content.includes("\n")) {
            if (prompt.wrapSingleLine) {
              // if (!/^".*?"$/.test(v.content) && !/^'.*?'$/.test(v.content)) {
              //   v.content = `"${v.content.replace(/"/g, '\\"')}"`;
              //   // content = JSON.stringify(content);
              // }
              v.content = wrapRawContent(v.content);
            }

            if (prompt.wrapCustomXmlTag && prompt.customXmlTag) {
              const tag = prompt.customXmlTag;
              v.content = `<${tag}>${htmlEncode(v.content)}</${tag}>`;
            }
          }
          return v;
        });
      const finalMessages = uniqBy(apiMessages, v => {
        const b = v.role === "system" ? v.role : uniqueId("apiMessages");
        return [v.content, b].join(":");
      });

      if (allDocs.length > 0) {
        const insertToIndex = findLastIndex(finalMessages, v => {
          return v.role === "system";
        });
        const docMessages = allDocs.map(doc => ({
          role: "user",
          content: doc,
        }));
        // docMessages.push({
        //   role: "user",
        //   content: "PRIORITIZE PROVIDING ANSWERS BASED ON THE PROVIDED REFERENCE SOURCES.",
        // });
        docMessages.push({
          role: "assistant",
          content:
            "I have received the documents you provided. I understand that I will be penalized if my answers deviate from your documents. Please state your request, and I will provide the best answer based on my knowledge and the documents you provide.",
        });

        if (insertToIndex !== -1) {
          finalMessages.splice(insertToIndex + 1, 0, ...docMessages);
        }
      }

      // choose model
      let autoModel = model;
      if (autoModel.startsWith("auto")) {
        const countedTokens = await countTokens(finalMessages.map(v => v.content).join(""));
        const [, model1, model2, switchValue] = autoModel.split("|");

        if (countedTokens > +switchValue) {
          autoModel = model2;
        } else {
          autoModel = model1;
        }
      }

      requestChatStream("v1/chat/completions", finalMessages, {
        onMessage(message: string, done: boolean): void {
          if (done) {
            message = postprocessAnswer(message, done);
            if (prompt.wrapSingleLine) {
              message = unWrapRawContent(message);
            }
          }

          if (prompt.wrapCustomXmlTag) {
            message = processTaggedMessage(prompt.customXmlTag as string, message, done);
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
          setMessages(clone(messages));
        },
      }).finally();
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
            <Container size="sm" className="mb-5 mt-5 p-0 px-2 sm:px-0">
              {map(messagesList, (messages, i0) => {
                const position = messagesList
                  .filter((v, i) => i <= i0)
                  .map(v => v.length)
                  .reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                  }, 0);

                return (
                  <div key={i0}>
                    {map(messages, (message, index) => {
                      const isChild = message.isChild;

                      return (
                        <Transition
                          key={[message.id, message.checked].join(":")}
                          transition={"fade"}
                          mounted={true}
                          timingFunction="ease"
                        >
                          {styles => (
                            <MessageItem
                              isFirst={index === 0 && i0 === 0}
                              ref={instance => {
                                if (instance) messageRefs.current[message.id] = instance;
                              }}
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
                              style={styles}
                            />
                          )}
                        </Transition>
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
                  </div>
                );
              })}
            </Container>
          </ScrollArea>
        )}
      </div>
      <div className={classes.divider1}>
        <Container size={"sm"} className={classNames("flex flex-col gap-3 p-3 m-auto w-full px-2 sm:px-0")}>
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
      index,
      messages,
      isBottom,
      scrollToBottom,
      autoScrollIds,
      isChild,
      style,
      isFirst,
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
      style?: any;
      isFirst: boolean;
    },
    ref
  ) => {
    const [message, setMessage] = useState<MessageItemType>(inputMessage);
    const [isTyping, setIsTyping] = useState(false);
    const [doScrollToBottom, setDoScrollToBottom] = useState<boolean>(true);
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
      if (message.docId) return true;
      return Array.isArray(message.docs) && message.docs.length > 0;
    }, [message]);
    const [isShowDocs, { open: showDocs, close: closeDocs }] = useDisclosure(false);
    const smoothContent = useRef<string[]>([]);
    const smoothIntervalId = useRef<any>(-1);
    const smoothCurrentContent = useRef<string>("");
    const smoothCurrentIndex = useRef<number>(-1);

    useImperativeHandle(ref, () => ({
      editMessage(newMessage: string, isDone: boolean) {
        messages[index].content = newMessage;
        clearInterval(smoothIntervalId.current);

        if (document.hidden) {
          setMessage({
            ...message,
            content: newMessage,
          });
          if (isDone) {
            setIsTyping(false);
            doneMessages.current[message.id] = true;
            clearInterval(smoothIntervalId.current);
            setDoScrollToBottom(true);
            if (!isBottom()) {
              scrollElementRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "start" });
            }
          } else {
            if (!isBottom()) {
              setDoScrollToBottom(false);
            } else if (isBottom() && !doScrollToBottom) {
              setDoScrollToBottom(true);
            }
          }
          return;
        }

        smoothContent.current = newMessage.split("");

        smoothIntervalId.current = setInterval(() => {
          if (smoothContent.current.length > smoothCurrentIndex.current + 1 && !isDone) {
            let nextChars = "";
            let smoothSize = 1;

            for (let i = 0; i < smoothSize; i++) {
              smoothCurrentIndex.current += 1;
              if (smoothCurrentIndex.current < smoothContent.current.length) {
                const nextChar = smoothContent.current[smoothCurrentIndex.current];
                nextChars += nextChar;
              }
            }

            smoothCurrentContent.current += nextChars;

            setMessage(prevState => ({
              ...prevState,
              content: smoothCurrentContent.current,
            }));

            setIsTyping(true);

            if (!isBottom()) {
              setDoScrollToBottom(false);
            } else if (isBottom() && !doScrollToBottom) {
              setDoScrollToBottom(true);
            }
          } else if (isDone) {
            setIsTyping(false);
            setMessage({
              ...message,
              content: newMessage,
            });
            doneMessages.current[message.id] = true;
            clearInterval(smoothIntervalId.current);
            let st = Date.now();
            const itv = setInterval(() => {
              scrollToBottom();
              if (Date.now() - st > 100) {
                clearInterval(itv);
              }
            });
          }
        }, 1);
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
    useEffect(() => {
      if (hasDocs) {
        delete needRefreshMessageIds.current[message.id];
        return;
      }

      const intervalId = setInterval(() => {
        if (needRefreshMessageIds.current[message.id]) {
          const nextMessage = cloneDeep(needRefreshMessageIds.current[message.id]);

          setMessage(nextMessage);

          if (nextMessage.docs) {
            const saveMessagesFn = () => {
              const dbMessages = JSON.parse(localStorage.getItem(`:messages${collection}`) || "[]");
              const dbMsgIndex = findIndex(dbMessages, (v: any) => v.id === nextMessage.id);
              if (dbMsgIndex >= 0) {
                dbMessages[dbMsgIndex] = nextMessage;
                localStorage.setItem(`:messages${collection}`, JSON.stringify(dbMessages));
              }
            };
            saveMessagesFn();
          }

          delete needRefreshMessageIds.current[message.id];
        }
      }, 500);

      return () => {
        clearInterval(intervalId);
      };
    }, [message, hasDocs, isBottom]);

    return (
      <>
        <Modal
          opened={isShowDocs}
          onClose={closeDocs}
          title="Documents"
          centered
          scrollAreaComponent={ScrollArea.Autosize}
          size={"auto"}
        >
          <Container p={0} size={"sm"}>
            {isShowDocs &&
              map(message.docs, (doc, index) => {
                return (
                  <div key={index} className={classNames("text-xs", classes.pBreakAll, classes.imgBg)}>
                    <MemoizedReactMarkdown id={message.id} content={doc} smallText={true} />
                  </div>
                );
              })}
          </Container>
        </Modal>
        {!isChild && !isFirst && <div className={"h-5"} />}
        <div style={style}>
          <div
            className={classNames(
              "flex gap-2 items-start relative py-2",
              {
                [classes.messageBotBg]: !isChild,
                [classes.rootBorders]: !isChild,
                [classes.childBorders]: isChild,
                "flex-col": !isChild,
                "flex-row": isChild,
                [classes.streamDone]: doneMessages.current[message.id],
              },
              classes.messageBotContainer,
              {
                [classes.userQuestionBg]: isChild && message.source !== "assistant",
              }
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
            {isChild && <div className={classes.childLine as string} />}
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
                  onClick={async () => {
                    try {
                      const textBlob = new Blob([message.content], { type: "text/plain" });
                      // const htmlBlob = new Blob([message.content], { type: "text/html" });

                      const clipboardItem = new ClipboardItem({
                        "text/plain": textBlob, // "text/html": htmlBlob,
                      });

                      await navigator.clipboard.write([clipboardItem]);
                    } catch (error) {
                      console.error("Failed to write to clipboard: ", error);
                    }
                    updateIsCopied();
                  }}
                  style={{ zIndex: 100 }}
                >
                  <IconCopy />
                </ActionIcon>
              </div>
            </Tooltip>
            <div style={{ position: isChild ? "sticky" : undefined }} className="top-3 mx-2">
              <div className={"flex flex-row items-center gap-2"}>
                <div className={"relative"}>
                  {!isChild && <div>{collection?.emoji}</div>}
                  {isChild && <div className={"w-3"} />}
                </div>
                {!isChild && (
                  <div className={"flex flex-row gap-2 items-center"}>
                    <DateInfo message={message} />
                  </div>
                )}
              </div>
            </div>
            <div className={classNames("flex-grow w-full")}>
              <div
                className={classNames(classes.messageContent, classes.imgBg, {
                  "px-2": !isMobile,
                })}
              >
                {message.content !== "..." && (
                  <MemoizedReactMarkdown
                    isTyping={isTyping}
                    isFirst={!isChild}
                    content={message.content}
                    id={message.id}
                  />
                )}
                {message.content === "..." && <TypingBlinkCursor />}
              </div>
              {hasDocs && (
                <div className="mx-2">
                  <Badge
                    onClick={showDocs}
                    className={classNames("cursor-pointer", classes.fadeIn)}
                    size={"xs"}
                    leftSection={
                      <div className={"flex items-center relative w-3.5 justify-center"}>
                        <div className={"absolute top-0 left-0 w-full"} style={{ height: 16 }}>
                          {Array.isArray(message.docs) ? (
                            <Text size={"sm"} className={"text-center w-full"} style={{ lineHeight: 0 }}>
                              {message.docs?.length}
                            </Text>
                          ) : (
                            <Loader size={"xs"} className={"relative -top-2 -left-1"} variant="dots" />
                          )}
                        </div>
                      </div>
                    }
                  >
                    Documents
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
);

export default Message;
