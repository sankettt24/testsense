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

    // Mobile Navigation Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Modal Elements
    const paramModal = document.getElementById('param-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');

    // App State
    let currentSessionId = null;
    let appName = 'multi_tool_agent';
    let currentModalAction = null;

    // Mobile Sidebar Drawer Handlers
    function openSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        }
    }

    function closeSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // Bind Welcome Suggestion Cards to fill chat textarea
    function bindSuggestionCards() {
        const suggestionCards = document.querySelectorAll('.suggestion-card');
        suggestionCards.forEach(card => {
            card.addEventListener('click', () => {
                const fillText = card.getAttribute('data-fill');
                if (fillText) {
                    userInput.value = fillText;
                    userInput.style.height = 'auto';
                    userInput.style.height = `${Math.min(userInput.scrollHeight, 100)}px`;
                    btnSend.disabled = false;
                    userInput.focus();
                }
            });
        });
    }

    bindSuggestionCards();

    // Modal Dialog Handlers
    function openModal(actionType) {
        currentModalAction = actionType;
        modalBody.innerHTML = '';

        if (actionType === 'm_money') {
            modalTitle.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Add M-Money / B-Money';
            modalBody.innerHTML = `
                <div class="input-group">
                    <label for="param-email">Target Email Address <span class="required-star">*</span></label>
                    <input type="email" id="param-email" placeholder="e.g. testmmoney131@gmail.com" required>
                </div>
                <div class="input-group">
                    <label for="param-amount">Gift Card Amount ($)</label>
                    <input type="number" id="param-amount" value="30" placeholder="30">
                </div>
                <div class="input-group">
                    <label>Target Environment (mcom / bcom + Env #)</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="param-env-prefix" style="width: 110px;">
                            <option value="mcom-" selected>mcom-</option>
                            <option value="bcom-">bcom-</option>
                        </select>
                        <input type="number" id="param-env-num" value="131" placeholder="e.g. 131, 170" style="flex: 1;">
                    </div>
                </div>
                <div class="input-group">
                    <label for="param-cards">Number of Cards</label>
                    <input type="number" id="param-cards" value="4" placeholder="4">
                </div>
            `;
        } else if (actionType === 'star_money') {
            modalTitle.innerHTML = '<i class="fa-solid fa-star"></i> Star Money Setup';
            modalBody.innerHTML = `
                <div class="input-group">
                    <label for="param-card">Loyalty Card Number <span class="required-star">*</span></label>
                    <input type="text" id="param-card" placeholder="e.g. 6035340001257605" required>
                </div>
                <div class="input-group">
                    <label for="param-reward">Reward Money Amount ($)</label>
                    <input type="number" id="param-reward" value="10" placeholder="10">
                </div>
            `;
        }

        paramModal.classList.add('active');
        const firstInput = modalBody.querySelector('input');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }

    function closeModal() {
        paramModal.classList.remove('active');
        currentModalAction = null;
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);

    if (modalSubmit) {
        modalSubmit.addEventListener('click', () => {
            if (currentModalAction === 'm_money') {
                const emailInput = document.getElementById('param-email');
                const amountInput = document.getElementById('param-amount');
                const envPrefixSelect = document.getElementById('param-env-prefix');
                const envNumInput = document.getElementById('param-env-num');
                const cardsInput = document.getElementById('param-cards');

                const email = emailInput ? emailInput.value.trim() : '';
                if (!email) {
                    alert('Please enter a target email address.');
                    if (emailInput) emailInput.focus();
                    return;
                }

                const amount = amountInput ? amountInput.value.trim() || '30' : '30';
                const prefix = envPrefixSelect ? envPrefixSelect.value : 'mcom-';
                const num = envNumInput ? envNumInput.value.trim() || '131' : '131';
                const env = `${prefix}${num}`;
                const cards = cardsInput ? cardsInput.value.trim() || '4' : '4';

                closeModal();
                sendMessage(`I want to add M-Money in this account ${email} with amount ${amount}, environment ${env}, no of cards ${cards}`);

            } else if (currentModalAction === 'star_money') {
                const cardInput = document.getElementById('param-card');
                const rewardInput = document.getElementById('param-reward');

                const cardNumber = cardInput ? cardInput.value.trim() : '';
                if (!cardNumber) {
                    alert('Please enter a target loyalty card number.');
                    if (cardInput) cardInput.focus();
                    return;
                }

                const reward = rewardInput ? rewardInput.value.trim() || '10' : '10';

                closeModal();
                sendMessage(`Add Star Money reward dollars ${reward} to card ${cardNumber}`);
            }
        });
    }

    // Helper: Determine Base Server URL Dynamically
    function resolveInitialServerUrl() {
        const savedUrl = localStorage.getItem('adk_server_url');
        if (savedUrl && savedUrl.trim()) {
            return savedUrl.trim();
        }

        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return window.location.origin;
        }

        return 'http://localhost:8000';
    }

    // Initialize Server URL Input Box
    const initialUrl = resolveInitialServerUrl();
    serverUrlInput.value = initialUrl;

    // Save custom deployed URL when changed by user
    serverUrlInput.addEventListener('change', () => {
        const val = serverUrlInput.value.trim().replace(/\/$/, '');
        if (val) {
            localStorage.setItem('adk_server_url', val);
            console.log('Saved custom server URL:', val);
            createSession();
        }
    });

    // Helper: Update Status Indicator
    function setStatus(state, text) {
        statusIndicator.querySelector('.dot').className = `dot ${state}`;
        statusText.textContent = text;
    }

    // Auto-resize Textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 100)}px`;
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
        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;
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
        console.log(`Switched to User '${userId}' at '${baseUrl}' with Session ID:`, currentSessionId);
    }

    // 2. Send Message to Google ADK /run Endpoint
    async function sendMessage(promptText) {
        const text = promptText || userInput.value.trim();
        if (!text) return;

        if (!currentSessionId) {
            await createSession();
        }

        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;
        const userId = userIdInput.value.trim() || 'qa_user_1';

        if (!promptText) {
            userInput.value = '';
            userInput.style.height = 'auto';
            btnSend.disabled = true;
        }

        closeSidebar();

        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        appendMessage('user', text);
        const typingEl = appendTypingIndicator();

        try {
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
            appendMessage('agent', `❌ Connection error: Could not reach server at ${baseUrl}. Ensure your server is running.`);
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

    userIdInput.addEventListener('change', () => createSession());
    userIdInput.addEventListener('blur', () => {
        if (userIdInput.value.trim() && !currentSessionId) {
            createSession();
        }
    });

    btnClearChat.addEventListener('click', () => {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <img src="logo.png" alt="TestSense AI Logo" class="welcome-logo-img">
                </div>
                <h2>TestSense AI Ready</h2>
                <p>Chat cleared. Ask any QA test data or API execution question.</p>
                <div class="welcome-suggestions">
                    <div class="suggestion-card" data-fill="I want to add M-Money in this account sanket123@gmail.com">
                        <div class="suggestion-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                        <div class="suggestion-text">
                            <strong>Add M-Money / B-Money</strong>
                            <span>Fund target account with gift card balance</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>
                    <div class="suggestion-card" data-fill="Add Star Money reward dollars 10 to card 6035340001257605">
                        <div class="suggestion-icon"><i class="fa-solid fa-star"></i></div>
                        <div class="suggestion-text">
                            <strong>Setup Star Money Rewards</strong>
                            <span>Load reward dollars onto Macy's card</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>
                    <div class="suggestion-card" data-fill="Fetch verified Sandbox Credit Cards test data">
                        <div class="suggestion-icon"><i class="fa-solid fa-credit-card"></i></div>
                        <div class="suggestion-text">
                            <strong>Fetch Sandbox Cards</strong>
                            <span>Retrieve Visa, Mastercard, Prop Gold & Amex</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>
                    <div class="suggestion-card" data-fill="Fetch Web IDs for BOPS product category">
                        <div class="suggestion-icon"><i class="fa-solid fa-box-archive"></i></div>
                        <div class="suggestion-text">
                            <strong>Fetch Web IDs for PDP</strong>
                            <span>Get Web IDs for BOPS, LTL, GWP, and Ship</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>
                </div>
            </div>
        `;
        bindSuggestionCards();
    });

    shortcutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            if (action) {
                openModal(action);
            } else {
                const prompt = btn.getAttribute('data-prompt');
                if (prompt) sendMessage(prompt);
            }
        });
    });

    createSession();
});
