import ReactMarkdown from "react-markdown";
import classNames from "classnames";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  convertToSupportLang,
  detectProgramLang,
  postprocessAnswer,
  preprocessMessageContent,
  Node,
} from "@/utility/utility";
import { memo, useEffect } from "react";
import { Prism } from "@mantine/prism";
import { ScrollArea } from "@mantine/core";
import useStyles from "@/components/pages/ChatbotPage/Message.style";

type MemoizedReactMarkdownProps = {
  content: string;
  id?: string;
  smallText?: boolean;
};

const MemoizedReactMarkdown = memo(({ content, id, smallText }: MemoizedReactMarkdownProps) => {
  const { classes } = useStyles();

  const md = (
    <ReactMarkdown
      linkTarget="_blank"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node: rawNode, inline, className, children }) {
          const node = rawNode as Node;

          const rawContent = String(children);
          let codeContent = postprocessAnswer(rawContent.replace(/\n$/, ""), true);

          if (inline && !content.includes("```" + rawContent + "```")) {
            if (node.position.end.offset - rawContent.length - node.position.start.offset === 2) {
              return <code className={classes.inlineCode}>{codeContent}</code>;
            }
          }

          const match = /language-(\w+)/.exec(className || "");
          let lang = "javascript";

          if (!match) {
            try {
              lang = detectProgramLang(codeContent);
            } catch (e) {}
          } else {
            lang = match[1];
          }

          return (
            <Prism
              children={codeContent}
              language={convertToSupportLang(lang)}
              scrollAreaComponent={ScrollArea}
              className={classNames("mb-1", classes.codeWrap)}
            />
          );
        },
      }}
    >
      {preprocessMessageContent(content)}
    </ReactMarkdown>
  );

  if (smallText) {
    return <div className={classNames("text-xs", classes.pBreakAll)}>{md}</div>;
  }

  return md;
});

export default MemoizedReactMarkdown;
