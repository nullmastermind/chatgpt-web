import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MainPage from '@/components/pages/MainPage';

const queryClient = new QueryClient();

const HomePage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ colorScheme: 'dark' }} withNormalizeCSS withGlobalStyles>
        <ModalsProvider>
          <MainPage />
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default HomePage;
