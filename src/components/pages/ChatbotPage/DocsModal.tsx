import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  ScrollArea,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import axios from 'axios';
import classNames from 'classnames';
import { forEach, map } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSetState } from 'react-use';
import slug from 'slug';

import DateInfo from '@/components/pages/ChatbotPage/DateInfo';
import DocUpdate from '@/components/pages/ChatbotPage/DocUpdate';
import { indexerHost, indexerVersion } from '@/config';
import { IndexedDocument } from '@/utility/utility';

type DocsModalProps = {
  opened: boolean;
  close: () => any;
  initSearchValue?: string;
  initDocId?: string;
};

const DocsModal = ({ opened, close, initSearchValue, initDocId }: DocsModalProps) => {
  const [docs, setDocs] = useState<IndexedDocument[]>([]);
  const [fileExtensions, setFileExtensions] = useSetState<Record<string, string>>({});
  const [loadings, setLoadings] = useSetState<Record<string, boolean>>({});
  const [removeIndexLoadings, setRemoveIndexLoadings] = useSetState<Record<string, boolean>>({});
  const [currentDocId, setCurrentDocId] = useState<string>(initDocId || '');
  const [newDocName, setNewDocName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(initSearchValue || '');
  const filteredDocs = useMemo(() => {
    return docs.filter((v) => {
      return v.doc_id.toLowerCase().includes(searchValue.toLowerCase().trim());
    });
  }, [docs, searchValue]);

  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  };

  const updateDocs = async (first?: boolean) => {
    try {
      const { data } = await axios.get(`${indexerHost}/api/docs`);
      const docs = data.data as IndexedDocument[];

      setDocs(docs);

      if (first) {
        forEach(docs, (doc) => {
          setFileExtensions({
            [doc.doc_id]: doc.extensions.join(','),
          });
        });
      }
    } catch {}
  };
  const startTrain = (docId: string) => {
    if (!fileExtensions[docId] || fileExtensions[docId].trim() === '') {
      // Show error notification
      notifications.show({
        title: 'Error',
        message: 'Extensions field is empty',
        radius: 'lg',
        withCloseButton: true,
        color: 'red',
        icon: <IconX />,
      });
      return;
    }

    setLoadings({
      [docId]: true,
    });

    axios
      .post(`${indexerHost}/api/index`, {
        doc_id: docId,
        extensions: fileExtensions[docId]
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
          .map((v) => {
            if (!v.startsWith('.')) {
              return '.' + v;
            }
            return v;
          }),
      })
      .then(() => {
        updateDocs();
      })
      .finally(() => {
        setLoadings({
          [docId]: false,
        });
      });
  };
  const removeIndex = (docId: string) => {
    if (currentDocId === docId) {
      setCurrentDocId('');
    }

    if (docId.toLowerCase().includes(searchValue.toLowerCase().trim())) {
      if (filteredDocs.length === 1) {
        setSearchValue('');
        setTimeout(() => {
          focusSearch();
        }, 100);
      }
    }

    setRemoveIndexLoadings({
      [docId]: true,
    });

    axios
      .post(`${indexerHost}/api/remove-index`, {
        doc_id: docId,
      })
      .then(() => {
        void updateDocs();
      })
      .finally(() => {
        setRemoveIndexLoadings({
          [docId]: false,
        });
      });
  };

  useEffect(() => {
    if (opened) {
      setSearchValue(initSearchValue || '');
      focusSearch();
      updateDocs(true).finally(() => {
        // setCurrentDocId(initDocId || "");
        focusSearch();
      });
    }
  }, [opened, searchInputRef, initSearchValue, initDocId]);
  useEffect(() => {
    setCurrentDocId('');
    if (searchValue.length === 0) {
      focusSearch();
    }
  }, [searchValue]);

  return (
    <>
      <Modal
        centered={true}
        opened={opened}
        onClose={close}
        title="Private Document Management"
        scrollAreaComponent={ScrollArea.Autosize}
        size={'lg'}
      >
        <div className={'flex flex-col gap-2'}>
          <Card withBorder shadow={'xl'}>
            <div className={'flex flex-row items-end gap-2'}>
              <TextInput
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className={'flex-grow'}
                label={'Name'}
                placeholder={'Name of the new document'}
              />
              <Button
                onClick={() => {
                  setSearchValue('');
                  const docId = slug(newDocName);

                  if (docId.length === 0) return;

                  axios
                    .post(`${indexerHost}/api/add-doc`, {
                      doc_id: docId,
                    })
                    .then(() => {
                      updateDocs(true).then(() => {
                        setCurrentDocId(docId);
                        setNewDocName('');
                        setSearchValue(docId);
                        setTimeout(() => {
                          document
                            .getElementById(`doc-${docId}`)
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      });
                    })
                    .catch(Promise.resolve);
                }}
              >
                New document
              </Button>
            </div>
          </Card>
          <div>
            <Input
              icon={<IconSearch size={'1rem'} />}
              value={searchValue}
              ref={searchInputRef}
              placeholder={'Search...'}
              className={'max-w-xs'}
              onChange={(e) => setSearchValue(e.target.value)}
              rightSection={
                searchValue.length > 0 ? (
                  <ActionIcon onClick={() => setSearchValue('')}>
                    <IconX size={'1rem'} />
                  </ActionIcon>
                ) : null
              }
            />
          </div>
          {map(filteredDocs, (doc, index) => {
            return (
              <Card key={index}>
                <div
                  className={classNames('flex flex-row gap-2 items-center', {
                    'opacity-20': currentDocId && currentDocId !== doc.doc_id,
                  })}
                >
                  <div className={'flex-grow'}>
                    <Badge className={'rounded'} variant={'outline'}>
                      {doc.doc_id}
                    </Badge>
                    <Textarea
                      value={fileExtensions[doc.doc_id]}
                      label={'File extensions:'}
                      placeholder={'.txt,.md,.html,.js,...'}
                      minRows={1}
                      autosize={true}
                      onChange={(e) => {
                        setFileExtensions({
                          [doc.doc_id]: e.target.value,
                        });
                      }}
                    />
                    <div className={'flex items-center gap-1 justify-center'}>
                      <div className={'flex-grow'}>
                        <DateInfo
                          message={
                            {
                              date: new Date(doc.indexAt),
                            } as any
                          }
                        />
                      </div>
                      <div
                        className={
                          'flex flex-row items-center gap-1 hover:text-blue-500 cursor-pointer'
                        }
                        onClick={() => {
                          if (currentDocId === doc.doc_id) {
                            setCurrentDocId('');
                          } else {
                            setCurrentDocId(doc.doc_id);
                          }
                        }}
                      >
                        <Text size={'xs'}>Show files</Text>
                        {currentDocId !== doc.doc_id ? (
                          <IconArrowDown size={'1.25rem'} />
                        ) : (
                          <IconArrowUp size={'1.25rem'} />
                        )}
                      </div>
                    </div>
                  </div>
                  <Divider orientation={'vertical'} />
                  <div>
                    <div className={'flex flex-row items-center gap-2'}>
                      <Tooltip
                        label={'Start training NullGPT to be able to interact with this document.'}
                      >
                        <Button
                          size={'xs'}
                          className={'w-24'}
                          color={doc.isIndexed ? 'blue' : 'green'}
                          loading={loadings[doc.doc_id]}
                          onClick={() => startTrain(doc.doc_id)}
                        >
                          {doc.isIndexed ? 'Retraining' : 'Train'}
                        </Button>
                      </Tooltip>
                      <Tooltip label={'Remove the index of this document.'}>
                        <ActionIcon
                          loading={removeIndexLoadings[doc.doc_id]}
                          onClick={() => {
                            if (doc.isIndexed) {
                              removeIndex(doc.doc_id);
                            } else {
                              modals.openConfirmModal({
                                title: 'Confirmation',
                                centered: true,
                                children: `Remove ${doc.doc_id}?`,
                                labels: {
                                  cancel: 'Cancel',
                                  confirm: 'Confirm',
                                },
                                onConfirm() {
                                  removeIndex(doc.doc_id);
                                },
                              });
                            }
                          }}
                          size={'xs'}
                          variant={'outline'}
                          color={'red'}
                        >
                          <IconTrash />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {currentDocId === doc.doc_id && (
                  <>
                    <div className={'pt-2'}>
                      <Divider className={'mb-2'} />
                      <DocUpdate docId={doc.doc_id} />
                    </div>
                    <Divider className={'mt-2'} />
                    <Button
                      className={'w-full border-0'}
                      variant={'default'}
                      size={'xs'}
                      onClick={() => setCurrentDocId('')}
                    >
                      <Text className={'opacity-80'}>Close edit (⚠️ ignore unsaved)</Text>
                    </Button>
                  </>
                )}
                <div id={`doc-${doc.doc_id}`} />
              </Card>
            );
          })}
        </div>
        {docs.length === 0 && (
          <div className={'py-3 text-sm'}>
            <div>Please visit the following address:</div>
            <a
              href={`https://github.com/nullmastermind/nullgpt-indexer/releases/tag/${indexerVersion}`}
              target={'_blank'}
            >
              https://github.com/nullmastermind/nullgpt-indexer
            </a>
            <div>
              This is where you will find the necessary information and resources to set up your
              private document.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DocsModal;
