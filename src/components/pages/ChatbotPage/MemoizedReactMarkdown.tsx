import ReactMarkdown from "react-markdown";
import classNames from "classnames";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  addTypingSymbol,
  convertToSupportLang,
  detectProgramLang,
  Node,
  postprocessAnswer,
  preprocessMessageContent,
} from "@/utility/utility";
import { memo, useMemo, useRef, useState } from "react";
import { Prism } from "@mantine/prism";
import { Button, ScrollArea } from "@mantine/core";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import { IconMenuOrder } from "@tabler/icons-react";
import MermaidDraw from "@/components/pages/ChatbotPage/MermaidDraw";
import TypingBlinkCursor from "@/components/misc/TypingBlinkCursor";

type MemoizedReactMarkdownProps = {
  content: string;
  id?: string;
  smallText?: boolean;
  isFirst?: boolean;
  isTyping?: boolean;
};

const MAX_TEXT = 512;

const MemoizedReactMarkdown = memo(
  ({ content: _content, id, smallText, isFirst, isTyping }: MemoizedReactMarkdownProps) => {
    const { classes } = useStyles();
    const [showAll, setShowAll] = useState(false);
    const content = useMemo(() => {
      if (isFirst && !showAll) {
        return _content.substring(0, MAX_TEXT);
      }

      return _content;
    }, [_content, isFirst, showAll]);
    const currentNodeLine = useRef(0);

    const md = (
      <ReactMarkdown
        linkTarget="_blank"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <p>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </p>
            );
          },
          h1({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <h1>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </h1>
            );
          },
          h2({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <h2>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </h2>
            );
          },
          h3({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <h3>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </h3>
            );
          },
          h4({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <h4>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </h4>
            );
          },
          strong({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <strong>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </strong>
            );
          },
          li({ node: rawNode, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            return (
              <li>
                {children}
                {isTyping && nodeLine >= currentNodeLine.current && !children?.toString().includes("█") ? "█" : ""}
              </li>
            );
          },
          code({ node: rawNode, inline, className, children }) {
            const node = rawNode as Node;
            const nodeLine = node.position?.end.offset || 0;

            if (nodeLine > currentNodeLine.current) {
              currentNodeLine.current = nodeLine;
            }

            const rawContent = String(children);
            let codeContent = postprocessAnswer(rawContent.replace(/\n$/, ""), true);

            if (inline && !content.includes("```" + rawContent + "```")) {
              if (node.position && node.position.end.offset - rawContent.length - node.position.start.offset === 2) {
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

            if (!inline && lang === "mermaid") {
              return <MermaidDraw content={codeContent} />;
            }

            return (
              <Prism
                children={addTypingSymbol(codeContent, isTyping && nodeLine >= currentNodeLine.current && !inline)}
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

    return (
      <div>
        <div
          className={classNames(classes.messageContent, classes.imgBg, {
            "px-2 sm:px-0": isFirst,
          })}
        >
          {md}
        </div>
        {isFirst && _content.length > MAX_TEXT && (
          <Button
            rightIcon={<IconMenuOrder size={"1rem"} />}
            size={"xs"}
            fullWidth={true}
            className={classes.expandBox}
            onClick={() => {
              setShowAll(!showAll);
            }}
          >
            Expand/Collapse
          </Button>
        )}
      </div>
    );
  }
);

export default MemoizedReactMarkdown;
