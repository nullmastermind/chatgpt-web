import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MainPage from '@/components/pages/MainPage';

const queryClient = new QueryClient();

const HomePage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ colorScheme: 'dark' }} withNormalizeCSS withGlobalStyles>
        <ModalsProvider
          modalProps={{
            transitionProps: {
              duration: 200,
              transition: 'slide-up',
            },
          }}
        >
          <MainPage />
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default HomePage;
