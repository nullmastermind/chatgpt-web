import { ActionIcon, Text, UnstyledButton, createStyles, rem } from '@mantine/core';
import { SpotlightAction, SpotlightActionProps, SpotlightProvider } from '@mantine/spotlight';
import { IconPencil, IconSearch } from '@tabler/icons-react';
import React from 'react';

import { useQuickActions, useQuickActionsQuery } from '@/states/states';

const useStyles = createStyles((theme) => ({
  action: {
    'position': 'relative',
    'display': 'block',
    'width': '100%',
    'padding': `${rem(10)} ${rem(12)}`,
    'borderRadius': theme.radius.sm,
    ...theme.fn.hover({
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[1],
    }),

    '&[data-hovered]': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[1],
    },
  },
}));

const QuickActions = () => {
  const [quickActions] = useQuickActions();
  const [query, setQuery] = useQuickActionsQuery();

  return (
    <SpotlightProvider
      actions={quickActions as SpotlightAction[]}
      searchIcon={<IconSearch size="1.2rem" />}
      searchPlaceholder="Search..."
      nothingFoundMessage="Nothing found..."
      query={query}
      onQueryChange={setQuery}
      filter={() => quickActions}
      actionComponent={CustomAction}
    />
  );
};

function CustomAction({
  action,
  styles,
  classNames,
  hovered,
  onTrigger,
  ...others
}: SpotlightActionProps) {
  const { classes } = useStyles(null as any, { styles, classNames, name: 'Spotlight' });

  return (
    <UnstyledButton
      className={classes.action}
      data-hovered={hovered || undefined}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTrigger}
      {...others}
    >
      <div className={'flex flex-row items-center gap-2'}>
        <div className={'flex flex-col flex-grow'}>
          <Text>{action.title}</Text>
          {action.description && (
            <Text color="dimmed" size="xs">
              {action.description}
            </Text>
          )}
        </div>
        {Boolean(action.onEdit) && (
          <ActionIcon
            title={'Edit'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              action.onEdit(action);
            }}
          >
            <IconPencil />
          </ActionIcon>
        )}
      </div>
    </UnstyledButton>
  );
}

export default QuickActions;
