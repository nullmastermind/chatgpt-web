import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="shortcut icon" href="/assets/bot1.png" />
        <script src="https://unpkg.com/@highlightjs/cdn-assets@11.7.0/highlight.min.js"></script>
        <script>hljs.highlightAll();</script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
