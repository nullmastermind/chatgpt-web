import { Menu, Portal } from '@mantine/core';
import axios from 'axios';
import { ReactNode, memo, useEffect, useRef, useState } from 'react';

import { useOpenaiAPIKey } from '@/states/states';

const TextToSpeech = memo<{
  children: ({ isLoading }: { isLoading: boolean }) => ReactNode;
  getText: () => string;
}>(({ children, getText }) => {
  const [apiKey] = useOpenaiAPIKey();
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayed = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const results = useRef<Record<string, string>>({});

  const play = (voiceId: string) => {
    const text = getText();
    if (!text) return;
    const key = JSON.stringify([voiceId, text]);
    if (results.current[key]) {
      setAudioSrc(results.current[key]);
      audioRef.current?.load();
      void audioRef.current?.play();
      autoPlayed.current = audioSrc;
      return;
    }
    setLoading(true);
    axios
      .post('/api/text-to-speech', {
        token: apiKey,
        text,
        voice: voiceId,
      })
      .then(({ data }) => {
        const result = `data:audio/mp3;base64,${data.base64Audio}`;
        results.current[key] = result;
        setAudioSrc(result);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (audioSrc && audioRef.current && autoPlayed.current !== audioSrc) {
      audioRef.current.load();
      void audioRef.current.play();
      autoPlayed.current = audioSrc;
    }
  }, [audioSrc]);

  return (
    <>
      {audioSrc && (
        <audio ref={audioRef} controls className={'hidden'}>
          <source src={audioSrc} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
      )}
      <Menu>
        <Menu.Target>{children({ isLoading: loading })}</Menu.Target>
        <Portal>
          <Menu.Dropdown>
            <Menu.Item className={'p-1'} onClick={() => play('nova')}>
              Nova (female)
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => play('shimmer')}>
              Shimmer (female)
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => play('onyx')}>
              Onyx (male)
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => play('fable')}>
              Fable (male)
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => play('echo')}>
              Echo (male)
            </Menu.Item>
            <Menu.Item className={'p-1'} onClick={() => play('alloy')}>
              Alloy (male)
            </Menu.Item>
          </Menu.Dropdown>
        </Portal>
      </Menu>
    </>
  );
});

export default TextToSpeech;
