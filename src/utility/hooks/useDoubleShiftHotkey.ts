import { useEffect, useRef } from 'react';

const useDoubleShiftHotkey = (callback: () => void, debounceTime: number = 300) => {
  const lastShiftPress = useRef<number | null>(null);
  const shiftHeld = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        if (shiftHeld.current) return; // Ignore if Shift is being held down

        const now = Date.now();
        if (lastShiftPress.current && now - lastShiftPress.current < debounceTime) {
          callback();
          lastShiftPress.current = null;
        } else {
          lastShiftPress.current = now;
        }
        shiftHeld.current = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        shiftHeld.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [callback, debounceTime]);

  return null;
};

export default useDoubleShiftHotkey;
