import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZEN_SYSTEM_INSTRUCTION = `<identity>
You are Zen AI, a next-generation artificial intelligence assistant created and engineered by Raki~B (Md Rakibul Hasan) from Chattogram, Bangladesh.

Creator & Developer Profile:
- App Name: Zen AI
- Creator Name: Raki~B (Md Rakibul Hasan)
- Location: Chattogram, Bangladesh
- Role: Software & AI Developer, Game & Web App Creator
- Languages: Fluent in Bengali (বাংলা) and English
- Tech Focus: Python, Full-Stack Web & Mobile Apps, AI Assistants, and 2D/3D Game Development

Identity Rule:
When asked about your creator, developer, or origin, always state clearly that you are Zen AI, created by Raki~B (Md Rakibul Hasan) from Chattogram, Bangladesh. Never claim to be made by Google, OpenAI, Anthropic, or any other company.
</identity>

<multilingual_protocol>
- UNIVERSAL FLUENCY: Understand and communicate fluently in all human languages, with native-level proficiency in Bengali (বাংলা) and English.
- LANGUAGE MIRRORING: Automatically detect the user's language and respond in that exact same language and script (including Banglish or code-switching).
- TECHNICAL PRECISION: Keep code syntax and technical terms accurate while explaining concepts naturally in the target language.
</multilingual_protocol>

<response_guidelines>
- Be friendly, clear, calm, and easy to understand—true to the name "Zen AI."
- Use clean Markdown headings, bullet points, and code blocks for effortless reading.
</response_guidelines>`;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (or API_KEY) is not configured. Please add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AttachmentPayload {
  name: string;
  mimeType: string;
  data: string;
  size: number;
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AttachmentPayload[];
}

interface GroundingSource {
  title: string;
  uri: string;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function buildGeminiContents(messages: IncomingMessage[]) {
  return messages
    .filter((m) => m.content.trim().length > 0 || (m.attachments && m.attachments.length > 0))
    .map((m) => {
      const parts: GeminiPart[] = [];

      if (m.attachments && m.attachments.length > 0) {
        for (const att of m.attachments) {
          if (att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data,
              },
            });
          } else {
            const decoded = Buffer.from(att.data, 'base64').toString('utf-8');
            parts.push({
              text: `[Attached file: ${att.name}]\n\`\`\`\n${decoded.slice(0, 60000)}\n\`\`\``,
            });
          }
        }
      }

      if (m.content.trim().length > 0) {
        parts.push({ text: m.content });
      } else if (parts.length > 0) {
        parts.push({ text: 'Please analyze the attached file(s).' });
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
}

function cleanTextForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted for audio playback. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>-]{1,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

function formatApiError(err: unknown): string {
  let message = err instanceof Error ? err.message : String(err);

  // Unwrap nested JSON error payloads returned by @google/genai
  for (let i = 0; i < 2; i++) {
    try {
      const parsed = JSON.parse(message) as { error?: { message?: string } | string; message?: string };
      if (typeof parsed?.error === 'object' && parsed.error?.message) {
        message = parsed.error.message;
      } else if (typeof parsed?.error === 'string') {
        message = parsed.error;
      } else if (parsed?.message) {
        message = parsed.message;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
    return 'API key is missing or invalid. Please check your key in Settings > Secrets.';
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return 'Rate limit reached. Please wait a moment and try again.';
  }
  return message || 'An unexpected error occurred while contacting Zen AI.';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', app: 'Zen AI' });
  });

  // Streaming Chat Handler (Standard, Deep Think, Web Search)
  const handleChatStream = async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let closed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        closed = true;
      }
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!closed && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const { messages, mode } = req.body as {
        messages?: IncomingMessage[];
        mode?: 'standard' | 'deep-think' | 'web-search';
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        sendEvent({ type: 'error', error: 'No messages provided.' });
        res.end();
        return;
      }

      const ai = getAIClient();
      const contents = buildGeminiContents(messages);

      const systemInstruction =
        mode === 'deep-think'
          ? `${ZEN_SYSTEM_INSTRUCTION}\n\n<deep_think_mode>\nThink carefully step-by-step, verify edge cases, and provide a thorough, well-structured, insightful answer.\n</deep_think_mode>`
          : ZEN_SYSTEM_INSTRUCTION;

      const config: Record<string, unknown> = {
        systemInstruction,
      };

      if (mode === 'deep-think') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.XHIGH };
      } else if (mode === 'web-search') {
        config.tools = [{ googleSearch: {} }];
      } else {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config,
      });

      const collectedSources = new Map<string, GroundingSource>();

      for await (const chunk of stream) {
        if (closed) break;

        if (chunk.text) {
          sendEvent({ type: 'text', text: chunk.text });
        }

        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          for (const gChunk of groundingChunks) {
            const web = gChunk?.web;
            if (web?.uri && !collectedSources.has(web.uri)) {
              collectedSources.set(web.uri, {
                uri: web.uri,
                title: web.title || new URL(web.uri).hostname,
              });
            }
          }
        }
      }

      if (!closed && collectedSources.size > 0) {
        sendEvent({ type: 'sources', sources: Array.from(collectedSources.values()) });
      }

      if (!closed) {
        sendEvent({ type: 'done' });
        res.end();
      }
    } catch (err) {
      console.error('[Zen AI /api/chat error]:', err);
      sendEvent({ type: 'error', error: formatApiError(err) });
      if (!res.writableEnded) {
        res.end();
      }
    }
  };

  app.post('/api/chat', handleChatStream);
  app.post('/api/chat/stream', handleChatStream);

  // Imagine Mode Endpoint (Free-tier SVG Vector Art Illustration via gemini-4-hydrogen)
  app.post('/api/imagine', async (req: Request, res: Response) => {
    try {
      const { prompt, attachments } = req.body as {
        prompt?: string;
        attachments?: AttachmentPayload[];
      };

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required for Imagine mode.' });
        return;
      }

      const ai = getAIClient();
      const parts: GeminiPart[] = [];

      if (Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.mimeType.startsWith('image/')) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data,
              },
            });
          }
        }
      }

      parts.push({
        text: `Create a richly detailed, expressive, gallery-grade SVG illustration for this request: "${prompt}".
Use viewBox="0 0 800 600" with layered <defs> (linearGradient, radialGradient, soft glow filters), rich atmospheric lighting, harmonious color palette, clean vector composition, and NO external URLs or <script> tags. Respond in the user's language for title and description.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction: `${ZEN_SYSTEM_INSTRUCTION}\n\nYou are also a master vector illustrator. Produce intricate, high-craft standalone SVG illustrations.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short artistic title for the generated visual.',
              },
              description: {
                type: Type.STRING,
                description: 'Brief 1-2 sentence friendly description in the user language.',
              },
              svgCode: {
                type: Type.STRING,
                description: 'Complete valid <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">...</svg> markup.',
              },
            },
            required: ['title', 'description', 'svgCode'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        title?: string;
        description?: string;
        svgCode?: string;
      };

      if (!parsed.svgCode || !parsed.svgCode.includes('<svg')) {
        res.status(500).json({ error: 'Could not render illustration. Please try a clearer visual prompt.' });
        return;
      }

      // Sanitize any accidental script tags or event handlers
      const safeSvg = parsed.svgCode
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '');

      res.json({
        title: parsed.title || 'Zen AI Artwork',
        description: parsed.description || 'Created with Zen AI Imagine.',
        svgCode: safeSvg,
      });
    } catch (err) {
      console.error('[Zen AI /api/imagine error]:', err);
      res.status(500).json({ error: formatApiError(err) });
    }
  });

  // Bilingual Voice Transcription Endpoint (English & বাংলা)
  app.post('/api/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'Audio data is required.' });
        return;
      }

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this audio accurately in its original spoken language (such as English or Bengali / বাংলা). Output only the clean transcription text without extra commentary.',
            },
          ],
        },
      });

      res.json({ text: (response.text ?? '').trim() });
    } catch (err) {
      console.error('[Zen AI /api/transcribe error]:', err);
      res.status(500).json({ error: formatApiError(err) });
    }
  });

  // Bilingual Text-to-Speech Endpoint
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech playback.' });
        return;
      }

      const spokenText = cleanTextForSpeech(text);
      if (!spokenText) {
        res.status(400).json({ error: 'Nothing readable to speak.' });
        return;
      }

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: spokenText,
                speechMetadata: {
                  style: 'Calm, warm, clear assistant voice',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: 'Failed to synthesize voice audio.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      console.error('[Zen AI /api/tts error]:', err);
      res.status(500).json({ error: formatApiError(err) });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zen AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Zen AI server:', err);
  process.exit(1);
});
