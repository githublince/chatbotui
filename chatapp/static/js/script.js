// script.js
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const sendBtn = document.getElementById('send-btn'); // see HTML note below

  // Append a message to chat box
  function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    // preserve newlines in display; ensure .message has `white-space: pre-wrap` in CSS
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Auto-resize textarea up to `max` px
  function autoResize(el) {
    const max = 120; // px (keep in sync with CSS max-height)
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }

  // Send message to server and display local message
  async function sendMessage() {
    const message = input.value.trim();
    if (message === '') return;

    appendMessage(message, 'user-message');

    // send to server (adjust endpoint if needed)
    try {
      const res = await fetch('/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      appendMessage(data.response ?? 'No response', 'bot-message');
    } catch (err) {
      appendMessage('Error: Could not reach the server', 'bot-message');
      console.error(err);
    }

    // reset textarea
    input.value = '';
    autoResize(input);
  }

  // Make sendMessage available globally in case HTML uses onclick="sendMessage()"
  window.sendMessage = sendMessage;

  // Attach listeners
  input.addEventListener('input', () => autoResize(input));

  input.addEventListener('keydown', (e) => {
    // Enter without Shift => send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter: let browser insert newline (do nothing)
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  // initial resize (if textarea has prefilled content)
  autoResize(input);

  // small debug notice
  // console.log('Chat handlers attached (Shift+Enter for newline, Enter to send).');
});
