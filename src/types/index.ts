export interface RepositoryMapping {
  id: string;
  repository: string; // org/repo format
  trackerUrl: string;
  keyPrefix: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  enabled: boolean;
  theme: 'light' | 'dark' | 'system';
  showNotifications: boolean;
  performanceMode: 'auto' | 'fast' | 'comprehensive';
}

export interface GlobalSettings {
  version: string;
  lastUpdated: string;
  migrationVersion: number;
}

export interface ProcessingCache {
  repository: string;
  processedElements: Set<string>;
  lastProcessedAt: number;
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface PerformanceMetrics {
  repository: string;
  linkificationTime: number;
  elementsProcessed: number;
  successRate: number;
  timestamp: number;
}

export interface StorageData {
  sync: {
    userPreferences: UserPreferences;
    globalSettings: GlobalSettings;
  };
  local: {
    repositoryMappings: RepositoryMapping[];
    performanceMetrics: PerformanceMetrics[];
  };
  session: {
    processingCache: Record<string, ProcessingCache>;
    errorLogs: ErrorLog[];
  };
}

export interface IssueTracker {
  name: string;
  detectPattern: RegExp;
  generateUrl: (key: string, baseUrl: string) => string;
  validateUrl: (url: string) => boolean;
}

export interface LinkProcessingOptions {
  performanceMode: 'auto' | 'fast' | 'comprehensive';
  maxProcessingTime: number;
  batchSize: number;
  useIntersectionObserver: boolean;
}