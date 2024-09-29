import { useCallback, useEffect, useRef } from 'react';

const useDoubleShiftHotkey = (callback: () => void, debounceTime: number = 300) => {
  const lastShiftPress = useRef<number>(0);
  const shiftHeld = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShiftPress = useCallback(() => {
    const now = Date.now();
    if (now - lastShiftPress.current < debounceTime) {
      callback();
      lastShiftPress.current = 0; // Reset after successful double press
    } else {
      lastShiftPress.current = now;
    }
  }, [callback, debounceTime]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' && !shiftHeld.current) {
        shiftHeld.current = true;
        handleShiftPress();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          shiftHeld.current = false;
        }, 50); // Short delay to prevent immediate re-trigger
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleShiftPress]);

  return null;
};

export default useDoubleShiftHotkey;
