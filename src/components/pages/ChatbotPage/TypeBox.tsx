import {
  Button,
  Divider,
  Highlight,
  Modal,
  ScrollArea,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { SpotlightAction, spotlight } from '@mantine/spotlight';
import { IconFileStack, IconSearch } from '@tabler/icons-react';
import classNames from 'classnames';
import { cloneDeep, findIndex, uniqueId } from 'lodash';
import React, {
  createRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isMobile } from 'react-device-detect';
import {
  useDebounce,
  useLocalStorage,
  useMeasure,
  useSessionStorage,
  useSetState,
} from 'react-use';

import UserInput, { EditorCommands } from '@/components/misc/UserInput';
import { AttachItem } from '@/components/misc/types';
import CountTokens from '@/components/pages/ChatbotPage/CountTokens';
import DocsModal from '@/components/pages/ChatbotPage/DocsModal';
import { MessageItemType } from '@/components/pages/ChatbotPage/Message';
import { requestChatStream } from '@/components/pages/ChatbotPage/Message.api';
import ModelSelect from '@/components/pages/ChatbotPage/ModelSelect';
import UploadFile from '@/components/pages/ChatbotPage/UploadFile';
import {
  useCollections,
  useCurrentCollection,
  useCurrentTypeBoxId,
  useOpenaiAPIKey,
  useQuickActions,
  useQuickActionsQuery,
} from '@/states/states';
import {
  findHighlight,
  formatString,
  notifyIndexerVersionError,
  processTaggedMessage,
  removeHTMLTags,
  searchArray,
} from '@/utility/utility';
import { getImprovePrompt } from '@/utility/warmup';

export const TypeBox = forwardRef(
  (
    {
      collectionId,
      onSubmit,
      onCancel,
      isReplyBox,
      exId,
      includeMessages,
    }: {
      collectionId: any;
      onSubmit: (content: string, tokens: number, attachItems: AttachItem[]) => any;
      messages: any[];
      onCancel?: () => any;
      isReplyBox?: boolean;
      exId?: any;
      includeMessages: MessageItemType[];
    },
    ref,
  ) => {
    const [id] = useState(uniqueId('TypeBox'));
    const editorRef = useRef<EditorCommands>(null);
    const [messageContentStore, setMessageContentStore] = useSessionStorage<string>(
      `:messageBox:${collectionId}:${exId}`,
      '',
    );
    const inputImproveRef = useRef<HTMLTextAreaElement>(null);
    const [, setIsFocus] = useState(false);
    const [opened, { open, close }] = useDisclosure(false);
    const [improvedPrompt, setImprovedPrompt] = useState('');
    const [openaiAPIKey] = useOpenaiAPIKey();
    const [canEdit, setCanEdit] = useState(false);
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const [nextFocus, setNextFocus] = useState(false);
    const [wRef] = useMeasure();
    const [, setCurrentCollection] = useCurrentCollection();
    const [collections] = useCollections();
    const [quickCommands, setQuickCommands] = useLocalStorage<
      {
        name: string;
        content: string;
        category: any;
        id: number;
      }[]
    >(':quickCommands.v1', []);
    const [query] = useQuickActionsQuery();
    const quickCommandList = useMemo(() => {
      const commands = quickCommands as any[];
      const search = query.replace('/', '');

      return searchArray(search, commands).map((v) => {
        const match = ['/', ...findHighlight(v.name, search)];

        return {
          match,
          type: 'command',
          title: (<Highlight highlight={match}>{v.name}</Highlight>) as any,
          id: v.name,
          description: formatString(removeHTMLTags(v.content)),
          onTrigger(action: SpotlightAction) {
            const content = (action.content as string).replace(/\r\n/g, '\n');

            editorRef.current?.setValue(content);

            // auto pos
            if (content.includes('```\n\n```')) {
              const cursor = content.lastIndexOf('```\n\n```') + 4;
              editorRef.current?.setSelectionRange(cursor, cursor);
            } else if (content.includes('""')) {
              const cursor = content.lastIndexOf('""') + 1;
              editorRef.current?.setSelectionRange(cursor, cursor);
            } else if (content.includes("''")) {
              const cursor = content.lastIndexOf("''") + 1;
              editorRef.current?.setSelectionRange(cursor, cursor);
            }
            //
            const focusInterval = setInterval(() => {
              editorRef.current?.focus();
            }, 16);
            setTimeout(() => clearInterval(focusInterval), 100);
          },
          onEdit(action: SpotlightAction) {
            const intervalId = setInterval(() => {
              spotlight.close();
            }, 50);
            setTimeout(() => {
              clearInterval(intervalId);
              commandForm.setFieldValue('content', action.content);
              commandForm.setFieldValue('name', action.name);
              commandForm.setFieldValue('category', action.category);
              commandForm.setFieldValue('id', +action.id!);
              openCommand();
            }, 100);
          },
          ...v,
        } as SpotlightAction;
      });
    }, [quickCommands, query]);
    const [openedCommand, { open: openCommand, close: closeCommand }] = useDisclosure(false);
    const commandForm = useForm({
      initialValues: {
        name: '',
        content: '',
        category: `${collectionId}`,
        id: 0,
      },
      validate: {
        name: (v) => (v.length ? null : 'Required field.'),
        content: (v) => (v.length ? null : 'Required field.'),
      },
    });
    const isEditCommand = useMemo(() => {
      return +commandForm.values.id > 0 && openedCommand;
    }, [commandForm, openedCommand]);
    const [, setQuickActions] = useQuickActions();
    const [currentTypeBoxId, setCurrentTypeBoxId] = useCurrentTypeBoxId();
    const countTokenRef = createRef<any>();
    const [docModalOpened, { open: openDocModal, close: closeDocModal }] = useDisclosure(false);
    const [docModalOpenSettings, setDocModalOpenSettings] = useSetState({
      initSearchValue: '',
      initDocId: '',
    });
    const [attachItems, setAttachItems] = useState<AttachItem[]>([]);

    const handleImprove = () => {
      if (!editorRef.current) return;

      let selectedText = editorRef.current.getSelectionText();

      if (!selectedText) {
        selectedText = editorRef.current.getValue();
      }

      if (!selectedText) return;

      open();
      setImprovedPrompt('');
      setCanEdit(false);
      setSelectionStart(editorRef.current.getSelectionStart());
      setSelectionEnd(editorRef.current.getSelectionEnd());

      requestChatStream('v1/completions', getImprovePrompt(selectedText), {
        token: openaiAPIKey,
        modelConfig: {
          model: 'gpt-3.5-turbo-instruct',
          temperature: 0.0,
          max_tokens: 2867,
        },
        onMessage: (message, done) => {
          message = processTaggedMessage('document', message, done);

          setImprovedPrompt(message);
          if (done) {
            setCanEdit(true);
            inputImproveRef.current?.focus();
          }
        },
        onController: () => {},
        onError: () => {},
      }).finally();
    };

    useHotkeys([
      [
        'Enter',
        () => {
          if (opened) {
            if (canEdit) {
              confirmImprove();
            }
          }
        },
      ],
    ]);
    useEffect(() => {
      let timer: any = -1;
      if (!isReplyBox) {
        timer = setInterval(() => {
          if (editorRef.current) {
            if (messageContentStore) editorRef.current?.setValue(messageContentStore);
            clearInterval(timer);
          }
        }, 30);
      }
      return () => clearInterval(timer);
    }, []);
    useEffect(() => {
      if (currentTypeBoxId === id) {
        setQuickActions(quickCommandList);
      }
    }, [quickCommandList, currentTypeBoxId, id]);

    const onSend = (c?: string) => {
      onSubmit(
        c || editorRef.current?.getValue() || '',
        countTokenRef.current?.getTokens(),
        cloneDeep(attachItems),
      );
      setAttachItems([]);
      editorRef.current?.setValue('');
      setMessageContentStore('');
    };

    const confirmImprove = () => {
      if (!editorRef.current) return;
      if (selectionEnd === selectionStart) {
        editorRef.current?.setValue(improvedPrompt);
        onSend(improvedPrompt);
      } else {
        editorRef.current.replaceSelectionText(improvedPrompt.trim());
      }
      editorRef.current.focus();
      close();
    };

    useImperativeHandle(ref, () => ({
      focus() {
        editorRef.current?.focus();
      },
    }));

    useDebounce(
      () => {
        if (nextFocus) {
          editorRef.current?.focus();
          setNextFocus(false);
        }
      },
      100,
      [nextFocus],
    );

    return (
      <>
        <Modal
          opened={openedCommand}
          onClose={() => {
            commandForm.setFieldValue('id', 0);
            closeCommand();
          }}
          centered={true}
          title="Message template"
          scrollAreaComponent={ScrollArea.Autosize}
          size="lg"
        >
          <div>
            <TextInput
              label="Name"
              placeholder="Name..."
              required
              {...commandForm.getInputProps('name')}
            />
            <div className={'mt-2'}>
              <UserInput
                isReplyBox={true}
                placeholder={'Content...'}
                required={true}
                defaultValue={commandForm.getInputProps('content').value}
                {...commandForm.getInputProps('content')}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3 items-center justify-end sticky bottom-0">
            <Button variant="default" onClick={() => closeCommand()}>
              Close
            </Button>
            {isEditCommand && (
              <Button
                variant="outline"
                color="red"
                onClick={() => {
                  const index = findIndex(quickCommands, (v) => v.id === commandForm.values.id);
                  if (index >= 0) {
                    quickCommands?.splice(index, 1);
                    setQuickCommands(cloneDeep(quickCommands));
                    closeCommand();
                  }
                }}
              >
                Delete
              </Button>
            )}
            <Button
              onClick={() => {
                if (commandForm.validate().hasErrors) {
                  return;
                }

                const index = findIndex(quickCommands, (v) => v.id === commandForm.values.id);
                const saveItem = {
                  name: commandForm.values.name,
                  content: commandForm.values.content,
                  category: commandForm.values.category,
                };
                if (index === -1) {
                  quickCommands!.push({
                    ...saveItem,
                    id: Date.now(),
                  });
                } else {
                  quickCommands![index] = { ...quickCommands![index], ...saveItem };
                }

                setQuickCommands(cloneDeep(quickCommands));
                closeCommand();
              }}
            >
              Save
            </Button>
          </div>
        </Modal>
        <DocsModal opened={docModalOpened} close={closeDocModal} {...docModalOpenSettings} />
        <div className={'flex flex-row gap-1 items-center'}>
          <div className={'flex-grow'}>
            <UploadFile
              data={attachItems}
              onChange={(value) => setAttachItems(value)}
              onClear={() => setAttachItems([])}
            />
          </div>
        </div>
        <div className="flex flex-row items-baseline gap-3">
          <Modal
            opened={opened}
            onClose={() => {
              editorRef.current?.focus();
              close();
            }}
            centered={true}
            title="Tool to enhance your prompt"
            scrollAreaComponent={ScrollArea.Autosize}
          >
            <div className="flex items-end justify-end pb-3">
              <Button onClick={() => confirmImprove()}>Confirm</Button>
            </div>
            <Textarea
              value={improvedPrompt}
              minRows={5}
              maxRows={10}
              autoFocus={true}
              autosize={true}
              placeholder="Currently improving..."
              onChange={(e) => {
                if (!canEdit) return;
                if (e.target.value !== improvedPrompt) {
                  setImprovedPrompt(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  confirmImprove();
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              ref={inputImproveRef}
            ></Textarea>
          </Modal>
          <div className="flex-grow min-h-[100px] relative" ref={wRef as any}>
            <UserInput
              ref={editorRef as any}
              isReplyBox={isReplyBox}
              onFocus={() => {
                setIsFocus(true);
                setQuickActions(quickCommandList);
              }}
              onBlur={() => {
                setIsFocus(false);
              }}
              className={classNames({
                'absolute bottom-0': !isReplyBox,
              })}
              onChange={(e) => {
                if (!isReplyBox) {
                  setMessageContentStore(e as string);
                }
              }}
              autoFocus={true}
              onKeyDown={(e: any) => {
                const isMod = e.ctrlKey || e.metaKey;
                //
                if (e.key === '/' && editorRef.current?.isEmpty()) {
                  spotlight.open();
                  setCurrentTypeBoxId(id);
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                //
                if (e.key === 'F1') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleImprove();
                }
                //
                if (e.key === 'Tab') {
                  e.preventDefault();
                  editorRef.current?.insertContentAtCurrentCursor('\t');
                }
                if (isMod && +e.key >= 1 && +e.key <= 9) {
                  e.preventDefault();
                  const index = +e.key - 1;
                  if (index <= collections.length - 1) {
                    setCurrentCollection(collections[index].key);
                  }
                }

                // if (!isReplyBox) {
                //   if (e.key === "ArrowUp" && !isMod && !e.shiftKey && isCursorEnd) {
                //     let startScanIndex = messages.length - 1;
                //     if (messageContent) {
                //       startScanIndex = findIndex(messages, m => {
                //         return m.source === "user" && m.content === messageContent;
                //       });
                //     }
                //     if (startScanIndex > 0) {
                //       for (let i = startScanIndex - 1; i >= 0; i--) {
                //         if (messages[i].source === "user") {
                //           e.preventDefault();
                //           setMessageContent(messages[i].content);
                //           break;
                //         }
                //       }
                //     }
                //   }
                //   if (e.key === "ArrowDown" && !isMod && !e.shiftKey && isCursorEnd) {
                //     let startScanIndex = 0;
                //     if (messageContent) {
                //       startScanIndex = findIndex(messages, m => {
                //         return m.source === "user" && m.content === messageContent;
                //       });
                //     }
                //     if (startScanIndex < messages.length - 1 && startScanIndex >= 0) {
                //       if (messageContent.length > 0) {
                //         startScanIndex += 1;
                //       }
                //       for (let i = startScanIndex; i < messages.length; i++) {
                //         if (messages[i].source === "user") {
                //           e.preventDefault();
                //           setMessageContent(messages[i].content);
                //           break;
                //         }
                //       }
                //     }
                //   }
                // }

                if (e.key === 'Enter') {
                  const enterToSend = localStorage.getItem(':enterToSend') === '1';
                  if (!enterToSend && !e.shiftKey) {
                    onSend();
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (enterToSend && isMod) {
                    onSend();
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
                if (e.key === 'Tab') {
                  if (/[^a-zA-Z0-9]/.test(editorRef.current?.getValue() || '')) {
                    e.preventDefault();
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="flex flex-row gap-2 items-center justify-end">
          {!isMobile && (
            <div className={'flex-grow self-start'}>
              <CountTokens
                ref={countTokenRef}
                content={editorRef.current?.getValue() || ''}
                includeMessages={includeMessages}
                collectionKey={collectionId}
              />
            </div>
          )}
          {!isMobile && (
            <div className="flex flex-row items-center border border-blue-500">
              <Tooltip label={'Private Document Management'}>
                <Button
                  variant={'default'}
                  size={'xs'}
                  onClick={() => {
                    notifyIndexerVersionError();
                    setDocModalOpenSettings({});
                    openDocModal();
                  }}
                  leftIcon={<IconFileStack size={'1.3rem'} />}
                >
                  Private document
                </Button>
              </Tooltip>
              <Divider orientation={'vertical'} className={'ml-2'} />
            </div>
          )}
          <ModelSelect />
          {onCancel && (
            <Button size={'xs'} onClick={onCancel} variant="default">
              Cancel
            </Button>
          )}
          {!isMobile && !isReplyBox && (
            <Button.Group>
              <Button
                size={'xs'}
                onClick={() => {
                  commandForm.setFieldValue('content', editorRef.current?.getValue() || '');
                  if (isEditCommand) {
                    const index = findIndex(
                      quickCommands,
                      (v) => v.content === editorRef.current?.getValue(),
                    );
                    if (index !== -1) {
                      commandForm.setFieldValue('name', quickCommands![index].name);
                      commandForm.setFieldValue('category', quickCommands![index].category);
                      commandForm.setFieldValue('id', quickCommands![index].id);
                    } else {
                      commandForm.setFieldValue('name', '');
                      commandForm.setFieldValue('category', `${collectionId}`);
                    }
                  } else {
                    commandForm.setFieldValue('name', '');
                    commandForm.setFieldValue('category', `${collectionId}`);
                  }
                  openCommand();
                }}
                variant="default"
              >
                {isEditCommand ? 'Edit this' : 'Save as'} template
              </Button>
              <Tooltip
                label={
                  'For quick access, type "/" when the editor is empty to show a list of templates'
                }
              >
                <Button
                  className={'px-1'}
                  title={
                    'For quick access, type "/" when the editor is empty to show a list of templates'
                  }
                  variant={'default'}
                  size={'xs'}
                  onClick={() => {
                    setCurrentTypeBoxId(id);
                    spotlight.open();
                  }}
                >
                  <IconSearch size={'1.3rem'} />
                </Button>
              </Tooltip>
            </Button.Group>
          )}
          <Button
            onClick={() => {
              editorRef.current?.focus();
              onSend();
            }}
            variant="gradient"
            size={'xs'}
            className={'flex-grow sm:flex-grow-0 min-w-[100px]'}
          >
            Send
          </Button>
        </div>
      </>
    );
  },
);
