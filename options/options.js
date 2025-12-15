/**
 * MQL5 Forum Blacklist - Options Page Script
 * Advanced settings and blacklist management
 */

class OptionsManager {
  constructor() {
    this.settings = {
      hideCompletely: true,
      showIndicator: true,
      statisticsEnabled: true,
      maxBlacklistSize: 1000
    };
    this.blacklist = [];
    this.isEnabled = true;
    this.statistics = { totalHiddenPosts: 0 };
    this.filteredBlacklist = [];
    
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.updateUI();
  }

  bindEvents() {
    // Settings
    document.getElementById('hideCompletely').addEventListener('change', () => this.markAsDirty());
    document.getElementById('showIndicator').addEventListener('change', () => this.markAsDirty());
    document.getElementById('statisticsEnabled').addEventListener('change', () => this.markAsDirty());

    // Search
    document.getElementById('searchBlacklist').addEventListener('input', (e) => {
      this.filterBlacklist(e.target.value);
    });

    // Buttons
    document.getElementById('exportBtn').addEventListener('click', () => this.exportBlacklist());
    document.getElementById('importBtn').addEventListener('click', () => this.importBlacklist());
    document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllUsers());
    document.getElementById('resetStatsBtn').addEventListener('click', () => this.resetStatistics());
    document.getElementById('resetAllBtn').addEventListener('click', () => this.resetAll());

    // Footer
    document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
    document.getElementById('cancelBtn').addEventListener('click', () => this.cancelChanges());

    // Links
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
    document.getElementById('privacyLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacy();
    });
    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showFeedback();
    });

    // File input
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileImport(e.target.files[0]);
    });
  }

  async loadData() {
    try {
      const result = await chrome.storage.sync.get({
        blacklist: [],
        isEnabled: true,
        settings: this.settings,
        statistics: { totalHiddenPosts: 0 }
      });

      this.blacklist = result.blacklist;
      this.isEnabled = result.isEnabled;
      this.settings = { ...this.settings, ...result.settings };
      this.statistics = result.statistics;
      this.filteredBlacklist = [...this.blacklist];
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  updateUI() {
    // Settings
    document.getElementById('hideCompletely').checked = this.settings.hideCompletely;
    document.getElementById('showIndicator').checked = this.settings.showIndicator;
    document.getElementById('statisticsEnabled').checked = this.settings.statisticsEnabled;

    // Statistics
    document.getElementById('totalHidden').textContent = this.statistics.totalHiddenPosts || 0;
    document.getElementById('totalUsers').textContent = this.blacklist.length;
    document.getElementById('extensionEnabled').textContent = this.isEnabled ? 'Yes' : 'No';

    // Blacklist
    this.updateBlacklistDisplay();
    this.updateBlacklistCount();
  }

  updateBlacklistDisplay() {
    const container = document.getElementById('blacklistItems');
    
    if (this.filteredBlacklist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3 class="empty-title">No users in blacklist</h3>
          <p class="empty-description">Add users from the popup or import a list</p>
        </div>
      `;
      return;
    }

    const blacklistHTML = this.filteredBlacklist.map((entry, index) => {
      const date = new Date(entry.addedAt).toLocaleDateString();
      return `
        <div class="blacklist-item" data-index="${index}">
          <div class="user-info">
            <div class="blacklist-username">${this.escapeHtml(entry.username)}</div>
            <div class="blacklist-date">Added: ${date}</div>
          </div>
          <div class="item-actions">
            <button class="secondary-button small" onclick="optionsManager.editUser('${this.escapeHtml(entry.username)}')">
              Edit
            </button>
            <button class="danger-button small" onclick="optionsManager.removeUser('${this.escapeHtml(entry.username)}')">
              Remove
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = blacklistHTML;
  }

  updateBlacklistCount() {
    const count = this.blacklist.length;
    document.getElementById('blacklistCount').textContent = `${count} user${count !== 1 ? 's' : ''}`;
  }

  filterBlacklist(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredBlacklist = [...this.blacklist];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredBlacklist = this.blacklist.filter(entry => 
        entry.username.toLowerCase().includes(term)
      );
    }
    this.updateBlacklistDisplay();
  }

  async saveSettings() {
    try {
      this.settings.hideCompletely = document.getElementById('hideCompletely').checked;
      this.settings.showIndicator = document.getElementById('showIndicator').checked;
      this.settings.statisticsEnabled = document.getElementById('statisticsEnabled').checked;

      await chrome.storage.sync.set({
        settings: this.settings,
        blacklist: this.blacklist,
        isEnabled: this.isEnabled,
        statistics: this.statistics
      });

      this.showNotification('Settings saved successfully!', 'success');
      this.markAsClean();
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  cancelChanges() {
    this.loadData().then(() => {
      this.updateUI();
      this.markAsClean();
      this.showNotification('Changes cancelled', 'info');
    });
  }

  async exportBlacklist() {
    try {
      const data = {
        blacklist: this.blacklist,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mql5-blacklist-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      this.showNotification('Blacklist exported successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export failed', 'error');
    }
  }

  importBlacklist() {
    document.getElementById('fileInput').click();
  }

  async handleFileImport(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.blacklist || !Array.isArray(data.blacklist)) {
        throw new Error('Invalid file format');
      }

      // Validate entries
      const validEntries = data.blacklist.filter(entry => 
        entry.username && typeof entry.username === 'string'
      );

      if (validEntries.length === 0) {
        throw new Error('No valid entries found');
      }

      // Merge with existing blacklist (avoid duplicates)
      const existingUsernames = new Set(this.blacklist.map(entry => entry.username.toLowerCase()));
      const newEntries = validEntries.filter(entry => 
        !existingUsernames.has(entry.username.toLowerCase())
      );

      this.blacklist = [...this.blacklist, ...newEntries];
      this.filteredBlacklist = [...this.blacklist];

      await chrome.storage.sync.set({ blacklist: this.blacklist });
      this.updateUI();
      
      this.showNotification(`Imported ${newEntries.length} new users!`, 'success');
    } catch (error) {
      console.error('Import failed:', error);
      this.showNotification('Import failed: ' + error.message, 'error');
    }
  }

  async clearAllUsers() {
    if (!confirm('Are you sure you want to clear all users from the blacklist? This action cannot be undone.')) {
      return;
    }

    try {
      this.blacklist = [];
      this.filteredBlacklist = [];
      await chrome.storage.sync.set({ blacklist: this.blacklist });
      this.updateUI();
      this.showNotification('Blacklist cleared successfully!', 'success');
    } catch (error) {
      console.error('Failed to clear blacklist:', error);
      this.showNotification('Failed to clear blacklist', 'error');
    }
  }

  async removeUser(username) {
    try {
      this.blacklist = this.blacklist.filter(entry => 
        entry.username.toLowerCase() !== username.toLowerCase()
      );
      this.filteredBlacklist = this.filteredBlacklist.filter(entry => 
        entry.username.toLowerCase() !== username.toLowerCase()
      );

      await chrome.storage.sync.set({ blacklist: this.blacklist });
      this.updateUI();
      this.showNotification(`User "${username}" removed`, 'success');
    } catch (error) {
      console.error('Failed to remove user:', error);
      this.showNotification('Failed to remove user', 'error');
    }
  }

  async resetStatistics() {
    if (!confirm('Reset all statistics? This action cannot be undone.')) {
      return;
    }

    try {
      this.statistics = { totalHiddenPosts: 0 };
      await chrome.storage.sync.set({ statistics: this.statistics });
      this.updateUI();
      this.showNotification('Statistics reset successfully!', 'success');
    } catch (error) {
      console.error('Failed to reset statistics:', error);
      this.showNotification('Failed to reset statistics', 'error');
    }
  }

  async resetAll() {
    if (!confirm('Reset all settings and clear blacklist? This will remove all users and reset all settings to defaults. This action cannot be undone.')) {
      return;
    }

    try {
      this.blacklist = [];
      this.filteredBlacklist = [];
      this.isEnabled = true;
      this.settings = {
        hideCompletely: true,
        showIndicator: true,
        statisticsEnabled: true,
        maxBlacklistSize: 1000
      };
      this.statistics = { totalHiddenPosts: 0 };

      await chrome.storage.sync.clear();
      await chrome.storage.sync.set({
        blacklist: this.blacklist,
        isEnabled: this.isEnabled,
        settings: this.settings,
        statistics: this.statistics
      });

      this.updateUI();
      this.showNotification('All settings reset successfully!', 'success');
    } catch (error) {
      console.error('Failed to reset all settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    }
  }

  editUser(oldUsername) {
    const newUsername = prompt('Edit username:', oldUsername);
    if (newUsername && newUsername.trim() && newUsername !== oldUsername) {
      const entry = this.blacklist.find(e => e.username.toLowerCase() === oldUsername.toLowerCase());
      if (entry) {
        entry.username = newUsername.trim();
        this.saveSettings();
      }
    }
  }

  showHelp() {
    alert(`MQL5 Forum Blacklist Help

This extension allows you to hide posts from specific users on the MQL5 forum.

Features:
• Add users to blacklist from popup
• Import/export blacklist
• Statistics tracking
• Customizable hiding behavior

The extension works on all language versions of the MQL5 forum.`);
  }

  showPrivacy() {
    alert(`Privacy Policy

This extension:
• Stores all data locally in your browser
• Does not send any data to external servers
• Only accesses MQL5 forum pages
• Uses minimal required permissions

Your blacklist and settings are stored locally and never leave your device.`);
  }

  showFeedback() {
    prompt('Feedback', 'Please describe your feedback or suggestions:');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ea4335' : type === 'success' ? '#34a853' : '#1a73e8'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  markAsDirty() {
    // Visual indicator that settings have changed
    document.getElementById('saveBtn').style.background = '#0d47a1';
  }

  markAsClean() {
    document.getElementById('saveBtn').style.background = '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize options page
let optionsManager;
document.addEventListener('DOMContentLoaded', () => {
  optionsManager = new OptionsManager();
});