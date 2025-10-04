import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set. Set it in .env');
}
const genAI = new GoogleGenerativeAI(apiKey || '');
const model = () => genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({ error: 'Server not configured: missing GEMINI_API_KEY' });
    }

    const history = Array.isArray(messages)
      ? messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.content || '') }]
        }))
      : [];

    const chat = model().startChat({
      history,
      generationConfig: { temperature: 0.3 }
    });

    const prompt = system
      ? `${system}\n\nUser: ${history.length ? '' : ''}`
      : undefined;

    const lastUser = [...history].reverse().find(m => m.role === 'user');
    const input = (lastUser?.parts?.[0]?.text || '').trim();

    if (!input && !system) {
      return res.status(400).json({ error: 'No input provided' });
    }

    const instructionPrefix = prompt ? `${prompt}\n\n` : '';
    const result = await chat.sendMessage([{ text: `${instructionPrefix}${input}` }]);
    const text = (await result.response).text();

    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Fallback error handler to always return JSON
// Must be defined after routes
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
