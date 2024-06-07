import MainLayout from '@/components/layouts/MainLayout';
import ChatbotPage from '@/components/pages/ChatbotPage/ChatbotPage';
import SettingsPage from '@/components/pages/SettingsPage/SettingsPage';
import { useCurrentTool } from '@/states/states';

const MainPage = () => {
  const [currentTool] = useCurrentTool();

  return (
    <>
      <MainLayout>
        {currentTool === 'settings' && <SettingsPage />}
        {currentTool === 'nullgpt' && <ChatbotPage />}
      </MainLayout>
    </>
  );
};

export default MainPage;
