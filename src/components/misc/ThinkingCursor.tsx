import { memo } from 'react';
import styled, { keyframes } from 'styled-components';

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

const ThinkingWrapper = styled.span`
  display: inline-block;
`;

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

const ThinkingCursor = memo(() => {
  return (
    <ThinkingWrapper>
      <Text className="text-sm" delay={0}>
        Thinking
      </Text>
      <Dot delay={0.0}>.</Dot>
      <Dot delay={0.2}>.</Dot>
      <Dot delay={0.4}>.</Dot>
    </ThinkingWrapper>
  );
});

export default ThinkingCursor;
