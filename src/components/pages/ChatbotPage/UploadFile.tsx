import { Button, Kbd, Menu, ScrollArea } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconBlockquote,
  IconClearAll,
  IconCsv,
  IconFileStack,
  IconPhotoEdit,
  IconPlus,
} from '@tabler/icons-react';
import { clone, findIndex, map } from 'lodash';
import React, { RefObject, memo, useState } from 'react';

import { EditorCommands } from '@/components/misc/UserInput';
import { AttachItem, AttachItemType } from '@/components/misc/types';
import AttachDocument from '@/components/pages/ChatbotPage/Attach/AttachDocument';
import AttachExcel from '@/components/pages/ChatbotPage/Attach/AttachExcel';
import AttachImage from '@/components/pages/ChatbotPage/Attach/AttachImage';
import AttachName from '@/components/pages/ChatbotPage/Attach/AttachName';
import AttachTextData from '@/components/pages/ChatbotPage/Attach/AttachTextData';

const UploadFile = memo<{
  onChange: (value: AttachItem[]) => any;
  data: AttachItem[];
  onClear: () => any;
  editorRef: RefObject<EditorCommands>;
}>(({ onChange, data, onClear, editorRef }) => {
  const [showAttach, setShowAttach] = useState<AttachItemType | null>(null);
  const [editItem, setEditItem] = useState<AttachItem | null>(null);
  const { ref: attachContainerRef, width: attachContainerWidth } = useElementSize();

  const resetEdit = () => {
    setEditItem(null);
    setShowAttach(null);
  };
  const onSubmit = (item: AttachItem) => {
    const index = findIndex(data, (value1) => value1.id === item.id);
    if (index !== -1) data[index] = item;
    else data.push(item);
    onChange(clone(data));
    resetEdit();
    editorRef.current?.focus();
  };

  // useDoubleShiftHotkey(() => {
  //   setShowAttach(AttachItemType.PrivateDocument);
  // });

  return (
    <>
      {showAttach === AttachItemType.PrivateDocument && (
        <AttachDocument
          opened={showAttach === AttachItemType.PrivateDocument}
          onClose={() => {
            resetEdit();
          }}
          value={editItem}
          onSubmit={onSubmit}
          searchValue={editorRef.current?.getText()}
        />
      )}
      {showAttach === AttachItemType.TextData && (
        <AttachTextData
          opened={showAttach === AttachItemType.TextData}
          onClose={() => {
            resetEdit();
          }}
          value={editItem}
          onSubmit={onSubmit}
        />
      )}
      {showAttach === AttachItemType.Excel && (
        <AttachExcel
          opened={showAttach === AttachItemType.Excel}
          onClose={() => {
            resetEdit();
          }}
          value={editItem}
          onSubmit={onSubmit}
        />
      )}
      {showAttach === AttachItemType.Image && (
        <AttachImage
          opened={showAttach === AttachItemType.Image}
          onClose={() => {
            resetEdit();
          }}
          value={editItem}
          onSubmit={onSubmit}
        />
      )}
      <div className="flex flex-row gap-2 items-center h-[20px]">
        <Menu>
          <Menu.Target>
            <Button
              className={'p-0 px-1 h-auto'}
              variant={'default'}
              size={'xs'}
              rightIcon={<IconPlus size={'1rem'} />}
            >
              Attach
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {/*<div*/}
            {/*  className={"px-1"}*/}
            {/*  style={{*/}
            {/*    fontSize: 10,*/}
            {/*    color: "orange",*/}
            {/*  }}*/}
            {/*>*/}
            {/*  Features are under testing before release*/}
            {/*</div>*/}
            <Menu.Item className={'p-1'} onClick={() => setShowAttach(AttachItemType.TextData)}>
              <div className={'flex flex-row gap-1 items-center'}>
                <IconBlockquote size={'1.3rem'} />
                <div>Text data</div>
              </div>
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => setShowAttach(AttachItemType.PrivateDocument)}
              title={'Double Shift for quick use'}
            >
              <div className={'flex flex-row gap-1 items-center'}>
                <IconFileStack size={'1.3rem'} />
                <div className={'flex-grow'}>Private document</div>
                <Kbd size={'xs'}>⇧+⇧</Kbd>
              </div>
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => setShowAttach(AttachItemType.Excel)}>
              <div className={'flex flex-row gap-1 items-center'}>
                <IconCsv size={'1.3rem'} />
                <div>Excel/Word/Text</div>
              </div>
            </Menu.Item>
            {/*<Menu.Item className={'p-1'} disabled={true}>*/}
            {/*  <div className={'flex flex-row gap-1 items-center'}>*/}
            {/*    <IconPdf size={'1.3rem'} />*/}
            {/*    <div>OCR - Pdf/Image</div>*/}
            {/*  </div>*/}
            {/*</Menu.Item>*/}
            <Menu.Item className={'p-1'} onClick={() => setShowAttach(AttachItemType.Image)}>
              <div className={'flex flex-row gap-1 items-center'}>
                <IconPhotoEdit size={'1.3rem'} />
                <div>Image</div>
              </div>
            </Menu.Item>
            {/*<Menu.Item className={'p-1'} disabled={true}>*/}
            {/*  <div className={'flex flex-row gap-1 items-center'}>*/}
            {/*    <IconBrandShazam size={'1.3rem'} />*/}
            {/*    <div>Audio</div>*/}
            {/*  </div>*/}
            {/*</Menu.Item>*/}
            {/*<Menu.Item className={'p-1'} disabled={true}>*/}
            {/*  <div className={'flex flex-row gap-1 items-center'}>*/}
            {/*    <IconUnlink size={'1.3rem'} />*/}
            {/*    <div>Website URL</div>*/}
            {/*  </div>*/}
            {/*</Menu.Item>*/}
            <Menu.Divider />
            <Menu.Item className={'p-1'} onClick={() => onClear()}>
              <div className={'flex flex-row gap-1 items-center'}>
                <IconClearAll size={'1.3rem'} />
                <div>Clear all</div>
              </div>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <div className={'flex-grow relative h-full'}>
          <div className={'absolute top-0.5 w-full'} ref={attachContainerRef}>
            <ScrollArea w={attachContainerWidth} scrollbarSize={8}>
              <div className={'flex flex-row w-full gap-1 items-center pb-2 pr-2'}>
                {map(data, (item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setEditItem(item);
                        setShowAttach(item.type);
                      }}
                      className={'flex items-center'}
                    >
                      <AttachName
                        name={item.name}
                        type={item.type}
                        onRemove={(e) => {
                          e.stopPropagation();
                          modals.openConfirmModal({
                            title: 'Confirm',
                            centered: true,
                            children: `Delete the attachment "${item.name}"?`,
                            labels: { confirm: 'Confirm', cancel: 'Cancel' },
                            transitionProps: { transition: 'slide-up' },
                            onConfirm: async () => {
                              onChange(data.filter((v) => v.id !== item.id));
                            },
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
});

export default UploadFile;
