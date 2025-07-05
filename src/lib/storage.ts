import type { RepositoryMapping, UserPreferences, GlobalSettings, PerformanceMetrics, ErrorLog, ProcessingCache } from '@/types';

class StorageManager {
  private static instance: StorageManager;
  
  private constructor() {}
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // User Preferences (sync storage)
  async getUserPreferences(): Promise<UserPreferences> {
    const result = await chrome.storage.sync.get('userPreferences');
    return result.userPreferences || {
      enabled: true,
      theme: 'system',
      showNotifications: true,
      performanceMode: 'auto',
    };
  }

  async setUserPreferences(preferences: UserPreferences): Promise<void> {
    await chrome.storage.sync.set({ userPreferences: preferences });
  }

  // Global Settings (sync storage)
  async getGlobalSettings(): Promise<GlobalSettings> {
    const result = await chrome.storage.sync.get('globalSettings');
    return result.globalSettings || {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      migrationVersion: 1,
    };
  }

  async setGlobalSettings(settings: GlobalSettings): Promise<void> {
    await chrome.storage.sync.set({ globalSettings: settings });
  }

  // Repository Mappings (local storage)
  async getRepositoryMappings(): Promise<RepositoryMapping[]> {
    const result = await chrome.storage.local.get('repositoryMappings');
    return result.repositoryMappings || [];
  }

  async setRepositoryMappings(mappings: RepositoryMapping[]): Promise<void> {
    // Limit to 1000 items as per design
    const limitedMappings = mappings.slice(0, 1000);
    await chrome.storage.local.set({ repositoryMappings: limitedMappings });
  }

  async addRepositoryMapping(mapping: RepositoryMapping): Promise<void> {
    const mappings = await this.getRepositoryMappings();
    const existingIndex = mappings.findIndex(m => m.id === mapping.id);
    
    if (existingIndex !== -1) {
      mappings[existingIndex] = mapping;
    } else {
      mappings.push(mapping);
    }
    
    await this.setRepositoryMappings(mappings);
  }

  async removeRepositoryMapping(id: string): Promise<void> {
    const mappings = await this.getRepositoryMappings();
    const filtered = mappings.filter(m => m.id !== id);
    await this.setRepositoryMappings(filtered);
  }

  async getMappingForRepository(repository: string): Promise<RepositoryMapping[]> {
    const mappings = await this.getRepositoryMappings();
    return mappings.filter(m => m.repository === repository && m.enabled);
  }

  // Performance Metrics (local storage)
  async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    const result = await chrome.storage.local.get('performanceMetrics');
    return result.performanceMetrics || [];
  }

  async addPerformanceMetric(metric: PerformanceMetrics): Promise<void> {
    const metrics = await this.getPerformanceMetrics();
    metrics.push(metric);
    
    // Keep only last 100 metrics per repository
    const recentMetrics = metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
    
    await chrome.storage.local.set({ performanceMetrics: recentMetrics });
  }

  // Processing Cache (session storage)
  async getProcessingCache(repository: string): Promise<ProcessingCache | null> {
    const result = await chrome.storage.session.get('processingCache');
    const cache = result.processingCache || {};
    return cache[repository] || null;
  }

  async setProcessingCache(repository: string, cache: ProcessingCache): Promise<void> {
    const result = await chrome.storage.session.get('processingCache');
    const existingCache = result.processingCache || {};
    
    existingCache[repository] = cache;
    await chrome.storage.session.set({ processingCache: existingCache });
  }

  async clearProcessingCache(repository: string): Promise<void> {
    const result = await chrome.storage.session.get('processingCache');
    const cache = result.processingCache || {};
    
    delete cache[repository];
    await chrome.storage.session.set({ processingCache: cache });
  }

  // Error Logs (session storage)
  async getErrorLogs(): Promise<ErrorLog[]> {
    const result = await chrome.storage.session.get('errorLogs');
    return result.errorLogs || [];
  }

  async addErrorLog(log: ErrorLog): Promise<void> {
    const logs = await this.getErrorLogs();
    logs.push(log);
    
    // Keep only last 50 error logs
    const recentLogs = logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    
    await chrome.storage.session.set({ errorLogs: recentLogs });
  }

  async clearErrorLogs(): Promise<void> {
    await chrome.storage.session.set({ errorLogs: [] });
  }

  // Utility methods
  async exportSettings(): Promise<string> {
    const [userPreferences, globalSettings, repositoryMappings] = await Promise.all([
      this.getUserPreferences(),
      this.getGlobalSettings(),
      this.getRepositoryMappings(),
    ]);

    const exportData = {
      userPreferences,
      globalSettings,
      repositoryMappings,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importSettings(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.userPreferences) {
        await this.setUserPreferences(importData.userPreferences);
      }
      
      if (importData.globalSettings) {
        await this.setGlobalSettings(importData.globalSettings);
      }
      
      if (importData.repositoryMappings) {
        await this.setRepositoryMappings(importData.repositoryMappings);
      }
    } catch (error) {
      throw new Error('Invalid JSON data for import');
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      chrome.storage.sync.clear(),
      chrome.storage.local.clear(),
      chrome.storage.session.clear(),
    ]);
  }
}

export const storage = StorageManager.getInstance();