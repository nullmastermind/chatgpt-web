import { createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  messageBotBg: {
    background: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
    "& .la-copy": {
      display: "none",
    },
    ":hover": {
      ".la-copy": {
        display: "block",
      },
    },
  },
  messageContent: {
    "&>p": {
      margin: 0,
    },
    "&>pre": {
      margin: 0,
    },
  },
  inlineCode: {
    display: "inline-block",
    background: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0],
    paddingLeft: "0.25rem",
    paddingRight: "0.25rem",
    borderRadius: "0.5rem",
    fontStyle: "italic",
    opacity: 0.8,
  },
  blink: {
    background: theme.colorScheme !== "dark" ? theme.colors.dark[5] : theme.colors.gray[5],
  },
  codeWrap: {
    ".mantine-Prism-line": {
      whiteSpace: "pre-wrap",
    },
  },
  bgAction: {
    background: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0],
  },
}));

export default useStyles;
