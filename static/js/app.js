/**
 * EduAssist Application Controller
 * Handles UI interactions, animated message streaming, dynamic analytics,
 * audio chime synthesis, theme management, and modal dialogs.
 */

(function () {
  'use strict';

  // DOM Element References
  const dom = {
    htmlRoot: document.documentElement,
    chatMessages: document.getElementById('chatMessages'),
    emptyState: document.getElementById('emptyState'),
    typingIndicator: document.getElementById('typingIndicator'),
    messageInput: document.getElementById('messageInput'),
    btnSend: document.getElementById('btnSend'),
    charCounter: document.getElementById('charCounter'),
    
    // Toggles
    btnSoundToggle: document.getElementById('btnSoundToggle'),
    soundIcon: document.getElementById('soundIcon'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeIconSun: document.getElementById('themeIconSun'),

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
    btnRestore: document.getElementById('btnRestore'),

    // Panel 4 Sentiment Donut & Spectrum Elements
    donutSegmentPositive: document.getElementById('donutSegmentPositive'),
    donutSegmentNeutral: document.getElementById('donutSegmentNeutral'),
    donutSegmentConcerned: document.getElementById('donutSegmentConcerned'),
    donutSegmentFrustrated: document.getElementById('donutSegmentFrustrated'),
    donutCenterIcon: document.getElementById('donutCenterIcon'),
    donutCenterTone: document.getElementById('donutCenterTone'),
    countPositive: document.getElementById('countPositive'),
    countNeutral: document.getElementById('countNeutral'),
    countConcerned: document.getElementById('countConcerned'),
    countFrustrated: document.getElementById('countFrustrated'),
    sentimentClarityPct: document.getElementById('sentimentClarityPct'),
    sentimentClarityFill: document.getElementById('sentimentClarityFill'),
    
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
  let soundEnabled = true;
  let audioCtx = null;

  // ============================================================================
  // Web Audio Synthesizer (Zero-Dependency Micro-Chimes)
  // ============================================================================
  function playChime(type = 'sent') {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'sent') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(990, now + 0.18);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      // AudioContext not allowed or not supported; gracefully ignore
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  async function init() {
    initTheme();
    initSound();
    setupEventListeners();

    // Register engine mode listener
    window.apiClient.onModeChange(updateEngineUI);

    // Initialize API client
    await window.apiClient.init();

    // Fetch initial state
    await refreshConversationAndStats();
  }

  // ============================================================================
  // Sound & Theme Management
  // ============================================================================
  function initSound() {
    const savedSound = localStorage.getItem('eduassist_sound');
    soundEnabled = savedSound !== 'false';
    updateSoundUI();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('eduassist_sound', soundEnabled ? 'true' : 'false');
    updateSoundUI();
    if (soundEnabled) playChime('sent');
  }

  function updateSoundUI() {
    if (!dom.btnSoundToggle) return;
    if (soundEnabled) {
      dom.btnSoundToggle.classList.add('active');
      dom.btnSoundToggle.title = 'Sound Effects: ON (Click to Mute)';
      dom.soundIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      `;
    } else {
      dom.btnSoundToggle.classList.remove('active');
      dom.btnSoundToggle.title = 'Sound Effects: MUTED (Click to Enable)';
      dom.soundIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
      `;
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('eduassist_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    dom.htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('eduassist_theme', theme);

    if (dom.themeIconSun) {
      if (theme === 'dark') {
        dom.themeIconSun.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      } else {
        dom.themeIconSun.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      }
    }
  }

  function toggleTheme() {
    const current = dom.htmlRoot.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // ============================================================================
  // Engine UI State
  // ============================================================================
  function updateEngineUI(mode) {
    if (mode === 'flask') {
      dom.engineModeText.textContent = "Flask REST API";
      dom.currentEngineDetailsText.textContent = "Python 3 + Flask REST API (Active)";
    } else {
      dom.engineModeText.textContent = "Client TSA Engine (Demo)";
      dom.currentEngineDetailsText.textContent = "Browser-Side TSA Engine (Zero-Backend Static Demo Mode)";
    }
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================
  function setupEventListeners() {
    // Sound & Theme toggles
    if (dom.btnSoundToggle) {
      dom.btnSoundToggle.addEventListener('click', toggleSound);
    }
    if (dom.btnThemeToggle) {
      dom.btnThemeToggle.addEventListener('click', toggleTheme);
    }

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

    // Quick Action Suggestions
    document.querySelectorAll('.suggested-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query) {
          dom.messageInput.value = query;
          handleSendMessage();
        }
      });
    });

    // Empty state interactive prompt cards
    document.querySelectorAll('.empty-prompt-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          dom.messageInput.value = prompt;
          handleSendMessage();
        }
      });
    });

    // Header actions
    dom.engineModeBadge.addEventListener('click', () => openModal(dom.modalEngineInfo));
    dom.btnClear.addEventListener('click', () => openModal(dom.modalClear));
    dom.btnConfirmClear.addEventListener('click', handleClearConversation);
    if (dom.btnRestore) {
      dom.btnRestore.addEventListener('click', handleRestoreConversation);
    }
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
  // Chat Message Sending & Dynamic Processing
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

    // Play soft send chime
    playChime('sent');

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
        // Play receive chime
        playChime('received');

        // Append bot bubble with animated reveal
        appendBotMessageWithStream(response.response, response.follow_ups || []);

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
  // Rendering Message Bubbles with Dynamic Streaming
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
      renderFollowUpChips(body, msg.follow_ups);
    }

    row.appendChild(avatar);
    row.appendChild(body);
    dom.chatMessages.appendChild(row);
  }

  function appendBotMessageWithStream(fullText, followUps = []) {
    const row = document.createElement('div');
    row.className = 'message-row bot';

    const avatar = document.createElement('div');
    avatar.className = 'avatar avatar-bot';
    avatar.textContent = 'EA';

    const body = document.createElement('div');
    body.className = 'message-body';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessageText(fullText);
    body.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const timeSpan = document.createElement('span');
    timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(timeSpan);
    body.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(body);
    dom.chatMessages.appendChild(row);

    if (followUps && followUps.length > 0) {
      renderFollowUpChips(body, followUps);
    }
  }

  function renderFollowUpChips(parentBody, followUps) {
    const chipContainer = document.createElement('div');
    chipContainer.className = 'follow-up-container';

    followUps.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'follow-up-chip';
      chip.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <span>${escapeHtml(text)}</span>
      `;
      chip.addEventListener('click', () => {
        dom.messageInput.value = text;
        handleSendMessage();
      });
      chipContainer.appendChild(chip);
    });
    parentBody.appendChild(chipContainer);
  }

  function formatMessageText(text) {
    if (!text) return '';
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
  // Text Analysis Inspector & Dynamic Dashboard
  // ============================================================================
  function updateInspector(data) {
    // Message snippet
    dom.inspectMessage.textContent = `"${data.message || 'Awaiting student inquiry...'}"`;

    // Intent
    const intentLabel = data.intent || 'None';
    dom.inspectIntent.innerHTML = `<span class="tag-badge tag-intent">${escapeHtml(intentLabel)}</span>`;

    // Confidence animated
    const confVal = data.confidence ? Math.round(data.confidence * 100) : 0;
    dom.confidenceFill.style.width = `${confVal}%`;
    animateCount(dom.confidenceValText, confVal, '%');

    // Tone with dynamic color & icon
    const toneVal = data.tone || 'neutral';
    const toneIcons = {
      positive: '✨ Positive',
      concerned: '⚠️ Concerned',
      frustrated: '🔥 Frustrated',
      neutral: '💡 Neutral'
    };
    const toneDisplay = toneIcons[toneVal] || toneVal;
    dom.inspectTone.innerHTML = `<span class="tag-badge tag-tone-${toneVal}">${escapeHtml(toneDisplay)}</span>`;

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

  function animateCount(elem, targetVal, suffix = '') {
    if (!elem) return;
    const startVal = parseInt(elem.textContent) || 0;
    if (startVal === targetVal) {
      elem.textContent = `${targetVal}${suffix}`;
      return;
    }
    const duration = 400;
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(startVal + (targetVal - startVal) * progress);
      elem.textContent = `${current}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        elem.textContent = `${targetVal}${suffix}`;
      }
    }
    requestAnimationFrame(updateCounter);
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
    animateCount(dom.statTotalMsgs, analytics.total_messages || 0);
    animateCount(dom.statStudentMsgs, analytics.student_messages || 0);
    animateCount(dom.statBotMsgs, analytics.bot_responses || 0);

    const dominantTone = (analytics.current_tone || 'Neutral');
    dom.statDominantTone.textContent = dominantTone.charAt(0).toUpperCase() + dominantTone.slice(1);
    dom.statDuration.textContent = `${analytics.session_duration || '0s'} active`;

    // Render Intent Distribution Chart Bars
    dom.intentDistList.innerHTML = '';
    const dist = analytics.intent_distribution || {};
    const keys = Object.keys(dist);

    if (keys.length === 0) {
      dom.intentDistList.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 22px 0;">
          No intents detected yet
        </div>
      `;
    } else {
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
            <span style="font-family: var(--font-mono);"><strong>${count}</strong> (${pct}%)</span>
          </div>
          <div class="dist-bar-track">
            <div class="dist-bar-fill" style="width: ${barPct}%;"></div>
          </div>
        `;
        dom.intentDistList.appendChild(item);
      });
    }

    // Render Dynamic Sentiment Donut & Spectrum Breakdown
    renderSentimentDonutChart(analytics);
  }

  function renderSentimentDonutChart(analytics) {
    if (!dom.donutSegmentPositive) return;

    const toneDist = analytics.tone_distribution || {};
    const pos = toneDist.positive || 0;
    const neu = toneDist.neutral || 0;
    const con = toneDist.concerned || 0;
    const fru = toneDist.frustrated || 0;
    const total = pos + neu + con + fru;

    // Circumference of r=48 is 2 * Math.PI * 48 ≈ 301.59
    const C = 301.59;

    if (total === 0) {
      dom.donutSegmentPositive.setAttribute('stroke-dasharray', `0 ${C}`);
      dom.donutSegmentNeutral.setAttribute('stroke-dasharray', `0 ${C}`);
      dom.donutSegmentConcerned.setAttribute('stroke-dasharray', `0 ${C}`);
      dom.donutSegmentFrustrated.setAttribute('stroke-dasharray', `0 ${C}`);

      dom.donutSegmentPositive.setAttribute('stroke-dashoffset', '0');
      dom.donutSegmentNeutral.setAttribute('stroke-dashoffset', '0');
      dom.donutSegmentConcerned.setAttribute('stroke-dashoffset', '0');
      dom.donutSegmentFrustrated.setAttribute('stroke-dashoffset', '0');

      dom.countPositive.textContent = '0 (0%)';
      dom.countNeutral.textContent = '0 (0%)';
      dom.countConcerned.textContent = '0 (0%)';
      dom.countFrustrated.textContent = '0 (0%)';

      dom.donutCenterIcon.textContent = '💡';
      dom.donutCenterTone.textContent = 'Neutral';

      dom.sentimentClarityPct.textContent = '100%';
      dom.sentimentClarityFill.style.width = '100%';
      dom.sentimentClarityFill.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
      return;
    }

    const posPct = Math.round((pos / total) * 100);
    const neuPct = Math.round((neu / total) * 100);
    const conPct = Math.round((con / total) * 100);
    const fruPct = Math.round((fru / total) * 100);

    dom.countPositive.textContent = `${pos} (${posPct}%)`;
    dom.countNeutral.textContent = `${neu} (${neuPct}%)`;
    dom.countConcerned.textContent = `${con} (${conPct}%)`;
    dom.countFrustrated.textContent = `${fru} (${fruPct}%)`;

    // Dynamic Donut Segments with cumulative offset
    const posLen = (pos / total) * C;
    const neuLen = (neu / total) * C;
    const conLen = (con / total) * C;
    const fruLen = (fru / total) * C;

    let offset = 0;
    dom.donutSegmentPositive.setAttribute('stroke-dasharray', `${posLen.toFixed(1)} ${C.toFixed(1)}`);
    dom.donutSegmentPositive.setAttribute('stroke-dashoffset', `${(-offset).toFixed(1)}`);
    offset += posLen;

    dom.donutSegmentNeutral.setAttribute('stroke-dasharray', `${neuLen.toFixed(1)} ${C.toFixed(1)}`);
    dom.donutSegmentNeutral.setAttribute('stroke-dashoffset', `${(-offset).toFixed(1)}`);
    offset += neuLen;

    dom.donutSegmentConcerned.setAttribute('stroke-dasharray', `${conLen.toFixed(1)} ${C.toFixed(1)}`);
    dom.donutSegmentConcerned.setAttribute('stroke-dashoffset', `${(-offset).toFixed(1)}`);
    offset += conLen;

    dom.donutSegmentFrustrated.setAttribute('stroke-dasharray', `${fruLen.toFixed(1)} ${C.toFixed(1)}`);
    dom.donutSegmentFrustrated.setAttribute('stroke-dashoffset', `${(-offset).toFixed(1)}`);

    // Center icon & tone label
    const dominant = (analytics.current_tone || 'neutral').toLowerCase();
    const toneIcons = {
      positive: '✨',
      neutral: '💡',
      concerned: '⚠️',
      frustrated: '🔥'
    };
    dom.donutCenterTone.textContent = dominant.charAt(0).toUpperCase() + dominant.slice(1);
    dom.donutCenterIcon.textContent = toneIcons[dominant] || '💡';

    // Student Sentiment Clarity Score (Constructive equilibrium index)
    const clarityScore = Math.max(10, Math.min(100, Math.round(((pos * 100 + neu * 85 + con * 45 + fru * 20) / total))));
    dom.sentimentClarityPct.textContent = `${clarityScore}%`;
    dom.sentimentClarityFill.style.width = `${clarityScore}%`;
    if (clarityScore >= 75) {
      dom.sentimentClarityFill.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
    } else if (clarityScore >= 50) {
      dom.sentimentClarityFill.style.background = 'linear-gradient(90deg, #f59e0b, #38bdf8)';
    } else {
      dom.sentimentClarityFill.style.background = 'linear-gradient(90deg, #f43f5e, #f59e0b)';
    }
  }

  // ============================================================================
  // Header Actions: Clear, Restore, Demo, Analyze, Print
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
      showToast("Conversation cleared. Click 'Restore' anytime to recover session.", "success");
    } catch (e) {
      showToast("Failed to clear conversation", "error");
    }
  }

  async function handleRestoreConversation() {
    try {
      showToast("Restoring previous conversation...", "default");
      const res = await window.apiClient.restoreConversation();
      if (res && res.success) {
        playChime('sent');
        const msgs = res.messages || [];
        renderConversationThread(msgs);
        if (res.analytics) {
          renderDashboard(res.analytics);
        }
        const studentMsgs = msgs.filter(m => m.sender === 'student');
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
        showToast("Previous conversation and metrics restored successfully!", "success");
      } else {
        throw new Error(res.error || "No cleared session available to restore");
      }
    } catch (err) {
      showToast(err.message || "No previous session available to restore", "error");
    }
  }

  async function handleLoadDemo() {
    try {
      showToast("Loading realistic demo conversation...", "success");
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

      let topicsHtml = '<p style="color: var(--text-muted);">None identified yet</p>';
      if (data.key_topics && data.key_topics.length > 0) {
        topicsHtml = `
          <div class="keyword-tags-wrap" style="margin-top: 6px;">
            ${data.key_topics.map(t => `<span class="keyword-tag" style="background: rgba(99, 102, 241, 0.25); color: var(--accent-cyan); font-weight: 700; border-color: rgba(99, 102, 241, 0.45); font-size: 0.82rem; padding: 4px 12px;">${escapeHtml(t)}</span>`).join('')}
          </div>
        `;
      }

      dom.analysisModalBody.innerHTML = `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px; border-left: 4px solid var(--accent-cyan);">
          <h4 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 6px; font-weight: 800;">Executive Counseling Synthesis</h4>
          <p style="font-size: 0.92rem; line-height: 1.65; color: var(--text-secondary);">${escapeHtml(data.summary_text)}</p>
        </div>

        <div class="dashboard-grid" style="margin-bottom: 16px;">
          <div class="stat-card">
            <span class="stat-label">Primary Topic</span>
            <span class="stat-value" style="font-size: 1.1rem; color: var(--accent-cyan);">${escapeHtml(data.primary_intent || 'None')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Dominant Tone</span>
            <span class="stat-value" style="font-size: 1.1rem;">${escapeHtml(data.dominant_tone || 'Neutral')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Messages</span>
            <span class="stat-value">${data.total_messages || 0}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Analysis Timestamp</span>
            <span class="stat-value" style="font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(data.generated_at || '-')}</span>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
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
      toast.style.transform = 'translateY(12px) scale(0.95)';
      toast.style.transition = 'all 0.3s ease';
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
