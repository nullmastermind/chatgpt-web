import { ActionIcon, Avatar, Badge, Group, Kbd, Navbar, rem, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconBulb, IconEdit, IconPlus, IconSettings, IconTrash } from "@tabler/icons-react";
import React, { useEffect, useMemo } from "react";
import { useStyles } from "@/components/pages/MainPage/MainPage.style";
import { useDebounce, useLocalStorage } from "react-use";
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionDownId,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useCurrentCollectionUpId,
  useCurrentTool,
} from "@/states/states";
import { Notifications } from "@mantine/notifications";
import { find, range } from "lodash";
import classNames from "classnames";
import { ChatBotName } from "@/config";
import { useHotkeys } from "@mantine/hooks";

export type CollectionItem = {
  emoji: string;
  label: string;
  key: any;
  parent: string;
};
const links: Array<{
  icon?: any;
  key: string;
  label: string;
  notifications?: string | number;
  canAddCollections: boolean;
  collectionsLabel: string;
}> = [
  { icon: IconBulb, label: "Assistant", key: "nullgpt", canAddCollections: true, collectionsLabel: "Prompt templates" },
  { icon: IconSettings, label: "Settings", key: "settings", canAddCollections: false, collectionsLabel: "Settings" },
];

export type MainLayoutProps = {
  children: any;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const { classes } = useStyles();
  const [collections, setCollections] = useCollections();
  const [globalCurrentTool, setGlobalCurrentTool] = useCurrentTool();
  const [currentTool, setCurrentTool] = useLocalStorage(":currentTool", globalCurrentTool);
  const currentLink = useMemo(() => {
    return links.find(v => v.key === currentTool);
  }, [currentTool]);
  const [addAction] = useAddCollectionAction();
  const [currentCollection, setCurrentCollection] = useCurrentCollection();
  const [, setCollectionEditId] = useCurrentCollectionEditId();
  const [, setCollectionRemoveId] = useCurrentCollectionRemoveId();
  const [, setCollectionUpId] = useCurrentCollectionUpId();
  const [, setCollectionDownId] = useCurrentCollectionDownId();

  const hotkeySwitchCollection = (index: number) => {
    if (index <= collections.length - 1) {
      setCurrentCollection(collections[index].key);
    }
  };

  useHotkeys(range(0, 9).map(i => [`mod+${i + 1}`, () => hotkeySwitchCollection(i)]) as any);
  useEffect(() => {
    setGlobalCurrentTool(currentTool);
  }, [currentTool]);
  useDebounce(
    () => {
      if (!currentTool) return;
      if (collections.length > 0 && !find(collections, v => v.key === currentCollection)) {
        const dbCurrentCollection = localStorage.getItem(`:currentCollection:${currentTool}`);
        const tempCollection = find(collections, v => v.key.toString() === dbCurrentCollection);
        if (tempCollection) {
          setCurrentCollection(tempCollection.key);
        } else {
          setCurrentCollection(collections[0].key);
        }
      }
      if (collections.length === 0) {
        setCurrentCollection(undefined);
      }
    },
    42,
    [collections, currentCollection, currentTool]
  );
  useEffect(() => {
    if (currentTool && currentCollection) {
      localStorage.setItem(`:currentCollection:${currentTool}`, currentCollection.toString());
    }
  }, [currentCollection, currentTool]);

  const mainLinks = links.map(link => (
    <UnstyledButton key={link.label} className={classes.mainLink} onClick={() => setCurrentTool(link.key)}>
      <Text color={currentTool === link.key ? "blue" : "dimmed"} className={classes.mainLinkInner}>
        <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
        <span>{link.label}</span>
      </Text>
      {link.notifications && (
        <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
          {link.notifications}
        </Badge>
      )}
    </UnstyledButton>
  ));
  const collectionLinks = collections.map((collection: CollectionItem, index) => (
    <Text
      onClick={() => {
        setCurrentCollection(collection.key);
      }}
      key={collection.key}
      className={classes.collectionLink}
      color={collection.key === currentCollection ? "blue" : undefined}
    >
      <div className="flex flex-row gap-3 items-center relative">
        <div className="flex-grow flex gap-1">
          <span style={{ marginRight: rem(9), fontSize: rem(16) }}>{collection.emoji}</span>
          <div className={"whitespace-nowrap"}>
            {collection.label}
            {index < 9 && (
              <span className="inline-block whitespace-nowrap ml-2 opacity-50">
                <Kbd size="xs">⌘+{index + 1}</Kbd>
              </span>
            )}
          </div>
        </div>
        <div
          className={classNames("absolute right-0 flex flex-row gap-1 collection-action", {
            "collection-action-disabled": !currentLink?.canAddCollections,
          })}
        >
          <ActionIcon
            variant="light"
            color="blue"
            size="xs"
            onClick={e => {
              e.stopPropagation();
              setCollectionUpId(collection.key);
            }}
          >
            <IconArrowUp size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="blue"
            size="xs"
            onClick={e => {
              e.stopPropagation();
              setCollectionDownId(collection.key);
            }}
          >
            <IconArrowDown size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="blue"
            size="xs"
            onClick={e => {
              e.stopPropagation();
              setCollectionEditId(collection.key);
            }}
          >
            <IconEdit size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            size="xs"
            onClick={e => {
              e.stopPropagation();
              setCollectionRemoveId(collection.key);
            }}
          >
            <IconTrash size="1rem" />
          </ActionIcon>
        </div>
      </div>
    </Text>
  ));

  return (
    <>
      <Notifications />
      <div className="flex">
        <Navbar height={"100vh"} width={{ sm: 300 }} p="md" className={classes.navbar}>
          <Navbar.Section className={classes.section}>
            <div className="px-5 py-3 flex flex-grow items-center gap-3">
              <Avatar size="xl" src="/assets/bot1.png" />
              <div>
                <Title order={1}>{ChatBotName}</Title>
                <Text size="xs">Experience hassle-free living with OpenAI-based chatbot</Text>
              </div>
            </div>
          </Navbar.Section>
          <Navbar.Section className={classes.section}>
            <div className={classes.mainLinks}>{mainLinks}</div>
          </Navbar.Section>
          <Navbar.Section className={classes.section}>
            <Group className={classes.collectionsHeader} position="apart">
              <Text size="xs" weight={500} color="dimmed">
                {currentLink?.collectionsLabel}
              </Text>
              {currentLink?.canAddCollections && (
                <ActionIcon variant="default" size={18} onClick={addAction}>
                  <IconPlus size="1rem" stroke={1.5} />
                </ActionIcon>
              )}
            </Group>
            <div className={classes.collections}>{collectionLinks}</div>
          </Navbar.Section>
        </Navbar>
        <div className="flex-grow">{children}</div>
      </div>
    </>
  );
};

export default MainLayout;
