import { useEffect, useState } from "react";

function useDoubleShiftHotkey(callback: () => any) {
  const [shiftPressed, setShiftPressed] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        if (shiftPressed) {
          callback();
          setShiftPressed(false);
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
        } else {
          setShiftPressed(true);
          const id = setTimeout(() => {
            setShiftPressed(false);
            setTimeoutId(null);
          }, 300); // 300ms window for double press
          setTimeoutId(id);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftPressed(false);
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [shiftPressed, callback, timeoutId]);

  return null;
}

export default useDoubleShiftHotkey;
