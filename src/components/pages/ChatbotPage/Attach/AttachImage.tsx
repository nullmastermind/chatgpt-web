import {
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Text,
  TextInput,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconFileAlert,
  IconLink,
  IconPhotoEdit,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import axios from 'axios';
import { clone } from 'lodash';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { v4 } from 'uuid';

import { AttachItem, AttachItemType } from '@/components/misc/types';

const AttachImage = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
}>(({ opened, onClose, value, onSubmit }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await axios.get(url, { responseType: 'blob' });
      return await convertToBase64(response.data);
    } catch (error) {
      throw new Error('Failed to fetch image');
    }
  };

  const handleUploadFile = async (files: FileWithPath[]) => {
    const file = files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const base64Data = await convertToBase64(file);

      attachItem!.data = [
        {
          content: base64Data,
          name: file.name,
        },
      ];
      attachItem!.name = file.name;
      attachItem!.isFile = true;
      setAttachItem(clone(attachItem));
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Error',
        message: e.toString(),
        radius: 'lg',
        withCloseButton: true,
        color: 'red',
        icon: <IconFileAlert />,
      });
    }
    setLoading(false);
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl) return;
    setLoading(true);

    try {
      const base64Data = await fetchImageAsBase64(imageUrl);

      attachItem!.data = [
        {
          content: base64Data,
          name: 'URL Image',
        },
      ];
      attachItem!.name = 'URL Image';
      attachItem!.isFile = false;
      setAttachItem(clone(attachItem));
      setImageUrl('');
    } catch (e: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load image from URL',
        radius: 'lg',
        withCloseButton: true,
        color: 'red',
        icon: <IconFileAlert />,
      });
    }
    setLoading(false);
  };

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setLoading(true);
            try {
              const base64Data = await convertToBase64(file);

              attachItem!.data = [
                {
                  content: base64Data,
                  name: 'Pasted Image',
                },
              ];
              attachItem!.name = 'Pasted Image';
              attachItem!.isFile = false;
              setAttachItem(clone(attachItem));
            } catch (e: any) {}
            setLoading(false);
            break;
          }
        }
      }
    },
    [attachItem],
  );

  useEffect(() => {
    if (opened) {
      setAttachItem(
        value || {
          name: 'Image',
          data: [],
          createdAt: Date.now(),
          type: AttachItemType.Image,
          id: v4(),
        },
      );
    }
  }, [opened, value]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [attachItem]);

  if (!attachItem) return null;

  return (
    <Modal
      opened={Boolean(opened)}
      onClose={onClose}
      transitionProps={{ transition: 'slide-up' }}
      centered
      size="lg"
      title={
        <div className="flex flex-row gap-2 items-center">
          <IconPhotoEdit />
          <div className="flex flex-col">
            <Title size="md" className="line-clamp-1">
              Attach - Image
            </Title>
            <div className="line-clamp-1 text-xs">Upload an image or provide an image URL</div>
          </div>
        </div>
      }
      scrollAreaComponent={ScrollArea.Autosize}
      className="relative"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <TextInput
            icon={<IconLink size="1rem" />}
            placeholder="Enter image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            rightSection={
              <div className={'mr-8'}>
                <Button size="xs" onClick={handleUrlSubmit} loading={loading}>
                  Load
                </Button>
              </div>
            }
          />

          <Text size="xs" color="dimmed">
            Or upload an image file, or paste from clipboard
          </Text>

          <Dropzone
            onDrop={handleUploadFile}
            loading={loading}
            multiple={false}
            accept={['image/png', 'image/jpeg', 'image/gif', 'image/webp']}
          >
            <Group
              position="center"
              spacing="xl"
              style={{ minHeight: rem(100), pointerEvents: 'none' }}
            >
              <Dropzone.Accept>
                <IconUpload
                  size="3.2rem"
                  stroke={1.5}
                  color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX
                  size="3.2rem"
                  stroke={1.5}
                  color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhotoEdit size="3.2rem" stroke={1.5} />
              </Dropzone.Idle>
              <div>
                <Text size="xl" inline>
                  Drag image here or click to select
                </Text>
                <Text size="sm" color="dimmed" inline mt={7}>
                  Supports PNG, JPEG, GIF and WebP
                </Text>
              </div>
            </Group>
          </Dropzone>
        </div>

        {!!attachItem?.data?.[0]?.content && (
          <Card className="flex items-baseline flex-row gap-2">
            <IconCheck color="green" className="-mb-1" />
            <div className="flex-grow">
              <div className="font-bold whitespace-pre-wrap max-w-full overflow-ellipsis line-clamp-1">
                {attachItem.name}
              </div>
              <img
                src={attachItem.data[0].content}
                alt={attachItem.name}
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
              />
            </div>
          </Card>
        )}

        <div className="sticky bottom-0 flex flex-row items-center justify-end gap-2">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onSubmit(attachItem!)} disabled={!attachItem?.data?.[0]?.content}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default AttachImage;
