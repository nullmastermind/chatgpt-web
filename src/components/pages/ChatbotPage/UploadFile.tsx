import React, { memo } from "react";
import { Button, Menu } from "@mantine/core";
import {
  IconBlockquote,
  IconBrandShazam,
  IconCsv,
  IconFileStack,
  IconPdf,
  IconPhotoEdit,
  IconPlus,
  IconUnlink,
} from "@tabler/icons-react";
import { AttachItem } from "@/components/misc/types";

const UploadFile = memo<{
  onChange: (value: AttachItem[]) => any;
}>(() => {
  return (
    <div className="flex flex-row gap-2 items-center">
      <Menu>
        <Menu.Target>
          <Button className={"p-0 px-1 h-auto"} variant={"default"} size={"xs"} rightIcon={<IconPlus size={"1rem"} />}>
            Attach
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <div
            className={"px-1"}
            style={{
              fontSize: 10,
              color: "orange",
            }}
          >
            Features are under testing before release
          </div>
          <Menu.Item className={"p-1"} disabled={true}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconFileStack size={"1.3rem"} />
              <div>Private document</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={false}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconBlockquote size={"1.3rem"} />
              <div>Text data</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={true}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconCsv size={"1.3rem"} />
              <div>Excel/Word/Text</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={true}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconPdf size={"1.3rem"} />
              <div>OCR - Pdf/Image</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={true}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconPhotoEdit size={"1.3rem"} />
              <div>Image</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={true}>
            <div className={"flex flex-row gap-1 items-center"}>
              <IconBrandShazam size={"1.3rem"} />
              <div>Audio</div>
            </div>
          </Menu.Item>
          <Menu.Item className={"p-1"} disabled={true}>
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
