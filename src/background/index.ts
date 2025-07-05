import { storage } from '@/lib/storage';

class BackgroundService {
  constructor() {
    this.init();
  }

  private init(): void {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Handle storage changes
    chrome.storage.onChanged.addListener(this.handleStorageChanged.bind(this));
    
    // Handle tab updates to clear badge when leaving GitHub
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    
    // Handle tab removal to clean up badges
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    
    console.log('GitHub Issue Linker: Background service initialized');
  }

  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    try {
      if (details.reason === 'install') {
        // Set up default settings on first install
        await this.setupDefaultSettings();
        console.log('GitHub Issue Linker: Extension installed');
        
        // Show welcome notification
        await this.showNotification('Welcome to GitHub Issue Linker!', 'Configure your issue tracker settings to get started.');
      } else if (details.reason === 'update') {
        // Handle extension updates
        await this.handleUpdate(details.previousVersion);
        console.log(`GitHub Issue Linker: Updated from ${details.previousVersion}`);
      }
    } catch (error) {
      console.error('Error handling installation:', error);
    }
  }

  private async setupDefaultSettings(): Promise<void> {
    // Set default user preferences
    const defaultPreferences = {
      enabled: true,
      theme: 'system' as const,
      showNotifications: true,
      performanceMode: 'auto' as const,
    };
    
    await storage.setUserPreferences(defaultPreferences);
    
    // Set default global settings
    const defaultGlobalSettings = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      migrationVersion: 1,
    };
    
    await storage.setGlobalSettings(defaultGlobalSettings);
  }

  private async handleUpdate(_previousVersion?: string): Promise<void> {
    const globalSettings = await storage.getGlobalSettings();
    
    // Perform migration if needed
    if (globalSettings.migrationVersion < 1) {
      // Future migration logic would go here
      await storage.setGlobalSettings({
        ...globalSettings,
        migrationVersion: 1,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  private handleMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    // Handle async operations
    (async () => {
      try {
        switch (message.type) {
          case 'GET_REPOSITORY_MAPPINGS':
            const mappings = await storage.getRepositoryMappings();
            sendResponse({ success: true, data: mappings });
            break;
            
          case 'ADD_REPOSITORY_MAPPING':
            await storage.addRepositoryMapping(message.data);
            sendResponse({ success: true });
            break;
            
          case 'REMOVE_REPOSITORY_MAPPING':
            await storage.removeRepositoryMapping(message.data.id);
            sendResponse({ success: true });
            break;
            
          case 'GET_USER_PREFERENCES':
            const preferences = await storage.getUserPreferences();
            sendResponse({ success: true, data: preferences });
            break;
            
          case 'SET_USER_PREFERENCES':
            await storage.setUserPreferences(message.data);
            sendResponse({ success: true });
            break;
            
          case 'EXPORT_SETTINGS':
            const exportData = await storage.exportSettings();
            sendResponse({ success: true, data: exportData });
            break;
            
          case 'IMPORT_SETTINGS':
            await storage.importSettings(message.data);
            sendResponse({ success: true });
            break;
            
          case 'GET_PERFORMANCE_METRICS':
            const metrics = await storage.getPerformanceMetrics();
            sendResponse({ success: true, data: metrics });
            break;
            
          case 'GET_ERROR_LOGS':
            const logs = await storage.getErrorLogs();
            sendResponse({ success: true, data: logs });
            break;
            
          case 'CLEAR_ERROR_LOGS':
            await storage.clearErrorLogs();
            sendResponse({ success: true });
            break;
            
          case 'SHOW_NOTIFICATION':
            await this.showNotification(message.data.title, message.data.message);
            sendResponse({ success: true });
            break;
            
          case 'UPDATE_BADGE':
            await this.updateBadge(message.data.count, _sender.tab?.id);
            sendResponse({ success: true });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }

  private async handleStorageChanged(
    changes: { [key: string]: chrome.storage.StorageChange },
    namespace: 'sync' | 'local' | 'managed' | 'session'
  ): Promise<void> {
    try {
      // Notify content scripts about preference changes
      if (namespace === 'sync' && changes.userPreferences) {
        const tabs = await chrome.tabs.query({ url: 'https://github.com/*' });
        
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'PREFERENCES_CHANGED',
              data: changes.userPreferences.newValue,
            }).catch(() => {
              // Tab might not have content script loaded
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling storage changes:', error);
    }
  }

  private async updateBadge(count: number, tabId?: number): Promise<void> {
    try {
      // Set badge text
      const badgeText = count > 0 ? count.toString() : '';
      
      if (tabId) {
        // Update badge for specific tab
        await chrome.action.setBadgeText({ text: badgeText, tabId });
      } else {
        // Update badge globally
        await chrome.action.setBadgeText({ text: badgeText });
      }
      
      // Set badge background color (dark gray/black for subtle appearance)
      await chrome.action.setBadgeBackgroundColor({ 
        color: count > 0 ? '#4a4a4a' : '#808080',
        ...(tabId && { tabId })
      });
      
      console.log(`GitHub Issue Linker: Badge updated to ${count} for tab ${tabId || 'global'}`);
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  private async handleTabUpdated(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
  ): Promise<void> {
    // Clear badge when navigating away from GitHub or on page load
    if (changeInfo.status === 'loading' && tab.url) {
      if (!tab.url.includes('github.com')) {
        await this.updateBadge(0, tabId);
      }
    }
  }

  private async handleTabRemoved(tabId: number): Promise<void> {
    // Clean up any tab-specific data when tab is closed
    try {
      await chrome.action.setBadgeText({ text: '', tabId });
    } catch (error) {
      // Tab already closed, ignore error
    }
  }

  private async showNotification(title: string, message: string): Promise<void> {
    const preferences = await storage.getUserPreferences();
    
    if (!preferences.showNotifications) {
      return;
    }

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title,
        message,
      });
    } catch (error) {
      // Notifications permission might not be granted
      console.log('Could not show notification:', error);
    }
  }
}

// Initialize background service
new BackgroundService();