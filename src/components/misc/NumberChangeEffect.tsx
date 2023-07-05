import React, { useState, useEffect } from "react";

const NumberChangeEffect = ({ fromNumber }: { fromNumber: number }) => {
  const [number, setNumber] = useState<number>(fromNumber);

  useEffect(() => {
    const interval = setInterval(() => {
      setNumber(prevNumber => prevNumber + 1);
    }, 1000 / 24);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <span>{number}</span>;
};

export default NumberChangeEffect;
