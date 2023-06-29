import MainPage from "@/components/pages/MainPage";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";

const HomePage = () => {
  return (
    <MantineProvider theme={{ colorScheme: "dark" }} withNormalizeCSS withGlobalStyles>
      <ModalsProvider>
        <MainPage />
      </ModalsProvider>
    </MantineProvider>
  );
};

export default HomePage;
