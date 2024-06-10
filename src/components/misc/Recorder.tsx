import { Button, Loader, Modal } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { IconMicrophone } from '@tabler/icons-react';
import axios from 'axios';
import { memo, useRef, useState } from 'react';

import { useOpenaiAPIKey } from '@/states/states';

const Recorder = memo<{
  onText: (text: string) => any;
}>(({ onText }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldConvert = useRef(false);
  const [apiKey] = useOpenaiAPIKey();
  const [loading, setLoading] = useState(false);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendAudio = async (audioURL: string) => {
    if (!audioURL) return;

    const response = await fetch(audioURL);
    const audioBlob = await response.blob();
    const base64Audio = await blobToBase64(audioBlob);

    setLoading(true);

    axios
      .post('/api/transcribe', {
        token: apiKey,
        audioData: base64Audio.split(';base64,')[1],
      })
      .then(({ data }) => {
        onText(data.transcription);
      })
      .finally(() => setLoading(false));
  };

  const startRecording = async () => {
    setLoading(false);
    shouldConvert.current = false;
    setIsRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (shouldConvert.current) {
        sendAudio(audioUrl);
        shouldConvert.current = false;
      }
      audioChunksRef.current = [];
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <>
      <Modal
        opened={isRecording}
        onClose={() => {
          stopRecording();
        }}
        centered={true}
        title={
          <div className={'flex flex-row gap-2 items-center'}>
            <IconMicrophone />
            <div>Recorder</div>
          </div>
        }
      >
        <div className={'flex flex-row gap-3 items-center'}>
          <Loader />
          <div>Recording...</div>
        </div>
        <div className={'flex flex-row gap-2 items-center justify-end'}>
          <Button
            color={'red'}
            onClick={() => {
              shouldConvert.current = true;
              stopRecording();
            }}
          >
            Stop
          </Button>
        </div>
      </Modal>
      {loading && (
        <div className={'flex flex-row items-center justify-center w-[26px] h-[26px]'}>
          <Loader size={'xs'} />
        </div>
      )}
      {!loading && (
        <RichTextEditor.ClearFormatting
          title="Recorder"
          icon={IconMicrophone as any}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void startRecording();
          }}
        />
      )}
    </>
  );
});

export default Recorder;
