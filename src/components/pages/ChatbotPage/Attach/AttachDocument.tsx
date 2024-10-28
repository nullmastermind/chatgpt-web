import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Indicator,
  Loader,
  LoadingOverlay,
  Modal,
  NativeSelect,
  ScrollArea,
  Tabs,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedState } from '@mantine/hooks';
import { IconCornerDownLeft, IconFileStack, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { filter, findIndex, map, uniqBy } from 'lodash';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce, useLocalStorage, useSetState } from 'react-use';
import { v4 } from 'uuid';

import {
  AttachItem,
  AttachItemType,
  TDocumentItem,
  TIndexedDocumentItem,
} from '@/components/misc/types';
import AttachDocumentItem from '@/components/pages/ChatbotPage/Attach/AttachDocumentItem';
import { indexerHost } from '@/config';
import { useOpenaiAPIKey } from '@/states/states';

const AttachDocument = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
  searchValue?: string;
}>(({ opened, onClose, value, onSubmit, searchValue: propsSearchValue }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);
  const [searchValue, setSearchValue] = useDebouncedState<string>('', 100);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data: allDocuments, isLoading: isLoadingDocuments } = useQuery<TDocumentItem[]>({
    queryKey: ['documents'],
    async queryFn() {
      const res = await axios.get(`${indexerHost}/api/docs`);
      return res.data.data;
    },
  });
  const documents = useMemo(() => {
    return filter(allDocuments, (d) => d.isIndexed);
  }, [allDocuments]);
  const [documentId, setDocumentId] = useLocalStorage<string | null>(
    'AttachDocument/document',
    null,
  );
  const [loadings, setLoadings] = useSetState({
    query: false,
  });
  const [apiKey] = useOpenaiAPIKey();
  const [queryDocumentItems, setQueryDocumentItems] = useState<TIndexedDocumentItem[]>([]);
  const [addedItems, setAddedItems] = useState<TIndexedDocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'query' | 'added'>('query');

  const queryDocuments = async (query: string) => {
    try {
      setLoadings({ query: true });

      const response = await axios.post(`${indexerHost}/api/query`, {
        doc_id: documentId,
        query,
        apiKey,
        k: 20,
        minScore: 0.3,
        ignoreHashes: addedItems.map((item) => item?.[0]?.metadata?.hash),
      });

      setQueryDocumentItems(response.data.data);
    } catch (error) {
      console.error('Error querying documents:', error);
    } finally {
      setLoadings({ query: false });
      setActiveTab('query');
    }
  };

  useEffect(() => {
    if (opened) {
      setAttachItem(
        value || {
          name: 'Private document',
          data: [],
          createdAt: Date.now(),
          type: AttachItemType.PrivateDocument,
          id: v4(),
        },
      );
      if (value) {
        setAddedItems(
          map(value.data, (v) => {
            return [
              {
                metadata: v.metadata,
                pageContent: v.content,
              },
              0,
            ] as TIndexedDocumentItem;
          }),
        );
      }
    }
  }, [value, opened]);
  useDebounce(
    () => {
      if (opened && attachItem) {
        inputRef.current?.focus();
      }
    },
    100,
    [attachItem, opened],
  );
  useEffect(() => {
    if (Array.isArray(documents) && documents.length > 0) {
      if (documentId) {
        const index = findIndex(documents, (document) => {
          return document.doc_id === documentId && document.isIndexed;
        });
        if (index === -1) setDocumentId(null);
      } else {
        setDocumentId(documents[0].doc_id);
      }
    }
  }, [documents, documentId]);
  useDebounce(
    () => {
      if (propsSearchValue && inputRef.current) {
        inputRef.current.value = propsSearchValue;
        setSearchValue(propsSearchValue);
        inputRef.current.focus();
        inputRef.current.select();
      }
    },
    100,
    [propsSearchValue],
  );

  if (!attachItem) return null;

  return (
    <>
      <Modal
        opened={Boolean(opened)}
        onClose={() => onClose()}
        transitionProps={{ transition: 'slide-up' }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            <IconFileStack />
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Attach - Private document
              </Title>
              <div className="line-clamp-1 text-xs">
                Include your private documents to improve your agent's context
              </div>
            </div>
          </div>
        }
        className="relative"
      >
        <div className={'flex flex-col gap-2'}>
          <div className={'flex flex-row gap-2'}>
            <div className={'w-[155px] max-w-[40%]'} title={documentId || undefined}>
              <div className={'relative'}>
                <LoadingOverlay visible={isLoadingDocuments} />
                <NativeSelect
                  placeholder={'Documents'}
                  data={map(
                    filter(documents, (v) => v.isIndexed),
                    (document) => ({
                      value: document.doc_id,
                      label: document.doc_id,
                    }),
                  )}
                  variant={'filled'}
                  className={'w-full'}
                  value={documentId || undefined}
                  onChange={(e) => {
                    setDocumentId(e.target.value);
                    inputRef.current?.focus();
                  }}
                />
              </div>
            </div>
            <div className={'flex-grow'}>
              <TextInput
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    inputRef.current?.value &&
                    documentId &&
                    Boolean(documents?.length)
                  ) {
                    queryDocuments(inputRef.current.value);
                  }
                }}
                variant={'filled'}
                ref={inputRef}
                placeholder={'Search in your document by anything...'}
                className={'w-full'}
                rightSection={
                  <>
                    {loadings.query && <Loader size={'xs'} />}
                    {!loadings.query && !!searchValue.length && (
                      <ActionIcon
                        onClick={() => {
                          if (inputRef.current) {
                            inputRef.current.value = '';
                            setSearchValue('');
                            inputRef.current.focus();
                          }
                        }}
                      >
                        <IconX />
                      </ActionIcon>
                    )}
                  </>
                }
                onChange={(e) => {
                  setSearchValue(e.target.value);
                }}
              />
              <div style={{ fontSize: 10 }} className={'flex flex-row gap-1'}>
                <IconCornerDownLeft size={'1rem'} />
                <div>Enter to search</div>
              </div>
            </div>
          </div>
          <Divider />
          <div>
            <div className={'flex flex-row items-center justify-end -mb-10 pb-3'}>
              <Button
                size={'xs'}
                variant={'default'}
                onClick={() => {
                  if (activeTab === 'query') {
                    setAddedItems((prevState) => {
                      return uniqBy(
                        [...prevState, ...queryDocumentItems],
                        (item) => item[0].metadata.hash,
                      );
                    });
                    setQueryDocumentItems([]);
                    setActiveTab('added');
                    inputRef.current?.select();
                  } else if (activeTab === 'added') {
                    setAddedItems([]);
                    setActiveTab('query');
                  }
                  inputRef.current?.focus();
                }}
              >
                {activeTab === 'query' ? 'Add all' : 'Remove all'}
              </Button>
            </div>
            <Tabs
              value={activeTab}
              onTabChange={(value) => {
                setActiveTab(value as any);
                inputRef.current?.focus();
              }}
            >
              <Tabs.List>
                <Tabs.Tab value={'query'}>
                  <Indicator
                    disabled={queryDocumentItems.length === 0}
                    size={16}
                    label={queryDocumentItems.length}
                  >
                    Query
                  </Indicator>
                </Tabs.Tab>
                <Tabs.Tab value={'added'}>
                  <Indicator size={16} disabled={addedItems.length === 0} label={addedItems.length}>
                    Added
                  </Indicator>
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value={'query'}>
                <ScrollArea.Autosize mah={window.innerHeight - 350}>
                  <div className={'flex flex-col gap-2 py-2'}>
                    {queryDocumentItems.length === 0 && (
                      <Card>
                        <Card.Section
                          className={'p-3 flex flex-col items-center justify-center min-h-[100px]'}
                        >
                          <div>{loadings.query ? 'Querying...' : 'No results found.'}</div>
                          {!documents?.length && (
                            <div>
                              {'Need setup '}
                              <a
                                target={'_blank'}
                                href="https://github.com/nullmastermind/nullgpt-indexer"
                              >
                                the Indexer
                              </a>
                            </div>
                          )}
                        </Card.Section>
                      </Card>
                    )}
                    {map(queryDocumentItems, (item) => {
                      return (
                        <AttachDocumentItem
                          item={item}
                          key={item[0].metadata.hash}
                          buttonLabel={'Add'}
                          onClickButton={() => {
                            setAddedItems((prevState) => {
                              return uniqBy([...prevState, item], (item) => item[0].metadata.hash);
                            });
                            setQueryDocumentItems((prevState) => {
                              return prevState.filter(
                                (v) => v[0].metadata.hash !== item[0].metadata.hash,
                              );
                            });
                            inputRef.current?.focus();
                          }}
                        />
                      );
                    })}
                  </div>
                </ScrollArea.Autosize>
              </Tabs.Panel>
              <Tabs.Panel value={'added'}>
                <ScrollArea.Autosize mah={window.innerHeight - 350}>
                  <div className={'flex flex-col gap-2 py-2'}>
                    {addedItems.length === 0 && (
                      <Card>
                        <Card.Section
                          className={'p-3 flex items-center justify-center min-h-[100px]'}
                        >
                          {loadings.query ? 'Querying...' : 'Empty.'}
                        </Card.Section>
                      </Card>
                    )}
                    {map(addedItems, (item) => {
                      return (
                        <AttachDocumentItem
                          item={item}
                          key={item[0].metadata.hash}
                          buttonLabel={'Remove'}
                          onClickButton={() => {
                            setAddedItems((prevState) => {
                              return prevState.filter(
                                (v) => v[0].metadata.hash !== item[0].metadata.hash,
                              );
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
          <div className={'sticky bottom-0 flex flex-row items-center justify-end gap-2'}>
            <Button variant="default" onClick={() => onClose()}>
              Close
            </Button>
            <Button
              onClick={() => {
                attachItem!.data = map(addedItems, (item) => {
                  return {
                    content: item[0].pageContent,
                    metadata: item[0].metadata,
                    name: `${item[0].metadata.source}:${item[0].metadata?.loc?.lines?.from}:${item[0].metadata?.loc?.lines?.to}`,
                    isDocument: true,
                  };
                });
                onSubmit(attachItem!);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default AttachDocument;
