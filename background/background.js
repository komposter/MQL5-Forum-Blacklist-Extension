/**
 * MQL5 Forum Blacklist - Background Service Worker
 * Handles extension lifecycle and storage management
 */

// Default storage structure
const DEFAULT_STORAGE = {
  blacklist: [],
  isEnabled: true,
  settings: {
    hideCompletely: true,
    showIndicator: true,
    statisticsEnabled: true,
    maxBlacklistSize: 1000
  },
  statistics: {
    totalHiddenPosts: 0,
    lastReset: Date.now()
  }
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default storage on first install
    chrome.storage.sync.set(DEFAULT_STORAGE, () => {
      console.log('MQL5 Forum Blacklist: Default settings initialized');
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Handle updates - migrate data if needed
    handleExtensionUpdate(details.previousVersion);
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('MQL5 Forum Blacklist: Extension started');
  
  // Verify storage integrity
  chrome.storage.sync.get(DEFAULT_STORAGE, (result) => {
    if (Object.keys(result).length === 0) {
      // Storage is empty, initialize with defaults
      chrome.storage.sync.set(DEFAULT_STORAGE);
    }
  });
});

/**
 * Handle extension updates
 */
function handleExtensionUpdate(previousVersion) {
  console.log(`MQL5 Forum Blacklist: Updated from ${previousVersion}`);
  
  // Get current storage
  chrome.storage.sync.get(null, (currentData) => {
    // Merge with new defaults
    const updatedData = { ...DEFAULT_STORAGE, ...currentData };
    
    // Ensure all required fields exist
    Object.keys(DEFAULT_STORAGE).forEach(key => {
      if (updatedData[key] === undefined) {
        updatedData[key] = DEFAULT_STORAGE[key];
      }
    });
    
    // Update storage
    chrome.storage.sync.set(updatedData, () => {
      console.log('MQL5 Forum Blacklist: Storage updated for new version');
    });
  });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getStorage':
      handleGetStorage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'setStorage':
      handleSetStorage(message, sender, sendResponse);
      return true;
      
    case 'getStatistics':
      handleGetStatistics(message, sender, sendResponse);
      return true;
      
    case 'updateStatistics':
      handleUpdateStatistics(message, sender, sendResponse);
      return true;
      
    default:
      console.warn('MQL5 Forum Blacklist: Unknown message type', message.type);
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handle storage retrieval requests
 */
function handleGetStorage(message, sender, sendResponse) {
  const keys = message.keys || null; // null gets all storage
  
  chrome.storage.sync.get(keys || DEFAULT_STORAGE, (result) => {
    if (chrome.runtime.lastError) {
      console.error('MQL5 Forum Blacklist: Storage get error', chrome.runtime.lastError);
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ data: result });
    }
  });
}

/**
 * Handle storage update requests
 */
function handleSetStorage(message, sender, sendResponse) {
  if (!message.data) {
    sendResponse({ error: 'No data provided' });
    return;
  }
  
  chrome.storage.sync.set(message.data, () => {
    if (chrome.runtime.lastError) {
      console.error('MQL5 Forum Blacklist: Storage set error', chrome.runtime.lastError);
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      console.log('MQL5 Forum Blacklist: Storage updated successfully');
      sendResponse({ success: true });
      
      // Notify all content scripts about the update
      notifyContentScripts('storageUpdated', message.data);
    }
  });
}

/**
 * Handle statistics retrieval requests
 */
function handleGetStatistics(message, sender, sendResponse) {
  chrome.storage.sync.get(['statistics'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('MQL5 Forum Blacklist: Statistics get error', chrome.runtime.lastError);
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ statistics: result.statistics || DEFAULT_STORAGE.statistics });
    }
  });
}

/**
 * Handle statistics update requests
 */
function handleUpdateStatistics(message, sender, sendResponse) {
  if (!message.statistics) {
    sendResponse({ error: 'No statistics provided' });
    return;
  }
  
  chrome.storage.sync.get(['statistics'], (result) => {
    const currentStats = result.statistics || DEFAULT_STORAGE.statistics;
    const updatedStats = { ...currentStats, ...message.statistics };
    
    chrome.storage.sync.set({ statistics: updatedStats }, () => {
      if (chrome.runtime.lastError) {
        console.error('MQL5 Forum Blacklist: Statistics update error', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        console.log('MQL5 Forum Blacklist: Statistics updated');
        sendResponse({ success: true });
      }
    });
  });
}

/**
 * Notify all content scripts about changes
 */
function notifyContentScripts(messageType, data) {
  // Query all tabs with MQL5 forum pages
  chrome.tabs.query({ url: '*://www.mql5.com/*/forum*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        type: messageType, 
        data: data 
      }).catch(error => {
        // Content script might not be loaded in this tab
        console.debug('MQL5 Forum Blacklist: Could not notify tab', tab.id, error);
      });
    });
  });
}

/**
 * Handle storage changes (for debugging and monitoring)
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('MQL5 Forum Blacklist: Storage changed', changes);
    
    // Notify content scripts about specific changes
    if (changes.blacklist || changes.settings) {
      notifyContentScripts('storageUpdated', changes);
    }
  }
});

/**
 * Handle tab updates (for automatic injection)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if this is an MQL5 forum page that finished loading
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mql5.com/forum')) {
    console.log('MQL5 Forum Blacklist: Forum page loaded', tab.url);
    
    // Content script should auto-inject via manifest, but we can send a message
    // to ensure it's aware of the page load
    chrome.tabs.sendMessage(tabId, { type: 'pageLoaded' }).catch(error => {
      // Content script might not be loaded yet
      console.debug('MQL5 Forum Blacklist: Content script not ready', error);
    });
  }
});

/**
 * Handle extension icon click (optional additional functionality)
 */
chrome.action.onClicked.addListener((tab) => {
  // This is only triggered if no popup is defined in manifest
  // Since we have a popup defined, this won't be called
  console.log('MQL5 Forum Blacklist: Extension icon clicked');
});

/**
 * Utility function to validate storage data
 */
function validateStorageData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check required fields
  if (!Array.isArray(data.blacklist)) return false;
  if (typeof data.isEnabled !== 'boolean') return false;
  if (!data.settings || typeof data.settings !== 'object') return false;
  if (!data.statistics || typeof data.statistics !== 'object') return false;
  
  return true;
}

/**
 * Clean up invalid entries from blacklist
 */
function cleanupBlacklist() {
  chrome.storage.sync.get(['blacklist'], (result) => {
    if (result.blacklist && Array.isArray(result.blacklist)) {
      const cleanedBlacklist = result.blacklist.filter(entry => {
        return entry && 
               typeof entry === 'object' && 
               typeof entry.username === 'string' && 
               entry.username.trim().length > 0;
      });
      
      if (cleanedBlacklist.length !== result.blacklist.length) {
        chrome.storage.sync.set({ blacklist: cleanedBlacklist }, () => {
          console.log(`MQL5 Forum Blacklist: Cleaned up ${result.blacklist.length - cleanedBlacklist.length} invalid entries`);
        });
      }
    }
  });
}

// Run cleanup on startup
chrome.runtime.onStartup.addListener(cleanupBlacklist);
chrome.runtime.onInstalled.addListener(cleanupBlacklist);

console.log('MQL5 Forum Blacklist: Background service worker initialized');