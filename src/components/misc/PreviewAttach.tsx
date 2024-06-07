import { Card, Divider, Modal, ScrollArea, Title } from '@mantine/core';
import { IconBlockquote, IconBrandOffice, IconFileStack } from '@tabler/icons-react';
import { map } from 'lodash';
import React, { memo } from 'react';

import { AttachItem, AttachItemType } from '@/components/misc/types';
import MemoizedReactMarkdown from '@/components/pages/ChatbotPage/MemoizedReactMarkdown';
import { isCDocumentCode, trimDocumentContent } from '@/utility/utility';

const PreviewAttach = memo<{
  attachItem: AttachItem;
  onClose: () => any;
}>(({ attachItem, onClose }) => {
  return (
    <>
      <Modal
        opened={Boolean(attachItem)}
        onClose={() => onClose()}
        transitionProps={{ transition: 'slide-up' }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            {attachItem?.type === AttachItemType.TextData && <IconBlockquote />}
            {attachItem?.type === AttachItemType.Excel && <IconBrandOffice />}
            {attachItem?.type === AttachItemType.PrivateDocument && <IconFileStack />}
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Preview
              </Title>
              <div className="line-clamp-1 text-xs">{attachItem.name || attachItem.type}</div>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        <div className={'flex flex-col gap-2'}>
          {map(attachItem.data, (value, index) => {
            if (value.disabled) return null;
            return (
              <Card key={value.content}>
                {!!value.name && (
                  <>
                    <Card.Section>
                      <div
                        className={'text-xs font-bold px-2'}
                        style={{
                          color: 'rgb(77, 171, 247)',
                        }}
                      >
                        {value.name}
                      </div>
                    </Card.Section>
                    <Divider />
                  </>
                )}
                <Card.Section className={'p-2'}>
                  <ScrollArea.Autosize mah={attachItem.data.length > 1 ? 256 : 400}>
                    <div
                      style={{
                        maxWidth: 570,
                      }}
                    >
                      <MemoizedReactMarkdown
                        smallText={true}
                        content={(() => {
                          if (value.isDocument) {
                            return isCDocumentCode(value.content)
                              ? `\`\`\`${trimDocumentContent(value.content)}`
                              : trimDocumentContent(value.content);
                          }
                          return value.content;
                        })()}
                      />
                    </div>
                  </ScrollArea.Autosize>
                </Card.Section>
              </Card>
            );
          })}
        </div>
      </Modal>
    </>
  );
});

export default PreviewAttach;
