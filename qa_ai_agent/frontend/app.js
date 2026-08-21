document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const serverUrlInput = document.getElementById('server-url');
    const userIdInput = document.getElementById('user-id');
    const btnNewSession = document.getElementById('btn-new-session');
    const sessionIdDisplay = document.getElementById('session-id-display');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const messagesContainer = document.getElementById('messages-container');
    const userInput = document.getElementById('user-input');
    const btnSend = document.getElementById('btn-send');
    const btnClearChat = document.getElementById('btn-clear-chat');
    const shortcutBtns = document.querySelectorAll('.shortcut-btn');

    // App State
    let currentSessionId = null;
    let appName = 'multi_tool_agent';

    // Helper: Update Status Indicator
    function setStatus(state, text) {
        statusIndicator.querySelector('.dot').className = `dot ${state}`;
        statusText.textContent = text;
    }

    // Auto-resize Textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
        btnSend.disabled = !userInput.value.trim();
    });

    // Handle Enter Key Press
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userInput.value.trim() && !btnSend.disabled) {
                sendMessage();
            }
        }
    });

    // Generate Client Fallback Session ID
    function generateFallbackSessionId() {
        return 'sess-' + Math.random().toString(36).substring(2, 10);
    }

    // 1. Initialize or Create ADK Session for current User ID
    async function createSession() {
        const baseUrl = serverUrlInput.value.replace(/\/$/, '');
        const userId = userIdInput.value.trim() || 'qa_user_1';

        setStatus('connecting', 'Connecting...');
        sessionIdDisplay.textContent = 'Connecting...';

        try {
            const response = await fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                currentSessionId = data.id;
            } else {
                console.warn(`Session endpoint returned ${response.status}. Using client fallback session.`);
                currentSessionId = generateFallbackSessionId();
            }
        } catch (error) {
            console.warn('Session endpoint network error. Using client fallback session:', error);
            currentSessionId = generateFallbackSessionId();
        }

        sessionIdDisplay.textContent = currentSessionId;
        setStatus('connected', `Active User: ${userId}`);
        btnSend.disabled = !userInput.value.trim();
        console.log(`Switched to User '${userId}' with Session ID:`, currentSessionId);
    }

    // 2. Send Message to Google ADK /run Endpoint
    async function sendMessage(promptText) {
        const text = promptText || userInput.value.trim();
        if (!text) return;

        if (!currentSessionId) {
            await createSession();
        }

        const baseUrl = serverUrlInput.value.replace(/\/$/, '');
        const userId = userIdInput.value.trim() || 'qa_user_1';

        // Clear input box
        if (!promptText) {
            userInput.value = '';
            userInput.style.height = 'auto';
            btnSend.disabled = true;
        }

        // Hide welcome message if present
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        // Render User Message
        appendMessage('user', text);

        // Render Typing Indicator
        const typingEl = appendTypingIndicator();

        try {
            // Payload for ADK /run endpoint
            const payload = {
                appName: appName,
                userId: userId,
                sessionId: currentSessionId,
                newMessage: {
                    role: "user",
                    parts: [{ text: text }]
                }
            };

            const response = await fetch(`${baseUrl}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            typingEl.remove();

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                appendMessage('agent', `❌ Server Error (${response.status}): ${errData.detail || 'Failed to process request.'}`);
                return;
            }

            const events = await response.json();
            console.log('ADK Run Events:', events);

            // Process ADK Event Array
            let hasTextResponse = false;

            if (Array.isArray(events)) {
                for (const event of events) {
                    if (event.content && event.content.parts) {
                        for (const part of event.content.parts) {
                            if (part.functionCall) {
                                appendToolInvocation(part.functionCall.name, part.functionCall.args);
                            }
                            else if (part.functionResponse) {
                                appendToolResponse(part.functionResponse.name, part.functionResponse.response);
                            }
                            else if (part.text) {
                                appendMessage('agent', part.text);
                                hasTextResponse = true;
                            }
                        }
                    }
                }
            }

            if (!hasTextResponse) {
                appendMessage('agent', 'Request completed successfully.');
            }

        } catch (error) {
            if (typingEl) typingEl.remove();
            console.error('Run Error:', error);
            appendMessage('agent', `❌ Connection error: Could not reach server at ${baseUrl}. Ensure your server (python3 server.py) is running.`);
        }
    }

    // Render User/Agent Message Bubble
    function appendMessage(sender, text) {
        const row = document.createElement('div');
        row.className = `message-row ${sender}`;

        const avatarIcon = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
        
        let formattedText = escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        row.innerHTML = `
            <div class="avatar">${avatarIcon}</div>
            <div class="message-content">
                <div class="bubble">${formattedText}</div>
            </div>
        `;

        messagesContainer.appendChild(row);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Render Tool Invocation Card
    function appendToolInvocation(toolName, toolArgs) {
        const row = document.createElement('div');
        row.className = 'message-row agent';

        row.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-gear"></i></div>
            <div class="message-content">
                <div class="tool-card">
                    <div class="tool-header">
                        <span><i class="fa-solid fa-bolt"></i> Executing Tool: <code>${toolName}</code></span>
                    </div>
                    <div class="tool-body">${escapeHtml(JSON.stringify(toolArgs, null, 2))}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(row);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Render Tool Output Response
    function appendToolResponse(toolName, responseData) {
        const row = document.createElement('div');
        row.className = 'message-row agent';

        row.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-check-double"></i></div>
            <div class="message-content">
                <div class="tool-card" style="border-color: rgba(16, 185, 129, 0.4);">
                    <div class="tool-header" style="color: #10b981;">
                        <span><i class="fa-solid fa-database"></i> Tool Response Output</span>
                    </div>
                    <div class="tool-body">${escapeHtml(JSON.stringify(responseData, null, 2))}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(row);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Render Typing Indicator
    function appendTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'message-row agent';
        row.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-content">
                <div class="bubble" style="display: flex; gap: 6px; align-items: center;">
                    <span>Thinking</span>
                    <span class="dot connecting"></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(row);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return row;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Event Listeners
    btnSend.addEventListener('click', () => sendMessage());
    btnNewSession.addEventListener('click', () => createSession());

    // Auto switch user when user ID field is edited
    userIdInput.addEventListener('change', () => createSession());
    userIdInput.addEventListener('blur', () => {
        if (userIdInput.value.trim() && !currentSessionId) {
            createSession();
        }
    });

    btnClearChat.addEventListener('click', () => {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon"><i class="fa-solid fa-robot"></i></div>
                <h2>TestSense AI Ready</h2>
                <p>Chat cleared. Ask any QA test data or API execution question.</p>
            </div>
        `;
    });

    shortcutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            sendMessage(prompt);
        });
    });

    // Auto-create Session on Load
    createSession();
});
