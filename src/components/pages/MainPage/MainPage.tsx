import MainLayout from "@/components/layouts/MainLayout";
import { useCurrentTool } from "@/states/states";
import SettingsPage from "@/components/pages/SettingsPage/SettingsPage";
import ChatbotPage from "@/components/pages/ChatbotPage/ChatbotPage";
import { Container } from "@mantine/core";

const MainPage = () => {
  const [currentTool] = useCurrentTool();

  return (
    <Container>
      <MainLayout>
        {currentTool === "settings" && <SettingsPage />}
        {currentTool === "nullgpt" && <ChatbotPage />}
      </MainLayout>
    </Container>
  );
};

export default MainPage;
