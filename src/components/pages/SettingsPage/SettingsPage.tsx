import { useMount, useUnmount } from "react-use";
import { useCollections, useOpenaiAPIKey } from "@/states/states";
import { Button, Card, Container, Input, NumberInput, PasswordInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { notifications } from "@mantine/notifications";
import { IconCircleCheckFilled, IconX } from "@tabler/icons-react";
import CenterCard from "@/components/CenterCard";

const SettingsPage = () => {
  const [, setCollections] = useCollections();
  const [openaiAPIKey, setOpenaiAPIKey] = useOpenaiAPIKey();
  const settingsForm = useForm({
    initialValues: {
      openaiKey: openaiAPIKey,
      maxMessagesPerBox: 10,
    },
    validate: {
      openaiKey: v => (["", null, undefined, "null"].includes(v) ? "Invalid" : null),
      maxMessagesPerBox: v => (v <= 0 || v >= 100 ? "Invalid. Max 100" : null),
    },
  });

  const saveSettings = () => {
    if (!settingsForm.validate().hasErrors) {
      localStorage.setItem(":maxMessages", `${settingsForm.values.maxMessagesPerBox}`);
      localStorage.setItem(":openaiKey", settingsForm.values.openaiKey as string);
      setOpenaiAPIKey(settingsForm.values.openaiKey as string);
      notifications.show({
        title: "Success",
        message: "Settings saved",
        radius: "lg",
        withCloseButton: true,
        color: "green",
        icon: <IconCircleCheckFilled />,
      });
    } else {
      notifications.show({
        title: "Error",
        message: "Please check error fields",
        radius: "lg",
        withCloseButton: true,
        color: "red",
        icon: <IconX />,
      });
    }
  };

  useMount(() => {
    setCollections([
      {
        emoji: "⚙️",
        label: "API",
        parent: "settings",
        key: 0,
      },
    ]);
  });
  useUnmount(() => setCollections([]));

  return (
    <CenterCard>
      <div className="flex flex-col gap-3">
        <PasswordInput
          required
          label="OpenAI API Key"
          placeholder="OpenAI API Key..."
          {...settingsForm.getInputProps("openaiKey")}
        />
        <NumberInput
          label="Maximum number of messages per box"
          placeholder="min 1, max 100"
          required
          {...settingsForm.getInputProps("maxMessagesPerBox")}
        />
        <div>
          <Button onClick={() => saveSettings()}>Save</Button>
        </div>
      </div>
    </CenterCard>
  );
};

export default SettingsPage;
