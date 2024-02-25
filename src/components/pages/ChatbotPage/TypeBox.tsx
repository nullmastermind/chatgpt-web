import React, { createRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useDebounce, useLocalStorage, useMeasure, useMount, useSessionStorage, useSetState } from "react-use";
import {
  useCollections,
  useCurrentCollection,
  useCurrentTypeBoxId,
  useDocId,
  useIndexedDocs,
  useOpenaiAPIKey,
  useQuickActions,
  useQuickActionsQuery,
} from "@/states/states";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import {
  findHighlight,
  formatString,
  IndexedDocument,
  notifyIndexerVersionError,
  processTaggedMessage,
  searchArray,
  validateField,
} from "@/utility/utility";
import {
  ActionIcon,
  Button,
  Divider,
  Highlight,
  Modal,
  NativeSelect,
  ScrollArea,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { spotlight, SpotlightAction } from "@mantine/spotlight";
import { useForm } from "@mantine/form";
import { cloneDeep, findIndex, uniqueId } from "lodash";
import { requestChatStream } from "@/components/pages/ChatbotPage/Message.api";
import ModelSelect from "@/components/pages/ChatbotPage/ModelSelect";
import { MessageItemType } from "@/components/pages/ChatbotPage/Message";
import CountTokens from "@/components/pages/ChatbotPage/CountTokens";
import { getImprovePrompt } from "@/utility/warmup";
import axios from "axios";
import { indexerHost, indexerVersion } from "@/config";
import { IconSettings } from "@tabler/icons-react";
import DocsModal from "@/components/pages/ChatbotPage/DocsModal";
import { isMobile } from "react-device-detect";

export const TypeBox = forwardRef(
  (
    {
      collection,
      onSubmit,
      messages,
      onCancel,
      isReplyBox,
      exId,
      includeMessages,
    }: {
      collection: any;
      onSubmit: (content: string, tokens: number, docId: string) => any;
      messages: any[];
      onCancel?: () => any;
      isReplyBox?: boolean;
      exId?: any;
      includeMessages: MessageItemType[];
    },
    ref
  ) => {
    const [id] = useState(uniqueId("TypeBox"));
    const [messageContent, setMessageContent] = useState<string>("");
    const [messageContentStore, setMessageContentStore] = useSessionStorage<string>(
      `:messageBox:${collection}:${exId}`,
      ""
    );
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const inputImproveRef = useRef<HTMLTextAreaElement>(null);
    const [collections] = useCollections();
    const [, setCurrentCollection] = useCurrentCollection();
    const [isFocus, setIsFocus] = useState(false);
    const [opened, { open, close }] = useDisclosure(false);
    const [improvedPrompt, setImprovedPrompt] = useState("");
    const [openaiAPIKey] = useOpenaiAPIKey();
    const [canEdit, setCanEdit] = useState(false);
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const isShowQuickCommand = useMemo(() => {
      const regex = /^\/[a-zA-Z0-9_-]*$/;
      return (messageContent === "/" || regex.test(messageContent)) && !messageContent.includes("\n");
    }, [messageContent]);
    const [nextFocus, setNextFocus] = useState(false);
    const [wRef] = useMeasure();
    const [quickCommands, setQuickCommands] = useLocalStorage<
      {
        name: string;
        content: string;
        category: any;
      }[]
    >(":quickCommands", []);
    const [query] = useQuickActionsQuery();
    const quickCommandList = useMemo(() => {
      const commands = quickCommands as any[];
      const search = query.replace("/", "");
      const validCommands = searchArray(
        search,
        commands.map(v => v.name)
      );
      return commands
        .filter(v => validCommands.includes(v.name))
        .map(v => {
          const match = ["/", ...findHighlight(v.name, search)];
          return {
            match,
            type: "command",
            title: (<Highlight highlight={match}>{v.name}</Highlight>) as any,
            id: v.name,
            description: formatString(v.content),
            onTrigger(action: SpotlightAction) {
              const content = (action.content as string).replace(/\r\n/g, "\n");

              setMessageContent(content);
              inputRef.current!.value = content;

              // auto pos
              if (content.includes("```\n\n```")) {
                const cursor = content.lastIndexOf("```\n\n```") + 4;
                inputRef.current?.setSelectionRange(cursor, cursor);
              } else if (content.includes('""')) {
                const cursor = content.lastIndexOf('""') + 1;
                inputRef.current?.setSelectionRange(cursor, cursor);
              } else if (content.includes("''")) {
                const cursor = content.lastIndexOf("''") + 1;
                inputRef.current?.setSelectionRange(cursor, cursor);
              }
              //

              inputRef.current?.focus();
            },
            ...v,
          } as SpotlightAction;
        });
    }, [quickCommands, query, isShowQuickCommand]);
    const [openedCommand, { open: openCommand, close: closeCommand }] = useDisclosure(false);
    const commandForm = useForm({
      initialValues: {
        name: "",
        content: "",
        category: `${collection}`,
      },
      validate: {
        name: v =>
          validateField(v)
            ? null
            : "Invalid field. Please use lowercase letters and do not use special characters or spaces. Use the _ or - character to replace spaces.",
        content: v => (v.length ? null : "Required field."),
      },
    });
    const isEditCommand = useMemo(() => {
      return findIndex(quickCommands, v => v.content === messageContent) !== -1;
    }, [messageContent, quickCommands]);
    const [, setQuickActions] = useQuickActions();
    const [currentTypeBoxId, setCurrentTypeBoxId] = useCurrentTypeBoxId();
    const countTokenRef = createRef<any>();
    const [docs, setDocs] = useIndexedDocs();
    const [docId, setDocId] = useDocId();
    const [docModalOpened, { open: openDocModal, close: closeDocModal }] = useDisclosure(false);
    const [docModalOpenSettings, setDocModalOpenSettings] = useSetState({
      initSearchValue: "",
      initDocId: "",
    });

    const handleImprove = () => {
      if (!inputRef.current) return;

      let selectedText = inputRef.current.value.substring(
        inputRef.current.selectionStart,
        inputRef.current.selectionEnd
      );
      if (!selectedText) {
        selectedText = inputRef.current.value;
      }

      if (!selectedText) return;

      open();
      setImprovedPrompt("");
      setCanEdit(false);
      setSelectionStart(inputRef.current.selectionStart);
      setSelectionEnd(inputRef.current.selectionEnd);

      requestChatStream("v1/completions", getImprovePrompt(selectedText), {
        token: openaiAPIKey,
        modelConfig: {
          model: "gpt-3.5-turbo-instruct",
          temperature: 0.0,
          max_tokens: 2867,
        },
        onMessage: (message, done) => {
          message = processTaggedMessage("document", message, done);

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
        "Enter",
        () => {
          if (opened) {
            if (canEdit) {
              confirmImprove();
            }
          } else {
            if (!isFocus && !isShowQuickCommand) {
              inputRef.current?.focus();
            }
          }
        },
      ],
    ]);
    useEffect(() => {
      if (!isReplyBox) {
        setMessageContentStore(messageContent);
      }
    }, [isReplyBox, messageContent]);
    useMount(() => {
      if (!isReplyBox) {
        setMessageContent(messageContentStore);
      }
    });
    useEffect(() => {
      if (currentTypeBoxId === id) {
        setQuickActions(quickCommandList);
      }
    }, [quickCommandList, currentTypeBoxId, id]);

    const onSend = (c?: string) => {
      onSubmit(c || messageContent, countTokenRef.current?.getTokens(), docId);
      setMessageContent("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const confirmImprove = () => {
      if (!inputRef.current) return;
      if (selectionEnd === selectionStart) {
        setMessageContent(improvedPrompt);
        onSend(improvedPrompt);
      } else {
        const part0 = inputRef.current.value.substring(0, selectionStart);
        const part1 = part0 + improvedPrompt;
        const newContent = part1 + inputRef.current.value.substring(selectionEnd);
        inputRef.current.value = newContent;
        inputRef.current.setSelectionRange(part0.length, part1.length);
        setMessageContent(newContent);
      }
      inputRef.current.focus();
      close();
    };

    useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.placeholder = [
          "/ = command\nEnter = submit, Shift+Enter = \\n",
          "↑↓ to take previous message",
          "F1 to show Improve",
        ]
          .filter(v => !!v)
          .join("\n");
      }
    }, [inputRef, isFocus]);
    useDebounce(
      () => {
        if (nextFocus) {
          inputRef.current?.focus();
          setNextFocus(false);
        }
      },
      100,
      [nextFocus]
    );
    useDebounce(
      () => {
        // if (includeMessages.length === 0) {
        axios
          .get(`${indexerHost}/api/docs`)
          .then(({ data: { data: docs } }) => {
            setDocs((docs as IndexedDocument[]).filter(v => v.isIndexed).map(v => v.doc_id));
          })
          .catch(e => {});
        // }
      },
      300,
      [includeMessages]
    );
    useEffect(() => {
      localStorage.setItem(":docId", docId);
    }, [docId]);
    useEffect(() => {
      if (docId && docId !== "Choose document" && sessionStorage.getItem(":indexerVersion") !== indexerVersion) {
        const currentIndexerVersion = { value: "1.0.0" };
        axios
          .get(`${indexerHost}/api/get-version`)
          .then(({ data }) => {
            currentIndexerVersion.value = data.data;
          })
          .finally(() => {
            if (currentIndexerVersion.value !== indexerVersion) {
              sessionStorage.setItem(":indexerVersionError", "1");
            } else {
              sessionStorage.removeItem(":indexerVersionError");
              sessionStorage.setItem(":indexerVersion", currentIndexerVersion.value);
            }
          });
      }
    }, [docId]);

    return (
      <>
        <Modal
          opened={openedCommand}
          onClose={() => {
            closeCommand();
          }}
          centered={true}
          title="Command tool"
          scrollAreaComponent={ScrollArea.Autosize}
        >
          <TextInput label="Name" placeholder="command_name_example" required {...commandForm.getInputProps("name")} />
          <Textarea
            className="mt-2"
            label="Template"
            required={true}
            placeholder="Content..."
            minRows={5}
            maxRows={10}
            autosize={true}
            {...commandForm.getInputProps("content")}
          />
          <div className="mt-5 flex gap-3 items-center justify-end">
            <Button variant="default" onClick={() => closeCommand()}>
              Close
            </Button>
            {isEditCommand && (
              <Button
                variant="outline"
                color="red"
                onClick={() => {
                  const index = findIndex(quickCommands, v => v.name === commandForm.values.name);
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

                const index = findIndex(quickCommands, v => v.name === commandForm.values.name);
                const saveItem = {
                  name: commandForm.values.name,
                  content: commandForm.values.content,
                  category: commandForm.values.category,
                };
                if (index === -1) {
                  quickCommands!.push(saveItem);
                } else {
                  quickCommands![index] = saveItem;
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
        <div className="flex flex-row items-baseline gap-3">
          <Modal
            opened={opened}
            onClose={() => {
              inputRef.current?.focus();
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
              onChange={e => {
                if (!canEdit) return;
                if (e.target.value !== improvedPrompt) {
                  setImprovedPrompt(e.target.value);
                }
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  confirmImprove();
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              ref={inputImproveRef}
            ></Textarea>
          </Modal>
          <div className="flex-grow" ref={wRef as any}>
            <Textarea
              ref={inputRef}
              spellCheck={true}
              onFocus={() => {
                setIsFocus(true);
                setQuickActions(quickCommandList);
              }}
              onBlur={() => {
                setIsFocus(false);
              }}
              autoFocus
              placeholder="Send a message..."
              onChange={e => setMessageContent(e.target.value)}
              value={messageContent}
              autosize={true}
              maxRows={4}
              minRows={4}
              className="w-full"
              onKeyDown={(e: any) => {
                const isMod = e.ctrlKey || e.metaKey;
                const isCursorEnd = e.target.selectionStart === e.target.value.length;

                if (e.key === "Escape" && onCancel) {
                  if (onCancel) onCancel();
                  return;
                }

                if (e.key === "/" && e.target.value.length === 0) {
                  spotlight.open();
                  setCurrentTypeBoxId(id);
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }

                if (e.key === "F1") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleImprove();
                }

                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  setMessageContent(messageContent.substring(0, start) + "\t" + messageContent.substring(end));
                  e.target.selectionStart = e.target.selectionEnd = start + 1;
                }
                if (isMod && +e.key >= 1 && +e.key <= 9) {
                  e.preventDefault();
                  const index = +e.key - 1;
                  if (index <= collections.length - 1) {
                    setCurrentCollection(collections[index].key);
                  }
                }

                if (!isReplyBox) {
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
          </div>
        </div>
        <div className="flex flex-row gap-2 items-center justify-end">
          {!isMobile && (
            <div className={"flex-grow self-start"}>
              <CountTokens ref={countTokenRef} content={messageContent} includeMessages={includeMessages} />
            </div>
          )}
          {!isMobile && (
            <div className="flex flex-row items-center border border-blue-500">
              <Tooltip label={"Private Document Management"}>
                <ActionIcon
                  onClick={() => {
                    notifyIndexerVersionError();
                    setDocModalOpenSettings({
                      initDocId: docId,
                      initSearchValue: docId,
                    });
                    openDocModal();
                  }}
                >
                  <IconSettings size={"1.25rem"} />
                </ActionIcon>
              </Tooltip>
              <NativeSelect
                value={docId}
                size={"xs"}
                data={[
                  {
                    label: "Choose document",
                    value: "",
                  },
                  ...docs,
                ]}
                onChange={e => setDocId(e.target.value)}
              />
              <Divider orientation={"vertical"} className={"ml-2"} />
            </div>
          )}
          <ModelSelect />
          {onCancel && (
            <Button size={"xs"} onClick={onCancel} variant="default">
              Cancel
            </Button>
          )}
          {!isMobile && !isReplyBox && (
            <Button
              size={"xs"}
              onClick={() => {
                commandForm.setFieldValue("content", messageContent);
                if (isEditCommand) {
                  const index = findIndex(quickCommands, v => v.content === messageContent);
                  if (index !== -1) {
                    commandForm.setFieldValue("name", quickCommands![index].name);
                    commandForm.setFieldValue("category", quickCommands![index].category);
                  } else {
                    commandForm.setFieldValue("name", "");
                    commandForm.setFieldValue("category", `${collection}`);
                  }
                } else {
                  commandForm.setFieldValue("name", "");
                  commandForm.setFieldValue("category", `${collection}`);
                }
                openCommand();
              }}
              variant="default"
            >
              {isEditCommand ? "Edit this" : "Save as"} command
            </Button>
          )}
          <Button
            onClick={() => {
              inputRef.current?.focus();
              onSend();
            }}
            variant="gradient"
            size={"xs"}
          >
            Send
          </Button>
        </div>
      </>
    );
  }
);
