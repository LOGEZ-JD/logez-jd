import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('Missing GOOGLE_API_KEY in environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const ChatRequest = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'system']).default('user'),
        content: z.string(),
      })
    )
    .min(1),
  model: z.string().default('gemini-1.5-flash'),
  systemInstruction: z.string().optional(),
});

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'invalid_request', details: parsed.error.issues });
  }

  const { messages, model, systemInstruction } = parsed.data;

  try {
    const genModel = genAI.getGenerativeModel({ model, systemInstruction });

    const chat = genModel.startChat({
      history: messages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const lastUser = messages[messages.length - 1]?.content || '';
    const response = await chat.sendMessage(lastUser);
    const text = response.response.text();

    res.json({ message: { role: 'model', content: text } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/', (_, res) => {
  res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width, initial-scale=1'/>
  <title>Gemini Chatbot</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #0b1020; color: #f4f6fb; }
    .container { max-width: 820px; margin: 0 auto; padding: 24px; }
    .card { background: #11172a; border: 1px solid #24304d; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.35); }
    header { padding: 16px 20px; border-bottom: 1px solid #24304d; display: flex; align-items: center; gap: 12px; }
    header .dot { width: 10px; height: 10px; background: #7aa2f7; border-radius: 999px; box-shadow: 0 0 12px #7aa2f7; }
    header h1 { font-size: 18px; margin: 0; color: #dce7ff; letter-spacing: 0.4px; }
    #chat { height: 60vh; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .msg { padding: 12px 14px; border-radius: 12px; max-width: 80%; line-height: 1.5; }
    .user { align-self: flex-end; background: #1f2a44; border: 1px solid #2f406a; }
    .model { align-self: flex-start; background: #13203a; border: 1px solid #23365e; }
    form { display: flex; gap: 10px; padding: 16px; border-top: 1px solid #24304d; background: #0e1426; }
    input, button { font-size: 16px; }
    input { flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid #2b3755; background: #0b1020; color: #eaf0ff; }
    input::placeholder { color: #8fa1c7; }
    button { padding: 12px 16px; border-radius: 10px; border: 1px solid #2b3755; background: #1a2644; color: #d8e5ff; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class='container'>
    <div class='card'>
      <header><div class='dot'></div><h1>Gemini Chatbot</h1></header>
      <div id='chat'></div>
      <form id='form'>
        <input id='input' placeholder='Ask me anything...' autocomplete='off'/>
        <button id='send'>Send</button>
      </form>
    </div>
  </div>
  <script type='module'>
    const chatEl = document.getElementById('chat');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const state = { messages: [] };

    function addMessage(role, content) {
      const div = document.createElement('div');
      div.className = 'msg ' + (role === 'user' ? 'user' : 'model');
      div.textContent = content;
      chatEl.appendChild(div);
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMessage('user', text);
      state.messages.push({ role: 'user', content: text });
      const btn = document.getElementById('send');
      btn.disabled = true;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: state.messages })
        });
        const data = await res.json();
        if (data?.message?.content) {
          state.messages.push(data.message);
          addMessage('model', data.message.content);
        } else {
          addMessage('model', 'No response');
        }
      } catch (err) {
        addMessage('model', 'Error reaching server');
      } finally { btn.disabled = false; }
    });
  </script>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
