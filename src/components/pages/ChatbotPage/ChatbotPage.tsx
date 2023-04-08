import CenterCard from "@/components/CenterCard";
import { useMount, useUnmount } from "react-use";
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useGraphqlServer,
} from "@/states/states";
import { useDisclosure } from "@mantine/hooks";
import React, { useEffect, useState } from "react";
import { clone, find } from "lodash";
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
  const [server] = useGraphqlServer();
  const [currentCollection] = useCurrentCollection();
  const [currentCollectionRemoveId, setCurrentCollectionRemoveId] = useCurrentCollectionRemoveId();
  const [currentCollectionEditId, setCurrentCollectionEditId] = useCurrentCollectionEditId();
  const [editCollection, setEditCollection] = useState<any | undefined>();
  const [prompts, setPrompts] = useState<any[]>([]);

  const onAddCollection = () => {
    open();
  };
  const onAddPrompt = ({ name, temperature, prompts, id }: PromptSaveData) => {
    setModalLoading(true);
    axios
      .post(server, {
        query:
          id >= 0
            ? 'mutation MyMutation($id: Int = 10, $name: String = "", $prompts: jsonb = "", $temperature: numeric = "") {\n  update_nullgpt_prompts_by_pk(pk_columns: {id: $id}, _set: {name: $name, prompts: $prompts, temperature: $temperature}) {\n    id\n  }\n}\n'
            : 'mutation MyMutation($name: String = "", $prompts: jsonb = "", $temperature: numeric = "") {\n  insert_nullgpt_prompts_one(object: {name: $name, prompts: $prompts, temperature: $temperature}) {\n    id\n  }\n}\n',
        variables: {
          name,
          prompts,
          temperature,
          id,
        },
        operationName: "MyMutation",
      })
      .catch(() => {
        notifications.show({
          title: "Error",
          message: "Create/Edit error",
          radius: "lg",
          withCloseButton: true,
          color: "red",
          icon: <IconX />,
        });
      })
      .then(() => {
        notifications.show({
          title: "Success",
          message: "Template saved",
          radius: "lg",
          withCloseButton: true,
          color: "green",
          icon: <IconCircleCheckFilled />,
        });
      })
      .finally(() => {
        setEditCollection(undefined);
        setCurrentCollectionEditId(undefined);
        setModalLoading(false);
        close();
        getCollections();
      });
  };
  const getCollections = () => {
    axios
      .post(server, {
        query:
          "query MyQuery {\n  nullgpt_prompts(order_by: {id: asc}) {\n    id\n    name\n    prompts\n    temperature\n  }\n}\n",
        variables: null,
        operationName: "MyQuery",
      })
      .then(({ data }) => {
        const prompts: any[] = data.data.nullgpt_prompts;

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
      });
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
      const collection = find(collections, v => v.key === currentCollectionRemoveId);
      if (collection) {
        if (confirm(`Remove ${collection.label}?`)) {
          axios
            .post(server, {
              query:
                "mutation MyMutation($id: Int = 10) {\n  delete_nullgpt_prompts_by_pk(id: $id) {\n    id\n  }\n}\n",
              variables: {
                id: currentCollectionRemoveId,
              },
              operationName: "MyMutation",
            })
            .finally(getCollections);
        }
      }
      setCurrentCollectionRemoveId(undefined);
    }
  }, [currentCollectionRemoveId, server, collections]);
  useEffect(() => {
    if (!currentCollectionEditId) return;

    const prompt = find(prompts, v => v.id === currentCollectionEditId);
    if (!prompt) return;

    setEditCollection(clone(prompt));
    setTimeout(() => open());
  }, [currentCollectionEditId, prompts]);

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
        />
      )}
      <CenterCard>
        {![undefined, null, NaN].includes(currentCollection) && (
          <Message
            prompt={find(prompts, v => typeof v === "object" && v.id === currentCollection)}
            collection={currentCollection}
            key={currentCollection}
          />
        )}
      </CenterCard>
    </>
  );
};

export default ChatbotPage;
