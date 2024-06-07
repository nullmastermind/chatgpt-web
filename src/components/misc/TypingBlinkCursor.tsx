import classNames from 'classnames';
import React from 'react';

import useStyles from '@/components/pages/ChatbotPage/Message.style';

const TypingBlinkCursor = () => {
  const { classes } = useStyles();

  return (
    <span className="inline-block">
      <span className={classes.blink2}>
        <span className={classNames('inline-block w-2 h-4', classes.blink)} />
      </span>
    </span>
  );
};

export default TypingBlinkCursor;
