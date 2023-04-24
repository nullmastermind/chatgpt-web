import {
  useCopyToClipboard,
  useDebounce,
  useList,
  useLocalStorage,
  useMap,
  useMeasure,
  useMount,
  useSessionStorage,
  useUnmount,
} from "react-use";
import {
  Avatar,
  Button,
  Checkbox,
  Container,
  Divider,
  Highlight,
  Menu,
  Modal,
  ScrollArea,
  Textarea,
  TextInput,
} from "@mantine/core";
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
import {
  convertToSupportLang,
  detectProgramLang,
  findHighlight,
  formatString,
  KeyValue,
  preprocessMessageContent,
  searchArray,
  validateField,
} from "@/utility/utility";
import TypingBlinkCursor from "@/components/misc/TypingBlinkCursor";
import { IconMinus, IconPlus, IconSearch } from "@tabler/icons-react";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { spotlight, SpotlightAction, SpotlightProvider } from "@mantine/spotlight";
import { useForm } from "@mantine/form";

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
        "v1/chat/completions",
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
    const [doScrollToBottom, setDoScrollToBottom] = useState<boolean>(true);
    const [, setCopyText] = useCopyToClipboard();

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
      },
    }));
    useEffect(() => {
      if (doScrollToBottom) {
        // setDoScrollToBottom(false);
        scrollToBottom();
      }
    }, [doScrollToBottom, message]);
    useMount(() => {
      if (message.source === "user" && !autoScrollIds.current[message.id]) {
        scrollToBottom();
        autoScrollIds.current[message.id] = true;
      }
    });

    return (
      <div
        className={classNames("flex flex-row gap-3 items-start p-3 rounded relative", {
          [classes.messageBotBg]: message.source === "assistant",
        })}
      >
        {message.source === "assistant" && (
          <div className="absolute right-1 bottom-2 la-copy">
            <Button size="xs" variant="subtle" onClick={() => setCopyText(message.content)}>
              Copy
            </Button>
          </div>
        )}
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
    const inputImproveRef = useRef<HTMLTextAreaElement>(null);
    const [collections, setCollections] = useCollections();
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
    const [wRef, wInfo] = useMeasure();
    const [quickCommands, setQuickCommands] = useLocalStorage<
      {
        name: string;
        content: string;
        category: any;
      }[]
    >(":quickCommands", []);
    const [query, setQuery] = useState("");
    const quickCommandList = useMemo(() => {
      const commands = quickCommands as any[];
      const search = query.replace("/", "");
      const validCommands = searchArray(
        search,
        commands.map(v => v.name)
      );
      const result = commands
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

      return result.sort((a, b) => {
        // Sort by category
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;

        // Sort by match.join("").length/name.length
        const aMatchLength = a.match.join("").length;
        const bMatchLength = b.match.join("").length;
        const aNameLength = a.name.length;
        const bNameLength = b.name.length;
        const aRatio = aMatchLength / aNameLength;
        const bRatio = bMatchLength / bNameLength;
        if (aRatio < bRatio) return -1;
        if (aRatio > bRatio) return 1;

        // Sort by name
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;

        return 0;
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

      requestChatStream(
        "v1/completions",
        [
          {
            role: "system",
            content: `Your primary goal is to improve content inside <need-to-improve-prompt-content-input> tag, making it easier for chatbots (large-language models) to analyze, and write the improved version in English. I want you to only result, do not write explanations:`,
          },
          {
            role: "user",
            content: `<need-to-improve-prompt-content-input>${
              selectedText.includes("\n") ? JSON.stringify(selectedText) : selectedText
            }</need-to-improve-prompt-content-input>`,
          },
        ],
        {
          token: openaiAPIKey,
          modelConfig: {
            model: "text-davinci-003",
            temperature: 0,
            max_tokens: 1000,
          },
          onMessage: (message, done) => {
            message = message.trim();
            setImprovedPrompt(message);
            if (done) {
              setCanEdit(true);
              inputImproveRef.current?.focus();
            }
          },
          onController: controller => {},
          onError: error => {},
        }
      ).finally();
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

    const onSend = (c?: string) => {
      onSubmit(c || messageContent);
      setMessageContent("");
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
          !isFocus && "Press the {Enter} key to start entering text.\n",
          "/ = command\nEnter = submit, Shift+Enter = \\n, ↑↓ to take previous message, F1 to show Improve",
          "⌘+↑ to add previous messages, and ⌘+↓ to decrease",
          "⌘+shift+↑ / ⌘+shift+↓ to check/uncheck all",
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

    return (
      <SpotlightProvider
        actions={quickCommandList}
        searchIcon={<IconSearch size="1.2rem" />}
        searchPlaceholder="Search..."
        shortcut="/"
        nothingFoundMessage="Nothing found..."
        query={query}
        onQueryChange={setQuery}
        filter={() => quickCommandList}
      >
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
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              autoFocus
              placeholder="Send a message..."
              onChange={e => setMessageContent(e.target.value)}
              value={messageContent}
              autosize={true}
              maxRows={6}
              minRows={6}
              className="w-full"
              onKeyDown={(e: any) => {
                const isMod = e.ctrlKey || e.metaKey;
                const isCursorEnd = e.target.selectionStart === e.target.value.length;

                if (e.key === "/" && e.target.value.length === 0) {
                  spotlight.open();
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
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                inputRef.current?.focus();
                onSend();
              }}
              variant="gradient"
            >
              Send
            </Button>
            <Button
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
              {isEditCommand ? "Edit" : "Save"}
            </Button>
          </div>
        </div>
      </SpotlightProvider>
    );
  }
);

export default Message;
