import React, { memo } from "react";
import { Button, Menu } from "@mantine/core";
import {
  IconBrandShazam,
  IconCsv,
  IconFileStack,
  IconPdf,
  IconPhotoEdit,
  IconPlus,
  IconUnlink,
} from "@tabler/icons-react";

const UploadFile = memo(() => {
  return (
    <div className="flex flex-row gap-2 items-center">
      <div className={"text-sm font-bold"}>Add</div>
      <Menu>
        <Menu.Target>
          <Button className={"p-0 h-auto"} variant={"default"} size={"xs"}>
            <IconPlus size={"1rem"} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconFileStack size={"1.3rem"} />
              <div>Private document</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconCsv size={"1.3rem"} />
              <div>Excel/Word/Text</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconPdf size={"1.3rem"} />
              <div>OCR - Pdf/Image</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconPhotoEdit size={"1.3rem"} />
              <div>Image</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconBrandShazam size={"1.3rem"} />
              <div>Audio</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconUnlink size={"1.3rem"} />
              <div>Website URL</div>
            </div>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
});

export default UploadFile;
