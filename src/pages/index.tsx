import MainPage from "@/components/pages/MainPage";
import { MantineProvider } from "@mantine/core";

const HomePage = () => {
  return (
    <MantineProvider theme={{ colorScheme: "dark" }} withNormalizeCSS withGlobalStyles>
      <MainPage />
    </MantineProvider>
  );
};

export default HomePage;
