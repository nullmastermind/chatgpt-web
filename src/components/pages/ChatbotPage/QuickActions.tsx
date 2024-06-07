import { SpotlightProvider } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import React from 'react';

import { useQuickActions, useQuickActionsQuery } from '@/states/states';

const QuickActions = () => {
  const [quickActions] = useQuickActions();
  const [query, setQuery] = useQuickActionsQuery();

  return (
    <SpotlightProvider
      actions={quickActions}
      searchIcon={<IconSearch size="1.2rem" />}
      searchPlaceholder="Search..."
      nothingFoundMessage="Nothing found..."
      query={query}
      onQueryChange={setQuery}
      filter={() => quickActions}
    />
  );
};

export default QuickActions;
