import { storage } from '@/lib/storage';
import { LinkProcessor } from './link-processor';
import { extractRepositoryFromUrl } from '@/lib/utils';
import type { ErrorLog } from '@/types';

class ContentScript {
  private linkProcessor: LinkProcessor;
  private currentRepository: string | null = null;
  private observer: MutationObserver | null = null;
  private isEnabled = true;

  constructor() {
    this.linkProcessor = new LinkProcessor();
    this.setupMessageListener();
    this.init();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'GET_DETECTED_KEYS') {
        this.handleGetDetectedKeys(sendResponse);
        return true; // Indicates async response
      }
    });
  }

  private async handleGetDetectedKeys(sendResponse: (response: any) => void): Promise<void> {
    try {
      if (!this.currentRepository) {
        sendResponse({ success: false, error: 'No repository detected' });
        return;
      }

      const detectedKeys = this.linkProcessor.getUniqueDetectedKeys();
      sendResponse({ 
        success: true, 
        data: {
          repository: this.currentRepository,
          keys: detectedKeys
        }
      });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async init(): Promise<void> {
    try {
      console.log('GitHub Issue Linker: Starting initialization...');
      
      // Get current repository from URL
      this.currentRepository = extractRepositoryFromUrl(window.location.href);
      console.log('GitHub Issue Linker: Current repository:', this.currentRepository);
      
      if (!this.currentRepository) {
        console.log('GitHub Issue Linker: Not a repository page');
        return;
      }

      // Check if extension is enabled
      console.log('GitHub Issue Linker: Checking user preferences...');
      const preferences = await storage.getUserPreferences();
      console.log('GitHub Issue Linker: User preferences:', preferences);
      this.isEnabled = preferences.enabled;

      if (!this.isEnabled) {
        console.log('GitHub Issue Linker: Extension is disabled');
        return;
      }

      // Get repository mappings
      console.log('GitHub Issue Linker: Getting repository mappings...');
      const mappings = await storage.getMappingForRepository(this.currentRepository);
      
      if (mappings.length === 0) {
        console.log(`GitHub Issue Linker: No mappings found for ${this.currentRepository}`);
        return;
      }

      console.log(`GitHub Issue Linker: Found ${mappings.length} mappings for ${this.currentRepository}`, mappings);

      // Initialize link processor with mappings
      this.linkProcessor.setMappings(mappings);

      // Process initial content
      await this.processInitialContent();

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();

      // Listen for navigation changes (GitHub SPA)
      this.setupNavigationListener();

    } catch (error) {
      await this.logError('Failed to initialize content script', error);
    }
  }

  private async processInitialContent(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Process the main content area
      const contentElement = document.querySelector('main') || document.body;
      await this.linkProcessor.processElement(contentElement);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      console.log(`GitHub Issue Linker: Initial processing completed in ${processingTime}ms`);
      
      // Save detected keys to storage
      const detectedKeys = this.linkProcessor.getUniqueDetectedKeys();
      if (detectedKeys.length > 0) {
        console.log(`GitHub Issue Linker: Detected ${detectedKeys.length} unique keys:`, detectedKeys);
      }
      
      // Record performance metrics
      await storage.addPerformanceMetric({
        repository: this.currentRepository!,
        linkificationTime: processingTime,
        elementsProcessed: this.linkProcessor.getProcessedCount(),
        successRate: detectedKeys.length / Math.max(this.linkProcessor.getProcessedCount(), 1),
        timestamp: Date.now(),
      });
      
    } catch (error) {
      await this.logError('Failed to process initial content', error);
    }
  }

  private setupMutationObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Debounced mutation handler
    const debouncedHandler = this.debounce(
      this.handleMutations.bind(this),
      100
    );

    this.observer = new MutationObserver(debouncedHandler);
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['class'], // Only observe class changes
    });
  }

  private async handleMutations(mutations: MutationRecord[]): Promise<void> {
    try {
      const relevantMutations = mutations.filter(
        mutation => mutation.type === 'childList' && mutation.addedNodes.length > 0
      );

      if (relevantMutations.length === 0) {
        return;
      }

      // Process added nodes
      for (const mutation of relevantMutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            await this.linkProcessor.processElement(node as Element);
          }
        }
      }
    } catch (error) {
      await this.logError('Failed to handle mutations', error);
    }
  }

  private setupNavigationListener(): void {
    // Listen for GitHub's soft navigation
    let lastUrl = window.location.href;
    
    const checkUrlChange = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.handleNavigation();
      }
    };

    // Method 1: MutationObserver for DOM changes
    const observer = new MutationObserver(checkUrlChange);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Method 2: History API events
    window.addEventListener('popstate', this.handleNavigation.bind(this));
    
    // Method 3: Override pushState and replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkUrlChange, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkUrlChange, 100);
    };

    // Method 4: Periodic URL check as fallback
    setInterval(checkUrlChange, 1000);
  }

  private async handleNavigation(): Promise<void> {
    try {
      const newRepository = extractRepositoryFromUrl(window.location.href);
      
      // Always reset detected keys on any navigation within GitHub
      console.log(`GitHub Issue Linker: Navigation detected from ${this.currentRepository} to ${newRepository}`);
      this.linkProcessor.reset();
      
      if (newRepository !== this.currentRepository) {
        console.log(`GitHub Issue Linker: Repository changed to ${newRepository}`);
        
        // Clear processing cache for old repository
        if (this.currentRepository) {
          await storage.clearProcessingCache(this.currentRepository);
        }
        
        this.currentRepository = newRepository;
        
        if (this.currentRepository) {
          // Get new mappings and reinitialize
          const mappings = await storage.getMappingForRepository(this.currentRepository);
          this.linkProcessor.setMappings(mappings);
        }
      }
      
      // Always reprocess content on any navigation (including same-repo navigation)
      if (this.currentRepository) {
        setTimeout(() => this.processInitialContent(), 500);
      }
    } catch (error) {
      await this.logError('Failed to handle navigation', error);
    }
  }

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  private async logError(message: string, error: any): Promise<void> {
    const errorLog: ErrorLog = {
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      level: 'error',
      message,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        repository: this.currentRepository,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    };

    await storage.addErrorLog(errorLog);
    console.error(`GitHub Issue Linker: ${message}`, error);
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize content script with error handling
console.log('GitHub Issue Linker: Content script starting...');

try {
  const contentScript = new ContentScript();
  
  // Make it globally accessible for debugging
  (window as any).contentScript = contentScript;
  
  console.log('GitHub Issue Linker: Content script initialized successfully');

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    contentScript.destroy();
  });
} catch (error) {
  console.error('GitHub Issue Linker: Failed to initialize content script:', error);
}