import { memo } from 'react';
import styled, { keyframes } from 'styled-components';

import { AttachItemType } from '@/components/misc/types';
import { useModel } from '@/states/states';

import AttachName from '../pages/ChatbotPage/Attach/AttachName';

const dotAnimation = keyframes`
  0%, 20% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const textAnimation = keyframes`
  0%, 20% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const ThinkingWrapper = styled.span``;

const Dot = styled.span<{ delay: number }>`
  opacity: 0;
  animation: ${dotAnimation} 1.4s linear infinite;
  animation-delay: ${(props) => props.delay}s;
`;

const Text = styled.span<{ delay: number }>`
  opacity: 0.6;
  animation: ${textAnimation} 1.4s linear infinite;
  animation-delay: ${(props) => props.delay}s;
`;

const ThinkingCursor = memo<{
  model?: string;
}>(({ model: propModel }) => {
  const [currentModel] = useModel();
  const model = propModel || currentModel;

  return (
    <ThinkingWrapper className={'inline-flex flex-row items-center justify-center gap-1'}>
      {Boolean(model) && (
        <div style={{ lineHeight: 0 }}>
          <AttachName name={model} type={AttachItemType.MODEL} />
        </div>
      )}
      <div>
        <Text className="text-sm" delay={0}>
          Thinking
        </Text>
        <Dot delay={0.0}>.</Dot>
        <Dot delay={0.2}>.</Dot>
        <Dot delay={0.4}>.</Dot>
      </div>
    </ThinkingWrapper>
  );
});

export default ThinkingCursor;
