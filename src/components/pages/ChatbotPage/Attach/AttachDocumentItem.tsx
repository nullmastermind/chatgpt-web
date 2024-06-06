import React, { memo, ReactNode } from "react";
import { Button, Card, Divider, ScrollArea } from "@mantine/core";
import { TIndexedDocumentItem } from "@/components/misc/types";
import { isCDocumentCode, trimDocumentContent } from "@/utility/utility";
import { IconPlus } from "@tabler/icons-react";
import MemoizedReactMarkdown from "@/components/pages/ChatbotPage/MemoizedReactMarkdown";

const AttachDocumentItem = memo<{
  item: TIndexedDocumentItem;
  buttonLabel: ReactNode;
  onClickButton: () => any;
}>(({ item, buttonLabel, onClickButton }) => {
  return (
    <>
      <Card>
        <Card.Section>
          <div
            className={"px-2 text-xs font-bold line-clamp-1"}
            style={{
              color: "rgb(77, 171, 247)",
            }}
          >
            {`${item[0].metadata.source}:${item[0].metadata?.loc?.lines?.from}:${item[0].metadata?.loc?.lines?.to}`}
          </div>
          <Divider />
        </Card.Section>
        <Card.Section className={"px-3"}>
          <div className={"flex flex-col sm:flex-row gap-2"}>
            <ScrollArea.Autosize mah={256} maw={500} className={"flex-grow"}>
              <MemoizedReactMarkdown
                smallText={true}
                content={
                  isCDocumentCode(item[0].pageContent)
                    ? `\`\`\`${trimDocumentContent(item[0].pageContent)}`
                    : trimDocumentContent(item[0].pageContent)
                }
              />
            </ScrollArea.Autosize>
            <div className={"py-3"}>
              <Button size={"xs"} variant={"default"} onClick={() => onClickButton()}>
                {buttonLabel}
              </Button>
            </div>
          </div>
        </Card.Section>
      </Card>
    </>
  );
});

export default AttachDocumentItem;
