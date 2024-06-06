import { memo, useEffect, useRef, useState } from "react";
import { convertToSupportLang } from "@/utility/utility";
import { ScrollArea, Tabs } from "@mantine/core";
import classNames from "classnames";
import { Prism } from "@mantine/prism";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import mermaid from "mermaid";
import panzoom from "panzoom";

const MermaidDraw = memo<{
  content: string;
}>(({ content }) => {
  const { classes } = useStyles();
  const [loading, setLoading] = useState(true);
  const mermaidDockBlock = useRef<null>(null);

  mermaid.initialize({ startOnLoad: false, theme: "dark" });

  useEffect(() => {
    if (!mermaidDockBlock.current) {
      return;
    }

    setLoading(true);

    // Render mermaid when mounted.
    mermaid
      .run({
        nodes: [mermaidDockBlock.current],
      })
      .then(() => setLoading(false));
  });

  useEffect(() => {
    if (mermaidDockBlock.current) {
      panzoom(mermaidDockBlock.current, {});
    }
  }, [mermaidDockBlock.current]);

  return (
    <div className={'py-5'}>
      <Tabs defaultValue={"diagram"}>
        <Tabs.List>
          <Tabs.Tab value={"diagram"}>Diagram</Tabs.Tab>
          <Tabs.Tab value={"text"}>Text</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={"diagram"}>
          <div className={"flex min-h-[256px] relative flex-row justify-center py-10 overflow-hidden"}>
            <div>
              <pre ref={mermaidDockBlock} className="w-full !p-0 whitespace-pre-wrap relative my-5">
                {content}
              </pre>
            </div>
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
