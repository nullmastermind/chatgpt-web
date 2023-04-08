import MainLayout from "@/components/layouts/MainLayout";
import { useCurrentTool } from "@/states/states";
import { useDebounce } from "react-use";
import SettingsPage from "@/components/pages/SettingsPage/SettingsPage";

const MainPage = () => {
  const [currentTool] = useCurrentTool();

  return <MainLayout>{currentTool === "settings" && <SettingsPage />}</MainLayout>;
};

export default MainPage;
