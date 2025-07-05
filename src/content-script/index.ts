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
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Get current repository from URL
      this.currentRepository = extractRepositoryFromUrl(window.location.href);
      
      if (!this.currentRepository) {
        console.log('GitHub Issue Linker: Not a repository page');
        return;
      }

      // Check if extension is enabled
      const preferences = await storage.getUserPreferences();
      this.isEnabled = preferences.enabled;

      if (!this.isEnabled) {
        console.log('GitHub Issue Linker: Extension is disabled');
        return;
      }

      // Get repository mappings
      const mappings = await storage.getMappingForRepository(this.currentRepository);
      
      if (mappings.length === 0) {
        console.log(`GitHub Issue Linker: No mappings found for ${this.currentRepository}`);
        return;
      }

      console.log(`GitHub Issue Linker: Found ${mappings.length} mappings for ${this.currentRepository}`);

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
      
      // Record performance metrics
      await storage.addPerformanceMetric({
        repository: this.currentRepository!,
        linkificationTime: processingTime,
        elementsProcessed: this.linkProcessor.getProcessedCount(),
        successRate: this.linkProcessor.getSuccessRate(),
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
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.handleNavigation();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also listen for popstate events
    window.addEventListener('popstate', this.handleNavigation.bind(this));
  }

  private async handleNavigation(): Promise<void> {
    try {
      const newRepository = extractRepositoryFromUrl(window.location.href);
      
      if (newRepository !== this.currentRepository) {
        console.log(`GitHub Issue Linker: Navigation detected to ${newRepository}`);
        
        // Clear processing cache for old repository
        if (this.currentRepository) {
          await storage.clearProcessingCache(this.currentRepository);
        }
        
        this.currentRepository = newRepository;
        
        if (this.currentRepository) {
          // Get new mappings and reinitialize
          const mappings = await storage.getMappingForRepository(this.currentRepository);
          this.linkProcessor.setMappings(mappings);
          
          // Process new content after a short delay to allow page to load
          setTimeout(() => this.processInitialContent(), 500);
        }
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

// Initialize content script
const contentScript = new ContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
});