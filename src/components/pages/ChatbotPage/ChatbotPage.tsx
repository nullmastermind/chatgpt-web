import CenterCard from "@/components/CenterCard";
import { useMount, useUnmount } from "react-use";
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionDownId,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useCurrentCollectionUpId,
} from "@/states/states";
import { useDisclosure } from "@mantine/hooks";
import React, { useEffect, useState } from "react";
import { clone, find, findIndex } from "lodash";
import { IconCircleCheckFilled, IconX } from "@tabler/icons-react";
import axios from "axios";
import { notifications } from "@mantine/notifications";
import AddPrompt, { PromptSaveData } from "@/components/pages/ChatbotPage/AddPrompt";
import Message from "@/components/pages/ChatbotPage/Message";

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
  const [prompts, setPrompts] = useState<any[]>([]);

  const onAddCollection = () => {
    open();
  };
  const onAddPrompt = ({ name, temperature, prompts, id, wrapSingleLine }: PromptSaveData) => {
    console.log("id || Date.now()", id || Date.now());
    const dbPrompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");
    if (id) {
      const index = findIndex(dbPrompts, v => v.id === id);
      if (index >= 0) {
        dbPrompts[index] = {
          ...dbPrompts[index],
          ...{
            name,
            temperature,
            prompts,
            wrapSingleLine,
          },
        };
      }
    } else {
      const sort = dbPrompts.length;
      dbPrompts.push({
        name,
        temperature,
        prompts,
        wrapSingleLine,
        id: id || Date.now(),
        sort: sort,
      });
    }
    localStorage.setItem(":prompts", JSON.stringify(dbPrompts));
    setEditCollection(undefined);
    setCurrentCollectionEditId(undefined);
    close();
    getCollections();
    notifications.show({
      title: "Success",
      message: "Template saved",
      radius: "lg",
      withCloseButton: true,
      color: "green",
      icon: <IconCircleCheckFilled />,
    });
  };
  const getCollections = () => {
    const prompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");

    setCollections(
      prompts.map(prompt => {
        const data: string[] = prompt.name.split(" ");
        let emoji = data.shift() as string;
        if (data.length === 0) {
          data.unshift(emoji);
          emoji = prompt.name.split("")[0];
        }
        return {
          emoji,
          label: data.join(" ").trim(),
          parent: "nullgpt",
          key: prompt.id,
        };
      })
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
      if (typeof deleteId === "string" && deleteId.startsWith("force:")) {
        force = true;
        deleteId = +deleteId.replace("force:", "");
      }
      const collection = find(collections, v => v.key === deleteId);
      if (collection) {
        const doRemove = () => {
          const dbPrompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");
          localStorage.setItem(":prompts", JSON.stringify(dbPrompts.filter(v => v.id !== deleteId)));
          localStorage.removeItem(`:messages${collection.key}`);
          getCollections();
        };
        if (!force && confirm(`Remove ${collection.label}?`)) {
          doRemove();
        } else {
          doRemove();
        }
      }
      setCurrentCollectionRemoveId(undefined);
    }
  }, [currentCollectionRemoveId, collections]);
  useEffect(() => {
    if (!currentCollectionEditId) return;

    const prompt = find(prompts, v => v.id === currentCollectionEditId);
    if (!prompt) return;

    setEditCollection(clone(prompt));
    setTimeout(() => open());
  }, [currentCollectionEditId, prompts]);
  useEffect(() => {
    if (currentCollectionUpId) {
      const collection = find(collections, v => v.key === currentCollectionUpId);
      if (collection) {
        const dbPrompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");
        const savePrompts = dbPrompts.map(v => {
          if (v.id === currentCollectionUpId) {
            v.sort = (v.sort || 0) - 1.1;
          }
          return v;
        });
        savePrompts.sort((a, b) => {
          return (a.sort || 0) - (b.sort || 0);
        });
        localStorage.setItem(
          ":prompts",
          JSON.stringify(
            savePrompts.map((v, i) => {
              v.sort = i;
              return v;
            })
          )
        );
        getCollections();
      }
      setCurrentCollectionUpId(undefined);
    }
  }, [currentCollectionUpId, collections]);
  useEffect(() => {
    if (currentCollectionDownId) {
      const collection = find(collections, v => v.key === currentCollectionDownId);
      if (collection) {
        const dbPrompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");
        const savePrompts = dbPrompts.map(v => {
          if (v.id === currentCollectionDownId) {
            v.sort = (v.sort || 0) + 1.1;
          }
          return v;
        });
        savePrompts.sort((a, b) => {
          return (a.sort || 0) - (b.sort || 0);
        });
        localStorage.setItem(
          ":prompts",
          JSON.stringify(
            savePrompts.map((v, i) => {
              v.sort = i;
              return v;
            })
          )
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
          onSave={data => {
            onAddPrompt(data);
          }}
          editData={editCollection}
          deleteFn={id => {
            setCurrentCollectionRemoveId(id);
            close();
          }}
        />
      )}
      {![undefined, null, NaN].includes(currentCollection) && (
        <Message
          prompt={find(prompts, v => typeof v === "object" && v.id === currentCollection)}
          collection={currentCollection}
          key={currentCollection}
        />
      )}
    </>
  );
};

export default ChatbotPage;
