import MainLayout from "@/components/layouts/MainLayout";
import { confirmUtil, useConfirmProps, useCurrentTool } from "@/states/states";
import SettingsPage from "@/components/pages/SettingsPage/SettingsPage";
import ChatbotPage from "@/components/pages/ChatbotPage/ChatbotPage";
import { Container } from "@mantine/core";
import Confirm from "@/components/misc/Confirm";
import { useEffect } from "react";

const HandleConfirm = () => {
  const [confirmProps, setConfirmProps] = useConfirmProps();

  useEffect(() => {
    confirmUtil.show = options => {
      setConfirmProps({
        isOpen: true,
        title: options.title,
        message: options.message || "",
        onConfirm: () => {
          options.onConfirm();
          setConfirmProps({
            ...confirmProps,
            isOpen: false,
          });
        },
      });
    };
  }, [confirmProps]);

  return (
    <Confirm
      {...confirmProps}
      onCancel={() => {
        setConfirmProps({
          ...confirmProps,
          isOpen: false,
        });
      }}
    />
  );
};

const MainPage = () => {
  const [currentTool] = useCurrentTool();

  return (
    <>
      <HandleConfirm />
      <Container size={"xl"} className={"px-0"}>
        <MainLayout>
          {currentTool === "settings" && <SettingsPage />}
          {currentTool === "nullgpt" && <ChatbotPage />}
        </MainLayout>
      </Container>
    </>
  );
};

export default MainPage;
