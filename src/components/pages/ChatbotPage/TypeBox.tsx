import React, { createRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useDebounce, useLocalStorage, useMeasure, useMount, useSessionStorage, useSetState } from "react-use";
import {
  useCollections,
  useCurrentCollection,
  useCurrentTypeBoxId,
  useDocId,
  useEnableDocument,
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
  Switch,
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
import UserInput, { EditorCommands } from "@/components/misc/UserInput";
import classNames from "classnames";
import UploadFile from "@/components/pages/ChatbotPage/UploadFile";

export const TypeBox = forwardRef(
  (
    {
      collection,
      onSubmit,
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
    const editorRef = useRef<EditorCommands>(null);
    const [messageContentStore, setMessageContentStore] = useSessionStorage<string>(
      `:messageBox:${collection}:${exId}`,
      ""
    );
    const inputImproveRef = useRef<HTMLTextAreaElement>(null);
    const [isFocus, setIsFocus] = useState(false);
    const [opened, { open, close }] = useDisclosure(false);
    const [improvedPrompt, setImprovedPrompt] = useState("");
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

              editorRef.current?.setValue(content);

              // auto pos
              if (content.includes("```\n\n```")) {
                const cursor = content.lastIndexOf("```\n\n```") + 4;
                editorRef.current?.setSelectionRange(cursor, cursor);
              } else if (content.includes('""')) {
                const cursor = content.lastIndexOf('""') + 1;
                editorRef.current?.setSelectionRange(cursor, cursor);
              } else if (content.includes("''")) {
                const cursor = content.lastIndexOf("''") + 1;
                editorRef.current?.setSelectionRange(cursor, cursor);
              }
              //

              editorRef.current?.focus();
            },
            ...v,
          } as SpotlightAction;
        });
    }, [quickCommands, query]);
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
      return findIndex(quickCommands, v => v.content === editorRef.current?.getValue()) !== -1;
    }, [quickCommands]);
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
    const [enableDocument, setEnableDocument] = useEnableDocument();

    const handleImprove = () => {
      if (!editorRef.current) return;

      // let selectedText = editorRef.current
      //   .getValue()
      //   .substring(editorRef.current.getSelectionStart(), editorRef.current.getSelectionEnd());

      let selectedText = editorRef.current.getSelectionText();

      if (!selectedText) {
        selectedText = editorRef.current.getValue();
      }

      if (!selectedText) return;

      open();
      setImprovedPrompt("");
      setCanEdit(false);
      setSelectionStart(editorRef.current.getSelectionStart());
      setSelectionEnd(editorRef.current.getSelectionEnd());

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
          }
        },
      ],
    ]);
    useMount(() => {
      if (!isReplyBox) {
        editorRef.current?.setValue(messageContentStore);
      }
    });
    useEffect(() => {
      if (currentTypeBoxId === id) {
        setQuickActions(quickCommandList);
      }
    }, [quickCommandList, currentTypeBoxId, id]);

    const onSend = (c?: string) => {
      onSubmit(
        c || editorRef.current?.getValue() || "",
        countTokenRef.current?.getTokens(),
        enableDocument ? docId : ""
      );
      editorRef.current?.setValue("");
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
          .catch(() => {
            setDocId("");
            setEnableDocument(false);
          });
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
        <UploadFile />
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
                "absolute bottom-0": !isReplyBox,
              })}
              onChange={e => {
                if (!isReplyBox) {
                  setMessageContentStore(e as string);
                }
              }}
              autoFocus={true}
              onKeyDown={(e: any) => {
                const isMod = e.ctrlKey || e.metaKey;
                //
                if (e.key === "/" && editorRef.current?.isEmpty()) {
                  spotlight.open();
                  setCurrentTypeBoxId(id);
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                //
                if (e.key === "F1") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleImprove();
                }
                //
                if (e.key === "Tab") {
                  e.preventDefault();
                  editorRef.current?.insertContentAtCurrentCursor("\t");
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

                if (e.key === "Enter" && !e.shiftKey && isMod) {
                  onSend();
                  e.preventDefault();
                  e.stopPropagation();
                }
                if (e.key === "Tab") {
                  if (/[^a-zA-Z0-9]/.test(editorRef.current?.getValue() || "")) {
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
              <CountTokens
                ref={countTokenRef}
                content={editorRef.current?.getValue() || ""}
                includeMessages={includeMessages}
              />
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
                onChange={e => {
                  setDocId(e.target.value);
                  setEnableDocument(!!e.target.value);
                }}
                disabled={!enableDocument}
              />
              <div className="ml-2">
                <Switch
                  onLabel="ON"
                  offLabel="OFF"
                  checked={enableDocument}
                  onChange={e => setEnableDocument(e.target.checked)}
                />
              </div>
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
                commandForm.setFieldValue("content", editorRef.current?.getValue() || "");
                if (isEditCommand) {
                  const index = findIndex(quickCommands, v => v.content === editorRef.current?.getValue());
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
              editorRef.current?.focus();
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
