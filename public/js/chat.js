// Chat functionality for VoyageAI Luxury Travel Agent

class VoyageChat {
  constructor() {
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.chatWelcome = document.getElementById('chatWelcome');
    this.chatContainer = document.getElementById('chatContainer');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.newChatHeaderBtn = document.getElementById('newChatHeaderBtn');
    
    // Status Bar Elements
    this.statusIndicator = document.querySelector('.status-indicator');
    this.statusText = document.querySelector('.status-text');
    this.modelBadge = document.querySelector('.model-badge');

    // Modal elements
    this.apiKeyBtn = document.getElementById('apiKeyBtn');
    this.apiKeyModal = document.getElementById('apiKeyModal');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.saveKeyBtn = document.getElementById('saveKeyBtn');
    this.testKeyBtn = document.getElementById('testKeyBtn');
    this.clearKeyBtn = document.getElementById('clearKeyBtn');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
    this.modalStatusMsg = document.getElementById('modalStatusMsg');
    this.persistEnvCheckbox = document.getElementById('persistEnvCheckbox');

    this.history = [];
    this.isLoading = false;
    this.apiKey = localStorage.getItem('voyageai_gemini_key') || '';

    this.init();
  }

  async init() {
    // Configure marked for rich markdown rendering
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
    }

    // Send button event
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Enter key handling
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-grow textarea
      this.chatInput.addEventListener('input', () => {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 140) + 'px';
      });
    }

    // Quick-start suggestion buttons
    document.querySelectorAll('.quick-start-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const message = btn.dataset.message;
        if (message && this.chatInput) {
          this.chatInput.value = message;
          this.sendMessage();
        }
      });
    });

    // Reset / New chat
    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.resetChat());
    }
    if (this.newChatHeaderBtn) {
      this.newChatHeaderBtn.addEventListener('click', () => this.resetChat());
    }

    // Setup API Key Modal
    this.setupApiKeyModal();

    // Check server status & health
    await this.syncServerStatus();

    // Check URL parameters for direct planning (e.g. ?plan=europe)
    this.checkUrlParameters();
  }

  async syncServerStatus() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        const hasKey = data.hasApiKey || Boolean(this.apiKey);
        this.updateStatusBadge(hasKey, hasKey ? (data.model || 'Gemini 3.8 Flash') : 'Preview Mode');
      }
    } catch (e) {
      console.warn('Could not sync health status:', e.message);
    }
  }

  updateStatusBadge(isLive, modelLabel) {
    if (this.statusIndicator) {
      this.statusIndicator.className = isLive ? 'status-indicator online' : 'status-indicator demo';
    }
    if (this.statusText) {
      this.statusText.textContent = isLive ? 'VoyageAI Agent (Live)' : 'VoyageAI Agent (Demo)';
    }
    if (this.modelBadge) {
      this.modelBadge.innerHTML = isLive 
        ? `<i class="fas fa-bolt" style="color: #10B981;"></i> ${modelLabel}`
        : `<i class="fas fa-compass" style="color: #F59E0B;"></i> Preview Mode`;
      this.modelBadge.style.borderColor = isLive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    }
  }

  setupApiKeyModal() {
    if (!this.apiKeyModal) return;

    if (this.apiKeyInput && this.apiKey) {
      this.apiKeyInput.value = this.apiKey;
    }

    if (this.apiKeyBtn) {
      this.apiKeyBtn.addEventListener('click', () => {
        this.apiKeyModal.classList.add('active');
        if (this.modalStatusMsg) {
          this.modalStatusMsg.innerHTML = '';
          this.modalStatusMsg.className = 'modal-status-msg';
        }
        if (this.apiKeyInput) this.apiKeyInput.focus();
      });
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => {
        this.apiKeyModal.classList.remove('active');
      });
    }

    this.apiKeyModal.addEventListener('click', (e) => {
      if (e.target === this.apiKeyModal) {
        this.apiKeyModal.classList.remove('active');
      }
    });

    if (this.toggleKeyVisibility && this.apiKeyInput) {
      this.toggleKeyVisibility.addEventListener('click', () => {
        const type = this.apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.apiKeyInput.setAttribute('type', type);
        this.toggleKeyVisibility.innerHTML = type === 'password' 
          ? '<i class="fas fa-eye"></i>' 
          : '<i class="fas fa-eye-slash"></i>';
      });
    }

    // Test API Key button
    if (this.testKeyBtn && this.apiKeyInput) {
      this.testKeyBtn.addEventListener('click', async () => {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
          this.showModalMsg('Please enter an API key to test.', 'error');
          return;
        }

        this.showModalMsg('<i class="fas fa-spinner fa-spin"></i> Connecting to Google Gemini API...', 'loading');
        this.testKeyBtn.disabled = true;

        try {
          const res = await fetch('/api/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
          const data = await res.json();

          if (data.valid) {
            this.showModalMsg(`<i class="fas fa-check-circle"></i> ${data.message}`, 'success');
          } else {
            this.showModalMsg(`<i class="fas fa-times-circle"></i> ${data.error || 'Invalid API Key'}`, 'error');
          }
        } catch (err) {
          this.showModalMsg('<i class="fas fa-exclamation-triangle"></i> Network error testing key.', 'error');
        } finally {
          this.testKeyBtn.disabled = false;
        }
      });
    }

    // Save API Key button
    if (this.saveKeyBtn && this.apiKeyInput) {
      this.saveKeyBtn.addEventListener('click', async () => {
        const key = this.apiKeyInput.value.trim();
        const persistToEnv = this.persistEnvCheckbox ? this.persistEnvCheckbox.checked : true;

        if (key) {
          this.showModalMsg('<i class="fas fa-spinner fa-spin"></i> Verifying and saving key...', 'loading');
          this.saveKeyBtn.disabled = true;

          try {
            // First verify key
            const verifyRes = await fetch('/api/verify-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key })
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.valid) {
              this.showModalMsg(`<i class="fas fa-times-circle"></i> Key check failed: ${verifyData.error}`, 'error');
              this.saveKeyBtn.disabled = false;
              return;
            }

            // Save key to server
            await fetch('/api/save-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key, persistToEnv: persistToEnv })
            });

            this.apiKey = key;
            localStorage.setItem('voyageai_gemini_key', key);
            this.updateStatusBadge(true, verifyData.model || 'Gemini 3.8 Flash');

            this.showModalMsg('<i class="fas fa-check-circle"></i> Key verified and connected successfully!', 'success');
            setTimeout(() => {
              this.apiKeyModal.classList.remove('active');
              this.showToast('Connected to Google Gemini 3.8 Flash!');
            }, 900);

          } catch (e) {
            this.showModalMsg('Error saving key to server: ' + e.message, 'error');
          } finally {
            this.saveKeyBtn.disabled = false;
          }
        } else {
          // Empty key: clear
          this.apiKey = '';
          localStorage.removeItem('voyageai_gemini_key');
          await fetch('/api/clear-key', { method: 'POST' });
          this.updateStatusBadge(false, 'Preview Mode');
          this.apiKeyModal.classList.remove('active');
          this.showToast('Using VoyageAI Preview Mode.');
        }
      });
    }

    // Clear key button
    if (this.clearKeyBtn && this.apiKeyInput) {
      this.clearKeyBtn.addEventListener('click', async () => {
        this.apiKey = '';
        this.apiKeyInput.value = '';
        localStorage.removeItem('voyageai_gemini_key');
        try {
          await fetch('/api/clear-key', { method: 'POST' });
        } catch (e) {}
        this.updateStatusBadge(false, 'Preview Mode');
        this.showModalMsg('API key removed. Running in Preview mode.', 'neutral');
        this.showToast('Reset to VoyageAI Preview Mode.');
      });
    }
  }

  showModalMsg(html, type) {
    if (!this.modalStatusMsg) return;
    this.modalStatusMsg.className = `modal-status-msg ${type}`;
    this.modalStatusMsg.innerHTML = html;
  }

  checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const customMessage = params.get('message');
    const destination = params.get('plan') || params.get('destination');

    if (customMessage) {
      setTimeout(() => {
        if (this.chatInput) {
          this.chatInput.value = customMessage;
          this.sendMessage();
        }
      }, 350);
      return;
    }

    if (destination) {
      const destNames = {
        europe: 'Europe (Exploring & Comfort, Paris/Venice)',
        dubai: 'Dubai (Modern Luxury & Desert Safaris)',
        us: 'United States (Adventures, NYC & Coast)',
        usa: 'United States (Adventures, NYC & Coast)',
        egypt: 'Egypt (Ancient Culture, Pyramids & Nile)'
      };
      const name = destNames[destination.toLowerCase()] || destination;
      setTimeout(() => {
        if (this.chatInput) {
          this.chatInput.value = `Hello! I would like to plan a complete trip to ${name}. Please guide me through the details!`;
          this.sendMessage();
        }
      }, 300);
    }
  }

  showToast(message) {
    const existing = document.querySelector('.voyage-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'voyage-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  async sendMessage() {
    const message = this.chatInput ? this.chatInput.value.trim() : '';
    if (!message || this.isLoading) return;

    // Show conversation view
    if (this.chatWelcome) this.chatWelcome.style.display = 'none';
    if (this.chatContainer) this.chatContainer.style.display = 'flex';

    // Add user message to UI
    this.addMessage(message, 'user');
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';

    // Show typing animation
    this.showTyping();
    this.isLoading = true;
    if (this.sendBtn) this.sendBtn.disabled = true;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: message,
          history: this.history,
          apiKey: this.apiKey || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      // Add to conversation history
      this.history.push({
        role: 'user',
        parts: [{ text: message }]
      });
      this.history.push({
        role: 'model',
        parts: [{ text: data.response }]
      });

      // Update badge if model changed
      if (data.model) {
        this.updateStatusBadge(!data.isDemo, data.isDemo ? 'Preview Mode' : data.model);
      }

      // Remove typing indicator and render AI response
      this.hideTyping();
      this.addMessage(data.response, 'ai', data.isDemo);

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTyping();

      const errMsg = error.message || '';
      let displayMessage = `### <i class="fas fa-exclamation-triangle" style="color: #eab308;"></i> Travel Assistant Notice\n\n${errMsg}`;

      if (errMsg.includes('API key') || errMsg.includes('invalid') || errMsg.includes('INVALID_KEY')) {
        displayMessage += `\n\n> 💡 **Tip:** Click the **API Key** button at the top to test your Gemini key, or click below to continue in Preview Mode:`;
      }

      this.addMessage(displayMessage, 'ai', true);

      // Offer fallback button if API key failed
      this.injectFallbackAction();

    } finally {
      this.isLoading = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      if (this.chatInput) this.chatInput.focus();
    }
  }

  injectFallbackAction() {
    const lastMsg = this.chatMessages.lastElementChild;
    if (!lastMsg) return;
    const body = lastMsg.querySelector('.message-content');
    if (!body || body.querySelector('.action-pill-btn')) return;

    const actionDiv = document.createElement('div');
    actionDiv.className = 'chat-action-pills';
    actionDiv.innerHTML = `
      <button class="action-pill-btn" id="openKeyModalPill"><i class="fas fa-key"></i> Fix API Key</button>
      <button class="action-pill-btn secondary" id="switchDemoPill"><i class="fas fa-compass"></i> Switch to Preview Mode</button>
    `;
    body.appendChild(actionDiv);

    actionDiv.querySelector('#openKeyModalPill').addEventListener('click', () => {
      if (this.apiKeyBtn) this.apiKeyBtn.click();
    });

    actionDiv.querySelector('#switchDemoPill').addEventListener('click', async () => {
      this.apiKey = '';
      localStorage.removeItem('voyageai_gemini_key');
      await fetch('/api/clear-key', { method: 'POST' });
      this.updateStatusBadge(false, 'Preview Mode');
      this.showToast('Switched to VoyageAI Preview Mode!');
      actionDiv.remove();
    });
  }

  addMessage(text, type, isDemo = false) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = type === 'ai'
      ? '<div class="message-avatar ai-avatar"><i class="fas fa-compass"></i></div>'
      : '<div class="message-avatar user-avatar"><i class="fas fa-user"></i></div>';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHtml = '';
    if (type === 'ai') {
      let rawHtml = '';
      if (typeof marked !== 'undefined') {
        rawHtml = marked.parse(text);
      } else {
        rawHtml = `<p>${this.escapeHtml(text)}</p>`;
      }

      if (typeof DOMPurify !== 'undefined') {
        contentHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'i', 'button'],
          ADD_ATTR: ['src', 'alt', 'loading', 'class', 'style', 'target', 'href', 'id']
        });
      } else {
        contentHtml = rawHtml;
      }
    } else {
      contentHtml = `<p>${this.escapeHtml(text)}</p>`;
    }

    messageDiv.innerHTML = `
      ${avatar}
      <div class="message-body">
        <div class="message-header">
          <span class="sender-name">${type === 'ai' ? 'VoyageAI Travel Agent' : 'You'}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${contentHtml}</div>
      </div>
    `;

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();

    // Animate smoothly
    requestAnimationFrame(() => {
      messageDiv.classList.add('show');
    });

    // Make sure we re-scroll once images inside load
    const images = messageDiv.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => this.scrollToBottom());
    });
  }

  showTyping() {
    if (!this.chatMessages) return;
    this.hideTyping();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
      <div class="message-avatar ai-avatar"><i class="fas fa-compass"></i></div>
      <div class="message-body">
        <div class="message-header">
          <span class="sender-name">VoyageAI</span>
          <span class="status-thinking"><i class="fas fa-search-location fa-spin"></i> Consulting travel engine...</span>
        </div>
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  }

  scrollToBottom() {
    if (!this.chatMessages) return;
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  resetChat() {
    this.history = [];
    if (this.chatMessages) this.chatMessages.innerHTML = '';
    if (this.chatContainer) this.chatContainer.style.display = 'none';
    if (this.chatWelcome) this.chatWelcome.style.display = 'flex';
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.style.height = 'auto';
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.voyageChatInstance = new VoyageChat();
});
