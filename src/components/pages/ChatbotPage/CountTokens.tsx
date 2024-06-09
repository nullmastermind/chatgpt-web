import { Text } from '@mantine/core';
import { map } from 'lodash';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useDebounce, useMount, useSetState } from 'react-use';

import { MessageItemType } from '@/components/pages/ChatbotPage/Message';
import { useModel, usePrompts } from '@/states/states';
import { countTokens } from '@/utility/utility';

import models from '../../../utility/models.json';

type CountTokensProps = {
  content: string;
  includeMessages: MessageItemType[];
  collectionKey: any;
};

const CountTokens = forwardRef(
  ({ content, includeMessages, collectionKey }: CountTokensProps, ref) => {
    const [tokens, setTokens] = useState<number>(0);
    const [loadings, setLoadings] = useSetState({
      count: false,
    });
    const [prompts] = usePrompts();
    const currentPrompts = useMemo(() => {
      return prompts.find((p) => p.id === collectionKey);
    }, [prompts, collectionKey]);
    const [model] = useModel();
    const price = useMemo(() => {
      return models.find((v) => v.value === model)?.price || 0;
    }, [model]);

    const countMyTokens = () => {
      setLoadings({ count: true });

      const contents = map(includeMessages, (v) => v.content);
      contents.push(content);

      if (Array.isArray(currentPrompts?.prompts)) {
        contents.push(
          currentPrompts.prompts
            .map((v: any) => {
              if (typeof v === 'string') return '';
              return v.prompt;
            })
            .join(''),
        );
      }

      countTokens(contents.join(''))
        .then((tokens) => {
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
      [content, includeMessages],
    );

    return (
      <>
        <Text
          size={'xs'}
          className={'opacity-60 whitespace-nowrap line-clamp-1'}
          title={
            'This value is just an estimate, actual cost will be different due to different input tokens vs output tokens'
          }
        >
          Est: ${((tokens / 1000000) * price).toFixed(3)} ({tokens})
        </Text>
      </>
    );
  },
);

export default CountTokens;
