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
  ScrollArea,
  Text,
  UnstyledButton,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useHotkeys, useShallowEffect } from '@mantine/hooks';
import { Notifications, notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconArrowsMaximize,
  IconCircleCheckFilled,
  IconDatabaseCog,
  IconEdit,
  IconMessage,
  IconPlus,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import classNames from 'classnames';
import { disable as disableDarkMode, enable as enableDarkMode } from 'darkreader';
import { clone, find, map, range } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useDebounce, useLocalStorage, useMount } from 'react-use';

import FunnyEmoji from '@/components/misc/FunnyEmoji';
import { useStyles } from '@/components/pages/MainPage/MainPage.style';
import { appName } from '@/config';
import {
  useAddCollectionAction,
  useCollections,
  useCurrentCollection,
  useCurrentCollectionDownId,
  useCurrentCollectionEditId,
  useCurrentCollectionRemoveId,
  useCurrentCollectionUpId,
  useCurrentTool,
  useLastMessageByCollection,
  useSubCollectionId,
} from '@/states/states';
import store, { messagesKey } from '@/utility/store';
import { exportLocalStorageToJSON, importLocalStorageFromFile } from '@/utility/utility';

export type CollectionItem = {
  emoji: string;
  label: string;
  key: any;
  parent: string;
  description: string;
};
const links: Array<{
  icon?: any;
  key: string;
  label: string;
  notifications?: string | number;
  canAddCollections: boolean;
  collectionsLabel: string;
}> = [
  {
    icon: IconMessage,
    label: 'Agents',
    key: 'nullgpt',
    canAddCollections: true,
    collectionsLabel: 'Agents',
  },
  {
    icon: IconSettings,
    label: 'Settings',
    key: 'settings',
    canAddCollections: false,
    collectionsLabel: 'Settings',
  },
];

export type MainLayoutProps = {
  children: any;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const { classes } = useStyles();
  const [collections] = useCollections();
  const [globalCurrentTool, setGlobalCurrentTool] = useCurrentTool();
  const [currentTool, setCurrentTool] = useLocalStorage(':currentTool', globalCurrentTool);
  const currentLink = useMemo(() => {
    return links.find((v) => v.key === currentTool);
  }, [currentTool]);
  const [addAction] = useAddCollectionAction();
  const [currentCollection, setCurrentCollection] = useCurrentCollection();
  const [, setCollectionEditId] = useCurrentCollectionEditId();
  const [, setCollectionRemoveId] = useCurrentCollectionRemoveId();
  const [, setCollectionUpId] = useCurrentCollectionUpId();
  const [, setCollectionDownId] = useCurrentCollectionDownId();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const [highContrast, setHighContrast] = useLocalStorage('highContrast', '0');
  const logoText = useMemo(() => {
    return localStorage.getItem(':logoText') || appName;
  }, []);
  const [, setSubCollectionId] = useSubCollectionId();
  const [lastMessageByCollection, setLastMessageByCollection] = useLastMessageByCollection();

  const hotkeySwitchCollection = (index: number) => {
    if (index <= collections.length - 1) {
      setCurrentCollection(collections[index].key);
    }
  };

  useHotkeys(range(0, 9).map((i) => [`mod+${i + 1}`, () => hotkeySwitchCollection(i)]) as any);
  useEffect(() => {
    setGlobalCurrentTool(currentTool);
  }, [currentTool]);
  useDebounce(
    () => {
      if (!currentTool) return;
      if (collections.length > 0 && !find(collections, (v) => v.key === currentCollection)) {
        const dbCurrentCollection = localStorage.getItem(`:currentCollection:${currentTool}`);
        const tempCollection = find(collections, (v) => v.key.toString() === dbCurrentCollection);
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
    [collections, currentCollection, currentTool],
  );
  useEffect(() => {
    if (currentTool && currentCollection) {
      localStorage.setItem(`:currentCollection:${currentTool}`, currentCollection.toString());
    }
  }, [currentCollection, currentTool]);
  useMount(() => {
    // enableDarkMode({
    //   // brightness: 100,
    //   // contrast: 100,
    //   sepia: 10,
    // });
    //
    // collectCSS().then(console.log);

    if (sessionStorage.getItem(':importLocalStorageFromFile')) {
      sessionStorage.removeItem(':importLocalStorageFromFile');
      notifications.show({
        title: 'Success',
        message: 'Data import successful.',
        radius: 'lg',
        withCloseButton: true,
        color: 'green',
        icon: <IconCircleCheckFilled />,
      });
    }
  });

  useDebounce(
    () => {
      if (highContrast === '1') {
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
    [highContrast],
  );
  useEffect(() => {
    const collection = collections.find((v) => v.key === currentCollection);
    if (collection) {
      document.title = `${collection.emoji} ${collection.label}`;
    }
  }, [currentCollection, collections]);
  useShallowEffect(() => {
    if (collections.length === 0) return;
    if (Object.keys(lastMessageByCollection).length > 0) return;

    const result: Record<any, string> = {};

    Promise.all(
      map(collections, async (collection) => {
        const messages: any[] = (await store.getItem(messagesKey(collection.key))) || [];
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].source === 'user') {
            result[collection.key] = messages[i].content;
            break;
          }
        }
      }),
    ).then(() => {
      result['ok'] = 'OK';
      setLastMessageByCollection(result);
    });
  }, [collections, lastMessageByCollection]);

  const mainLinks = links.map((link) => (
    <UnstyledButton
      key={link.label}
      className={classes.mainLink}
      onClick={() => {
        setCurrentTool(link.key);
        setOpened(false);
      }}
    >
      <Text
        color={currentTool === link.key ? 'white' : 'dimmed'}
        className={classNames(classes.mainLinkInner, {
          'opacity-80': currentTool !== link.key,
        })}
      >
        <link.icon size={'1.3rem'} className={classes.mainLinkIcon} stroke={1.5} />
        <span className={'font-normal'}>{link.label}</span>
      </Text>
      {link.notifications && (
        <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
          {link.notifications}
        </Badge>
      )}
    </UnstyledButton>
  ));
  const collectionLinks = collections.map((collection: CollectionItem, index) => (
    <div
      onClick={() => {
        setCurrentCollection(collection.key);
        setOpened(false);
      }}
      key={collection.key}
      className={classNames(classes.collectionLink, 'pr-2', {
        'opacity-80': collection.key !== currentCollection,
        // 'font-bold': collection.key === currentCollection,
        [classes.selectedCollectionLink]: collection.key === currentCollection,
        'shadow': collection.key === currentCollection,
      })}
    >
      <div className="flex flex-row gap-3 items-center relative flex-grow">
        <div className="flex-grow flex gap-1 items-center text-center">
          <div className={'w-[40px] justify-center flex items-center relative z-10'}>
            <span style={{ marginRight: rem(8), fontSize: '1rem' }}>
              <div
                className={'rounded-full w-[32px] h-[32px] p-1 overflow-hidden'}
                style={{
                  background: '#333333',
                }}
              >
                <FunnyEmoji
                  emoji={collection.emoji}
                  emojiType={collection.key === currentCollection ? 'anim' : '3d'}
                  size={'100%'}
                />
              </div>
            </span>
          </div>
          <div className="flex flex-col items-start justify-center h-[50px] pb-1">
            <Text
              color={collection.key === currentCollection ? 'white' : undefined}
              className="whitespace-nowrap"
            >
              {collection.label}
            </Text>
            {!!collection.description && (
              <Text
                color={collection.key === currentCollection ? 'white' : undefined}
                className="font-normal text-xs text-left line-clamp-1 min-h-[20px]"
                title={collection.description}
              >
                {lastMessageByCollection[collection.key] ||
                  collection.description ||
                  collection.label}
              </Text>
            )}
          </div>
          {/*{index < 9 && (*/}
          {/*  <div*/}
          {/*    className={classNames('flex-grow flex items-center justify-end', {})}*/}
          {/*    style={{*/}
          {/*      marginTop: -6,*/}
          {/*    }}*/}
          {/*  >*/}
          {/*    <div className="inline-block whitespace-nowrap ml-2 opacity-50">*/}
          {/*      <Kbd size="xs">⌘+{index + 1}</Kbd>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}
        </div>
        <div
          className={classNames(
            'absolute right-[-5px] flex flex-row gap-1 items-center justify-center collection-action px-2 py-1 rounded shadow-xl',
            {
              'collection-action-disabled': !currentLink?.canAddCollections,
            },
            classes.listActions,
          )}
        >
          {!isMobile && (
            <>
              <ActionIcon
                variant="outline"
                color="blue"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setSubCollectionId(collection.key);
                }}
                title={'Open in a dialog'}
              >
                <IconArrowsMaximize size="2rem" />
              </ActionIcon>
              <Divider orientation={'vertical'} />
            </>
          )}
          <div className={'flex flex-col gap-1'}>
            <div className={'flex flex-row gap-1'}>
              <ActionIcon
                variant="default"
                color="blue"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectionUpId(collection.key);
                }}
              >
                <IconArrowUp size="1rem" />
              </ActionIcon>
              <ActionIcon
                variant="default"
                color="blue"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectionDownId(collection.key);
                }}
              >
                <IconArrowDown size="1rem" />
              </ActionIcon>
            </div>
            <div className={'flex flex-row gap-1'}>
              <ActionIcon
                variant="default"
                color="blue"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectionEditId(collection.key);
                }}
              >
                <IconEdit size="1rem" />
              </ActionIcon>
              <ActionIcon
                variant="outline"
                color="red"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectionRemoveId(collection.key);
                }}
              >
                <IconTrash size="1rem" />
              </ActionIcon>
            </div>
          </div>
        </div>
      </div>
    </div>
  ));

  const renderedScrollContent = (
    <div className={'pb-5'}>
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
      <div className={classNames(classes.collections, 'flex flex-col gap-0.5 mt-3')}>
        {collectionLinks}
      </div>
      {currentLink?.canAddCollections && (
        <div className="px-4">
          <Button
            fullWidth={true}
            variant="default"
            size="xs"
            leftIcon={<IconPlus />}
            onClick={addAction}
          >
            New agent
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Notifications />
      <AppShell
        padding={0}
        pl={12}
        pr={12}
        navbar={
          <Navbar
            hidden={!opened}
            width={{ sm: 300 }}
            p={'md'}
            className={classNames('flex flex-col z-50', classes.navbar, {})}
          >
            <Navbar.Section className={classes.section}>
              <div className={classes.mainLinks}>{mainLinks}</div>
            </Navbar.Section>
            <Navbar.Section className={classNames(classes.section)} grow component={ScrollArea}>
              {renderedScrollContent}
            </Navbar.Section>
            <Navbar.Section>
              <div className={'flex items-center'}>
                <div className={'flex-grow'}>
                  <Menu shadow="md" width={'100%'}>
                    <Menu.Target>
                      <Button size={'xs'} variant={'default'} leftIcon={<IconDatabaseCog />}>
                        Backup
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Text size={'xs'} color={'yellow'} className={'p-2'}>
                        <IconAlertCircle size={'1rem'} className={'mr-2'} />
                        After importing new data, all existing data will be overwritten, so please
                        consider using it carefully!
                      </Text>
                      <Divider />
                      <Menu.Item
                        onClick={() =>
                          importLocalStorageFromFile(() => {
                            sessionStorage.setItem(':importLocalStorageFromFile', 'OK');
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
                  size={'xs'}
                  label="high contrast"
                  onChange={(e) => {
                    setHighContrast(e.target.checked ? '1' : '0');
                  }}
                  checked={highContrast === '1'}
                />
              </div>
            </Navbar.Section>
          </Navbar>
        }
        header={
          <Header height={{ base: 33 }} p="md">
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <MediaQuery largerThan="md" styles={{ display: 'none' }}>
                <Burger
                  opened={opened}
                  onClick={() => setOpened((o) => !o)}
                  size="sm"
                  color={theme.colors.gray[6]}
                  mr="xl"
                />
              </MediaQuery>
              <div className={'flex items-center justify-center'}>
                <Text
                  style={{
                    fontWeight: 800,
                    lineHeight: 0,
                    fontSize: 20,
                    color: 'white',
                    letterSpacing: 0.1,
                  }}
                >
                  {logoText}
                </Text>
                <div className={'-ml-2 -mb-2'}>{/*<TypingBlinkCursor />*/}</div>
              </div>
            </div>
          </Header>
        }
      >
        {children}
      </AppShell>
      <input id="import_config_input" type="file" accept="application/json" className={'hidden'} />
    </>
  );
};

export default MainLayout;
