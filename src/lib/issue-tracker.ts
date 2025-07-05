import type { IssueTracker } from '@/types';
import { sanitizeUrl } from '@/lib/utils';

export class GenericTracker implements IssueTracker {
  name = 'Generic';
  
  generatePattern(keyPrefix: string): RegExp {
    // Create pattern for specific key prefix (e.g., WMS-123)
    return new RegExp(`\\b${keyPrefix}-\\d+\\b`, 'g');
  }
  
  get detectPattern(): RegExp {
    // Generic pattern for any issue key
    return /\b[A-Z][A-Z0-9_-]*-\d+\b/g;
  }
  
  generateUrl(key: string, baseUrl: string): string {
    const sanitized = sanitizeUrl(baseUrl);
    return `${sanitized}/${encodeURIComponent(key)}`;
  }
  
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.length > 0;
    } catch {
      return false;
    }
  }
}

// Future extensibility for other issue trackers
export class JiraTracker implements IssueTracker {
  name = 'Jira';
  
  generatePattern(keyPrefix: string): RegExp {
    return new RegExp(`\\b${keyPrefix}-\\d+\\b`, 'g');
  }
  
  get detectPattern(): RegExp {
    return /\b[A-Z][A-Z0-9_-]*-\d+\b/g;
  }
  
  generateUrl(key: string, baseUrl: string): string {
    const sanitized = sanitizeUrl(baseUrl);
    return `${sanitized}/browse/${encodeURIComponent(key)}`;
  }
  
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('atlassian');
    } catch {
      return false;
    }
  }
}

export class LinearTracker implements IssueTracker {
  name = 'Linear';
  
  generatePattern(keyPrefix: string): RegExp {
    return new RegExp(`\\b${keyPrefix}-\\d+\\b`, 'g');
  }
  
  get detectPattern(): RegExp {
    return /\b[A-Z][A-Z0-9_-]*-\d+\b/g;
  }
  
  generateUrl(key: string, baseUrl: string): string {
    const sanitized = sanitizeUrl(baseUrl);
    return `${sanitized}/issue/${encodeURIComponent(key)}`;
  }
  
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('linear.app');
    } catch {
      return false;
    }
  }
}

export const issueTrackers = {
  generic: new GenericTracker(),
  jira: new JiraTracker(),
  linear: new LinearTracker(),
};