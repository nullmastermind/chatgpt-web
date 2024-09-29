import { Button, NumberInput, PasswordInput, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCircleCheckFilled, IconX } from '@tabler/icons-react';
import React from 'react';
import { useMount, useSetState, useUnmount } from 'react-use';

import CenterCard from '@/components/CenterCard';
import { appName, indexerHost } from '@/config';
import { useCollections, useOpenaiAPIKey } from '@/states/states';

const SettingsPage = () => {
  const [, setCollections] = useCollections();
  const [openaiAPIKey, setOpenaiAPIKey] = useOpenaiAPIKey();
  const settingsForm = useForm({
    initialValues: {
      openaiKey: openaiAPIKey,
      overrideBaseUrl: localStorage.getItem(':overrideBaseUrl') || '',
      maxMessagesPerBox: parseInt(localStorage.getItem(':maxMessages') || '10'),
      indexerHost: indexerHost,
      enterToSend: localStorage.getItem(':enterToSend') === '1',
      logoText: localStorage.getItem(':logoText') || appName,
    },
    validate: {
      openaiKey: (v) => (['', null, undefined, 'null'].includes(v) ? 'Invalid' : null),
      overrideBaseUrl: (v) => (v && !v.startsWith('http') ? 'Must be a valid URL' : null),
      maxMessagesPerBox: (v) => (v <= 0 || v >= 100 ? 'Invalid. Max 100' : null),
    },
  });
  const [loadings, setLoadings] = useSetState({
    save: false,
  });

  const saveSettings = () => {
    setLoadings({ save: true });
    if (!settingsForm.validate().hasErrors) {
      localStorage.setItem(':maxMessages', `${settingsForm.values.maxMessagesPerBox}`);
      localStorage.setItem(':openaiKey', settingsForm.values.openaiKey as string);
      localStorage.setItem(':overrideBaseUrl', settingsForm.values.overrideBaseUrl);
      localStorage.setItem(':indexerHost', settingsForm.values.indexerHost);
      localStorage.setItem(':enterToSend', settingsForm.values.enterToSend ? '1' : '0');
      localStorage.setItem(':logoText', settingsForm.values.logoText || appName);
      setOpenaiAPIKey(settingsForm.values.openaiKey as string);
      sessionStorage.setItem(':settingSaved', '1');
      if (settingsForm.values.openaiKey) {
        localStorage.setItem(':currentTool', '"nullgpt"');
      }
      window.location.reload();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Please check error fields',
        radius: 'lg',
        withCloseButton: true,
        color: 'red',
        icon: <IconX />,
      });
      setLoadings({ save: false });
    }
  };

  useMount(() => {
    setCollections([
      {
        emoji: '⚙️',
        label: 'API',
        parent: 'settings',
        key: 0,
        description: 'App settings',
      },
    ]);
    if (sessionStorage.getItem(':settingSaved')) {
      notifications.show({
        title: 'Success',
        message: 'Settings saved',
        radius: 'lg',
        withCloseButton: true,
        color: 'green',
        icon: <IconCircleCheckFilled />,
      });
      sessionStorage.removeItem(':settingSaved');
    }
  });
  useUnmount(() => setCollections([]));

  return (
    <CenterCard>
      <div className="flex flex-col gap-3">
        <PasswordInput
          required
          label="OpenAI API Key (token1,token2,...)"
          placeholder="OpenAI API Key..."
          {...settingsForm.getInputProps('openaiKey')}
        />
        <TextInput
          label="Override Base URL"
          placeholder="https://api.openai.com"
          {...settingsForm.getInputProps('overrideBaseUrl')}
        />
        <NumberInput
          label="Maximum number of messages per box"
          placeholder="min 1, max 100"
          required
          {...settingsForm.getInputProps('maxMessagesPerBox')}
        />
        <TextInput
          label="Indexer host"
          placeholder="http://localhost:3456"
          {...settingsForm.getInputProps('indexerHost')}
        />
        <TextInput
          label="Logo text"
          placeholder={appName}
          {...settingsForm.getInputProps('logoText')}
        />
        <Switch
          label={'Press Ctrl+Enter to send'}
          description={
            'By default, press Enter to send a message and Shift+Enter to add a new line.'
          }
          {...settingsForm.getInputProps('enterToSend', {
            type: 'checkbox',
          })}
        />
        <div>
          <Button loading={loadings.save} onClick={() => saveSettings()}>
            Save
          </Button>
        </div>
      </div>
    </CenterCard>
  );
};

export default SettingsPage;
