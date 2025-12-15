/**
 * MQL5 Forum User Blacklist - Content Script
 * Detects and hides posts from blacklisted users
 */

class MQL5ForumBlacklist {
  constructor() {
    this.blacklist = [];
    this.settings = {
      isEnabled: true,
      hideCompletely: true,
      showIndicator: true,
      statisticsEnabled: true
    };
    this.hiddenCount = 0;
    this.observer = null;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    if (this.settings.isEnabled) {
      this.startObserving();
      this.processExistingPosts();
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        blacklist: [],
        isEnabled: true,
        settings: {
          hideCompletely: true,
          showIndicator: true,
          statisticsEnabled: true
        }
      });
      
      this.blacklist = result.blacklist.map(entry => entry.username.toLowerCase());
      this.settings = { ...this.settings, ...result.settings, isEnabled: result.isEnabled };
    } catch (error) {
      console.warn('MQL5 Blacklist: Failed to load settings', error);
    }
  }

  startObserving() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewElements(node);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processNewElements(element) {
    const posts = this.findPostsInElement(element);
    posts.forEach(post => this.processPost(post));
  }

  processExistingPosts() {
    const posts = this.findAllPosts();
    posts.forEach(post => this.processPost(post));
    this.updateStatistics();
  }

  findAllPosts() {
    const posts = [];
    
    // MQL5 forum post selectors based on current forum structure
    const postSelectors = [
      '.forum-message',
      '.forum-post',
      '.message-item',
      '.post-item',
      '[data-message-id]',
      '.user-message',
      '.comment-box'
    ];

    postSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const author = this.extractAuthor(element);
        if (author) {
          posts.push({
            element: element,
            author: author,
            authorElement: this.findAuthorElement(element)
          });
        }
      });
    });

    return posts;
  }

  findPostsInElement(container) {
    const posts = [];
    
    const postSelectors = [
      '.forum-message',
      '.forum-post',
      '.message-item',
      '.post-item',
      '[data-message-id]',
      '.user-message',
      '.comment-box'
    ];

    postSelectors.forEach(selector => {
      const elements = container.matches && container.matches(selector) 
        ? [container] 
        : container.querySelectorAll(selector);
      
      elements.forEach(element => {
        const author = this.extractAuthor(element);
        if (author) {
          posts.push({
            element: element,
            author: author,
            authorElement: this.findAuthorElement(element)
          });
        }
      });
    });

    return posts;
  }

  extractAuthor(postElement) {
    const nameEl = postElement.querySelector('a.author, .author-name, .forum-user-name, .user-name, .message-author, .post-author, .username');
    const name = nameEl ? (nameEl.textContent || nameEl.title || '').trim() : '';

    let login = '';
    const avatarImg = postElement.querySelector('img[data-user-login]');
    if (avatarImg) {
      login = avatarImg.getAttribute('data-user-login')?.trim() || '';
    }
    let slug = '';
    const hrefEl = postElement.querySelector('a[href*="/users/"]') || nameEl;
    const href = hrefEl ? (hrefEl.getAttribute('href') || '').trim() : '';
    if (href) {
      const m = href.match(/\/users\/([^\/]+)/);
      if (m && m[1]) slug = decodeURIComponent(m[1]);
    }

    if (!name && !login && !href && !slug) return null;
    return { name, login, href, slug };
  }

  findAuthorElement(postElement) {
    const authorSelectors = [
      '.forum-user-name',
      '.user-name',
      '.author-name',
      '.message-author',
      '.post-author',
      '[data-user-name]',
      '.username'
    ];

    for (const selector of authorSelectors) {
      const element = postElement.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  processPost(post) {
    if (!post.author) return;
    const identifiers = [];
    if (typeof post.author === 'string') {
      identifiers.push(post.author.toLowerCase());
    } else {
      if (post.author.name) identifiers.push(post.author.name.toLowerCase());
      if (post.author.login) identifiers.push(post.author.login.toLowerCase());
      if (post.author.slug) identifiers.push(post.author.slug.toLowerCase());
      if (post.author.href) identifiers.push(post.author.href.toLowerCase());
    }
    const isBlacklisted = identifiers.some(id => this.blacklist.includes(id));
    if (isBlacklisted) {
      this.hidePost(post);
    } else {
      this.showPost(post);
    }
  }

  hidePost(post) {
    if (post.element.dataset.blacklistHidden === 'true') return;

    post.element.dataset.blacklistHidden = 'true';
    this.hiddenCount++;

    if (this.settings.hideCompletely) {
      post.element.style.display = 'none';
    } else {
      post.element.style.opacity = '0.1';
      post.element.style.pointerEvents = 'none';
    }

    if (this.settings.showIndicator) {
      this.addHiddenIndicator(post.element);
    }

    this.updateStatistics();
  }

  showPost(post) {
    if (post.element.dataset.blacklistHidden !== 'true') return;

    delete post.element.dataset.blacklistHidden;
    this.hiddenCount = Math.max(0, this.hiddenCount - 1);

    post.element.style.display = '';
    post.element.style.opacity = '';
    post.element.style.pointerEvents = '';

    this.removeHiddenIndicator(post.element);
    this.updateStatistics();
  }

  addHiddenIndicator(element) {
    if (element.querySelector('.blacklist-indicator')) return;

    const indicator = document.createElement('div');
    indicator.className = 'blacklist-indicator';
    indicator.style.cssText = `
      background: rgba(255, 165, 0, 0.1);
      border: 1px dashed #ffa500;
      padding: 8px;
      margin: 8px 0;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
      text-align: center;
    `;
    indicator.textContent = 'Post from blacklisted user';

    element.appendChild(indicator);
  }

  removeHiddenIndicator(element) {
    const indicator = element.querySelector('.blacklist-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  updateStatistics() {
    if (!this.settings.statisticsEnabled) return;

    chrome.storage.sync.get(['statistics'], (result) => {
      const stats = result.statistics || { totalHiddenPosts: 0 };
      stats.totalHiddenPosts = this.hiddenCount;
      chrome.storage.sync.set({ statistics: stats });
    });
  }

  // Handle messages from popup
  async handleMessage(message) {
    switch (message.type) {
      case 'getStats':
        return {
          hiddenCount: this.hiddenCount,
          blacklistCount: this.blacklist.length,
          isEnabled: this.settings.isEnabled
        };
      
      case 'updateBlacklist':
        await this.loadSettings();
        this.processExistingPosts();
        break;
      
      case 'toggleExtension':
        this.settings.isEnabled = message.enabled;
        if (this.settings.isEnabled) {
          this.processExistingPosts();
        } else {
          this.showAllPosts();
        }
        break;
    }
  }

  showAllPosts() {
    const hiddenPosts = document.querySelectorAll('[data-blacklist-hidden="true"]');
    hiddenPosts.forEach(post => {
      post.style.display = '';
      post.style.opacity = '';
      post.style.pointerEvents = '';
      delete post.dataset.blacklistHidden;
      this.removeHiddenIndicator(post);
    });
    this.hiddenCount = 0;
    this.updateStatistics();
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.showAllPosts();
  }
}

// Initialize the blacklist manager
let blacklistManager = null;

function initializeBlacklist() {
  if (blacklistManager) {
    blacklistManager.destroy();
  }
  blacklistManager = new MQL5ForumBlacklist();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBlacklist);
} else {
  initializeBlacklist();
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (blacklistManager) {
    blacklistManager.handleMessage(message).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Handle page navigation (for SPAs)
let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    setTimeout(initializeBlacklist, 1000); // Delay for SPA page load
  }
}).observe(document, { subtree: true, childList: true });
