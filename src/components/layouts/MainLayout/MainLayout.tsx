import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Button,
  Checkbox,
  Divider,
  Group,
  Header,
  Kbd,
  MediaQuery,
  Menu,
  Navbar,
  rem,
  ScrollArea,
  Switch,
  Text,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconBulb,
  IconCircleCheckFilled,
  IconDatabaseCog,
  IconEdit,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import React, { useEffect, useMemo, useState } from "react";
import { useStyles } from "@/components/pages/MainPage/MainPage.style";
import { useDebounce, useLocalStorage, useMeasure, useMount, useWindowSize } from "react-use";
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
import { notifications, Notifications } from "@mantine/notifications";
import { find, range } from "lodash";
import classNames from "classnames";
import { useHotkeys } from "@mantine/hooks";
import { exportLocalStorageToJSON, importLocalStorageFromFile } from "@/utility/utility";
import { enable as enableDarkMode, exportGeneratedCSS as collectCSS, disable as disableDarkMode } from "darkreader";
import Link from "next/link";

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
  { icon: IconBulb, label: "Chatbot", key: "nullgpt", canAddCollections: true, collectionsLabel: "Prompt templates" },
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
  const [refScrollDiv, scrollDivInfo] = useMeasure();
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const { height: wHeight } = useWindowSize();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const [highContrast, setHighContrast] = useLocalStorage("highContrast", "0");

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
  useEffect(() => {
    if (scrollDivInfo.height > 0 && scrollAreaHeight === 0) {
      setScrollAreaHeight(scrollDivInfo.height);
    }
  }, [scrollAreaHeight, scrollDivInfo, wHeight]);
  useEffect(() => {
    setScrollAreaHeight(0);
  }, [wHeight]);
  useMount(() => {
    // enableDarkMode({
    //   // brightness: 100,
    //   // contrast: 100,
    //   sepia: 10,
    // });
    //
    // collectCSS().then(console.log);

    if (sessionStorage.getItem(":importLocalStorageFromFile")) {
      sessionStorage.removeItem(":importLocalStorageFromFile");
      notifications.show({
        title: "Success",
        message: "Data import successful.",
        radius: "lg",
        withCloseButton: true,
        color: "green",
        icon: <IconCircleCheckFilled />,
      });
    }
  });

  useDebounce(
    () => {
      if (highContrast === "1") {
        enableDarkMode({
          // brightness: 100,
          // contrast: 100,
          sepia: 10,
        });
      } else {
        disableDarkMode();
      }
    },
    500,
    [highContrast]
  );

  const mainLinks = links.map(link => (
    <UnstyledButton
      key={link.label}
      className={classes.mainLink}
      onClick={() => {
        setCurrentTool(link.key);
        setOpened(false);
      }}
    >
      <Text
        color={currentTool === link.key ? "white" : "dimmed"}
        className={classNames(classes.mainLinkInner, {
          "opacity-80": currentTool !== link.key,
        })}
      >
        <link.icon size={16} className={classes.mainLinkIcon} stroke={1.5} />
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
        setOpened(false);
      }}
      key={collection.key}
      color={collection.key === currentCollection ? "white" : undefined}
      className={classNames(classes.collectionLink, "pr-1 h-[25px] flex items-center", {
        "opacity-80": collection.key !== currentCollection,
        "font-bold": collection.key === currentCollection,
      })}
    >
      1709
      <div className="flex flex-row gap-3 items-center relative flex-grow">
        <div className="flex-grow flex gap-1 items-center text-center">
          <div className={"w-5 justify-center flex items-center"}>
            <span style={{ marginRight: rem(8), fontSize: "1rem" }}>{collection.emoji}</span>
          </div>
          <div className={"whitespace-nowrap"}>{collection.label}</div>
          {index < 10 && (
            <div className={"flex-grow flex items-center justify-end"}>
              <div className="inline-block whitespace-nowrap ml-2 opacity-50">
                <Kbd size="xs">⌘+{index + 1}</Kbd>
              </div>
            </div>
          )}
        </div>
        <div
          className={classNames(
            "absolute right-0 flex flex-row gap-1 collection-action px-2 py-1 rounded",
            {
              "collection-action-disabled": !currentLink?.canAddCollections,
            },
            classes.listActions
          )}
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

  const renderedScrollContent = (
    <ScrollArea h={scrollAreaHeight}>
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
    </ScrollArea>
  );

  return (
    <>
      <Notifications />
      <AppShell
        padding={0}
        navbar={
          <Navbar
            hidden={!opened}
            width={{ sm: 256 }}
            p={"md"}
            className={classNames("flex flex-col", classes.navbar, {})}
          >
            <Navbar.Section className={classes.section}>
              <div className={classes.mainLinks}>{mainLinks}</div>
            </Navbar.Section>
            <Navbar.Section className={classNames(classes.section)} grow ref={refScrollDiv as any}>
              {renderedScrollContent}
            </Navbar.Section>
            <Navbar.Section>
              <div className={"flex flex-wrap gap-1 pb-5"}>
                <div className={"text-xs"}>Try a better UI version:</div>
                <Link className={"text-xs"} href={"https://lobehub.dongnv.dev"}>
                  lobehub.dongnv.dev
                </Link>
                <div className={"text-xs opacity-60"}>
                  Don't worry, this project will continue to be developed. This project is aimed at speed and
                  compactness
                </div>
              </div>
              <div className={"flex items-center"}>
                <div className={"flex-grow"}>
                  <Menu shadow="md" width={"100%"}>
                    <Menu.Target>
                      <Button size={"xs"} variant={"default"} leftIcon={<IconDatabaseCog />}>
                        Backup
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Text size={"xs"} color={"yellow"} className={"p-2"}>
                        <IconAlertCircle size={"1rem"} className={"mr-2"} />
                        After importing new data, all existing data will be overwritten, so please consider using it
                        carefully!
                      </Text>
                      <Divider />
                      <Menu.Item
                        onClick={() =>
                          importLocalStorageFromFile(() => {
                            sessionStorage.setItem(":importLocalStorageFromFile", "OK");
                            location.reload();
                          })
                        }
                      >
                        Import
                      </Menu.Item>
                      <Menu.Item onClick={() => exportLocalStorageToJSON()}>Export</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </div>
                <Checkbox
                  size={"xs"}
                  label="high contrast"
                  onChange={e => {
                    setHighContrast(e.target.checked ? "1" : "0");
                  }}
                  checked={highContrast === "1"}
                />
              </div>
            </Navbar.Section>
          </Navbar>
        }
        header={
          <Header height={{ base: 33 }} p="md">
            <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
              <MediaQuery largerThan="sm" styles={{ display: "none" }}>
                <Burger
                  opened={opened}
                  onClick={() => setOpened(o => !o)}
                  size="sm"
                  color={theme.colors.gray[6]}
                  mr="xl"
                />
              </MediaQuery>
              <div className={"flex items-center justify-center"}>
                <Text>_simplegpt</Text>
                <div className={"-ml-2 -mb-2"}>{/*<TypingBlinkCursor />*/}</div>
              </div>
            </div>
          </Header>
        }
      >
        {children}
      </AppShell>
      <input id="import_config_input" type="file" accept="application/json" className={"hidden"} />
    </>
  );
};

export default MainLayout;
