/**
 * EduAssist Application Controller
 * Handles UI interactions, message rendering, dynamic analytics,
 * modal dialogs, and engine state coordination.
 */

(function () {
  'use strict';

  // DOM Element References
  const dom = {
    chatMessages: document.getElementById('chatMessages'),
    emptyState: document.getElementById('emptyState'),
    typingIndicator: document.getElementById('typingIndicator'),
    messageInput: document.getElementById('messageInput'),
    btnSend: document.getElementById('btnSend'),
    charCounter: document.getElementById('charCounter'),
    
    // Inspector elements
    inspectMessage: document.getElementById('inspectMessage'),
    inspectIntent: document.getElementById('inspectIntent'),
    confidenceFill: document.getElementById('confidenceFill'),
    confidenceValText: document.getElementById('confidenceValText'),
    inspectTone: document.getElementById('inspectTone'),
    inspectKeywords: document.getElementById('inspectKeywords'),
    
    // Dashboard stats
    statTotalMsgs: document.getElementById('statTotalMsgs'),
    statStudentMsgs: document.getElementById('statStudentMsgs'),
    statBotMsgs: document.getElementById('statBotMsgs'),
    statDominantTone: document.getElementById('statDominantTone'),
    statDuration: document.getElementById('statDuration'),
    intentDistList: document.getElementById('intentDistList'),
    
    // Header actions
    engineModeBadge: document.getElementById('engineModeBadge'),
    engineModeText: document.getElementById('engineModeText'),
    currentEngineDetailsText: document.getElementById('currentEngineDetailsText'),
    btnAnalyze: document.getElementById('btnAnalyze'),
    btnDemo: document.getElementById('btnDemo'),
    btnPrint: document.getElementById('btnPrint'),
    btnClear: document.getElementById('btnClear'),
    
    // Modals
    modalClear: document.getElementById('modalClear'),
    btnConfirmClear: document.getElementById('btnConfirmClear'),
    modalAnalysis: document.getElementById('modalAnalysis'),
    analysisModalBody: document.getElementById('analysisModalBody'),
    btnExportAnalysis: document.getElementById('btnExportAnalysis'),
    modalEngineInfo: document.getElementById('modalEngineInfo'),
    
    // Print header elements
    printDate: document.getElementById('printDate'),
    printTotalMsgs: document.getElementById('printTotalMsgs'),
    printPrimaryIntent: document.getElementById('printPrimaryIntent'),
    printTone: document.getElementById('printTone'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  let isProcessing = false;

  // ============================================================================
  // Initialization
  // ============================================================================
  async function init() {
    setupEventListeners();

    // Register engine mode listener
    window.apiClient.onModeChange(updateEngineUI);

    // Initialize API client
    await window.apiClient.init();

    // Fetch initial state
    await refreshConversationAndStats();
  }

  function updateEngineUI(mode) {
    if (mode === 'flask') {
      dom.engineModeText.textContent = "Flask REST API";
      dom.engineModeBadge.style.backgroundColor = "#ecfdf5";
      dom.engineModeBadge.style.color = "#065f46";
      dom.engineModeBadge.style.borderColor = "#a7f3d0";
      dom.currentEngineDetailsText.textContent = "Python 3 + Flask REST API (Active)";
    } else {
      dom.engineModeText.textContent = "Client TSA Engine (Demo)";
      dom.engineModeBadge.style.backgroundColor = "#eff6ff";
      dom.engineModeBadge.style.color = "#1d4ed8";
      dom.engineModeBadge.style.borderColor = "#bfdbfe";
      dom.currentEngineDetailsText.textContent = "Browser-Side TSA Engine (Zero-Backend Static Parity Mode)";
    }
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================
  function setupEventListeners() {
    // Send message on click
    dom.btnSend.addEventListener('click', handleSendMessage);

    // Send message on Enter
    dom.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Character counter
    dom.messageInput.addEventListener('input', () => {
      const len = dom.messageInput.value.length;
      dom.charCounter.textContent = `${len} / 1000`;
    });

    // Suggested questions buttons
    document.querySelectorAll('.suggested-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query) {
          dom.messageInput.value = query;
          handleSendMessage();
        }
      });
    });

    // Header actions
    dom.engineModeBadge.addEventListener('click', () => openModal(dom.modalEngineInfo));
    dom.btnClear.addEventListener('click', () => openModal(dom.modalClear));
    dom.btnConfirmClear.addEventListener('click', handleClearConversation);
    dom.btnDemo.addEventListener('click', handleLoadDemo);
    dom.btnAnalyze.addEventListener('click', handleAnalyzeConversation);
    dom.btnPrint.addEventListener('click', handlePrintReport);
    dom.btnExportAnalysis.addEventListener('click', handlePrintReport);

    // Close buttons on modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    });

    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m));
      }
    });
  }

  // ============================================================================
  // Chat Message Sending & Processing
  // ============================================================================
  async function handleSendMessage() {
    if (isProcessing) return;

    const rawText = dom.messageInput.value.trim();
    if (!rawText) return;

    if (rawText.length > 1000) {
      showToast("Message exceeds maximum length of 1000 characters", "error");
      return;
    }

    isProcessing = true;
    dom.btnSend.disabled = true;
    dom.messageInput.value = '';
    dom.charCounter.textContent = '0 / 1000';

    // Remove empty state if visible
    if (dom.emptyState) {
      dom.emptyState.style.display = 'none';
    }

    // Append optimistic student bubble
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMessageBubble({
      sender: "student",
      text: rawText,
      timestamp: timeStr,
      intent: null,
      confidence: null,
      tone: null
    });

    // Show typing indicator
    showTyping(true);
    scrollToBottom();

    try {
      const response = await window.apiClient.sendMessage(rawText);
      showTyping(false);

      if (response && response.success) {
        // Append bot bubble
        appendMessageBubble({
          sender: "bot",
          text: response.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          follow_ups: response.follow_ups || []
        });

        // Update Text Analysis Panel
        updateInspector({
          message: rawText,
          intent: response.intent_label || response.intent,
          confidence: response.confidence,
          tone: response.tone,
          keywords: response.keywords
        });

        // Refresh dashboard statistics
        await refreshDashboardOnly();
      } else {
        throw new Error(response.error || "Unable to process message");
      }
    } catch (err) {
      showTyping(false);
      showToast(err.message || "Unable to process your message. Please try again.", "error");
      appendMessageBubble({
        sender: "bot",
        text: "I encountered an issue processing your question. Please try asking again or select a suggested topic.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        follow_ups: ["How should I prepare for exams?", "Help me create a study plan"]
      });
    } finally {
      isProcessing = false;
      dom.btnSend.disabled = false;
      scrollToBottom();
      dom.messageInput.focus();
    }
  }

  // ============================================================================
  // Rendering Message Bubbles
  // ============================================================================
  function appendMessageBubble(msg) {
    const isStudent = msg.sender === 'student';
    const row = document.createElement('div');
    row.className = `message-row ${isStudent ? 'student' : 'bot'}`;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `avatar ${isStudent ? 'avatar-student' : 'avatar-bot'}`;
    avatar.textContent = isStudent ? 'ST' : 'EA';

    // Body
    const body = document.createElement('div');
    body.className = 'message-body';

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessageText(msg.text);
    body.appendChild(bubble);

    // Metadata
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = msg.timestamp || '';
    meta.appendChild(timeSpan);

    if (isStudent && msg.intent) {
      const intentTag = document.createElement('span');
      intentTag.className = 'tag-badge tag-intent';
      intentTag.textContent = msg.intent.replace(/_/g, ' ');
      meta.appendChild(intentTag);

      if (msg.tone) {
        const toneTag = document.createElement('span');
        toneTag.className = `tag-badge tag-tone-${msg.tone}`;
        toneTag.textContent = msg.tone;
        meta.appendChild(toneTag);
      }
    }

    body.appendChild(meta);

    // Follow up suggestion chips (for bot responses)
    if (!isStudent && msg.follow_ups && msg.follow_ups.length > 0) {
      const chipContainer = document.createElement('div');
      chipContainer.className = 'follow-up-container';

      msg.follow_ups.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'follow-up-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => {
          dom.messageInput.value = text;
          handleSendMessage();
        });
        chipContainer.appendChild(chip);
      });
      body.appendChild(chipContainer);
    }

    row.appendChild(avatar);
    row.appendChild(body);
    dom.chatMessages.appendChild(row);
  }

  function formatMessageText(text) {
    if (!text) return '';
    // Escape HTML
    let safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Markdown bold: **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Numbered lists
    safe = safe.replace(/(\n\d+\.\s.*)/g, (match) => {
      const lines = match.trim().split('\n');
      const items = lines.map(line => `<li>${line.replace(/^\d+\.\s*/, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    });

    // Bullet points
    safe = safe.replace(/(\n•\s.*)/g, (match) => {
      const lines = match.trim().split('\n');
      const items = lines.map(line => `<li>${line.replace(/^[•\-]\s*/, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    });

    // Convert newlines to paragraphs
    const paragraphs = safe.split(/\n\n+/);
    return paragraphs.map(p => {
      if (p.startsWith('<ol>') || p.startsWith('<ul>')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  function showTyping(show) {
    dom.typingIndicator.className = show ? 'typing-indicator active' : 'typing-indicator';
  }

  function scrollToBottom() {
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  // ============================================================================
  // Text Analysis Inspector & Dashboard Updaters
  // ============================================================================
  function updateInspector(data) {
    // Message snippet
    dom.inspectMessage.textContent = `"${data.message || 'Awaiting inquiry...'}"`;

    // Intent
    const intentLabel = data.intent || 'None';
    dom.inspectIntent.innerHTML = `<span class="tag-badge tag-intent">${escapeHtml(intentLabel)}</span>`;

    // Confidence
    const confVal = data.confidence ? Math.round(data.confidence * 100) : 0;
    dom.confidenceFill.style.width = `${confVal}%`;
    dom.confidenceValText.textContent = `${confVal}%`;

    // Tone
    const toneVal = data.tone || 'neutral';
    dom.inspectTone.innerHTML = `<span class="tag-badge tag-tone-${toneVal}">${escapeHtml(toneVal.charAt(0).toUpperCase() + toneVal.slice(1))}</span>`;

    // Keywords
    dom.inspectKeywords.innerHTML = '';
    const keywords = data.keywords || [];
    if (keywords.length > 0) {
      keywords.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.textContent = kw;
        dom.inspectKeywords.appendChild(tag);
      });
    } else {
      dom.inspectKeywords.innerHTML = '<span class="keyword-tag">None</span>';
    }
  }

  async function refreshDashboardOnly() {
    try {
      const dash = await window.apiClient.getDashboard();
      if (dash && dash.analytics) {
        renderDashboard(dash.analytics);
      }
    } catch (e) {
      console.error("Dashboard refresh error:", e);
    }
  }

  async function refreshConversationAndStats() {
    try {
      const [convRes, dashRes] = await Promise.all([
        window.apiClient.getConversation(),
        window.apiClient.getDashboard()
      ]);

      const messages = (convRes && convRes.messages) ? convRes.messages : [];
      renderConversationThread(messages);

      if (dashRes && dashRes.analytics) {
        renderDashboard(dashRes.analytics);
      }

      // If messages exist, update inspector with latest student message
      const studentMsgs = messages.filter(m => m.sender === 'student');
      if (studentMsgs.length > 0) {
        const last = studentMsgs[studentMsgs.length - 1];
        updateInspector({
          message: last.text,
          intent: last.intent ? last.intent.replace(/_/g, ' ') : 'None',
          confidence: last.confidence,
          tone: last.tone,
          keywords: last.keywords
        });
      }
    } catch (err) {
      console.error("Initialization load failed:", err);
    }
  }

  function renderConversationThread(messages) {
    dom.chatMessages.innerHTML = '';
    if (!messages || messages.length === 0) {
      dom.emptyState.style.display = 'flex';
      dom.chatMessages.appendChild(dom.emptyState);
      return;
    }

    dom.emptyState.style.display = 'none';
    messages.forEach(msg => appendMessageBubble(msg));
    scrollToBottom();
  }

  function renderDashboard(analytics) {
    dom.statTotalMsgs.textContent = analytics.total_messages || 0;
    dom.statStudentMsgs.textContent = analytics.student_messages || 0;
    dom.statBotMsgs.textContent = analytics.bot_responses || 0;
    dom.statDominantTone.textContent = (analytics.current_tone || 'Neutral').charAt(0).toUpperCase() + (analytics.current_tone || 'neutral').slice(1);
    dom.statDuration.textContent = `${analytics.session_duration || '0s'} active`;

    // Render Intent Distribution Chart Bars
    dom.intentDistList.innerHTML = '';
    const dist = analytics.intent_distribution || {};
    const keys = Object.keys(dist);

    if (keys.length === 0) {
      dom.intentDistList.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--color-text-muted); text-align: center; padding: 20px 0;">
          No intents detected yet
        </div>
      `;
      return;
    }

    const maxCount = Math.max(...Object.values(dist), 1);
    const totalStudent = analytics.student_messages || 1;

    keys.forEach(k => {
      const count = dist[k];
      const pct = Math.round((count / totalStudent) * 100);
      const barPct = Math.round((count / maxCount) * 100);
      const friendlyName = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const item = document.createElement('div');
      item.className = 'distribution-item';
      item.innerHTML = `
        <div class="dist-header">
          <span>${escapeHtml(friendlyName)}</span>
          <span><strong>${count}</strong> (${pct}%)</span>
        </div>
        <div class="dist-bar-track">
          <div class="dist-bar-fill" style="width: ${barPct}%;"></div>
        </div>
      `;
      dom.intentDistList.appendChild(item);
    });
  }

  // ============================================================================
  // Header Actions: Clear, Demo, Analyze, Print
  // ============================================================================
  async function handleClearConversation() {
    try {
      await window.apiClient.clearConversation();
      closeModal(dom.modalClear);
      renderConversationThread([]);
      updateInspector({
        message: 'Awaiting student inquiry...',
        intent: 'None',
        confidence: 0,
        tone: 'neutral',
        keywords: []
      });
      await refreshDashboardOnly();
      showToast("Conversation cleared successfully", "success");
    } catch (e) {
      showToast("Failed to clear conversation", "error");
    }
  }

  async function handleLoadDemo() {
    try {
      showToast("Loading demo conversation...", "success");
      const res = await window.apiClient.loadDemoConversation();
      if (res && res.messages) {
        renderConversationThread(res.messages);
      }
      if (res && res.analytics) {
        renderDashboard(res.analytics);
      }

      const studentMsgs = (res.messages || []).filter(m => m.sender === 'student');
      if (studentMsgs.length > 0) {
        const last = studentMsgs[studentMsgs.length - 1];
        updateInspector({
          message: last.text,
          intent: last.intent ? last.intent.replace(/_/g, ' ') : 'None',
          confidence: last.confidence,
          tone: last.tone,
          keywords: last.keywords
        });
      }
      showToast("Demo conversation loaded successfully", "success");
    } catch (e) {
      showToast("Failed to load demo conversation", "error");
    }
  }

  async function handleAnalyzeConversation() {
    try {
      const res = await window.apiClient.analyzeConversation();
      if (!res || !res.analysis) {
        showToast("No analysis available", "error");
        return;
      }
      const data = res.analysis;

      let topicsHtml = '<p style="color: var(--color-text-muted);">None identified yet</p>';
      if (data.key_topics && data.key_topics.length > 0) {
        topicsHtml = `
          <div class="keyword-tags-wrap" style="margin-top: 6px;">
            ${data.key_topics.map(t => `<span class="keyword-tag" style="background-color: #e0e7ff; color: #3730a3; font-weight: 600;">${escapeHtml(t)}</span>`).join('')}
          </div>
        `;
      }

      dom.analysisModalBody.innerHTML = `
        <div style="background-color: #f8fafc; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
          <h4 style="font-size: 0.92rem; color: var(--color-text-primary); margin-bottom: 6px;">Executive Counseling Summary</h4>
          <p style="font-size: 0.85rem; line-height: 1.55; color: var(--color-text-secondary);">${escapeHtml(data.summary_text)}</p>
        </div>

        <div class="dashboard-grid" style="margin-bottom: 14px;">
          <div class="stat-card">
            <span class="stat-label">Primary Topic</span>
            <span class="stat-value" style="font-size: 1.05rem;">${escapeHtml(data.primary_intent || 'None')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Dominant Tone</span>
            <span class="stat-value" style="font-size: 1.05rem;">${escapeHtml(data.dominant_tone || 'Neutral')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Messages</span>
            <span class="stat-value">${data.total_messages || 0}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Generated Timestamp</span>
            <span class="stat-value" style="font-size: 0.75rem; color: var(--color-text-muted);">${escapeHtml(data.generated_at || '-')}</span>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <div class="inspect-label">Key Topics Identified</div>
          ${topicsHtml}
        </div>
      `;

      openModal(dom.modalAnalysis);
    } catch (e) {
      showToast("Failed to analyze conversation", "error");
    }
  }

  async function handlePrintReport() {
    try {
      const [dash, conv] = await Promise.all([
        window.apiClient.getDashboard(),
        window.apiClient.getConversation()
      ]);

      const analytics = dash.analytics || {};
      dom.printDate.textContent = new Date().toLocaleString();
      dom.printTotalMsgs.textContent = analytics.total_messages || 0;
      dom.printPrimaryIntent.textContent = (analytics.most_common_intent || 'None').replace(/_/g, ' ');
      dom.printTone.textContent = (analytics.current_tone || 'Neutral').toUpperCase();

      window.print();
    } catch (e) {
      window.print();
    }
  }

  // ============================================================================
  // Modal Helpers
  // ============================================================================
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ============================================================================
  // Toast Helper
  // ============================================================================
  function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
    toast.textContent = message;

    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
