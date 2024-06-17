import {
  ActionIcon,
  Badge,
  Container,
  Loader,
  Modal,
  ScrollArea,
  Text,
  Tooltip,
  Transition,
  px,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCopy, IconMoodPuzzled, IconVolume } from '@tabler/icons-react';
import classNames from 'classnames';
import { cloneDeep, find, findIndex, map } from 'lodash';
import React, {
  MutableRefObject,
  RefObject,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isMobile } from 'react-device-detect';
import { useMount, useUnmount } from 'react-use';

import FunnyEmoji from '@/components/misc/FunnyEmoji';
import PreviewAttach from '@/components/misc/PreviewAttach';
import TextToSpeech from '@/components/misc/TextToSpeech';
import TypingBlinkCursor from '@/components/misc/TypingBlinkCursor';
import { AttachItem } from '@/components/misc/types';
import AttachName from '@/components/pages/ChatbotPage/Attach/AttachName';
import DateInfo from '@/components/pages/ChatbotPage/DateInfo';
import MemoizedReactMarkdown from '@/components/pages/ChatbotPage/MemoizedReactMarkdown';
import { MessageItemType } from '@/components/pages/ChatbotPage/Message';
import { useCollections } from '@/states/states';
import store, { attachKey, messagesKey } from '@/utility/store';
import { KeyValue } from '@/utility/utility';

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
      isLast,
      doneMessages,
      needRefreshMessageIds,
      messagePageScroll,
      collectionId,
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
      isLast: boolean;
      doneMessages: MutableRefObject<Record<any, boolean>>;
      needRefreshMessageIds: MutableRefObject<Record<any, any>>;
      messagePageScroll: RefObject<HTMLDivElement>;
      collectionId: any;
    },
    ref,
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
    const [collections] = useCollections();
    const collection = useMemo(() => {
      return find(collections, (v) => v.key === collectionId);
    }, [collectionId, collections]);
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const hasDocs = useMemo(() => {
      if (message.docId) return true;
      return Array.isArray(message.docs) && message.docs.length > 0;
    }, [message]);
    const [isShowDocs, { open: showDocs, close: closeDocs }] = useDisclosure(false);
    const smoothContent = useRef<string[]>([]);
    const smoothIntervalId = useRef<any>(-1);
    const smoothCurrentContent = useRef<string>('');
    const smoothCurrentIndex = useRef<number>(-1);
    const [attachItems, setAttachItems] = useState<AttachItem[]>([]);
    const [previewAttachItem, setPreviewAttachItem] = useState<AttachItem | null>(null);
    const messageDivRef = useRef<HTMLDivElement>(null);

    const updateAttachInfo = async () => {
      const attachItems: AttachItem[] | null = await store.getItem(
        attachKey(collectionId, inputMessage.id),
      );
      if (Array.isArray(attachItems) && attachItems.length > 0) {
        setAttachItems(attachItems);
      }
    };

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
              scrollElementRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
                inline: 'start',
              });
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

        smoothContent.current = [...newMessage];

        smoothIntervalId.current = setInterval(() => {
          if (smoothContent.current.length > smoothCurrentIndex.current + 1 && !isDone) {
            let nextChars = '';
            let smoothSize = 1;

            for (let i = 0; i < smoothSize; i++) {
              smoothCurrentIndex.current += 1;
              if (smoothCurrentIndex.current < smoothContent.current.length) {
                const nextChar = smoothContent.current[smoothCurrentIndex.current];
                nextChars += nextChar;
              }
            }

            smoothCurrentContent.current += nextChars;

            setMessage((prevState) => ({
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
      if (message.source === 'user' && !autoScrollIds.current[message.id]) {
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
            const saveMessagesFn = async () => {
              if (!collection) return;
              const collectionId = (collection?.key || collection) as string;
              const dbMessages = (await store.getItem<any[]>(messagesKey(collectionId))) || [];
              const dbMsgIndex = findIndex(dbMessages, (v: any) => v.id === nextMessage.id);
              if (dbMsgIndex >= 0) {
                dbMessages[dbMsgIndex] = nextMessage;
                await store.setItem(messagesKey(collectionId), dbMessages);
              }
            };
            void saveMessagesFn();
          }

          delete needRefreshMessageIds.current[message.id];
        }
      }, 500);

      return () => {
        clearInterval(intervalId);
      };
    }, [message, hasDocs, isBottom]);
    useEffect(() => {
      void updateAttachInfo();
    }, [inputMessage?.id]);
    useEffect(() => {
      if (attachItems.length > 0) {
        requestAnimationFrame(() => {
          messagePageScroll.current?.scrollBy({
            top: 16 + px('0.5rem'),
          });
        });
      }
    }, [attachItems]);

    return (
      <>
        {previewAttachItem && (
          <PreviewAttach
            attachItem={previewAttachItem}
            onClose={() => setPreviewAttachItem(null)}
          />
        )}
        <Modal
          opened={isShowDocs}
          onClose={closeDocs}
          title="Documents"
          centered
          scrollAreaComponent={ScrollArea.Autosize}
          size={'auto'}
        >
          <Container p={0} size={'sm'}>
            {isShowDocs &&
              map(message.docs, (doc, index) => {
                return (
                  <div
                    key={index}
                    className={classNames('text-xs', classes.pBreakAll, classes.imgBg)}
                  >
                    <MemoizedReactMarkdown
                      id={message.id}
                      content={doc}
                      smallText={true}
                      messagePageScroll={messagePageScroll}
                    />
                  </div>
                );
              })}
          </Container>
        </Modal>
        {!isChild && !isFirst && <div className={'h-5'} />}
        <div style={style}>
          <div
            className={classNames(
              'flex gap-2 items-start relative py-2',
              {
                [classes.messageBotBg]: !isChild,
                [classes.rootBorders]: !isChild,
                [classes.childBorders]: isChild,
                'flex-col': !isChild,
                'flex-row': isChild,
                [classes.streamDone]: doneMessages.current[message.id],
              },
              classes.messageBotContainer,
              {
                [classes.userQuestionBg]: isChild && message.source !== 'assistant',
              },
            )}
          >
            <div
              ref={scrollElementRef}
              className={'absolute'}
              style={{
                left: 0,
                bottom: 0,
              }}
            />
            {isChild && <div className={classes.childLine as string} />}
            <Tooltip label="Copied" opened={isCopied}>
              <div
                className="absolute right-1 bottom-2 la-copy flex flex-row gap-1"
                onMouseLeave={() => {
                  setTimeout(() => setIsCopied(false), 200);
                }}
              >
                <TextToSpeech
                  getText={() => {
                    return messageDivRef.current?.innerText || '';
                  }}
                >
                  {({ isLoading }) => {
                    return (
                      <ActionIcon
                        loading={isLoading}
                        size="xs"
                        variant="subtle"
                        onClick={async () => {}}
                        style={{ zIndex: 100 }}
                      >
                        <IconVolume />
                      </ActionIcon>
                    );
                  }}
                </TextToSpeech>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={async () => {
                    try {
                      const textBlob = new Blob([message.content], { type: 'text/plain' });
                      // const htmlBlob = new Blob([message.content], { type: "text/html" });

                      const clipboardItem = new ClipboardItem({
                        'text/plain': textBlob, // "text/html": htmlBlob,
                      });

                      await navigator.clipboard.write([clipboardItem]);
                    } catch (error) {
                      console.error('Failed to write to clipboard: ', error);
                    }
                    updateIsCopied();
                  }}
                  style={{ zIndex: 100 }}
                >
                  <IconCopy />
                </ActionIcon>
              </div>
            </Tooltip>
            <div style={{ position: isChild ? 'sticky' : undefined }} className="top-3 mx-2">
              <div className={'flex flex-row items-center gap-2'}>
                <div className={'relative'}>
                  {!isChild && (
                    <div className={'flex flex-row gap-1 items-center'}>
                      <div className={'text-3xl relative'}>
                        <div
                          className={
                            'absolute top-0 left-0 w-full h-full flex items-center justify-center'
                          }
                        >
                          <div
                            className={'rounded-full w-[34px] h-[34px]'}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          />
                        </div>
                        <div className={'relative inline-block'}>
                          <FunnyEmoji
                            emoji={collection?.emoji || '🥸'}
                            emojiType={isLast ? 'anim' : '3d'}
                            size={38}
                          />
                        </div>
                      </div>
                      <div className={'text-xl'}>{collection?.label}</div>
                    </div>
                  )}
                  {isChild && (
                    <div className={'w-3 relative'}>
                      {isChild && message.source !== 'assistant' && (
                        <div className={'absolute'}>
                          <IconMoodPuzzled size={'1.5rem'} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!isChild && (
                  <div className={'flex flex-row gap-2 items-center'}>
                    <DateInfo message={message} />
                  </div>
                )}
              </div>
            </div>
            <div className={classNames('flex-grow w-full')}>
              <div
                className={classNames(classes.messageContent, classes.imgBg, {
                  'px-2': !isMobile,
                })}
                ref={messageDivRef}
              >
                {message.content !== '...' && (
                  <MemoizedReactMarkdown
                    isTyping={isTyping}
                    isFirst={!isChild}
                    content={message.content}
                    id={message.id}
                    messagePageScroll={messagePageScroll}
                  />
                )}
                {message.content === '...' && <TypingBlinkCursor />}
              </div>
              {hasDocs && (
                <div className="mx-2">
                  <Badge
                    onClick={showDocs}
                    className={classNames('cursor-pointer', classes.fadeIn)}
                    size={'xs'}
                    leftSection={
                      <div className={'flex items-center relative w-3.5 justify-center'}>
                        <div className={'absolute top-0 left-0 w-full'} style={{ height: 16 }}>
                          {Array.isArray(message.docs) ? (
                            <Text
                              size={'sm'}
                              className={'text-center w-full'}
                              style={{ lineHeight: 0 }}
                            >
                              {message.docs?.length}
                            </Text>
                          ) : (
                            <Loader
                              size={'xs'}
                              className={'relative -top-2 -left-1'}
                              variant="dots"
                            />
                          )}
                        </div>
                      </div>
                    }
                  >
                    Documents
                  </Badge>
                </div>
              )}
              <Transition
                transition={'slide-up'}
                mounted={attachItems.length > 0}
                duration={200}
                timingFunction="ease"
              >
                {(styles) => (
                  <div style={styles} className={'flex flex-row relative px-2 mt-2'}>
                    <div className={'flex-grow'}>
                      <div className={'flex flex-row w-full gap-1 items-center flex-wrap'}>
                        {map(attachItems, (item) => {
                          return (
                            <div
                              key={item.id}
                              className={'flex items-center cursor-pointer'}
                              title={'Preview'}
                              onClick={() => {
                                setPreviewAttachItem(item);
                              }}
                            >
                              <AttachName name={item.name} type={item.type} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Transition>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export default MessageItem;
