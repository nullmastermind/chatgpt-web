import "@/styles/globals.css";
import type { AppProps } from "next/app";
import dayjs from "dayjs";

dayjs.extend(require("dayjs/plugin/relativeTime"));

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
