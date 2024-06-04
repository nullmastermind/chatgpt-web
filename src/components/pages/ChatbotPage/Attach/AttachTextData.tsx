import React, { memo, useEffect, useState } from "react";
import { Button, Modal, ScrollArea, Title } from "@mantine/core";
import { IconBlockquote } from "@tabler/icons-react";
import UserInput from "@/components/misc/UserInput";
import { AttachItem, AttachItemType } from "@/components/misc/types";
import { v4 } from "uuid";

const AttachTextData = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
}>(({ opened, onClose, value, onSubmit }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);

  useEffect(() => {
    if (opened) {
      setAttachItem(
        value || {
          name: "Text data",
          data: [],
          createdAt: Date.now(),
          type: AttachItemType.TextData,
          id: v4(),
        }
      );
    }
  }, [value, opened]);

  if (!attachItem) return null;

  return (
    <>
      <Modal
        opened={Boolean(opened)}
        onClose={() => onClose()}
        transitionProps={{ transition: "slide-up" }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            <IconBlockquote />
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Attach - Text data
              </Title>
              <div className="line-clamp-1 text-xs">Include your text data to improve your agent context</div>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        <div className={"flex flex-col gap-2"}>
          <UserInput
            isReplyBox={true}
            placeholder="Content..."
            required={true}
            defaultValue={value?.data?.[0]?.content || ""}
            onChange={value => {
              value = value as string;
              setAttachItem({
                ...attachItem!,
                name: "Text data",
                data: [
                  {
                    content: value,
                    name: "",
                  },
                ],
              });
            }}
          />
          <div className={"sticky bottom-0 flex flex-row items-center justify-end gap-2"}>
            <Button variant="default" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={() => onSubmit(attachItem!)}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default AttachTextData;
