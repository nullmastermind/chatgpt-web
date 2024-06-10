import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI, { toFile } from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const openai = new OpenAI({
    apiKey: (req.headers['token'] || req.body.token || process.env.TRIAL_OPENAI_KEY) as string,
  });

  try {
    const base64Audio = req.body.audioData;

    const audioBuffer = Buffer.from(base64Audio, 'base64');

    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'audio.wav', {
        type: 'audio/wav',
      }),
      model: 'whisper-1',
    });

    res.json({ transcription: transcription.text });
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).send('Error during transcription');
  }
}
