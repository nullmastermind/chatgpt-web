import { Navbar, TextInput, Code, UnstyledButton, Badge, Text, Group, ActionIcon, Tooltip, rem } from "@mantine/core";
import { IconBulb, IconSearch, IconPlus, IconSelector } from "@tabler/icons-react";
import React from "react";
import { UserButton } from "@/components/UserButton/UserButton";
import { useStyles } from "@/components/pages/MainPage/MainPage.style";

const links: Array<{
  icon?: any;
  label: string;
  notifications?: string | number;
}> = [{ icon: IconBulb, label: "NullGPT" }];

const collections = [
  { emoji: "👍", label: "Sales" },
  { emoji: "🚚", label: "Deliveries" },
  { emoji: "💸", label: "Discounts" },
  { emoji: "💰", label: "Profits" },
  { emoji: "✨", label: "Reports" },
  { emoji: "🛒", label: "Orders" },
  { emoji: "📅", label: "Events" },
  { emoji: "🙈", label: "Debts" },
  { emoji: "💁‍♀️", label: "Customers" },
];

function MainPage() {
  const { classes } = useStyles();
  const mainLinks = links.map(link => (
    <UnstyledButton key={link.label} className={classes.mainLink}>
      <div className={classes.mainLinkInner}>
        <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
        <span>{link.label}</span>
      </div>
      {link.notifications && (
        <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
          {link.notifications}
        </Badge>
      )}
    </UnstyledButton>
  ));
  const collectionLinks = collections.map(collection => (
    <a href="/" onClick={event => event.preventDefault()} key={collection.label} className={classes.collectionLink}>
      <span style={{ marginRight: rem(9), fontSize: rem(16) }}>{collection.emoji}</span> {collection.label}
    </a>
  ));

  return (
    <Navbar height={"100vh"} width={{ sm: 300 }} p="md" className={classes.navbar}>
      <Navbar.Section className={classes.section}>
        <UserButton
          image={`https://avatars.githubusercontent.com/u/22487014?v=${Date.now()}`}
          name="Null Mastermind"
          email="thenullmastermind@gmail.com"
          icon={<IconSelector size="0.9rem" stroke={1.5} />}
        />
      </Navbar.Section>
      <TextInput
        placeholder="Search"
        size="xs"
        icon={<IconSearch size="0.8rem" stroke={1.5} />}
        rightSectionWidth={70}
        rightSection={<Code className={classes.searchCode}>Ctrl + K</Code>}
        styles={{ rightSection: { pointerEvents: "none" } }}
        mb="sm"
      />
      <Navbar.Section className={classes.section}>
        <div className={classes.mainLinks}>{mainLinks}</div>
      </Navbar.Section>
      <Navbar.Section className={classes.section}>
        <Group className={classes.collectionsHeader} position="apart">
          <Text size="xs" weight={500} color="dimmed">
            Collections
          </Text>
          <Tooltip label="Create collection" withArrow position="right">
            <ActionIcon variant="default" size={18}>
              <IconPlus size="0.8rem" stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <div className={classes.collections}>{collectionLinks}</div>
      </Navbar.Section>
    </Navbar>
  );
}

export default MainPage;
