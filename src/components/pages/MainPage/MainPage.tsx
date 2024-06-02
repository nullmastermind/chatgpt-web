import MainLayout from "@/components/layouts/MainLayout";
import { useCurrentTool } from "@/states/states";
import SettingsPage from "@/components/pages/SettingsPage/SettingsPage";
import ChatbotPage from "@/components/pages/ChatbotPage/ChatbotPage";

const MainPage = () => {
  const [currentTool] = useCurrentTool();

  return (
    <>
      <MainLayout>
        {currentTool === "settings" && <SettingsPage />}
        {currentTool === "nullgpt" && <ChatbotPage />}
      </MainLayout>
    </>
  );
};

export default MainPage;
