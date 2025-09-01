async function sendMessage() {
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const message = input.value.trim();

    if (message === '') return;

    // Display user message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user-message';
    userDiv.textContent = message;
    chatBox.appendChild(userDiv);

    // Send message to server
    try {
        const response = await fetch('/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        });
        const data = await response.json();

        // Display bot response
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-message';
        botDiv.textContent = data.response;
        chatBox.appendChild(botDiv);
    } catch (error) {
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-message';
        botDiv.textContent = 'Error: Could not reach the server';
        chatBox.appendChild(botDiv);
    }

    // Clear input and scroll to bottom
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});