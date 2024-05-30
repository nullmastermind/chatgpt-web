import { memo, useMemo, useState } from "react";
import { convertToSupportLang } from "@/utility/utility";
import { ScrollArea, Tabs } from "@mantine/core";
import classNames from "classnames";
import { Prism } from "@mantine/prism";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import { getMermaidLiveUrl } from "@/components/misc/mermaid";

const MermaidDraw = memo<{
  content: string;
}>(({ content }) => {
  const { classes } = useStyles();
  const url = useMemo(() => {
    return getMermaidLiveUrl(content);
  }, [content]);
  const [loading, setLoading] = useState(true);

  return (
    <>
      <Tabs defaultValue={"diagram"}>
        <Tabs.List>
          <Tabs.Tab value={"diagram"}>Diagram</Tabs.Tab>
          <Tabs.Tab value={"text"}>Text</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={"diagram"}>
          <div
            style={{
              height: 400,
            }}
            className={"relative"}
          >
            {loading && (
              <div className={"flex absolute top-0 left-0 w-full h-full items-center justify-center"}>
                <div>Drawing diagram...</div>
              </div>
            )}
            <iframe
              onLoad={() => {
                setTimeout(() => {
                  setLoading(false);
                }, 300);
              }}
              src={url}
              style={{
                width: "100%",
                height: "100%",
              }}
              className={classNames("border-0", {
                "opacity-0": loading,
              })}
            />
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
    </>
  );
});

export default MermaidDraw;
