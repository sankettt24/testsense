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

    // Media Preview Modal Elements
    const mediaModal = document.getElementById('media-preview-modal');
    const mediaModalTitle = document.getElementById('media-modal-title');
    const mediaModalBody = document.getElementById('media-modal-body');
    const mediaModalClose = document.getElementById('media-modal-close');

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

    // Helper: Get Current Active Server URL
    function getServerUrl() {
        if (serverUrlInput && serverUrlInput.value && serverUrlInput.value.trim()) {
            return serverUrlInput.value.trim().replace(/\/$/, '');
        }
        return resolveInitialServerUrl();
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

    // =========================================================================
    // Media Preview Modal Functions & Chat Markdown Parser
    // =========================================================================

    function isVideoLink(url, text) {
        if (!url) return false;
        const u = String(url).toLowerCase();
        const t = String(text || '').toLowerCase();
        return /\.(mp4|webm|ogg|mov|mkv)(\?|$)/i.test(u) ||
               /youtube\.com\/watch|youtu\.be\/|vimeo\.com|w3schools\.com\/html\/mov_/i.test(u) ||
               /\b(video|walkthrough|recording|demo|watch)\b/i.test(t);
    }

    function isImageLink(url, text) {
        if (!url) return false;
        const u = String(url).toLowerCase();
        const t = String(text || '').toLowerCase();
        return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(u) ||
               /images\.unsplash\.com|\/photo-|\/image\/|\/img\//i.test(u) ||
               /\b(image|screenshot|visualization|photo|asset|preview)\b/i.test(t);
    }

    function openMediaModal(type, url, title) {
        if (!mediaModal || !mediaModalBody) return;
        if (mediaModalTitle) {
            mediaModalTitle.innerHTML = `<i class="fa-solid ${type === 'video' ? 'fa-video' : 'fa-image'}"></i> ${escapeHtml(title || 'Media Asset')}`;
        }

        if (type === 'video') {
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
                let videoId = '';
                if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
                } else if (url.includes('v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                }
                mediaModalBody.innerHTML = `
                    <iframe class="media-preview-video" style="width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 8px;" src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="media-link-external">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Video on YouTube
                    </a>
                `;
            } else {
                mediaModalBody.innerHTML = `
                    <video class="media-preview-video" controls autoplay style="max-height: 70vh; width: 100%; border-radius: 8px;">
                        <source src="${escapeHtml(url)}" type="video/mp4">
                        Your browser does not support HTML5 video tag.
                    </video>
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="media-link-external">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Video in New Tab
                    </a>
                `;
            }
        } else {
            mediaModalBody.innerHTML = `
                <img src="${escapeHtml(url)}" alt="Screenshot Preview" class="media-preview-img" style="max-height: 70vh; max-width: 100%; border-radius: 8px; object-fit: contain;" onerror="this.src='logo.png';">
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="media-link-external">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Image Fullscreen
                </a>
            `;
        }

        mediaModal.classList.add('active');
    }

    function closeMediaModal() {
        if (!mediaModal) return;
        mediaModal.classList.remove('active');
        if (mediaModalBody) mediaModalBody.innerHTML = '';
    }

    if (mediaModalClose) mediaModalClose.addEventListener('click', closeMediaModal);
    if (mediaModal) {
        mediaModal.addEventListener('click', (e) => {
            if (e.target === mediaModal) closeMediaModal();
        });
    }

    // Markdown Parser with interactive Video & Image Chips
    function formatChatMarkdown(rawText) {
        if (!rawText) return '';

        // 1. First extract and protect code blocks
        const codeBlocks = [];
        let text = rawText.replace(/```([\s\S]*?)```/g, (m, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(escapeHtml(code.trim()));
            return `__CODE_BLOCK_${idx}__`;
        });

        // 2. Parse markdown links [label](url) -> interactive media chips if video/image
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
            const trimmedUrl = url.trim();
            const trimmedLabel = label.trim();
            if (isVideoLink(trimmedUrl, trimmedLabel)) {
                return `<button type="button" class="media-chip media-chip-video chat-media-btn" data-type="video" data-url="${escapeHtml(trimmedUrl)}" data-title="${escapeHtml(trimmedLabel)}"><i class="fa-solid fa-play"></i> ${escapeHtml(trimmedLabel)}</button>`;
            } else if (isImageLink(trimmedUrl, trimmedLabel)) {
                return `<button type="button" class="media-chip media-chip-image chat-media-btn" data-type="image" data-url="${escapeHtml(trimmedUrl)}" data-title="${escapeHtml(trimmedLabel)}"><i class="fa-solid fa-image"></i> ${escapeHtml(trimmedLabel)}</button>`;
            }
            return `<a href="${escapeHtml(trimmedUrl)}" target="_blank" rel="noopener noreferrer" class="chat-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${escapeHtml(trimmedLabel)}</a>`;
        });

        // 3. Headings
        text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');

        // 4. Bold & Inline Code
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 5. Bullet points
        text = text.replace(/^[*-] (.*)$/gm, '<div class="chat-bullet-row"><span class="chat-bullet">•</span><span>$1</span></div>');

        // 6. Paragraphs and breaks
        text = text.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');

        // 7. Restore code blocks
        codeBlocks.forEach((code, idx) => {
            text = text.replace(`__CODE_BLOCK_${idx}__`, `<pre class="code-block"><code>${code}</code></pre>`);
        });

        return text;
    }

    // Render User/Agent Message Bubble to DOM
    function appendMessageToDOM(sender, text) {
        const row = document.createElement('div');
        row.className = `message-row ${sender}`;

        const avatarIcon = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
        
        const formattedContent = sender === 'user'
            ? escapeHtml(text).replace(/\n/g, '<br>')
            : formatChatMarkdown(text);

        row.innerHTML = `
            <div class="avatar">${avatarIcon}</div>
            <div class="message-content">
                <div class="bubble">${formattedContent}</div>
            </div>
        `;

        // Bind interactive media preview buttons in chat
        row.querySelectorAll('.chat-media-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const type = btn.getAttribute('data-type');
                const url = btn.getAttribute('data-url');
                const title = btn.getAttribute('data-title');
                openMediaModal(type, url, title);
            });
        });

        // Intercept regular links if they point to videos or images
        row.querySelectorAll('a').forEach(anchor => {
            const href = anchor.getAttribute('href');
            if (href && (isVideoLink(href, anchor.textContent) || isImageLink(href, anchor.textContent))) {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isVid = isVideoLink(href, anchor.textContent);
                    openMediaModal(isVid ? 'video' : 'image', href, anchor.textContent || 'Media Preview');
                });
            }
        });

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
    // RAG Data Ingestion & Knowledge Base Dashboard Integration
    // =========================================================================

    // Navigation & Views
    const navBtnChat = document.getElementById('nav-btn-chat');
    const navBtnIngest = document.getElementById('nav-btn-ingest');
    const btnOpenIngest = document.getElementById('btn-open-ingest');
    const btnBackToChat = document.getElementById('btn-back-to-chat');
    const ingestSidebarToggle = document.getElementById('ingest-sidebar-toggle');
    const viewChat = document.getElementById('view-chat');
    const viewIngest = document.getElementById('view-ingest');

    // Badges & Stats
    const navRagBadge = document.getElementById('nav-rag-badge');
    const headerRagBadge = document.getElementById('header-rag-badge');
    const statTotalVectors = document.getElementById('stat-total-vectors');
    const statFeaturesCount = document.getElementById('stat-features-count');
    const statCardsCount = document.getElementById('stat-cards-count');
    const statTestdataCount = document.getElementById('stat-testdata-count');

    // Forms & Tabs
    const ingestTabBtns = document.querySelectorAll('.ingest-tab-btn');
    const formIngestFeature = document.getElementById('form-ingest-feature');
    const formIngestCard = document.getElementById('form-ingest-card');
    const formIngestTestdata = document.getElementById('form-ingest-testdata');

    // Semantic Search Tester
    const testerSearchInput = document.getElementById('tester-search-input');
    const btnTestSearch = document.getElementById('btn-test-search');
    const testerSearchResults = document.getElementById('tester-search-results');

    // Explorer Elements
    const kbFilterInput = document.getElementById('kb-filter-input');
    const kbCardsContainer = document.getElementById('kb-documents-container');
    const filterPills = document.querySelectorAll('.filter-pill');
    const countFilterAll = document.getElementById('count-filter-all');
    const countFilterFeature = document.getElementById('count-filter-feature');
    const countFilterCard = document.getElementById('count-filter-card');
    const countFilterTestdata = document.getElementById('count-filter-testdata');

    let currentKbFilter = 'all';
    let cachedDocuments = [];

    // View Switcher Function
    function switchMainView(viewName) {
        if (viewName === 'ingest') {
            if (viewChat) {
                viewChat.classList.remove('active');
                viewChat.style.display = 'none';
            }
            if (viewIngest) {
                viewIngest.classList.add('active');
                viewIngest.style.display = 'flex';
            }
            if (navBtnChat) navBtnChat.classList.remove('active');
            if (navBtnIngest) navBtnIngest.classList.add('active');

            // Refresh RAG stats & load indexed documents
            refreshRagStats();
            loadRagDocuments();
        } else {
            if (viewIngest) {
                viewIngest.classList.remove('active');
                viewIngest.style.display = 'none';
            }
            if (viewChat) {
                viewChat.classList.add('active');
                viewChat.style.display = 'flex';
            }
            if (navBtnIngest) navBtnIngest.classList.remove('active');
            if (navBtnChat) navBtnChat.classList.add('active');
        }

        // Close mobile sidebar if open
        closeSidebar();
    }

    if (navBtnChat) navBtnChat.addEventListener('click', () => switchMainView('chat'));
    if (navBtnIngest) navBtnIngest.addEventListener('click', () => switchMainView('ingest'));
    if (btnOpenIngest) btnOpenIngest.addEventListener('click', () => switchMainView('ingest'));
    if (btnBackToChat) btnBackToChat.addEventListener('click', () => switchMainView('chat'));
    if (ingestSidebarToggle) ingestSidebarToggle.addEventListener('click', openSidebar);

    // Toast Notification Utility
    function showRagToast(message, type = 'success') {
        const existingToast = document.querySelector('.rag-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `rag-toast toast-${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> <span>${escapeHtml(message)}</span>`;
        
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontFamily: 'var(--font-heading)',
            fontSize: '13.5px',
            fontWeight: '600',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: '9999',
            animation: 'fadeInView 0.25s ease-out'
        });

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // Ingest Tab Switcher
    ingestTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ingestTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.getAttribute('data-tab');
            if (formIngestFeature) formIngestFeature.style.display = tab === 'feature' ? 'flex' : 'none';
            if (formIngestCard) formIngestCard.style.display = tab === 'card' ? 'flex' : 'none';
            if (formIngestTestdata) formIngestTestdata.style.display = tab === 'testdata' ? 'flex' : 'none';
        });
    });

    // Ingest Feature Form Submit
    if (formIngestFeature) {
        formIngestFeature.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-feature');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vectorizing...';
            }

            const payload = {
                feature_name: document.getElementById('feature-name')?.value?.trim() || '',
                target_platform: document.getElementById('feature-platform')?.value || 'All Platforms',
                expected_behavior: document.getElementById('feature-expected')?.value?.trim() || '',
                potential_issues: document.getElementById('feature-issues')?.value?.trim() || '',
                things_to_observe: document.getElementById('feature-observe')?.value?.trim() || '',
                image_url: document.getElementById('feature-image')?.value?.trim() || '',
                video_url: document.getElementById('feature-video')?.value?.trim() || ''
            };

            try {
                const baseUrl = getServerUrl();
                const res = await fetch(`${baseUrl}/api/rag/ingest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity_type: 'feature', payload })
                });
                const data = await res.json();
                if (res.ok) {
                    showRagToast(`Feature "${payload.feature_name}" vectorized & indexed!`);
                    formIngestFeature.reset();
                    refreshRagStats();
                    loadRagDocuments();
                } else {
                    showRagToast(data.detail || 'Failed to vectorize feature', 'error');
                }
            } catch (err) {
                console.error('Error ingesting feature:', err);
                showRagToast('Failed to reach RAG server', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        });
    }

    // Ingest Card Form Submit
    if (formIngestCard) {
        formIngestCard.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-card');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vectorizing...';
            }

            const payload = {
                card_type: document.getElementById('card-type')?.value || 'Prop Gold',
                card_number: document.getElementById('card-number')?.value?.trim() || '',
                cid: document.getElementById('card-cid')?.value?.trim() || '',
                exp: document.getElementById('card-exp')?.value?.trim() || '',
                amount: document.getElementById('card-amount')?.value?.trim() || '',
                address: document.getElementById('card-address')?.value?.trim() || '',
                notes: document.getElementById('card-notes')?.value?.trim() || ''
            };

            try {
                const baseUrl = getServerUrl();
                const res = await fetch(`${baseUrl}/api/rag/ingest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity_type: 'card', payload })
                });
                const data = await res.json();
                if (res.ok) {
                    showRagToast(`Card (${payload.card_type}) vectorized & indexed!`);
                    formIngestCard.reset();
                    refreshRagStats();
                    loadRagDocuments();
                } else {
                    showRagToast(data.detail || 'Failed to vectorize card', 'error');
                }
            } catch (err) {
                console.error('Error ingesting card:', err);
                showRagToast('Failed to reach RAG server', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        });
    }

    // Ingest Test Data Form Submit
    if (formIngestTestdata) {
        formIngestTestdata.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-testdata');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vectorizing...';
            }

            const payload = {
                category: document.getElementById('testdata-category')?.value?.trim() || '',
                id: document.getElementById('testdata-id')?.value?.trim() || '',
                zip_code: document.getElementById('testdata-zip')?.value?.trim() || '',
                name: document.getElementById('testdata-name')?.value?.trim() || '',
                description: document.getElementById('testdata-desc')?.value?.trim() || ''
            };

            try {
                const baseUrl = getServerUrl();
                const res = await fetch(`${baseUrl}/api/rag/ingest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity_type: 'test_data', payload })
                });
                const data = await res.json();
                if (res.ok) {
                    showRagToast(`Test Data [${payload.category} - Web ID: ${payload.id}] vectorized!`);
                    formIngestTestdata.reset();
                    refreshRagStats();
                    loadRagDocuments();
                } else {
                    showRagToast(data.detail || 'Failed to vectorize test data', 'error');
                }
            } catch (err) {
                console.error('Error ingesting test data:', err);
                showRagToast('Failed to reach RAG server', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        });
    }

    // Explorer & Multi-Select DOM Elements
    const breakdownTagsContainer = document.getElementById('breakdown-tags-container');
    const selectAllVisible = document.getElementById('select-all-visible');
    const visibleCount = document.getElementById('visible-count');
    const selectedBadge = document.getElementById('selected-badge');
    const selectedCount = document.getElementById('selected-count');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    const btnSelectedNum = document.getElementById('btn-selected-num');
    const btnDeselectAll = document.getElementById('btn-deselect-all');

    // Delete Confirmation Modal Elements
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteConfirmMessage = document.getElementById('delete-confirm-message');
    const deleteConfirmList = document.getElementById('delete-confirm-list');
    const deleteConfirmClose = document.getElementById('delete-confirm-close');
    const deleteConfirmCancel = document.getElementById('delete-confirm-cancel');
    const deleteConfirmProceed = document.getElementById('delete-confirm-proceed');

    // Selection tracking set (document IDs)
    const selectedDocIds = new Set();
    let currentCategoryTagFilter = null;

    // Refresh RAG Stats, Badges & Content Composition Breakdown
    async function refreshRagStats() {
        try {
            const baseUrl = getServerUrl();
            const res = await fetch(`${baseUrl}/api/rag/stats`);
            if (!res.ok) return;
            const data = await res.json();

            if (navRagBadge) navRagBadge.textContent = data.total_vectors;
            if (headerRagBadge) headerRagBadge.textContent = data.total_vectors;
            if (statTotalVectors) statTotalVectors.textContent = data.total_vectors;
            if (statFeaturesCount) statFeaturesCount.textContent = data.features_count ?? data.features ?? 0;
            if (statCardsCount) statCardsCount.textContent = data.cards_count ?? data.cards ?? 0;
            if (statTestdataCount) statTestdataCount.textContent = data.test_data_count ?? data.test_data ?? 0;

            if (countFilterAll) countFilterAll.textContent = data.total_vectors;
            if (countFilterFeature) countFilterFeature.textContent = data.features_count ?? data.features ?? 0;
            if (countFilterCard) countFilterCard.textContent = data.cards_count ?? data.cards ?? 0;
            if (countFilterTestdata) countFilterTestdata.textContent = data.test_data_count ?? data.test_data ?? 0;

            // Render "What kind of data is present in the Vector DB"
            renderContentBreakdown(data);
        } catch (err) {
            console.error('Error fetching RAG stats:', err);
        }
    }

    function renderContentBreakdown(stats) {
        if (!breakdownTagsContainer) return;
        breakdownTagsContainer.innerHTML = '';

        const categories = stats.categories || {};
        const cardTypes = stats.card_types || {};
        const platforms = stats.platforms || {};

        function resetTypeFilterToAll() {
            currentKbFilter = 'all';
            filterPills.forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
            });
        }

        // 1. Add "Clear Tag Filter" chip if one is currently active
        if (currentCategoryTagFilter) {
            const clearTag = document.createElement('span');
            clearTag.className = 'breakdown-tag active';
            clearTag.innerHTML = `<i class="fa-solid fa-filter"></i> Filtering: <strong>${escapeHtml(currentCategoryTagFilter)}</strong> <i class="fa-solid fa-xmark" style="margin-left: 4px;"></i>`;
            clearTag.title = 'Click to clear this filter';
            clearTag.addEventListener('click', () => {
                currentCategoryTagFilter = null;
                if (kbFilterInput) kbFilterInput.value = '';
                filterAndRenderDocuments();
                refreshRagStats();
            });
            breakdownTagsContainer.appendChild(clearTag);
        }

        // 2. Render Category tags (Test Data)
        Object.entries(categories).forEach(([cat, count]) => {
            const tag = document.createElement('span');
            tag.className = `breakdown-tag ${currentCategoryTagFilter === cat ? 'active' : ''}`;
            tag.innerHTML = `<i class="fa-solid fa-box-archive" style="color: var(--accent-amber);"></i> ${escapeHtml(cat)} <span class="breakdown-tag-count">${count}</span>`;
            tag.title = `Filter by ${cat} (${count} items)`;
            tag.addEventListener('click', () => {
                if (currentCategoryTagFilter === cat) {
                    currentCategoryTagFilter = null;
                    if (kbFilterInput) kbFilterInput.value = '';
                } else {
                    currentCategoryTagFilter = cat;
                    if (kbFilterInput) kbFilterInput.value = cat;
                    resetTypeFilterToAll();
                }
                filterAndRenderDocuments();
                renderContentBreakdown(stats);
            });
            breakdownTagsContainer.appendChild(tag);
        });

        // 3. Render Card Type tags
        Object.entries(cardTypes).forEach(([ctype, count]) => {
            const tag = document.createElement('span');
            tag.className = `breakdown-tag ${currentCategoryTagFilter === ctype ? 'active' : ''}`;
            tag.innerHTML = `<i class="fa-solid fa-credit-card" style="color: var(--accent-emerald);"></i> ${escapeHtml(ctype)} <span class="breakdown-tag-count">${count}</span>`;
            tag.title = `Filter by ${ctype} (${count} cards)`;
            tag.addEventListener('click', () => {
                if (currentCategoryTagFilter === ctype) {
                    currentCategoryTagFilter = null;
                    if (kbFilterInput) kbFilterInput.value = '';
                } else {
                    currentCategoryTagFilter = ctype;
                    if (kbFilterInput) kbFilterInput.value = ctype;
                    resetTypeFilterToAll();
                }
                filterAndRenderDocuments();
                renderContentBreakdown(stats);
            });
            breakdownTagsContainer.appendChild(tag);
        });

        // 4. Render Feature Platform tags
        Object.entries(platforms).forEach(([plat, count]) => {
            const tag = document.createElement('span');
            tag.className = `breakdown-tag ${currentCategoryTagFilter === plat ? 'active' : ''}`;
            tag.innerHTML = `<i class="fa-solid fa-rocket" style="color: var(--accent-purple);"></i> ${escapeHtml(plat)} <span class="breakdown-tag-count">${count}</span>`;
            tag.title = `Filter by ${plat} (${count} features)`;
            tag.addEventListener('click', () => {
                if (currentCategoryTagFilter === plat) {
                    currentCategoryTagFilter = null;
                    if (kbFilterInput) kbFilterInput.value = '';
                } else {
                    currentCategoryTagFilter = plat;
                    if (kbFilterInput) kbFilterInput.value = plat;
                    resetTypeFilterToAll();
                }
                filterAndRenderDocuments();
                renderContentBreakdown(stats);
            });
            breakdownTagsContainer.appendChild(tag);
        });
    }

    // Semantic Search Tester Execution
    async function executeSemanticTesterSearch() {
        const query = testerSearchInput ? testerSearchInput.value.trim() : '';
        if (!query) {
            if (testerSearchResults) {
                testerSearchResults.innerHTML = '<span class="tray-placeholder">Please enter a search term above.</span>';
            }
            return;
        }

        if (btnTestSearch) {
            btnTestSearch.disabled = true;
            btnTestSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching ChromaDB...';
        }

        try {
            const baseUrl = getServerUrl();
            const res = await fetch(`${baseUrl}/api/rag/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 5 })
            });
            const data = await res.json();
            if (!res.ok || !data.results || data.results.length === 0) {
                if (testerSearchResults) {
                    testerSearchResults.innerHTML = '<span class="tray-placeholder">No matching vectors found in ChromaDB. Try searching for "macys card" or "BOPS".</span>';
                }
                return;
            }

            renderTesterSearchResults(data.results);
        } catch (err) {
            console.error('Search tester error:', err);
            if (testerSearchResults) {
                testerSearchResults.innerHTML = '<span class="tray-placeholder">Failed to execute semantic search. Check server connectivity.</span>';
            }
        } finally {
            if (btnTestSearch) {
                btnTestSearch.disabled = false;
                btnTestSearch.innerHTML = '<i class="fa-solid fa-search"></i> Search Vectors';
            }
        }
    }

    function renderTesterSearchResults(results) {
        if (!testerSearchResults) return;
        testerSearchResults.innerHTML = '';

        results.forEach(item => {
            const score = typeof item.score === 'number' ? item.score : 0;
            const scoreClass = score >= 0.75 ? 'score-high' : (score >= 0.65 ? 'score-mid' : 'score-low');
            const scorePercent = Math.round(score * 100);

            const div = document.createElement('div');
            div.className = 'search-result-item';

            const metadata = item.metadata || {};
            const entityType = item.type || metadata.entity_type || 'unknown';
            const title = metadata.feature_name || metadata.card_type || metadata.name || metadata.category || item.title || item.id;

            let mediaChips = '';
            if (metadata.video_url) {
                mediaChips += `<button class="media-chip media-chip-video" data-video="${escapeHtml(metadata.video_url)}" data-title="${escapeHtml(title)}"><i class="fa-solid fa-play"></i> Watch Video Demo</button>`;
            }
            if (metadata.image_url) {
                mediaChips += `<button class="media-chip media-chip-image" data-image="${escapeHtml(metadata.image_url)}" data-title="${escapeHtml(title)}"><i class="fa-solid fa-image"></i> View Screenshot</button>`;
            }

            div.innerHTML = `
                <div class="result-item-header">
                    <div class="result-item-title">
                        <span class="kb-type-pill kb-type-${entityType}">${entityType.replace('_', ' ')}</span>
                        <span>${escapeHtml(title)}</span>
                    </div>
                    <span class="score-pill ${scoreClass}"><i class="fa-solid fa-bullseye"></i> ${score.toFixed(3)} (${scorePercent}%)</span>
                </div>
                <div class="result-item-body">${escapeHtml(item.chunk_text)}</div>
                ${mediaChips ? `<div class="kb-media-links">${mediaChips}</div>` : ''}
            `;

            // Attach media preview listeners
            div.querySelectorAll('.media-chip-video').forEach(btn => {
                btn.addEventListener('click', () => {
                    openMediaModal('video', btn.getAttribute('data-video'), btn.getAttribute('data-title'));
                });
            });
            div.querySelectorAll('.media-chip-image').forEach(btn => {
                btn.addEventListener('click', () => {
                    openMediaModal('image', btn.getAttribute('data-image'), btn.getAttribute('data-title'));
                });
            });

            testerSearchResults.appendChild(div);
        });
    }

    if (btnTestSearch) btnTestSearch.addEventListener('click', executeSemanticTesterSearch);
    if (testerSearchInput) {
        testerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSemanticTesterSearch();
            }
        });
    }

    // ChromaDB KB Explorer: Load, Filter & Render with Multi-Select
    async function loadRagDocuments() {
        if (!kbCardsContainer) return;
        try {
            const baseUrl = getServerUrl();
            const res = await fetch(`${baseUrl}/api/rag/documents`);
            if (!res.ok) return;
            const data = await res.json();
            cachedDocuments = data.documents || [];
            filterAndRenderDocuments();
        } catch (err) {
            console.error('Error loading documents from ChromaDB:', err);
        }
    }

    function getCurrentlyFilteredDocs() {
        const query = kbFilterInput ? kbFilterInput.value.trim().toLowerCase() : '';

        return cachedDocuments.filter(doc => {
            if (currentKbFilter !== 'all' && doc.type !== currentKbFilter) {
                return false;
            }
            if (!query) return true;

            const textMatch = (doc.chunk_text || '').toLowerCase().includes(query);
            const titleMatch = (doc.title || '').toLowerCase().includes(query);
            const idMatch = (doc.id || '').toLowerCase().includes(query);
            const metaMatch = JSON.stringify(doc.metadata || {}).toLowerCase().includes(query);
            return textMatch || titleMatch || idMatch || metaMatch;
        });
    }

    function filterAndRenderDocuments() {
        if (!kbCardsContainer) return;
        const filtered = getCurrentlyFilteredDocs();

        if (visibleCount) {
            visibleCount.textContent = filtered.length;
        }

        if (filtered.length === 0) {
            kbCardsContainer.innerHTML = '<span class="tray-placeholder">No documents matching current filter in ChromaDB.</span>';
            updateSelectionUI();
            return;
        }

        kbCardsContainer.innerHTML = '';
        filtered.forEach(doc => {
            const card = createDocumentCard(doc);
            kbCardsContainer.appendChild(card);
        });

        updateSelectionUI();
    }

    function updateSelectionUI() {
        const filtered = getCurrentlyFilteredDocs();
        const count = selectedDocIds.size;

        if (selectedBadge) {
            selectedBadge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
        if (selectedCount) {
            selectedCount.textContent = count;
        }
        if (btnDeleteSelected) {
            btnDeleteSelected.style.display = count > 0 ? 'inline-flex' : 'none';
        }
        if (btnSelectedNum) {
            btnSelectedNum.textContent = count;
        }
        if (btnDeselectAll) {
            btnDeselectAll.style.display = count > 0 ? 'inline-flex' : 'none';
        }

        // Synchronize master checkbox
        if (selectAllVisible) {
            if (filtered.length === 0) {
                selectAllVisible.checked = false;
                selectAllVisible.indeterminate = false;
            } else {
                const visibleSelectedCount = filtered.filter(d => selectedDocIds.has(d.id)).length;
                if (visibleSelectedCount === 0) {
                    selectAllVisible.checked = false;
                    selectAllVisible.indeterminate = false;
                } else if (visibleSelectedCount === filtered.length) {
                    selectAllVisible.checked = true;
                    selectAllVisible.indeterminate = false;
                } else {
                    selectAllVisible.checked = false;
                    selectAllVisible.indeterminate = true;
                }
            }
        }
    }

    function createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'kb-doc-card';
        card.setAttribute('data-id', doc.id);

        const metadata = doc.metadata || {};
        const entityType = doc.type || 'unknown';
        const title = metadata.feature_name || metadata.card_type || metadata.name || metadata.category || doc.title || doc.id;
        const isChecked = selectedDocIds.has(doc.id);

        // Metadata badges
        let tagsHtml = '';
        if (metadata.category) tagsHtml += `<span class="kb-meta-tag">Cat: ${escapeHtml(metadata.category)}</span>`;
        if (metadata.product_id || metadata.id) tagsHtml += `<span class="kb-meta-tag">Web ID: ${escapeHtml(metadata.product_id || metadata.id)}</span>`;
        if (metadata.card_type) tagsHtml += `<span class="kb-meta-tag">${escapeHtml(metadata.card_type)}</span>`;
        if (metadata.zip_code) tagsHtml += `<span class="kb-meta-tag">Zip: ${escapeHtml(metadata.zip_code)}</span>`;
        if (metadata.target_platform || metadata.platform) tagsHtml += `<span class="kb-meta-tag">${escapeHtml(metadata.target_platform || metadata.platform)}</span>`;

        // Media links
        let mediaChips = '';
        if (metadata.video_url) {
            mediaChips += `<button class="media-chip media-chip-video" data-video="${escapeHtml(metadata.video_url)}" data-title="${escapeHtml(title)}"><i class="fa-solid fa-play"></i> Video Demo</button>`;
        }
        if (metadata.image_url) {
            mediaChips += `<button class="media-chip media-chip-image" data-image="${escapeHtml(metadata.image_url)}" data-title="${escapeHtml(title)}"><i class="fa-solid fa-image"></i> Screenshot</button>`;
        }

        card.innerHTML = `
            <div class="kb-card-top">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="doc-card-checkbox">
                        <input type="checkbox" class="doc-select-checkbox" data-id="${escapeHtml(doc.id)}" ${isChecked ? 'checked' : ''} title="Select item for deletion">
                    </div>
                    <span class="kb-type-pill kb-type-${entityType}">${entityType.replace('_', ' ')}</span>
                </div>
                <div class="kb-card-actions">
                    <button class="btn-delete-doc" data-id="${escapeHtml(doc.id)}" title="Delete this single vector from ChromaDB">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <div class="kb-card-title">${escapeHtml(title)}</div>
            ${tagsHtml ? `<div class="kb-meta-badges">${tagsHtml}</div>` : ''}
            <div class="kb-chunk-preview">${escapeHtml(doc.chunk_text)}</div>
            ${mediaChips ? `<div class="kb-media-links">${mediaChips}</div>` : ''}
        `;

        // Individual item checkbox listener
        const checkbox = card.querySelector('.doc-select-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedDocIds.add(doc.id);
                } else {
                    selectedDocIds.delete(doc.id);
                }
                updateSelectionUI();
            });
        }

        // Single delete button listener
        const deleteBtn = card.querySelector('.btn-delete-doc');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`Delete vector document "${title}" from ChromaDB?`)) return;
                try {
                    const baseUrl = getServerUrl();
                    const res = await fetch(`${baseUrl}/api/rag/documents/${encodeURIComponent(doc.id)}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        showRagToast('Document removed from ChromaDB');
                        selectedDocIds.delete(doc.id);
                        refreshRagStats();
                        loadRagDocuments();
                    } else {
                        showRagToast('Failed to delete document', 'error');
                    }
                } catch (err) {
                    console.error('Delete error:', err);
                    showRagToast('Error contacting server', 'error');
                }
            });
        }

        // Media preview chips listener
        card.querySelectorAll('.media-chip-video').forEach(btn => {
            btn.addEventListener('click', () => {
                openMediaModal('video', btn.getAttribute('data-video'), btn.getAttribute('data-title'));
            });
        });
        card.querySelectorAll('.media-chip-image').forEach(btn => {
            btn.addEventListener('click', () => {
                openMediaModal('image', btn.getAttribute('data-image'), btn.getAttribute('data-title'));
            });
        });

        return card;
    }

    // "Select All Visible" master checkbox listener
    if (selectAllVisible) {
        selectAllVisible.addEventListener('change', (e) => {
            const filtered = getCurrentlyFilteredDocs();
            if (e.target.checked) {
                filtered.forEach(d => selectedDocIds.add(d.id));
            } else {
                filtered.forEach(d => selectedDocIds.delete(d.id));
            }
            // Update individual card checkboxes
            document.querySelectorAll('.doc-select-checkbox').forEach(cb => {
                const id = cb.getAttribute('data-id');
                cb.checked = selectedDocIds.has(id);
            });
            updateSelectionUI();
        });
    }

    // "Clear Selection" button listener
    if (btnDeselectAll) {
        btnDeselectAll.addEventListener('click', () => {
            selectedDocIds.clear();
            document.querySelectorAll('.doc-select-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectionUI();
        });
    }

    // "Delete Selected" batch action listener (Opens Confirmation Modal)
    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            if (selectedDocIds.size === 0) return;

            if (deleteConfirmMessage) {
                deleteConfirmMessage.innerHTML = `Are you sure you want to delete <strong>${selectedDocIds.size} selected document(s)</strong> from ChromaDB?`;
            }

            if (deleteConfirmList) {
                deleteConfirmList.innerHTML = '';
                const selectedDocs = cachedDocuments.filter(d => selectedDocIds.has(d.id));
                selectedDocs.forEach(d => {
                    const row = document.createElement('div');
                    row.className = 'delete-item-row';
                    const title = d.title || d.id;
                    row.innerHTML = `<i class="fa-solid fa-circle-minus"></i> <span>[${d.type.toUpperCase()}] ${escapeHtml(title)}</span>`;
                    deleteConfirmList.appendChild(row);
                });
            }

            if (deleteConfirmModal) {
                deleteConfirmModal.classList.add('active');
            }
        });
    }

    // Modal Close & Cancel listeners
    function closeDeleteConfirmModal() {
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.remove('active');
        }
    }

    if (deleteConfirmClose) deleteConfirmClose.addEventListener('click', closeDeleteConfirmModal);
    if (deleteConfirmCancel) deleteConfirmCancel.addEventListener('click', closeDeleteConfirmModal);
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
        });
    }

    // Modal "Delete from ChromaDB" proceed listener
    if (deleteConfirmProceed) {
        deleteConfirmProceed.addEventListener('click', async () => {
            if (selectedDocIds.size === 0) {
                closeDeleteConfirmModal();
                return;
            }

            const idsToDelete = Array.from(selectedDocIds);
            const originalHtml = deleteConfirmProceed.innerHTML;
            deleteConfirmProceed.disabled = true;
            deleteConfirmProceed.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting from ChromaDB...';

            try {
                const baseUrl = getServerUrl();
                const res = await fetch(`${baseUrl}/api/rag/documents/batch-delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete })
                });
                const data = await res.json();
                if (res.ok) {
                    showRagToast(`Deleted ${data.deleted_count || idsToDelete.length} documents from ChromaDB`);
                    selectedDocIds.clear();
                    closeDeleteConfirmModal();
                    refreshRagStats();
                    loadRagDocuments();
                } else {
                    showRagToast(data.detail || 'Failed to delete documents', 'error');
                }
            } catch (err) {
                console.error('Batch delete error:', err);
                showRagToast('Error contacting server', 'error');
            } finally {
                deleteConfirmProceed.disabled = false;
                deleteConfirmProceed.innerHTML = originalHtml;
            }
        });
    }

    // Filter pill listeners
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentKbFilter = pill.getAttribute('data-filter') || 'all';
            filterAndRenderDocuments();
        });
    });

    if (kbFilterInput) {
        kbFilterInput.addEventListener('input', () => {
            filterAndRenderDocuments();
        });
    }


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

        // Initial RAG Stats & Documents Preload
        refreshRagStats();
        loadRagDocuments();

        // Background server session synchronization
        syncServerSessions();
    }

    // Bootstrapping
    initActiveUserSession();
});
