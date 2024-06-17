import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const openai = new OpenAI({
    apiKey: (req.headers['token'] || req.body.token || process.env.TRIAL_OPENAI_KEY) as string,
  });

  try {
    const { text, voice = 'alloy', model = 'tts-1-hd' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const mp3 = await openai.audio.speech.create({
      model,
      voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    res.status(200).json({ base64Audio });
  } catch (error) {
    console.error('Error during text-to-speech conversion:', error);
    res.status(500).json({ error: 'Error during text-to-speech conversion' });
  }
}
