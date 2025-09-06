document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !chatBox || !sendBtn) {
    console.error('Required elements missing: #user-input, #chat-box, or #send-btn');
    return;
  }

  // State to track conversation flow
  let conversationState = 'awaiting_project_type'; // Possible states: awaiting_project_type, awaiting_custom_type, awaiting_description, idle
  let selectedProjectType = '';

  // Append a normal text message
  function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Append a bot message with project type buttons
  function appendProjectTypePrompt() {
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = `
      What type of project do you need?
      <div class="project-type-buttons">
        <button class="project-type-button" onclick="selectProjectType('Web')">Web</button>
        <button class="project-type-button" onclick="selectProjectType('Mobile')">Mobile</button>
        <button class="project-type-button" onclick="selectProjectType('IoT')">IoT</button>
        <button class="project-type-button" onclick="selectProjectType('Others')">Others</button>
      </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Format JSON response into readable HTML
  function formatTechStackResponse(data) {
    console.log('Formatting tech stack response:', JSON.stringify(data, null, 2));

    if (!data || !data.recommended_tech_stack || !Array.isArray(data.recommended_tech_stack)) {
      console.warn('Invalid or missing recommended_tech_stack:', data);
      return '<p>Error: No valid tech stack data provided. Please try again.</p>';
    }

    let html = '<div class="tech-stack-response">';
    data.recommended_tech_stack.forEach((stack, index) => {
      console.log(`Processing tech stack option ${index + 1}:`, stack);
      html += `<h3>Tech Stack Option ${index + 1}</h3>`;

      // Helper function to render field
      const renderField = (fieldName, key, type = 'text') => {
        if (!stack[key]) {
          console.warn(`Field "${key}" missing in stack option ${index + 1}`);
          return `<h4>${fieldName}</h4><p>Not provided</p>`;
        }
        let output = `<h4>${fieldName}</h4>`;
        if (type === 'list' && Array.isArray(stack[key])) {
          if (stack[key].length === 0) {
            output += '<p>No items provided</p>';
          } else {
            output += '<ul>';
            stack[key].forEach(item => {
              output += `<li>${item}</li>`;
            });
            output += '</ul>';
          }
        } else if (type === 'text') {
          output += `<p>${stack[key]}</p>`;
        } else {
          output += `<p>${JSON.stringify(stack[key])}</p>`;
        }
        return output;
      };

      // Render each field
      html += renderField('Project Overview', 'Project Overview');
      html += renderField('Functional Requirements', 'Functional Requirements', 'list');
      html += renderField('Non-Functional Requirements', 'Non-Functional Requirements', 'list');
      html += renderField('Recommended Backend Technologies', 'Recommended Backend Technologies', 'list');
      html += renderField('Recommended Frontend Technologies', 'Recommended Frontend Technologies', 'list');
      html += renderField('Database and Storage Solutions', 'Database and Storage Solutions', 'list');
      html += renderField('Real-Time Features and Protocols', 'Real-Time Features and Protocols', 'list');
      html += renderField('Security Considerations', 'Security Considerations', 'list');
      html += renderField('Scalability and Performance Strategies', 'Scalability and Performance Strategies', 'list');
      html += renderField('Deployment and Infrastructure Options', 'Deployment and Infrastructure Options', 'list');
      html += renderField('Why This Stack?', 'summary');
      html += renderField('Examples of Websites/Applications', 'examples', 'list');
      html += renderField('Cohesive Compatibility Strength', 'cohesive compatibility strength');
    });
    html += '</div>';
    return html;
  }

  // Append formatted tech stack response
  function appendTechStackResponse(data) {
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = formatTechStackResponse(data);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Auto-resize textarea (max height in px)
  function autoResize(el) {
    const max = 120;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }

  // Enable/disable user input
  function setInputEnabled(enabled, placeholder = 'Type your message...') {
    if (enabled) {
      input.removeAttribute('disabled');
      sendBtn.removeAttribute('disabled');
      input.classList.remove('disabled');
      sendBtn.classList.remove('disabled');
      input.placeholder = placeholder;
    } else {
      input.setAttribute('disabled', 'true');
      sendBtn.setAttribute('disabled', 'true');
      input.classList.add('disabled');
      sendBtn.classList.add('disabled');
      input.placeholder = 'Waiting for response...';
    }
  }

  // Show a bot "typing" indicator and return the node
  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'message bot-typing';
    typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typing;
  }

  // Handle project type selection
  window.selectProjectType = function(type) {
    selectedProjectType = type;
    if (type === 'Others') {
      conversationState = 'awaiting_custom_type';
      appendMessage('Please specify the type of project:', 'bot-message');
      setInputEnabled(true, 'Enter custom project type...');
      input.focus();
    } else {
      conversationState = 'awaiting_description';
      appendMessage(`Selected project type: ${type}`, 'user-message');
      appendMessage('Please provide a detailed description of your project:', 'bot-message');
      setInputEnabled(true, 'Enter project description...');
      input.focus();
    }
  };

  // Main send function
  async function sendMessage(message) {
    // Prevent double submission
    if (input.disabled && !message) return;

    let msg = message || input.value.trim();
    if (msg === '') return;

    if (conversationState === 'awaiting_custom_type') {
      selectedProjectType = msg;
      conversationState = 'awaiting_description';
      appendMessage(`Custom project type: ${msg}`, 'user-message');
      appendMessage('Please provide a detailed description of your project:', 'bot-message');
      setInputEnabled(true, 'Enter project description...');
      input.value = '';
      autoResize(input);
      input.focus();
      return;
    }

    if (conversationState === 'awaiting_description') {
      // Show user description
      appendMessage(msg, 'user-message');

      // Disable input and show typing indicator
      setInputEnabled(false);
      const typingNode = showTypingIndicator();

      try {
        const res = await fetch('/chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_type: selectedProjectType, description: msg })
        });

        const data = await res.json();
        console.log('Received response from /chat/:', JSON.stringify(data, null, 2));

        // Remove typing indicator
        if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);

        // Check for structured data and render
        if (data && data.structured && data.structured.recommended_tech_stack && Array.isArray(data.structured.recommended_tech_stack)) {
          console.log('Rendering structured tech stack response');
          appendTechStackResponse(data.structured);
        } else {
          console.warn('No valid structured data found. Falling back to raw response:', data.response);
          appendMessage(data.response || 'No response received. Please try again.', 'bot-message');
        }

        // Reset conversation state and show project type prompt again
        conversationState = 'awaiting_project_type';
        selectedProjectType = '';
        input.value = '';
        autoResize(input);
        setTimeout(() => appendProjectTypePrompt(), 1000);
      } catch (err) {
        if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
        appendMessage('Error: Could not reach the server', 'bot-message');
        console.error('Fetch error:', err);
      } finally {
        // Reset textarea and re-enable input
        input.value = '';
        autoResize(input);
        setInputEnabled(true);
        input.focus();
      }
    }
  }

  // Expose to window for button onclick
  window.sendMessage = sendMessage;

  // Listeners
  input.addEventListener('input', () => autoResize(input));

  input.addEventListener('keydown', (e) => {
    if (input.disabled) return;
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

  // Initial: Show project type prompt
  appendProjectTypePrompt();
  autoResize(input);
});