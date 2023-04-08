import {
  Navbar,
  TextInput,
  Code,
  UnstyledButton,
  Badge,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  rem,
  MantineProvider,
} from "@mantine/core";
import {
  IconBulb,
  IconSearch,
  IconPlus,
  IconSelector,
  IconSettings2,
  IconSettings,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react";
import React, { useEffect, useMemo, useState } from "react";
import { UserButton } from "@/components/UserButton/UserButton";
import { useStyles } from "@/components/pages/MainPage/MainPage.style";
import { useDebounce, useLocalStorage } from "react-use";
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useCurrentTool,
} from "@/states/states";
import { Notifications } from "@mantine/notifications";
import { find } from "lodash";
import classNames from "classnames";

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
  { icon: IconBulb, label: "NullGPT", key: "nullgpt", canAddCollections: true, collectionsLabel: "Prompt templates" },
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

  useEffect(() => {
    setGlobalCurrentTool(currentTool);
  }, [currentTool]);
  useDebounce(
    () => {
      if (collections.length > 0 && !find(collections, v => v.key === currentCollection)) {
        setCurrentCollection(collections[0].key);
      }
      if (collections.length === 0) {
        setCurrentCollection(undefined);
      }
    },
    42,
    [collections, currentCollection]
  );

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
  const collectionLinks = collections.map((collection: CollectionItem) => (
    <Text
      onClick={() => {
        setCurrentCollection(collection.key);
      }}
      key={collection.key}
      className={classes.collectionLink}
      color={collection.key === currentCollection ? "blue" : undefined}
    >
      <div className="flex flex-row gap-3 items-center">
        <div className="flex-grow">
          <span style={{ marginRight: rem(9), fontSize: rem(16) }}>{collection.emoji}</span> {collection.label}
        </div>
        <div
          className={classNames("flex flex-row gap-1 collection-action", {
            "collection-action-disabled": !currentLink?.canAddCollections,
          })}
        >
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
            <UserButton
              image={`https://avatars.githubusercontent.com/u/22487014?v=${Date.now()}`}
              name="Null Mastermind"
              email="thenullmastermind@gmail.com"
              icon={<IconSelector size="0.9rem" stroke={1.5} />}
            />
          </Navbar.Section>
          {/*<TextInput*/}
          {/*  placeholder="Search"*/}
          {/*  size="xs"*/}
          {/*  icon={<IconSearch size="1rem" />}*/}
          {/*  rightSectionWidth={40}*/}
          {/*  rightSection={<Code className={classes.searchCode}>^K</Code>}*/}
          {/*  styles={{ rightSection: { pointerEvents: "none" } }}*/}
          {/*  mb="sm"*/}
          {/*/>*/}
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
