import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // Only allow https protocol
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }
    return parsedUrl.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function extractRepositoryFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function isValidRepositoryName(repository: string): boolean {
  // GitHub repository format: org/repo
  const regex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
  return regex.test(repository);
}

export function isValidKeyPrefix(prefix: string): boolean {
  // Allow alphanumeric characters, underscores, and hyphens (case-insensitive)
  const regex = /^[A-Za-z][A-Za-z0-9_-]*$/;
  return regex.test(prefix);
}

export function createSecureLink(issueKey: string, backlogUrl: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.textContent = issueKey;
  link.href = `${sanitizeUrl(backlogUrl)}/${encodeURIComponent(issueKey)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'backlog-issue-link';
  link.style.cssText = `
    color: #0969da;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.2s ease;
  `;
  
  // Add hover effect
  link.addEventListener('mouseenter', () => {
    link.style.textDecorationColor = '#0969da';
  });
  
  link.addEventListener('mouseleave', () => {
    link.style.textDecorationColor = 'transparent';
  });
  
  return link;
}

export function shouldExcludeElement(element: Element): boolean {
  // Exclude input fields, existing links, and code blocks
  const excludeSelectors = [
    'input',
    'textarea',
    'select',
    'button',
    'a',
    'code',
    'pre',
    '[contenteditable="true"]',
    '.CodeMirror',
    '.ace_editor',
    '.monaco-editor',
  ];
  
  return excludeSelectors.some(selector => element.closest(selector) !== null);
}

export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const startTime = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then(res => {
      const endTime = performance.now();
      console.log(`${name}: ${endTime - startTime}ms`);
      return res;
    });
  } else {
    const endTime = performance.now();
    console.log(`${name}: ${endTime - startTime}ms`);
    return result;
  }
}

export function requestIdleCallback(callback: () => void, timeout = 5000): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(callback, 1);
  }
}

export function isLargeDocument(): boolean {
  return document.querySelectorAll('*').length > 5000;
}

export function getTextNodes(element: Element): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip empty text nodes and those in excluded elements
        if (!node.textContent?.trim() || shouldExcludeElement(node.parentElement!)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }
  
  return textNodes;
}