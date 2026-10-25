document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Config & Sessions
    const serverUrlInput = document.getElementById('server-url');
    const userIdInput = document.getElementById('user-id');
    const btnSidebarNewChat = document.getElementById('btn-sidebar-new-chat');
    const btnHeaderNewChat = document.getElementById('btn-header-new-chat');
    const btnNewSession = document.getElementById('btn-new-session'); // Legacy/fallback button
    const sessionsList = document.getElementById('sessions-list');
    const sessionsCountBadge = document.getElementById('sessions-count-badge');
    const btnCopySession = document.getElementById('btn-copy-session');
    const sessionIdDisplay = document.getElementById('session-id-display');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const configToggle = document.getElementById('config-toggle');
    const configBody = document.getElementById('config-body');

    // DOM Elements - Chat & Header
    const chatHeaderTitle = document.getElementById('chat-header-title');
    const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');
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

    // Collapsible Configuration Section
    if (configToggle && configBody) {
        configToggle.addEventListener('click', () => {
            configToggle.classList.toggle('collapsed');
            configBody.classList.toggle('collapsed');
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

    // Initialize User ID Input Box
    const savedUserId = localStorage.getItem('adk_user_id');
    if (savedUserId && savedUserId.trim()) {
        userIdInput.value = savedUserId.trim();
    }

    // Save custom deployed URL when changed by user
    serverUrlInput.addEventListener('change', () => {
        const val = serverUrlInput.value.trim().replace(/\/$/, '');
        if (val) {
            localStorage.setItem('adk_server_url', val);
            console.log('Saved custom server URL:', val);
            syncServerSessions();
        }
    });

    // Helper: Update Status Indicator
    function setStatus(state, text) {
        if (statusIndicator) {
            statusIndicator.querySelector('.dot').className = `dot ${state}`;
            statusText.textContent = text;
        }
    }

    // =========================================================================
    // Session Storage & State Management
    // =========================================================================
    function getSessionsStorageKey(userId) {
        return `testsense_sessions_${userId || 'default'}`;
    }

    function getActiveSessionStorageKey(userId) {
        return `testsense_active_session_${userId || 'default'}`;
    }

    function loadLocalSessions(userId) {
        const key = getSessionsStorageKey(userId);
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Error reading sessions from localStorage:', e);
        }
        return [];
    }

    function saveLocalSessions(userId, sessions) {
        const key = getSessionsStorageKey(userId);
        try {
            localStorage.setItem(key, JSON.stringify(sessions));
        } catch (e) {
            console.warn('Error saving sessions to localStorage:', e);
        }
    }

    function getCurrentUserId() {
        return userIdInput.value.trim() || 'qa_tester_1';
    }

    function getActiveSession() {
        const userId = getCurrentUserId();
        const sessions = loadLocalSessions(userId);
        return sessions.find(s => s.id === currentSessionId);
    }

    function updateSessionRecord(updatedSession) {
        const userId = getCurrentUserId();
        const sessions = loadLocalSessions(userId);
        const idx = sessions.findIndex(s => s.id === updatedSession.id);
        if (idx !== -1) {
            sessions[idx] = updatedSession;
        } else {
            sessions.unshift(updatedSession);
        }
        // Keep sorted newest first
        sessions.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        saveLocalSessions(userId, sessions);
        renderSessionsList();
    }

    // Date/Time formatter for sessions list
    function formatSessionDate(timestamp) {
        if (!timestamp) return 'Just now';
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        const d = new Date(timestamp);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    // Render Sessions Sidebar List
    function renderSessionsList() {
        const userId = getCurrentUserId();
        const sessions = loadLocalSessions(userId);

        if (sessionsCountBadge) {
            sessionsCountBadge.textContent = sessions.length;
        }

        if (!sessionsList) return;

        sessionsList.innerHTML = '';

        if (sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="sessions-empty-state">
                    <i class="fa-regular fa-comments"></i>
                    <span>No saved chats yet</span>
                </div>
            `;
            return;
        }

        sessions.forEach(session => {
            const item = document.createElement('div');
            const isActive = session.id === currentSessionId;
            item.className = `session-item ${isActive ? 'active' : ''}`;
            item.id = `session-item-${session.id}`;
            item.setAttribute('data-session-id', session.id);

            const displayTitle = session.title || 'New Chat';
            const dateStr = formatSessionDate(session.updatedAt || session.createdAt);
            const msgCount = session.messages ? session.messages.length : 0;

            item.innerHTML = `
                <i class="fa-regular fa-message session-item-icon"></i>
                <div class="session-item-content">
                    <span class="session-item-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</span>
                    <span class="session-item-meta">${dateStr} • ${msgCount} msgs</span>
                </div>
                <button class="session-item-delete" title="Delete chat session" data-delete-id="${session.id}">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            `;

            // Click item to switch session
            item.addEventListener('click', (e) => {
                if (e.target.closest('.session-item-delete')) return;
                switchSession(session.id);
            });

            // Click delete button
            const deleteBtn = item.querySelector('.session-item-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                });
            }

            sessionsList.appendChild(item);
        });
    }

    // Switch Active Session
    async function switchSession(targetSessionId) {
        if (!targetSessionId) return;

        const userId = getCurrentUserId();
        const sessions = loadLocalSessions(userId);
        const session = sessions.find(s => s.id === targetSessionId);

        if (!session) {
            console.warn(`Session ${targetSessionId} not found in storage.`);
            return;
        }

        currentSessionId = session.id;
        localStorage.setItem(getActiveSessionStorageKey(userId), currentSessionId);

        // Update active session display
        if (sessionIdDisplay) sessionIdDisplay.textContent = currentSessionId;
        if (chatHeaderTitle) {
            chatHeaderTitle.textContent = session.title && session.title !== 'New Chat' 
                ? session.title 
                : 'TestSense AI Agent';
        }
        if (chatHeaderSubtitle) {
            chatHeaderSubtitle.textContent = `Session: ${currentSessionId.substring(0, 8)}... • User: ${userId}`;
        }

        setStatus('connected', `Active User: ${userId}`);
        btnSend.disabled = !userInput.value.trim();

        // Render chat messages
        renderSessionMessages(session);

        // Update list active highlighting
        renderSessionsList();

        // Close mobile drawer
        closeSidebar();

        // Ensure session registered in background on server
        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;
        try {
            fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions/${currentSessionId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => {});
        } catch (e) {}
    }

    // Render Messages for a Session
    function renderSessionMessages(session) {
        messagesContainer.innerHTML = '';

        if (!session.messages || session.messages.length === 0) {
            renderWelcomeScreen();
            return;
        }

        session.messages.forEach(msg => {
            if (msg.type === 'user') {
                appendMessageToDOM('user', msg.text);
            } else if (msg.type === 'agent') {
                appendMessageToDOM('agent', msg.text);
            } else if (msg.type === 'tool_call') {
                appendToolInvocationToDOM(msg.name, msg.args);
            } else if (msg.type === 'tool_resp') {
                appendToolResponseToDOM(msg.name, msg.response);
            }
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Render Welcome Screen
    function renderWelcomeScreen() {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <img src="logo.png" alt="TestSense AI Logo" class="welcome-logo-img">
                </div>
                <h2>Welcome to TestSense AI</h2>
                <p>Your QA Test Agent is ready. Tap any suggestion prompt below to fill the chat box:</p>

                <div class="welcome-suggestions">
                    <div class="suggestion-card" data-fill="Get shipment ref / reservation ID for customer order 1121612266">
                        <div class="suggestion-icon"><i class="fa-solid fa-magnifying-glass-location"></i></div>
                        <div class="suggestion-text">
                            <strong>Get Shipment Ref (Reservation ID)</strong>
                            <span>Lookup reservation ID from order details wrapper</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>

                    <div class="suggestion-card" data-fill="Send BOPS SHPSHPD status update for order 1121612266">
                        <div class="suggestion-icon"><i class="fa-solid fa-truck-fast"></i></div>
                        <div class="suggestion-text">
                            <strong>SHPSHPD Fulfillment Status</strong>
                            <span>Trigger BOPS/SDD/STH fulfillment update</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-left-from-square fill-icon"></i>
                    </div>

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
                </div>
            </div>
        `;
        bindSuggestionCards();
    }

    // Generate Client Fallback Session ID
    function generateFallbackSessionId() {
        return 'sess-' + Math.random().toString(36).substring(2, 10);
    }

    // Start / Create New Chat Session
    async function startNewChat(force = false) {
        const userId = getCurrentUserId();
        const active = getActiveSession();

        // If current session already has 0 messages and is not forced, just switch & focus
        if (!force && active && (!active.messages || active.messages.length === 0)) {
            userInput.focus();
            closeSidebar();
            return;
        }

        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;
        let newSessionId = null;

        setStatus('connecting', 'Creating session...');
        if (sessionIdDisplay) sessionIdDisplay.textContent = 'Creating...';

        try {
            const response = await fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' })
            });

            if (response.ok) {
                const data = await response.json();
                newSessionId = data.id;
            } else {
                newSessionId = generateFallbackSessionId();
            }
        } catch (error) {
            console.warn('Session endpoint network error. Using fallback UUID:', error);
            newSessionId = generateFallbackSessionId();
        }

        const newSession = {
            id: newSessionId,
            title: 'New Chat',
            userId: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };

        const sessions = loadLocalSessions(userId);
        sessions.unshift(newSession);
        saveLocalSessions(userId, sessions);

        await switchSession(newSessionId);
        userInput.focus();
    }

    // Delete a Chat Session
    async function deleteSession(sessionIdToDelete) {
        const userId = getCurrentUserId();
        const sessions = loadLocalSessions(userId);
        const target = sessions.find(s => s.id === sessionIdToDelete);
        const targetTitle = target ? target.title || 'this chat' : 'this chat';

        if (!confirm(`Are you sure you want to delete "${targetTitle}"?`)) {
            return;
        }

        // Remove from local list
        const updated = sessions.filter(s => s.id !== sessionIdToDelete);
        saveLocalSessions(userId, updated);

        // Delete from backend server
        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;
        try {
            fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions/${sessionIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => {});
        } catch (e) {}

        // If the deleted session was currently active
        if (sessionIdToDelete === currentSessionId) {
            if (updated.length > 0) {
                switchSession(updated[0].id);
            } else {
                startNewChat(true);
            }
        } else {
            renderSessionsList();
        }
    }

    // Sync Sessions from Backend Server
    async function syncServerSessions() {
        const userId = getCurrentUserId();
        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;

        try {
            const response = await fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions`);
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.sessions)) {
                    const localSessions = loadLocalSessions(userId);
                    const localMap = new Map(localSessions.map(s => [s.id, s]));

                    // Merge server sessions
                    data.sessions.forEach(s => {
                        if (!localMap.has(s.id)) {
                            localMap.set(s.id, {
                                id: s.id,
                                title: s.title || `Chat ${s.id.substring(0, 8)}`,
                                userId: userId,
                                createdAt: s.createdAt ? s.createdAt * 1000 : Date.now(),
                                updatedAt: s.updatedAt ? s.updatedAt * 1000 : Date.now(),
                                messages: []
                            });
                        }
                    });

                    const merged = Array.from(localMap.values());
                    merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
                    saveLocalSessions(userId, merged);
                    renderSessionsList();
                }
            }
        } catch (e) {
            console.debug('Background server session sync notice:', e);
        }
    }

    // Copy Session ID helper
    if (btnCopySession) {
        btnCopySession.addEventListener('click', async () => {
            if (!currentSessionId) return;
            try {
                await navigator.clipboard.writeText(currentSessionId);
                const originalHtml = btnCopySession.innerHTML;
                btnCopySession.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
                setTimeout(() => {
                    btnCopySession.innerHTML = originalHtml;
                }, 1500);
            } catch (err) {
                console.warn('Clipboard write failed:', err);
            }
        });
    }

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

    // =========================================================================
    // Modal Dialog Handlers
    // =========================================================================
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
        } else if (actionType === 'shipment_ref') {
            modalTitle.innerHTML = '<i class="fa-solid fa-magnifying-glass-location"></i> Get Shipment Ref / Reservation ID';
            modalBody.innerHTML = `
                <div class="input-group">
                    <label for="param-order-id">Customer Order ID <span class="required-star">*</span></label>
                    <input type="text" id="param-order-id" placeholder="e.g. 1121612266" required>
                </div>
            `;
        } else if (actionType === 'shpshpd') {
            modalTitle.innerHTML = '<i class="fa-solid fa-truck-fast"></i> SHPSHPD Fulfillment Status Update';
            modalBody.innerHTML = `
                <div class="input-group">
                    <label for="param-shpshpd-order-id">Customer Order ID <span class="required-star">*</span></label>
                    <input type="text" id="param-shpshpd-order-id" placeholder="e.g. 1121612266" required>
                </div>
                <div class="input-group">
                    <label for="param-shpshpd-type">Order Type</label>
                    <select id="param-shpshpd-type">
                        <option value="BOPS" selected>BOPS (Buy Online Pickup In Store)</option>
                        <option value="STH">STH (Standard - Ship To Home)</option>
                        <option value="BOSS">BOSS (Buy Online Ship To Store)</option>
                        <option value="SDD">SDD (Same Day Delivery)</option>
                    </select>
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

            } else if (currentModalAction === 'shipment_ref') {
                const orderIdInput = document.getElementById('param-order-id');
                const orderId = orderIdInput ? orderIdInput.value.trim() : '';
                if (!orderId) {
                    alert('Please enter a Customer Order ID.');
                    if (orderIdInput) orderIdInput.focus();
                    return;
                }
                closeModal();
                sendMessage(`Get shipment ref / reservation ID for customer order ${orderId}`);

            } else if (currentModalAction === 'shpshpd') {
                const orderIdInput = document.getElementById('param-shpshpd-order-id');
                const typeSelect = document.getElementById('param-shpshpd-type');
                const orderId = orderIdInput ? orderIdInput.value.trim() : '';
                if (!orderId) {
                    alert('Please enter a Customer Order ID.');
                    if (orderIdInput) orderIdInput.focus();
                    return;
                }
                const orderType = typeSelect ? typeSelect.value : 'BOPS';
                closeModal();
                sendMessage(`Send ${orderType} SHPSHPD status update for order ${orderId}`);
            }
        });
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

    // =========================================================================
    // Send Message to Google ADK /run Endpoint
    // =========================================================================
    async function sendMessage(promptText) {
        const text = promptText || userInput.value.trim();
        if (!text) return;

        const userId = getCurrentUserId();
        let session = getActiveSession();

        if (!session || !currentSessionId) {
            await startNewChat(true);
            session = getActiveSession();
        }

        const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '') || window.location.origin;

        if (!promptText) {
            userInput.value = '';
            userInput.style.height = 'auto';
            btnSend.disabled = true;
        }

        closeSidebar();

        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        // Auto-update session title from first prompt if title is 'New Chat'
        if (!session.title || session.title === 'New Chat') {
            const cleanText = text.trim();
            session.title = cleanText.length > 35 ? cleanText.substring(0, 35) + '...' : cleanText;
            if (chatHeaderTitle) chatHeaderTitle.textContent = session.title;
        }

        // Store and render user message
        const userMsgObj = {
            type: 'user',
            text: text,
            timestamp: Date.now()
        };
        session.messages = session.messages || [];
        session.messages.push(userMsgObj);
        session.updatedAt = Date.now();
        updateSessionRecord(session);

        appendMessageToDOM('user', text);
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
                const errText = `❌ Server Error (${response.status}): ${errData.detail || 'Failed to process request.'}`;
                appendMessageToDOM('agent', errText);
                session.messages.push({ type: 'agent', text: errText, timestamp: Date.now() });
                session.updatedAt = Date.now();
                updateSessionRecord(session);
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
                                appendToolInvocationToDOM(part.functionCall.name, part.functionCall.args);
                                session.messages.push({
                                    type: 'tool_call',
                                    name: part.functionCall.name,
                                    args: part.functionCall.args,
                                    timestamp: Date.now()
                                });
                            }
                            else if (part.functionResponse) {
                                appendToolResponseToDOM(part.functionResponse.name, part.functionResponse.response);
                                session.messages.push({
                                    type: 'tool_resp',
                                    name: part.functionResponse.name,
                                    response: part.functionResponse.response,
                                    timestamp: Date.now()
                                });
                            }
                            else if (part.text) {
                                appendMessageToDOM('agent', part.text);
                                session.messages.push({
                                    type: 'agent',
                                    text: part.text,
                                    timestamp: Date.now()
                                });
                                hasTextResponse = true;
                            }
                        }
                    }
                }
            }

            if (!hasTextResponse) {
                const defaultMsg = 'Request completed successfully.';
                appendMessageToDOM('agent', defaultMsg);
                session.messages.push({
                    type: 'agent',
                    text: defaultMsg,
                    timestamp: Date.now()
                });
            }

            session.updatedAt = Date.now();
            updateSessionRecord(session);

        } catch (error) {
            if (typingEl) typingEl.remove();
            console.error('Run Error:', error);
            const connErr = `❌ Connection error: Could not reach server at ${baseUrl}. Ensure your server is running.`;
            appendMessageToDOM('agent', connErr);
            session.messages.push({ type: 'agent', text: connErr, timestamp: Date.now() });
            session.updatedAt = Date.now();
            updateSessionRecord(session);
        }
    }

    // Render User/Agent Message Bubble to DOM
    function appendMessageToDOM(sender, text) {
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

    // Render Tool Invocation Card to DOM
    function appendToolInvocationToDOM(toolName, toolArgs) {
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

    // Render Tool Output Response to DOM
    function appendToolResponseToDOM(toolName, responseData) {
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
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================
    btnSend.addEventListener('click', () => sendMessage());

    // New Chat Action Buttons
    if (btnSidebarNewChat) {
        btnSidebarNewChat.addEventListener('click', () => startNewChat());
    }
    if (btnHeaderNewChat) {
        btnHeaderNewChat.addEventListener('click', () => startNewChat());
    }
    if (btnNewSession) {
        btnNewSession.addEventListener('click', () => startNewChat(true));
    }

    // User ID change handler
    function handleUserIdChange() {
        const newUserId = getCurrentUserId();
        localStorage.setItem('adk_user_id', newUserId);
        initActiveUserSession();
    }

    userIdInput.addEventListener('change', handleUserIdChange);
    userIdInput.addEventListener('blur', () => {
        if (userIdInput.value.trim() !== (localStorage.getItem('adk_user_id') || 'qa_tester_1')) {
            handleUserIdChange();
        }
    });

    // Clear Chat Button: Clears the current session's messages
    btnClearChat.addEventListener('click', () => {
        const session = getActiveSession();
        if (!session) return;

        if (session.messages && session.messages.length > 0) {
            if (!confirm('Clear all messages in the current chat window?')) {
                return;
            }
        }

        session.messages = [];
        session.title = 'New Chat';
        session.updatedAt = Date.now();
        updateSessionRecord(session);
        renderWelcomeScreen();
        if (chatHeaderTitle) chatHeaderTitle.textContent = 'TestSense AI Agent';
    });

    // Shortcuts Pills
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

    // =========================================================================
    // Initialization: Restore Session on Refresh or Start Fresh
    // =========================================================================
    async function initActiveUserSession() {
        const userId = getCurrentUserId();
        const savedSessions = loadLocalSessions(userId);
        const savedActiveId = localStorage.getItem(getActiveSessionStorageKey(userId));

        // 1. If user previously had an active session and it exists in local storage
        if (savedActiveId && savedSessions.some(s => s.id === savedActiveId)) {
            await switchSession(savedActiveId);
        }
        // 2. Otherwise if user has any previous sessions, open the most recent one
        else if (savedSessions.length > 0) {
            await switchSession(savedSessions[0].id);
        }
        // 3. Otherwise create a fresh new session
        else {
            await startNewChat(true);
        }

        // Render sessions list in sidebar
        renderSessionsList();

        // Background server session synchronization
        syncServerSessions();
    }

    // Bootstrapping
    initActiveUserSession();
});
