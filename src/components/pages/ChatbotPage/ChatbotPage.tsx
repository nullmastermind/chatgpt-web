import { Modal, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { clone, cloneDeep, find, findIndex } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useMount, useUnmount } from 'react-use';

import { CollectionItem } from '@/components/layouts/MainLayout/MainLayout';
import FunnyEmoji from '@/components/misc/FunnyEmoji';
import AddPrompt, { PromptSaveData } from '@/components/pages/ChatbotPage/AddPrompt';
import Message from '@/components/pages/ChatbotPage/Message';
import QuickActions from '@/components/pages/ChatbotPage/QuickActions';
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionDownId,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useCurrentCollectionUpId,
  usePrompts,
  useSubCollectionId,
} from '@/states/states';
import store, { messagesKey } from '@/utility/store';
import { ignorePromptId } from '@/utility/utility';

const ChatbotPage = () => {
  const [, setAddCollectionAction] = useAddCollectionAction();
  const [collections, setCollections] = useCollections();
  const [opened, { open, close }] = useDisclosure(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentCollection] = useCurrentCollection();
  const [currentCollectionRemoveId, setCurrentCollectionRemoveId] = useCurrentCollectionRemoveId();
  const [currentCollectionEditId, setCurrentCollectionEditId] = useCurrentCollectionEditId();
  const [currentCollectionUpId, setCurrentCollectionUpId] = useCurrentCollectionUpId();
  const [currentCollectionDownId, setCurrentCollectionDownId] = useCurrentCollectionDownId();
  const [editCollection, setEditCollection] = useState<any | undefined>();
  const [prompts, setPrompts] = usePrompts();
  const [subCollectionId, setSubCollectionId] = useSubCollectionId();
  const subCollectionInfo = useMemo<any | undefined>(() => {
    return find(prompts, (v) => typeof v === 'object' && v.id === subCollectionId);
  }, [prompts, subCollectionId]);

  const onAddCollection = () => {
    open();
  };
  const onAddPrompt = ({
    name,
    temperature,
    description,
    prompts,
    id,
    wrapSingleLine,
    wrapCustomXmlTag,
    customXmlTag,
    emoji,
  }: PromptSaveData) => {
    const dbPrompts: any[] = JSON.parse(localStorage.getItem(':prompts') || '[]');
    if (id) {
      const index = findIndex(dbPrompts, (v) => v.id === id);
      if (index >= 0) {
        dbPrompts[index] = {
          ...dbPrompts[index],
          ...{
            name,
            temperature,
            description,
            prompts,
            wrapSingleLine,
            wrapCustomXmlTag,
            customXmlTag,
            emoji,
          },
        };
        ignorePromptId(dbPrompts[index].id);
      }
    } else {
      const sort = dbPrompts.length;
      dbPrompts.push({
        name,
        temperature,
        description,
        prompts,
        wrapSingleLine,
        wrapCustomXmlTag,
        customXmlTag,
        emoji,
        id: id || Date.now(),
        sort: sort,
      });
    }
    localStorage.setItem(':prompts', JSON.stringify(dbPrompts));
    setEditCollection(undefined);
    setCurrentCollectionEditId(undefined);
    close();
    getCollections();
    notifications.show({
      title: 'Success',
      message: 'Template saved',
      radius: 'lg',
      withCloseButton: true,
      color: 'green',
      icon: <IconCircleCheckFilled />,
    });
  };
  const getCollections = () => {
    const prompts: any[] = JSON.parse(localStorage.getItem(':prompts') || '[]');

    setCollections(
      prompts.map((prompt) => {
        if (!prompt.emoji) {
          const data: string[] = prompt.name.split(' ');
          let emoji = data.shift() as string;
          if (data.length === 0) {
            data.unshift(emoji);
            emoji = [...prompt.name][0];
          }
          return {
            emoji,
            label: data.join(' ').trim(),
            parent: 'nullgpt',
            key: prompt.id,
            description: prompt.description || '',
          } as CollectionItem;
        }
        return {
          emoji: prompt.emoji,
          label: prompt.name,
          parent: 'nullgpt',
          key: prompt.id,
          description: prompt.description || '',
        } as CollectionItem;
      }),
    );
    setPrompts(prompts);
  };

  useMount(() => {
    setAddCollectionAction(() => () => onAddCollection);
    getCollections();
  });
  useUnmount(() => {
    setCollections([]);
  });
  useEffect(() => {
    if (currentCollectionRemoveId) {
      let deleteId = currentCollectionRemoveId;
      let force = false;
      if (typeof deleteId === 'string' && deleteId.startsWith('force:')) {
        force = true;
        deleteId = +deleteId.replace('force:', '');
      }
      const collection = find(collections, (v) => v.key === deleteId);
      if (collection) {
        const doRemove = async () => {
          const dbPrompts: any[] = JSON.parse(localStorage.getItem(':prompts') || '[]');
          localStorage.setItem(
            ':prompts',
            JSON.stringify(dbPrompts.filter((v) => v.id !== deleteId)),
          );
          await store.removeItem(messagesKey(collection.key));
          ignorePromptId(deleteId);
          getCollections();
        };
        if (!force) {
          modals.openConfirmModal({
            title: 'Confirmation',
            children: `Remove ${collection.label}?`,
            centered: true,
            labels: {
              cancel: 'Cancel',
              confirm: 'Confirm',
            },
            onConfirm() {
              void doRemove();
            },
          });
        } else if (force) {
          void doRemove();
        }
      }
      setCurrentCollectionRemoveId(undefined);
    }
  }, [currentCollectionRemoveId, collections]);
  useEffect(() => {
    if (!currentCollectionEditId) return;

    const prompt = find(prompts, (v) => v.id === currentCollectionEditId);
    if (!prompt) return;

    setEditCollection(clone(prompt));
    setTimeout(() => open());
  }, [currentCollectionEditId, prompts]);
  useEffect(() => {
    if (currentCollectionUpId) {
      const collection = find(collections, (v) => v.key === currentCollectionUpId);
      if (collection) {
        const dbPrompts: any[] = JSON.parse(localStorage.getItem(':prompts') || '[]');
        const savePrompts = dbPrompts.map((v) => {
          if (v.id === currentCollectionUpId) {
            v.sort = (v.sort || 0) - 1.1;
          }
          return v;
        });
        savePrompts.sort((a, b) => {
          return (a.sort || 0) - (b.sort || 0);
        });
        localStorage.setItem(
          ':prompts',
          JSON.stringify(
            savePrompts.map((v, i) => {
              v.sort = i;
              return v;
            }),
          ),
        );
        getCollections();
      }
      setCurrentCollectionUpId(undefined);
    }
  }, [currentCollectionUpId, collections]);
  useEffect(() => {
    if (currentCollectionDownId) {
      const collection = find(collections, (v) => v.key === currentCollectionDownId);
      if (collection) {
        const dbPrompts: any[] = JSON.parse(localStorage.getItem(':prompts') || '[]');
        const savePrompts = dbPrompts.map((v) => {
          if (v.id === currentCollectionDownId) {
            v.sort = (v.sort || 0) + 1.1;
          }
          return v;
        });
        savePrompts.sort((a, b) => {
          return (a.sort || 0) - (b.sort || 0);
        });
        localStorage.setItem(
          ':prompts',
          JSON.stringify(
            savePrompts.map((v, i) => {
              v.sort = i;
              return v;
            }),
          ),
        );
        getCollections();
      }
      setCurrentCollectionDownId(undefined);
    }
  }, [currentCollectionDownId, collections]);

  return (
    <>
      {opened && (
        <AddPrompt
          loading={modalLoading}
          close={() => {
            setModalLoading(false);
            setEditCollection(undefined);
            setCurrentCollectionEditId(undefined);
            close();
          }}
          opened={opened}
          onSave={(data) => {
            onAddPrompt(data);
          }}
          editData={editCollection ? cloneDeep(editCollection) : editCollection}
          deleteFn={(id) => {
            setCurrentCollectionRemoveId(id);
            close();
          }}
        />
      )}
      {![undefined, null, NaN].includes(currentCollection) && (
        <Message
          prompt={find(prompts, (v) => typeof v === 'object' && v.id === currentCollection)}
          collectionId={currentCollection}
          key={currentCollection}
        />
      )}
      {!!subCollectionId && (
        <Modal
          opened={!!subCollectionId}
          onClose={() => {
            setSubCollectionId(null);
          }}
          size={isMobile ? undefined : 'xl'}
          centered={true}
          scrollAreaComponent={ScrollArea.Autosize}
          fullScreen={isMobile}
          title={
            <div className={'flex flex-row gap-2 items-center'}>
              <FunnyEmoji emoji={subCollectionInfo.emoji} emojiType={'anim'} size={36} />
              <div>
                <div className={'text-lg font-bold line-clamp-1'}>{subCollectionInfo?.name}</div>
                <div className={'text-xs line-clamp-1'}>{subCollectionInfo?.description}</div>
              </div>
            </div>
          }
        >
          <div
            style={{
              height: isMobile ? '100vh' : 'calc(100vh - 200px)',
            }}
          >
            <Message
              prompt={find(prompts, (v) => typeof v === 'object' && v.id === subCollectionId)}
              collectionId={subCollectionId}
              key={subCollectionId}
              isDialog={true}
            />
          </div>
        </Modal>
      )}
      <QuickActions />
    </>
  );
};

export default ChatbotPage;
