import { useMount, useUnmount } from "react-use";
import { useCollections, useGraphqlServer, useOpenaiAPIKey } from "@/states/states";
import { Button, Card, Container, Input } from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { notifications } from "@mantine/notifications";
import { IconCircleCheckFilled, IconX } from "@tabler/icons-react";
import CenterCard from "@/components/CenterCard";

const SettingsPage = () => {
  const [, setCollections] = useCollections();
  const [graphqlServer, setGraphqlServer] = useGraphqlServer();
  const [openaiAPIKey, setOpenaiAPIKey] = useOpenaiAPIKey();
  const settingsForm = useForm({
    initialValues: {
      graphqlServer: graphqlServer,
      openaiKey: openaiAPIKey,
    },
    validate: {
      graphqlServer: v => (["", null, undefined, "null"].includes(v) ? "Invalid" : null),
      openaiKey: v => (["", null, undefined, "null"].includes(v) ? "Invalid" : null),
    },
  });

  const saveSettings = () => {
    if (!settingsForm.validate().hasErrors) {
      localStorage.setItem(":graphqlServer", settingsForm.values.graphqlServer as string);
      setGraphqlServer(settingsForm.values.graphqlServer as string);
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
      },
    ]);
  });
  useUnmount(() => setCollections([]));

  return (
    <CenterCard>
      <div className="flex flex-col gap-3">
        <Input.Wrapper label="GraphQl Server" required>
          <Input placeholder="GraphQl Server" {...settingsForm.getInputProps("graphqlServer")} />
        </Input.Wrapper>
        <Input.Wrapper label="OpenAI API Key" required>
          <Input placeholder="OpenAI API Key..." {...settingsForm.getInputProps("openaiKey")} />
        </Input.Wrapper>
        <div>
          <Button onClick={() => saveSettings()}>Save</Button>
        </div>
      </div>
    </CenterCard>
  );
};

export default SettingsPage;
