import { Text } from "@mantine/core";
import { useDebounce, useMount } from "react-use";
import axios from "axios";
import { forwardRef, useImperativeHandle, useState } from "react";
import { MessageItemType } from "@/components/pages/ChatbotPage/Message";
import { forEach } from "lodash";

type CountTokensProps = {
  content: string;
  includeMessages: MessageItemType[];
};

const CountTokens = forwardRef(({ content, includeMessages }: CountTokensProps, ref) => {
  const [tokens, setTokens] = useState<number>(0);

  const countTokens = () => {
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
        Tokens: {tokens}
      </Text>
    </>
  );
});

export default CountTokens;
