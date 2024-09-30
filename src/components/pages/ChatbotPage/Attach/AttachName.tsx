import { ActionIcon, Badge, Transition } from '@mantine/core';
import {
  IconBlockquote,
  IconBrandOpenai,
  IconBrandShazam,
  IconCsv,
  IconFileStack,
  IconPdf,
  IconPhotoEdit,
  IconUnlink,
  IconX,
} from '@tabler/icons-react';
import classNames from 'classnames';
import React, { memo } from 'react';

import { AttachItemType } from '@/components/misc/types';

const AttachName = memo<{
  name: string;
  type: AttachItemType;
  onRemove?: (e: MouseEvent) => any;
}>(({ name, type, onRemove }) => {
  return (
    <Transition transition={'slide-up'} mounted={true}>
      {(styles) => (
        <Badge
          style={styles}
          title={type}
          size={'xs'}
          leftSection={
            <div className={'h-full flex items-center justify-center'}>
              {type === AttachItemType.PrivateDocument && <IconFileStack size="1rem" />}
              {type === AttachItemType.TextData && <IconBlockquote size="1rem" />}
              {type === AttachItemType.Excel && <IconCsv size="1rem" />}
              {type === AttachItemType.OCR && <IconPdf size="1rem" />}
              {type === AttachItemType.Image && <IconPhotoEdit size="1rem" />}
              {type === AttachItemType.Audio && <IconBrandShazam size="1rem" />}
              {type === AttachItemType.Website && <IconUnlink size="1rem" />}
              {type === AttachItemType.MODEL && <IconBrandOpenai size="1rem" />}
            </div>
          }
          variant={'dot'}
          className={classNames('no-dot cursor-pointer', {
            'pr-0': !!onRemove,
          })}
          rightSection={
            onRemove && type !== AttachItemType.MODEL ? (
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={(e) => onRemove?.(e as any)}
              >
                <IconX size={'1rem'} />
              </ActionIcon>
            ) : undefined
          }
        >
          {name}
        </Badge>
      )}
    </Transition>
  );
});

export default AttachName;
