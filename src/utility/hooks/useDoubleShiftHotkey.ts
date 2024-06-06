import { useEffect, useState } from "react";

function useDoubleShiftHotkey(callback: () => any) {
  const [shiftPressed, setShiftPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: { key: string }) => {
      if (event.key === "Shift") {
        if (shiftPressed) {
          callback();
        } else {
          setShiftPressed(true);
          setTimeout(() => setShiftPressed(false), 300); // 300ms window for double press
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shiftPressed, callback]);
}

export default useDoubleShiftHotkey;
