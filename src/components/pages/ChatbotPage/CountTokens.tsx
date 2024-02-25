import { Text } from "@mantine/core";
import { useDebounce, useMount, useSetState } from "react-use";
import axios from "axios";
import { forwardRef, useImperativeHandle, useState } from "react";
import { MessageItemType } from "@/components/pages/ChatbotPage/Message";
import { forEach, map } from "lodash";
import NumberChangeEffect from "@/components/misc/NumberChangeEffect";
import { countTokens } from "@/utility/utility";

type CountTokensProps = {
  content: string;
  includeMessages: MessageItemType[];
};

const CountTokens = forwardRef(({ content, includeMessages }: CountTokensProps, ref) => {
  const [tokens, setTokens] = useState<number>(0);
  const [loadings, setLoadings] = useSetState({
    count: false,
  });

  const countMyTokens = () => {
    setLoadings({ count: true });

    const contents = map(includeMessages, v => v.content);
    contents.push(content);

    countTokens(contents.join(""))
      .then(tokens => {
        setTokens(tokens);
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
    countMyTokens();
  });
  useDebounce(
    () => {
      countMyTokens();
    },
    100,
    [content, includeMessages]
  );

  const canShowLoading = (() => {
    if (includeMessages.length) {
      return true;
    }
    return content.length > 0;
  })();

  return (
    <>
      <Text size={"xs"} className={"opacity-60"}>
        Tokens: {loadings.count && canShowLoading ? <NumberChangeEffect fromNumber={tokens} /> : tokens}
      </Text>
    </>
  );
});

export default CountTokens;
