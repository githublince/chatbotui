// script.js
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  // support both an explicit id (#send-btn) or fallback to the button inside input-container
  const sendBtn = document.getElementById('send-btn') || document.querySelector('.input-container button');

  if (!input || !chatBox || !sendBtn) {
    console.error('Required elements missing: #user-input, #chat-box or send button');
    return;
  }

  // append a normal text message
  function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // auto-resize textarea (max height in px)
  function autoResize(el) {
    const max = 120;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }

  // enable / disable user input
  function setInputEnabled(enabled) {
    if (enabled) {
      input.removeAttribute('disabled');
      sendBtn.removeAttribute('disabled');
      input.classList.remove('disabled');
      sendBtn.classList.remove('disabled');
      input.placeholder = 'Type your message...';
    } else {
      input.setAttribute('disabled', 'true');
      sendBtn.setAttribute('disabled', 'true');
      input.classList.add('disabled');
      sendBtn.classList.add('disabled');
      input.placeholder = 'Waiting for response...';
    }
  }

  // show a bot "typing" indicator and return the node so it can be removed later
  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'message bot-typing';
    typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typing;
  }

  // main send function
  async function sendMessage() {
    // prevent double submission if already disabled
    if (input.disabled) return;

    const raw = input.value;
    const message = raw.trim();
    if (message === '') return;

    // show user message immediately
    appendMessage(message, 'user-message');

    // disable input and show typing indicator
    setInputEnabled(false);
    const typingNode = showTypingIndicator();

    try {
      const res = await fetch('/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await res.json();

      // remove typing indicator and display bot reply
      if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
      appendMessage(data.response ?? 'No response', 'bot-message');
    } catch (err) {
      if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
      appendMessage('Error: Could not reach the server', 'bot-message');
      console.error(err);
    } finally {
      // reset textarea, resize and re-enable input
      input.value = '';
      autoResize(input);
      setInputEnabled(true);
      input.focus();
    }
  }

  // expose to window so onclick="sendMessage()" still works
  window.sendMessage = sendMessage;

  // listeners
  input.addEventListener('input', () => autoResize(input));

  input.addEventListener('keydown', (e) => {
    if (input.disabled) return; // ignore while waiting
    // Enter = send, Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', (e) => {
    if (sendBtn.disabled) return;
    e.preventDefault();
    sendMessage();
  });

  // initial
  autoResize(input);
});
