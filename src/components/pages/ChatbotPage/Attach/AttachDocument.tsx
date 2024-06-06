import React, { memo, useEffect, useRef, useState } from "react";
import {
  Button,
  FocusTrap,
  Input,
  Loader,
  Modal,
  NativeSelect,
  ScrollArea,
  Select,
  TextInput,
  Title,
} from "@mantine/core";
import { IconBlockquote, IconCornerDownLeft, IconFileStack, IconSearch } from "@tabler/icons-react";
import UserInput from "@/components/misc/UserInput";
import { AttachItem, AttachItemType } from "@/components/misc/types";
import { v4 } from "uuid";
import { useDebouncedState } from "@mantine/hooks";
import { useDebounce } from "react-use";

const AttachDocument = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
}>(({ opened, onClose, value, onSubmit }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);
  const [searchValue, setSearchValue] = useDebouncedState<string>("", 200);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);

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
  useDebounce(
    () => {
      if (opened && attachItem) {
        inputRef.current?.focus();
      }
    },
    100,
    [attachItem, opened]
  );

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
            <IconFileStack />
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Attach - Private document
              </Title>
              <div className="line-clamp-1 text-xs">Include your private documents to improve your agent's context</div>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        <div className={"flex flex-col gap-2"}>
          <div className={"flex flex-row gap-2"}>
            <div className={"w-[100px] max-w-[40%]"}>
              <NativeSelect data={["lorem ipsum"]} variant={"filled"} className={"w-full"} />
            </div>
            <div className={"flex-grow"}>
              <TextInput
                variant={"filled"}
                ref={inputRef}
                placeholder={"Search in document"}
                className={"w-full"}
                rightSection={<>{loading && <Loader size={"xs"} />}</>}
              />
              <div style={{ fontSize: 10 }} className={"flex flex-row gap-1"}>
                <IconCornerDownLeft size={"1rem"} />
                <div>Enter to search</div>
              </div>
            </div>
          </div>
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

export default AttachDocument;
