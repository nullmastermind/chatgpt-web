import { Analytics } from '@vercel/analytics/react';
import dayjs from 'dayjs';
import type { AppProps } from 'next/app';
import Head from 'next/head';

import '@/styles/globals.scss';

dayjs.extend(require('dayjs/plugin/relativeTime'));

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
