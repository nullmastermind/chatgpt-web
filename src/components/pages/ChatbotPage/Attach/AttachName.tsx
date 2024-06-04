import React, { memo } from "react";
import { AttachItemType } from "@/components/misc/types";
import {
  IconBlockquote,
  IconBrandShazam,
  IconCsv,
  IconFileStack,
  IconPdf,
  IconPhotoEdit,
  IconUnlink,
  IconX,
} from "@tabler/icons-react";
import { ActionIcon, Badge } from "@mantine/core";
import classNames from "classnames";

const AttachName = memo<{
  name: string;
  type: AttachItemType;
  onRemove?: () => any;
}>(({ name, type, onRemove }) => {
  return (
    <Badge
      title={type}
      size={"xs"}
      leftSection={
        <div className={"h-full flex items-center justify-center"}>
          {type === AttachItemType.PrivateDocument && <IconFileStack size="1rem" />}
          {type === AttachItemType.TextData && <IconBlockquote size="1rem" />}
          {type === AttachItemType.Excel && <IconCsv size="1rem" />}
          {type === AttachItemType.OCR && <IconPdf size="1rem" />}
          {type === AttachItemType.Image && <IconPhotoEdit size="1rem" />}
          {type === AttachItemType.Audio && <IconBrandShazam size="1rem" />}
          {type === AttachItemType.Website && <IconUnlink size="1rem" />}
        </div>
      }
      variant={"dot"}
      className={classNames("no-dot cursor-pointer", {
        "pr-0": !!onRemove,
      })}
      rightSection={
        onRemove ? (
          <ActionIcon size="xs" color="blue" radius="xl" variant="transparent" onClick={() => onRemove?.()}>
            <IconX size={"1rem"} />
          </ActionIcon>
        ) : undefined
      }
    >
      {name}
    </Badge>
  );
});

export default AttachName;
