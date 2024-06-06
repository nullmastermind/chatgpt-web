import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Loader,
  LoadingOverlay,
  Modal,
  NativeSelect,
  ScrollArea,
  Tabs,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCornerDownLeft, IconFileStack, IconX } from "@tabler/icons-react";
import { AttachItem, AttachItemType, TDocumentItem, TIndexedDocumentItem } from "@/components/misc/types";
import { v4 } from "uuid";
import { useDebouncedState } from "@mantine/hooks";
import { useDebounce, useLocalStorage, useSetState } from "react-use";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { filter, findIndex, map, uniqBy } from "lodash";
import { useOpenaiAPIKey } from "@/states/states";
import AttachDocumentItem from "@/components/pages/ChatbotPage/Attach/AttachDocumentItem";

const AttachDocument = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
}>(({ opened, onClose, value, onSubmit }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);
  const [searchValue, setSearchValue] = useDebouncedState<string>("", 100);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [indexerHost] = useLocalStorage(":indexerHost", "http://localhost:3456");
  const { data: documents, isLoading: isLoadingDocuments } = useQuery<TDocumentItem[]>({
    queryKey: ["documents", indexerHost],
    async queryFn() {
      const res = await axios.get(`${indexerHost}/api/docs`);
      return res.data.data;
    },
  });
  const [documentId, setDocumentId] = useLocalStorage<string | null>("AttachDocument/document", null);
  const [loadings, setLoadings] = useSetState({
    query: false,
  });
  const [apiKey] = useOpenaiAPIKey();
  const [queryDocumentItems, setQueryDocumentItems] = useState<TIndexedDocumentItem[]>([]);
  const [addedItems, setAddedItems] = useState<TIndexedDocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"query" | "added">("query");

  const queryDocuments = (query: string) => {
    setLoadings({ query: true });
    axios
      .post(`${indexerHost}/api/query`, {
        doc_id: documentId,
        query,
        apiKey,
        maxScore: 0.6,
        k: 5,
        includeAllIfKLessThanScore: 0.3,
        ignoreHashes: [],
      })
      .then(({ data: { data } }) => {
        setQueryDocumentItems(data);
      })
      .finally(() => {
        setLoadings({ query: false });
        setActiveTab("query");
      });
  };

  useEffect(() => {
    if (opened) {
      setAttachItem(
        value || {
          name: "Text data",
          data: [],
          createdAt: Date.now(),
          type: AttachItemType.TextData,
          id: v4(),
        }
      );
    }
  }, [value, opened]);
  useDebounce(
    () => {
      if (opened && attachItem) {
        inputRef.current?.focus();
      }
    },
    100,
    [attachItem, opened]
  );
  useEffect(() => {
    if (Array.isArray(documents) && documents.length > 0) {
      if (documentId) {
        const index = findIndex(documents, document => {
          return document.doc_id === documentId && document.isIndexed;
        });
        if (index === -1) setDocumentId(null);
      } else {
        setDocumentId(documents[0].doc_id);
      }
    }
  }, [documents, documentId]);

  if (!attachItem) return null;

  return (
    <>
      <Modal
        opened={Boolean(opened)}
        onClose={() => onClose()}
        transitionProps={{ transition: "slide-up" }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            <IconFileStack />
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Attach - Private document
              </Title>
              <div className="line-clamp-1 text-xs">Include your private documents to improve your agent's context</div>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        <div className={"flex flex-col gap-2"}>
          <div className={"flex flex-row gap-2"}>
            <div className={"w-[155px] max-w-[40%]"} title={documentId || undefined}>
              <div className={"relative"}>
                <LoadingOverlay visible={isLoadingDocuments} />
                <NativeSelect
                  data={map(
                    filter(documents, v => v.isIndexed),
                    document => ({
                      value: document.doc_id,
                      label: document.doc_id,
                    })
                  )}
                  variant={"filled"}
                  className={"w-full"}
                  value={documentId || undefined}
                  onChange={e => {
                    setDocumentId(e.target.value);
                    inputRef.current?.focus();
                  }}
                />
              </div>
            </div>
            <div className={"flex-grow"}>
              <TextInput
                onKeyDown={e => {
                  if (e.key === "Enter" && inputRef.current?.value && documentId) {
                    queryDocuments(inputRef.current.value);
                  }
                }}
                variant={"filled"}
                ref={inputRef}
                placeholder={"Search in document"}
                className={"w-full"}
                rightSection={
                  <>
                    {loadings.query && <Loader size={"xs"} />}
                    {!loadings.query && !!searchValue.length && (
                      <ActionIcon
                        onClick={() => {
                          if (inputRef.current) {
                            inputRef.current.value = "";
                            setSearchValue("");
                            inputRef.current.focus();
                          }
                        }}
                      >
                        <IconX />
                      </ActionIcon>
                    )}
                  </>
                }
                onChange={e => {
                  setSearchValue(e.target.value);
                }}
              />
              <div style={{ fontSize: 10 }} className={"flex flex-row gap-1"}>
                <IconCornerDownLeft size={"1rem"} />
                <div>Enter to search</div>
              </div>
            </div>
          </div>
          <Divider />
          <div>
            <div className={"flex flex-row items-center justify-end -mb-10 pb-3"}>
              <Button
                size={"xs"}
                variant={"default"}
                onClick={() => {
                  if (activeTab === "query") {
                    setAddedItems(prevState => {
                      return uniqBy([...prevState, ...queryDocumentItems], item => item[0].metadata.hash);
                    });
                    setQueryDocumentItems([]);
                    inputRef.current?.select();
                  } else if (activeTab === "added") {
                    setAddedItems([]);
                    setActiveTab("query");
                  }
                  inputRef.current?.focus();
                }}
              >
                {activeTab === "query" ? "Add all" : "Remove all"}
              </Button>
            </div>
            <Tabs
              value={activeTab}
              onTabChange={value => {
                setActiveTab(value as any);
              }}
            >
              <Tabs.List>
                <Tabs.Tab value={"query"}>Query</Tabs.Tab>
                <Tabs.Tab value={"added"}>Added</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value={"query"}>
                <ScrollArea.Autosize mah={window.innerHeight - 350}>
                  <div className={"flex flex-col gap-2 py-2"}>
                    {queryDocumentItems.length === 0 && (
                      <Card>
                        <Card.Section className={"p-3 flex items-center justify-center min-h-[100px]"}>
                          {loadings.query ? "Querying..." : "No results found."}
                        </Card.Section>
                      </Card>
                    )}
                    {map(queryDocumentItems, item => {
                      return (
                        <AttachDocumentItem
                          item={item}
                          key={item[0].metadata.hash}
                          buttonLabel={"Add"}
                          onClickButton={() => {
                            setAddedItems(prevState => {
                              return uniqBy([...prevState, item], item => item[0].metadata.hash);
                            });
                            setQueryDocumentItems(prevState => {
                              return prevState.filter(v => v[0].metadata.hash !== item[0].metadata.hash);
                            });
                            inputRef.current?.focus();
                          }}
                        />
                      );
                    })}
                  </div>
                </ScrollArea.Autosize>
              </Tabs.Panel>
              <Tabs.Panel value={"added"}>
                <ScrollArea.Autosize mah={window.innerHeight - 350}>
                  <div className={"flex flex-col gap-2 py-2"}>
                    {addedItems.length === 0 && (
                      <Card>
                        <Card.Section className={"p-3 flex items-center justify-center min-h-[100px]"}>
                          {loadings.query ? "Querying..." : "Empty."}
                        </Card.Section>
                      </Card>
                    )}
                    {map(addedItems, item => {
                      return (
                        <AttachDocumentItem
                          item={item}
                          key={item[0].metadata.hash}
                          buttonLabel={"Remove"}
                          onClickButton={() => {
                            setAddedItems(prevState => {
                              return prevState.filter(v => v[0].metadata.hash !== item[0].metadata.hash);
                            });
                            inputRef.current?.focus();
                          }}
                        />
                      );
                    })}
                  </div>
                </ScrollArea.Autosize>
              </Tabs.Panel>
            </Tabs>
          </div>
          <div className={"sticky bottom-0 flex flex-row items-center justify-end gap-2"}>
            <Button variant="default" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={() => onSubmit(attachItem!)}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default AttachDocument;
