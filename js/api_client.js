/**
 * EduAssist Unified API Client & Dual-Engine Controller
 * 
 * Provides unified asynchronous interface for:
 *   Mode 1: Full Flask Application (Flask REST API -> Python TSA Engine)
 *   Mode 2: GitHub Pages Demo (In-Browser Client-Side TSA Engine)
 * 
 * Automatically detects whether the Flask REST API is reachable.
 * Never throws 404/network errors on static hosts like GitHub Pages.
 */

(function (window) {
  'use strict';

  class EduAssistApiClient {
    constructor() {
      this.mode = 'detecting'; // 'flask' | 'client'
      this.localState = new window.EduAssistTSA.ClientSessionState();
      this.listeners = [];
      this.activeContext = null;
    }

    onModeChange(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    setMode(newMode) {
      this.mode = newMode;
      this.listeners.forEach(cb => cb(this.mode));
    }

    async init() {
      // Auto-detect if running on GitHub Pages or file protocol
      const isStaticHost = 
        window.location.hostname.includes('github.io') || 
        window.location.protocol === 'file:';

      if (isStaticHost) {
        this.setMode('client');
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch('./api/health', {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'healthy') {
            this.setMode('flask');
            return;
          }
        }
        this.setMode('client');
      } catch (err) {
        this.setMode('client');
      }
    }

    async sendMessage(messageText) {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with HTTP ${res.status}`);
          }
          return await res.json();
        } catch (error) {
          // If server went down mid-session, fallback gracefully
          console.warn("Flask API unreachable, falling back to Client TSA Engine:", error);
          this.setMode('client');
        }
      }

      // Mode: Client-Side TSA Engine
      return this._executeClientChat(messageText);
    }

    _executeClientChat(messageText) {
      // 1. Text Preprocessing
      const prep = window.EduAssistTSA.preprocess(messageText);

      // 2. Intent Detection
      const intentResult = window.EduAssistTSA.detectIntent(prep.tokens, prep.normalizedText, this.activeContext);

      // 3. Tone Analysis
      const toneResult = window.EduAssistTSA.analyzeTone(prep.tokens, messageText);

      // 4. Response Generation
      const { reply, followUps, nextContext } = window.EduAssistTSA.generateResponse(
        intentResult.intent,
        toneResult.tone,
        messageText,
        prep.tokens,
        this.activeContext,
        intentResult.isContextual
      );

      this.activeContext = nextContext;

      // 5. Update State
      this.localState.addMessage(
        "student",
        messageText,
        intentResult.intent,
        intentResult.confidence,
        toneResult.tone,
        prep.keywords
      );

      this.localState.addMessage(
        "bot",
        reply,
        intentResult.intent,
        null,
        null,
        [],
        followUps
      );

      return {
        success: true,
        response: reply,
        intent: intentResult.intent,
        intent_label: intentResult.label,
        confidence: intentResult.confidence,
        tone: toneResult.tone,
        keywords: prep.keywords,
        follow_ups: followUps,
        is_contextual: !!intentResult.isContextual
      };
    }

    async getConversation() {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/conversation');
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          this.setMode('client');
        }
      }
      return {
        success: true,
        messages: this.localState.getConversation(),
        count: this.localState.getConversation().length
      };
    }

    async getDashboard() {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/dashboard');
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          this.setMode('client');
        }
      }
      return {
        success: true,
        analytics: this.localState.getDashboard()
      };
    }

    async clearConversation() {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/conversation/clear', { method: 'POST' });
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          this.setMode('client');
        }
      }
      this.localState.reset();
      this.activeContext = null;
      return {
        success: true,
        message: "Conversation history and analytics reset"
      };
    }

    async loadDemoConversation() {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/demo', { method: 'POST' });
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          this.setMode('client');
        }
      }
      this.localState.loadDemo();
      this.activeContext = null;
      return {
        success: true,
        message: "Demo conversation loaded successfully",
        messages: this.localState.getConversation(),
        analytics: this.localState.getDashboard()
      };
    }

    async analyzeConversation() {
      if (this.mode === 'flask') {
        try {
          const res = await fetch('./api/analyze', { method: 'POST' });
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          this.setMode('client');
        }
      }
      return {
        success: true,
        analysis: this.localState.analyzeConversation()
      };
    }
  }

  window.apiClient = new EduAssistApiClient();

})(window);
