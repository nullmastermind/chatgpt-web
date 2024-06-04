import React, { memo } from "react";
import { AttachItem, AttachItemType } from "@/components/misc/types";
import { Card, Modal, ScrollArea, Title } from "@mantine/core";
import { IconBlockquote } from "@tabler/icons-react";
import { map } from "lodash";
import MemoizedReactMarkdown from "@/components/pages/ChatbotPage/MemoizedReactMarkdown";

const PreviewAttach = memo<{
  attachItem: AttachItem;
  onClose: () => any;
}>(({ attachItem, onClose }) => {
  return (
    <>
      <Modal
        opened={Boolean(attachItem)}
        onClose={() => onClose()}
        transitionProps={{ transition: "slide-up" }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            {attachItem?.type === AttachItemType.TextData && <IconBlockquote />}
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Preview
              </Title>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        {attachItem?.type === AttachItemType.TextData && (
          <div className={"flex flex-col gap-2"}>
            {map(attachItem.data, (value, index) => {
              return (
                <Card key={value.content}>
                  <ScrollArea.Autosize mah={300}>
                    <MemoizedReactMarkdown content={value.content} />
                  </ScrollArea.Autosize>
                </Card>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
});

export default PreviewAttach;
