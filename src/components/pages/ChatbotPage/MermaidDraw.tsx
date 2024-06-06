import { memo, useEffect, useRef, useState } from "react";
import { convertToSupportLang } from "@/utility/utility";
import { Card, ScrollArea, Tabs } from "@mantine/core";
import classNames from "classnames";
import { Prism } from "@mantine/prism";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import mermaid from "mermaid";
import panzoom from "panzoom";
import { v4 } from "uuid";
import { messagePageScroll } from "@/components/pages/ChatbotPage/Message";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

const MermaidDraw = memo<{
  content: string;
}>(({ content }) => {
  const { classes } = useStyles();
  const [loading, setLoading] = useState(true);
  const mermaidDockBlock = useRef<HTMLDivElement>(null);
  const [id, setId] = useState(v4());

  useEffect(() => {
    if (!mermaidDockBlock.current) return;
    const prevHeight = mermaidDockBlock.current.getBoundingClientRect().height;
    mermaid
      .render(id, content)
      .then(value => {
        mermaidDockBlock.current!.innerHTML = value.svg;
        panzoom(mermaidDockBlock.current!, {});
        setLoading(false);
        // handle offset height
        const offsetHeight = mermaidDockBlock.current!.getBoundingClientRect().height - prevHeight;
        if (offsetHeight !== 0) {
          messagePageScroll.current?.scrollBy({
            top: offsetHeight,
          });
        }
      })
      .catch(e => {
        if (e.toString().includes("is not a valid selector")) {
          setId(v4());
        }
      });
  }, [content, id]);

  return (
    <div className={"py-5"}>
      <Tabs defaultValue={"diagram"}>
        <Tabs.List>
          <Tabs.Tab value={"diagram"}>Diagram</Tabs.Tab>
          <Tabs.Tab value={"text"}>Text</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={"diagram"}>
          <div className={"flex relative flex-row justify-center py-2 overflow-hidden"}>
            <Card className={"w-full"}>
              <div
                ref={mermaidDockBlock}
                className="w-full !p-0 whitespace-pre-wrap relative my-5 flex flex-row items-center justify-center"
              />
            </Card>
            {loading && (
              <div className={"flex absolute top-0 left-0 w-full h-full items-center justify-center"}>
                <div>Drawing diagram...</div>
              </div>
            )}
          </div>
        </Tabs.Panel>
        <Tabs.Panel value={"text"}>
          <Prism
            children={content}
            language={convertToSupportLang("mermaid")}
            scrollAreaComponent={ScrollArea}
            className={classNames("mb-1", classes.codeWrap)}
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
});

export default MermaidDraw;
