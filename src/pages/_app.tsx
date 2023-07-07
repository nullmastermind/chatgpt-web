import "@/styles/globals.css";
import type { AppProps } from "next/app";
import dayjs from "dayjs";
import { Analytics } from "@vercel/analytics/react";

dayjs.extend(require("dayjs/plugin/relativeTime"));

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
