import { createStyles, rem } from '@mantine/core';

export const useStyles = createStyles((theme) => ({
  navbar: {
    paddingTop: 0,
    zIndex: 1,
  },

  section: {
    // 'marginLeft': `calc(${theme.spacing.md} * -1)`,
    // 'marginRight': `calc(${theme.spacing.md} * -1)`,
    'marginBottom': theme.spacing.md,

    '&:not(:last-of-type)': {
      borderBottom: `${rem(1)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
    },
  },

  searchCode: {
    fontWeight: 700,
    fontSize: rem(10),
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
    border: `${rem(1)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2]}`,
  },

  mainLinks: {
    paddingLeft: `calc(${theme.spacing.md} - ${theme.spacing.xs})`,
    paddingRight: `calc(${theme.spacing.md} - ${theme.spacing.xs})`,
    paddingBottom: theme.spacing.md,
  },

  mainLink: {
    'display': 'flex',
    'alignItems': 'center',
    'width': '100%',
    'fontSize': theme.fontSizes.sm,
    'padding': `${rem(1)} ${theme.spacing.xs}`,
    'borderRadius': theme.radius.sm,
    'fontWeight': 500,
    'color': theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
      color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    },
  },

  mainLinkInner: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },

  mainLinkIcon: {
    marginRight: theme.spacing.sm,
    // color: theme.colorScheme === "dark" ? theme.colors.dark[2] : theme.colors.gray[6],
  },

  mainLinkBadge: {
    padding: 0,
    width: rem(20),
    height: rem(20),
    pointerEvents: 'none',
  },

  collections: {
    paddingLeft: `calc(${theme.spacing.md} - ${rem(6)})`,
    paddingRight: `calc(${theme.spacing.md} - ${rem(6)})`,
    paddingBottom: theme.spacing.md,
  },

  collectionsHeader: {
    paddingLeft: `calc(${theme.spacing.md} + ${rem(2)})`,
    paddingRight: theme.spacing.md,
    marginBottom: rem(5),
  },

  selectedCollectionLink: {
    background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    border: '1px solid rgba(255,255,255,0.1) !important',
  },

  collectionLink: {
    'display': 'block',
    'padding': `${rem(1)} ${theme.spacing.xs}`,
    'textDecoration': 'none',
    'borderRadius': theme.radius.sm,
    'fontSize': theme.fontSizes.sm,
    'border': '1px solid transparent',
    // lineHeight: 1,
    // fontWeight: 500,
    'cursor': 'pointer',
    '.collection-action': {
      opacity: 0,
      pointerEvents: 'none',
    },
    '&:hover': {
      'backgroundColor': theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
      '.collection-action': {
        opacity: 1,
        pointerEvents: 'auto',
      },
      'border': '1px solid rgba(255,255,255,0.1)',
    },
    '.collection-action-disabled': {
      opacity: '0!important' as any,
      pointerEvents: 'none!important' as any,
    },
  },
  listActions: {
    background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    border: '1px solid #373A40',
  },
}));
