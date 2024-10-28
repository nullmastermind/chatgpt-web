import { Menu, Portal } from '@mantine/core';
import { IconGenderBigender, IconGenderFemale, IconGenderMale } from '@tabler/icons-react';
import axios from 'axios';
import { ReactNode, memo, useEffect, useRef, useState } from 'react';

import { useOpenaiAPIKey } from '@/states/states';

const TextToSpeech = memo<{
  children: ({ isLoading }: { isLoading: boolean }) => ReactNode;
  getText: () => string;
  onClick?: () => any;
}>(({ children, getText, onClick }) => {
  const [apiKey] = useOpenaiAPIKey();
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayed = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const results = useRef<Record<string, string>>({});

  const play = (voiceId: string) => {
    onClick?.();
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

    void audioRef.current?.pause();
    window.speechSynthesis?.cancel();

    if (voiceId === 'local') {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      } else {
        alert('Your browser does not support Text-to-Speech.');
      }
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

  useEffect(() => {
    return () => {
      void audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

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
            <Menu.Item
              className={'p-1'}
              onClick={() => play('local')}
              icon={<IconGenderBigender size={20} />}
            >
              Free
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('nova')}
              icon={<IconGenderFemale size={20} />}
            >
              Nova
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('shimmer')}
              icon={<IconGenderFemale size={20} />}
            >
              Shimmer
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('onyx')}
              icon={<IconGenderMale size={20} />}
            >
              Onyx
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('fable')}
              icon={<IconGenderMale size={20} />}
            >
              Fable
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('echo')}
              icon={<IconGenderMale size={20} />}
            >
              Echo
            </Menu.Item>
            <Menu.Item
              className={'p-1'}
              onClick={() => play('alloy')}
              icon={<IconGenderMale size={20} />}
            >
              Alloy
            </Menu.Item>
          </Menu.Dropdown>
        </Portal>
      </Menu>
    </>
  );
});

export default TextToSpeech;
