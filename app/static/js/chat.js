function appendMessage(role, content) {
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = content;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

async function sendMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error'}));
    throw new Error(err.error || 'Request failed');
  }
  const data = await res.json();
  return data.reply;
}

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    appendMessage('user', msg);
    input.value = '';
    try {
      const reply = await sendMessage(msg);
      appendMessage('assistant', reply);
    } catch (err) {
      appendMessage('assistant', 'Sorry, something went wrong.');
      console.error(err);
    }
  });
});
