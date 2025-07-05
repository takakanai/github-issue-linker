import type { RepositoryMapping, LinkProcessingOptions } from '@/types';
import { shouldExcludeElement, getTextNodes, requestIdleCallback } from '@/lib/utils';
import { GenericTracker } from '@/lib/issue-tracker';

export class LinkProcessor {
  private mappings: RepositoryMapping[] = [];
  private tracker = new GenericTracker();
  private processedCount = 0;
  private detectedKeys: Array<{ key: string; mapping: RepositoryMapping }> = [];
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
    console.log('GitHub Issue Linker: Set mappings:', mappings);
    
    // Test pattern matching
    if (mappings.length > 0) {
      for (const mapping of mappings) {
        const pattern = this.tracker.generatePattern(mapping.keyPrefix);
        console.log(`GitHub Issue Linker: Pattern for ${mapping.keyPrefix}:`, pattern);
        
        // Test with sample text
        const testText = `This is a test with ${mapping.keyPrefix}-123 and ${mapping.keyPrefix}-456`;
        const matches = testText.match(pattern);
        console.log(`GitHub Issue Linker: Test matches for "${testText}":`, matches);
      }
    }
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
    console.log(`GitHub Issue Linker: Found ${textNodes.length} text nodes to process in element:`, element);
    
    // Also detect keys in existing links
    this.detectKeysInExistingLinks(element);
    
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
        this.detectKeysInTextNode(textNode);
      } catch (error) {
        console.error('Error processing text node:', error);
      }
    }
  }

  private detectKeysInExistingLinks(element: Element): void {
    const links = element.querySelectorAll('a');
    
    for (const link of links) {
      if (!link.textContent) continue;
      
      const linkText = link.textContent;
      
      for (const mapping of this.mappings) {
        const pattern = this.tracker.generatePattern(mapping.keyPrefix);
        let match;
        
        // Reset regex lastIndex to ensure we find all matches
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(linkText)) !== null) {
          const key = match[0];
          
          // Check if we already detected this key
          const alreadyDetected = this.detectedKeys.some(detected => 
            detected.key === key && detected.mapping.keyPrefix === mapping.keyPrefix
          );
          
          if (!alreadyDetected) {
            this.detectedKeys.push({ key, mapping });
            console.log(`GitHub Issue Linker: Detected issue key ${key} in existing link`);
          }
          
          // Prevent infinite loop on zero-length matches
          if (match.index === pattern.lastIndex) {
            pattern.lastIndex++;
          }
        }
      }
    }
  }

  private detectKeysInTextNode(textNode: Text): void {
    if (!textNode.textContent || !textNode.parentElement) {
      return;
    }

    // Skip if this text is already inside a link
    let parent: HTMLElement | null = textNode.parentElement;
    while (parent) {
      if (parent.tagName === 'A') {
        return; // Skip text that's already in a link
      }
      parent = parent.parentElement;
    }

    const originalText = textNode.textContent;
    
    for (const mapping of this.mappings) {
      const pattern = this.tracker.generatePattern(mapping.keyPrefix);
      let match;
      
      // Reset regex lastIndex to ensure we find all matches
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(originalText)) !== null) {
        const key = match[0];
        
        // Check if we already detected this key
        const alreadyDetected = this.detectedKeys.some(detected => 
          detected.key === key && detected.mapping.keyPrefix === mapping.keyPrefix
        );
        
        if (!alreadyDetected) {
          this.detectedKeys.push({ key, mapping });
          console.log(`GitHub Issue Linker: Detected issue key ${key}`);
        }
        
        // Prevent infinite loop on zero-length matches
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    }
  }

  public getProcessedCount(): number {
    return this.processedCount;
  }

  public getDetectedKeys(): Array<{ key: string; mapping: RepositoryMapping }> {
    return this.detectedKeys;
  }

  public getUniqueDetectedKeys(): Array<{ key: string; mapping: RepositoryMapping }> {
    const unique = new Map<string, { key: string; mapping: RepositoryMapping }>();
    this.detectedKeys.forEach(item => {
      unique.set(item.key, item);
    });
    return Array.from(unique.values());
  }

  public reset(): void {
    this.processedCount = 0;
    this.detectedKeys = [];
  }

  public destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}