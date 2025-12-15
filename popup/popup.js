/**
 * MQL5 Forum Blacklist - Popup Script
 * Manages the extension popup interface
 */

class PopupManager {
  constructor() {
    this.blacklist = [];
    this.isEnabled = true;
    this.stats = {
      hiddenCount: 0,
      blacklistCount: 0
    };
    
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.updateUI();
  }

  bindEvents() {
    // Extension toggle
    document.getElementById('extensionToggle').addEventListener('change', (e) => {
      this.toggleExtension(e.target.checked);
    });

    // Add user
    document.getElementById('addUserBtn').addEventListener('click', () => {
      this.addUser();
    });

    document.getElementById('usernameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addUser();
      }
    });

    // Footer buttons
    document.getElementById('openOptionsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshCurrentTab();
    });
  }

  async loadData() {
    try {
      // Load from storage
      const result = await chrome.storage.sync.get({
        blacklist: [],
        isEnabled: true,
        statistics: { totalHiddenPosts: 0 }
      });

      this.blacklist = result.blacklist;
      this.isEnabled = result.isEnabled;

      // Get current tab stats
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('mql5.com')) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getStats' });
        if (response) {
          this.stats = response;
        }
      }
    } catch (error) {
      console.warn('Failed to load data:', error);
      this.stats.blacklistCount = this.blacklist.length;
    }
  }

  updateUI() {
    // Update toggle
    document.getElementById('extensionToggle').checked = this.isEnabled;
    document.querySelector('.toggle-label').textContent = this.isEnabled ? 'Enabled' : 'Disabled';

    // Update blacklist
    this.renderBlacklist();

    // Update statistics
    document.getElementById('hiddenCount').textContent = this.stats.hiddenCount || 0;
    document.getElementById('totalBlacklisted').textContent = this.stats.blacklistCount || this.blacklist.length;
    document.getElementById('blacklistCount').textContent = this.blacklist.length;
  }

  renderBlacklist() {
    const container = document.getElementById('blacklistContainer');
    
    if (this.blacklist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-text">No users in blacklist</p>
          <p class="empty-subtext">Add users above to hide their posts</p>
        </div>
      `;
      return;
    }

    const blacklistHTML = this.blacklist.map((entry, index) => `
      <div class="blacklist-item" data-index="${index}">
        <span class="username-text" title="${this.escapeHtml(entry.username)}">${this.escapeHtml(entry.username)}</span>
        <button class="remove-button" data-username="${this.escapeHtml(entry.username)}" title="Remove user">
          Remove
        </button>
      </div>
    `).join('');

    container.innerHTML = blacklistHTML;

    // Bind remove events
    container.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const username = e.target.dataset.username;
        this.removeUser(username);
      });
    });
  }

  async addUser() {
    const input = document.getElementById('usernameInput');
    const username = input.value.trim();

    if (!username) {
      this.showError('Please enter a username');
      return;
    }

    if (this.blacklist.some(entry => entry.username.toLowerCase() === username.toLowerCase())) {
      this.showError('User already in blacklist');
      return;
    }

    try {
      // Add to blacklist
      const newEntry = {
        username: username,
        addedAt: Date.now(),
        hiddenPostsCount: 0
      };

      this.blacklist.push(newEntry);
      
      // Save to storage
      await chrome.storage.sync.set({ blacklist: this.blacklist });

      // Clear input
      input.value = '';

      // Notify content script
      await this.notifyContentScript();

      // Update UI
      this.updateUI();

      // Show success
      this.showSuccess(`Added "${username}" to blacklist`);
    } catch (error) {
      console.error('Failed to add user:', error);
      this.showError('Failed to add user');
    }
  }

  async removeUser(username) {
    try {
      // Remove from blacklist
      this.blacklist = this.blacklist.filter(entry => 
        entry.username.toLowerCase() !== username.toLowerCase()
      );

      // Save to storage
      await chrome.storage.sync.set({ blacklist: this.blacklist });

      // Notify content script
      await this.notifyContentScript();

      // Update UI
      this.updateUI();

      // Show success
      this.showSuccess(`Removed "${username}" from blacklist`);
    } catch (error) {
      console.error('Failed to remove user:', error);
      this.showError('Failed to remove user');
    }
  }

  async toggleExtension(enabled) {
    try {
      this.isEnabled = enabled;
      await chrome.storage.sync.set({ isEnabled: enabled });
      
      // Notify content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('mql5.com')) {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'toggleExtension', 
          enabled: enabled 
        });
      }

      this.updateUI();
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  }

  async notifyContentScript() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('mql5.com')) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'updateBlacklist' });
      } catch (error) {
        // Content script might not be loaded
        console.warn('Could not notify content script:', error);
      }
    }
  }

  async refreshCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.reload(tab.id);
      window.close();
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style notification
    notification.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#ea4335' : '#34a853'};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideDown 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});