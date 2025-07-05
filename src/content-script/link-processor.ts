import type { RepositoryMapping, LinkProcessingOptions } from '@/types';
import { createSecureLink, shouldExcludeElement, getTextNodes, requestIdleCallback } from '@/lib/utils';
import { BacklogTracker } from '@/lib/issue-tracker';

export class LinkProcessor {
  private mappings: RepositoryMapping[] = [];
  private tracker = new BacklogTracker();
  private processedCount = 0;
  private successCount = 0;
  private options: LinkProcessingOptions = {
    performanceMode: 'auto',
    maxProcessingTime: 500,
    batchSize: 50,
    useIntersectionObserver: false,
  };
  private intersectionObserver?: IntersectionObserver;

  constructor(options?: Partial<LinkProcessingOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Determine processing strategy based on document size
    if (this.options.performanceMode === 'auto') {
      this.adaptToDocumentSize();
    }

    this.setupIntersectionObserver();
  }

  public setMappings(mappings: RepositoryMapping[]): void {
    this.mappings = mappings;
  }

  public async processElement(element: Element): Promise<void> {
    if (this.mappings.length === 0 || shouldExcludeElement(element)) {
      return;
    }

    try {
      if (this.options.useIntersectionObserver && this.intersectionObserver) {
        // Use intersection observer for large documents
        this.intersectionObserver.observe(element);
      } else {
        // Process immediately for smaller documents
        await this.processElementImmediately(element);
      }
    } catch (error) {
      console.error('Error processing element:', error);
    }
  }

  private async processElementImmediately(element: Element): Promise<void> {
    const startTime = performance.now();
    
    if (this.options.performanceMode === 'fast') {
      // Fast mode: process in idle time
      requestIdleCallback(() => this.processTextNodes(element));
    } else {
      // Comprehensive mode: process immediately
      await this.processTextNodes(element);
    }

    const processingTime = performance.now() - startTime;
    
    // Stop processing if taking too long
    if (processingTime > this.options.maxProcessingTime) {
      console.warn(`Processing taking too long (${processingTime}ms), switching to fast mode`);
      this.options.performanceMode = 'fast';
    }
  }

  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.processTextNodes(entry.target as Element);
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px', // Start processing when element is 100px away from viewport
        threshold: 0.1,
      }
    );
  }

  private adaptToDocumentSize(): void {
    const elementCount = document.querySelectorAll('*').length;
    
    if (elementCount < 1000) {
      // Small document: fast processing
      this.options.performanceMode = 'comprehensive';
      this.options.maxProcessingTime = 100;
      this.options.batchSize = 100;
      this.options.useIntersectionObserver = false;
    } else if (elementCount < 5000) {
      // Medium document: balanced processing
      this.options.performanceMode = 'auto';
      this.options.maxProcessingTime = 500;
      this.options.batchSize = 50;
      this.options.useIntersectionObserver = false;
    } else {
      // Large document: conservative processing
      this.options.performanceMode = 'fast';
      this.options.maxProcessingTime = 200;
      this.options.batchSize = 25;
      this.options.useIntersectionObserver = true;
    }
  }

  private async processTextNodes(element: Element): Promise<void> {
    const textNodes = getTextNodes(element);
    
    // Process in batches to avoid blocking the UI
    for (let i = 0; i < textNodes.length; i += this.options.batchSize) {
      const batch = textNodes.slice(i, i + this.options.batchSize);
      await this.processBatch(batch);
      
      // Yield control to the browser between batches
      if (i + this.options.batchSize < textNodes.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  private async processBatch(textNodes: Text[]): Promise<void> {
    for (const textNode of textNodes) {
      if (!textNode.textContent) continue;
      
      this.processedCount++;
      
      try {
        const processed = this.processTextNode(textNode);
        if (processed) {
          this.successCount++;
        }
      } catch (error) {
        console.error('Error processing text node:', error);
      }
    }
  }

  private processTextNode(textNode: Text): boolean {
    if (!textNode.textContent || !textNode.parentElement) {
      return false;
    }

    let hasMatches = false;
    let processedText = textNode.textContent;

    // Process each mapping
    for (const mapping of this.mappings) {
      const pattern = this.tracker.generatePattern(mapping.keyPrefix);
      const matches = processedText.match(pattern);
      
      if (matches) {
        hasMatches = true;
        
        // Replace matches with links
        for (const match of matches) {
          try {
            const link = createSecureLink(match, mapping.backlogUrl);
            processedText = processedText.replace(match, link.outerHTML);
          } catch (error) {
            console.error(`Error creating link for ${match}:`, error);
          }
        }
      }
    }

    if (hasMatches) {
      // Replace the text node with processed HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedText;
      
      // Replace text node with new elements
      const parent = textNode.parentElement;
      const fragment = document.createDocumentFragment();
      
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      parent.replaceChild(fragment, textNode);
    }

    return hasMatches;
  }

  public getProcessedCount(): number {
    return this.processedCount;
  }

  public getSuccessRate(): number {
    return this.processedCount > 0 ? this.successCount / this.processedCount : 0;
  }

  public reset(): void {
    this.processedCount = 0;
    this.successCount = 0;
  }

  public destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}