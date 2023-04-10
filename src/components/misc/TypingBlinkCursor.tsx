import React, { useState, useEffect } from "react";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import classNames from "classnames";

const TypingBlinkCursor = () => {
  const { classes } = useStyles();
  const [text, setText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="inline-block">
      <span>{text}</span>
      <span style={{ visibility: cursorVisible ? "visible" : "hidden" }}>
        <span className={classNames("inline-block w-2 h-4", classes.blink)} />
      </span>
    </span>
  );
};

export default TypingBlinkCursor;
