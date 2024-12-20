import { Button, Card, Divider, ScrollArea } from '@mantine/core';
import React, { ReactNode, memo } from 'react';

import { TIndexedDocumentItem } from '@/components/misc/types';

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
            className={'px-2 text-xs font-bold whitespace-normal break-words'}
            style={{
              color: 'rgb(77, 171, 247)',
              maxWidth: '100%',
              overflowWrap: 'break-word',
              wordBreak: 'break-all',
            }}
          >
            {`${item[0].metadata.source}:${item[0].metadata?.loc?.lines?.from}:${item[0].metadata?.loc?.lines?.to}`}
          </div>
          <Divider />
        </Card.Section>
        <Card.Section className={'px-3'}>
          <div className={'flex flex-col sm:flex-row gap-2'}>
            <ScrollArea.Autosize mah={256} maw={500} className={'flex-grow'}>
              {/*<MemoizedReactMarkdown*/}
              {/*  smallText={true}*/}
              {/*  content={*/}
              {/*    isCDocumentCode(item[0].pageContent)*/}
              {/*      ? `\`\`\`${trimDocumentContent(item[0].pageContent)}`*/}
              {/*      : trimDocumentContent(item[0].pageContent)*/}
              {/*  }*/}
              {/*/>*/}
              <pre className={'text-xs'} style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {item[0].pageContent}
              </pre>
            </ScrollArea.Autosize>
            <div className={'py-3'}>
              <Button size={'xs'} variant={'default'} onClick={() => onClickButton()}>
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
