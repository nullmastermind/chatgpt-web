import { Text } from "@mantine/core";
import { useDebounce, useMount, useSetState } from "react-use";
import axios from "axios";
import { forwardRef, useImperativeHandle, useState } from "react";
import { MessageItemType } from "@/components/pages/ChatbotPage/Message";
import { forEach } from "lodash";
import NumberChangeEffect from "@/components/misc/NumberChangeEffect";

type CountTokensProps = {
  content: string;
  includeMessages: MessageItemType[];
};

const CountTokens = forwardRef(({ content, includeMessages }: CountTokensProps, ref) => {
  const [tokens, setTokens] = useState<number>(0);
  const [loadings, setLoadings] = useSetState({
    count: false,
  });

  const countTokens = () => {
    setLoadings({ count: true });

    let preContent = "";

    forEach(includeMessages, m => {
      preContent += m.content;
    });

    axios
      .post("/api/tokens", {
        content: preContent + content,
      })
      .then(({ data }) => {
        setTokens(+data.data);
      })
      .finally(() => {
        setLoadings({ count: false });
      });
  };

  useImperativeHandle(ref, () => ({
    getTokens() {
      return tokens;
    },
  }));
  useMount(() => {
    countTokens();
  });
  useDebounce(
    () => {
      countTokens();
    },
    300,
    [content, includeMessages]
  );

  return (
    <>
      <Text size={"xs"} className={"opacity-60"}>
        Tokens: {loadings.count ? <NumberChangeEffect fromNumber={tokens} /> : tokens}
      </Text>
    </>
  );
});

export default CountTokens;
