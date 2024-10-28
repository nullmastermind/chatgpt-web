'use client';

import { Divider, ScrollArea, Transition } from '@mantine/core';
import { useIdle } from '@mantine/hooks';
import classNames from 'classnames';
import dayjs from 'dayjs';
import {
  clone,
  cloneDeep,
  findIndex,
  findLastIndex,
  forEach,
  map,
  throttle,
  uniqBy,
  uniqueId,
} from 'lodash';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useDebounce, useList, useMap, useMeasure, useUnmount } from 'react-use';

import { AttachItem, TMessageItem } from '@/components/misc/types';
import { PromptSaveData } from '@/components/pages/ChatbotPage/AddPrompt';
import { requestChatStream } from '@/components/pages/ChatbotPage/Message.api';
import useStyles from '@/components/pages/ChatbotPage/Message.style';
import MessageItem from '@/components/pages/ChatbotPage/MessageItem';
import ReplyItem from '@/components/pages/ChatbotPage/ReplyItem';
import { TypeBox } from '@/components/pages/ChatbotPage/TypeBox';
import { useLastMessageByCollection, useModel, useOpenaiAPIKey } from '@/states/states';
import store, { attachKey, messagesKey } from '@/utility/store';
import {
  countTokens,
  htmlEncode,
  postprocessAnswer,
  processTaggedMessage,
  unWrapRawContent,
  wrapRawContent,
} from '@/utility/utility';

export type MessageProps = {
  collectionId: any;
  prompt: {
    id: number;
    prompts: any[];
  } & PromptSaveData;
  isDialog?: boolean;
};

export type MessageItemType = {
  source: 'assistant' | 'user';
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
  model?: string;
};

const disableBodyScroll = () => {
  window.scrollTo(0, 0);
  document.body.style.overflowY = 'hidden';
};

const enableBodyScroll = () => {
  document.body.style.overflow = '';
};

const Message = memo<MessageProps>(({ collectionId, prompt, isDialog }) => {
  const { classes } = useStyles();
  const [containerRef, { height: containerHeight }] = useMeasure();
  const [openaiAPIKey] = useOpenaiAPIKey();
  const [messages, { push: pushMessage, set: setMessages, insertAt: insertMessage }] =
    useList<MessageItemType>([]);
  const [isDone, { set: setIsDone, setAll: setAllIsDone }] = useMap<{
    [key: string]: boolean;
  }>({});
  const checkedMessages = useMemo(() => {
    return messages.filter((v) => v.checked);
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
      if ((index > 0 && message.source === 'assistant') || message.isChild) {
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
  const doneMessages = useRef<Record<any, boolean>>({});
  const needRefreshMessageIds = useRef<Record<any, any>>({});
  const messageRefs = useRef<Record<any, any>>({});
  const autoScrollIds = useRef<Record<any, any>>({});
  const messagePageScroll = useRef<HTMLDivElement>(null);
  const [, setLastMessageByCollection] = useLastMessageByCollection();
  const refDateKey = useRef('');

  const scrollToBottom = (offset: number = 0) => {
    const scrollHeight = messagePageScroll.current?.scrollHeight || 0;
    const clientHeight = messagePageScroll.current?.clientHeight || 0;
    messagePageScroll.current?.scrollTo({
      top: scrollHeight - clientHeight - offset,
    });
  };
  const onSend = async (
    content: string,
    attachItems: AttachItem[],
    index?: number,
    includeMessages?: MessageItemType[],
    tokens?: number,
    docId?: string,
  ) => {
    if (content.length === 0) return;
    if (docId === 'Choose document' || docId === '') docId = undefined;

    if (!docId) {
      const disabledDocId = localStorage.getItem(':docId');
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

    const userMessageId = Date.now() - 1;

    if (attachItems.length) {
      await store.setItem(attachKey(collectionId, userMessageId), attachItems);
    }

    const userMessage: MessageItemType = {
      source: 'user',
      content: content,
      checked: checkedMessages.length > 0,
      id: userMessageId,
      date: new Date(),
      isChild: false,
      scrollToBottom: true,
      tokens: tokens || 0,
      docId: docId,
    };
    const assistantMessage: MessageItemType = {
      source: 'assistant',
      content: '...',
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
    if (!messagePageScroll.current) return false;
    const scrollHeight = messagePageScroll.current?.scrollHeight || 0;
    const clientHeight = messagePageScroll.current?.clientHeight || 0;
    const scrollTop = messagePageScroll.current?.scrollTop || 0;
    return scrollTop >= scrollHeight - clientHeight;
  };
  const focusTextBox = () => {
    boxRef.current?.focus();
  };
  const saveSplitMessages = async () => {
    doneMessages.current = {};

    let canSave = true;
    forEach(isDone, (value) => {
      if (!value) {
        canSave = false;
        return false;
      }
    });
    if (canSave) {
      const messages: MessageItemType[] = (await store.getItem(messagesKey(collectionId))) || [];
      const maxMessages = parseInt(localStorage.getItem(':maxMessages') || '10');
      const saveMessages = messages.splice(-maxMessages);
      if (saveMessages.length > 0) await store.setItem(messagesKey(collectionId), saveMessages);
      setMessages(saveMessages);
      setAllIsDone({});
    }
  };

  useEffect(() => {
    if (!isDialog && !isMobile) {
      disableBodyScroll();
      return () => enableBodyScroll();
    }
  }, [isDialog]);
  useEffect(() => {
    if (collectionId) {
      store
        .getItem(messagesKey(collectionId))
        .then((value) => {
          if (Array.isArray(value) && value.length > 0) {
            setMessages(value);
          } else {
            setMessages([
              {
                source: 'assistant',
                content: 'Hello! How can I assist you today?',
                id: Date.now(),
              } as MessageItemType,
            ]);
          }
        })
        .catch(() => {
          setMessages([
            {
              source: 'assistant',
              content: 'Hello! How can I assist you today?',
              id: Date.now(),
            } as MessageItemType,
          ]);
        });
    }
  }, [collectionId]);
  useUnmount(() => {
    messageRefs.current = {};
    autoScrollIds.current = {};
    void saveSplitMessages();
  });
  useDebounce(
    async () => {
      if (messages.length === 0) return;

      let streamIndex = streamMessageIndex === -1 ? messages.length : streamMessageIndex + 1;

      if (streamIndex > messages.length) {
        streamIndex = messages.length;
      }

      if (
        messages[streamIndex - 1].content !== '...' ||
        messages[streamIndex - 1].source !== 'assistant'
      )
        return;

      const userMessage = messages[streamIndex - 2];
      const assistantPreMessage: MessageItemType = messages[streamIndex - 1];

      // if (userMessage.docId) {
      //   try {
      //     const ignoreHashes: string[] = [];
      //
      //     forEach(includes, (m) => {
      //       if (Array.isArray(m.docHashes)) {
      //         ignoreHashes.push(...m.docHashes);
      //       }
      //     });
      //
      //     let lastAssistantMessage = undefined;
      //
      //     if (userMessage.isChild) {
      //       lastAssistantMessage =
      //         messages[
      //           findIndex(messages, (value) => {
      //             return value.id === userMessage.id;
      //           }) - 1
      //         ];
      //     }
      //
      //     const {
      //       data: query,
      //     }: {
      //       data: Docs;
      //     } = await axios.post(`${indexerHost}/api/query`, {
      //       doc_id: userMessage.docId,
      //       query: [
      //         ...includes.filter((v) => v.source === 'user').map((v) => v.content),
      //         lastAssistantMessage?.content,
      //         userMessage.content,
      //       ]
      //         .filter((v) => typeof v === 'string' && v.length > 0)
      //         .join('\n'),
      //       apiKey: openaiAPIKey.split(',')[0], // maxScore: includes.length > 0 ? 0.4 : 0.45,
      //       ignoreHashes,
      //     });
      //
      //     const filteredDocs = filterDocs(query.data, 0.06);
      //
      //     messages[streamIndex - 2].docHashes = filteredDocs.map((v) => v[0].metadata.hash);
      //     messages[streamIndex - 2].docs = map(filteredDocs, (value) => {
      //       return doc2ChatContent(value[0], 1.0 - value[1]);
      //     });
      //     userMessage.docHashes = messages[streamIndex - 2].docHashes;
      //     userMessage.docs = messages[streamIndex - 2].docs;
      //   } catch (e) {}
      //
      //   messages[streamIndex - 2].docId = undefined;
      //   userMessage.docId = undefined;
      //   needRefreshMessageIds.current[userMessage.id] = userMessage;
      //   if (messages.length > 0) await store.setItem(messagesKey(collectionId), messages);
      //   setMessages(clone(messages));
      //   return;
      // }

      if (streamIndex === messages.length) {
        setDoScroll(true);
      }

      setIsDone(assistantPreMessage.id, false);

      const requestMessages: TMessageItem[] = [];
      const allDocs = [];

      forEach(includes, (includedMessage) => {
        allDocs.push(...(includedMessage.docs || []));
      });

      allDocs.push(...(userMessage.docs || []));

      forEach(clone(prompt.prompts), (prompt) => {
        if (prompt === 'your') {
          const userMessages = [
            ...map(includes, (v) => {
              return [
                {
                  role: v.source,
                  content: v.content,
                  id: v.id,
                },
              ] as any[];
            }).flat(),
            ...checkedMessages.map((v) => ({
              role: v.source,
              content: v.content,
              id: v.id,
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
              role: 'user',
              content: userMessage.content,
              id: userMessage.id,
            });
          }
          forEach(userMessages, (uMessage) => {
            requestMessages.push({
              role: uMessage.role,
              content: uMessage.content,
              id: uMessage.id,
            });
          });
        } else {
          requestMessages.push({
            role: prompt.role,
            content: prompt.prompt,
            id: prompt.id,
          });
        }
      });

      for (let i = 0; i < requestMessages.length; i++) {
        const messageItem = requestMessages[i];
        if (messageItem.role === 'user' && !messageItem.name) {
          requestMessages[i].name = 'User';
        }
        const attachItems = await store.getItem(attachKey(collectionId, messageItem.id));
        if (attachItems) {
          const attachMessages: TMessageItem[] = [];
          forEach(attachItems, (item: AttachItem) => {
            forEach(item.data, (value) => {
              value = cloneDeep(value);

              if (!value.disabled) {
                let header: string;
                if (item.isFile) {
                  header = `# File: ${item.name}`;
                  if (value.name) {
                    header += `\n\n${value.name}`;
                  }
                } else if (value.isDocument) {
                  header = `# Document Section: ${value.name}`;
                  value.content = `<|BEGIN_DOCUMENT_CHUNK|>
<metadata>
  type: documentation
  format: "{CHUNK_CONTEXT} --- {CHUNK_DATA}"
</metadata>
<content>
${value.content}
</content>
<|END_DOCUMENT_CHUNK|>`;
                } else {
                  header = '# Text data';
                }
                attachMessages.push({
                  role: 'user',
                  content: `${header}\n\n---\n\n${value.content}`,
                  name: value.isDocument ? 'Documentation' : 'Attachment',
                });
              }
            });
          });

          // requestMessages.splice(i, 0, ...attachMessages);
          // i += attachMessages.length; // Adjust index to account for newly inserted messages

          requestMessages.splice(
            i,
            0,
            ...[
              {
                role: 'user',
                content: `<|BEGIN_ATTACHMENTS|>\n${attachMessages.map((m) => m.content).join('\n\n')}\n<|END_ATTACHMENTS|>\nPlease use the information from the attachments to inform your responses, but respond naturally without explicitly referencing them.`,
              },
            ],
          );
          i += 1;
        }
      }

      const saveMessagesFn = async (message: string, model?: string) => {
        const dbMessages: any[] = (await store.getItem(messagesKey(collectionId))) || [];
        const dbMsgIndex = findIndex(dbMessages, (v: any) => v.id === assistantPreMessage.id);
        if (dbMsgIndex >= 0) {
          dbMessages[dbMsgIndex].content = message;
          if (model) {
            dbMessages[dbMsgIndex].model = model;
          }
          await store.setItem(messagesKey(collectionId), dbMessages);
        }
      };
      const saveMessagesThr = throttle((message: string, model?: string) => {
        saveMessagesFn(message, model);
      }, 1000);

      const apiMessages = requestMessages
        .filter((v) => {
          return !(v.role === 'assistant' && v.content === '...');
        })
        .map((v) => {
          if (v.role === 'user' && !userMessage.isChild) {
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

          const { id, ...apiData } = v;

          return apiData;
        });

      const finalMessages = uniqBy(apiMessages, (v) => {
        const b = v.role === 'system' ? v.role : uniqueId('apiMessages');
        return [v.content, b].join(':');
      });

      if (allDocs.length > 0) {
        const insertToIndex = findLastIndex(finalMessages, (v) => {
          return v.role === 'system';
        });
        const docMessages: any[] = allDocs.map((doc) => ({
          role: 'user',
          content: doc,
        }));
        // docMessages.push({
        //   role: "user",
        //   content: "PRIORITIZE PROVIDING ANSWERS BASED ON THE PROVIDED REFERENCE SOURCES.",
        // });
        docMessages.push({
          role: 'assistant',
          content:
            'I have received the documents you provided. I understand that I will be penalized if my answers deviate from your documents. Please state your request, and I will provide the best answer based on my knowledge and the documents you provide.',
        });

        if (insertToIndex !== -1) {
          finalMessages.splice(insertToIndex + 1, 0, ...docMessages);
        }
      }

      // choose model
      let autoModel = model;
      if (autoModel.startsWith('auto')) {
        const countedTokens = await countTokens(finalMessages.map((v) => v.content).join(''));
        const [, model1, model2, switchValue] = autoModel.split('|');

        if (countedTokens > +switchValue) {
          autoModel = model2;
        } else {
          autoModel = model1;
        }
      }

      requestChatStream('v1/chat/completions', finalMessages, {
        insertModel: true,
        onMessage(message: string, done: boolean, model): void {
          if (done) {
            message = postprocessAnswer(message, done);
            if (prompt.wrapSingleLine) {
              message = unWrapRawContent(message);
            }
          }

          if (prompt.wrapCustomXmlTag) {
            message = processTaggedMessage(prompt.customXmlTag as string, message, done);
          }

          saveMessagesThr(message, model);

          if (messageRefs.current[assistantPreMessage.id]) {
            messageRefs.current[assistantPreMessage.id].editMessage(message, done, model);
          }
          if (done) {
            saveMessagesFn(message, model);
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
          console.log('error', error);
          setMessages(clone(messages));
        },
      }).finally();
    },
    42,
    [messages, checkedMessages, collectionId, streamMessageIndex, includes, model],
  );
  useDebounce(
    () => {
      if (messages.length > 0) {
        void store.setItem(messagesKey(collectionId), messages);
      }
    },
    42,
    [messages],
  );
  useEffect(() => {
    scrollToBottom();
  }, [containerHeight]);
  useDebounce(
    () => {
      if (!isIdle) return;
      void saveSplitMessages();
    },
    60000,
    [isDone, messages, isIdle],
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
            viewportRef={messagePageScroll}
            offsetScrollbars={true}
          >
            <div className="mb-5 mt-5 p-0">
              {map(messagesList, (messages, i0) => {
                const position = messagesList
                  .filter((_, i) => i <= i0)
                  .map((v) => v.length)
                  .reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                  }, 0);

                return (
                  <div key={i0}>
                    {map(messages, (message, index) => {
                      const isChild = message.isChild;
                      const dateKey = dayjs(new Date(message.id)).format('MMMM D, YYYY');
                      const showDate =
                        refDateKey.current !== dateKey ||
                        (i0 === messagesList.length - 1 && index === 0);

                      refDateKey.current = dateKey;

                      return (
                        <>
                          {showDate && (
                            <Divider
                              key={dateKey}
                              label={dateKey}
                              labelPosition="right"
                              className="my-5"
                            />
                          )}
                          <Transition
                            key={[message.id, message.checked].join(':')}
                            transition={'fade'}
                            mounted={true}
                            timingFunction="ease"
                          >
                            {(styles) => (
                              <MessageItem
                                topSpacing={!showDate}
                                collectionId={collectionId}
                                isFirst={index === 0 && i0 === 0}
                                isLast={i0 === messagesList.length - 1}
                                ref={(instance) => {
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
                                doneMessages={doneMessages}
                                needRefreshMessageIds={needRefreshMessageIds}
                                messagePageScroll={messagePageScroll}
                              />
                            )}
                          </Transition>
                        </>
                      );
                    })}
                    <ReplyItem
                      collectionId={collectionId}
                      includeMessages={messages}
                      viewport={messagePageScroll}
                      messages={messages}
                      key={[JSON.stringify(messages), i0].join(':')}
                      position={position}
                      onSend={onSend}
                      exId={i0}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
      <div className={classes.divider1}>
        <div className={classNames('flex flex-col gap-3 p-3 px-0 m-auto w-full')}>
          <TypeBox
            ref={boxRef}
            collectionId={collectionId}
            onSubmit={(content, tokens, attachItems) => {
              setLastMessageByCollection((prev) => ({
                ...prev,
                [collectionId]: content,
              }));
              void onSend(content, attachItems, undefined, [], tokens);
            }}
            messages={messages}
            includeMessages={[]}
          />
        </div>
      </div>
    </div>
  );
});

export default Message;
