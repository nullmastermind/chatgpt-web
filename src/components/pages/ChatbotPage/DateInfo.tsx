import { Text } from '@mantine/core';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import { MessageItemType } from '@/components/pages/ChatbotPage/Message';

type DateInfoProps = {
  message: MessageItemType;
};

const DateInfo = ({ message }: DateInfoProps) => {
  const [r, setR] = useState<number>();
  const info = useMemo(() => {
    if (!message.date) {
      return 'in the Past';
    }

    const d = dayjs(message.date) as any;

    return d.fromNow();
  }, [message, r]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setR(Date.now());
    }, 60000);
    return () => clearInterval(intervalId);
  }, [message]);

  return (
    <>
      <Text className={'opacity-60 text-xs mt-0.5'}>{info}</Text>
    </>
  );
};

export default DateInfo;
