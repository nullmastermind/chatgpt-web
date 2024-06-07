import { createStyles } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  messageBotBg: {
    background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
  },
  userAvatar: {
    border:
      '2px solid ' + (theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]),
    borderRadius: '0.3rem',
  },
  assistantAvatar: {
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'transparent',
    borderRadius: '0.3rem',
    opacity: 0,
  },
  assistantAvatarInfo: {
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#1be8c4',
    borderRadius: '0.3rem',
    background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    lineHeight: '20px',
    textAlign: 'center',
    transform: 'scale(0.7)',
    right: -9,
    bottom: -6,
  },
  assistantAvatar2: {
    'borderStyle': 'solid',
    'borderWidth': '2px',
    'animation': 'random-color 1s infinite',
    'borderRadius': '0.3rem',
    '@keyframes random-color': {
      '0%': {
        borderColor: '#ff8080' /* Start with light red */,
      },
      '16.67%': {
        borderColor: '#ffbf80' /* Transition to light orange */,
      },
      '33.33%': {
        borderColor: '#ffff80' /* Transition to light yellow */,
      },
      '50%': {
        borderColor: '#80ff80' /* Transition to light green */,
      },
      '66.67%': {
        borderColor: '#80bfff' /* Transition to light blue */,
      },
      '83.33%': {
        borderColor: '#bf80ff' /* Transition to light purple */,
      },
      '100%': {
        borderColor: '#ff80ff' /* Transition to light pink */,
      },
    },
  },
  messageBotContainer: {
    '& .la-copy': {
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 0.1s ease-in-out',
    },
    ':hover': {
      '.la-copy': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    },
  },
  messageContent: {
    '&>p': {
      margin: 0,
    },
    '&>pre': {
      margin: 0,
      wordBreak: 'break-all',
    },
    '& li>p': {
      margin: 0,
    },
    // "& li": {
    //   animation: "fade-in 1s",
    // },
    // "& pre": {
    //   animation: "fade-in 1s",
    // },
    // "& p": {
    //   animation: "fade-in 1s",
    // },
  },
  inlineCode: {
    display: 'inline-block',
    background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
    paddingLeft: '0.25rem',
    paddingRight: '0.25rem',
    borderRadius: '0.5rem',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  blink: {
    background: theme.colorScheme !== 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
  },
  blink2: {
    'animation': 'blink 1s infinite',
    '@keyframes blink': {
      '0%': {
        opacity: 1,
      },
      '50%': {
        opacity: 0,
      },
      '100%': {
        opacity: 1,
      },
    },
  },
  codeWrap: {
    '.mantine-Prism-line': {
      whiteSpace: 'pre-wrap',
    },
  },
  bgAction: {
    background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
  },
  childLine: {
    background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 30,
    width: '1px',
  },
  childBorders: {
    borderLeft: '1px solid #373A40',
    borderRight: '1px solid #373A40',
    borderTop: '1px solid #373A40',
    marginTop: -1,
  },
  userQuestionBg: {
    background: '#25262b',
  },
  rootBorders: {
    borderLeft: '1px solid #373A40',
    borderRight: '1px solid #373A40',
    borderTop: '1px solid #373A40',
    borderBottom: '1px solid #373A40',
    borderTopLeftRadius: '0.25rem',
    borderTopRightRadius: '0.25rem',
  },
  writeReplyContainer: {
    border: '1px solid #373A40',
    borderBottomLeftRadius: '0.25rem',
    borderBottomRightRadius: '0.25rem',
    position: 'relative',
    marginTop: -1,
  },
  divider1: {
    borderTopColor: '#373A40',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
  },
  streamDone: {
    'animation': 'color-animation 1.5s forwards',
    '@keyframes color-animation': {
      from: {
        backgroundColor: 'green',
      },
      to: {
        backgroundColor: 'inherit',
      },
    },
  },
  fadeIn: {
    'animation': 'fade-in 1s',
    '@keyframes fade-in': {
      '0%': {
        opacity: 0,
      },
      '100%': {
        opacity: 1,
      },
    },
  },
  pBreakAll: {
    p: {
      wordBreak: 'break-all',
    },
  },
  imgBg: {
    img: {
      background: '#C1C2C5',
      borderRadius: '0.25rem',
      padding: '0.5rem',
    },
  },
  expandBox: {
    background: 'linear-gradient(to bottom, rgba(26, 27, 30, 1), rgba(26, 27, 30, 0));',
    position: 'relative',
    border: 0,
  },
  noModalBodyPad: {
    '& .mantine-Modal-body': {
      padding: 0,
    },
    '& .epr-main': {
      border: 0,
      borderRadius: 0,
      background: 'transparent',
    },
    '& .epr-emoji-category-label': {
      background: 'transparent',
    },
  },
}));

export default useStyles;
