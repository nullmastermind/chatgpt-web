import "@/styles/globals.css";
import type { AppProps } from "next/app";
import dayjs from "dayjs";
import { Analytics } from "@vercel/analytics/react";
import Head from "next/head";

dayjs.extend(require("dayjs/plugin/relativeTime"));

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
